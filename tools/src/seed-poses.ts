// Writes every vector file with its pose data baked in, and creates files for new recipe vectors.
//
//   pnpm seed          write the files
//   pnpm seed:check    only report (exit 1 if anything is wrong or out of date)
//
// Sources: a vector with a recipe is drawn from its recipe at default settings; a vector without one keeps the
// geometry of its saved file. Either way the pose data comes from the table in packages/core/src/poses/table.ts, and the result
// is checked against the table's expected shape count so a wrong part index cannot slip through.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { quickCheck } from '@autosvg/checks/quick'
import { baseShapes, POSES, poseRootAttrs, RECIPES, splitTop, withPose } from '@autosvg/core'
import { vectorDir } from './paths.ts'

const dir = vectorDir
const check = process.argv.includes('--check')
/** `--json` prints one JSON object instead of text: what the MCP server reads. */
const asJson = process.argv.includes('--json')
const say = (text: string): void => {
  if (!asJson) console.log(text)
}
const findings: { name: string; level: string; rule: string; message: string }[] = []

const innerOf = (svg: string): string =>
  svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
const ROOT =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4))
const names = [...new Set([...files, ...Object.keys(RECIPES)])].sort()

const problems: string[] = []
/** Vectors whose file was just written: they get the quick geometry check straight away. */
const changed: { name: string; base: string }[] = []
let written = 0
let created = 0
let unchanged = 0

for (const name of names) {
  const file = fileURLToPath(new URL(`${name}.svg`, dir))
  const recipe = RECIPES[name]
  const base = recipe ? recipe({ r: 1, c: 0 }).join('\n') : innerOf(readFileSync(file, 'utf8'))
  const spec = POSES[name]
  if (!spec) {
    problems.push(`${name}: no pose in the pose table`)
    continue
  }
  const count = baseShapes(base).length // a vector's own shapes, without any off-state strokes
  if (count !== spec.n && count !== spec.split?.from) {
    problems.push(
      `${name}: pose table expects ${spec.split ? `${spec.split.from} (before the split) or ` : ''}${spec.n} shapes but the vector has ${count}`,
    )
    continue
  }
  const posed = splitTop(withPose(name, base))
  const own = spec.group ? spec.n - (spec.group.at?.length ?? spec.n) + 1 : spec.n // a group around some or all of the shapes counts as one
  const expected = own + (spec.add?.length ?? 0)
  if (posed.length !== expected) {
    problems.push(
      `${name}: pose table expects ${expected} shapes (${spec.n} plus state-only strokes) after any split but got ${posed.length}`,
    )
    continue
  }
  const body = posed.map((el) => `  ${el.replace(/\n/g, '\n  ')}`).join('\n')
  const svg = `<svg ${ROOT}${poseRootAttrs(name)}>\n${body}\n</svg>\n`
  const exists = existsSync(file)
  if (exists && readFileSync(file, 'utf8') === svg) {
    unchanged++
    continue
  }
  if (check) problems.push(`${name}: ${exists ? 'file is out of date' : 'file is missing'}`)
  else {
    writeFileSync(file, svg)
    if (exists) written++
    else created++
    changed.push({ name, base })
  }
}

// a quick look at what was just written, before any browser: bounds, centring, grid, gaps, loose ends
for (const { name, base } of changed) {
  for (const finding of quickCheck(base, name)) {
    findings.push({ name, ...finding })
    say(`  ${name}: ${finding.level} ${finding.rule}: ${finding.message}`)
    if (finding.level === 'fail') problems.push(`${name}: ${finding.message}`)
  }
}

for (const name of Object.keys(POSES)) if (!names.includes(name)) problems.push(`${name}: pose entry has no vector`)

say(`${names.length} vectors: ${created} created, ${written} rewritten, ${unchanged} already current`)
if (asJson) {
  console.log(
    JSON.stringify({
      vectors: names.length,
      created,
      written,
      unchanged,
      changed: changed.map((c) => c.name),
      findings,
      problems,
    }),
  )
  process.exit(problems.length ? 1 : 0)
}
if (problems.length) {
  say(`\nProblems:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
