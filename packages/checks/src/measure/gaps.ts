import { K, PX } from './raster.ts'

// ---------- gaps: white channels narrower than minClear that are long enough to fill in ----------
//
// Morphological closing of the ink with a disc of radius minClear/2 fills every white channel
// narrower than minClear. Short fills are just the flare where two strokes meet (a deliberate
// junction); a fill that is long enough is two strokes running too close together.

const MIN_RUN = 3 // units: a filled channel at least this long counts (shorter = junction flare)

/** Two strokes running closer than the minimum clear space. */
export interface NarrowGap {
  /** where, in icon units */
  at: [number, number]
  /** the visible white between the strokes */
  clear: number
  /** how long the channel runs */
  len: number
}

export function narrowGaps(data: Uint8ClampedArray, minClear: number): NarrowGap[] {
  const PAD = 8
  const W = PX + PAD * 2
  const ink = new Uint8Array(W * W)
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) ink[(y + PAD) * W + x + PAD] = (data[(y * PX + x) * 4 + 3] ?? 0) > 127 ? 1 : 0
  }
  const r = minClear / 2 / K - 0.5
  const R = Math.floor(r)
  const offs: number[] = []
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) offs.push(dy * W + dx)

  const dilated = new Uint8Array(W * W)
  for (let i = 0; i < W * W; i++) {
    if (!ink[i]) continue
    for (const o of offs) if (i + o >= 0 && i + o < W * W) dilated[i + o] = 1
  }
  const closed = new Uint8Array(W * W)
  for (let i = 0; i < W * W; i++) {
    if (!dilated[i]) continue
    let all = true
    for (const o of offs) {
      const j = i + o
      if (j < 0 || j >= W * W || !dilated[j]) {
        all = false
        break
      }
    }
    closed[i] = all ? 1 : 0
  }

  // connected components of (closed and not ink) = the filled-in white
  const seen = new Uint8Array(W * W)
  const found: NarrowGap[] = []
  for (let s = 0; s < W * W; s++) {
    if (!closed[s] || ink[s] || seen[s]) continue
    let area = 0
    let sx = 0
    let sy = 0
    let x0 = W
    let y0 = W
    let x1 = 0
    let y1 = 0
    const stack = [s]
    seen[s] = 1
    for (let p = stack.pop(); p !== undefined; p = stack.pop()) {
      const px = p % W
      const py = (p / W) | 0
      area++
      sx += px
      sy += py
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q >= 0 && q < W * W && closed[q] && !ink[q] && !seen[q]) {
          seen[q] = 1
          stack.push(q)
        }
      }
    }
    // the channel's length is its longest side; the visible white is roughly area / length
    const len = Math.max(x1 - x0 + 1, y1 - y0 + 1) * K
    if (len < MIN_RUN) continue
    found.push({
      at: [+((sx / area - PAD + 0.5) * K).toFixed(1), +((sy / area - PAD + 0.5) * K).toFixed(1)],
      clear: +((area * K * K) / len).toFixed(2),
      len: +len.toFixed(1),
    })
  }
  return found.sort((a, b) => a.clear - b.clear)
}
