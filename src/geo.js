// Pure geometry helpers for building icon paths. No DOM, so the Node build script and the
// browser share them. They replace hand-computing arc flags and control points.

const TAU = Math.PI * 2
const n = (v) => +v.toFixed(2)
const pt = ([x, y]) => `${n(x)} ${n(y)}`

export const snap = (v, grid = 0.5) => Math.round(v / grid) * grid

/**
 * Closed superellipse |x/rx|^e + |y/ry|^e = 1 as a smooth cubic path. e = 2 is an ellipse, e = 4 a squircle.
 * Sampled, then joined with Catmull-Rom curves so the tangent is continuous everywhere (no kinks).
 */
export function superellipse(cx, cy, rx, ry, exponent, count = 16) {
  // 16 segments, not more: the points are rounded to 2 decimals, and on a small circle a short segment's
  // control handle is so short that the rounding alone would bend its tangent by several degrees.
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([
      cx + rx * Math.sign(c) * Math.abs(c) ** (2 / exponent),
      cy + ry * Math.sign(s) * Math.abs(s) ** (2 / exponent),
    ])
  }
  let d = `M${pt(pts[0])}`
  for (let i = 0; i < count; i++) {
    const p0 = pts[(i - 1 + count) % count]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % count]
    const p3 = pts[(i + 2) % count]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d + 'Z'
}

/** Point on a circle. Angles in degrees, 0 = right, 90 = down (screen coordinates). */
export const polar = (cx, cy, r, deg) => [
  cx + r * Math.cos((deg * Math.PI) / 180),
  cy + r * Math.sin((deg * Math.PI) / 180),
]

/**
 * Translate several point lists together so their combined bounding box is centred on the canvas
 * (shift snapped to 0.25). Returns the translated lists in the same order.
 */
export function centreOn(...groups) {
  const all = groups.flat()
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const snap25 = (v) => Math.round(v * 4) / 4
  const dx = snap25(12 - (Math.min(...xs) + Math.max(...xs)) / 2)
  const dy = snap25(12 - (Math.min(...ys) + Math.max(...ys)) / 2)
  return groups.map((g) => g.map(([x, y]) => [x + dx, y + dy]))
}

/** Reflect points across the vertical axis x = axis (default: icon centre). */
export const mirrorX = (pts, axis = 12) => pts.map(([x, y]) => [2 * axis - x, y])

/**
 * Build a symmetric outline from its left half only.
 * `left` runs top to bottom along the left side; the right side is mirrored and reversed.
 */
export const symmetric = (left, axis = 12) => [
  ...left,
  ...mirrorX(left.filter(([x]) => x !== axis), axis).reverse(), // points on the axis are not duplicated
]

/** Arc along circle `c` ({cx, cy, r}) from point `from` to point `to`. Flags are computed for you. */
export function arcOn(c, from, to, clockwise = true) {
  const a1 = Math.atan2(from[1] - c.cy, from[0] - c.cx)
  const a2 = Math.atan2(to[1] - c.cy, to[0] - c.cx)
  let d = clockwise ? a2 - a1 : a1 - a2
  d = ((d % TAU) + TAU) % TAU
  return `A${n(c.r)} ${n(c.r)} 0 ${d > Math.PI ? 1 : 0} ${clockwise ? 1 : 0} ${pt(to)}`
}

