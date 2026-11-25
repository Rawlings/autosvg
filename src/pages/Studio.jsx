import { useEffect, useRef, useState } from 'react'
import { api, ICONS, setSourceText, getSnapshot } from '../engine.js'
import { useEngine, useChecks, useCopy } from '../app/hooks.js'
import { Link, useRouter } from '../app/router.jsx'
import { Canvas } from '../components/Canvas.jsx'
import { Checks } from '../components/Checks.jsx'
import { Appearance } from '../components/Appearance.jsx'
import { Glyph } from '../components/Glyph.jsx'
import { SPEC } from '../spec.js'
import { POSES } from '../poses.js'

const STATUS_TEXT = { pass: 'All passing', warn: 'Warnings', fail: 'Failing' }

export default function Studio() {
  const snap = useEngine()
  const { path, navigate } = useRouter()
  const param = path.split('/')[2] || ''
  const known = ICONS.some((i) => i.name === param)
  const paramRef = useRef(param)
  paramRef.current = param

  const [grid, setGrid] = useState(true)
  const [guides, setGuides] = useState(true)
  const [copied, copy] = useCopy()
  const { svg, rows, status, info } = useChecks(snap)

  // the address names the icon: load it, and follow the engine if something else (an agent) loads another
  useEffect(() => {
    if (known) {
      if (getSnapshot().name !== param) api.load(param)
    } else {
      navigate(`/studio/${getSnapshot().name || (ICONS.some((i) => i.name === 'layers') ? 'layers' : ICONS[0].name)}`, { replace: true })
    }
  }, [param, known, navigate])
  useEffect(() => {
    const live = getSnapshot().name
    if (live && live !== paramRef.current) navigate(`/studio/${live}`, { replace: true })
  }, [snap.name, navigate])

  const idx = ICONS.findIndex((i) => i.name === snap.name)
  const go = (d) => {
    const next = ICONS[(idx + d + ICONS.length) % ICONS.length]
    if (next) navigate(`/studio/${next.name}`)
  }
  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey) return
      if (e.key === '[') go(-1)
      if (e.key === ']') go(1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <div className="page studio">
      <div className="studio-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to={snap.name ? `/?icon=${snap.name}` : '/'}>Library</Link>
          <span aria-hidden="true">/</span>
          <h1>{snap.name || 'Untitled'}</h1>
        </nav>
        <div className="studio-actions">
          <div className="stepper">
            <button type="button" className="btn icon-btn" onClick={() => go(-1)} aria-label="Previous icon" title="Previous ( [ )">
              <Chevron dir="left" />
            </button>
            <button type="button" className="btn icon-btn" onClick={() => go(1)} aria-label="Next icon" title="Next ( ] )">
              <Chevron dir="right" />
            </button>
          </div>
          <button type="button" className="btn" onClick={() => copy(svg)}>
            {copied ? 'Copied' : 'Copy SVG'}
          </button>
          <button type="button" className="btn" onClick={() => api.clear()}>
            Clear
          </button>
        </div>
      </div>

      <div className="studio-body">
        <section aria-label="Canvas" className="studio-main">
          <Canvas markup={snap.markup} style={snap.style} grid={grid} guides={guides} />
          <div className="toolbar toolbar-center">
            <div className="seg" role="group" aria-label="Canvas overlays">
              <button type="button" aria-pressed={grid} onClick={() => setGrid(!grid)}>
                Grid
              </button>
              <button type="button" aria-pressed={guides} onClick={() => setGuides(!guides)}>
                Keylines
              </button>
            </div>
          </div>
        </section>

        <aside className="rail" aria-label="Inspector">
          <section>
            <h2>
              Checks
              {status && <span className="pill" data-status={status}>{STATUS_TEXT[status]}</span>}
            </h2>
            <Checks rows={rows} info={info} />
          </section>

          <section>
            <h2>Sizes</h2>
            <ul className="sizes">
              {SPEC.previewSizes.map((px) => (
                <li key={px}>
                  <span className="swatch" dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg width="${px}" height="${px}" `) }} />
                  <span className="muted small">{px}</span>
                </li>
              ))}
            </ul>
          </section>

          {POSES[snap.name]?.states?.length > 0 && (
            <section>
              <h2>States</h2>
              <ul className="states">
                {['', ...POSES[snap.name].states].map((st) => (
                  <li key={st || 'normal'}>
                    <Glyph name={snap.name} state={st} size={32} />
                    <span className="muted small">{st || 'normal'}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">The same icon in each state, drawn from the pose table. Names: {POSES[snap.name].states.map((st) => `${snap.name}-${st}`).join(', ')}.</p>
            </section>
          )}

          {snap.name && known && <Usage name={snap.name} />}

          <section>
            <h2>Beside its neighbours</h2>
            <Neighbours name={snap.name} idx={idx} svg={svg} />
          </section>

          <details className="fold">
            <summary>Appearance</summary>
            <Appearance style={snap.style} />
          </details>

          <details className="fold">
            <summary>SVG source</summary>
            <Source markup={snap.markup} />
          </details>
        </aside>
      </div>
    </div>
  )
}

/** The markup that uses this icon, with the state when it has one: what to paste into a page. */
function Usage({ name }) {
  const [copied, copy] = useCopy()
  const states = POSES[name]?.states ?? []
  const snippet = states.length
    ? `<icon-glyph name="${name}"></icon-glyph>\n<icon-glyph name="${name}" state="${states[0]}"></icon-glyph>`
    : `<icon-glyph name="${name}"></icon-glyph>`
  return (
    <section>
      <h2>Use</h2>
      <pre className="code">{snippet}</pre>
      <button type="button" className="btn" onClick={() => copy(snippet)}>
        {copied ? 'Copied' : 'Copy markup'}
      </button>
    </section>
  )
}

function Neighbours({ name, idx, svg }) {
  if (idx < 0) return <p className="muted">Load an icon to compare it.</p>
  const around = []
  for (let d = -3; d <= 3; d++) around.push(ICONS[(idx + d + ICONS.length) % ICONS.length].name)
  return (
    <ul className="context">
      {around.map((n) => (
        <li key={n} data-current={n === name}>
          {n === name ? <span dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="28" height="28" ') }} /> : <Glyph name={n} size={28} />}
        </li>
      ))}
    </ul>
  )
}

function Source({ markup }) {
  const [draft, setDraft] = useState(null) // while typing, show what was typed, not the engine's tidy version
  const [bad, setBad] = useState(false)
  return (
    <textarea
      className="source"
      spellCheck={false}
      aria-label="SVG source"
      aria-invalid={bad}
      value={draft ?? markup}
      onChange={(e) => {
        setDraft(e.target.value)
        try {
          setSourceText(e.target.value)
          setBad(false)
        } catch {
          setBad(true)
        }
      }}
      onBlur={() => {
        setDraft(null)
        setBad(false)
      }}
    />
  )
}

function Chevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
    </svg>
  )
}
