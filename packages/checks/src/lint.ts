import { SPEC, stripStateShapes } from '@icon-canvas/core'
import { STYLE, safe } from './style.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'
// Positions and sizes sit on the grid. Corner radii (rect rx/ry) do not: with the radius setting they are
// derived values (3 x 1.6 = 4.8), and a radius is not a place on the grid.
const GRID_ATTRS = ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2']
const PRIMITIVES = ['circle', 'rect', 'line', 'ellipse']

/** Geometry bounding box (stroke excluded) of the given SVG child nodes. */
function measure(nodes: readonly Node[]): DOMRect {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${SPEC.size} ${SPEC.size}`)
  svg.setAttribute('width', '240')
  svg.setAttribute('height', '240')
  svg.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none'
  const g = document.createElementNS(SVG_NS, 'g')
  g.append(...nodes.map((n) => document.importNode(n, true)))
  svg.append(g)
  document.body.append(svg)
  try {
    return g.getBBox()
  } finally {
    svg.remove()
  }
}

const onGrid = (v: string): boolean => {
  const n = Number.parseFloat(v)
  if (Number.isNaN(n)) return true // percentages / units are out of scope
  const q = n / SPEC.grid
  return Math.abs(q - Math.round(q)) < 1e-6
}

const tooPrecise = (text: string): boolean =>
  (text.match(/\d*\.\d+/g) ?? []).some((m) => (m.split('.')[1]?.length ?? 0) > SPEC.maxDecimals)

const fmt = (n: number): number => Number(n.toFixed(2))

export type Status = 'pass' | 'warn' | 'fail'

/** The outcome of one rule for one icon. */
export interface LintResult {
  id: string
  label: string
  status: Status
  detail: string
}

/**
 * Lint a standalone icon SVG string against SPEC.
 * Returns [{ id, label, status: 'pass' | 'warn' | 'fail', detail }].
 */
export function lintSVG(source: string): LintResult[] {
  const markup = stripStateShapes(source) // the rules describe the icon at rest; state-only elements are checked by the pose lint
  const results: LintResult[] = []
  const add = (id: string, label: string, status: Status, detail = ''): void => {
    results.push({ id, label, status, detail })
  }

  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    add('parse', 'Valid SVG', 'fail', (parseError.textContent ?? '').trim().split('\n')[0] ?? '')
    return results
  }
  const root = doc.documentElement
  const all = [...root.querySelectorAll('*')]
  const shapes = all.filter((e) => e.localName !== 'g')

  // 1. viewBox and sizing
  {
    const problems = []
    if (root.getAttribute('viewBox') !== `0 0 ${SPEC.size} ${SPEC.size}`) {
      problems.push(`viewBox must be "0 0 ${SPEC.size} ${SPEC.size}"`)
    }
    if (root.hasAttribute('width') || root.hasAttribute('height')) {
      problems.push('remove width/height (size with CSS)')
    }
    add(
      'viewbox',
      `${SPEC.size}×${SPEC.size} viewBox, no fixed size`,
      problems.length ? 'fail' : 'pass',
      problems.join('; '),
    )
  }

  // 2. root styling
  {
    const want: Record<string, string> = {
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': String(STYLE.stroke),
      'stroke-linecap': STYLE.cap,
      'stroke-linejoin': STYLE.join,
    }
    const problems = Object.entries(want)
      .filter(([k, v]) => root.getAttribute(k) !== v)
      .map(([k, v]) => `${k} should be ${v} (is ${root.getAttribute(k) ?? 'missing'})`)
    add(
      'style',
      `${STYLE.stroke}px stroke, ${STYLE.cap} caps, ${STYLE.join} joins, currentColor`,
      problems.length ? 'fail' : 'pass',
      problems.join('; '),
    )
  }

  // 3. allowed elements
  {
    const bad = [...new Set(all.map((e) => e.localName).filter((n) => !SPEC.allowedElements.includes(n)))]
    add(
      'elements',
      'Only basic shapes (path, circle, rect, line, …)',
      bad.length ? 'fail' : 'pass',
      bad.length ? `not allowed: ${bad.join(', ')}` : '',
    )
  }

  // 4. hygiene: no ids, classes, styles, transforms, colours, per-element stroke overrides
  {
    const problems = new Set<string>()
    for (const e of all) {
      for (const a of SPEC.forbiddenAttrs)
        if (e.hasAttribute(a) && !(a === 'opacity' && e.hasAttribute('data-st')))
          problems.add(`${a} on <${e.localName}>`) // off-state strokes are hidden by opacity="0" in the file
    }
    add(
      'hygiene',
      'Pure line: no fills, colours, styles or overrides on shapes',
      problems.size ? 'fail' : 'pass',
      [...problems].join('; '),
    )
  }

  // 5. not empty
  if (shapes.length === 0) {
    add('empty', 'Has artwork', 'fail', 'no shapes')
    return results
  }

  // 6. live area (geometry within SAFE so the stroke stays inside the 20×20 live area)
  {
    const b = measure([...root.childNodes])
    const t = SPEC.tolerance
    const SAFE = safe()
    const out: string[] = []
    if (b.x < SAFE.min - t) out.push(`left ${fmt(b.x)}`)
    if (b.y < SAFE.min - t) out.push(`top ${fmt(b.y)}`)
    if (b.x + b.width > SAFE.max + t) out.push(`right ${fmt(b.x + b.width)}`)
    if (b.y + b.height > SAFE.max + t) out.push(`bottom ${fmt(b.y + b.height)}`)
    add(
      'live-area',
      `Inside ${SPEC.size - 2 * SPEC.padding}×${SPEC.size - 2 * SPEC.padding} live area (stroke included)`,
      out.length ? 'fail' : 'pass',
      out.length
        ? `geometry should stay within ${SAFE.min} to ${SAFE.max}; over at ${out.join(', ')}`
        : `bounds ${fmt(b.x)},${fmt(b.y)} to ${fmt(b.x + b.width)},${fmt(b.y + b.height)}`,
    )
  }

  // 7. grid + precision (warning: curves and diagonals legitimately break the grid)
  {
    const off = new Set<string>()
    for (const e of shapes) {
      if (PRIMITIVES.includes(e.localName)) {
        // an ellipse's rx/ry are its size, so they stay on the grid; a rect's rx/ry are a corner radius, so they don't
        const attrs = e.localName === 'ellipse' ? [...GRID_ATTRS, 'rx', 'ry'] : GRID_ATTRS
        for (const a of attrs) {
          const value = e.getAttribute(a)
          if (value !== null && !onGrid(value)) off.add(`${e.localName}[${a}=${value}]`)
        }
      }
      for (const a of ['d', 'points']) {
        const value = e.getAttribute(a)
        if (value !== null && tooPrecise(value)) off.add(`${e.localName} ${a} has >${SPEC.maxDecimals} decimals`)
      }
    }
    add(
      'grid',
      `Primitives on a ${SPEC.grid} grid, ≤ ${SPEC.maxDecimals} decimals`,
      off.size ? 'warn' : 'pass',
      [...off].join('; '),
    )
  }

  // 8. detail budget
  add(
    'detail',
    `At most ${SPEC.maxShapes} shapes`,
    shapes.length > SPEC.maxShapes ? 'warn' : 'pass',
    `${shapes.length} shape${shapes.length === 1 ? '' : 's'}`,
  )

  return results
}

/** Roll a result list up to one status. */
export function overall(results: readonly LintResult[]): Status {
  if (results.some((r) => r.status === 'fail')) return 'fail'
  if (results.some((r) => r.status === 'warn')) return 'warn'
  return 'pass'
}