/** The two intersection points of circles a and b. */
export function intersect(a, b) {
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
export function circleChain(circles, baseY) {
  const first = circles[0]
  const last = circles[circles.length - 1]
  let d = `M${pt([first.cx, baseY])}`
  let cur = [first.cx, baseY]
  for (let i = 0; i < circles.length - 1; i++) {
    const [p, q] = intersect(circles[i], circles[i + 1])
    const up = p[1] < q[1] ? p : q
    d += arcOn(circles[i], cur, up)
    cur = up
  }
  d += arcOn(last, cur, [last.cx, baseY]) + 'Z'
  return d
}

/**
 * Polygon with filleted corners. `radius` is a number or one radius per vertex (0 = sharp).
 * Corner arcs are tangent to both edges, so the shape never kinks.
 */
export function roundedPolygon(pts, radius = 1) {
  const rad = Array.isArray(radius) ? radius : pts.map(() => radius)
  const corners = fillets(pts, rad, true)
  let d = ''
  corners.forEach((c, i) => {
    d += `${i === 0 ? 'M' : 'L'}${pt(c.a)}`
    if (!c.sharp) d += `A${n(c.r)} ${n(c.r)} 0 0 ${c.sweep} ${pt(c.b)}`
    else d += `L${pt(c.cur)}`
  })
  return d + 'Z'
}

/**
 * Open path through `pts` with filleted inner corners. The two end points are free (never rounded),
 * so a fillet beside an end may use that whole edge. Same tangent arcs as roundedPolygon.
 */
export function roundedPolyline(pts, radius = 1) {
  const rad = (Array.isArray(radius) ? radius : pts.map(() => radius)).slice()
  rad[0] = 0
  rad[pts.length - 1] = 0
  const corners = fillets(pts, rad, false)
  let d = `M${pt(pts[0])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const c = corners[i]
    d += `L${pt(c.a)}`
    if (!c.sharp) d += `A${n(c.r)} ${n(c.r)} 0 0 ${c.sweep} ${pt(c.b)}`
    else d += `L${pt(c.cur)}`
  }
  return d + `L${pt(pts[pts.length - 1])}`
}

/** Fillet geometry for every vertex: tangent points a (on the incoming edge) and b (on the outgoing edge). */
function fillets(pts, rad, closed) {
  const N = pts.length
  const unit = (a, b) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    return [dx / l, dy / l, l]
  }
  return pts.map((cur, i) => {
    if (!closed && (i === 0 || i === N - 1)) return { a: cur, b: cur, r: 0, sweep: 0, sharp: true, cur }
    const prev = pts[(i - 1 + N) % N]
    const next = pts[(i + 1) % N]
    const [ux, uy, l1] = unit(cur, prev)
    const [vx, vy, l2] = unit(cur, next)
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)))
    let t = rad[i] > 0 ? rad[i] / Math.tan(ang / 2) : 0
    // two fillets share an edge, so each may take half of it; next to a sharp corner it may take all of it
    t = Math.min(t, rad[(i - 1 + N) % N] > 0 ? l1 / 2 : l1, rad[(i + 1) % N] > 0 ? l2 / 2 : l2)
    const r = t * Math.tan(ang / 2)
    // travelling prev -> cur -> next: a right turn on screen is clockwise (sweep 1)
    const sweep = -(ux * vy - uy * vx) > 0 ? 1 : 0
    return { a: [cur[0] + ux * t, cur[1] + uy * t], b: [cur[0] + vx * t, cur[1] + vy * t], r, sweep, sharp: t === 0, cur }
  })
}

/** Where a ray from the centre of a superellipse (exponent e, radius r) in direction (dx, dy) meets its outline. */
export function superPoint(cx, cy, r, e, dx, dy) {
  const l = Math.hypot(dx, dy)
  const ux = dx / l
  const uy = dy / l
  const t = r / Math.pow(Math.pow(Math.abs(ux), e) + Math.pow(Math.abs(uy), e), 1 / e)
  return [cx + ux * t, cy + uy * t]
}

/**
 * Part of a superellipse outline, from angle deg0 to deg1 (degrees, 0 = right, 90 = down), as a smooth
 * open path. e = 2 is a circular arc.
 */
export function superArc(cx, cy, r, e, deg0, deg1, count = 14) {
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = ((deg0 + ((deg1 - deg0) * i) / (count - 1)) * Math.PI) / 180
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([cx + r * Math.sign(c) * Math.abs(c) ** (2 / e), cy + r * Math.sign(s) * Math.abs(s) ** (2 / e)])
  }
  let d = `M${pt(pts[0])}`
  for (let i = 0; i < count - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, count - 1)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`
  }
  return d
}
