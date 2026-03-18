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
import { SignSpaceGalaxy } from "@/components/SignSpaceGalaxy";
import { MinimalPairPanel } from "@/components/MinimalPairPanel";
import { CodebookGrid } from "@/components/CodebookGrid";
import { FeatureWaterfall } from "@/components/FeatureWaterfall";
import { PhonologicalAvatar } from "@/components/PhonologicalAvatar";
import { GeodesicInterpolator } from "@/components/GeodesicInterpolator";
import { AttentionStrip } from "@/components/AttentionStrip";
import { useInference } from "@/hooks/useInference";
import { TheoryPanel } from "@/components/TheoryPanel";
import VOCAB_DATA from "@/public/data/vocab.json";

const VOCAB_GLOSSES = Object.values(VOCAB_DATA.id_to_gloss) as string[];

type SidebarTab = "live" | "analysis" | "theory";
type AppMode = "recognize" | "generate" | "geodesic";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [tab, setTab]         = useState<SidebarTab>("live");
  const [isCinema, setIsCinema] = useState(false);
  const [mode, setMode]       = useState<AppMode>("recognize");
  const [canonicalGloss, setCanonicalGloss] = useState<string | null>(null);
  const [videoMain, setVideoMain] = useState(false);
  const [geodesicPair, setGeodesicPair] = useState<{ a: string; b: string } | null>(null);
  const [autoGeo, setAutoGeo]           = useState<{ a: string; b: string } | null>(null);
  const prevPredRef      = useRef<string | null>(null);
  const autoGeoTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useMediaPipe({ videoRef });
  useInference();

  const status         = useAppStore((s) => s.status);
  const landmarks      = useAppStore((s) => s.landmarks);
  const clearTranscript = useAppStore((s) => s.clearTranscript);
  const setStatus      = useAppStore((s) => s.setStatus);
  const prediction     = useAppStore((s) => s.prediction);

  // ── Auto-geodesic: fires on every new committed prediction pair ──
  useEffect(() => {
    if (!prediction) return;
    const prev = prevPredRef.current;
    prevPredRef.current = prediction.gloss;
    if (!prev || prev === prediction.gloss) return;

    if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
    setAutoGeo({ a: prev, b: prediction.gloss });
    autoGeoTimerRef.current = setTimeout(() => setAutoGeo(null), 6000);
  }, [prediction]);

  useEffect(() => () => {
    if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
  }, []);

  const hasHands = landmarks?.left_hand != null || landmarks?.right_hand != null;

  // ── Keyboard shortcuts ──────────────────────────────────────────
  const toggleCinema = useCallback(() => {
    setIsCinema((prev) => {
      const next = !prev;
      if (next) {
        shellRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      }
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

  // Sync cinema state if user exits fullscreen via Escape
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setIsCinema(false);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <>
      {/* Mobile banner */}
      <MobileBanner />

      <div ref={shellRef} className="app-shell" data-cinema={isCinema || undefined}>
        {!isCinema && (
          <AppHeader
            mode={mode}
            onModeChange={handleModeChange}
          />
        )}

        <main className="app-main" style={
          isCinema || mode === "generate" || mode === "geodesic"
            ? { gridTemplateColumns: "1fr" }
            : undefined
        }>
          {/* ── Generate mode: full-area avatar ─────────────────── */}
          {mode === "generate" && (
            <div className="app-scene" style={{ overflow: "hidden" }}>
              <PhonologicalAvatar jumpGloss={canonicalGloss} />
            </div>
          )}

          {/* ── Geodesic mode: phonological manifold navigation ──── */}
          {mode === "geodesic" && (
            <div className="app-scene" style={{ overflow: "hidden" }}>
              <GeodesicInterpolator
                key={geodesicPair ? `${geodesicPair.a}__${geodesicPair.b}` : "default"}
                initialGlossA={geodesicPair?.a}
                initialGlossB={geodesicPair?.b}
              />
            </div>
          )}

          {/* Hidden video element — always mounted so videoRef stays valid across mode switches */}
          <video ref={videoRef} playsInline muted style={{ display: "none" }} />

          {/* ── Recognize mode: left scene ───────────────────────── */}
          {mode === "recognize" && (
          <div className="app-scene">

            {/* ── Main scene ──────────────────────────────────── */}
            {status === "live" && !videoMain && <HandScene3D />}
            {status === "live" &&  videoMain && (
              <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
                <HandCanvas2D videoRef={videoRef} mirror />
              </div>
            )}

            {/* ── PIP (swaps on click) ─────────────────────────── */}
            {status === "live" && (
              <div
                onClick={() => setVideoMain((v) => !v)}
                title="Click to swap views"
                style={{
                  position: "absolute",
                  bottom: 14,
                  right: 14,
                  width: 192,
                  height: 144,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
                  zIndex: 6,
                  cursor: "pointer",
                }}
              >
                {videoMain
                  ? <HandScene3D />
                  : <HandCanvas2D videoRef={videoRef} mirror />}
              </div>
            )}

            <PredictionOverlay onShowCanonical={handleShowCanonical} />
            <AttentionStrip />

            {status === "idle" && (
              <CenteredMessage>Requesting camera…</CenteredMessage>
            )}
            {status === "loading" && (
              <CenteredMessage>Loading MediaPipe…</CenteredMessage>
            )}
            {status === "error" && (
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

            {/* Cinema hint */}
            {isCinema && (
              <div style={{
                position: "absolute", top: 10, right: 12, zIndex: 10,
                fontFamily: "var(--font-mono, monospace)", fontSize: 9,
                color: "var(--ink5)",
              }}>
                F · exit cinema
              </div>
            )}

            {/* Dev indicator */}
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
          )} {/* end recognize mode */}

          {/* ── Right: sidebar (hidden in cinema + generate mode) ── */}
          {mode === "recognize" && !isCinema && (
            <div className="app-sidebar">
              {/* Tab switcher */}
              <div style={{
                display: "flex",
                borderBottom: "1px solid var(--rule)",
                marginBottom: 4,
                gap: 0,
                flexShrink: 0,
              }}>
                <TabButton active={tab === "live"}     onClick={() => setTab("live")}>Live</TabButton>
                <TabButton active={tab === "analysis"} onClick={() => setTab("analysis")}>Analysis</TabButton>
                <TabButton active={tab === "theory"}   onClick={() => setTab("theory")}>Theory</TabButton>
              </div>

              {tab === "live" && (
                <>
                  <div className="sidebar-section">
                    <span className="section-header">Phonological Features</span>
                    <div style={{
                      borderLeft: "2px solid var(--teal)", paddingLeft: 10,
                      display: "flex", flexDirection: "column", gap: 3,
                    }}>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}>
                        s = (H, L, O, M, N)
                      </span>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "var(--ink4)" }}>
                        f_t ∈ ℝ⁵¹ per frame
                      </span>
                      <span style={{ fontFamily: "var(--font-ui, sans-serif)", fontSize: 10, color: "var(--ink3)", lineHeight: 1.5 }}>
                        Five simultaneous parameters extracted from hand landmarks each frame.
                      </span>
                    </div>
                    <PhonologyBars />
                  </div>

                  <div className="sidebar-section">
                    <span className="section-header">Sign Space</span>
                    <SignSpaceGalaxy />
                  </div>

                  <div className="sidebar-section">
                    <span className="section-header">Minimal Pair</span>
                    <MinimalPairPanel onViewGeodesic={handleViewGeodesic} />
                  </div>

                  <div className="sidebar-section">
                    <span className="section-header">Codebook Activations</span>
                    <CodebookGrid />
                  </div>

                  <div className="sidebar-section">
                    <span className="section-header">Vocabulary · {VOCAB_GLOSSES.length} signs</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {VOCAB_GLOSSES.map((gloss) => (
                        <span
                          key={gloss}
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 9,
                            color: "var(--ink4)",
                            background: "var(--bg-raised)",
                            border: "1px solid var(--rule)",
                            borderRadius: 3,
                            padding: "2px 5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {gloss.toLowerCase().replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {tab === "theory" && (
                <div className="sidebar-section" style={{ borderTop: "none", paddingTop: 0 }}>
                  <span className="section-header">Mathematical Framework · Paper Sections</span>
                  <TheoryPanel />
                </div>
              )}

              {tab === "analysis" && (
                <div className="sidebar-section" style={{ borderTop: "none", paddingTop: 0 }}>
                  <span className="section-header">Feature Waterfall · f_t ∈ ℝ⁵¹</span>
                  <p style={{
                    fontFamily: "var(--font-ui, sans-serif)",
                    fontSize: 11, lineHeight: 1.5,
                    color: "var(--ink3)", margin: "4px 0 8px",
                  }}>
                    Real-time phonological fingerprint of each frame. Each row is one feature
                    dimension — <span style={{ color: "var(--coral)" }}>H</span> handshape,{" "}
                    <span style={{ color: "var(--teal)" }}>L</span> location,{" "}
                    <span style={{ color: "var(--sky)" }}>O</span> orientation,{" "}
                    <span style={{ color: "var(--mint)" }}>M</span> movement,{" "}
                    <span style={{ color: "var(--lav)" }}>N</span> non-manual.
                    Color intensity = activation magnitude.
                  </p>
                  <FeatureWaterfall />

                  {/* Keyboard hint */}
                  <div style={{
                    display: "flex", gap: 12, flexWrap: "wrap",
                    paddingTop: 8, borderTop: "1px solid var(--rule)",
                    marginTop: 4,
                  }}>
                    {[
                      ["F", "cinema"],
                      ["C", "clear"],
                      ["Space", "pause"],
                    ].map(([key, label]) => (
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
            </div>
          )}
        </main>

        <TranscriptStrip />
      </div>

      {/* ── Auto-geodesic overlay ─────────────────────────────────── */}
      {autoGeo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "var(--bg-base)",
          display: "flex", flexDirection: "column",
          animation: "autoGeoFadeIn 0.22s ease forwards",
        }}>
          <style>{`
            @keyframes autoGeoFadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes autoGeoDrain  { from { width: 100% } to { width: 0% } }
          `}</style>

          {/* Top label */}
          <div style={{
            position: "absolute", top: 10, left: 14, zIndex: 5,
            fontFamily: "var(--font-mono, monospace)", fontSize: 9,
            color: "var(--ink5)", letterSpacing: "0.08em",
            display: "flex", alignItems: "center", gap: 8,
            pointerEvents: "none",
          }}>
            <span style={{ color: "var(--teal)" }}>auto-geodesic</span>
            <span style={{ color: "var(--ink3)" }}>
              {autoGeo.a.toLowerCase().replace(/_/g, " ")}
            </span>
            <span>→</span>
            <span style={{ color: "var(--ink3)" }}>
              {autoGeo.b.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => {
              setAutoGeo(null);
              if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
            }}
            style={{
              position: "absolute", top: 8, right: 12, zIndex: 5,
              fontFamily: "var(--font-mono, monospace)", fontSize: 9,
              letterSpacing: "0.06em",
              background: "var(--bg-raised)", border: "1px solid var(--rule)",
              borderRadius: 3, color: "var(--ink4)",
              padding: "2px 10px", cursor: "pointer",
            }}
          >
            esc
          </button>

          {/* Geodesic fills remaining space */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <GeodesicInterpolator
              key={`auto_${autoGeo.a}__${autoGeo.b}`}
              initialGlossA={autoGeo.a}
              initialGlossB={autoGeo.b}
            />
          </div>

          {/* Countdown drain bar */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, height: 2,
            background: "var(--teal)",
            animation: "autoGeoDrain 6000ms linear forwards",
          }} />
        </div>
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function TabButton({
  children, active, onClick,
}: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 0",
        border: "none",
        borderBottom: active ? "2px solid var(--teal)" : "2px solid transparent",
        background: "none",
        cursor: "pointer",
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: active ? "var(--teal)" : "var(--ink4)",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

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

function MobileBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.innerWidth < 768);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "var(--bg-base)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, padding: 32, textAlign: "center",
    }}>
      <span style={{ fontSize: 32 }}>🖥</span>
      <p style={{
        fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
        fontStyle: "italic", fontSize: 22, color: "var(--ink)",
      }}>
        Best on desktop
      </p>
      <p style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 13, color: "var(--ink3)", maxWidth: 280,
      }}>
        ASL MathViz uses your webcam and a 3D scene that works best on a laptop or desktop browser.
      </p>
      <button
        onClick={() => setVisible(false)}
        style={{
          marginTop: 8, padding: "8px 20px",
          background: "var(--bg-raised)", border: "1px solid var(--rule)",
          borderRadius: 6, cursor: "pointer",
          fontFamily: "var(--font-ui, Figtree, sans-serif)",
          fontSize: 12, color: "var(--ink3)",
        }}
      >
        Continue anyway
      </button>
    </div>
  );
}
