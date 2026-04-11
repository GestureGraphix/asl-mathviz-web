// ─── Landmark types ──────────────────────────────────────────────

export interface Landmarks {
  left_hand?: Float32Array;   // (63,) = 21 landmarks × 3 coords, normalized [0,1]
  right_hand?: Float32Array;  // (63,)
  pose?: Float32Array;        // (99,) = 33 × 3
  face?: Float32Array;        // (1404,) = 468 × 3
  timestamp_ms: number;
}

export interface Sim3Params {
  scale: number;
  translation: [number, number, number];
  rotation: [number, number, number, number, number, number, number, number, number]; // 3×3 row-major
}

// ─── Feature types ───────────────────────────────────────────────

export interface PhonologyFeatures {
  u_H: Float32Array;  // (16,) — handshape
  u_L: Float32Array;  // (6,)  — location
  u_O: Float32Array;  // (6,)  — orientation
  u_M: Float32Array;  // (18,) — movement
  u_N: Float32Array;  // (5,)  — non-manual

  feature_vector:    Float32Array;  // (46,) — V1 model input
  feature_vector_51: Float32Array;  // (51,) — paper v3

  // Codebook activations (soft assignments, normalized 0–1 per entry)
  activations_H: Float32Array;  // (64,)
  activations_L: Float32Array;  // (32,)
  activations_O: Float32Array;  // (16,)
  activations_M: Float32Array;  // (64,)

  // Dominant codebook indices (argmax of activations)
  code_H: number;
  code_L: number;
  code_O: number;
  code_M: number;

  // Scalar norms per component (displayed below bars)
  norm_H: number;
  norm_L: number;
  norm_O: number;
  norm_M: number;
  norm_N: number;
}

// ─── Inference types ─────────────────────────────────────────────

export interface InferenceResult {
  gloss: string;
  confidence: number;         // 0–1
  top_k: Array<{ gloss: string; confidence: number }>;
  attn_weights?: Float32Array; // (seq_len,) attention weights
  allProbs?: Float32Array;     // (vocab_size,) full softmax — sent with live messages for globe viz
  timestamp_ms: number;
}

// ─── App state types ─────────────────────────────────────────────

export interface TranscriptEntry {
  gloss: string;
  confidence: number;
  timestamp_ms: number;
}

export type AppStatus = "idle" | "loading" | "live" | "paused" | "error";
export type ModelMode = "signs" | "fingerspelling";
export type SignModelVersion = "v1" | "v2";

export interface AppState {
  status: AppStatus;
  fps: number;
  latency_ms: number;

  landmarks: Landmarks | null;
  phonology: PhonologyFeatures | null;
  prediction: InferenceResult | null;
  candidate:  InferenceResult | null;  // live estimate before threshold commit
  transcript: TranscriptEntry[];
  signFrames: number;                  // frames accumulated in current sign buffer

  modelMode: ModelMode;
  signModelVersion: SignModelVersion;
  fsLetter: string | null;             // current fingerspelling letter prediction

  // Actions
  setStatus: (s: AppStatus) => void;
  setFps: (fps: number) => void;
  setLatency: (ms: number) => void;
  setLandmarks: (l: Landmarks | null) => void;
  setPhonology: (p: PhonologyFeatures | null) => void;
  setPrediction: (r: InferenceResult | null) => void;
  setCandidate:  (r: InferenceResult | null) => void;
  setSignFrames: (n: number) => void;
  pushTranscript: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;
  setModelMode: (m: ModelMode) => void;
  setSignModelVersion: (v: SignModelVersion) => void;
  setFsLetter: (l: string | null) => void;
}

// ─── Worker message types ─────────────────────────────────────────

export type MediaPipeWorkerIn =
  | { type: "init" }
  | { type: "frame"; bitmap: ImageBitmap; timestamp_ms: number };

export type MediaPipeWorkerOut =
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "landmarks"; data: {
      left_hand?: ArrayBuffer;
      right_hand?: ArrayBuffer;
      pose?: ArrayBuffer;
      face?: ArrayBuffer;
      timestamp_ms: number;
    }};

export type InferenceWorkerIn =
  | { type: "init";    modelBuffer: ArrayBuffer; origin: string }
  | { type: "init_v2"; modelBuffer: ArrayBuffer; origin: string }
  | { type: "init_fs"; modelBuffer: ArrayBuffer; origin: string }
  | { type: "features";    data: ArrayBuffer }   // (46,) float32 — v1 sign model
  | { type: "features";    data: ArrayBuffer }   // (153,) float32 — v2 sign model
  | { type: "features_fs"; data: ArrayBuffer }   // (13,) float32 — fingerspelling model
  | { type: "set_mode"; mode: ModelMode }
  | { type: "set_sign_model"; version: SignModelVersion }
  | { type: "reset" };

export type InferenceWorkerOut =
  | { type: "ready" }
  | { type: "v2_ready" }
  | { type: "fs_ready" }
  | { type: "error"; message: string }
  | { type: "result"; data: InferenceResult }
  | { type: "live";   data: InferenceResult }
  | { type: "frames"; count: number }
  | { type: "letter"; data: { letter: string; confidence: number } };

// ─── Data file types (vocab.json, sign_space.json) ─────────────

export interface VocabEntry {
  gloss: string;
  label_idx: number;
  minimal_pairs: string[];
  phonology: {
    H: string;  // codebook index or label
    L: string;
    O: string;
    M: string;
  };
}

export interface SignSpaceEntry {
  gloss: string;
  x: number;
  y: number;
  z: number;
  cluster: number;
  color: string;
}
