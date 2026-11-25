// Icon runtime: renders any icon in the set from brand settings held in CSS custom properties.
//
// Two layers, and why:
//  - Stroke weight, caps, joins, dash and colour are plain CSS (see icons.css). No JavaScript.
//  - Geometry (corner radius, curve character) cannot be changed by CSS: a path's shape can't take
//    var(). So <icon-glyph> reads the variables and redraws from the stored recipes.
//
// CSS variables (set them on any element; every icon inside follows):
//   --icon-stroke  --icon-cap  --icon-join  --icon-dash  --icon-color  --icon-size     (CSS only)
//   --icon-radius  --icon-curve                                                         (runtime)
import { ICONS } from './icons.js'
import { RECIPES } from './recipes.js'
import { DEFAULT_STYLE } from './spec.js'
import { POSES, withPose, poseRootAttrs, bakeState } from './poses.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

const inner = (svg) => svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()

const cache = new Map()

/**
 * A name can be an icon, or an icon in one of its states: `mic-off` is `mic` in its off state, `unlock` is `lock` in
 * its open state. The set ships one icon for all of them. Returns { base, state } (state is the stop number, 0 for the
 * icon itself) or null if there is no such icon.
 */
export function resolve(name) {
  if (RECIPES[name] || ICONS.some((i) => i.name === name)) return { base: name, state: 0 }
  return aliasTable().get(name) ?? null
}

let aliases
function aliasTable() {
  if (aliases) return aliases
  aliases = new Map()
  for (const [base, spec] of Object.entries(POSES)) {
    spec.states?.forEach((state, i) => aliases.set(`${base}-${state}`, { base, state: i + 1 }))
    for (const [alias, state] of Object.entries(spec.aliases ?? {})) aliases.set(alias, { base, state: spec.states.indexOf(state) + 1 }) // 'normal' is not a state, so it gives 0
  }
  return aliases
}

/** Every name that means an icon in one of its states, e.g. ['bell-off', 'eye-off', 'lock-open', 'unlock', ...]. */
export const stateNames = () => [...aliasTable().keys()].sort()

/**
 * SVG for an icon at the given settings.
 *  inline: false  root carries the default look and the page's CSS variables restyle it (what <icon-glyph> uses)
 *  inline: true   stroke, cap and join are written into the root, so the file stands alone (lint, measure, export)
 */
export function renderIcon(name, params = {}, { inline = false } = {}) {
  const p = { ...DEFAULT_STYLE, ...params }
  const found = resolve(name)
  if (!found) throw new Error(`Unknown icon "${name}"`)
  const { base, state } = found
  const key = [base, p.radius, p.curve].join('|')
  let shapes = cache.get(key)
  if (shapes === undefined) {
    const recipe = RECIPES[base]
    const saved = ICONS.find((i) => i.name === base)
    shapes = recipe ? recipe({ r: p.radius, c: p.curve }).join('\n') : inner(saved.svg)
    shapes = withPose(base, shapes, p.radius) // pose data travels in the SVG itself (see poses.css)
    if (cache.size > 4000) cache.clear() // a CSS transition passes through many values; keep the cache bounded
    cache.set(key, shapes)
  }
  // a standalone drawing of `mic-off` has the state baked in; <icon-glyph> keeps it live instead (see the state attribute)
  if (state && inline) {
    const look = `stroke-width="${p.stroke}" stroke-linecap="${p.cap}" stroke-linejoin="${p.join}"`
    return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ${look}>\n${bakeState(shapes, state)}\n</svg>`
  }
  const look = inline
    ? `stroke-width="${p.stroke}" stroke-linecap="${p.cap}" stroke-linejoin="${p.join}"`
    : `class="icon" stroke-width="${DEFAULT_STYLE.stroke}" stroke-linecap="${DEFAULT_STYLE.cap}" stroke-linejoin="${DEFAULT_STYLE.join}"`
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ${look}${poseRootAttrs(base)}>\n${shapes}\n</svg>`
}

/** Forget cached geometry (call after an icon file or recipe changes). */
export const clearIconCache = () => cache.clear()

/** Brand settings as currently resolved by CSS on an element. Missing variables fall back to the defaults. */
export function readParams(el) {
  const cs = getComputedStyle(el)
  const num = (v, d) => {
    const x = parseFloat(cs.getPropertyValue(v))
    return Number.isFinite(x) ? x : d
  }
  const word = (v, d) => cs.getPropertyValue(v).trim() || d
  return {
    stroke: num('--icon-stroke', DEFAULT_STYLE.stroke),
    cap: word('--icon-cap', DEFAULT_STYLE.cap),
    join: word('--icon-join', DEFAULT_STYLE.join),
    radius: num('--icon-radius', DEFAULT_STYLE.radius),
    curve: num('--icon-curve', DEFAULT_STYLE.curve),
  }
}

/** <icon-glyph name="home"></icon-glyph>: redraws itself when the geometry variables change. */
class IconGlyph extends HTMLElement {
  static observedAttributes = ['name', 'state']
  connectedCallback() {
    this.render()
  }
  attributeChangedCallback(attr) {
    if (!this.isConnected) return
    if (attr === 'state') this.syncState(this.getAttribute('name'))
    else this.render()
  }
  /**
   * Put the icon in its state. The state is a number, --icon-state, so the change can transition (see icons.css).
   * `state="off"` names it; a name such as `mic-off` means the same. A missing attribute leaves the variable alone, so
   * CSS can drive --icon-state itself.
   */
  syncState(name) {
    const found = name && resolve(name)
    const wanted = this.getAttribute('state')
    let stop = null
    if (found?.state) stop = found.state // the name itself says the state: mic-off
    if (wanted !== null) stop = wanted === '' ? 0 : (POSES[found?.base ?? name]?.states?.indexOf(wanted) ?? -1) + 1
    if (stop === null) return this.style.removeProperty('--icon-state')
    this.style.setProperty('--icon-state', String(stop))
  }
  render() {
    const name = this.getAttribute('name')
    if (!name) return
    // decorative unless it is given a label: the control that holds an icon should carry the name
    if (this.hasAttribute('aria-label')) this.setAttribute('role', 'img')
    else this.setAttribute('aria-hidden', 'true')
    this.syncState(name)
    const p = readParams(this)
    // while a CSS transition runs these change every frame; steps of 0.05 are invisible and bound the work
    // Clamped too: a spring or bounce easing overshoots its target, and a negative radius would break the geometry.
    p.radius = Math.round(Math.max(0, p.radius) * 20) / 20
    p.curve = Math.round(Math.min(1.2, Math.max(0, p.curve)) * 20) / 20
    const key = [name, p.radius, p.curve].join('|')
    if (key === this._key) return // only geometry needs a redraw; stroke etc. are pure CSS
    this._key = key
    try {
      this.innerHTML = renderIcon(resolve(name)?.base ?? name, p)
    } catch (e) {
      this.textContent = ''
      console.warn(e.message)
    }
  }
}

let scheduled = false

/** Redraw every glyph whose geometry variables changed. Cheap when nothing changed. Call it each frame during a CSS transition. */
export function refreshIcons() {
  scheduled = false
  document.querySelectorAll('icon-glyph, icon-morph').forEach((g) => g.render())
}

/** Register <icon-glyph> and keep every glyph in step when a style, class or data-brand attribute changes anywhere. */
export function defineIconGlyph() {
  if (customElements.get('icon-glyph')) return
  customElements.define('icon-glyph', IconGlyph)
  new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(refreshIcons)
  }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style', 'class', 'data-brand'] })
}
