"use client";

import { useAppStore } from "@/store/appStore";
import RAW_DATA from "@/public/data/sign_space.json";

interface SignEntry {
  id: number; gloss: string;
  x: number; y: number; z: number;
  cluster: number; color: string;
  category: string; minimal_pair: string | null;
}

const SIGN_MAP = Object.fromEntries(
  (RAW_DATA as SignEntry[]).map((s) => [s.gloss, s]),
);

export function MinimalPairPanel() {
  const prediction = useAppStore((s) => s.prediction);

  if (!prediction) {
    return <Empty>Sign something to see</Empty>;
  }

  const current = SIGN_MAP[prediction.gloss];
  if (!current?.minimal_pair) {
    return <Empty>No minimal pair for {prediction.gloss.replace(/_/g, " ")}</Empty>;
  }

  const pair = SIGN_MAP[current.minimal_pair];
  if (!pair) return <Empty>—</Empty>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <SignRow sign={current} active />

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 12 }}>
        <div style={{ height: 1, width: 14, background: "var(--rule)", flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 9, color: "var(--ink5)", whiteSpace: "nowrap",
        }}>
          ≈ minimal pair
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      </div>

      <SignRow sign={pair} />
    </div>
  );
}

function SignRow({
  sign,
  active,
}: {
  sign: Pick<SignEntry, "gloss" | "color" | "category">;
  active?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: sign.color, flexShrink: 0,
        opacity: active ? 1 : 0.45,
      }} />
      <span style={{
        fontFamily: "var(--font-display, 'Bodoni Moda', serif)",
        fontStyle: "italic", fontWeight: 700,
        fontSize: 13,
        color: active ? "var(--ink2)" : "var(--ink4)",
      }}>
        {sign.gloss.replace(/_/g, " ")}
      </span>
      <span style={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 9, color: "var(--ink5)",
        marginLeft: "auto",
      }}>
        {sign.category}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 60, display: "flex", alignItems: "center" }}>
      <span style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 11, color: "var(--ink5)",
      }}>
        {children}
      </span>
    </div>
  );
}
