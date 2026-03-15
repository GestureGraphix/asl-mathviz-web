"use client";

/**
 * PhonologicalAvatar — Canonical Sign Generation
 *
 * Renders 3D hand landmarks directly from canonical MediaPipe data
 * extracted from real signing videos and normalised via Sim(3):
 *
 *   X̃ = R(X − T) / s
 *
 * where T = shoulder midpoint, s = shoulder-width scale, R aligns
 * the shoulder axis to the world x-axis.
 *
 * Phonological features are computed analytically from stored landmarks:
 *   u^H — handshape  : θ_k = ∠(v_MCP,k − v_w,  v_tip,k − v_MCP,k)
 *   u^L — location   : p̄ = ⅕ Σ_{k∈{0,5,9,13,17}} x̃_k
 *   u^O — orientation: n̂ = (v₁ × v₂) / ‖v₁ × v₂‖
 *
 * Animation replays the 30-frame trajectory extracted around the peak frame.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import SIGNS_RAW from "@/public/data/canonical_signs.json";

// ── Types ─────────────────────────────────────────────────────────

interface CanonicalSign {
  id: number;
  gloss: string;
  category: string;
  color: string;
  minimal_pair: string | null;
  dominant_hand: "right" | "left" | "both";
  handshape_name: string;
  location_name: string;
  orientation_name: string;
  movement_name: string;
  right_hand_lm: number[];          // 63 floats (21×3), Sim3-normalised
  left_hand_lm: number[] | null;    // 63 floats or null
  u_H: number[];                    // 16 floats  [right_8, left_8]
  u_L: number[];                    // 6 floats   [right_3, left_3]
  u_O: number[];                    // 6 floats   [right_3, left_3]
  movement_trajectory: number[][];       // 30 × 63, Sim3-normalised right-hand frames
  left_movement_trajectory: number[][] | null;  // same for left hand; null for one-handed signs
  _peak_frame?: number;
  _total_frames?: number;
  _h_norm?: number;
}

const SIGNS = SIGNS_RAW as CanonicalSign[];

// ── MediaPipe hand skeleton connections ───────────────────────────

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ── Coordinate mapping: Sim(3)-normalised → Three.js world ────────
//
// Sim3: origin = shoulder midpoint, 1 unit = 1 shoulder-width,
//       y increases downward (image convention).
// Three.js body silhouette: shoulders at y≈0.94, x=±0.44.
// Mapping: screen_y = −Sim3_y × LM_SCALE + LM_OFFSET_Y

const LM_SCALE    = 0.88;  // iso scale: 1 shoulder-width → 0.88 Three units
const LM_OFFSET_Y = 0.94;  // Three.js y at shoulder level
const LM_Z_CENTER = 1.0;   // Sim3 z at body-surface depth
const LM_SCALE_Z  = 0.45;  // z depth sensitivity

// Scratch vectors — no heap allocation inside useFrame
const _A  = new THREE.Vector3();
const _B  = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _d  = new THREE.Vector3();
const _q  = new THREE.Quaternion();

/**
 * Write Sim3 landmark i from lm63 into target (zero-alloc).
 *
 * flip=true  (inverted data): reflect y around wrist — `2·wristY − rawY`
 * flip=false (already correct): use rawY directly
 *
 * The flip flag is determined per-sign from the stored u_L palm-center y:
 *   flip = (u_L[1] >= right_hand_lm[1])   i.e. palm is below wrist in Sim3
 */
function lmTo3(target: THREE.Vector3, lm63: number[], i: number, wristY: number, flip: boolean) {
  const rawY = lm63[i * 3 + 1];
  const y    = flip ? (2 * wristY - rawY) : rawY;
  target.set(
    lm63[i * 3    ] * LM_SCALE,
    -y * LM_SCALE + LM_OFFSET_Y,
    (lm63[i * 3 + 2] - LM_Z_CENTER) * LM_SCALE_Z,
  );
}

