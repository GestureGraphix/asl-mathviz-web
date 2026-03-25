"use client";

import { motion } from "framer-motion";

const BLOBS = [
  { color: "#e0686a", x: "9%",  y: "28%", size: 420, delay: 0,   dur: 5.5 }, // H coral
  { color: "#3ea89f", x: "26%", y: "75%", size: 360, delay: 1.1, dur: 6.2 }, // L teal
  { color: "#5090d8", x: "52%", y: "35%", size: 380, delay: 2.0, dur: 5.8 }, // O sky
  { color: "#4dbb87", x: "76%", y: "20%", size: 320, delay: 0.7, dur: 7.0 }, // M mint
  { color: "#8b7fd4", x: "91%", y: "68%", size: 360, delay: 1.5, dur: 6.5 }, // N lav
];

export function HeroBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.05, 0.11, 0.05], scale: [1, 1.08, 1] }}
          transition={{
            duration: blob.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: blob.delay,
          }}
          style={{
            position: "absolute",
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(48px)",
          }}
        />
      ))}
    </div>
  );
}
