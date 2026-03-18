"use client";

import { useEffect, useRef, useState } from "react";
import { featureBuf, writeCount as getWriteCount } from "@/lib/featureBuffer";

// ── Segments ─────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { short: "H", start: 0,  end: 16, color: "#e0686a", maxV: Math.PI },
  { short: "L", start: 16, end: 22, color: "#3ea89f", maxV: 0.5    },
  { short: "O", start: 22, end: 28, color: "#5090d8", maxV: 1.0    },
  { short: "M", start: 28, end: 46, color: "#4dbb87", maxV: 0.15   },
  { short: "N", start: 46, end: 51, color: "#8b7fd4", maxV: 0.25   },
] as const;

// ── Layout ───────────────────────────────────────────────────────────────────
const MAX_FRAMES  = 150;
const SEP_PX      = 4;        // gap between segments
const LABEL_W     = 0;         // labels rendered in HTML outside the canvas
const CANVAS_W    = 390;   // close to sidebar canvas area (~388px) for near-1:1 pixel ratio
const CANVAS_H    = 240;
const BG          = "#e8e2d6";

const TOTAL_ROWS  = SEGMENTS.reduce((s, g) => s + (g.end - g.start), 0);
const USABLE_H    = CANVAS_H - (SEGMENTS.length - 1) * SEP_PX;
const ROW_H       = USABLE_H / TOTAL_ROWS;
const DRAW_W      = CANVAS_W - LABEL_W;
const COL_W       = DRAW_W / MAX_FRAMES;

// Pre-compute segment Y offsets (top of each segment's row block)
const SEG_Y = SEGMENTS.map((_, si) => {
  let y = 0;
  for (let i = 0; i < si; i++) y += (SEGMENTS[i].end - SEGMENTS[i].start) * ROW_H + SEP_PX;
  return y;
});

// Height of each band in CSS pixels (matches canvas layout) for the HTML label column
const BAND_HEIGHTS = SEGMENTS.map((s, si) =>
  (s.end - s.start) * ROW_H + (si < SEGMENTS.length - 1 ? SEP_PX : 0),
);

// ── Heatmap LUT ───────────────────────────────────────────────────────────────
// Each segment gets a 256-entry table: bg-beige → seg.color → deep seg.color
// Light background reads as silence; saturated color = activation; deep color = peak.

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const BG_RGB = hexToRgb(BG); // [232, 226, 214]

// Zero-activation column base — 14 units darker than BG so empty frames are
// visible against the background, letting you see the waterfall scroll at rest.
const COL_BASE_RGB: [number, number, number] = [BG_RGB[0] - 14, BG_RGB[1] - 14, BG_RGB[2] - 14];

function buildLUT(segColor: string): string[] {
  const [cr, cg, cb] = hexToRgb(segColor);
  const lut: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;  // linear — no gamma
    let r: number, g: number, b: number;
    if (t < 0.6) {
      // col-base → segment color over first 60%
      const s = t / 0.6;
      r = Math.round(COL_BASE_RGB[0] + (cr - COL_BASE_RGB[0]) * s);
      g = Math.round(COL_BASE_RGB[1] + (cg - COL_BASE_RGB[1]) * s);
      b = Math.round(COL_BASE_RGB[2] + (cb - COL_BASE_RGB[2]) * s);
    } else {
      // segment color → deep/darkened color over remaining 40% (high activation = richer hue)
      const s = (t - 0.6) / 0.4;
      r = Math.round(cr * (1 - s * 0.32));
      g = Math.round(cg * (1 - s * 0.32));
      b = Math.round(cb * (1 - s * 0.32));
    }
    lut[i] = `rgb(${r},${g},${b})`;
  }
  return lut;
}

const SEG_LUTS = SEGMENTS.map((s) => buildLUT(s.color));

// Darkened label colors — segment hues at 0.68× brightness for legibility on light bg
const LABEL_COLORS = SEGMENTS.map((s) => {
  const [r, g, b] = hexToRgb(s.color);
  const f = 0.68;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
});

// ── Draw helpers ─────────────────────────────────────────────────────────────

function drawColumn(ctx: CanvasRenderingContext2D, fv: Float32Array, x: number) {
  ctx.globalAlpha = 1;
  for (let si = 0; si < SEGMENTS.length; si++) {
    const seg = SEGMENTS[si];
    const lut = SEG_LUTS[si];
    for (let di = seg.start; di < seg.end; di++) {
      const t   = Math.min(1, Math.abs(fv[di]) / seg.maxV);
      const idx = Math.round(Math.pow(t, 1.5) * 255); // gamma=1.5: H/L/O visible at rest, low M stays near bg
      ctx.fillStyle = lut[idx];
      ctx.fillRect(x, SEG_Y[si] + (di - seg.start) * ROW_H, COL_W + 0.5, ROW_H + 0.3);
    }
  }
}

function drawSeparators(ctx: CanvasRenderingContext2D) {
  // Draw a 1px colored line at the bottom of each segment band (except last)
  ctx.globalAlpha = 0.50;
  for (let si = 0; si < SEGMENTS.length - 1; si++) {
    const seg  = SEGMENTS[si];
    const botY = SEG_Y[si] + (seg.end - seg.start) * ROW_H + SEP_PX / 2;
    ctx.fillStyle = LABEL_COLORS[si];
    ctx.fillRect(LABEL_W, botY, DRAW_W, 0.75);
  }
  ctx.globalAlpha = 1;
}


