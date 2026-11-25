// Morph: one icon turning into another, shape to shape, for ANY two icons in the set.
//
//   <icon-morph from="sun" to="moon"></icon-morph>        --icon-morph: 0 shows the first icon, 1 the second
//
// How: CSS can interpolate a path's `d` only between two paths with the same commands in the same order. So each icon is
// split into its strokes, the strokes of the two icons are paired (nearest first), every pair is rewritten as the same
// number of cubic curves (the shorter one is subdivided), and the start point and direction that make the two line up best
// are chosen. A stroke with no partner shrinks to a point and fades. Each stroke then carries both ends as CSS
// variables (--im-a, --im-b); morph.css picks one by --icon-morph and an ordinary CSS transition on `d` does the moving.
// (No stylesheet rules are made per pair, so nothing piles up however many pairs are played. A paused @keyframes scrubbed
// by --icon-morph does not work: CSS reads animation-delay before animations run, so it ignores a number that is moving.)
//
// morphPlan() is plain arithmetic on the strokes; it needs only a DOM parser to read the icon's shapes. Paper.js is not used here
// (it would add 150 KB): the few shapes an icon is made of are turned into cubic curves in this file.
import { renderIcon, resolve, readParams } from './icon-runtime.js'
import { stripPose, stripStateShapes } from './poses.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const r2 = (v) => Math.round(v * 100) / 100

// ---------- curves: [x0,y0, x1,y1, x2,y2, x3,y3] ----------

const mid = (c) => [(c[0] + 3 * c[2] + 3 * c[4] + c[6]) / 8, (c[1] + 3 * c[3] + 3 * c[5] + c[7]) / 8]
const length = (c) => {
  let len = 0
  let [px, py] = [c[0], c[1]]
  for (let i = 1; i <= 8; i++) {
    const t = i / 8
    const u = 1 - t
    const x = u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6]
    const y = u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7]
    len += Math.hypot(x - px, y - py)
    ;[px, py] = [x, y]
  }
  return len
}
const reverseCurve = (c) => [c[6], c[7], c[4], c[5], c[2], c[3], c[0], c[1]]
const split = (c) => {
  const h = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const p0 = [c[0], c[1]], p1 = [c[2], c[3]], p2 = [c[4], c[5]], p3 = [c[6], c[7]]
  const a = h(p0, p1), b = h(p1, p2), d = h(p2, p3)
  const e = h(a, b), f = h(b, d), m = h(e, f)
  return [[...p0, ...a, ...e, ...m], [...m, ...f, ...d, ...p3]]
}

/** Subdivide the longest curve until there are `count` curves. */
function subdivide(curves, count) {
  const out = curves.map((c) => ({ c, len: length(c) }))
  while (out.length < count) {
    let at = 0
    for (let i = 1; i < out.length; i++) if (out[i].len > out[at].len) at = i
    const [a, b] = split(out[at].c)
    out.splice(at, 1, { c: a, len: out[at].len / 2 }, { c: b, len: out[at].len / 2 })
  }
  return out.map((o) => o.c)
}

// ---------- strokes of an icon ----------

// Everything is turned into cubic curves ([x0,y0, x1,y1, x2,y2, x3,y3]) with no library: the shapes an icon is made of are
// few (path, circle, ellipse, rect, line, polyline, polygon), and a path is move, line, curve, arc and close.
const cubicLine = (x0, y0, x1, y1) => [x0, y0, x0 + (x1 - x0) / 3, y0 + (y1 - y0) / 3, x0 + (2 * (x1 - x0)) / 3, y0 + (2 * (y1 - y0)) / 3, x1, y1]

