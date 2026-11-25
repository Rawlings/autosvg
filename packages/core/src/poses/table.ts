// Every vector's choreography. Source of truth for motion (see dsl.ts for the vocabulary, poses.ts for how it
// is written into the SVG, runtime/src/css/poses.css for how it runs).
//
// Channel 1 is the vector's main gesture and channel 2 a second one (both 0 to 1). Channels 3 and 4 are look and lean
// (-1 to 1): vectors tilt toward them as a whole, and the eyes give them beats of their own.
// A beat that is a `ramp` holds its end value (a state: open, closed, turned). `pulse` goes there and back, `wave`
// swings and settles to rest: both play during the transition and end at rest, like a hover that rings a bell.
//
// Rules this table follows so motion makes sense:
//  - a part moves the way the real thing moves (a lid hinges, a clapper swings late, a bar grows from its base)
//  - parts that touch stay touching (an arrow's shaft stretches as its head moves)
//  - strokes draw on and off in the order a hand would draw them; a pass-through leaves one side and returns from the other
//  - every beat is finished by the end of its channel's travel, so channel 1 at 1 is a clean end state

import { poses as batchPoses } from '../batches/index.ts'
import {
  ALL,
  type Beat,
  grouped,
  groupedAt,
  on,
  P,
  type PoseSpec,
  pulse,
  ramp,
  redraw,
  S,
  type StateAccessory,
  simple,
  through,
  wave,
  withStates,
} from './dsl.ts'

/** The vector deliberately leaves its box for a moment (the viewport clips it), so the bounds lint skips it. */
const X = (spec: PoseSpec): PoseSpec => ({ ...spec, exits: true })

/** A slash drawn corner to corner: the off state of a microphone, a camera, a bell, a signal, an eye. */
const SLASH = 'M4 4l16 16'

const n2 = (v: number): number => +v.toFixed(2)
/**
 * The four marks that things with a badge share: plus, minus, check and x, drawn at (cx, cy) with half-size h. They are
 * the states `plus`, `minus`, `check`, `x`, so user-plus, user-check, folder-x, calendar-minus and the rest are one vector each.
 * Each mark is drawn in as its state arrives and drawn out as the next takes over. Plus and minus are neighbours and share the
 * horizontal bar, so going from one to the other only draws the vertical bar on or off; the states are on one axis, so a jump
 * from normal to x plays the marks in between (see lessons.md).
 */
const BADGE = ['plus', 'minus', 'check', 'x']
const marks = (cx: number, cy: number, h = 2.5): StateAccessory[] => {
  const k = h * 0.8
  return [
    { d: `M${n2(cx)} ${n2(cy - h)}v${n2(2 * h)}`, in: 1, out: 2, w: 0.7 },
    { d: `M${n2(cx - h)} ${n2(cy)}h${n2(2 * h)}`, in: 1, out: 3, t: 0.3, w: 0.7 },
    {
      d: `M${n2(cx - h)} ${n2(cy + 0.1 * h)}L${n2(cx - 0.2 * h)} ${n2(cy + k)}L${n2(cx + h)} ${n2(cy - k)}`,
      in: 3,
      out: 4,
    },
    { d: `M${n2(cx - k)} ${n2(cy - k)}L${n2(cx + k)} ${n2(cy + k)}`, in: 4, w: 0.7 },
    { d: `M${n2(cx + k)} ${n2(cy - k)}L${n2(cx - k)} ${n2(cy + k)}`, in: 4, t: 3.3, w: 0.7 },
  ]
}

