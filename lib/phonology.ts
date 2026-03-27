/**
 * Phonological feature extraction — Sections 6.3–6.7
 *
 * Implements the five sub-vectors:
 *   u^H ∈ ℝ^16  handshape
 *   u^L ∈ ℝ^6   location
 *   u^O ∈ ℝ^6   orientation
 *   u^M ∈ ℝ^18  movement
 *   u^N ∈ ℝ^5   non-manual
 */

// ── Helpers ──────────────────────────────────────────────────────

/** Extract landmark i as [x, y, z] from a (63,) hand array */
function lm(hand: Float32Array, i: number): [number, number, number] {
  return [hand[i * 3], hand[i * 3 + 1], hand[i * 3 + 2]];
}

/** Extract face landmark i as [x, y, z] from a (1404,) face array */
function fl(face: Float32Array, i: number): [number, number, number] {
  return [face[i * 3], face[i * 3 + 1], face[i * 3 + 2]];
}

function sub(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(a: [number, number, number]): number {
  return Math.sqrt(dot(a, a));
}

function cross(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Angle between two 3D vectors in radians [0, π] — matches training angle_between() */
function angleBetween(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const denom = norm(a) * norm(b);
  if (denom < 1e-8) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot(a, b) / denom));
  return Math.acos(cosTheta);
}

// ── §6.3  Handshape — u^H ∈ ℝ^16 ────────────────────────────────

/**
 * 8D per hand: 5 flexion angles + 3 spread angles.
 *   thumb:  angle(tip - wrist,  index_MCP - wrist)
 *   finger: angle(MCP - wrist,  tip - MCP)          for index..pinky
 *   spread: angle(finger_dir_k, finger_dir_{k+1})   for index-middle, middle-ring, ring-pinky
 */
function handshapeSingle(hand: Float32Array): Float32Array {
  const wrist = lm(hand, 0);

  // Thumb flexion: tip(4) vs index MCP(5) relative to wrist
  const thumbFlexion = angleBetween(
    sub(lm(hand, 4), wrist),
    sub(lm(hand, 5), wrist)
  );

  // Finger flexions: index(1), middle(2), ring(3), pinky(4) → k=1..4
  const flex = new Array(4);
  for (let k = 1; k <= 4; k++) {
    const mcp = lm(hand, 4 * k + 1);  // e.g. index MCP = hand[5]
    const tip = lm(hand, 4 * k + 4);  // e.g. index tip = hand[8]
    flex[k - 1] = angleBetween(sub(mcp, wrist), sub(tip, mcp));
  }

  // Spread angles between adjacent finger directions (tip - MCP)
  const fingerDirs = [1, 2, 3, 4].map((k) =>
    sub(lm(hand, 4 * k + 4), lm(hand, 4 * k + 1))
  ) as [number, number, number][];

  const spread = [
    angleBetween(fingerDirs[0], fingerDirs[1]), // index-middle
    angleBetween(fingerDirs[1], fingerDirs[2]), // middle-ring
    angleBetween(fingerDirs[2], fingerDirs[3]), // ring-pinky
  ];

  return new Float32Array([thumbFlexion, ...flex, ...spread]);
}

export function computeHandshape(
  left: Float32Array | null,
  right: Float32Array | null
): Float32Array {
  const uL = left  ? handshapeSingle(left)  : new Float32Array(8);
  const uR = right ? handshapeSingle(right) : new Float32Array(8);
  const out = new Float32Array(16);
  out.set(uL, 0);
  out.set(uR, 8);
  return out;
}

// ── §6.4  Location — u^L ∈ ℝ^6 ──────────────────────────────────

/** Palm center = mean of wrist + 4 MCP landmarks [0,5,9,13,17] */
export function palmCenter(hand: Float32Array): [number, number, number] {
  const indices = [0, 5, 9, 13, 17];
  let x = 0, y = 0, z = 0;
  for (const i of indices) {
    x += hand[i * 3];
    y += hand[i * 3 + 1];
    z += hand[i * 3 + 2];
  }
  return [x / 5, y / 5, z / 5];
}

export function computeLocation(
  left: Float32Array | null,
  right: Float32Array | null
): Float32Array {
  const out = new Float32Array(6);
  if (left)  { const c = palmCenter(left);  out[0]=c[0]; out[1]=c[1]; out[2]=c[2]; }
  if (right) { const c = palmCenter(right); out[3]=c[0]; out[4]=c[1]; out[5]=c[2]; }
  return out;
}

// ── §6.5  Orientation — u^O ∈ ℝ^6 ───────────────────────────────

/** Unit palm normal via cross product of two in-plane vectors */
export function palmNormal(hand: Float32Array): [number, number, number] {
  const v1 = sub(lm(hand, 5),  lm(hand, 0));  // index_MCP - wrist
  const v2 = sub(lm(hand, 17), lm(hand, 0));  // pinky_MCP - wrist
  const n  = cross(v1, v2);
  const mag = norm(n) + 1e-8;
  return [n[0] / mag, n[1] / mag, n[2] / mag];
}

export function computeOrientation(
  left: Float32Array | null,
  right: Float32Array | null
): Float32Array {
  const out = new Float32Array(6);
  if (left)  { const n = palmNormal(left);  out[0]=n[0]; out[1]=n[1]; out[2]=n[2]; }
  if (right) { const n = palmNormal(right); out[3]=n[0]; out[4]=n[1]; out[5]=n[2]; }
  return out;
}

// ── §6.6  Movement — u^M ∈ ℝ^18 ─────────────────────────────────

export interface MovementState {
  prevCenter:   [number, number, number] | null;
  prevVelocity: [number, number, number] | null;
  prevNormal:   [number, number, number] | null;
}

