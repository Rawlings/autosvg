import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { api, ICONS, lintSVG, overall, renderIcon, DEFAULT_STYLE } from '../engine.js'
import { POSES } from '../poses.js'
import { RECIPES } from '../recipes.js'
import { useEngine, useCopy } from '../app/hooks.js'
import { Link, useRouter } from '../app/router.jsx'
import { Glyph } from '../components/Glyph.jsx'
import { resolve, stateNames } from '../icon-runtime.js'
import { Appearance } from '../components/Appearance.jsx'

// the families of states, found from the pose table: what an icon's states have in common
const FAMILY = {
  states: (n) => !!POSES[n]?.states?.length,
  off: (n) => !!POSES[n]?.states?.includes('off'),
  marks: (n) => ['plus', 'check', 'minus'].every((m) => POSES[n]?.states?.includes(m)), // the badge families: plus, check, x, minus
  turns: (n) => !!POSES[n]?.group, // turned or mirrored as a whole: directions, back and forward
}
// words people search by that are not the icon's name (the library page only: the runtime does not ship them)
const ALSO = {
  trash: 'delete remove bin garbage',
  settings: 'cog gear preferences options',
  search: 'find magnifier lookup',
  home: 'house start',
  close: 'x cross dismiss cancel',
  check: 'tick done ok confirm',
  menu: 'hamburger nav',
  more: 'ellipsis overflow dots',
  edit: 'pencil write change',
  share: 'social network',
  send: 'paper plane submit',
  heart: 'like love favourite favorite',
  star: 'rate favourite favorite',
  bell: 'notification alert alarm',
  lock: 'secure private password',
  eye: 'view show visible watch',
  mail: 'email envelope message',
  chat: 'message comment speech bubble',
  user: 'person account profile',
  users: 'people team group',
  download: 'save get',
  'external-link': 'open link new tab',
  refresh: 'reload sync retry',
  undo: 'back revert',
  filter: 'funnel',
  sliders: 'tune adjust equalizer',
  cart: 'basket checkout shop',
  wifi: 'wireless network signal internet',
  phone: 'call telephone',
  map: 'atlas directions',
  pin: 'pushpin tack',
  paperclip: 'attach attachment clip',
  keyboard: 'type keys input typing',
  'thumbs-up': 'like approve good vote dislike thumbs-down',
  trophy: 'winner prize cup win achievement',
  leaf: 'plant eco nature green',
  'at-sign': 'mention email handle address',
  thermometer: 'temperature weather hot cold fever',
  toggle: 'switch',
  clipboard: 'paste tasks checklist',
  radio: 'option choice',
  info: 'about details information',
  help: 'question support faq',
  'alert-circle': 'warning error attention exclamation',
  ban: 'forbidden block prohibited no',
  loader: 'spinner loading progress wait',
  hammer: 'tool build fix gavel',
  ruler: 'measure length',
  calculator: 'math calc maths',
  timer: 'stopwatch countdown',
  'alarm-clock': 'wake reminder',
  briefcase: 'work job business portfolio',
  receipt: 'invoice bill',
  ticket: 'event admission coupon',
  pill: 'medicine drug capsule tablet',
  dumbbell: 'gym fitness weights workout',
  flask: 'lab science chemistry beaker',
  gamepad: 'controller game gaming play',
  mouse: 'cursor click pointer',
  speaker: 'audio sound hifi',
  tv: 'television screen video',
  megaphone: 'announce announcement shout broadcast',
  banknote: 'money cash bill dollar payment',
  signpost: 'direction sign way road',
  anchor: 'harbor marine ship',
  'life-buoy': 'help support rescue lifebuoy',
  signal: 'bars strength reception cellular',
  gauge: 'speedometer meter dial performance',
  infinity: 'loop endless unlimited forever',
  atom: 'science physics nucleus',
  'graduation-cap': 'education school university degree',
  sprout: 'grow seedling plant new',
  tree: 'forest pine nature',
  snowflake: 'winter cold ice freeze',
  wind: 'air breeze weather',
  fish: 'sea animal swim',
  utensils: 'restaurant food eat dining cutlery',
  wine: 'drink glass bar',
  sunrise: 'dawn morning sunset dusk',
  waves: 'sea water ocean',
  navigation: 'location arrow gps direction',
  locate: 'crosshair gps target position',
  braces: 'curly json code',
  brackets: 'square code array',
  'git-commit': 'version control',
  'git-pull-request': 'merge review pr',
  'hard-drive': 'disk storage drive',
  network: 'sitemap hierarchy tree nodes',
  workflow: 'process flow steps',
  rss: 'feed subscribe broadcast',
  radar: 'scan sonar',
  building: 'office company city',
  store: 'shop market retail',
  landmark: 'bank museum government',
  tent: 'camp camping outdoors',
  crown: 'king queen premium royal',
  gem: 'diamond jewel premium',
  dice: 'game random chance roll',
  bot: 'robot ai assistant',
  accessibility: 'a11y wheelchair disabled inclusive',
  'sticky-note': 'memo post-it note',
  siren: 'alarm emergency police',
  'traffic-cone': 'construction roadwork caution',
  cast: 'screen mirror chromecast',
  film: 'movie video reel',
  disc: 'cd dvd music record',
  presentation: 'slides chart board',
  route: 'path directions journey',
  knob: 'dial volume',
  metronome: 'tempo beat rhythm',
  rainbow: 'pride arc',
  tornado: 'storm twister',
  'paint-roller': 'decorate wall',
  webcam: 'camera video call',
  watch: 'smartwatch wearable',
  'radio-tower': 'antenna broadcast transmit',
  'dollar-sign': 'money currency price',
  equal: 'not-equal equals math',
  asterisk: 'star required wildcard',
  'party-popper': 'celebrate confetti party congratulations',
  balloon: 'birthday party',
  bed: 'sleep hotel night',
  'paw-print': 'pet animal dog cat',
  'id-card': 'identity badge license',
  sailboat: 'boat yacht sea',
  train: 'rail transit metro',
  car: 'vehicle drive auto',
  candle: 'light flame',
  mushroom: 'fungus',
  barcode: 'scan product',
  'text-cursor': 'caret input type',
  return: 'enter newline',
  backspace: 'delete erase',
  shirt: 'clothes clothing tee',
  sigma: 'sum total math',
  scale: 'balance weigh justice law',
  flower: 'tulip bloom plant',
  sofa: 'couch furniture',
  notebook: 'journal diary pad',
  checkbox: 'tick box select',
  power: 'on off shutdown',
  zoom: 'magnify',
  sun: 'light day brightness theme',
  moon: 'dark night theme',
  lightbulb: 'idea tip',
  battery: 'charge power level',
  volume: 'sound speaker audio',
  mic: 'microphone record voice',
}
const FILTERS = [
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
  const [filter, setFilter] = useState('all')
  const search = useRef(null)
  const selected = params.get('icon')

  // the status of each icon, judged as the current brand settings draw it
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
    const viaState = new Set(term ? stateNames().filter((n) => n.includes(term)).map((n) => resolve(n).base) : [])
    return ICONS.filter((i) => (!term || i.name.includes(term) || viaState.has(i.name) || ALSO[i.name]?.includes(term)) && (filter === 'all' || (FAMILY[filter] ? FAMILY[filter](i.name) : status[i.name] !== 'pass')))
  }, [q, filter, status])

  const select = (name) => navigate(name ? `/?icon=${name}` : '/', { replace: true })

  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        search.current?.focus()
      } else if (e.key === 'Escape') {
        if (typing) document.activeElement.blur()
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
            {ICONS.length} line icons on a 24 grid, {withStates} of them with states, which makes {stateNames().length} more names (mic-off, user-plus, arrow-left, cloud-done).{' '}
            {attention ? `${attention} need${attention === 1 ? 's' : ''} attention at this style.` : 'All pass at this style.'}
          </p>
        </div>
        <label className="search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input ref={search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons" aria-label="Search icons" />
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
              <input type="range" min="16" max="64" step="4" value={snap.tile} onChange={(e) => api.setTileSize(+e.target.value)} aria-label="Icon size" />
            </label>
          </div>

          {shown.length ? (
            <ul className="grid" style={{ '--tile': `${snap.tile}px` }}>
              {shown.map((i) => (
                <li key={i.name}>
                  <button
                    type="button"
                    className="tile"
                    aria-pressed={selected === i.name}
                    data-status={status[i.name]}
                    onClick={() => select(selected === i.name ? null : i.name)}
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
          {selected && ICONS.some((i) => i.name === selected) && <Detail key={selected} name={selected} status={status[selected]} onClose={() => select(null)} />}
          <section>
            <h2>Appearance</h2>
            <Appearance style={snap.style} />
          </section>
        </aside>
      </div>
    </div>
  )
}

function Detail({ name, status, onClose }) {
  const [copied, copy] = useCopy()
  const [state, setState] = useState('')
  const states = POSES[name]?.states ?? []
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
      <div className="detail-stage">
        <Glyph name={name} size={80} state={state} />
      </div>
      {states.length > 0 && (
        <div className="sc-seg" role="radiogroup" aria-label="State">
          {['', ...states].map((st) => (
            <label key={st || 'normal'}>
              <input type="radio" name={`state-${name}`} checked={state === st} onChange={() => setState(st)} />
              {st || 'normal'}
            </label>
          ))}
        </div>
      )}
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
        <Link to={`/studio/${name}`} className="btn primary">
          Open in Studio
        </Link>
        <button type="button" className="btn" onClick={() => copy(state ? renderIcon(`${name}-${state}`, DEFAULT_STYLE, { inline: true }) : file.svg)}>
          {copied ? 'Copied' : 'Copy SVG'}
        </button>
      </div>
    </section>
  )
}
