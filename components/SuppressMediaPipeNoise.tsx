"use client";

import { useEffect } from "react";

// MediaPipe's C++ runtime logs INFO/WARNING messages via console.error.
// Next.js dev overlay treats all console.error as errors and shows the red
// overlay. This component intercepts and redirects those specific messages
// to console.log so they stay visible in DevTools without triggering the overlay.
const MEDIAPIPE_PATTERNS = [
  "INFO:",
  "WARNING:",
  "Created TensorFlow Lite",
  "XNNPACK",
  "TfLite",
  "MediaPipe",
  "Falling back",
  "WebGL",
  "wasm",
  "delegate",
  "onnxruntime",
  "no available backend",
  "jsep",
  "ERR:",
];

export function SuppressMediaPipeNoise() {
  useEffect(() => {
    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const msg = args[0];
      if (
        typeof msg === "string" &&
        MEDIAPIPE_PATTERNS.some((p) => msg.includes(p))
      ) {
        console.log("[mediapipe]", ...args);
        return;
      }
      origError(...args);
    };
    return () => {
      console.error = origError;
    };
  }, []);

  return null;
}
