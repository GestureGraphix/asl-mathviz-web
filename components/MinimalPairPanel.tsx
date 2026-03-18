"use client";

import { useAppStore } from "@/store/appStore";
import CANONICAL_RAW from "@/public/data/canonical_signs.json";

// ── Types ─────────────────────────────────────────────────────────

interface CanonicalEntry {
  gloss: string;
  color: string;
  minimal_pair: string | null;
  u_H: number[];
  u_L: number[];
  handshape_name: string;
  location_name: string;
}

// ── Precompute canonical norms at module load ──────────────────────
// These match the live norm_H = l2(u_H) and norm_L = l2(u_L) in features.ts

function l2(arr: number[]): number {
  return Math.sqrt(arr.reduce((s, v) => s + v * v, 0));
}

interface SignNorms { H: number; L: number }

const CANONICAL = CANONICAL_RAW as CanonicalEntry[];
const CANONICAL_MAP: Record<string, CanonicalEntry> = {};
const NORMS: Record<string, SignNorms> = {};
const COLORS: Record<string, string> = {};
const NAMES: Record<string, { H: string; L: string }> = {};

for (const s of CANONICAL) {
  CANONICAL_MAP[s.gloss] = s;
  NORMS[s.gloss] = { H: l2(s.u_H), L: l2(s.u_L) };
  COLORS[s.gloss] = s.color;
  NAMES[s.gloss]  = { H: s.handshape_name, L: s.location_name };
}

// ── Param styling ──────────────────────────────────────────────────

const PARAM_COLOR: Record<string, string> = {
  H: "var(--coral)",
  L: "var(--teal)",
};
const PARAM_LABEL: Record<string, string> = {
  H: "handshape",
  L: "location",
};

// ── Main component ────────────────────────────────────────────────

