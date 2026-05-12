"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { KaTeX } from "./KaTeX";

interface Step {
  version: string;
  label: string;
  added: string;
  addedColor: string;
  formula: string;
  why: string;
  impact: string;
}

const STEPS: Step[] = [
  {
    version: "v0",
    label: "Stokoe (1960)",
    added: "H L O M",
    addedColor: "var(--ink3)",
    formula: String.raw`s = (H,\; L,\; O,\; M)`,
    why: "William Stokoe's original four-parameter description of ASL signs — the founding result of sign language linguistics.",
    impact: "Established that signed languages have internal phonological structure analogous to spoken language. No grading capability yet.",
  },
  {
    version: "v1",
    label: "Non-Manual Markers",
    added: "+ N",
    addedColor: "var(--lav)",
    formula: String.raw`s = (H,\; L,\; O,\; M,\; N) \;\in\; \Sigma`,
    why: "Facial grammar carries grammatical weight in ASL — yes/no questions, wh-questions, negation, and intensity are all distinguished by N. Extracted from MediaPipe's 468-point face mesh.",
    impact: "Completes the basic phonological alphabet Σ. The web demo operates at this level — f_t ∈ ℝ⁵¹ is the 5-component feature vector.",
  },
  {
    version: "v2",
    label: "Bimanual Split",
    added: "H → H^d + H^n",
    addedColor: "var(--coral)",
    formula: String.raw`s = (H^d,\; H^n,\; L,\; O,\; M,\; N), \quad H^n \in \Sigma_H \cup \{\emptyset\}`,
    why: "The single H parameter collapses dominant and non-dominant handshapes into one value, making MOTHER and FATHER indistinguishable. Splitting into H^d and H^n correctly models two-handed signs.",
    impact: "∅ for one-handed signs preserves backward compatibility. Bimanual vocabulary is now representable.",
  },
  {
    version: "v3",
    label: "Battison Dominance Constraint",
    added: "H^n ∈ Σ₀",
    addedColor: "var(--teal)",
    formula: String.raw`H^n \in \Sigma_0,\quad |\Sigma_H|(1+|\Sigma_0|) = 315 \;\ll\; |\Sigma_H|^2 = 1225`,
    why: "Battison (1978) showed empirically that in every attested asymmetric bimanual sign, the non-dominant hand uses only one of 8 unmarked base handshapes. This is a hard linguistic constraint, not a statistical tendency.",
    impact: "4× reduction in the bimanual sign space. Nearest-prototype handshape search runs over 315 pairs instead of 1,225 — no ML required for this elimination.",
  },
  {
    version: "v4",
    label: "Contact Flag",
    added: "+ κ",
    addedColor: "var(--mint)",
    formula: String.raw`\kappa_t = \mathbf{1}\!\left[\|c_t^d - c_t^n\|_2 \leq 0.15\right], \quad \kappa = \left\lceil \frac{1}{T}\textstyle\sum_t \kappa_t \geq 0.3 \right\rceil`,
    why: "Many minimal pairs differ only in whether the hands touch — MOTHER vs. FATHER, WITH vs. WITHOUT. H and L alone cannot distinguish them. A vote-thresholded contact flag over the full sign window is more robust than any single frame.",
    impact: "One additional boolean check. δ_contact = 0.15 shoulder-widths is calibrated above MediaPipe localization noise (σ ≈ 0.02 sw).",
  },
  {
    version: "v5",
    label: "Handshape Change Record",
    added: "+ Δ_H",
    addedColor: "var(--sky)",
    formula: String.raw`\Delta_H = \mathrm{RLE}(q^H) = \bigl(h_1^{\times r_1},\; h_2^{\times r_2},\; \ldots\bigr), \quad h_i \in \Sigma_H`,
    why: "Signs like BECOME, FLOWER, and DREAM involve a handshape change mid-sign. A static nearest-prototype check on the final frame misses this entirely. Run-length encoding of the quantized handshape sequence captures the trajectory.",
    impact: "|Δ_H| = 1 is constant, = 2 is a single change, ≥ 3 is complex. The grading check compares trajectory length and — for |Δ_H*| = 2 — the direction of the transition.",
  },
  {
    version: "v6",
    label: "Movement Decomposition",
    added: "M → M_path + M_manner",
    addedColor: "var(--mint)",
    formula: String.raw`M_{\mathrm{path}} \in \{\mathrm{str},\mathrm{arc},\mathrm{circ},\mathrm{rep}\}, \quad M_{\mathrm{manner}} \in \{\mathrm{smo},\mathrm{tri},\mathrm{hld}\}`,
    why: "A single M parameter cannot distinguish a circular motion from a straight one, or a trilled movement from a smooth arc. Decomposing into geometric path shape and qualitative velocity profile enables deterministic boolean checks on each.",
    impact: "Two independent boolean checks replace one underspecified parameter. Path shape is a deterministic predicate on the trajectory γ; manner is a peak-count on the velocity profile. No ML.",
  },
  {
    version: "Σ_B",
    label: "Extended Bimanual Alphabet",
    added: "Final 9-tuple",
    addedColor: "var(--coral)",
    formula: String.raw`B = \bigl(H^d,\; H^n,\; \kappa,\; \Delta_H,\; L,\; O,\; M_{\mathrm{path}},\; M_{\mathrm{manner}},\; N\bigr) \;\in\; \Sigma_B`,
    why: "Every component added through v0–v6 is now a first-class parameter in the sign description. The full 9-tuple is stored per sign as a JSON B-tuple in the curriculum database.",
    impact: "8 independent boolean grading checks. Phonological Hamming distance d_phon ∈ {0,…,8} identifies exactly which parameter(s) need correction — enabling feedback like \"Handshape correct. Location needs to be at chin, not forehead.\"",
  },
];

