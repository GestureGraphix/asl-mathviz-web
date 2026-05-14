# YC Summer Grants 2026 — Demo Video Script
**Target: ~5:30 · Unlisted YouTube · No server. No cloud. All browser.**

---

## PRE-RECORDING CHECKLIST
- [ ] Deploy to Vercel — film from the live URL, not localhost
- [ ] Browser: Chrome, fullscreen, 1920×1080
- [ ] Camera: good lighting, clean background
- [ ] Editor open to: `workers/mediapipe.worker.ts`, `workers/inference.worker.ts`, `lib/features.ts`, `lib/phonology.ts`
- [ ] Practice signs ready for **50 signs** mode: pick 6 from different clusters (e.g. HELLO, THANK_YOU, LEARN, WHERE, MOTHER, MORE)
- [ ] Practice signs ready for **2,279 signs** mode: signs outside the 50-word vocab — show the scale
- [ ] Practice fingerspelling: Y-A-L-E
- [ ] **Start recording on the landing page** `/` — scroll to math section is the first shot
- [ ] Demo pre-loaded in a background tab: `/demo` — camera permission granted, `50 signs` selected
- [ ] Confirm demo status = "live", sidebar shows Phonological Features + Codebook + Minimal Pair

---

## SEGMENT 0 — Landing Page / Math Foundation `0:00–0:30`
*Start on the landing page. Scroll slowly down to the math section.*

**Action:**
1. Land on `/` — let the hero animate in (2–3 seconds)
2. Scroll down to the MathSection — five formula cards come into view
3. Scroll slowly past three of them: Battison Dominance Constraint → Sim(3) Normalization → Feature Vector
4. Do not stop or zoom — let the cards pass at reading pace

**Say:**
> "Before the demo — the math the system is built on.
> Battison's Dominance Constraint collapses the sign space from 1,225 possible
> handshape pairs to 315 — a linguistic result from 1978, no ML required.
> Sim(3) normalization removes position, scale, and yaw from every frame
> so the model never sees where you're standing, only how you're signing.
> And the output is a 51-dimensional phonological feature vector —
> not pixels, not learned embeddings. ASL linguistics."

**Action:** Click into the demo (tab switch or nav link). Camera should already be live.

---

## SEGMENT 1 — Cold Open `0:30–1:00`
*No talking. Hands in frame. App running in 50-sign mode.*

**Action:**
1. Sign 4–5 signs back to back with natural pauses between them
2. Let the scene run: 3D hand skeleton morphing, spectrogram scrolling at the bottom, phonology arcs firing on each prediction, transcript building in the footer
3. On the last sign — hold the pose for 2 seconds. Let the commit animate in.

> **Say nothing. Let the full pipeline speak.**

---

## SEGMENT 2 — Architecture `1:00–1:40`
*Switch to editor. Show file tree.*

```
workers/
  mediapipe.worker.ts    ← Hand + Pose + Face landmarks (543 points)
  inference.worker.ts    ← BiLSTM (50 signs) + Transformer (2,279 signs) + MLP (A–Z)
lib/
  features.ts            ← 51-dim phonological feature vector
  phonology.ts           ← u^N non-manual markers (gaze, mouth, brow)
```

**Say:**
> "Everything you just saw runs entirely in the browser — no server, no API calls, no cloud.
> Two Web Workers running in parallel: one for MediaPipe, extracting 543 body landmarks
> every frame, one for ONNX Runtime running three models — a BiLSTM for the 50-sign vocab,
> a transformer for 2,279 signs, and an MLP for fingerspelling.
> They never touch the main thread."

**Action:** Open `workers/mediapipe.worker.ts`, scroll to the `postMessage` with transferables.

```ts
if (left_hand)  transferables.push(left_hand.buffer  as ArrayBuffer);
if (right_hand) transferables.push(right_hand.buffer as ArrayBuffer);
if (pose)       transferables.push(pose.buffer       as ArrayBuffer);
if (face)       transferables.push(face.buffer       as ArrayBuffer);

self.postMessage(payload, transferables);
```

