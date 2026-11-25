// Motion test bench. This is CONSUMER code: it only sets --icon-motion, --icon-state and --icon-look-x/y on a container
// and animates them. Every icon carries its own choreography in its SVG; nothing here knows how any icon moves.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ICONS, renderIcon } from '../engine.js'
import { POSES, CHANNEL_VAR, channelsOf } from '../poses.js'
import { DEFAULT_STYLE } from '../spec.js'
import { Glyph } from '../components/Glyph.jsx'

// Looking around (channels 3 and 4) is driven with a real damped spring (15% overshoot, settles).
const SPRING =
  'linear(0, 0.037, 0.131, 0.262, 0.41, 0.562, 0.705, 0.832, 0.939, 1.022, 1.082, 1.122, 1.142, 1.148, 1.141, 1.127, 1.107, 1.085, 1.063, 1.042, 1.023, 1.008, 0.996, 0.987, 0.982, 0.979, 0.978, 0.979, 0.981, 0.984, 0.988, 0.991, 1)'

// One play of a momentary channel: up over most of the time, then back. [value, offset] pairs, offsets 0 to 1.
const PLAY = {
  1: { ms: 2200, keys: [[0, 0], [1, 0.75], [0, 1]] },
  3: { ms: 2000, keys: [[0, 0], [1, 0.25], [-1, 0.65], [0, 1]], ease: SPRING },
  4: { ms: 2000, keys: [[0, 0], [1, 0.25], [-1, 0.65], [0, 1]], ease: SPRING },
}
const LOOK_NAME = { 3: 'Look x', 4: 'Look y' }

/** Animate the numbers of some channels on one element, one after the other, optionally forever. Returns the animations. */
function playOn(node, channels, repeat) {
  const total = channels.reduce((sum, k) => sum + PLAY[k].ms, 0)
  let start = 0
  return channels.map((k) => {
    const { ms, keys, ease } = PLAY[k]
    const a = start / total
    const b = (start + ms) / total
    start += ms
    // this channel is at rest outside its slot, so channels can run back to back inside one cycle
    const points = [[0, 0], ...keys.map(([v, o]) => [v, a + o * (b - a)]), [0, 1]].filter((p, i, all) => i === 0 || p[1] > all[i - 1][1] || p[1] === 1)
    const frames = points.map(([v, offset], i) => ({
      [CHANNEL_VAR[k]]: v,
      offset,
      ...(ease && i > 0 && i < points.length - 1 && points[i][1] >= a && points[i][1] < b ? { easing: ease } : {}),
    }))
    return node.animate(frames, { duration: total, easing: 'linear', iterations: repeat ? Infinity : 1 })
  })
}

