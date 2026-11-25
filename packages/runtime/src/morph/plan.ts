import { at as nth, type Style } from '@autosvg/core'
import { type Cubic, mid, r2, reverseCurve, subdivide } from './curves.ts'
import { type Stroke, strokesOf } from './strokes.ts'

// ---------- pairing and alignment ----------

// Two strokes are paired when moving one into the other costs less than fading both: a long stroke is worth keeping on
// screen (it would be a hole in the morph if it faded), a short tick is not.
const costOf = (a: Stroke, b: Stroke): number =>
  Math.hypot(a.cx - b.cx, a.cy - b.cy) + 0.2 * Math.abs(a.len - b.len) + (a.closed !== b.closed ? 2 : 0)
const fadeCost = (s: Stroke): number => 4 + 0.5 * s.len

interface Pairing {
  /** indexes into the first and second vector's strokes */
  pairs: { i: number; j: number; cost: number; limit: number }[]
  /** strokes of the first vector with no partner (they fade out) */
  outs: number[]
  /** strokes of the second vector with no partner (they fade in) */
  ins: number[]
}

function pair(A: readonly Stroke[], B: readonly Stroke[]): Pairing {
  const all: Pairing['pairs'] = []
  for (const [i, a] of A.entries()) {
    for (const [j, b] of B.entries()) all.push({ i, j, cost: costOf(a, b), limit: fadeCost(a) + fadeCost(b) })
  }
  all.sort((x, y) => x.cost - y.cost)
  const usedA = new Set<number>()
  const usedB = new Set<number>()
  const pairs: Pairing['pairs'] = []
  for (const p of all) {
    if (usedA.has(p.i) || usedB.has(p.j) || p.cost > p.limit) continue
    usedA.add(p.i)
    usedB.add(p.j)
    pairs.push(p)
  }
  return {
    pairs,
    outs: A.map((_, i) => i).filter((i) => !usedA.has(i)),
    ins: B.map((_, j) => j).filter((j) => !usedB.has(j)),
  }
}

const rotate = (curves: readonly Cubic[], k: number): Cubic[] => curves.slice(k).concat(curves.slice(0, k))
const reversed = (curves: readonly Cubic[]): Cubic[] => curves.map(reverseCurve).reverse()
const gap = (a: readonly Cubic[], b: readonly Cubic[]): number => {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const ca = nth(a, i)
    const cb = nth(b, i)
    const [ax, ay] = mid(ca)
    const [bx, by] = mid(cb)
    sum += (ax - bx) ** 2 + (ay - by) ** 2 + (ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2
  }
  return sum
}

/** Give two strokes the same number of curves and choose the start point and direction that line them up best. */
function align(a: Stroke, b: Stroke): { from: Cubic[]; to: Cubic[]; move: number } {
  const count = Math.max(a.curves.length, b.curves.length)
  const ca = subdivide(a.curves, count)
  const cb = subdivide(b.curves, count)
  let best = { cost: Number.POSITIVE_INFINITY, from: ca, to: cb }
  for (const flip of [false, true]) {
    const base = flip ? reversed(cb) : cb
    const shiftsB = b.closed ? count : 1
    const shiftsA = !b.closed && a.closed ? count : 1
    for (let sb = 0; sb < shiftsB; sb++) {
      for (let sa = 0; sa < shiftsA; sa++) {
        const x = rotate(ca, sa)
        const y = rotate(base, sb)
        const cost = gap(x, y)
        if (cost < best.cost) best = { cost, from: x, to: y }
      }
    }
  }
  return { from: best.from, to: best.to, move: Math.sqrt(best.cost / count) }
}

const pathData = (curves: readonly Cubic[]): string => {
  const first = nth(curves, 0)
  let d = `M${r2(first[0])} ${r2(first[1])}`
  for (const c of curves) d += `C${r2(c[2])} ${r2(c[3])} ${r2(c[4])} ${r2(c[5])} ${r2(c[6])} ${r2(c[7])}`
  return d
}

/** A stroke shrunk to its centre: what a stroke with no partner fades from or to. */
const point = (s: Stroke, count: number): Cubic[] => {
  const c: Cubic = [s.cx, s.cy, s.cx, s.cy, s.cx, s.cy, s.cx, s.cy]
  return Array.from({ length: count }, () => c)
}

/** One stroke of a morph: the path it starts as, the path it ends as, and whether it fades. */
export interface MorphStroke {
  from: string
  to: string
  fade: 'in' | 'out' | null
}

export interface MorphPlan {
  strokes: MorphStroke[]
  /** how much of all the ink fades instead of moving, 0 to 1 */
  share: number
  /** how far the moving ink travels on average, in vector units */
  travel: number
  /** the two vectors have little in common: the plain swap suits them better */
  rough: boolean
}

/**
 * The plan for turning vector `from` into vector `to`: one entry per stroke, with the path it starts as, the path it ends as
 * and whether it fades in or out. `rough` is true when the two vectors have little in common (most of the ink has to fade
 * rather than move), in which case the plain swap (swap.css) is the better transition.
 */
export function morphPlan(from: string, to: string, params: Partial<Style> = {}): MorphPlan {
  const A = strokesOf(from, params)
  const B = strokesOf(to, params)
  const { pairs, outs, ins } = pair(A, B)
  const strokes: MorphStroke[] = []
  let moved = 0
  let movedLen = 0
  for (const p of pairs) {
    const a = nth(A, p.i)
    const b = nth(B, p.j)
    const r = align(a, b)
    strokes.push({ from: pathData(r.from), to: pathData(r.to), fade: null })
    moved += r.move * Math.max(a.len, b.len)
    movedLen += Math.max(a.len, b.len)
  }
  for (const i of outs) {
    const a = nth(A, i)
    strokes.push({ from: pathData(a.curves), to: pathData(point(a, a.curves.length)), fade: 'out' })
  }
  for (const j of ins) {
    const b = nth(B, j)
    strokes.push({ from: pathData(point(b, b.curves.length)), to: pathData(b.curves), fade: 'in' })
  }
  const total = (arr: readonly Stroke[]): number => arr.reduce((n, s) => n + s.len, 0)
  const fading = outs.reduce((n, i) => n + nth(A, i).len, 0) + ins.reduce((n, j) => n + nth(B, j).len, 0)
  const share = fading / (total(A) + total(B) || 1) // how much of all the ink fades instead of moving
  const travel = movedLen ? moved / movedLen : 0 // how far the moving ink travels, on average (vector units)
  return { strokes, share: r2(share), travel: r2(travel), rough: share > 0.5 }
}
