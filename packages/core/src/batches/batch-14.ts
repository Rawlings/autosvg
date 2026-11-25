import { ALL, flicker, lift, P, type PoseSpec, press, rattle, stagger, swing } from '../poses/dsl.ts'
import { dot, path, pline, poly, R, type Recipe, rect, round } from '../recipe-kit.ts'

// Industry vectors drawn from PriceRunner's categories (see STRUCTURE.md): the objects a shop sells.

export const recipes: Record<string, Recipe> = {
  // a low box with two aerials and two lamps; ink spans y 5 to 19, centred on 12
  router: (p) => [rect(3, 12, 18, 7, R(2, p, 3)), path('M7 12V5'), path('M17 12V5'), dot(7, 15.5), dot(11, 15.5)],
  // a card with one corner cut, and the contact chip
  'sim-card': (p) => [
    poly(
      [
        [6, 3],
        [13, 3],
        [18, 8],
        [18, 21],
        [6, 21],
      ],
      [1.5, 0, 1.5, 1.5, 1.5],
      p,
    ),
    rect(9, 12, 6, 5, R(1, p, 1)),
  ],
  // a plinth with the record, its spindle and the tonearm
  turntable: (p) => [rect(3, 5, 18, 14, R(2, p, 3)), round(10, 12, 4, p), dot(10, 12), path('M17.5 7.5L16 15.5')],
  // a camera head on three legs, all meeting under it
  tripod: (p) => [
    rect(8.5, 3.5, 7, 4.5, R(1.5, p, 2)),
    path('M12 8L5.5 20.5'),
    path('M12 8L18.5 20.5'),
    path('M12 8V20.5'),
  ],
  // a case with a handle, two straps that run on as feet
  suitcase: (p) => [
    rect(4, 6.5, 16, 12, R(2, p, 3)),
    pline(
      [
        [10, 6.5],
        [10, 3.5],
        [14, 3.5],
        [14, 6.5],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
    path('M7.5 6.5V20.5'),
    path('M16.5 6.5V20.5'),
  ],
  // the rim, the basin, a tap and its drop
  sink: (p) => [
    path('M3 12h18'),
    path('M3 12v2a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5v-2'),
    pline(
      [
        [7, 12],
        [7, 5.5],
        [11, 5.5],
      ],
      [0, 1.5, 0],
      p,
    ),
    dot(11, 8.5),
  ],
  // a panel with three fins and two feet
  radiator: (p) => [
    rect(4, 4, 16, 14, R(2, p, 3)),
    path('M8.5 7.5v7'),
    path('M12 7.5v7'),
    path('M15.5 7.5v7'),
    path('M7.5 18v2'),
    path('M16.5 18v2'),
  ],
  // a bowl on two legs, heat rising from it
  barbecue: () => [
    path('M3 9h18'),
    path('M4.5 9a7.5 7.5 0 0 0 15 0'),
    path('M9.5 16.07L8 21'),
    path('M14.5 16.07L16 21'),
    path('M8 3v3'),
    path('M12 3v3'),
    path('M16 3v3'),
  ],
  // one jigsaw piece: a knob out at the top and bottom, a notch in at the sides
  puzzle: () => [path('M5 5h5a2 2 0 0 1 4 0h5v5a2 2 0 0 0 0 4v5h-5a2 2 0 0 1-4 0H5v-5a2 2 0 0 0 0-4z')],
  // a flask with a cap, a neck and a faceted label
  perfume: (p) => [
    rect(6, 9, 12, 12, R(2, p, 3)),
    path('M10 9V6M14 9V6'),
    rect(8.5, 3, 7, 3, R(1, p, 1.5)),
    path('M12 13l2.5 2.5L12 18l-2.5-2.5z'),
  ],
  // the tube and the angled stick that rises from it
  lipstick: (p) => [rect(7, 12, 10, 9, R(1.5, p, 1.5)), path('M9 12V6l6-3V12')],
  // the housing, the bit through its chuck, and the handle
  drill: (p) => [rect(3, 5, 13, 7, R(2, p, 3)), path('M16 8.5h5'), path('M19 6.5v4'), path('M6 12l1 7.5h4L12 12')],
  // a pump with its window, and the hose and nozzle
  'fuel-pump': (p) => [
    rect(3, 3.5, 10, 17, R(2, p, 3)),
    rect(6, 6.5, 4, 3.5, R(1, p, 1)),
    path('M13 8h3a2 2 0 0 1 2 2v7.5a1.5 1.5 0 0 0 3 0V8l-2-2.5'),
  ],
  // two wheels, a diamond frame, a saddle and bars
  bicycle: (p) => [
    round(6.5, 15.5, 3.5, p),
    round(17.5, 15.5, 3.5, p),
    path('M6.5 15.5L10 8.5h5.5l2 7'),
    path('M6.5 15.5h5L15.5 8.5'),
    path('M10 8.5V7M8.5 7h3'),
    path('M15.5 8.5V6h2'),
  ],
}

export const poses: Record<string, PoseSpec> = {
  router: P(5, ['blink'], flicker([3, 4], [9, 15.5])),
  'sim-card': P(2, ['insert'], press(ALL, [12, 21], 1.5)),
  turntable: P(4, ['play'], swing(3, [17.5, 8], 8)),
  tripod: P(4, ['set up'], swing(1, [12, 8], -4), swing(2, [12, 8], 4)),
  suitcase: P(4, ['roll'], rattle(ALL, [12, 20.5], 0.9)),
  sink: P(4, ['drip'], press(3, [11, 8.5], 2.5)),
  radiator: P(6, ['heat'], ...stagger([1, 2, 3], { y: -0.9 })),
  barbecue: P(7, ['sizzle'], flicker([4, 5, 6], [12, 6])),
  puzzle: P(1, ['fit'], swing(ALL, [12, 12], 6)),
  perfume: P(4, ['spritz'], press(2, [12, 4.5], 1.2)),
  lipstick: P(2, ['twist up'], lift(1, [12, 12], 1.5)),
  drill: P(4, ['drill'], rattle(ALL, [12, 9], 0.8)),
  'fuel-pump': P(3, ['fill'], swing(2, [13, 8], 5)),
  bicycle: P(6, ['ride'], rattle(ALL, [12, 19], 0.6)),
}
