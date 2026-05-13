"use client";

import { useState } from "react";
import { KaTeX } from "@/components/landing/KaTeX";

const HANDSHAPES_D = ["A","B","C","D","E","F","G","H","I","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","1","3","4","5","7","8","9","flat-B","bent-B","open-A","baby-O"];
const HANDSHAPES_N = ["B","flat-B","A","S","C","O","5","G"];
const SIGMA_0_SET  = new Set(HANDSHAPES_N);

export function BattisonGrid() {
  const [hovered, setHovered] = useState<{ d: string; n: string } | null>(null);

  const isSymmetric = (d: string) => d === "B" || d === "flat-B" || d === "A" || d === "S" || d === "C" || d === "O" || d === "5" || d === "G";

  const cellColor = (d: string, n: string): string => {
    if (d === n) return "var(--teal)";        // symmetric (always valid)
    if (SIGMA_0_SET.has(n)) return "var(--sky)"; // Σ₀ constraint satisfied
    return "transparent";                     // violates Battison
  };

  const cellValid = (d: string, n: string) => d === n || SIGMA_0_SET.has(n);
  const totalValid = HANDSHAPES_D.reduce((acc, d) => acc + HANDSHAPES_N.filter(n => cellValid(d, n)).length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Unconstrained pairs", value: `${HANDSHAPES_D.length}² = ${HANDSHAPES_D.length * HANDSHAPES_D.length}`, color: "var(--ink4)", tex: String.raw`|\Sigma_H|^2 = 35^2 = 1225` },
          { label: "Attested via Battison", value: `${HANDSHAPES_D.length} × 9 = ${HANDSHAPES_D.length * 9}`, color: "var(--teal)", tex: String.raw`|\Sigma_H|(1 + |\Sigma_0|) = 315` },
          { label: "Reduction factor", value: "4.0×", color: "var(--coral)", tex: String.raw`1225 / 315 \approx 4\times` },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-surface)", border: "1px solid var(--rule)",
            borderRadius: 6, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: s.color, lineHeight: 1.1 }}>{s.value}</span>
            <div style={{ fontSize: 10 }}><KaTeX math={s.tex} /></div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--rule)",
        borderRadius: 8, padding: 16, overflow: "auto",
      }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink3)" }}>
            Rows = H^d (dominant, 35 handshapes) · Cols = H^n (non-dominant, 35 options)
          </span>
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            {[
              { color: "var(--teal)", label: "symmetric (H^d = H^n)" },
              { color: "var(--sky)",  label: "Σ₀ constraint satisfied" },
              { color: "var(--bg-raised)", label: "violates Battison" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, border: "1px solid var(--rule)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column headers (Σ₀ only — the 8 valid non-dominant HS + same-as-dominant) */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 8, fontFamily: "var(--font-mono)" }}>
            <thead>
              <tr>
                <th style={{ padding: "0 4px 4px", color: "var(--ink4)", fontWeight: 400, textAlign: "right", whiteSpace: "nowrap" }}>H^d \ H^n</th>
                {HANDSHAPES_D.map(n => (
                  <th key={n} style={{
                    padding: "0 1px 4px", writingMode: "vertical-lr", textAlign: "left",
                    color: SIGMA_0_SET.has(n) ? "var(--sky)" : "var(--ink5)",
                    fontWeight: SIGMA_0_SET.has(n) ? 700 : 400,
                  }}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HANDSHAPES_D.map(d => (
                <tr key={d}>
                  <td style={{ padding: "1px 6px 1px 0", color: "var(--ink3)", whiteSpace: "nowrap", fontWeight: 500 }}>{d}</td>
                  {HANDSHAPES_D.map(n => {
                    const valid = cellValid(d, n);
                    const bg = d === n ? "#3ea89f" : SIGMA_0_SET.has(n) ? "#5090d8" : "var(--bg-raised)";
                    const isHov = hovered?.d === d && hovered?.n === n;
                    return (
                      <td key={n}
                        onMouseEnter={() => setHovered({ d, n })}
                        onMouseLeave={() => setHovered(null)}
                        title={valid ? `(${d}, ${n}) — valid` : `(${d}, ${n}) — violates Battison`}
                        style={{
                          width: 10, height: 10, padding: 1,
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: 1,
                          background: isHov ? "var(--coral)" : bg,
                          opacity: valid ? 1 : 0.18,
                          transition: "background 0.1s",
                        }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover detail */}
      <div style={{
        minHeight: 36,
        background: "var(--bg-raised)", border: "1px solid var(--rule)",
        borderRadius: 6, padding: "8px 14px",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink3)",
      }}>
        {hovered ? (
          cellValid(hovered.d, hovered.n)
            ? <span style={{ color: "var(--teal)" }}>({hovered.d}, {hovered.n}) — valid under Battison constraint {hovered.d === hovered.n ? "(symmetric)" : `(${hovered.n} ∈ Σ₀)`}</span>
            : <span style={{ color: "var(--coral)" }}>({hovered.d}, {hovered.n}) — violates Battison: H^n = {hovered.n} is not in Σ₀ when H^d ≠ H^n</span>
        ) : (
          <span style={{ color: "var(--ink5)" }}>Hover a cell to inspect the (H^d, H^n) pair</span>
        )}
      </div>
    </div>
  );
}
