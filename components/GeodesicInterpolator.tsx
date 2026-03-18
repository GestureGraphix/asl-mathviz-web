"use client";

import katex from "katex";

// ── Pre-rendered KaTeX (module load, never during render) ──────────
function tex(s: string) {
  try { return katex.renderToString(s, { throwOnError: false }); }
  catch { return s; }
}
const GEO_TEX = {
  gamma: tex(String.raw`\gamma(\alpha_H,\,\alpha_L,\,\alpha_O)`),
  dphi:  tex(String.raw`d_\phi = \lVert s_A - s_B \rVert_2`),
  space: tex(String.raw`\textcolor{#c05060}{u^H} \cdot \textcolor{#3ea89f}{u^L} \cdot \textcolor{#5090d8}{u^O} \in \mathbb{R}^{28}`),
};

/**
 * GeodesicInterpolator — Phonological Manifold Navigation
 *
 * Renders smooth geodesic interpolation between any two canonical signs
 * in the phonological feature space ℝ²⁸ = u^H ⊕ u^L ⊕ u^O.
 *
 *   γ(α) = (1-α)·s_A + α·s_B,  α ∈ [0,1]
 *
 * The 3D avatar morphs continuously between sign A and sign B while
 * the math panel shows per-component phonological distances and the
 * in-scene S² arc widget traces the geodesic on the sign galaxy.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import SIGNS_RAW from "@/public/data/canonical_signs.json";
import SPACE_RAW  from "@/public/data/sign_space.json";

// ── Types ──────────────────────────────────────────────────────────

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
  right_hand_lm: number[];
  left_hand_lm: number[] | null;
  u_H: number[];
  u_L: number[];
  u_O: number[];
  movement_trajectory: number[][];
  left_movement_trajectory: number[][] | null;
}

interface SpaceEntry {
  id: number;
  gloss: string;
  x: number;
  y: number;
  color: string;
}

const SIGNS = SIGNS_RAW as CanonicalSign[];
const SPACE = SPACE_RAW as SpaceEntry[];

// ── S² mapping — matches SignSpaceGalaxy coordinate range ──────────

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

const SIGN_SPHERE_POS = Object.fromEntries(
  SPACE.map(s => [s.gloss, mapToSphere(s.x, s.y)]),
) as Record<string, THREE.Vector3>;

// ── Default pair: MOTHER → FATHER (first minimal pair in dataset) ──

const DEFAULT_A_IDX = SIGNS.findIndex(s => s.minimal_pair !== null);
const DEFAULT_B_IDX = (() => {
  const gloss = SIGNS[DEFAULT_A_IDX]?.minimal_pair;
  if (!gloss) return Math.min(1, SIGNS.length - 1);
  const idx = SIGNS.findIndex(s => s.gloss === gloss);
  return idx >= 0 ? idx : Math.min(1, SIGNS.length - 1);
})();

// ── Hand skeleton connections ──────────────────────────────────────

const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ── Coordinate constants (mirror PhonologicalAvatar) ───────────────

const LM_SCALE    = 0.88;
const LM_OFFSET_Y = 0.94;
const LM_Z_CENTER = 1.0;
const LM_SCALE_Z  = 0.45;

// ── Static scratch vectors — zero allocation in hot path ──────────

const _A  = new THREE.Vector3();
const _B  = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _d  = new THREE.Vector3();
const _q  = new THREE.Quaternion();
const _sA    = new THREE.Vector3();
const _sB    = new THREE.Vector3();
const _sp    = new THREE.Vector3();
const _v1    = new THREE.Vector3();
const _v2    = new THREE.Vector3();
const _qO    = new THREE.Quaternion();
const _qLerp = new THREE.Quaternion();

// ── Helper functions ───────────────────────────────────────────────

/** Spherical linear interpolation — writes into `out`, zero allocation. */
function slerpInto(
  out: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
): void {
  _sA.copy(a).normalize();
  _sB.copy(b).normalize();
  const cosTheta = Math.max(-1, Math.min(1, _sA.dot(_sB)));
  const theta    = Math.acos(cosTheta);
  if (theta < 0.001) {
    out.lerpVectors(_sA, _sB, t).normalize().multiplyScalar(R);
    return;
  }
  const sinT = Math.sin(theta);
  const w1   = Math.sin((1 - t) * theta) / sinT;
  const w2   = Math.sin(t * theta) / sinT;
  out.set(
    _sA.x * w1 + _sB.x * w2,
    _sA.y * w1 + _sB.y * w2,
    _sA.z * w1 + _sB.z * w2,
  ).multiplyScalar(R);
}

/** Build N+1 slerp sample points for the arc (one-off, allocating). */
function buildArcPoints(a: THREE.Vector3, b: THREE.Vector3, N = 52): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const tmp = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    slerpInto(tmp, a, b, i / N);
    pts.push(tmp.clone());
  }
  return pts;
}

function lmTo3(
  target: THREE.Vector3,
  lm: number[],
  i: number,
  wristY: number,
  flip: boolean,
) {
  const rawY = lm[i * 3 + 1];
  const y    = flip ? (2 * wristY - rawY) : rawY;
  target.set(
    lm[i * 3    ] * LM_SCALE,
    -y * LM_SCALE + LM_OFFSET_Y,
    (lm[i * 3 + 2] - LM_Z_CENTER) * LM_SCALE_Z,
  );
}


