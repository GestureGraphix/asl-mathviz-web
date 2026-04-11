/// <reference lib="webworker" />

import * as ort from "onnxruntime-web";
import type { InferenceWorkerIn, InferenceWorkerOut, InferenceResult, ModelMode } from "@/types";

declare const self: DedicatedWorkerGlobalScope;

// ── Constants ────────────────────────────────────────────────────
const REST_NORM_THRESHOLD = 0.008; // frame-to-frame delta in Sim3-normalized coords
const REST_FRAMES         = 4;
const MIN_SIGN_FRAMES     = 8;
const MAX_BUFFER_SIZE     = 120;  // 4s at 30fps

// ── Sign model state ──────────────────────────────────────────────
let sessionV1:    ort.InferenceSession | null = null;
let sessionV2:    ort.InferenceSession | null = null;
let idToGlossV1:  Record<number, string>      = {};
let idToGlossV2:  Record<number, string>      = {};
let activeVersion: "v1" | "v2"               = "v2";
let prevFrame: Float32Array | null            = null;

// ── Fingerspelling model state ────────────────────────────────────
let fsSession: ort.InferenceSession | null = null;
let fsLetterClasses: string[]              = [];
let fsNormMean: Float32Array               = new Float32Array(13);
let fsNormStd:  Float32Array               = new Float32Array(13).fill(1);
let fsMode = false;
const FS_SMOOTH_WINDOW = 7;
const fsSmooth: string[] = [];

const ringBuffer: Float32Array[] = [];
const normBuffer: number[]       = [];
let restCounter  = 0;
let liveFrameCtr = 0;
let lastReportedFrameCount = -1;
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

    sessionV1 = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });

    // Load v1 vocab (50 signs)
    const res = await fetch(`${origin}/data/vocab.json`);
    const vocab = await res.json();
    idToGlossV1 = Object.fromEntries(
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

// ── Init v2 (2,279-sign raw-keypoint model) ───────────────────────
async function initV2(modelBuffer: ArrayBuffer, origin: string) {
  try {
    sessionV2 = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    const res = await fetch(`${origin}/data/vocab_2279.json`);
    const vocab = await res.json();
    idToGlossV2 = Object.fromEntries(
      Object.entries(vocab.id_to_gloss).map(([k, v]) => [Number(k), v as string])
    );
    self.postMessage({ type: "v2_ready" } satisfies InferenceWorkerOut);
  } catch (err) {
    self.postMessage({ type: "error", message: `[v2] ${String(err)}` } satisfies InferenceWorkerOut);
  }
}

// ── Run inference on current buffer ──────────────────────────────
async function runInference(): Promise<InferenceResult | null> {
  const session   = activeVersion === "v1" ? sessionV1 : sessionV2;
  const idToGloss = activeVersion === "v1" ? idToGlossV1 : idToGlossV2;
  if (!session || ringBuffer.length < MIN_SIGN_FRAMES) return null;

  const T   = ringBuffer.length;
  const dim = activeVersion === "v1" ? 46 : 153;

  const data = new Float32Array(T * dim);
  for (let t = 0; t < T; t++) {
    data.set(ringBuffer[t], t * dim);
  }

  const tensor = new ort.Tensor("float32", data, [1, T, dim]);
  const feeds: Record<string, ort.Tensor> = activeVersion === "v1"
    ? { features: tensor }
    : { poses: tensor };

  const results = await session.run(feeds);
  const logits  = results["logits"].data as Float32Array;
  const probs   = softmax(logits);

  // Top-5 via single-pass partial selection — O(n) vs O(n log n) full sort
  const K = 5;
  const topIdx = new Int32Array(K).fill(-1);
  const topVal = new Float32Array(K);
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p <= topVal[K - 1] && topIdx[K - 1] !== -1) continue;
    // Insert into sorted top-K
    let j = K - 1;
    while (j > 0 && (topIdx[j - 1] === -1 || p > topVal[j - 1])) {
      topIdx[j] = topIdx[j - 1];
      topVal[j] = topVal[j - 1];
      j--;
    }
    topIdx[j] = i;
    topVal[j] = p;
  }

  const top_k: { gloss: string; confidence: number }[] = [];
  for (let k = 0; k < K; k++) {
    if (topIdx[k] < 0) break;
    top_k.push({ gloss: idToGloss[topIdx[k]] ?? `#${topIdx[k]}`, confidence: topVal[k] });
  }

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
  const fv      = new Float32Array(data);
  const isV1    = fv.length === 46;
  const isV2    = fv.length === 153;
  if (!isV1 && !isV2) return;
  // Ignore frames from the wrong model version
  if (isV1 && activeVersion !== "v1") return;
  if (isV2 && activeVersion !== "v2") return;

  let movNorm = 0;
  if (isV1) {
    // v1: u_M sub-vector is fv[28:46]
    for (let i = 28; i < 46; i++) movNorm += fv[i] * fv[i];
    movNorm = Math.sqrt(movNorm);
  } else {
    // v2: frame-to-frame delta across both hands (dims 0-125)
    if (prevFrame) {
      for (let i = 0; i < 126; i++) { const d = fv[i] - prevFrame[i]; movNorm += d * d; }
      movNorm = Math.sqrt(movNorm / 126);
    } else {
      movNorm = 1.0;
    }
    prevFrame = fv;
  }

  if (movNorm < REST_NORM_THRESHOLD) {
    restCounter++;
  } else {
    restCounter = 0;
  }

  ringBuffer.push(fv);
  normBuffer.push(movNorm);
  if (ringBuffer.length > MAX_BUFFER_SIZE) { ringBuffer.shift(); normBuffer.shift(); }

  // Report current buffer size only when it actually changes
  if (ringBuffer.length !== lastReportedFrameCount) {
    lastReportedFrameCount = ringBuffer.length;
    self.postMessage({ type: "frames", count: ringBuffer.length } satisfies InferenceWorkerOut);
  }

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
    lastReportedFrameCount = 0;
    self.postMessage({ type: "frames", count: 0 } satisfies InferenceWorkerOut);

    if (result) {
      const t: ArrayBuffer[] = [];
      if (result.allProbs)     t.push(result.allProbs.buffer as ArrayBuffer);
      if (result.attn_weights) t.push(result.attn_weights.buffer as ArrayBuffer);
      self.postMessage({ type: "result", data: result } satisfies InferenceWorkerOut, t);
    }
  }
}

