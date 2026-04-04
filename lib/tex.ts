/**
 * Shared KaTeX rendering helper — single import point so the bundler
 * deduplicates KaTeX across components.
 */

import katex from "katex";

/** Render a TeX string to an HTML string (inline mode). */
export function tex(s: string): string {
  try {
    return katex.renderToString(s, { throwOnError: false });
  } catch {
    return s;
  }
}

/** Render a TeX string to an HTML string with explicit display mode control. */
export function renderTex(s: string, block: boolean): string {
  try {
    return katex.renderToString(s, { displayMode: block, throwOnError: false });
  } catch {
    return `<span>${s}</span>`;
  }
}
