import type { Status } from '@autosvg/checks'
import { DEFAULT_STYLE, POSES, RECIPES } from '@autosvg/core'
import { api, lintSVG, overall, renderIcon, VECTORS } from '@autosvg/engine'
import { resolve, stateNames } from '@autosvg/runtime'
import { bySection, categoryOf } from '@autosvg/vectors'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useCopy, useEngine } from '../app/hooks.ts'
import { Link, useRouter } from '../app/router.tsx'
import { Glyph } from '../components/Glyph.tsx'
import { SEARCH_TERMS } from '../data/search-terms.ts'
import { cssVars } from '../lib/css.ts'
import { Player } from './motion/Player.tsx'

interface Group {
  id: string
  label: string
  categories: { id: string; label: string; vectors: readonly { name: string }[] }[]
}

export default function Library() {
  const snap = useEngine()
  const { params, navigate } = useRouter()
  const [q, setQ] = useState('')
  const search = useRef<HTMLInputElement>(null)
  const selected = params.get('vector')

  // the status of each vector, judged as the current style settings draw it
  const style = useDeferredValue(snap.style)
  const status = useMemo(
    () =>
      Object.fromEntries(VECTORS.map((i) => [i.name, overall(lintSVG(renderIcon(i.name, style, { inline: true })))])),
    [style],
  )
  const attention = Object.values(status).filter((s) => s !== 'pass').length
  const withStates = VECTORS.filter((i) => POSES[i.name]?.states?.length).length

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    // a name that is a vector in one of its states (arrow-left, mic-off, unlock) finds that vector
    const viaState = new Set(
      term
        ? stateNames()
            .filter((n) => n.includes(term))
            .flatMap((n) => resolve(n)?.base ?? [])
        : [],
    )
    const matches = (name: string): boolean =>
      !term ||
      name.includes(term) ||
      viaState.has(name) ||
      !!SEARCH_TERMS[name]?.includes(term) ||
      !!categoryOf(name)?.label.toLowerCase().includes(term)
    return VECTORS.filter((i) => matches(i.name))
  }, [q])

  // with no search, the grid reads in the set's own order: sections, then categories; a vector nobody filed shows last
  const groups = useMemo(() => {
    if (q.trim()) return null
    const sections: Group[] = bySection().map((s) => ({
      id: s.id,
      label: s.label,
      categories: s.categories
        .map((c) => ({ id: c.id, label: c.label, vectors: shown.filter((v) => categoryOf(v.name)?.id === c.id) }))
        .filter((c) => c.vectors.length),
    }))
    const unfiled = shown.filter((v) => !categoryOf(v.name))
    if (unfiled.length)
      sections.push({
        id: 'unfiled',
        label: 'Not in a category yet',
        categories: [{ id: 'unfiled', label: 'Unfiled', vectors: unfiled }],
      })
    return sections.filter((s) => s.categories.length)
  }, [q, shown])

  const select = (name: string | null) => navigate(name ? `/?vector=${name}` : '/', { replace: true })

  const grid = (list: readonly { name: string }[]) => (
    <ul className="grid" style={cssVars({ '--tile': `${snap.tile}px` })}>
      {list.map((i) => (
        <li key={i.name}>
          <button
            type="button"
            className="tile"
            aria-pressed={selected === i.name}
            data-status={status[i.name]}
            onClick={() => select(selected === i.name ? null : i.name)}
            onDoubleClick={() => navigate(`/showcase?vector=${i.name}`)}
            title={status[i.name] === 'pass' ? i.name : `${i.name}: ${status[i.name]}`}
          >
            <Glyph name={i.name} size={snap.tile} />
            <span className="tile-name">{i.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName ?? '')
      if (e.key === '/' && !typing) {
        e.preventDefault()
        search.current?.focus()
      } else if (e.key === 'Escape') {
        if (typing && document.activeElement instanceof HTMLElement) document.activeElement.blur()
        else if (typing) return
        else if (selected) select(null)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <div className="page library">
      <div className="page-head">
        <div>
          <h1>Vectors</h1>
          <p className="lede">
            {VECTORS.length} vectors, {withStates} with states
            {attention ? `, ${attention} needing attention` : ''}
          </p>
        </div>
      </div>

      <div className="library-body">
        <section aria-label="Vector grid">
          <div className="toolbar">
            <label className="search">
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
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.2-4.2" />
              </svg>
              <input
                ref={search}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search vectors"
                aria-label="Search vectors"
              />
              {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a <kbd> is not focusable; this is a decorative key hint */}
              <kbd aria-hidden="true">/</kbd>
            </label>
            <label className="inline-field">
              <span>Size</span>
              <input
                type="range"
                min="16"
                max="64"
                step="4"
                value={snap.tile}
                onChange={(e) => api.setTileSize(+e.target.value)}
                aria-label="Vector size"
              />
            </label>
          </div>

          {shown.length ? (
            groups ? (
              groups.map((section) => (
                <div key={section.id} className="lib-section">
                  <h2 className="lib-section-head">{section.label}</h2>
                  {section.categories.map((c) => (
                    <section key={c.id} aria-label={c.label}>
                      <h3 className="lib-cat-head">
                        {c.label} <span>{c.vectors.length}</span>
                      </h3>
                      {grid(c.vectors)}
                    </section>
                  ))}
                </div>
              ))
            ) : (
              grid(shown)
            )
          ) : (
            <p className="empty">No vectors match “{q}”.</p>
          )}
        </section>

        <aside className="rail" aria-label="Details">
          {selected && VECTORS.some((i) => i.name === selected) && (
            <Detail key={selected} name={selected} status={status[selected] ?? 'pass'} onClose={() => select(null)} />
          )}
        </aside>
      </div>
    </div>
  )
}

function Detail({ name, status, onClose }: { name: string; status: Status; onClose: () => void }) {
  const [copied, copy] = useCopy()
  const [stop, setStop] = useState(0) // the state the player has the vector in; 0 is its normal look
  const states = POSES[name]?.states ?? []
  const state = states[stop - 1] ?? ''
  const pose = POSES[name]
  const file = VECTORS.find((i) => i.name === name)
  return (
    <section className="detail">
      <div className="detail-head">
        <h2>{name}</h2>
        <button type="button" className="text-btn" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>
      <Player name={name} onStop={setStop} />
      <dl className="facts">
        <div>
          <dt>Checks</dt>
          <dd data-status={status}>{status === 'pass' ? 'Passing' : status === 'warn' ? 'Warnings' : 'Failing'}</dd>
        </div>
        <div>
          <dt>Shape</dt>
          <dd>{RECIPES[name] ? 'Follows radius and curve' : 'Fixed geometry'}</dd>
        </div>
        {states.length > 0 && (
          <div>
            <dt>States</dt>
            <dd>{states.join(', ')}</dd>
          </div>
        )}
        <div>
          <dt>Motion</dt>
          <dd>{pose?.labels[0] || 'None'}</dd>
        </div>
      </dl>
      <div className="actions">
        <Link to={`/showcase?vector=${name}`} className="btn primary">
          See it in 3D
        </Link>
        <Link to={`/studio/${name}`} className="btn">
          Studio
        </Link>
        <button
          type="button"
          className="btn"
          onClick={() =>
            copy(state ? renderIcon(`${name}-${state}`, DEFAULT_STYLE, { inline: true }) : (file?.svg ?? ''))
          }
        >
          {copied ? 'Copied' : 'Copy SVG'}
        </button>
      </div>
    </section>
  )
}
