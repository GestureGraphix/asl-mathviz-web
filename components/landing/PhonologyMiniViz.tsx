"use client";

import { motion } from "framer-motion";

// H — Handshape: finger bars that flex/curl from bottom
function HandshapeViz({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 72" width={72} height={72} aria-hidden>
      <rect x="10" y="50" width="52" height="10" rx="5" fill={color} opacity={0.15} />
      {[0, 1, 2, 3].map((fi) => (
        <motion.rect
          key={fi}
          x={16 + fi * 11}
          y={26}
          width={7}
          height={24}
          rx={3.5}
          fill={color}
          style={{ transformOrigin: "50% 100%" }}
          animate={{ scaleY: [1, 0.18, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: fi * 0.18, ease: [0.4, 0, 0.6, 1] }}
        />
      ))}
      <motion.rect
        x={5} y={36} width={7} height={17} rx={3.5}
        fill={color}
        style={{ transformOrigin: "50% 100%", rotate: -30 }}
        animate={{ scaleY: [1, 0.45, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.55, ease: [0.4, 0, 0.6, 1] }}
      />
    </svg>
  );
}

// L — Location: dot traversing body positions
function LocationViz({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 72" width={72} height={72} aria-hidden>
      <circle cx="36" cy="16" r="9" fill="none" stroke="var(--rule)" strokeWidth="1.5" />
      <path d="M27 25 Q21 42 23 62 L49 62 Q51 42 45 25 Z" fill="none" stroke="var(--rule)" strokeWidth="1.5" />
      {[
        { cx: 36, cy: 12 },
        { cx: 36, cy: 30 },
        { cx: 36, cy: 48 },
        { cx: 24, cy: 36 },
      ].map((pos, i) => (
        <motion.circle
          key={i}
          cx={pos.cx} cy={pos.cy} r={2.5}
          fill={color}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
        />
      ))}
      <motion.circle
        r={4} fill={color}
        animate={{
          cx: [36, 36, 36, 24, 36],
          cy: [12, 30, 48, 36, 12],
          opacity: [1, 1, 1, 1, 0],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
      />
    </svg>
  );
}

// O — Orientation: normal arrow rotating
function OrientationViz({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 72" width={72} height={72} aria-hidden>
      <ellipse cx="36" cy="50" rx="18" ry="10" fill="none" stroke="var(--rule)" strokeWidth="1.5" />
      <circle cx="36" cy="36" r="19" fill="none" stroke={color} strokeWidth="0.75" strokeDasharray="3 4" opacity={0.3} />
      <motion.g
        style={{ transformOrigin: "36px 36px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <line x1="36" y1="36" x2="36" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <polygon points="36,13 33,21 39,21" fill={color} />
        <circle cx="36" cy="36" r="3" fill={color} opacity={0.4} />
      </motion.g>
    </svg>
  );
}

// M — Movement: dot traces arc trajectory
function MovementViz({ color }: { color: string }) {
  // Quadratic bezier P0=(14,56) ctrl=(36,12) P2=(58,56), sampled at t=0,0.25,0.5,0.75,1
  const xs = [14, 25, 36, 47, 58];
  const ys = [56, 38, 31, 38, 56];

  return (
    <svg viewBox="0 0 72 72" width={72} height={72} aria-hidden>
      <path d="M 14 56 Q 36 12 58 56" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity={0.28} />
      <motion.circle
        r={5} fill={color}
        animate={{
          cx: [...xs, ...xs.slice().reverse()],
          cy: [...ys, ...ys.slice().reverse()],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// N — Non-manual: face with brow + mouth animation
function NonManualViz({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 72" width={72} height={72} aria-hidden>
      <ellipse cx="36" cy="36" rx="22" ry="26" fill="none" stroke="var(--rule)" strokeWidth="1.5" />
      <circle cx="28" cy="32" r="2.5" fill={color} />
      <circle cx="44" cy="32" r="2.5" fill={color} />
      <motion.g animate={{ x: [0, 2.5, -2.5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
        <circle cx="28" cy="32" r="1.3" fill="var(--bg-base)" />
        <circle cx="44" cy="32" r="1.3" fill="var(--bg-base)" />
      </motion.g>
      <motion.g animate={{ y: [0, -4, 0, 3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M22 24 Q28 21 34 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M38 24 Q44 21 50 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </motion.g>
      <motion.ellipse
        cx={36} cy={50} rx={6} ry={2}
        fill="none" stroke={color} strokeWidth="1.5"
        style={{ transformOrigin: "36px 50px" }}
        animate={{ scaleY: [1, 3.2, 1, 2.5, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

interface Props {
  symbol: string;
  color: string;
}

export function PhonologyMiniViz({ symbol, color }: Props) {
  const vizzes: Record<string, React.ReactNode> = {
    H: <HandshapeViz color={color} />,
    L: <LocationViz color={color} />,
    O: <OrientationViz color={color} />,
    M: <MovementViz color={color} />,
    N: <NonManualViz color={color} />,
  };

  return (
    <div style={{ width: 72, height: 72, flexShrink: 0 }}>
      {vizzes[symbol] ?? null}
    </div>
  );
}
