// Draws the README banner from the real vector files: docs/hero.svg.
//
//   pnpm hero          write docs/hero.svg
//
// The picture is made of the set itself, so it changes when the set does. Run it after adding vectors you want shown.
import { mkdirSync, writeFileSync } from 'node:fs'
import { getVector } from '@autosvg/vectors'

const W = 1280
const H = 440
const GREEN = '#39ff14'
const CELL = 64 // each vector is drawn at 48 px in a 64 px cell
const COLS = 18

// a spread across the categories: interface, devices, shops, home, nature, tools, play
const SHOWN = [
  'bell',
  'rocket',
  'heart',
  'camera',
  'lock',
  'cloud',
  'bicycle',
  'suitcase',
  'perfume',
  'drill',
  'fuel-pump',
  'tripod',
  'turntable',
  'puzzle',
  'leaf',
  'mic',
  'globe',
  'key',
  'sun',
  'moon',
  'star',
  'gamepad',
  'barbecue',
  'radiator',
  'lightbulb',
  'wine',
  'sofa',
  'train',
  'router',
  'compass',
  'lipstick',
  'trophy',
  'atom',
  'anchor',
  'umbrella',
  'flask',
]

/** The drawing of a vector without its motion data and state shapes: only the geometry. */
function geometry(name: string): string {
  const svg = getVector(name)?.svg
  if (svg === undefined) throw new Error(`no such vector: ${name}`)
  return svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .split('\n')
    .filter((line) => !/\bdata-st\b/.test(line))
    .join('\n')
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/g, '')
    .replace(/\spathLength="[^"]*"/g, '')
    .trim()
}

const names = SHOWN.filter((n) => getVector(n))
const rows = Math.ceil(names.length / COLS)
const gridW = COLS * CELL
const x0 = (W - gridW) / 2
const y0 = H - rows * CELL - 44

const tiles = names
  .map((name, i) => {
    const x = x0 + (i % COLS) * CELL + (CELL - 48) / 2
    const y = y0 + Math.floor(i / COLS) * CELL + (CELL - 48) / 2
    // fade the outer columns so the strip melts into the background
    const col = i % COLS
    const edge = Math.min(col, COLS - 1 - col)
    const opacity = edge === 0 ? 0.35 : edge === 1 ? 0.65 : 1
    return `<g transform="translate(${x} ${y}) scale(2)" opacity="${opacity}">\n${geometry(name)}\n</g>`
  })
  .join('\n')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="autosvg: an agentic suite for producing vectors">
<title>autosvg: an agentic suite for producing vectors</title>
<defs>
<radialGradient id="glow" cx="50%" cy="0%" r="75%">
<stop offset="0" stop-color="${GREEN}" stop-opacity="0.22"/>
<stop offset="1" stop-color="${GREEN}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="20" fill="#0a0a0a"/>
<rect width="${W}" height="${H}" rx="20" fill="url(#glow)"/>
<text x="${W / 2}" y="132" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="88" font-weight="700" letter-spacing="-3" fill="#ffffff">auto<tspan fill="${GREEN}">svg</tspan></text>
<text x="${W / 2}" y="184" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="26" fill="#a3a3a3">Vectors, drawn by agents. Checked by machines.</text>
<g fill="none" stroke="${GREEN}" stroke-width="0.75" stroke-linecap="round" stroke-linejoin="round">
${tiles}
</g>
</svg>
`

mkdirSync(new URL('../../docs/', import.meta.url), { recursive: true })
writeFileSync(new URL('../../docs/hero.svg', import.meta.url), svg)
console.log(`docs/hero.svg: ${names.length} vectors (${SHOWN.length - names.length} not found)`)
