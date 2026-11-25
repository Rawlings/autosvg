// Headless icon engine: the model behind the app and the window.iconCanvas API (for devtools and agents).
//
// The drawing on the canvas is a detached <g>. The UI renders it, the API edits it, and `subscribe`
// tells React when anything changed. Nothing here touches the page's layout.
import { SPEC, STYLE, DEFAULT_STYLE, minGap } from './spec.js'
import { lintSVG, overall } from './lint.js'
import { ICONS } from './icons.js'
import { analyse, inkDiff } from './measure.js'
import { renderIcon, defineIconGlyph, stateNames } from './icon-runtime.js'
import { defineIconMorph, morphPlan, morphAudit } from './morph.js'
import { RECIPES } from './recipes.js'
import { features, EXEMPT } from './coverage.js'
import { lintPoses } from './pose-lint.js'
import { perfAudit } from './perf-audit.js'
import { a11yAudit } from './a11y-audit.js'
import { POSES, stripStateShapes } from './poses.js'
import * as pp from './paper-tools.js'
import * as geo from './geo.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const SIZE = SPEC.size

defineIconGlyph() // <icon-glyph>: every icon in the app is drawn through its real CSS-variable interface
defineIconMorph() // <icon-morph>: any icon turning into any other

// ---------- the drawing ----------

const artwork = document.createElementNS(SVG_NS, 'g')
let currentName = '' // the icon being edited in the canvas
let tile = 32 // gallery icon size

/** Remove scripts and inline event handlers from untrusted markup. */
function sanitize(root) {
  root.querySelectorAll('script, foreignObject').forEach((n) => n.remove())
  root.querySelectorAll('*').forEach((n) => {
    for (const attr of [...n.attributes]) {
      if (/^on/i.test(attr.name)) n.removeAttribute(attr.name)
      if (/^(xlink:)?href$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) {
        n.removeAttribute(attr.name)
      }
    }
  })
}

/** Parse markup (inner shapes, or a full <svg>) into sanitized child nodes. */
function parseMarkup(markup) {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}">${markup}</svg>`,
    'image/svg+xml',
  )
  if (doc.querySelector('parsererror')) {
    throw new Error(doc.querySelector('parsererror').textContent.trim().split('\n')[0])
  }
  let root = doc.documentElement
  // If the caller passed a whole <svg>, unwrap it and keep its style attributes.
  const only = root.children.length === 1 ? root.children[0] : null
  let rootAttrs = null
  if (only && only.localName === 'svg') {
    rootAttrs = only
    root = only
  }
  sanitize(root)
  return { nodes: [...root.childNodes], rootAttrs }
}

const stripNs = (s) => s.replace(/ xmlns="[^"]*"/g, '')

const markup = () => stripNs(artwork.innerHTML).trim()

/** Wrap shapes in the canonical icon root (see SPEC.md). */
function canonical(inner, style = STYLE) {
  const attrs = {
    xmlns: SVG_NS,
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': style.stroke,
    'stroke-linecap': style.cap,
    'stroke-linejoin': style.join,
  }
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')
  return `<svg ${a}>\n${inner}\n</svg>`
}

/** Standalone icon SVG of whatever is on the canvas, in the style currently being previewed. */
function getSVG() {
  return canonical(markup())
}

/** An icon in the default look, so a comparison ignores the preview style. */
const normal = (svg) =>
  svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/stroke-width="[^"]*"/, `stroke-width="${DEFAULT_STYLE.stroke}"`)
      .replace(/stroke-linecap="[^"]*"/, `stroke-linecap="${DEFAULT_STYLE.cap}"`)
      .replace(/stroke-linejoin="[^"]*"/, `stroke-linejoin="${DEFAULT_STYLE.join}"`),
  )

export const sized = (svg, px) => svg.replace('<svg ', `<svg width="${px}" height="${px}" `)

// ---------- measurement ----------

async function measureSVG(svg) {
  const m = await analyse(svg)
  let shape
  try {
    shape = pp.analyse(stripStateShapes(svg)) // geometry of what is there at rest: state-only elements are invisible until a state brings them in
  } catch (e) {
    shape = { paths: 0, segments: 0, kinks: [], inflections: 0, symmetry: { exact: 0, nearMiss: [] }, loose: [], error: String(e) }
  }
  return { ...m, shape, offset: Math.max(Math.abs(m.bx - SIZE / 2), Math.abs(m.by - SIZE / 2)) }
}