export const POSES: Record<string, PoseSpec> = {
  // ======================================== arrows and chevrons ========================================
  // An arrow lunges: it coils back a little, then the head drives forward and the shaft stretches to stay joined.
  // A chevron steps off one side and comes in from the other.
  // Pause is not another vector: the triangle is drawn off while two bars are drawn on. `pause` is this vector in that state.
  play: X(
    withStates(
      P(1, ['play'], on(0, ...through(1, 6, 0), ramp(2, { g: -1 }))),
      ['pause'],
      [
        { rect: [6, 4.5, 4, 15, [1.5, 2]], kind: 'draw', in: 1, w: 0.7 },
        { rect: [14, 4.5, 4, 15, [1.5, 2]], kind: 'draw', in: 1, t: 0.3, w: 0.7 },
      ],
      { pause: 'pause' },
    ),
  ),
  // ======================================== transfer ========================================
  // download: the arrow drops into the tray, which catches it; a new one comes down from above.
  // A download has three states. The arrow can turn to point up (it is an upload), and in `done` the arrow is drawn off while a
  // check is drawn on, so nothing fades and nothing is swapped. `upload` is this vector, turned.
  download: X(
    withStates(
      groupedAt(
        S(
          1,
          [0],
          P(
            3,
            ['download'],
            on([0, 1], ...through(1, 0, 2.6, 0.45), ramp(2, { t: 1, w: 1, g: -1 })),
            on(2, pulse(1, { t: 0.3, w: 0.6, y: 0.5 }), pulse(1, { t: 0.3, w: 0.6, h: 0.04 })),
          ),
        ),
        [0, 1],
        [12, 9.5],
        ramp(2, { w: 1, r: 180 }),
      ),
      ['up', 'done'],
      [{ d: 'M8.5 12.5l2.5 2.5 5-5.5', in: 2 }],
      { upload: 'up' },
    ),
  ),
  'external-link': S(
    2,
    [1],
    P(
      3,
      ['launch'],
      on(0, pulse(1, { t: 0.25, w: 0.75, s: -0.025 })),
      on(1, pulse(1, { x: 2, y: -2 }), wave(1, { n: 1, x: -1, y: 1 })),
      on(2, [11, 13], pulse(1, { s: 0.2 }), wave(1, { n: 1, s: -0.1 })),
    ),
  ),
  'log-out': S(
    2,
    [1],
    P(
      3,
      ['exit'],
      on(0, pulse(1, { t: 0.2, w: 0.8, x: -0.6 })),
      on(1, pulse(1, { x: 2.6 }), wave(1, { n: 1, x: -1.3 })),
      on(2, [9, 12], pulse(1, { h: 0.26 }), wave(1, { n: 1, h: -0.13 })),
    ),
  ),
  send: X(P(2, ['fly'], on(ALL, ...through(1, 6, -6, 0.5)))),
  refresh: P(2, ['refresh'], on(ALL, [12, 12], ramp(1, { r: 360 }), pulse(1, { s: -0.08 }))),
  repeat: P(
    4,
    ['loop'],
    on([0, 1], [12, 12], pulse(1, { x: 2.4 })),
    on([2, 3], [12, 12], pulse(1, { t: 0.2, w: 0.8, x: -2.4 })),
  ),
  shuffle: simple(P(4, ['swap'], on(ALL, [12, 12], ramp(1, { v: -2 })))),

  // ======================================== state: check, close, plus ========================================
  check: P(1, ['draw'], on(0, [12, 12], ...redraw(1, 0.2, 0.55, 0.2), pulse(1, { t: 0.55, w: 0.45, s: 0.16 }))),
  close: S(1, [0], P(2, ['spin'], on(ALL, [12, 12], ramp(1, { r: 180 }), pulse(1, { s: -0.2 })))),
  // plus becomes a cross: that is a state of the vector, not a gesture
  // A plus and a minus are one vector: the vertical bar is drawn off. (close is a cross of its own, not a turned plus.)
  plus: withStates(
    S(
      1,
      [0],
      P(
        2,
        ['draw'],
        on(0, ...redraw(1, 0.15, 0.4, 0.15), ramp(2, { g: -1 })),
        on(1, ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.5, w: 0.45, g: 1 })),
      ),
    ),
    ['minus'],
    [],
    { minus: 'minus' },
  ),
  'alert-triangle': P(
    3,
    ['warn'],
    on(0, [12, 17], wave(1, { n: 2.5, r: 9 })),
    on(1, [12, 17], wave(1, { n: 2.5, r: 9 }), pulse(1, { t: 0.1, w: 0.5, y: -0.5 })),
    on(2, [12, 17], wave(1, { n: 2.5, r: 9 }), pulse(1, { t: 0.2, w: 0.5, s: 0.9 })),
  ),
  // ======================================== objects with parts that really move ========================================
  // The bell swings from its top; its clapper is late and swings against it.
  // Unread brings in a dot that pops from nothing; off draws a slash and sends the dot away.
  bell: withStates(
    P(
      2,
      ['ring'],
      on(0, [12, 3], wave(1, { n: 3, r: 16 })),
      on(1, [12, 3], wave(1, { n: 3, r: 16 }), wave(1, { t: 0.08, w: 0.92, n: 3, x: -1.6 })),
    ),
    ['unread', 'off'],
    [
      { circle: [19.25, 4.75, 1.25], in: 1, out: 2 },
      { d: SLASH, in: 2 },
    ],
  ),
  // The lid hinges at its back edge; the handle sinks as it opens.
  // The lid hinges at its back edge; the handle sinks as it opens.
  archive: withStates(
    P(3, [], on(0, [3, 8], ramp(2, { r: -3, y: -1.6 })), on(2, ramp(2, { t: 0.3, w: 0.7, a: -0.5 }))),
    ['open'],
  ),
  // The shackle clicks up, swings out; a shake says "denied".
  // The lock refuses with a shake; its open state lifts the shackle and swings it out. `unlock` is this vector, open.
  lock: withStates(
    P(
      3,
      ['deny'],
      on(0, pulse(1, { t: 0.1, w: 0.4, v: -0.04 }), wave(1, { n: 3, x: 1 })),
      on(
        1,
        [8, 10.5],
        wave(1, { n: 3, x: 1 }),
        ramp(2, { t: 0.25, w: 0.3, y: -0.8 }),
        ramp(2, { t: 0.45, w: 0.55, r: -18 }),
      ),
      on(2, wave(1, { n: 3, x: 1 })),
    ),
    ['open'],
    [],
    { unlock: 'open' },
  ),
  // The trash lid swings up on its hinge; the contents settle.
  // The trash lid swings up on its hinge.
  trash: withStates(S(4, [3], P(5, [], on([0, 1], [4.5, 6.5], ramp(2, { r: -8, y: -0.3 })))), ['open']),
  // A new mail arrives: the envelope hops and the flap is drawn shut.
  mail: P(
    2,
    ['arrive'],
    on(0, [12, 12], wave(1, { n: 1, y: -1.6 }), pulse(1, { t: 0.5, w: 0.5, s: 0.04 })),
    on(1, wave(1, { n: 1, y: -1.6 }), ...redraw(1, 0.3, 0.55, 0.2)),
  ),
  home: P(
    2,
    ['lift'],
    on(0, [12, 10], wave(1, { n: 1, y: -2 })),
    on(1, [12, 20], pulse(1, { t: 0.15, w: 0.85, s: 0.03 })),
  ),
  // The lid of the gift pops off and tilts while the bow flares.
  gift: P(
    5,
    ['open'],
    on(0, [3, 7], pulse(1, { y: -1.6, r: -10 })),
    on(3, [12, 7], pulse(1, { t: 0.1, w: 0.9, y: -2.4, r: -8 })),
    on(4, [12, 7], pulse(1, { t: 0.1, w: 0.9, y: -2.4, r: 8 })),
  ),
  'shopping-bag': P(
    2,
    ['carry'],
    on(0, [12, 3.5], wave(1, { n: 2, r: 9 })),
    on(1, [12, 3.5], wave(1, { t: 0.08, w: 0.92, n: 2, r: 9 })),
  ),
  // The wallet hops and its clasp snaps shut.
  wallet: P(
    2,
    ['snap'],
    on(0, wave(1, { n: 1, y: -0.8 })),
    on(1, [18, 12.5], wave(1, { n: 1, y: -0.8 }), pulse(1, { t: 0.25, w: 0.6, s: 0.3 })),
  ),
  // Closed: the canopy narrows and the handle rises.
  umbrella: withStates(P(2, [], on(0, [12, 12], ramp(2, { h: -0.6 })), on(1, [12, 12], ramp(2, { y: -1.4 }))), [
    'closed',
  ]),
  coffee: S(
    3,
    [2],
    P(
      4,
      ['steam'],
      on(
        2,
        ramp(1, { w: 0.5, y: -1.6, a: -1 }),
        ramp(1, { t: 0.5, w: 0.001, y: 2.7 }),
        ramp(1, { t: 0.5, w: 0.5, y: -1.1, a: 1 }),
      ),
      on(
        3,
        ramp(1, { t: 0.1, w: 0.4, y: -1.6, a: -1 }),
        ramp(1, { t: 0.55, w: 0.001, y: 2.7 }),
        ramp(1, { t: 0.55, w: 0.4, y: -1.1, a: 1 }),
      ),
    ),
  ),
  droplet: simple(P(1, ['drip'], on(0, [12, 20], wave(1, { n: 1.5, v: -0.14, h: 0.1 })))),
  flame: P(1, ['flicker'], on(0, [12, 21], wave(1, { n: 3, q: 6 }), wave(1, { n: 2.5, v: 0.08 }))),
  // On: rays reach out from the glass, one after another.
  lightbulb: withStates(
    P(2, ['glow'], on(0, [12, 10], pulse(1, { s: 0.08 })), on(1, pulse(1, { t: 0.2, w: 0.5, y: 0.4 }))),
    ['on'],
    [
      { d: 'M3 10h1.5', w: 0.6 },
      { d: 'M4.5 4.5l1.3 1.3', t: 0.13, w: 0.6 },
      { d: 'M19.5 4.5l-1.3 1.3', t: 0.26, w: 0.6 },
      { d: 'M19.5 10h1.5', t: 0.4, w: 0.6 },
    ],
  ),
  // One cloud, five looks: it is the cloud, and uploading, downloading, done and offline are its states. Each accessory is
  // drawn on as its state arrives and drawn off as the next one takes over.
  cloud: withStates(
    P(1, ['float'], on(0, [12, 14], pulse(1, { x: 1.6 }), wave(1, { n: 2, y: -0.8 }))),
    ['upload', 'download', 'done', 'off'],
    [
      { d: 'M12 16.5v-5', in: 1, out: 2, w: 0.7 },
      { d: 'M9.5 14l2.5-2.5 2.5 2.5', in: 1, out: 2, t: 0.3, w: 0.7 },
      { d: 'M12 11.5v5', in: 2, out: 3, w: 0.7 },
      { d: 'M9.5 14l2.5 2.5 2.5-2.5', in: 2, out: 3, t: 1.3, w: 0.7 },
      { d: 'M9.5 13.5l2 2 3.5-3.5', in: 3, out: 4 },
      { d: SLASH, in: 4 },
    ],
  ),
  moon: P(1, ['wane'], on(0, [12, 12], wave(1, { n: 1.5, r: -28 }), pulse(1, { t: 0.4, w: 0.6, s: 0.05 }))),
  bolt: P(
    1,
    ['strike'],
    on(
      0,
      [12, 12],
      ramp(1, { w: 0.18, g: -1 }),
      ramp(1, { t: 0.18, w: 0.37, g: 1 }),
      wave(1, { t: 0.55, w: 0.45, n: 3, a: -0.7 }),
    ),
  ),
  // Dim: the rays fade and the core shrinks.
  sun: withStates(
    P(
      2,
      ['shine'],
      on(0, [12, 12], pulse(1, { s: 0.12 }), ramp(2, { s: -0.1 })),
      on(1, [12, 12], ramp(1, { r: 45 }), pulse(1, { s: 0.14 }), ramp(2, { a: -1 })),
    ),
    ['dim'],
  ),
  rocket: S(
    4,
    [3],
    P(
      5,
      ['launch'],
      on([0, 1, 3, 4], pulse(1, { y: -1.8 }), wave(1, { n: 1, y: 1.2 })),
      on(2, [12, 19], pulse(1, { y: -1.8 }), wave(1, { n: 4, v: 0.7 })),
    ),
  ),
  heart: P(1, ['beat'], on(0, [12, 19], pulse(1, { w: 0.4, s: 0.16 }), pulse(1, { t: 0.3, w: 0.45, s: 0.12 }))),
  award: P(
    2,
    ['swing'],
    on(0, [12, 9], wave(1, { n: 2.5, r: 14 }), pulse(1, { t: 0.3, w: 0.7, s: 0.06 })),
    on(1, [12, 9], wave(1, { t: 0.08, w: 0.92, n: 2.5, r: 14 })),
  ),
  star: P(1, ['shine'], on(0, [12, 12.4], ramp(1, { r: 72 }), pulse(1, { s: 0.06 }))),
  spark: P(
    2,
    ['twinkle'],
    on(0, [10.5, 13.5], ramp(1, { r: 90 }), pulse(1, { s: 0.15 })),
    on(1, [18, 6], pulse(1, { t: 0.2, w: 0.8, s: 0.5 })),
  ),
  bookmark: P(1, ['hop'], on(0, [12, 10], wave(1, { n: 1, y: -2.2 }), pulse(1, { t: 0.5, w: 0.5, v: -0.08 }))),
  tag: P(
    2,
    ['swing'],
    on(ALL, [7.5, 7.5], wave(1, { n: 2.5, r: 18 })),
    on(1, [7.5, 7.5], pulse(1, { t: 0.4, w: 0.6, s: 0.5 })),
  ),
  // The flag lowers down its pole.
  flag: withStates(
    P(2, ['wave'], on(1, [6, 8], wave(1, { n: 3, q: 10 }), wave(1, { n: 3, h: 0.08 }), ramp(2, { y: 7 }))),
    ['lowered'],
  ),
  hourglass: P(2, ['flip'], on(ALL, [12, 12], ramp(1, { r: 180 }), pulse(1, { s: -0.08 }))),
  key: P(4, ['turn'], on(ALL, [12, 12], wave(1, { n: 1.5, r: -16 }), pulse(1, { t: 0.3, w: 0.7, x: 0.8, y: -0.8 }))),
  compass: P(2, ['seek'], on(0, [12, 12], pulse(1, { s: 0.03 })), on(1, [12, 12], wave(1, { n: 3, r: 80 }))),
  clock: P(2, ['tick'], on(0, [12, 12], pulse(1, { s: 0.03 })), on(1, [12, 12], ramp(1, { r: 360 }))),
  cube: simple(P(2, ['tumble'], on(0, [12, 12], ramp(1, { r: 120 })), on(1, [12, 12], ramp(1, { r: 120 })))),
  globe: P(3, ['spin'], on(0, [12, 12], pulse(1, { s: 0.02 })), on(2, [12, 12], ramp(1, { h: -2 }))),
  // Locked on: the rings close in toward the centre.
  target: withStates(
    P(
      3,
      ['hit'],
      on(0, [12, 12], pulse(1, { t: 0.24, w: 0.55, s: 0.14 }), ramp(2, { t: 0.3, w: 0.7, s: -0.12 })),
      on(1, [12, 12], pulse(1, { t: 0.12, w: 0.55, s: 0.14 }), ramp(2, { t: 0.15, w: 0.6, s: -0.2 })),
      on(2, [12, 12], pulse(1, { w: 0.55, s: 0.14 }), ramp(2, { w: 0.5, s: -0.3 })),
    ),
    ['locked'],
  ),
  // ======================================== devices and media ========================================
  // The handset rings (rocks on its cradle); put down, it turns over to lie flat, the hang-up vector.
  phone: withStates(
    grouped(
      P(1, ['ring'], on(0, [12, 12], wave(1, { n: 4, r: 14 }), wave(1, { t: 0.05, w: 0.95, n: 6, x: 0.5 }))),
      [12, 12],
      ramp(2, { r: 135, s: -0.2 }),
    ),
    ['end'],
    [],
    { 'phone-end': 'end' },
  ),
  // The knob slides across the track; the nudge is a flick toward the other side that settles back.
  toggle: withStates(
    P(
      2,
      ['flick'],
      on(1, [8, 12], pulse(1, { x: 2.5 }), wave(1, { t: 0.4, w: 0.6, n: 1.5, x: -0.6 }), ramp(2, { x: 8 })),
    ),
    ['on'],
    [],
    { 'toggle-on': 'on', 'toggle-off': 'normal' },
  ),
  // A check or a bar is drawn into the box. The box gives a little as it is pressed.
  checkbox: withStates(
    P(1, ['press'], on(0, [12, 12], pulse(1, { w: 0.5, s: -0.08 }), pulse(1, { t: 0.5, w: 0.5, s: 0.05 }))),
    ['checked', 'mixed'],
    [
      { d: 'M7.5 12.5l3 3 6-6.5', in: 1, out: 2 },
      { d: 'M8 12h8', in: 2 },
    ],
    { 'check-square': 'checked', 'square-check': 'checked', 'minus-square': 'mixed' },
  ),
  // Writing: the items are drawn in one after the other. Checked, the list is crossed out in one tick.
  clipboard: withStates(
    P(
      4,
      ['write'],
      on(1, [12, 5], pulse(1, { y: 0.7 })),
      on(2, ramp(2, { w: 1, g: -1 }), ...redraw(1, 0.15, 0.4)),
      on(3, ramp(2, { w: 1, g: -1 }), ...redraw(1, 0.45, 0.4)),
    ),
    ['checked'],
    [{ d: 'M8.5 14.5l2.5 2.5 4.5-5.5', in: 1, t: 0.4, w: 0.6 }],
    { 'clipboard-check': 'checked' },
  ),
  // Pressed in: the pin drops onto its needle and settles. Off draws the slash.
  pin: withStates(
    P(
      2,
      ['press'],
      on(0, [12, 16.5], pulse(1, { y: 1 }), wave(1, { t: 0.3, w: 0.7, n: 1, y: -0.3 })),
      on(1, [12, 16.5], pulse(1, { y: 1 }), wave(1, { t: 0.3, w: 0.7, n: 1, y: -0.3 })),
    ),
    ['off'],
    [SLASH],
    { unpin: 'off' },
  ),
  // The two brackets close in on the picture, then settle back.
  crop: P(
    2,
    ['trim'],
    on(0, [12, 12], pulse(1, { x: 1, y: -1 }), wave(1, { t: 0.3, w: 0.7, n: 1, x: -0.3, y: 0.3 })),
    on(1, [12, 12], pulse(1, { x: -1, y: 1 }), wave(1, { t: 0.3, w: 0.7, n: 1, x: 0.3, y: -0.3 })),
  ),
  // A choice among several: the ring takes a dot. (Not a state of circle: that ring walks through its marks, and a radio must not.)
  radio: withStates(
    P(1, ['choose'], on(0, [12, 12], pulse(1, { w: 0.5, s: -0.07 }), pulse(1, { t: 0.5, w: 0.5, s: 0.05 }))),
    ['selected'],
    [{ circle: [12, 12, 3.5], in: 1 }],
  ),
  // Pairing: the rune is drawn again, stroke by stroke. Off draws the slash.
  bluetooth: withStates(
    P(1, ['pair'], on(0, [12, 12], ...redraw(1, 0.15, 0.6, 0.15), pulse(1, { t: 0.75, w: 0.25, s: 0.08 }))),
    ['off'],
    [SLASH],
  ),
  // Unfolding: the panels open out a little and settle back.
  map: S(
    1,
    [0],
    P(3, ['unfold'], on(ALL, [12, 12], pulse(1, { h: 0.1 }), wave(1, { t: 0.3, w: 0.7, n: 1, h: -0.03 }))),
  ),
  // Attaching: the clip presses down onto the page and settles.
  paperclip: P(1, ['attach'], on(0, [12, 12], pulse(1, { y: 1.4 }), wave(1, { t: 0.3, w: 0.7, n: 1.5, r: 5 }))),
  // The mercury is drawn up the tube from the bulb.
  thermometer: P(
    3,
    ['rise'],
    on(2, ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.15, w: 0.7, g: 1 }), pulse(1, { t: 0.85, w: 0.15, y: -0.5 })),
  ),
  // Mentioned: the ring settles in as the outer line is drawn round it.
  'at-sign': P(
    2,
    ['mention'],
    on(0, [12, 12], pulse(1, { t: 0.4, w: 0.6, s: 0.12 })),
    on(1, ramp(1, { w: 0.12, g: -1 }), ramp(1, { t: 0.12, w: 0.7, g: 1 })),
  ),
  // Swaying from its stem.
  leaf: P(2, ['sway'], on(ALL, [4.75, 19], wave(1, { n: 2, r: 9 }), pulse(1, { t: 0.3, w: 0.7, s: 0.04 }))),
  // Raised: the cup lifts and the handles follow a beat behind.
  trophy: P(
    5,
    ['raise'],
    on([0, 1, 2], pulse(1, { y: -1.4 }), wave(1, { t: 0.4, w: 0.6, n: 1, y: 0.4 })),
    on(3, [12, 20.5], pulse(1, { v: 0.155 }), wave(1, { t: 0.4, w: 0.6, n: 1, v: -0.044 })),
    on(4, [12, 20.5], pulse(1, { t: 0.2, w: 0.8, s: 0.06 })),
  ),
  // A thumbs-up: the hand tips up and settles; the cuff stays. Turned over it is a thumbs-down: the same vector, flipped.
  'thumbs-up': withStates(
    grouped(
      P(2, ['approve'], on(1, [9, 20], pulse(1, { r: -12 }), wave(1, { t: 0.3, w: 0.7, n: 1.5, r: 4 }))),
      [12, 12],
      ramp(2, { v: -2 }),
    ),
    ['down'],
    [],
    { 'thumbs-down': 'down' },
  ),
  // Typing: each row of keys goes down in turn, then the space bar.
  keyboard: P(
    4,
    ['type'],
    on(0, [12, 12], pulse(1, { w: 0.5, s: -0.02 })),
    on(1, pulse(1, { y: 0.8 })),
    on(2, pulse(1, { t: 0.2, w: 0.5, y: 0.8 })),
    on(3, pulse(1, { t: 0.45, w: 0.55, y: 0.8 })),
  ),
  smartphone: withStates(
    P(2, ['buzz'], on(ALL, [12, 12], wave(1, { n: 5, x: 0.7 }), wave(1, { n: 4, r: 3 }), ramp(2, { r: 90 }))),
    ['landscape'],
  ),
  // Closed: the screen folds down onto the keyboard.
  laptop: withStates(P(2, [], on(0, [12, 15], ramp(2, { v: -0.55 })), on(1, ramp(2, { t: 0.3, w: 0.7, y: -0.2 }))), [
    'closed',
  ]),
  monitor: S(
    2,
    [1],
    P(
      3,
      ['power'],
      on(0, [12, 10], ramp(1, { w: 0.3, v: -0.9 }), ramp(1, { t: 0.3, w: 0.7, v: 0.9 })),
      on([1, 2], pulse(1, { t: 0.3, w: 0.7, y: 0.3 })),
    ),
  ),
  video: withStates(
    P(2, ['roll'], on(0, [10, 12], pulse(1, { x: -0.4 })), on(1, [16, 12], wave(1, { n: 2.5, r: 10 }))),
    ['off'],
    [SLASH],
  ),
  camera: withStates(
    P(
      2,
      ['focus'],
      on(0, [12, 12], pulse(1, { t: 0.4, w: 0.6, y: 0.5 })),
      on(1, [12, 12.5], wave(1, { n: 2, s: 0.22 })),
    ),
    ['off'],
    [SLASH],
  ),
  image: P(
    3,
    ['rise'],
    on(1, [9, 10], pulse(1, { y: -1.6, s: 0.15 })),
    on(2, [12, 19.5], pulse(1, { t: 0.2, w: 0.8, v: 0.08 })),
  ),
  headphones: P(
    3,
    ['bass'],
    on(0, [12, 14], pulse(1, { y: -0.8 })),
    on(1, [5, 17], wave(1, { n: 2.5, s: 0.14 })),
    on(2, [19, 17], wave(1, { t: 0.1, w: 0.9, n: 2.5, s: 0.14 })),
  ),
  mic: withStates(
    P(
      4,
      ['listen'],
      on(0, [12, 8.5], wave(1, { n: 2.5, s: 0.08 })),
      on(1, [12, 11.5], wave(1, { t: 0.1, w: 0.9, n: 2.5, v: 0.08 })),
    ),
    ['off'],
    [SLASH],
  ),
  music: P(
    3,
    ['bounce'],
    on(0, [6.5, 18], wave(1, { n: 2, y: -1.3 })),
    on(1, [16.5, 16], wave(1, { t: 0.1, w: 0.9, n: 2, y: -1.3 })),
    on(2, [12, 21], wave(1, { t: 0.05, w: 0.95, n: 2, y: -1.3 })),
  ),
  // Volume is a level: low drops the outer arc, off drops the inner one too and draws a cross after the speaker.
  volume: withStates(
    P(
      3,
      ['sound'],
      on(0, [8, 12], pulse(1, { s: 0.06 })),
      on(1, ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.2, w: 0.3, g: 1 }), ramp(2, { t: 1, w: 1, a: -1 })),
      on(2, ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.45, w: 0.4, g: 1 }), ramp(2, { w: 1, a: -1 })),
    ),
    ['low', 'off'],
    [
      { d: 'M16 9.5l5 5', in: 2, w: 0.55 },
      { d: 'M21 9.5l-5 5', in: 2, t: 1.45, w: 0.55 },
    ],
  ),
  // Two states: weak (the outer arcs fade) and off (the arcs return and a slash is drawn).
  wifi: withStates(
    P(
      4,
      ['connect'],
      on(0, ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.7, w: 0.3, g: 1 }), ramp(2, { a: -1 }), ramp(2, { t: 1, a: 1 })),
      on(
        1,
        ramp(1, { w: 0.1, g: -1 }),
        ramp(1, { t: 0.45, w: 0.25, g: 1 }),
        ramp(2, { t: 0.4, w: 0.6, a: -0.7 }),
        ramp(2, { t: 1, a: 0.7 }),
      ),
      on(2, ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.2, w: 0.25, g: 1 })),
      on(3, [12, 19], pulse(1, { w: 0.35, s: 1.2 })),
    ),
    ['weak', 'off'],
    [{ d: SLASH, t: 1 }],
  ),
  // Charging blinks the cells in turn; empty fades them from the last to the first.
  // Charging blinks the cells in turn; in its charging state the cells go and a bolt is drawn in; empty takes the bolt away.
  battery: withStates(
    S(
      3,
      [2],
      P(
        4,
        ['charge'],
        on(1, pulse(1, { t: 0.5, w: 0.5, x: 0.5 })),
        on(2, pulse(1, { w: 0.5, a: -1 }), ramp(2, { t: 0.5, w: 0.5, a: -1 })),
        on(3, pulse(1, { t: 0.25, w: 0.5, a: -1 }), ramp(2, { w: 0.5, a: -1 })),
      ),
    ),
    ['charging', 'empty'],
    [{ d: 'M12.5 8.5l-2.5 3.5h3l-1.5 3.5', in: 1, out: 2, t: 0.4, w: 0.6 }],
  ),
  printer: P(
    4,
    ['print'],
    on(1, pulse(1, { y: -0.6 })),
    on(2, pulse(1, { t: 0.15, w: 0.85, y: 1.6 })),
    on(3, wave(1, { n: 3, a: -0.8 })),
  ),
  terminal: S(
    2,
    [1],
    P(
      3,
      ['type'],
      on(0, pulse(1, { t: 0.1, w: 0.9, s: 0.01 })),
      on(1, pulse(1, { x: 0.8 })),
      on(2, ...redraw(1, 0.2, 0.7)),
    ),
  ),
  'credit-card': S(
    2,
    [1],
    P(
      3,
      ['swipe'],
      on(0, [12, 12], wave(1, { n: 1, x: 2 })),
      on(1, [12, 12], wave(1, { t: 0.04, w: 0.96, n: 1, x: 2 })),
      on(2, [12, 12], wave(1, { t: 0.08, w: 0.92, n: 1, x: 2.4 })),
    ),
  ),
  chip: P(
    3,
    ['power'],
    on(0, [12, 12], pulse(1, { s: 0.04 })),
    on(1, [12, 12], wave(1, { n: 3, s: 0.3 })),
    on(2, [12, 12], pulse(1, { t: 0.2, w: 0.8, s: 0.12 })),
  ),
  database: S(
    2,
    [1],
    P(3, ['stack'], on(0, wave(1, { n: 1.5, y: -1.6 })), on(1, wave(1, { t: 0.1, w: 0.9, n: 1.5, y: -0.8 }))),
  ),
  cursor: P(1, ['click'], on(0, [3.6, 3.8], wave(1, { n: 2, s: -0.12, x: 0.6, y: 0.6 }), wave(1, { n: 2, r: -8 }))),
  code: S(
    1,
    [0],
    P(
      3,
      ['type'],
      on(0, pulse(1, { x: -1.8 })),
      on(1, pulse(1, { x: 1.8 })),
      on(2, [12, 12], pulse(1, { t: 0.15, w: 0.85, r: 14 })),
    ),
  ),

  // ======================================== layout and structure ========================================
  // Tiles pop in a ripple; or the columns swap places, one going over and one under so they never collide.
  grid: P(
    4,
    ['ripple'],
    on(0, [6.75, 6.75], pulse(1, { w: 0.5, s: 0.22 })),
    on(1, [17.25, 6.75], pulse(1, { t: 0.15, w: 0.5, s: 0.22 })),
    on(2, [6.75, 17.25], pulse(1, { t: 0.45, w: 0.5, s: 0.22 })),
    on(3, [17.25, 17.25], pulse(1, { t: 0.3, w: 0.5, s: 0.22 })),
  ),
  component: P(
    4,
    ['assemble'],
    on(0, [12, 12], pulse(1, { w: 0.6, y: -1.6 })),
    on(1, [12, 12], pulse(1, { t: 0.3, w: 0.6, x: -1.6 })),
    on(2, [12, 12], pulse(1, { t: 0.1, w: 0.6, x: 1.6 })),
    on(3, [12, 12], pulse(1, { t: 0.4, w: 0.6, y: 1.6 })),
  ),
  layers: P(
    3,
    ['stack'],
    on(0, wave(1, { n: 1.5, y: -1.8 })),
    on(1, wave(1, { t: 0.1, w: 0.9, n: 1.5, y: -0.2 })),
    on(2, wave(1, { t: 0.2, w: 0.8, n: 1.5, y: 1.8 })),
  ),
  // Collapsed: the side column slides away.
  layout: withStates(
    S(
      2,
      [1],
      P(
        3,
        ['reflow'],
        on(0, pulse(1, { t: 0.2, w: 0.8, s: 0.02 })),
        on(1, pulse(1, { y: 1.4 })),
        on(2, pulse(1, { x: 3 }), ramp(2, { x: -3, a: -1 })),
      ),
    ),
    ['collapsed'],
  ),
  // Two states in a row: the divider slides to collapsed, and on to wide.
  sidebar: withStates(P(2, [], on(1, ramp(2, { w: 1, x: -3.2 }), ramp(2, { t: 1, w: 1, x: 6.7 }))), [
    'collapsed',
    'wide',
  ]),
  table: S(
    2,
    [1],
    P(
      4,
      ['build'],
      on(0, pulse(1, { t: 0.5, w: 0.5, s: 0.02 })),
      on(1, ...redraw(1, 0.15, 0.3)),
      on(2, ...redraw(1, 0.35, 0.3)),
      on(3, ...redraw(1, 0.55, 0.4)),
    ),
  ),
  // Cropped: the guides close in.
  frame: withStates(
    S(
      1,
      [0],
      P(
        4,
        ['snap'],
        on(0, pulse(1, { x: 1.2 }), ramp(2, { x: 2 })),
        on(1, pulse(1, { x: -1.2 }), ramp(2, { x: -2 })),
        on(2, pulse(1, { y: 1.2 }), ramp(2, { y: 2 })),
        on(3, pulse(1, { y: -1.2 }), ramp(2, { y: -2 })),
      ),
    ),
    ['cropped'],
  ),
  expand: S(
    1,
    [0],
    P(
      4,
      ['expand'],
      on(0, pulse(1, { x: -1.6, y: -1.6 }), wave(1, { n: 1, x: 0.9, y: 0.9 })),
      on(1, pulse(1, { x: 1.6, y: -1.6 }), wave(1, { n: 1, x: -0.9, y: 0.9 })),
      on(2, pulse(1, { x: 1.6, y: 1.6 }), wave(1, { n: 1, x: -0.9, y: -0.9 })),
      on(3, pulse(1, { x: -1.6, y: 1.6 }), wave(1, { n: 1, x: 0.9, y: -0.9 })),
    ),
  ),
  // Two arrows along the diagonal. Pointing out, they are maximize; each head is drawn off, a head drawn on at the other end of its
  // shaft, and the shafts slide a step: they point in, minimize. One vector, the arrows swapping ends.
  maximize: withStates(
    S(
      1,
      [0],
      P(
        4,
        ['stretch'],
        on(0, wave(1, { n: 1, x: 1.2, y: -1.2 }), ramp(2, { w: 0.5, g: -1 })),
        on(1, wave(1, { n: 1, x: -1.2, y: 1.2 }), ramp(2, { w: 0.5, g: -1 })),
        on(2, wave(1, { n: 1, x: 1.2, y: -1.2 }), ramp(2, { x: 1, y: -1 })),
        on(3, wave(1, { n: 1, x: -1.2, y: 1.2 }), ramp(2, { x: -1, y: 1 })),
      ),
    ),
    ['in'],
    [
      { d: 'M20 10h-6V4', in: 1, t: 0.5, w: 0.5 },
      { d: 'M4 14h6v6', in: 1, t: 0.5, w: 0.5 },
    ],
    { minimize: 'in' },
  ),
  hash: S(
    1,
    [0],
    P(
      4,
      ['weave'],
      on(0, [12, 12], pulse(1, { x: 1.6 })),
      on(1, [12, 12], pulse(1, { x: -1.6 })),
      on(2, [12, 12], pulse(1, { y: 1.6 })),
      on(3, [12, 12], pulse(1, { y: -1.6 })),
    ),
  ),
  // Two states in a row. Open: the three lines become a cross, the middle one first to go. Back: the cross lines are erased, the
  // middle line returns as the shaft, and a head is drawn on its left end. Nothing fades in or out except that middle line.
  menu: withStates(
    P(
      3,
      [],
      on(0, [12, 7], ramp(2, { t: 0.2, w: 0.8, y: 5, r: 45 }), ramp(2, { t: 1, w: 1, g: -1 })),
      on(1, ramp(2, { w: 0.3, a: -1 }), ramp(2, { t: 1, w: 0.5, a: 1 })),
      on(2, [12, 17], ramp(2, { t: 0.2, w: 0.8, y: -5, r: -45 }), ramp(2, { t: 1, w: 1, g: -1 })),
    ),
    ['open', 'back'],
    [{ d: 'M10 6l-6 6 6 6', in: 2, t: 1.2, w: 0.8 }],
  ),
  list: S(
    4,
    [0],
    P(
      6,
      ['cascade'],
      on([0, 3], pulse(1, { w: 0.5, x: 1.4 })),
      on([1, 4], pulse(1, { t: 0.15, w: 0.5, x: 1.4 })),
      on([2, 5], pulse(1, { t: 0.3, w: 0.5, x: 1.4 })),
    ),
  ),
  sliders: S(
    3,
    [0],
    P(
      6,
      ['adjust'],
      on(0, [3, 8], pulse(1, { h: -0.533 })),
      on(1, [21, 8], pulse(1, { h: 0.727 })),
      on(2, [3, 16], pulse(1, { t: 0.15, w: 0.85, h: 2 })),
      on(3, [21, 16], pulse(1, { t: 0.15, w: 0.85, h: -0.476 })),
      on(4, pulse(1, { x: -4 })),
      on(5, pulse(1, { t: 0.15, w: 0.85, x: 5 })),
    ),
  ),
  filter: P(1, ['squeeze'], on(0, [12, 12], pulse(1, { h: -0.2, v: 0.06 }), pulse(1, { t: 0.4, w: 0.6, y: 0.5 }))),
  'pie-chart': P(
    2,
    ['slice'],
    on(1, [12, 12], pulse(1, { x: 1.4, y: -1.4 }), wave(1, { t: 0.3, w: 0.7, n: 1.5, r: 8 })),
  ),
  'bar-chart': S(
    1,
    [0],
    P(
      4,
      ['regrow'],
      on(1, [6.5, 20], ramp(1, { w: 0.2, v: -0.92 }), ramp(1, { t: 0.2, w: 0.6, v: 0.92 })),
      on(2, [12, 20], ramp(1, { w: 0.2, v: -0.92 }), ramp(1, { t: 0.3, w: 0.6, v: 0.92 })),
      on(3, [17.5, 20], ramp(1, { w: 0.2, v: -0.92 }), ramp(1, { t: 0.4, w: 0.6, v: 0.92 })),
    ),
  ),
  activity: P(1, ['trace'], on(0, [12, 12], ...redraw(1, 0.3, 0.7, 0.3), pulse(1, { t: 0.3, w: 0.7, v: 0.16 }))),
  percent: P(
    3,
    ['swap'],
    on(0, [12, 12], ramp(1, { x: 10, y: 10 }), pulse(1, { x: 3, y: -3 })),
    on(1, [12, 12], ramp(1, { x: -10, y: -10 }), pulse(1, { x: -3, y: 3 })),
  ),

  // ======================================== people, text, tools ========================================
  user: P(
    2,
    ['nod'],
    on(0, [12, 14], wave(1, { n: 1.5, y: 1.3 })),
    on(1, [12, 20.5], pulse(1, { t: 0.15, w: 0.85, v: 0.05 })),
  ),
  users: P(
    4,
    ['huddle'],
    on(0, pulse(1, { x: 1.2 })),
    on(1, pulse(1, { t: 0.1, w: 0.9, x: 1.2 })),
    on(2, pulse(1, { x: -1.2 })),
    on(3, pulse(1, { t: 0.1, w: 0.9, x: -1.2 })),
  ),
  // Wink: the right eye closes and the mouth tilts.
  smile: withStates(
    P(
      4,
      ['grin'],
      on(0, [12, 12], pulse(1, { s: 0.03 })),
      on(1, [9, 10], pulse(1, { v: -0.6 })),
      on(2, [15, 10], pulse(1, { v: -0.6 }), ramp(2, { v: -0.9 })),
      on(3, [12, 15], pulse(1, { h: 0.22, v: 0.5 }), ramp(2, { q: -8 })),
    ),
    ['wink'],
  ),
  // Off states: these vectors need no second vector. The slash (or the speaker's cross) exists only in the off state and is
  // drawn on when --autosvg-off goes from 0 to 1; mic-off, eye-off and the like resolve to the same vector with it on.
  // Off: a slash is drawn through the eye. mic-off, bell-off, eye-off and the like are these vectors in their off state.
  eye: withStates(
    P(
      2,
      ['blink'],
      on(0, [12, 12], pulse(1, { v: -0.85 }), ramp(3, { x: 0.3 }), ramp(4, { y: 0.25 })),
      on(1, [12, 12], pulse(1, { t: 0.06, w: 0.94, v: -0.85 }), ramp(3, { x: 1.7 }), ramp(4, { y: 1.3 })),
    ),
    ['off'],
    [SLASH],
  ),
  edit: P(2, ['write'], on(ALL, [6.5, 17.8], wave(1, { n: 3, r: 8 }), pulse(1, { x: 1.2 }))),
  'pen-tool': P(3, ['draw'], on(ALL, [12, 21], wave(1, { n: 2, r: -12 }), wave(1, { t: 0.2, w: 0.8, n: 2, x: 0.5 }))),
  // Italic: the letter leans.
  type: withStates(
    S(
      1,
      [0],
      P(
        3,
        ['write'],
        on(0, [12, 12], ...redraw(1, 0.05, 0.3, 0.1), ramp(2, { q: -12 })),
        on(1, [12, 12], ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.35, w: 0.35, g: 1 }), ramp(2, { q: -12 })),
        on(2, [12, 12], ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.7, w: 0.3, g: 1 }), ramp(2, { q: -12 })),
      ),
    ),
    ['italic'],
  ),
  scissors: P(
    4,
    ['snip'],
    on([0, 2], [12, 11], wave(1, { n: 2, r: -9 }), pulse(1, { t: 0.3, w: 0.7, y: -0.4 })),
    on([1, 3], [12, 11], wave(1, { n: 2, r: 9 }), pulse(1, { t: 0.3, w: 0.7, y: -0.4 })),
  ),
  search: P(
    2,
    ['scan'],
    on(0, [11, 11], wave(1, { n: 1.5, x: 1.4 }), wave(1, { t: 0.2, w: 0.8, n: 1, y: 1 })),
    on(1, wave(1, { n: 1.5, x: 1.4 }), wave(1, { t: 0.2, w: 0.8, n: 1, y: 1 })),
  ),
  settings: simple(P(2, ['turn'], on(0, [12, 12], ramp(1, { r: 45 })), on(1, [12, 12], ramp(1, { r: -45 })))),
  share: S(
    4,
    [3],
    P(
      5,
      ['connect'],
      on(0, [6, 12], pulse(1, { w: 0.4, s: 0.3 })),
      on(1, [18, 6], pulse(1, { t: 0.4, w: 0.4, s: 0.3 })),
      on(2, [18, 18], pulse(1, { t: 0.55, w: 0.4, s: 0.3 })),
      on(3, ...redraw(1, 0.2, 0.3)),
      on(4, ramp(1, { w: 0.12, g: -1 }), ramp(1, { t: 0.4, w: 0.3, g: 1 })),
    ),
  ),
  link: P(
    2,
    ['unlink'],
    on(0, [12, 12], pulse(1, { x: -1.6, y: 1.6 }), wave(1, { n: 1, x: 0.6, y: -0.6 })),
    on(1, [12, 12], pulse(1, { x: 1.6, y: -1.6 }), wave(1, { n: 1, x: -0.6, y: 0.6 })),
  ),
  shield: P(
    2,
    ['guard'],
    on(0, [12, 12], pulse(1, { s: 0.05 })),
    on(
      1,
      [12, 11],
      ramp(1, { w: 0.12, g: -1 }),
      ramp(1, { t: 0.3, w: 0.5, g: 1 }),
      pulse(1, { t: 0.7, w: 0.3, s: 0.25 }),
    ),
  ),
  file: withStates(
    P(2, ['fold'], on(0, pulse(1, { t: 0.2, w: 0.8, s: 0.02 })), on(1, [17, 5.5], wave(1, { n: 2.5, r: 12 }))),
    ['done'],
    [{ d: 'M9 14l2.5 2.5 4.5-5' }],
  ),
  folder: P(1, ['peek'], on(0, [3.5, 19], wave(1, { n: 1, y: -1.2 }), pulse(1, { t: 0.3, w: 0.7, q: -5 }))),
  calendar: S(
    2,
    [1],
    P(
      4,
      ['ring'],
      on(0, [12, 12.75], pulse(1, { t: 0.2, w: 0.8, s: 0.04 })),
      on(2, [12, 12.75], wave(1, { n: 1.5, y: -1.4 })),
      on(3, [12, 12.75], wave(1, { t: 0.12, w: 0.88, n: 1.5, y: -1.4 })),
    ),
  ),
  'map-pin': P(
    2,
    ['drop'],
    on(0, [12, 21], wave(1, { n: 1.5, y: -2.4 })),
    on(1, [12, 10], wave(1, { n: 1.5, y: -2.4 }), pulse(1, { t: 0.5, w: 0.5, s: 0.5 })),
  ),
  cart: P(
    3,
    ['drive'],
    on(0, [12, 19], pulse(1, { x: 1.2 }), wave(1, { n: 1, r: -5 })),
    on(1, pulse(1, { x: 1.2 })),
    on(2, pulse(1, { x: 1.2 })),
  ),
  chat: P(
    4,
    ['type'],
    on(0, [7, 18], pulse(1, { s: 0.03 })),
    on(1, [7, 18], pulse(1, { w: 0.5, y: -1.6 })),
    on(2, [7, 18], pulse(1, { t: 0.18, w: 0.5, y: -1.6 })),
    on(3, [7, 18], pulse(1, { t: 0.36, w: 0.5, y: -1.6 })),
  ),
  // A floppy disk: it presses down, the shutter clicks across, and the label area is written line by line.
  save: P(
    3,
    ['save'],
    on(0, [12, 12], pulse(1, { w: 0.4, y: 0.5, v: -0.03 })),
    on(1, pulse(1, { t: 0.1, w: 0.5, x: 1.4 })),
    on(2, ...redraw(1, 0.3, 0.6, 0.2)),
  ),
  inbox: P(2, ['receive'], on(0, wave(1, { n: 1.5, y: 0.6 })), on(1, wave(1, { t: 0.1, w: 0.9, n: 1.5, y: 1.4 }))),
  // The right page turns over onto the left, then settles back; the left page shifts as the air moves.
  'book-open': P(
    3,
    ['flip'],
    on(0, [12, 12], pulse(1, { t: 0.25, w: 0.75, x: -0.5 })),
    on(1, [12, 12], pulse(1, { h: -1.9 })),
  ),
  copy: withStates(
    P(
      2,
      ['duplicate'],
      on(0, pulse(1, { x: 1, y: 1 })),
      on(1, [12, 12], pulse(1, { x: -1, y: -1 }), wave(1, { n: 1, r: -4 })),
    ),
    ['done'],
    [{ d: 'M12.5 15.5l2 2 3.5-4' }],
  ),
  branch: S(
    4,
    [3],
    P(
      5,
      ['commit'],
      on(0, [6, 6], pulse(1, { w: 0.5, s: 0.22 })),
      on(1, [6, 18], pulse(1, { t: 0.2, w: 0.5, s: 0.22 })),
      on(2, [18, 6], pulse(1, { t: 0.4, w: 0.5, s: 0.22 })),
      on(3, pulse(1, { t: 0.2, w: 0.5, a: -0.3 })),
    ),
  ),
  palette: P(
    4,
    ['dab'],
    on(1, [7.5, 11.5], pulse(1, { w: 0.5, s: 0.9 })),
    on(2, [10.5, 7.5], pulse(1, { t: 0.2, w: 0.5, s: 0.9 })),
    on(3, [15.5, 7.5], pulse(1, { t: 0.4, w: 0.5, s: 0.9 })),
  ),
  power: P(2, ['press'], on(0, pulse(1, { y: 1.4 })), on(1, [12, 12.5], pulse(1, { s: -0.05 }))),
  // One arrow, five directions. Pointing another way is a state: the group around the arrow turns, one quarter per stop, so a
  // direction can be transitioned or animated, and the lunge happens inside the turned frame (a down arrow lunges down).
  arrow: withStates(
    grouped(
      P(
        2,
        ['lunge'],
        on(0, [5, 12], pulse(1, { h: 0.2 }), wave(1, { n: 1, h: -0.1 })),
        on(1, pulse(1, { x: 2.8 }), wave(1, { n: 1, x: -1.4 })),
      ),
      [12, 12],
      ramp(2, { w: 1, r: 90 }),
      ramp(2, { t: 1, w: 1, r: 90 }),
      ramp(2, { t: 2, w: 1, r: 90 }),
      ramp(2, { t: 3, w: 1, r: 45 }),
    ),
    ['down', 'left', 'up', 'up-right'],
    [],
    { 'arrow-right': 'normal' },
  ),
  // One chevron, four directions, turned a quarter per stop. The step-through leaves along whichever way it points.
  chevron: X(
    withStates(
      grouped(
        P(1, ['step'], on(0, ...through(1, 6, 0))),
        [12, 12],
        ramp(2, { w: 1, r: 90 }),
        ramp(2, { t: 1, w: 1, r: 90 }),
        ramp(2, { t: 2, w: 1, r: 90 }),
      ),
      ['down', 'left', 'up'],
      [],
      { 'chevron-right': 'normal' },
    ),
  ),
  // Horizontal or vertical is a state: the dots turn a quarter about the middle one.
  more: withStates(
    grouped(
      P(
        3,
        ['bounce'],
        on(0, [5, 12], pulse(1, { w: 0.5, y: -2.2, s: 1 })),
        on(1, [12, 12], pulse(1, { t: 0.18, w: 0.5, y: -2.2, s: 1 })),
        on(2, [19, 12], pulse(1, { t: 0.36, w: 0.5, y: -2.2, s: 1 })),
      ),
      [12, 12],
      ramp(2, { r: 90 }),
    ),
    ['vertical'],
    [],
    { 'more-horizontal': 'normal' },
  ),
  // Skip forward and skip back are one vector: back mirrors the group, and the nudge turns with it.
  skip: withStates(
    grouped(
      P(
        2,
        ['skip'],
        on(0, pulse(1, { x: 3 }), wave(1, { n: 1, x: -1.2 })),
        on(1, pulse(1, { t: 0.15, w: 0.85, x: 1.4 })),
      ),
      [12, 12],
      ramp(2, { h: -2 }),
    ),
    ['back'],
    [],
    { 'skip-forward': 'normal' },
  ),
  // Trending up or down: down mirrors the whole drawing top to bottom.
  trending: withStates(
    grouped(
      S(
        1,
        [0],
        P(
          2,
          ['rise'],
          on(0, [3, 17], ...redraw(1, 0.1, 0.55)),
          on(1, [3, 17], ramp(1, { w: 0.1, g: -1 }), ramp(1, { t: 0.65, w: 0.35, g: 1 })),
        ),
      ),
      [12, 12],
      ramp(2, { v: -2 }),
    ),
    ['down'],
    [],
    { 'trending-up': 'normal' },
  ),
  // Zoom in becomes zoom out by erasing the vertical bar of the plus.
  zoom: withStates(
    P(
      4,
      ['zoom'],
      on(0, [11, 11], pulse(1, { s: 0.2 })),
      on(1, pulse(1, { x: 1, y: 1 })),
      on(2, [11, 11], ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.3, w: 0.35, g: 1 })),
      on(3, [11, 11], ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.6, w: 0.35, g: 1 }), ramp(2, { g: -1 })),
    ),
    ['out'],
    [],
    { 'zoom-in': 'normal' },
  ),
  // One ring, seven marks. Check, cross, alert, info, plus, minus and help are not seven vectors but seven states of the ring:
  // each mark is drawn in as its state arrives and drawn out as the next takes over. check-circle, x-circle, alert-circle,
  // info, plus-circle, minus-circle and help-circle are all this vector.
  circle: withStates(
    P(1, ['confirm'], on(0, [12, 12], ...redraw(1, 0.12, 0.5), pulse(1, { t: 0.6, w: 0.4, s: 0.06 }))),
    ['check', 'x', 'alert', 'info', 'plus', 'minus', 'help'],
    [
      { d: 'M8 12.5l2.5 2.5 5-5.5', in: 1, out: 2 },
      { d: 'M9 9l6 6', in: 2, out: 3, w: 0.7 },
      { d: 'M15 9l-6 6', in: 2, out: 3, t: 1.3, w: 0.7 },
      { d: 'M12 7.5v5', in: 3, out: 4, w: 0.7 },
      { circle: [12, 16.5, 0.5], in: 3, out: 4, t: 2.4, w: 0.6 },
      { d: 'M12 11v5.5', in: 4, out: 5, w: 0.7 },
      { circle: [12, 7.5, 0.5], in: 4, out: 5, t: 3.4, w: 0.6 },
      { d: 'M12 8v8', in: 5, out: 6, w: 0.7 },
      { d: 'M8 12h8', in: 5, out: 7, t: 4.3, w: 0.7 },
      { d: 'M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.7-2.5 1.9-2.5 3.5', in: 7, w: 0.7 },
      { circle: [12, 17, 0.5], in: 7, t: 6.4, w: 0.6 },
    ],
    {
      'check-circle': 'check',
      'x-circle': 'x',
      'alert-circle': 'alert',
      info: 'info',
      'plus-circle': 'plus',
      'minus-circle': 'minus',
      'help-circle': 'help',
    },
  ),
}

