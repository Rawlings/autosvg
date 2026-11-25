// <icon-glyph>: draws any vector in the set from the settings held in CSS custom properties.
//
// Two layers, and why:
//  - Stroke weight, caps, joins, dash and colour are plain CSS (see css/icons.css). No JavaScript.
//  - Geometry (corner radius, curve character) cannot be changed by CSS: a path's shape can't take
//    var(). So <icon-glyph> reads the variables and redraws from the stored recipes.
//
// CSS variables (set them on any element; every vector inside follows):
//   --icon-stroke  --icon-cap  --icon-join  --icon-dash  --icon-color  --icon-size     (CSS only)
//   --icon-radius  --icon-curve                                                         (runtime)
import { type Cap, DEFAULT_STYLE, type Join, POSES, type Style } from '@autosvg/core'
import { renderIcon, resolve } from './render.ts'

const CAPS: readonly Cap[] = ['butt', 'round', 'square']
const JOINS: readonly Join[] = ['miter', 'round', 'bevel']

/** Style settings as currently resolved by CSS on an element. Missing variables fall back to the defaults. */
export function readParams(el: Element): Style {
  const cs = getComputedStyle(el)
  const num = (v: string, d: number): number => {
    const x = Number.parseFloat(cs.getPropertyValue(v))
    return Number.isFinite(x) ? x : d
  }
  const word = <T extends string>(v: string, allowed: readonly T[], d: T): T => {
    const value = cs.getPropertyValue(v).trim()
    return allowed.find((a) => a === value) ?? d
  }
  return {
    stroke: num('--icon-stroke', DEFAULT_STYLE.stroke),
    cap: word<Cap>('--icon-cap', CAPS, DEFAULT_STYLE.cap),
    join: word<Join>('--icon-join', JOINS, DEFAULT_STYLE.join),
    radius: num('--icon-radius', DEFAULT_STYLE.radius),
    curve: num('--icon-curve', DEFAULT_STYLE.curve),
  }
}

/** <icon-glyph name="home"></icon-glyph>: redraws itself when the geometry variables change. */
class IconGlyph extends HTMLElement {
  static observedAttributes = ['name', 'state']
  #key: string | undefined

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(attr: string): void {
    if (!this.isConnected) return
    if (attr === 'state') this.syncState(this.getAttribute('name'))
    else this.render()
  }
  /**
   * Put the vector in its state. The state is a number, --icon-state, so the change can transition (see icons.css).
   * `state="off"` names it; a name such as `mic-off` means the same. A missing attribute leaves the variable alone, so
   * CSS can drive --icon-state itself.
   */
  syncState(name: string | null): void {
    const found = name ? resolve(name) : null
    const wanted = this.getAttribute('state')
    let stop: number | null = null
    if (found?.state) stop = found.state // the name itself says the state: mic-off
    if (wanted !== null)
      stop = wanted === '' ? 0 : (POSES[found?.base ?? name ?? '']?.states?.indexOf(wanted) ?? -1) + 1
    if (stop === null) {
      this.style.removeProperty('--icon-state')
      return
    }
    this.style.setProperty('--icon-state', String(stop))
  }

  render(): void {
    const name = this.getAttribute('name')
    if (!name) return
    // decorative unless it is given a label: the control that holds a vector should carry the name
    if (this.hasAttribute('aria-label')) this.setAttribute('role', 'img')
    else this.setAttribute('aria-hidden', 'true')
    this.syncState(name)
    const p = readParams(this)
    // while a CSS transition runs these change every frame; steps of 0.05 are invisible and bound the work
    // Clamped too: a spring or bounce easing overshoots its target, and a negative radius would break the geometry.
    p.radius = Math.round(Math.max(0, p.radius) * 20) / 20
    p.curve = Math.round(Math.min(1.2, Math.max(0, p.curve)) * 20) / 20
    const key = [name, p.radius, p.curve].join('|')
    if (key === this.#key) return // only geometry needs a redraw; stroke etc. are pure CSS
    this.#key = key
    try {
      this.innerHTML = renderIcon(resolve(name)?.base ?? name, p)
    } catch (e) {
      this.textContent = ''
      // biome-ignore lint/suspicious/noConsole: a wrong vector name should be visible to the developer
      console.warn(e instanceof Error ? e.message : e)
    }
  }
}

/** An element that draws itself from the CSS variables around it. */
interface RenderedIcon extends HTMLElement {
  render(): void
}

let scheduled = false

/** Redraw every glyph whose geometry variables changed. Cheap when nothing changed. Call it each frame during a CSS transition. */
export function refreshVectors(): void {
  scheduled = false
  for (const el of document.querySelectorAll<RenderedIcon>('icon-glyph, icon-morph')) el.render()
}

/** Register <icon-glyph> and keep every glyph in step when a style or class attribute changes anywhere. */
export function defineIconGlyph(): void {
  if (customElements.get('icon-glyph')) return
  customElements.define('icon-glyph', IconGlyph)
  new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(refreshVectors)
  }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] })
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-glyph': IconGlyph
  }
}
