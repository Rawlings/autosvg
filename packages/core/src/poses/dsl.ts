// The vocabulary for writing poses (see pose-table.js). A pose is a set of beats on the shapes of a vector.
//
//   on(at, [ox, oy]?, ...beats)    which shapes (an index, a list, or ALL), an optional pivot, and their beats
//   ramp(c, {..}) pulse(c, {..}) wave(c, {..})   one beat, driven by pose channel c
//
// A beat's numbers are the value at the top of its curve:
//   t, w     where in the channel's 0 to 1 travel it plays (start, length)    n   swings of a wave
//   r        rotate, degrees          x, y   move, vector units       s    scale (both)     h, v   scale x / y only
//   q        skew x, degrees          a      opacity change         g    draw the stroke: -1 hides it (pathLength is added)
// ramp holds its end value; pulse goes there and back; wave swings and settles to rest.

import type { Point } from '../util.ts'

export const CHANNELS = 4
export const BEATS = 4 // most beats one shape can carry
export const ALL = 'all'

/** A pose channel: 1 motion, 2 state, 3 and 4 look. */
export type Channel = 1 | 2 | 3 | 4

/** The curve a beat follows: 0 ramp, 1 pulse, 2 wave. */
export type BeatKind = 0 | 1 | 2

/** The numbers of a beat (see the legend at the top of this file). Only the ones that matter are given. */
export interface BeatAmounts {
  /** where in the channel's 0 to 1 travel it starts */
  t?: number
  /** how long it plays */
  w?: number
  /** swings of a wave */
  n?: number
  /** rotate, degrees */
  r?: number
  x?: number
  y?: number
  /** scale, both axes */
  s?: number
  /** scale x only */
  h?: number
  /** scale y only */
  v?: number
  /** skew x, degrees */
  q?: number
  /** opacity change */
  a?: number
  /** draw the stroke: -1 hides it */
  g?: number
}

export interface Beat extends BeatAmounts {
  c: Channel
  k: BeatKind
}

/** Which shapes a part of a pose applies to: an index, a list of them, or all. */
export type Target = number | readonly number[] | typeof ALL

export interface Part {
  at: Target
  /** the pivot the rotate and scale turn around */
  o: Point | undefined
  beats: Beat[]
}

/**
 * A shape that exists only in a state. `d`, `circle` [cx, cy, r] or `rect` [x, y, w, h, rx] say what it is; `rx` is a number,
 * or [base, max] to follow the --icon-radius setting.
 */
export interface StateAccessory {
  d?: string
  circle?: readonly [number, number, number]
  rect?: readonly [number, number, number, number, (number | readonly [number, number])?]
  /** the state it belongs to (default 1) */
  in?: number
  /** the state at which it goes away again (default: it stays) */
  out?: number
  /** how long leaving takes (default 0.6) */
  exitW?: number
  t?: number
  w?: number
  kind?: 'draw' | 'pop'
  pivot?: Point
}

export interface PoseSpec {
  /** number of shapes (after any split) */
  n: number
  /** what channels 1 and 2 (and 3, 4 for eyes) mean */
  labels: readonly string[]
  parts: Part[]
  split?: { from: number; at: readonly number[] }
  simple?: true
  exits?: true
  states?: readonly string[]
  add?: StateAccessory[]
  aliases?: Record<string, string>
  group?: { o: Point | undefined; beats: Beat[]; at?: readonly number[] }
}

/**
 * The four channels a vector can respond to, each a CSS number a consumer sets on the vector or any ancestor:
 *   1  --icon-motion   a momentary gesture, 0 to 1 (a bell rings, an arrow lunges). It plays and settles back to rest.
 *   2  --icon-state    which state the vector is in, 0 for its normal look and 1, 2, ... for its named states (off, open,
 *                      weak). A state persists; entering and leaving it is the number moving, and the beats in between
 *                      are the transition. Stops are whole numbers, but any value in between is a valid frame.
 *   3  --icon-look-x   -1 to 1, for vectors that look around (the eyes)
 *   4  --icon-look-y
 */
export const CHANNEL_VAR = {
  1: '--icon-motion',
  2: '--icon-state',
  3: '--icon-look-x',
  4: '--icon-look-y',
} as const satisfies Record<Channel, string>
export const STATE = 2

const beat =
  (k: BeatKind) =>
  (c: Channel, o: BeatAmounts = {}): Beat => ({ c, k, ...o })
export const ramp = beat(0)
export const pulse = beat(1)
export const wave = beat(2)

/** Beats for some shapes, with an optional pivot first. `o` is the pivot the rotate and scale turn around. */
export function on(at: Target, o: Point, ...beats: Beat[]): Part
export function on(at: Target, ...beats: Beat[]): Part
export function on(at: Target, ...rest: [Point, ...Beat[]] | Beat[]): Part {
  const [first, ...others] = rest
  if (Array.isArray(first)) return { at, o: first as Point, beats: others as Beat[] }
  return { at, o: undefined, beats: rest as Beat[] }
}

/** n = number of shapes (after any split); labels = what channels 1 and 2 (and 3, 4 for eyes) mean. */
export const P = (n: number, labels: readonly string[], ...parts: Part[]): PoseSpec => ({ n, labels, parts })

/**
 * A vector whose file draws several strokes as one path (an arrow's shaft and head): split those paths at
 * every M so the parts can move apart. `from` is the shape count before, `at` the shapes to split.
 */
export const S = (from: number, at: readonly number[], spec: PoseSpec): PoseSpec => ({ ...spec, split: { from, at } })

