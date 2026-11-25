// Paper.js-backed tools for vector work: path booleans, simplification, centring, rotation, and shape-quality
// analysis (tangent kinks, symmetry). No DOM and no canvas, so they run in Node as well as in the browser.
//
// Everything takes and returns SVG *markup strings* (inner shapes or a full <svg>), so results
// drop straight into autosvg.setSVG() / the build kit.
import { SPEC } from '@autosvg/core'
import paper from './paper-runtime.ts'

const OPS = ['unite', 'subtract', 'intersect', 'exclude', 'divide'] as const

/** The boolean operations Paper.js offers between two paths. */
export type BooleanOp = (typeof OPS)[number]

type Pt = [number, number]

let scope: paper.PaperScope | undefined
function ensure(): paper.PaperScope {
  if (!scope) {
    scope = new paper.PaperScope()
    scope.setup(new scope.Size(SPEC.size, SPEC.size))
  }
  scope.activate()
  return scope
}

/** Run fn with a clean project, and clean up after. */
function run<T>(fn: () => T): T {
  const s = ensure()
  s.project.clear()
  try {
    return fn()
  } finally {
    s.project.clear()
  }
}

/** Compound paths opened up into their simple paths. */
const flat = (items: readonly paper.PathItem[]): paper.Path[] =>
  items.flatMap((p) =>
    p instanceof paper.CompoundPath
      ? p.children.filter((c): c is paper.Path => c instanceof paper.Path)
      : [p as paper.Path],
  )

const attr = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
const num = (tag: string, name: string, fallback = 0): number => {
  const value = attr(tag, name)
  return value === undefined ? fallback : Number.parseFloat(value) || fallback
}

