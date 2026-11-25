import { api, lintSVG, renderIcon, STYLE, VECTORS } from '@autosvg/engine'
import { createRoot } from 'react-dom/client'
import Showcase from '../Showcase.tsx'

/** What a check found. */
export interface CheckOutcome {
  ok: boolean
  summary: string
  details: string[]
}

export interface QualityCheck {
  id: string
  title: string
  about: string
  run: () => Promise<CheckOutcome> | CheckOutcome
}

// Each check returns { ok, summary, details[] }. They run in the page, against the real vectors.
export const CHECKS: QualityCheck[] = [
  {
    id: 'rules',
    title: 'Spec rules',
    about: 'Grid, stroke, shapes, detail budget, as the current style draws every vector.',
    run: async () => {
      const bad: string[] = []
      for (const i of VECTORS) {
        const r = lintSVG(renderIcon(i.name, STYLE, { inline: true })).filter((x) => x.status !== 'pass')
        if (r.length) bad.push(`${i.name}: ${r.map((x) => x.label).join('; ')}`)
      }
      return {
        ok: !bad.length,
        summary: bad.length
          ? `${bad.length} of ${VECTORS.length} vectors have findings`
          : `All ${VECTORS.length} vectors pass`,
        details: bad,
      }
    },
  },
  {
    id: 'audit',
    title: 'Set consistency',
    about: 'Measures every vector: gaps, centring, kinks, loose ends and size against the set’s median.',
    run: async () => {
      const a = await api.audit()
      return {
        ok: !a.flagged.length,
        summary: `${a.count} vectors, median ink ${a.medianInk}%, median extent ${a.medianExtent}, ${Object.values(a.deliberate).reduce((n, o) => n + Object.keys(o).length, 0)} deliberate exceptions (${Object.keys(a.deliberate.small).concat(Object.keys(a.deliberate.centre)).join(', ')})`,
        details: a.flagged,
      }
    },
  },
  {
    id: 'recipes',
    title: 'Recipes in sync',
    about: 'Every recipe must reproduce its saved vector at the default settings.',
    run: async () => {
      const r = await api.recipeStatus()
      const stale = Object.entries(r.stale).map(([n, why]) => `${n}: ${why}`)
      return {
        ok: !stale.length,
        summary: stale.length ? `${stale.length} stale of ${r.recipes}` : `${r.recipes} recipes match their files`,
        details: stale,
      }
    },
  },
  {
    id: 'coverage',
    title: 'Radius and curve coverage',
    about: 'Vectors with rounded corners or circles must respond to the radius and curve settings.',
    run: async () => {
      const c = await api.coverage()
      const miss = Object.entries(c.missing).map(([n, why]) => `${n}: ${why}`)
      return {
        ok: !miss.length,
        summary: miss.length
          ? `${miss.length} vectors ignore the settings`
          : `${c.responsive} respond, ${c.noFeatures} have nothing to round, ${Object.keys(c.exempt).length} exempt`,
        details: miss,
      }
    },
  },
  {
    id: 'poses',
    title: 'Poses',
    about:
      'Valid data and XML, identical at rest, every channel visibly moves the vector, pivots sit on their parts, nothing leaves the canvas up to 1.25.',
    run: async () => {
      const r = await api.poseLint()
      const bad = Object.entries(r.issues).map(([n, list]) => `${n}: ${list.join('; ')}`)
      const thinSecond = Object.keys(r.notes).length
      return {
        ok: !bad.length,
        summary: `${bad.length ? `${bad.length} of ${r.total} vectors have issues` : `All ${r.total} pass`}, ${r.avgBytes} bytes of pose data per vector${thinSecond ? `, ${thinSecond} vectors have a plain second gesture` : ''}`,
        details: bad,
      }
    },
  },
  {
    id: 'perf',
    title: 'Performance',
    about:
      'What the set costs the browser: restyling when a pose number changes (whole set and one vector), drawing from recipes, and the weight of the pose data, against budgets.',
    run: async () => {
      const r = await api.perfAudit()
      const s = r.set
      return {
        ok: r.ok,
        summary: `${s.recalcUsPerShape} µs per posed shape (${s.recalcMsAll} ms for ${s.posedShapes}), one vector at most ${s.oneVectorRecalcMsMax} ms, recipe draw at most ${s.renderMsMax} ms, ${s.poseBytesAvg} bytes of pose data per vector, stylesheet ${(s.stylesheetBytes / 1024).toFixed(1)} KB`,
        details: [...r.flagged, `slowest to restyle: ${r.slowest.join(', ')}`],
      }
    },
  },
  {
    id: 'morph',
    title: 'Morph',
    about:
      'Every vector is morphed into the next one, round the whole set: both ends of every stroke must have the same commands (what CSS needs to interpolate), stay on the canvas, and be cheap to plan.',
    run: async () => {
      const r = api.morphAudit()
      const s = r.stats
      return {
        ok: r.ok,
        summary: `${s.pairs} pairs, ${s.avgMs} ms each on average (slowest ${s.slowestMs} ms), ${s.rough} rough (a plain swap suits those better)`,
        details: r.flagged,
      }
    },
  },
  {
    id: 'a11y',
    title: 'Accessibility',
    about:
      'The Showcase is rendered off screen and audited: vectors hidden or labelled, every control named, switches, checkboxes and radios say whether they are on, targets at least 24 px, reduced motion honoured.',
    run: async () => {
      const host = document.createElement('div')
      host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1100px'
      document.body.append(host)
      const root = createRoot(host)
      root.render(<Showcase />)
      await new Promise((resolve) => setTimeout(resolve, 600))
      const r = api.a11yAudit(host)
      root.unmount()
      host.remove()
      const s = r.stats
      return {
        ok: r.ok,
        summary: `${s.vectors} vectors (${s.decorative} decorative, ${s.labelled} labelled) in ${s.controls} controls, ${s.tooSmall} under 24 px, reduced motion ${s.reducedMotion ? 'handled' : 'not handled'}`,
        details: r.flagged,
      }
    },
  },
  {
    id: 'phone',
    title: 'Phone width',
    about: 'Every page is opened in a 375 px wide frame and checked for anything that makes it scroll sideways.',
    run: async () => {
      const routes = ['/', '/?vector=cloud', '/studio/bell', '/showcase', '/quality']
      const bad: string[] = []
      for (const route of routes) {
        const frame = document.createElement('iframe')
        frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:375px;height:800px;border:0'
        frame.src = route
        document.body.append(frame)
        await new Promise((res) => frame.addEventListener('load', res, { once: true }))
        await new Promise((res) => setTimeout(res, 900))
        const doc = frame.contentDocument
        if (!doc) throw new Error(`cannot read ${route}`)
        const wide = doc.documentElement.scrollWidth > 376
        if (wide) {
          const over = [...doc.querySelectorAll('main *')]
            .filter((e) => e.getBoundingClientRect().right > 376 && !e.closest('.film ul, .sc-driver, .code, .source'))
            .slice(0, 3)
            .map((e) => `${e.localName}.${String(e.className).split(' ')[0]}`)
          bad.push(`${route}: ${doc.documentElement.scrollWidth}px wide${over.length ? ` (${over.join(', ')})` : ''}`)
        }
        frame.remove()
      }
      return {
        ok: !bad.length,
        summary: bad.length
          ? `${bad.length} of ${routes.length} pages scroll sideways`
          : `${routes.length} pages fit in 375 px`,
        details: bad,
      }
    },
  },
]