/**
 * Three-component decomposed landmark interpolation — zero allocation.
 *   αL → wrist translation         (location)
 *   αH → relative joint positions  (handshape)
 *   αO → hand frame rotation       (orientation)
 *
 * The decomposition maps cleanly onto the phonological sub-spaces:
 * moving αL alone shifts the hand across the body; αH alone reshapes
 * the fingers; αO alone rotates the palm without changing either.
 */
function lerpDecomposed(
  out: number[],
  lmA: number[],
  lmB: number[],
  αH: number, αL: number, αO: number,
): void {
  const wxA = lmA[0], wyA = lmA[1], wzA = lmA[2];
  const wxB = lmB[0], wyB = lmB[1], wzB = lmB[2];

  // 1. Location: lerp wrist by αL
  const wx = wxA + αL * (wxB - wxA);
  const wy = wyA + αL * (wyB - wyA);
  const wz = wzA + αL * (wzB - wzA);
  out[0] = wx; out[1] = wy; out[2] = wz;

  // 2. Orientation: rotation from A's palm axis → B's palm axis, scaled by αO
  // Palm axis = wrist(0) → middle-finger-MCP(9), indices 27,28,29
  _v1.set(lmA[27] - wxA, lmA[28] - wyA, lmA[29] - wzA).normalize();
  _v2.set(lmB[27] - wxB, lmB[28] - wyB, lmB[29] - wzB).normalize();
  if (_v1.dot(_v2) < 0.9999) {
    _qO.setFromUnitVectors(_v1, _v2);
    _qLerp.set(0, 0, 0, 1).slerp(_qO, αO); // identity → qA→B at αO
  } else {
    _qLerp.set(0, 0, 0, 1);
  }

  // 3. Handshape: lerp αO-rotated A-relative positions with B-relative by αH
  for (let i = 1; i < 21; i++) {
    const k = i * 3;
    _v1.set(lmA[k] - wxA, lmA[k + 1] - wyA, lmA[k + 2] - wzA).applyQuaternion(_qLerp);
    const relBx = lmB[k] - wxB, relBy = lmB[k + 1] - wyB, relBz = lmB[k + 2] - wzB;
    out[k]     = wx + _v1.x + αH * (relBx - _v1.x);
    out[k + 1] = wy + _v1.y + αH * (relBy - _v1.y);
    out[k + 2] = wz + _v1.z + αH * (relBz - _v1.z);
  }
}

function l2(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0));
}

function subArr(a: number[], b: number[]): number[] {
  return a.map((v, i) => b[i] - v);
}

// ── BodySilhouette ─────────────────────────────────────────────────

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
      {([-0.44, 0.44] as number[]).map((x) => (
        <mesh key={x} position={[x, 0.94, -0.08]}>
          <sphereGeometry args={[0.10, 8, 8]} />
          <meshBasicMaterial color="#1d2c3d" wireframe />
        </mesh>
      ))}
    </group>
  );
}

// ── GhostHand — animated transparent copy of a single sign ─────────

interface GhostHandProps {
  trajectory: number[][];
  peakLm: number[];
  color: string;
  opacity?: number;
}

function GhostHand({ trajectory, peakLm, color, opacity = 0.15 }: GhostHandProps) {
  const jointRefs = useRef<(THREE.Mesh | null)[]>(Array(21).fill(null));
  const boneRefs  = useRef<(THREE.Mesh | null)[]>(Array(CONNECTIONS.length).fill(null));

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.4,
    roughness: 0.6, transparent: true, opacity,
  }), [color, opacity]);

  const jointGeo = useMemo(() => new THREE.SphereGeometry(0.010, 6, 6), []);
  const boneGeo  = useMemo(() => new THREE.CylinderGeometry(0.005, 0.005, 1, 5), []);

  useFrame(({ clock }) => {
    const n  = trajectory.length;
    const fi = n > 1 ? Math.floor((clock.getElapsedTime() * 30) % n) : 0;
    const lm = trajectory[fi]?.length >= 63 ? trajectory[fi] : peakLm;
    if (!lm || lm.length < 63) return;
    const wristY = lm[1];

    for (let i = 0; i < 21; i++) {
      const m = jointRefs.current[i];
      if (!m) continue;
      lmTo3(_A, lm, i, wristY, false);
      m.position.copy(_A);
    }
    for (let b = 0; b < CONNECTIONS.length; b++) {
      const m = boneRefs.current[b];
      if (!m) continue;
      const [ai, bi] = CONNECTIONS[b];
      lmTo3(_A, lm, ai, wristY, false);
      lmTo3(_B, lm, bi, wristY, false);
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
        <mesh key={i} ref={el => { jointRefs.current[i] = el; }} geometry={jointGeo} material={mat} />
      ))}
      {CONNECTIONS.map((_, bi) => (
        <mesh key={bi} ref={el => { boneRefs.current[bi] = el; }} geometry={boneGeo} material={mat} />
      ))}
    </group>
  );
}