/** Allocating version — one-off use only (outside hot path). */
function sim3ToThree(x: number, y: number, z: number, wristY: number, flip: boolean): THREE.Vector3 {
  const reflY = flip ? (2 * wristY - y) : y;
  return new THREE.Vector3(
    x * LM_SCALE,
    -reflY * LM_SCALE + LM_OFFSET_Y,
    (z - LM_Z_CENTER) * LM_SCALE_Z,
  );
}

// Export pipeline applies y-negation for mirrored-selfie recordings (cosA < 0),
// so the stored landmarks are already correctly oriented — no renderer flip needed.
function needsYFlip(_sign: CanonicalSign): boolean  { return false; }
function needsYFlipLeft(_sign: CanonicalSign): boolean { return false; }

// ── LandmarkHand — imperative 3D hand from Sim3 landmark arrays ───

interface LandmarkHandProps {
  trajectory: number[][];  // N × 63, animated at 30 fps (N=1 → static)
  peakLm: number[];        // 63-float fallback when trajectory empty
  color: string;
  flipY: boolean;          // whether to y-reflect around wrist (inverted data)
}

function LandmarkHand({ trajectory, peakLm, color, flipY }: LandmarkHandProps) {
  const jointRefs = useRef<(THREE.Mesh | null)[]>(Array(21).fill(null));
  const boneRefs  = useRef<(THREE.Mesh | null)[]>(Array(CONNECTIONS.length).fill(null));

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.42,
    roughness: 0.42,
    metalness: 0.05,
  }), [color]);

  const jointGeo = useMemo(() => new THREE.SphereGeometry(0.017, 10, 10), []);
  const boneGeo  = useMemo(() => new THREE.CylinderGeometry(0.010, 0.010, 1, 6), []);

  useFrame(({ clock }) => {
    const n  = trajectory.length;
    const fi = n > 1 ? Math.floor((clock.getElapsedTime() * 30) % n) : 0;
    const lm = (n > 0 && trajectory[fi].length >= 63) ? trajectory[fi] : peakLm;
    if (!lm || lm.length < 63) return;

    const wristY = lm[1];

    // Update joint sphere positions
    for (let i = 0; i < 21; i++) {
      const m = jointRefs.current[i];
      if (!m) continue;
      lmTo3(_A, lm, i, wristY, flipY);
      m.position.copy(_A);
    }

    // Update bone cylinder mid-points, orientations, and lengths
    for (let b = 0; b < CONNECTIONS.length; b++) {
      const m = boneRefs.current[b];
      if (!m) continue;
      const [ai, bi] = CONNECTIONS[b];
      lmTo3(_A, lm, ai, wristY, flipY);
      lmTo3(_B, lm, bi, wristY, flipY);
      m.position.lerpVectors(_A, _B, 0.5);
      _d.subVectors(_B, _A);
      const len = _d.length();
      if (len < 1e-6) continue;
      _q.setFromUnitVectors(_up, _d.divideScalar(len));
      m.quaternion.copy(_q);
      m.scale.set(1, len, 1);
    }
  });

  return (
    <group>
      {Array.from({ length: 21 }, (_, i) => (
        <mesh
          key={`j${i}`}
          ref={el => { jointRefs.current[i] = el; }}
          geometry={jointGeo}
          material={mat}
        />
      ))}
      {CONNECTIONS.map((_, bi) => (
        <mesh
          key={`b${bi}`}
          ref={el => { boneRefs.current[bi] = el; }}
          geometry={boneGeo}
          material={mat}
        />
      ))}
    </group>
  );
}

// ── Body silhouette (signing space reference) ──────────────────────

