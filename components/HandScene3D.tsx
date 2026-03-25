"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import RAW_SPACE from "@/public/data/sign_space.json";
import VOCAB_DATA from "@/public/data/vocab.json";

// Sign color lookup for burst overlay
const GLOSS_TO_COLOR: Record<string, string> = Object.fromEntries(
  (RAW_SPACE as { gloss: string; color: string }[]).map((s) => [s.gloss, s.color])
);

// ── Globe data ────────────────────────────────────────────────────────────────

type RawSign = { id: number; gloss: string; x: number; y: number; color: string; cluster: number; minimal_pair: string | null };
const SIGN_ENTRIES = RAW_SPACE as RawSign[];

const GLOBE_X0 = -1.90, GLOBE_X1 = 1.90;
const GLOBE_Y0 = -1.80, GLOBE_Y1 = 1.55;

function mapSignToUnit(x: number, y: number): THREE.Vector3 {
  const az  = ((x - GLOBE_X0) / (GLOBE_X1 - GLOBE_X0)) * Math.PI * 2;
  const pol = (1 - (y - GLOBE_Y0) / (GLOBE_Y1 - GLOBE_Y0)) * Math.PI;
  return new THREE.Vector3(
    Math.sin(pol) * Math.cos(az),
    Math.cos(pol),
    Math.sin(pol) * Math.sin(az),
  );
}

const SIGN_POS_UNIT = SIGN_ENTRIES.map(s => mapSignToUnit(s.x, s.y));
const GLOSS_TO_SIGN_IDX = Object.fromEntries(SIGN_ENTRIES.map((s, i) => [s.gloss, i]));
const GLOSS_TO_LABEL_G: Record<string, number> = Object.fromEntries(
  Object.entries((VOCAB_DATA as { id_to_gloss: Record<string, string> }).id_to_gloss)
    .map(([k, v]) => [v, Number(k)])
);

// MediaPipe hand bone connections
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// Scratch vectors — no allocation inside useFrame
const _A      = new THREE.Vector3();
const _B      = new THREE.Vector3();
const _mid    = new THREE.Vector3();
const _dir    = new THREE.Vector3();
const _up     = new THREE.Vector3(0, 1, 0);
const _q      = new THREE.Quaternion();
const _iMat          = new THREE.Matrix4();
const _iColor        = new THREE.Color();
const _billboardMat  = new THREE.Matrix4();

// Precomputed dot colors for InstancedMesh (avoid per-frame string parsing)
const SIGN_BASE_COLORS = SIGN_ENTRIES.map(s => new THREE.Color(s.color));

// Particle color targets per dominant phonological parameter
const PARAM_COLORS: Record<string, THREE.Color> = {
  H: new THREE.Color("#e0686a"),
  L: new THREE.Color("#3ea89f"),
  O: new THREE.Color("#5090d8"),
  M: new THREE.Color("#4dbb87"),
  N: new THREE.Color("#8b7fd4"),
};
const MAX_NORMS_MAP: Record<string, number> = { H: 1.8, L: 0.6, O: 1.0, M: 0.3, N: 0.25 };

// ── Per-hand model ────────────────────────────────────────────────────────────

interface HandModelProps {
  side: "left" | "right";
  hexColor: string;
}