**Say:**
> "I'm not copying landmark data between threads — I'm transferring ownership
> of the raw ArrayBuffer. Zero-copy. The sender loses access the moment it crosses
> the thread boundary. Hands, pose, and 468 face landmarks — all in one transfer."

---

## SEGMENT 3 — 51-D Phonological Feature Vector `1:40–2:30`
*Open `lib/features.ts`, scroll to the feature extraction block.*

```ts
const u_H = computeHandshape(normL, normR);    // ℝ¹⁶ — handshape
const u_L = computeLocation(normL, normR);     // ℝ⁶  — location
const u_O = computeOrientation(normL, normR);  // ℝ⁶  — orientation
const u_M = computeMovement(normL, normR, ...);// ℝ¹⁸ — movement
```

*Open `lib/phonology.ts`, scroll to `computeNonManual`.*

```ts
return new Float32Array([gaze[0], gaze[1], gaze[2], mouthAp, browH]);
```

**Say:**
> "Each frame I extract a 51-dimensional phonological feature vector.
> Not raw pixels — four articulatory parameters grounded in ASL linguistics:
> handshape, location, orientation, movement. Plus a fifth: non-manual markers.
> Gaze direction, mouth aperture, brow height — all from the 468-point face mesh.
> This is what the BiLSTM actually sees."

**Action:** Switch to the app → move your hand and face → point at the PhonologyBars
updating live in the sidebar.

**Say:**
> "H, L, O, M updating every frame. The non-manual channel is running too —
> that's what separates a yes/no question from a statement in ASL. Same hands,
> different grammar. The model needs to see it."

---

## SEGMENT 4 — Sign Boundary Detection `2:30–3:00`
*Open `workers/inference.worker.ts`, scroll to boundary detection.*

```ts
if (movNorm < REST_NORM_THRESHOLD) {
  restCounter++;
} else {
  restCounter = 0;
}

if (restCounter === REST_FRAMES && ringBuffer.length >= MIN_SIGN_FRAMES) {
  const result = await runInference();
  ringBuffer.length = 0;
```

**Say:**
> "There's no external segmentation model. I detect sign boundaries by watching
> the L2 norm of u^M — the movement sub-vector. When it drops below threshold
> for four consecutive frames, I run inference on the accumulated ring buffer
> and commit the result. That's it. Linguistically grounded — signers actually
> pause between signs — not a hack."

**Action:** Switch to app. Sign 4–5 signs. Watch the TranscriptStrip build.

**Say:**
> "Each gloss in that transcript is a committed prediction. The model only fires
> at sign boundaries, not on every frame."

---

## SEGMENT 5 — 2,279-Sign Model `3:00–3:40`
*Click the `2,279 signs` button in the top-left pill.*

Sidebar switches to Top-5 Predictions panel with live confidence bars.

**Action:** Sign things outside the 50-word vocab. Watch the top-5 update in real time
as the model is actively thinking (live state), then commit.

**Say:**
> "One click — same pipeline, different model. The inference worker swaps to
> a transformer trained across 2,279 glosses from ASL Citizen and WLASL.
> The feature extraction is identical — same 51 dimensions — the model on top just changed."

**Action:** Sign a few more. Show top-5 probabilities shifting live in the sidebar.

**Say:**
> "The top-5 while the model is thinking — you're watching the posterior
> redistribute in real time before it commits."

*Click back to `50 signs`.*

---

## SEGMENT 6 — Fingerspelling `3:40–4:05`
*Click `A–Z` in the pill.*

**Action:** Fingerspell Y-A-L-E. Each letter appears live.

**Say:**
> "Same inference worker, third model — a 13-feature MLP for individual letters.
> Hand geometry only, no movement, no face. Majority-vote smoother over a
> sliding window stabilizes the output. Different linguistic structure,
> different architecture, same real-time loop."

*Click back to `50 signs`.*

---

## SEGMENT 7 — Minimal Pair + Geodesic `4:05–4:50`
*50-sign mode. Sign something that has a minimal pair — MOTHER, FATHER, MORE, SAME.*

The sidebar MinimalPairPanel activates: shows the two signs on a disambiguation track
with a live cursor tracking your hand.

