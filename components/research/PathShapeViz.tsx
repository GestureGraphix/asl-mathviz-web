"use client";

import { useState, useEffect, useRef } from "react";
import { KaTeX } from "@/components/landing/KaTeX";

interface PathDef {
  id: string;
  label: string;
  tag: string;
  color: string;
  description: string;
  formula: string;
  note: string;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
}

const W = 160, H = 120;

const PATHS: PathDef[] = [
  {
    id: "str",
    label: "Straight",
    tag: "M_path = str",
    color: "var(--teal)",
    description: "Maximum deviation from the chord stays below θ_str = 0.05 shoulder-widths. Most citation-form signs use straight movements.",
    formula: String.raw`\max_{u \in [0,1]} d\!\bigl(\gamma(u),\,\overline{\gamma(0)\gamma(1)}\bigr) \leq \theta_{\mathrm{str}}`,
    note: "e.g. HELP, GIVE, TEACH",
    draw(ctx, t) {
      const p = (t % 1);
      const x1 = 20, x2 = W - 20, y = H / 2;
      ctx.strokeStyle = "var(--rule)" as never;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#3ea89f";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      const px = x1 + p * (x2 - x1);
      ctx.fillStyle = "#3ea89f";
      ctx.beginPath(); ctx.arc(px, y, 7, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: "arc",
    label: "Arc",
    tag: "M_path = arc",
    color: "var(--sky)",
    description: "Best-fit circle residual is within threshold and the signed angular sweep |φ| ≤ 270°. Common in signs that move through the signing space in a curve.",
    formula: String.raw`\text{circle-fit residual} \leq \theta_{\mathrm{arc}},\quad |\varphi| \leq 270^\circ`,
    note: "e.g. MONTH, PLEASE, THINK",
    draw(ctx, t) {
      const p = (t % 1);
      const cx2 = W / 2, cy2 = H / 2 + 20, r = 48;
      const startA = Math.PI, endA = 0;
      ctx.strokeStyle = "#5090d8";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx2, cy2, r, startA, endA, false); ctx.stroke();
      const angle = startA + p * (endA - startA + Math.PI);
      const px = cx2 + r * Math.cos(startA + p * Math.PI);
      const py = cy2 + r * Math.sin(startA + p * Math.PI);
      ctx.fillStyle = "#5090d8";
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: "circ",
    label: "Circular",
    tag: "M_path = circ",
    color: "var(--mint)",
    description: "The signed angular sweep |φ| > 270° — the path loops back toward its starting direction. Used in signs with wrist rotation or repeated circular motion.",
    formula: String.raw`|\varphi| > 270^\circ \quad \text{(path loops)}`,
    note: "e.g. AGAIN (full circle), PRACTICE",
    draw(ctx, t) {
      const p = (t % 1);
      const cx2 = W / 2, cy2 = H / 2, r = 38;
      ctx.strokeStyle = "#4dbb87";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.stroke();
      const angle = p * Math.PI * 2;
      const px = cx2 + r * Math.cos(angle - Math.PI / 2);
      const py = cy2 + r * Math.sin(angle - Math.PI / 2);
      ctx.fillStyle = "#4dbb87";
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: "rep",
    label: "Repeated",
    tag: "M_path = rep",
    color: "var(--coral)",
    description: "The MH-string contains ≥ 2 Movement segments of the same geometric type (H·M·H·M·H). The path doubles back or cycles. Grading checks repetition count.",
    formula: String.raw`|\text{MH-string}| \geq 5,\quad \text{alternating }H\text{–}M\text{–}H\text{–}M\text{–}H`,
    note: "e.g. MORE, WANT, PRACTICE",
    draw(ctx, t) {
      const p = (t % 1);
      const cycles = 2;
      const x1 = 22, x2 = W - 22, y = H / 2, amp = 22;
      ctx.strokeStyle = "#e0686a";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const frac = i / 100;
        const x = x1 + frac * (x2 - x1);
        const y2 = y + amp * Math.sin(frac * cycles * Math.PI * 2);
        if (i === 0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
      }
      ctx.stroke();
      const frac = p;
      const px = x1 + frac * (x2 - x1);
      const py = y + amp * Math.sin(frac * cycles * Math.PI * 2);
      ctx.fillStyle = "#e0686a";
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    },
  },
];

function PathCanvas({ pathDef, active }: { pathDef: PathDef; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tRef      = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      tRef.current += dt * 0.4;
      ctx!.clearRect(0, 0, W, H);
      pathDef.draw(ctx!, tRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, pathDef]);

  // draw static frame when not active
  useEffect(() => {
    if (active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    pathDef.draw(ctx, 0.35);
  }, [active, pathDef]);

  return (
    <canvas
      ref={canvasRef}
      width={W} height={H}
      style={{ display: "block", borderRadius: 5, background: "var(--bg-base)", border: "1px solid var(--rule)" }}
    />
  );
}

export function PathShapeViz() {
  const [selected, setSelected] = useState<string>("str");

  const sel = PATHS.find(p => p.id === selected)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 4 path cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {PATHS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "12px 8px",
              background: selected === p.id ? `color-mix(in srgb, ${p.color} 10%, var(--bg-raised))` : "var(--bg-surface)",
              border: `1.5px solid ${selected === p.id ? p.color : "var(--rule)"}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <PathCanvas pathDef={p} active={selected === p.id} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: p.color, fontWeight: 600 }}>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Selected path detail */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--rule)",
        borderLeft: `3px solid ${sel.color}`,
        borderRadius: 8,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            color: sel.color,
            background: `color-mix(in srgb, ${sel.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${sel.color} 30%, transparent)`,
            borderRadius: 4, padding: "2px 8px",
          }}>{sel.tag}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)" }}>{sel.note}</span>
        </div>

        <div style={{
          background: "var(--bg-base)", border: "1px solid var(--rule)",
          borderRadius: 5, padding: "10px 14px", overflowX: "auto",
        }}>
          <KaTeX math={sel.formula} display />
        </div>

        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.65, color: "var(--ink3)", margin: 0 }}>
          {sel.description}
        </p>
      </div>

      {/* M_manner row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { tag: "smo", label: "Smooth", color: "var(--teal)", desc: "Single velocity peak, CV < 0.4. Most citation-form signs.", formula: String.raw`\sigma_v / \mu_v < 0.4` },
          { tag: "tri", label: "Trilled", color: "var(--coral)", desc: "≥ 3 local velocity peaks within one Movement segment.", formula: String.raw`|\text{local maxima of }v_t| \geq 3` },
          { tag: "hld", label: "Hold", color: "var(--sky)", desc: "Segment is entirely a Hold phase — static signs or held endpoints.", formula: String.raw`v_t < \varepsilon_{\mathrm{hold}}\;\forall t` },
        ].map(m => (
          <div key={m.tag} style={{
            background: "var(--bg-surface)", border: "1px solid var(--rule)",
            borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: m.color,
                background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${m.color} 30%, transparent)`,
                borderRadius: 4, padding: "1px 6px",
              }}>{m.tag}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>{m.label}</span>
            </div>
            <div style={{ background: "var(--bg-base)", border: "1px solid var(--rule)", borderRadius: 4, padding: "6px 10px", overflowX: "auto" }}>
              <KaTeX math={m.formula} />
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink3)", margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
