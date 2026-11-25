// <autosvg>: draws any vector in the set from the settings held in CSS custom properties.
//
// Two layers, and why:
//  - Stroke weight, caps, joins, dash and colour are plain CSS (see css/icons.css). No JavaScript.
//  - Geometry (corner radius, curve character) cannot be changed by CSS: a path's shape can't take
//    var(). So <autosvg> reads the variables and redraws from the stored recipes.
//
// CSS variables (set them on any element; every vector inside follows):
//   --autosvg-stroke  --autosvg-cap  --autosvg-join  --autosvg-dash  --autosvg-color  --autosvg-size     (CSS only)
//   --autosvg-radius  --autosvg-curve                                                         (runtime)
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
    stroke: num('--autosvg-stroke', DEFAULT_STYLE.stroke),
    cap: word<Cap>('--autosvg-cap', CAPS, DEFAULT_STYLE.cap),
    join: word<Join>('--autosvg-join', JOINS, DEFAULT_STYLE.join),
    radius: num('--autosvg-radius', DEFAULT_STYLE.radius),
    curve: num('--autosvg-curve', DEFAULT_STYLE.curve),
  }
}

const TAG = 'autosvg'

/** The geometry each <autosvg> was last drawn with, so only a change in it redraws. */
const drawn = new WeakMap<Element, string>()

/**
 * Put the vector in its state. The state is a number, --autosvg-state, so the change can transition (see icons.css).
 * `state="off"` names it; a name such as `mic-off` means the same. A missing attribute leaves the variable alone, so
 * CSS can drive --autosvg-state itself.
 */
function syncState(el: HTMLElement, name: string | null): void {
  const found = name ? resolve(name) : null
  const wanted = el.getAttribute('state')
  let stop: number | null = null
  if (found?.state) stop = found.state // the name itself says the state: mic-off
  if (wanted !== null) stop = wanted === '' ? 0 : (POSES[found?.base ?? name ?? '']?.states?.indexOf(wanted) ?? -1) + 1
  if (stop === null) {
    el.style.removeProperty('--autosvg-state')
    return
  }
  el.style.setProperty('--autosvg-state', String(stop))
}

/** <autosvg name="home"></autosvg>: draws the vector, and redraws it when the geometry variables change. */
function renderGlyph(el: HTMLElement): void {
  const name = el.getAttribute('name')
  if (!name) return
  // decorative unless it is given a label: the control that holds a vector should carry the name
  if (el.hasAttribute('aria-label')) el.setAttribute('role', 'img')
  else el.setAttribute('aria-hidden', 'true')
  syncState(el, name)
  const p = readParams(el)
  // while a CSS transition runs these change every frame; steps of 0.05 are invisible and bound the work
  // Clamped too: a spring or bounce easing overshoots its target, and a negative radius would break the geometry.
  p.radius = Math.round(Math.max(0, p.radius) * 20) / 20
  p.curve = Math.round(Math.min(1.2, Math.max(0, p.curve)) * 20) / 20
  const key = [name, p.radius, p.curve].join('|')
  if (key === drawn.get(el)) return // only geometry needs a redraw; stroke etc. are pure CSS
  drawn.set(el, key)
  try {
    el.innerHTML = renderIcon(resolve(name)?.base ?? name, p)
  } catch (e) {
    el.textContent = ''
    // biome-ignore lint/suspicious/noConsole: a wrong vector name should be visible to the developer
    console.warn(e instanceof Error ? e.message : e)
  }
}

/** An element that draws itself from the CSS variables around it. */
interface RenderedMorph extends HTMLElement {
  render(): void
}

let scheduled = false
const roots = new Set<Document | ShadowRoot>()

/** Redraw every <autosvg> and <autosvg-morph> whose geometry variables changed. Cheap when nothing changed. Call it each frame during a CSS transition. */
export function refreshVectors(): void {
  scheduled = false
  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(TAG)) renderGlyph(el)
    for (const el of root.querySelectorAll<RenderedMorph>('autosvg-morph')) el.render()
  }
}

/**
 * Draw every <autosvg> in a document or shadow root, now and as they are added.
 *
 * Browsers only allow a custom element a name with a hyphen, so a bare <autosvg> cannot be registered. It is a plain
 * element instead, and one observer per root does what the registry would: it draws the <autosvg> already there and each
 * one added later, redraws on a change of name or state, and keeps every vector in step when a style or class attribute
 * changes. The drawing happens a microtask after the element appears, not synchronously. The page's document is watched
 * by {@link defineAutosvgGlyph}; call this on a shadow root to watch that too.
 */
export function watchAutosvg(root: Document | ShadowRoot): void {
  if (roots.has(root)) return
  roots.add(root)
  const draw = (node: ParentNode): void => {
    if (node instanceof HTMLElement && node.localName === TAG) renderGlyph(node)
    for (const el of node.querySelectorAll<HTMLElement>(TAG)) renderGlyph(el)
  }
  const observer = new MutationObserver((records) => {
    let geometry = false
    for (const r of records) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) if (n instanceof Element) draw(n)
      } else if (
        r.target instanceof HTMLElement &&
        r.target.localName === TAG &&
        r.attributeName !== 'style' &&
        r.attributeName !== 'class'
      ) {
        renderGlyph(r.target)
      } else {
        geometry = true
      }
    }
    if (geometry && !scheduled) {
      scheduled = true
      requestAnimationFrame(refreshVectors)
    }
  })
  draw(root)
  observer.observe(root instanceof Document ? root.documentElement : root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['name', 'state', 'style', 'class'],
  })
}

/** Start drawing <autosvg> in the page. */
export function defineAutosvgGlyph(): void {
  watchAutosvg(document)
}
