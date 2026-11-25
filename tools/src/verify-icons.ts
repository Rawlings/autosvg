// Checks icons in a headless Chrome and, if asked, draws them for you to look at. One command, no screenshots to ask for.
//
//   pnpm verify-icons magnet glasses            verify, pose lint and perf audit of these icons, one line each
//   pnpm verify-icons magnet --sheet            also write sheet.png: every icon large and at 16, 24 and 48 px
//   pnpm verify-icons magnet --motion           also write motion.png: every icon at motion 0 .. 1 and in each of its states
//   pnpm verify-icons --all                     every icon in the set
//   --out <dir>                                 where the PNGs go (default: .cache/icons, not committed)
//
// It starts the studio's dev server and Chrome itself, runs the same checks as window.iconCanvas, and stops both.
// The PNGs are drawn on a page of their own in that headless Chrome: nothing is shown over the studio you may have open.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Bench, formatReport, missing } from './lib/bench.ts'
import { root } from './paths.ts'

interface Options {
  names: string[]
  all: boolean
  sheet: boolean
  motion: boolean
  out: string
  json: string | null
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    names: [],
    all: false,
    sheet: false,
    motion: false,
    out: fileURLToPath(new URL('.cache/icons/', root)),
    json: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (arg === '--all') options.all = true
    else if (arg === '--sheet') options.sheet = true
    else if (arg === '--motion') options.motion = true
    else if (arg === '--out') options.out = argv[++i] ?? options.out
    else if (arg === '--json') options.json = argv[++i] ?? null
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`)
    else options.names.push(arg)
  }
  if (!options.all && options.names.length === 0) throw new Error('name some icons, or pass --all')
  return options
}

async function main(): Promise<boolean> {
  const options = parseArgs(process.argv.slice(2))
  const out = options.out.endsWith('/') ? options.out : `${options.out}/`
  mkdirSync(out, { recursive: true })
  const bench = await Bench.start()
  try {
    const names = options.all ? await bench.names() : options.names
    const report = await bench.check(options.all ? 'all' : names)
    if (options.json) writeFileSync(options.json, JSON.stringify(report, null, 1))
    const { text, ok } = formatReport(report, names)
    console.log(text)
    if (options.all) {
      const pairs = Object.entries(report.nearest)
        .flatMap(([name, near]) => (near[0] ? [{ a: name, b: near[0].name, diff: near[0].diff }] : []))
        .filter((p) => p.a < p.b || !report.nearest[p.b]?.some((x) => x.name === p.a && x.diff === p.diff))
        .sort((x, y) => x.diff - y.diff)
        .slice(0, 12)
      console.log(
        `closest pairs in the set: ${pairs.map((p) => `${p.a}~${p.b} ${Math.round(p.diff * 100)}%`).join(', ')}`,
      )
    }
    const drawn = names.filter((n) => !missing(report, n))
    for (const mode of ['sheet', 'motion'] as const) {
      if (!options[mode]) continue
      writeFileSync(`${out}${mode}.png`, await bench.draw(drawn, mode, report.nearest))
      console.log(`wrote ${out}${mode}.png`)
    }
    return ok
  } finally {
    await bench.close()
  }
}

main().then(
  (ok) => process.exit(ok ? 0 : 1),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(2)
  },
)
