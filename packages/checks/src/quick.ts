// A quick check of a recipe's markup from its numbers alone: no DOM, no canvas, no Chrome, a fraction of a second.
// It finds what the browser checks would find (bounds, centring, grid, narrow gaps, loose ends, kinks), so a recipe can be
// fixed before it is ever drawn. The browser checks (`pnpm verify-icons`) stay the final word.
import { SPEC } from '@icon-canvas/core'
import { DELIBERATE } from './deliberate.ts'
import { analysePaths, simplePaths, withShapes } from './paper-tools.ts'

export interface QuickFinding {
  /** `fail` is a rule the set audit fails; `warn` is something to look at */
  level: 'fail' | 'warn'
  rule: 'bounds' | 'centre' | 'size' | 'grid' | 'detail' | 'gap' | 'loose' | 'kink'
  message: string
}

const STROKE = SPEC.stroke
/**
 * Centre-line distance below which two strokes leave a visibly narrow channel. The spec asks for 1.5 of white (a distance of 3.0), but
 * the flare where two strokes cross at a shallow angle passes through that on its way to opening up, and the known-good set has dozens
 * of those. A steady channel narrower than 1.1 of white is the real mistake (a switch 2.5 from its walls was 0.91).
 */
const NARROW = STROKE + 1.1
/** Closer than this the two strokes read as one blot (under 0.3 of white): there is no channel to measure. */
const MERGED = STROKE + 0.3
const STEP = 0.25
/** A narrow stretch must be this long to count: shorter ones are the flare where two strokes meet. */
const MIN_RUN = 3

const snap25 = (v: number): number => Math.round(v * 4) / 4
const fmt = (v: number): number => Number(v.toFixed(2))

function gridFindings(markup: string): QuickFinding[] {
  const out: QuickFinding[] = []
  const onGrid = (v: number): boolean => Math.abs(v / SPEC.grid - Math.round(v / SPEC.grid)) < 1e-6
  for (const match of markup.matchAll(/<(circle|rect|line|ellipse)\b([^>]*?)\/?>/g)) {
    const kind = match[1] ?? ''
    const names =
      kind === 'rect'
        ? ['x', 'y', 'width', 'height']
        : kind === 'circle'
          ? ['cx', 'cy', 'r']
          : kind === 'line'
            ? ['x1', 'y1', 'x2', 'y2']
            : ['cx', 'cy', 'rx', 'ry']
    for (const name of names) {
      const value = new RegExp(`\\s${name}="([^"]*)"`).exec(match[2] ?? '')?.[1]
      if (value !== undefined && !onGrid(Number.parseFloat(value))) {
        out.push({ level: 'warn', rule: 'grid', message: `${kind} ${name}=${value} is not on the ${SPEC.grid} grid` })
      }
    }
  }
  for (const match of markup.matchAll(/\sd="([^"]*)"/g)) {
    if ((match[1] ?? '').match(/\d*\.\d+/g)?.some((m) => (m.split('.')[1]?.length ?? 0) > SPEC.maxDecimals)) {
      out.push({ level: 'warn', rule: 'grid', message: `a path has more than ${SPEC.maxDecimals} decimals` })
    }
  }
  return out
}

