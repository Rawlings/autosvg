import { PX, rasterise } from './raster.ts'

interface Frame {
  /** alpha per pixel */
  a: Uint8Array
  total: number
  /** the alpha dilated by `reach`, made on first use */
  grown: Uint8Array | null
}

/**
 * The biggest jump between neighbouring frames of an animation, as a share of the ink: how much of one frame's ink (as opacity)
 * is more than `reach` pixels (default 3, three quarters of a vector unit) from any ink of the next, in either direction.
 * Strokes that slide, turn, grow or fade a little stay near where they were and score 0; a part that appears from nowhere or
 * vanishes scores high. A frame with almost no ink (a mirror passing through nothing) is not a jump. Each frame is rasterised
 * once. Returns { jump, at }: the size and the index of the frame it arrives at.
 */
export async function maxJump(svgs: readonly string[], reach = 3): Promise<{ jump: number; at: number }> {
  const frames: Frame[] = []
  for (const svg of svgs) {
    const d = await rasterise(svg, PX)
    const a = new Uint8Array(PX * PX)
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] ?? 0
    frames.push({ a, total: a.reduce((x, y) => x + y, 0), grown: null })
  }
  const grow = (f: Frame): Uint8Array => {
    if (f.grown) return f.grown
    const tmp = new Uint8Array(PX * PX)
    const out = new Uint8Array(PX * PX)
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        let best = 0
        for (let dx = -reach; dx <= reach; dx++) {
          const xx = x + dx
          const v = f.a[y * PX + xx] ?? 0
          if (xx >= 0 && xx < PX && v > best) best = v
        }
        tmp[y * PX + x] = best
      }
    }
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        let best = 0
        for (let dy = -reach; dy <= reach; dy++) {
          const yy = y + dy
          const v = tmp[yy * PX + x] ?? 0
          if (yy >= 0 && yy < PX && v > best) best = v
        }
        out[y * PX + x] = best
      }
    }
    f.grown = out
    return out
  }
  const lost = (f: Frame, other: Frame): number => {
    const g = grow(other)
    let n = 0
    for (let i = 0; i < f.a.length; i++) {
      const v = f.a[i] ?? 0
      const w = g[i] ?? 0
      if (v > w) n += v - w
    }
    return f.total ? n / f.total : 0
  }
  let jump = 0
  let at = 0
  for (let i = 1; i < frames.length; i++) {
    const p = frames[i - 1]
    const c = frames[i]
    if (!p || !c) continue
    if (p.total < 0.15 * c.total || c.total < 0.15 * p.total) continue
    const j = Math.max(lost(p, c), lost(c, p))
    if (j > jump) {
      jump = j
      at = i
    }
  }
  return { jump, at }
}
