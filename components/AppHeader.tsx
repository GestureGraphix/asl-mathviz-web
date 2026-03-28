"use client";

import { useAppStore } from "@/store/appStore";

type AppMode = "recognize" | "generate" | "geodesic";

interface AppHeaderProps {
  mode?: AppMode;
  onModeChange?: (m: AppMode) => void;
}

export function AppHeader({ mode = "recognize", onModeChange }: AppHeaderProps) {
  const status     = useAppStore((s) => s.status);
  const fps        = useAppStore((s) => s.fps);
  const latency_ms = useAppStore((s) => s.latency_ms);
  const prediction = useAppStore((s) => s.prediction);
  const setStatus  = useAppStore((s) => s.setStatus);

  const isPaused   = status === "paused";
  const canPause   = status === "live" || status === "paused";

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
        {(["recognize", "generate", "geodesic"] as AppMode[]).map((m) => (
          <button
            key={m}
            className="demo-mode-btn"
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
            {m === "recognize" ? "Recognize" : m === "generate" ? "Generate" : "Geodesic"}
          </button>
        ))}
      </div>

      {/* Right side: controls + metrics + prediction */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {mode === "recognize" && (
          <>
            {/* Pause / Resume */}
            {canPause && (
              <IconButton
                onClick={() => setStatus(isPaused ? "live" : "paused")}
                title={isPaused ? "Resume (Space)" : "Pause (Space)"}
                active={isPaused}
              >
                {isPaused ? <ResumeIcon /> : <PauseIcon />}
              </IconButton>
            )}
          </>
        )}

        {/* FPS / latency / live phonological code badges — hidden on mobile */}
        {mode === "recognize" && (status === "live" || isPaused) && (
          <div className="demo-header-metrics" style={{ display: "contents" }}>
            <MetricBadge value={`${fps}`} suffix="fps" />
            <MetricBadge value={`${latency_ms}`} suffix="ms" />
            <LiveCodeReadout />
          </div>
        )}

        {/* Current prediction */}
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
          <span className="demo-mode-label" style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            color: "var(--ink5)",
            letterSpacing: "0.05em",
          }}>
            s = (H, L, O, M, N) · forward kinematics
          </span>
        )}
        {mode === "geodesic" && (
          <span className="demo-mode-label" style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9,
            color: "var(--ink5)",
            letterSpacing: "0.05em",
          }}>
            γ(α) = (1-α)·s_A + α·s_B · ℝ²⁸
          </span>
        )}
      </div>
    </header>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Isolated component so phonology updates don't re-render the whole header
function LiveCodeReadout() {
  const phonology = useAppStore((s) => s.phonology);
  if (!phonology) return null;

  const params: [string, number, string][] = [
    ["H", phonology.code_H, "var(--coral)"],
    ["L", phonology.code_L, "var(--teal)"],
    ["O", phonology.code_O, "var(--sky)"],
    ["M", phonology.code_M, "var(--mint)"],
  ];

  return (
    <span
      style={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 10,
        background: "var(--bg-raised)",
        border: "1px solid var(--rule)",
        borderRadius: 4,
        padding: "2px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {params.map(([key, code, color]) => (
        <span key={key}>
          <span style={{ color, fontWeight: 600 }}>{key}</span>
          <span style={{ color: "var(--ink4)" }}>:</span>
          <span style={{ color: "var(--ink3)" }}>
            #{String(code).padStart(2, "0")}
          </span>
        </span>
      ))}
    </span>
  );
}

function IconButton({
  children, onClick, title, active,
}: { children: React.ReactNode; onClick: () => void; title?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        background: active ? "var(--bg-raised)" : "none",
        border: active ? "1px solid var(--teal)" : "1px solid transparent",
        borderRadius: 5,
        cursor: "pointer",
        color: active ? "var(--teal)" : "var(--ink4)",
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
      }}
    >
      {children}
    </button>
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

// ── SVG icons ──────────────────────────────────────────────────────────────────

function PauseIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <rect x={6} y={4} width={4} height={16} rx={1} />
      <rect x={14} y={4} width={4} height={16} rx={1} />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
