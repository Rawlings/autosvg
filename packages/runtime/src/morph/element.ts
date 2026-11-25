import { readParams } from '../glyph.ts'
import { type MorphPlan, morphPlan } from './plan.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

const planCache = new Map<string, MorphPlan>()
const supportsD = (): boolean => typeof CSS !== 'undefined' && CSS.supports('d: path("M0 0")')

/** Both ends of each drawn stroke, for engines without CSS `d`. */
const ends = new WeakMap<SVGPathElement, { from: string; to: string }>()

/**
 * <icon-morph from="sun" to="moon" state="to"></icon-morph>: any vector turning into any other, shape to shape.
 * --icon-morph (0 shows the first vector, 1 the second) is what moves it; `state="to"` is one way to set it.
 */
class IconMorph extends HTMLElement {
  static observedAttributes = ['from', 'to', 'state']
  #key: string | undefined

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(attr: string): void {
    if (!this.isConnected) return
    if (attr === 'state') this.sync()
    else this.render()
  }

  /** Without CSS `d` (Safari today) the vector shows the one it is on, instantly. */
  sync(): void {
    if (supportsD()) return
    for (const path of this.querySelectorAll('path')) {
      const both = ends.get(path)
      if (both) path.setAttribute('d', this.getAttribute('state') === 'to' ? both.to : both.from)
    }
  }

  render(): void {
    const from = this.getAttribute('from')
    const to = this.getAttribute('to')
    if (!from || !to) return
    if (this.hasAttribute('aria-label')) this.setAttribute('role', 'img')
    else this.setAttribute('aria-hidden', 'true')
    const p = readParams(this)
    p.radius = Math.round(Math.max(0, p.radius) * 20) / 20
    p.curve = Math.round(Math.min(1.2, Math.max(0, p.curve)) * 20) / 20
    const key = [from, to, p.radius, p.curve].join('|')
    if (key === this.#key) return
    this.#key = key
    try {
      let plan = planCache.get(key)
      if (!plan) {
        plan = morphPlan(from, to, p)
        if (planCache.size > 500) planCache.clear()
        planCache.set(key, plan)
      }
      const svg = document.createElementNS(SVG_NS, 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('class', 'vector')
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      for (const s of plan.strokes) {
        const path = document.createElementNS(SVG_NS, 'path')
        // both ends ride on the stroke; morph.css picks one by --icon-morph and a CSS transition moves between them
        path.style.setProperty('--im-a', `path("${s.from}")`)
        path.style.setProperty('--im-b', `path("${s.to}")`)
        if (s.fade) {
          path.style.setProperty('--im-oa', s.fade === 'out' ? '1' : '0')
          path.style.setProperty('--im-ob', s.fade === 'out' ? '0' : '1')
        }
        ends.set(path, { from: s.from, to: s.to })
        path.setAttribute('d', s.from) // what an engine without CSS `d` shows
        svg.append(path)
      }
      this.dataset['fit'] = plan.rough ? 'rough' : 'good'
      this.replaceChildren(svg)
      // settle the new strokes at the current number now, so a number that changes next (state set right after) is a transition from it
      const first = svg.firstElementChild
      if (first) getComputedStyle(first).getPropertyValue('d')
      this.sync()
    } catch (e) {
      this.textContent = ''
      // biome-ignore lint/suspicious/noConsole: a wrong vector name should be visible to the developer
      console.warn(e instanceof Error ? e.message : e)
    }
  }
}

export function defineIconMorph(): void {
  if (!customElements.get('icon-morph')) customElements.define('icon-morph', IconMorph)
}

declare global {
  interface HTMLElementTagNameMap {
    'icon-morph': IconMorph
  }
}
