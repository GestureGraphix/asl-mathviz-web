# YC Summer Grants 2026 — Demo Video Script
**Target: 5 minutes · Unlisted YouTube · No server. No cloud. All browser.**

---

## PRE-RECORDING CHECKLIST
- [ ] Deploy to Vercel — film from the live URL, not localhost
- [ ] Browser: Chrome, fullscreen, 1920×1080
- [ ] Camera: good lighting, clean background
- [ ] Editor open to: `workers/inference.worker.ts`, `workers/mediapipe.worker.ts`, `lib/features.ts`, `components/HandScene3D.tsx`
- [ ] Practice signs ready: pick 6 from different clusters (e.g. HELLO, THANK_YOU, LEARN, WHERE, MOTHER, MORE)
- [ ] App loaded, camera permission granted, status = "live"

---

## SEGMENT 1 — Cold Open `0:00–0:25`
*No talking. Hands in frame. App already running.*

**Action:**
1. Sign two signs back to back — pause between them
2. Auto-geodesic fires → full-screen 3D morph animation
3. Let it play ~4 seconds — label reads `auto-geodesic [sign A] → [sign B]`
4. Press Esc to dismiss

> **Say nothing. Let it breathe.**

---

## SEGMENT 2 — Architecture `0:25–1:10`
*Switch to editor. Show file tree.*

```
workers/
  mediapipe.worker.ts
  inference.worker.ts
lib/
  features.ts
```

**Say:**
> "Everything you just saw runs entirely in the browser — no server, no API calls, no cloud.
> Two Web Workers running in parallel: one for MediaPipe hand tracking, one for ONNX Runtime
> running a BiLSTM I trained. They never block the main thread."

**Action:** Open `workers/mediapipe.worker.ts`, scroll to lines 97–113.

```ts
self.postMessage(payload, transferables);
```

**Say:**
> "I'm not copying landmark data between threads — I'm transferring ownership
> of the raw ArrayBuffer. Zero-copy. The moment that buffer crosses the thread
> boundary, the sender loses access to it."

---

## SEGMENT 3 — Phonological Feature Extractor `1:10–2:00`
*Open `lib/features.ts`, scroll to lines 75–92.*

```ts
const u_H = computeHandshape(normL, normR);   // (16,) handshape
const u_L = computeLocation(normL, normR);    // (6,)  location
const u_O = computeOrientation(normL, normR); // (6,)  orientation
const u_M = computeMovement(normL, normR, stateL, stateR); // (18,) movement
const u_N = computeNonManual(landmarks.face); // (5,)  non-manual
```

**Say:**
> "Each frame I extract a 46-dimensional phonological feature vector.
> Not raw pixels, not generic pose embeddings — five simultaneous articulatory
> parameters grounded in ASL linguistics: handshape, location, orientation,
> movement, and non-manual markers like facial expression.
> This is the representation the model actually sees."

**Action:** Switch back to app → move your hand slowly → point at the spectrogram
scrolling at the bottom of the scene and the PhonologyBars updating live in the sidebar.

**Say:**
> "Every column in that spectrogram is one frame. Every row is one feature dimension,
> color-coded by parameter band. You're watching the phonological fingerprint of my
> hand in real time."

---

## SEGMENT 4 — Sign Boundary Detection `2:00–2:50`
*Open `workers/inference.worker.ts`, scroll to lines 107–151.*

```ts
if (movNorm < REST_NORM_THRESHOLD) {
  restCounter++;
} else {
  restCounter = 0;
}
```

```ts
if (restCounter === REST_FRAMES && ringBuffer.length >= MIN_SIGN_FRAMES) {
  const result = await runInference();
  ringBuffer.length = 0;
```

**Say:**
> "There's no external segmentation model. I detect sign boundaries by watching
> the L2 norm of the movement sub-vector — u^M. When movement drops below
> threshold for four consecutive frames, I run the BiLSTM on the accumulated
> ring buffer and commit the result.
> This matches how native signers actually pause between signs — it's not a hack,
> it's a linguistically grounded boundary condition."

