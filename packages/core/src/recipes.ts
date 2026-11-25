// Parametric recipes: how to draw an icon as a function of the geometry settings.
//
//   p.r  corner radius multiplier  (1 = as designed, 0 = sharp, 2 = very soft)
//   p.c  curve character           (0 = true circles, 1 = squircles)
//
// At the defaults (r = 1, c = 0) every recipe must reproduce its saved icon file exactly:
// iconCanvas.recipeStatus() checks that. Icons without a recipe keep their saved geometry and still
// follow the stroke, width and skew variables.
//
// Junctions are computed, never typed: where a line meets a rounded corner or a curve, its end point
// follows the radius so the strokes still connect at any setting.

import { recipes as batchRecipes } from './batches/index.ts'
import { centreOn, roundedPolygon, roundedPolyline, superArc, superPoint, symmetric } from './geo.ts'
import { dot, ellipse, exponent, n, path, pline, poly, R, type Recipe, radii, rect, round } from './recipe-kit.ts'
import { at as nth, type Point } from './util.ts'

export type { Recipe, RecipeParams } from './recipe-kit.ts'

/** Add recipes to the table (the table is written in batches, each with its own helpers). */
function addRecipes(more: Record<string, Recipe>): void {
  Object.assign(RECIPES, more)
}

/** A recipe already in the table. */
function recipe(name: string): Recipe {
  const found = RECIPES[name]
  if (!found) throw new Error(`no recipe for ${name}`)
  return found
}

