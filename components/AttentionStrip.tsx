"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";

export function AttentionStrip() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const prediction = useAppStore((s) => s.prediction);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Dark background
    ctx.fillStyle = "rgba(5, 13, 22, 0.72)";
    ctx.fillRect(0, 0, W, H);

    const weights = prediction?.attn_weights;
    if (!weights || weights.length === 0) return;

    const T   = weights.length;
    const colW = W / T;

    // Find max for normalisation
    let maxW = 0;
    for (let i = 0; i < T; i++) maxW = Math.max(maxW, weights[i]);
    if (maxW < 1e-6) return;

    for (let i = 0; i < T; i++) {
      const alpha = Math.pow(weights[i] / maxW, 0.6);
      ctx.fillStyle = `rgba(62, 168, 159, ${alpha.toFixed(3)})`; // --teal
      ctx.fillRect(Math.floor(i * colW), 0, Math.ceil(colW) + 1, H);
    }

    // Subtle label
    ctx.fillStyle = "rgba(176, 171, 161, 0.6)";
    ctx.font = "9px DM Mono, monospace";
    ctx.fillText("attn", 4, H - 3);
  }, [prediction]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={16}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 16,
        zIndex: 3,
        display: "block",
      }}
    />
  );
}
