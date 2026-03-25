/// <reference lib="webworker" />

import * as ort from "onnxruntime-web";
import type { InferenceWorkerIn, InferenceWorkerOut, InferenceResult } from "@/types";

declare const self: DedicatedWorkerGlobalScope;

// ── Constants matching v1_inference.py ───────────────────────────
const REST_NORM_THRESHOLD = 0.5;
const REST_FRAMES         = 4;
const MIN_SIGN_FRAMES     = 8;
const MAX_BUFFER_SIZE     = 120;  // 4s at 30fps

// ── State ─────────────────────────────────────────────────────────
let session:  ort.InferenceSession | null = null;
let idToGloss: Record<number, string>     = {};

const ringBuffer: Float32Array[] = [];
const normBuffer: number[]       = [];
let restCounter  = 0;
let liveFrameCtr = 0;
const LIVE_EVERY = 15;  // send a live candidate every N frames (~500ms at 30fps)

// ── Softmax ───────────────────────────────────────────────────────
function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

// ── Init ──────────────────────────────────────────────────────────
async function init(modelBuffer: ArrayBuffer, origin: string) {
  try {
    // Use the non-threaded SIMD WASM (ort-wasm-simd.wasm from onnxruntime-web 1.14).
    // The threaded build requires SharedArrayBuffer even with numThreads=1.
    // Non-threaded SIMD is fast enough for sign-boundary inference (~50ms per sign).
    // Absolute URLs required because self.location is a blob: URL inside a module worker.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd       = true;
    ort.env.wasm.wasmPaths  = {
      "ort-wasm-simd.wasm": `${origin}/ort-wasm-simd.wasm`,
      "ort-wasm.wasm":      `${origin}/ort-wasm.wasm`,
    };

    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });

    // Load vocab (absolute URL — self.location is blob: inside module worker)
    const res = await fetch(`${origin}/data/vocab.json`);
    const vocab = await res.json();
    idToGloss = Object.fromEntries(
      Object.entries(vocab.id_to_gloss).map(([k, v]) => [Number(k), v as string])
    );

    self.postMessage({ type: "ready" } satisfies InferenceWorkerOut);
  } catch (err) {
    self.postMessage({
      type: "error",
      message: String(err),
    } satisfies InferenceWorkerOut);
  }
}

// ── Run inference on current buffer ──────────────────────────────
async function runInference(): Promise<InferenceResult | null> {
  if (!session || ringBuffer.length < MIN_SIGN_FRAMES) return null;

  const T   = ringBuffer.length;
  const dim = 46;

  // Pack ring buffer into flat Float32Array: shape (1, T, 46)
  const data = new Float32Array(T * dim);
  for (let t = 0; t < T; t++) {
    data.set(ringBuffer[t], t * dim);
  }

  const tensor = new ort.Tensor("float32", data, [1, T, dim]);
  const feeds  = { features: tensor };

  const results = await session.run(feeds);
  const logits  = results["logits"].data as Float32Array;
  const probs   = softmax(logits);

  // Top-k
  const indexed = Array.from(probs).map((p, i) => ({ i, p }));
  indexed.sort((a, b) => b.p - a.p);

  const top_k = indexed.slice(0, 5).map(({ i, p }) => ({
    gloss: idToGloss[i] ?? `#${i}`,
    confidence: p,
  }));

  return {
    gloss:        top_k[0].gloss,
    confidence:   top_k[0].confidence,
    top_k,
    allProbs:     probs,
    attn_weights: new Float32Array(normBuffer.slice(-T)),
    timestamp_ms: performance.now(),
  };
}

// ── Process one feature frame ─────────────────────────────────────
async function processFeatures(data: ArrayBuffer) {
  const fv = new Float32Array(data);
  if (fv.length !== 46) return;

  // Movement norm: u^M sub-vector is fv[28:46]
  let movNorm = 0;
  for (let i = 28; i < 46; i++) movNorm += fv[i] * fv[i];
  movNorm = Math.sqrt(movNorm);

  if (movNorm < REST_NORM_THRESHOLD) {
    restCounter++;
  } else {
    restCounter = 0;
  }

  ringBuffer.push(fv);
  normBuffer.push(movNorm);
  if (ringBuffer.length > MAX_BUFFER_SIZE) { ringBuffer.shift(); normBuffer.shift(); }

  // Report current buffer size to main thread every frame
  self.postMessage({ type: "frames", count: ringBuffer.length } satisfies InferenceWorkerOut);

  // Throttled live candidate — runs every LIVE_EVERY frames while buffer has enough data
  liveFrameCtr++;
  if (liveFrameCtr >= LIVE_EVERY) {
    liveFrameCtr = 0;
    const live = await runInference();
    if (live) {
      const t: ArrayBuffer[] = [];
      if (live.allProbs)     t.push(live.allProbs.buffer as ArrayBuffer);
      if (live.attn_weights) t.push(live.attn_weights.buffer as ArrayBuffer);
      self.postMessage({ type: "live", data: live } satisfies InferenceWorkerOut, t);
    }
  }

  // Trigger committed inference at sign boundary
  if (restCounter === REST_FRAMES && ringBuffer.length >= MIN_SIGN_FRAMES) {
    const result = await runInference();
    ringBuffer.length = 0;
    normBuffer.length = 0;
    restCounter = 0;
    liveFrameCtr = 0;
    self.postMessage({ type: "frames", count: 0 } satisfies InferenceWorkerOut);

    if (result) {
      const t: ArrayBuffer[] = [];
      if (result.allProbs)     t.push(result.allProbs.buffer as ArrayBuffer);
      if (result.attn_weights) t.push(result.attn_weights.buffer as ArrayBuffer);
      self.postMessage({ type: "result", data: result } satisfies InferenceWorkerOut, t);
    }
  }
}

// ── Reset ─────────────────────────────────────────────────────────
function resetBuffers() {
  ringBuffer.length = 0;
  normBuffer.length = 0;
  restCounter  = 0;
  liveFrameCtr = 0;
  self.postMessage({ type: "frames", count: 0 } satisfies InferenceWorkerOut);
}

// ── Message handler ───────────────────────────────────────────────
self.onmessage = async (e: MessageEvent<InferenceWorkerIn>) => {
  const msg = e.data;
  if (msg.type === "init")     await init(msg.modelBuffer, msg.origin);
  if (msg.type === "features") await processFeatures(msg.data);
  if (msg.type === "reset")    resetBuffers();
};
