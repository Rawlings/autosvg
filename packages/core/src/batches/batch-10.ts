// Batch 10: four sweets, drawn as the clean benchmark of the new tools (timer started before the designs).
import { ALL, P, type PoseSpec, pop, swing } from '../poses/dsl.ts'
import { dot, path, poly, type Recipe, round } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  // the scoop starts and ends on the cone's two sharp top corners
  'ice-cream': (p) => [
    path('M6 12a6.2 6.2 0 1 1 12 0'),
    path('M6 12h12'),
    poly(
      [
        [7, 12],
        [17, 12],
        [12, 21],
      ],
      [0, 0, 1],
      p,
    ),
  ],
  lollipop: (p) => [round(12, 9, 6, p), path('M9 9a3 3 0 1 1 3 3'), path('M12 15v6')],
  // the frosting runs exactly from corner to corner of the wrapper
  cupcake: (p) => [
    path('M6.5 12a5.5 5.5 0 0 1 11 0'),
    poly(
      [
        [6.5, 12],
        [17.5, 12],
        [15.5, 21],
        [8.5, 21],
      ],
      [0, 0, 1, 1],
      p,
    ),
    path('M12 12v9'),
    dot(12, 3.5),
  ],
  popsicle: (p) => [
    poly(
      [
        [7.5, 3],
        [16.5, 3],
        [16.5, 16],
        [7.5, 16],
      ],
      [4.5, 4.5, 1, 1],
      p,
    ),
    path('M12 16v5'),
    path('M10.5 7v5'),
  ],
}

export const poses: Record<string, PoseSpec> = {
  'ice-cream': P(3, ['melt'], swing(ALL, [12, 21], 5)),
  lollipop: P(3, ['twirl'], swing(ALL, [12, 21], 6)),
  cupcake: P(4, ['frost'], pop([0, 3], [12, 9], 0.06)),
  popsicle: P(3, ['drip'], swing(ALL, [12, 21], 5)),
}