/** Add poses to the table (the table is written in batches). */
function addPoses(more: Record<string, PoseSpec>): void {
  Object.assign(POSES, more)
}

/** Give a vector already in the table a different pose: more states, or a group around it. */
function refine(name: string, change: (spec: PoseSpec) => PoseSpec): void {
  const spec = POSES[name]
  if (!spec) throw new Error(`pose table: nothing to refine for ${name}`)
  POSES[name] = change(spec)
}

/** Replace a vector's pose with a new one. */
function define(name: string, spec: PoseSpec): void {
  POSES[name] = spec
}

// ---- badge families: a thing that can be added to, checked, removed or taken from is one vector with four marks ----
refine('folder', (spec) => withStates(spec, BADGE, marks(12, 14)))
refine('calendar', (spec) => withStates(spec, BADGE, marks(12, 15.25)))
refine('file', (spec) => withStates(spec, BADGE, marks(11.5, 14.5)))
// a user makes room for its mark: the person moves left and a little smaller, then the mark is drawn in beside it
refine('user', (spec) =>
  withStates(grouped(spec, [12, 12], ramp(2, { w: 1, x: -3, s: -0.1 })), BADGE, marks(19, 10, 2)),
)
// ---- anything that can be switched off draws a slash: shield-off, image-off, link-off, bolt-off, music-off, chat-off, monitor-off, headphones-off ----
for (const name of ['shield', 'image', 'link', 'bolt', 'music', 'chat', 'monitor', 'headphones'])
  refine(name, (spec) => withStates(spec, ['off'], [SLASH]))
