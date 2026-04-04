/**
 * Shared sign-space and vocab data — imported once, reused everywhere.
 * Prevents each component from independently parsing the same JSON and
 * rebuilding the same lookup maps at module load time.
 */

import RAW_SIGN_SPACE from "@/public/data/sign_space.json";
import RAW_VOCAB from "@/public/data/vocab.json";

// ── Types ──────────────────────────────────────────────────────────

export interface SignEntry {
  id: number;
  gloss: string;
  x: number;
  y: number;
  z: number;
  cluster: number;
  color: string;
  category: string;
  minimal_pair: string | null;
}

// ── Parsed data ────────────────────────────────────────────────────

export const SIGNS = RAW_SIGN_SPACE as SignEntry[];

export const ID_TO_GLOSS: Record<number, string> = Object.fromEntries(
  Object.entries(RAW_VOCAB.id_to_gloss).map(([k, v]) => [Number(k), v as string])
);

// ── Precomputed lookups ────────────────────────────────────────────

/** gloss string -> index into SIGNS array (which equals entry.id) */
export const GLOSS_TO_IDX: Record<string, number> = Object.fromEntries(
  SIGNS.map((s) => [s.gloss, s.id])
);

/** gloss string -> softmax label index (for matching inference output) */
export const GLOSS_TO_LABEL: Record<string, number> = Object.fromEntries(
  Object.entries(RAW_VOCAB.id_to_gloss).map(([k, v]) => [v, Number(k)])
);

/** gloss string -> sign color hex */
export const GLOSS_TO_COLOR: Record<string, string> = Object.fromEntries(
  SIGNS.map((s) => [s.gloss, s.color])
);

/** Ordered gloss list from vocab (used by demo page mode selector) */
export const VOCAB_GLOSSES: string[] = Object.values(RAW_VOCAB.id_to_gloss) as string[];