// ── InterpolatedHand — γ(α) = (1-α)·frame_A + α·frame_B ──────────

interface InterpolatedHandProps {
  trajA: number[][];
  trajB: number[][];
  peakA: number[];
  peakB: number[];
  alphaHRef: React.MutableRefObject<number>;
  alphaLRef: React.MutableRefObject<number>;
  alphaORef: React.MutableRefObject<number>;
  color: string;
}

function InterpolatedHand({ trajA, trajB, peakA, peakB, alphaHRef, alphaLRef, alphaORef, color }: InterpolatedHandProps) {
  const jointRefs = useRef<(THREE.Mesh | null)[]>(Array(21).fill(null));
  const boneRefs  = useRef<(THREE.Mesh | null)[]>(Array(CONNECTIONS.length).fill(null));
  const lmBuf     = useRef<number[]>(Array(63).fill(0));

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.9,
    roughness: 0.25, metalness: 0.1,
  }), [color]);

  const jointGeo = useMemo(() => new THREE.SphereGeometry(0.021, 10, 10), []);
  const boneGeo  = useMemo(() => new THREE.CylinderGeometry(0.013, 0.013, 1, 6), []);

  useFrame(({ clock }) => {
    const nA = trajA.length, nB = trajB.length;
    const n  = Math.max(nA, nB);
    const fi = Math.floor((clock.getElapsedTime() * 30) % n);
    const fA = trajA[Math.min(fi, nA - 1)];
    const fB = trajB[Math.min(fi, nB - 1)];
    const lmA = fA?.length >= 63 ? fA : peakA;
    const lmB = fB?.length >= 63 ? fB : peakB;
    const lm = lmBuf.current;

    lerpDecomposed(lm, lmA, lmB, alphaHRef.current, alphaLRef.current, alphaORef.current);

    const wristY = lm[1];
    for (let i = 0; i < 21; i++) {
      const m = jointRefs.current[i];
      if (!m) continue;
      lmTo3(_A, lm, i, wristY, false);
      m.position.copy(_A);
    }
    for (let b = 0; b < CONNECTIONS.length; b++) {
      const m = boneRefs.current[b];
      if (!m) continue;
      const [ai, bi] = CONNECTIONS[b];
      lmTo3(_A, lm, ai, wristY, false);
      lmTo3(_B, lm, bi, wristY, false);
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
        <mesh key={i} ref={el => { jointRefs.current[i] = el; }} geometry={jointGeo} material={mat} />
      ))}
      {CONNECTIONS.map((_, bi) => (
        <mesh key={bi} ref={el => { boneRefs.current[bi] = el; }} geometry={boneGeo} material={mat} />
      ))}
    </group>
  );
}

// ── GeodesicStripScene — S² globe, oriented to face A↔B ───────────