**Action:** Switch to app. Sign 4–5 signs. Watch TranscriptStrip build up at the bottom.

**Say:**
> "Each entry in that transcript is a committed prediction — the model only fires
> at sign boundaries, not on every frame."

---

## SEGMENT 5 — Sign Space Globe + The Comet `2:50–3:45`
*App is running. Recognize mode. Globe rings visible as background layer.*

**Action:** Sign a few things. Show the comet drifting toward each prediction on the globe.

**Say:**
> "Every sign in the 50-word vocabulary is a ring on this sphere — projected
> from the phonological feature space onto S². The rings are color-coded by
> phonological cluster. As I sign, a comet tracks through them."

**Action:** Open `components/HandScene3D.tsx`, scroll to the SignGlobe comet centroid code.

```ts
cx += SIGN_POS_UNIT[i].x * p;   // probability-weighted centroid
cy += SIGN_POS_UNIT[i].y * p;
cz += SIGN_POS_UNIT[i].z * p;
// project centroid back onto S²
cometTarget.current.set(cx / len, cy / len, cz / len);
```

**Say:**
> "The comet isn't following the top prediction — it's tracking the
> probability-weighted centroid of the entire softmax distribution,
> projected back onto S². You're watching the model's uncertainty
> moving through sign space in real time, before it commits to anything."

---

## SEGMENT 6 — Geodesic Mode `3:45–4:30`
*Click Geodesic in the header. Pick two phonologically distant signs.*

**Action:** Show the 3D avatar morphing between sign A and sign B. Math panel updating.

**Say:**
> "Signs aren't just labels — they're points in a Riemannian manifold.
> This interpolator walks the geodesic between any two signs through the
> product space ℝ²⁸ = u^H ⊕ u^L ⊕ u^O, and shows the per-component
> phonological distance for each articulatory parameter."

**Action:** Pause on midpoint α ≈ 0.5. Point at the formula on screen:

```
γ(α) = (1−α)·s_A + α·s_B,   α ∈ [0,1]
d_φ  = ‖s_A − s_B‖₂
```

**Say:**
> "The auto-geodesic you saw at the very start fires automatically every
> time two consecutive signs are recognized. Recognition triggers
> geometry — the math isn't decorative, it's live."

---

## SEGMENT 7 — Close `4:30–5:00`
*Switch back to Recognize mode. Hands in frame.*

**Action:** Sign 3–4 signs continuously. Let the scene run — globe rotating behind your
hands, spectrogram scrolling at the bottom, wrist trails, particles, transcript building.
No cuts. No voiceover. Just the full pipeline running.

**Say (quietly, over the live scene):**
> "No server. No cloud. Fully client-side ASL recognition, phonological feature
> extraction, and real-time mathematical visualization — all running in your browser."

Let the transcript build for the last 10 seconds. End there.

---

## KEY LINES TO MEMORIZE
These are the sentences that matter most — practice until they're natural:

1. **"No server, no cloud. Two Web Workers, zero-copy ArrayBuffer transfer."**
2. **"Not raw pixels — a 46-dimensional phonological feature vector grounded in ASL linguistics."**
3. **"Sign boundaries detected by the L2 norm of the movement sub-vector. Linguistically grounded, not a hack."**
4. **"The comet tracks the probability-weighted centroid of the full softmax distribution on S²."**
5. **"Recognition triggers geometry — the math isn't decorative, it's live."**

---

## PACING NOTES
- Talk slower than feels natural — you know this cold, the reviewer doesn't
- Never say "um" before a code line — pause instead, let the code appear, then speak
- The cold open silence is intentional — do not fill it
- End on the app running, not on your face

---

## THINGS TO NOT SAY
- ~~"This is basically..."~~ — nothing is "basically" anything
- ~~"It's kind of like..."~~ — be direct
- ~~"I'm still working on..."~~ — don't apologize for scope
- ~~"Sorry if..."~~ — no apologies
