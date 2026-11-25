import { SPEC, minGap } from './spec.js'
import posesCss from './poses.css?raw'
import { CHANNEL_VAR } from './pose-dsl.js'

/**
 * The SVG with the pose stylesheet embedded and the given pose channels set, so a raster of it shows the posed
 * icon (an SVG drawn as an image cannot see the page's stylesheet). vars: { 1: 0.5, 3: -1 }.
 */
export function posedSvg(svg, vars = {}) {
  const decl = Object.entries(vars).map(([k, v]) => `${CHANNEL_VAR[k]}:${v}`).join(';')
  return svg.replace(/^<svg /, `<svg style="${decl}" `).replace(/^(<svg\b[^>]*>)/, `$1<style><![CDATA[${posesCss}]]></style>`) // CDATA: the CSS contains "<number>", which is not valid bare in XML
}

const PX = 96 // raster size (4px per icon unit)
const K = SPEC.size / PX // icon units per pixel

async function rasterise(svg, px) {
  const src = svg.replace(/currentColor/g, '#000').replace('<svg ', `<svg width="${px}" height="${px}" `)
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    const c = document.createElement('canvas')
    c.width = c.height = px
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0, px, px)
    return g.getImageData(0, 0, px, px).data
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** How different two icons look: pixels that differ divided by pixels either draws (0 = identical). */
export async function inkDiff(a, b) {
  const [da, db] = await Promise.all([rasterise(a, PX), rasterise(b, PX)])
  let diff = 0
  let union = 0
  for (let i = 3; i < da.length; i += 4) {
    diff += Math.abs(da[i] - db[i])
    union += Math.max(da[i], db[i])
  }
  return union ? diff / union : 0
}

/**
 * The biggest jump between neighbouring frames of an animation, as a share of the ink: how much of one frame's ink (as opacity)
 * is more than `reach` pixels (default 3, three quarters of an icon unit) from any ink of the next, in either direction.
 * Strokes that slide, turn, grow or fade a little stay near where they were and score 0; a part that appears from nowhere or
 * vanishes scores high. A frame with almost no ink (a mirror passing through nothing) is not a jump. Each frame is rasterised
 * once. Returns { jump, at }: the size and the index of the frame it arrives at.
 */
export async function maxJump(svgs, reach = 3) {
  const frames = []
  for (const svg of svgs) {
    const d = await rasterise(svg, PX)
    const a = new Uint8Array(PX * PX)
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]
    frames.push({ a, total: a.reduce((x, y) => x + y, 0), grown: null })
  }
  const grow = (f) => {
    if (f.grown) return f.grown
    const tmp = new Uint8Array(PX * PX)
    const out = new Uint8Array(PX * PX)
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        let best = 0
        for (let dx = -reach; dx <= reach; dx++) {
          const xx = x + dx
          if (xx >= 0 && xx < PX && f.a[y * PX + xx] > best) best = f.a[y * PX + xx]
        }
        tmp[y * PX + x] = best
      }
    }
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        let best = 0
        for (let dy = -reach; dy <= reach; dy++) {
          const yy = y + dy
          if (yy >= 0 && yy < PX && tmp[yy * PX + x] > best) best = tmp[yy * PX + x]
        }
        out[y * PX + x] = best
      }
    }
    f.grown = out
    return out
  }
  const lost = (f, other) => {
    const g = grow(other)
    let n = 0
    for (let i = 0; i < f.a.length; i++) if (f.a[i] > g[i]) n += f.a[i] - g[i]
    return f.total ? n / f.total : 0
  }
  let jump = 0
  let at = 0
  for (let i = 1; i < frames.length; i++) {
    const p = frames[i - 1]
    const c = frames[i]
    if (p.total < 0.15 * c.total || c.total < 0.15 * p.total) continue
    const j = Math.max(lost(p, c), lost(c, p))
    if (j > jump) (jump = j), (at = i)
  }
  return { jump, at }
}

// ---------- gaps: white channels narrower than minClear that are long enough to fill in ----------
//
// Morphological closing of the ink with a disc of radius minClear/2 fills every white channel
// narrower than minClear. Short fills are just the flare where two strokes meet (a deliberate
// junction); a fill that is long enough is two strokes running too close together.

const MIN_RUN = 3 // units: a filled channel at least this long counts (shorter = junction flare)

function narrowGaps(data, minClear) {
  const PAD = 8
  const W = PX + PAD * 2
  const ink = new Uint8Array(W * W)
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) ink[(y + PAD) * W + x + PAD] = data[(y * PX + x) * 4 + 3] > 127 ? 1 : 0
  }
  const r = minClear / 2 / K - 0.5
  const R = Math.floor(r)
  const offs = []
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) offs.push(dy * W + dx)

  const dilated = new Uint8Array(W * W)
  for (let i = 0; i < W * W; i++) {
    if (!ink[i]) continue
    for (const o of offs) if (i + o >= 0 && i + o < W * W) dilated[i + o] = 1
  }
  const closed = new Uint8Array(W * W)
  for (let i = 0; i < W * W; i++) {
    if (!dilated[i]) continue
    let all = true
    for (const o of offs) {
      const j = i + o
      if (j < 0 || j >= W * W || !dilated[j]) {
        all = false
        break
      }
    }
    closed[i] = all ? 1 : 0
  }

  // connected components of (closed and not ink) = the filled-in white
  const seen = new Uint8Array(W * W)
  const found = []
  for (let s = 0; s < W * W; s++) {
    if (!closed[s] || ink[s] || seen[s]) continue
    let area = 0, sx = 0, sy = 0, x0 = W, y0 = W, x1 = 0, y1 = 0
    const stack = [s]
    seen[s] = 1
    while (stack.length) {
      const p = stack.pop()
      const px = p % W
      const py = (p / W) | 0
      area++
      sx += px
      sy += py
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q >= 0 && q < W * W && closed[q] && !ink[q] && !seen[q]) {
          seen[q] = 1
          stack.push(q)
        }
      }
    }
    // the channel's length is its longest side; the visible white is roughly area / length
    const len = Math.max(x1 - x0 + 1, y1 - y0 + 1) * K
    if (len < MIN_RUN) continue
    found.push({
      at: [+(((sx / area) - PAD + 0.5) * K).toFixed(1), +(((sy / area) - PAD + 0.5) * K).toFixed(1)],
      clear: +((area * K * K) / len).toFixed(2),
      len: +len.toFixed(1),
    })
  }
  return found.sort((a, b) => a.clear - b.clear)
}

/**
 * Everything we measure about an icon from one raster:
 * ink coverage, optical centre (centre of mass), true extent, and narrow gaps. Units are the 24 grid.
 */
export async function analyse(svg) {
  const data = await rasterise(svg, PX)
  let sum = 0, sx = 0, sy = 0
  let x0 = PX, y0 = PX, x1 = -1, y1 = -1
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      const a = data[(y * PX + x) * 4 + 3]
      if (!a) continue
      sum += a
      sx += a * (x + 0.5)
      sy += a * (y + 0.5)
      if (a > 40) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (!sum) return { coverage: 0, cx: SPEC.size / 2, cy: SPEC.size / 2, w: 0, h: 0, gaps: [] }
  return {
    coverage: sum / 255 / (PX * PX),
    cx: (sx / sum) * K, // centre of mass
    cy: (sy / sum) * K,
    bx: ((x0 + x1 + 1) / 2) * K, // centre of the drawn extent
    by: ((y0 + y1 + 1) / 2) * K,
    w: (x1 - x0 + 1) * K,
    h: (y1 - y0 + 1) * K,
    gaps: narrowGaps(data, minGap()),
  }
}