/**
 * Findings the set consistency check reports but that are deliberate, each with its reason. They are listed in the audit result so the
 * exception stays visible. Anything not here that the check flags is a flaw to fix (undo was 3 px off-centre and was one).
 */
export const DELIBERATE = {
  small: {
    arrow: 'a mark: a single line and a head',
    check: 'a mark, small by nature',
    chevron: 'a mark, small by nature',
    close: 'a mark, small by nature',
    edit: 'a pencil along the diagonal, shorter than the grid',
    plus: 'a mark, small by nature (and minus is the same icon)',
    skip: 'a bar and a triangle, a compact glyph',
  },
  centre: { play: 'the triangle is centred by its weight, not its extent' },
}

const coverageCache = new Map()

/**
 * Does the saved icon respond to the radius and curve settings wherever it has rounded corners or
 * circles? Compares the default drawing with extreme settings; an icon with the features but no
 * visible change has no (or a broken) recipe.
 */
async function coverageFor(name) {
  const icon = ICONS.find((i) => i.name === name)
  if (!icon) return null
  const key = `${name}|${icon.svg}|${Object.keys(RECIPES).includes(name)}`
  if (coverageCache.has(key)) return coverageCache.get(key)
  const f = features(stripStateShapes(icon.svg)) // state-only elements follow the radius but are not what the icon is at rest
  if (EXEMPT[name]) return { ...f, reasons: [], exempt: EXEMPT[name] }
  const draw = (p) => renderIcon(name, p, { inline: true })
  const base = draw({})
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`
  const reasons = []
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

const looseText = (l) =>
  l.kind === 'unclosed'
    ? `path ${l.path} starts and ends at ${l.at.join(', ')} but isn't closed (use z)`
    : `end at ${l.at.join(', ')} stops ${l.gap}px short of ${l.to.join(', ')}`

/**
 * The measured checks for one drawing (gaps, centring, kinks, loose ends, recipe coverage), as rows
 * the inspector can show, plus a one-line summary.
 */
export async function measureChecks(svg, name = currentName) {
  const m = await measureSVG(svg)
  const rows = [
    {
      status: m.gaps.length ? 'warn' : 'pass',
      label: `≥ ${minGap()}px clear between strokes`,
      detail: m.gaps.slice(0, 3).map((g) => `${g.clear}px at ${g.at.join(', ')}`).join('; '),
    },
    {
      status: m.offset > SPEC.maxCentreOffset ? 'warn' : 'pass',
      label: 'Centred in the canvas',
      detail: `drawn extent centred at ${m.bx.toFixed(1)}, ${m.by.toFixed(1)} (off by ${m.offset.toFixed(1)})`,
    },
    {
      status: m.shape.kinks.length ? 'warn' : 'pass',
      label: 'Smooth curves (no tangent kinks)',
      detail: m.shape.kinks.slice(0, 3).map((k) => `${k.deg}° break at ${k.at.join(', ')}`).join('; '),
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

// ---------- store (for React's useSyncExternalStore) ----------

let snapshot = null
const listeners = new Set()
let rev = 0

function takeSnapshot() {
  snapshot = { rev: ++rev, name: currentName, markup: markup(), style: { ...STYLE }, tile }
}
/** Something changed: publish a new snapshot. */
function changed() {
  takeSnapshot()
  listeners.forEach((l) => l())
}
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))
export const getSnapshot = () => snapshot
takeSnapshot()

// ---------- brand settings as CSS custom properties ----------

const CSS_VARS = {
  stroke: '--icon-stroke',
  cap: '--icon-cap',
  join: '--icon-join',
  radius: '--icon-radius',
  curve: '--icon-curve',
}

/** Publish the style as inline custom properties on <html>: the set's real interface. Every icon follows. */
function writeCssVars() {
  for (const [k, v] of Object.entries(CSS_VARS)) document.documentElement.style.setProperty(v, String(STYLE[k]))
}

// ---------- public API (for humans, devtools, and agents) ----------

const api = {
  size: SIZE,
  spec: SPEC,
  defaults: DEFAULT_STYLE, // the set's own look: stroke, cap, join, radius, curve
  icons: ICONS.map((i) => i.name),
  /** Names that are an icon in one of its states (mic-off, eye-off, lock-open, unlock ...): no files, the same icon drawn with --icon-state set. */
  aliases: stateNames(),

  /** Replace the artwork. Accepts inner shapes or a complete <svg>. */
  setSVG(markup) {
    const { nodes } = parseMarkup(markup)
    artwork.replaceChildren(...nodes.map((n) => document.importNode(n, true)))
    changed()
    return api.getSVG()
  },

  /** Append shapes to the artwork. */
  append(markup) {
    const { nodes } = parseMarkup(markup)
    artwork.append(...nodes.map((n) => document.importNode(n, true)))
    changed()
    return api.getSVG()
  },

  /** Set attributes on every element matching selector (inside the artwork). null removes. */
  patch(selector, attrs) {
    const targets = artwork.querySelectorAll(selector)
    targets.forEach((t) => {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null) t.removeAttribute(k)
        else t.setAttribute(k, String(v))
      }
    })
    changed()
    return targets.length
  },

  clear() {
    artwork.replaceChildren()
    currentName = ''
    changed()
  },

  /** Load an icon from the set by name into the editor. */
  load(name) {
    const icon = ICONS.find((i) => i.name === name)
    if (!icon) throw new Error(`No icon "${name}". Available: ${api.icons.join(', ')}`)
    currentName = name
    api.setSVG(icon.svg)
    return api.getSVG()
  },

  /** Spec check results for the current drawing. */
  lint() {
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
  async verify(what) {
    const named = ICONS.find((i) => i.name === what)
    const svg = named ? renderIcon(named.name, STYLE, { inline: true }) : what.trim().startsWith('<svg') ? what : canonical(what)
    const m = await measureSVG(svg)
    const issues = []
    const hints = []
    for (const r of lintSVG(svg)) {
      if (r.status !== 'pass') issues.push(`${r.status}: ${r.label} | ${r.detail}`)
    }
    for (const g of m.gaps) {
      issues.push(`narrow gap ${g.clear}px (needs ${minGap()}) around ${g.at.join(', ')}`)
      hints.push(`open the channel near (${g.at.join(', ')}): move one stroke ~${(minGap() - g.clear).toFixed(2)}px away, or remove detail`)
    }
    if (m.offset > SPEC.maxCentreOffset) {
      issues.push(`extent off-centre by ${m.offset.toFixed(2)}`)
      hints.push(`translate by (${(SIZE / 2 - m.bx).toFixed(2)}, ${(SIZE / 2 - m.by).toFixed(2)}), or run iconCanvas.pp.centre(markup)`)
    }
    for (const k of m.shape.kinks) {
      issues.push(`${k.deg}° tangent break at ${k.at.join(', ')}`)
      hints.push(`rebuild the joint at (${k.at.join(', ')}) with roundedPolygon/arcOn so the tangent is continuous, or make it a clear corner`)
    }
    for (const l of m.shape.loose) {
      issues.push(`not connected: ${looseText(l)}`)
      hints.push(
        l.kind === 'unclosed'
          ? `path ${l.path}: close it with z so the join is a real corner`
          : `extend the end at (${l.at.join(', ')}) to touch (${l.to.join(', ')}), or, if the gap is deliberate, open it to at least ${minGap()}px clear`,
      )
    }
    // Notes are not failures: "almost symmetric" also describes deliberately asymmetric shapes
    // (cloud, chat bubble). Only act on a note if the icon was meant to be symmetric.
    const notes = m.shape.symmetry.nearMiss.map(
      (nm) => `path ${nm.path} is almost mirror-symmetric (mean error ${nm.mean}, worst ${nm.max}); if it should be symmetric, build one half and mirror it with symmetric()`,
    )
    return { ok: issues.length === 0, issues, hints, notes, ink: +(m.coverage * 100).toFixed(1), extent: [+m.w.toFixed(1), +m.h.toFixed(1)] }
  },

  /** Measure an icon by name, a full <svg>, or inner shapes: ink, optical centre, extent, narrow gaps. */
  async inspect(what) {
    const named = ICONS.find((i) => i.name === what)
    const svg = named ? renderIcon(named.name, STYLE, { inline: true }) : what.trim().startsWith('<svg') ? what : canonical(what)
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
      lint: lintSVG(svg).filter((r) => r.status !== 'pass').map((r) => `${r.status}: ${r.label} | ${r.detail}`),
    }
  },

  /** Measure the whole set. Returns the median plus every icon that is an outlier or has a warning. */
  async audit() {
    const rows = []
    for (const icon of ICONS) rows.push({ name: icon.name, ...(await measureSVG(renderIcon(icon.name, STYLE, { inline: true }))) })
    const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const medInk = med(rows.map((r) => r.coverage))
    const medExtent = med(rows.map((r) => Math.max(r.w, r.h)))
    const flagged = []
    for (const r of rows) {
      const why = []
      if (r.gaps.length) why.push(`gap ${r.gaps[0].clear}px at ${r.gaps[0].at.join(',')}`)
      if (r.offset > SPEC.maxCentreOffset && !DELIBERATE.centre[r.name]) why.push(`off-centre ${r.offset.toFixed(1)}`)
      if (r.shape.kinks.length) why.push(`kink ${r.shape.kinks[0].deg}° at ${r.shape.kinks[0].at.join(',')}`)
      if (r.shape.loose.length) why.push(`loose end: ${looseText(r.shape.loose[0])}`)
      // near-miss symmetry: exactly symmetric or clearly asymmetric are fine, "almost" is sloppy
      const ext = Math.max(r.w, r.h)
      if (ext < medExtent * 0.8 && r.coverage > 0.03 && !DELIBERATE.small[r.name]) why.push(`small ${ext.toFixed(1)} vs ${medExtent.toFixed(1)}`)
      if (why.length) flagged.push(`${r.name}: ${why.join('; ')}`)
    }
    // performance is part of the audit: what the set costs the browser (see perf-audit.js)
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
   * Agent-only: write the canvas to its icon file (src/icons/<name>.svg) through the dev server.
   * There is deliberately no Save button in the page. A new name creates a new icon.
   */
  async save(name = currentName) {
    if (!name) throw new Error('Name the icon: iconCanvas.save("my-icon")')
    // The style controls only preview; files always get the set's own look.
    const svg = normal(getSVG())
    const res = await fetch('/__save-icon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, svg }),
    })
    const out = await res.json()
    if (!out.ok) throw new Error(out.error)
    const existing = ICONS.find((i) => i.name === name)
    if (existing) existing.svg = svg
    else {
      ICONS.push({ name, svg })
      ICONS.sort((a, b) => a.name.localeCompare(b.name))
      api.icons = ICONS.map((i) => i.name)
    }
    currentName = name
    changed()
    return { saved: name }
  },

  /**
   * Preview style: { stroke, cap, join, radius, curve }. Published as CSS custom properties (--icon-*) on
   * the gallery, which is how the set is meant to be consumed. The canvas and every check follow it.
   * It only visualises the difference; no file changes. radius and curve apply to icons with a recipe.
   */
  setStyle(next = {}) {
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, +v))
    if (next.stroke !== undefined) STYLE.stroke = clamp(next.stroke, 0.5, 3)
    if (next.radius !== undefined) STYLE.radius = clamp(next.radius, 0, 2.5)
    if (next.curve !== undefined) STYLE.curve = clamp(next.curve, 0, 1)
    if (next.cap) STYLE.cap = next.cap
    if (next.join) STYLE.join = next.join
    writeCssVars()
    changed()
    return { ...STYLE }
  },

  /** Back to the set's own look (and remove the preview variables from the gallery). */
  resetStyle() {
    Object.assign(STYLE, DEFAULT_STYLE)
    for (const v of Object.values(CSS_VARS)) document.documentElement.style.removeProperty(v)
    changed()
    return { ...STYLE }
  },

  getStyle: () => ({ ...STYLE }),

  /** An icon as the runtime draws it, with explicit stroke attributes (so it stands alone). */
  render: (name, params = STYLE) => renderIcon(name, params, { inline: true }),

  /**
   * Which icons have rounded corners or circles but ignore the radius / curve settings? Those need a
   * recipe in src/recipes.js. `missing` must be empty.
   */
  async coverage() {
    const missing = {}
    const exempt = {}
    let responsive = 0
    let noFeatures = 0
    for (const icon of ICONS) {
      const c = await coverageFor(icon.name)
      if (c.exempt) exempt[icon.name] = c.exempt
      else if (!c.corners && !c.circles) noFeatures++
      else if (c.reasons.length) missing[icon.name] = c.reasons.join('; ')
      else responsive++
    }
    return { icons: ICONS.length, responsive, noFeatures, exempt, missingCount: Object.keys(missing).length, missing }
  },

  /**
   * Do the recipes still reproduce their saved icons at default settings? Lists recipes whose
   * rendering differs from the saved file (stale recipe or edited icon).
   */
  async recipeStatus() {
    const stale = {}
    for (const name of Object.keys(RECIPES)) {
      const icon = ICONS.find((i) => i.name === name)
      if (!icon) {
        stale[name] = 'no saved icon'
        continue
      }
      const d = await inkDiff(renderIcon(name, DEFAULT_STYLE, { inline: true }), normal(icon.svg))
      if (d > 0.02) stale[name] = `differs from the saved file by ${(d * 100).toFixed(1)}%`
    }
    return { recipes: Object.keys(RECIPES).length, stale }
  },

  /**
   * Which icons break under these brand settings? Checks every icon as the runtime draws it:
   * rule failures, narrow gaps, strokes that no longer connect, kinks. Restores the style afterwards.
   */
  async brandReport(params = {}) {
    const keep = { ...STYLE }
    Object.assign(STYLE, params)
    const broken = {}
    try {
      for (const icon of ICONS) {
        const svg = renderIcon(icon.name, STYLE, { inline: true })
        const lintFail = lintSVG(svg).find((r) => r.status === 'fail')
        const m = await measureSVG(svg)
        const why = []
        if (lintFail) why.push(lintFail.label)
        if (m.gaps.length) why.push(`gap ${m.gaps[0].clear}px`)
        if (m.shape.loose.length) why.push(`not connected: ${looseText(m.shape.loose[0])}`)
        if (m.shape.kinks.length) why.push(`kink ${m.shape.kinks[0].deg}°`)
        if (why.length) broken[icon.name] = why.join('; ')
      }
    } finally {
      Object.assign(STYLE, keep)
    }
    return { params: { ...STYLE, ...params }, count: Object.keys(broken).length, broken }
  },

  /** Gallery icon size in px (16 to 64). */
  setTileSize(px) {
    tile = Math.min(64, Math.max(16, Math.round(+px)))
    changed()
    return tile
  },

  /**
   * Which icons break at each weight? For every weight, lists icons that fail a rule or have strokes
   * closer than one stroke width. Restores the current style afterwards.
   */
  async sweep(weights = [1, 1.25, 1.5, 1.75, 2, 2.5]) {
    const keep = { ...STYLE }
    const out = {}
    try {
      for (const w of weights) {
        STYLE.stroke = w
        const broken = {}
        for (const icon of ICONS) {
          const svg = renderIcon(icon.name, STYLE, { inline: true })
          const lintFail = lintSVG(svg).find((r) => r.status === 'fail')
          const m = await analyse(svg)
          if (lintFail) broken[icon.name] = lintFail.label
          else if (m.gaps.length) broken[icon.name] = `gap ${m.gaps[0].clear}px`
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

  /** Pose lint: structure, file in sync, every channel alive, ink in bounds at the overshoot. Returns the issues per icon. */
  poseLint: (names) => lintPoses(names),
  /** Performance audit: style cost of posing (set and single icon), recipe drawing cost, pose weight, against budgets. */
  perfAudit: (names) => perfAudit(names),
  /** Accessibility audit of how icons are used in a page (or a container): hidden or labelled, named controls, target size, reduced motion. */
  a11yAudit: (root) => a11yAudit(root),
  poses: POSES,
  /** The plan for turning one icon into another: a path pair per stroke, how much of the ink fades, how far it travels, and `rough` when a plain swap suits the pair better. */
  morphPlan: (from, to, params) => morphPlan(from, to, { ...STYLE, ...params }),
  /** Morph audit: every icon into the next (or the given pairs): same commands at both ends, on the canvas, cheap to plan. */
  morphAudit: (pairs) => morphAudit(pairs, ICONS.map((i) => i.name), STYLE),

  getSVG,
}

window.iconCanvas = api

export { api, STYLE, DEFAULT_STYLE, lintSVG, overall, ICONS, renderIcon, canonical, getSVG }

/** Replace the drawing with edited source text. Throws on invalid markup (the drawing is left as it was). */
export function setSourceText(text) {
  const { nodes } = parseMarkup(text)
  artwork.replaceChildren(...nodes.map((n) => document.importNode(n, true)))
  changed()
}
