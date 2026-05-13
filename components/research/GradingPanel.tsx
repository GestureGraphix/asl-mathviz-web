"use client";

import { useState } from "react";
import { KaTeX } from "@/components/landing/KaTeX";

interface CheckDef {
  id: string;
  label: string;
  sym: string;
  color: string;
  formula: string;
  threshold: string;
  description: string;
}

const CHECKS: CheckDef[] = [
  { id: "Hd",      label: "Dominant handshape",     sym: "C_{H^d}",              color: "var(--coral)", formula: String.raw`\|\mathbf{u}^H - \mu_{H^{d*}}\|_2 \leq \varepsilon_H`,             threshold: "εH = 0.30",  description: "L2 distance from observed handshape feature to target prototype in ℝ¹⁶." },
  { id: "Hn",      label: "Non-dominant handshape",  sym: "C_{H^n}",              color: "var(--coral)", formula: String.raw`H^{n*} = \emptyset \;\vee\; \|\mathbf{u}^{H,n} - \mu_{H^{n*}}\|_2 \leq \varepsilon_H`, threshold: "εH = 0.30",  description: "Trivially passes for one-handed signs (H^n* = ∅). Otherwise same L2 check on non-dominant hand." },
  { id: "kappa",   label: "Contact",                 sym: "C_{\\kappa}",          color: "var(--mint)",  formula: String.raw`\hat{\kappa} = \kappa^*`,                                         threshold: "δ = 0.15 sw", description: "Vote-thresholded over T frames: κ = ⌈(1/T)Σκₜ ≥ 0.3⌉. Distinguishes MOTHER from FATHER." },
  { id: "deltaH",  label: "Handshape change record", sym: "C_{\\Delta_H}",        color: "var(--sky)",   formula: String.raw`|\hat{\Delta}_H| = |\Delta_H^*|`,                                threshold: "exact match", description: "RLE trajectory length must match. For |Δ_H*| = 2, also checks direction h₁→h₂." },
  { id: "L",       label: "Location",                sym: "C_L",                  color: "var(--teal)",  formula: String.raw`\|c^d - \mu_{L^*}\|_2 \leq \varepsilon_L`,                       threshold: "εL = 0.20 sw", description: "Dominant palm centre distance to target location prototype in shoulder-width units." },
  { id: "O",       label: "Orientation",             sym: "C_O",                  color: "var(--sky)",   formula: String.raw`\angle(n^d, \nu_{O^*}) \leq \varepsilon_O`,                      threshold: "εO = 20°",   description: "Angular error between observed palm normal and canonical orientation vector." },
  { id: "Mpath",   label: "Path shape",              sym: "C_{M_{\\mathrm{path}}}", color: "var(--mint)", formula: String.raw`\hat{M}_{\mathrm{path}} = M_{\mathrm{path}}^*`,                threshold: "exact",      description: "Deterministic boolean predicate on trajectory γ. No ML — straight/arc/circular/repeated." },
  { id: "Mmanner", label: "Movement manner",         sym: "C_{M_{\\mathrm{manner}}}", color: "var(--lav)", formula: String.raw`\hat{M}_{\mathrm{manner}} = M_{\mathrm{manner}}^*`,            threshold: "exact",      description: "Velocity profile classification: smooth (single peak), trilled (≥3 peaks), or hold." },
];

const CONJUNCTION_TEX = String.raw`\mathrm{correct}(B^*) = C_{H^d} \wedge C_{H^n} \wedge C_\kappa \wedge C_{\Delta_H} \wedge C_L \wedge C_O \wedge C_{M_{\mathrm{path}}} \wedge C_{M_{\mathrm{manner}}}`;
const HAMMING_TEX = String.raw`d_{\mathrm{phon}}(s,s') = \#\{J : \hat{J}(s) \neq J^*(s')\} \in \{0,\ldots,8\}`;

