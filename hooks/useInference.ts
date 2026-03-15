"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import type { InferenceWorkerOut } from "@/types";

export function useInference() {
  const workerRef = useRef<Worker | null>(null);

  const phonology      = useAppStore((s) => s.phonology);
  const setPrediction  = useAppStore((s) => s.setPrediction);
  const pushTranscript = useAppStore((s) => s.pushTranscript);

  // Spin up worker once on mount
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/inference.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<InferenceWorkerOut>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        console.log("[inference worker] ready");
      } else if (msg.type === "error") {
        console.error("[inference worker]", msg.message);
      } else if (msg.type === "result") {
        const result = msg.data;
        if (result.confidence >= 0.7) {
          setPrediction(result);
          pushTranscript({
            gloss:        result.gloss,
            confidence:   result.confidence,
            timestamp_ms: result.timestamp_ms,
          });
        }
      }
    };

    // Load the ONNX model and transfer the buffer (zero-copy)
    fetch("/models/asl_v1.onnx")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        worker.postMessage({ type: "init", modelBuffer: buf, origin: window.location.origin }, [buf]);
      })
      .catch((err) => console.error("[inference] model load failed:", err));

    return () => worker.terminate();
  }, [setPrediction, pushTranscript]);

  // Send each new feature vector to the worker
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !phonology) return;

    const fv = phonology.feature_vector;  // Float32Array (46,)
    const buf = fv.buffer.slice(fv.byteOffset, fv.byteOffset + fv.byteLength);
    worker.postMessage({ type: "features", data: buf }, [buf]);
  }, [phonology]);
}
