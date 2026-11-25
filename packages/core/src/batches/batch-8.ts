// Batch 8: the first vectors drawn with `pnpm verify-vectors` (a door, a ladder, a pot, a window).
import { on, P, type PoseSpec, pulse, wave } from '../poses/dsl.ts'
import { dot, path, R, type Recipe, rect } from '../recipe-kit.ts'

export const recipes: Record<string, Recipe> = {
  // the knob sits 2 clear of the right wall; the floor line runs past both sides of the door
  door: (p) => [rect(6, 3, 12, 18, R(1.5, p, 2)), dot(14, 12), path('M3 21h18')],
  // rungs are listed bottom to top; each ends exactly on a rail
  ladder: () => [path('M7 3V21'), path('M17 3V21'), path('M7 17h10'), path('M7 12h10'), path('M7 7h10')],
  // the lid line runs past the body; the handles start on the body's straight wall at any radius
  pot: (p) => [
    rect(5, 8.5, 14, 11.5, R(2, p, 3)),
    path('M3.5 8.5h17'),
    path('M12 8.5V4.5M10 4.5h4'),
    path('M5 12.5H3'),
    path('M19 12.5h2'),
  ],
  // the mullions end on the frame's straight edges
  window: (p) => [rect(4.5, 3, 15, 14.5, R(1.5, p, 2)), path('M12 3v14.5'), path('M4.5 10.25h15'), path('M3 21h18')],
}

export const poses: Record<string, PoseSpec> = {
  // the door narrows as it swings open about its left edge; the knob goes with it
  door: P(3, ['open'], on([0, 1], [6, 12], pulse(1, { w: 0.7, h: -0.35 }), pulse(1, { t: 0.1, w: 0.6, q: -6 }))),
  // the rungs dim in turn from the bottom up
  ladder: P(
    5,
    ['climb'],
    on(2, pulse(1, { w: 0.4, a: -0.7 })),
    on(3, pulse(1, { t: 0.25, w: 0.4, a: -0.7 })),
    on(4, pulse(1, { t: 0.5, w: 0.4, a: -0.7 })),
  ),
  // the lid and its knob rattle together
  pot: P(5, ['boil'], on([1, 2], [12, 8.5], wave(1, { n: 4, y: -0.9 }), wave(1, { t: 0.1, w: 0.9, n: 3, r: 4 }))),
  window: P(4, ['rattle'], on([0, 1, 2], [12, 10.25], wave(1, { n: 3, x: 0.7 }), pulse(1, { w: 0.5, s: 0.03 }))),
}
