import { SPEC } from '@icon-canvas/core'
import { minGap } from '../style.ts'
import { type NarrowGap, narrowGaps } from './gaps.ts'
import { K, PX, rasterise } from './raster.ts'

/** What one raster of an icon says about it. Units are the 24 grid. */
export interface Measurement {
  /** share of the canvas covered by ink */
  coverage: number
  /** centre of mass */
  cx: number
  cy: number
  /** centre of the drawn extent */
  bx: number
  by: number
  /** drawn extent */
  w: number
  h: number
  gaps: NarrowGap[]
}

/**
 * Everything we measure about an icon from one raster:
 * ink coverage, optical centre (centre of mass), true extent, and narrow gaps. Units are the 24 grid.
 */
export async function analyse(svg: string): Promise<Measurement> {
  const data = await rasterise(svg, PX)
  let sum = 0
  let sx = 0
  let sy = 0
  let x0 = PX
  let y0 = PX
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      const a = data[(y * PX + x) * 4 + 3] ?? 0
      if (!a) continue
      sum += a
      sx += a * (x + 0.5)
      sy += a * (y + 0.5)
      if (a > 40) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (!sum)
    return {
      coverage: 0,
      cx: SPEC.size / 2,
      cy: SPEC.size / 2,
      bx: SPEC.size / 2,
      by: SPEC.size / 2,
      w: 0,
      h: 0,
      gaps: [],
    }
  return {
    coverage: sum / 255 / (PX * PX),
    cx: (sx / sum) * K, // centre of mass
    cy: (sy / sum) * K,
    bx: ((x0 + x1 + 1) / 2) * K, // centre of the drawn extent
    by: ((y0 + y1 + 1) / 2) * K,
    w: (x1 - x0 + 1) * K,
    h: (y1 - y0 + 1) * K,
    gaps: narrowGaps(data, minGap()),
  }
}