export default function Motion() {
  const [selected, setSelected] = useState('bell')
  return (
    <div className="page motion">
      <div className="page-head">
        <div>
          <h1>Motion</h1>
          <p className="lede">
            Every icon carries its own choreography as data in its SVG: which part moves, when, and how. A consumer only sets numbers:
            <code>--icon-motion</code> for a momentary gesture, <code>--icon-state</code> for the state the icon is in, and <code>--icon-look-x</code> / <code>-y</code> for eyes. Pick an icon and try them.
          </p>
        </div>
      </div>

      <div className="motion-body">
        <ul className="grid dense">
          {ICONS.map((i) => (
            <li key={i.name}>
              <button
                type="button"
                className="tile"
                aria-pressed={selected === i.name}
                onClick={() => setSelected(i.name)}
                title={POSES[i.name]?.labels.filter(Boolean).join(', ')}
              >
                <Glyph name={i.name} size={32} />
                <span className="tile-name">{i.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <aside className="rail">
          <Player key={selected} name={selected} />
        </aside>
      </div>
    </div>
  )
}

/** One icon: its motion, its states, its frames, and the data in its SVG. */
function Player({ name }) {
  const spec = POSES[name]
  const own = channelsOf(name)
  const states = spec.states ?? []
  const hasState = own.includes(2)
  const look = own.filter((k) => k >= 3)
  const [values, setValues] = useState({ 1: 0, 3: 0, 4: 0 })
  const [stop, setStop] = useState(0) // the state the icon is in, 0 for normal
  const [scrub, setScrub] = useState(false) // dragging the state slider: follow the hand, no transition
  const [repeat, setRepeat] = useState(false)
  const [playing, setPlaying] = useState(null)
  const stage = useRef(null)
  const running = useRef([])

  const stopPlaying = () => {
    running.current.forEach((a) => a.cancel())
    running.current = []
    setPlaying(null)
  }
  useEffect(() => stopPlaying, []) // eslint-disable-line react-hooks/exhaustive-deps

  function play(channels) {
    stopPlaying()
    const anims = playOn(stage.current, channels, repeat)
    running.current = anims
    setPlaying(channels)
    Promise.all(anims.map((a) => a.finished)).then(
      () => {
        if (running.current === anims) {
          running.current = []
          setPlaying(null)
        }
      },
      () => {},
    )
  }
  useEffect(() => {
    if (playing) play(playing)
  }, [repeat]) // eslint-disable-line react-hooks/exhaustive-deps

  const vars = {
    [CHANNEL_VAR[1]]: values[1],
    [CHANNEL_VAR[3]]: values[3],
    [CHANNEL_VAR[4]]: values[4],
    [CHANNEL_VAR[2]]: stop,
    transition: scrub ? 'none' : `${CHANNEL_VAR[2]} 700ms linear`, // entering and leaving a state is this number moving
  }
  const data = useMemo(() => {
    const svg = renderIcon(name, DEFAULT_STYLE, { inline: true })
    return svg
      .split('\n')
      .filter((l) => /data-c1=/.test(l))
      .map((l) => l.trim().replace(/ d="[^"]*"/, ' d="…"').replace(/ (cx|cy|r|x|y|width|height|rx|ry|points|pathLength)="[^"]*"/g, ''))
  }, [name])

  const motion = own.includes(1)
  const label = (k) => (k === 1 ? spec.labels[0] : LOOK_NAME[k])

  return (
    <section className="detail player">
      <div className="detail-head">
        <h2>{name}</h2>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            stopPlaying()
            setValues({ 1: 0, 3: 0, 4: 0 })
            setStop(0)
          }}
        >
          Reset
        </button>
      </div>

      <div className="detail-stage tall" ref={stage} style={vars}>
        <Glyph name={name} size={128} />
      </div>

      {hasState && (
        <div className="channel">
          <div className="channel-head">
            <code>{CHANNEL_VAR[2]}</code>
            <output>{stop.toFixed(2)}</output>
          </div>
          <div className="sc-seg" role="radiogroup" aria-label="State">
            {['normal', ...states].map((st, i) => (
              <label key={st}>
                <input type="radio" name={`state-${name}`} checked={Math.round(stop) === i} onChange={() => { setScrub(false); setStop(i) }} />
                {st}
              </label>
            ))}
          </div>
          <input
            type="range"
            min="0"
            max={states.length}
            step="0.01"
            value={stop}
            aria-label="State, scrub between states"
            onPointerDown={() => setScrub(true)}
            onChange={(e) => setStop(+e.target.value)}
            onPointerUp={() => setScrub(false)}
          />
        </div>
      )}

      {motion && (
        <div className="channel">
          <div className="channel-head">
            <span>
              <code>{CHANNEL_VAR[1]}</code> <span className="muted">{label(1)}</span>
            </span>
            <output>{values[1].toFixed(2)}</output>
          </div>
          <div className="channel-row">
            <input
              type="range"
              min="0"
              max="1.25"
              step="0.01"
              value={values[1]}
              aria-label={`Motion (${label(1)})`}
              onChange={(e) => {
                stopPlaying()
                setValues({ ...values, 1: +e.target.value })
              }}
            />
            <button type="button" className="btn small-btn" onClick={() => (playing?.[0] === 1 ? stopPlaying() : play([1]))}>
              {playing?.[0] === 1 ? 'Stop' : 'Play'}
            </button>
          </div>
          <label className="check">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            Repeat
          </label>
        </div>
      )}

      {look.map((k) => (
        <div className="channel" key={k}>
          <div className="channel-head">
            <code>{CHANNEL_VAR[k]}</code>
            <output>{values[k].toFixed(2)}</output>
          </div>
          <div className="channel-row">
            <input
              type="range"
              min="-1.25"
              max="1.25"
              step="0.01"
              value={values[k]}
              aria-label={LOOK_NAME[k]}
              onChange={(e) => {
                stopPlaying()
                setValues({ ...values, [k]: +e.target.value })
              }}
            />
            <button type="button" className="btn small-btn" onClick={() => (playing?.[0] === k ? stopPlaying() : play([k]))}>
              {playing?.[0] === k ? 'Stop' : 'Play'}
            </button>
          </div>
        </div>
      ))}

      {motion && (
        <div className="film">
          <div className="film-head">
            <code>{CHANNEL_VAR[1]}</code>
            <span>{label(1)}</span>
          </div>
          <ul>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <li key={v} style={{ [CHANNEL_VAR[1]]: v }}>
                <Glyph name={name} size={40} />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasState && (
        <div className="film">
          <div className="film-head">
            <code>{CHANNEL_VAR[2]}</code>
            <span>{states.join(', ')}</span>
          </div>
          <ul>
            {(states.length === 1 ? [0, 0.25, 0.5, 0.75, 1] : Array.from({ length: states.length * 2 + 1 }, (_, i) => i / 2)).map((v) => (
              <li key={v} style={{ [CHANNEL_VAR[2]]: v }}>
                <Glyph name={name} size={40} />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>
        In the SVG <span className="muted small">{data.length} moving {data.length === 1 ? 'part' : 'parts'}</span>
      </h3>
      <pre className="code">{data.join('\n') || '(none)'}</pre>
    </section>
  )
}
