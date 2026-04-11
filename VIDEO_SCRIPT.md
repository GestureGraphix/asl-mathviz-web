# YC Summer Grants 2026 — Demo Video Script
**Target: 5 minutes · Unlisted YouTube · No server. No cloud. All browser.**

---

## PRE-RECORDING CHECKLIST
- [ ] Deploy to Vercel — film from the live URL, not localhost
- [ ] Browser: Chrome, fullscreen, 1920×1080
- [ ] Camera: good lighting, clean background
- [ ] Editor open to: `workers/inference.worker.ts`, `workers/mediapipe.worker.ts`, `lib/features.ts`, `components/HandScene3D.tsx`
- [ ] Practice signs ready: pick 6 from different clusters (e.g. HELLO, THANK_YOU, LEARN, WHERE, MOTHER, MORE)
- [ ] Practice fingerspelling: pick a short word (e.g. Y-A-L-E or H-E-L-L-O)
- [ ] App loaded, camera permission granted, status = "live", mode = Signs
- [ ] Test mode switch: Signs → Fingerspelling → Signs (confirm both models load)

---

## SEGMENT 1 — Cold Open `0:00–0:30`
*No talking. Hands in frame. App already running in Signs mode.*

**Action:**
1. Sign two signs back to back — pause between them
2. Auto-geodesic fires → full-screen 3D morph animation
3. Let it play ~4 seconds — label reads `auto-geodesic [sign A] → [sign B]`
4. Press Esc to dismiss

> **Say nothing. Let it breathe.**

---

## SEGMENT 2 — Architecture `0:30–1:10`
*Switch to editor. Show file tree.*

```
workers/
  mediapipe.worker.ts
  inference.worker.ts     ← runs both sign BiLSTM + fingerspelling MLP
lib/
  features.ts             ← 46-dim phonological features (signs)
  phonology.ts            ← 13-dim hand geometry features (fingerspelling)
```

**Say:**
> "Everything you just saw runs entirely in the browser — no server, no API calls, no cloud.
> Two Web Workers running in parallel: one for MediaPipe hand tracking, one for ONNX Runtime
> running two models — a BiLSTM for sign recognition and an MLP for fingerspelling.
> They never block the main thread."

**Action:** Open `workers/mediapipe.worker.ts`, scroll to the postMessage with transferables.

**Say:**
> "I'm not copying landmark data between threads — I'm transferring ownership
> of the raw ArrayBuffer. Zero-copy. The moment that buffer crosses the thread
> boundary, the sender loses access to it."

---

## SEGMENT 3 — Phonological Feature Extractor `1:10–2:00`
*Open `lib/features.ts`, scroll to the feature extraction.*

```ts
const u_H = computeHandshape(normL, normR);   // (16,) handshape
const u_L = computeLocation(normL, normR);    // (6,)  location
const u_O = computeOrientation(normL, normR); // (6,)  orientation
const u_M = computeMovement(normL, normR, stateL, stateR); // (18,) movement
```

**Say:**
> "Each frame I extract a 46-dimensional phonological feature vector.
> Not raw pixels, not generic pose embeddings — four simultaneous articulatory
> parameters grounded in ASL linguistics: handshape, location, orientation and movement 
> This is the representation the BiLSTM actually sees."

**Action:** Switch back to app → move your hand slowly → point at the PhonologyBars
updating live in the sidebar.

**Say:**
> "Those bars are updating every frame — H for handshape, L for location,
> O for orientation, M for movement. You're watching the phonological fingerprint
> of my hand in real time."

---

## SEGMENT 4 — Sign Boundary Detection `2:00–2:40`
*Open `workers/inference.worker.ts`, scroll to boundary detection.*

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
> This matches how native signers actually pause between signs

**Action:** Switch to app. Sign 4–5 signs. Watch TranscriptStrip build up.

**Say:**
> "Each entry in that transcript is a committed prediction — the model only fires
> at sign boundaries, not on every frame."

---

## SEGMENT 5 — Fingerspelling Mode `2:40–3:20`
*Click the mode toggle to switch from Signs to Fingerspelling.*

**Action:** Hold up your hand, fingerspell Y-A-L-E (or another short word). Each letter
appears live on screen.

**Say:**
> "Same pipeline, different model. I switch from the sign BiLSTM to a
> fingerspelling MLP — a completely different architecture running on the
> same inference worker."