// ---- more badge families: a bookmark, a bag and a cart can be added to, checked, taken from or emptied of ----
refine('bookmark', (spec) => withStates(spec, BADGE, marks(12, 9.5, 2)))
refine('shopping-bag', (spec) => withStates(spec, BADGE, marks(12, 14.5)))
refine('cart', (spec) => withStates(spec, BADGE, marks(13, 9.5, 2)))
// a broken heart: a crack is drawn down the middle
refine('heart', (spec) => withStates(spec, ['broken'], [{ d: 'M12 7l-1.5 3.5 3 2-2.5 3 1 4.5' }]))
// ---- text alignment is a state: one vector, four alignments ----
// Left is the normal look. The short lines move to the middle, then to the right, then back and stretch to the full width.
define(
  'align',
  withStates(
    P(
      4,
      [],
      on(1, [4, 10], ramp(2, { w: 1, x: 3 }), ramp(2, { t: 1, w: 1, x: 3 }), ramp(2, { t: 2, w: 1, x: -6, h: 0.6 })),
      on(
        3,
        [4, 18],
        ramp(2, { w: 1, x: 4.5 }),
        ramp(2, { t: 1, w: 1, x: 4.5 }),
        ramp(2, { t: 2, w: 1, x: -9, h: 1.286 }),
      ),
    ),
    ['center', 'right', 'justify'],
    [],
    { 'align-left': 'normal' },
  ),
)
// ---- mirrored pairs are one vector: redo is undo, log-in is log-out ----
define(
  'undo',
  withStates(
    grouped(
      P(2, ['turn back'], on(0, ...redraw(1, 0.2, 0.6, 0.2)), on(1, pulse(1, { x: -1.4 }), wave(1, { n: 1, x: 0.8 }))),
      [12, 12],
      ramp(2, { h: -2 }),
    ),
    ['redo'],
  ),
)
define(
  'server',
  withStates(
    P(
      4,
      ['blink'],
      on(2, wave(1, { n: 3, a: -1 })),
      on(3, wave(1, { t: 0.2, w: 0.8, n: 3, a: -1 })),
      on([0, 1], pulse(1, { t: 0.3, w: 0.7, s: 0.01 })),
    ),
    ['off'],
    [SLASH],
  ),
)
refine('log-out', (spec) => withStates(grouped(spec, [12, 12], ramp(2, { h: -2 })), ['in'], [], { 'log-in': 'in' }))
// ---- refresh turns the other way: a state mirrors it ----
refine('refresh', (spec) =>
  withStates(grouped(spec, [12, 12], ramp(2, { h: -2 })), ['reverse'], [], { 'rotate-ccw': 'reverse' }),
)
// ---- sort order is a state: the bars swap lengths ----
// Descending is the normal look (longest first). Ascending shortens the first bar and stretches the last, about their left ends.
define(
  'sort',
  withStates(
    P(
      3,
      ['rank'],
      on(0, [4, 6], ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.15, w: 0.5, g: 1 }), ramp(2, { h: -0.625 })),
      on(1, [4, 12], ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.3, w: 0.5, g: 1 })),
      on(2, [4, 18], ramp(1, { w: 0.15, g: -1 }), ramp(1, { t: 0.45, w: 0.5, g: 1 }), ramp(2, { h: 1.667 })),
    ),
    ['asc'],
    [],
    { 'sort-desc': 'normal' },
  ),
)
// ---- more things that can be switched off ----
for (const name of ['globe', 'map-pin']) refine(name, (spec) => withStates(spec, ['off'], [SLASH]))