function GeodesicStripScene({
  signA, signB, alphaHRef, alphaLRef, alphaORef,
}: {
  signA: CanonicalSign;
  signB: CanonicalSign;
  alphaHRef: React.MutableRefObject<number>;
  alphaLRef: React.MutableRefObject<number>;
  alphaORef: React.MutableRefObject<number>;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const movingHRef = useRef<THREE.Mesh>(null); // handshape dot — coral
  const movingLRef = useRef<THREE.Mesh>(null); // location dot  — teal
  const movingORef = useRef<THREE.Mesh>(null); // orientation dot — blue

  const posA = useMemo(
    () => SIGN_SPHERE_POS[signA.gloss] ?? new THREE.Vector3(0, R, 0),
    [signA.gloss],
  );
  const posB = useMemo(
    () => SIGN_SPHERE_POS[signB.gloss] ?? new THREE.Vector3(0, -R, 0),
    [signB.gloss],
  );

  // Orient group so the A-B midpoint faces the camera (+Z) on each pair change
  useEffect(() => {
    if (!groupRef.current) return;
    const mid = new THREE.Vector3().addVectors(posA, posB).normalize();
    const q   = new THREE.Quaternion().setFromUnitVectors(mid, new THREE.Vector3(0, 0, 1));
    groupRef.current.quaternion.copy(q);
  }, [posA, posB]);

  // Arc as a smooth tube — fat and unambiguous
  const arcPoints = useMemo(() => buildArcPoints(posA, posB, 52), [posA, posB]);
  const arcCurve  = useMemo(() => new THREE.CatmullRomCurve3(arcPoints), [arcPoints]);
  const tubeGeo   = useMemo(() => new THREE.TubeGeometry(arcCurve, 52, 0.024, 7, false), [arcCurve]);

  const regularGeo  = useMemo(() => new THREE.SphereGeometry(0.032, 6, 6),  []);
  const selectedGeo = useMemo(() => new THREE.SphereGeometry(0.074, 10, 10), []);
  const glowGeo     = useMemo(() => new THREE.SphereGeometry(0.21, 8, 8),   []);
  const movingGeo   = useMemo(() => new THREE.SphereGeometry(0.074, 10, 10), []);
  const gridGeo     = useMemo(() => new THREE.SphereGeometry(R, 18, 12),     []);

  const dotMats = useMemo(
    () => SIGNS.map(s => new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.32 })),
    [],
  );
  const selMatA  = useMemo(() => new THREE.MeshStandardMaterial({
    color: signA.color, emissive: signA.color, emissiveIntensity: 0.55, roughness: 0.4,
  }), [signA.color]);
  const selMatB  = useMemo(() => new THREE.MeshStandardMaterial({
    color: signB.color, emissive: signB.color, emissiveIntensity: 0.55, roughness: 0.4,
  }), [signB.color]);
  const glowMatA = useMemo(() => new THREE.MeshBasicMaterial({ color: signA.color, transparent: true, opacity: 0.13 }), [signA.color]);
  const glowMatB = useMemo(() => new THREE.MeshBasicMaterial({ color: signB.color, transparent: true, opacity: 0.13 }), [signB.color]);
  const arcMat    = useMemo(() => new THREE.MeshBasicMaterial({ color: "#7dcfe0" }), []);
  const movingMatH = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e0686a", emissive: "#e0686a", emissiveIntensity: 0.9, roughness: 0.2 }), []);
  const movingMatL = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3ea89f", emissive: "#3ea89f", emissiveIntensity: 0.9, roughness: 0.2 }), []);
  const movingMatO = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5090d8", emissive: "#5090d8", emissiveIntensity: 0.9, roughness: 0.2 }), []);
  const gridMat   = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#1c3d5e", wireframe: true, transparent: true, opacity: 0.30,
  }), []);

  const idxA = SIGNS.findIndex(s => s.gloss === signA.gloss);
  const idxB = SIGNS.findIndex(s => s.gloss === signB.gloss);

  useFrame(() => {
    if (movingHRef.current) { slerpInto(_sp, posA, posB, alphaHRef.current); movingHRef.current.position.copy(_sp); }
    if (movingLRef.current) { slerpInto(_sp, posA, posB, alphaLRef.current); movingLRef.current.position.copy(_sp); }
    if (movingORef.current) { slerpInto(_sp, posA, posB, alphaORef.current); movingORef.current.position.copy(_sp); }
  });

  return (
    <group ref={groupRef}>
      {/* Faint wireframe sphere — makes S² surface legible */}
      <mesh geometry={gridGeo} material={gridMat} />

      {/* All 50 sign dots */}
      {SIGNS.map((s, i) => {
        const pos = SIGN_SPHERE_POS[s.gloss];
        if (!pos || i === idxA || i === idxB) return null;
        return <mesh key={s.id} geometry={regularGeo} material={dotMats[i]} position={pos} />;
      })}

      {/* Sign A — glow + bright dot + floating label */}
      <mesh geometry={glowGeo}     material={glowMatA} position={posA} />
      <mesh geometry={selectedGeo} material={selMatA}  position={posA} />
      <Html position={posA.toArray()} center distanceFactor={5}>
        <div style={{
          fontFamily: "'Bodoni Moda', serif", fontStyle: "italic",
          fontSize: 12, color: signA.color,
          textShadow: "0 0 10px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap", pointerEvents: "none",
          transform: "translateY(-22px)",
        }}>
          {signA.gloss}
        </div>
      </Html>

      {/* Sign B — glow + bright dot + floating label */}
      <mesh geometry={glowGeo}     material={glowMatB} position={posB} />
      <mesh geometry={selectedGeo} material={selMatB}  position={posB} />
      <Html position={posB.toArray()} center distanceFactor={5}>
        <div style={{
          fontFamily: "'Bodoni Moda', serif", fontStyle: "italic",
          fontSize: 12, color: signB.color,
          textShadow: "0 0 10px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap", pointerEvents: "none",
          transform: "translateY(-22px)",
        }}>
          {signB.gloss}
        </div>
      </Html>

      {/* Geodesic arc — fat tube, always visible */}
      <mesh geometry={tubeGeo} material={arcMat} />

      {/* Three moving dots — one per phonological dimension */}
      <mesh ref={movingHRef} geometry={movingGeo} material={movingMatH} />
      <mesh ref={movingLRef} geometry={movingGeo} material={movingMatL} />
      <mesh ref={movingORef} geometry={movingGeo} material={movingMatO} />
    </group>
  );
}

// ── GeodesicScene ──────────────────────────────────────────────────

interface GeodesicSceneProps {
  signA: CanonicalSign;
  signB: CanonicalSign;
  alphaHRef: React.MutableRefObject<number>;
  alphaLRef: React.MutableRefObject<number>;
  alphaORef: React.MutableRefObject<number>;
  autoPlayRef: React.MutableRefObject<boolean>;
}