function HandModel({ side, hexColor }: HandModelProps) {
  const { size } = useThree();
  const sizeRef  = useRef(size);
  sizeRef.current = size;

  const r = size.height;

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

  const wristGeo = useMemo(() => new THREE.SphereGeometry(r * 0.017, 14, 14), [r]);
  const jointGeo = useMemo(() => new THREE.SphereGeometry(r * 0.011, 12, 12), [r]);
  const boneGeo  = useMemo(() => new THREE.CylinderGeometry(r * 0.006, r * 0.006, 1, 6), [r]);

  const groupRef  = useRef<THREE.Group>(null);
  const jointRefs = useRef<(THREE.Mesh | null)[]>(Array(21).fill(null));
  const boneRefs  = useRef<(THREE.Mesh | null)[]>(Array(CONNECTIONS.length).fill(null));

  const glowRef    = useRef(0);
  const lastPredTs = useRef<number | null>(null);

  useFrame(() => {
    const { prediction: pred, landmarks: lmStore } = useAppStore.getState();

    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      glowRef.current = 1.0;
    }

    if (glowRef.current > 0.005) {
      glowRef.current *= 0.87;
      jointMat.emissiveIntensity = 0.7 + glowRef.current * 2.8;
      boneMat.emissiveIntensity  = 0.45 + glowRef.current * 1.8;
    } else if (glowRef.current !== 0) {
      glowRef.current = 0;
      jointMat.emissiveIntensity = 0.7;
      boneMat.emissiveIntensity  = 0.45;
    }

    const lm = side === "right" ? lmStore?.right_hand : lmStore?.left_hand;

    if (!groupRef.current) return;
    groupRef.current.visible = !!lm;
    if (!lm) return;

    const { width, height } = sizeRef.current;
    const mx = (i: number) => (0.5 - lm[i * 3])     * width;
    const my = (i: number) => (0.5 - lm[i * 3 + 1]) * height;
    const mz = (i: number) => lm[i * 3 + 2] * 80;

    for (let i = 0; i < 21; i++) {
      jointRefs.current[i]?.position.set(mx(i), my(i), mz(i));
    }

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
      {Array.from({ length: CONNECTIONS.length }, (_, idx) => (
        <mesh
          key={idx}
          ref={(el) => { boneRefs.current[idx] = el; }}
          material={boneMat}
          geometry={boneGeo}
        />
      ))}
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

// ── Particle field ────────────────────────────────────────────────────────────

const N_PARTICLES = 100;
const _pMat = new THREE.Matrix4();

function ParticleField() {
  const { size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const geo = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color("#3ea89f"),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }), []);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  const pos          = useRef<Float32Array | null>(null);
  const vel          = useRef<Float32Array | null>(null);
  const sizes        = useRef<Float32Array | null>(null);
  const initialized  = useRef(false);
  const lastPredTs   = useRef<number | null>(null);
  const currentColor = useRef(new THREE.Color("#3ea89f"));
  const pfFrameN     = useRef(0);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { width, height } = sizeRef.current;
    if (width === 0) return;

    // Run particle physics every other frame; double dt to compensate
    pfFrameN.current++;
    const runPhysics = pfFrameN.current % 2 === 0;
    const physDt = runPhysics ? dt * 2 : 0;

    // Lazy init
    if (!initialized.current) {
      pos.current   = new Float32Array(N_PARTICLES * 3);
      vel.current   = new Float32Array(N_PARTICLES * 3);
      sizes.current = new Float32Array(N_PARTICLES);
      for (let i = 0; i < N_PARTICLES; i++) {
        pos.current[i * 3]     = (Math.random() - 0.5) * width;
        pos.current[i * 3 + 1] = (Math.random() - 0.5) * height;
        pos.current[i * 3 + 2] = (Math.random() - 0.5) * 60;
        vel.current[i * 3]     = (Math.random() - 0.5) * 20;
        vel.current[i * 3 + 1] = (Math.random() - 0.5) * 20;
        vel.current[i * 3 + 2] = (Math.random() - 0.5) * 5;
        sizes.current[i] = height * (0.003 + Math.random() * 0.006);
      }
      initialized.current = true;
    }

    const p = pos.current!;
    const v = vel.current!;
    const s = sizes.current!;

    const { phonology: ph, prediction: pred, landmarks: lm } = useAppStore.getState();

    // Dominant phonological parameter drives color
    let dominantParam = "L";
    let dominantNorm  = 0;
    if (ph) {
      const candidates: [string, number][] = [
        ["H", ph.norm_H / MAX_NORMS_MAP.H],
        ["L", ph.norm_L / MAX_NORMS_MAP.L],
        ["O", ph.norm_O / MAX_NORMS_MAP.O],
        ["M", ph.norm_M / MAX_NORMS_MAP.M],
        ["N", ph.norm_N / MAX_NORMS_MAP.N],
      ];
      for (const [k, nv] of candidates) {
        if (nv > dominantNorm) { dominantNorm = nv; dominantParam = k; }
      }
    }
    currentColor.current.lerp(PARAM_COLORS[dominantParam], 0.015);
    mat.color.copy(currentColor.current);

    // Prediction explosion impulse
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      for (let i = 0; i < N_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 150 + Math.random() * 250;
        v[i * 3]     += Math.cos(angle) * speed;
        v[i * 3 + 1] += Math.sin(angle) * speed;
      }
    }

    // Hand attraction
    const rh = lm?.right_hand;
    const lh = lm?.left_hand;
    const attractStrength = 8000;
    const threshold = width * 0.24;

    const attract = (handX: number, handY: number, handZ: number) => {
      for (let i = 0; i < N_PARTICLES; i++) {
        const dx = handX - p[i * 3];
        const dy = handY - p[i * 3 + 1];
        const dz = handZ - p[i * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        if (dist < threshold) {
          const f = attractStrength * (1 - dist / threshold) * dt / dist;
          v[i * 3]     += dx * f;
          v[i * 3 + 1] += dy * f;
          v[i * 3 + 2] += dz * f;
        }
      }
    };

    if (runPhysics) {
      if (rh) attract((0.5 - rh[0]) * width, (0.5 - rh[1]) * height, rh[2] * 80);
      if (lh) attract((0.5 - lh[0]) * width, (0.5 - lh[1]) * height, lh[2] * 80);
    }

    const hw = width  * 0.5;
    const hh = height * 0.5;

    for (let i = 0; i < N_PARTICLES; i++) {
      v[i * 3]     *= 0.978;
      v[i * 3 + 1] *= 0.978;
      v[i * 3 + 2] *= 0.978;

      p[i * 3]     += v[i * 3]     * physDt;
      p[i * 3 + 1] += v[i * 3 + 1] * physDt;
      p[i * 3 + 2] += v[i * 3 + 2] * physDt;

      // Boundary wrap
      if (p[i * 3]     >  hw) p[i * 3]     = -hw;
      if (p[i * 3]     < -hw) p[i * 3]     =  hw;
      if (p[i * 3 + 1] >  hh) p[i * 3 + 1] = -hh;
      if (p[i * 3 + 1] < -hh) p[i * 3 + 1] =  hh;
      if (p[i * 3 + 2] >  60) p[i * 3 + 2] = -60;
      if (p[i * 3 + 2] < -60) p[i * 3 + 2] =  60;

      _pMat.makeScale(s[i], s[i], s[i]);
      _pMat.setPosition(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      mesh.setMatrixAt(i, _pMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, N_PARTICLES]} renderOrder={0} />;
}

// ── Wrist trails ──────────────────────────────────────────────────────────────

const TRAIL_N = 8;

function WristTrails() {
  const { size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const trailGeo = useMemo(() => new THREE.SphereGeometry(1, 5, 5), []);

  const rMats = useMemo(() => Array.from({ length: TRAIL_N }, (_, i) =>
    new THREE.MeshBasicMaterial({
      color: "#3ea89f",
      transparent: true,
      opacity: Math.pow(1 - i / TRAIL_N, 2.0) * 0.55,
      depthWrite: false,
    })
  ), []);

  const lMats = useMemo(() => Array.from({ length: TRAIL_N }, (_, i) =>
    new THREE.MeshBasicMaterial({
      color: "#e0686a",
      transparent: true,
      opacity: Math.pow(1 - i / TRAIL_N, 2.0) * 0.55,
      depthWrite: false,
    })
  ), []);

  const rRefs  = useRef<(THREE.Mesh | null)[]>(Array(TRAIL_N).fill(null));
  const lRefs  = useRef<(THREE.Mesh | null)[]>(Array(TRAIL_N).fill(null));
  // Pre-allocated Vector3 pools — no per-frame heap allocation
  const rPool  = useRef(Array.from({ length: TRAIL_N }, () => new THREE.Vector3()));
  const lPool  = useRef(Array.from({ length: TRAIL_N }, () => new THREE.Vector3()));
  const rHead  = useRef(0);
  const lHead  = useRef(0);
  const rCount = useRef(0);
  const lCount = useRef(0);
  const frameN = useRef(0);

  useFrame(() => {
    const { width, height } = sizeRef.current;
    if (width === 0) return;

    frameN.current++;
    const update = frameN.current % 2 === 0;

    const { landmarks: lm, phonology: ph } = useAppStore.getState();
    const normM = ph ? Math.min(1, ph.norm_M / MAX_NORMS_MAP.M) : 0;
    const scale = height * 0.01 * (1 + normM * 3);

    // Right hand (teal) — ring-buffer write
    const rh = lm?.right_hand;
    if (rh && update) {
      rPool.current[rHead.current].set(
        (0.5 - rh[0]) * width,
        (0.5 - rh[1]) * height,
        rh[2] * 80,
      );
      rHead.current = (rHead.current + 1) % TRAIL_N;
      rCount.current = Math.min(rCount.current + 1, TRAIL_N);
    }
    if (!rh) rCount.current = 0;
    for (let i = 0; i < TRAIL_N; i++) {
      const m = rRefs.current[i];
      if (!m) continue;
      if (i < rCount.current) {
        const idx = (rHead.current - 1 - i + TRAIL_N) % TRAIL_N;
        m.visible = true;
        m.position.copy(rPool.current[idx]);
        m.scale.setScalar(scale * (1 - i / TRAIL_N));
      } else {
        m.visible = false;
      }
    }

    // Left hand (coral) — ring-buffer write
    const lh = lm?.left_hand;
    if (lh && update) {
      lPool.current[lHead.current].set(
        (0.5 - lh[0]) * width,
        (0.5 - lh[1]) * height,
        lh[2] * 80,
      );
      lHead.current = (lHead.current + 1) % TRAIL_N;
      lCount.current = Math.min(lCount.current + 1, TRAIL_N);
    }
    if (!lh) lCount.current = 0;
    for (let i = 0; i < TRAIL_N; i++) {
      const m = lRefs.current[i];
      if (!m) continue;
      if (i < lCount.current) {
        const idx = (lHead.current - 1 - i + TRAIL_N) % TRAIL_N;
        m.visible = true;
        m.position.copy(lPool.current[idx]);
        m.scale.setScalar(scale * (1 - i / TRAIL_N));
      } else {
        m.visible = false;
      }
    }
  });

  return (
    <>
      {Array.from({ length: TRAIL_N }, (_, i) => (
        <mesh
          key={`rt-${i}`}
          ref={(el) => { rRefs.current[i] = el; }}
          geometry={trailGeo}
          material={rMats[i]}
          visible={false}
          renderOrder={1}
        />
      ))}
      {Array.from({ length: TRAIL_N }, (_, i) => (
        <mesh
          key={`lt-${i}`}
          ref={(el) => { lRefs.current[i] = el; }}
          geometry={trailGeo}
          material={lMats[i]}
          visible={false}
          renderOrder={1}
        />
      ))}
    </>
  );
}

// ── Sign Space Globe ──────────────────────────────────────────────────────────
// Runs on ODD frames — ParticleField + WristTrails run on EVEN frames.
// This distributes work evenly instead of alternating heavy/light frames.

function SignGlobe() {
  const { size } = useThree();
  const sizeRef  = useRef(size);
  sizeRef.current = size;

  const frameN          = useRef(0);
  const rotAngle        = useRef(0);
  const groupRef        = useRef<THREE.Group>(null);
  const dotMeshRef      = useRef<THREE.InstancedMesh>(null);
  const colorInitialized = useRef(false);
  const glowValues      = useRef(new Float32Array(SIGN_ENTRIES.length));
  const smoothProbs     = useRef(new Float32Array(SIGN_ENTRIES.length));
  const lastPredTs      = useRef<number | null>(null);
  const lastCandTs      = useRef<number>(-1);
  const cometRef        = useRef<THREE.Mesh>(null);
  const cometPos        = useRef(new THREE.Vector3());
  const cometTarget     = useRef(new THREE.Vector3());
  const cometHas        = useRef(false);
  const cometFlash      = useRef(0);
  // Track last R so group scale is set only when it actually changes
  const lastRRef        = useRef(0);

  // Single shared material — per-instance color via instanceColor
  const dotGeo   = useMemo(() => new THREE.RingGeometry(0.018, 0.032, 14), []);
  const cometGeo = useMemo(() => new THREE.SphereGeometry(0.036, 8, 8), []);
  const dotMat   = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0.82, vertexColors: true,
    depthWrite: false, side: THREE.DoubleSide,
  }), []);
  const cometMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff", emissive: "#7dcfe0", emissiveIntensity: 3.0, roughness: 0.05,
  }), []);

  // Fibonacci atmosphere — unit sphere, scaled by group
  const atmoGeo = useMemo(() => {
    const N   = 380;
    const phi = Math.PI * (3 - Math.sqrt(5));
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = phi * i;
      pos[i * 3]     = r * Math.cos(t);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ clock }, dt) => {
    // One-time color init: instanceColor is null until the first setColorAt call.
    // Do it before the frame-skip so the mesh isn't invisible on first render.
    if (!colorInitialized.current && dotMeshRef.current) {
      colorInitialized.current = true;
      for (let i = 0; i < SIGN_ENTRIES.length; i++) {
        _iColor.copy(SIGN_BASE_COLORS[i]).multiplyScalar(0.54); // mid-depth brightness
        dotMeshRef.current.setColorAt(i, _iColor);
      }
      if (dotMeshRef.current.instanceColor) dotMeshRef.current.instanceColor.needsUpdate = true;
    }

    // ODD frames only — complement to ParticleField/WristTrails (even frames)
    frameN.current++;
    if (frameN.current % 2 === 0) return;
    const ddt = dt * 2;

    const R = sizeRef.current.height * 0.40;
    if (R < 10) return; // canvas not yet sized

    if (groupRef.current) {
      // Set scale + position only when R actually changes (once per session)
      // Position: front of globe lands at z = -100, safely behind hands (z≈0 to -80)
      // and well within near plane (z = camera_z - near = 9.9)
      if (Math.abs(R - lastRRef.current) > 0.5) {
        lastRRef.current = R;
        groupRef.current.scale.setScalar(R);
        groupRef.current.position.set(0, 0, -(R + 100));
      }
      rotAngle.current += 0.00022 * ddt * 60;
      groupRef.current.rotation.y = rotAngle.current;
    }

    const sinA = Math.sin(rotAngle.current);
    const cosA = Math.cos(rotAngle.current);

    // Smooth probabilities from live candidate
    const { candidate: cand, prediction: pred } = useAppStore.getState();
    const allProbs = cand?.allProbs ?? null;
    const smooth   = smoothProbs.current;
    let maxSmooth  = 0;
    for (let i = 0; i < SIGN_ENTRIES.length; i++) {
      const li     = GLOSS_TO_LABEL_G[SIGN_ENTRIES[i].gloss] ?? -1;
      const target = (allProbs && li >= 0) ? allProbs[li] : 0;
      smooth[i]    = smooth[i] * 0.80 + target * 0.20;
      if (smooth[i] > maxSmooth) maxSmooth = smooth[i];
    }

    // Update comet target
    if (cand?.allProbs && cand.timestamp_ms !== lastCandTs.current) {
      lastCandTs.current = cand.timestamp_ms;
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < SIGN_ENTRIES.length; i++) {
        const li = GLOSS_TO_LABEL_G[SIGN_ENTRIES[i].gloss] ?? -1;
        const p  = li >= 0 ? (cand.allProbs[li] ?? 0) : 0;
        cx += SIGN_POS_UNIT[i].x * p;
        cy += SIGN_POS_UNIT[i].y * p;
        cz += SIGN_POS_UNIT[i].z * p;
      }
      const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (len > 0.01) {
        cometTarget.current.set(cx / len, cy / len, cz / len);
        cometHas.current = true;
      }
    }

    // Prediction glow
    if (pred && pred.timestamp_ms !== lastPredTs.current) {
      lastPredTs.current = pred.timestamp_ms;
      cometFlash.current = 1.0;
      const idx = GLOSS_TO_SIGN_IDX[pred.gloss];
      if (idx !== undefined) glowValues.current[idx] = 1.0;
    }

    // Billboard matrix: counteract group Y-rotation so each ring faces camera
    _billboardMat.makeRotationY(-rotAngle.current);

    // InstancedMesh: 1 draw call for all 50 rings
    const dotMesh = dotMeshRef.current;
    if (dotMesh) {
      for (let i = 0; i < SIGN_ENTRIES.length; i++) {
        const ux   = SIGN_POS_UNIT[i].x;
        const uz   = SIGN_POS_UNIT[i].z;
        const rotZ = -ux * sinA + uz * cosA;

        const glow = glowValues.current[i];
        if (glow > 0.005) glowValues.current[i] *= 0.88;
        else if (glow !== 0) glowValues.current[i] = 0;

        if (rotZ < -0.08) {
          // Back-face: zero-scale to hide
          _iMat.makeScale(0, 0, 0);
        } else {
          const norm   = maxSmooth > 0.001 ? smooth[i] / maxSmooth : 0;
          const sScale = maxSmooth > 0.001 ? Math.max(0.25, norm * 2.5) : 1.0;
          const s      = sScale + glow * 2.2;
          // T * R_billboard * S  — ring faces camera regardless of globe rotation
          _iMat.makeScale(s, s, s);
          _iMat.premultiply(_billboardMat);
          _iMat.setPosition(SIGN_POS_UNIT[i].x, SIGN_POS_UNIT[i].y, SIGN_POS_UNIT[i].z);
        }
        dotMesh.setMatrixAt(i, _iMat);

        // Depth-based brightness: front-facing dots are brighter (fake 3D depth cue)
        const depth01    = (rotZ + 1) / 2; // 0 = back-face, 1 = front-face
        const brightness = 0.28 + depth01 * 0.52 + glowValues.current[i] * 0.45;
        _iColor.copy(SIGN_BASE_COLORS[i]).multiplyScalar(brightness);
        dotMesh.setColorAt(i, _iColor);
      }
      dotMesh.instanceMatrix.needsUpdate = true;
      if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    }

    // Comet
    if (cometHas.current && cometRef.current) {
      cometPos.current.lerp(cometTarget.current, 0.10);
      cometRef.current.position.copy(cometPos.current);
      const flash = cometFlash.current;
      cometFlash.current *= 0.90;
      const pulse = 1 + 0.18 * Math.sin(clock.getElapsedTime() * 5.2);
      cometRef.current.scale.setScalar((2.5 + flash * 5.0) * pulse);
      cometRef.current.visible = true;
      (cometRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        3.0 + flash * 5.0;
    } else if (cometRef.current) {
      cometRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={atmoGeo}>
        <pointsMaterial size={1.4} color="#7dcfe0" sizeAttenuation={false} transparent opacity={0.28} />
      </points>

      {/* Single instanced draw call for all 50 sign dots */}
      <instancedMesh
        ref={dotMeshRef}
        args={[dotGeo, dotMat, SIGN_ENTRIES.length]}
        renderOrder={1}
      />

      <mesh ref={cometRef} geometry={cometGeo} material={cometMat} visible={false} renderOrder={2} />
    </group>
  );
}