/** An SVG elliptical arc (endpoint form) as cubic curves, at most a quarter turn each (SVG spec, F.6.5). */
function arcCurves(x1, y1, rx, ry, rot, large, sweep, x2, y2) {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [cubicLine(x1, y1, x2, y2)]
  const phi = (rot * Math.PI) / 180
  const cos = Math.cos(phi), sin = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)
  if (lam > 1) {
    rx *= Math.sqrt(lam)
    ry *= Math.sqrt(lam)
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
  const den = rx * rx * yp * yp + ry * ry * xp * xp
  const co = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den))
  const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const th1 = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx)
  let dth = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx) - th1
  if (!sweep && dth > 0) dth -= 2 * Math.PI
  if (sweep && dth < 0) dth += 2 * Math.PI
  const count = Math.max(1, Math.ceil(Math.abs(dth) / (Math.PI / 2) - 1e-9))
  const step = dth / count
  const t = (4 / 3) * Math.tan(step / 4)
  const at = (px, py) => [cx + rx * cos * px - ry * sin * py, cy + rx * sin * px + ry * cos * py]
  const out = []
  for (let i = 0; i < count; i++) {
    const a = th1 + i * step, b = a + step
    const p0 = at(Math.cos(a), Math.sin(a))
    const p1 = at(Math.cos(a) - t * Math.sin(a), Math.sin(a) + t * Math.cos(a))
    const p2 = at(Math.cos(b) + t * Math.sin(b), Math.sin(b) - t * Math.cos(b))
    const p3 = at(Math.cos(b), Math.sin(b))
    out.push([...p0, ...p1, ...p2, ...p3])
  }
  return out
}

const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

/** Path data as strokes: one per subpath, each { curves, closed }. */
function pathStrokes(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  const strokes = []
  let curves = [], closed = false
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, prev = ''
  const finish = () => {
    if (curves.length) strokes.push({ curves, closed })
    curves = []
    closed = false
  }
  let i = 0
  let cmd = ''
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const lower = cmd.toLowerCase(), rel = cmd === lower
    const n = ARGS[lower]
    if (n === undefined) break
    if (lower === 'z') {
      if (x !== sx || y !== sy) curves.push(cubicLine(x, y, sx, sy))
      closed = true
      x = sx
      y = sy
      finish()
      prev = 'z'
      continue
    }
    const a = tokens.slice(i, i + n).map(Number)
    i += n
    if (a.length < n || a.some(Number.isNaN)) break
    const ox = rel ? x : 0, oy = rel ? y : 0
    if (lower === 'm') {
      finish()
      x = sx = a[0] + ox
      y = sy = a[1] + oy
      cmd = rel ? 'l' : 'L' // further pairs after a move are lines
    } else if (lower === 'l' || lower === 'h' || lower === 'v') {
      const nx = lower === 'v' ? x : a[0] + ox
      const ny = lower === 'h' ? y : lower === 'v' ? a[0] + oy : a[1] + oy
      curves.push(cubicLine(x, y, nx, ny))
      x = nx
      y = ny
    } else if (lower === 'c' || lower === 's') {
      const c1 = lower === 's' ? (/[cs]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]) : [a[0] + ox, a[1] + oy]
      const k = lower === 's' ? 0 : 2
      const c2 = [a[k] + ox, a[k + 1] + oy]
      const e = [a[k + 2] + ox, a[k + 3] + oy]
      curves.push([x, y, ...c1, ...c2, ...e])
      ;[cx, cy] = c2
      ;[x, y] = e
    } else if (lower === 'q' || lower === 't') {
      const c = lower === 't' ? (/[qt]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]) : [a[0] + ox, a[1] + oy]
      const e = lower === 't' ? [a[0] + ox, a[1] + oy] : [a[2] + ox, a[3] + oy]
      curves.push([x, y, x + (2 / 3) * (c[0] - x), y + (2 / 3) * (c[1] - y), e[0] + (2 / 3) * (c[0] - e[0]), e[1] + (2 / 3) * (c[1] - e[1]), ...e])
      ;[cx, cy] = c
      ;[x, y] = e
    } else if (lower === 'a') {
      curves.push(...arcCurves(x, y, a[0], a[1], a[2], !!a[3], !!a[4], a[5] + ox, a[6] + oy))
      x = a[5] + ox
      y = a[6] + oy
    }
    prev = lower
  }
  finish()
  return strokes
}

