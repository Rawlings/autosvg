import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Showcase from './Showcase.jsx'
import { api, ICONS, lintSVG, renderIcon } from '../engine.js'
import { STYLE } from '../spec.js'

// Each check returns { ok, summary, details[] }. They run in the page, against the real icons.
const CHECKS = [
  {
    id: 'rules',
    title: 'Spec rules',
    about: 'Grid, stroke, shapes, detail budget, as the current style draws every icon.',
    run: async () => {
      const bad = []
      for (const i of ICONS) {
        const r = lintSVG(renderIcon(i.name, STYLE, { inline: true })).filter((x) => x.status !== 'pass')
        if (r.length) bad.push(`${i.name}: ${r.map((x) => x.label).join('; ')}`)
      }
      return { ok: !bad.length, summary: bad.length ? `${bad.length} of ${ICONS.length} icons have findings` : `All ${ICONS.length} icons pass`, details: bad }
    },
  },
  {
    id: 'audit',
    title: 'Set consistency',
    about: 'Measures every icon: gaps, centring, kinks, loose ends and size against the set’s median.',
    run: async () => {
      const a = await api.audit()
      return { ok: !a.flagged.length, summary: `${a.count} icons, median ink ${a.medianInk}%, median extent ${a.medianExtent}, ${Object.values(a.deliberate).reduce((n, o) => n + Object.keys(o).length, 0)} deliberate exceptions (${Object.keys(a.deliberate.small).concat(Object.keys(a.deliberate.centre)).join(', ')})`, details: a.flagged }
    },
  },
  {
    id: 'recipes',
    title: 'Recipes in sync',
    about: 'Every recipe must reproduce its saved icon at the default settings.',
    run: async () => {
      const r = await api.recipeStatus()
      const stale = Object.entries(r.stale).map(([n, why]) => `${n}: ${why}`)
      return { ok: !stale.length, summary: stale.length ? `${stale.length} stale of ${r.recipes}` : `${r.recipes} recipes match their files`, details: stale }
    },
  },
  {
    id: 'coverage',
    title: 'Radius and curve coverage',
    about: 'Icons with rounded corners or circles must respond to the radius and curve settings.',
    run: async () => {
      const c = await api.coverage()
      const miss = Object.entries(c.missing).map(([n, why]) => `${n}: ${why}`)
      return {
        ok: !miss.length,
        summary: miss.length ? `${miss.length} icons ignore the settings` : `${c.responsive} respond, ${c.noFeatures} have nothing to round, ${Object.keys(c.exempt).length} exempt`,
        details: miss,
      }
    },
  },
  {
    id: 'poses',
    title: 'Poses',
    about: 'Valid data and XML, identical at rest, every channel visibly moves the icon, pivots sit on their parts, nothing leaves the canvas up to 1.25.',
    run: async () => {
      const r = await api.poseLint()
      const bad = Object.entries(r.issues).map(([n, list]) => `${n}: ${list.join('; ')}`)
      const thinSecond = Object.keys(r.notes).length
      return {
        ok: !bad.length,
        summary: `${bad.length ? `${bad.length} of ${r.total} icons have issues` : `All ${r.total} pass`}, ${r.avgBytes} bytes of pose data per icon${thinSecond ? `, ${thinSecond} icons have a plain second gesture` : ''}`,
        details: bad,
      }
    },
  },
  {
    id: 'perf',
    title: 'Performance',
    about: 'What the set costs the browser: restyling when a pose number changes (whole set and one icon), drawing from recipes, and the weight of the pose data, against budgets.',
    run: async () => {
      const r = await api.perfAudit()
      const s = r.set
      return {
        ok: r.ok,
        summary: `${s.recalcUsPerShape} µs per posed shape (${s.recalcMsAll} ms for ${s.posedShapes}), one icon at most ${s.oneIconRecalcMsMax} ms, recipe draw at most ${s.renderMsMax} ms, ${s.poseBytesAvg} bytes of pose data per icon, stylesheet ${(s.stylesheetBytes / 1024).toFixed(1)} KB`,
        details: [...r.flagged, `slowest to restyle: ${r.slowest.join(', ')}`],
      }
    },
  },
  {
    id: 'morph',
    title: 'Morph',
    about: 'Every icon is morphed into the next one, round the whole set: both ends of every stroke must have the same commands (what CSS needs to interpolate), stay on the canvas, and be cheap to plan.',
    run: async () => {
      const r = api.morphAudit()
      const s = r.stats
      return { ok: r.ok, summary: `${s.pairs} pairs, ${s.avgMs} ms each on average (slowest ${s.slowestMs} ms), ${s.rough} rough (a plain swap suits those better)`, details: r.flagged }
    },
  },
  {
    id: 'a11y',
    title: 'Accessibility',
    about: 'The Showcase is rendered off screen and audited: icons hidden or labelled, every control named, switches, checkboxes and radios say whether they are on, targets at least 24 px, reduced motion honoured.',
    run: async () => {
      const host = document.createElement('div')
      host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1100px'
      document.body.append(host)
      const root = createRoot(host)
      root.render(<Showcase />)
      await new Promise((r) => setTimeout(r, 600))
      const r = api.a11yAudit(host)
      root.unmount()
      host.remove()
      const s = r.stats
      return {
        ok: r.ok,
        summary: `${s.icons} icons (${s.decorative} decorative, ${s.labelled} labelled) in ${s.controls} controls, ${s.tooSmall} under 24 px, reduced motion ${s.reducedMotion ? 'handled' : 'not handled'}`,
        details: r.flagged,
      }
    },
  },
  {
    id: 'phone',
    title: 'Phone width',
    about: 'Every page is opened in a 375 px wide frame and checked for anything that makes it scroll sideways.',
    run: async () => {
      const routes = ['/', '/?icon=cloud', '/studio/bell', '/motion', '/showcase', '/quality']
      const bad = []
      for (const route of routes) {
        const frame = document.createElement('iframe')
        frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:375px;height:800px;border:0'
        frame.src = route
        document.body.append(frame)
        await new Promise((res) => frame.addEventListener('load', res, { once: true }))
        await new Promise((res) => setTimeout(res, 900))
        const doc = frame.contentDocument
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
      return { ok: !bad.length, summary: bad.length ? `${bad.length} of ${routes.length} pages scroll sideways` : `${routes.length} pages fit in 375 px`, details: bad }
    },
  },
  {
    id: 'brands',
    title: 'Brand settings',
    about: 'Draws the whole set under six very different brand settings and counts what breaks.',
    run: async () => {
      const settings = [
        {},
        { radius: 0 },
        { radius: 2.5 },
        { curve: 1 },
        { radius: 2.5, curve: 1 },
        { stroke: 1, cap: 'square', join: 'miter', radius: 0 },
      ]
      const details = []
      for (const s of settings) {
        const r = await api.brandReport(s)
        if (r.count) details.push(`${JSON.stringify(s)}: ${r.count} broken (${Object.keys(r.broken).slice(0, 6).join(', ')})`)
      }
      return { ok: !details.length, summary: details.length ? `${details.length} of ${settings.length} settings break icons` : `0 broken across ${settings.length} settings`, details }
    },
  },
]

export default function Quality() {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(null)

  async function run(check) {
    setRunning(check.id)
    try {
      const out = await check.run()
      setResults((r) => ({ ...r, [check.id]: out }))
    } catch (e) {
      setResults((r) => ({ ...r, [check.id]: { ok: false, summary: 'The check failed to run', details: [String(e.message || e)] } }))
    }
    setRunning(null)
  }
  async function runAll() {
    for (const c of CHECKS) await run(c)
  }

  const done = CHECKS.filter((c) => results[c.id])
  const failing = done.filter((c) => !results[c.id].ok).length

  return (
    <div className="page quality">
      <div className="page-head">
        <div>
          <h1>Quality</h1>
          <p className="lede">
            Checks that run against the real icons in this page.
            {done.length ? ` ${done.length - failing} of ${done.length} run clean.` : ''}
          </p>
        </div>
        <button type="button" className="btn primary" disabled={!!running} onClick={runAll}>
          {running ? 'Running…' : 'Run all'}
        </button>
      </div>

      <ul className="checklist">
        {CHECKS.map((c) => {
          const r = results[c.id]
          return (
            <li key={c.id} className="check-row" data-status={r ? (r.ok ? 'pass' : 'warn') : 'idle'}>
              <div className="check-main">
                <h2>{c.title}</h2>
                <p className="muted">{c.about}</p>
                {r && (
                  <p className="result">
                    <span className="dot" aria-hidden="true" />
                    {r.summary}
                  </p>
                )}
                {r?.details.length > 0 && (
                  <details>
                    <summary>{r.details.length} {r.details.length === 1 ? 'finding' : 'findings'}</summary>
                    <ul className="findings">
                      {r.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <button type="button" className="btn" disabled={!!running} onClick={() => run(c)}>
                {running === c.id ? 'Running…' : r ? 'Run again' : 'Run'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