export const RECIPES: Record<string, Recipe> = {
  // ---- containers (corner radius) ----
  grid: (p) => {
    const r = R(2, p, 3.75)
    return [
      rect(3, 3, 7.5, 7.5, r),
      rect(13.5, 3, 7.5, 7.5, r),
      rect(3, 13.5, 7.5, 7.5, r),
      rect(13.5, 13.5, 7.5, 7.5, r),
    ]
  },
  sidebar: (p) => [rect(3, 3, 18, 18, R(3, p, 6)), path('M9 3v18')],
  terminal: (p) => [rect(3, 4.5, 18, 15, R(3, p, 7.5)), path('M7.5 10l3 2.5-3 2.5M13 15h3.5')],
  mail: (p) => {
    const r = R(3, p, 6)
    // the flap starts exactly where the straight left/right edge starts, and keeps the same depth (5.5)
    // below that point so the V keeps the same angle however round the corners are
    return [rect(3, 5, 18, 14, r), path(`M3 ${n(5 + r)}L12 ${n(10.5 + r)}L21 ${n(5 + r)}`)]
  },
  calendar: (p) => [rect(3.5, 5, 17, 15.5, R(3, p, 4.5)), path('M3.5 10h17M8 3v4M16 3v4')],
  // shackle and keyhole are separate parts so a pose can open the shackle without moving the keyhole
  lock: (p) => [rect(4.5, 10.5, 15, 10, R(3, p, 3.5)), path('M8 10.5V8a4 4 0 0 1 8 0v2.5'), path('M12 15v2')],
  image: (p) => [rect(3.5, 4.5, 17, 15, R(3, p, 3.5)), round(9, 10, 1.5, p), path('M20.5 15l-4.5-4.5L7 19.5')],
  'credit-card': (p) => [rect(3, 5, 18, 14, R(3, p, 5)), path('M3 10h18M7 15h3')],
  chip: (p) => [
    rect(7, 7, 10, 10, R(2, p, 2.5)),
    rect(10, 10, 4, 4, R(1, p, 2)),
    path('M9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4'),
  ],

  // ---- polygons (corner radius) ----
  bookmark: (p) => [
    path(
      roundedPolygon(
        [
          [6.5, 3.5],
          [17.5, 3.5],
          [17.5, 20.5],
          [12, 16.5],
          [6.5, 20.5],
        ],
        radii([1, 1, 0, 0, 0], p),
      ),
    ),
  ],
  cursor: (p) => {
    const base: Point[] = [
      [5, 3.5],
      [19, 9.5],
      [13, 12],
      [10.5, 18],
    ]
    const k = 1.25
    const cx = 12
    const cy = 10.75
    const pts = nth(centreOn(base.map(([x, y]): Point => [cx + (x - cx) * k, cy + (y - cy) * k])), 0)
    return [path(roundedPolygon(pts, radii([0.4, 0.9, 0.9, 0.9], p)))]
  },
  filter: (p) => [
    path(
      roundedPolygon(
        [
          [3.5, 4.5],
          [20.5, 4.5],
          [13.5, 12],
          [13.5, 19.5],
          [10.5, 19.5],
          [10.5, 12],
        ],
        radii([1.5, 1.5, 1.5, 1.5, 1.5, 1.5], p),
      ),
    ),
  ],
  shield: (p) => {
    const left: Point[] = [
      [12, 3],
      [4.5, 6],
      [4.5, 12],
      [12, 21],
    ]
    const rl = radii([1.5, 2, 9, 1.5], p)
    return [path(roundedPolygon(symmetric(left), [...rl, ...rl.slice(1, -1).reverse()])), path('M8.5 12l2.5 2.5 4.5-5')]
  },
  folder: (p) => [
    path(
      roundedPolygon(
        [
          [3.5, 4.5],
          [9.5, 4.5],
          [11.5, 7],
          [20.5, 7],
          [20.5, 19.5],
          [3.5, 19.5],
        ],
        radii([2, 0, 0, 2, 2, 2], p),
      ),
    ),
  ],
  chat: (p) => [
    path(
      roundedPolygon(
        [
          [4, 4],
          [20, 4],
          [20, 17],
          [12, 17],
          [7.5, 21],
          [7.5, 17],
          [4, 17],
        ],
        radii([3, 3, 3, 0, 0, 0, 3], p),
      ),
    ),
    dot(8.5, 10.5),
    dot(12, 10.5),
    dot(15.5, 10.5),
  ],
  home: (p) => {
    const r = R(1, p, 2.5)
    const arcL = r ? `a${n(r)} ${n(r)} 0 0 0 ${n(r)} ${n(r)}` : ''
    const arcR = r ? `a${n(r)} ${n(r)} 0 0 0 ${n(r)} ${n(-r)}` : ''
    return [
      path('M3 10.5L12 3l9 7.5'),
      // wall tops sit exactly on the roof line: y = 10.5 - (x - 3) * 7.5 / 9
      path(`M5 8.83V${n(21 - r)}${arcL}H9.5V15H14.5V21H${n(19 - r)}${arcR}V8.83`),
    ]
  },

  // ---- circles (curve character) ----
  clock: (p) => [round(12, 12, 9, p), path('M12 7v5l3 2')],
  // the ring that check, x, alert, info, plus, minus and help marks come into (see its states in pose-table.js)
  circle: (p) => [round(12, 12, 9, p)],
  globe: (p) => [round(12, 12, 9, p), path('M3 12h18'), ellipse(12, 12, 4, 9)],
  search: (p) => {
    // the handle starts where the 45 degree diagonal meets the lens outline
    const k = Math.SQRT1_2 ** (2 / exponent(p))
    const start = p.c > 0 ? n(11 + 7 * k) : 16
    return [round(11, 11, 7, p), path(`M${start} ${start}l${n(21 - start)} ${n(21 - start)}`)]
  },
  user: (p) => [round(12, 7.5, 3.5, p), path('M4 20.5c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5')],

  // ---- more containers and open paths (corner radius) ----
  'alert-triangle': (p) => {
    const rho = R(1.8, p, 4)
    // The outline's extents stay put (x 3 to 21, top 4, base 20.3) at any radius. A rounded corner pulls the
    // visible outline inside its vertex, so the vertices sit further out the rounder the corner is.
    const apex: Point = [12, n(4 - 1.0165 * rho)]
    const right: Point = [n(21 + 0.7255 * rho), 20.3]
    const left: Point = [n(3 - 0.7255 * rho), 20.3]
    return [path(roundedPolygon([apex, right, left], [rho, rho, rho])), path('M12 9.5v4.5'), dot(12, 17)]
  },
  camera: (p) => [
    path(
      roundedPolygon(
        [
          [3.5, 6.5],
          [7.5, 6.5],
          [9, 4],
          [15, 4],
          [16.5, 6.5],
          [20.5, 6.5],
          [20.5, 19.5],
          [3.5, 19.5],
        ],
        radii([2.5, 0, 0, 0, 0, 2.5, 2.5, 2.5], p),
      ),
    ),
    round(12, 12.5, 3.5, p),
  ],
  cart: (p) => {
    const r = R(1.5, p, 4)
    // corners C and D are where the slanted sides meet the base line y = 15.7
    return [
      path(
        roundedPolyline(
          [
            [3, 4],
            [5.5, 4],
            [7.95, 15.7],
            [18.67, 15.7],
            [21, 8],
            [6.5, 8],
          ],
          [0, 0, r, r, 0, 0],
        ),
      ),
      `<circle cx="9.5" cy="19.5" r="1" />`,
      `<circle cx="17.5" cy="19.5" r="1" />`,
    ]
  },
  copy: (p) => {
    const r = R(3, p, 6)
    // the back sheet ends on the front sheet's top and left edges, so r may not pass 6
    return [
      rect(9, 9, 12, 12, r),
      path(
        roundedPolyline(
          [
            [15, 9],
            [15, 3],
            [3, 3],
            [3, 15],
            [9, 15],
          ],
          [0, r, r, r, 0],
        ),
      ),
    ]
  },
  edit: (p) => {
    const u: Point = [Math.SQRT1_2, -Math.SQRT1_2] // along the pencil, tip to end
    const nrm: Point = [Math.SQRT1_2, Math.SQRT1_2] // across it
    const tip: Point = [4, 20]
    const w = 2.1 // half width
    const along = (a: number, across: number): Point => [
      tip[0] + u[0] * a + nrm[0] * across,
      tip[1] + u[1] * a + nrm[1] * across,
    ]
    const [body = [], band = []] = centreOn(
      [along(0, 0), along(4.5, w), along(18, w), along(18, -w), along(4.5, -w)],
      [along(14.5, w), along(14.5, -w)],
    )
    const pt = ([x, y]: Point): string => `${+x.toFixed(2)} ${+y.toFixed(2)}`
    // the band sits 3.5 from the end corners, so their radius stops there
    const rr = [0.6, 1, 1.5, 1.5, 1].map((v) => Math.min(v * p.r, 3.4))
    return [path(roundedPolygon(body, rr)), path(`M${pt(nth(band, 0))}L${pt(nth(band, 1))}`)]
  },
  expand: (p) => {
    const r = R(2, p, 5)
    const k = n(5 - r) // what is left of each 5-long arm after the corner
    return [
      path(
        `M4 9V${n(4 + r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}h${k}` +
          `M15 4h${k}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${k}` +
          `M20 15v${k}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-k)}` +
          `M9 20H${n(4 + r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(-k)}`,
      ),
    ]
  },
  'external-link': (p) => {
    const r = R(3, p, 6)
    return [
      path(
        roundedPolyline(
          [
            [10, 5],
            [4, 5],
            [4, 20],
            [19, 20],
            [19, 14],
          ],
          [0, r, r, r, 0],
        ),
      ),
      path('M14 4h6v6M20 4l-9 9'),
    ]
  },
  file: (p) => {
    const r = R(3, p, 8)
    return [
      path(
        roundedPolygon(
          [
            [14, 3],
            [5, 3],
            [5, 21],
            [19, 21],
            [19, 8],
          ],
          [0, r, r, r, 0],
        ),
      ),
      path(
        roundedPolyline(
          [
            [14, 3],
            [14, 8],
            [19, 8],
          ],
          [0, R(1.5, p, 5), 0],
        ),
      ),
    ]
  },
  'log-out': (p) => {
    const r = R(3, p, 6)
    return [
      path(
        roundedPolyline(
          [
            [10, 4],
            [4, 4],
            [4, 20],
            [10, 20],
          ],
          [0, r, r, 0],
        ),
      ),
      path('M15 8l4 4-4 4M19 12H9'),
    ]
  },
  trash: (p) => {
    const r = R(2, p, 4.5)
    return [
      path('M4.5 6.5h15'),
      path(
        roundedPolyline(
          [
            [9.5, 6.5],
            [9.5, 3.5],
            [14.5, 3.5],
            [14.5, 6.5],
          ],
          [0, R(1, p, 2.5), R(1, p, 2.5), 0],
        ),
      ),
      path(
        roundedPolyline(
          [
            [6.5, 6.5],
            [7.418, 20.5],
            [16.582, 20.5],
            [17.5, 6.5],
          ],
          [0, r, r, 0],
        ),
      ),
      path('M10 11v5M14 11v5'),
    ]
  },
  branch: (p) => {
    const a = R(3, p, 4.5)
    const b = R(2.5, p, 2.5)
    return [
      round(6, 6, 2.5, p),
      round(6, 18, 2.5, p),
      round(18, 6, 2.5, p),
      // the line ends on the circles' top and bottom points, which are the same for any curve setting
      path(
        `M6 8.5v7M18 8.5V${n(13 - a)}a${n(a)} ${n(a)} 0 0 1 ${n(-a)} ${n(a)}H${n(6 + b)}a${n(b)} ${n(b)} 0 0 0 ${n(-b)} ${n(b)}`,
      ),
    ]
  },

  // ---- more circles (curve character) ----
  eye: (p) => [path('M3 12C5 8 8 5.5 12 5.5s7 2.5 9 6.5c-2 4-5 6.5-9 6.5S5 16 3 12z'), round(12, 12, 3, p)],
  'map-pin': (p) => [path('M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11-6.5 11z'), round(12, 10, 2.5, p)],
  'pen-tool': (p) => [path('M9 3h6l3 8-6 10-6-10z'), round(12, 10.5, 1.5, p), path('M12 12V21')],
  settings: (p) => [
    `<polygon points="10.43,5.18 10.75,3.09 13.25,3.09 13.57,5.18 15.71,6.06 17.42,4.81 19.19,6.58 17.94,8.29 18.82,10.43 20.91,10.75 20.91,13.25 18.82,13.57 17.94,15.71 19.19,17.42 17.42,19.19 15.71,17.94 13.57,18.82 13.25,20.91 10.75,20.91 10.43,18.82 8.29,17.94 6.58,19.19 4.81,17.42 6.06,15.71 5.18,13.57 3.09,13.25 3.09,10.75 5.18,10.43 6.06,8.29 4.81,6.58 6.58,4.81 8.29,6.06" />`,
    round(12, 12, 3, p),
  ],
  share: (p) => {
    const e = exponent(p)
    const A: Point = [6, 12]
    const B: Point = [18, 6]
    const C: Point = [18, 18]
    // each line runs from outline to outline along the line between the two centres, so it always meets both
    const edge = (from: Point, to: Point): string => {
      const dx = to[0] - from[0]
      const dy = to[1] - from[1]
      const s = superPoint(from[0], from[1], 2.5, e, dx, dy)
      const t = superPoint(to[0], to[1], 2.5, e, -dx, -dy)
      return `M${n(s[0])} ${n(s[1])}L${n(t[0])} ${n(t[1])}`
    }
    return [round(6, 12, 2.5, p), round(18, 6, 2.5, p), round(18, 18, 2.5, p), path(edge(A, B) + edge(A, C))]
  },
  sliders: (p) => [
    path('M3 8h7.5M15.5 8H21M3 16h2.5M10.5 16H21'), // the tracks end on the knobs' left and right points
    round(13, 8, 2.5, p),
    round(8, 16, 2.5, p),
  ],
  sun: (p) => [
    round(12, 12, 3.5, p),
    path(
      'M18.5 12L21 12M16.6 16.6L18.36 18.36M12 18.5L12 21M7.4 16.6L5.64 18.36M5.5 12L3 12M7.4 7.4L5.64 5.64M12 5.5L12 3M16.6 7.4L18.36 5.64',
    ),
  ],
  users: (p) => [
    round(9, 8, 3.5, p),
    path('M3 20.5c0-3.6 2.7-6 6-6s6 2.4 6 6'),
    // the second head is the visible right part of a circle centred at (14.08, 8)
    path(p.c > 0 ? superArc(14.08, 8, 3.5, exponent(p), -66, 66) : 'M15.5 4.8a3.5 3.5 0 0 1 0 6.4'),
    path('M18 14.8c2 .6 3 2.4 3 5.7'),
  ],

  // ---- parts split out so poses can move them individually (same drawing as before) ----
  menu: () => [path('M4 7h16'), path('M4 12h16'), path('M4 17h16')],
  wifi: () => [
    path('M3 8.5a13.5 13.5 0 0 1 18 0'),
    path('M6 12a9 9 0 0 1 12 0'),
    path('M9 15.5a4.5 4.5 0 0 1 6 0'),
    dot(12, 19),
  ],

  // ======================================================================================================
  // 50 more icons. Every one is a recipe, so radius and curve work on it by construction, and junctions
  // (where a line meets a corner or a circle) are computed from the settings.
  // ======================================================================================================

  // ---- media ----
  volume: (p) => [
    poly(
      [
        [4, 9.5],
        [7, 9.5],
        [11.5, 5.5],
        [11.5, 18.5],
        [7, 14.5],
        [4, 14.5],
      ],
      [1, 0, 0.6, 0.6, 0, 1],
      p,
    ),
    path('M15.5 9a4 4 0 0 1 0 6'),
    path('M18.5 6a8.5 8.5 0 0 1 0 12'),
  ],
  mic: (p) => [rect(9, 3, 6, 11, R(3, p, 3)), path('M5.5 11.5a6.5 6.5 0 0 0 13 0'), path('M12 18v3'), path('M9 21h6')],
  headphones: (p) => {
    const r = R(1.5, p, 1.5)
    return [path('M5 14v-2a7 7 0 0 1 14 0v2'), rect(3, 14, 4, 6, r), rect(17, 14, 4, 6, r)]
  },
  music: (p) => [round(6.5, 18, 2.5, p), round(16.5, 16, 2.5, p), path('M9 18V5l10-2v13')],
  video: (p) => [
    rect(3, 6, 13, 12, R(3, p, 3)),
    poly(
      [
        [16, 10.5],
        [21, 7.5],
        [21, 16.5],
        [16, 13.5],
      ],
      [0, 1, 1, 0],
      p,
    ),
  ],
  skip: (p) => [
    poly(
      [
        [5, 5.5],
        [5, 18.5],
        [15.5, 12],
      ],
      [1, 1, 1],
      p,
    ),
    path('M19 5.5v13'),
  ],
  shuffle: () => [
    path('M3 7h3c3 0 4.5 1.5 6 5s3 5 6 5h3'),
    path('M3 17h3c3 0 4.5-1.5 6-5s3-5 6-5h3'),
    path('M18.5 4.5L21 7l-2.5 2.5'),
    path('M18.5 14.5L21 17l-2.5 2.5'),
  ],
  repeat: (p) => {
    const r = R(3, p, 5)
    return [
      path(
        roundedPolyline(
          [
            [4, 11],
            [4, 6],
            [20, 6],
          ],
          [0, r, 0],
        ),
      ),
      path('M17 3l3 3-3 3'),
      path(
        roundedPolyline(
          [
            [20, 13],
            [20, 18],
            [4, 18],
          ],
          [0, r, 0],
        ),
      ),
      path('M7 15l-3 3 3 3'),
    ]
  },
  maximize: () => [path('M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7')],

  // ---- devices and objects ----
  battery: (p) => [
    rect(3, 7, 16, 10, R(2.5, p, 3.5)),
    path(
      roundedPolyline(
        [
          [19, 10.5],
          [21, 10.5],
          [21, 13.5],
          [19, 13.5],
        ],
        [0, R(0.8, p, 1.5), R(0.8, p, 1.5), 0],
      ),
    ),
    path('M7 10.5v3M10.5 10.5v3'),
  ],
  smartphone: (p) => [rect(6.5, 3, 11, 18, R(2.5, p, 5)), path('M10.5 17.5h3')],
  laptop: (p) => [rect(5, 5, 14, 10, R(1.5, p, 2)), path('M3 19h18')],
  monitor: (p) => [rect(3, 4, 18, 12, R(2, p, 3)), path('M12 16v4M8.5 20h7')],
  printer: (p) => [rect(3, 9, 18, 8, R(2, p, 3.5)), path('M7 9V4h10v5'), path('M7 17v4h10v-4'), dot(17, 12.5)],
  key: (p) => {
    // the shaft runs along x + y = 24 from the key head's outline, so it meets the head at any curve setting
    const s = superPoint(8, 16, 4, exponent(p), 1, -1)
    return [
      round(8, 16, 4, p),
      path(`M${n(s[0])} ${n(s[1])}L20.5 3.5`),
      path('M17.5 6.5l2.5 2.5'),
      path('M14.5 9.5l2 2'),
    ]
  },
  gift: (p) => [
    rect(3, 7, 18, 4, R(1.5, p, 2)),
    rect(5, 11, 14, 10, R(1.5, p, 1.5)),
    path('M12 7v14'),
    path('M12 7c-1.5-3.5-5-4.5-5-2.2 0 1.5 2 2.2 5 2.2z'),
    path('M12 7c1.5-3.5 5-4.5 5-2.2 0 1.5-2 2.2-5 2.2z'),
  ],
  tag: (p) => [
    poly(
      [
        [3, 3],
        [11.5, 3],
        [21, 12.5],
        [12.5, 21],
        [3, 11.5],
      ],
      [1.5, 1.5, 1.5, 1.5, 1.5],
      p,
    ),
    `<circle cx="7.5" cy="7.5" r="1.5" />`,
  ],
  flag: (p) => [
    path('M6 21V4'),
    pline(
      [
        [6, 4],
        [18, 4],
        [15.5, 8],
        [18, 12],
        [6, 12],
      ],
      [0, 1, 0.6, 1, 0],
      p,
    ),
  ],
  umbrella: () => [
    path(
      'M3 12a9 9 0 0 1 18 0c-1.4 1.6-3.1 1.6-4.5 0-1.4 1.6-3.1 1.6-4.5 0-1.4 1.6-3.1 1.6-4.5 0-1.4 1.6-3.1 1.6-4.5 0z',
    ),
    path('M12 12v5c0 1.6 1.1 2.8 2.5 2.8s2.5-1.2 2.5-2.8'),
  ],
  coffee: () => [
    path('M4 9h11v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z'),
    path('M15 10h1.5c2.8 0 2.8 5 0 5H15'),
    path('M7 3.5v2.5M11 3.5v2.5'),
  ],
  scissors: (p) => {
    const e = exponent(p)
    const a = superPoint(6, 17, 3, e, 1, -1)
    const b = superPoint(18, 17, 3, e, -1, -1)
    return [
      round(6, 17, 3, p),
      round(18, 17, 3, p),
      path(`M${n(a[0])} ${n(a[1])}L20 3`),
      path(`M${n(b[0])} ${n(b[1])}L4 3`),
    ]
  },
  compass: (p) => [round(12, 12, 9, p), path('M16 8l-2.5 5.5L8 16l2.5-5.5z')],
  lightbulb: () => [path('M9.5 17c0-2.2-3.5-3.2-3.5-7a6 6 0 0 1 12 0c0 3.8-3.5 4.8-3.5 7z'), path('M10 20h4')],
  hourglass: (p) => [
    poly(
      [
        [6.5, 3],
        [17.5, 3],
        [12, 12],
      ],
      [1, 1, 0],
      p,
    ),
    poly(
      [
        [12, 12],
        [17.5, 21],
        [6.5, 21],
      ],
      [0, 1, 1],
      p,
    ),
  ],
  rocket: () => [
    path('M12 3c3.5 2.5 5 6 5 9.5l-2.5 3h-5L7 12.5c0-3.5 1.5-7 5-9.5z'),
    `<circle cx="12" cy="9.5" r="1.5" />`,
    path('M10.5 19l1.5 2 1.5-2'),
    path('M7 12.5l-2.5 3.5 2.5.5M17 12.5l2.5 3.5-2.5.5'),
  ],
  wallet: (p) => [
    rect(3, 5, 18, 14, R(3, p, 3.5)),
    path(
      roundedPolyline(
        [
          [21, 10],
          [16, 10],
          [16, 15],
          [21, 15],
        ],
        [0, R(1.5, p, 2), R(1.5, p, 2), 0],
      ),
    ),
  ],
  'shopping-bag': (p) => [
    rect(4, 8, 16, 13, R(2, p, 4.5)),
    path(
      roundedPolyline(
        [
          [8.5, 8],
          [8.5, 3.5],
          [15.5, 3.5],
          [15.5, 8],
        ],
        [0, R(3.5, p, 3.5), R(3.5, p, 3.5), 0],
      ),
    ),
  ],
  'book-open': () => [
    path('M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5'),
    path('M12 6c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5'),
    path('M12 6v13'),
  ],
  save: (p) => [
    poly(
      [
        [4, 3],
        [17, 3],
        [21, 7],
        [21, 21],
        [4, 21],
      ],
      [2, 0.5, 0.5, 2, 2],
      p,
    ),
    pline(
      [
        [8, 3],
        [8, 8],
        [16, 8],
        [16, 3],
      ],
      [0, 0.5, 0.5, 0],
      p,
    ),
    rect(7, 14, 10, 7, R(1, p, 2)),
  ],
  inbox: (p) => [
    poly(
      [
        [3, 13],
        [6.5, 5],
        [17.5, 5],
        [21, 13],
        [21, 19],
        [3, 19],
      ],
      [0, 0.5, 0.5, 0, 2, 2],
      p,
    ),
    path('M3 13h5l1 2.5h6l1-2.5h5'),
  ],
  archive: (p) => [
    rect(3, 4, 18, 4, R(1.5, p, 2)),
    path(
      roundedPolyline(
        [
          [5, 8],
          [5, 19],
          [19, 19],
          [19, 8],
        ],
        [0, R(2, p, 4), R(2, p, 4), 0],
      ),
    ),
    path('M10 12.5h4'),
  ],

  // ---- data ----
  'bar-chart': () => [path('M3 20h18M6.5 20V12M12 20V4M17.5 20V8')],
  trending: () => [path('M3 17l6-6 4 4 8-8M15 7h6v6')],
  'pie-chart': (p) => [round(12, 12, 9, p), path('M12 3v9h9')],
  activity: () => [path('M3 12h4l3-8 4 16 3-8h4')],
  table: (p) => [rect(3, 4, 18, 16, R(2.5, p, 5)), path('M3 9.5h18M3 14.5h18M9.5 4v16')],
  layout: (p) => [rect(3, 3, 18, 18, R(3, p, 5.5)), path('M3 9h18M9 9v12')],
  percent: (p) => [round(7, 7, 2.5, p), round(17, 17, 2.5, p), path('M19 5L5 19')],
  hash: () => [path('M4 9h16M4 15h16M9.5 3.5l-2 17M16.5 3.5l-2 17')],
  // undo turns back; its redo state mirrors it
  undo: (p) => [
    path(
      roundedPolyline(
        [
          [4.5, 9],
          [19.5, 9],
          [19.5, 19],
          [12.5, 19],
        ],
        [0, R(5, p, 5), R(5, p, 5), 0],
      ),
    ),
    path('M9 4.5L4.5 9 9 13.5'),
  ],
  // the clip is a box on the board's top edge: the board's outline starts and ends on the clip's sides
  clipboard: (p) => {
    const r = R(2.5, p, 7)
    return [
      path(
        roundedPolyline(
          [
            [9, 5],
            [5, 5],
            [5, 21],
            [19, 21],
            [19, 5],
            [15, 5],
          ],
          [0, r, r, r, r, 0],
        ),
      ),
      rect(9, 3, 6, 4, R(1.5, p, 2)),
      path('M9 12h6'),
      path('M9 16h4'),
    ]
  },
  // a pushpin: the head, a stem that flares into the base, and the needle
  pin: (p) => [
    path(
      roundedPolygon(
        [
          [8, 3.5],
          [16, 3.5],
          [16, 6.5],
          [14.5, 8],
          [14.5, 10.5],
          [18, 14],
          [18, 16.5],
          [6, 16.5],
          [6, 14],
          [9.5, 10.5],
          [9.5, 8],
          [8, 6.5],
        ],
        radii([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], p),
      ),
    ),
    path('M12 16.5V21'),
  ],
  // two corner brackets that cross, the way a crop frame does
  crop: (p) => [
    path(
      roundedPolyline(
        [
          [6, 3],
          [6, 15],
          [9, 18],
          [21, 18],
        ],
        [0, R(1.5, p, 3), R(1.5, p, 3), 0],
      ),
    ),
    path(
      roundedPolyline(
        [
          [18, 21],
          [18, 9],
          [15, 6],
          [3, 6],
        ],
        [0, R(1.5, p, 3), R(1.5, p, 3), 0],
      ),
    ),
  ],
  radio: (p) => [round(12, 12, 9, p)],
  // one stroke: down the left diagonal, round the rune and back up the other
  bluetooth: () => [path('M6.5 7.5L17.5 16.5 12 21V3l5.5 4.5-11 9')],
  // a map folded in three: the outline zigzags along the folds and the two creases run between its points
  map: () => [path('M3 6L9 4l6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14')],
  // one wire bent into three stadium turns: outer wall, the top loop, the inner turn; the radii are the half-widths, so they stop growing there
  paperclip: (p) => [
    path(
      roundedPolyline(
        [
          [16.5, 8.5],
          [16.5, 21],
          [7.5, 21],
          [7.5, 3],
          [13.5, 3],
          [13.5, 17.5],
          [10.5, 17.5],
          [10.5, 8.5],
        ],
        [0, R(4.5, p, 4.5), R(4.5, p, 4.5), R(3, p, 3), R(3, p, 3), R(1.5, p, 1.5), R(1.5, p, 1.5), 0],
      ),
    ),
  ],
  // the tube (a stadium top, open at the bottom), the bulb that closes it, and the mercury
  thermometer: (p) => [
    path(
      roundedPolyline(
        [
          [9, 14.35],
          [9, 3.5],
          [15, 3.5],
          [15, 14.35],
        ],
        [0, R(3, p, 3), R(3, p, 3), 0],
      ),
    ),
    path('M15 14.35A4 4 0 1 1 9 14.35'),
    path('M12 17V9'),
  ],
  // the ring in the middle, the stroke that rises beside it and hooks into the open outer ring
  'at-sign': (p) => [
    round(12, 12, 3.5, p),
    path(
      `${roundedPolyline(
        [
          [15.5, 7],
          [15.5, 16],
          [20.5, 16],
          [20.5, 12],
        ],
        [0, R(2.5, p, 2.5), R(2.5, p, 2.5), 0],
      )}A8.5 8.5 0 1 0 17.46 18.51`,
    ),
  ],
  // a leaf: two curves meeting at both tips, and the stem that runs on as its vein
  leaf: () => [path('M6.25 17.5C6.25 9 11.25 4.5 19.75 4.5c0 8.5-4.5 13.5-13 13z'), path('M4.25 19.5L13.75 10')],
  // the cup is a rectangle whose bottom corners are half its width; the handles end on its wall wherever the wall is, so the end point is derived from the radius
  trophy: (p) => {
    const r = R(4, p, 4)
    const wall = (y: number): number =>
      r > 0 && y > 11.5 - r ? r - Math.sqrt(Math.max(0, r * r - (y - (11.5 - r)) ** 2)) : 0 // how far the wall is inside the 8 to 16 box at height y
    const wx = 8 + wall(9)
    const rho = n(((wx - 5.5) ** 2 + 2 ** 2) / (2 * (wx - 5.5))) // the handle's arc leaves the vertical and meets the wall at (wx, 9)
    return [
      path(
        roundedPolygon(
          [
            [8, 3.5],
            [16, 3.5],
            [16, 11.5],
            [8, 11.5],
          ],
          [0, 0, r, r],
        ),
      ),
      path(`M8 6H5.5V7A${rho} ${rho} 0 0 0 ${n(wx)} 9`),
      path(`M16 6h2.5V7A${rho} ${rho} 0 0 1 ${n(24 - wx)} 9`),
      path('M12 11.5V20.5'),
      path('M8.5 20.5h7'),
    ]
  },
  // the cuff, and the hand that leaves it: up the thumb, round its tip, down to the knuckles and along the palm back to the cuff
  'thumbs-up': (p) => {
    const rc = R(1, p, 2) // the cuff's corner: the hand joins its straight sides, so its ends are derived from it
    return [
      rect(3.5, 10.5, 4, 10, rc),
      path(
        roundedPolyline(
          [
            [7.5, n(11.5 + rc - 1)],
            [11, 4.5],
            [13.5, 4.5],
            [13.5, 10],
            [18.5, 10],
            [20.5, 12],
            [19.5, 18.5],
            [17.5, 20.5],
            [n(7.5 - rc), 20.5],
          ],
          [0, R(1.2, p, 2), R(1.5, p, 2), R(1, p, 2), R(1.5, p, 3), R(1.5, p, 3), R(1.5, p, 3), R(1.5, p, 3), 0],
        ),
      ),
    ]
  },
  // the board, two rows of keys (a short stroke each) and the space bar
  keyboard: (p) => [
    rect(3, 5.5, 18, 13, R(3, p, 6)),
    path('M7 9h2M11 9h2M15 9h2'),
    path('M7 12h2M11 12h2M15 12h2'),
    path('M8.5 15.5h7'),
  ],
  // a switch: the track and the knob inside it (concentric at rest, so the gap is the same all round)
  toggle: (p) => [rect(3, 7, 18, 10, R(5, p, 5)), round(8, 12, 2, p)],
  // a box that a check or a bar is drawn into (see its states in pose-table.js)
  checkbox: (p) => [rect(3, 3, 18, 18, R(3, p, 9))],
  server: (p) => [rect(3, 4, 18, 6, R(2, p, 3)), rect(3, 14, 18, 6, R(2, p, 3)), dot(7, 7), dot(7, 17)],

  // ---- nature and expression ----
  droplet: () => [path('M12 3.5c3 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.5 6-10.5z')],
  flame: () => [
    path('M12 21a6 6 0 0 1-6-6c0-2.5 1.5-4 2.5-5.5.6 1 1.2 1.6 2 2C10.5 8 11 5 12 3c1.5 2.5 6 5.5 6 12a6 6 0 0 1-6 6z'),
  ],
  award: (p) => {
    // the ribbon starts on the medal's outline, found along the ray from its centre, at any curve setting
    const e = exponent(p)
    const a = superPoint(12, 9, 6, e, -3.5, 4.9)
    const b = superPoint(12, 9, 6, e, 3.5, 4.9)
    return [round(12, 9, 6, p), path(`M${n(a[0])} ${n(a[1])}L7 21l5-3 5 3L${n(b[0])} ${n(b[1])}`)]
  },
  smile: (p) => [round(12, 12, 9, p), dot(9, 10), dot(15, 10), path('M8 14.5c1 1.8 2.5 2.7 4 2.7s3-.9 4-2.7')],
  target: (p) => [round(12, 12, 9, p), round(12, 12, 5.5, p), round(12, 12, 2, p)],
}

