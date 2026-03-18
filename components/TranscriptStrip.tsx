"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";

export function TranscriptStrip() {
  const transcript = useAppStore((s) => s.transcript);
  const clearTranscript = useAppStore((s) => s.clearTranscript);
  const [copied, setCopied] = useState(false);

  // Keyboard shortcut: C = clear
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "c" || e.key === "C") clearTranscript();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTranscript]);

  function copyTranscript() {
    const text = [...transcript].reverse().map((e) => e.gloss.toLowerCase()).join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

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
            const opacity = i === 0 ? 1 : i <= 2 ? 0.4 : 0.15;
            return (
              <span
                key={`${entry.gloss}-${entry.timestamp_ms}`}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 5,
                  opacity,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.4s ease",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
                  fontStyle: "italic",
                  fontSize: 23,
                  lineHeight: 1,
                  color: "var(--ink)",
                }}>
                  {entry.gloss.toLowerCase()}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  color: "var(--ink4)",
                  lineHeight: 1,
                }}>
                  {Math.round(entry.confidence * 100)}%
                </span>
              </span>
            );
          })}
          {/* blinking cursor */}
          <span className="transcript-cursor" />

          {/* Copy button — pushed to right */}
          <button
            onClick={copyTranscript}
            title="Copy transcript"
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 4,
              color: copied ? "var(--teal)" : "var(--ink4)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "color 0.2s ease",
            }}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,8 6,12 14,4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="9" height="11" rx="1.5" />
                <path d="M5 4H3.5A1.5 1.5 0 0 0 2 5.5v8A1.5 1.5 0 0 0 3.5 15H11a1.5 1.5 0 0 0 1.5-1.5V13" />
              </svg>
            )}
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9, letterSpacing: "0.06em" }}>
              {copied ? "copied" : "copy"}
            </span>
          </button>
        </>
      )}
    </footer>
  );
}