/** The d of a shape element, or '' for anything that draws no stroke. */
function shapeData(el) {
  const num = (k, d = 0) => parseFloat(el.getAttribute(k)) || d
  switch (el.localName) {
    case 'path':
      return el.getAttribute('d') ?? ''
    case 'circle':
    case 'ellipse': {
      const rx = el.localName === 'circle' ? num('r') : num('rx')
      const ry = el.localName === 'circle' ? num('r') : num('ry')
      const cx = num('cx'), cy = num('cy')
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}z`
    }
    case 'rect': {
      const x = num('x'), y = num('y'), w = num('width'), h = num('height')
      const rx = Math.min(num('rx', num('ry')), w / 2), ry = Math.min(num('ry', num('rx')), h / 2)
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}z`
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}z`
    }
    case 'line':
      return `M${num('x1')} ${num('y1')}L${num('x2')} ${num('y2')}`
    case 'polyline':
    case 'polygon': {
      const pts = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number)
      let d = ''
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i ? 'L' : 'M'}${pts[i]} ${pts[i + 1]}`
      return el.localName === 'polygon' ? `${d}z` : d
    }
    default:
      return ''
  }
}

/** The strokes of an icon at rest (or in the state its name says), as cubic curves in the 24 grid. */
export function strokesOf(name, params) {
  const found = resolve(name)
  if (!found) throw new Error(`Unknown icon "${name}"`)
  let svg = renderIcon(name, params, { inline: true })
  if (!found.state) svg = stripStateShapes(svg) // a state-only accessory is not part of the normal look
  svg = stripPose(svg)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const strokes = []
  for (const el of doc.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon')) {
    let m = new DOMMatrix()
    for (let node = el; node && node.nodeType === 1; node = node.parentNode) {
      const t = node.transform?.baseVal?.consolidate()
      if (t) m = new DOMMatrix([t.matrix.a, t.matrix.b, t.matrix.c, t.matrix.d, t.matrix.e, t.matrix.f]).multiply(m)
    }
    for (const stroke of pathStrokes(shapeData(el))) {
      const curves = stroke.curves.map((c) => {
        const out = []
        for (let i = 0; i < 8; i += 2) {
          const p = m.transformPoint({ x: c[i], y: c[i + 1] })
          out.push(p.x, p.y)
        }
        return out
      })
      strokes.push(describe(curves, stroke.closed))
    }
  }
  return strokes
}

function describe(curves, closed) {
  let len = 0, cx = 0, cy = 0
  for (const c of curves) {
    const l = length(c)
    const [x, y] = mid(c)
    len += l
    cx += x * l
    cy += y * l
  }
  return { curves, closed, len, cx: cx / (len || 1), cy: cy / (len || 1) }
}

// ---------- pairing and alignment ----------

// Two strokes are paired when moving one into the other costs less than fading both: a long stroke is worth keeping on
// screen (it would be a hole in the morph if it faded), a short tick is not.
const costOf = (a, b) => Math.hypot(a.cx - b.cx, a.cy - b.cy) + 0.2 * Math.abs(a.len - b.len) + (a.closed !== b.closed ? 2 : 0)
const fadeCost = (s) => 4 + 0.5 * s.len

function pair(A, B) {
  const all = []
  A.forEach((a, i) => B.forEach((b, j) => all.push({ i, j, cost: costOf(a, b), limit: fadeCost(a) + fadeCost(b) })))
  all.sort((x, y) => x.cost - y.cost)
  const usedA = new Set(), usedB = new Set(), pairs = []
  for (const p of all) {
    if (usedA.has(p.i) || usedB.has(p.j) || p.cost > p.limit) continue
    usedA.add(p.i)
    usedB.add(p.j)
    pairs.push(p)
  }
  return { pairs, outs: A.map((_, i) => i).filter((i) => !usedA.has(i)), ins: B.map((_, j) => j).filter((j) => !usedB.has(j)) }
}

