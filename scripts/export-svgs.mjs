// Writes every name in the set as a plain static SVG, for consumers that cannot use CSS (an <img>, a mask, a design tool).
//
//   node scripts/export-svgs.mjs [outDir]        (default: export/)
//
// Base icons are written without any pose data; every name that is an icon in a state (mic-off, arrow-left, cloud-done ...)
// is written with that state baked in. Also writes sprite.svg (one <symbol> per name, for <use href="sprite.svg#mic-off">) and manifest.json: name -> { base, state }.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// icon-runtime.js declares a custom element; a stub is enough for the node side, which only calls renderIcon
globalThis.HTMLElement ??= class {}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, process.argv[2] ?? 'export')
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error', plugins: [] })
try {
  const runtime = await server.ssrLoadModule('/src/icon-runtime.js')
  const poses = await server.ssrLoadModule('/src/poses.js')
  const icons = await server.ssrLoadModule('/src/icons.js')
  mkdirSync(join(out, 'svg'), { recursive: true })
  const manifest = {}
  const symbols = []
  const names = [...icons.ICONS.map((i) => i.name), ...runtime.stateNames()]
  for (const name of names) {
    const found = runtime.resolve(name)
    let svg = runtime.renderIcon(name, {}, { inline: true })
    if (!found.state) {
      // a base icon: the plain drawing, with no motion data and no state-only elements
      svg = poses
        .stripStateShapes(svg)
        .replace(poses.POSE_ATTR, '')
        .replace(/\sdata-(?:motion|states)="[^"]*"/g, '')
        .replace(/<g data-gr="">\s*([\s\S]*?)\s*<\/g>/g, '$1')
    }
    // drop the identity parts of a baked transform (translate(0 0), rotate(0), scale(1 1), skewX(0))
    svg = svg.replace(/ ?(?:translate\(0 0\)|rotate\(0\)|scale\(1 1\)|skewX\(0\))/g, '').replace(/ ?translate\((-?[\d.]+) (-?[\d.]+)\) translate\(-\1 -\2\)/g, '').replace(/transform=" +/g, 'transform="').replace(/ transform=""/g, '')
    writeFileSync(join(out, 'svg', `${name}.svg`), svg.trim() + '\n')
    const inner = svg.replace(/^<svg\b[^>]*>\s*/, '').replace(/\s*<\/svg>\s*$/, '')
    symbols.push(`<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n${inner}\n</symbol>`)
    manifest[name] = found
  }
  writeFileSync(join(out, 'sprite.svg'), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join('\n')}\n</svg>\n`)
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${names.length} SVG files in ${out}/svg (${icons.ICONS.length} icons, ${names.length - icons.ICONS.length} states)`)
} finally {
  await server.close()
}
