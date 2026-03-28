"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PhonologyMiniViz } from "./PhonologyMiniViz";

const PARAMS = [
  {
    symbol: "H",
    name: "Handshape",
    dims: 16,
    color: "var(--coral)",
    description:
      "5 finger flexion angles + 3 abduction angles, per hand. Encodes the configuration of fingers — straight, curled, spread.",
    formula: "\\theta_{k,t} = \\angle(\\text{MCP}_k \\to w,\\, \\text{TIP}_k \\to \\text{MCP}_k)",
    examples: ["A", "B", "C", "5"],
  },
  {
    symbol: "L",
    name: "Location",
    dims: 6,
    color: "var(--teal)",
    description:
      "Palm centre position in Sim(3)-normalized body space. Captures where the hand is relative to the signer's torso.",
    formula: "c_t = \\tfrac{1}{5}\\sum_{j \\in \\{0,5,9,13,17\\}} \\tilde{p}_{j,t}",
    examples: ["chin", "chest", "forehead", "neutral"],
  },
  {
    symbol: "O",
    name: "Orientation",
    dims: 6,
    color: "var(--sky)",
    description:
      "Unit palm normal vector, encoding which direction the palm faces. Distinguishes signs that differ only in hand facing.",
    formula: "\\hat{n}_t = \\frac{(p_5 - p_0) \\times (p_{17} - p_0)}{\\|(p_5 - p_0) \\times (p_{17} - p_0)\\|}",
    examples: ["palm-in", "palm-out", "palm-up", "palm-down"],
  },
  {
    symbol: "M",
    name: "Movement",
    dims: 18,
    color: "var(--mint)",
    description:
      "Velocity + acceleration of palm centre, plus orientation velocity. The dynamic signature of a sign's motion path.",
    formula: "u^M_t = [\\Delta c_t,\\; \\Delta^2 c_t,\\; \\Delta \\hat{n}_t] \\in \\mathbb{R}^9",
    examples: ["arc", "straight", "circular", "repeated"],
  },
  {
    symbol: "N",
    name: "Non-Manual",
    dims: 5,
    color: "var(--lav)",
    description:
      "Gaze axis, mouth aperture, and brow height extracted from the 468-point face mesh. Encodes grammatical facial markers.",
    formula: "u^N_t = [\\text{gaze}(3),\\; \\text{mouth}(1),\\; \\text{brow}(1)]",
    examples: ["yes/no question", "wh-question", "negation", "intensity"],
  },
];

export function PhonologyCards() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="parameters" ref={ref} className="section-pad" style={{
      padding: "96px 40px",
      borderTop: "1px solid var(--rule)",
      background: "var(--bg-surface)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}
        >
          <span style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}>§ 02</span>
          <div style={{ flex: 1, height: "1px", background: "var(--rule)" }} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
            fontStyle: "italic",
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          Five Simultaneous Parameters
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--ink3)",
            maxWidth: 620,
            marginBottom: 52,
          }}
        >
          Every ASL sign is described by the same five parameters that linguists have used
          since Stokoe (1960). Each frame produces{" "}
          <span style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 13,
            color: "var(--ink)",
          }}>
            f_t ∈ ℝ⁵¹
          </span>{" "}
          — a geometric fingerprint that is invariant to your distance, position, and
          rotation relative to the camera.
        </motion.p>

        {/* The s = (H, L, O, M, N) notation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "10px 20px",
            background: "var(--bg-raised)",
            border: "1px solid var(--rule)",
            borderRadius: 7,
            marginBottom: 40,
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 14,
            color: "var(--ink2)",
            letterSpacing: "0.04em",
          }}
        >
          <span>s = (</span>
          {["H", "L", "O", "M", "N"].map((p, i) => (
            <span key={p}>
              <span style={{ color: PARAMS[i].color, fontWeight: 500 }}>{p}</span>
              {i < 4 && <span style={{ color: "var(--ink4)" }}>, </span>}
            </span>
          ))}
          <span>)</span>
          <span style={{ color: "var(--ink4)", marginLeft: 8 }}>· 51 dims total</span>
        </motion.div>

        {/* Parameter cards */}
        <div className="phonology-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}>
          {PARAMS.map((param, i) => (
            <motion.div
              key={param.symbol}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.2 + i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--rule)",
                borderTop: `3px solid ${param.color}`,
                borderRadius: 8,
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Symbol + dims */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: 40,
                  fontWeight: 400,
                  lineHeight: 1,
                  color: param.color,
                }}>
                  {param.symbol}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 10,
                  color: "var(--ink4)",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  padding: "2px 7px",
                  letterSpacing: "0.04em",
                }}>
                  {param.dims}D
                </span>
              </div>

              {/* Name */}
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}>
                {param.name}
              </span>

              {/* Description */}
              <p style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                lineHeight: 1.6,
                color: "var(--ink3)",
                margin: 0,
                flexGrow: 1,
              }}>
                {param.description}
              </p>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--rule)" }} />

              {/* Examples */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {param.examples.map(ex => (
                  <span key={ex} style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 9,
                    color: param.color,
                    background: `color-mix(in srgb, ${param.color} 8%, var(--bg-base))`,
                    border: `1px solid color-mix(in srgb, ${param.color} 20%, var(--rule))`,
                    borderRadius: 3,
                    padding: "2px 6px",
                  }}>
                    {ex}
                  </span>
                ))}
              </div>

              {/* Animated mini-visualization */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 6,
                opacity: 0.88,
              }}>
                <PhonologyMiniViz symbol={param.symbol} color={param.color} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