export function makeMovementState(): MovementState {
  return { prevCenter: null, prevVelocity: null, prevNormal: null };
}

/**
 * 9D per hand: Δcenter (3) + Δ²center (3) + Δnormal (3)
 * Updates state in-place.
 */
function movementSingle(
  hand: Float32Array | null,
  state: MovementState
): Float32Array {
  const out = new Float32Array(9);

  if (!hand) {
    state.prevCenter   = null;
    state.prevVelocity = null;
    state.prevNormal   = null;
    return out;
  }

  const center = palmCenter(hand);
  const normal = palmNormal(hand);

  if (state.prevCenter && state.prevNormal) {
    const vel: [number, number, number] = [
      center[0] - state.prevCenter[0],
      center[1] - state.prevCenter[1],
      center[2] - state.prevCenter[2],
    ];

    const acc: [number, number, number] = state.prevVelocity
      ? [vel[0]-state.prevVelocity[0], vel[1]-state.prevVelocity[1], vel[2]-state.prevVelocity[2]]
      : [0, 0, 0];

    const dNorm: [number, number, number] = [
      normal[0] - state.prevNormal[0],
      normal[1] - state.prevNormal[1],
      normal[2] - state.prevNormal[2],
    ];

    out.set(vel,   0);
    out.set(acc,   3);
    out.set(dNorm, 6);

    state.prevVelocity = vel;
  }

  state.prevCenter = center;
  state.prevNormal = normal;
  return out;
}

export function computeMovement(
  left: Float32Array | null,
  right: Float32Array | null,
  stateL: MovementState,
  stateR: MovementState
): Float32Array {
  const out = new Float32Array(18);
  out.set(movementSingle(left,  stateL), 0);
  out.set(movementSingle(right, stateR), 9);
  return out;
}

// ── §6.7  Non-manual — u^N ∈ ℝ^5 ────────────────────────────────

/**
 * From 468-point face mesh:
 *   gaze[0..2]: 0.5 * ((face[33]-face[362]) + (face[133]-face[263]))
 *   mouth_ap:   ‖face[13]-face[14]‖
 *   brow_h:     face[65,y] - face[159,y]
 */
// ── Fingerspelling: exact replica of notebook extract_h_augmented ────────────

// MediaPipe 21-point hand landmark indices (matches notebook constants)
const FS_MCP = [2, 5, 9, 13, 17];  // THUMB_MCP, IDX_MCP, MID_MCP, RNG_MCP, PNK_MCP
const FS_TIP = [4, 8, 12, 16, 20]; // THUMB_TIP, IDX_TIP, MID_TIP, RNG_TIP, PNK_TIP
const FS_PIP = [3, 6, 10, 14, 18]; // THUMB_IP,  IDX_PIP, MID_PIP, RNG_PIP, PNK_PIP

/**
 * Replicates Python extract_h_augmented(lm) — 13-dim per hand.
 * Normalizes by centering at wrist and scaling by wrist→MID_MCP distance.
 * Uses raw (pre-Sim3) landmarks so geometry matches training exactly.
 */
export function fingerspellingH(hand: Float32Array): Float32Array {
  // Center at wrist (index 0), scale by wrist→MID_MCP (index 9) distance
  const wx = hand[0], wy = hand[1], wz = hand[2];
  const scale = Math.sqrt(
    (hand[27] - wx) ** 2 + (hand[28] - wy) ** 2 + (hand[29] - wz) ** 2
  ) + 1e-8; // hand[9*3]=27, hand[9*3+1]=28, hand[9*3+2]=29

  function nlm(i: number): [number, number, number] {
    return [
      (hand[i * 3]     - wx) / scale,
      (hand[i * 3 + 1] - wy) / scale,
      (hand[i * 3 + 2] - wz) / scale,
    ];
  }

  const origin: [number, number, number] = [0, 0, 0]; // wrist after normalization
  const features: number[] = [];

  // 5 MCP flexion: angle(MCP − wrist, TIP − MCP)
  for (let i = 0; i < 5; i++) {
    const mcp = nlm(FS_MCP[i]);
    features.push(angleBetween(sub(mcp, origin), sub(nlm(FS_TIP[i]), mcp)));
  }

  // 3 abduction: angle(MCP[i] − wrist, MCP[i+1] − wrist)
  for (let i = 1; i < 4; i++) {
    features.push(angleBetween(sub(nlm(FS_MCP[i]), origin), sub(nlm(FS_MCP[i + 1]), origin)));
  }

  // 5 PIP flexion: angle(PIP − MCP, TIP − PIP)
  for (let i = 0; i < 5; i++) {
    const mcp = nlm(FS_MCP[i]);
    const pip = nlm(FS_PIP[i]);
    features.push(angleBetween(sub(pip, mcp), sub(nlm(FS_TIP[i]), pip)));
  }

  return new Float32Array(features); // (13,)
}

export function computeNonManual(face: Float32Array | null): Float32Array {
  if (!face) return new Float32Array(5);

  const gaze = [
    0.5 * ((fl(face, 33)[0] - fl(face, 362)[0]) + (fl(face, 133)[0] - fl(face, 263)[0])),
    0.5 * ((fl(face, 33)[1] - fl(face, 362)[1]) + (fl(face, 133)[1] - fl(face, 263)[1])),
    0.5 * ((fl(face, 33)[2] - fl(face, 362)[2]) + (fl(face, 133)[2] - fl(face, 263)[2])),
  ];

  const mouthVec = sub(fl(face, 13), fl(face, 14));
  const mouthAp  = norm(mouthVec as [number,number,number]);

  const browH = fl(face, 65)[1] - fl(face, 159)[1];

  return new Float32Array([gaze[0], gaze[1], gaze[2], mouthAp, browH]);
}
