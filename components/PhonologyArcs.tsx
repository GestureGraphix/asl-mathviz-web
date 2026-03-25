"use client";

import { useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";

const CX = 100;
const CY = 100;
const RADII  = [40, 54, 68, 82, 96] as const;
const PARAMS = ["H", "L", "O", "M", "N"] as const;
const COLORS: Record<string, string> = {
  H: "#e0686a",
  L: "#3ea89f",
  O: "#5090d8",
  M: "#4dbb87",
  N: "#8b7fd4",
};
const MAX_NORMS: Record<string, number> = { H: 1.8, L: 0.6, O: 1.0, M: 0.3, N: 0.25 };

// Arc from 12 o'clock (-π/2) clockwise, max 270° sweep, gap at 9 o'clock.
function arcPath(r: number, fill: number): string {
  if (fill <= 0.001) return "";
  const sweepDeg = fill * 270;
  const startRad = -Math.PI / 2;
  const endRad   = startRad + (sweepDeg * Math.PI) / 180;
  const x1 = CX + r * Math.cos(startRad);
  const y1 = CY + r * Math.sin(startRad);
  const x2 = CX + r * Math.cos(endRad);
  const y2 = CY + r * Math.sin(endRad);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function PhonologyArcs() {
  const pathRefs = useRef<(SVGPathElement | null)[]>(Array(5).fill(null));
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    function tick() {
      const ph = useAppStore.getState().phonology;
      const fills = ph
        ? [
            Math.min(1, ph.norm_H / MAX_NORMS.H),
            Math.min(1, ph.norm_L / MAX_NORMS.L),
            Math.min(1, ph.norm_O / MAX_NORMS.O),
            Math.min(1, ph.norm_M / MAX_NORMS.M),
            Math.min(1, ph.norm_N / MAX_NORMS.N),
          ]
        : [0, 0, 0, 0, 0];

      for (let i = 0; i < 5; i++) {
        pathRefs.current[i]?.setAttribute("d", arcPath(RADII[i], fills[i]));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 5,
        pointerEvents: "none",
        opacity: 0.82,
      }}
    >
      <svg width={200} height={200} viewBox="0 0 200 200" fill="none">
        {/* Track circles — faint guides */}
        {RADII.map((r, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={r}
            stroke={COLORS[PARAMS[i]]}
            strokeWidth={4.5}
            strokeOpacity={0.1}
            fill="none"
          />
        ))}

        {/* Animated arc fills */}
        {PARAMS.map((p, i) => (
          <path
            key={p}
            ref={(el) => { pathRefs.current[i] = el; }}
            stroke={COLORS[p]}
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3.5} fill="rgba(255,255,255,0.18)" />

        {/* Tiny param labels at 3 o'clock of each ring */}
        {PARAMS.map((p, i) => (
          <text
            key={`lbl-${p}`}
            x={CX + RADII[i] - 4}
            y={CY + 4}
            fill={COLORS[p]}
            fontSize={7}
            fontFamily="monospace"
            textAnchor="end"
            opacity={0.55}
          >
            {p}
          </text>
        ))}
      </svg>
    </div>
  );
}