export function GradingPanel() {
  const [passing, setPassing] = useState<Set<string>>(new Set(CHECKS.map(c => c.id)));

  const toggle = (id: string) =>
    setPassing(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const hamming = CHECKS.length - passing.size;
  const correct = hamming === 0;

  const feedbackLines: string[] = CHECKS
    .filter(c => !passing.has(c.id))
    .map(c => {
      const msgs: Record<string, string> = {
        Hd:      "Handshape incorrect — adjust finger configuration.",
        Hn:      "Non-dominant handshape incorrect — check base hand.",
        kappa:   "Contact wrong — hands should" + (passing.has("kappa") ? "n't" : "") + " touch.",
        deltaH:  "Handshape change sequence doesn't match — check transition.",
        L:       "Location off — move hand closer to target area.",
        O:       "Palm orientation wrong — rotate wrist.",
        Mpath:   "Path shape wrong — check movement trajectory.",
        Mmanner: "Movement manner wrong — adjust speed/rhythm.",
      };
      return msgs[c.id] ?? c.label;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, margin: 0 }}>
        Toggle each check to simulate a signer's attempt. The grading function runs all 8 boolean checks
        simultaneously — no ML, all deterministic. The Hamming distance tells you exactly which
        phonological parameters need correction.
      </p>

      {/* Conjunction formula */}
      <div style={{ background: "var(--bg-base)", border: "1px solid var(--rule)", borderRadius: 6, padding: "10px 14px", overflowX: "auto" }}>
        <KaTeX math={CONJUNCTION_TEX} display />
      </div>

      {/* Check grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CHECKS.map(c => {
          const pass = passing.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                background: pass ? `color-mix(in srgb, ${c.color} 8%, var(--bg-surface))` : "var(--bg-raised)",
                border: `1px solid ${pass ? `color-mix(in srgb, ${c.color} 30%, var(--rule))` : "var(--rule)"}`,
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.12s",
              }}
            >
              {/* Pass/fail indicator */}
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: pass ? c.color : "var(--ink5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                fontSize: 11, color: "white", fontWeight: 700,
              }}>
                {pass ? "✓" : "✗"}
              </div>

              {/* Label + description */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: pass ? "var(--ink2)" : "var(--ink4)" }}>
                    {c.label}
                  </span>
                  <span style={{ fontSize: 10 }}>
                    <KaTeX math={c.sym} />
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink4)", lineHeight: 1.4 }}>
                  {c.description}
                </span>
              </div>

              {/* Formula + threshold */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0, maxWidth: 280, overflowX: "auto" }}>
                <div style={{ fontSize: 10 }}><KaTeX math={c.formula} /></div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink5)" }}>{c.threshold}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Result panel */}
      <div style={{
        background: correct ? "color-mix(in srgb, var(--mint) 10%, var(--bg-surface))" : "color-mix(in srgb, var(--coral) 10%, var(--bg-surface))",
        border: `1px solid ${correct ? "color-mix(in srgb, var(--mint) 35%, var(--rule))" : "color-mix(in srgb, var(--coral) 35%, var(--rule))"}`,
        borderLeft: `3px solid ${correct ? "var(--mint)" : "var(--coral)"}`,
        borderRadius: 8,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: correct ? "var(--mint)" : "var(--coral)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {correct ? "Correct — sign graded PASS" : `Incorrect — d_phon = ${hamming}`}
            </span>
            {!correct && feedbackLines.length > 0 && (
              <ul style={{ margin: "4px 0 0 0", padding: "0 0 0 14px" }}>
                {feedbackLines.map(l => (
                  <li key={l} style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink3)", lineHeight: 1.5 }}>{l}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Hamming display */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "var(--bg-base)", border: "1px solid var(--rule)", borderRadius: 6,
            padding: "8px 16px", flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 32, color: correct ? "var(--mint)" : "var(--coral)", lineHeight: 1 }}>
              {hamming}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>d_phon</span>
          </div>
        </div>

        <div style={{ background: "var(--bg-base)", border: "1px solid var(--rule)", borderRadius: 5, padding: "8px 12px", overflowX: "auto" }}>
          <KaTeX math={HAMMING_TEX} display />
        </div>
      </div>
    </div>
  );
}
