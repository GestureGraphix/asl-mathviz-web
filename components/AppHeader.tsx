"use client";

import { useAppStore } from "@/store/appStore";

type AppMode = "recognize" | "generate";

interface AppHeaderProps {
  mode?: AppMode;
  onModeChange?: (m: AppMode) => void;
}

export function AppHeader({ mode = "recognize", onModeChange }: AppHeaderProps) {
  const status     = useAppStore((s) => s.status);
  const fps        = useAppStore((s) => s.fps);
  const latency_ms = useAppStore((s) => s.latency_ms);
  const prediction = useAppStore((s) => s.prediction);

  const isLive = status === "live";

  return (
    <header
      style={{
        gridArea: "header",
        height: 42,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--rule)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <span
        style={{
          fontFamily: "var(--font-ui, Figtree, sans-serif)",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: "var(--ink)",
        }}
      >
        ASL MathViz
      </span>

      {/* Mode toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: "center" }}>
        {(["recognize", "generate"] as AppMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange?.(m)}
            style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 14px",
              border: "none",
              borderBottom: mode === m ? "2px solid var(--teal)" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              color: mode === m ? "var(--teal)" : "var(--ink4)",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {m === "recognize" ? "Recognize" : "Generate"}
          </button>
        ))}
      </div>

      {/* Right side: metrics + prediction badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {mode === "recognize" && isLive && (
          <>
            <MetricBadge value={`${fps}`} suffix="fps" />
            <MetricBadge value={`${latency_ms}`} suffix="ms" />
          </>
        )}
        {mode === "recognize" && prediction && (
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              padding: "2px 10px",
              background: "var(--bg-raised)",
              border: "1px solid var(--teal)",
              borderRadius: 4,
              color: "var(--teal)",
              letterSpacing: "0.06em",
            }}
          >
            {prediction.gloss}
          </span>
        )}
        {mode === "generate" && (
          <span style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            color: "var(--ink5)",
            letterSpacing: "0.05em",
          }}>
            s = (H, L, O, M, N) · forward kinematics
          </span>
        )}
      </div>
    </header>
  );
}

function MetricBadge({ value, suffix }: { value: string; suffix: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 11,
        color: "var(--ink3)",
        background: "var(--bg-raised)",
        border: "1px solid var(--rule)",
        borderRadius: 4,
        padding: "2px 8px",
      }}
    >
      {value}
      <span style={{ color: "var(--ink4)", marginLeft: 2 }}>{suffix}</span>
    </span>
  );
}
