/**
 * Sim(3) normalization — Section 6.2
 *
 * Makes hand features invariant to signer position, distance from camera,
 * and body rotation. Uses shoulder midpoint as origin, bi-shoulder width
 * as scale, and yaw rotation to align shoulders to the +x axis.
 *
 * Formula: X̃ = (X - T_t) @ R.T / s_t
 */

export interface Sim3Params {
  scale: number;                // s_t — bi-shoulder width
  tx: number; ty: number; tz: number;  // T_t — shoulder midpoint
  cosA: number; sinA: number;  // yaw rotation coefficients
}

/**
 * Compute Sim(3) parameters from pose landmarks.
 * Returns null if pose is unavailable or degenerate.
 */
export function computeSim3(pose: Float32Array): Sim3Params | null {
  // pose: (99,) = 33 landmarks × 3. Left shoulder=11, right shoulder=12
  const lx = pose[11 * 3],     ly = pose[11 * 3 + 1], lz = pose[11 * 3 + 2];
  const rx = pose[12 * 3],     ry = pose[12 * 3 + 1], rz = pose[12 * 3 + 2];

  const tx = 0.5 * (lx + rx);
  const ty = 0.5 * (ly + ry);
  const tz = 0.5 * (lz + rz);

  const dx = rx - lx, dy = ry - ly, dz = rz - lz;
  const scale = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (scale < 1e-6) return null;

  // Unit shoulder direction in XY plane — matches training: ref[0]=x, ref[1]=y
  // R = [[cosA, sinA, 0], [-sinA, cosA, 0], [0, 0, 1]]
  const cosA = dx / scale;
  const sinA = dy / scale;

  return { scale, tx, ty, tz, cosA, sinA };
}

/**
 * Apply Sim(3) normalization to a hand's 21 landmarks.
 * X̃ = (X - T_t) @ R.T / s_t
 *
 * R = [[cosA, sinA, 0], [-sinA, cosA, 0], [0, 0, 1]]
 * R.T= [[cosA,-sinA, 0], [ sinA, cosA, 0], [0, 0, 1]]
 *
 * Row-vector form: [x,y,z] @ R.T = [cosA*x+sinA*y, -sinA*x+cosA*y, z]
 * Matches training: (hand - T) @ R.T / scale
 */
export function applySim3(hand: Float32Array, p: Sim3Params): Float32Array {
  const { scale, tx, ty, tz, cosA, sinA } = p;
  const out = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    const x = (hand[i * 3]     - tx) / scale;
    const y = (hand[i * 3 + 1] - ty) / scale;
    const z = (hand[i * 3 + 2] - tz) / scale;
    out[i * 3]     =  cosA * x + sinA * y;
    out[i * 3 + 1] = -sinA * x + cosA * y;
    out[i * 3 + 2] =  z;
  }
  return out;
}