**Say:**
> "MOTHER and FATHER are a minimal pair — they differ in exactly one phonological
> parameter: contact. Same handshape, same location, same movement. The cursor shows
> where my hand sits on that dimension right now."

**Action:** Click `view geodesic →` in the sidebar.

Geodesic mode fills the screen: 3D avatar morphing between the two signs along the
phonological manifold.

**Say:**
> "Signs aren't labels — they're points in a Riemannian manifold. This walks the
> geodesic between the two signs through the product space of handshape, location,
> and orientation. Recognition triggered geometry. The math isn't decorative — it's live."

**Action:** Drag the interpolation slider slowly from A to B. Pause at midpoint.

---

## SEGMENT 8 — Generate Mode (5 seconds) `4:50–5:00`
*Click Generate in the header.*

**Action:** Type or click a gloss from the list — avatar animates to that sign.

**Say (one line):**
> "And forward — I can drive the avatar directly from the phonological representation,
> without a camera."

*Click back to Recognize mode.*

---

## SEGMENT 9 — Close `5:00–5:30`
*50-sign mode. Hands in frame. No cuts.*

**Action:** Sign 4–5 signs continuously. Let the full scene run — 3D skeleton, spectrogram
scrolling, arcs firing, transcript building. Hold the last sign.

**Say (quietly, over the live scene):**
> "Three models, two Web Workers, 51 phonological dimensions, zero server calls.
> Real-time ASL recognition — signs, fingerspelling, and the math behind both —
> running entirely in the browser."

Let the transcript sit for the final 8 seconds. End there.

---

## KEY LINES TO MEMORIZE
Practice until natural — these are the sentences the reviewer will remember:

1. **"No server, no cloud. Two Web Workers, zero-copy ArrayBuffer transfer."**
2. **"51-dimensional phonological feature vector — not pixels, not embeddings. ASL linguistics."**
3. **"Sign boundaries from the L2 norm of the movement sub-vector. Linguistically grounded, not a hack."**
4. **"Same pipeline, different model. BiLSTM for 50 signs, transformer for 2,279, MLP for letters."**
5. **"Non-manual markers — gaze, mouth aperture, brow height — from 468 face landmarks. That's what separates a question from a statement in ASL."**
6. **"Recognition triggered geometry. The math isn't decorative — it's live."**
7. **"Three models, two workers, 51 dimensions, zero server calls."**

---

## PACING NOTES
- Talk slower than feels natural — you know this cold, the reviewer doesn't
- Never say "um" before a code line — pause instead, let the code appear, then speak
- Cold open silence is intentional — do not fill it
- The 3-way model pill switch should feel instant and effortless — click, done
- When the geodesic is morphing, let it breathe — don't talk over the animation
- End on the app running, not on your face

---

## THINGS TO NOT SAY
- ~~"This is basically..."~~ — nothing is "basically" anything
- ~~"It's kind of like..."~~ — be direct
- ~~"I'm still working on..."~~ — don't apologize for scope
- ~~"Sorry if..."~~ — no apologies
- ~~"As you can see..."~~ — they can see it

---

## PAGE / MODE STATE BY SEGMENT

| Segment | Page | Mode toggle | Sidebar shows |
|---------|------|------------|---------------|
| 0 Landing / Math | `/` | — | 5 formula cards scrolling |
| 1 Cold open | `/demo` | 50 signs | Phonology + Codebook + Minimal Pair |
| 2 Architecture | editor | — | — |
| 3 Features | editor → `/demo` | 50 signs | Phonology bars live |
| 4 Boundaries | editor → `/demo` | 50 signs | Transcript building |
| 5 2,279 signs | `/demo` | **2,279 signs** | Top-5 with confidence bars |
| 6 Fingerspelling | `/demo` | **A–Z** | Phonology bars only |
| 7 Minimal pair | `/demo` | **50 signs** | Minimal Pair → Geodesic full screen |
| 8 Generate | `/demo` | **Generate** | — (full screen avatar) |
| 9 Close | `/demo` | **50 signs** | Full pipeline |
