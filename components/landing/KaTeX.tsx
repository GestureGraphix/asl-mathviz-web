"use client";

import { renderTex } from "@/lib/tex";

interface KaTeXProps {
  math: string;
  display?: boolean;
  className?: string;
}

export function KaTeX({ math, display = false, className }: KaTeXProps) {
  const html = renderTex(math, display);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