// zoom is the search lens with a sign inside (its out state erases the vertical bar), so it follows the same curve and junction maths
addRecipes({ zoom: (p) => [...recipe('search')(p), path('M8 11h6'), path('M11 8v6')] })

// ======== status marks and everyday objects ========
addRecipes({
  info: (p) => [round(12, 12, 9, p), path('M12 11.5v5'), dot(12, 8)],
  help: (p) => [round(12, 12, 9, p), path('M9.5 9.5C9.5 8 10.6 7 12 7s2.5 1 2.5 2.5c0 2-2.5 2-2.5 3.5'), dot(12, 17)],
  'alert-circle': (p) => [round(12, 12, 9, p), path('M12 7.5v5'), dot(12, 16.5)],
  ban: (p) => {
    const e = exponent(p)
    const a = superPoint(12, 12, 9, e, -1, -1)
    const b = superPoint(12, 12, 9, e, 1, 1)
    return [round(12, 12, 9, p), path(`M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`)]
  },
  // eight spokes, one shape each, so each can fade in its own time
  loader: () =>
    Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4
      const at = (r: number): string => `${n(12 + r * Math.cos(a))} ${n(12 + r * Math.sin(a))}`
      return path(`M${at(5)}L${at(9)}`)
    }),
  hammer: (p) => [
    poly(
      [
        [10.5, 4.3],
        [19.7, 13.5],
        [17.6, 15.6],
        [8.4, 6.4],
      ],
      [1, 1, 1, 1],
      p,
    ),
    path('M13 11L4.5 19.5'),
  ],
  ruler: (p) => [
    rect(3, 7.5, 18, 9, R(1.5, p, 4)),
    path('M7 7.5v3.5'),
    path('M10.5 7.5v2'),
    path('M14 7.5v3.5'),
    path('M17 7.5v2'),
  ],
  calculator: (p) => [
    rect(5, 3, 14, 18, R(2, p, 3.5)),
    path('M8.5 7h7'),
    dot(9, 12.5),
    dot(15, 12.5),
    dot(9, 17),
    dot(15, 17),
  ],
  timer: (p) => [round(12, 13.5, 7.5, p), path('M9.5 3h5'), path('M12 3v3'), path('M12 13.5v-4')],
  'alarm-clock': (p) => [
    round(12, 13, 7.5, p),
    path('M12 9.5V13l2.5 1.5'),
    path('M3 8l2.5-3.5'),
    path('M21 8l-2.5-3.5'),
  ],
  briefcase: (p) => [
    rect(3, 7.5, 18, 12.5, R(2, p, 4)),
    pline(
      [
        [8.5, 7.5],
        [8.5, 4],
        [15.5, 4],
        [15.5, 7.5],
      ],
      [0, 1.5, 1.5, 0],
      p,
    ),
    path('M3 13h18'),
  ],
  receipt: () => [
    path('M5.5 3h13v18l-2.17-1.5L14.17 21 12 19.5 9.83 21l-2.16-1.5L5.5 21z'),
    path('M9 8h6'),
    path('M9 12h6'),
    path('M9 16h3'),
  ],
  ticket: (p) => {
    const r = n(R(1.5, p, 2))
    return [
      path(
        `M${n(3 + +r)} 5H${n(21 - +r)}a${r} ${r} 0 0 1 ${r} ${r}v2.5a2.5 2.5 0 0 0 0 5V${n(19 - +r)}a${r} ${r} 0 0 1-${r} ${r}H${n(3 + +r)}a${r} ${r} 0 0 1-${r}-${r}v-2.5a2.5 2.5 0 0 0 0-5V${n(5 + +r)}a${r} ${r} 0 0 1 ${r}-${r}z`,
      ),
      path('M14.5 8.5V10M14.5 14v1.5'),
    ]
  },
  pill: () => [
    path('M9.53 9.53L5.03 14.03a3.5 3.5 0 0 0 4.95 4.95l4.5-4.5z'),
    path('M14.48 14.48l4.5-4.5a3.5 3.5 0 0 0-4.95-4.95l-4.5 4.5z'),
  ],
  dumbbell: (p) => [
    path('M9 12h6'),
    rect(6, 7, 3, 10, R(1, p, 1.5)),
    rect(15, 7, 3, 10, R(1, p, 1.5)),
    path('M3 10v4'),
    path('M21 10v4'),
  ],
  flask: (p) => [
    pline(
      [
        [10, 3],
        [10, 9.5],
        [4.5, 19.5],
        [19.5, 19.5],
        [14, 9.5],
        [14, 3],
      ],
      [0, 0, 2, 2, 0, 0],
      p,
    ),
    path('M8 3h8'),
    dot(12, 16),
  ],
  gamepad: (p) => [rect(3, 7, 18, 11, R(5.5, p, 5.5)), path('M8 10.5v4M6 12.5h4'), dot(14.5, 10.5), dot(17.5, 14.5)],
  mouse: (p) => [rect(6.5, 3, 11, 18, R(5.5, p, 5.5)), path('M12 6.5v3')],
  speaker: (p) => [rect(5, 3, 14, 18, R(2.5, p, 4)), round(12, 14.5, 3.5, p), dot(12, 6.5)],
  tv: (p) => [rect(3, 7, 18, 13, R(2.5, p, 4)), path('M8.5 3L12 7l3.5-4')],
  megaphone: (p) => [
    poly(
      [
        [4.5, 9.5],
        [8, 9.5],
        [16, 4.5],
        [16, 19.5],
        [8, 14.5],
        [4.5, 14.5],
      ],
      [1.5, 0, 1, 1, 0, 1.5],
      p,
    ),
    path('M9.5 15.44L11 20'),
    path('M19.5 9c1.6 1.8 1.6 4.2 0 6'),
  ],
  banknote: (p) => [rect(3, 6.5, 18, 11, R(2, p, 3)), round(12, 12, 2.5, p), dot(6, 12), dot(18, 12)],
  signpost: (p) => [
    path('M12 3v18'),
    pline(
      [
        [12, 4.5],
        [19, 4.5],
        [21, 6.75],
        [19, 9],
        [12, 9],
      ],
      [0, 0, 0.5, 0.5, 0],
      p,
    ),
    pline(
      [
        [12, 12.5],
        [5, 12.5],
        [3, 14.75],
        [5, 17],
        [12, 17],
      ],
      [0, 0, 0.5, 0.5, 0],
      p,
    ),
  ],
})

