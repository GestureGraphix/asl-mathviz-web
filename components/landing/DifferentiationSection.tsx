"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

const GAPS = [
  {
    stat: "0",
    label: "Sim(3)-invariance proofs",
    context: "in sign language recognition, 2020–2026",
    detail: "CVPR · ICCV · NeurIPS · ACL · EMNLP surveyed",
  },
  {
    stat: "0",
    label: "Product VQ applications",
    context: "to phonological feature sets",
    detail: "across all published SLT work",
  },
  {
    stat: "0",
    label: "Tier 3 systems",
    context: "benchmarked end-to-end with real-time execution",
    detail: "phonological + geometric + browser-native",
  },
];

const ANSWERS = [
  {
    target: 67108864,
    prefix: "",
    suffix: "",
    label: "representable phoneme combos",
    sub: "64 × 32 × 16 × 64 × 32",
    color: "var(--teal)",
  },
  {
    target: 51,
    prefix: "",
    suffix: "D",
    label: "phonological feature dims",
    sub: "H(16) · L(6) · O(6) · M(18) · N(5)",
    color: "var(--mint)",
  },
  {
    target: 30,
    prefix: "<",
    suffix: "ms",
    label: "end-to-end inference",
    sub: "MediaPipe + ONNX WASM SIMD",
    color: "var(--sky)",
  },
];

export function DifferentiationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      className="section-pad-xl"
      style={{
        padding: "80px 40px 96px",
        borderTop: "1px solid var(--rule)",
        background: "var(--bg-surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background accent */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(224,104,106,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono, DM Mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--coral)",
            }}
          >
            The Research Gap
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--rule)" }} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
            fontStyle: "italic",
            fontSize: "clamp(26px, 3.5vw, 38px)",
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: 10,
            lineHeight: 1.15,
          }}
        >
          Three Open Problems
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
            maxWidth: 560,
            marginBottom: 56,
          }}
        >
          A systematic survey of six years of top-tier conference papers finds the
          same answer three times over.
        </motion.p>

        {/* Three zeros */}
        <div
          className="diff-zeros"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--rule)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 2,
          }}
        >
          {GAPS.map((gap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.18 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "var(--bg-surface)",
                padding: "36px 32px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* The zero */}
              <motion.span
                initial={{ opacity: 0, scale: 0.75 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.7,
                  delay: 0.3 + i * 0.1,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                style={{
                  fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
                  fontStyle: "italic",
                  fontSize: "clamp(72px, 9vw, 108px)",
                  fontWeight: 400,
                  lineHeight: 1,
                  color: "var(--coral)",
                  letterSpacing: "-0.03em",
                  display: "block",
                }}
              >
                {gap.stat}
              </motion.span>
              <span
                style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink2)",
                  lineHeight: 1.3,
                }}
              >
                {gap.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 12,
                  color: "var(--ink3)",
                  lineHeight: 1.5,
                }}
              >
                {gap.context}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "var(--ink5)",
                  marginTop: 4,
                }}
              >
                {gap.detail}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bridge line */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, var(--teal) 20%, var(--teal) 80%, transparent)",
            margin: "32px 0",
            transformOrigin: "left center",
          }}
        />

        {/* This work closes all three */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
            fontStyle: "italic",
            fontSize: "clamp(15px, 1.8vw, 19px)",
            color: "var(--teal)",
            textAlign: "center",
            marginBottom: 40,
            letterSpacing: "0.01em",
          }}
        >
          ASL MathViz addresses all three simultaneously.
        </motion.p>

        {/* Answer stats — count up */}
        <div
          className="diff-answers"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {ANSWERS.map((ans, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.7 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--rule)",
                borderTop: `2px solid ${ans.color}`,
                borderRadius: 8,
                padding: "24px 24px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <AnimatedCounter
                target={ans.target}
                duration={1600}
                prefix={ans.prefix}
                suffix={ans.suffix}
                style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: "clamp(26px, 3.5vw, 38px)",
                  fontWeight: 500,
                  color: ans.color,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink2)",
                  lineHeight: 1.3,
                }}
              >
                {ans.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  color: "var(--ink5)",
                }}
              >
                {ans.sub}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
