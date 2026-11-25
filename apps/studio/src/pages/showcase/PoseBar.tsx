import { CHANNEL_VAR, channelsOf, POSES } from '@autosvg/core'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { playOn } from '../motion/play.ts'

interface Props {
  vector: string
  /** The element the numbers go on: everything inside it (the 3D view and every tile) follows. */
  target: RefObject<HTMLElement | null>
  /** Tells the 3D view that a pose has changed, and whether a motion is playing. */
  onPose: (playing: boolean) => void
}

/**
 * The carried vector's states and its motion, as buttons. They set `--autosvg-state` and `--autosvg-motion` on `target`, which is all an
 * vector needs: the 2D tiles follow by themselves, and the 3D view reads the same numbers from a copy of the vector.
 */
export function PoseBar({ vector, target, onPose }: Props) {
  const states = POSES[vector]?.states ?? []
  const label = POSES[vector]?.labels[0] || 'motion'
  const hasMotion = channelsOf(vector).includes(1)
  const [stop, setStop] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const [playing, setPlaying] = useState(false)
  const running = useRef<Animation[]>([])

  const halt = useCallback(() => {
    for (const a of running.current) a.cancel()
    running.current = []
    setPlaying(false)
  }, [])

  // a new vector starts at rest
  // biome-ignore lint/correctness/useExhaustiveDependencies: `vector` is the trigger: the effect resets the pose when it changes
  useEffect(() => {
    halt()
    setStop(0)
    const node = target.current
    if (node) {
      // at once, not by the usual glide: the new vector must not show the old vector's state for a moment
      node.style.transition = 'none'
      node.style.setProperty(CHANNEL_VAR[2], '0')
      node.getBoundingClientRect()
      node.style.transition = ''
    }
    onPose(false)
  }, [vector, halt, target, onPose])
  // and leaving the page takes the numbers off it
  useEffect(
    () => () => {
      halt()
      target.current?.style.removeProperty(CHANNEL_VAR[2])
    },
    [halt, target],
  )

  const pick = (i: number) => {
    setStop(i)
    target.current?.style.setProperty(CHANNEL_VAR[2], String(i))
    onPose(running.current.length > 0)
  }

  const toggle = () => {
    if (playing) {
      halt()
      onPose(false)
      return
    }
    const node = target.current
    if (!node) return
    const anims = playOn(node, [1], repeat)
    running.current = anims
    setPlaying(true)
    onPose(true)
    Promise.all(anims.map((a) => a.finished)).then(
      () => {
        if (running.current === anims) {
          running.current = []
          setPlaying(false)
          onPose(false)
        }
      },
      () => {
        // a cancelled animation (Stop, or a new vector) is not an error
      },
    )
  }

  if (!hasMotion && states.length === 0) return null
  return (
    <div className="sc-pose">
      {states.length > 0 && (
        <div className="sc-seg" role="radiogroup" aria-label="State">
          {['normal', ...states].map((st, i) => (
            <label key={st}>
              <input type="radio" name="sc-pose-state" checked={stop === i} onChange={() => pick(i)} />
              {st}
            </label>
          ))}
        </div>
      )}
      {hasMotion && (
        <div className="sc-pose-motion">
          <button type="button" className="btn small-btn" onClick={toggle}>
            {playing ? 'Stop' : `Play ${label}`}
          </button>
          <label className="check">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            Repeat
          </label>
        </div>
      )}
    </div>
  )
}
