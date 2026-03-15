"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";

export function PredictionOverlay() {
  const prediction = useAppStore((s) => s.prediction);

  return (
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
          {/* Gloss — Bodoni Moda italic, editorial */}
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
            {prediction.gloss.toLowerCase().replace("_", " ")}
          </div>

          {/* Confidence + top-2 alternatives */}
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              marginTop: 6,
              letterSpacing: "0.02em",
            }}
          >
            {Math.round(prediction.confidence * 100)}%
            {prediction.top_k[1] && (
              <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 12 }}>
                {prediction.top_k[1].gloss.toLowerCase()} {Math.round(prediction.top_k[1].confidence * 100)}%
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