const GRADING_FORMULA = String.raw`\mathrm{correct}(B^*) = C_{H^d} \wedge C_{H^n} \wedge C_\kappa \wedge C_{\Delta_H} \wedge C_L \wedge C_O \wedge C_{M_{\mathrm{path}}} \wedge C_{M_{\mathrm{manner}}}`;
const HAMMING_FORMULA = String.raw`d_{\mathrm{phon}}(s,s') = \#\{J : \hat{J}(s) \neq J^*(s')\} \in \{0,\ldots,8\}`;

export function EvolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.05 });

  return (
    <section
      id="evolution"
      ref={ref}
      style={{
        padding: "96px 40px",
        borderTop: "1px solid var(--rule)",
        background: "var(--bg-base)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}
        >
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}>§ 05</span>
          <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(28px, 4vw, 42px)",
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          From HLOM to Σ<sub style={{ fontSize: "0.6em" }}>B</sub>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--ink3)",
            maxWidth: 620,
            marginBottom: 64,
          }}
        >
          The phonological alphabet grew through seven iterations — each step driven by a
          concrete failure to distinguish real minimal pairs, and each step adding exactly
          one grading check. The final 9-tuple enables deterministic phonological feedback
          with no ML required for any grading component.
        </motion.p>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical connector line */}
          <div style={{
            position: "absolute",
            left: 19,
            top: 32,
            bottom: 32,
            width: 1,
            background: "var(--rule)",
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.version}
                initial={{ opacity: 0, x: -12 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.55,
                  delay: 0.15 + i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr",
                  gap: 20,
                  paddingBottom: 20,
                }}
              >
                {/* Dot */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 14,
                  zIndex: 1,
                }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: step.addedColor,
                    border: "2px solid var(--bg-base)",
                    flexShrink: 0,
                  }} />
                </div>

                {/* Card */}
                <div style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  {/* Card header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--rule)",
                    background: "var(--bg-raised)",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: "var(--ink4)",
                      textTransform: "uppercase",
                      minWidth: 24,
                    }}>
                      {step.version}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink2)",
                      flex: 1,
                    }}>
                      {step.label}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: step.addedColor,
                      background: `color-mix(in srgb, ${step.addedColor} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${step.addedColor} 30%, transparent)`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      whiteSpace: "nowrap",
                    }}>
                      {step.added}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0,
                  }}>
                    {/* Formula */}
                    <div style={{
                      padding: "14px 16px",
                      borderRight: "1px solid var(--rule)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}>
                      <div style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--rule)",
                        borderRadius: 5,
                        padding: "10px 14px",
                        overflowX: "auto",
                        fontSize: 13,
                      }}>
                        <KaTeX math={step.formula} display />
                      </div>
                    </div>

                    {/* Text */}
                    <div style={{
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      justifyContent: "center",
                    }}>
                      <p style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        lineHeight: 1.65,
                        color: "var(--ink3)",
                        margin: 0,
                      }}>
                        {step.why}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        lineHeight: 1.6,
                        color: "var(--ink4)",
                        margin: 0,
                        paddingTop: 4,
                        borderTop: "1px solid var(--rule)",
                      }}>
                        {step.impact}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Grading result callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 + STEPS.length * 0.07, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 12,
            marginLeft: 60,
            background: "var(--bg-surface)",
            border: "1px solid var(--rule)",
            borderLeft: "3px solid var(--teal)",
            borderRadius: 8,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}>
            Grading result
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              background: "var(--bg-base)",
              border: "1px solid var(--rule)",
              borderRadius: 5,
              padding: "10px 14px",
              overflowX: "auto",
              fontSize: 13,
            }}>
              <KaTeX math={GRADING_FORMULA} display />
            </div>
            <div style={{
              background: "var(--bg-base)",
              border: "1px solid var(--rule)",
              borderRadius: 5,
              padding: "10px 14px",
              overflowX: "auto",
              fontSize: 13,
            }}>
              <KaTeX math={HAMMING_FORMULA} display />
            </div>
          </div>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.65,
            color: "var(--ink3)",
            margin: 0,
          }}>
            Each iteration of the alphabet added exactly one grading check. The full
            8-check conjunction runs in under 1 ms — all arithmetic, no inference.
            The Hamming distance tells the learner which parameter failed, not just
            whether they passed.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
