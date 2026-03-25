"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const NODES = [
  {
    id: "camera",
    title: "Webcam",
    subtitle: "640 × 480",
    detail: "browser MediaStream API",
    color: "var(--coral)",
    icon: "◉",
  },
  {
    id: "mediapipe",
    title: "MediaPipe",
    subtitle: "543 landmarks",
    detail: "hands · pose · face",
    color: "var(--teal)",
    icon: "⬡",
  },
  {
    id: "sim3",
    title: "Sim(3) Norm",
    subtitle: "body-relative",
    detail: "translation · scale · yaw",
    color: "var(--sky)",
    icon: "∿",
  },
  {
    id: "features",
    title: "Feature Extractor",
    subtitle: "f_t ∈ ℝ⁵¹",
    detail: "H · L · O · M · N",
    color: "var(--mint)",
    icon: "⊕",
  },
  {
    id: "bilstm",
    title: "BiLSTM ONNX",
    subtitle: "50 classes",
    detail: "2-layer · 512D · attn pool",
    color: "var(--lav)",
    icon: "⟳",
  },
  {
    id: "output",
    title: "Predictions",
    subtitle: "top-k glosses",
    detail: "real-time · <30ms",
    color: "var(--coral)",
    icon: "✦",
  },
];

export function PipelineDiagram() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section id="pipeline" ref={ref} style={{
      padding: "96px 40px",
      borderTop: "1px solid var(--rule)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section label */}
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
          <span style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--teal)",
          }}>§ 01</span>
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
          The Recognition Pipeline
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
          Six stages, running entirely in the browser. MediaPipe runs in one Web Worker,
          ONNX inference in another — the main thread stays free for rendering.
        </motion.p>

        {/* Pipeline nodes */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          overflowX: "auto",
          paddingBottom: 8,
        }}>
          {NODES.map((node, i) => (
            <div key={node.id} style={{ display: "flex", alignItems: "center", flex: i < NODES.length - 1 ? "1 1 0" : undefined }}>
              {/* Node card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.55,
                  delay: 0.15 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--rule)",
                  borderTop: `2.5px solid ${node.color}`,
                  borderRadius: 8,
                  padding: "18px 16px 16px",
                  minWidth: 120,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 20,
                  lineHeight: 1,
                  color: node.color,
                }}>
                  {node.icon}
                </span>
                <span style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}>
                  {node.title}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 10,
                  color: node.color,
                  letterSpacing: "0.04em",
                }}>
                  {node.subtitle}
                </span>
                <span style={{
                  fontFamily: "var(--font-ui, Figtree, sans-serif)",
                  fontSize: 10,
                  color: "var(--ink4)",
                  lineHeight: 1.4,
                }}>
                  {node.detail}
                </span>
              </motion.div>

              {/* Arrow connector */}
              {i < NODES.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
                  transition={{
                    duration: 0.4,
                    delay: 0.25 + i * 0.08,
                    ease: "easeOut",
                  }}
                  style={{
                    flex: 1,
                    height: 1,
                    background: "var(--rule)",
                    position: "relative",
                    minWidth: 24,
                    transformOrigin: "left center",
                  }}
                >
                  {/* Flowing data dot */}
                  {isInView && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: node.color,
                        animation: `flow-dot 1.65s ease-in-out ${i * 0.28}s infinite`,
                        opacity: 0,
                        boxShadow: `0 0 4px ${node.color}`,
                      }}
                    />
                  )}
                  <span style={{
                    position: "absolute",
                    right: -5,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink5)",
                    fontSize: 10,
                    lineHeight: 1,
                  }}>›</span>
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Worker callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.75 }}
          style={{
            marginTop: 28,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Worker 1", note: "MediaPipe Holistic · landmark extraction · ~15ms/frame", color: "var(--teal)" },
            { label: "Worker 2", note: "ONNX Runtime WASM SIMD · BiLSTM inference · ~8ms/clip", color: "var(--lav)" },
            { label: "Main thread", note: "React rendering · Three.js scene · transcript · UI only", color: "var(--ink4)" },
          ].map(({ label, note, color }) => (
            <div key={label} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: "var(--bg-raised)",
              border: "1px solid var(--rule)",
              borderRadius: 5,
            }}>
              <span style={{
                fontFamily: "var(--font-mono, DM Mono, monospace)",
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color,
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 10,
                color: "var(--ink4)",
              }}>
                {note}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