const rotate = (curves, k) => curves.slice(k).concat(curves.slice(0, k))
const reversed = (curves) => curves.map(reverseCurve).reverse()
const gap = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const [ax, ay] = mid(a[i]), [bx, by] = mid(b[i])
    sum += (ax - bx) ** 2 + (ay - by) ** 2 + (a[i][0] - b[i][0]) ** 2 + (a[i][1] - b[i][1]) ** 2
  }
  return sum
}

/** Give two strokes the same number of curves and choose the start point and direction that line them up best. */
function align(a, b) {
  const count = Math.max(a.curves.length, b.curves.length)
  const ca = subdivide(a.curves, count)
  const cb = subdivide(b.curves, count)
  let best = { cost: Infinity, from: ca, to: cb }
  for (const flip of [false, true]) {
    const base = flip ? reversed(cb) : cb
    const ringA = a.closed, ringB = b.closed
    const shiftsB = ringB ? count : 1
    const shiftsA = !ringB && ringA ? count : 1
    for (let sb = 0; sb < shiftsB; sb++) {
      for (let sa = 0; sa < shiftsA; sa++) {
        const x = rotate(ca, sa), y = rotate(base, sb)
        const cost = gap(x, y)
        if (cost < best.cost) best = { cost, from: x, to: y }
      }
    }
  }
  return { from: best.from, to: best.to, move: Math.sqrt(best.cost / count) }
}

const pathData = (curves) => {
  let d = `M${r2(curves[0][0])} ${r2(curves[0][1])}`
  for (const c of curves) d += `C${r2(c[2])} ${r2(c[3])} ${r2(c[4])} ${r2(c[5])} ${r2(c[6])} ${r2(c[7])}`
  return d
}
const point = (s, count) => {
  const c = [s.cx, s.cy, s.cx, s.cy, s.cx, s.cy, s.cx, s.cy]
  return Array.from({ length: count }, () => c)
}

/**
 * The plan for turning icon `from` into icon `to`: one entry per stroke, with the path it starts as, the path it ends as
 * and whether it fades in or out. `rough` is true when the two icons have little in common (most of the ink has to fade
 * rather than move), in which case the plain swap (swap.css) is the better transition.
 */
export function morphPlan(from, to, params = {}) {
  const A = strokesOf(from, params)
  const B = strokesOf(to, params)
  const { pairs, outs, ins } = pair(A, B)
  const strokes = []
  let moved = 0, movedLen = 0
  for (const p of pairs) {
    const r = align(A[p.i], B[p.j])
    strokes.push({ from: pathData(r.from), to: pathData(r.to), fade: null })
    moved += r.move * Math.max(A[p.i].len, B[p.j].len)
    movedLen += Math.max(A[p.i].len, B[p.j].len)
  }
  for (const i of outs) strokes.push({ from: pathData(A[i].curves), to: pathData(point(A[i], A[i].curves.length)), fade: 'out' })
  for (const j of ins) strokes.push({ from: pathData(point(B[j], B[j].curves.length)), to: pathData(B[j].curves), fade: 'in' })
  const total = (arr) => arr.reduce((n, s) => n + s.len, 0)
  const fading = outs.reduce((n, i) => n + A[i].len, 0) + ins.reduce((n, j) => n + B[j].len, 0)
  const share = fading / ((total(A) + total(B)) || 1) // how much of all the ink fades instead of moving
  const travel = movedLen ? moved / movedLen : 0 // how far the moving ink travels, on average (icon units)
  return { strokes, share: r2(share), travel: r2(travel), rough: share > 0.5 }
}

// ---------- the <icon-morph> element ----------

const planCache = new Map()
const supportsD = () => typeof CSS !== 'undefined' && CSS.supports('d: path("M0 0")')

