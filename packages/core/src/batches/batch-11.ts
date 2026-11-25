// Batch 11: the two keepers from a draft-first run. (Four more were drafted and dropped: a duplicate of `trash`, a near copy of
// `coffee`, and two weak drawings. See lessons.md.)
import { ALL, flicker, P, type PoseSpec, swing } from '../poses/dsl.ts'
import { path, poly, type Recipe } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  lighthouse: (p) => [
    poly(
      [
        [9, 8],
        [15, 8],
        [16.5, 21],
        [7.5, 21],
      ],
      [0, 0, 1, 1],
      p,
    ),
    path('M9 8l3-4 3 4'),
    path('M9.5 13h5'),
    path('M3 6h3M18 6h3'),
  ],
  crayon: (p) => [
    poly(
      [
        [9, 8],
        [15, 8],
        [15, 20],
        [9, 20],
      ],
      [0, 0, 1, 1],
      p,
    ),
    path('M9 8l3-5 3 5'),
    path('M9 13h6'),
  ],
}

export const poses: Record<string, PoseSpec> = {
  // the beams flicker
  lighthouse: P(4, ['flash'], flicker(3, [12, 6])),
  crayon: P(3, ['draw'], swing(ALL, [12, 20], 6)),
}