// ======================================== status marks and everyday objects ========================================
addPoses({
  info: P(
    3,
    ['pop'],
    on(0, [12, 12], pulse(1, { s: 0.05 })),
    on(1, [12, 16.5], pulse(1, { t: 0.2, w: 0.6, v: -0.2 })),
    on(2, [12, 8], wave(1, { n: 1, y: -1.4 })),
  ),
  help: P(
    3,
    ['ask'],
    on(0, [12, 12], pulse(1, { s: 0.05 })),
    on(1, [12, 13], wave(1, { n: 2, r: 10 })),
    on(2, [12, 17], wave(1, { t: 0.15, w: 0.85, n: 1, y: -1.2 })),
  ),
  'alert-circle': P(
    3,
    ['alert'],
    on(0, [12, 12], pulse(1, { w: 0.4, s: 0.06 }), pulse(1, { t: 0.5, w: 0.4, s: 0.06 })),
    on(1, [12, 12.5], wave(1, { n: 3, r: 8 })),
    on(2, [12, 16.5], wave(1, { n: 3, r: 8 })),
  ),
  ban: P(2, ['forbid'], on(0, [12, 12], pulse(1, { s: 0.05 })), on(1, [12, 12], ...redraw(1, 0.2, 0.7))),
  // Each spoke fades in turn, as a spinner does.
  loader: P(
    8,
    ['spin'],
    ...Array.from({ length: 8 }, (_, k) => on(k, [12, 12], pulse(1, { t: k * 0.09, w: 0.28, a: -0.75 }))),
  ),
  // The hammer draws back and strikes: it swings about the handle's foot and settles.
  hammer: P(2, ['strike'], on(ALL, [4.5, 19.5], pulse(1, { w: 0.5, r: -14 }), pulse(1, { t: 0.45, w: 0.4, r: 8 }))),
  ruler: P(
    5,
    ['measure'],
    on(0, [12, 12], pulse(1, { s: 0.03 })),
    ...[7, 10.5, 14, 17].map((x, k) => on(k + 1, [x, 7.5], ...redraw(1, 0.15 + k * 0.18, 0.25))),
  ),
  calculator: P(
    6,
    ['press'],
    on(1, [12, 7], pulse(1, { t: 0.6, w: 0.4, h: 0.12 })),
    ...(
      [
        [2, 9, 12.5, 0],
        [3, 15, 12.5, 0.2],
        [4, 9, 17, 0.4],
        [5, 15, 17, 0.6],
      ] as const
    ).map(([i, x, y, t]) => on(i, [x, y], pulse(1, { t: t * 0.8, w: 0.25, y: 0.9, s: -0.3 }))),
  ),
  // The hand sweeps a full turn while the button is pressed.
  timer: P(
    4,
    ['run'],
    on(0, [12, 13.5], pulse(1, { t: 0.15, w: 0.8, s: 0.03 })),
    on(1, [12, 3], pulse(1, { w: 0.2, y: 0.9 })),
    on(3, [12, 13.5], ramp(1, { t: 0.15, w: 0.85, r: 360 })),
  ),
  'alarm-clock': P(
    4,
    ['ring'],
    on([0, 1], [12, 13], wave(1, { n: 6, r: 3 }), pulse(1, { t: 0.1, w: 0.9, y: -0.3 })),
    on(2, [4.25, 6.25], wave(1, { n: 6, r: -16 })),
    on(3, [19.75, 6.25], wave(1, { t: 0.06, w: 0.94, n: 6, r: 16 })),
  ),
  // The handle stretches up as if lifted by it.
  briefcase: P(
    3,
    ['carry'],
    on(1, [12, 7.5], pulse(1, { w: 0.6, v: 0.35 }), pulse(1, { t: 0.45, w: 0.55, v: -0.15 })),
    on(0, [12, 20], pulse(1, { t: 0.2, w: 0.6, s: 0.02 })),
  ),
  receipt: P(
    4,
    ['print'],
    on(0, [12, 12], pulse(1, { s: 0.03 })),
    on(1, [9, 8], ...redraw(1, 0.15, 0.3)),
    on(2, [9, 12], ...redraw(1, 0.35, 0.3)),
    on(3, [9, 16], ...redraw(1, 0.55, 0.3)),
  ),
  ticket: P(2, ['wobble'], on(ALL, [12, 12], wave(1, { n: 2.5, r: 8 }), pulse(1, { s: 0.04 }))),
  // The two halves twist apart and close again.
  pill: P(
    2,
    ['open'],
    on(0, [8, 15.5], pulse(1, { w: 0.7, x: -1.4, y: 1.4 }), pulse(1, { t: 0.1, w: 0.8, r: -18 })),
    on(1, [16, 8.5], pulse(1, { w: 0.7, x: 1.4, y: -1.4 }), pulse(1, { t: 0.1, w: 0.8, r: 18 })),
  ),
  dumbbell: P(5, ['lift'], on(ALL, pulse(1, { w: 0.5, y: -3 }), pulse(1, { t: 0.5, w: 0.5, y: -3 }))),
  flask: P(3, ['bubble'], on([0, 1], [12, 19.5], wave(1, { n: 2, r: 3 })), on(2, [12, 16], ...through(1, 0, -2, 0.5))),
  gamepad: P(
    4,
    ['play'],
    on(1, [8, 12.5], pulse(1, { w: 0.4, s: -0.2 })),
    on(2, [14.5, 10.5], pulse(1, { t: 0.3, w: 0.3, y: 0.5, s: 0.6 })),
    on(3, [17.5, 14.5], pulse(1, { t: 0.55, w: 0.3, y: 0.5, s: 0.6 })),
  ),
  mouse: P(
    2,
    ['scroll'],
    on(0, [12, 12], pulse(1, { t: 0.7, w: 0.3, s: 0.03 })),
    on(1, [12, 8], pulse(1, { w: 0.35, y: 1.6 }), pulse(1, { t: 0.35, w: 0.35, y: 1.6 })),
  ),
  speaker: P(
    3,
    ['thump'],
    on(1, [12, 14.5], wave(1, { n: 4, s: 0.12 })),
    on(2, [12, 6.5], wave(1, { n: 6, s: 0.5 })),
    on(0, [12, 12], pulse(1, { s: 0.015 })),
  ),
  tv: P(
    2,
    ['tune'],
    on(1, [12, 7], wave(1, { n: 3, r: 14 })),
    on(0, [12, 13.5], pulse(1, { t: 0.3, w: 0.5, s: 0.025 })),
  ),
  megaphone: P(
    3,
    ['shout'],
    on([0, 1], [9, 12], pulse(1, { w: 0.4, x: -0.7 }), pulse(1, { t: 0.4, w: 0.4, r: -4 })),
    on(2, [19.5, 12], pulse(1, { t: 0.1, w: 0.9, x: 1.8, a: -1 })),
  ),
  banknote: P(
    4,
    ['flip'],
    on([0, 2, 3], [12, 12], wave(1, { n: 2, r: 4 })),
    on(1, [12, 12], wave(1, { n: 2, r: 4 }), pulse(1, { t: 0.2, w: 0.8, h: -2 })),
  ),
  signpost: P(
    3,
    ['swing'],
    on(0, [12, 12], pulse(1, { s: 0.01 })),
    on(1, [12, 6.75], wave(1, { n: 2, h: -0.25 })),
    on(2, [12, 14.75], wave(1, { t: 0.15, w: 0.85, n: 2, h: -0.25 })),
  ),
})