/** One shape element as a Paper path (circles, rects, lines and the rest are expanded into plain paths). */
function shapeToPath(kind: string, tag: string): paper.PathItem | null {
  switch (kind) {
    case 'path':
      return paper.PathItem.create(attr(tag, 'd') ?? '')
    case 'rect': {
      const rect = new paper.Rectangle(
        new paper.Point(num(tag, 'x'), num(tag, 'y')),
        new paper.Size(num(tag, 'width'), num(tag, 'height')),
      )
      const rx = num(tag, 'rx', num(tag, 'ry'))
      const ry = num(tag, 'ry', rx)
      return new paper.Path.Rectangle(rect, rx || ry ? new paper.Size(rx, ry) : undefined)
    }
    case 'circle':
      return new paper.Path.Circle(new paper.Point(num(tag, 'cx'), num(tag, 'cy')), num(tag, 'r'))
    case 'ellipse':
      return new paper.Path.Ellipse(
        new paper.Rectangle(
          new paper.Point(num(tag, 'cx') - num(tag, 'rx'), num(tag, 'cy') - num(tag, 'ry')),
          new paper.Size(num(tag, 'rx') * 2, num(tag, 'ry') * 2),
        ),
      )
    case 'line':
      return new paper.Path.Line(
        new paper.Point(num(tag, 'x1'), num(tag, 'y1')),
        new paper.Point(num(tag, 'x2'), num(tag, 'y2')),
      )
    case 'polyline':
    case 'polygon': {
      const numbers = (attr(tag, 'points') ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      const segments: paper.Point[] = []
      for (let i = 0; i + 1 < numbers.length; i += 2)
        segments.push(new paper.Point(numbers[i] ?? 0, numbers[i + 1] ?? 0))
      return new paper.Path({ segments, closed: kind === 'polygon' })
    }
    default:
      return null
  }
}

/** One element of the markup as a Paper path. */
export interface LoadedShape {
  /** the element name: `path`, `rect`, `circle` ... */
  kind: string
  item: paper.PathItem
}

/** Read markup (inner shapes or a whole <svg>) as one path per shape element, in document order. */
function loadShapes(markup: string): LoadedShape[] {
  ensure()
  const shapes: LoadedShape[] = []
  for (const match of markup.matchAll(/<(path|rect|circle|ellipse|line|polyline|polygon)\b([^>]*?)\/?>/g)) {
    const kind = match[1] ?? ''
    const item = shapeToPath(kind, match[2] ?? '')
    if (item) shapes.push({ kind, item })
  }
  return shapes
}

const load = (markup: string): paper.PathItem[] => loadShapes(markup).map((s) => s.item)

/** Read markup into shapes and run `fn` on them while they exist. */
export function withShapes<T>(markup: string, fn: (shapes: LoadedShape[]) => T): T {
  return run(() => fn(loadShapes(markup)))
}

/** Compound paths opened up into their simple paths. */
export const simplePaths = (item: paper.PathItem): paper.Path[] => flat([item])

/** Path data to two decimals, which is what a vector file holds. */
const dOf = (item: paper.PathItem): string => item.pathData.replace(/-?\d*\.\d+/g, (v) => String(+(+v).toFixed(2)))
const markupOf = (paths: readonly paper.PathItem[]): string => paths.map((p) => `<path d="${dOf(p)}" />`).join('\n')
const merge = (paths: readonly paper.PathItem[]): paper.PathItem => paths.reduce((a, b) => a.unite(b))
const round = (v: number, n = 2): number => +v.toFixed(n)

// ---------- construction ----------

/** Boolean of two shape groups: op is unite | subtract | intersect | exclude | divide. */
export function boolean(op: BooleanOp, a: string, b: string): string {
  if (!OPS.includes(op)) throw new Error(`op must be one of ${OPS.join(', ')}`)
  return run(() => `<path d="${dOf(merge(load(a))[op](merge(load(b))))}" />`)
}

/** Outline of the union of several shapes (a cloud from circles, a blob, a merged glyph). */
export function unite(list: readonly string[]): string {
  return run(() => `<path d="${dOf(merge(list.flatMap(load)))}" />`)
}

/** Fit fewer curve segments to the paths (tolerance in vector units). */
export function simplify(markup: string, tolerance = 0.1): string {
  return run(() => {
    const paths = load(markup)
    for (const p of flat(paths)) p.simplify(tolerance)
    return markupOf(paths)
  })
}

/** Translate the artwork so its geometric extent is centred on the canvas (snapped to 0.25). */
export function centre(markup: string): string {
  return run(() => {
    const paths = load(markup)
    const b = paths.map((p) => p.bounds).reduce((u, r) => u.unite(r))
    const snap = (v: number): number => Math.round(v * 4) / 4
    const dx = snap(SPEC.size / 2 - b.center.x)
    const dy = snap(SPEC.size / 2 - b.center.y)
    for (const p of paths) p.translate(new paper.Point(dx, dy))
    return markupOf(paths)
  })
}

/** Turn, scale and move a drawing: each is [angle or factor, ...centre]; they apply in this order. */
export interface Transform {
  /** degrees, then the centre (default 12, 12) */
  rotate?: [number, number?, number?]
  /** x factor, y factor, then the centre (default 12, 12) */
  scale?: [number, number, number?, number?]
  translate?: [number, number]
}

/** Rotate, scale or move markup: how a diagonal vector is drawn from an upright one. Returns path markup. */
export function transform(markup: string, t: Transform): string {
  return run(() => {
    const paths = load(markup)
    for (const p of paths) {
      if (t.rotate) p.rotate(t.rotate[0], new paper.Point(t.rotate[1] ?? SPEC.size / 2, t.rotate[2] ?? SPEC.size / 2))
      if (t.scale)
        p.scale(t.scale[0], t.scale[1], new paper.Point(t.scale[2] ?? SPEC.size / 2, t.scale[3] ?? SPEC.size / 2))
      if (t.translate) p.translate(new paper.Point(t.translate[0], t.translate[1]))
    }
    return markupOf(paths)
  })
}

// ---------- analysis ----------

const KINK_MIN = 6 // degrees: smaller jumps are rounding noise
const KINK_MAX = 35 // degrees: bigger jumps are deliberate corners

/** Tangent breaks that are too big to be noise and too small to be a deliberate corner. */
/** A tangent break: where, and by how many degrees. */
export interface Kink {
  at: Pt
  deg: number
}

function kinksOf(path: paper.Path): Kink[] {
  const cs = path.curves
  const n = cs.length
  const out: Kink[] = []
  for (const [i, cur] of cs.entries()) {
    const prev = i > 0 ? cs[i - 1] : path.closed ? cs[n - 1] : undefined
    if (!prev) continue
    const a = prev.getTangentAtTime(1)
    const b = cur.getTangentAtTime(0)
    if (!a || !b || a.length < 1e-6 || b.length < 1e-6) continue
    const deg = Math.abs(a.getDirectedAngle(b))
    if (deg > KINK_MIN && deg < KINK_MAX) {
      const p = cur.point1
      out.push({ at: [round(p.x, 1), round(p.y, 1)], deg: round(deg, 0) })
    }
  }
  return out
}

/** Sign changes of curvature along the path (S-bends, lumps). */
function inflectionsOf(path: paper.Path): number {
  let n = 0
  let prev = 0
  for (const curve of path.curves) {
    for (let t = 0.05; t < 1; t += 0.1) {
      const k = curve.getCurvatureAtTime(t)
      if (!Number.isFinite(k) || Math.abs(k) < 0.03) continue
      const s = Math.sign(k)
      if (prev && s !== prev) n++
      prev = s
    }
  }
  return n
}

/** An open end that stops short of something, or a path that is not closed but should be. */
export interface LooseEnd {
  kind: 'unclosed' | 'loose'
  path: number
  at: Pt
  gap: number
  to?: Pt
}

const JOIN = 0.1 // endpoint within this of another stroke = connected
const NEAR = 1 // within this but not joined = probably meant to connect (round caps even merge visually)

/**
 * Endpoints that nearly connect but don't: an open path's end that stops just short of another
 * stroke, or of its own start. Also open paths whose start and end coincide but aren't closed.
 * Gaps wider than NEAR are assumed deliberate (that is what the min-gap rule is for).
 */
function looseEnds(subs: readonly paper.Path[]): LooseEnd[] {
  const out: LooseEnd[] = []
  const pt = (p: paper.Point): Pt => [round(p.x, 2), round(p.y, 2)]
  for (const [i, p] of subs.entries()) {
    if (p.closed || p.segments.length < 2) continue
    const first = p.firstSegment.point
    const last = p.lastSegment.point
    if (first.getDistance(last) < JOIN) {
      out.push({ kind: 'unclosed', path: i, at: pt(first), gap: 0 })
      continue
    }
    for (const [P, other] of [
      [first, last],
      [last, first],
    ] as const) {
      let best = P.getDistance(other) // the path's own other end
      let target = other
      for (const [j, q] of subs.entries()) {
        if (j === i) continue
        const np = q.getNearestPoint(P)
        const d = np.getDistance(P)
        if (d < best) {
          best = d
          target = np
        }
      }
      if (best >= JOIN && best <= NEAR)
        out.push({ kind: 'loose', path: i, at: pt(P), gap: round(best, 2), to: pt(target) })
    }
  }
  return out
}

const SYM_EXACT = 0.08 // mean mirror error below this = symmetric on purpose
const SYM_CLEARLY_NOT = 0.6 // above this = asymmetric on purpose

/**
 * Mirror symmetry about x = 12, measured per path against its own reflection.
 * A path that is exactly symmetric (shield outline, bell) or clearly not (a check mark) is fine;
 * one that is *almost* symmetric is a near miss: someone meant it to be symmetric and missed.
 */
/** Paths that are exactly or almost mirror-symmetric about x = 12. */
export interface Symmetry {
  exact: number
  nearMiss: { path: number; mean: number; max: number }[]
}

function symmetryOf(subs: readonly paper.Path[]): Symmetry {
  const nearMiss: Symmetry['nearMiss'] = []
  let exact = 0
  for (const [index, p] of subs.entries()) {
    let sum = 0
    let max = 0
    let count = 0
    for (let s = 0; s <= p.length; s += 0.5) {
      const pt = p.getPointAt(Math.min(s, p.length))
      if (!pt) continue
      const r = new paper.Point(SPEC.size - pt.x, pt.y)
      const d = p.getNearestPoint(r).getDistance(r)
      sum += d
      max = Math.max(max, d)
      count++
    }
    const mean = count ? sum / count : 0
    if (mean < SYM_EXACT) exact++
    else if (mean < SYM_CLEARLY_NOT) nearMiss.push({ path: index, mean: round(mean, 3), max: round(max, 2) })
  }
  return { exact, nearMiss }
}

/**
 * Shape-quality report for markup:
 *  - kinks: tangent breaks between 6 and 35 degrees (a wobble, not a corner)
 *  - inflections: curvature sign changes
 *  - symmetry: { exact, nearMiss } paths that are exactly / almost mirror-symmetric about x = 12
 *  - loose: endpoints that nearly connect to another stroke but don't, and unclosed loops
 */
/** The shape-quality report of {@link analyse}. */
export interface ShapeReport {
  paths: number
  segments: number
  length: number
  kinks: Kink[]
  inflections: number
  symmetry: Symmetry
  loose: LooseEnd[]
}

/** Read markup into simple paths (compound paths opened up) and run `fn` on them while they exist. */
export function withPaths<T>(markup: string, fn: (paths: paper.Path[]) => T): T {
  return run(() => fn(flat(load(markup))))
}

/** The same report for paths that are already loaded. */
export function analysePaths(subs: readonly paper.Path[]): ShapeReport {
  const kinks = subs.flatMap(kinksOf)
  return {
    paths: subs.length,
    segments: subs.reduce((n, p) => n + p.segments.length, 0),
    length: round(
      subs.reduce((n, p) => n + p.length, 0),
      1,
    ),
    kinks,
    inflections: subs.reduce((n, p) => n + inflectionsOf(p), 0),
    symmetry: symmetryOf(subs),
    loose: looseEnds(subs),
  }
}

export function analyse(markup: string): ShapeReport {
  return run(() => analysePaths(flat(load(markup))))
}
