"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useAppStore } from "@/store/appStore";
import { KaTeX } from "@/components/landing/KaTeX";

// ── Sub-vector bar chart ──────────────────────────────────────────────────────

interface SubVecBarsProps {
  label: string;
  sym: string;
  color: string;
  values: Float32Array | null;
  dims: number;
}

function SubVecBars({ label, sym, color, values, dims }: SubVecBarsProps) {
  const arr = values ?? new Float32Array(dims);
  const max = Math.max(...Array.from(arr).map(Math.abs), 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color }}>{sym}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink3)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink5)", marginLeft: "auto" }}>ℝ^{dims}</span>
      </div>
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 36 }}>
        {Array.from(arr).map((v, i) => {
          const h = Math.abs(v) / max;
          const pos = v >= 0;
          return (
            <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{
                height: `${Math.round(h * 34)}px`,
                minHeight: 1,
                background: pos ? color : `color-mix(in srgb, ${color} 50%, var(--ink5))`,
                borderRadius: 2,
                transition: "height 0.06s ease-out",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--ink5)" }}>
          norm: {Math.sqrt(Array.from(arr).reduce((s, v) => s + v * v, 0)).toFixed(3)}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--ink5)" }}>
          [{Array.from(arr).slice(0, 3).map(v => v.toFixed(2)).join(", ")}…]
        </span>
      </div>
    </div>
  );
}

// ── Live face viz driven by real u^N ─────────────────────────────────────────

interface LiveFaceProps {
  uN: Float32Array | null;
}

// u^N actual layout from computeNonManual:
//   [0] gaze_x   — signed, range ±0.25
//   [1] gaze_y   — signed, range ±0.10
//   [2] gaze_z   — signed depth, range ±0.05
//   [3] mouthAp  — always ≥ 0, range 0–0.07 (L2 norm of F[13]–F[14])
//   [4] browH    — always ≤ 0 in screen-space (brow above eye, y↓), range –0.08–0
const UN_MAX = { gaze_x: 0.25, gaze_y: 0.10, gaze_z: 0.05, mouth: 0.07, brow: 0.08 };

const GRAM_LABELS: { cond: (g: number, m: number, b: number) => boolean; label: string }[] = [
  // m = normalised mouth 0–1, b = normalised brow 0 (neutral) → 1 (raised)
  { cond: (g, m, b) => b > 0.4 && m > 0.3,  label: "Yes/no question — raised brows + open mouth" },
  { cond: (g, m, b) => b < -0.15 && m > 0.3, label: "Wh-question — furrowed brows + open mouth" },
  { cond: (g, m, b) => b < -0.15 && m < 0.1, label: "Negation — furrowed brows, closed mouth" },
  { cond: (g, m, b) => b > 0.5 && m < 0.1,  label: "Intensifier — raised brows, closed mouth" },
  { cond: (g, m, b) => Math.abs(g) > 0.6,   label: "Referential shift — gaze toward locus" },
  { cond: () => true,                         label: "Neutral / declarative" },
];

function LiveFaceViz({ uN }: LiveFaceProps) {
  // Correct index mapping
  const gazeX  = uN ? uN[0] * 6 : 0;
  // mouthAp (uN[3]) is always ≥ 0; normalise to 0–1
  const mouth  = uN ? Math.min(1, uN[3] / UN_MAX.mouth) : 0;
  // browH (uN[4]) is ≤ 0 when brows raised (brow above eye). Negate so raised = positive.
  const brow   = uN ? Math.min(1, Math.max(-1, -uN[4] / UN_MAX.brow)) : 0;

  // Normalised values for grammatical reading
  const normMouth = mouth;
  const normBrow  = brow;

  const gramLabel = GRAM_LABELS.find(({ cond }) => cond(
    uN ? uN[0] / UN_MAX.gaze_x : 0, normMouth, normBrow
  ))!.label;

  const cx = 80, cy = 80, faceR = 64;
  const eyeLx = 58, eyeRx = 102, eyeY = 66;
  const browDy = brow * 6;
  const mouthAp = mouth * 12;
  const mouthW = 20, mouthY = 94;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          background: "var(--bg-base)", border: "1px solid var(--rule)",
          borderRadius: 6, padding: 6, flexShrink: 0,
        }}>
          <svg viewBox="0 0 160 158" width="130" height="128" style={{ display: "block" }}>
            <ellipse cx={cx} cy={cy + 2} rx={faceR} ry={faceR - 4} fill="var(--bg-surface)" stroke="var(--ink5)" strokeWidth="1.2" />
            {([["L", eyeLx] as const, ["R", eyeRx] as const]).map(([side, ex]) => (
              <g key={side}>
                <ellipse cx={ex} cy={eyeY} rx={14} ry={9} fill="var(--bg-raised)" stroke="var(--ink4)" strokeWidth="1" />
                <circle cx={ex + gazeX * (side === "L" ? 0.9 : 1)} cy={eyeY} r={4} fill="var(--ink2)" />
                <circle cx={ex + gazeX * (side === "L" ? 0.9 : 1)} cy={eyeY} r={1.8} fill="var(--ink)" />
                <circle cx={ex + (side === "L" ? 12 : -12)} cy={eyeY} r={2} fill="var(--sky)" opacity={0.9} />
              </g>
            ))}
            {([eyeLx, eyeRx] as const).map((ex, i) => {
              const browBaseY = eyeY - 16 - browDy;
              const droop = brow < 0 ? (i === 0 ? 3 : -3) : 0;
              return (
                <path key={i}
                  d={`M${ex - 13} ${browBaseY + droop} Q${ex} ${browBaseY - 3} ${ex + 13} ${browBaseY - droop}`}
                  stroke={brow < -0.03 ? "var(--coral)" : brow > 0.03 ? "var(--teal)" : "var(--ink3)"}
                  strokeWidth="2" fill="none" strokeLinecap="round"
                />
              );
            })}
            <circle cx={cx} cy={cy + 6} r={2.5} fill="var(--teal)" opacity={0.8} />
            <path d={`M${cx - mouthW} ${mouthY} Q${cx} ${mouthY + 6} ${cx + mouthW} ${mouthY}`}
              stroke="var(--ink4)" strokeWidth="1.2" fill="none" />
            {mouthAp > 1 && (
              <ellipse cx={cx} cy={mouthY + mouthAp / 2} rx={mouthW * 0.7} ry={mouthAp / 2}
                fill="var(--ink)" opacity={0.1} stroke="var(--ink4)" strokeWidth="1" />
            )}
            {([cx - mouthW, cx + mouthW] as const).map((x, i) => (
              <circle key={i} cx={x} cy={mouthY} r={2} fill="var(--coral)" opacity={0.85} />
            ))}
          </svg>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {uN ? [
            { label: "gaze_x",   val: uN[0], color: "var(--sky)",   max: UN_MAX.gaze_x, unipolar: false },
            { label: "gaze_y",   val: uN[1], color: "var(--sky)",   max: UN_MAX.gaze_y, unipolar: false },
            { label: "gaze_z",   val: uN[2], color: "var(--sky)",   max: UN_MAX.gaze_z, unipolar: false },
            { label: "mouth_ap", val: uN[3], color: "var(--coral)", max: UN_MAX.mouth,  unipolar: true  },
            { label: "brow_h",   val: uN[4], color: "var(--mint)",  max: UN_MAX.brow,   unipolar: false },
          ].map(({ label, val, color, max, unipolar }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink4)", minWidth: 48 }}>{label}</span>
              <div style={{ flex: 1, height: 5, background: "var(--bg-raised)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                {!unipolar && <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--rule)", zIndex: 1 }} />}
                {unipolar ? (
                  <div style={{
                    position: "absolute",
                    top: 0, bottom: 0, left: 0,
                    width: `${Math.min(100, Math.abs(val) / max * 100)}%`,
                    background: color,
                    transition: "width 0.06s ease-out",
                  }} />
                ) : (
                  <div style={{
                    position: "absolute",
                    top: 0, bottom: 0,
                    ...(val >= 0
                      ? { left: "50%",  width: `${Math.min(50, Math.abs(val) / max * 50)}%` }
                      : { right: "50%", width: `${Math.min(50, Math.abs(val) / max * 50)}%` }),
                    background: color,
                    transition: "width 0.06s ease-out",
                  }} />
                )}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color, minWidth: 44, textAlign: "right" }}>
                {val >= 0 ? "+" : ""}{val.toFixed(3)}
              </span>
            </div>
          )) : (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink5)" }}>
              Waiting for face landmarks…
            </span>
          )}
        </div>
      </div>

      <div style={{
        background: "var(--bg-raised)", border: "1px solid var(--rule)",
        borderLeft: "3px solid var(--lav)", borderRadius: 5, padding: "7px 12px",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--lav)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Reading ·{" "}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink2)" }}>
          {gramLabel}
        </span>
      </div>
    </div>
  );
}

