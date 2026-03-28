"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function AbstractSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section id="about" ref={ref} className="section-pad-xl" style={{
      padding: "96px 40px 120px",
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
          }}>§ 07</span>
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
            marginBottom: 48,
            lineHeight: 1.15,
          }}
        >
          About the Research
        </motion.h2>

        <div className="abstract-grid" style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 64,
          alignItems: "start",
        }}>
          {/* Abstract */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <div style={{
              paddingLeft: 20,
              borderLeft: "2px solid var(--rule)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
              <span style={{
                fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1.4,
              }}>
                Compositional Mathematical Linguistics for American Sign Language:
                Formal Phonology, Spatial Discourse Algebra, Morphological Fusion,
                and Scalable Decoding
              </span>
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 11,
                color: "var(--ink4)",
                marginTop: 6,
              }}>
                Alex Hernandez Juarez · Yale University · March 2026
              </span>
            </div>

            <p style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--ink2)",
              margin: 0,
            }}>
              We develop a mathematically grounded framework for ASL recognition that
              unifies formal linguistics, geometric signal processing, and structured
              sequence decoding. Signs are factorized into five simultaneous phonological
              parameters — handshape, location, orientation, movement, and non-manual
              markers — each extracted from MediaPipe landmarks under a Sim(3)-invariant
              normalization.
            </p>

            <p style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--ink2)",
              margin: 0,
            }}>
              A Product Vector Quantizer assigns each parameter to an independent
              codebook, achieving exponentially lower sample complexity than joint
              quantization. A two-layer BiLSTM with attention pooling processes the
              resulting 51-dimensional feature sequences, exported to ONNX for real-time
              browser inference via WebAssembly SIMD. The full pipeline runs in two Web
              Workers — MediaPipe in one, ONNX Runtime in another — keeping the main
              thread free for rendering.
            </p>

            <p style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--ink2)",
              margin: 0,
            }}>
              We further develop a spatial discourse algebra on S² for locus assignment,
              a non-associative morphological fusion operator ⊗ on the phoneme alphabet
              Σ = Σ_H × Σ_L × Σ_O × Σ_M × Σ_N, and a WFST decoding cascade
              H ∘ C ∘ M ∘ D ∘ L ∘ G for structured recognition. This is the first
              system to demonstrate provable Sim(3)-invariance, compositional vocabulary
              scaling, and real-time browser execution in a single unified framework.
            </p>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Key contributions */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink4)",
              }}>Key Contributions</span>
              {[
                "Sim(3)-invariant phonological feature extraction from MediaPipe landmarks",
                "Product VQ with 5 independent codebooks (H/L/O/M/N)",
                "Real-time BiLSTM ONNX inference in WebAssembly SIMD",
                "Spatial discourse algebra on S² for locus assignment",
                "Non-associative morphological fusion operator ⊗",
                "WFST cascade H ∘ C ∘ M ∘ D ∘ L ∘ G",
              ].map((c, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 10,
                    color: "var(--teal)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-ui, Figtree, sans-serif)",
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "var(--ink2)",
                  }}>
                    {c}
                  </span>
                </div>
              ))}
            </div>

            {/* Links */}
            <div style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink4)",
              }}>Links</span>

              <Link
                href="/demo/"
                style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--bg-base)",
                  background: "var(--ink)",
                  borderRadius: 6,
                  padding: "10px 16px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Live Demo
                <span>→</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="abstract-footer"
        style={{
          maxWidth: 1100,
          margin: "80px auto 0",
          paddingTop: 24,
          borderTop: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{
          fontFamily: "var(--font-mono, DM Mono, monospace)",
          fontSize: 10,
          color: "var(--ink5)",
          letterSpacing: "0.06em",
        }}>
          ASL MathViz · Alex Hernandez Juarez · Yale 2026
        </span>
        <span style={{
          fontFamily: "var(--font-mono, DM Mono, monospace)",
          fontSize: 10,
          color: "var(--ink5)",
          letterSpacing: "0.04em",
        }}>
          f_t ∈ ℝ⁵¹ · Sim(3)-invariant · browser-native
        </span>
      </motion.div>
    </section>
  );
}
