"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const TIERS = [
  {
    number: "01",
    name: "End-to-End Neural",
    tagline: "Raw pixels → translation",
    data: "10K–100K hrs",
    dataWidth: "100%",
    vocab: "5K–10K signs",
    invariance: false,
    approach: "Transformers, self-attention on pose coordinates or video",
    systems: "SignGemma, SSVP-SLT, T-MORT",
    thisWork: false,
  },
  {
    number: "02",
    name: "Gloss-Based",
    tagline: "Signs → glosses → text",
    data: "1K–10K hrs",
    dataWidth: "55%",
    vocab: "Gloss bottleneck",
    invariance: false,
    approach: "CTC recognition → NMT translation via discrete gloss tokens",
    systems: "NSLT, mBART (25.58 BLEU-4)",
    thisWork: false,
  },
  {
    number: "03",
    name: "Phonological Features",
    tagline: "Geometric decomposition",
    data: "100–1K hrs",
    dataWidth: "22%",
    vocab: "Exponential (compositional)",
    invariance: true,
    approach: "5-parameter feature vector · Product VQ · BiLSTM · ONNX",
    systems: "ASL MathViz (this work)",
    thisWork: true,
  },
  {
    number: "04",
    name: "Algebraic / Formal",
    tagline: "First-principles rules",
    data: "Expert knowledge",
    dataWidth: "8%",
    vocab: "Unbounded (morphological rules)",
    invariance: true,
    approach: "WFST composition, formal grammars, group theory",
    systems: "AZee, PDL_SL — synthesis only, no recognition",
    thisWork: false,
  },
];

export function TaxonomySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="research" ref={ref} className="section-pad" style={{
      padding: "96px 40px",
      borderTop: "1px solid var(--rule)",
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
          }}>§ 03</span>
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
          Where This Research Sits
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
            maxWidth: 640,
            marginBottom: 52,
          }}
        >
          Sign language translation research divides into four tiers of representational
          sophistication. The field has chased benchmark scores at Tier 1 while ignoring a
          critical mathematical gap — no system had provable geometric invariance until now.
        </motion.p>

        {/* Column headers */}
        <motion.div
          className="taxonomy-col-header"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 140px 140px 80px",
            gap: 0,
            paddingBottom: 10,
            borderBottom: "1px solid var(--rule)",
            marginBottom: 4,
          }}
        >
          {["", "Approach", "Data needed", "Vocabulary", "Sim(3)"].map(h => (
            <span key={h} style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              padding: "0 12px",
            }}>
              {h}
            </span>
          ))}
        </motion.div>

        {/* Tier rows */}
        {TIERS.map((tier, i) => (
          <motion.div
            key={tier.number}
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{
              duration: 0.55,
              delay: 0.2 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="taxonomy-row"
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 140px 140px 80px",
              gap: 0,
              padding: "16px 0",
              borderBottom: "1px solid var(--rule)",
              background: tier.thisWork ? "rgba(62,168,159,0.04)" : "transparent",
              position: "relative",
            }}
          >
            {/* Highlight bar for this work */}
            {tier.thisWork && (
              <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: "var(--teal)",
                borderRadius: 2,
              }} />
            )}

            {/* Tier number */}
            <div style={{ padding: "0 12px", display: "flex", alignItems: "flex-start", paddingTop: 2 }}>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 11,
                color: tier.thisWork ? "var(--teal)" : "var(--ink5)",
                letterSpacing: "0.06em",
              }}>
                {tier.number}
              </span>
            </div>

            {/* Name + description */}
            <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: tier.thisWork ? "var(--ink)" : "var(--ink2)",
                }}>
                  {tier.name}
                </span>
                {tier.thisWork && (
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 8,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    background: "rgba(62,168,159,0.12)",
                    border: "1px solid rgba(62,168,159,0.3)",
                    borderRadius: 3,
                    padding: "2px 7px",
                  }}>
                    this work
                  </span>
                )}
              </div>
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                color: "var(--ink4)",
                lineHeight: 1.5,
              }}>
                {tier.approach}
              </span>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 9,
                color: "var(--ink5)",
                letterSpacing: "0.04em",
              }}>
                {tier.systems}
              </span>
            </div>

            {/* Data */}
            <div className="taxonomy-col-data" style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-start", paddingTop: 2 }}>
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                color: "var(--ink3)",
              }}>
                {tier.data}
              </span>
              <div style={{
                height: 3,
                background: "var(--rule)",
                borderRadius: 2,
                overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: tier.dataWidth } : { width: 0 }}
                  transition={{ duration: 0.8, delay: 0.35 + i * 0.08, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: tier.thisWork ? "var(--teal)" : "var(--ink5)",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>

            {/* Vocab */}
            <div className="taxonomy-col-vocab" style={{ padding: "0 12px", paddingTop: 2 }}>
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                color: "var(--ink3)",
                lineHeight: 1.5,
              }}>
                {tier.vocab}
              </span>
            </div>

            {/* Invariance */}
            <div className="taxonomy-col-sim" style={{ padding: "0 12px", paddingTop: 2 }}>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 13,
                color: tier.invariance ? "var(--mint)" : "var(--ink5)",
              }}>
                {tier.invariance ? "✓" : "✗"}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Innovation gap callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 40,
            padding: "24px 28px",
            background: "var(--bg-surface)",
            border: "1px solid var(--rule)",
            borderLeft: "3px solid var(--coral)",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--coral)",
          }}>
            The Innovation Gap
          </span>
          <p style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 720,
          }}>
            A systematic search of CVPR, ICCV, NeurIPS, ACL, and EMNLP (2020–2026) finds
            zero papers with a Sim(3)-invariance proof for sign language, zero applications
            of Product Vector Quantization to phonological features, and zero operational
            Tier 3 recognition systems benchmarked end-to-end. This work addresses all three.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
