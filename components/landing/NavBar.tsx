"use client";

import Link from "next/link";

const NAV_LINKS = [
  { label: "Pipeline", href: "#pipeline" },
  { label: "Parameters", href: "#parameters" },
  { label: "Research", href: "#research" },
  { label: "Math", href: "#math" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "About", href: "#about" },
];

export function NavBar() {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 40px",
      background: "rgba(248, 246, 241, 0.88)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--rule)",
    }}>
      {/* Brand */}
      <span style={{
        fontFamily: "var(--font-ui, Figtree, sans-serif)",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "var(--ink)",
      }}>
        ASL MathViz
      </span>

      {/* Section links */}
      <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
        {NAV_LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            style={{
              fontFamily: "var(--font-ui, Figtree, sans-serif)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink4)",
              textDecoration: "none",
              padding: "6px 14px",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ink4)")}
          >
            {label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/demo/"
        style={{
          fontFamily: "var(--font-ui, Figtree, sans-serif)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--bg-base)",
          background: "var(--ink)",
          border: "none",
          borderRadius: 6,
          padding: "7px 16px",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        Launch Demo
        <span style={{ fontSize: 13, lineHeight: 1 }}>→</span>
      </Link>
    </nav>
  );
}
