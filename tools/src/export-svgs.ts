// Writes every name in the set as a plain static SVG, for consumers that cannot use CSS (an <img>, a mask, a design tool).
//
//   pnpm export [outDir]        (default: export/ in the repository root; a given directory is relative to where you run it)
//
// Base vectors are written without any pose data; every name that is a vector in a state (mic-off, arrow-left, cloud-done ...)
// is written with that state baked in. Also writes sprite.svg (one <symbol> per name, for <use href="sprite.svg#mic-off">) and manifest.json: name -> { base, state }.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_STYLE, POSE_ATTR, stripStateShapes } from '@autosvg/core'
import { type Resolved, renderIcon, resolve, stateNames } from '@autosvg/runtime/render'
import { VECTORS } from '@autosvg/vectors'
import { root } from './paths.ts'

const out = process.argv[2] ? resolvePath(process.argv[2]) : fileURLToPath(new URL('export/', root))
mkdirSync(`${out}/svg`, { recursive: true })

/** A base vector: the plain drawing, with no motion data and no state-only elements. */
const plain = (svg: string): string =>
  stripStateShapes(svg)
    .replace(POSE_ATTR, '')
    .replace(/\sdata-(?:motion|states)="[^"]*"/g, '')
    .replace(/<g data-gr="">\s*([\s\S]*?)\s*<\/g>/g, '$1')

/** Drop the identity parts of a baked transform (translate(0 0), rotate(0), scale(1 1), skewX(0)). */
const tidyTransforms = (svg: string): string =>
  svg
    .replace(/ ?(?:translate\(0 0\)|rotate\(0\)|scale\(1 1\)|skewX\(0\))/g, '')
    .replace(/ ?translate\((-?[\d.]+) (-?[\d.]+)\) translate\(-\1 -\2\)/g, '')
    .replace(/transform=" +/g, 'transform="')
    .replace(/ transform=""/g, '')

const manifest: Record<string, Resolved> = {}
const symbols: string[] = []
const names = [...VECTORS.map((i) => i.name), ...stateNames()]

for (const name of names) {
  const found = resolve(name)
  if (!found) throw new Error(`cannot resolve ${name}`)
  const drawn = renderIcon(name, {}, { inline: true })
  const svg = tidyTransforms(found.state ? drawn : plain(drawn))
  writeFileSync(`${out}/svg/${name}.svg`, `${svg.trim()}\n`)
  const inner = svg.replace(/^<svg\b[^>]*>\s*/, '').replace(/\s*<\/svg>\s*$/, '')
  symbols.push(
    `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${DEFAULT_STYLE.stroke}" stroke-linecap="${DEFAULT_STYLE.cap}" stroke-linejoin="${DEFAULT_STYLE.join}">\n${inner}\n</symbol>`,
  )
  manifest[name] = found
}

writeFileSync(
  `${out}/sprite.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>\n`,
)
writeFileSync(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `${names.length} SVG files in ${out}/svg (${VECTORS.length} vectors, ${names.length - VECTORS.length} states)`,
)
