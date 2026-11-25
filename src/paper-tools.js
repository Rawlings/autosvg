// Paper.js-backed tools for icon work: path booleans, simplification, centring, and shape-quality
// analysis (tangent kinks, symmetry). Browser only: Paper needs a canvas.
//
// Everything takes and returns SVG *markup strings* (inner shapes or a full <svg>), so results
// drop straight into iconCanvas.setSVG() / the build kit.
import paper from 'paper/dist/paper-core.js'
import { SPEC } from './spec.js'

const NS = 'http://www.w3.org/2000/svg'
const OPS = ['unite', 'subtract', 'intersect', 'exclude', 'divide']

let scope
function ensure() {
  if (!scope) {
    scope = new paper.PaperScope()
    scope.setup(new scope.Size(SPEC.size, SPEC.size))
  }
  scope.activate()
  return scope
}

/** Run fn with a clean project, and clean up after. */
function run(fn) {
  const s = ensure()
  s.project.clear()
  try {
    return fn()
  } finally {
    s.project.clear()
  }
}

const isPath = (i) => i instanceof paper.Path || i instanceof paper.CompoundPath
const flat = (items) => items.flatMap((p) => (p instanceof paper.CompoundPath ? p.children : [p]))

/** Import markup as top-level paths. Circles, rects, lines etc. are expanded into plain paths. */
function load(markup) {
  const s = ensure()
  const svg = markup.trim().startsWith('<svg')
    ? markup
    : `<svg xmlns="${NS}" viewBox="0 0 ${SPEC.size} ${SPEC.size}">${markup}</svg>`
  const root = s.project.importSVG(svg, { expandShapes: true })
  if (isPath(root)) return [root]
  return root.getItems({ match: (i) => isPath(i) && !(i.parent instanceof paper.CompoundPath) })
}

const dOf = (item) => item.exportSVG({ precision: 2 }).getAttribute('d')
const markupOf = (paths) => paths.map((p) => `<path d="${dOf(p)}" />`).join('\n')
const merge = (paths) => paths.reduce((a, b) => a.unite(b))
const round = (v, n = 2) => +v.toFixed(n)

// ---------- construction ----------

/** Boolean of two shape groups: op is unite | subtract | intersect | exclude | divide. */
export function boolean(op, a, b) {
  if (!OPS.includes(op)) throw new Error(`op must be one of ${OPS.join(', ')}`)
  return run(() => `<path d="${dOf(merge(load(a))[op](merge(load(b))))}" />`)
}

/** Outline of the union of several shapes (a cloud from circles, a blob, a merged glyph). */
export function unite(list) {
  return run(() => `<path d="${dOf(merge(list.flatMap(load)))}" />`)
}

/** Fit fewer curve segments to the paths (tolerance in icon units). */
export function simplify(markup, tolerance = 0.1) {
  return run(() => {
    const paths = load(markup)
    flat(paths).forEach((p) => p.simplify(tolerance))
    return markupOf(paths)
  })
}

/** Translate the artwork so its geometric extent is centred on the canvas (snapped to 0.25). */
export function centre(markup) {
  return run(() => {
    const paths = load(markup)
    const b = paths.map((p) => p.bounds).reduce((u, r) => u.unite(r))
    const snap = (v) => Math.round(v * 4) / 4
    const dx = snap(SPEC.size / 2 - b.center.x)
    const dy = snap(SPEC.size / 2 - b.center.y)
    paths.forEach((p) => p.translate(new paper.Point(dx, dy)))
    return markupOf(paths)
  })
}

// ---------- analysis ----------

const KINK_MIN = 6 // degrees: smaller jumps are rounding noise
const KINK_MAX = 35 // degrees: bigger jumps are deliberate corners

/** Tangent breaks that are too big to be noise and too small to be a deliberate corner. */
function kinksOf(path) {
  const cs = path.curves
  const n = cs.length
  const out = []
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? cs[i - 1] : path.closed ? cs[n - 1] : null
    if (!prev) continue
    const a = prev.getTangentAtTime(1)
    const b = cs[i].getTangentAtTime(0)
    if (!a || !b || a.length < 1e-6 || b.length < 1e-6) continue
    const deg = Math.abs(a.getDirectedAngle(b))
    if (deg > KINK_MIN && deg < KINK_MAX) {
      const p = cs[i].point1
      out.push({ at: [round(p.x, 1), round(p.y, 1)], deg: round(deg, 0) })
    }
  }
  return out
}

/** Sign changes of curvature along the path (S-bends, lumps). */
function inflectionsOf(path) {
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

const JOIN = 0.1 // endpoint within this of another stroke = connected
const NEAR = 1 // within this but not joined = probably meant to connect (round caps even merge visually)

/**
 * Endpoints that nearly connect but don't: an open path's end that stops just short of another
 * stroke, or of its own start. Also open paths whose start and end coincide but aren't closed.
 * Gaps wider than NEAR are assumed deliberate (that is what the min-gap rule is for).
 */
function looseEnds(subs) {
  const out = []
  const pt = (p) => [round(p.x, 2), round(p.y, 2)]
  subs.forEach((p, i) => {
    if (p.closed || p.segments.length < 2) return
    const ends = [p.firstSegment.point, p.lastSegment.point]
    if (ends[0].getDistance(ends[1]) < JOIN) {
      out.push({ kind: 'unclosed', path: i, at: pt(ends[0]), gap: 0 })
      return
    }
    ends.forEach((P, k) => {
      let best = P.getDistance(ends[1 - k]) // the path's own other end
      let target = ends[1 - k]
      subs.forEach((q, j) => {
        if (j === i) return
        const np = q.getNearestPoint(P)
        const d = np.getDistance(P)
        if (d < best) {
          best = d
          target = np
        }
      })
      if (best >= JOIN && best <= NEAR) out.push({ kind: 'loose', path: i, at: pt(P), gap: round(best, 2), to: pt(target) })
    })
  })
  return out
}

const SYM_EXACT = 0.08 // mean mirror error below this = symmetric on purpose
const SYM_CLEARLY_NOT = 0.6 // above this = asymmetric on purpose

/**
 * Mirror symmetry about x = 12, measured per path against its own reflection.
 * A path that is exactly symmetric (shield outline, bell) or clearly not (a check mark) is fine;
 * one that is *almost* symmetric is a near miss: someone meant it to be symmetric and missed.
 */
function symmetryOf(subs) {
  const nearMiss = []
  let exact = 0
  subs.forEach((p, index) => {
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
  })
  return { exact, nearMiss }
}

/**
 * Shape-quality report for markup:
 *  - kinks: tangent breaks between 6 and 35 degrees (a wobble, not a corner)
 *  - inflections: curvature sign changes
 *  - symmetry: { exact, nearMiss } paths that are exactly / almost mirror-symmetric about x = 12
 *  - loose: endpoints that nearly connect to another stroke but don't, and unclosed loops
 */
export function analyse(markup) {
  return run(() => {
    const paths = load(markup)
    const subs = flat(paths)
    const kinks = subs.flatMap(kinksOf)
    return {
      paths: subs.length,
      segments: subs.reduce((n, p) => n + p.segments.length, 0),
      length: round(subs.reduce((n, p) => n + p.length, 0), 1),
      kinks,
      inflections: subs.reduce((n, p) => n + inflectionsOf(p), 0),
      symmetry: symmetryOf(subs),
      loose: looseEnds(subs),
    }
  })
}
