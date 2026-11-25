import { DEFAULT_STYLE } from '@autosvg/core'
import { renderIcon } from '@autosvg/runtime'
import { VECTORS } from '@autosvg/vectors'
import { PX, rasterise } from './measure/raster.ts'

/** An existing vector that looks like another one, and by how much they differ (0 = identical, 1 = nothing in common). */
export interface Neighbour {
  name: string
  diff: number
}

/** A vector's ink, as a mask, and the same ink grown by `GROW` pixels: how far a stroke may sit from its twin and still be "the same". */
interface Mask {
  ink: Uint8Array
  grown: Uint8Array
  count: number
}

/** Pixels (4 per vector unit): 2 is half a unit. Larger and every thin outline matches every other. */
const GROW = 2

const masks = new Map<string, Mask>()

/** The mask grown in a square by `r` pixels (two passes, one per axis). */
function grow(ink: Uint8Array, r: number): Uint8Array {
  const across = new Uint8Array(PX * PX)
  const out = new Uint8Array(PX * PX)
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      for (let d = -r; d <= r; d++) {
        const xx = x + d
        if (xx >= 0 && xx < PX && ink[y * PX + xx]) {
          across[y * PX + x] = 1
          break
        }
      }
    }
  }
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      for (let d = -r; d <= r; d++) {
        const yy = y + d
        if (yy >= 0 && yy < PX && across[yy * PX + x]) {
          out[y * PX + x] = 1
          break
        }
      }
    }
  }
  return out
}

async function maskOf(name: string): Promise<Mask> {
  const svg = renderIcon(name, DEFAULT_STYLE, { inline: true })
  const known = masks.get(svg)
  if (known) return known
  const data = await rasterise(svg, PX)
  const ink = new Uint8Array(PX * PX)
  let count = 0
  for (let i = 0; i < ink.length; i++) {
    if ((data[i * 4 + 3] ?? 0) > 127) {
      ink[i] = 1
      count++
    }
  }
  const mask = { ink, grown: grow(ink, GROW), count }
  masks.set(svg, mask)
  return mask
}

/** How much of `a`'s ink lies within a stroke's width of `b`'s ink, and the other way round, as 1 - the mean. 0 means the same drawing. */
function difference(a: Mask, b: Mask): number {
  let aNearB = 0
  let bNearA = 0
  for (let i = 0; i < a.ink.length; i++) {
    if (a.ink[i] && b.grown[i]) aNearB++
    if (b.ink[i] && a.grown[i]) bNearA++
  }
  if (!a.count || !b.count) return 1
  return 1 - (aNearB / a.count + bNearA / b.count) / 2
}

/** For each name, the `k` other vectors of the set that look most like it. A vector that is almost another one is a second copy. */
export async function nearestVectors(names: readonly string[], k = 3): Promise<Record<string, Neighbour[]>> {
  const all = new Map<string, Mask>()
  const vectors = VECTORS.map((i) => i.name)
  for (let i = 0; i < vectors.length; i += 32) {
    const chunk = vectors.slice(i, i + 32)
    const drawn = await Promise.all(chunk.map(maskOf))
    for (const [j, name] of chunk.entries()) {
      const mask = drawn[j]
      if (mask) all.set(name, mask)
    }
  }
  const out: Record<string, Neighbour[]> = {}
  for (const name of names) {
    const mine = all.get(name)
    if (!mine) continue
    out[name] = vectors
      .filter((other) => other !== name)
      .flatMap((other) => {
        const theirs = all.get(other)
        return theirs ? [{ name: other, diff: +difference(mine, theirs).toFixed(3) }] : []
      })
      .sort((x, y) => x.diff - y.diff)
      .slice(0, k)
  }
  return out
}
