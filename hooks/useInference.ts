"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { inferenceWorkerBridge } from "@/lib/inferenceWorkerBridge";
import type { InferenceWorkerOut } from "@/types";

export function useInference({ enabled = true }: { enabled?: boolean } = {}) {
  const workerRef  = useRef<Worker | null>(null);
  const enabledRef = useRef(enabled);

  const setPrediction      = useAppStore((s) => s.setPrediction);
  const setCandidate       = useAppStore((s) => s.setCandidate);
  const setSignFrames      = useAppStore((s) => s.setSignFrames);
  const pushTranscript     = useAppStore((s) => s.pushTranscript);
  const setFsLetter        = useAppStore((s) => s.setFsLetter);
  const modelMode          = useAppStore((s) => s.modelMode);
  const signModelVersion   = useAppStore((s) => s.signModelVersion);

  // Spin up worker once on mount
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/inference.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    inferenceWorkerBridge.current = worker;

    worker.onmessage = (e: MessageEvent<InferenceWorkerOut>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        // WASM configured — now safe to load FS + v2 models in parallel
        fetch("/models/fs_aug_13dim.onnx")
          .then((r) => r.arrayBuffer())
          .then((buf) => worker.postMessage({ type: "init_fs", modelBuffer: buf, origin }, [buf]))
          .catch((err) => console.error("[inference] fs model load failed:", err));
        fetch("/models/asl_raw_v2.onnx")
          .then((r) => r.arrayBuffer())
          .then((buf) => worker.postMessage({ type: "init_v2", modelBuffer: buf, origin }, [buf]))
          .catch((err) => console.error("[inference] v2 model load failed:", err));
      } else if (msg.type === "v2_ready") {
        // v2 model ready — sync initial version to worker
        worker.postMessage({ type: "set_sign_model", version: useAppStore.getState().signModelVersion });
      } else if (msg.type === "fs_ready") {
        // FS model ready
      } else if (msg.type === "error") {
        console.error("[inference worker]", msg.message);
      } else if (msg.type === "frames") {
        setSignFrames(msg.count);
      } else if (msg.type === "live") {
        setCandidate(msg.data);
      } else if (msg.type === "result") {
        const result = msg.data;
        setCandidate(null);
        const threshold = useAppStore.getState().signModelVersion === "v2" ? 0.35 : 0.65;
        if (result.confidence >= threshold) {
          setPrediction(result);
          pushTranscript({
            gloss:        result.gloss,
            confidence:   result.confidence,
            timestamp_ms: result.timestamp_ms,
          });
        }
      } else if (msg.type === "letter") {
        setFsLetter(msg.data.letter || null);
      }
    };

    // Load v1 model first — its "ready" handler triggers v2 + FS loads.
    const origin = window.location.origin;
    fetch("/models/asl_v1.onnx")
      .then((r) => r.arrayBuffer())
      .then((buf) => worker.postMessage({ type: "init", modelBuffer: buf, origin }, [buf]))
      .catch((err) => console.error("[inference] v1 model load failed:", err));

    return () => {
      inferenceWorkerBridge.current = null;
      worker.terminate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mode changes to the worker
  useEffect(() => {
    workerRef.current?.postMessage({ type: "set_mode", mode: modelMode });
  }, [modelMode]);

  // Sync sign model version changes to the worker
  useEffect(() => {
    workerRef.current?.postMessage({ type: "set_sign_model", version: signModelVersion });
  }, [signModelVersion]);

  // Reset worker buffers when switching away from recognize mode
  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (!enabled && wasEnabled) {
      workerRef.current?.postMessage({ type: "reset" });
    }
  }, [enabled]);
}
