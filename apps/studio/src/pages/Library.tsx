import type { Status } from '@icon-canvas/checks'
import { DEFAULT_STYLE, POSES, RECIPES } from '@icon-canvas/core'
import { api, ICONS, lintSVG, overall, renderIcon } from '@icon-canvas/engine'
import { resolve, stateNames } from '@icon-canvas/runtime'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useCopy, useEngine } from '../app/hooks.ts'
import { Link, useRouter } from '../app/router.tsx'
import { Glyph } from '../components/Glyph.tsx'
import { SEARCH_TERMS } from '../data/search-terms.ts'
import { cssVars } from '../lib/css.ts'
import { Player } from './motion/Player.tsx'

// the families of states, found from the pose table: what an icon's states have in common
const FAMILY = {
  states: (n: string) => !!POSES[n]?.states?.length,
  off: (n: string) => !!POSES[n]?.states?.includes('off'),
  marks: (n: string) => ['plus', 'check', 'minus'].every((m) => POSES[n]?.states?.includes(m)), // the badge families: plus, check, x, minus
  turns: (n: string) => !!POSES[n]?.group, // turned or mirrored as a whole: directions, back and forward
}

type Family = keyof typeof FAMILY
type Filter = 'all' | Family | 'attention'
const FILTERS: readonly (readonly [Filter, string])[] = [
  ['all', 'All'],
  ['states', 'With states'],
  ['off', 'Off'],
  ['marks', 'Marks'],
  ['turns', 'Turns'],
  ['attention', 'Needs attention'],
]

export default function Library() {
  const snap = useEngine()
  const { params, navigate } = useRouter()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const search = useRef<HTMLInputElement>(null)
  const selected = params.get('icon')

  // the status of each icon, judged as the current style settings draw it
  const style = useDeferredValue(snap.style)
  const status = useMemo(
    () => Object.fromEntries(ICONS.map((i) => [i.name, overall(lintSVG(renderIcon(i.name, style, { inline: true })))])),
    [style],
  )
  const attention = Object.values(status).filter((s) => s !== 'pass').length
  const withStates = ICONS.filter((i) => POSES[i.name]?.states?.length).length

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    // a name that is an icon in one of its states (arrow-left, mic-off, unlock) finds that icon
    const viaState = new Set(
      term
        ? stateNames()
            .filter((n) => n.includes(term))
            .flatMap((n) => resolve(n)?.base ?? [])
        : [],
    )
    const matches = (name: string): boolean =>
      !term || name.includes(term) || viaState.has(name) || !!SEARCH_TERMS[name]?.includes(term)
    const inFilter = (name: string): boolean => {
      if (filter === 'all') return true
      if (filter === 'attention') return status[name] !== 'pass'
      return FAMILY[filter](name)
    }
    return ICONS.filter((i) => matches(i.name) && inFilter(i.name))
  }, [q, filter, status])

  const select = (name: string | null) => navigate(name ? `/?icon=${name}` : '/', { replace: true })

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
          <h1>Icons</h1>
          <p className="lede">
            {ICONS.length} line icons on a 24 grid, {withStates} of them with states, which makes {stateNames().length}{' '}
            more names (mic-off, user-plus, arrow-left, cloud-done).{' '}
            {attention
              ? `${attention} need${attention === 1 ? 's' : ''} attention at this style.`
              : 'All pass at this style.'}
          </p>
        </div>
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
            placeholder="Search icons"
            aria-label="Search icons"
          />
          {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a <kbd> is not focusable; this is a decorative key hint */}
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>

      <div className="library-body">
        <section aria-label="Icon grid">
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Filter">
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="inline-field">
              <span>Size</span>
              <input
                type="range"
                min="16"
                max="64"
                step="4"
                value={snap.tile}
                onChange={(e) => api.setTileSize(+e.target.value)}
                aria-label="Icon size"
              />
            </label>
          </div>

          {shown.length ? (
            <ul className="grid" style={cssVars({ '--tile': `${snap.tile}px` })}>
              {shown.map((i) => (
                <li key={i.name}>
                  <button
                    type="button"
                    className="tile"
                    aria-pressed={selected === i.name}
                    data-status={status[i.name]}
                    onClick={() => select(selected === i.name ? null : i.name)}
                    onDoubleClick={() => navigate(`/showcase?icon=${i.name}`)}
                    title={status[i.name] === 'pass' ? i.name : `${i.name}: ${status[i.name]}`}
                  >
                    <Glyph name={i.name} size={snap.tile} />
                    <span className="tile-name">{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No icons match “{q}”.</p>
          )}
        </section>

        <aside className="rail" aria-label="Details">
          {selected && ICONS.some((i) => i.name === selected) && (
            <Detail key={selected} name={selected} status={status[selected] ?? 'pass'} onClose={() => select(null)} />
          )}
        </aside>
      </div>
    </div>
  )
}

function Detail({ name, status, onClose }: { name: string; status: Status; onClose: () => void }) {
  const [copied, copy] = useCopy()
  const [stop, setStop] = useState(0) // the state the player has the icon in; 0 is its normal look
  const states = POSES[name]?.states ?? []
  const state = states[stop - 1] ?? ''
  const pose = POSES[name]
  const file = ICONS.find((i) => i.name === name)
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
        <Link to={`/showcase?icon=${name}`} className="btn primary">
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
