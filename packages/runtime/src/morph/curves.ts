import type { Point } from '@autosvg/core'
import { at as nth } from '@autosvg/core'

/** A cubic Bézier: start, two control points, end, as [x0, y0, x1, y1, x2, y2, x3, y3]. */
export type Cubic = readonly [number, number, number, number, number, number, number, number]

export const r2 = (v: number): number => Math.round(v * 100) / 100

export const cubic = (a: Point, b: Point, c: Point, d: Point): Cubic => [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]

/** The point halfway along the parameter. */
export const mid = (c: Cubic): Point => [
  (c[0] + 3 * c[2] + 3 * c[4] + c[6]) / 8,
  (c[1] + 3 * c[3] + 3 * c[5] + c[7]) / 8,
]

/** Approximate length, from eight chords. */
export function length(c: Cubic): number {
  let len = 0
  let px = c[0]
  let py = c[1]
  for (let i = 1; i <= 8; i++) {
    const t = i / 8
    const u = 1 - t
    const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]
    const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7]
    len += Math.hypot(x - px, y - py)
    px = x
    py = y
  }
  return len
}

export const reverseCurve = (c: Cubic): Cubic => [c[6], c[7], c[4], c[5], c[2], c[3], c[0], c[1]]

/** Split at the middle (de Casteljau). */
export function split(c: Cubic): [Cubic, Cubic] {
  const h = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const p0: Point = [c[0], c[1]]
  const p1: Point = [c[2], c[3]]
  const p2: Point = [c[4], c[5]]
  const p3: Point = [c[6], c[7]]
  const a = h(p0, p1)
  const b = h(p1, p2)
  const d = h(p2, p3)
  const e = h(a, b)
  const f = h(b, d)
  const m = h(e, f)
  return [cubic(p0, a, e, m), cubic(m, f, d, p3)]
}

/** Subdivide the longest curve until there are `count` curves. */
export function subdivide(curves: readonly Cubic[], count: number): Cubic[] {
  const out = curves.map((c) => ({ c, len: length(c) }))
  while (out.length < count) {
    let longest = 0
    for (let i = 1; i < out.length; i++) if (nth(out, i).len > nth(out, longest).len) longest = i
    const item = nth(out, longest)
    const [a, b] = split(item.c)
    out.splice(longest, 1, { c: a, len: item.len / 2 }, { c: b, len: item.len / 2 })
  }
  return out.map((o) => o.c)
}

/** A straight line as a cubic. */
export const cubicLine = (x0: number, y0: number, x1: number, y1: number): Cubic => [
  x0,
  y0,
  x0 + (x1 - x0) / 3,
  y0 + (y1 - y0) / 3,
  x0 + (2 * (x1 - x0)) / 3,
  y0 + (2 * (y1 - y0)) / 3,
  x1,
  y1,
]

/** An SVG elliptical arc (endpoint form) as cubic curves, at most a quarter turn each (SVG spec, F.6.5). */
export function arcCurves(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  rot: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): Cubic[] {
  let rx = Math.abs(rxIn)
  let ry = Math.abs(ryIn)
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [cubicLine(x1, y1, x2, y2)]
  const phi = (rot * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const xp = cos * dx + sin * dy
  const yp = -sin * dx + cos * dy
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)
  if (lam > 1) {
    rx *= Math.sqrt(lam)
    ry *= Math.sqrt(lam)
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
  const den = rx * rx * yp * yp + ry * ry * xp * xp
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den))
  const cxp = (co * rx * yp) / ry
  const cyp = (-co * ry * xp) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const th1 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx)
  let dth = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx) - th1
  if (!sweep && dth > 0) dth -= 2 * Math.PI
  if (sweep && dth < 0) dth += 2 * Math.PI
  const count = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9))
  const step = dth / count
  const t = (4 / 3) * Math.tan(step / 4)
  const onEllipse = (px: number, py: number): Point => [
    cx + rx * cos * px - ry * sin * py,
    cy + rx * sin * px + ry * cos * py,
  ]
  const out: Cubic[] = []
  for (let i = 0; i < count; i++) {
    const a = th1 + i * step
    const b = a + step
    const p0 = onEllipse(Math.cos(a), Math.sin(a))
    const p1 = onEllipse(Math.cos(a) - t * Math.sin(a), Math.sin(a) + t * Math.cos(a))
    const p2 = onEllipse(Math.cos(b) + t * Math.sin(b), Math.sin(b) - t * Math.cos(b))
    const p3 = onEllipse(Math.cos(b), Math.sin(b))
    out.push(cubic(p0, p1, p2, p3))
  }
  return out
}
