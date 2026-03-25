# ASL MathViz — CLAUDE.md

## Project Overview

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Three.js / React Three Fiber, MediaPipe Holistic, ONNX Runtime Web (WASM SIMD), KaTeX

**What it does:** Real-time ASL hand sign recognition in the browser. MediaPipe extracts 543 landmarks → 51-D phonological feature vector → BiLSTM ONNX model → top-k sign predictions. Fully client-side, no backend.

**Purpose:** YC Summer Grants 2026 demo video — "most technically impressive thing you've built." Prioritize demo polish, visual impact, and end-to-end pipeline correctness over abstractions or test coverage.

## Architecture

- **Web Worker 1** (`workers/mediapipe.worker.ts`): MediaPipe Holistic at 640×480, emits landmark frames
- **Web Worker 2** (`workers/onnx.worker.ts`): ONNX Runtime WASM SIMD, runs BiLSTM, emits predictions
- **Main thread**: React UI + Three.js visualizations only — no heavy compute
- **No server-side logic**: all `'use client'` components, no API routes, no server actions

## File Structure

```
app/
  layout.tsx          # Root layout
  page.tsx            # Main demo page
  globals.css
components/
  AppHeader.tsx
  AttentionStrip.tsx
  CodebookGrid.tsx         # VQ codebook activation grid
  FeatureWaterfall.tsx     # Scrolling f_t ∈ ℝ⁵¹ history
  GeodesicInterpolator.tsx
  HandCanvas2D.tsx         # Mirrored webcam + landmark overlay
  HandScene3D.tsx
  MinimalPairPanel.tsx     # Current prediction + minimal pair
  PhonologicalAvatar.tsx   # 3D body silhouette, Generate mode
  PhonologyBars.tsx        # Live H/L/O/M bars
  PredictionOverlay.tsx    # Animated gloss text on video
  SignSpaceGalaxy.tsx      # 3D globe (r3f), 50 signs on S²
  TheoryPanel.tsx          # Live KaTeX formulas §3–§10
  TranscriptStrip.tsx      # Running recognized sign transcript
hooks/
lib/
store/
types/
workers/
public/
  models/asl_v1.onnx
```

## Critical Rules

### Web Workers
- Never import MediaPipe or onnxruntime-web in the main thread — browser will hang
- Worker ↔ main thread communication via `postMessage` only — no shared state
- Terminate workers on component unmount to prevent memory leaks

### React / Next.js
- All components are `'use client'` — this is a pure client-side app
- No `useState` / `useEffect` in Server Components (there are none here)
- Three.js/r3f canvas components must be wrapped in `dynamic(() => import(...), { ssr: false })`
- Keep render loops in `useFrame` (r3f) — never `setInterval` for animation

### TypeScript
- No `any` — use `unknown` for untrusted external data, then narrow safely
- Explicit types on all exported functions and component props
- Use `interface` for object shapes, `type` for unions/intersections
- Immutable patterns only — spread operator, never mutate objects

```typescript
// WRONG
user.name = 'new'

// CORRECT
const updated = { ...user, name: 'new' }
```

- No `console.log` in production code — remove before committing

### Code Style
- No emojis in code or comments
- Prefer named exports over default exports for components
- Extract reusable logic to `hooks/` — keep components thin

## Key Patterns

### Worker Message Typing

```typescript
// types/worker-messages.ts
export type MediaPipeMessage =
  | { type: 'landmarks'; payload: NormalizedLandmarkList }
  | { type: 'error'; payload: string }

export type OnnxMessage =
  | { type: 'prediction'; payload: { label: string; confidence: number }[] }
  | { type: 'ready' }
```

### r3f Component Pattern

```typescript
'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

interface SignNodeProps {
  position: [number, number, number]
  label: string
  isActive: boolean
}

export function SignNode({ position, label, isActive }: SignNodeProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.5
  })

  return <mesh ref={meshRef} position={position}>...</mesh>
}
```

## Git Workflow

Commit types: `feat`, `fix`, `refactor`, `perf`, `chore`

Examples:
- `feat: add geodesic arc animation between minimal pairs`
- `perf: reduce SignSpaceGalaxy re-renders with useMemo`
- `fix: mediapipe worker memory leak on unmount`

## Demo Priorities

When choosing between features, prioritize in this order:
1. Visual impact on camera (the 3D visualizations look alive)
2. Pipeline correctness (predictions match actual signs)
3. Mathematical depth (TheoryPanel formulas, phonological features)
4. Performance (smooth 30fps during recording)
