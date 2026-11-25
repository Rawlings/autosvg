import {
  a11yAudit,
  analyse,
  DELIBERATE,
  inkDiff,
  type LintResult,
  lintPoses,
  lintSVG,
  minGap,
  morphAudit,
  nearestVectors,
  perfAudit,
  STYLE,
} from '@autosvg/checks'
import * as pp from '@autosvg/checks/paper'
import { DEFAULT_STYLE, POSES, RECIPES, SPEC, type Style } from '@autosvg/core'
import * as geo from '@autosvg/core/geo'
import { morphPlan, renderIcon, stateNames } from '@autosvg/runtime'
import { getVector, registerVector, VECTORS } from '@autosvg/vectors'
import { canonical, normal, SIZE } from './markup.ts'
import { coverageFor, looseText, measureSVG } from './measure.ts'
import {
  appendArtwork,
  changed,
  clearArtwork,
  getName,
  markup,
  nameArtwork,
  patchArtwork,
  replaceArtwork,
  setName,
  setTile,
} from './state.ts'

/** The drawing on the canvas as a standalone vector, in the style currently being previewed. */
export const getSVG = (): string => canonical(markup())

/** `what` is a vector name, a whole <svg>, or inner shapes: this is the <svg> to measure. */
function svgOf(what: string): string {
  const named = getVector(what)
  if (named) return renderIcon(named.name, STYLE, { inline: true })
  return what.trim().startsWith('<svg') ? what : canonical(what)
}

const issueText = (r: LintResult): string => `${r.status}: ${r.label} | ${r.detail}`

// ---------- style settings as CSS custom properties ----------

const CSS_VARS: Record<keyof Style, string> = {
  stroke: '--autosvg-stroke',
  cap: '--autosvg-cap',
  join: '--autosvg-join',
  radius: '--autosvg-radius',
  curve: '--autosvg-curve',
}

/** Publish the style as inline custom properties on <html>: the set's real interface. Every vector follows. */
function writeCssVars(): void {
  for (const key of Object.keys(CSS_VARS) as (keyof Style)[]) {
    document.documentElement.style.setProperty(CSS_VARS[key], String(STYLE[key]))
  }
}

const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0

/** The one-call check's answer. */
export interface VerifyReport {
  ok: boolean
  issues: string[]
  hints: string[]
  notes: string[]
  ink: number
  extent: [number, number]
}

// ---------- public API (for humans, devtools, and agents) ----------

/**
 * window.autosvg: the headless engine behind the studio. An agent (or a human in devtools) draws, measures and compares
 * with it; the React app is only a view of the same state.
 */