function drawPlayhead(ctx: CanvasRenderingContext2D, x: number) {
  ctx.globalAlpha = 0.7;
  ctx.fillStyle   = "#3ea89f";
  ctx.fillRect(x, 0, 1.5, CANVAS_H);
  ctx.globalAlpha = 1;
}

function drawWaiting(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Draw empty segment bands so the layout is still visible
  ctx.globalAlpha = 0.08;
  for (let si = 0; si < SEGMENTS.length; si++) {
    const seg = SEGMENTS[si];
    ctx.fillStyle = seg.color;
    ctx.fillRect(LABEL_W, SEG_Y[si], DRAW_W, (seg.end - seg.start) * ROW_H);
  }
  ctx.globalAlpha = 0.6;
  ctx.fillStyle   = "#8a857d";
  ctx.font        = "10px 'DM Mono', monospace";
  ctx.textAlign   = "left";
  ctx.fillText("waiting for data…", LABEL_W + 10, CANVAS_H / 2 + 4);
  ctx.globalAlpha = 1;
  drawSeparators(ctx);
}

function fullRedraw(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Fill bands with bg so empty space is consistent
  ctx.globalAlpha = 0.08;
  for (let si = 0; si < SEGMENTS.length; si++) {
    const seg = SEGMENTS[si];
    ctx.fillStyle = seg.color;
    ctx.fillRect(LABEL_W, SEG_Y[si], DRAW_W, (seg.end - seg.start) * ROW_H);
  }
  ctx.globalAlpha = 1;

  const N = featureBuf.length;
  for (let fi = 0; fi < N; fi++) {
    // Right-anchor during fill so newest data is always at the right edge.
    // When the buffer is full the formula reduces to fi * COL_W (standard scroll layout).
    const x = N < MAX_FRAMES ? CANVAS_W - (N - fi) * COL_W : fi * COL_W;
    drawColumn(ctx, featureBuf[fi], x);
  }

  if (N > 0) drawPlayhead(ctx, CANVAS_W - 2);

  drawSeparators(ctx);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FeatureWaterfall() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const lastWriteRef = useRef(-1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId: number;

    function tick() {
      const currentWrite = getWriteCount;
      const lastWrite    = lastWriteRef.current;

      if (currentWrite === lastWrite) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas!.getContext("2d");
      if (!ctx) { rafId = requestAnimationFrame(tick); return; }

      if (featureBuf.length === 0) {
        drawWaiting(ctx);
        lastWriteRef.current = currentWrite;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const newFrames = lastWrite < 0
        ? MAX_FRAMES + 1  // first mount → full redraw
        : currentWrite - lastWrite;

      if (newFrames >= MAX_FRAMES) {
        fullRedraw(ctx);
      } else {
        const bufLen = featureBuf.length;

        if (bufLen < MAX_FRAMES) {
          // Fill phase: redraw fully with right-anchored positions (cheap, ≤150 cols)
          fullRedraw(ctx);
        } else {
          // Buffer full — shift content left, draw new columns on right
          const shiftPx = newFrames * COL_W;
          const keepW   = DRAW_W - shiftPx;

          if (keepW > 0) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas!, LABEL_W + shiftPx, 0, keepW, CANVAS_H, LABEL_W, 0, keepW, CANVAS_H);
            ctx.imageSmoothingEnabled = true;
          }

          // Blank the new zone with bg + faint band tints
          ctx.fillStyle = BG;
          ctx.fillRect(LABEL_W + Math.max(0, keepW), 0, shiftPx + 2, CANVAS_H);
          ctx.globalAlpha = 0.04;
          for (let si = 0; si < SEGMENTS.length; si++) {
            const seg = SEGMENTS[si];
            ctx.fillStyle = seg.color;
            ctx.fillRect(
              LABEL_W + Math.max(0, keepW),
              SEG_Y[si],
              shiftPx + 2,
              (seg.end - seg.start) * ROW_H,
            );
          }
          ctx.globalAlpha = 1;

          // Draw new columns
          for (let i = 0; i < newFrames; i++) {
            const fi = bufLen - newFrames + i;
            drawColumn(ctx, featureBuf[fi], LABEL_W + Math.max(0, keepW) + i * COL_W);
          }

          drawPlayhead(ctx, CANVAS_W - 2);
          drawSeparators(ctx);
        }
      }

      lastWriteRef.current = currentWrite;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCount(featureBuf.length), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* HTML label column — renders crisp at any canvas scale */}
        <div style={{ width: 32, flexShrink: 0, height: CANVAS_H, display: "flex", flexDirection: "column" }}>
          {SEGMENTS.map((seg, si) => (
            <div
              key={seg.short}
              style={{
                height: BAND_HEIGHTS[si],
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingRight: 6,
              }}
            >
              <span style={{
                fontFamily: "'Bodoni Moda', Georgia, serif",
                fontStyle: "italic", fontWeight: 700,
                fontSize: 11, lineHeight: 1.1,
                color: LABEL_COLORS[si],
              }}>
                {seg.short}
              </span>
              {(seg.end - seg.start) * ROW_H > 22 && (
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8.5, lineHeight: 1.1,
                  color: LABEL_COLORS[si], opacity: 0.75,
                }}>
                  {seg.end - seg.start}d
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Heatmap canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ flex: 1, height: CANVAS_H, borderRadius: 4, display: "block", border: "1px solid rgba(0,0,0,0.07)" }}
        />
      </div>

      {/* Footer legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingLeft: 32 }}>
        {SEGMENTS.map((s, si) => (
          <span key={s.short} style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9, color: LABEL_COLORS[si],
          }}>
            {s.short} · {s.end - s.start}d
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
