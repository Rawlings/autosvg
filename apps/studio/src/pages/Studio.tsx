import { POSES, SPEC } from '@autosvg/core'
import { api, getSnapshot, setSourceText, VECTORS } from '@autosvg/engine'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChecks, useCopy, useEngine } from '../app/hooks.ts'
import { Link, useRouter } from '../app/router.tsx'
import { Canvas } from '../components/Canvas.tsx'
import { Checks } from '../components/Checks.tsx'
import { Glyph } from '../components/Glyph.tsx'
import { InlineSvg } from '../components/InlineSvg.tsx'

const STATUS_TEXT = { pass: 'All passing', warn: 'Warnings', fail: 'Failing' } as const

export default function Studio() {
  const snap = useEngine()
  const { path, navigate } = useRouter()
  const param = path.split('/')[2] || ''
  const known = VECTORS.some((i) => i.name === param)
  const states = POSES[snap.name]?.states ?? []
  const paramRef = useRef(param)
  paramRef.current = param

  const [grid, setGrid] = useState(true)
  const [guides, setGuides] = useState(true)
  const [copied, copy] = useCopy()
  const { svg, rows, status, info } = useChecks(snap)

  // the address names the vector: load it, and follow the engine if something else (an agent) loads another
  useEffect(() => {
    if (known) {
      if (getSnapshot().name !== param) api.load(param)
    } else {
      navigate(
        `/studio/${getSnapshot().name || (VECTORS.some((i) => i.name === 'layers') ? 'layers' : (VECTORS[0]?.name ?? ''))}`,
        { replace: true },
      )
    }
  }, [param, known, navigate])
  useEffect(() => {
    const live = snap.name
    if (live && live !== paramRef.current) navigate(`/studio/${live}`, { replace: true })
  }, [snap.name, navigate])

  const idx = VECTORS.findIndex((i) => i.name === snap.name)
  const go = useCallback(
    (d: number) => {
      const next = VECTORS[(idx + d + VECTORS.length) % VECTORS.length]
      if (next) navigate(`/studio/${next.name}`)
    },
    [idx, navigate],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/input|textarea|select/i.test(document.activeElement?.tagName ?? '') || e.metaKey || e.ctrlKey) return
      if (e.key === '[') go(-1)
      if (e.key === ']') go(1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [go])

  return (
    <div className="page studio">
      <div className="studio-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to={snap.name ? `/?vector=${snap.name}` : '/'}>Library</Link>
          <span aria-hidden="true">/</span>
          <h1>{snap.name || 'Untitled'}</h1>
        </nav>
        <div className="studio-actions">
          <div className="stepper">
            <button
              type="button"
              className="btn vector-btn"
              onClick={() => go(-1)}
              aria-label="Previous vector"
              title="Previous ( [ )"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="btn vector-btn"
              onClick={() => go(1)}
              aria-label="Next vector"
              title="Next ( ] )"
            >
              <Chevron dir="right" />
            </button>
          </div>
          {snap.name && (
            <Link to={`/showcase?vector=${snap.name}`} className="btn">
              See it in 3D
            </Link>
          )}
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
              {status && (
                <span className="pill" data-status={status}>
                  {STATUS_TEXT[status]}
                </span>
              )}
            </h2>
            <Checks rows={rows} info={info} />
          </section>

          <section>
            <h2>Sizes</h2>
            <ul className="sizes">
              {SPEC.previewSizes.map((px) => (
                <li key={px}>
                  <InlineSvg className="swatch" svg={svg} size={px} />
                  <span className="muted small">{px}</span>
                </li>
              ))}
            </ul>
          </section>

          {states.length > 0 && (
            <section>
              <h2>States</h2>
              <ul className="states">
                {['', ...states].map((st) => (
                  <li key={st || 'normal'}>
                    <Glyph name={snap.name} state={st} size={32} />
                    <span className="muted small">{st || 'normal'}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">
                The same vector in each state, drawn from the pose table. Names:{' '}
                {states.map((st) => `${snap.name}-${st}`).join(', ')}.
              </p>
            </section>
          )}

          {snap.name && known && <Usage name={snap.name} />}

          <section>
            <h2>Beside its neighbours</h2>
            <Neighbours name={snap.name} idx={idx} svg={svg} />
          </section>

          <details className="fold">
            <summary>SVG source</summary>
            <Source markup={snap.markup} />
          </details>
        </aside>
      </div>
    </div>
  )
}

/** The markup that uses this vector, with the state when it has one: what to paste into a page. */
function Usage({ name }: { name: string }) {
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

function Neighbours({ name, idx, svg }: { name: string; idx: number; svg: string }) {
  if (idx < 0) return <p className="muted">Load a vector to compare it.</p>
  const around: string[] = []
  for (let d = -3; d <= 3; d++) around.push(VECTORS[(idx + d + VECTORS.length) % VECTORS.length]?.name ?? '')
  return (
    <ul className="context">
      {around.map((n) => (
        <li key={n} data-current={n === name}>
          {n === name ? <InlineSvg svg={svg} size={28} /> : <Glyph name={n} size={28} />}
        </li>
      ))}
    </ul>
  )
}

function Source({ markup }: { markup: string }) {
  const [draft, setDraft] = useState<string | null>(null) // while typing, show what was typed, not the engine's tidy version
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

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
    </svg>
  )
}