// ── Scene lighting + all effects ──────────────────────────────────────────────

// ── Static star field — zero per-frame cost ───────────────────────────────

function StarField() {
  const geo = useMemo(() => {
    const N   = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 3200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2400;
      pos[i * 3 + 2] = -80 - Math.random() * 60; // behind hands
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={1.6}
        color="#7dcfe0"
        sizeAttenuation={false}
        transparent
        opacity={0.28}
      />
    </points>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────

function Scene() {
  return (
    <>
      <color attach="background" args={["#040812"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[1.5, 2, 4]} intensity={2.5} />
      <directionalLight position={[-2, 0, 2]} intensity={0.6} />

      <SignGlobe />
      <StarField />
      <ParticleField />
      <WristTrails />
      <HandModel side="right" hexColor="#3ea89f" />
      <HandModel side="left"  hexColor="#e0686a" />
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface BurstState {
  key: number;
  color: string;
}

export function HandScene3D() {
  const prediction  = useAppStore((s) => s.prediction);
  const lastTs      = useRef<number | null>(null);
  const [burst, setBurst] = useState<BurstState | null>(null);
  const burstKeyRef = useRef(0);

  useEffect(() => {
    if (prediction && prediction.timestamp_ms !== lastTs.current) {
      lastTs.current = prediction.timestamp_ms;
      const color = GLOSS_TO_COLOR[prediction.gloss] ?? "#3ea89f";
      burstKeyRef.current += 1;
      setBurst({ key: burstKeyRef.current, color });
      const t = setTimeout(() => setBurst(null), 800);
      return () => clearTimeout(t);
    }
  }, [prediction]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        orthographic
        camera={{ zoom: 1, position: [0, 0, 10], near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
      >
        <Scene />
      </Canvas>

      <AnimatePresence>
        {burst && (
          <motion.div
            key={burst.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.65, 0] }}
            transition={{ duration: 0.75, ease: "easeOut", times: [0, 0.08, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              pointerEvents: "none",
              background: `radial-gradient(ellipse at center, transparent 20%, ${burst.color}88 100%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
