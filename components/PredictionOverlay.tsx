"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { GLOSS_TO_COLOR } from "@/lib/signData";

export function PredictionOverlay({ onShowCanonical }: { onShowCanonical?: (gloss: string) => void }) {
  const prediction = useAppStore((s) => s.prediction);
  const candidate  = useAppStore((s) => s.candidate);
  const signFrames = useAppStore((s) => s.signFrames);

  const showFrameCounter = signFrames > 0 && !candidate && !prediction;

  return (
    <>
      {/* ── Frame accumulator — shown before candidate appears ──── */}
      <AnimatePresence>
        {showFrameCounter && (
          <motion.div
            key="frame-counter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              zIndex: 9,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--teal)",
              display: "inline-block",
              boxShadow: "0 0 6px rgba(62,168,159,0.7)",
            }} />
            {signFrames}f
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live candidate — shown while model is "thinking" ──────── */}
      <AnimatePresence>
        {candidate && !prediction && (
          <motion.div
            key="candidate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              zIndex: 9,
              pointerEvents: "none",
            }}
          >
            {/* Dim gloss */}
            <div style={{
              fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
              fontStyle: "italic",
              fontSize: "clamp(40px, 5.5vw, 72px)",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "rgba(255,255,255,0.28)",
              textShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}>
              {candidate.gloss.toLowerCase().replace(/_/g, " ")}
            </div>
            {/* Confidence + runner-up + frame count */}
            <div style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              marginTop: 5,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 9, letterSpacing: "0.08em" }}>
                thinking
              </span>
              <ConfidenceBar value={candidate.confidence} />
              <span>{Math.round(candidate.confidence * 100)}%</span>
              {candidate.top_k[1] && (
                <span style={{ color: "rgba(255,255,255,0.22)" }}>
                  {candidate.top_k[1].gloss.toLowerCase()} {Math.round(candidate.top_k[1].confidence * 100)}%
                </span>
              )}
              <span style={{ color: "rgba(255,255,255,0.18)" }}>· {signFrames}f</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Committed prediction ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {prediction && (
          <motion.div
            key={prediction.gloss}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
                fontStyle: "italic",
                fontSize: "clamp(56px, 7.5vw, 96px)",
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.01em",
                color: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              {prediction.gloss.toLowerCase().replace(/_/g, " ")}
            </div>

            {/* Top-3 confidence bars */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              {prediction.top_k.slice(0, 3).map((entry, i) => {
                const color = GLOSS_TO_COLOR[entry.gloss] ?? "#3ea89f";
                const pct   = Math.round(entry.confidence * 100);
                return (
                  <div key={entry.gloss} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Rank dot */}
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: i === 0 ? color : "rgba(255,255,255,0.22)",
                      flexShrink: 0,
                    }} />
                    {/* Gloss label */}
                    <span style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 10,
                      color: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
                      width: 96,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.04em",
                    }}>
                      {entry.gloss.toLowerCase().replace(/_/g, " ")}
                    </span>
                    {/* Bar track */}
                    <div style={{
                      width: 80,
                      height: 3,
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}>
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        style={{
                          height: "100%",
                          background: i === 0 ? color : "rgba(255,255,255,0.25)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    {/* Percentage */}
                    <span style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 10,
                      color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                      minWidth: 28,
                      textAlign: "right",
                    }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            {onShowCanonical && (
              <button
                onClick={() => onShowCanonical(prediction.gloss)}
                style={{
                  marginTop: 10,
                  pointerEvents: "auto",
                  background: "rgba(0,0,0,0.38)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  borderRadius: 5,
                  color: "rgba(255,255,255,0.72)",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  padding: "4px 12px",
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                  display: "block",
                }}
              >
                → show canonical
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{
      width: 40,
      height: 3,
      background: "rgba(255,255,255,0.1)",
      borderRadius: 2,
      overflow: "hidden",
    }}>
      <div style={{
        width: `${Math.round(value * 100)}%`,
        height: "100%",
        background: value >= 0.6
          ? "rgba(62,168,159,0.7)"
          : "rgba(255,255,255,0.3)",
        borderRadius: 2,
        transition: "width 0.3s ease",
      }} />
    </div>
  );
}