// ── Contact flag ──────────────────────────────────────────────────────────────

function ContactFlag({ landmarks }: { landmarks: import("@/types").Landmarks | null }) {
  const contact = (() => {
    if (!landmarks?.left_hand || !landmarks?.right_hand) return null;
    const lh = landmarks.left_hand, rh = landmarks.right_hand;
    const lcx = (lh[0] + lh[15] + lh[27] + lh[39] + lh[51]) / 5;
    const lcy = (lh[1] + lh[16] + lh[28] + lh[40] + lh[52]) / 5;
    const rcx = (rh[0] + rh[15] + rh[27] + rh[39] + rh[51]) / 5;
    const rcy = (rh[1] + rh[16] + rh[28] + rh[40] + rh[52]) / 5;
    const d = Math.sqrt((lcx - rcx) ** 2 + (lcy - rcy) ** 2);
    return d < 0.15;
  })();

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      background: "var(--bg-surface)", border: "1px solid var(--rule)",
      borderRadius: 6, padding: "10px 14px",
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Contact flag κ
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: contact === null ? "var(--ink5)" : contact ? "var(--mint)" : "var(--bg-raised)",
          border: `2px solid ${contact === null ? "var(--rule)" : contact ? "var(--mint)" : "var(--rule)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
          color: contact ? "white" : "var(--ink4)",
          transition: "all 0.1s",
          flexShrink: 0,
        }}>
          {contact === null ? "—" : contact ? "1" : "0"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink2)" }}>
            {contact === null ? "Need both hands" : contact ? "Hands in contact" : "Hands separate"}
          </span>
          <div style={{ fontSize: 9 }}>
            <KaTeX math={String.raw`\kappa_t = \mathbf{1}[\|c^d - c^n\|_2 \leq 0.15]`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main LiveVerification ─────────────────────────────────────────────────────

export function LiveVerification() {
  const [enabled, setEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useMediaPipe({ videoRef, enabled });

  const status    = useAppStore(s => s.status);
  const phonology = useAppStore(s => s.phonology);
  const landmarks = useAppStore(s => s.landmarks);
  const fps       = useAppStore(s => s.fps);
  const latency   = useAppStore(s => s.latency_ms);

  const hasHands = landmarks?.left_hand != null || landmarks?.right_hand != null;

  const f51norm = phonology
    ? Math.sqrt(Array.from(phonology.feature_vector_51).reduce((s, v) => s + v * v, 0))
    : 0;

  const disconnect = useCallback(() => {
    setEnabled(false);
    useAppStore.setState({ status: "idle", landmarks: null, phonology: null, fps: 0, latency_ms: 0 });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    useAppStore.setState({ status: "idle", landmarks: null, phonology: null, fps: 0, latency_ms: 0 });
  }, []);

  if (!enabled) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        padding: "56px 40px",
        background: "var(--bg-surface)", border: "1px solid var(--rule)",
        borderRadius: 10, textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--bg-raised)", border: "1px solid var(--rule)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>
          ◎
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 600, color: "var(--ink2)" }}>
            Live Feature Verification
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink4)", maxWidth: 420, lineHeight: 1.6 }}>
            Connect your camera to see u^H, u^L, u^O, u^M, and u^N respond
            to your actual hands and face in real time. No sign recognition — just the math.
          </span>
        </div>
        <button
          onClick={() => setEnabled(true)}
          style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
            color: "var(--bg-base)", background: "var(--ink)",
            border: "none", borderRadius: 8, padding: "11px 28px",
            cursor: "pointer", letterSpacing: "0.02em",
          }}
        >
          Connect Camera
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)" }}>
          Runs entirely in your browser · No data sent to any server
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px",
        background: "var(--bg-surface)", border: "1px solid var(--rule)", borderRadius: 6,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: status === "live" ? "var(--mint)" : status === "loading" ? "var(--sky)" : "var(--ink5)",
          animation: status === "loading" ? "pulse 1s ease-in-out infinite" : "none",
        }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink3)", flex: 1 }}>
          {status === "live" ? "MediaPipe live" : status === "loading" ? "Loading models…" : status}
        </span>
        {status === "live" && (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--teal)" }}>{fps} fps</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink4)" }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink3)" }}>{latency} ms</span>
          </>
        )}
        <button
          onClick={disconnect}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)",
            background: "var(--bg-raised)", border: "1px solid var(--rule)",
            borderRadius: 4, padding: "3px 8px", cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>

        {/* Left: video + contact */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--rule)", background: "#000", aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: "block" }}
            />
            {!hasHands && status === "live" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
              }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                  Show your hands
                </span>
              </div>
            )}
            {hasHands && (
              <div style={{ position: "absolute", bottom: 6, left: 6 }}>
                <div style={{
                  background: "rgba(0,0,0,0.55)", borderRadius: 4,
                  padding: "2px 7px", display: "flex", gap: 6, alignItems: "center",
                }}>
                  {landmarks?.left_hand && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--mint)" }}>L</span>}
                  {landmarks?.right_hand && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--coral)" }}>R</span>}
                </div>
              </div>
            )}
          </div>

          <ContactFlag landmarks={landmarks} />

          {/* f_t norm */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--rule)",
            borderRadius: 6, padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ‖f_t‖₂
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24, color: "var(--teal)", lineHeight: 1 }}>
              {f51norm.toFixed(3)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink5)" }}>
              f_t ∈ ℝ^51
            </span>
          </div>
        </div>

        {/* Right: feature vectors */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Sub-vector bars */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--rule)",
            borderRadius: 8, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <SubVecBars label="Handshape" sym="u^H" color="var(--coral)" values={phonology?.u_H ?? null} dims={16} />
            <SubVecBars label="Location"  sym="u^L" color="var(--teal)"  values={phonology?.u_L ?? null} dims={6} />
            <SubVecBars label="Orientation" sym="u^O" color="var(--sky)" values={phonology?.u_O ?? null} dims={6} />
            <SubVecBars label="Movement"  sym="u^M" color="var(--mint)"  values={phonology?.u_M ?? null} dims={18} />
            <SubVecBars label="Non-manual" sym="u^N" color="var(--lav)"  values={phonology?.u_N ?? null} dims={5} />
          </div>
        </div>
      </div>

      {/* Non-manual face — full width */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--rule)",
        borderRadius: 8, padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--lav)" }}>u^N</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink3)" }}>Non-manual markers — live from face mesh</span>
        </div>
        <LiveFaceViz uN={phonology?.u_N ?? null} />
      </div>
    </div>
  );
}