class IconMorph extends HTMLElement {
  static observedAttributes = ['from', 'to', 'state']
  connectedCallback() {
    this.render()
  }
  attributeChangedCallback(attr) {
    if (!this.isConnected) return
    if (attr === 'state') this.sync()
    else this.render()
  }
  /** Without CSS `d` (Safari today) the icon shows the one it is on, instantly. */
  sync() {
    if (supportsD()) return
    this.querySelectorAll('path').forEach((p) => p.setAttribute('d', this.getAttribute('state') === 'to' ? p._to : p._from))
  }
  render() {
    const from = this.getAttribute('from'), to = this.getAttribute('to')
    if (!from || !to) return
    if (this.hasAttribute('aria-label')) this.setAttribute('role', 'img')
    else this.setAttribute('aria-hidden', 'true')
    const p = readParams(this)
    p.radius = Math.round(Math.max(0, p.radius) * 20) / 20
    p.curve = Math.round(Math.min(1.2, Math.max(0, p.curve)) * 20) / 20
    const key = [from, to, p.radius, p.curve].join('|')
    if (key === this._key) return
    this._key = key
    try {
      let plan = planCache.get(key)
      if (!plan) {
        plan = morphPlan(from, to, p)
        if (planCache.size > 500) planCache.clear()
        planCache.set(key, plan)
      }
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('class', 'icon')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      plan.strokes.forEach((s, i) => {
        const path = document.createElementNS(SVG_NS, 'path')
        // both ends ride on the stroke; morph.css picks one by --icon-morph and a CSS transition moves between them
        path.style.setProperty('--im-a', `path("${s.from}")`)
        path.style.setProperty('--im-b', `path("${s.to}")`)
        if (s.fade) {
          path.style.setProperty('--im-oa', s.fade === 'out' ? '1' : '0')
          path.style.setProperty('--im-ob', s.fade === 'out' ? '0' : '1')
        }
        path._from = s.from
        path._to = s.to
        path.setAttribute('d', s.from) // what an engine without CSS `d` shows
        svg.append(path)
      })
      this.dataset.fit = plan.rough ? 'rough' : 'good'
      this.replaceChildren(svg)
      // settle the new strokes at the current number now, so a number that changes next (state set right after) is a transition from it
      if (svg.firstChild) getComputedStyle(svg.firstChild).d
      this.sync()
    } catch (e) {
      this.textContent = ''
      console.warn(e.message)
    }
  }
}

export function defineIconMorph() {
  if (!customElements.get('icon-morph')) customElements.define('icon-morph', IconMorph)
}

// ---------- audit ----------

const shape = (d) => d.replace(/-?\d+(\.\d+)?/g, '#')
const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number)

/**
 * Checks morphs for a set of pairs (by default every icon into the next one, round the whole set): both ends of every
 * stroke have the same commands (what CSS needs to interpolate), no number is broken, every point stays on the canvas at
 * both ends (and so at every value in between, since a morph moves each point in a straight line), and a plan is
 * cheap enough to make on demand. Reports how many pairs are rough (a plain swap suits them better).
 */
export function morphAudit(pairs, names = [], params = {}) {
  const list = pairs ?? names.map((n, i) => [n, names[(i + 1) % names.length]])
  const flagged = []
  let rough = 0, slowest = 0, total = 0
  for (const [a, b] of list) {
    const t0 = performance.now()
    let plan
    try {
      plan = morphPlan(a, b, params)
    } catch (e) {
      flagged.push(`${a} → ${b}: ${e.message}`)
      continue
    }
    const ms = performance.now() - t0
    total += ms
    slowest = Math.max(slowest, ms)
    if (plan.rough) rough++
    if (!plan.strokes.length) flagged.push(`${a} → ${b}: no strokes`)
    plan.strokes.forEach((s, i) => {
      if (shape(s.from) !== shape(s.to)) flagged.push(`${a} → ${b}: stroke ${i} has different commands at its two ends`)
      for (const v of [...numbers(s.from), ...numbers(s.to)]) {
        if (!Number.isFinite(v) || v < -1 || v > 25) {
          flagged.push(`${a} → ${b}: stroke ${i} has a point at ${v}, off the canvas`)
          break
        }
      }
    })
  }
  return { ok: !flagged.length, flagged, stats: { pairs: list.length, rough, avgMs: +(total / (list.length || 1)).toFixed(2), slowestMs: +slowest.toFixed(1) } }
}
