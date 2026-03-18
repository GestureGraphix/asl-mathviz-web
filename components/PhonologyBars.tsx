"use client";

import { useAppStore } from "@/store/appStore";

const COMPONENTS = [
  { key: "H", label: "H", color: "var(--coral)", desc: "Handshape",    dim: "ℝ¹⁶", note: "finger joint angles"       },
  { key: "L", label: "L", color: "var(--teal)",  desc: "Location",     dim: "ℝ⁶",  note: "wrist position in space"   },
  { key: "O", label: "O", color: "var(--sky)",   desc: "Orientation",  dim: "ℝ⁶",  note: "palm normal vector"         },
  { key: "M", label: "M", color: "var(--mint)",  desc: "Movement",     dim: "ℝ¹⁸", note: "velocity + acceleration"   },
] as const;

// Max expected norm per component for bar scaling (tuned empirically)
const MAX_NORMS = { H: 1.8, L: 0.6, O: 1.0, M: 0.3 };

export function PhonologyBars() {
  const phonology = useAppStore((s) => s.phonology);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {COMPONENTS.map(({ key, label, color, desc, dim, note }) => {
        const norm  = phonology ? (phonology as any)[`norm_${key}`] as number : 0;
        const code  = phonology ? (phonology as any)[`code_${key}`] as number | undefined : undefined;
        const width = Math.min(1, norm / MAX_NORMS[key]) * 100;

        return (
          <div key={key}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "18px 1fr 40px 30px",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Bodoni italic component letter */}
              <span
                style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: 15,
                  color,
                }}
              >
                {label}
              </span>

              {/* 2px track + fill + pip */}
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${width}%`,
                    background: color,
                    "--component-color": color,
                  } as React.CSSProperties}
                />
              </div>

              {/* Norm value */}
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink3)",
                  textAlign: "right",
                }}
              >
                {norm.toFixed(2)}
              </span>

              {/* Codebook index */}
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  color: "var(--ink4)",
                  textAlign: "right",
                }}
              >
                {code != null ? `#${code}` : "#–"}
              </span>
            </div>

            {/* Sub-label */}
            <div style={{ paddingLeft: 28, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-ui, Figtree, sans-serif)", fontSize: 9, color: "var(--ink4)" }}>
                {desc} · {dim} · {note}
              </span>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9, color: "var(--ink5)" }}>
                ‖u‖ = {norm.toFixed(3)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
