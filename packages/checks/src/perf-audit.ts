// Performance audit: what the set costs the browser. Everything here is measured in the page, on the real icons,
// by synchronous style recalculation (which does not depend on whether the tab is visible, unlike frame rates).
//
//   style      how long the browser takes to restyle posed shapes when a pose number changes
//              (all icons at once, and one icon on its own: the realistic hover case)
//   render     how long <icon-glyph> takes to draw an icon from its recipe when radius or curve change
//   weight     bytes of pose data per icon, beats per icon, size of the one stylesheet
import { DEFAULT_STYLE, POSES, poseBytes } from '@icon-canvas/core'
import { ICONS } from '@icon-canvas/icons'
import { clearIconCache, renderIcon } from '@icon-canvas/runtime'
import posesCss from '@icon-canvas/runtime/css/poses.css?raw'

/** Budgets. An icon or the set over any of these is flagged. Tuned from measurements; tighten them as the code improves. */
export const BUDGET = {
  stylesheetBytes: 16 * 1024, // the one fixed pose stylesheet
  poseBytesPerIcon: 2000, // pose data carried by one icon (an icon with many states, like the circle's seven marks, is the largest)
  beatsPerIcon: 18, // beats summed over an icon's shapes
  setRecalcUsPerShape: 60, // restyling the whole set: microseconds per posed shape
  oneIconRecalcMs: 0.5, // restyling one icon on its own
  renderMs: 2, // drawing one icon from its recipe
}