/** Stretches where one path runs closer to another than the minimum clear space, away from any join. */
function gapFindings(paths: readonly { label: string; path: paper.Path }[]): QuickFinding[] {
  const found = new Map<string, QuickFinding & { length: number }>()
  for (const [i, a] of paths.entries()) {
    for (const [j, b] of paths.entries()) {
      if (i === j) continue
      let run = 0
      let minDistance = Number.POSITIVE_INFINITY
      let at: [number, number] = [0, 0]
      const flush = (): void => {
        const length = run * STEP
        if (length >= MIN_RUN) {
          const key = `${Math.min(i, j)}-${Math.max(i, j)}`
          const previous = found.get(key)
          if (!previous || previous.length < length) {
            found.set(key, {
              level: 'warn',
              rule: 'gap',
              length,
              message: `${a.label} and ${b.label} are ${fmt(minDistance - STROKE)}px apart (needs ${SPEC.minGap}) for ${fmt(length)} units near (${at.join(', ')})`,
            })
          }
        }
        run = 0
        minDistance = Number.POSITIVE_INFINITY
      }
      for (let offset = 0; offset <= a.path.length; offset += STEP) {
        const point = a.path.getPointAt(offset)
        if (!point) continue
        const distance = b.path.getNearestPoint(point).getDistance(point)
        if (distance >= MERGED && distance < NARROW) {
          run++
          if (distance < minDistance) {
            minDistance = distance
            at = [fmt(point.x), fmt(point.y)]
          }
        } else flush()
      }
      flush()
    }
  }
  return [...found.values()].map(({ length: _length, ...finding }) => finding)
}

/** Check the markup of an icon (its shapes, drawn at the default look). `name` lets the deliberate exceptions apply. */
export function quickCheck(markup: string, name = ''): QuickFinding[] {
  const out: QuickFinding[] = [...gridFindings(markup)]
  withShapes(markup, (shapes) => {
    if (shapes.length === 0) {
      out.push({ level: 'fail', rule: 'detail', message: 'no shapes' })
      return
    }
    if (shapes.length > SPEC.maxShapes) {
      out.push({ level: 'warn', rule: 'detail', message: `${shapes.length} shapes (at most ${SPEC.maxShapes})` })
    }
    const labelled = shapes.flatMap((shape, index) =>
      simplePaths(shape.item).map((path) => ({ label: `shape ${index} (${shape.kind})`, path })),
    )
    const box = shapes.map((s) => s.item.bounds).reduce((a, b) => a.unite(b))
    const min = SPEC.padding + STROKE / 2
    const max = SPEC.size - SPEC.padding - STROKE / 2
    const t = SPEC.tolerance
    const over: string[] = []
    if (box.left < min - t) over.push(`left ${fmt(box.left)}`)
    if (box.top < min - t) over.push(`top ${fmt(box.top)}`)
    if (box.right > max + t) over.push(`right ${fmt(box.right)}`)
    if (box.bottom > max + t) over.push(`bottom ${fmt(box.bottom)}`)
    if (over.length) {
      out.push({
        level: 'fail',
        rule: 'bounds',
        message: `geometry should stay within ${min} to ${max}; over at ${over.join(', ')}`,
      })
    }
    const dx = SPEC.size / 2 - box.center.x
    const dy = SPEC.size / 2 - box.center.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) > SPEC.maxCentreOffset && !DELIBERATE.centre[name]) {
      out.push({
        level: 'fail',
        rule: 'centre',
        message: `off-centre by (${fmt(-dx)}, ${fmt(-dy)}): add ${snap25(dx)} to every x and ${snap25(dy)} to every y`,
      })
    }
    const extent = Math.max(box.width, box.height) + STROKE
    if (extent < 0.8 * 19.5 && !DELIBERATE.small[name]) {
      out.push({ level: 'warn', rule: 'size', message: `only ${fmt(extent)} across: the set's median is about 19.5` })
    }
    out.push(...gapFindings(labelled))
    const report = analysePaths(labelled.map((l) => l.path))
    for (const loose of report.loose) {
      out.push({
        level: 'warn',
        rule: 'loose',
        message:
          loose.kind === 'unclosed'
            ? `shape path ${loose.path} starts and ends at ${loose.at.join(', ')} but is not closed (use z)`
            : `an end at ${loose.at.join(', ')} stops ${loose.gap}px short of ${(loose.to ?? []).join(', ')}`,
      })
    }
    for (const kink of report.kinks) {
      out.push({ level: 'warn', rule: 'kink', message: `${kink.deg}° tangent break at ${kink.at.join(', ')}` })
    }
  })
  return out
}
