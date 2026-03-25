"use client";

import katex from "katex";

interface KaTeXProps {
  math: string;
  display?: boolean;
  className?: string;
}

export function KaTeX({ math, display = false, className }: KaTeXProps) {
  const html = katex.renderToString(math, {
    throwOnError: false,
    displayMode: display,
  });
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