// ======================================== things and symbols, batch 2 ========================================
addPoses({
  // Hung from its ring, the anchor swings.
  anchor: P(4, ['sway'], on(ALL, [12, 5.5], wave(1, { n: 2, r: 9 }), pulse(1, { t: 0.2, w: 0.8, y: 0.5 }))),
  'life-buoy': P(6, ['bob'], on(ALL, [12, 12], wave(1, { n: 2, y: 1.2 }), wave(1, { n: 1.5, r: 7 }))),
  // The bars grow in turn, as a signal does when it connects.
  signal: P(
    4,
    ['connect'],
    ...[5, 10, 15, 20].map((x, k) => on(k, [x, 20], pulse(1, { t: k * 0.1, w: 0.5, v: 0.12 }))),
  ),
  gauge: P(2, ['sweep'], on(0, [12, 14], pulse(1, { s: 0.03 })), on(1, [12, 15.5], wave(1, { n: 1.5, r: 48 }))),
  infinity: P(1, ['trace'], on(0, [12, 12], ...redraw(1, 0.1, 0.8), pulse(1, { t: 0.5, w: 0.5, s: 0.05 }))),
  // The shells turn about the nucleus (the three are alike, so a sixth of a turn lands back on the rest drawing).
  atom: simple(
    P(4, ['orbit'], on([0, 1, 2], [12, 12], ramp(1, { r: 60 })), on(3, [12, 12], pulse(1, { w: 0.5, s: 1.2 }))),
  ),
  'graduation-cap': P(
    3,
    ['toss'],
    on(0, [12, 9], pulse(1, { w: 0.8, y: -1.6 }), pulse(1, { t: 0.1, w: 0.8, r: -14 })),
    on(2, [21.25, 9], wave(1, { n: 2.5, r: 20 })),
  ),
  // The shoot grows: the stem stretches and each leaf opens from where it joins.
  sprout: P(
    4,
    ['grow'],
    on(0, [12, 19.5], pulse(1, { w: 0.6, v: 0.12 })),
    on(1, [12, 12], pulse(1, { t: 0.1, w: 0.7, s: 0.22 })),
    on(2, [12, 10], pulse(1, { t: 0.25, w: 0.7, s: 0.22 })),
  ),
  tree: P(2, ['sway'], on(0, [12, 17], wave(1, { n: 2, r: 5 }), wave(1, { n: 2, s: 0.03 }))),
  snowflake: simple(P(3, ['spin'], on(ALL, [12, 12], ramp(1, { r: 60 }), pulse(1, { s: 0.06 })))),
  // Each stream drifts in turn: air passing.
  wind: P(3, ['blow'], ...[0, 1, 2].map((k) => on(k, wave(1, { t: k * 0.12, w: 0.76, n: 1.5, x: 1.6 })))),
  fish: P(
    3,
    ['swim'],
    on([0, 2], [16, 12], wave(1, { n: 2, q: 4 })),
    on(1, [16, 12], wave(1, { n: 2, r: 10 }), wave(1, { n: 2, h: 0.1 })),
  ),
  utensils: P(
    3,
    ['clink'],
    on([0, 1], [8.5, 21], wave(1, { n: 1.5, r: -7 }), pulse(1, { t: 0.3, w: 0.5, y: -0.4 })),
    on(2, [18.5, 21], wave(1, { n: 1.5, r: 7 }), pulse(1, { t: 0.3, w: 0.5, y: -0.4 })),
  ),
  wine: P(
    3,
    ['swirl'],
    on(0, [12, 12.9], wave(1, { n: 1.5, r: 9 }), pulse(1, { w: 0.5, y: -0.4 })),
    on([1, 2], [12, 20.5], wave(1, { n: 1.5, r: 3 })),
  ),
  // At dawn the sun grows over the horizon and the arrow points up; at dusk it points down.
  sunrise: withStates(
    P(
      3,
      ['rise'],
      on(1, [12, 18.5], pulse(1, { w: 0.7, v: 0.22 })),
      on(2, [12, 7], pulse(1, { t: 0.1, w: 0.8, y: -1.2 }), ramp(2, { v: -2 })),
    ),
    ['set'],
    [],
    { sunset: 'set' },
  ),
  waves: P(3, ['flow'], ...[0, 1, 2].map((k) => on(k, wave(1, { t: k * 0.12, w: 0.76, n: 1.5, x: 1.4 })))),
  navigation: P(1, ['go'], on(0, [12, 12], pulse(1, { w: 0.5, x: 1.6, y: -1.6 }), pulse(1, { t: 0.4, w: 0.6, r: 8 }))),
  // Locked on: the ticks close in on the ring.
  locate: P(
    6,
    ['lock'],
    on(0, [12, 12], pulse(1, { w: 0.6, s: -0.12 })),
    on(1, [12, 6], pulse(1, { w: 0.6, y: 1.4 })),
    on(2, [12, 18], pulse(1, { w: 0.6, y: -1.4 })),
    on(3, [6, 12], pulse(1, { w: 0.6, x: 1.4 })),
    on(4, [18, 12], pulse(1, { w: 0.6, x: -1.4 })),
    on(5, [12, 12], pulse(1, { t: 0.3, w: 0.5, s: 1.0 })),
  ),
  braces: P(
    2,
    ['wrap'],
    on(0, pulse(1, { w: 0.5, x: 1.4 }), pulse(1, { t: 0.45, w: 0.55, x: -0.5 })),
    on(1, pulse(1, { w: 0.5, x: -1.4 }), pulse(1, { t: 0.45, w: 0.55, x: 0.5 })),
  ),
  brackets: P(
    2,
    ['wrap'],
    on(0, pulse(1, { w: 0.5, x: 1.4 }), pulse(1, { t: 0.45, w: 0.55, x: -0.5 })),
    on(1, pulse(1, { w: 0.5, x: -1.4 }), pulse(1, { t: 0.45, w: 0.55, x: 0.5 })),
  ),
})