export function MinimalPairPanel({ onViewGeodesic }: {
  onViewGeodesic?: (glossA: string, glossB: string) => void;
}) {
  const prediction = useAppStore((s) => s.prediction);
  const candidate  = useAppStore((s) => s.candidate);
  const phonology  = useAppStore((s) => s.phonology);

  // Prefer the live candidate gloss while actively signing
  const activeGloss = (candidate ?? prediction)?.gloss ?? null;

  if (!activeGloss) {
    return <Empty>Sign something to see</Empty>;
  }

  const current = CANONICAL_MAP[activeGloss];
  if (!current?.minimal_pair) {
    return <Empty>No minimal pair for {activeGloss.replace(/_/g, " ").toLowerCase()}</Empty>;
  }

  const pairGloss = current.minimal_pair;
  const pair = CANONICAL_MAP[pairGloss];
  if (!pair) return <Empty>—</Empty>;

  const nA = NORMS[activeGloss];
  const nB = NORMS[pairGloss];
  if (!nA || !nB) return <Empty>—</Empty>;

  // ── Find discriminating parameter ─────────────────────────────
  const dH = Math.abs(nA.H - nB.H);
  const dL = Math.abs(nA.L - nB.L);
  const param = dH >= dL ? "H" : "L";

  const a_val = nA[param];
  const b_val = nB[param];
  const lo    = Math.min(a_val, b_val);
  const hi    = Math.max(a_val, b_val);

  const live_val  = phonology ? (param === "H" ? phonology.norm_H : phonology.norm_L) : 0;
  const live_pct  = hi > lo ? Math.max(0, Math.min(1, (live_val - lo) / (hi - lo))) : 0.5;
  const a_pct     = hi > lo ? (a_val - lo) / (hi - lo) : 0;
  const b_pct     = hi > lo ? (b_val - lo) / (hi - lo) : 1;

  const closerToA = Math.abs(live_val - a_val) <= Math.abs(live_val - b_val);
  const accent    = PARAM_COLOR[param];
  const colorA    = COLORS[activeGloss] ?? "var(--teal)";
  const colorB    = COLORS[pairGloss]   ?? "var(--coral)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Sign names ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <GlossChip gloss={activeGloss} color={colorA} active={closerToA} />
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink5)",
        }}>vs</span>
        <GlossChip gloss={pairGloss} color={colorB} active={!closerToA} />
      </div>

      {/* ── Disambiguation bar ──────────────────────────────────── */}
      <div>
        {/* Label */}
        <div style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink4)", marginBottom: 6,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span>differs by</span>
          <span style={{ color: accent }}>{PARAM_LABEL[param]}</span>
          <span style={{ color: "var(--ink5)" }}>·</span>
          <span style={{ color: closerToA ? colorA : colorB, fontWeight: 500 }}>
            {(closerToA ? activeGloss : pairGloss).replace(/_/g, " ").toLowerCase()}
          </span>
        </div>

        {/* Track */}
        <div style={{ position: "relative", height: 24 }}>
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            height: 2, background: "var(--rule)", transform: "translateY(-50%)",
            borderRadius: 1,
          }} />

          {/* Colored segment between anchors */}
          <div style={{
            position: "absolute", top: "50%",
            left:  `${Math.min(a_pct, b_pct) * 100}%`,
            width: `${Math.abs(a_pct - b_pct) * 100}%`,
            height: 2, background: accent, opacity: 0.45,
            transform: "translateY(-50%)",
          }} />

          {/* Anchor A */}
          <div style={{
            position: "absolute", top: "50%",
            left: `${a_pct * 100}%`,
            width: 10, height: 10, borderRadius: "50%",
            background: colorA,
            border: "1.5px solid var(--bg-surface)",
            transform: "translate(-50%, -50%)",
          }} />

          {/* Anchor B */}
          <div style={{
            position: "absolute", top: "50%",
            left: `${b_pct * 100}%`,
            width: 10, height: 10, borderRadius: "50%",
            background: colorB,
            border: "1.5px solid var(--bg-surface)",
            transform: "translate(-50%, -50%)",
          }} />

          {/* Live cursor */}
          {phonology && (
            <div style={{
              position: "absolute", top: "50%",
              left: `${live_pct * 100}%`,
              width: 3, height: 16, borderRadius: 2,
              background: "var(--ink2)",
              transform: "translate(-50%, -50%)",
              transition: "left 0.08s linear",
            }} />
          )}
        </div>

        {/* Numeric labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: colorA }}>
            {activeGloss.replace(/_/g, " ").toLowerCase()} {a_val.toFixed(2)}
          </span>
          {phonology && (
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: "var(--ink3)" }}>
              ↑ {live_val.toFixed(2)}
            </span>
          )}
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: colorB }}>
            {b_val.toFixed(2)} {pairGloss.replace(/_/g, " ").toLowerCase()}
          </span>
        </div>

        {/* Param name labels */}
        {(NAMES[activeGloss]?.[param] || NAMES[pairGloss]?.[param]) && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: "var(--ink5)" }}>
              {NAMES[activeGloss]?.[param]}
            </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: "var(--ink5)" }}>
              {NAMES[pairGloss]?.[param]}
            </span>
          </div>
        )}
      </div>

      {onViewGeodesic && (
        <button
          onClick={() => onViewGeodesic(activeGloss, pairGloss)}
          style={{
            alignSelf: "flex-start",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 9, letterSpacing: "0.06em",
            background: "var(--bg-raised)",
            border: "1px solid var(--rule)",
            borderRadius: 3, color: "var(--teal)",
            padding: "3px 10px", cursor: "pointer",
            marginTop: 2,
          }}
        >
          view geodesic →
        </button>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function GlossChip({ gloss, color, active }: { gloss: string; color: string; active: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
      fontStyle: "italic", fontWeight: 700,
      fontSize: 13,
      color: active ? color : "var(--ink5)",
      transition: "color 0.2s ease",
    }}>
      {gloss.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 60, display: "flex", alignItems: "center" }}>
      <span style={{ fontFamily: "var(--font-ui, Figtree, sans-serif)", fontSize: 11, color: "var(--ink5)" }}>
        {children}
      </span>
    </div>
  );
}
