// Pure geometry helpers for building icon paths. No DOM, so the Node build script and the
// browser share them. They replace hand-computing arc flags and control points.

import { at, type Circle, last, type Point } from './util.ts'

export type { Circle, Point }

const TAU = Math.PI * 2
const n = (v: number): number => +v.toFixed(2)
const pt = ([x, y]: Point): string => `${n(x)} ${n(y)}`

export const snap = (v: number, grid = 0.5): number => Math.round(v / grid) * grid

/** One Catmull-Rom segment from p1 to p2 as a cubic, with p0 and p3 the neighbours that set its tangents. */
function smoothSegment(p0: Point, p1: Point, p2: Point, p3: Point): string {
  const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  return `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
}

/**
 * Closed superellipse |x/rx|^e + |y/ry|^e = 1 as a smooth cubic path. e = 2 is an ellipse, e = 4 a squircle.
 * Sampled, then joined with Catmull-Rom curves so the tangent is continuous everywhere (no kinks).
 */
export function superellipse(cx: number, cy: number, rx: number, ry: number, exponent: number, count = 16): string {
  // 16 segments, not more: the points are rounded to 2 decimals, and on a small circle a short segment's
  // control handle is so short that the rounding alone would bend its tangent by several degrees.
  const pts: Point[] = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([
      cx + rx * Math.sign(c) * Math.abs(c) ** (2 / exponent),
      cy + ry * Math.sign(s) * Math.abs(s) ** (2 / exponent),
    ])
  }
  let d = `M${pt(at(pts, 0))}`
  for (let i = 0; i < count; i++) {
    d += smoothSegment(at(pts, (i - 1 + count) % count), at(pts, i), at(pts, (i + 1) % count), at(pts, (i + 2) % count))
  }
  return `${d}Z`
}

/** Point on a circle. Angles in degrees, 0 = right, 90 = down (screen coordinates). */
export const polar = (cx: number, cy: number, r: number, deg: number): Point => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy + r * Math.sin((deg * Math.PI) / 180),
]

/**
 * Translate several point lists together so their combined bounding box is centred on the canvas
 * (shift snapped to 0.25). Returns the translated lists in the same order.
 */
export function centreOn(...groups: Point[][]): Point[][] {
  const all = groups.flat()
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const snap25 = (v: number) => Math.round(v * 4) / 4
  const dx = snap25(12 - (Math.min(...xs) + Math.max(...xs)) / 2)
  const dy = snap25(12 - (Math.min(...ys) + Math.max(...ys)) / 2)
  return groups.map((g) => g.map(([x, y]): Point => [x + dx, y + dy]))
}

/** Reflect points across the vertical axis x = axis (default: icon centre). */
export const mirrorX = (pts: readonly Point[], axis = 12): Point[] => pts.map(([x, y]): Point => [2 * axis - x, y])

/**
 * Build a symmetric outline from its left half only.
 * `left` runs top to bottom along the left side; the right side is mirrored and reversed.
 */
export const symmetric = (left: readonly Point[], axis = 12): Point[] => [
  ...left,
  ...mirrorX(
    left.filter(([x]) => x !== axis),
    axis,
  ).reverse(), // points on the axis are not duplicated
]

/** Arc along circle `c` ({cx, cy, r}) from point `from` to point `to`. Flags are computed for you. */
export function arcOn(c: Circle, from: Point, to: Point, clockwise = true): string {
  const a1 = Math.atan2(from[1] - c.cy, from[0] - c.cx)
  const a2 = Math.atan2(to[1] - c.cy, to[0] - c.cx)
  let d = clockwise ? a2 - a1 : a1 - a2
  d = ((d % TAU) + TAU) % TAU
  return `A${n(c.r)} ${n(c.r)} 0 ${d > Math.PI ? 1 : 0} ${clockwise ? 1 : 0} ${pt(to)}`
}

/** The two intersection points of circles a and b. */
export function intersect(a: Circle, b: Circle): [Point, Point] {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const d = Math.hypot(dx, dy)
  if (d > a.r + b.r || d < Math.abs(a.r - b.r)) throw new Error('circles do not intersect')
  const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, a.r * a.r - l * l))
  const x = a.cx + (l * dx) / d
  const y = a.cy + (l * dy) / d
  return [
    [x + (h * dy) / d, y - (h * dx) / d],
    [x - (h * dy) / d, y + (h * dx) / d],
  ]
}

/**
 * Outline of overlapping circles sitting on a flat base (a cloud, a bush, a speech blob).
 * `circles` are ordered left to right; the first and last must rest on `baseY` (cy + r = baseY).
 * Neighbouring circles must overlap. Returns a closed path through the upper intersections.
 */
export function circleChain(circles: readonly Circle[], baseY: number): string {
  const first = at(circles, 0)
  const end = last(circles)
  let d = `M${pt([first.cx, baseY])}`
  let cur: Point = [first.cx, baseY]
  for (let i = 0; i < circles.length - 1; i++) {
    const here = at(circles, i)
    const [p, q] = intersect(here, at(circles, i + 1))
    const up = p[1] < q[1] ? p : q
    d += arcOn(here, cur, up)
    cur = up
  }
  d += `${arcOn(end, cur, [end.cx, baseY])}Z`
  return d
}

/**
 * Polygon with filleted corners. `radius` is a number or one radius per vertex (0 = sharp).
 * Corner arcs are tangent to both edges, so the shape never kinks.
 */
export function roundedPolygon(pts: readonly Point[], radius: number | readonly number[] = 1): string {
  const rad = typeof radius === 'number' ? pts.map(() => radius) : radius
  const corners = fillets(pts, rad, true)
  let d = ''
  for (const [i, c] of corners.entries()) {
    d += `${i === 0 ? 'M' : 'L'}${pt(c.a)}`
    if (!c.sharp) d += `A${n(c.r)} ${n(c.r)} 0 0 ${c.sweep} ${pt(c.b)}`
    else d += `L${pt(c.cur)}`
  }
  return `${d}Z`
}

/**
 * Open path through `pts` with filleted inner corners. The two end points are free (never rounded),
 * so a fillet beside an end may use that whole edge. Same tangent arcs as roundedPolygon.
 */
export function roundedPolyline(pts: readonly Point[], radius: number | readonly number[] = 1): string {
  const rad = (typeof radius === 'number' ? pts.map(() => radius) : radius).slice()
  rad[0] = 0
  rad[pts.length - 1] = 0
  const corners = fillets(pts, rad, false)
  let d = `M${pt(at(pts, 0))}`
  for (let i = 1; i < pts.length - 1; i++) {
    const c = at(corners, i)
    d += `L${pt(c.a)}`
    if (!c.sharp) d += `A${n(c.r)} ${n(c.r)} 0 0 ${c.sweep} ${pt(c.b)}`
    else d += `L${pt(c.cur)}`
  }
  return `${d}L${pt(last(pts))}`
}

/** Fillet geometry for every vertex: tangent points a (on the incoming edge) and b (on the outgoing edge). */
interface Fillet {
  /** tangent point on the incoming edge */
  a: Point
  /** tangent point on the outgoing edge */
  b: Point
  r: number
  sweep: 0 | 1
  sharp: boolean
  cur: Point
}

function fillets(pts: readonly Point[], rad: readonly number[], closed: boolean): Fillet[] {
  const N = pts.length
  const unit = (a: Point, b: Point): [number, number, number] => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    return [dx / l, dy / l, l]
  }
  return pts.map((cur, i): Fillet => {
    if (!closed && (i === 0 || i === N - 1)) return { a: cur, b: cur, r: 0, sweep: 0, sharp: true, cur }
    const prev = at(pts, (i - 1 + N) % N)
    const next = at(pts, (i + 1) % N)
    const [ux, uy, l1] = unit(cur, prev)
    const [vx, vy, l2] = unit(cur, next)
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)))
    const own = at(rad, i)
    let t = own > 0 ? own / Math.tan(ang / 2) : 0
    // two fillets share an edge, so each may take half of it; next to a sharp corner it may take all of it
    t = Math.min(t, at(rad, (i - 1 + N) % N) > 0 ? l1 / 2 : l1, at(rad, (i + 1) % N) > 0 ? l2 / 2 : l2)
    const r = t * Math.tan(ang / 2)
    // travelling prev -> cur -> next: a right turn on screen is clockwise (sweep 1)
    const sweep = -(ux * vy - uy * vx) > 0 ? 1 : 0
    const a: Point = [cur[0] + ux * t, cur[1] + uy * t]
    const b: Point = [cur[0] + vx * t, cur[1] + vy * t]
    return { a, b, r, sweep, sharp: t === 0, cur }
  })
}

/** Where a ray from the centre of a superellipse (exponent e, radius r) in direction (dx, dy) meets its outline. */
export function superPoint(cx: number, cy: number, r: number, e: number, dx: number, dy: number): Point {
  const l = Math.hypot(dx, dy)
  const ux = dx / l
  const uy = dy / l
  const t = r / (Math.abs(ux) ** e + Math.abs(uy) ** e) ** (1 / e)
  return [cx + ux * t, cy + uy * t]
}

/**
 * Part of a superellipse outline, from angle deg0 to deg1 (degrees, 0 = right, 90 = down), as a smooth
 * open path. e = 2 is a circular arc.
 */
export function superArc(cx: number, cy: number, r: number, e: number, deg0: number, deg1: number, count = 14): string {
  const pts: Point[] = []
  for (let i = 0; i < count; i++) {
    const t = ((deg0 + ((deg1 - deg0) * i) / (count - 1)) * Math.PI) / 180
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([cx + r * Math.sign(c) * Math.abs(c) ** (2 / e), cy + r * Math.sign(s) * Math.abs(s) ** (2 / e)])
  }
  let d = `M${pt(at(pts, 0))}`
  for (let i = 0; i < count - 1; i++) {
    d += smoothSegment(at(pts, Math.max(i - 1, 0)), at(pts, i), at(pts, i + 1), at(pts, Math.min(i + 2, count - 1)))
  }
  return d
}

/** Point on a cubic Bézier at t (0 = start, 1 = end): where a stroke that must join the curve should end. */
export function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  const at = (k: 0 | 1): number => (w[0] ?? 0) * p0[k] + (w[1] ?? 0) * p1[k] + (w[2] ?? 0) * p2[k] + (w[3] ?? 0) * p3[k]
  return [n(at(0)), n(at(1))]
}

/** Point on an ellipse at an angle (degrees, 0 = right, 90 = down). */
export const ellipsePoint = (cx: number, cy: number, rx: number, ry: number, deg: number): Point => [
  n(cx + rx * Math.cos((deg * Math.PI) / 180)),
  n(cy + ry * Math.sin((deg * Math.PI) / 180)),
]

/** Rotate points about (cx, cy) by an angle in degrees (positive turns clockwise on screen). */
export function rotateAbout(pts: readonly Point[], deg: number, cx = 12, cy = 12): Point[] {
  const a = (deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return pts.map(([x, y]): Point => [n(cx + (x - cx) * cos - (y - cy) * sin), n(cy + (x - cx) * sin + (y - cy) * cos)])
}