// ======== things and symbols, batch 2 ========
const polar = (cx: number, cy: number, d: number, deg: number): Point => [
  cx + d * Math.cos((deg * Math.PI) / 180),
  cy + d * Math.sin((deg * Math.PI) / 180),
]
const at = ([x, y]: Point): string => `${n(x)} ${n(y)}`
addRecipes({
  anchor: (p) => [
    round(12, 5.5, 2.5, p),
    path('M12 8v13'),
    path('M8.5 11.5h7'),
    path('M4.5 14c.6 4.2 3.7 7 7.5 7s6.9-2.8 7.5-7'),
  ],
  'life-buoy': (p) => {
    const e = exponent(p)
    const spoke = (dx: number, dy: number): string =>
      path(`M${at(superPoint(12, 12, 4, e, dx, dy))}L${at(superPoint(12, 12, 9, e, dx, dy))}`)
    return [round(12, 12, 9, p), round(12, 12, 4, p), spoke(1, 1), spoke(-1, 1), spoke(-1, -1), spoke(1, -1)]
  },
  signal: () => [path('M5 20v-2'), path('M10 20v-5'), path('M15 20v-8'), path('M20 20V5')],
  gauge: () => [path('M4.5 19a9 9 0 1 1 15 0'), path('M12 15.5l4-5.5')],
  infinity: () => [
    path(
      'M12 12c1.8-2.8 3.2-3.5 5-3.5a3.5 3.5 0 0 1 0 7c-1.8 0-3.2-.7-5-3.5s-3.2-3.5-5-3.5a3.5 3.5 0 0 0 0 7c1.8 0 3.2-.7 5-3.5z',
    ),
  ],
  atom: () =>
    [0, 60, 120]
      .map((t) =>
        path(
          `M${at(polar(12, 12, -8.5, t))}A8.5 3.5 ${t} 1 0 ${at(polar(12, 12, 8.5, t))}A8.5 3.5 ${t} 1 0 ${at(polar(12, 12, -8.5, t))}z`,
        ),
      )
      .concat(dot(12, 12)),
  'graduation-cap': (p) => [
    poly(
      [
        [12, 4],
        [2.75, 9],
        [12, 14],
        [21.25, 9],
      ],
      [0, 0, 0, 0],
      p,
    ),
    path('M6.5 11.03V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.97'),
    path('M21.25 9v6'),
  ],
  sprout: () => [
    path('M12 19.5V10'),
    path('M12 12C12 8 9.5 5.5 5 5.5c0 4 2.5 6.5 7 6.5z'),
    path('M12 10c0-3.5 2-6 6.5-6 0 3.5-2 6-6.5 6z'),
    path('M7 19.5h10'),
  ],
  tree: (p) => [
    poly(
      [
        [12, 3],
        [17.5, 10.5],
        [14.5, 10.5],
        [19, 17],
        [5, 17],
        [9.5, 10.5],
        [6.5, 10.5],
      ],
      [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      p,
    ),
    path('M12 17v4'),
  ],
  snowflake: () =>
    [90, 30, -30].map((deg) => {
      const side = (s: number) => {
        const tip = polar(12, 12, 9 * s, deg)
        const apex = polar(12, 12, 6 * s, deg)
        const a = polar(...polar(12, 12, 7.8 * s, deg), 2.2, deg + 90)
        const b = polar(...polar(12, 12, 7.8 * s, deg), 2.2, deg - 90)
        return { tip, chevron: `M${at(a)}L${at(apex)}L${at(b)}` }
      }
      const a = side(1),
        b = side(-1)
      return path(`M${at(a.tip)}L${at(b.tip)}${a.chevron}${b.chevron}`)
    }),
  wind: (p) => {
    const r = n(R(2.75, p, 2.75))
    return [
      path(`M5 10h${n(11 + 2.75 - +r)}a${r} ${r} 0 1 0-${r}-${r}`),
      path(`M5 14h${n(11.5 + 2.75 - +r)}a${r} ${r} 0 1 1-${r} ${r}`),
      path('M5 18.5h8'),
    ]
  },
  fish: () => [path('M3 12C5.5 8 10.5 6.5 16 12 10.5 17.5 5.5 16 3 12z'), path('M16 12l5-4.5v9z'), dot(7, 11)],
  utensils: (p) => {
    const r = n(R(3, p, 3))
    return [
      path(`M5.5 3v${n(9 - +r)}a${r} ${r} 0 0 0 ${r} ${r}h${n(6 - 2 * +r)}a${r} ${r} 0 0 0 ${r}-${r}V3`),
      path('M8.5 12v9'),
      pline(
        [
          [18.5, 21],
          [18.5, 3],
          [15, 9],
          [15, 13],
          [18.5, 13],
        ],
        [0, 0.5, 0.5, 1.5, 0],
        p,
      ),
    ]
  },
  wine: () => [path('M7.5 3h9l.4 5a4.9 4.9 0 0 1-9.8 0z'), path('M12 13v7.5'), path('M8.5 20.5h7')],
  sunrise: () => [path('M3 18.5h18'), path('M7 18.5a5 5 0 0 1 10 0'), path('M12 10V4M9.5 6.5L12 4l2.5 2.5')],
  waves: () => [6.5, 12, 17.5].map((y) => path(`M3 ${y}c1.5-1.8 3-1.8 4.5 0s3 1.8 4.5 0 3-1.8 4.5 0 3 1.8 4.5 0`)),
  navigation: (p) => [
    poly(
      [
        [3, 12],
        [20.5, 4],
        [12.5, 21],
        [10.5, 13.5],
      ],
      [1, 0.5, 1, 0.5],
      p,
    ),
  ],
  locate: (p) => [
    round(12, 12, 5.5, p),
    path('M12 3v3.5'),
    path('M12 17.5V21'),
    path('M3 12h3.5'),
    path('M17.5 12H21'),
    dot(12, 12),
  ],
  braces: (p) => {
    const r = n(R(2.5, p, 2.5))
    return [
      path(
        `M10 3.5H${n(7 + +r)}a${r} ${r} 0 0 0-${r} ${r}V${n(12 - +r)}a${r} ${r} 0 0 1-${r} ${r} ${r} ${r} 0 0 1 ${r} ${r}V${n(20.5 - +r)}a${r} ${r} 0 0 0 ${r} ${r}H10`,
      ),
      path(
        `M14 3.5H${n(17 - +r)}a${r} ${r} 0 0 1 ${r} ${r}V${n(12 - +r)}a${r} ${r} 0 0 0 ${r} ${r} ${r} ${r} 0 0 0-${r} ${r}V${n(20.5 - +r)}a${r} ${r} 0 0 1-${r} ${r}H14`,
      ),
    ]
  },
  brackets: (p) => {
    const r = n(R(1, p, 2))
    return [
      path(`M9 3.5H${n(5.5 + +r)}a${r} ${r} 0 0 0-${r} ${r}V${n(20.5 - +r)}a${r} ${r} 0 0 0 ${r} ${r}H9`),
      path(`M15 3.5H${n(18.5 - +r)}a${r} ${r} 0 0 1 ${r} ${r}V${n(20.5 - +r)}a${r} ${r} 0 0 1-${r} ${r}H15`),
    ]
  },
})

// ======== things and symbols, batch 3 ========
addRecipes({
  'git-commit': (p) => [round(12, 12, 3.5, p), path('M3 12h5.5'), path('M15.5 12H21')],
  'git-pull-request': (p) => {
    const r = n(R(2, p, 2))
    return [
      round(6, 5.5, 2.5, p),
      round(6, 18.5, 2.5, p),
      round(18, 18.5, 2.5, p),
      path('M6 8v8'),
      path(`M18 16V${n(7 + +r)}a${r} ${r} 0 0 0-${r}-${r}h-${n(5 - +r)}`),
      path('M15.5 4.5L13 7l2.5 2.5'),
    ]
  },
  'hard-drive': (p) => [rect(3, 5, 18, 14, R(2, p, 3)), path('M3 13h18'), dot(7, 16.5), dot(11, 16.5)],
  network: (p) => [
    rect(8.5, 3, 7, 5, R(1, p, 2)),
    rect(3, 16, 7, 5, R(1, p, 2)),
    rect(14, 16, 7, 5, R(1, p, 2)),
    path('M12 8v4'),
    path('M6.5 16v-4h11v4'),
  ],
  workflow: (p) => {
    const r = n(R(3.5, p, 3.5))
    return [
      rect(3, 3, 7, 7, R(1.5, p, 3)),
      rect(14, 14, 7, 7, R(1.5, p, 3)),
      path(`M6.5 10V${n(17.5 - +r)}a${r} ${r} 0 0 0 ${r} ${r}H14`),
    ]
  },
  rss: () => [dot(5.5, 18.5), path('M5 11a8 8 0 0 1 8 8'), path('M5 4.5a14.5 14.5 0 0 1 14.5 14.5')],
  radar: (p) => {
    const b = superPoint(12, 12, 9, exponent(p), 1, -1)
    return [round(12, 12, 9, p), round(12, 12, 4.5, p), path(`M12 12L${at(b)}`)]
  },
  building: (p) => [
    rect(5, 3, 14, 18, R(1.5, p, 2)),
    dot(9, 8),
    dot(15, 8),
    dot(9, 12.5),
    dot(15, 12.5),
    path('M10 21v-4h4v4'),
  ],
  store: (p) => [
    poly(
      [
        [5, 4],
        [19, 4],
        [21, 9],
        [3, 9],
      ],
      [1, 1, 0.5, 0.5],
      p,
    ),
    path('M4.5 9v12h15V9'),
    path('M10 21v-5h4v5'),
  ],
  landmark: (p) => [
    poly(
      [
        [3, 9],
        [12, 3.5],
        [21, 9],
      ],
      [0.5, 0.5, 0.5],
      p,
    ),
    path('M3 21h18'),
    path('M6 12v6'),
    path('M10 12v6'),
    path('M14 12v6'),
    path('M18 12v6'),
  ],
  tent: (p) => [
    poly(
      [
        [12, 4],
        [21, 20],
        [3, 20],
      ],
      [1, 1, 1],
      p,
    ),
    path('M9.5 20l2.5-5.5 2.5 5.5'),
  ],
  crown: (p) => [
    poly(
      [
        [3.5, 17],
        [3, 7],
        [8, 11.5],
        [12, 4],
        [16, 11.5],
        [21, 7],
        [20.5, 17],
      ],
      [1, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
      p,
    ),
    path('M4.5 20h15'),
  ],
  gem: (p) => [
    poly(
      [
        [7, 4],
        [17, 4],
        [21, 9.5],
        [12, 20.5],
        [3, 9.5],
      ],
      [0, 0, 0, 0, 0],
      p,
    ),
    path('M3 9.5h18'),
    path('M9.5 9.5L12 20.5'),
    path('M14.5 9.5L12 20.5'),
  ],
  dice: (p) => [rect(3.5, 3.5, 17, 17, R(3, p, 5)), dot(8, 8), dot(16, 8), dot(12, 12), dot(8, 16), dot(16, 16)],
  bot: (p) => [
    rect(5, 9, 14, 11, R(3, p, 5)),
    path('M12 9V5'),
    dot(12, 4.5),
    dot(9.5, 13.5),
    dot(14.5, 13.5),
    path('M10 17h4'),
  ],
  ghost: (p) => {
    const r = n(R(6.5, p, 6.5))
    return [
      path(
        `M5.5 20V${n(3.5 + +r)}a${r} ${r} 0 0 1 ${r}-${r}h${n(13 - 2 * +r)}a${r} ${r} 0 0 1 ${r} ${r}V20l-2.17-2-2.16 2-2.17-2-2.16 2-2.17-2z`,
      ),
      dot(9.5, 10),
      dot(14.5, 10),
    ]
  },
  accessibility: (p) => [round(12, 5, 2, p), path('M5 9Q12 11 19 9'), path('M12 10V14'), path('M8.5 21L12 14l3.5 7')],
})

// ======== things and symbols, batch 4 ========
addRecipes({
  'sticky-note': (p) => {
    const r = n(R(2, p, 2))
    return [
      poly(
        [
          [3, 3],
          [21, 3],
          [21, 14],
          [14, 21],
          [3, 21],
        ],
        [2, 2, 0, 0, 2],
        p,
      ),
      path(`M14 21v-${n(7 - +r)}a${r} ${r} 0 0 1 ${r}-${r}h${n(7 - +r)}`),
    ]
  },
  siren: (p) => {
    const r = n(R(5, p, 5))
    return [
      path(`M7 20V${n(9 + +r)}a${r} ${r} 0 0 1 ${r}-${r}h${n(10 - 2 * +r)}a${r} ${r} 0 0 1 ${r} ${r}V20`),
      path('M4.5 20h15'),
      path('M12 4v2'),
      path('M4.5 7l1.5 1.5'),
      path('M19.5 7L18 8.5'),
    ]
  },
  'traffic-cone': (p) => [
    poly(
      [
        [9.5, 4],
        [14.5, 4],
        [19, 18],
        [5, 18],
      ],
      [0.5, 0.5, 0.5, 0.5],
      p,
    ),
    path('M3 21h18'),
    path('M7.1 11.5h9.8'),
  ],
  cast: (p) => [
    pline(
      [
        [3, 8],
        [3, 4],
        [21, 4],
        [21, 20],
        [14, 20],
      ],
      [0, 2, 2, 2, 0],
      p,
    ),
    path('M3 12a9 9 0 0 1 9 9'),
    path('M3 16.5a4.5 4.5 0 0 1 4.5 4.5'),
    dot(3.5, 20.5),
  ],
  film: (p) => [
    rect(3, 3, 18, 18, R(2, p, 3)),
    path('M7 3v18'),
    path('M17 3v18'),
    path('M3 7.5h4M3 12h4M3 16.5h4'),
    path('M17 7.5h4M17 12h4M17 16.5h4'),
  ],
  disc: (p) => {
    const a = polar(12, 12, 6, 200)
    const b = polar(12, 12, 6, 250)
    return [round(12, 12, 9, p), round(12, 12, 2.5, p), path(`M${at(a)}A6 6 0 0 1 ${at(b)}`)]
  },
  presentation: (p) => [
    rect(4, 4, 16, 11, R(1.5, p, 3)),
    path('M12 15v3'),
    path('M8 21l4-3 4 3'),
    path('M8 11.5l2.5-2.5 2 2L16 7.5'),
  ],
  route: (p) => {
    const r = n(R(3.5, p, 3.5))
    return [
      round(6, 19, 2, p),
      round(18, 5, 2, p),
      path(
        `M8 19H${n(20 - +r)}a${r} ${r} 0 0 0 ${r}-${r}V${n(12 + +r)}a${r} ${r} 0 0 0-${r}-${r}H${n(4 + +r)}a${r} ${r} 0 0 1-${r}-${r}V${n(5 + +r)}a${r} ${r} 0 0 1 ${r}-${r}H16`,
      ),
    ]
  },
  knob: (p) => [round(12, 12, 9, p), path('M12 12V6.5')],
  metronome: (p) => [
    poly(
      [
        [8.5, 3],
        [15.5, 3],
        [19, 21],
        [5, 21],
      ],
      [1, 1, 1, 1],
      p,
    ),
    path('M12 17L16.08 6'),
    dot(15, 9.5),
  ],
  rainbow: () => [
    path('M3.5 16.5A8.5 8.5 0 0 1 20.5 16.5'),
    path('M7 16.5A5 5 0 0 1 17 16.5'),
    path('M10.5 16.5A1.5 1.5 0 0 1 13.5 16.5'),
  ],
  tornado: () => [
    path('M4.5 4.5h15'),
    path('M6.5 8.5h11'),
    path('M8.5 12.5h7'),
    path('M10 16.5h4'),
    path('M11 20.5h2'),
  ],
  'paint-roller': (p) => {
    const r = n(R(1.5, p, 1.5))
    return [
      rect(4, 3.5, 13, 4.5, R(1.5, p, 2.25)),
      path(`M17 5.75H${n(21 - +r)}a${r} ${r} 0 0 1 ${r} ${r}V${n(11.5 - +r)}a${r} ${r} 0 0 1-${r} ${r}H12V14`),
      rect(10, 14, 4, 7, R(1, p, 2)),
    ]
  },
  webcam: (p) => [round(12, 9.5, 6.5, p), round(12, 9.5, 2.5, p), path('M12 16v4'), path('M8 20h8')],
  watch: (p) => [
    rect(7, 6.5, 10, 11, R(3, p, 4)),
    path('M10.5 6.5V3.5h3v3'),
    path('M10.5 17.5v3h3v-3'),
    path('M12 10v2.5l1.5 1'),
  ],
  'radio-tower': () => [
    dot(12, 9),
    path('M8.5 5.5a5 5 0 0 0 0 7'),
    path('M15.5 5.5a5 5 0 0 1 0 7'),
    path('M6 3a8.5 8.5 0 0 0 0 12'),
    path('M18 3a8.5 8.5 0 0 1 0 12'),
    path('M9 21l3-8.5 3 8.5'),
  ],
  'dollar-sign': () => [
    path('M12 3v18'),
    path('M16 8c0-1.7-1.8-3-4-3s-4 1.2-4 3 1.8 2.6 4 3.2 4 1.4 4 3.2-1.8 3.4-4 3.4-4-1.3-4-3'),
  ],
  equal: () => [path('M3 9h18'), path('M3 15h18')],
})

// ======== things and symbols, batch 5 ========
addRecipes({
  asterisk: () => [90, 30, -30].map((deg) => path(`M${at(polar(12, 12, 9, deg))}L${at(polar(12, 12, -9, deg))}`)),
  'party-popper': (p) => [
    poly(
      [
        [3.5, 20.5],
        [8.5, 6.5],
        [17.5, 15.5],
      ],
      [1, 1, 1],
      p,
    ),
    path('M13 3.5V6'),
    path('M21 9.5h-2.5'),
    dot(17.5, 6),
    dot(20.5, 19),
  ],
  balloon: () => [ellipse(12, 9.5, 6, 6.5), path('M12 16c-1.5 1.8 1.5 3.4 0 5')],
  bed: (p) => [
    path('M3.5 5V20'),
    path('M3.5 17h17.5v3'),
    rect(7, 10.5, 4, 3.5, R(1, p, 1.75)),
    path('M14 17v-4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4'),
  ],
  'paw-print': (p) => [
    round(5, 10.5, 1.5, p),
    round(9, 6, 1.5, p),
    round(15, 6, 1.5, p),
    round(19, 10.5, 1.5, p),
    path(
      'M12 14.5c-2.4 0-4.8 2.4-4.8 4.5 0 1.3 1 1.9 2.2 1.9.9 0 1.6-.5 2.6-.5s1.7.5 2.6.5c1.2 0 2.2-.6 2.2-1.9 0-2.1-2.4-4.5-4.8-4.5z',
    ),
  ],
  'id-card': (p) => [rect(3, 5, 18, 14, R(2, p, 3)), round(8.5, 12, 2.5, p), path('M14 10.5h4'), path('M14 14h3')],
  sailboat: (p) => [
    path('M12 3v14.5'),
    path('M12 4.5L19 14.5H12'),
    path('M12 7L6 14.5h6'),
    poly(
      [
        [3.5, 17.5],
        [20.5, 17.5],
        [17, 21],
        [7, 21],
      ],
      [0.5, 0.5, 1, 1],
      p,
    ),
  ],
  train: (p) => [
    rect(5, 3, 14, 15, R(4, p, 5)),
    path('M5 11h14'),
    dot(8.5, 14.5),
    dot(15.5, 14.5),
    path('M10 18l-2.5 3'),
    path('M14 18l2.5 3'),
  ],
  car: (p) => [
    path('M7.5 9.5L9 5.5h6l1.5 4'),
    rect(3, 9.5, 18, 7.5, R(2, p, 3.5)),
    dot(7, 13.5),
    dot(17, 13.5),
    path('M7 17v3'),
    path('M17 17v3'),
  ],
  candle: (p) => [
    path('M12 3c1.5 1.7 2.2 3 2.2 4.2a2.2 2.2 0 0 1-4.4 0C9.8 6 10.5 4.7 12 3z'),
    rect(8, 12.5, 8, 8.5, R(1.5, p, 3)),
  ],
  cherry: (p) => [
    round(6.5, 17.5, 3, p),
    round(17.5, 17.5, 3, p),
    path('M6.5 14.5C6.5 9.5 9.5 5.5 14.5 3.5'),
    path('M17.5 14.5C17.5 9.5 16.5 5.5 14.5 3.5'),
  ],
  mushroom: (p) => {
    const r = n(R(2.5, p, 2.5))
    return [
      path(`${superArc(12, 12, 8.5, exponent(p), 180, 360)}z`),
      path(`M9.5 12V${n(20 - +r)}a${r} ${r} 0 0 0 ${r} ${r}h${n(5 - 2 * +r)}a${r} ${r} 0 0 0 ${r}-${r}V12`),
      dot(8.5, 8.5),
      dot(15.5, 8.5),
    ]
  },
  barcode: () => [4.5, 7.5, 12, 15, 19.5].map((x) => path(`M${x} 5v14`)),
  'text-cursor': () => [path('M9 4h6'), path('M12 4v16'), path('M9 20h6')],
  return: (p) => [
    pline(
      [
        [20, 5],
        [20, 13],
        [5, 13],
      ],
      [0, 3, 0],
      p,
    ),
    path('M9.5 8.5L5 13l4.5 4.5'),
  ],
  backspace: (p) => [
    poly(
      [
        [9, 5],
        [21, 5],
        [21, 19],
        [9, 19],
        [3, 12],
      ],
      [1, 2, 2, 1, 1.5],
      p,
    ),
    path('M12.5 9.5l5 5M17.5 9.5l-5 5'),
  ],
})

// ======== things and symbols, batch 6 ========
addRecipes({
  shirt: (p) => {
    const collar = superArc(12, 3, 4, exponent(p), 0, 180).replace(/^M[^C]*/, '') // the neckline follows the curve setting, not the radius
    return [path(`M8 3L2.75 6.5l2.5 4L8 9v12h8V9l2.75 1.5 2.5-4L16 3${collar}z`)]
  },
  sigma: () => [path('M18.5 3H6.5l7 9-7 9h12')],
  scale: () => [
    path('M12 4v16'),
    path('M8 20h8'),
    path('M4.5 7.5h15'),
    path('M6 7.5L3 14h6z'),
    path('M18 7.5L15 14h6z'),
  ],
  flower: () => [
    path('M7.5 4.5l2.2 2.8L12 3.5l2.3 3.8 2.2-2.8c.3 4.8-1.3 8.5-4.5 8.5s-4.8-3.7-4.5-8.5z'),
    path('M12 13v8'),
    path('M12 19c0-2-1.8-3.5-4.5-3.5 0 2 1.8 3.5 4.5 3.5z'),
    path('M12 19c0-2 1.8-3.5 4.5-3.5 0 2-1.8 3.5-4.5 3.5z'),
  ],
  sofa: (p) => [
    pline(
      [
        [5.5, 9.5],
        [5.5, 5.5],
        [18.5, 5.5],
        [18.5, 9.5],
      ],
      [0, 2, 2, 0],
      p,
    ),
    rect(3, 9.5, 18, 6, R(2, p, 3)),
    path('M6 15.5v3'),
    path('M18 15.5v3'),
  ],
  notebook: (p) => [rect(6, 3, 14, 18, R(2, p, 3)), path('M4 7h4M4 12h4M4 17h4'), path('M12 8h5'), path('M12 12h5')],
})

// the batches: one file each, listed by a generated index
addRecipes(batchRecipes)
