import { create } from "zustand";
import type {
  AppState,
  AppStatus,
  ModelMode,
  SignModelVersion,
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
  candidate:  null,
  transcript: [],
  signFrames: 0,
  modelMode: "signs",
  signModelVersion: "v1" as SignModelVersion,
  fsLetter: null,

  setStatus: (status: AppStatus) => set({ status }),
  setFps: (fps: number) => set({ fps }),
  setLatency: (latency_ms: number) => set({ latency_ms }),
  setLandmarks: (landmarks: Landmarks | null) => set({ landmarks }),
  setPhonology: (phonology: PhonologyFeatures | null) => set({ phonology }),
  setPrediction: (prediction: InferenceResult | null) => set({ prediction }),
  setCandidate:  (candidate:  InferenceResult | null) => set({ candidate }),
  setSignFrames: (signFrames: number) => set({ signFrames }),

  pushTranscript: (entry: TranscriptEntry) =>
    set((state) => ({
      transcript: [entry, ...state.transcript].slice(0, MAX_TRANSCRIPT),
    })),

  clearTranscript: () => set({ transcript: [] }),
  setModelMode: (modelMode: ModelMode) => set({ modelMode, fsLetter: null }),
  setSignModelVersion: (signModelVersion: SignModelVersion) => set({ signModelVersion, prediction: null, candidate: null }),
  setFsLetter: (fsLetter: string | null) => set({ fsLetter }),
}));
