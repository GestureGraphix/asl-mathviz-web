"use client";

import { useRef, useEffect } from "react";
import { featureBuf, getWriteCount } from "@/lib/featureBuffer";

// ── Feature dimension layout ──────────────────────────────────────────────────
// feature_vector_51: u_H[0:16], u_L[16:22], u_O[22:28], u_M[28:46], u_N[46:51]

const FEAT_DIM    = 51;
const DISP_FRAMES = 120;

// Per-band metadata
const BANDS = [
  { start:  0, end: 16, r: 224, g: 104, b: 106, label: "H" }, // coral
  { start: 16, end: 22, r:  62, g: 168, b: 159, label: "L" }, // teal
  { start: 22, end: 28, r:  80, g: 144, b: 216, label: "O" }, // sky
  { start: 28, end: 46, r:  77, g: 187, b: 135, label: "M" }, // mint
  { start: 46, end: 51, r: 139, g: 127, b: 212, label: "N" }, // lav
] as const;

// O(1) band → color lookup per dimension
const DIM_R = new Uint8Array(FEAT_DIM);
const DIM_G = new Uint8Array(FEAT_DIM);
const DIM_B = new Uint8Array(FEAT_DIM);
const DIM_BAND = new Uint8Array(FEAT_DIM);
for (let bi = 0; bi < BANDS.length; bi++) {
  const { start, end, r, g, b } = BANDS[bi];
  for (let d = start; d < end; d++) {
    DIM_R[d] = r; DIM_G[d] = g; DIM_B[d] = b; DIM_BAND[d] = bi;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhonologicalSpectrogram() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef(0);
  const lastWrite  = useRef(-1);
  const imgDataRef = useRef<ImageData | null>(null);
  const bandMaxes  = useRef(new Float32Array(BANDS.length).fill(0.001));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      const wc = getWriteCount();
      if (wc === lastWrite.current) return;
      lastWrite.current = wc;

      const W = canvas!.width;
      const H = canvas!.height;
      const N = Math.min(featureBuf.length, DISP_FRAMES);
      if (N === 0) return;

      // Reuse ImageData object — avoid per-frame allocation
      if (!imgDataRef.current || imgDataRef.current.width !== W || imgDataRef.current.height !== H) {
        imgDataRef.current = ctx!.createImageData(W, H);
      }
      const buf = imgDataRef.current.data;

      // Background fill — single typed-array fill (SIMD-optimized) vs 51k-iteration loop
      // Little-endian RGBA packing: 0xAA_BB_GG_RR → R=4, G=8, B=18, A=210
      new Uint32Array(buf.buffer).fill((210 << 24 | 18 << 16 | 8 << 8 | 4) >>> 0);

      // Update per-band max from the newest frame (slow EMA toward running peak)
      const latest = featureBuf[featureBuf.length - 1];
      if (latest) {
        for (let bi = 0; bi < BANDS.length; bi++) {
          const { start, end } = BANDS[bi];
          let peak = 0;
          for (let d = start; d < end; d++) {
            const v = Math.abs(latest[d]);
            if (v > peak) peak = v;
          }
          if (peak > bandMaxes.current[bi]) {
            bandMaxes.current[bi] = bandMaxes.current[bi] * 0.96 + peak * 0.04;
          } else {
            bandMaxes.current[bi] *= 0.9998;
            if (bandMaxes.current[bi] < 0.001) bandMaxes.current[bi] = 0.001;
          }
        }
      }

      const startIdx = Math.max(0, featureBuf.length - DISP_FRAMES);
      const xOff     = DISP_FRAMES - N; // left-pad when buffer not yet full

      for (let c = 0; c < N; c++) {
        const fv = featureBuf[startIdx + c];
        if (!fv) continue;

        const cx0 = Math.floor((xOff + c)     / DISP_FRAMES * W);
        const cx1 = Math.floor((xOff + c + 1) / DISP_FRAMES * W);

        for (let d = 0; d < FEAT_DIM; d++) {
          const bi    = DIM_BAND[d];
          const val   = Math.abs(fv[d]) / bandMaxes.current[bi];
          const alpha = (Math.min(1, val) * 220) | 0;

          const dy0 = Math.floor(d       / FEAT_DIM * H);
          const dy1 = Math.floor((d + 1) / FEAT_DIM * H);
          const r   = DIM_R[d];
          const g   = DIM_G[d];
          const b   = DIM_B[d];

          for (let py = dy0; py < dy1; py++) {
            for (let px = cx0; px < cx1; px++) {
              const i = (py * W + px) * 4;
              buf[i]     = r;
              buf[i + 1] = g;
              buf[i + 2] = b;
              buf[i + 3] = alpha;
            }
          }
        }
      }

      ctx!.putImageData(imgDataRef.current!, 0, 0);

      // Parameter labels — overdraw after putImageData
      ctx!.font = "bold 8px DM Mono, monospace";
      for (let bi = 0; bi < BANDS.length; bi++) {
        const { start, end, r, g, b, label } = BANDS[bi];
        const yMid = ((start + end) / 2 / FEAT_DIM) * H + 3;
        ctx!.fillStyle = `rgba(${r},${g},${b},0.72)`;
        ctx!.fillText(label, 3, yMid);
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={64}
      style={{
        position: "absolute",
        bottom: 16,
        left: 0,
        width: "100%",
        height: 64,
        zIndex: 3,
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
