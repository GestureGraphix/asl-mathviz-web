import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add COOP/COEP headers on every response so SharedArrayBuffer is available.
// Required for ONNX Runtime Web multi-threaded WASM (re-enable numThreads > 1
// once these headers are confirmed live in production on Vercel).
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Cross-Origin-Opener-Policy",   "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return response;
}

export const config = { matcher: "/(.*)" };
