"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroBackground } from "./HeroBackground";
import { AnimatedCounter } from "./AnimatedCounter";

type Stat =
  | { kind: "static"; value: string; label: string }
  | { kind: "count"; target: number; prefix?: string; suffix?: string; label: string };

const STATS: Stat[] = [
  { kind: "static", value: "80.8%",            label: "top-1 accuracy" },
  { kind: "count",  target: 2279, suffix: "",  label: "sign vocabulary" },
  { kind: "static", value: "<30ms",            label: "inference latency" },
  { kind: "static", value: "100%",             label: "browser-native" },
];

export function Hero() {
  return (
    <section className="hero-section" style={{
      minHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 40px 64px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Phonology parameter color blobs */}
      <HeroBackground />

      {/* Subtle dot grid */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(circle, #c8c2b6 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        opacity: 0.22,
        pointerEvents: "none",
      }} />

      {/* Edge fades */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: [
          "linear-gradient(to bottom, var(--bg-base) 0%, transparent 120px)",
          "linear-gradient(to top, var(--bg-base) 0%, transparent 120px)",
        ].join(", "),
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        maxWidth: 820,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
      }}>
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink4)",
          }}
        >
          <span style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--teal)",
          }} />
          Formal Phonological Framework · Tier 3 SLT
          <span style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--teal)",
          }} />
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display, 'Bodoni Moda', Georgia, serif)",
            fontStyle: "italic",
            fontSize: "clamp(44px, 7vw, 76px)",
            fontWeight: 400,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Making Sign Language
          <br />
          Mathematically Visible
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-ui, Figtree, sans-serif)",
            fontSize: 17,
            lineHeight: 1.65,
            color: "var(--ink3)",
            maxWidth: 600,
            margin: 0,
          }}
        >
          The first browser-native ASL recognizer built on a formal phonological
          framework — decomposing every sign into five geometric parameters with
          provable Sim(3)-invariance, running entirely in your browser via ONNX.
        </motion.p>

        {/* Stats row */}
        <motion.div
          className="hero-stats"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "flex",
            gap: 0,
            alignItems: "stretch",
            borderRadius: 8,
            border: "1px solid var(--rule)",
            overflow: "hidden",
            background: "var(--bg-surface)",
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "16px 28px",
                borderRight: i < STATS.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 110,
              }}
            >
              {stat.kind === "count" ? (
                <AnimatedCounter
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={1200}
                  style={{
                    fontFamily: "var(--font-mono, DM Mono, monospace)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--ink)",
                    letterSpacing: "-0.02em",
                  }}
                />
              ) : (
                <span style={{
                  fontFamily: "var(--font-mono, DM Mono, monospace)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}>
                  {stat.value}
                </span>
              )}
              <span style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink4)",
                textAlign: "center",
                lineHeight: 1.3,
              }}>
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="hero-ctas"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <Link
            href="/demo/"
            style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "var(--bg-base)",
              background: "var(--ink)",
              borderRadius: 7,
              padding: "12px 28px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Launch Live Demo
            <span style={{ fontSize: 16 }}>→</span>
          </Link>

          <a
            href="#pipeline"
            style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "var(--ink3)",
              background: "transparent",
              border: "1px solid var(--rule)",
              borderRadius: 7,
              padding: "12px 24px",
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--ink4)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--rule)";
              e.currentTarget.style.color = "var(--ink3)";
            }}
          >
            Explore the Framework
          </a>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          style={{
            fontFamily: "var(--font-mono, DM Mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
          }}
        >
          <span>scroll to explore</span>
          <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span>
        </motion.div>
      </div>
    </section>
  );
}
