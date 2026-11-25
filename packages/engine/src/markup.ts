import { STYLE } from '@icon-canvas/checks'
import { DEFAULT_STYLE, SPEC, type Style } from '@icon-canvas/core'

export const SVG_NS = 'http://www.w3.org/2000/svg'
export const SIZE = SPEC.size

/** Remove scripts and inline event handlers from untrusted markup. */
function sanitize(root: Element): void {
  for (const n of root.querySelectorAll('script, foreignObject')) n.remove()
  for (const n of root.querySelectorAll('*')) {
    for (const attr of [...n.attributes]) {
      if (/^on/i.test(attr.name)) n.removeAttribute(attr.name)
      if (/^(xlink:)?href$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) {
        n.removeAttribute(attr.name)
      }
    }
  }
}

/** Parse markup (inner shapes, or a full <svg>) into sanitized child nodes. */
export function parseMarkup(markup: string): Node[] {
  const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${markup}</svg>`, 'image/svg+xml')
  const problem = doc.querySelector('parsererror')
  if (problem) throw new Error((problem.textContent ?? '').trim().split('\n')[0])
  let root: Element = doc.documentElement
  // If the caller passed a whole <svg>, unwrap it.
  const only = root.children.length === 1 ? root.children[0] : undefined
  if (only?.localName === 'svg') root = only
  sanitize(root)
  return [...root.childNodes]
}

export const stripNs = (s: string): string => s.replace(/ xmlns="[^"]*"/g, '')

/** Wrap shapes in the canonical icon root (see SPEC.md). */
export function canonical(inner: string, style: Readonly<Style> = STYLE): string {
  const attrs = {
    xmlns: SVG_NS,
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': style.stroke,
    'stroke-linecap': style.cap,
    'stroke-linejoin': style.join,
  }
  const a = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
  return `<svg ${a}>\n${inner}\n</svg>`
}

/** An icon in the default look, so a comparison ignores the preview style. */
export const normal = (svg: string): string =>
  svg.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/stroke-width="[^"]*"/, `stroke-width="${DEFAULT_STYLE.stroke}"`)
      .replace(/stroke-linecap="[^"]*"/, `stroke-linecap="${DEFAULT_STYLE.cap}"`)
      .replace(/stroke-linejoin="[^"]*"/, `stroke-linejoin="${DEFAULT_STYLE.join}"`),
  )

/** An SVG with a pixel size, for rasterising or showing at a fixed size. */
export const sized = (svg: string, px: number): string => svg.replace('<svg ', `<svg width="${px}" height="${px}" `)