function GeodesicScene({ signA, signB, alphaHRef, alphaLRef, alphaORef, autoPlayRef }: GeodesicSceneProps) {
  const handDiffers = signA.handshape_name !== signB.handshape_name;
  const locDiffers  = signA.location_name  !== signB.location_name;
  const orDiffers   = l2(subArr(signA.u_O, signB.u_O)) > 0.15;

  // Drive only contrasting axes during autoplay; lock same-category axes at 0
  useFrame(({ clock }) => {
    if (autoPlayRef.current) {
      const val = (Math.sin(clock.getElapsedTime() * 0.7) + 1) / 2;
      alphaHRef.current = handDiffers ? val : 0;
      alphaLRef.current = locDiffers  ? val : 0;
      alphaORef.current = orDiffers   ? val : 0;
    }
  });

  const showLeft =
    signA.dominant_hand === "both" &&
    signB.dominant_hand === "both" &&
    signA.left_movement_trajectory != null &&
    signB.left_movement_trajectory != null;

  // Wrist 3D positions for ghost labels — computed once per sign change
  const wristA = useMemo(() => {
    const v = new THREE.Vector3();
    lmTo3(v, signA.right_hand_lm, 0, signA.right_hand_lm[1], false);
    return v.toArray() as [number, number, number];
  }, [signA]);
  const wristB = useMemo(() => {
    const v = new THREE.Vector3();
    lmTo3(v, signB.right_hand_lm, 0, signB.right_hand_lm[1], false);
    return v.toArray() as [number, number, number];
  }, [signB]);

  const labelStyle = (color: string) => ({
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 10, fontWeight: 600,
    color,
    textShadow: "0 0 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)",
    whiteSpace: "nowrap" as const,
    pointerEvents: "none" as const,
    letterSpacing: "0.04em",
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.0} />
      <directionalLight position={[-2, 1, 2]} intensity={0.4} />

      <BodySilhouette />

      {/* Ghost A — always coral so it's distinct from ghost B */}
      <GhostHand
        trajectory={signA.movement_trajectory}
        peakLm={signA.right_hand_lm}
        color="#e0686a"
        opacity={0.28}
      />
      <Html position={[wristA[0] - 0.18, wristA[1] + 0.06, wristA[2]]} center distanceFactor={4}>
        <div style={labelStyle("#e0686a")}>A · {signA.gloss}</div>
      </Html>

      {/* Ghost B — always blue so it's always distinct from ghost A */}
      <GhostHand
        trajectory={signB.movement_trajectory}
        peakLm={signB.right_hand_lm}
        color="#5090d8"
        opacity={0.28}
      />
      <Html position={[wristB[0] + 0.18, wristB[1] + 0.06, wristB[2]]} center distanceFactor={4}>
        <div style={labelStyle("#5090d8")}>B · {signB.gloss}</div>
      </Html>

      {/* Interpolated right hand — γ(αH, αL, αO) */}
      <InterpolatedHand
        trajA={signA.movement_trajectory}
        trajB={signB.movement_trajectory}
        peakA={signA.right_hand_lm}
        peakB={signB.right_hand_lm}
        alphaHRef={alphaHRef}
        alphaLRef={alphaLRef}
        alphaORef={alphaORef}
        color="#ffffff"
      />

      {/* Interpolated left hand — two-handed signs only */}
      {showLeft && (
        <InterpolatedHand
          trajA={signA.left_movement_trajectory!}
          trajB={signB.left_movement_trajectory!}
          peakA={signA.left_hand_lm!}
          peakB={signB.left_hand_lm!}
          alphaHRef={alphaHRef}
          alphaLRef={alphaLRef}
          alphaORef={alphaORef}
          color="#5090b8"
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

// ── GeodesicMathPanel ──────────────────────────────────────────────

function DeltaBar({
  label, color, dX, dMax, alpha,
}: {
  label: string; color: string; dX: number; dMax: number; alpha: number;
}) {
  // Track width ∝ dX / dMax; fill ∝ alpha (fraction traversed so far)
  const trackPct = dMax > 0.001 ? Math.min(100, (dX / dMax) * 100) : 0;
  const fillPct  = Math.min(100, alpha * 100);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink3)" }}>
          α·d = {(alpha * dX).toFixed(3)}
        </span>
      </div>
      {/* Outer track sized to relative magnitude */}
      <div style={{
        width: `${Math.max(15, trackPct)}%`,
        height: 5,
        background: `${color}28`,
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${fillPct}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.09s linear",
        }} />
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink3)", marginTop: 2 }}>
        d = {dX.toFixed(4)}
      </div>
    </div>
  );
}

interface MathPanelProps {
  signA: CanonicalSign;
  signB: CanonicalSign;
  displayAlphaH: number;
  displayAlphaL: number;
  displayAlphaO: number;
  onAlphaH: (v: number) => void;
  onAlphaL: (v: number) => void;
  onAlphaO: (v: number) => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}

function AlphaSlider({
  label, color, value, onChange, dX, dMax, glossA, glossB, differs,
}: {
  label: string; color: string; value: number;
  onChange: (v: number) => void; dX: number; dMax: number;
  glossA: string; glossB: string; differs: boolean;
}) {
  const trackPct = dMax > 0.001 ? Math.min(100, (dX / dMax) * 100) : 50;
  return (
    <div style={{ opacity: differs ? 1 : 0.38, pointerEvents: differs ? "auto" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>
          {differs ? value.toFixed(2) : "—"}
        </span>
      </div>
      {/* Relative-distance bar — width encodes how much this dimension varies A→B */}
      <div style={{
        width: `${Math.max(20, trackPct)}%`, height: 3,
        background: `${color}30`, borderRadius: 2, marginBottom: 4,
      }}>
        <div style={{
          width: `${value * 100}%`, height: "100%",
          background: color, borderRadius: 2,
          transition: "width 0.06s linear",
        }} />
      </div>
      <input
        type="range" min={0} max={1} step={0.001}
        value={value}
        disabled={!differs}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: differs ? "pointer" : "default", margin: 0 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {differs ? (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--ink4)" }}>← {glossA}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--ink4)" }}>{glossB} →</span>
          </>
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--ink4)" }}>
            same — no contrast
          </span>
        )}
      </div>
    </div>
  );
}

