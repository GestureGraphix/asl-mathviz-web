/**
 * Feature assembly — Section 6.8–6.9
 *
 * Orchestrates Sim(3) normalization + phonological sub-vector computation
 * and assembles the final feature vectors and codebook activations.
 */

import { computeSim3, applySim3 } from "./sim3";
import {
  computeHandshape,
  computeLocation,
  computeOrientation,
  computeMovement,
  computeNonManual,
  makeMovementState,
  type MovementState,
} from "./phonology";
import type { Landmarks, PhonologyFeatures } from "@/types";

// ── Codebook sizes (paper §3.5) ───────────────────────────────────
const CODEBOOK_SIZES = { H: 64, L: 32, O: 16, M: 64, N: 32 } as const;

// ── Persistent movement state (survives across frames) ────────────
let stateL: MovementState = makeMovementState();
let stateR: MovementState = makeMovementState();

export function resetMovementState() {
  stateL = makeMovementState();
  stateR = makeMovementState();
}

// ── §6.9  Codebook soft activations (visualization only) ──────────

/**
 * Deterministic soft assignment without a learned codebook.
 * Derives a "code" from the L2 norm of the sub-vector, then builds
 * a peaked distribution around it using circular distance.
 */
function softActivations(subvec: Float32Array, K: number): Float32Array {
  // Map the sub-vector norm to a code index in [0, K)
  const mag = Math.sqrt(subvec.reduce((s, v) => s + v * v, 0));
  const code = Math.floor((mag % 1.0) * K);  // wrap fractional part into [0, K)

  const act = new Float32Array(K);
  let sum = 0;
  for (let i = 0; i < K; i++) {
    const dist = Math.min(Math.abs(i - code), K - Math.abs(i - code));
    act[i] = Math.exp(-dist / 3.0);
    sum += act[i];
  }
  for (let i = 0; i < K; i++) act[i] /= sum;
  return act;
}

/** L2 norm of a Float32Array */
function l2(v: Float32Array): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

// ── Main entry point ──────────────────────────────────────────────

export function extractFeatures(landmarks: Landmarks): PhonologyFeatures {
  // 1. Sim(3) normalization
  const sim3 = landmarks.pose ? computeSim3(landmarks.pose) : null;

  const normL = landmarks.left_hand
    ? sim3 ? applySim3(landmarks.left_hand, sim3) : landmarks.left_hand
    : null;

  const normR = landmarks.right_hand
    ? sim3 ? applySim3(landmarks.right_hand, sim3) : landmarks.right_hand
    : null;

  // 2. Phonological sub-vectors
  const u_H = computeHandshape(normL, normR);
  const u_L = computeLocation(normL, normR);
  const u_O = computeOrientation(normL, normR);
  const u_M = computeMovement(normL, normR, stateL, stateR);
  const u_N = computeNonManual(landmarks.face ?? null);

  // 3. Feature vectors
  const feature_vector    = new Float32Array(46);
  const feature_vector_51 = new Float32Array(51);

  feature_vector.set(u_H, 0);
  feature_vector.set(u_L, 16);
  feature_vector.set(u_O, 22);
  feature_vector.set(u_M, 28);

  feature_vector_51.set(feature_vector, 0);
  feature_vector_51.set(u_N, 46);

  // 4. Codebook soft activations (for visualization)
  const activations_H = softActivations(u_H, CODEBOOK_SIZES.H);
  const activations_L = softActivations(u_L, CODEBOOK_SIZES.L);

  // 5. Dominant code indices (argmax)
  const argmax = (a: Float32Array) =>
    a.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);

  // Orientation scalar: deviation of palm normal from frontal (camera-facing).
  // The z-component of the unit normal = how much the palm faces the camera.
  // 1 - |z| → 0 when palm faces camera, 1 when palm faces fully sideways.
  // This is meaningful and changes with hand rotation; L2 norm would always be 1.
  let norm_O = 0;
  let handCount = 0;
  if (normL) { norm_O += 1 - Math.abs(u_O[2]); handCount++; }
  if (normR) { norm_O += 1 - Math.abs(u_O[5]); handCount++; }
  if (handCount > 0) norm_O /= handCount;

  return {
    u_H, u_L, u_O, u_M, u_N,
    feature_vector,
    feature_vector_51,
    activations_H,
    activations_L,
    norm_H: l2(u_H),
    norm_L: l2(u_L),
    norm_O,
    norm_M: l2(u_M),
    norm_N: l2(u_N),
    code_H: argmax(activations_H),
    code_L: argmax(activations_L),
  };
}
