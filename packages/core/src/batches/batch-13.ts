import { ALL, P, type PoseSpec, pop, press, rattle, stagger, swing } from '../poses/dsl.ts'
import { path, pline, poly, R, type Recipe, rect } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  'watering-can': (p) => [
    rect(5, 9, 11, 9, R(2.5, p, 3)),
    path('M16 14l4.5-5.5'),
    pline(
      [
        [8, 9],
        [8, 5.5],
        [13, 5.5],
        [13, 9],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
  ],
  stool: (p) => [
    rect(5, 4.5, 14, 3.5, R(1.75, p, 1.75)),
    path('M7.5 8L6 19.5'),
    path('M16.5 8L18 19.5'),
    path('M6.78 13.5h10.44'),
  ],
  hydrant: (p) => [
    rect(8, 8, 8, 12, R(2, p, 2.5)),
    pline(
      [
        [10, 8],
        [10, 4],
        [14, 4],
        [14, 8],
      ],
      [0, 2, 2, 0],
      p,
    ),
    path('M8 12H5.5'),
    path('M16 12h2.5'),
    path('M6.5 20h11'),
  ],
  fence: () => [
    path('M3 20V7l2-2 2 2v13z'),
    path('M10 20V7l2-2 2 2v13z'),
    path('M17 20V7l2-2 2 2v13z'),
    path('M3 11h18'),
    path('M3 16h18'),
  ],
  shovel: (p) => [
    path('M9 3.5h6M12 3.5V12'),
    poly(
      [
        [8, 12],
        [16, 12],
        [15, 18],
        [12, 21],
        [9, 18],
      ],
      [1, 1, 1, 1.5, 1],
      p,
    ),
  ],
  rake: () => [path('M12 4V14'), path('M6 14h12'), path('M6 14v6M9 14v6M12 14v6M15 14v6M18 14v6')],
}

export const poses: Record<string, PoseSpec> = {
  'watering-can': P(3, ['pour'], swing(ALL, [12, 18], 6)),
  stool: P(4, ['wobble'], rattle(ALL, [12, 21], 0.8)),
  hydrant: P(5, ['spout'], pop(1, [12, 5.5], 0.12)),
  fence: P(5, ['rattle'], ...stagger([0, 1, 2], { y: -0.9 })),
  shovel: P(2, ['dig'], press(ALL, [12, 21], 1.5)),
  rake: P(3, ['rake'], swing(ALL, [12, 4], 6)),
}