// ======================================== things and symbols, batch 3 ========================================
const blink = (_k: unknown, t: number): Beat => pulse(1, { t, w: 0.28, a: -1 })
addPoses({
  'git-commit': P(
    3,
    ['commit'],
    on(0, [12, 12], pulse(1, { w: 0.5, s: 0.18 })),
    on(1, [3, 12], ...redraw(1, 0.2, 0.4)),
    on(2, [21, 12], ...redraw(1, 0.35, 0.4)),
  ),
  'git-pull-request': P(
    6,
    ['propose'],
    on(0, [6, 5.5], pulse(1, { w: 0.35, s: 0.2 })),
    on(1, [6, 18.5], pulse(1, { t: 0.15, w: 0.35, s: 0.2 })),
    on(2, [18, 18.5], pulse(1, { t: 0.3, w: 0.35, s: 0.2 })),
    on(3, [6, 8], ...redraw(1, 0.1, 0.35)),
    on(4, [18, 16], ...redraw(1, 0.4, 0.4)),
    on(5, [13, 7], pulse(1, { t: 0.55, w: 0.45, x: -1 })),
  ),
  'hard-drive': P(
    4,
    ['work'],
    on(0, [12, 12], pulse(1, { s: 0.015 })),
    on(2, [7, 16.5], blink(0, 0), blink(0, 0.4)),
    on(3, [11, 16.5], blink(0, 0.2), blink(0, 0.6)),
  ),
  // The tree of links is drawn from the top down, then each node answers.
  network: P(
    5,
    ['link'],
    on(0, [12, 5.5], pulse(1, { w: 0.3, s: 0.12 })),
    on(3, [12, 8], ...redraw(1, 0.1, 0.25)),
    on(4, [12, 12], ...redraw(1, 0.35, 0.4)),
    on(1, [6.5, 18.5], pulse(1, { t: 0.6, w: 0.3, s: 0.12 })),
    on(2, [17.5, 18.5], pulse(1, { t: 0.7, w: 0.3, s: 0.12 })),
  ),
  workflow: P(
    3,
    ['flow'],
    on(0, [6.5, 6.5], pulse(1, { w: 0.35, s: 0.15 })),
    on(2, [6.5, 10], ...redraw(1, 0.15, 0.45)),
    on(1, [17.5, 17.5], pulse(1, { t: 0.6, w: 0.35, s: 0.15 })),
  ),
  rss: P(
    3,
    ['broadcast'],
    on(0, [5.5, 18.5], pulse(1, { w: 0.4, s: 0.6 })),
    on(1, [5, 19], pulse(1, { t: 0.15, w: 0.6, s: 0.1, a: -0.7 })),
    on(2, [5, 19], pulse(1, { t: 0.3, w: 0.7, s: 0.06, a: -0.7 })),
  ),
  radar: P(3, ['scan'], on([0, 1], [12, 12], pulse(1, { w: 0.5, s: 0.02 })), on(2, [12, 12], ramp(1, { r: 360 }))),
  // At night the windows light up and go out in turn.
  building: P(
    6,
    ['lights'],
    on(0, [12, 12], pulse(1, { s: 0.01 })),
    on(1, [9, 8], blink(0, 0.0)),
    on(2, [15, 8], blink(0, 0.2)),
    on(3, [9, 12.5], blink(0, 0.4)),
    on(4, [15, 12.5], blink(0, 0.6)),
    on(5, [12, 21], pulse(1, { t: 0.7, w: 0.3, v: 0.1 })),
  ),
  store: P(
    3,
    ['open'],
    on(0, [12, 4], wave(1, { n: 2, v: 0.1 })),
    on(2, [10, 21], wave(1, { t: 0.2, w: 0.8, n: 1.5, h: -0.5 })),
  ),
  landmark: P(
    6,
    ['rise'],
    on(0, [12, 9], pulse(1, { w: 0.5, s: 0.04 })),
    ...[6, 10, 14, 18].map((x, k) => on(k + 2, [x, 18], ...redraw(1, 0.1 + k * 0.15, 0.3))),
  ),
  tent: P(2, ['flap'], on(0, [12, 20], pulse(1, { w: 0.5, s: 0.03 })), on(1, [12, 20], wave(1, { n: 2, h: -0.45 }))),
  crown: P(2, ['crown'], on(0, [12, 17], pulse(1, { w: 0.6, y: -1.4 }), pulse(1, { t: 0.45, w: 0.55, v: 0.07 }))),
  gem: P(
    4,
    ['glint'],
    on(0, [12, 12], pulse(1, { s: 0.05 })),
    on(1, [12, 9.5], pulse(1, { t: 0.2, w: 0.4, h: 0.06 })),
    on(2, [9.5, 9.5], ...redraw(1, 0.3, 0.35)),
    on(3, [14.5, 9.5], ...redraw(1, 0.45, 0.35)),
  ),
  dice: simple(P(6, ['roll'], on(ALL, [12, 12], ramp(1, { r: 90 }), pulse(1, { s: -0.18 })))),
  bot: P(
    6,
    ['wake'],
    on(0, [12, 14.5], pulse(1, { s: 0.015 })),
    on(1, [12, 9], wave(1, { n: 3, r: 14 })),
    on(2, [12, 9], wave(1, { n: 3, r: 14 })),
    on(3, [9.5, 13.5], pulse(1, { t: 0.3, w: 0.3, v: -0.9 })),
    on(4, [14.5, 13.5], pulse(1, { t: 0.3, w: 0.3, v: -0.9 })),
  ),
  ghost: P(3, ['float'], on([0, 1, 2], [12, 20], wave(1, { n: 2, y: -1.2 }), wave(1, { n: 2, r: 3 }))),
  accessibility: P(
    4,
    ['reach'],
    on(0, [12, 5], pulse(1, { w: 0.5, y: -0.6 })),
    on(1, [12, 10], pulse(1, { t: 0.1, w: 0.6, y: -1.2 }), pulse(1, { t: 0.1, w: 0.6, v: -0.3 })),
    on(2, [12, 14], pulse(1, { t: 0.2, w: 0.5, v: 0.1 })),
  ),
})

