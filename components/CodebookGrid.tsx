"use client";

import { useEffect, useRef, memo } from "react";
import { useAppStore } from "@/store/appStore";

const COLS   = 16;
const CELL   = 10;   // px per cell
const GAP    = 2;    // px gap between cells

function gridCanvas(
  canvas: HTMLCanvasElement,
  count: number,
  color: string,
  activations: Float32Array | null,
  dominant: number,
) {
  const rows = Math.ceil(count / COLS);
  const W    = COLS * (CELL + GAP) - GAP;
  const H    = rows * (CELL + GAP) - GAP;

  if (canvas.width !== W || canvas.height !== H) {
    canvas.width  = W;
    canvas.height = H;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < count; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x   = col * (CELL + GAP);
    const y   = row * (CELL + GAP);

    const raw     = activations ? activations[i] : 0;
    const opacity = Math.max(0.05, raw ** 0.55);

    ctx.globalAlpha = opacity;
    ctx.fillStyle   = color;
    ctx.fillRect(x, y, CELL, CELL);

    if (i === dominant) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x - 0.75, y - 0.75, CELL + 1.5, CELL + 1.5);
    }
  }

  ctx.globalAlpha = 1;
}

const Grid = memo(function Grid({
  label,
  color,
  count,
  activations,
  dominant,
}: {
  label: string;
  color: string;
  count: number;
  activations: Float32Array | null;
  dominant: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      gridCanvas(canvasRef.current, count, color, activations, dominant);
    }
  }, [activations, dominant, count, color]);

  const rows = Math.ceil(count / COLS);
  const canvasH = rows * (CELL + GAP) - GAP;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
          fontStyle: "italic", fontWeight: 700,
          fontSize: 13, color,
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink5)",
        }}>
          {count} entries
        </span>
        {dominant >= 0 && (
          <span style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9, color, marginLeft: "auto",
          }}>
            #{dominant}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: canvasH, display: "block", imageRendering: "pixelated" }}
      />
    </div>
  );
});

export const CodebookGrid = memo(function CodebookGrid() {
  const phonology = useAppStore((s) => s.phonology);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Grid
        label="H"
        color="var(--coral)"
        count={64}
        activations={phonology?.activations_H ?? null}
        dominant={phonology?.code_H ?? -1}
      />
      <Grid
        label="L"
        color="var(--teal)"
        count={32}
        activations={phonology?.activations_L ?? null}
        dominant={phonology?.code_L ?? -1}
      />
      <Grid
        label="O"
        color="#8b7fd4"
        count={16}
        activations={phonology?.activations_O ?? null}
        dominant={phonology?.code_O ?? -1}
      />
      <Grid
        label="M"
        color="#4dbb87"
        count={64}
        activations={phonology?.activations_M ?? null}
        dominant={phonology?.code_M ?? -1}
      />
    </div>
  );
});
