import { CHANNEL_VAR } from '@autosvg/core'

/** The channels a consumer can play: the momentary gesture and the two look directions (the state is a position, not a play). */
export type PlayChannel = 1 | 3 | 4

// Looking around (channels 3 and 4) is driven with a real damped spring (15% overshoot, settles).
const SPRING =
  'linear(0, 0.037, 0.131, 0.262, 0.41, 0.562, 0.705, 0.832, 0.939, 1.022, 1.082, 1.122, 1.142, 1.148, 1.141, 1.127, 1.107, 1.085, 1.063, 1.042, 1.023, 1.008, 0.996, 0.987, 0.982, 0.979, 0.978, 0.979, 0.981, 0.984, 0.988, 0.991, 1)'

interface Play {
  ms: number
  /** [value, offset] pairs, offsets 0 to 1 */
  keys: readonly (readonly [number, number])[]
  ease?: string
}

// One play of a momentary channel: up over most of the time, then back.
const PLAY: Record<PlayChannel, Play> = {
  1: {
    ms: 2200,
    keys: [
      [0, 0],
      [1, 0.75],
      [0, 1],
    ],
  },
  3: {
    ms: 2000,
    keys: [
      [0, 0],
      [1, 0.25],
      [-1, 0.65],
      [0, 1],
    ],
    ease: SPRING,
  },
  4: {
    ms: 2000,
    keys: [
      [0, 0],
      [1, 0.25],
      [-1, 0.65],
      [0, 1],
    ],
    ease: SPRING,
  },
}

export const LOOK_NAME: Record<3 | 4, string> = { 3: 'Look x', 4: 'Look y' }

/** Animate the numbers of some channels on one element, one after the other, optionally forever. Returns the animations. */
export function playOn(node: HTMLElement, channels: readonly PlayChannel[], repeat: boolean): Animation[] {
  const total = channels.reduce((sum, k) => sum + PLAY[k].ms, 0)
  let start = 0
  return channels.map((k) => {
    const { ms, keys, ease } = PLAY[k]
    const a = start / total
    const b = (start + ms) / total
    start += ms
    // this channel is at rest outside its slot, so channels can run back to back inside one cycle
    const all: [number, number][] = [[0, 0], ...keys.map(([v, o]): [number, number] => [v, a + o * (b - a)]), [0, 1]]
    const points = all.filter((p, i) => i === 0 || p[1] > (all[i - 1]?.[1] ?? 0) || p[1] === 1)
    const frames = points.map(([v, offset], i): Keyframe => {
      const frame: Keyframe = { [CHANNEL_VAR[k]]: v, offset }
      if (ease && i > 0 && i < points.length - 1 && offset >= a && offset < b) frame.easing = ease
      return frame
    })
    return node.animate(frames, {
      duration: total,
      easing: 'linear',
      iterations: repeat ? Number.POSITIVE_INFINITY : 1,
    })
  })
}
