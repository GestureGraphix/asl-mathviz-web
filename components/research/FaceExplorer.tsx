"use client";

import { useState, useId } from "react";
import { KaTeX } from "@/components/landing/KaTeX";

const GRAMMATICAL_LABELS: { cond: (g: number, m: number, b: number) => boolean; label: string }[] = [
  { cond: (g, m, b) => b > 0.4 && m > 0.3,  label: "Yes/no question (raised brows + open mouth)" },
  { cond: (g, m, b) => b < -0.4 && m > 0.3, label: "Wh-question (furrowed brows + open mouth)" },
  { cond: (g, m, b) => b < -0.4 && m < 0.1, label: "Negation / disagreement (furrowed brows, closed mouth)" },
  { cond: (g, m, b) => b > 0.5 && m < 0.1,  label: "Intensifier (raised brows, closed mouth)" },
  { cond: (g, m, b) => Math.abs(g) > 0.6,   label: "Referential shift (gaze toward discourse locus)" },
  { cond: () => true,                         label: "Neutral / declarative" },
];

function getLabel(gaze: number, mouth: number, brow: number): string {
  return GRAMMATICAL_LABELS.find(({ cond }) => cond(gaze, mouth, brow))!.label;
}

export function FaceExplorer() {
  const [gaze, setGaze]   = useState(0);     // -1 (left) to 1 (right)
  const [mouth, setMouth] = useState(0.15);  // 0 (closed) to 1 (open)
  const [brow, setBrow]   = useState(0);     // -1 (furrowed) to 1 (raised)
  const id = useId();

  // SVG geometry
  const cx = 110, cy = 108, faceR = 88;
  const eyeLx = 80,  eyeRx = 140, eyeY = 88, eyeRw = 18, eyeRh = 11;
  const browY  = (side: "L" | "R") => {
    const base = side === "L" ? eyeY - 20 : eyeY - 20;
    return base - brow * 8;
  };
  const browCurve = (side: "L" | "R") => {
    const x = side === "L" ? eyeLx : eyeRx;
    const y = browY(side);
    const droop = brow < 0 ? (side === "L" ? 4 : -4) : 0;
    return `M${x - 17} ${y + droop} Q${x} ${y - 4} ${x + 17} ${y - droop}`;
  };

  const gazeOffX = gaze * 6;
  const mouthAperture = mouth * 14;
  const mouthW = 28;
  const mouthX = cx, mouthY = 126;

  // u^N layout: [gaze_x, gaze_y, gaze_z, mouthAp, browH]
  // Scale slider values to the real pipeline ranges (UN_MAX constants)
  const uN = [
    (gaze * 0.25).toFixed(3),       // [0] gaze_x  ∈ ±0.25
    (0).toFixed(3),                   // [1] gaze_y  (not modelled in 2-D explorer)
    (0).toFixed(3),                   // [2] gaze_z  (not modelled in 2-D explorer)
    (mouth * 0.07).toFixed(3),       // [3] mouthAp ∈ [0, 0.07]
    (-brow * 0.08).toFixed(3),       // [4] browH   ≤ 0 when raised (y↓ screen-space)
  ];
  const uNTex = String.raw`\mathbf{u}^N_t = [${uN.join(",\;")}]^\top \in \mathbb{R}^5`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>

        {/* SVG face */}
        <div style={{
          background: "var(--bg-base)",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <svg viewBox="0 0 220 216" width="204" height="200" style={{ display: "block" }}>
            {/* Face outline */}
            <ellipse cx={cx} cy={cy + 4} rx={faceR} ry={faceR - 4} fill="var(--bg-surface)" stroke="var(--ink5)" strokeWidth="1.5" />

            {/* Eyes */}
            {[["L", eyeLx] as const, ["R", eyeRx] as const].map(([side, ex]) => (
              <g key={side}>
                <ellipse cx={ex} cy={eyeY} rx={eyeRw} ry={eyeRh} fill="var(--bg-raised)" stroke="var(--ink4)" strokeWidth="1.2" />
                {/* Iris */}
                <circle cx={ex + gazeOffX * (side === "L" ? 0.9 : 1)} cy={eyeY} r={5.5} fill="var(--ink2)" />
                {/* Pupil */}
                <circle cx={ex + gazeOffX * (side === "L" ? 0.9 : 1)} cy={eyeY} r={2.5} fill="var(--ink)" />
                {/* Inner corner landmark F[33]/F[263] */}
                <circle cx={ex + (side === "L" ? eyeRw - 2 : -(eyeRw - 2))} cy={eyeY} r={2.5} fill="var(--sky)" opacity={0.9} />
              </g>
            ))}

            {/* Gaze arrow */}
            {Math.abs(gaze) > 0.1 && (
              <line
                x1={cx} y1={eyeY + 30}
                x2={cx + gazeOffX * 10} y2={eyeY + 30}
                stroke="var(--sky)" strokeWidth={1.8} strokeDasharray="3 2"
                markerEnd="url(#arrow)"
              />
            )}
            <defs>
              <marker id={`${id}-arrow`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--sky)" />
              </marker>
            </defs>

            {/* Eyebrows */}
            {(["L", "R"] as const).map(side => (
              <path key={side} d={browCurve(side)}
                stroke={brow < -0.2 ? "var(--coral)" : brow > 0.2 ? "var(--teal)" : "var(--ink3)"}
                strokeWidth="2.5" fill="none" strokeLinecap="round"
              />
            ))}
            {/* Brow landmark F[107]/F[336] */}
            {([eyeLx, eyeRx] as const).map((x, i) => (
              <circle key={i} cx={x} cy={browY(i === 0 ? "L" : "R")} r={2.5} fill="var(--mint)" opacity={0.9} />
            ))}

            {/* Nose tip F[1] */}
            <circle cx={cx} cy={cy + 8} r={3} fill="var(--teal)" opacity={0.8} />
            <text x={cx + 5} y={cy + 8 + 4} fontSize="7" fill="var(--ink4)" fontFamily="var(--font-mono)">F[1]</text>

            {/* Mouth */}
            <path
              d={`M${mouthX - mouthW} ${mouthY} Q${mouthX} ${mouthY + 8} ${mouthX + mouthW} ${mouthY}`}
              stroke="var(--ink4)" strokeWidth="1.5" fill="none"
            />
            {mouthAperture > 1 && (
              <ellipse cx={mouthX} cy={mouthY + mouthAperture / 2} rx={mouthW * 0.75} ry={mouthAperture / 2}
                fill="var(--ink)" opacity={0.12} stroke="var(--ink4)" strokeWidth="1.2"
              />
            )}
            {/* Mouth corner landmarks F[61]/F[291] */}
            {([mouthX - mouthW, mouthX + mouthW] as const).map((x, i) => (
              <circle key={i} cx={x} cy={mouthY} r={2.5} fill="var(--coral)" opacity={0.9} />
            ))}
            <text x={mouthX - mouthW - 22} y={mouthY + 4} fontSize="7" fill="var(--ink4)" fontFamily="var(--font-mono)">F[61]</text>
            <text x={mouthX + mouthW + 3} y={mouthY + 4} fontSize="7" fill="var(--ink4)" fontFamily="var(--font-mono)">F[291]</text>
          </svg>

          {/* Landmark legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", paddingBottom: 4 }}>
            {[
              { color: "var(--sky)", label: "gaze / scale" },
              { color: "var(--mint)", label: "brow" },
              { color: "var(--coral)", label: "mouth" },
              { color: "var(--teal)", label: "anchor" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls + live output */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Sliders */}
          {[
            { label: "Gaze direction", min: -1, max: 1, step: 0.01, value: gaze, setter: setGaze, color: "var(--sky)", fmt: (v: number) => v > 0.1 ? "right" : v < -0.1 ? "left" : "center" },
            { label: "Mouth aperture", min: 0, max: 1, step: 0.01, value: mouth, setter: setMouth, color: "var(--coral)", fmt: (v: number) => v < 0.15 ? "closed" : v < 0.5 ? "open" : "wide open" },
            { label: "Brow elevation", min: -1, max: 1, step: 0.01, value: brow, setter: setBrow, color: "var(--mint)", fmt: (v: number) => v > 0.3 ? "raised" : v < -0.3 ? "furrowed" : "neutral" },
          ].map(({ label, min, max, step, value, setter, color, fmt }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color }}>
                  {value.toFixed(2)} · {fmt(value)}
                </span>
              </div>
              <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => setter(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: color, cursor: "pointer" }}
              />
            </div>
          ))}

          {/* Grammatical label */}
          <div style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--rule)",
            borderLeft: "3px solid var(--lav)",
            borderRadius: 6,
            padding: "10px 14px",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--lav)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Grammatical reading
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink2)", lineHeight: 1.5 }}>
              {getLabel(gaze, mouth, brow)}
            </div>
          </div>

          {/* Live u^N formula */}
          <div style={{
            background: "var(--bg-base)",
            border: "1px solid var(--rule)",
            borderRadius: 6,
            padding: "10px 14px",
            overflowX: "auto",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Live u^N vector
            </div>
            <KaTeX math={uNTex} display />
          </div>
        </div>
      </div>

      {/* Landmark reference table */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--rule)",
        borderRadius: 6,
        overflow: "hidden",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: "1px solid var(--rule)" }}>
          {["Dimension", "Feature", "Landmarks", "Formula", "Grammatical role"].map(h => (
            <div key={h} style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em", borderRight: "1px solid var(--rule)" }}>
              {h}
            </div>
          ))}
        </div>
        {[
          { dim: "1–2", feat: "Gaze axis", lm: "F[33], F[263], F[133], F[362]", formula: String.raw`g_t = \tfrac{1}{2}(F[33]+F[133]) - \tfrac{1}{2}(F[362]+F[263])`, role: "referential shift, eye contact" },
          { dim: "3", feat: "Mouth aperture", lm: "F[61], F[291]", formula: String.raw`\|F_t[61] - F_t[291]\|_2`, role: "question type, intensity" },
          { dim: "4", feat: "Brow height", lm: "F[107], F[336]", formula: String.raw`\tfrac{1}{2}(F_t[107]_y + F_t[336]_y)`, role: "yes/no vs. wh-, negation" },
          { dim: "5", feat: "Head tilt", lm: "F[10], F[152]", formula: String.raw`\angle(\overrightarrow{F[10]F[152]},\; \hat{y})`, role: "affirmation, conditional" },
        ].map(({ dim, feat, lm, formula, role }) => (
          <div key={dim} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)", borderRight: "1px solid var(--rule)" }}>{dim}</div>
            <div style={{ padding: "8px 12px", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink2)", borderRight: "1px solid var(--rule)" }}>{feat}</div>
            <div style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", borderRight: "1px solid var(--rule)" }}>{lm}</div>
            <div style={{ padding: "8px 12px", fontSize: 11, borderRight: "1px solid var(--rule)", overflowX: "auto" }}><KaTeX math={formula} /></div>
            <div style={{ padding: "8px 12px", fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink3)" }}>{role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
