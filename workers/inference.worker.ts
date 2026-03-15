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
let restCounter = 0;

// ── Softmax ───────────────────────────────────────────────────────
function softmax(logits: Float32Array): Float32Array {
  const max  = Math.max(...logits);
  const exp  = logits.map((v) => Math.exp(v - max));
  const sum  = exp.reduce((a, b) => a + b, 0);
  return exp.map((v) => v / sum) as unknown as Float32Array;
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
    gloss:      top_k[0].gloss,
    confidence: top_k[0].confidence,
    top_k,
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
  if (ringBuffer.length > MAX_BUFFER_SIZE) ringBuffer.shift();

  // Trigger inference at sign boundary
  if (restCounter === REST_FRAMES && ringBuffer.length >= MIN_SIGN_FRAMES) {
    const result = await runInference();
    ringBuffer.length = 0;
    restCounter = 0;

    if (result) {
      self.postMessage({ type: "result", data: result } satisfies InferenceWorkerOut);
    }
  }
}

// ── Message handler ───────────────────────────────────────────────
self.onmessage = async (e: MessageEvent<InferenceWorkerIn>) => {
  const msg = e.data;
  if (msg.type === "init")     await init(msg.modelBuffer, msg.origin);
  if (msg.type === "features") await processFeatures(msg.data);
};
