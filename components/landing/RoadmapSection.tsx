"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { KaTeX } from "./KaTeX";

const THEORY = [
  {
    id: "morphology",
    number: "01",
    color: "var(--coral)",
    title: "Morphological Fusion",
    tag: "§ 8",
    formula: "\\sigma_1 \\otimes \\sigma_2 \\;\\neq\\; \\sigma_2 \\otimes \\sigma_1",
    formulaNote: "non-associative operator on Σ",
    description:
      "ASL morphology compounds signs non-compositionally: THINK ⊗ SELF ≠ SELF ⊗ THINK. The fusion operator ⊗ on Σ = Σ_H × Σ_L × Σ_O × Σ_M × Σ_N is non-commutative and encodes blending, reduplication, and aspect morphology — none of which fall out of a simple concatenation model.",
    steps: [
      "Define ⊗ axiomatically on the phoneme alphabet Σ",
      "Learn fusion weights from minimal pair data",
      "Extend VQ codebooks to cover morphological variants",
      "Add fusion layer between BiLSTM and WFST",
    ],
    status: "Theoretical foundation complete — implementation pending",
  },
  {
    id: "spatial",
    number: "02",
    color: "var(--teal)",
    title: "Spatial Discourse Algebra",
    tag: "§ 9",
    formula: "\\text{locus}(a) \\in S^2, \\quad \\text{agree}(v, a) \\Leftrightarrow \\text{arc}(\\text{locus}(v), \\text{locus}(a)) < \\varepsilon",
    formulaNote: "referential loci on the unit sphere",
    description:
      "In ASL, pronouns and verb agreement are encoded spatially: a nominal is assigned a locus on the signing space sphere S², and verbs move between loci to express subject–object agreement. The current pipeline has no model of discourse structure — extending it requires tracking referential loci across utterances and enforcing agreement constraints at the WFST level.",
    steps: [
      "Assign loci to nominals via S²-clustering of L parameter",
      "Build referential coherence graph across frames",
      "Add agreement constraint arcs to WFST G transducer",
      "Evaluate on multi-sentence discourse sequences",
    ],
    status: "Algebraic model defined — discourse corpus needed",
  },
  {
    id: "wfst",
    number: "03",
    color: "var(--lav)",
    title: "Full WFST Decoding Cascade",
    tag: "§ 10",
    formula: "\\mathcal{D} = H \\circ C \\circ M \\circ D \\circ L \\circ G",
    formulaNote: "composed transducer: phoneme → gloss → word → sentence",
    description:
      "The full decoding pipeline follows the Kaldi/Athena WFST cascade: H maps BiLSTM outputs to phoneme sequences, C is the context-dependency transducer, M handles morphological fusion, D maps phoneme strings to dictionary entries, L encodes the lexicon, and G is the language model grammar. Currently only H and L are implemented; C, M, D, and G are the next milestones.",
    steps: [
      "Build context-dependency transducer C from phoneme co-occurrence stats",
      "Construct morphological transducer M from ⊗ operator",
      "Compile dictionary transducer D from the 50-sign lexicon",
      "Train n-gram grammar G on ASL gloss corpora",
    ],
    status: "H and L transducers built — C, M, D, G in progress",
  },
];

const ENGINEERING = [
  {
    color: "var(--mint)",
    title: "Vocabulary Scaling",
    description:
      "The compositional structure of Product VQ means vocabulary scales exponentially — 5 codebooks of size 64/32/16/64/32 yield 67M representable phoneme combinations. Reaching 1000+ signs requires only extending training data, not architectural changes.",
    metric: "50 → 1,000+",
    metricLabel: "sign vocabulary",
  },
  {
    color: "var(--sky)",
    title: "Real-Time Generation Mode",
    description:
      "The spatial discourse algebra enables synthesis: given a gloss sequence, invert the pipeline — WFST G→L→D→M→C→H — to generate landmark trajectories for a virtual signer. The phonological feature vector makes this invertible in principle.",
    metric: "recognition ↔ synthesis",
    metricLabel: "unified pipeline",
  },
  {
    color: "var(--teal)",
    title: "Cross-Signer Generalization",
    description:
      "Sim(3)-invariance handles scale, translation, and yaw rotation — but not all inter-signer variation. Domain adaptation via feature-space alignment and signer-conditioned normalization would improve accuracy across body proportions, distances, and lighting conditions.",
    metric: "Sim(3) → full invariance",
    metricLabel: "signer adaptation",
  },
];

