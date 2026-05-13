"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useAppStore } from "@/store/appStore";
import { AppHeader } from "@/components/AppHeader";
import { TranscriptStrip } from "@/components/TranscriptStrip";
import { HandCanvas2D } from "@/components/HandCanvas2D";
import { HandScene3D } from "@/components/HandScene3D";
import { PhonologyBars } from "@/components/PhonologyBars";
import { PredictionOverlay } from "@/components/PredictionOverlay";
import { MinimalPairPanel } from "@/components/MinimalPairPanel";
import { CodebookGrid } from "@/components/CodebookGrid";
import { PhonologicalAvatar } from "@/components/PhonologicalAvatar";
import { GeodesicInterpolator } from "@/components/GeodesicInterpolator";
import { AttentionStrip } from "@/components/AttentionStrip";
import { PhonologyArcs } from "@/components/PhonologyArcs";
import { SignDetonation } from "@/components/SignDetonation";
import { PhonologicalSpectrogram } from "@/components/PhonologicalSpectrogram";
import { useInference } from "@/hooks/useInference";

type AppMode = "recognize" | "generate" | "geodesic";

export default function Home() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const shellRef  = useRef<HTMLDivElement>(null);
  const [isCinema, setIsCinema]       = useState(false);
  const [mode, setMode]               = useState<AppMode>("recognize");
  const [canonicalGloss, setCanonicalGloss] = useState<string | null>(null);
  const [videoMain, setVideoMain]     = useState(false);
  const [geodesicPair, setGeodesicPair] = useState<{ a: string; b: string } | null>(null);

  const handleShowCanonical = useCallback((gloss: string) => {
    setCanonicalGloss(gloss);
    setMode("generate");
  }, []);

  const handleModeChange = useCallback((m: AppMode) => {
    if (m === "recognize") setCanonicalGloss(null);
    setMode(m);
  }, []);

  const handleViewGeodesic = useCallback((glossA: string, glossB: string) => {
    setGeodesicPair({ a: glossA, b: glossB });
    setCanonicalGloss(null);
    setMode("geodesic");
  }, []);

  const isRecognizing = mode === "recognize";
  useMediaPipe({ videoRef, enabled: isRecognizing });
  useInference({ enabled: isRecognizing });

  const status          = useAppStore((s) => s.status);
  const candidate       = useAppStore((s) => s.candidate);
  const landmarks       = useAppStore((s) => s.landmarks);
  const clearTranscript = useAppStore((s) => s.clearTranscript);
  const setStatus       = useAppStore((s) => s.setStatus);
  const prediction      = useAppStore((s) => s.prediction);
  const modelMode       = useAppStore((s) => s.modelMode);
  const setModelMode    = useAppStore((s) => s.setModelMode);
  const fsLetter        = useAppStore((s) => s.fsLetter);

  const hasHands = landmarks?.left_hand != null || landmarks?.right_hand != null;

  // ── Keyboard shortcuts ──────────────────────────────────────────
  const toggleCinema = useCallback(() => {
    setIsCinema((prev) => {
      const next = !prev;
      if (next) shellRef.current?.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") toggleCinema();
      if (e.key === "c" || e.key === "C") clearTranscript();
      if (e.key === " ") {
        e.preventDefault();
        setStatus(status === "live" ? "paused" : "live");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCinema, clearTranscript, setStatus, status]);

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setIsCinema(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <>
      <div ref={shellRef} className="app-shell" data-cinema={isCinema || undefined}>
        {!isCinema && (
          <AppHeader
            mode={mode}
            onModeChange={handleModeChange}
            onToggleCinema={toggleCinema}
          />
        )}

        <main className="app-main" style={
          isCinema || mode === "generate" || mode === "geodesic"
            ? { gridTemplateColumns: "1fr" }
            : undefined
        }>

          {/* ── Generate mode ──────────────────────────────────── */}
          {mode === "generate" && (
            <div className="app-scene" style={{ overflow: "hidden" }}>
              <PhonologicalAvatar jumpGloss={canonicalGloss} />
            </div>
          )}

          {/* ── Geodesic mode ──────────────────────────────────── */}
          {mode === "geodesic" && (
            <div className="app-scene" style={{ overflow: "hidden" }}>
              <GeodesicInterpolator
                key={geodesicPair ? `${geodesicPair.a}__${geodesicPair.b}` : "default"}
                initialGlossA={geodesicPair?.a}
                initialGlossB={geodesicPair?.b}
              />
            </div>
          )}

          {/* Hidden video — always mounted so videoRef stays valid across modes */}
          <video ref={videoRef} playsInline muted style={{ display: "none" }} />

          {/* ── Recognize mode ─────────────────────────────────── */}
          {mode === "recognize" && (
            <div className="app-scene" style={{ background: "#040812" }}>

              {/* Main scene */}
              {status === "live" && !videoMain && <HandScene3D />}
              {status === "live" &&  videoMain && (
                <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
                  <HandCanvas2D videoRef={videoRef} mirror />
                </div>
              )}

              {/* PIP — click to swap primary / secondary views */}
              {status === "live" && (
                <div
                  className="demo-pip"
                  onClick={() => setVideoMain((v) => !v)}
                  title="Click to swap views"
                  style={{
                    position: "absolute", bottom: 14, right: 14,
                    width: 192, height: 144,
                    borderRadius: 8, overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
                    zIndex: 6, cursor: "pointer", background: "#040812",
                  }}
                >
                  {videoMain
                    ? <HandScene3D />
                    : <HandCanvas2D videoRef={videoRef} mirror />}
                </div>
              )}

              {/* Model toggle — Signs | A–Z */}
              {status === "live" && (
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
                  <div style={{
                    display: "flex",
                    background: "rgba(4,8,18,0.6)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, overflow: "hidden",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}>
                    {(["signs", "fingerspelling"] as const).map((m) => (
                      <button key={m} onClick={() => setModelMode(m)} style={{
                        padding: "5px 14px",
                        fontSize: 10,
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.07em",
                        background: modelMode === m ? "rgba(255,255,255,0.14)" : "transparent",
                        color: modelMode === m ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                        border: "none", cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                      }}>
                        {m === "signs" ? "Signs" : "A–Z"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fingerspelling letter overlay */}
              {status === "live" && modelMode === "fingerspelling" && fsLetter && (
                <div style={{
                  position: "absolute", top: "40%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 8, textAlign: "center", pointerEvents: "none",
                }}>
                  <div style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 140, fontWeight: 700, lineHeight: 1,
                    color: "rgba(255,255,255,0.92)",
                    textShadow: "0 0 60px rgba(80,180,255,0.35)",
                  }}>
                    {fsLetter}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8,
                  }}>
                    fingerspelling
                  </div>
                </div>
              )}

              {/* Prediction gloss overlay */}
              {modelMode === "signs" && (
                <PredictionOverlay onShowCanonical={handleShowCanonical} />
              )}

              {/* Live top-k readout */}
              {status === "live" && modelMode === "signs" && (candidate || prediction) && (() => {
                const topk   = (candidate ?? prediction)!.top_k;
                const isLive = !!candidate;
                return (
                  <div style={{
                    position: "absolute", top: 60, right: 14, zIndex: 10,
                    background: "rgba(4,8,18,0.82)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: "8px 12px",
                    backdropFilter: "blur(6px)",
                    pointerEvents: "none", minWidth: 160,
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 9, letterSpacing: "0.08em", marginBottom: 6,
                      color: isLive ? "rgba(62,168,159,0.7)" : "rgba(255,255,255,0.2)",
                    }}>
                      {isLive ? "live · top-5" : "last · top-5"}
                    </div>
                    {topk.slice(0, 5).map((entry, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: i < 4 ? 4 : 0,
                      }}>
                        <span style={{
                          fontFamily: "var(--font-mono, monospace)", fontSize: 10,
                          color: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.gloss.toLowerCase().replace(/_/g, " ")}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-mono, monospace)", fontSize: 10,
                          color: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                          minWidth: 32, textAlign: "right",
                        }}>
                          {Math.round(entry.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Signs-mode visualisation layer */}
              {modelMode === "signs" && <AttentionStrip />}
              {status === "live" && modelMode === "signs" && <PhonologicalSpectrogram />}
              {status === "live" && modelMode === "signs" && <PhonologyArcs />}
              {status === "live" && modelMode === "signs" && <SignDetonation />}

              {/* Status overlays */}
              {status === "idle"    && <CenteredMessage>Requesting camera…</CenteredMessage>}
              {status === "loading" && <CenteredMessage>Loading MediaPipe…</CenteredMessage>}
              {status === "error"   && (
                <CenteredMessage accent>
                  Camera access required.
                  <br />
                  <small style={{ fontSize: 11, color: "var(--ink4)" }}>
                    Allow camera permission and refresh.
                  </small>
                </CenteredMessage>
              )}
              {status === "paused" && (
                <CenteredMessage muted>Paused — press Space to resume</CenteredMessage>
              )}
              {status === "live" && !hasHands && (
                <CenteredMessage muted>Show your hand to begin.</CenteredMessage>
              )}

              {process.env.NODE_ENV === "development" && status === "live" && (
                <div style={{
                  position: "absolute", bottom: 22, right: 12,
                  fontFamily: "var(--font-mono, monospace)", fontSize: 10,
                  color: "rgba(255,255,255,0.75)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  zIndex: 5,
                }}>
                  {hasHands
                    ? `L=${landmarks?.left_hand ? "✓" : "–"} R=${landmarks?.right_hand ? "✓" : "–"}`
                    : "no hands"}
                  {landmarks?.pose ? "  pose ✓" : ""}
                </div>
              )}
            </div>
          )}

          {/* ── Sidebar ─────────────────────────────────────────── */}
          {mode === "recognize" && !isCinema && (
            <div className="app-sidebar">
              <div className="sidebar-section">
                <span className="section-header">Phonological Features</span>
                <PhonologyBars />
              </div>

              <div className="sidebar-section">
                <span className="section-header">Codebook Activations</span>
                <CodebookGrid />
              </div>

              <div className="sidebar-section">
                <span className="section-header">Minimal Pair</span>
                <MinimalPairPanel onViewGeodesic={handleViewGeodesic} />
              </div>

              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                padding: "8px 12px", borderTop: "1px solid var(--rule)",
                marginTop: "auto",
              }}>
                {([["F", "cinema"], ["C", "clear"], ["Space", "pause"]] as const).map(([key, label]) => (
                  <span key={key} style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 9, color: "var(--ink5)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <kbd style={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--rule)",
                      borderRadius: 3, padding: "1px 5px",
                      fontSize: 9, color: "var(--ink4)",
                    }}>{key}</kbd>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>

        <TranscriptStrip />
      </div>

      {/* Cinema exit button */}
      {isCinema && (
        <button
          onClick={toggleCinema}
          title="Exit full screen (F)"
          style={{
            position: "fixed", top: 10, right: 12, zIndex: 150,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32,
            background: "rgba(4,8,18,0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 7, cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "rgba(255,255,255,0.95)";
            e.currentTarget.style.background = "rgba(4,8,18,0.8)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
            e.currentTarget.style.background = "rgba(4,8,18,0.55)";
          }}
        >
          <ExitFullscreenIcon />
        </button>
      )}
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────

function ExitFullscreenIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function CenteredMessage({
  children, muted, accent,
}: { children: React.ReactNode; muted?: boolean; accent?: boolean }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2, textAlign: "center",
    }}>
      <p style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 14,
        color: accent ? "var(--coral)" : muted ? "var(--ink4)" : "var(--ink3)",
        lineHeight: 1.6,
      }}>
        {children}
      </p>
    </div>
  );
}
