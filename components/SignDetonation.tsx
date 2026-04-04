"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { GLOSS_TO_COLOR } from "@/lib/signData";

// Regular pentagon: H top, then clockwise
const FRAGMENTS = [
  { param: "H", label: "Handshape", color: "#e0686a", tx:    0, ty: -205 },
  { param: "L", label: "Location",  color: "#3ea89f", tx:  195, ty:  -63 },
  { param: "O", label: "Orient.",   color: "#5090d8", tx:  120, ty:  165 },
  { param: "M", label: "Movement",  color: "#4dbb87", tx: -120, ty:  165 },
  { param: "N", label: "Non-Manual",color: "#8b7fd4", tx: -195, ty:  -63 },
] as const;

interface DetEvent {
  key: number;
  gloss: string;
  color: string;
  codes: Record<string, number | null>;
}

export function SignDetonation() {
  const prediction = useAppStore((s) => s.prediction);
  const lastTs     = useRef<number | null>(null);
  const [event, setEvent]   = useState<DetEvent | null>(null);
  const keyRef   = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!prediction || prediction.timestamp_ms === lastTs.current) return;
    lastTs.current = prediction.timestamp_ms;

    const ph    = useAppStore.getState().phonology;
    const color = GLOSS_TO_COLOR[prediction.gloss] ?? "#3ea89f";
    keyRef.current += 1;

    setEvent({
      key:   keyRef.current,
      gloss: prediction.gloss,
      color,
      codes: {
        H: ph?.code_H ?? null,
        L: ph?.code_L ?? null,
        O: ph?.code_O ?? null,
        M: ph?.code_M ?? null,
        N: null,
      },
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setEvent(null), 2800);
  }, [prediction]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <AnimatePresence>
      {event && (
        <div
          key={event.key}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 8,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Shockwave ring */}
          <motion.div
            initial={{ opacity: 0.7, scale: 0 }}
            animate={{ opacity: 0, scale: 3.5 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0.4, 1] }}
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: `1.5px solid ${event.color}`,
              boxShadow: `0 0 24px ${event.color}66`,
            }}
          />

          {/* Second ring, delayed */}
          <motion.div
            initial={{ opacity: 0.45, scale: 0 }}
            animate={{ opacity: 0, scale: 5 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.2, 0, 0.4, 1] }}
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `1px solid ${event.color}88`,
            }}
          />

          {/* Central gloss flash */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3, filter: "blur(12px)" }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale:   [0.3, 1.08, 1.0, 0.75],
              filter:  ["blur(12px)", "blur(0px)", "blur(0px)", "blur(6px)"],
            }}
            transition={{ duration: 0.55, times: [0, 0.22, 0.58, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
              fontStyle: "italic",
              fontSize: "clamp(52px, 9vw, 108px)",
              fontWeight: 400,
              color: event.color,
              textShadow: `0 0 48px ${event.color}cc, 0 0 96px ${event.color}55`,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {event.gloss.toLowerCase().replace(/_/g, " ")}
          </motion.div>

          {/* Parameter fragments — shoot outward from center */}
          {FRAGMENTS.map(({ param, label, color, tx, ty }, i) => (
            <motion.div
              key={param}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: [0, tx * 1.18, tx, tx],
                y: [0, ty * 1.18, ty, ty],
                opacity: [0, 0, 1, 0],
                scale:   [0, 0, 1, 0.6],
              }}
              transition={{
                duration: 2.55,
                delay:    0.22 + i * 0.055,
                times:    [0, 0.16, 0.32, 1],
                ease:     "easeOut",
              }}
              style={{
                position: "absolute",
                // Centered on its own width/height
                transform: "translate(-50%, -50%)",
              }}
            >
              <div style={{
                background: `color-mix(in srgb, ${color} 9%, #050d16)`,
                border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                backdropFilter: "blur(8px)",
                boxShadow: `0 0 20px ${color}44, 0 4px 16px rgba(0,0,0,0.6)`,
                minWidth: 68,
              }}>
                {/* Parameter letter */}
                <span style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
                  fontStyle: "italic",
                  fontSize: 32,
                  fontWeight: 400,
                  lineHeight: 1,
                  color,
                  textShadow: `0 0 16px ${color}bb`,
                }}>
                  {param}
                </span>

                {/* VQ code */}
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color,
                  opacity: 0.85,
                }}>
                  {event.codes[param] !== null
                    ? `#${String(event.codes[param]).padStart(2, "0")}`
                    : "—"}
                </span>

                {/* Parameter label */}
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 7.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color,
                  opacity: 0.5,
                  whiteSpace: "nowrap",
                }}>
                  {label}
                </span>
              </div>

              {/* Connector line toward center */}
              <svg
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  overflow: "visible",
                  pointerEvents: "none",
                  opacity: 0.18,
                }}
                width="0"
                height="0"
              >
                <line
                  x1={0}
                  y1={0}
                  x2={-tx * 0.55}
                  y2={-ty * 0.55}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              </svg>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
