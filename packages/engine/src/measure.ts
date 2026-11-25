import {
  analyse,
  EXEMPT,
  features,
  inkDiff,
  type LintResult,
  type Measurement,
  minGap,
  type Status,
} from '@icon-canvas/checks'
import { type ShapeReport, analyse as shapeAnalyse } from '@icon-canvas/checks/paper'
import { RECIPES, SPEC, type Style, stripStateShapes } from '@icon-canvas/core'
import { getIcon } from '@icon-canvas/icons'
import { renderIcon } from '@icon-canvas/runtime'
import { SIZE } from './markup.ts'
import { getName } from './state.ts'

/** The raster measurements and the shape analysis of one drawing. */
export interface Measured extends Measurement {
  shape: ShapeReport & { error?: string }
  /** how far the drawn extent sits from the canvas centre */
  offset: number
}

export async function measureSVG(svg: string): Promise<Measured> {
  const m = await analyse(svg)
  let shape: Measured['shape']
  try {
    shape = shapeAnalyse(stripStateShapes(svg)) // geometry of what is there at rest: state-only elements are invisible until a state brings them in
  } catch (e) {
    shape = {
      paths: 0,
      segments: 0,
      length: 0,
      kinks: [],
      inflections: 0,
      symmetry: { exact: 0, nearMiss: [] },
      loose: [],
      error: String(e),
    }
  }
  return { ...m, shape, offset: Math.max(Math.abs(m.bx - SIZE / 2), Math.abs(m.by - SIZE / 2)) }
}

/** How an icon follows the radius and curve settings. */
export interface Coverage {
  circles: number
  corners: number
  /** what it ignores, if anything */
  reasons: string[]
  /** why it is exempt, if it is */
  exempt?: string
}

const coverageCache = new Map<string, Coverage>()

/**
 * Does the saved icon respond to the radius and curve settings wherever it has rounded corners or
 * circles? Compares the default drawing with extreme settings; an icon with the features but no
 * visible change has no (or a broken) recipe.
 */
export async function coverageFor(name: string): Promise<Coverage | null> {
  const icon = getIcon(name)
  if (!icon) return null
  const key = `${name}|${icon.svg}|${Object.hasOwn(RECIPES, name)}`
  const cached = coverageCache.get(key)
  if (cached) return cached
  const f = features(stripStateShapes(icon.svg)) // state-only elements follow the radius but are not what the icon is at rest
  const exempt = EXEMPT[name]
  if (exempt) return { ...f, reasons: [], exempt }
  const draw = (p: Partial<Style>): string => renderIcon(name, p, { inline: true })
  const base = draw({})
  const plural = (n: number, w: string): string => `${n} ${w}${n > 1 ? 's' : ''}`
  const reasons: string[] = []
  if (f.corners) {
    const d = Math.max(await inkDiff(base, draw({ radius: 0 })), await inkDiff(base, draw({ radius: 2.5 })))
    if (d < 0.002) reasons.push(`${plural(f.corners, 'rounded corner')} ignore the radius setting`)
  }
  if (f.circles) {
    const d = await inkDiff(base, draw({ curve: 1 }))
    if (d < 0.002) reasons.push(`${plural(f.circles, 'circle')} ignore the curve setting`)
  }
  const out = { ...f, reasons }
  coverageCache.set(key, out)
  return out
}

export const looseText = (l: ShapeReport['loose'][number]): string =>
  l.kind === 'unclosed'
    ? `path ${l.path} starts and ends at ${l.at.join(', ')} but isn't closed (use z)`
    : `end at ${l.at.join(', ')} stops ${l.gap}px short of ${(l.to ?? []).join(', ')}`

/** One line of the inspector's check list. */
export type CheckRow = Pick<LintResult, 'label' | 'detail'> & { status: Status }

/**
 * The measured checks for one drawing (gaps, centring, kinks, loose ends, recipe coverage), as rows
 * the inspector can show, plus a one-line summary.
 */
export async function measureChecks(
  svg: string,
  name: string = getName(),
): Promise<{ rows: CheckRow[]; info: string }> {
  const m = await measureSVG(svg)
  const rows: CheckRow[] = [
    {
      status: m.gaps.length ? 'warn' : 'pass',
      label: `≥ ${minGap()}px clear between strokes`,
      detail: m.gaps
        .slice(0, 3)
        .map((g) => `${g.clear}px at ${g.at.join(', ')}`)
        .join('; '),
    },
    {
      status: m.offset > SPEC.maxCentreOffset ? 'warn' : 'pass',
      label: 'Centred in the canvas',
      detail: `drawn extent centred at ${m.bx.toFixed(1)}, ${m.by.toFixed(1)} (off by ${m.offset.toFixed(1)})`,
    },
    {
      status: m.shape.kinks.length ? 'warn' : 'pass',
      label: 'Smooth curves (no tangent kinks)',
      detail: m.shape.kinks
        .slice(0, 3)
        .map((k) => `${k.deg}° break at ${k.at.join(', ')}`)
        .join('; '),
    },
    {
      status: m.shape.loose.length ? 'warn' : 'pass',
      label: 'Strokes connect where they nearly touch',
      detail: m.shape.loose.slice(0, 3).map(looseText).join('; '),
    },
  ]
  const cov = name ? await coverageFor(name) : null
  if (cov && (cov.corners || cov.circles)) {
    rows.push({
      status: cov.reasons.length ? 'warn' : 'pass',
      label: 'Follows the radius and curve settings',
      detail: cov.reasons.join('; '),
    })
  }
  return {
    rows,
    info: `Ink ${(m.coverage * 100).toFixed(1)}% · extent ${m.w.toFixed(1)}×${m.h.toFixed(1)} · ${m.shape.paths} paths, ${m.shape.segments} segments`,
  }
}