// ── Reset sign buffers ────────────────────────────────────────────
function resetBuffers() {
  ringBuffer.length = 0;
  normBuffer.length = 0;
  restCounter  = 0;
  liveFrameCtr = 0;
  lastReportedFrameCount = 0;
  prevFrame = null;
  self.postMessage({ type: "frames", count: 0 } satisfies InferenceWorkerOut);
}

// ── Init fingerspelling model ─────────────────────────────────────
async function initFs(modelBuffer: ArrayBuffer, origin: string) {
  try {
    // WASM env already configured by init() — just create the session
    fsSession = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    const res  = await fetch(`${origin}/data/fs_aug_13dim_meta.json`);
    const meta = await res.json();
    fsLetterClasses = meta.letter_classes as string[];
    fsNormMean = new Float32Array(meta.norm_mean as number[]);
    fsNormStd  = new Float32Array(meta.norm_std  as number[]);
    self.postMessage({ type: "fs_ready" } satisfies InferenceWorkerOut);
  } catch (err) {
    self.postMessage({ type: "error", message: `[fs] ${String(err)}` } satisfies InferenceWorkerOut);
  }
}

// ── Process one fingerspelling feature frame ──────────────────────
async function processFsFeatures(data: ArrayBuffer) {
  if (!fsSession || fsLetterClasses.length === 0) return;
  const fv = new Float32Array(data);
  if (fv.length !== 13) return;

  // z-score normalize using training stats
  const x = new Float32Array(13);
  for (let i = 0; i < 13; i++) x[i] = (fv[i] - fsNormMean[i]) / fsNormStd[i];

  const tensor  = new ort.Tensor("float32", x, [1, 13]);
  const out     = await fsSession.run({ h_features: tensor });
  const logits  = out["logits"].data as Float32Array;
  const probs   = softmax(logits);

  let maxIdx = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[maxIdx]) maxIdx = i;

  const raw        = fsLetterClasses[maxIdx];
  const confidence = probs[maxIdx];

  // Majority-vote smoothing over last FS_SMOOTH_WINDOW frames
  fsSmooth.push(raw);
  if (fsSmooth.length > FS_SMOOTH_WINDOW) fsSmooth.shift();
  const counts: Record<string, number> = {};
  for (const l of fsSmooth) counts[l] = (counts[l] ?? 0) + 1;
  let letter = raw, best = 0;
  for (const [l, c] of Object.entries(counts)) if (c > best) { letter = l; best = c; }

  self.postMessage({ type: "letter", data: { letter, confidence } } satisfies InferenceWorkerOut);
}

// ── Switch sign model version ─────────────────────────────────────
function setSignModel(version: "v1" | "v2") {
  activeVersion = version;
  resetBuffers();
}

// ── Switch model mode ─────────────────────────────────────────────
function setMode(mode: ModelMode) {
  fsMode = mode === "fingerspelling";
  if (fsMode) {
    resetBuffers();          // clear sign ring buffer
  } else {
    fsSmooth.length = 0;     // clear FS smoothing window
    self.postMessage({ type: "letter", data: { letter: "", confidence: 0 } } satisfies InferenceWorkerOut);
  }
}

// ── Message handler ───────────────────────────────────────────────
self.onmessage = async (e: MessageEvent<InferenceWorkerIn>) => {
  const msg = e.data;
  if (msg.type === "init")           await init(msg.modelBuffer, msg.origin);
  if (msg.type === "init_v2")        await initV2(msg.modelBuffer, msg.origin);
  if (msg.type === "init_fs")        await initFs(msg.modelBuffer, msg.origin);
  if (msg.type === "features")       await processFeatures(msg.data);
  if (msg.type === "features_fs")    await processFsFeatures(msg.data);
  if (msg.type === "set_mode")       setMode(msg.mode);
  if (msg.type === "set_sign_model") setSignModel(msg.version);
  if (msg.type === "reset")          resetBuffers();
};