const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0
const inner = (svg: string): string =>
  svg
    .replace(/^<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()

/** Time `change()` followed by a forced style recalculation of everything it dirtied; median of n runs, in ms. */
function recalcMs(change: (i: number) => void, probe: Element, n = 21): number {
  const t: number[] = []
  for (let i = 0; i < n + 3; i++) {
    change(i)
    const a = performance.now()
    getComputedStyle(probe).getPropertyValue('rotate') // forces the pending style recalculation
    if (i >= 3) t.push(performance.now() - a) // the first runs warm the browser up
  }
  return median(t)
}

/**
 * Audit the performance of the set (or some icons). Returns
 *   { ok, flagged[], set{...}, icons[]{ name, shapes, beats, poseBytes, recalcMs, renderMs } , slowest[] }
 */
/** Measurements for one icon. */
export interface IconPerf {
  name: string
  shapes: number
  beats: number
  poseBytes: number
  recalcMs: number
  renderMs: number
}

/** Measurements for the whole set. */
export interface SetPerf {
  icons: number
  posedShapes: number
  recalcMsAll: number
  recalcUsPerShape: number
  stylesheetBytes: number
  poseBytesAvg: number
  poseBytesMax: number
  beatsAvg: number
  oneIconRecalcMsMax: number
  renderMsMax: number
  renderMsAvg: number
}

export interface PerfReport {
  ok: boolean
  flagged: string[]
  budget: typeof BUDGET
  set: SetPerf
  slowest: string[]
  icons: IconPerf[]
}

export async function perfAudit(names: readonly string[] = ICONS.map((i) => i.name)): Promise<PerfReport> {
  const box = document.createElement('div')
  box.style.cssText = 'position:absolute;left:-10000px;top:0;width:900px;contain:layout'
  box.innerHTML = names.map((n) => `<span data-icon="${n}"><icon-glyph name="${n}"></icon-glyph></span>`).join('')
  document.body.append(box)
  const flagged: string[] = []
  try {
    const wrappers = [...box.querySelectorAll<HTMLElement>('[data-icon]')]
    const shapes = box.querySelectorAll('[data-c1]')
    const probe = shapes[0] ?? box

    // the whole set at once: what changing a pose number on a high ancestor costs
    const recalcMsAll = +recalcMs((i) => box.style.setProperty('--icon-motion', i % 2 ? '0.3' : '0.6'), probe).toFixed(
      2,
    )
    const recalcUsPerShape = shapes.length ? +((recalcMsAll * 1000) / shapes.length).toFixed(1) : 0
    box.style.removeProperty('--icon-motion')

    // one icon at a time: the realistic hover
    const rows: IconPerf[] = []
    for (const w of wrappers) {
      const name = w.dataset['icon'] ?? ''
      const p = w.querySelector('[data-c1]')
      const ms = p ? recalcMs((i) => w.style.setProperty('--icon-motion', i % 2 ? '0.3' : '0.6'), p, 9) : 0
      w.style.removeProperty('--icon-motion')
      const svg = renderIcon(name, DEFAULT_STYLE, { inline: true })
      const spec = POSES[name]
      rows.push({
        name,
        shapes: w.querySelectorAll('[data-c1]').length,
        beats: spec
          ? spec.parts.reduce(
              (s, part) => s + part.beats.length * (part.at === 'all' ? 1 : [part.at].flat().length || 1),
              0,
            )
          : 0,
        poseBytes: spec ? poseBytes(name, inner(svg)) : 0,
        recalcMs: +ms.toFixed(3),
        renderMs: 0,
      })
    }

    // drawing from the recipe: what a radius or curve change costs per icon
    clearIconCache()
    for (const r of rows) {
      const a = performance.now()
      renderIcon(r.name, { ...DEFAULT_STYLE, radius: 1.37, curve: 0.43 }, { inline: false })
      r.renderMs = +(performance.now() - a).toFixed(3)
    }
    clearIconCache()

    const set: SetPerf = {
      icons: names.length,
      posedShapes: shapes.length,
      recalcMsAll,
      recalcUsPerShape,
      stylesheetBytes: posesCss.length,
      poseBytesAvg: Math.round(rows.reduce((s, r) => s + r.poseBytes, 0) / rows.length),
      poseBytesMax: Math.max(...rows.map((r) => r.poseBytes)),
      beatsAvg: +(rows.reduce((s, r) => s + r.beats, 0) / rows.length).toFixed(1),
      oneIconRecalcMsMax: Math.max(...rows.map((r) => r.recalcMs)),
      renderMsMax: Math.max(...rows.map((r) => r.renderMs)),
      renderMsAvg: +(rows.reduce((s, r) => s + r.renderMs, 0) / rows.length).toFixed(3),
    }

    if (set.stylesheetBytes > BUDGET.stylesheetBytes)
      flagged.push(`pose stylesheet is ${set.stylesheetBytes} bytes (budget ${BUDGET.stylesheetBytes})`)
    if (set.recalcUsPerShape > BUDGET.setRecalcUsPerShape) {
      flagged.push(
        `restyling the set costs ${set.recalcUsPerShape} µs per posed shape (budget ${BUDGET.setRecalcUsPerShape}); a pose change on a high ancestor will be slow`,
      )
    }
    for (const r of rows) {
      if (r.poseBytes > BUDGET.poseBytesPerIcon)
        flagged.push(`${r.name}: ${r.poseBytes} bytes of pose data (budget ${BUDGET.poseBytesPerIcon})`)
      if (r.beats > BUDGET.beatsPerIcon) flagged.push(`${r.name}: ${r.beats} beats (budget ${BUDGET.beatsPerIcon})`)
      if (r.recalcMs > BUDGET.oneIconRecalcMs)
        flagged.push(`${r.name}: restyling it alone takes ${r.recalcMs} ms (budget ${BUDGET.oneIconRecalcMs})`)
      if (r.renderMs > BUDGET.renderMs)
        flagged.push(`${r.name}: drawing it from its recipe takes ${r.renderMs} ms (budget ${BUDGET.renderMs})`)
    }
    const slowest = [...rows]
      .sort((a, b) => b.recalcMs - a.recalcMs)
      .slice(0, 5)
      .map((r) => `${r.name} ${r.recalcMs} ms`)
    return { ok: flagged.length === 0, flagged, budget: BUDGET, set, slowest, icons: rows }
  } finally {
    box.remove()
  }
}
