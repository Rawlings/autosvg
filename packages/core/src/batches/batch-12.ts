// Batch 12: eight household objects, drafted after a concept check (revised draft-first protocol).
import { ALL, lift, P, type PoseSpec, rattle, swing } from '../poses/dsl.ts'
import { path, pline, poly, R, type Recipe, rect, round } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  kettle: (p) => [rect(4, 9.5, 12, 10, R(4, p, 5)), path('M16 13.5h2.5l1.5-3'), path('M8 9.5C8 3 12 3 12 9.5')],
  vase: (p) => [
    poly(
      [
        [9.5, 3],
        [14.5, 3],
        [14.5, 6.5],
        [18.5, 12.5],
        [16.5, 21],
        [7.5, 21],
        [5.5, 12.5],
        [9.5, 6.5],
      ],
      [1, 1, 1.5, 2, 1.5, 1.5, 2, 1.5],
      p,
    ),
    path('M6.32 16h11.36'),
  ],
  lantern: (p) => [
    pline(
      [
        [9.5, 7],
        [9.5, 3],
        [14.5, 3],
        [14.5, 7],
      ],
      [0, 2.5, 2.5, 0],
      p,
    ),
    rect(6.5, 7, 11, 11, R(2, p, 3)),
    path('M10 7v11M14 7v11'),
    path('M8 21h8'),
  ],
  'top-hat': (p) => [
    rect(7, 4.5, 10, 12, R(1.5, p, 2)),
    rect(3.5, 16.5, 17, 3.5, R(1.75, p, 1.75)),
    path('M7 13.5h10'),
  ],
  toaster: (p) => [
    rect(3, 9, 18, 10, R(3, p, 4)),
    pline(
      [
        [6.5, 9],
        [6.5, 5],
        [10.5, 5],
        [10.5, 9],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
    pline(
      [
        [13.5, 9],
        [13.5, 5],
        [17.5, 5],
        [17.5, 9],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
    path('M15 14h3'),
  ],
  bench: (p) => [
    rect(3.5, 4, 17, 3.5, R(1.5, p, 1.75)),
    rect(3.5, 11, 17, 3, R(1.5, p, 1.5)),
    path('M5.5 7.5V11'),
    path('M18.5 7.5V11'),
    path('M6 14v6'),
    path('M18 14v6'),
  ],
  fridge: (p) => [rect(6.5, 3, 11, 18, R(2, p, 2.5)), path('M6.5 9.5h11'), path('M9.5 5.5v1.5'), path('M9.5 12v3')],
  'washing-machine': (p) => [rect(4.5, 3, 15, 18, R(2.5, p, 3)), path('M4.5 8h15'), round(12, 14.5, 3.5, p)],
}

export const poses: Record<string, PoseSpec> = {
  kettle: P(3, ['boil'], swing(2, [11, 10], 6)),
  vase: P(2, ['wobble'], swing(ALL, [12, 21], 4)),
  lantern: P(4, ['sway'], swing(ALL, [12, 3], 5)),
  'top-hat': P(3, ['tip'], lift([0, 2], [12, 16.5], 1.5)),
  toaster: P(4, ['pop'], lift([1, 2], [12, 9], 1.5)),
  bench: P(6, ['creak'], rattle(ALL, [12, 20], 0.8)),
  fridge: P(4, ['hum'], rattle(ALL, [12, 21], 0.8)),
  'washing-machine': P(3, ['spin'], rattle(ALL, [12, 21], 0.8)),
}