function BodySilhouette() {
  return (
    <group>
      <mesh position={[0, 1.45, -0.05]}>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshBasicMaterial color="#1d2c3d" wireframe />
      </mesh>
      <mesh position={[0, 1.12, -0.02]}>
        <cylinderGeometry args={[0.065, 0.075, 0.22, 8]} />
        <meshBasicMaterial color="#1d2c3d" wireframe />
      </mesh>
      <mesh position={[0, 0.38, -0.08]}>
        <cylinderGeometry args={[0.30, 0.26, 0.95, 10]} />
        <meshBasicMaterial color="#1d2c3d" wireframe />
      </mesh>
      {([-0.44, 0.44] as const).map((x) => (
        <mesh key={x} position={[x, 0.94, -0.08]}>
          <sphereGeometry args={[0.10, 8, 8]} />
          <meshBasicMaterial color="#1d2c3d" wireframe />
        </mesh>
      ))}
    </group>
  );
}

// ── Location dot (palm centre in Sim3 signing space) ──────────────

function LocationDot({ sign }: { sign: CanonicalSign }) {
  const pos = useMemo(() => {
    const wristY = sign.right_hand_lm[1];
    const flip   = needsYFlip(sign);
    return sim3ToThree(sign.u_L[0], sign.u_L[1], sign.u_L[2], wristY, flip);
  }, [sign]);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshBasicMaterial color="#3ea89f" transparent opacity={0.32} />
    </mesh>
  );
}

// ── Orientation arrow (palm normal vector) ────────────────────────

function OrientationArrow({ sign }: { sign: CanonicalSign }) {
  const { mid, len, quat } = useMemo(() => {
    const wristY = sign.right_hand_lm[1];
    const flip   = needsYFlip(sign);
    const base = sim3ToThree(sign.u_L[0], sign.u_L[1], sign.u_L[2], wristY, flip);
    // u_O is a direction vector: negate y only when NOT flipping (standard Sim3→Three.js)
    const ny = flip ? sign.u_O[1] : -sign.u_O[1];
    const n = new THREE.Vector3(sign.u_O[0], ny, sign.u_O[2]);
    if (n.lengthSq() < 0.1) return { mid: base, len: 0.2, quat: new THREE.Quaternion() };
    n.normalize();
    const start = base.clone().addScaledVector(n, -0.04);
    const end   = base.clone().addScaledVector(n,  0.22);
    const dir   = end.clone().sub(start).normalize();
    return {
      mid:  start.clone().lerp(end, 0.5),
      len:  start.distanceTo(end),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    };
  }, [sign]);

  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.006, 0.006, len, 6]} />
      <meshBasicMaterial color="#5090d8" transparent opacity={0.48} />
    </mesh>
  );
}

// ── Avatar scene ──────────────────────────────────────────────────

function AvatarScene({ sign }: { sign: CanonicalSign }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.0} />
      <directionalLight position={[-2, 1, 2]} intensity={0.4} />

      <BodySilhouette />
      <LocationDot sign={sign} />
      <OrientationArrow sign={sign} />

      {/* Dominant (right) hand — animated via 30-frame trajectory */}
      <LandmarkHand
        trajectory={sign.movement_trajectory}
        peakLm={sign.right_hand_lm}
        color={sign.color}
        flipY={needsYFlip(sign)}
      />

      {/* Non-dominant (left) hand — only for two-handed signs */}
      {sign.dominant_hand === "both" && sign.left_hand_lm && (
        <LandmarkHand
          trajectory={sign.left_movement_trajectory ?? [sign.left_hand_lm]}
          peakLm={sign.left_hand_lm}
          color="#6090b0"
          flipY={needsYFlipLeft(sign)}
        />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={1.4}
        maxDistance={5.0}
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// ── Math panel ────────────────────────────────────────────────────

const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];
const MAX_FLEX     = Math.PI;
const MAX_SPREAD   = 0.65;

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ flex: 1, height: 4, background: "var(--bg-raised)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", minWidth: 28, textAlign: "right" }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function Lbl({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
      fontStyle: "italic", fontSize: 13, color,
    }}>{text}</span>
  );
}

