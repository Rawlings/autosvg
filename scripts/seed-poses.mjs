// Writes every icon file with its pose data baked in, and creates files for new recipe icons.
//
//   node scripts/seed-poses.mjs            write the files
//   node scripts/seed-poses.mjs --check    only report (exit 1 if anything is wrong or out of date)
//
// Sources: an icon with a recipe is drawn from its recipe at default settings; an icon without one keeps the
// geometry of its saved file. Either way the pose data comes from the table in src/poses.js, and the result
// is checked against the table's expected shape count so a wrong part index cannot slip through.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RECIPES } from '../src/recipes.js'
import { POSES, baseShapes, poseRootAttrs, splitTop, withPose } from '../src/poses.js'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons')
const check = process.argv.includes('--check')

const innerOf = (svg) => svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()
const ROOT =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'

const files = readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4))
const names = [...new Set([...files, ...Object.keys(RECIPES)])].sort()

const problems = []
let written = 0
let created = 0
let unchanged = 0

for (const name of names) {
  const file = join(dir, `${name}.svg`)
  const base = RECIPES[name] ? RECIPES[name]({ r: 1, c: 0 }).join('\n') : innerOf(readFileSync(file, 'utf8'))
  const spec = POSES[name]
  if (!spec) {
    problems.push(`${name}: no pose in src/poses.js`)
    continue
  }
  const count = baseShapes(base).length // an icon's own shapes, without any off-state strokes
  if (count !== spec.n && count !== spec.split?.from) {
    problems.push(`${name}: pose table expects ${spec.split ? `${spec.split.from} (before the split) or ` : ''}${spec.n} shapes but the icon has ${count}`)
    continue
  }
  const posed = splitTop(withPose(name, base))
  const own = spec.group ? spec.n - (spec.group.at?.length ?? spec.n) + 1 : spec.n // a group around some or all of the shapes counts as one
  const expected = own + (spec.add?.length ?? 0)
  if (posed.length !== expected) {
    problems.push(`${name}: pose table expects ${expected} shapes (${spec.n} plus state-only strokes) after any split but got ${posed.length}`)
    continue
  }
  const body = posed
    .map((el) => '  ' + el.replace(/\n/g, '\n  '))
    .join('\n')
  const svg = `<svg ${ROOT}${poseRootAttrs(name)}>\n${body}\n</svg>\n`
  const exists = existsSync(file)
  if (exists && readFileSync(file, 'utf8') === svg) {
    unchanged++
    continue
  }
  if (check) problems.push(`${name}: ${exists ? 'file is out of date' : 'file is missing'}`)
  else {
    writeFileSync(file, svg)
    exists ? written++ : created++
  }
}

for (const name of Object.keys(POSES)) if (!names.includes(name)) problems.push(`${name}: pose entry has no icon`)

console.log(`${names.length} icons: ${created} created, ${written} rewritten, ${unchanged} already current`)
if (problems.length) {
  console.log('\nProblems:\n  ' + problems.join('\n  '))
  process.exit(1)
}
