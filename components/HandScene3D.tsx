"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/store/appStore";

// MediaPipe hand bone connections
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// Reusable scratch vectors — no allocation inside useFrame
const _A   = new THREE.Vector3();
const _B   = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up  = new THREE.Vector3(0, 1, 0);
const _q   = new THREE.Quaternion();

// ── Per-hand model ────────────────────────────────────────────────
// Fully imperative: positions + glow updated in useFrame, zero React re-renders per frame.

interface HandModelProps {
  side: "left" | "right";
  hexColor: string;
}

function HandModel({ side, hexColor }: HandModelProps) {
  const { size } = useThree();
  const sizeRef  = useRef(size);
  sizeRef.current = size;

  const r = size.height; // world units = CSS pixels (orthographic)

  // Materials — MeshStandardMaterial for shading + emissive glow
  const jointMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(hexColor),
    emissiveIntensity: 1.2,
    roughness:         0.30,
    metalness:         0.05,
  }), []);

  const boneMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(hexColor),
    emissive:          new THREE.Color(hexColor),
    emissiveIntensity: 0.80,
    roughness:         0.40,
    metalness:         0.05,
  }), []);

  // Geometries — recreated only when canvas height changes
  const wristGeo = useMemo(() => new THREE.SphereGeometry(r * 0.017, 14, 14), [r]);
  const jointGeo = useMemo(() => new THREE.SphereGeometry(r * 0.011, 12, 12), [r]);
  // Cylinder height=1 → scale Y to actual bone length each frame
  const boneGeo  = useMemo(() => new THREE.CylinderGeometry(r * 0.006, r * 0.006, 1, 6), [r]);

  // Three.js object refs
  const groupRef  = useRef<THREE.Group>(null);
  const jointRefs = useRef<(THREE.Mesh | null)[]>(Array(21).fill(null));
  const boneRefs  = useRef<(THREE.Mesh | null)[]>(Array(CONNECTIONS.length).fill(null));

  // Glow state — driven imperatively from store
  const glowRef    = useRef(0);
  const lastPredTs = useRef<number | null>(null);

  useFrame(() => {
    // ── Trigger glow on new recognition ──────────────────────
    const pred = useAppStore.getState().prediction;
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      glowRef.current = 1.0;
    }

    // ── Decay glow, update material emissive intensity ────────
    if (glowRef.current > 0.005) {
      glowRef.current *= 0.87;
      jointMat.emissiveIntensity = 0.7 + glowRef.current * 2.8;
      boneMat.emissiveIntensity  = 0.45 + glowRef.current * 1.8;
    } else if (glowRef.current !== 0) {
      glowRef.current = 0;
      jointMat.emissiveIntensity = 0.7;
      boneMat.emissiveIntensity  = 0.45;
    }

    // ── Update landmark positions ─────────────────────────────
    const lmStore = useAppStore.getState().landmarks;
    const lm = side === "right" ? lmStore?.right_hand : lmStore?.left_hand;

    if (!groupRef.current) return;
    groupRef.current.visible = !!lm;
    if (!lm) return;

    const { width, height } = sizeRef.current;
    const mx = (i: number) => (0.5 - lm[i * 3])     * width;
    const my = (i: number) => (0.5 - lm[i * 3 + 1]) * height;
    const mz = (i: number) => lm[i * 3 + 2] * 80;    // amplify depth

    // Joint spheres
    for (let i = 0; i < 21; i++) {
      jointRefs.current[i]?.position.set(mx(i), my(i), mz(i));
    }

    // Bone cylinders — positioned + oriented between connected joints
    for (let idx = 0; idx < CONNECTIONS.length; idx++) {
      const [a, b] = CONNECTIONS[idx];
      const mesh = boneRefs.current[idx];
      if (!mesh) continue;

      _A.set(mx(a), my(a), mz(a));
      _B.set(mx(b), my(b), mz(b));
      _dir.subVectors(_B, _A);
      const len = _dir.length();

      if (len < 0.5) { mesh.visible = false; continue; }
      mesh.visible = true;

      _mid.addVectors(_A, _B).multiplyScalar(0.5);
      _q.setFromUnitVectors(_up, _dir.normalize());
      mesh.position.copy(_mid);
      mesh.quaternion.copy(_q);
      mesh.scale.setY(len);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Bone cylinders */}
      {Array.from({ length: CONNECTIONS.length }, (_, idx) => (
        <mesh
          key={idx}
          ref={(el) => { boneRefs.current[idx] = el; }}
          material={boneMat}
          geometry={boneGeo}
        />
      ))}

      {/* Joint spheres */}
      {Array.from({ length: 21 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { jointRefs.current[i] = el; }}
          material={jointMat}
          geometry={i === 0 ? wristGeo : jointGeo}
        />
      ))}
    </group>
  );
}

// ── Scene lighting + both hands ───────────────────────────────────
function Scene() {
  return (
    <>
      <color attach="background" args={["#050d16"]} />
      {/* Soft ambient fill */}
      <ambientLight intensity={0.6} />
      {/* Key light from upper-right-front — creates shading on cylinders */}
      <directionalLight position={[1.5, 2, 4]} intensity={2.5} />
      {/* Subtle fill from left */}
      <directionalLight position={[-2, 0, 2]} intensity={0.6} />

      <HandModel side="right" hexColor="#3ea89f" />
      <HandModel side="left"  hexColor="#e0686a" />
    </>
  );
}

// ── Public component ──────────────────────────────────────────────
export function HandScene3D() {
  const prediction = useAppStore((s) => s.prediction);
  const lastTs     = useRef<number | null>(null);
  const [glow, setGlow]  = useState(false);

  // CSS-level brightness burst on recognition (additive to material glow)
  useEffect(() => {
    if (prediction && prediction.timestamp_ms !== lastTs.current) {
      lastTs.current = prediction.timestamp_ms;
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 600);
      return () => clearTimeout(t);
    }
  }, [prediction]);

  return (
    <Canvas
      orthographic
      camera={{ zoom: 1, position: [0, 0, 10], near: 0.1, far: 2000 }}
      gl={{ antialias: true }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        filter: glow ? "brightness(1.8) saturate(1.4)" : "none",
        transition: "filter 0.6s ease-out",
      }}
    >
      <Scene />
    </Canvas>
  );
}
