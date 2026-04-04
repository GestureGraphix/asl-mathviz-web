"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/store/appStore";
import { SIGNS, GLOSS_TO_LABEL, GLOSS_TO_IDX } from "@/lib/signData";

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

const SIGN_POS = SIGNS.map((s) => mapToSphere(s.x, s.y));

// Scratch vectors — reused every frame to avoid GC pressure
const _camDir  = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _camNorm = new THREE.Vector3();
const DOT_PX   = 8;
const CAM_DIST = 3.4;

// Static geometries and materials — created once at module level
const DOT_GEO   = new THREE.SphereGeometry(1, 6, 6);
const COMET_GEO = new THREE.SphereGeometry(1, 10, 10);
const COMET_MAT = new THREE.MeshStandardMaterial({
  color: "#ffffff", emissive: "#7dcfe0", emissiveIntensity: 3.0, roughness: 0.05,
});
const DOT_MATS = SIGNS.map((s) => new THREE.MeshBasicMaterial({
  color: s.color, transparent: true, opacity: 0.55,
}));

// ── Fibonacci sphere (no Text, no edges — just atmosphere) ─────────────────

function AtmosphereDots() {
  const geo = useMemo(() => {
    const N   = 600;
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
      <pointsMaterial size={0.022} color="#7dcfe0" sizeAttenuation transparent opacity={0.50} />
    </points>
  );
}

// ── Main scene ─────────────────────────────────────────────────────────────

function BackdropScene() {
  const { size } = useThree();
  const sizeRef  = useRef(size);
  sizeRef.current = size;

  // Frame skip — backdrop runs at ~30fps to halve GPU cost
  const frameN = useRef(0);

  const dotRefs  = useRef<(THREE.Mesh | null)[]>(Array(SIGNS.length).fill(null));
  const glowRefs = useRef<Float32Array>(new Float32Array(SIGNS.length));

  const lastPredTs  = useRef<number | null>(null);
  const lastCandTs  = useRef<number>(-1);
  const smoothRef   = useRef<Float32Array>(new Float32Array(SIGNS.length));
  const camAngle    = useRef(0);
  const targetCamDir = useRef<THREE.Vector3 | null>(null);

  // Comet
  const cometPos    = useRef(new THREE.Vector3());
  const cometTarget = useRef(new THREE.Vector3());
  const cometHas    = useRef(false);
  const cometGlowRef = useRef<THREE.Mesh>(null);
  const cometFlash  = useRef(0);

  const dotMats  = DOT_MATS;
  const dotGeo   = DOT_GEO;
  const cometGeo = COMET_GEO;
  const cometMat = COMET_MAT;

  useFrame(({ camera, clock }, dt) => {
    // Run backdrop at ~30fps (skip odd frames)
    frameN.current++;
    if (frameN.current % 2 !== 0) return;
    const ddt = dt * 2; // compensate for skip

    // Camera orbit
    if (targetCamDir.current) {
      _camDir.copy(camera.position).normalize();
      if (_camDir.dot(targetCamDir.current) < 0.998) {
        _desired.copy(targetCamDir.current).multiplyScalar(CAM_DIST);
        camera.position.lerp(_desired, 0.018);
        camera.position.setLength(CAM_DIST);
      } else {
        targetCamDir.current = null;
      }
    } else {
      camAngle.current += 0.00022 * ddt * 60;
      camera.position.x = Math.sin(camAngle.current) * CAM_DIST;
      camera.position.z = Math.cos(camAngle.current) * CAM_DIST;
      camera.position.y = 0.22 * CAM_DIST;
    }
    camera.lookAt(0, 0, 0);

    const h      = sizeRef.current.height;
    const scaleK = DOT_PX * Math.tan((62 * Math.PI) / 360) / (h / 2);

    // Probability smooth
    const allProbs = useAppStore.getState().candidate?.allProbs ?? null;
    const smooth   = smoothRef.current;
    let maxSmooth  = 0;
    for (let i = 0; i < SIGNS.length; i++) {
      const li     = GLOSS_TO_LABEL[SIGNS[i].gloss] ?? -1;
      const target = (allProbs && li >= 0) ? allProbs[li] : 0;
      smooth[i]    = smooth[i] * 0.78 + target * 0.22;
      if (smooth[i] > maxSmooth) maxSmooth = smooth[i];
    }

    // Prediction glow trigger
    const pred = useAppStore.getState().prediction;
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      cometFlash.current = 1.0;
      const idx = GLOSS_TO_IDX[pred.gloss];
      if (idx !== undefined) {
        glowRefs.current[idx] = 1.0;
        targetCamDir.current  = SIGN_POS[idx].clone().normalize();
      }
    }

    // Dot sizing + glow
    _camNorm.copy(camera.position).normalize();
    for (let i = 0; i < SIGNS.length; i++) {
      const dot = dotRefs.current[i];
      if (!dot) continue;
      const onFront = SIGN_POS[i].dot(_camNorm) > -0.08;
      dot.visible   = onFront;
      if (!onFront) continue;

      const dist = camera.position.distanceTo(SIGN_POS[i]);
      const glow = glowRefs.current[i];
      if (glow > 0.005) {
        glowRefs.current[i] *= 0.88;
        dotMats[i].opacity   = Math.min(1, 0.55 + glow * 0.5);
      } else if (glow !== 0) {
        glowRefs.current[i] = 0;
        dotMats[i].opacity   = 0.55;
      }

      const norm    = maxSmooth > 0.001 ? smooth[i] / maxSmooth : 0;
      const sScale  = maxSmooth > 0.001 ? Math.max(0.25, norm * 2.8) : 1;
      dot.scale.setScalar(scaleK * dist * (sScale + glow * 2.5));
    }

    // Comet probability centroid
    const cand = useAppStore.getState().candidate;
    if (cand?.allProbs && cand.timestamp_ms !== lastCandTs.current) {
      lastCandTs.current = cand.timestamp_ms;
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < SIGNS.length; i++) {
        const li = GLOSS_TO_LABEL[SIGNS[i].gloss] ?? -1;
        const p  = li >= 0 ? (cand.allProbs[li] ?? 0) : 0;
        cx += SIGN_POS[i].x * p; cy += SIGN_POS[i].y * p; cz += SIGN_POS[i].z * p;
      }
      const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (len > 0.01) {
        cometTarget.current.set(cx / len * R, cy / len * R, cz / len * R);
        cometHas.current = true;
      }
    }

    if (cometHas.current && cometGlowRef.current) {
      cometPos.current.lerp(cometTarget.current, 0.10);
      cometGlowRef.current.position.copy(cometPos.current);
      const d     = camera.position.distanceTo(cometPos.current);
      const flash = cometFlash.current;
      cometFlash.current *= 0.90;
      const pulse = 1 + 0.18 * Math.sin(clock.getElapsedTime() * 5.2);
      cometGlowRef.current.scale.setScalar(scaleK * d * (4.0 + flash * 7.0) * pulse);
      cometGlowRef.current.visible = true;
      (cometGlowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        3.0 + flash * 5.0;
    } else if (cometGlowRef.current) {
      cometGlowRef.current.visible = false;
    }
  });

  return (
    <>
      <color attach="background" args={["#040812"]} />
      <ambientLight intensity={1.1} />
      <AtmosphereDots />

      {SIGNS.map((s, i) => (
        <mesh
          key={s.id}
          ref={(el) => { dotRefs.current[i] = el; }}
          position={SIGN_POS[i]}
          geometry={dotGeo}
          material={dotMats[i]}
        />
      ))}

      <mesh ref={cometGlowRef} geometry={cometGeo} material={cometMat} visible={false} renderOrder={3} />
    </>
  );
}

// ── Public component ───────────────────────────────────────────────────────

export function SignSpaceBackdrop() {
  return (
    <Canvas
      camera={{ position: [0, 0.22 * CAM_DIST, CAM_DIST], fov: 62 }}
      gl={{ antialias: false }}
      style={{ position: "absolute", inset: 0, zIndex: 2 }}
    >
      <BackdropScene />
    </Canvas>
  );
}