// ======================================== things and symbols, batch 4 ========================================
addPoses({
  // The corner peels back and settles.
  'sticky-note': P(
    2,
    ['peel'],
    on(0, [12, 12], pulse(1, { s: 0.015 })),
    on(1, [17.5, 17.5], pulse(1, { w: 0.7, x: 0.7, y: 0.7 }), pulse(1, { t: 0.3, w: 0.6, s: 0.1 })),
  ),
  // The lamp flashes: the rays go out and come back in turn.
  siren: P(
    5,
    ['flash'],
    on(0, [12, 20], pulse(1, { w: 0.5, v: 0.04 })),
    on(2, [12, 5], blink(0, 0.0), blink(0, 0.5)),
    on(3, [5.25, 7.75], blink(0, 0.2), blink(0, 0.7)),
    on(4, [18.75, 7.75], blink(0, 0.2), blink(0, 0.7)),
  ),
  'traffic-cone': P(
    3,
    ['wobble'],
    on([0, 2], [12, 18], wave(1, { n: 3, r: 6 }), pulse(1, { t: 0.2, w: 0.6, v: -0.04 })),
  ),
  cast: P(
    4,
    ['cast'],
    on(0, [12, 12], pulse(1, { s: 0.015 })),
    on(1, [3, 21], pulse(1, { t: 0.1, w: 0.7, s: 0.1, a: -0.7 })),
    on(2, [3, 21], pulse(1, { w: 0.6, s: 0.12, a: -0.7 })),
    on(3, [3.5, 20.5], pulse(1, { w: 0.4, s: 0.8 })),
  ),
  // The film advances one frame: the perforations leave and the next ones arrive.
  film: P(
    5,
    ['advance'],
    on(0, [12, 12], pulse(1, { s: 0.01 })),
    on(3, ...through(1, 0, 4.5, 0.5)),
    on(4, ...through(1, 0, 4.5, 0.5)),
  ),
  disc: P(3, ['spin'], on(0, [12, 12], pulse(1, { w: 0.4, s: 0.015 })), on(2, [12, 12], ramp(1, { r: 360 }))),
  presentation: P(4, ['present'], on(0, [12, 9.5], pulse(1, { s: 0.02 })), on(3, [8, 11.5], ...redraw(1, 0.15, 0.6))),
  route: P(
    3,
    ['route'],
    on(0, [6, 19], pulse(1, { w: 0.35, s: 0.3 })),
    on(2, [12, 12], ...redraw(1, 0.1, 0.6)),
    on(1, [18, 5], pulse(1, { t: 0.65, w: 0.35, s: 0.3 })),
  ),
  // Turned up, then back.
  knob: P(2, ['turn'], on(0, [12, 12], pulse(1, { s: 0.02 })), on(1, [12, 12], pulse(1, { w: 1, r: 110 }))),
  metronome: P(3, ['tick'], on(0, [12, 21], pulse(1, { s: 0.01 })), on([1, 2], [12, 17], wave(1, { n: 2, r: 32 }))),
  rainbow: P(
    3,
    ['arc'],
    on(0, [12, 16.5], pulse(1, { w: 0.5, s: 0.1 })),
    on(1, [12, 16.5], pulse(1, { t: 0.15, w: 0.5, s: 0.14 })),
    on(2, [12, 16.5], pulse(1, { t: 0.3, w: 0.5, s: 0.3 })),
  ),
  tornado: P(
    5,
    ['spin'],
    ...[0, 1, 2, 3, 4].map((k) => on(k, wave(1, { t: k * 0.06, w: 0.76, n: 1.5, x: k % 2 ? -1.2 : 1.2 }))),
  ),
  'paint-roller': P(3, ['paint'], on(ALL, wave(1, { n: 1, x: 1.8 }), pulse(1, { t: 0.2, w: 0.6, y: 0.5 }))),
  webcam: P(
    4,
    ['focus'],
    on(0, [12, 9.5], pulse(1, { w: 0.4, s: 0.03 })),
    on(1, [12, 9.5], pulse(1, { t: 0.2, w: 0.3, s: 0.5 }), pulse(1, { t: 0.55, w: 0.3, s: 0.4 })),
  ),
  watch: P(4, ['tick'], on(0, [12, 12], pulse(1, { w: 0.4, s: 0.02 })), on(3, [12, 12], ramp(1, { r: 360 }))),
  'radio-tower': P(
    6,
    ['broadcast'],
    on(0, [12, 9], pulse(1, { w: 0.4, s: 0.8 })),
    on(1, [12, 9], pulse(1, { t: 0.1, w: 0.6, s: 0.1, a: -0.7 })),
    on(2, [12, 9], pulse(1, { t: 0.1, w: 0.6, s: 0.1, a: -0.7 })),
    on(3, [12, 9], pulse(1, { t: 0.3, w: 0.7, s: 0.06, a: -0.7 })),
    on(4, [12, 9], pulse(1, { t: 0.3, w: 0.7, s: 0.06, a: -0.7 })),
  ),
  'dollar-sign': P(
    2,
    ['earn'],
    on(0, [12, 12], pulse(1, { w: 0.5, v: 0.06 })),
    on(1, [12, 12], ...redraw(1, 0.1, 0.8)),
  ),
  // Equal, and not equal: a slash is drawn across.
  equal: withStates(
    P(
      2,
      ['balance'],
      on(0, [12, 9], wave(1, { n: 1.5, y: -0.8 }), pulse(1, { t: 0.3, w: 0.5, h: 0.08 })),
      on(1, [12, 15], wave(1, { n: 1.5, y: 0.8 })),
    ),
    ['not'],
    ['M17.5 4L6.5 20'],
    { 'not-equal': 'not' },
  ),
})

// ======================================== things and symbols, batch 5 ========================================
addPoses({
  asterisk: simple(P(3, ['spin'], on(ALL, [12, 12], ramp(1, { r: 60 }), pulse(1, { s: 0.06 })))),
  // The popper goes off: the cone jolts and the confetti flies out, fading.
  'party-popper': P(
    5,
    ['pop'],
    on(0, [3.5, 20.5], pulse(1, { w: 0.4, s: 0.06 })),
    on(1, [13, 4.75], pulse(1, { t: 0.1, w: 0.8, y: -1.4, a: -1 })),
    on(2, [19.75, 9.5], pulse(1, { t: 0.1, w: 0.8, x: 1.4, a: -1 })),
    on(3, [17.5, 6], pulse(1, { t: 0.2, w: 0.7, x: 0.9, y: -0.9, a: -1 })),
    on(4, [20.5, 19], pulse(1, { t: 0.2, w: 0.7, x: 0.9, y: 0.9, a: -1 })),
  ),
  balloon: P(
    2,
    ['float'],
    on(0, [12, 9.5], wave(1, { n: 2, y: -1.2 }), wave(1, { n: 2, r: 3 })),
    on(1, [12, 16], wave(1, { n: 2, y: -1.2 }), wave(1, { n: 2, r: 10 })),
  ),
  bed: P(
    4,
    ['plump'],
    on(0, [3.5, 12], pulse(1, { s: 0.01 })),
    on(2, [9, 12.25], pulse(1, { w: 0.5, s: 0.2 })),
    on(3, [17.5, 17], pulse(1, { t: 0.3, w: 0.6, v: 0.1 })),
  ),
  'paw-print': P(
    5,
    ['step'],
    ...(
      [
        [5, 10.5],
        [9, 6],
        [15, 6],
        [19, 10.5],
      ] as const
    ).map(([x, y], k) => on(k, [x, y], pulse(1, { t: k * 0.12, w: 0.35, y: -1.2, s: 0.3 }))),
    on(4, [12, 17.5], pulse(1, { t: 0.5, w: 0.4, s: 0.06 })),
  ),
  'id-card': P(
    4,
    ['scan'],
    on(0, [12, 12], pulse(1, { s: 0.015 })),
    on(1, [8.5, 12], pulse(1, { t: 0.1, w: 0.5, s: 0.1 })),
    on(2, [14, 10.5], ...redraw(1, 0.3, 0.3)),
    on(3, [14, 14], ...redraw(1, 0.5, 0.3)),
  ),
  sailboat: P(
    4,
    ['sail'],
    on([0, 3], [12, 21], wave(1, { n: 2, r: 4 })),
    on([1, 2], [12, 21], wave(1, { n: 2, r: 4 }), wave(1, { n: 2, h: 0.1 })),
  ),
  train: P(
    6,
    ['rumble'],
    on([0, 1], [12, 11], wave(1, { n: 4, y: 0.25 })),
    on(2, [8.5, 14.5], wave(1, { n: 4, y: 0.25 }), blink(0, 0.0)),
    on(3, [15.5, 14.5], wave(1, { n: 4, y: 0.25 }), blink(0, 0.4)),
  ),
  car: P(
    6,
    ['idle'],
    on([0, 1], [12, 13], wave(1, { n: 3, y: 0.3 })),
    on(2, [7, 13.5], wave(1, { n: 3, y: 0.3 }), blink(0, 0.0)),
    on(3, [17, 13.5], wave(1, { n: 3, y: 0.3 }), blink(0, 0.4)),
  ),
  candle: P(
    2,
    ['flicker'],
    on(0, [12, 9.4], wave(1, { n: 3, q: 6 }), wave(1, { n: 2.5, v: 0.08 })),
    on(1, [12, 21], pulse(1, { w: 0.5, s: 0.005 })),
  ),
  cherry: P(4, ['swing'], on(ALL, [14.5, 3.5], wave(1, { n: 2, r: 6 }), wave(1, { t: 0.1, w: 0.9, n: 2, y: 0.4 }))),
  mushroom: P(
    4,
    ['pop'],
    on(0, [12, 12], pulse(1, { w: 0.6, v: 0.12 }), pulse(1, { t: 0.1, w: 0.5, h: 0.04 })),
    on(1, [12, 12], pulse(1, { w: 0.6, y: -0.5 })),
    on(2, [8.5, 8.5], pulse(1, { t: 0.2, w: 0.4, s: 0.6 })),
    on(3, [15.5, 8.5], pulse(1, { t: 0.35, w: 0.4, s: 0.6 })),
  ),
  barcode: P(5, ['scan'], ...[4.5, 7.5, 12, 15, 19.5].map((x, k) => on(k, [x, 12], ...redraw(1, 0.1 + k * 0.14, 0.3)))),
  'text-cursor': P(3, ['blink'], on(ALL, pulse(1, { w: 0.4, a: -1 }), pulse(1, { t: 0.5, w: 0.4, a: -1 }))),
  return: P(
    2,
    ['enter'],
    on(0, [12, 13], pulse(1, { w: 0.5, x: -1.4 })),
    on(1, [5, 13], pulse(1, { w: 0.5, x: -1.4 }), pulse(1, { t: 0.3, w: 0.6, s: 0.1 })),
  ),
  backspace: P(
    2,
    ['delete'],
    on(0, [12, 12], pulse(1, { w: 0.5, x: -1.0 })),
    on(1, [15, 12], pulse(1, { w: 0.5, x: -1.0 }), pulse(1, { t: 0.2, w: 0.6, s: 0.3 })),
  ),
})

// ======================================== things and symbols, batch 6 ========================================
addPoses({
  shirt: P(1, ['flutter'], on(0, [12, 3], wave(1, { n: 2, q: 3 }), wave(1, { n: 2, v: 0.03 }))),
  sigma: P(1, ['sum'], on(0, [12, 12], ...redraw(1, 0.1, 0.8), pulse(1, { t: 0.5, w: 0.5, s: 0.04 }))),
  // The beam tips one way and settles; the pans hang from its ends.
  scale: P(
    5,
    ['weigh'],
    on(2, [12, 7.5], wave(1, { n: 1.5, r: 8 })),
    on(3, [6, 7.5], wave(1, { n: 1.5, y: -0.9 })),
    on(4, [18, 7.5], wave(1, { n: 1.5, y: 0.9 })),
  ),
  flower: P(
    4,
    ['bloom'],
    on(0, [12, 13], pulse(1, { w: 0.7, v: 0.12 }), pulse(1, { t: 0.15, w: 0.6, h: 0.1 })),
    on(2, [12, 19], pulse(1, { t: 0.2, w: 0.6, r: -10 })),
    on(3, [12, 19], pulse(1, { t: 0.2, w: 0.6, r: 10 })),
  ),
  sofa: P(
    4,
    ['sit'],
    on(0, [12, 9.5], pulse(1, { w: 0.5, y: 0.5 })),
    on(1, [12, 15.5], pulse(1, { w: 0.5, v: -0.15 })),
  ),
  notebook: P(
    4,
    ['write'],
    on(0, [13, 12], pulse(1, { s: 0.015 })),
    on(1, [6, 12], pulse(1, { t: 0.1, w: 0.4, s: 0.08 })),
    on(2, [12, 8], ...redraw(1, 0.2, 0.35)),
    on(3, [12, 12], ...redraw(1, 0.5, 0.35)),
  ),
})

// the batches: one file each, listed by a generated index
addPoses(batchPoses)
