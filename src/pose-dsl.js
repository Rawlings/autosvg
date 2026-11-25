// The vocabulary for writing poses (see pose-table.js). A pose is a set of beats on the shapes of an icon.
//
//   on(at, [ox, oy]?, ...beats)    which shapes (an index, a list, or ALL), an optional pivot, and their beats
//   ramp(c, {..}) pulse(c, {..}) wave(c, {..})   one beat, driven by pose channel c
//
// A beat's numbers are the value at the top of its curve:
//   t, w     where in the channel's 0 to 1 travel it plays (start, length)    n   swings of a wave
//   r        rotate, degrees          x, y   move, icon units       s    scale (both)     h, v   scale x / y only
//   q        skew x, degrees          a      opacity change         g    draw the stroke: -1 hides it (pathLength is added)
// ramp holds its end value; pulse goes there and back; wave swings and settles to rest.

export const CHANNELS = 4
export const BEATS = 4 // most beats one shape can carry
export const ALL = 'all'

/**
 * The four channels an icon can respond to, each a CSS number a consumer sets on the icon or any ancestor:
 *   1  --icon-motion   a momentary gesture, 0 to 1 (a bell rings, an arrow lunges). It plays and settles back to rest.
 *   2  --icon-state    which state the icon is in, 0 for its normal look and 1, 2, ... for its named states (off, open,
 *                      weak). A state persists; entering and leaving it is the number moving, and the beats in between
 *                      are the transition. Stops are whole numbers, but any value in between is a valid frame.
 *   3  --icon-look-x   -1 to 1, for icons that look around (the eyes)
 *   4  --icon-look-y
 */
export const CHANNEL_VAR = { 1: '--icon-motion', 2: '--icon-state', 3: '--icon-look-x', 4: '--icon-look-y' }
export const STATE = 2

const beat = (k) => (c, o = {}) => ({ c, k, ...o })
export const ramp = beat(0)
export const pulse = beat(1)
export const wave = beat(2)

/** Beats for some shapes. `o` is the pivot the rotate and scale turn around. */
export const on = (at, ...rest) => {
  const o = Array.isArray(rest[0]) ? rest.shift() : undefined
  return { at, o, beats: rest }
}

/** n = number of shapes (after any split); labels = what channels 1 and 2 (and 3, 4 for eyes) mean. */
export const P = (n, labels, ...parts) => ({ n, labels, parts })

/**
 * An icon whose file draws several strokes as one path (an arrow's shaft and head): split those paths at
 * every M so the parts can move apart. `from` is the shape count before, `at` the shapes to split.
 */
export const S = (from, at, spec) => ({ ...spec, split: { from, at } })

/**
 * Mark an icon whose main gesture is deliberately one plain move (a gear turning, a cube tumbling). The pose lint
 * otherwise rejects a main gesture that is a single beat or one move with one timing: that is the "cheap nudge".
 */
export const simple = (spec) => ({ ...spec, simple: true })

/**
 * Give an icon named states. `names` are the stops after the normal look: ['off'] means --icon-state 1 is "off";
 * ['weak', 'off'] means 1 is weak and 2 is off. What changes in a state is written as ordinary beats on channel 2
 * (ramps only: a state holds). `add` are strokes that exist only in a state (a slash through a microphone): invisible in
 * the file (opacity="0"), brought in at their state (see stateShape in poses.js for the options: in, out, kind, circle, rect).
 * `aliases` maps extra names to states: { unlock: 'open' } makes the name `unlock` mean `lock` in its open state.
 * Every state also gets the name `<icon>-<state>`, so `mic-off` is `mic` with its off state, and there is no second file.
 */
export const withStates = (spec, names, add = [], aliases = {}) => ({
  ...spec,
  states: names,
  add: add.map((a) => (typeof a === 'string' ? { d: a } : a)),
  aliases,
})

/**
 * Beats on the whole icon, carried by a group around its shapes: turning an arrow to point another way, rotating a chevron.
 * The shapes inside keep their own beats and move in the group's frame, so an arrow that points down still lunges down.
 */
export const grouped = (spec, o, ...beats) => ({ ...spec, group: { o, beats } })

/** Like grouped, but around only some of the shapes (the arrow of a download, not its tray): `at` are their indexes. */
export const groupedAt = (spec, at, o, ...beats) => ({ ...spec, group: { o, beats, at } })
