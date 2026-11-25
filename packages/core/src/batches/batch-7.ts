// Batch 7: twenty everyday objects (a magnet, glasses, a plug ... an apple).
// A batch is one file with its recipes and its poses together, so adding icons never touches the long tables.
import { superPoint } from '../geo.ts'
import { ALL, on, P, type PoseSpec, pulse, ramp, redraw, simple, wave } from '../poses/dsl.ts'
import { dot, ellipse, exponent, n, path, pline, poly, R, type Recipe, rect, round } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  // a horseshoe: the outer and inner U share a centre, so the legs stay parallel at any radius; the pole tips are the bars
  magnet: (p) => [
    pline(
      [
        [4.5, 20.5],
        [4.5, 3.5],
        [19.5, 3.5],
        [19.5, 20.5],
      ],
      [0, 7.5, 7.5, 0],
      p,
    ),
    pline(
      [
        [9, 20.5],
        [9, 8],
        [15, 8],
        [15, 20.5],
      ],
      [0, 3, 3, 0],
      p,
    ),
    path('M4.5 16.5H9'),
    path('M15 16.5h4.5'),
  ],
  // two lenses and a bridge; the bridge starts on the lens outlines whatever the curve setting
  glasses: (p) => {
    const e = exponent(p)
    const a = superPoint(7, 12, 4, e, 4, -0.5)
    const b = superPoint(17, 12, 4, e, -4, -0.5)
    const rr = Math.max(1.6, (b[0] - a[0]) / 2)
    return [
      round(7, 12, 4, p),
      round(17, 12, 4, p),
      path(`M${n(a[0])} ${n(a[1])}A${n(rr)} ${n(rr)} 0 0 1 ${n(b[0])} ${n(b[1])}`),
    ]
  },
  // a vane along the diagonal with the quill running out of its base; the barb runs from the quill to a point on the lower edge, so it is joined at both ends
  feather: () => [
    path('M5.5 18.5C4.5 11 9 5 19.5 4.5C19 14.5 12.5 19.5 5.5 18.5z'),
    path('M3.5 20.5L14.5 9.5'),
    path('M10 14H16.37'),
  ],
  plug: (p) => [path('M9 3v4.5'), path('M15 3v4.5'), rect(6, 7.5, 12, 7, R(2.5, p, 3.5)), path('M12 14.5V21')],
  // the snow line starts and ends on the big peak's two slopes
  mountain: (p) => [
    poly(
      [
        [3, 19],
        [9.5, 4.5],
        [14, 13.5],
        [16.5, 9.5],
        [21, 19],
      ],
      [1, 1, 1, 1, 1],
      p,
    ),
    path('M6.81 10.5L9.5 13l3-2.5'),
  ],
  tablet: (p) => [rect(5, 3, 14, 18, R(2.5, p, 3.5)), path('M10.5 17.5h3')],
  flashlight: (p) => [
    poly(
      [
        [6.5, 3],
        [17.5, 3],
        [15.5, 8.5],
        [8.5, 8.5],
      ],
      [1.5, 1.5, 1.5, 1.5],
      p,
    ),
    rect(8.5, 8.5, 7, 12.5, R(1.5, p, 3)),
    path('M12 12.5v3'),
  ],
  hexagon: (p) => [
    poly(
      [
        [12, 3],
        [19.8, 7.5],
        [19.8, 16.5],
        [12, 21],
        [4.2, 16.5],
        [4.2, 7.5],
      ],
      [2, 2, 2, 2, 2, 2],
      p,
    ),
  ],
  triangle: (p) => [
    poly(
      [
        [12, 3.5],
        [21, 19.5],
        [3, 19.5],
      ],
      [1, 1, 1],
      p,
    ),
  ],
  diamond: (p) => [
    poly(
      [
        [12, 3],
        [19.5, 12],
        [12, 21],
        [4.5, 12],
      ],
      [1.5, 1.5, 1.5, 1.5],
      p,
    ),
  ],
  lamp: (p) => [
    poly(
      [
        [8, 3.5],
        [16, 3.5],
        [19, 11],
        [5, 11],
      ],
      [1, 1, 1, 1],
      p,
    ),
    path('M12 11v9.5'),
    path('M8 20.5h8'),
  ],
  stamp: (p) => [
    pline(
      [
        [9.5, 11],
        [9.5, 3.5],
        [14.5, 3.5],
        [14.5, 11],
      ],
      [0, 2.5, 2.5, 0],
      p,
    ),
    rect(4.5, 11, 15, 5.5, R(1.5, p, 2.5)),
    path('M3.5 20.5h17'),
  ],
  jar: (p) => [
    rect(7, 3, 10, 3.5, R(1.25, p, 1.75)),
    pline(
      [
        [8, 6.5],
        [8, 8.5],
        [5.5, 11],
        [5.5, 21],
        [18.5, 21],
        [18.5, 11],
        [16, 8.5],
        [16, 6.5],
      ],
      [0, 1, 1, 2, 2, 1, 1, 0],
      p,
    ),
    path('M9 15h6'),
  ],
  egg: () => [path('M12 3.5C7.8 3.5 5.5 10 5.5 14.25A6.5 6.5 0 0 0 18.5 14.25C18.5 10 16.2 3.5 12 3.5z')],
  // three finder squares with their eyes, and a little data in the fourth corner
  'qr-code': (p) => {
    const r = R(1.5, p, 2)
    return [
      rect(3, 3, 7, 7, r),
      rect(14, 3, 7, 7, r),
      rect(3, 14, 7, 7, r),
      dot(6.5, 6.5),
      dot(17.5, 6.5),
      dot(6.5, 17.5),
      path('M14 14h3M21 14v3.5M14 21v-3.5M17.5 17.5H21M17.5 21H21'),
    ]
  },
  // the handle's feet sit exactly on the rim's ellipse
  bucket: (p) => [
    path('M6 6.85C6.5 1.4 17.5 1.4 18 6.85'),
    ellipse(12, 8.5, 8, 2.5),
    pline(
      [
        [4, 8.5],
        [6.5, 20.5],
        [17.5, 20.5],
        [20, 8.5],
      ],
      [0, 2, 2, 0],
      p,
    ),
  ],
  // the ridge lines start on the dome, whose arc is a true half circle
  'hard-hat': (p) => [
    path('M4.75 16v-3a7.25 7.25 0 0 1 14.5 0v3'),
    rect(3, 16, 18, 3.5, R(1.75, p, 1.75)),
    path('M9.25 6.29V16'),
    path('M14.75 6.29V16'),
  ],
  cake: (p) => [
    rect(4.5, 11.5, 15, 8.5, R(2, p, 3)),
    path('M4.5 15a1.9 1.9 0 0 0 3.75 0 1.9 1.9 0 0 0 3.75 0 1.9 1.9 0 0 0 3.75 0 1.9 1.9 0 0 0 3.75 0'),
    path('M12 11.5V9'),
    dot(12, 5),
  ],
  // the handle's feet, the zip and the pocket all end on the straight part of the body's walls at any radius
  backpack: (p) => [
    path('M9.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2'),
    rect(5, 7.5, 14, 13.5, R(3, p, 4)),
    pline(
      [
        [9, 21],
        [9, 15],
        [15, 15],
        [15, 21],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
    path('M5 11.5h14'),
  ],
  apple: () => [
    path(
      'M12 7.5C9.5 6.7 4.5 6 4.5 12C4.5 17 8 21 10 21C11 21 11.5 20.5 12 20.5C12.5 20.5 13 21 14 21C16 21 19.5 17 19.5 12C19.5 6 14.5 6.7 12 7.5z',
    ),
    path('M12 7.5C12 5 13 3.5 15 3'),
  ],
}

export const poses: Record<string, PoseSpec> = {
  magnet: P(4, ['attract'], on(ALL, [12, 20.5], wave(1, { n: 2, r: 6 }), pulse(1, { w: 0.5, y: -0.6 }))),
  glasses: P(
    3,
    ['adjust'],
    on(ALL, [12, 12], pulse(1, { w: 0.5, y: -1.2 }), wave(1, { t: 0.2, w: 0.8, n: 1.5, r: -3 })),
  ),
  feather: P(3, ['float'], on(ALL, [12, 12], wave(1, { n: 2, r: 7 }), pulse(1, { w: 0.6, y: -0.8, x: 0.4 }))),
  // the whole plug moves together, so the cable stays attached: it draws back, then pushes in
  plug: P(4, ['plug in'], on(ALL, pulse(1, { w: 0.4, y: -1.2 }), pulse(1, { t: 0.4, w: 0.5, y: 0.6 }))),
  // the peaks grow from the ground; the snow line is drawn again as they settle
  mountain: P(
    2,
    ['rise'],
    on(ALL, [12, 19], pulse(1, { w: 0.6, v: 0.08 })),
    on(1, [12, 19], ...redraw(1, 0.2, 0.6, 0.2)),
  ),
  tablet: P(2, ['tilt'], on(ALL, [12, 12], wave(1, { n: 2, r: 8 }), pulse(1, { w: 0.5, s: 0.04 }))),
  flashlight: P(3, ['flicker'], on(0, wave(1, { n: 3, a: -0.6 })), on(2, pulse(1, { w: 0.35, y: 1.25 }))),
  hexagon: simple(P(1, ['turn'], on(0, [12, 12], ramp(1, { r: 60 })))),
  triangle: P(1, ['point'], on(0, [12, 19.5], pulse(1, { w: 0.5, v: 0.1 }), wave(1, { t: 0.3, w: 0.7, n: 2, r: 4 }))),
  diamond: P(1, ['sparkle'], on(0, [12, 12], pulse(1, { w: 0.6, s: 0.1 }), wave(1, { t: 0.2, w: 0.8, n: 2, r: 6 }))),
  lamp: P(3, ['sway'], on(ALL, [12, 20.5], wave(1, { n: 2, r: 4 }), pulse(1, { w: 0.5, v: 0.03 }))),
  stamp: P(
    3,
    ['press'],
    on([0, 1], pulse(1, { w: 0.5, y: 2.5 })),
    on(2, [12, 20.5], pulse(1, { t: 0.35, w: 0.5, h: 0.08 })),
  ),
  jar: P(3, ['open'], on(0, [12, 6.5], wave(1, { n: 2, r: 5 }), pulse(1, { w: 0.5, y: -0.5 }))),
  egg: P(1, ['wobble'], on(0, [12, 20.75], wave(1, { n: 2, r: 6 }), pulse(1, { w: 0.5, v: -0.05 }))),
  // the finders blink in turn, then the data: a scan
  'qr-code': P(
    7,
    ['scan'],
    on([0, 3], [6.5, 6.5], pulse(1, { w: 0.4, s: 0.12 })),
    on([1, 4], [17.5, 6.5], pulse(1, { t: 0.2, w: 0.4, s: 0.12 })),
    on([2, 5], [6.5, 17.5], pulse(1, { t: 0.4, w: 0.4, s: 0.12 })),
    on(6, [17.5, 17.5], pulse(1, { t: 0.6, w: 0.4, s: 0.12 })),
  ),
  bucket: P(3, ['lift'], on(0, [12, 6.85], pulse(1, { w: 0.5, y: -0.8 }), pulse(1, { t: 0.4, w: 0.6, v: 0.08 }))),
  'hard-hat': P(4, ['tip'], on([0, 2, 3], pulse(1, { w: 0.5, y: -1 }), pulse(1, { t: 0.45, w: 0.55, y: 0.5 }))),
  cake: P(4, ['flicker'], on(3, [12, 5], wave(1, { n: 3, y: -0.4, x: 0.3 }), pulse(1, { w: 0.8, s: 0.25 }))),
  backpack: P(4, ['swing'], on(ALL, [12, 3], wave(1, { n: 2, r: 4 }), pulse(1, { w: 0.5, y: 0.5 }))),
  apple: P(2, ['wobble'], on(1, [12, 7.5], wave(1, { n: 2, r: 14 }), pulse(1, { w: 0.6, x: 0.5 }))),
}
