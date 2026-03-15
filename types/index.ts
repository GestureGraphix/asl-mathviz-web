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

  // Dominant codebook indices (argmax of activations)
  code_H: number;
  code_L: number;

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
  timestamp_ms: number;
}

// ─── App state types ─────────────────────────────────────────────

export interface TranscriptEntry {
  gloss: string;
  confidence: number;
  timestamp_ms: number;
}

export type AppStatus = "idle" | "loading" | "live" | "paused" | "error";

export interface AppState {
  status: AppStatus;
  fps: number;
  latency_ms: number;

  landmarks: Landmarks | null;
  phonology: PhonologyFeatures | null;
  prediction: InferenceResult | null;
  transcript: TranscriptEntry[];

  // Actions
  setStatus: (s: AppStatus) => void;
  setFps: (fps: number) => void;
  setLatency: (ms: number) => void;
  setLandmarks: (l: Landmarks | null) => void;
  setPhonology: (p: PhonologyFeatures | null) => void;
  setPrediction: (r: InferenceResult | null) => void;
  pushTranscript: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;
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
  | { type: "init"; modelBuffer: ArrayBuffer; origin: string }
  | { type: "features"; data: ArrayBuffer; timestamp_ms: number };  // (46,) float32

export type InferenceWorkerOut =
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "result"; data: InferenceResult };

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
