import { CHANNEL_VAR, channelsOf, DEFAULT_STYLE, POSES } from '@autosvg/core'
import { renderIcon } from '@autosvg/engine'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Glyph } from '../../components/Glyph.tsx'
import { cssVars } from '../../lib/css.ts'
import { LOOK_NAME, type PlayChannel, playOn } from './play.ts'

/** One vector: its motion, its states, its frames, and the data in its SVG. */
export function Player({ name, onStop }: { name: string; onStop?: (stop: number) => void }) {
  const spec = POSES[name]
  const own = channelsOf(name)
  const states = spec?.states ?? []
  const hasState = own.includes(2)
  const look = own.filter((k): k is 3 | 4 => k === 3 || k === 4)
  const [values, setValues] = useState<Record<PlayChannel, number>>({ 1: 0, 3: 0, 4: 0 })
  const [stop, setStop] = useState(0) // the state the vector is in, 0 for normal
  const [scrub, setScrub] = useState(false) // dragging the state slider: follow the hand, no transition
  const [repeat, setRepeat] = useState(false)
  const [playing, setPlayingState] = useState<PlayChannel[] | null>(null)
  const playingNow = useRef<PlayChannel[] | null>(null) // the same, for effects that must not re-run when it changes
  const stage = useRef<HTMLDivElement>(null)
  const running = useRef<Animation[]>([])

  const setPlaying = useCallback((channels: PlayChannel[] | null) => {
    playingNow.current = channels
    setPlayingState(channels)
  }, [])

  const stopPlaying = useCallback(() => {
    for (const a of running.current) a.cancel()
    running.current = []
    setPlaying(null)
  }, [setPlaying])
  useEffect(() => stopPlaying, [stopPlaying])

  const play = useCallback(
    (channels: PlayChannel[]) => {
      stopPlaying()
      if (!stage.current) return
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
        () => {
          // an animation that is cancelled (Stop, or another Play) is not an error
        },
      )
    },
    [repeat, setPlaying, stopPlaying],
  )
  // switching Repeat while something plays restarts it with the new setting
  useEffect(() => {
    if (playingNow.current) play(playingNow.current)
  }, [play])

  const vars = {
    ...cssVars({
      [CHANNEL_VAR[1]]: values[1],
      [CHANNEL_VAR[3]]: values[3],
      [CHANNEL_VAR[4]]: values[4],
      [CHANNEL_VAR[2]]: stop,
    }),
    transition: scrub ? 'none' : `${CHANNEL_VAR[2]} 700ms linear`, // entering and leaving a state is this number moving
  }
  const data = useMemo(() => {
    const svg = renderIcon(name, DEFAULT_STYLE, { inline: true })
    return svg
      .split('\n')
      .filter((l) => /data-c1=/.test(l))
      .map((l) =>
        l
          .trim()
          .replace(/ d="[^"]*"/, ' d="…"')
          .replace(/ (cx|cy|r|x|y|width|height|rx|ry|points|pathLength)="[^"]*"/g, ''),
      )
  }, [name])

  useEffect(() => onStop?.(Math.round(stop)), [stop, onStop])
  const untouched = stop === 0 && values[1] === 0 && values[3] === 0 && values[4] === 0
  const motion = own.includes(1)
  const label = (k: PlayChannel): string => (k === 1 ? (spec?.labels[0] ?? '') : LOOK_NAME[k])

  return (
    <div className="player">
      <div className="detail-stage tall carried-stage" ref={stage} style={vars}>
        <Glyph name={name} size={128} />
      </div>
      <div className="player-reset">
        <span />
        <button
          type="button"
          className="text-btn"
          disabled={untouched}
          onClick={() => {
            stopPlaying()
            setValues({ 1: 0, 3: 0, 4: 0 })
            setStop(0)
          }}
        >
          Reset
        </button>
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
                <input
                  type="radio"
                  name={`state-${name}`}
                  checked={Math.round(stop) === i}
                  onChange={() => {
                    setScrub(false)
                    setStop(i)
                  }}
                />
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
            <button
              type="button"
              className="btn small-btn"
              onClick={() => (playing?.[0] === 1 ? stopPlaying() : play([1]))}
            >
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
            <button
              type="button"
              className="btn small-btn"
              onClick={() => (playing?.[0] === k ? stopPlaying() : play([k]))}
            >
              {playing?.[0] === k ? 'Stop' : 'Play'}
            </button>
          </div>
        </div>
      ))}

      <details className="fold">
        <summary>Frames</summary>
        {motion && (
          <div className="film">
            <div className="film-head">
              <code>{CHANNEL_VAR[1]}</code>
              <span>{label(1)}</span>
            </div>
            <ul>
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <li key={v} style={cssVars({ [CHANNEL_VAR[1]]: v })}>
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
              {(states.length === 1
                ? [0, 0.25, 0.5, 0.75, 1]
                : Array.from({ length: states.length * 2 + 1 }, (_, i) => i / 2)
              ).map((v) => (
                <li key={v} style={cssVars({ [CHANNEL_VAR[2]]: v })}>
                  <Glyph name={name} size={40} />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <details className="fold">
        <summary>
          In the SVG{' '}
          <span className="muted small">
            {data.length} moving {data.length === 1 ? 'part' : 'parts'}
          </span>
        </summary>
        <pre className="code">{data.join('\n') || '(none)'}</pre>
      </details>
    </div>
  )
}
