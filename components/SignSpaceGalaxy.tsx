"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useAppStore } from "@/store/appStore";
import RAW_DATA from "@/public/data/sign_space.json";
import VOCAB from "@/public/data/vocab.json";

// gloss → softmax label index (matching inference worker's idToGloss)
const GLOSS_TO_LABEL: Record<string, number> = Object.fromEntries(
  Object.entries(VOCAB.id_to_gloss).map(([k, v]) => [v, Number(k)])
);

// ── Data ───────────────────────────────────────────────────────────

interface SignEntry {
  id: number; gloss: string;
  x: number; y: number; z: number;
  cluster: number; color: string;
  category: string; minimal_pair: string | null;
}

const SIGNS = RAW_DATA as SignEntry[];
const GLOSS_TO_IDX = Object.fromEntries(SIGNS.map((s) => [s.gloss, s.id]));

// ── Sphere projection ──────────────────────────────────────────────

const R  = 1.62;
const X0 = -1.90, X1 = 1.90;
const Y0 = -1.80, Y1 = 1.55;

function mapToSphere(x: number, y: number): THREE.Vector3 {
  const az  = ((x - X0) / (X1 - X0)) * Math.PI * 2;
  const pol = (1 - (y - Y0) / (Y1 - Y0)) * Math.PI;
  return new THREE.Vector3(
    R * Math.sin(pol) * Math.cos(az),
    R * Math.cos(pol),
    R * Math.sin(pol) * Math.sin(az),
  );
}

const SIGN_POS: THREE.Vector3[] = SIGNS.map((s) => mapToSphere(s.x, s.y));

// Scratch vectors — reused every frame to avoid GC pressure
const _camNorm  = new THREE.Vector3();
const _outward  = new THREE.Vector3();
const _camDir   = new THREE.Vector3();
const _desired  = new THREE.Vector3();

// Deduplicated minimal-pair edges [ idA, idB ]
const MINIMAL_PAIR_EDGES: [number, number][] = (() => {
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (const s of SIGNS) {
    if (!s.minimal_pair) continue;
    const otherId = GLOSS_TO_IDX[s.minimal_pair];
    if (otherId === undefined) continue;
    const key = `${Math.min(s.id, otherId)}-${Math.max(s.id, otherId)}`;
    if (!seen.has(key)) { seen.add(key); edges.push([s.id, otherId]); }
  }
  return edges;
})();

// DOT_PX is the target screen radius in pixels.
// scaleK is recomputed each frame from the actual canvas height (see GlobeScene).
const DOT_PX = 7;

// Static geometries — created once at module level, shared by all instances
const DOT_GEO    = new THREE.SphereGeometry(1, 8, 8);
const CURSOR_GEO = new THREE.SphereGeometry(1, 12, 12);
const COMET_HEAD_GEO = new THREE.SphereGeometry(1, 12, 12);
const COMET_GLOW_GEO = new THREE.SphereGeometry(1, 8,  8);
const TRAIL_GEO      = new THREE.SphereGeometry(1, 6,  6);

// ── Fibonacci sphere background ────────────────────────────────────