**Action:** Open `workers/inference.worker.ts`, scroll to `processFsFeatures`.

```ts
// z-score normalize using training stats
const x = new Float32Array(13);
for (let i = 0; i < 13; i++) x[i] = (fv[i] - fsNormMean[i]) / fsNormStd[i];

const tensor = new ort.Tensor("float32", x, [1, 13]);
const out    = await fsSession.run({ h_features: tensor });
```

**Say:**
> "Fingerspelling uses a 13-dimensional feature vector — pure hand geometry,
> no movement, no face. The MLP classifies individual letters every frame,
> then a majority-vote smoother over a sliding window stabilizes the output.
> Different linguistic structure, different model, same real-time loop."

**Action:** Switch back to Signs mode. The transition should be instant.

---

## SEGMENT 6 — Sign Space Globe + The Comet `3:20–3:55`
*Signs mode. Globe rings visible as background layer.*

**Action:** Sign a few things. Show the comet drifting toward each prediction on the globe.

**Say:**
> "Every sign in the 50-word vocabulary is a ring on this sphere — projected
> from the phonological feature space onto S². As I sign, a comet tracks
> through them."

**Action:** Open `components/HandScene3D.tsx`, scroll to the SignGlobe comet centroid code.

```ts
cx += SIGN_POS_UNIT[i].x * p;   // probability-weighted centroid
cy += SIGN_POS_UNIT[i].y * p;
cz += SIGN_POS_UNIT[i].z * p;
cometTarget.current.set(cx / len, cy / len, cz / len);
```

**Say:**
> "The comet isn't following the top prediction — it's tracking the
> probability-weighted centroid of the entire softmax distribution,
> projected back onto S². You're watching the model's uncertainty
> moving through sign space in real time."

---

## SEGMENT 7 — Geodesic Mode `3:55–4:30`
*Click Geodesic in the header. Pick two phonologically distant signs.*

**Action:** Show the 3D avatar morphing between sign A and sign B. Math panel updating.

**Say:**
> "Signs aren't just labels — they're points in a Riemannian manifold.
> This interpolator walks the geodesic between any two signs through the
> product space of handshape, location, and orientation, and shows the
> per-component phonological distance."

**Action:** Pause on midpoint. Point at the formula on screen.

**Say:**
> "The auto-geodesic you saw at the very start fires automatically every
> time two consecutive signs are recognized. Recognition triggers
> geometry — the math isn't decorative, it's live."

---

## SEGMENT 8 — Close `4:30–5:00`
*Switch back to Signs mode. Hands in frame.*

**Action:** Sign 3–4 signs continuously. Let the scene run — globe rotating behind your
hands, spectrogram scrolling, wrist trails, particles, transcript building.
No cuts. No voiceover for a beat. Just the full pipeline running.

**Say (quietly, over the live scene):**
> "Two models, two architectures, one pipeline. Fully client-side ASL recognition —
> signs and fingerspelling — with real-time phonological visualization.
> No server. No cloud. All browser."

Let the transcript build for the last 10 seconds. End there.

---

## KEY LINES TO MEMORIZE
These are the sentences that matter most — practice until they're natural:

1. **"No server, no cloud. Two Web Workers, zero-copy ArrayBuffer transfer."**
2. **"Not raw pixels — a 46-dimensional phonological feature vector grounded in ASL linguistics."**
3. **"Sign boundaries detected by the L2 norm of the movement sub-vector. Linguistically grounded, not a hack."**
4. **"Same pipeline, different model — a BiLSTM for signs, an MLP for fingerspelling."**
5. **"The comet tracks the probability-weighted centroid of the full softmax distribution on S²."**
6. **"Recognition triggers geometry — the math isn't decorative, it's live."**
7. **"Two models, two architectures, one pipeline. All browser."**

---

## PACING NOTES
- Talk slower than feels natural — you know this cold, the reviewer doesn't
- Never say "um" before a code line — pause instead, let the code appear, then speak
- The cold open silence is intentional — do not fill it
- The mode switch to fingerspelling should feel effortless — one click, instant transition
- End on the app running, not on your face

---

## THINGS TO NOT SAY
- ~~"This is basically..."~~ — nothing is "basically" anything
- ~~"It's kind of like..."~~ — be direct
- ~~"I'm still working on..."~~ — don't apologize for scope
- ~~"Sorry if..."~~ — no apologies
