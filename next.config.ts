import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // COOP/COEP required for SharedArrayBuffer (ONNX Runtime Web)
  // Note: ignored in static export — see vercel.json for production headers
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      ],
    },
  ],
  // Turbopack (default in Next.js 16) — empty config silences the webpack warning.
  // WASM experiment added here when ONNX inference is wired up (Day 3).
  turbopack: {},
};

export default nextConfig;
