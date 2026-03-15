"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";

export function TranscriptStrip() {
  const transcript = useAppStore((s) => s.transcript);
  const clearTranscript = useAppStore((s) => s.clearTranscript);

  // Keyboard shortcut: C = clear
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "c" || e.key === "C") clearTranscript();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTranscript]);

  return (
    <footer
      style={{
        gridArea: "transcript",
        height: 50,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--rule)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 18,
        overflow: "hidden",
      }}
    >
      {transcript.length === 0 ? (
        <span
          style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 11,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink5)",
          }}
        >
          Sign something to start transcript
        </span>
      ) : (
        <>
          {[...transcript].reverse().map((entry, i) => {
            const opacityClass =
              i === 0 ? "current" : i <= 2 ? "mid" : "dim";
            const opacity =
              opacityClass === "current" ? 1 : opacityClass === "mid" ? 0.4 : 0.15;
            return (
              <span
                key={`${entry.gloss}-${entry.timestamp_ms}`}
                style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
                  fontStyle: "italic",
                  fontSize: 23,
                  lineHeight: 1,
                  color: "var(--ink)",
                  opacity,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.4s ease",
                }}
              >
                {entry.gloss.toLowerCase()}
              </span>
            );
          })}
          {/* blinking cursor */}
          <span className="transcript-cursor" />
        </>
      )}
    </footer>
  );
}
