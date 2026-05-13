"use client";

import { useState } from "react";
import Link from "next/link";
import { KaTeX } from "@/components/landing/KaTeX";
import { FaceExplorer } from "@/components/research/FaceExplorer";
import { PathShapeViz } from "@/components/research/PathShapeViz";
import { BattisonGrid } from "@/components/research/BattisonGrid";
import { GradingPanel } from "@/components/research/GradingPanel";
import { LiveVerification } from "@/components/research/LiveVerification";

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  mono: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ id, mono, title, subtitle, children }: SectionProps) {
  return (
    <section id={id} style={{
      padding: "72px 40px",
      borderTop: "1px solid var(--rule)",
      maxWidth: 1100,
      margin: "0 auto",
    }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal)" }}>
            {mono}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontStyle: "italic",
          fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 400,
          color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.2,
        }}>
          {title}
        </h2>
        <p style={{
          fontFamily: "var(--font-ui)", fontSize: 14, lineHeight: 1.65,
          color: "var(--ink3)", margin: 0, maxWidth: 640,
        }}>
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Σ_B Alphabet", href: "#alphabet" },
  { label: "Non-Manual", href: "#face" },
  { label: "Battison Grid", href: "#battison" },
  { label: "Movement", href: "#movement" },
  { label: "Grading", href: "#grading" },
  { label: "Live Verify", href: "#live" },
];

// ── Σ_B parameter definitions ─────────────────────────────────────────────────

const PARAMS = [
  { sym: "H^d", name: "Dominant handshape", dim: "Σ_H",  color: "var(--coral)", tex: String.raw`H^d \in \Sigma_H`, desc: "The handshape of the primary signing hand. 35-item inventory; encoded as 16-D angle vector." },
  { sym: "H^n", name: "Non-dominant handshape", dim: "Σ_H ∪ {∅}", color: "var(--coral)", tex: String.raw`H^n \in \Sigma_H \cup \{\emptyset\}`, desc: "∅ for one-handed signs. When ≠ ∅, Battison constraint requires H^n ∈ Σ₀." },
  { sym: "κ",   name: "Contact flag",       dim: "{0,1}", color: "var(--mint)",  tex: String.raw`\kappa \in \{0,1\}`, desc: "Do the hands make contact? Vote-thresholded over T frames at δ = 0.15 shoulder-widths." },
  { sym: "Δ_H", name: "Handshape change",   dim: "Σ_H*", color: "var(--sky)",   tex: String.raw`\Delta_H \in \Sigma_H^*`, desc: "Run-length encoding of quantized handshape trajectory. |Δ_H| = 1 static, 2 single change." },
  { sym: "L",   name: "Location",           dim: "Σ_L",  color: "var(--teal)",  tex: String.raw`L \in \Sigma_L`, desc: "Dominant palm centre in Sim(3)-normalised space. 22-category inventory." },
  { sym: "O",   name: "Orientation",        dim: "Σ_O",  color: "var(--sky)",   tex: String.raw`O \in \Sigma_O`, desc: "Palm normal direction. 14-category inventory. Orientation grading uses angular tolerance εO = 20°." },
  { sym: "M_path", name: "Path shape",      dim: "{str,arc,circ,rep}", color: "var(--mint)", tex: String.raw`M_{\mathrm{path}} \in \{\mathrm{str},\mathrm{arc},\mathrm{circ},\mathrm{rep}\}`, desc: "Geometric shape of the dominant hand trajectory. Deterministic boolean predicates on γ." },
  { sym: "M_manner", name: "Movement manner", dim: "{smo,tri,hld}", color: "var(--lav)", tex: String.raw`M_{\mathrm{manner}} \in \{\mathrm{smo},\mathrm{tri},\mathrm{hld}\}`, desc: "Qualitative velocity profile. Smooth single-peak, trilled ≥3 peaks, or hold." },
  { sym: "N",   name: "Non-manual markers", dim: "Σ_N",  color: "var(--lav)",   tex: String.raw`N \in \Sigma_N`, desc: "Facial grammar: gaze (x,y,z), mouth aperture, brow height — u^N ∈ ℝ⁵ from the 468-point face mesh. No head tilt component." },
];