function GeodesicMathPanel({
  signA, signB,
  displayAlphaH, displayAlphaL, displayAlphaO,
  onAlphaH, onAlphaL, onAlphaO,
  autoPlay, onToggleAutoPlay,
}: MathPanelProps) {
  const dH    = useMemo(() => l2(subArr(signA.u_H, signB.u_H)), [signA, signB]);
  const dL    = useMemo(() => l2(subArr(signA.u_L, signB.u_L)), [signA, signB]);
  const dO    = useMemo(() => l2(subArr(signA.u_O, signB.u_O)), [signA, signB]);
  const dFull = useMemo(() => Math.sqrt(dH * dH + dL * dL + dO * dO), [dH, dL, dO]);
  const dMax  = Math.max(dH, dL, dO);

  const locDiffers  = signA.location_name  !== signB.location_name;
  const handDiffers = signA.handshape_name !== signB.handshape_name;
  const orDiffers   = dO > 0.15;

  const dominant = (() => {
    if (locDiffers  && !handDiffers && !orDiffers) return { label: "LOCATION · u^L",    color: "#3ea89f" };
    if (handDiffers && !locDiffers  && !orDiffers) return { label: "HANDSHAPE · u^H",   color: "#e0686a" };
    if (orDiffers   && !locDiffers  && !handDiffers) return { label: "ORIENTATION · u^O", color: "#5090d8" };
    return dH >= dL && dH >= dO
      ? { label: "HANDSHAPE · u^H",   color: "#e0686a" }
      : dL >= dH && dL >= dO
        ? { label: "LOCATION · u^L",  color: "#3ea89f" }
        : { label: "ORIENTATION · u^O", color: "#5090d8" };
  })();

  return (
    <div style={{
      width: 200,
      borderLeft: "1px solid var(--rule)",
      padding: "12px 12px",
      background: "var(--bg-surface)",
      overflowY: "auto",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Formula */}
      <div style={{ borderLeft: "2px solid var(--teal)", paddingLeft: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}
          dangerouslySetInnerHTML={{ __html: GEO_TEX.gamma }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink3)" }}>blend A → B independently across</span>
        <div style={{ fontSize: 10, color: "var(--ink2)" }}
          dangerouslySetInnerHTML={{ __html: GEO_TEX.space }} />
      </div>

      {/* d_φ total */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", marginBottom: 2 }}>
          phonological distance
        </div>
        <div style={{ fontSize: 10, color: "var(--ink2)", marginBottom: 3, overflowX: "auto" }}
          dangerouslySetInnerHTML={{ __html: GEO_TEX.dphi }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink)", letterSpacing: "0.02em" }}>
          {dFull.toFixed(4)}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* Auto / stop */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink3)" }}>
          blend each axis independently
        </span>
        <button
          onClick={onToggleAutoPlay}
          style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 8, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase",
            background: autoPlay ? "var(--teal)" : "var(--bg-raised)",
            border: "1px solid " + (autoPlay ? "var(--teal)" : "var(--rule)"),
            borderRadius: 3, color: autoPlay ? "#050d16" : "var(--ink4)",
            padding: "2px 8px", cursor: "pointer",
          }}
        >
          {autoPlay ? "■ stop" : "▶ auto"}
        </button>
      </div>

      {/* Three independent sliders */}
      <AlphaSlider label="αH · handshape" color="#e0686a" value={handDiffers ? displayAlphaH : 0} onChange={onAlphaH} dX={dH} dMax={dMax} glossA={signA.gloss} glossB={signB.gloss} differs={handDiffers} />
      <AlphaSlider label="αL · location"  color="#3ea89f" value={locDiffers  ? displayAlphaL : 0} onChange={onAlphaL} dX={dL} dMax={dMax} glossA={signA.gloss} glossB={signB.gloss} differs={locDiffers}  />
      <AlphaSlider label="αO · orient."   color="#5090d8" value={orDiffers   ? displayAlphaO : 0} onChange={onAlphaO} dX={dO} dMax={dMax} glossA={signA.gloss} glossB={signB.gloss} differs={orDiffers}   />

      <hr style={{ border: "none", borderTop: "1px solid var(--rule)", margin: 0 }} />

      {/* Dominant contrast */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", marginBottom: 4 }}>
          which phoneme differs most
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: dominant.color, letterSpacing: "0.03em" }}>
          {dominant.label}
        </div>
      </div>

      {signA.location_name !== signB.location_name && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink3)", lineHeight: 1.6 }}>
          <span style={{ color: signA.color }}>{signA.location_name}</span>
          {" → "}
          <span style={{ color: signB.color }}>{signB.location_name}</span>
        </div>
      )}
      {signA.handshape_name !== signB.handshape_name && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink3)", lineHeight: 1.6 }}>
          <span style={{ color: signA.color }}>{signA.handshape_name}</span>
          {" → "}
          <span style={{ color: signB.color }}>{signB.handshape_name}</span>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────

