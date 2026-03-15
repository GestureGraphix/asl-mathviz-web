import { create } from "zustand";
import type {
  AppState,
  AppStatus,
  Landmarks,
  PhonologyFeatures,
  InferenceResult,
  TranscriptEntry,
} from "@/types";

const MAX_TRANSCRIPT = 20;

export const useAppStore = create<AppState>((set) => ({
  status: "idle",
  fps: 0,
  latency_ms: 0,

  landmarks: null,
  phonology: null,
  prediction: null,
  transcript: [],

  setStatus: (status: AppStatus) => set({ status }),
  setFps: (fps: number) => set({ fps }),
  setLatency: (latency_ms: number) => set({ latency_ms }),
  setLandmarks: (landmarks: Landmarks | null) => set({ landmarks }),
  setPhonology: (phonology: PhonologyFeatures | null) => set({ phonology }),
  setPrediction: (prediction: InferenceResult | null) => set({ prediction }),

  pushTranscript: (entry: TranscriptEntry) =>
    set((state) => ({
      transcript: [entry, ...state.transcript].slice(0, MAX_TRANSCRIPT),
    })),

  clearTranscript: () => set({ transcript: [] }),
}));
