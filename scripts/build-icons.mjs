// Icon construction kit: pure line icons, 24px grid, 1.5px stroke, round caps and joins.
// Every icon is assembled from the same parts and radii so the family stays consistent.
//
//   node scripts/build-icons.mjs        -> seeds MISSING icons into src/icons/ (never overwrites)
//   node scripts/build-icons.mjs --force -> regenerates all from this kit (discards canvas edits)
//
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { centreOn, circleChain, roundedPolygon, symmetric } from '../src/geo.js'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons')

// ---- kit -------------------------------------------------------------------
const R = { l: 3, m: 2, s: 1.5 } // corner radii: containers / parts / details

const path = (d) => `<path d="${d}" />`
const circle = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" />`
const ellipse = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`
const rect = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" />`
const polygon = (pts) => `<polygon points="${pts.join(' ')}" />`
// A "dot" is a tiny circle: with the 1.5 stroke it renders as a solid 2.5px dot, still pure line.
const dot = (cx, cy) => circle(cx, cy, 0.5)

const n = (v) => +v.toFixed(2)
const pol = (cx, cy, r, deg) => [n(cx + r * Math.cos((deg * Math.PI) / 180)), n(cy + r * Math.sin((deg * Math.PI) / 180))]

// gear: 8 teeth computed from radii so every tooth is identical
const gear = (() => {
  const pts = []
  for (let i = 0; i < 8; i++) {
    const a = i * 45 - 90
    for (const [r, d] of [[7, -13], [9, -8], [9, 8], [7, 13]]) pts.push(pol(12, 12, r, a + d).join(','))
  }
  return pts
})()

// sun rays: 8 rays, same inner and outer radius
const rays = (() => {
  let d = ''
  for (let i = 0; i < 8; i++) {
    const a = i * 45
    const [x1, y1] = pol(12, 12, 6.5, a)
    const [x2, y2] = pol(12, 12, 9, a)
    d += `M${x1} ${y1}L${x2} ${y2}`
  }
  return d
})()