export function RoadmapSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.08 });

  return (
    <section
      id="roadmap"
      ref={ref}
      className="section-pad-xl"
      style={{
        padding: "96px 40px 112px",
        borderTop: "1px solid var(--rule)",
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
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}>§ 06</span>
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
          What Comes Next
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
            marginBottom: 56,
          }}
        >
          The current system implements the geometric core — invariant feature extraction,
          product quantization, and BiLSTM inference. Three open chapters remain in the
          formal framework, each with a precise mathematical specification and a concrete
          engineering path.
        </motion.p>

        {/* Theory items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 56 }}>
          {THEORY.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.18 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="roadmap-theory-item"
              style={{
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                gap: 0,
                background: "var(--bg-surface)",
                border: "1px solid var(--rule)",
                borderLeft: `3px solid ${item.color}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {/* Left: formula + status */}
              <div className="roadmap-theory-left" style={{
                padding: "28px 28px 24px",
                borderRight: "1px solid var(--rule)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                background: "var(--bg-base)",
              }}>
                {/* Tag + number */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 10,
                    color: item.color,
                    letterSpacing: "0.1em",
                  }}>
                    {item.number}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--ink4)",
                  }}>
                    {item.tag}
                  </span>
                </div>

                <span style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: 18,
                  fontWeight: 400,
                  color: "var(--ink)",
                  lineHeight: 1.25,
                }}>
                  {item.title}
                </span>

                {/* Formula */}
                <div style={{
                  padding: "12px 14px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 6,
                  fontSize: 13,
                  overflowX: "auto",
                }}>
                  <KaTeX math={item.formula} display />
                </div>
                <span style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 9,
                  color: "var(--ink4)",
                  letterSpacing: "0.06em",
                }}>
                  {item.formulaNote}
                </span>

                {/* Status badge */}
                <span style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 10,
                  lineHeight: 1.5,
                  color: item.color,
                  background: `color-mix(in srgb, ${item.color} 8%, var(--bg-surface))`,
                  border: `1px solid color-mix(in srgb, ${item.color} 25%, var(--rule))`,
                  borderRadius: 4,
                  padding: "5px 10px",
                }}>
                  {item.status}
                </span>
              </div>

              {/* Right: description + steps */}
              <div style={{
                padding: "28px 32px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                <p style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "var(--ink2)",
                  margin: 0,
                }}>
                  {item.description}
                </p>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingTop: 4,
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink4)",
                  }}>
                    Implementation steps
                  </span>
                  {item.steps.map((step, si) => (
                    <div key={si} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        fontFamily: "var(--font-mono, DM Mono, monospace)",
                        fontSize: 9,
                        color: item.color,
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {String(si + 1).padStart(2, "0")}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-ui, Figtree, sans-serif)",
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: "var(--ink3)",
                      }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Engineering horizons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <span style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink4)",
          }}>Engineering horizons</span>
          <div style={{ flex: 1, height: "1px", background: "var(--rule)" }} />
        </motion.div>

        <div className="roadmap-engineering" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {ENGINEERING.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.62 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--rule)",
                borderTop: `2px solid ${item.color}`,
                borderRadius: 8,
                padding: "20px 20px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 18,
                fontWeight: 500,
                color: item.color,
                letterSpacing: "-0.01em",
              }}>
                {item.metric}
              </span>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink5)",
              }}>
                {item.metricLabel}
              </span>
              <div style={{ height: "1px", background: "var(--rule)" }} />
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink2)",
              }}>
                {item.title}
              </span>
              <p style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                lineHeight: 1.65,
                color: "var(--ink3)",
                margin: 0,
              }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