export function GeodesicInterpolator({
  initialGlossA,
  initialGlossB,
}: {
  initialGlossA?: string;
  initialGlossB?: string;
} = {}) {
  const initAIdx = initialGlossA
    ? Math.max(0, SIGNS.findIndex(s => s.gloss === initialGlossA))
    : DEFAULT_A_IDX;
  const initBIdx = initialGlossB
    ? Math.max(0, SIGNS.findIndex(s => s.gloss === initialGlossB))
    : DEFAULT_B_IDX;

  const [signAIdx, setSignAIdx] = useState(initAIdx);
  const [signBIdx, setSignBIdx] = useState(initBIdx);
  const [autoPlay, setAutoPlay] = useState(true);
  const [displayAlphaH, setDisplayAlphaH] = useState(0);
  const [displayAlphaL, setDisplayAlphaL] = useState(0);
  const [displayAlphaO, setDisplayAlphaO] = useState(0);

  const alphaHRef   = useRef(0);
  const alphaLRef   = useRef(0);
  const alphaORef   = useRef(0);
  const autoPlayRef = useRef(true);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // Sync display at ~10 fps — keeps React renders off the hot path
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayAlphaH(alphaHRef.current);
      setDisplayAlphaL(alphaLRef.current);
      setDisplayAlphaO(alphaORef.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const stopAutoPlay = useCallback(() => {
    autoPlayRef.current = false;
    setAutoPlay(false);
  }, []);

  const handleAlphaH = useCallback((v: number) => {
    alphaHRef.current = v; stopAutoPlay(); setDisplayAlphaH(v);
  }, [stopAutoPlay]);
  const handleAlphaL = useCallback((v: number) => {
    alphaLRef.current = v; stopAutoPlay(); setDisplayAlphaL(v);
  }, [stopAutoPlay]);
  const handleAlphaO = useCallback((v: number) => {
    alphaORef.current = v; stopAutoPlay(); setDisplayAlphaO(v);
  }, [stopAutoPlay]);

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => {
      autoPlayRef.current = !prev;
      return !prev;
    });
  }, []);

  const handleSwap = useCallback(() => {
    alphaHRef.current = 0; alphaLRef.current = 0; alphaORef.current = 0;
    setDisplayAlphaH(0); setDisplayAlphaL(0); setDisplayAlphaO(0);
    setSignAIdx(b => { setSignBIdx(b); return signBIdx; });
  }, [signBIdx]);

  const signA = SIGNS[signAIdx] ?? SIGNS[0];
  const signB = SIGNS[signBIdx] ?? SIGNS[1];
  const isMinimalPair = signA.minimal_pair === signB.gloss;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 2 }}>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div style={{
        padding: "6px 12px",
        borderBottom: "1px solid var(--rule)",
        display: "flex", gap: 8, alignItems: "center",
        flexShrink: 0,
      }}>
        {/* Sign A */}
        <select
          value={signAIdx}
          onChange={e => setSignAIdx(Number(e.target.value))}
          style={{
            fontFamily: "var(--font-mono, monospace)", fontSize: 12,
            background: "var(--bg-raised)",
            border: "1px solid " + signA.color,
            borderRadius: 4, color: signA.color,
            padding: "3px 8px", cursor: "pointer",
            flex: "1 1 auto", minWidth: 110,
          }}
        >
          {SIGNS.map((s, i) => <option key={s.id} value={i}>{s.gloss}</option>)}
        </select>

        {/* Swap */}
        <button
          onClick={handleSwap}
          title="Swap A ↔ B"
          style={{
            fontFamily: "var(--font-mono, monospace)", fontSize: 13, lineHeight: 1,
            background: "var(--bg-raised)", border: "1px solid var(--rule)",
            borderRadius: 4, color: "var(--ink4)",
            padding: "3px 10px", cursor: "pointer", flexShrink: 0,
          }}
        >
          ↔
        </button>

        {/* Sign B */}
        <select
          value={signBIdx}
          onChange={e => setSignBIdx(Number(e.target.value))}
          style={{
            fontFamily: "var(--font-mono, monospace)", fontSize: 12,
            background: "var(--bg-raised)",
            border: "1px solid " + signB.color,
            borderRadius: 4, color: signB.color,
            padding: "3px 8px", cursor: "pointer",
            flex: "1 1 auto", minWidth: 110,
          }}
        >
          {SIGNS.map((s, i) => <option key={s.id} value={i}>{s.gloss}</option>)}
        </select>

        {/* Minimal pair badge */}
        {isMinimalPair && (
          <span style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 8, fontWeight: 500, letterSpacing: "0.07em",
            textTransform: "uppercase",
            border: "1px solid var(--coral)",
            borderRadius: 3, color: "var(--coral)",
            padding: "2px 6px", flexShrink: 0,
          }}>
            minimal pair
          </span>
        )}

        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink5)", flexShrink: 0, marginLeft: "auto",
        }}>
          geodesic · ℝ²⁸
        </span>
      </div>

      {/* ── Subtitle ─────────────────────────────────────────────── */}
      <div style={{
        padding: "5px 14px",
        borderBottom: "1px solid var(--rule)",
        flexShrink: 0,
        fontFamily: "var(--font-ui, sans-serif)",
        fontSize: 11, lineHeight: 1.5, color: "var(--ink3)",
      }}>
        Shortest path between two signs through phonological feature space.
        The hand morphs continuously — sliders navigate each dimension
        independently: <span style={{ color: "var(--coral)" }}>H</span> handshape,{" "}
        <span style={{ color: "var(--teal)" }}>L</span> location,{" "}
        <span style={{ color: "var(--sky)" }}>O</span> orientation.
      </div>

      {/* ── Main area — three columns ────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Col 1: 3D avatar (morphing hand) */}
        <div style={{ flex: "0 0 52%", background: "#050d16", position: "relative" }}>
          <Canvas
            camera={{ position: [0, 0.9, 2.6], fov: 48 }}
            gl={{ antialias: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#050d16"]} />
            <fog attach="fog" args={["#050d16", 6, 14]} />
            <GeodesicScene
              signA={signA}
              signB={signB}
              alphaHRef={alphaHRef}
              alphaLRef={alphaLRef}
              alphaORef={alphaORef}
              autoPlayRef={autoPlayRef}
            />
          </Canvas>

          {/* Sign A label — top left */}
          <div style={{
            position: "absolute", top: 10, left: 14, zIndex: 5,
            fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
            fontStyle: "italic", fontSize: 19,
            color: signA.color, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}>
            {signA.gloss}
          </div>

          {/* Sign B label — top right */}
          <div style={{
            position: "absolute", top: 10, right: 14, zIndex: 5,
            fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
            fontStyle: "italic", fontSize: 19,
            color: signB.color, textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}>
            {signB.gloss}
          </div>

          {/* α label — bottom center */}
          <div style={{
            position: "absolute", bottom: 14, left: "50%",
            transform: "translateX(-50%)", zIndex: 5,
            fontFamily: "var(--font-mono, monospace)", fontSize: 10,
            color: "rgba(125,207,224,0.75)",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            letterSpacing: "0.05em", whiteSpace: "nowrap",
          }}>
            <span style={{ color: "#e0686a" }}>H={displayAlphaH.toFixed(2)}</span>
            {" · "}
            <span style={{ color: "#3ea89f" }}>L={displayAlphaL.toFixed(2)}</span>
            {" · "}
            <span style={{ color: "#5090d8" }}>O={displayAlphaO.toFixed(2)}</span>
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

        {/* Col 2: S² sign space globe */}
        <div style={{
          flex: "1 1 0",
          borderLeft: "1px solid var(--rule)",
          background: "#050d16",
          position: "relative",
          minWidth: 0,
        }}>
          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 38 }}
            gl={{ antialias: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#050d16"]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[3, 4, 5]} intensity={0.7} />
            <GeodesicStripScene signA={signA} signB={signB} alphaHRef={alphaHRef} alphaLRef={alphaLRef} alphaORef={alphaORef} />
            <OrbitControls
              enablePan={false}
              minDistance={3.2}
              maxDistance={9.0}
              enableDamping
              dampingFactor={0.08}
            />
          </Canvas>

          <div style={{
            position: "absolute", top: 8, left: 0, right: 0, textAlign: "center",
            fontFamily: "var(--font-mono, monospace)", fontSize: 8,
            color: "var(--ink5)", letterSpacing: "0.09em", pointerEvents: "none",
          }}>
            sign space · S² · drag to rotate
          </div>
        </div>

        {/* Col 3: Math panel */}
        <GeodesicMathPanel
          signA={signA}
          signB={signB}
          displayAlphaH={displayAlphaH}
          displayAlphaL={displayAlphaL}
          displayAlphaO={displayAlphaO}
          onAlphaH={handleAlphaH}
          onAlphaL={handleAlphaL}
          onAlphaO={handleAlphaO}
          autoPlay={autoPlay}
          onToggleAutoPlay={handleToggleAutoPlay}
        />
      </div>

      {/* ── Status bar ───────────────────────────────────────────── */}
      <div style={{
        padding: "4px 14px",
        borderTop: "1px solid var(--rule)",
        display: "flex", gap: 12, alignItems: "center",
        flexShrink: 0,
        fontFamily: "var(--font-mono, monospace)", fontSize: 9, color: "var(--ink5)",
        flexWrap: "wrap",
      }}>
        <span>
          <span style={{ color: signA.color }}>{signA.gloss}</span>
          {" · "}{signA.location_name}{" · "}{signA.handshape_name}
        </span>
        <span>↔</span>
        <span>
          <span style={{ color: signB.color }}>{signB.gloss}</span>
          {" · "}{signB.location_name}{" · "}{signB.handshape_name}
        </span>
        {isMinimalPair && (
          <span style={{ color: "var(--coral)", marginLeft: "auto" }}>
            ∼ 1 phonological feature differs
          </span>
        )}
      </div>
    </div>
  );
}
