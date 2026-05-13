"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Pipeline", href: "#pipeline" },
  { label: "Parameters", href: "#parameters" },
  { label: "Research", href: "#research" },
  { label: "Math", href: "#math" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "About", href: "#about" },
  { label: "Math Explorer", href: "/research" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className="nav-bar"
        style={{
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
        }}
      >
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

        {/* Section links — hidden on mobile via .nav-links CSS class */}
        <div className="nav-links" style={{ display: "flex", gap: 0, alignItems: "center" }}>
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

        {/* Right: CTA + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

          {/* Hamburger — shown only on mobile via CSS */}
          <button
            className="nav-mobile-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="0" y1="1" x2="16" y2="1" />
                <line x1="0" y1="6" x2="16" y2="6" />
                <line x1="0" y1="11" x2="16" y2="11" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 52,
            left: 0,
            right: 0,
            zIndex: 49,
            background: "rgba(248, 246, 241, 0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--rule)",
            padding: "8px 20px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {NAV_LINKS.map(({ label, href }, i) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "var(--font-ui, Figtree, sans-serif)",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink2)",
                textDecoration: "none",
                padding: "13px 0",
                borderBottom: i < NAV_LINKS.length - 1 ? "1px solid var(--rule)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {label}
              <span style={{ color: "var(--ink5)", fontSize: 12 }}>→</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