/**
 * Mark a vector whose main gesture is deliberately one plain move (a gear turning, a cube tumbling). The pose lint
 * otherwise rejects a main gesture that is a single beat or one move with one timing: that is the "cheap nudge".
 */
export const simple = (spec: PoseSpec): PoseSpec => ({ ...spec, simple: true })

/**
 * Give a vector named states. `names` are the stops after the normal look: ['off'] means --icon-state 1 is "off";
 * ['weak', 'off'] means 1 is weak and 2 is off. What changes in a state is written as ordinary beats on channel 2
 * (ramps only: a state holds). `add` are strokes that exist only in a state (a slash through a microphone): invisible in
 * the file (opacity="0"), brought in at their state (see stateShape in poses.js for the options: in, out, kind, circle, rect).
 * `aliases` maps extra names to states: { unlock: 'open' } makes the name `unlock` mean `lock` in its open state.
 * Every state also gets the name `<vector>-<state>`, so `mic-off` is `mic` with its off state, and there is no second file.
 */
export const withStates = (
  spec: PoseSpec,
  names: readonly string[],
  add: readonly (string | StateAccessory)[] = [],
  aliases: Record<string, string> = {},
): PoseSpec => ({
  ...spec,
  states: names,
  add: add.map((a) => (typeof a === 'string' ? { d: a } : a)),
  aliases,
})

/**
 * Beats on the whole vector, carried by a group around its shapes: turning an arrow to point another way, rotating a chevron.
 * The shapes inside keep their own beats and move in the group's frame, so an arrow that points down still lunges down.
 */
export const grouped = (spec: PoseSpec, o: Point | undefined, ...beats: Beat[]): PoseSpec => ({
  ...spec,
  group: { o, beats },
})

/** Like grouped, but around only some of the shapes (the arrow of a download, not its tray): `at` are their indexes. */
export const groupedAt = (spec: PoseSpec, at: readonly number[], o: Point | undefined, ...beats: Beat[]): PoseSpec => ({
  ...spec,
  group: { o, beats, at },
})

/**
 * A pass-through: the part leaves along (dx, dy) while fading, snaps unseen to the far side, and arrives from there.
 * Three beats; the part ends exactly where it began.
 */
export const through = (c: Channel, dx: number, dy: number, out = 0.5): Beat[] => [
  ramp(c, { w: out, x: dx, y: dy, a: -1 }),
  ramp(c, { t: out, w: 0.001, x: -1.7 * dx, y: -1.7 * dy }),
  ramp(c, { t: out, w: 1 - out, x: 0.7 * dx, y: 0.7 * dy, a: 1 }),
]

/** Erase a stroke, then draw it back on between t and t + w (the pen starts where the path starts). */
export const redraw = (c: Channel, t: number, w: number, erase = 0.12): Beat[] => [
  ramp(c, { w: erase, g: -1 }),
  ramp(c, { t, w, g: 1 }),
]

// ---- archetypes: the gestures that recur, in one line each ----
// Each returns a part with two beats that differ in timing and in what they move (so the pose lint does not call it thin), and
// none moves less than 0.8 vector units or 3 degrees: smaller than that is invisible at 24 px (see lessons.md).

/** An amount of at least `floor` in size, keeping its sign. */
const atLeast = (value: number, floor: number): number => (value < 0 ? -1 : 1) * Math.max(Math.abs(value), floor)

/** Hangs from `pivot` and swings, with a small lift: a lamp, a bag, a feather. */
export const swing = (at: Target, pivot: Point, deg = 5): Part =>
  on(at, pivot, wave(1, { n: 2, r: atLeast(deg, 3) }), pulse(1, { w: 0.5, y: 0.5 }))

/** Shakes sideways and swells a little: a window, a loose lid. */
export const rattle = (at: Target, pivot: Point, px = 0.8): Part =>
  on(at, pivot, wave(1, { n: 3, x: atLeast(px, 0.8) }), pulse(1, { w: 0.5, s: 0.03 }))

/** Fades and swells in quick turns: a flame, a light. */
export const flicker = (at: Target, pivot: Point): Part =>
  on(at, pivot, wave(1, { n: 3, a: -0.6 }), pulse(1, { w: 0.8, s: 0.2 }))

/** Pushes down and squashes a little: a stamp, a button. */
export const press = (at: Target, pivot: Point, px = 2): Part =>
  on(at, pivot, pulse(1, { w: 0.5, y: atLeast(px, 0.8) }), pulse(1, { t: 0.35, w: 0.5, h: 0.06 }))

/** Lifts up and stretches a little: a lid, a handle. */
export const lift = (at: Target, pivot: Point, px = 1): Part =>
  on(at, pivot, pulse(1, { w: 0.5, y: -atLeast(px, 0.8) }), pulse(1, { t: 0.4, w: 0.6, v: 0.06 }))

/** Swells and wobbles: a gem, a mark. */
export const pop = (at: Target, pivot: Point, scale = 0.12): Part =>
  on(at, pivot, pulse(1, { w: 0.6, s: scale }), wave(1, { t: 0.2, w: 0.8, n: 2, r: 4 }))

/** The same beat on several shapes in turn: rungs lighting up, finders blinking. Spread the result into `P(...)`. */
export const stagger = (indexes: readonly number[], amounts: BeatAmounts, step = 0.25, w = 0.4): Part[] =>
  indexes.map((index, k) => on(index, pulse(1, { ...amounts, t: k * step, w })))
