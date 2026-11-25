// Icons in real components. Each demo is ordinary React state plus CSS that drives the icon: a class, an attribute,
// :hover or :focus-visible. Nothing here animates an icon in JavaScript.
import { useEffect, useRef, useState } from 'react'
import { Glyph } from '../components/Glyph.jsx'
import { MorphIcon } from '../components/MorphIcon.jsx'

function Card({ title, note, driver, children }) {
  return (
    <article className="sc-card">
      <div>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
      <div className="sc-demo">{children}</div>
      <code className="sc-driver">{driver}</code>
    </article>
  )
}

function useTimeouts() {
  const ids = useRef([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return (fn, ms) => ids.current.push(setTimeout(fn, ms))
}

// ---------- two icons, one control ----------

function Mute() {
  const [muted, setMuted] = useState(false)
  return (
    <button type="button" className="sc-icon-btn" aria-label="Mute" aria-pressed={muted} onClick={() => setMuted(!muted)}>
      <Glyph name="volume" state={muted ? 'off' : ''} size={24} />
    </button>
  )
}

function PlayPause() {
  const [playing, setPlaying] = useState(false)
  return (
    <button type="button" className="sc-icon-btn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>
      <Glyph name="play" state={playing ? 'pause' : ''} size={24} />
    </button>
  )
}

function ShowPassword() {
  const [shown, setShown] = useState(false)
  return (
    <div className="sc-field">
      <input type={shown ? 'text' : 'password'} defaultValue="correct horse" aria-label="Password" />
      <button type="button" className="sc-icon-btn" aria-label="Show password" aria-pressed={shown} onClick={() => setShown(!shown)}>
        <Glyph name="eye" state={shown ? 'off' : ''} size={24} />
      </button>
    </div>
  )
}

/** The same icon in two states: mic, camera, bell and Wi-Fi each have an off state, so there is no mic-off file to ship. */
function Off() {
  const items = [
    ['mic', 'Microphone'],
    ['video', 'Camera'],
    ['bell', 'Notifications'],
    ['wifi', 'Wi-Fi'],
    ['bluetooth', 'Bluetooth'],
  ]
  const [off, setOff] = useState({})
  return items.map(([icon, label]) => (
    <button
      key={icon}
      type="button"
      className="sc-icon-btn"
      aria-label={`Turn ${label.toLowerCase()} off`}
      aria-pressed={!!off[icon]}
      onClick={() => setOff({ ...off, [icon]: !off[icon] })}
    >
      <Glyph name={icon} state={off[icon] ? 'off' : ''} size={24} />
    </button>
  ))
}

function Theme() {
  const [dark, setDark] = useState(false)
  return (
    <>
      <button type="button" className="sc-icon-btn" aria-label="Dark mode" aria-pressed={dark} onClick={() => setDark(!dark)}>
        <MorphIcon from="sun" to="moon" on={dark} />
      </button>
      <span className="sc-swatch" data-dark={dark}>
        <Glyph name={dark ? 'moon' : 'sun'} size={24} />
      </span>
    </>
  )
}

/** Any icon into any other: the icon alternates between two slots, so a change is always a transition from what is on screen. */
const MORPH_PICKS = ['sun', 'moon', 'heart', 'star', 'bell', 'home', 'search', 'close', 'plus', 'check', 'menu', 'user', 'mail', 'camera', 'cloud', 'lock']
function MorphAny() {
  const [s, setS] = useState({ a: 'sun', b: 'moon', on: false })
  const shown = s.on ? s.b : s.a
  const go = (name) => setS(s.on ? { ...s, a: name, on: false } : { ...s, b: name, on: true })
  return (
    <>
      <div className="sc-morph-stage" role="img" aria-label={`Showing ${shown}`}>
        <MorphIcon from={s.a} to={s.b} on={s.on} size={64} />
      </div>
      <div className="sc-morph-picks" role="group" aria-label="Turn the icon into">
        {MORPH_PICKS.map((name) => (
          <button key={name} type="button" className="sc-icon-btn" aria-label={name} aria-pressed={shown === name} onClick={() => go(name)}>
            <Glyph name={name} size={20} />
          </button>
        ))}
      </div>
    </>
  )
}

function Copy() {
  const [copied, setCopied] = useState(false)
  const later = useTimeouts()
  return (
    <>
      <button
        type="button"
        className="sc-btn"
        onClick={() => {
          setCopied(true)
          later(() => setCopied(false), 1800)
        }}
      >
        <Glyph name="copy" state={copied ? 'done' : ''} size={20} />
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <span className="sc-status" role="status">{copied ? 'Link copied to the clipboard' : ''}</span>
    </>
  )
}

// ---------- icons that act ----------

function Menu() {
  const [open, setOpen] = useState(false)
  return (
    <button type="button" className="sc-icon-btn sc-state" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <Glyph name="menu" size={24} />
    </button>
  )
}

function Lock() {
  const [locked, setLocked] = useState(true)
  return (
    <>
      <button type="button" className="sc-btn sc-state" style={{ '--sc-dur': '700ms' }} aria-pressed={!locked} onClick={() => setLocked(!locked)}>
        <Glyph name="lock" size={20} />
        {locked ? 'Locked' : 'Unlocked'}
      </button>
    </>
  )
}

/** A settings list: the switch and the checkbox are the real roles, and aria-checked is the only thing that moves the icon. */
function Settings() {
  const [sync, setSync] = useState(true)
  const [quiet, setQuiet] = useState(false)
  const [all, setAll] = useState('mixed')
  return (
    <ul className="sc-settings">
      <li>
        <span id="sc-set-sync">Sync over Wi-Fi</span>
        <button type="button" role="switch" className="sc-icon-btn sc-state" aria-labelledby="sc-set-sync" aria-checked={sync} onClick={() => setSync(!sync)}>
          <Glyph name="toggle" size={28} />
        </button>
      </li>
      <li>
        <span id="sc-set-quiet">Quiet hours</span>
        <button type="button" role="switch" className="sc-icon-btn sc-state" aria-labelledby="sc-set-quiet" aria-checked={quiet} onClick={() => setQuiet(!quiet)}>
          <Glyph name="toggle" size={28} />
        </button>
      </li>
      <li>
        <span id="sc-set-all">Select all</span>
        <button
          type="button"
          role="checkbox"
          className="sc-icon-btn sc-state"
          aria-labelledby="sc-set-all"
          aria-checked={all}
          onClick={() => setAll(all === 'mixed' ? 'true' : all === 'true' ? 'false' : 'mixed')}
        >
          <Glyph name="checkbox" size={24} />
        </button>
      </li>
    </ul>
  )
}

/** A radio group: one icon, the ring, and the stop it moves to is the dot. Arrow keys move the choice, as for a native group. */
function Radios() {
  const options = ['Daily', 'Weekly', 'Monthly']
  const [value, setValue] = useState('Weekly')
  const move = (e, i) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = options[(i + step + options.length) % options.length]
    setValue(next)
    e.currentTarget.parentElement.querySelector(`[data-v="${next}"]`)?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Digest frequency" className="sc-settings">
      {options.map((o, i) => (
        <div key={o} className="sc-radio-row">
          <button
            type="button"
            role="radio"
            data-v={o}
            className="sc-icon-btn sc-state sc-radio"
            aria-checked={value === o}
            tabIndex={value === o ? 0 : -1}
            onClick={() => setValue(o)}
            onKeyDown={(e) => move(e, i)}
          >
            <Glyph name="radio" size={24} />
            <span className="sc-radio-label">{o}</span>
          </button>
        </div>
      ))}
    </div>
  )
}

/** A message composer: attach presses on hover, the microphone listens while it records, send flies once. */
function Composer() {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [sent, setSent] = useState([])
  const [flying, setFlying] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSent([text.trim(), ...sent].slice(0, 2))
    setText('')
    setFlying(true)
  }
  return (
    <div className="sc-composer-wrap">
      <form className="sc-composer" onSubmit={submit}>
        <button type="button" className="sc-icon-btn sc-hover" aria-label="Attach a file">
          <Glyph name="paperclip" size={20} />
        </button>
        <input aria-label="Message" placeholder="Message" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" className="sc-icon-btn" aria-label="Record a voice message" aria-pressed={recording} onClick={() => setRecording(!recording)}>
          <span className={recording ? 'sc-loop' : ''} style={{ display: 'inline-grid', '--sc-dur': '1400ms' }}>
            <Glyph name="mic" size={20} />
          </span>
        </button>
        <button type="submit" className="sc-icon-btn" aria-label="Send message">
          <span className={flying ? 'sc-once' : ''} style={{ display: 'inline-grid', '--sc-dur': '900ms' }} onAnimationEnd={() => setFlying(false)}>
            <Glyph name="send" size={20} />
          </span>
        </button>
      </form>
      <ul className="sc-sent" aria-live="polite" aria-label="Sent messages">
        {sent.map((m, i) => (
          <li key={`${i}-${m}`}>{m}</li>
        ))}
      </ul>
    </div>
  )
}