const B_TUPLE_TEX = String.raw`B = \bigl(H^d,\; H^n,\; \kappa,\; \Delta_H,\; L,\; O,\; M_{\mathrm{path}},\; M_{\mathrm{manner}},\; N\bigr) \;\in\; \Sigma_B`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [activeParam, setActiveParam] = useState<string | null>(null);
  const active = PARAMS.find(p => p.sym === activeParam);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Top nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px",
        background: "rgba(248,246,241,0.9)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--rule)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink4)", textDecoration: "none" }}>
            ← ASL MathViz
          </Link>
          <div style={{ width: 1, height: 16, background: "var(--rule)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Math Explorer
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_ITEMS.map(({ label, href }) => (
            <a key={href} href={href} style={{
              fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--ink4)", textDecoration: "none", padding: "6px 12px",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ink4)")}
            >
              {label}
            </a>
          ))}
          <Link href="/demo" style={{
            fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
            color: "var(--bg-base)", background: "var(--ink)", borderRadius: 6,
            padding: "7px 14px", textDecoration: "none", marginLeft: 8,
          }}>
            Live Demo →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px 0" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal)", marginBottom: 12 }}>
          Palmar · Mathematical Framework
        </p>
        <h1 style={{
          fontFamily: "var(--font-display)", fontStyle: "italic",
          fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 400,
          color: "var(--ink)", margin: "0 0 16px", lineHeight: 1.1,
        }}>
          Interactive Sign Mathematics
        </h1>
        <p style={{
          fontFamily: "var(--font-ui)", fontSize: 16, lineHeight: 1.7,
          color: "var(--ink3)", maxWidth: 600, margin: "0 0 40px",
        }}>
          Explore the formal phonological framework without a camera.
          Each section lets you manipulate parameters and see the math respond —
          from facial grammar to movement path geometry to deterministic grading.
        </p>

        {/* B-tuple overview */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--rule)",
          borderRadius: 10, padding: "20px 24px", marginBottom: 8,
          overflowX: "auto",
        }}>
          <KaTeX math={B_TUPLE_TEX} display />
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink5)", marginBottom: 0 }}>
          Click any parameter below to explore its definition.
        </p>
      </div>

      {/* §1 — Σ_B Alphabet explorer */}
      <Section
        id="alphabet"
        mono="§ 1 — Σ_B"
        title="Extended Bimanual Alphabet"
        subtitle="Each sign is a 9-tuple in Σ_B. Click any parameter chip to see its definition, formula, and grading role."
      >
        {/* Parameter chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {PARAMS.map(p => (
            <button
              key={p.sym}
              onClick={() => setActiveParam(prev => prev === p.sym ? null : p.sym)}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                padding: "6px 14px", borderRadius: 6,
                background: activeParam === p.sym ? `color-mix(in srgb, ${p.color} 15%, var(--bg-raised))` : "var(--bg-surface)",
                border: `1.5px solid ${activeParam === p.sym ? p.color : "var(--rule)"}`,
                color: activeParam === p.sym ? p.color : "var(--ink3)",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {p.sym}
            </button>
          ))}
        </div>

        {/* Active param detail */}
        {active ? (
          <div style={{
            background: `color-mix(in srgb, ${active.color} 6%, var(--bg-surface))`,
            border: `1px solid color-mix(in srgb, ${active.color} 25%, var(--rule))`,
            borderLeft: `3px solid ${active.color}`,
            borderRadius: 8, padding: "18px 22px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: active.color, fontWeight: 700 }}>{active.sym}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ink2)", marginLeft: 10 }}>{active.name}</span>
              </div>
              <div style={{ background: "var(--bg-base)", border: "1px solid var(--rule)", borderRadius: 5, padding: "10px 14px", overflowX: "auto" }}>
                <KaTeX math={active.tex} display />
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.65, margin: 0 }}>
                {active.desc}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Domain</span>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 14, color: active.color,
                background: `color-mix(in srgb, ${active.color} 10%, var(--bg-base))`,
                border: `1px solid color-mix(in srgb, ${active.color} 25%, var(--rule))`,
                borderRadius: 6, padding: "10px 14px",
              }}>
                {active.dim}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--rule)",
            borderRadius: 8, padding: "18px 22px",
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
          }}>
            {PARAMS.map(p => (
              <div key={p.sym} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: p.color }}>{p.sym}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink5)" }}>{p.dim}</span>
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink3)" }}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* §2 — Non-manual face explorer */}
      <section id="face" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--rule)" }}>
        <Section
          id="face-inner"
          mono="§ 2 — u^N ∈ ℝ⁵"
          title="Non-Manual Markers"
          subtitle="Facial grammar carries grammatical weight in ASL — questions, negation, and intensity are all signalled non-manually. Adjust the sliders to explore how gaze, mouth aperture, and brow position encode different grammatical categories."
        >
          <FaceExplorer />
        </Section>
      </section>

      {/* §3 — Battison */}
      <Section
        id="battison"
        mono="§ 3 — Σ_B constraint"
        title="Battison Dominance Constraint"
        subtitle="In every attested asymmetric bimanual sign, the non-dominant hand uses only one of 8 unmarked base handshapes (Σ₀). This reduces the bimanual search space by 4× — from 1,225 pairs to 315. Hover cells to inspect individual (H^d, H^n) pairs."
      >
        <BattisonGrid />
      </Section>

      {/* §4 — Movement */}
      <section id="movement" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--rule)" }}>
        <Section
          id="movement-inner"
          mono="§ 4 — M_path × M_manner"
          title="Movement Decomposition"
          subtitle="M is split into two orthogonal components: geometric path shape and qualitative velocity profile. Each is a deterministic boolean predicate — no ML required for movement grading. Click a path to see its formal definition and animate it."
        >
          <PathShapeViz />
        </Section>
      </section>

      {/* §5 — Grading */}
      <Section
        id="grading"
        mono="§ 5 — correct(B*)"
        title="Sign Grading Function"
        subtitle="All 8 checks run simultaneously at sign completion — under 1 ms total. Toggle individual checks to simulate a learner's attempt. The phonological Hamming distance identifies exactly which parameters need correction."
      >
        <GradingPanel />
      </Section>

      {/* §6 — Live verification */}
      <section id="live" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--rule)" }}>
        <Section
          id="live-inner"
          mono="§ 6 — Live Verification"
          title="Math Responding to Your Hands"
          subtitle="Connect your camera to see the phonological feature vectors update in real time from your actual hands and face. No sign recognition — just the MediaPipe → Sim(3) → feature extraction pipeline. The non-manual face visualization reads your actual brow, mouth, and gaze."
        >
          <LiveVerification />
        </Section>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--rule)", padding: "32px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink5)", margin: 0 }}>
          Hernandez Juarez, A. (2026). Palmar Sign Mathematics Reference v1.0.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/" style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Landing</Link>
          <Link href="/demo" style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink4)", textDecoration: "none" }}>Live Demo</Link>
        </div>
      </footer>
    </div>
  );
}
