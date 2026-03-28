"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { inferenceWorkerBridge } from "@/lib/inferenceWorkerBridge";
import type { InferenceWorkerOut } from "@/types";

export function useInference({ enabled = true }: { enabled?: boolean } = {}) {
  const workerRef  = useRef<Worker | null>(null);
  const enabledRef = useRef(enabled);

  const setPrediction  = useAppStore((s) => s.setPrediction);
  const setCandidate   = useAppStore((s) => s.setCandidate);
  const setSignFrames  = useAppStore((s) => s.setSignFrames);
  const pushTranscript = useAppStore((s) => s.pushTranscript);
  const setFsLetter    = useAppStore((s) => s.setFsLetter);
  const modelMode      = useAppStore((s) => s.modelMode);

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
        // WASM is now fully initialized — safe to load FS model
        fetch("/models/fs_aug_13dim.onnx")
          .then((r) => r.arrayBuffer())
          .then((buf) => worker.postMessage({ type: "init_fs", modelBuffer: buf, origin }, [buf]))
          .catch((err) => console.error("[inference] fs model load failed:", err));
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
        if (result.confidence >= 0.65) {
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

    // Load sign model first. The FS model is loaded inside the "ready" handler
    // so init_fs() always runs after init() has configured WASM paths.
    const origin = window.location.origin;
    fetch("/models/asl_v1.onnx")
      .then((r) => r.arrayBuffer())
      .then((buf) => worker.postMessage({ type: "init", modelBuffer: buf, origin }, [buf]))
      .catch((err) => console.error("[inference] sign model load failed:", err));

    return () => {
      inferenceWorkerBridge.current = null;
      worker.terminate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync mode changes to the worker
  useEffect(() => {
    workerRef.current?.postMessage({ type: "set_mode", mode: modelMode });
  }, [modelMode]);

  // Reset worker buffers when switching away from recognize mode
  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (!enabled && wasEnabled) {
      workerRef.current?.postMessage({ type: "reset" });
    }
  }, [enabled]);
}
