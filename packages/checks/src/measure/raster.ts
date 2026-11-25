import { CHANNEL_VAR, type Channel, SPEC } from '@autosvg/core'
import posesCss from '@autosvg/runtime/css/poses.css?raw'

/** Raster size in pixels (4px per vector unit). */
export const PX = 96
/** Vector units per pixel. */
export const K = SPEC.size / PX

/**
 * The SVG with the pose stylesheet embedded and the given pose channels set, so a raster of it shows the posed
 * vector (an SVG drawn as an image cannot see the page's stylesheet). vars: { 1: 0.5, 3: -1 }.
 */
export function posedSvg(svg: string, vars: Partial<Record<Channel, number>> = {}): string {
  const decl = Object.entries(vars)
    .map(([k, v]) => `${CHANNEL_VAR[Number(k) as Channel]}:${v}`)
    .join(';')
  return svg
    .replace(/^<svg /, `<svg style="${decl}" `)
    .replace(/^(<svg\b[^>]*>)/, `$1<style><![CDATA[${posesCss}]]></style>`) // CDATA: the CSS contains "<number>", which is not valid bare in XML
}

/** Draw an SVG string to a `px` x `px` canvas and return its RGBA pixels. */
export async function rasterise(svg: string, px: number): Promise<Uint8ClampedArray> {
  const src = svg.replace(/currentColor/g, '#000').replace('<svg ', `<svg width="${px}" height="${px}" `)
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = rej
      img.src = url
    })
    const c = document.createElement('canvas')
    c.width = px
    c.height = px
    const g = c.getContext('2d', { willReadFrequently: true })
    if (!g) throw new Error('no 2d canvas context')
    g.drawImage(img, 0, 0, px, px)
    return g.getImageData(0, 0, px, px).data
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** How different two vectors look: pixels that differ divided by pixels either draws (0 = identical). */
export async function inkDiff(a: string, b: string): Promise<number> {
  const [da, db] = await Promise.all([rasterise(a, PX), rasterise(b, PX)])
  let diff = 0
  let union = 0
  for (let i = 3; i < da.length; i += 4) {
    const x = da[i] ?? 0
    const y = db[i] ?? 0
    diff += Math.abs(x - y)
    union += Math.max(x, y)
  }
  return union ? diff / union : 0
}