function MathPanel({ sign }: { sign: CanonicalSign }) {
  const hNorm = sign._h_norm != null ? sign._h_norm.toFixed(2) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, overflowY: "auto", height: "100%" }}>

      {/* s = (H, L, O, M, N) */}
      <div style={{
        borderLeft: "2px solid var(--teal)", paddingLeft: 8,
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--teal)", lineHeight: 1.6,
      }}>
        s = (H, L, O, M, N)<br />
        <span style={{ fontSize: 9, color: "var(--ink4)" }}>f_t ∈ ℝ⁵¹ = u^H ⊕ u^L ⊕ u^O ⊕ u^M ⊕ u^N</span>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* H — Handshape */}
      <div>
        <div style={{ marginBottom: 3 }}>
          <Lbl text="H" color="#e0686a" />
          {" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>u^H ∈ ℝ^16</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 3, lineHeight: 1.5 }}>
          θ_k = ∠(v_MCP,k − v_w, v_tip,k − v_MCP,k)
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 5 }}>
          shape: <span style={{ color: "#e0686a" }}>{sign.handshape_name}</span>
          {hNorm && <> · ‖u^H‖ = <span style={{ color: "#e0686a" }}>{hNorm}</span></>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FINGER_NAMES.map((name, fi) => (
            <div key={name} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 4, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)" }}>{name}</span>
              <MiniBar value={sign.u_H[fi] ?? 0} max={MAX_FLEX} color="#e0686a" />
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--rule)", marginTop: 3, paddingTop: 3 }}>
            {[0, 1, 2].map(si => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 4, alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink5)" }}>spr{si + 1}</span>
                <MiniBar value={sign.u_H[5 + si] ?? 0} max={MAX_SPREAD} color="#c05068" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* L — Location */}
      <div>
        <div style={{ marginBottom: 3 }}>
          <Lbl text="L" color="#3ea89f" />
          {" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>u^L ∈ ℝ^6</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 3 }}>
          p̄ = ⅕ Σ_&#123;k∈&#123;0,5,9,13,17&#125;&#125; x̃_k
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 2 }}>
          loc: <span style={{ color: "#3ea89f" }}>{sign.location_name}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
          [{sign.u_L.slice(0, 3).map(v => v.toFixed(2)).join(", ")}]
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* O — Orientation */}
      <div>
        <div style={{ marginBottom: 3 }}>
          <Lbl text="O" color="#5090d8" />
          {" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>u^O ∈ ℝ^6</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 3 }}>
          n̂ = (v₁ × v₂) / ‖v₁ × v₂‖
        </div>
        {sign.orientation_name && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 2 }}>
            facing: <span style={{ color: "#5090d8" }}>{sign.orientation_name}</span>
          </div>
        )}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
          [{sign.u_O.slice(0, 3).map(v => v.toFixed(2)).join(", ")}]
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* M — Movement */}
      <div>
        <div style={{ marginBottom: 3 }}>
          <Lbl text="M" color="#4dbb87" />
          {" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>u^M ∈ ℝ^18</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 3 }}>
          Δp, Δ²p, Δn — from 30-frame trajectory
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 2 }}>
          motion: <span style={{ color: "#4dbb87" }}>{sign.movement_name}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
          T = {sign.movement_trajectory.length} frames
          {sign._peak_frame != null && (
            <> · peak={sign._peak_frame}/{sign._total_frames}</>
          )}
        </div>
      </div>

      {sign.minimal_pair && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
            minimal pair:{" "}
            <span style={{ color: "var(--ink3)" }}>{sign.gloss}</span>
            {" ↔ "}
            <span style={{ color: "var(--coral)" }}>{sign.minimal_pair}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Category index ─────────────────────────────────────────────────

const CATEGORIES = Array.from(new Set(SIGNS.map(s => s.category)));

// ── Main export ────────────────────────────────────────────────────

export function PhonologicalAvatar() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filterCat,   setFilterCat]   = useState<string>("all");

  const sign = SIGNS[selectedIdx];

  const prev = useCallback(() => setSelectedIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setSelectedIdx(i => Math.min(SIGNS.length - 1, i + 1)), []);

  const selectCat = useCallback((cat: string) => {
    setFilterCat(cat);
    const first = SIGNS.find(s => cat === "all" || s.category === cat);
    if (first) setSelectedIdx(first.id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 2 }}>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div style={{
        padding: "6px 12px",
        borderBottom: "1px solid var(--rule)",
        display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {/* Sign selector */}
        <select
          value={selectedIdx}
          onChange={e => setSelectedIdx(Number(e.target.value))}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            background: "var(--bg-raised)",
            border: "1px solid var(--rule)",
            borderRadius: 4,
            color: "var(--ink)",
            padding: "3px 8px",
            cursor: "pointer",
            flex: "1 1 auto",
            minWidth: 130,
          }}
        >
          {SIGNS.map(s => (
            <option key={s.id} value={s.id}>{s.gloss}</option>
          ))}
        </select>

        {/* Prev / Next */}
        {([["←", prev], ["→", next]] as const).map(([label, cb]) => (
          <button
            key={label}
            onClick={cb}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 14, lineHeight: 1,
              background: "var(--bg-raised)",
              border: "1px solid var(--rule)",
              borderRadius: 4,
              color: "var(--ink3)",
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}

        {/* Category filter pills */}
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {["all", ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => selectCat(cat)}
              style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 9, fontWeight: 500, letterSpacing: "0.07em",
                textTransform: "uppercase",
                background: filterCat === cat ? "var(--bg-raised)" : "transparent",
                border: filterCat === cat ? "1px solid var(--teal)" : "1px solid transparent",
                borderRadius: 3,
                color: filterCat === cat ? "var(--teal)" : "var(--ink5)",
                padding: "3px 6px",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D canvas + math panel ──────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Three.js canvas */}
        <div style={{ flex: 1, background: "#050d16", position: "relative" }}>
          <Canvas
            camera={{ position: [0, 0.9, 2.6], fov: 48 }}
            gl={{ antialias: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#050d16"]} />
            <fog attach="fog" args={["#050d16", 6, 14]} />
            <AvatarScene sign={sign} />
          </Canvas>

          {/* Sign name */}
          <div style={{
            position: "absolute", top: 10, left: 14, zIndex: 5,
            fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
            fontStyle: "italic", fontSize: 22,
            color: sign.color,
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}>
            {sign.gloss}
          </div>

          {/* Orbit hint */}
          <div style={{
            position: "absolute", bottom: 10, right: 12, zIndex: 5,
            fontFamily: "var(--font-mono, monospace)", fontSize: 8,
            color: "var(--ink5)",
          }}>
            drag to orbit
          </div>
        </div>

        {/* Math breakdown panel */}
        <div style={{
          width: 188,
          borderLeft: "1px solid var(--rule)",
          padding: "10px 10px 10px 12px",
          background: "var(--bg-surface)",
          overflowY: "auto",
          flexShrink: 0,
        }}>
          <MathPanel sign={sign} />
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────── */}
      <div style={{
        padding: "4px 14px",
        borderTop: "1px solid var(--rule)",
        display: "flex", gap: 14, alignItems: "center",
        flexShrink: 0,
        fontFamily: "var(--font-mono, monospace)", fontSize: 9, color: "var(--ink5)",
      }}>
        <span>cat: <span style={{ color: sign.color }}>{sign.category}</span></span>
        <span>hand: <span style={{ color: "var(--ink4)" }}>{sign.dominant_hand}</span></span>
        <span>shape: <span style={{ color: "var(--ink4)" }}>{sign.handshape_name}</span></span>
        <span>id: <span style={{ color: "var(--ink4)" }}>{sign.id}/{SIGNS.length - 1}</span></span>
        {sign.minimal_pair && (
          <span>∼ <span style={{ color: "var(--coral)" }}>{sign.minimal_pair}</span></span>
        )}
      </div>
    </div>
  );
}
