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

  // Spin up worker once on mount
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/inference.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    // Expose to useMediaPipe for direct feature forwarding (no Zustand round-trip)
    inferenceWorkerBridge.current = worker;

    worker.onmessage = (e: MessageEvent<InferenceWorkerOut>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        // worker ready
      } else if (msg.type === "error") {
        console.error("[inference worker]", msg.message);
      } else if (msg.type === "frames") {
        setSignFrames(msg.count);
      } else if (msg.type === "live") {
        setCandidate(msg.data);
      } else if (msg.type === "result") {
        const result = msg.data;
        setCandidate(null);  // clear live estimate on commit
        if (result.confidence >= 0.65) {
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

    return () => {
      inferenceWorkerBridge.current = null;
      worker.terminate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset worker buffers when switching away from recognize mode
  useEffect(() => {
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;
    if (!enabled && wasEnabled) {
      workerRef.current?.postMessage({ type: "reset" });
    }
  }, [enabled]);
}