function GlobeSurface() {
  const geo = useMemo(() => {
    const N   = 700;
    const phi = Math.PI * (3 - Math.sqrt(5));
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = (1 - (i / (N - 1)) * 2) * R;
      const r = Math.sqrt(Math.max(0, R * R - y * y));
      const t = phi * i;
      pos[i * 3]     = r * Math.cos(t);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.020} color="#7dcfe0" sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

// ── Minimal pair edges ─────────────────────────────────────────────

function MinimalPairEdges() {
  const mat = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#b8c8dc", transparent: true, opacity: 0.28 }),
    [],
  );

  // Create THREE.Line objects imperatively to avoid SVG <line> JSX conflict
  const lineObjs = useMemo(
    () => MINIMAL_PAIR_EDGES.map(([a, b]) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([SIGN_POS[a], SIGN_POS[b]]),
        mat,
      ),
    ),
    [mat],
  );

  useFrame(({ camera }) => {
    _camNorm.copy(camera.position).normalize();
    for (let i = 0; i < MINIMAL_PAIR_EDGES.length; i++) {
      const [a, b] = MINIMAL_PAIR_EDGES[i];
      lineObjs[i].visible =
        SIGN_POS[a].dot(_camNorm) > -0.05 &&
        SIGN_POS[b].dot(_camNorm) > -0.05;
    }
  });

  return (
    <>
      {lineObjs.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </>
  );
}

// ── Scene ─────────────────────────────────────────────────────────

interface SceneProps {
  hoveredId: number | null;
  onHover: (id: number | null) => void;
}

function GlobeScene({ hoveredId, onHover }: SceneProps) {
  // Dynamic scaleK — recomputed from actual canvas height each frame
  const { size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const groupRefs    = useRef<(THREE.Group  | null)[]>(Array(SIGNS.length).fill(null));
  const dotRefs      = useRef<(THREE.Mesh   | null)[]>(Array(SIGNS.length).fill(null));
  const cursorRef    = useRef<THREE.Mesh>(null);
  const controlsRef  = useRef<any>(null);
  const lastPredTs   = useRef<number | null>(null);
  const glowRef      = useRef(0);
  const hasTarget    = useRef(false);
  const targetPos    = useRef(new THREE.Vector3(0, 0, -99));
  const targetCamDir = useRef<THREE.Vector3 | null>(null);

  // Floating prediction label
  const [predLabel, setPredLabel] = useState<{ gloss: string; color: string } | null>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (labelTimerRef.current) clearTimeout(labelTimerRef.current); }, []);

  // Keep hoveredId in a ref so useFrame can read it without stale closure
  const hoveredIdRef = useRef(hoveredId);
  useEffect(() => { hoveredIdRef.current = hoveredId; }, [hoveredId]);

  const dotMats = useMemo(
    () => SIGNS.map((s) => new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.8 })),
    [],
  );

  // Smoothed probability cloud — lerps toward allProbs, decays to 0 when no candidate
  const smoothRef = useRef<Float32Array>(new Float32Array(SIGNS.length));

  // ── Comet trail: live probability-centroid trajectory on S² ──────
  const TRAIL_N       = 22;
  const trailRef      = useRef<THREE.Vector3[]>([]);
  const lastCandTs    = useRef<number>(-1);
  const cometTarget   = useRef(new THREE.Vector3());
  const cometPos      = useRef(new THREE.Vector3());
  const cometHasData  = useRef(false);
  const cometHeadRef  = useRef<THREE.Mesh>(null);
  const cometGlowRef  = useRef<THREE.Mesh>(null);
  const trailRefs     = useRef<(THREE.Mesh | null)[]>(Array(TRAIL_N).fill(null));
  const trailFrameCtr = useRef(0);
  const cometFlash    = useRef(0);

  const cometHeadMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff", emissive: "#7dcfe0", emissiveIntensity: 2.8,
    roughness: 0.05,
  }), []);
  const cometGlowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#7dcfe0", transparent: true, opacity: 0.13, depthWrite: false,
  }), []);
  const trailMats = useMemo(() =>
    Array.from({ length: TRAIL_N }, (_, i) =>
      new THREE.MeshBasicMaterial({
        color: "#7dcfe0", transparent: true,
        opacity: Math.pow(1 - i / TRAIL_N, 1.8) * 0.55,
        depthWrite: false,
      })
    ), []);

  useFrame(({ camera, clock }) => {
    // Dynamic scaleK based on actual canvas height
    const scaleK = DOT_PX * Math.tan((52 * Math.PI) / 360) / (sizeRef.current.height / 2);

    // ── Probability cloud: lerp smoothed probs toward current candidate ──
    const allProbs = useAppStore.getState().candidate?.allProbs ?? null;
    const smooth = smoothRef.current;
    let maxSmooth = 0;
    for (let i = 0; i < SIGNS.length; i++) {
      const labelIdx = GLOSS_TO_LABEL[SIGNS[i].gloss] ?? -1;
      const target = (allProbs && labelIdx >= 0) ? allProbs[labelIdx] : 0;
      smooth[i] = smooth[i] * 0.82 + target * 0.18;
      if (smooth[i] > maxSmooth) maxSmooth = smooth[i];
    }

    // ── Hemisphere culling + uniform dot size ─────────────────────
    _camNorm.copy(camera.position).normalize();
    for (let i = 0; i < SIGNS.length; i++) {
      const group = groupRefs.current[i];
      const dot   = dotRefs.current[i];
      if (!group || !dot) continue;

      const onFront = SIGN_POS[i].dot(_camNorm) > -0.05;
      group.visible = onFront;

      if (onFront) {
        const dist  = camera.position.distanceTo(SIGN_POS[i]);
        const hov   = hoveredIdRef.current === SIGNS[i].id;

        // Probability-scaled size and opacity
        const norm  = maxSmooth > 0.001 ? smooth[i] / maxSmooth : 0;
        const scale = maxSmooth > 0.001 ? Math.max(0.22, norm * 2.6) : 1;
        const opacity = maxSmooth > 0.001 ? Math.max(0.06, norm * 0.9) : 0.8;

        dot.scale.setScalar(scaleK * dist * (hov ? 2.4 : scale));
        dotMats[i].opacity = opacity;
      }
    }

    // ── Cursor prediction sphere ──────────────────────────────────
    const pred = useAppStore.getState().prediction;
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      cometFlash.current = 1.0;
      const idx = GLOSS_TO_IDX[pred.gloss];
      if (idx !== undefined) {
        targetPos.current.copy(SIGN_POS[idx]);
        hasTarget.current  = true;
        glowRef.current    = 1.0;
        // Globe rotates to bring this sign to face the camera
        targetCamDir.current = SIGN_POS[idx].clone().normalize();
        // Floating label
        const signColor = SIGNS[idx]?.color ?? "#ffffff";
        setPredLabel({ gloss: pred.gloss, color: signColor });
        if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
        labelTimerRef.current = setTimeout(() => setPredLabel(null), 3000);
      }
    }

    // ── Position floating label just outside globe surface at cursor ──
    if (labelGroupRef.current && cursorRef.current && hasTarget.current) {
      _outward.copy(cursorRef.current.position).normalize().multiplyScalar(R + 0.42);
      labelGroupRef.current.position.copy(_outward);
    }
    if (!cursorRef.current) return;
    if (hasTarget.current) {
      cursorRef.current.position.lerp(targetPos.current, 0.10);
      const dist = camera.position.distanceTo(cursorRef.current.position);
      cursorRef.current.scale.setScalar(scaleK * dist * 1.5);
    }
    const mat = cursorRef.current.material as THREE.MeshBasicMaterial;
    if (glowRef.current > 0.01) {
      glowRef.current *= 0.88;
      mat.opacity = Math.min(0.55, 0.18 + glowRef.current * 0.45);
    } else if (hasTarget.current) {
      mat.opacity = 0.15;
    }

    // ── Slowly rotate globe so predicted sign faces camera ────────
    if (targetCamDir.current) {
      const camDist = camera.position.length();
      _camDir.copy(camera.position).normalize();
      if (_camDir.dot(targetCamDir.current) < 0.998) {
        _desired.copy(targetCamDir.current).multiplyScalar(camDist);
        camera.position.lerp(_desired, 0.06);
        camera.position.setLength(camDist);
        controlsRef.current?.update();
      } else {
        targetCamDir.current = null;
      }
    }

    // ── Comet: probability-centroid trajectory on S² ──────────────
    const cand = useAppStore.getState().candidate;
    if (cand?.allProbs && cand.timestamp_ms !== lastCandTs.current) {
      lastCandTs.current = cand.timestamp_ms;
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < SIGNS.length; i++) {
        const li = GLOSS_TO_LABEL[SIGNS[i].gloss] ?? -1;
        const p  = li >= 0 ? (cand.allProbs[li] ?? 0) : 0;
        cx += SIGN_POS[i].x * p;
        cy += SIGN_POS[i].y * p;
        cz += SIGN_POS[i].z * p;
      }
      const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (len > 0.01) {
        cometTarget.current.set(cx / len * R, cy / len * R, cz / len * R);
        cometHasData.current = true;
      }
    }

    if (cometHasData.current) {
      // Smooth comet position toward target
      cometPos.current.lerp(cometTarget.current, 0.12);

      // Stamp a trail point every 8 frames
      trailFrameCtr.current++;
      if (trailFrameCtr.current >= 8) {
        trailFrameCtr.current = 0;
        trailRef.current.unshift(cometPos.current.clone());
        if (trailRef.current.length > TRAIL_N) trailRef.current.pop();
      }

      const t    = clock.getElapsedTime();
      const pulse = 1 + 0.22 * Math.sin(t * 5.5);
      const flash = cometFlash.current > 0.01 ? cometFlash.current : 0;
      cometFlash.current *= 0.88;

      if (cometHeadRef.current) {
        cometHeadRef.current.visible = true;
        cometHeadRef.current.position.copy(cometPos.current);
        const d = camera.position.distanceTo(cometPos.current);
        cometHeadRef.current.scale.setScalar(scaleK * d * (3.2 + flash * 5.0) * pulse);
        (cometHeadRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          2.8 + flash * 4.0;
      }
      if (cometGlowRef.current) {
        cometGlowRef.current.visible = true;
        cometGlowRef.current.position.copy(cometPos.current);
        const d = camera.position.distanceTo(cometPos.current);
        cometGlowRef.current.scale.setScalar(scaleK * d * (9.0 + flash * 12.0));
        (cometGlowRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.13 + flash * 0.25;
      }

      const trail = trailRef.current;
      for (let i = 0; i < TRAIL_N; i++) {
        const m = trailRefs.current[i];
        if (!m) continue;
        if (i < trail.length) {
          m.position.copy(trail[i]);
          const d = camera.position.distanceTo(trail[i]);
          m.scale.setScalar(scaleK * d * 2.0 * (1 - i / TRAIL_N));
          m.visible = true;
        } else {
          m.visible = false;
        }
      }
    } else {
      if (cometHeadRef.current) cometHeadRef.current.visible = false;
      if (cometGlowRef.current) cometGlowRef.current.visible = false;
      for (const m of trailRefs.current) if (m) m.visible = false;
    }
  });

  return (
    <>
      <ambientLight intensity={1.3} />
      <GlobeSurface />
      <MinimalPairEdges />

      {SIGNS.map((s, i) => (
        <group
          key={s.id}
          ref={(el) => { groupRefs.current[i] = el; }}
          position={SIGN_POS[i]}
        >
          {/* Dot */}
          <mesh
            ref={(el) => { dotRefs.current[i] = el; }}
            geometry={DOT_GEO}
            material={dotMats[i]}
            onPointerOver={(e) => { e.stopPropagation(); onHover(s.id); }}
            onPointerOut={() => onHover(null)}
          />

          {/* Label — billboards toward camera automatically */}
          <Text
            position={[0, 0.18, 0]}
            fontSize={0.072}
            color={s.color}
            fillOpacity={0.90}
            anchorX="center"
            anchorY="bottom"
            renderOrder={2}
          >
            {s.gloss.replace(/_/g, " ")}
          </Text>
        </group>
      ))}

      {/* Cursor — pulses on prediction */}
      <mesh ref={cursorRef} geometry={CURSOR_GEO}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Floating prediction label — outside globe surface, follows cursor */}
      {predLabel && (
        <group ref={labelGroupRef}>
          <Text
            fontSize={0.18}
            color={predLabel.color}
            fillOpacity={0.97}
            anchorX="center"
            anchorY="middle"
            renderOrder={4}
            outlineWidth={0.012}
            outlineColor="#050d16"
          >
            {predLabel.gloss.replace(/_/g, " ")}
          </Text>
        </group>
      )}

      {/* Comet glow halo — rendered behind head */}
      <mesh ref={cometGlowRef} geometry={COMET_GLOW_GEO} material={cometGlowMat} visible={false} renderOrder={1} />

      {/* Comet head */}
      <mesh ref={cometHeadRef} geometry={COMET_HEAD_GEO} material={cometHeadMat} visible={false} renderOrder={3} />

      {/* Comet trail — fading spheres */}
      {Array.from({ length: TRAIL_N }, (_, i) => (
        <mesh
          key={`trail-${i}`}
          ref={el => { trailRefs.current[i] = el; }}
          geometry={TRAIL_GEO}
          material={trailMats[i]}
          visible={false}
          renderOrder={2}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom
        autoRotate
        autoRotateSpeed={0.50}
        dampingFactor={0.10}
        enableDamping
      />
    </>
  );
}

// ── Legend ─────────────────────────────────────────────────────────

const LEGEND = [
  { label: "greeting",   color: "#3ea89f" },
  { label: "people",     color: "#e0686a" },
  { label: "action",     color: "#4dbb87" },
  { label: "question",   color: "#8b7fd4" },
  { label: "descriptor", color: "#5090d8" },
  { label: "place",      color: "#c4a35a" },
  { label: "object",     color: "#d4885a" },
  { label: "other",      color: "#a09790" },
];

// ── Public component ───────────────────────────────────────────────

export function SignSpaceGalaxy() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const prediction = useAppStore((s) => s.prediction);
  const onHover    = useCallback((id: number | null) => setHoveredId(id), []);

  const activeSign = hoveredId != null
    ? SIGNS[hoveredId] ?? null
    : prediction?.gloss != null
      ? SIGNS[GLOSS_TO_IDX[prediction.gloss] ?? -1] ?? null
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Canvas
        camera={{ position: [0, 0.2, 3.5], fov: 52 }}
        style={{
          width: "100%",
          height: 340,
          borderRadius: 6,
          background: "#050d16",
          cursor: "grab",
          display: "block",
          border: "1px solid rgba(0,0,0,0.14)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        gl={{ antialias: true }}
      >
        <GlobeScene hoveredId={hoveredId} onHover={onHover} />
      </Canvas>

      {/* Active sign info */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 18, paddingLeft: 2 }}>
        {activeSign ? (
          <>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: activeSign.color, flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
              fontStyle: "italic", fontWeight: 700,
              fontSize: 13, color: "var(--ink2)",
            }}>
              {activeSign.gloss.replace(/_/g, " ")}
            </span>
            <span style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10, color: "var(--ink4)", marginLeft: 2,
            }}>
              {activeSign.category}
              {activeSign.minimal_pair && ` · ≈ ${activeSign.minimal_pair}`}
            </span>
          </>
        ) : (
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "var(--ink5)" }}>
            drag · zoom · 50 signs
          </span>
        )}
      </div>

      {/* Color legend */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "5px 8px",
        paddingLeft: 2,
        paddingBottom: 2,
      }}>
        {LEGEND.map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: color, flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 9, color: "var(--ink4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