/** Thumbs up and down are one icon, flipped; each press plays the gesture once and the pressed one is announced to assistive technology. */
function Vote() {
  const [vote, setVote] = useState(null)
  const [played, setPlayed] = useState(null)
  const choose = (v) => {
    setVote(vote === v ? null : v)
    setPlayed(v)
  }
  return (
    <div role="group" aria-label="Was this helpful?" className="sc-vote">
      {[['up', 'Helpful', ''], ['down', 'Not helpful', 'down']].map(([v, label, state]) => (
        <button key={v} type="button" className="sc-btn" aria-pressed={vote === v} onClick={() => choose(v)}>
          <span className={played === v ? 'sc-once' : ''} style={{ display: 'inline-grid', '--sc-dur': '700ms' }} onAnimationEnd={() => setPlayed(null)}>
            <Glyph name="thumbs-up" state={state} size={20} />
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

function Heart() {
  const [liked, setLiked] = useState(false)
  const [beat, setBeat] = useState(false)
  return (
    <button
      type="button"
      className={`sc-btn ${beat ? 'sc-once' : ''}`}
      style={{ '--sc-dur': '700ms' }}
      aria-pressed={liked}
      onClick={() => {
        setLiked(!liked)
        if (!liked) setBeat(true)
      }}
      onAnimationEnd={() => setBeat(false)}
    >
      <Glyph name="heart" size={20} />
      {liked ? 'Liked' : 'Like'}
    </button>
  )
}

function Notify() {
  const [count, setCount] = useState(0)
  const [ring, setRing] = useState(false)
  return (
    <>
      <span className={ring ? 'sc-once' : ''} style={{ display: 'inline-grid', '--sc-dur': '1200ms' }} onAnimationEnd={() => setRing(false)}>
        <Glyph name="bell" size={28} />
      </span>
      <span className="sc-badge" aria-live="polite" aria-label={`${count} new messages`}>{count}</span>
      <button
        type="button"
        className="sc-btn"
        onClick={() => {
          setCount(count + 1)
          setRing(true)
        }}
      >
        New message
      </button>
    </>
  )
}

function Delete() {
  return (
    <button type="button" className="sc-btn sc-state-hover" style={{ '--sc-dur': '420ms' }}>
      <Glyph name="trash" size={20} />
      Delete
    </button>
  )
}

function Tabs() {
  const tabs = [
    ['home', 'Home'],
    ['search', 'Search'],
    ['bell', 'Alerts'],
    ['user', 'Profile'],
  ]
  const [current, setCurrent] = useState('home')
  return (
    <nav className="sc-tabs" aria-label="Example tabs">
      {tabs.map(([icon, label]) => (
        <button key={icon} type="button" className="sc-tab sc-hover" aria-current={current === icon ? 'page' : undefined} onClick={() => setCurrent(icon)}>
          <Glyph name={icon} size={24} />
          {label}
        </button>
      ))}
    </nav>
  )
}

// ---------- status ----------

function Wifi() {
  const [status, setStatus] = useState('connecting')
  // two independent things: connecting is the icon's motion (looped), weak and off are its states
  const state = status === 'weak' || status === 'off' ? status : ''
  return (
    <>
      <span
        className={status === 'connecting' ? 'sc-loop' : ''}
        style={{ display: 'inline-grid', '--sc-dur': '1800ms' }}
        role="img"
        aria-label={`Wi-Fi ${status}`}
      >
        <Glyph name="wifi" state={state} size={32} />
      </span>
      <div className="sc-seg" role="radiogroup" aria-label="Connection state">
        {['connecting', 'connected', 'weak', 'off'].map((s) => (
          <label key={s}>
            <input type="radio" name="wifi" checked={status === s} onChange={() => setStatus(s)} />
            {s}
          </label>
        ))}
      </div>
    </>
  )
}

function Download() {
  const [state, setState] = useState('idle')
  const later = useTimeouts()
  const start = () => {
    if (state !== 'idle') return
    setState('loading')
    later(() => setState('done'), 2400)
    later(() => setState('idle'), 4200)
  }
  return (
    <>
      <button type="button" className="sc-btn" onClick={start} aria-disabled={state !== 'idle'}>
        <span className={state === 'loading' ? 'sc-loop' : ''} style={{ display: 'inline-grid', '--sc-dur': '1100ms' }}>
          <Glyph name="download" state={state === 'done' ? 'done' : ''} size={20} />
        </span>
        {state === 'idle' ? 'Download' : state === 'loading' ? 'Downloading' : 'Saved'}
      </button>
      <span className="sc-status" role="status">{state === 'loading' ? 'Downloading…' : state === 'done' ? 'Download complete' : ''}</span>
    </>
  )
}

/** A state is a number, so choosing between several is one control, and the icon passes through the ones in between. */
function StatePicker({ icon, states, size = 40 }) {
  const [state, setState] = useState('')
  const id = `sc-${icon}`
  return (
    <>
      <Glyph name={icon} state={state} size={size} />
      <div className="sc-seg" role="radiogroup" aria-label={`${icon} state`}>
        {['', ...states].map((st) => (
          <label key={st || 'normal'}>
            <input type="radio" name={id} checked={state === st} onChange={() => setState(st)} />
            {st || 'normal'}
          </label>
        ))}
      </div>
    </>
  )
}

/** One arrow icon turning to point another way: a direction is a state, not another icon. */
function Direction() {
  const dirs = [
    ['right', ''],
    ['down', 'down'],
    ['left', 'left'],
    ['up', 'up'],
    ['up right', 'up-right'],
  ]
  const [state, setState] = useState('')
  return (
    <>
      <Glyph name="arrow" state={state} size={40} />
      <div className="sc-seg" role="radiogroup" aria-label="Arrow direction">
        {dirs.map(([label, st]) => (
          <label key={label}>
            <input type="radio" name="sc-arrow" checked={state === st} onChange={() => setState(st)} />
            {label}
          </label>
        ))}
      </div>
    </>
  )
}

/** Four alignment buttons that are one icon in four states: align-left, align-center, align-right and align-justify are names, not files. */
function Align() {
  const options = ['left', 'center', 'right', 'justify']
  const [align, setAlign] = useState('left')
  return (
    <>
      <div className="sc-toolbar" role="toolbar" aria-label="Text alignment">
        {options.map((o) => (
          <button key={o} type="button" className="sc-icon-btn" aria-label={`Align ${o}`} aria-pressed={align === o} onClick={() => setAlign(o)}>
            <Glyph name={`align-${o}`} size={20} />
          </button>
        ))}
      </div>
      <p className="sc-sample" style={{ textAlign: align }}>
        One icon, four alignments. The lines move to the middle, to the right, and stretch to the full width.
      </p>
    </>
  )
}

/** The eyes look where the pointer is. The library ships the two numbers; this consumer decides when they change. */
function Eyes() {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) / 160
    const dy = (e.clientY - (r.top + r.height / 2)) / 160
    const clamp = (v) => Math.max(-1, Math.min(1, v))
    ref.current.style.setProperty('--icon-look-x', clamp(dx))
    ref.current.style.setProperty('--icon-look-y', clamp(dy))
  }
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    addEventListener('pointermove', move)
    return () => removeEventListener('pointermove', move)
  }, [])
  return (
    <span ref={ref} className="sc-eyes" role="img" aria-label="An eye that follows the pointer">
      <Glyph name="eye" size={56} />
      <Glyph name="eye" size={56} />
    </span>
  )
}

/** A scroll position drives an icon: no JavaScript, one animation tied to a scroll timeline. */
function ScrollDriven() {
  return (
    <div className="sc-scroller" tabIndex={0} role="region" aria-label="Scroll this box: the bell rings as you scroll">
      <span className="sc-pin" aria-hidden="true">
        <Glyph name="bell" size={32} />
      </span>
      <div className="sc-long">
        <p>Scroll.</p>
        <p>The bell is driven by the position of this box, through a scroll timeline.</p>
        <p>No event handler, no state.</p>
        <p>Keep going.</p>
      </div>
    </div>
  )
}

/** A sortable column header: the sort icon is one icon, and the order is its state. */
function SortHeader() {
  const [asc, setAsc] = useState(false)
  const rows = ['Cloud', 'Bell', 'Arrow']
  const shown = asc ? [...rows].sort() : [...rows].sort().reverse()
  return (
    <div className="sc-table" role="table" aria-label="Icons by name">
      <div role="row">
        <div role="columnheader" aria-sort={asc ? 'ascending' : 'descending'}>
          <button type="button" className="sc-btn sc-btn-quiet" onClick={() => setAsc(!asc)} aria-label={`Name, sorted ${asc ? 'ascending' : 'descending'}. Change the order`}>
            Name
            <Glyph name="sort" state={asc ? 'asc' : ''} size={18} />
          </button>
        </div>
      </div>
      {shown.map((r) => (
        <div role="row" key={r}>
          <div role="cell">{r}</div>
        </div>
      ))}
    </div>
  )
}

function Charging() {
  const [on, setOn] = useState(false)
  return (
    <button type="button" className="sc-btn" aria-pressed={on} onClick={() => setOn(!on)}>
      <span className={on ? 'sc-loop' : ''} style={{ display: 'inline-grid', '--sc-dur': '1600ms' }}>
        <Glyph name="battery" size={24} />
      </span>
      {on ? 'Charging' : 'Charge'}
    </button>
  )
}

export default function Showcase() {
  return (
    <div className="page showcase">
      <div className="page-head">
        <div>
          <h1>Showcase</h1>
          <p className="lede">
            Icons inside real components. Each one is plain markup with a little CSS that sets numbers: <code>--icon-motion</code> to play an
            icon’s gesture, <code>--icon-state</code> to put it in one of its states, or <code>--icon-swap</code> to turn one icon into another. No icon is animated in JavaScript, and everything
            stands still under <em>reduced motion</em>.
          </p>
        </div>
      </div>

      <section className="sc-section">
        <h2>One control, two states</h2>
        <p>Many icons have an off state, so a slash is drawn across the same icon: nothing fades and nothing is swapped. Only icons that really differ, such as a sun and a moon, turn into one another. The button carries the label and the state, so screen readers hear one control.</p>
        <div className="sc-grid">
          <Card title="Mute" note="The speaker has an off state: the arcs go and a cross is drawn." driver="<icon-glyph name=&quot;volume&quot; state=&quot;off&quot;>"><Mute /></Card>
          <Card title="Play and pause" note="The triangle is drawn off while two bars are drawn on." driver="state=&quot;pause&quot;"><PlayPause /></Card>
          <Card title="Show password" note="One icon: the slash is drawn on, nothing fades." driver="state=&quot;off&quot;"><ShowPassword /></Card>
          <Card title="Off states" note="Microphone, camera, bell, Wi-Fi and Bluetooth are one icon each. No second icon ships." driver="<icon-glyph name=&quot;mic&quot; state=&quot;off&quot;>"><Off /></Card>
          <Card title="Theme" note="The sun becomes the moon: the disc turns into the crescent, the rays shrink away." driver="<icon-morph from=&quot;sun&quot; to=&quot;moon&quot;>"><Theme /></Card>
          <Card title="Copy" note="A check is drawn inside the page, then it returns." driver="state=&quot;done&quot; + role=status"><Copy /></Card>
        </div>
      </section>

      <section className="sc-section">
        <h2>One icon into another</h2>
        <p>For icons that really differ. Every stroke of the first moves into a stroke of the second; a stroke with nothing to become shrinks and fades. It works for any two icons, with nothing drawn by hand for a pair. Which icon shows is one number, <code>--icon-morph</code> (0 or 1), and a CSS transition does the moving.</p>
        <div className="sc-grid">
          <Card title="Any into any" note="Pick one: the icon above turns into it, from whatever it is now." driver="<icon-morph from=&quot;sun&quot; to=&quot;moon&quot; state=&quot;to&quot;>"><MorphAny /></Card>
        </div>
      </section>

      <section className="sc-section">
        <h2>Icons that act</h2>
        <p>The icon’s own choreography, played by a pseudo-class, an attribute or a one-shot animation. Hold states (the menu becoming a cross, a lock opening) stay put; the rest play and settle.</p>
        <div className="sc-grid">
          <Card title="Volume" note="A level, not two icons: low drops the outer arc, off drops the rest and draws a cross." driver="--icon-state: 1 low · 2 off"><StatePicker icon="volume" states={['low', 'off']} /></Card>
          <Card title="Text alignment" note="Four buttons, one icon: the short lines move to the middle, to the right, and stretch." driver="align-left · align-center · align-right · align-justify"><Align /></Card>
          <Card title="Menu" note="Three lines become a cross." driver="[aria-expanded=true] { --icon-state: 1 }"><Menu /></Card>
          <Card title="Lock" note="The shackle clicks up and swings open." driver="[aria-pressed=true] { --icon-state: 1 }"><Lock /></Card>
          <Card title="Like" note="The heart beats when you like it." driver="animation: sc-pose 700ms linear"><Heart /></Card>
          <Card title="Notification" note="The bell rings, the clapper late." driver=".sc-once { animation: sc-pose 1.2s }"><Notify /></Card>
          <Card title="Delete" note="The lid lifts on hover and focus." driver=":hover { --icon-state: 1 }"><Delete /></Card>
          <Card title="Tab bar" note="Each tab plays its own gesture on hover." driver=".sc-hover:hover { --icon-motion: 1 }"><Tabs /></Card>
        </div>
      </section>

      <section className="sc-section">
        <h2>States that bring something in</h2>
        <p>A state can introduce elements that are not there by default: a dot on a bell, rays on a bulb, a check inside a cloud. They are in the SVG, invisible, and drawn or popped in when the state arrives, and sent away when the next one takes over. And the direction of an arrow is a state too, so the set ships one arrow, not five.</p>
        <div className="sc-grid">
          <Card title="Cloud" note="Four states, each with its own accessory." driver="--icon-state: 1 upload · 2 download · 3 done · 4 off"><StatePicker icon="cloud" states={['upload', 'download', 'done', 'off']} /></Card>
          <Card title="Bell" note="A dot pops in; off draws a slash and sends the dot away." driver="--icon-state: 1 unread · 2 off"><StatePicker icon="bell" states={['unread', 'off']} /></Card>
          <Card title="Light bulb" note="Rays reach out one after another." driver="state=&quot;on&quot;"><StatePicker icon="lightbulb" states={['on']} /></Card>
          <Card title="Arrow" note="One icon, five directions, turned a quarter per stop." driver="--icon-state: 0 right · 1 down · 2 left · 3 up · 4 up-right"><Direction /></Card>
          <Card title="Battery" note="Charging brings in a bolt; empty takes it away." driver="--icon-state: 1 charging · 2 empty"><StatePicker icon="battery" states={['charging', 'empty']} /></Card>
          <Card title="Look" note="Two numbers, set by the consumer from the pointer." driver="--icon-look-x: -1 .. 1 · --icon-look-y: -1 .. 1"><Eyes /></Card>
          <Card title="Scroll" note="A scroll timeline plays the icon&apos;s motion, in CSS only." driver="animation-timeline: scroll(); animation: sc-pose linear"><ScrollDriven /></Card>
          <Card title="Sort" note="Descending is the normal look; ascending shortens the first bar and stretches the last." driver="--icon-state: 1 asc · sort-desc · sort-asc"><SortHeader /></Card>
          <Card title="Menu" note="Three lines become a cross, then a back arrow: the cross is erased and a head drawn on." driver="--icon-state: 1 open · 2 back"><StatePicker icon="menu" states={['open', 'back']} /></Card>
          <Card title="User" note="The person makes room, then a mark is drawn in beside them." driver="--icon-state: 1 plus · 2 minus · 3 check · 4 x"><StatePicker icon="user" states={['plus', 'minus', 'check', 'x']} /></Card>
          <Card title="Folder" note="The same four marks, drawn inside." driver="folder-plus · folder-minus · folder-check · folder-x"><StatePicker icon="folder" states={['plus', 'minus', 'check', 'x']} /></Card>
          <Card title="Zoom" note="The vertical bar of the plus is drawn off." driver="state=&quot;out&quot;"><StatePicker icon="zoom" states={['out']} /></Card>
          <Card title="Switch and checkbox" note="The icon follows aria-checked: the knob slides, the check is drawn, a bar for mixed." driver="[aria-checked=true] { --icon-state: 1 } · [aria-checked=mixed] { --icon-state: 2 }"><Settings /></Card>
          <Card title="Clipboard" note="The lines are drawn off and a tick drawn on: a checked list." driver="clipboard-check · --icon-state: 1"><StatePicker icon="clipboard" states={['checked']} /></Card>
          <Card title="Plus and minus" note="One icon: the vertical bar is drawn off." driver="minus · --icon-state: 1"><StatePicker icon="plus" states={['minus']} /></Card>
          <Card title="Maximize" note="The heads are drawn off and on at the other ends: arrows out, arrows in." driver="minimize · --icon-state: 1"><StatePicker icon="maximize" states={['in']} /></Card>
          <Card title="Pin" note="Pinned items press the pin in; unpinning draws the slash." driver="pin-off · unpin · --icon-state: 1"><StatePicker icon="pin" states={['off']} /></Card>
          <Card title="Radio group" note="One icon, the ring takes a dot." driver="[role=radio][aria-checked=true] { --icon-state: 1 }"><Radios /></Card>
          <Card title="Composer" note="Attach presses on hover, the microphone listens while it records, send flies once." driver=".sc-hover:hover · .sc-loop · .sc-once { --icon-motion }"><Composer /></Card>
          <Card title="Vote" note="Thumbs up and thumbs down are one icon, flipped." driver="thumbs-down · state=&quot;down&quot;"><Vote /></Card>
          <Card title="Call" note="The handset turns over and lies flat: answering and hanging up are one icon." driver="phone-end · --icon-state: 1"><StatePicker icon="phone" states={['end']} /></Card>
        </div>
      </section>

      <section className="sc-section">
        <h2>Status</h2>
        <p>Looping a gesture says that something is happening. Channel 2 carries an alternate state, such as a weak signal.</p>
        <div className="sc-grid">
          <Card title="Wi-Fi" note="Connecting loops the motion; weak and off are states of the same icon." driver="--icon-motion: loop · --icon-state: 1 (weak) or 2 (off)"><Wifi /></Card>
          <Card title="Download" note="The arrow keeps dropping in; done draws the arrow off and a check on." driver="--icon-motion: loop · state=&quot;done&quot;"><Download /></Card>
          <Card title="Charging" note="The cells fill in turn." driver=".sc-loop { animation-iteration-count: infinite }"><Charging /></Card>
        </div>
      </section>
    </div>
  )
}