export const api = {
  size: SIZE,
  spec: SPEC,
  /** the set's own look: stroke, cap, join, radius, curve */
  defaults: DEFAULT_STYLE,
  /** Findings the set audit accepts on purpose, with the reason. */
  deliberate: DELIBERATE,
  /** Every vector file's name. */
  get vectors(): string[] {
    return VECTORS.map((i) => i.name)
  },
  /** Names that are a vector in one of its states (mic-off, eye-off, lock-open, unlock ...): no files, the same vector drawn with --autosvg-state set. */
  aliases: stateNames(),

  /** Replace the artwork. Accepts inner shapes or a complete <svg>. */
  setSVG(text: string): string {
    replaceArtwork(text)
    return getSVG()
  },

  /** Append shapes to the artwork. */
  append(text: string): string {
    appendArtwork(text)
    return getSVG()
  },

  /** Set attributes on every element matching selector (inside the artwork). null removes. */
  patch(selector: string, attrs: Record<string, string | number | null>): number {
    return patchArtwork(selector, attrs)
  },

  clear(): void {
    clearArtwork()
  },

  /** Load a vector from the set by name into the editor. */
  load(name: string): string {
    const vector = getVector(name)
    if (!vector) throw new Error(`No vector "${name}". Available: ${api.vectors.join(', ')}`)
    setName(name)
    replaceArtwork(vector.svg)
    return getSVG()
  },

  /** Spec check results for the current drawing. */
  lint(): LintResult[] {
    return lintSVG(getSVG())
  },

  /**
   * Paper.js tools. All take and return SVG markup strings.
   *   pp.boolean(op, a, b)   op: unite | subtract | intersect | exclude | divide
   *   pp.unite([a, b, ...])  outline of the union of shapes
   *   pp.simplify(m, tol)    fewer curve segments
   *   pp.centre(m)           centre the geometry on the canvas
   *   pp.analyse(m)          kinks, inflections, symmetry
   */
  pp,

  /**
   * One-call check with fix hints: lint + measurements + Paper.js shape analysis.
   * Returns { ok, issues, hints }. Run it, apply the hints, run it again until ok.
   */
  async verify(what: string): Promise<VerifyReport> {
    const svg = svgOf(what)
    const m = await measureSVG(svg)
    const issues: string[] = []
    const hints: string[] = []
    for (const r of lintSVG(svg)) {
      if (r.status !== 'pass') issues.push(issueText(r))
    }
    for (const g of m.gaps) {
      issues.push(`narrow gap ${g.clear}px (needs ${minGap()}) around ${g.at.join(', ')}`)
      hints.push(
        `open the channel near (${g.at.join(', ')}): move one stroke ~${(minGap() - g.clear).toFixed(2)}px away, or remove detail`,
      )
    }
    if (m.offset > SPEC.maxCentreOffset) {
      issues.push(`extent off-centre by ${m.offset.toFixed(2)}`)
      hints.push(
        `translate by (${(SIZE / 2 - m.bx).toFixed(2)}, ${(SIZE / 2 - m.by).toFixed(2)}), or run autosvg.pp.centre(markup)`,
      )
    }
    for (const k of m.shape.kinks) {
      issues.push(`${k.deg}° tangent break at ${k.at.join(', ')}`)
      hints.push(
        `rebuild the joint at (${k.at.join(', ')}) with roundedPolygon/arcOn so the tangent is continuous, or make it a clear corner`,
      )
    }
    for (const l of m.shape.loose) {
      issues.push(`not connected: ${looseText(l)}`)
      hints.push(
        l.kind === 'unclosed'
          ? `path ${l.path}: close it with z so the join is a real corner`
          : `extend the end at (${l.at.join(', ')}) to touch (${(l.to ?? []).join(', ')}), or, if the gap is deliberate, open it to at least ${minGap()}px clear`,
      )
    }
    // Notes are not failures: "almost symmetric" also describes deliberately asymmetric shapes
    // (cloud, chat bubble). Only act on a note if the vector was meant to be symmetric.
    const notes = m.shape.symmetry.nearMiss.map(
      (nm) =>
        `path ${nm.path} is almost mirror-symmetric (mean error ${nm.mean}, worst ${nm.max}); if it should be symmetric, build one half and mirror it with symmetric()`,
    )
    return {
      ok: issues.length === 0,
      issues,
      hints,
      notes,
      ink: +(m.coverage * 100).toFixed(1),
      extent: [+m.w.toFixed(1), +m.h.toFixed(1)],
    }
  },

  /** Measure a vector by name, a full <svg>, or inner shapes: ink, optical centre, extent, narrow gaps. */
  async inspect(what: string) {
    const svg = svgOf(what)
    const m = await measureSVG(svg)
    return {
      ink: +(m.coverage * 100).toFixed(1),
      extent: [+m.w.toFixed(1), +m.h.toFixed(1)],
      extentCentre: [+m.bx.toFixed(2), +m.by.toFixed(2)],
      massCentre: [+m.cx.toFixed(2), +m.cy.toFixed(2)],
      offset: +m.offset.toFixed(2),
      gaps: m.gaps.slice(0, 5),
      kinks: m.shape.kinks,
      loose: m.shape.loose,
      inflections: m.shape.inflections,
      symmetry: m.shape.symmetry,
      lint: lintSVG(svg)
        .filter((r) => r.status !== 'pass')
        .map(issueText),
    }
  },

  /** Measure the whole set. Returns the median plus every vector that is an outlier or has a warning. */
  async audit() {
    const rows = []
    for (const vector of VECTORS) {
      rows.push({ name: vector.name, ...(await measureSVG(renderIcon(vector.name, STYLE, { inline: true }))) })
    }
    const medInk = median(rows.map((r) => r.coverage))
    const medExtent = median(rows.map((r) => Math.max(r.w, r.h)))
    const flagged: string[] = []
    for (const r of rows) {
      const why: string[] = []
      const gap = r.gaps[0]
      if (gap) why.push(`gap ${gap.clear}px at ${gap.at.join(',')}`)
      if (r.offset > SPEC.maxCentreOffset && !DELIBERATE.centre[r.name]) why.push(`off-centre ${r.offset.toFixed(1)}`)
      const kink = r.shape.kinks[0]
      if (kink) why.push(`kink ${kink.deg}° at ${kink.at.join(',')}`)
      const loose = r.shape.loose[0]
      if (loose) why.push(`loose end: ${looseText(loose)}`)
      // near-miss symmetry: exactly symmetric or clearly asymmetric are fine, "almost" is sloppy
      const ext = Math.max(r.w, r.h)
      if (ext < medExtent * 0.8 && r.coverage > 0.03 && !DELIBERATE.small[r.name]) {
        why.push(`small ${ext.toFixed(1)} vs ${medExtent.toFixed(1)}`)
      }
      if (why.length) flagged.push(`${r.name}: ${why.join('; ')}`)
    }
    // performance is part of the audit: what the set costs the browser (see checks/src/perf-audit.ts)
    const perf = await perfAudit()
    for (const f of perf.flagged) flagged.push(`performance: ${f}`)
    return {
      count: rows.length,
      medianInk: +(medInk * 100).toFixed(1),
      medianExtent: +medExtent.toFixed(1),
      flagged,
      deliberate: DELIBERATE,
      perf: { ok: perf.ok, ...perf.set, slowest: perf.slowest },
    }
  },

  /**
   * Agent-only: write the canvas to its vector file (packages/vectors/svg/<name>.svg) through the dev server.
   * There is deliberately no Save button in the page. A new name creates a new vector.
   */
  async save(name: string = getName()): Promise<{ saved: string }> {
    if (!name) throw new Error('Name the vector: autosvg.save("my-vector")')
    // The style controls only preview; files always get the set's own look.
    const svg = normal(getSVG())
    const res = await fetch('/__save-vector', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, svg }),
    })
    const out: { ok: boolean; error?: string } = await res.json()
    if (!out.ok) throw new Error(out.error)
    registerVector({ name, svg })
    nameArtwork(name)
    return { saved: name }
  },

  /**
   * Preview style: { stroke, cap, join, radius, curve }. Published as CSS custom properties (--autosvg-*) on
   * the gallery, which is how the set is meant to be consumed. The canvas and every check follow it.
   * It only visualises the difference; no file changes. radius and curve apply to vectors with a recipe.
   */
  setStyle(next: Partial<Style> = {}): Style {
    const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, +v))
    if (next.stroke !== undefined) STYLE.stroke = clamp(next.stroke, 0.25, 3)
    if (next.radius !== undefined) STYLE.radius = clamp(next.radius, 0, 2.5)
    if (next.curve !== undefined) STYLE.curve = clamp(next.curve, 0, 1)
    if (next.cap) STYLE.cap = next.cap
    if (next.join) STYLE.join = next.join
    writeCssVars()
    changed()
    return { ...STYLE }
  },

  /** Back to the set's own look (and remove the preview variables from the gallery). */
  resetStyle(): Style {
    Object.assign(STYLE, DEFAULT_STYLE)
    for (const v of Object.values(CSS_VARS)) document.documentElement.style.removeProperty(v)
    changed()
    return { ...STYLE }
  },

  getStyle: (): Style => ({ ...STYLE }),

  /** A vector as the runtime draws it, with explicit stroke attributes (so it stands alone). */
  render: (name: string, params: Partial<Style> = STYLE): string => renderIcon(name, params, { inline: true }),

  /**
   * Which vectors have rounded corners or circles but ignore the radius / curve settings? Those need a
   * recipe in packages/core/src/recipes.ts. `missing` must be empty.
   */
  async coverage(names?: readonly string[]) {
    const missing: Record<string, string> = {}
    const exempt: Record<string, string> = {}
    let responsive = 0
    let noFeatures = 0
    for (const vector of names ? VECTORS.filter((i) => names.includes(i.name)) : VECTORS) {
      const c = await coverageFor(vector.name)
      if (!c) continue
      if (c.exempt) exempt[vector.name] = c.exempt
      else if (!c.corners && !c.circles) noFeatures++
      else if (c.reasons.length) missing[vector.name] = c.reasons.join('; ')
      else responsive++
    }
    return {
      vectors: VECTORS.length,
      responsive,
      noFeatures,
      exempt,
      missingCount: Object.keys(missing).length,
      missing,
    }
  },

  /**
   * Do the recipes still reproduce their saved vectors at default settings? Lists recipes whose
   * rendering differs from the saved file (stale recipe or edited vector).
   */
  async recipeStatus(names?: readonly string[]) {
    const stale: Record<string, string> = {}
    for (const name of Object.keys(RECIPES).filter((n) => !names || names.includes(n))) {
      const vector = getVector(name)
      if (!vector) {
        stale[name] = 'no saved vector'
        continue
      }
      const d = await inkDiff(renderIcon(name, DEFAULT_STYLE, { inline: true }), normal(vector.svg))
      if (d > 0.02) stale[name] = `differs from the saved file by ${(d * 100).toFixed(1)}%`
    }
    return { recipes: Object.keys(RECIPES).length, stale }
  },

  /** Gallery vector size in px (16 to 64). */
  setTileSize(px: number): number {
    return setTile(+px)
  },

  /**
   * Which vectors break at each weight? For every weight, lists vectors that fail a rule or have strokes
   * closer than one stroke width. Restores the current style afterwards.
   */
  async sweep(weights: readonly number[] = [1, 1.25, 1.5, 1.75, 2, 2.5]) {
    const keep = { ...STYLE }
    const out: Record<number, { count: number; broken: Record<string, string> }> = {}
    try {
      for (const w of weights) {
        STYLE.stroke = w
        const broken: Record<string, string> = {}
        for (const vector of VECTORS) {
          const svg = renderIcon(vector.name, STYLE, { inline: true })
          const lintFail = lintSVG(svg).find((r) => r.status === 'fail')
          const m = await analyse(svg)
          const gap = m.gaps[0]
          if (lintFail) broken[vector.name] = lintFail.label
          else if (gap) broken[vector.name] = `gap ${gap.clear}px`
        }
        out[w] = { count: Object.keys(broken).length, broken }
      }
    } finally {
      Object.assign(STYLE, keep)
    }
    return out
  },

  /** Geometry helpers (roundedPolygon, circleChain, symmetric, centreOn, arcOn, ...), usable right in the canvas. */
  geo,

  /** Pose lint: structure, file in sync, every channel alive, ink in bounds at the overshoot. Returns the issues per vector. */
  poseLint: (names?: readonly string[]) => lintPoses(names),
  /** Performance audit: style cost of posing (set and single vector), recipe drawing cost, pose weight, against budgets. */
  perfAudit: (names?: readonly string[]) => perfAudit(names),
  /** Accessibility audit of how vectors are used in a page (or a container): hidden or labelled, named controls, target size, reduced motion. */
  a11yAudit: (root?: ParentNode) => a11yAudit(root),
  poses: POSES,
  /** The plan for turning one vector into another: a path pair per stroke, how much of the ink fades, how far it travels, and `rough` when a plain swap suits the pair better. */
  /** The vectors that look most like each given vector (default: all of them), with how different they are. A near copy is a duplicate. */
  nearest: (names?: readonly string[], k?: number) => nearestVectors(names ?? VECTORS.map((i) => i.name), k),
  morphPlan: (from: string, to: string, params?: Partial<Style>) => morphPlan(from, to, { ...STYLE, ...params }),
  /** Morph audit: every vector into the next (or the given pairs): same commands at both ends, on the canvas, cheap to plan. */
  morphAudit: (pairs?: readonly (readonly [string, string])[]) =>
    morphAudit(
      pairs,
      VECTORS.map((i) => i.name),
      STYLE,
    ),

  getSVG,
}

export type AutosvgApi = typeof api
