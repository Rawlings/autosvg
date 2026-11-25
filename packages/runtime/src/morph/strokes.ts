import type { Point } from '@icon-canvas/core'
import { at as nth, type Style, stripPose, stripStateShapes } from '@icon-canvas/core'
import { renderIcon, resolve } from '../render.ts'
import { arcCurves, type Cubic, cubic, cubicLine, length, mid } from './curves.ts'

/** One stroke of an icon as cubic curves, with what the pairing needs to know about it. */
export interface Stroke {
  curves: Cubic[]
  closed: boolean
  /** total length */
  len: number
  /** centre of mass */
  cx: number
  cy: number
}

/** How many numbers each path command takes. */
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

interface RawStroke {
  curves: Cubic[]
  closed: boolean
}

// Everything is turned into cubic curves with no library: the shapes an icon is made of are
// few (path, circle, ellipse, rect, line, polyline, polygon), and a path is move, line, curve, arc and close.

/** Path data as strokes: one per subpath. */
function pathStrokes(d: string): RawStroke[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  const strokes: RawStroke[] = []
  let curves: Cubic[] = []
  let closed = false
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let cx = 0
  let cy = 0
  let prev = ''
  const finish = (): void => {
    if (curves.length) strokes.push({ curves, closed })
    curves = []
    closed = false
  }
  let i = 0
  let cmd = ''
  while (i < tokens.length) {
    const token = nth(tokens, i)
    if (/[a-zA-Z]/.test(token)) {
      cmd = token
      i++
    }
    const lower = cmd.toLowerCase()
    const rel = cmd === lower
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
    const arg = (k: number): number => nth(a, k)
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (lower === 'm') {
      finish()
      x = arg(0) + ox
      sx = x
      y = arg(1) + oy
      sy = y
      cmd = rel ? 'l' : 'L' // further pairs after a move are lines
    } else if (lower === 'l' || lower === 'h' || lower === 'v') {
      const nx = lower === 'v' ? x : arg(0) + ox
      const ny = lower === 'h' ? y : lower === 'v' ? arg(0) + oy : arg(1) + oy
      curves.push(cubicLine(x, y, nx, ny))
      x = nx
      y = ny
    } else if (lower === 'c' || lower === 's') {
      const c1: Point =
        lower === 's' ? (/[cs]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]) : [arg(0) + ox, arg(1) + oy]
      const k = lower === 's' ? 0 : 2
      const c2: Point = [arg(k) + ox, arg(k + 1) + oy]
      const e: Point = [arg(k + 2) + ox, arg(k + 3) + oy]
      curves.push(cubic([x, y], c1, c2, e))
      cx = c2[0]
      cy = c2[1]
      x = e[0]
      y = e[1]
    } else if (lower === 'q' || lower === 't') {
      const c: Point =
        lower === 't' ? (/[qt]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]) : [arg(0) + ox, arg(1) + oy]
      const e: Point = lower === 't' ? [arg(0) + ox, arg(1) + oy] : [arg(2) + ox, arg(3) + oy]
      curves.push(
        cubic(
          [x, y],
          [x + (2 / 3) * (c[0] - x), y + (2 / 3) * (c[1] - y)],
          [e[0] + (2 / 3) * (c[0] - e[0]), e[1] + (2 / 3) * (c[1] - e[1])],
          e,
        ),
      )
      cx = c[0]
      cy = c[1]
      x = e[0]
      y = e[1]
    } else if (lower === 'a') {
      curves.push(...arcCurves(x, y, arg(0), arg(1), arg(2), !!arg(3), !!arg(4), arg(5) + ox, arg(6) + oy))
      x = arg(5) + ox
      y = arg(6) + oy
    }
    prev = lower
  }
  finish()
  return strokes
}

/** The d of a shape element, or '' for anything that draws no stroke. */
function shapeData(el: Element): string {
  const num = (k: string, d = 0): number => Number.parseFloat(el.getAttribute(k) ?? '') || d
  switch (el.localName) {
    case 'path':
      return el.getAttribute('d') ?? ''
    case 'circle':
    case 'ellipse': {
      const rx = el.localName === 'circle' ? num('r') : num('rx')
      const ry = el.localName === 'circle' ? num('r') : num('ry')
      const cx = num('cx')
      const cy = num('cy')
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}z`
    }
    case 'rect': {
      const x = num('x')
      const y = num('y')
      const w = num('width')
      const h = num('height')
      const rx = Math.min(num('rx', num('ry')), w / 2)
      const ry = Math.min(num('ry', num('rx')), h / 2)
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}z`
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}z`
    }
    case 'line':
      return `M${num('x1')} ${num('y1')}L${num('x2')} ${num('y2')}`
    case 'polyline':
    case 'polygon': {
      const pts = (el.getAttribute('points') ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)
      let d = ''
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i ? 'L' : 'M'}${nth(pts, i)} ${nth(pts, i + 1)}`
      return el.localName === 'polygon' ? `${d}z` : d
    }
    default:
      return ''
  }
}

function describe(curves: Cubic[], closed: boolean): Stroke {
  let len = 0
  let cx = 0
  let cy = 0
  for (const c of curves) {
    const l = length(c)
    const [x, y] = mid(c)
    len += l
    cx += x * l
    cy += y * l
  }
  return { curves, closed, len, cx: cx / (len || 1), cy: cy / (len || 1) }
}

/** The strokes of an icon at rest (or in the state its name says), as cubic curves in the 24 grid. */
export function strokesOf(name: string, params?: Partial<Style>): Stroke[] {
  const found = resolve(name)
  if (!found) throw new Error(`Unknown icon "${name}"`)
  let svg = renderIcon(name, params, { inline: true })
  if (!found.state) svg = stripStateShapes(svg) // a state-only accessory is not part of the normal look
  svg = stripPose(svg)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const strokes: Stroke[] = []
  for (const el of doc.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon')) {
    let m = new DOMMatrix()
    for (let node: Node | null = el; node?.nodeType === 1; node = node.parentNode) {
      const t = node instanceof SVGGraphicsElement ? node.transform.baseVal.consolidate() : null
      if (t) m = new DOMMatrix([t.matrix.a, t.matrix.b, t.matrix.c, t.matrix.d, t.matrix.e, t.matrix.f]).multiply(m)
    }
    for (const stroke of pathStrokes(shapeData(el))) {
      const curves = stroke.curves.map((c): Cubic => {
        const p0 = m.transformPoint({ x: c[0], y: c[1] })
        const p1 = m.transformPoint({ x: c[2], y: c[3] })
        const p2 = m.transformPoint({ x: c[4], y: c[5] })
        const p3 = m.transformPoint({ x: c[6], y: c[7] })
        return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]
      })
      strokes.push(describe(curves, stroke.closed))
    }
  }
  return strokes
}
