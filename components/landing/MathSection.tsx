"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { KaTeX } from "./KaTeX";

const FORMULAS = [
  {
    label: "Battison Dominance Constraint",
    section: "§ 1",
    formula: "|\\Sigma_H|(1 + |\\Sigma_0|) = 35 \\times 9 = 315 \\;\\ll\\; |\\Sigma_H|^2 = 1225",
    explanation:
      "In any attested asymmetric bimanual ASL sign, the non-dominant hand uses only one of 8 unmarked base handshapes — a constraint proved by Battison (1978) from corpus analysis of the full ASL lexicon. This reduces the space of possible handshape pairs by 4×, from 1,225 to 315. The grading pipeline exploits this directly: impossible combinations are eliminated without ML, and the nearest-prototype search runs over a 4× smaller space.",
    terms: [
      { sym: "\\Sigma_0 = \\{B,\\, A,\\, S,\\, C,\\, O,\\, 5,\\, G,\\, \\ldots\\}", desc: "8 unmarked base handshapes" },
      { sym: "|\\Sigma_H| = 35", desc: "total handshape inventory" },
      { sym: "315", desc: "attested asymmetric bimanual pairs" },
      { sym: "1225", desc: "naive unconstrained count (\\(35^2\\))" },
    ],
  },
  {
    label: "IMU Pre-Rotation",
    section: "§ 2",
    formula: "R_t^{\\mathrm{imu}} = I + [\\mathbf{v}]_\\times + [\\mathbf{v}]_\\times^2 \\cdot \\tfrac{1}{1+c}, \\quad \\mathbf{v} = \\mathbf{g}_t^{\\mathrm{dev}} \\times \\hat{y}",
    explanation:
      "Before any feature is computed, camera pitch and roll are removed using the phone accelerometer's gravity vector. A single axis-angle rotation aligns the device gravity direction with the world down-axis, correcting the dominant source of landmark distortion in mobile capture. The corrected landmarks feed directly into Sim(3) normalization — at zero added latency, since accelerometer data is always available.",
    terms: [
      { sym: "\\mathbf{g}_t^{\\mathrm{dev}}", desc: "unit gravity vector from phone accelerometer" },
      { sym: "\\hat{y} = (0,-1,0)^\\top", desc: "world down-axis" },
      { sym: "c = \\mathbf{g}_t^{\\mathrm{dev}} \\cdot \\hat{y}", desc: "cosine of camera tilt angle" },
      { sym: "[\\mathbf{v}]_\\times", desc: "skew-symmetric cross-product matrix of rotation axis" },
    ],
  },
  {
    label: "Sim(3) Normalization",
    section: "§ 2",
    formula: "\\tilde{Y}_t = \\frac{(X_t - T_t)\\, R_t^\\top}{s_t}",
    explanation:
      "Every landmark frame is translated to the shoulder midpoint, scaled by shoulder width, and rotated to cancel yaw. The result is invariant to where the signer stands, how far they are from the camera, and which direction they face.",
    terms: [
      { sym: "X_t \\in \\mathbb{R}^{543 \\times 3}", desc: "raw MediaPipe landmarks" },
      { sym: "T_t", desc: "shoulder midpoint (translation)" },
      { sym: "s_t = \\|B[\\text{RS}] - B[\\text{LS}]\\|_2", desc: "bi-shoulder width (scale)" },
      { sym: "R_t", desc: "yaw-only rotation matrix" },
    ],
  },
  {
    label: "Product Vector Quantization",
    section: "§ 4",
    formula: "\\hat{u}^J_t = \\underset{c_k \\in \\mathcal{C}^J}{\\arg\\min}\\; \\|u^J_t - c_k\\|_2",
    explanation:
      "Each phonological sub-vector is quantized independently to its own codebook. Five separate codebooks replace one enormous joint codebook — exponentially fewer codes needed, while preserving the compositional structure of ASL phonology.",
    terms: [
      { sym: "J \\in \\{H,L,O,M,N\\}", desc: "phonological parameter" },
      { sym: "\\mathcal{C}^J", desc: "parameter-specific codebook" },
      { sym: "|\\mathcal{C}^H| = 64,\\; |\\mathcal{C}^M| = 64", desc: "handshape & movement codebooks" },
      { sym: "|\\mathcal{C}^L| = |\\mathcal{C}^N| = 32,\\; |\\mathcal{C}^O| = 16", desc: "location, non-manual & orientation" },
    ],
  },
  {
    label: "Feature Vector",
    section: "§ 5",
    formula: "f_t = [u^H_t;\\; u^L_t;\\; u^O_t;\\; u^M_t;\\; u^N_t] \\;\\in\\; \\mathbb{R}^{51}",
    explanation:
      "The 51-dimensional phonological fingerprint of a single frame. Each component is geometrically grounded — angles, unit vectors, and finite differences — so the vector carries interpretable structure that end-to-end models discard.",
    terms: [
      { sym: "u^H \\in \\mathbb{R}^{16}", desc: "handshape: 8 angles per hand" },
      { sym: "u^L \\in \\mathbb{R}^{6}", desc: "location: palm centre × 2" },
      { sym: "u^O \\in \\mathbb{R}^{6}", desc: "orientation: unit normal × 2" },
      { sym: "u^M \\in \\mathbb{R}^{18}", desc: "movement: vel + accel + ṅ × 2" },
      { sym: "u^N \\in \\mathbb{R}^{5}", desc: "non-manual: gaze, mouth, brow" },
    ],
  },
];

export function MathSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="math" ref={ref} className="section-pad" style={{
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
          }}>§ 04</span>
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
          The Mathematics
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
            maxWidth: 600,
            marginBottom: 56,
          }}
        >
          Five equations drive sign recognition. Each one maps to a concrete operation in the
          pipeline — from linguistic constraints on the sign space, through mobile camera
          correction, to the phonological feature vector the model actually sees.
          The full grading pipeline uses an extended 9-tuple alphabet —
          explored in the{" "}
          <a href="/research" style={{ color: "var(--teal)", textDecoration: "none" }}>Math Explorer</a>.
        </motion.p>

        {/* Formula cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FORMULAS.map((formula, i) => (
            <motion.div
              key={formula.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.2 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="math-formula-card"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--rule)",
                borderRadius: 10,
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              {/* Left: formula */}
              <div className="math-formula-left" style={{
                padding: "32px 36px",
                borderRight: "1px solid var(--rule)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                justifyContent: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                  }}>
                    {formula.section}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-ui, Figtree, sans-serif)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink3)",
                  }}>
                    {formula.label}
                  </span>
                </div>

                {/* The formula itself */}
                <div style={{
                  padding: "20px 24px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 7,
                  overflowX: "auto",
                  fontSize: 15,
                }}>
                  <KaTeX math={formula.formula} display />
                </div>

                {/* Terms */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {formula.terms.map(term => (
                    <div key={term.sym} style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                    }}>
                      <span style={{
                        fontFamily: "var(--font-mono, DM Mono, monospace)",
                        fontSize: 10,
                        color: "var(--ink2)",
                        flexShrink: 0,
                        minWidth: 0,
                      }}>
                        <KaTeX math={term.sym} />
                      </span>
                      <span style={{
                        fontFamily: "var(--font-ui, Figtree, sans-serif)",
                        fontSize: 10,
                        color: "var(--ink4)",
                        lineHeight: 1.5,
                      }}>
                        — {term.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: explanation */}
              <div style={{
                padding: "32px 36px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 12,
              }}>
                <p style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: "var(--ink2)",
                  margin: 0,
                }}>
                  {formula.explanation}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
