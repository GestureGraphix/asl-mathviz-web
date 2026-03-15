"use client";

import { useEffect, useRef, useState } from "react";
import { featureBuf, writeCount as getWriteCount } from "@/lib/featureBuffer";

// ── Layout constants ──────────────────────────────────────────────────────────
const SEGMENTS = [
  { label: "H", start: 0,  end: 16, color: "#e0686a", maxV: Math.PI },
  { label: "L", start: 16, end: 22, color: "#3ea89f", maxV: 0.5    },
  { label: "O", start: 22, end: 28, color: "#5090d8", maxV: 1.0    },
  { label: "M", start: 28, end: 46, color: "#4dbb87", maxV: 0.04   },
  { label: "N", start: 46, end: 51, color: "#8b7fd4", maxV: 0.08   },
] as const;

const MAX_FRAMES = 150;
const SEP_PX     = 3;
const LABEL_W    = 18;
const CANVAS_W   = 800;
const CANVAS_H   = 192;

const TOTAL_ROWS = SEGMENTS.reduce((s, g) => s + (g.end - g.start), 0);
const USABLE_H   = CANVAS_H - (SEGMENTS.length - 1) * SEP_PX;
const ROW_H      = USABLE_H / TOTAL_ROWS;
const DRAW_W     = CANVAS_W - LABEL_W;
const COL_W      = DRAW_W / MAX_FRAMES;

// Pre-compute segment Y offsets
const SEG_Y = SEGMENTS.map((_, si) => {
  let y = 0;
  for (let i = 0; i < si; i++) y += (SEGMENTS[i].end - SEGMENTS[i].start) * ROW_H + SEP_PX;
  return y;
});

function drawColumn(ctx: CanvasRenderingContext2D, fv: Float32Array, x: number) {
  for (let si = 0; si < SEGMENTS.length; si++) {
    const seg = SEGMENTS[si];
    ctx.fillStyle = seg.color;
    for (let di = seg.start; di < seg.end; di++) {
      ctx.globalAlpha = Math.max(0.04, (Math.min(1, Math.abs(fv[di]) / seg.maxV)) ** 0.65);
      ctx.fillRect(x, SEG_Y[si] + (di - seg.start) * ROW_H, COL_W + 0.5, ROW_H + 0.3);
    }
  }
}

function drawLabels(ctx: CanvasRenderingContext2D) {
  ctx.font = `bold italic 11px 'Bodoni Moda', serif`;
  ctx.globalAlpha = 1;
  for (let si = 0; si < SEGMENTS.length; si++) {
    const seg  = SEGMENTS[si];
    const midY = SEG_Y[si] + ((seg.end - seg.start) * ROW_H) / 2 + 4;
    ctx.fillStyle = seg.color;
    ctx.fillText(seg.label, 2, midY);
  }
}

function fullRedraw(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#050d16";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const N = featureBuf.length;
  for (let fi = 0; fi < N; fi++) {
    drawColumn(ctx, featureBuf[fi], LABEL_W + fi * COL_W);
  }
  ctx.globalAlpha = 1;
  if (N > 0) {
    ctx.fillStyle = "rgba(176,171,161,0.4)";
    ctx.fillRect(LABEL_W + Math.min(N, MAX_FRAMES) * COL_W - 1, 0, 1, CANVAS_H);
  }
  drawLabels(ctx);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FeatureWaterfall() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  // Tracks the last writeCount we rendered — NOT featureBuf.length
  // (length stays at 150 once full; writeCount keeps incrementing)
  const lastWriteRef = useRef(-1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId: number;

    function tick() {
      const currentWrite = getWriteCount;  // module-level let, read directly
      const lastWrite    = lastWriteRef.current;

      // No new data since last draw — skip
      if (currentWrite === lastWrite) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas!.getContext("2d");
      if (!ctx) { rafId = requestAnimationFrame(tick); return; }

      if (featureBuf.length === 0) {
        ctx.fillStyle = "#050d16";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "rgba(176,171,161,0.3)";
        ctx.font = "10px DM Mono, monospace";
        ctx.fillText("waiting for data…", LABEL_W + 8, CANVAS_H / 2 + 4);
        lastWriteRef.current = currentWrite;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const newFrames = lastWrite < 0
        ? MAX_FRAMES + 1           // first mount → force full redraw
        : currentWrite - lastWrite;

      if (newFrames >= MAX_FRAMES) {
        // Too many frames missed (tab was hidden, first mount, etc.) → full redraw
        fullRedraw(ctx);
      } else {
        const bufLen = featureBuf.length;

        if (bufLen < MAX_FRAMES) {
          // Buffer still growing: just paint new columns at the right end,
          // no shifting needed. Previous columns stay in place.
          const startFi = bufLen - newFrames;
          for (let i = 0; i < newFrames; i++) {
            drawColumn(ctx, featureBuf[startFi + i], LABEL_W + (startFi + i) * COL_W);
          }
          ctx.globalAlpha = 1;
          // Clear old tick, draw new one
          ctx.fillStyle = "#050d16";
          ctx.fillRect(LABEL_W + (startFi - 1) * COL_W - 1, 0, 3, CANVAS_H);
          ctx.fillStyle = "rgba(176,171,161,0.4)";
          ctx.fillRect(LABEL_W + bufLen * COL_W - 1, 0, 1, CANVAS_H);
          drawLabels(ctx);
        } else {
          // Buffer full — shift content left, draw new columns on the right
          const shiftPx = newFrames * COL_W;
          const keepW   = DRAW_W - shiftPx;

          if (keepW > 0) {
            // Shift existing content left
            ctx.drawImage(canvas!, LABEL_W + shiftPx, 0, keepW, CANVAS_H, LABEL_W, 0, keepW, CANVAS_H);
          }
          // Blank the new column zone
          ctx.fillStyle = "#050d16";
          ctx.fillRect(LABEL_W + Math.max(0, keepW), 0, shiftPx + 2, CANVAS_H);

          // Draw new columns
          for (let i = 0; i < newFrames; i++) {
            const fi = bufLen - newFrames + i;
            drawColumn(ctx, featureBuf[fi], LABEL_W + Math.max(0, keepW) + i * COL_W);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgba(176,171,161,0.4)";
          ctx.fillRect(CANVAS_W - 2, 0, 1, CANVAS_H);
          drawLabels(ctx);
        }
      }

      lastWriteRef.current = currentWrite;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Low-frequency counter for the display label
  useEffect(() => {
    const id = setInterval(() => setCount(featureBuf.length), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: "100%", height: CANVAS_H, borderRadius: 4, display: "block" }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingLeft: LABEL_W }}>
        {SEGMENTS.map((s) => (
          <span key={s.label} style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9, color: s.color,
          }}>
            {s.label} ({s.end - s.start}d)
          </span>
        ))}
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink5)", marginLeft: "auto",
        }}>
          {count}/{MAX_FRAMES} frames
        </span>
      </div>
    </div>
  );
}
