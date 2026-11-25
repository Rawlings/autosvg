// Checks recipes from their numbers alone, with no browser: bounds, centring, grid, narrow gaps, loose ends, kinks.
//
//   pnpm quick magnet glasses     these vectors
//   pnpm quick --all              every vector (a good way to see what the checks think of the set)
//
// `pnpm seed` runs the same check on every vector file it writes. `pnpm verify-vectors` is still the final word: it measures pixels.
import { quickCheck } from '@autosvg/checks/quick'
import { RECIPES, stripStateShapes } from '@autosvg/core'
import { VECTORS } from '@autosvg/vectors'

/** The shapes of a vector at the default look: from its recipe, or from its file. */
export function vectorMarkup(name: string): string | undefined {
  const recipe = RECIPES[name]
  if (recipe) return recipe({ r: 1, c: 0 }).join('\n')
  const file = VECTORS.find((vector) => vector.name === name)
  return file && stripStateShapes(file.svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, ''))
}

const args = process.argv.slice(2)
const names = args.includes('--all')
  ? VECTORS.map((vector) => vector.name)
  : args.filter((arg) => !arg.startsWith('--'))
if (names.length === 0) throw new Error('name some vectors, or pass --all')

let failed = 0
let warned = 0
for (const name of names) {
  const markup = vectorMarkup(name)
  if (markup === undefined) {
    console.log(`✗ ${name}: no recipe and no file`)
    failed++
    continue
  }
  const findings = quickCheck(markup, name)
  const bad = findings.some((f) => f.level === 'fail')
  failed += bad ? 1 : 0
  warned += !bad && findings.length ? 1 : 0
  if (findings.length === 0 && names.length > 1) continue
  console.log(`${bad ? '✗' : findings.length ? '!' : '✓'} ${name}`)
  for (const finding of findings) console.log(`    ${finding.level} ${finding.rule}: ${finding.message}`)
}
console.log(`${names.length} vectors: ${failed} fail, ${warned} with warnings`)
process.exit(failed ? 1 : 0)