// ---- icons -----------------------------------------------------------------
const icons = {
  // --- essentials ---
  home: [
    path('M3 10.5L12 3l9 7.5'),
    // wall tops sit exactly on the roof line: y = 10.5 - (x - 3) * 7.5 / 9
    path('M5 8.83V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V8.83'),
  ],
  search: [circle(11, 11, 7), path('M16 16l5 5')],
  plus: [path('M12 5v14M5 12h14')],
  minus: [path('M5 12h14')],
  check: [path('M5 12.5l4.5 4.5L19 7.5')],
  close: [path('M6 6l12 12M18 6L6 18')],
  menu: [path('M4 7h16M4 12h16M4 17h16')],
  'more-horizontal': [dot(5, 12), dot(12, 12), dot(19, 12)],
  'more-vertical': [dot(12, 5), dot(12, 12), dot(12, 19)],
  list: [path('M9 6h12M9 12h12M9 18h12'), dot(4.5, 6), dot(4.5, 12), dot(4.5, 18)],

  // --- arrows ---
  'arrow-up': [path('M12 19V5M6 11l6-6 6 6')],
  'arrow-down': [path('M12 5v14M6 13l6 6 6-6')],
  'arrow-left': [path('M19 12H5M11 6l-6 6 6 6')],
  'arrow-right': [path('M5 12h14M13 6l6 6-6 6')],
  'arrow-up-right': [path('M7 17L17 7M9 7h8v8')],
  'chevron-up': [path('M6 15l6-6 6 6')],
  'chevron-down': [path('M6 9l6 6 6-6')],
  'chevron-left': [path('M15 6l-6 6 6 6')],
  'chevron-right': [path('M9 6l6 6-6 6')],
  'external-link': [
    path('M10 5H7a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3'),
    path('M14 4h6v6M20 4l-9 9'),
  ],
  refresh: [path('M20 12a8 8 0 1 1-2.34-5.66L20 8.5'), path('M20 4v4.5h-4.5')],
  download: [path('M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15')],
  upload: [path('M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 19.5h15')],
  'log-out': [path('M10 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h3'), path('M15 8l4 4-4 4M19 12H9')],
  expand: [
    path('M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3'),
  ],

  // --- actions ---
  copy: [
    rect(9, 9, 12, 12, R.l),
    path('M15 9V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h3'),
  ],
  // pencil on the 45 degree diagonal: body, tapered tip and a band, computed from one axis and then centred
  edit: (() => {
    const u = [Math.SQRT1_2, -Math.SQRT1_2] // along the pencil, tip to end
    const nrm = [Math.SQRT1_2, Math.SQRT1_2] // across it
    const tip = [4, 20]
    const w = 2.1 // half width
    const at = (along, across) => [tip[0] + u[0] * along + nrm[0] * across, tip[1] + u[1] * along + nrm[1] * across]
    const [body, band] = centreOn(
      [at(0, 0), at(4.5, w), at(18, w), at(18, -w), at(4.5, -w)],
      [at(14.5, w), at(14.5, -w)],
    )
    const pt = ([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`
    return [path(roundedPolygon(body, [0.6, 1, 1.5, 1.5, 1])), path(`M${pt(band[0])}L${pt(band[1])}`)]
  })(),
  trash: [
    path('M4.5 6.5h15M9.5 6.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2'),
    path('M6.5 6.5l.8 12.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-12.2M10 11v5M14 11v5'),
  ],
  // funnel as a filleted polygon: every corner is a true tangent arc, stem is wide enough to stay open at 16px
  filter: [
    path(
      roundedPolygon(
        [[3.5, 4.5], [20.5, 4.5], [13.5, 12], [13.5, 19.5], [10.5, 19.5], [10.5, 12]],
        [1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
      ),
    ),
  ],
  share: [
    circle(6, 12, 2.5),
    circle(18, 6, 2.5),
    circle(18, 18, 2.5),
    path('M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6'),
  ],
  send: [path('M20.5 3.5l-17 7 6.5 3 3 6.5z'), path('M10 13.5l10.5-10')],
  link: [
    path('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'),
    path('M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'),
  ],
  power: [path('M12 3.5v8'), path('M7 6.5a8 8 0 1 0 10 0')],

  // --- people and communication ---
  user: [circle(12, 7.5, 3.5), path('M4 20.5c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5')],
  users: [
    circle(9, 8, 3.5),
    path('M3 20.5c0-3.6 2.7-6 6-6s6 2.4 6 6'),
    path('M15.5 4.8a3.5 3.5 0 0 1 0 6.4'),
    path('M18 14.8c2 .6 3 2.4 3 5.7'),
  ],
  mail: [rect(3, 5, 18, 14, R.l), path('M3 8l9 5.5 9-5.5')],
  chat: [
    path('M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5l-4.5 4v-4H7a3 3 0 0 1-3-3z'),
    dot(8.5, 10.5),
    dot(12, 10.5),
    dot(15.5, 10.5),
  ],
  bell: [path('M6 15.5V10a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z'), path('M10 20h4')],
  heart: [path('M12 20s-8-4.5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20z')],
  star: [polygon(['12 2.9', '14.7 8.68', '21.03 9.46', '16.37 13.82', '17.58 20.09', '12 17', '6.42 20.09', '7.63 13.82', '2.97 9.46', '9.3 8.68'])],

  // --- content ---
  calendar: [rect(3.5, 5, 17, 15.5, R.l), path('M3.5 10h17M8 3v4M16 3v4')],
  clock: [circle(12, 12, 9), path('M12 7v5l3 2')],
  folder: [path('M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z')],
  file: [
    path('M14 3H8a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8z'),
    path('M14 3v3.5a1.5 1.5 0 0 0 1.5 1.5H19'),
  ],
  bookmark: [path('M6.5 4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1V20.5L12 16.5l-5.5 4z')],
  image: [rect(3.5, 4.5, 17, 15, R.l), circle(9, 10, 1.5), path('M20.5 15l-4.5-4.5L7 19.5')],
  camera: [
    path('M3.5 9a2.5 2.5 0 0 1 2.5-2.5h1.5L9 4h6l1.5 2.5H18A2.5 2.5 0 0 1 20.5 9v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17z'),
    circle(12, 12.5, 3.5),
  ],
  eye: [
    path('M3 12C5 8 8 5.5 12 5.5s7 2.5 9 6.5c-2 4-5 6.5-9 6.5S5 16 3 12z'),
    circle(12, 12, 3),
  ],
  'eye-off': [
    path('M3 12C5 8 8 5.5 12 5.5s7 2.5 9 6.5c-2 4-5 6.5-9 6.5S5 16 3 12z'),
    circle(12, 12, 3),
    path('M4 4l16 16'),
  ],
  lock: [rect(4.5, 10.5, 15, 10, R.l), path('M8 10.5V8a4 4 0 0 1 8 0v2.5M12 15v2')],
  globe: [circle(12, 12, 9), path('M3 12h18'), ellipse(12, 12, 4, 9)],
  'map-pin': [
    path('M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11-6.5 11z'),
    circle(12, 10, 2.5),
  ],
  wifi: [path('M3 9.5a13.5 13.5 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9 16.5a4.5 4.5 0 0 1 6 0'), dot(12, 20)],
  cart: [
    path('M3 4h2.5l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.5'),
    circle(9.5, 19.5, 1),
    circle(17.5, 19.5, 1),
  ],
  'credit-card': [rect(3, 5, 18, 14, R.l), path('M3 10h18M7 15h3')],

  // --- media and system ---
  play: [path('M7.5 4.5v15L20 12z')],
  pause: [rect(6, 4.5, 4, 15, R.s), rect(14, 4.5, 4, 15, R.s)],
  sun: [circle(12, 12, 3.5), path(rays)],
  moon: [path('M20.5 14.2A8.8 8.8 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z')],
  settings: [polygon(gear), circle(12, 12, 3)],
  sliders: [path('M3 8h7.5M15.5 8H21M3 16h2.5M10.5 16H21'), circle(13, 8, 2.5), circle(8, 16, 2.5)],
  sidebar: [rect(3, 3, 18, 18, R.l), path('M9 3v18')],

  // --- status ---
  info: [circle(12, 12, 9), path('M12 11v5.5'), dot(12, 7.5)],
  'alert-circle': [circle(12, 12, 9), path('M12 7.5v5'), dot(12, 16.5)],
  'alert-triangle': [
    path('M10.4 5a1.8 1.8 0 0 1 3.2 0l7.2 12.6a1.8 1.8 0 0 1-1.6 2.7H4.8a1.8 1.8 0 0 1-1.6-2.7z'),
    path('M12 9.5v4.5'),
    dot(12, 17),
  ],
  'check-circle': [circle(12, 12, 9), path('M8 12.5l2.5 2.5 5-5.5')],
  'x-circle': [circle(12, 12, 9), path('M9 9l6 6M15 9l-6 6')],

  // --- build and design ---
  layers: [path('M12 3l9 4.5-9 4.5-9-4.5z'), path('M3 12l9 4.5 9-4.5'), path('M3 16.5l9 4.5 9-4.5')],
  frame: [path('M7 3v18M17 3v18M3 7h18M3 17h18')],
  grid: [rect(3, 3, 7.5, 7.5, R.m), rect(13.5, 3, 7.5, 7.5, R.m), rect(3, 13.5, 7.5, 7.5, R.m), rect(13.5, 13.5, 7.5, 7.5, R.m)],
  component: [
    path('M12 3l3 3-3 3-3-3z'),
    path('M6 9l3 3-3 3-3-3z'),
    path('M18 9l3 3-3 3-3-3z'),
    path('M12 15l3 3-3 3-3-3z'),
  ],
  'pen-tool': [path('M9 3h6l3 8-6 10-6-10z'), circle(12, 10.5, 1.5), path('M12 12V21')],
  cursor: [path('M5 3.5l14 6-6 2.5-2.5 6z')],
  type: [path('M5.5 7V4.5h13V7M12 4.5v15M9 19.5h6')],
  palette: [
    path('M12 3a9 9 0 1 0 0 18c1.5 0 2.2-.9 2.2-2s-.7-1.7-.7-2.6.9-1.9 2.4-1.9H18.5a2.5 2.5 0 0 0 2.5-2.5A9 9 0 0 0 12 3z'),
    dot(7.5, 11.5),
    dot(10.5, 7.5),
    dot(15.5, 7.5),
  ],
  cube: [path('M12 3l8 4.5v9L12 21l-8-4.5v-9z'), path('M4 7.5l8 4.5 8-4.5M12 12v9')],
  spark: [
    path('M10.5 6c.7 4.1 2.9 6.8 7.5 7.5-4.6.7-6.8 3.4-7.5 7.5-.7-4.1-2.9-6.8-7.5-7.5 4.6-.7 6.8-3.4 7.5-7.5z'),
    path('M18 3.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z'),
  ],

  // --- dev ---
  code: [path('M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5.5l-3 13')],
  terminal: [rect(3, 4.5, 18, 15, R.l), path('M7.5 10l3 2.5-3 2.5M13 15h3.5')],
  branch: [
    circle(6, 6, 2.5),
    circle(6, 18, 2.5),
    circle(18, 6, 2.5),
    path('M6 8.5v7M18 8.5V10a3 3 0 0 1-3 3H8.5a2.5 2.5 0 0 0-2.5 2.5'),
  ],
  chip: [
    rect(7, 7, 10, 10, R.m),
    rect(10, 10, 4, 4, 1),
    path('M9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4'),
  ],
  database: [
    ellipse(12, 6, 8, 3),
    path('M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'),
  ],
  // outline of three overlapping circles on a flat base; arcs and flags are computed
  cloud: [
    path(
      circleChain(
        [
          { cx: 7, cy: 15.75, r: 3.75 },
          { cx: 11.5, cy: 10.5, r: 5.75 },
          { cx: 16.5, cy: 15.25, r: 4.25 },
        ],
        19.5,
      ),
    ),
  ],
  bolt: [path('M13.5 3L5 13.5h6l-.5 7.5L19 10.5h-6z')],
  // drawn as the left half only, mirrored by symmetric(), so both sides are identical by construction
  shield: (() => {
    const left = [[12, 3], [4.5, 6], [4.5, 12], [12, 21]]
    const rl = [1.5, 2, 9, 1.5]
    return [
      path(roundedPolygon(symmetric(left), [...rl, ...rl.slice(1, -1).reverse()])),
      path('M8.5 12l2.5 2.5 4.5-5'),
    ]
  })(),
}

// ---- emit ------------------------------------------------------------------
const wrap = (parts) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n${parts
    .map((p) => '  ' + p)
    .join('\n')}\n</svg>\n`

// The icon FILES are the source of truth now: icons are edited and saved in the canvas.
// This kit only seeds icons that don't exist yet, and never overwrites an edited file.
// Pass --force to regenerate everything from the kit (this discards canvas edits).
const force = process.argv.includes('--force')
mkdirSync(out, { recursive: true })
if (force) for (const f of readdirSync(out)) if (f.endsWith('.svg')) rmSync(join(out, f))
let wrote = 0
for (const [name, parts] of Object.entries(icons)) {
  const file = join(out, `${name}.svg`)
  if (!force && existsSync(file)) continue
  writeFileSync(file, wrap(parts))
  wrote++
}
console.log(`seeded ${wrote} new icons (${Object.keys(icons).length - wrote} existing files left untouched) in ${out}`)
