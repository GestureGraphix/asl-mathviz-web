"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useAppStore } from "@/store/appStore";
import RAW_DATA from "@/public/data/sign_space.json";

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

// Constant screen-size scale factor for dots
// screen_radius_px = DOT_PX ⟹ mesh.scale = DOT_PX × tan(fov/2) / (canvasH/2) × dist
// With fov=52, canvasH≈388: k = DOT_PX × 0.4877 / 194
const DOT_PX = 7;   // target screen radius in pixels
const SCALE_K = DOT_PX * Math.tan((52 * Math.PI) / 360) / (388 / 2);

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
    const camNorm = camera.position.clone().normalize();
    for (let i = 0; i < MINIMAL_PAIR_EDGES.length; i++) {
      const [a, b] = MINIMAL_PAIR_EDGES[i];
      lineObjs[i].visible =
        SIGN_POS[a].dot(camNorm) > -0.05 &&
        SIGN_POS[b].dot(camNorm) > -0.05;
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
  const groupRefs    = useRef<(THREE.Group  | null)[]>(Array(SIGNS.length).fill(null));
  const dotRefs      = useRef<(THREE.Mesh   | null)[]>(Array(SIGNS.length).fill(null));
  const cursorRef    = useRef<THREE.Mesh>(null);
  const controlsRef  = useRef<any>(null);
  const lastPredTs   = useRef<number | null>(null);
  const glowRef      = useRef(0);
  const hasTarget    = useRef(false);
  const targetPos    = useRef(new THREE.Vector3(0, 0, -99));
  const targetCamDir = useRef<THREE.Vector3 | null>(null);

  // Keep hoveredId in a ref so useFrame can read it without stale closure
  const hoveredIdRef = useRef(hoveredId);
  useEffect(() => { hoveredIdRef.current = hoveredId; }, [hoveredId]);

  const dotMats = useMemo(
    () => SIGNS.map((s) => new THREE.MeshBasicMaterial({ color: s.color })),
    [],
  );
  // Radius=1 geometry — scaled per-frame to maintain constant screen size
  const dotGeo    = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const cursorGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);

  useFrame(({ camera }) => {
    // ── Hemisphere culling + uniform dot size ─────────────────────
    const camNorm = camera.position.clone().normalize();
    for (let i = 0; i < SIGNS.length; i++) {
      const group = groupRefs.current[i];
      const dot   = dotRefs.current[i];
      if (!group || !dot) continue;

      const onFront = SIGN_POS[i].dot(camNorm) > -0.05;
      group.visible = onFront;

      if (onFront) {
        const dist  = camera.position.distanceTo(SIGN_POS[i]);
        const hov   = hoveredIdRef.current === SIGNS[i].id;
        dot.scale.setScalar(SCALE_K * dist * (hov ? 2.4 : 1));
      }
    }

    // ── Cursor prediction sphere ──────────────────────────────────
    const pred = useAppStore.getState().prediction;
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      const idx = GLOSS_TO_IDX[pred.gloss];
      if (idx !== undefined) {
        targetPos.current.copy(SIGN_POS[idx]);
        hasTarget.current  = true;
        glowRef.current    = 1.0;
        // Globe rotates to bring this sign to face the camera
        targetCamDir.current = SIGN_POS[idx].clone().normalize();
      }
    }
    if (!cursorRef.current) return;
    if (hasTarget.current) {
      cursorRef.current.position.lerp(targetPos.current, 0.10);
      const dist = camera.position.distanceTo(cursorRef.current.position);
      cursorRef.current.scale.setScalar(SCALE_K * dist * 1.5);
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
      const camDir  = camera.position.clone().normalize();
      if (camDir.dot(targetCamDir.current) < 0.998) {
        const desired = targetCamDir.current.clone().multiplyScalar(camDist);
        camera.position.lerp(desired, 0.018);
        camera.position.setLength(camDist);
        controlsRef.current?.update();
      } else {
        targetCamDir.current = null;
      }
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
            geometry={dotGeo}
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
      <mesh ref={cursorRef} geometry={cursorGeo}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>

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
          aspectRatio: "1 / 1",
          borderRadius: 6,
          background: "#050d16",
          cursor: "grab",
          display: "block",
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
