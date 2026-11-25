// An MCP server for drawing icons: it keeps the studio's dev server and a headless Chrome warm, and does the whole write, seed,
// check, look cycle in one call. Plain stdio JSON-RPC, no dependencies.
//
//   icons_apply   write a batch file, seed it, run every check, and return the report with the sheet and motion images
//   icons_verify  check (and draw) icons that already exist
//   icons_geom    Paper.js geometry in Node: rotate, union, subtract
//   icons_find    existing icon names that contain some words (the concept check)
//   icons_remove  delete icon files that were dropped
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { batchFile, batchNumbers, writeBatchIndex } from './lib/batches.ts'
import { Bench, formatReport, missing, type Report } from './lib/bench.ts'
import { evalGeom } from './lib/geom.ts'
import { iconDir, root } from './paths.ts'

type Json = Record<string, unknown>
type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' }

const toolsDir = fileURLToPath(new URL('tools/', root))
const log = (text: string): void => {
  process.stderr.write(`[icons-mcp] ${text}\n`)
}

// ---------- the warm bench ----------

let benchStarting: Promise<Bench> | undefined
const bench = (): Promise<Bench> => {
  benchStarting ??= Bench.start()
  return benchStarting
}

// ---------- helpers ----------

const run = (command: string, args: string[]): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    execFile(command, args, { cwd: toolsDir, maxBuffer: 16 * 1024 * 1024 }, (_error, stdout, stderr) =>
      resolve({ stdout: String(stdout), stderr: String(stderr) }),
    )
  })

const seconds = (since: number): string => `${((Date.now() - since) / 1000).toFixed(1)} s`

interface SeedResult {
  icons: number
  created: number
  written: number
  changed: string[]
  findings: { name: string; level: string; rule: string; message: string }[]
  problems: string[]
}

async function seed(): Promise<SeedResult | string> {
  const { stdout, stderr } = await run('node', ['src/seed-poses.ts', '--json'])
  try {
    return JSON.parse(stdout.trim().split('\n').pop() ?? '') as SeedResult
  } catch {
    return `seed failed:\n${(stderr || stdout).split('\n').slice(0, 30).join('\n')}`
  }
}

/** Check these icons in the warm page and attach the images that were asked for. */
async function inspect(
  names: string[],
  sheet: boolean,
  motion: boolean,
  reload: boolean,
  note: string[],
): Promise<Content[]> {
  const b = await bench()
  let t = Date.now()
  if (reload) {
    await b.reload()
    note.push(`reload ${seconds(t)}`)
  }
  t = Date.now()
  const report: Report = await b.check(names)
  note.push(
    `checks ${seconds(t)} (${Object.entries(report.ms)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')} ms)`,
  )
  const { text } = formatReport(report, names)
  const out: Content[] = [{ type: 'text', text }]
  const drawn = names.filter((n) => !missing(report, n))
  t = Date.now()
  for (const [mode, wanted] of [
    ['sheet', sheet],
    ['motion', motion],
  ] as const) {
    if (!wanted || drawn.length === 0) continue
    const png = await b.draw(drawn, mode, report.nearest)
    out.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' })
  }
  if (sheet || motion) note.push(`images ${seconds(t)}`)
  return out
}

// ---------- the tools ----------

interface Tool {
  description: string
  schema: Json
  call: (args: Json) => Promise<Content[]>
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])
const flag = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const TOOLS: Record<string, Tool> = {
  icons_apply: {
    description:
      'Write a batch file of icons (recipes and poses), seed the icon files, run the quick geometry check, verify every new or changed icon in the warm browser, and return the report with a sheet image (large, 16/24/48 px, nearest existing icons) and a motion filmstrip. One call per iteration. `source` is the whole TypeScript file (copy the shape of packages/core/src/batches/batch-12.ts); `batch` is its number (default: the next one). Without `source` it just re-seeds and re-checks.',
    schema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Full contents of the batch file' },
        batch: { type: 'integer', description: 'Batch number; default is the next free one' },
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Icons to check; default: those the seed wrote',
        },
        sheet: { type: 'boolean', description: 'Return the sheet image (default true)' },
        motion: { type: 'boolean', description: 'Return the motion filmstrip (default true)' },
      },
    },
    async call(args) {
      const note: string[] = []
      const started = Date.now()
      let t = Date.now()
      let batch = typeof args['batch'] === 'number' ? args['batch'] : (batchNumbers().at(-1) ?? 0) + 1
      if (typeof args['source'] === 'string') {
        const file = batchFile(batch)
        writeFileSync(file, args['source'])
        await run('../node_modules/.bin/biome', ['check', '--write', file])
        writeBatchIndex()
        note.push(`write ${seconds(t)}`)
      } else batch = batchNumbers().at(-1) ?? 0
      writeBatchIndex() // a batch file added by hand is registered too
      t = Date.now()
      const result = await seed()
      note.push(`seed ${seconds(t)}`)
      if (typeof result === 'string') return [{ type: 'text', text: result }]
      const lines = [`seed: ${result.created} created, ${result.written} rewritten (batch ${batch})`]
      for (const f of result.findings) lines.push(`  ${f.name}: ${f.level} ${f.rule}: ${f.message}`)
      for (const p of result.problems) lines.push(`  problem: ${p}`)
      const names = strings(args['names']).length ? strings(args['names']) : result.changed
      const content: Content[] = [{ type: 'text', text: lines.join('\n') }]
      if (names.length) {
        content.push(...(await inspect(names, flag(args['sheet'], true), flag(args['motion'], true), true, note)))
      }
      note.push(`total ${seconds(started)}`)
      content.push({ type: 'text', text: `timing: ${note.join(', ')}` })
      return content
    },
  },
  icons_verify: {
    description:
      'Check icons that already exist (verify, pose lint, perf, coverage, look-alikes) and optionally draw them.',
    schema: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' } },
        sheet: { type: 'boolean' },
        motion: { type: 'boolean' },
        reload: {
          type: 'boolean',
          description: 'Reload the page first (needed after files changed outside this server)',
        },
      },
      required: ['names'],
    },
    async call(args) {
      const note: string[] = []
      const content = await inspect(
        strings(args['names']),
        flag(args['sheet'], false),
        flag(args['motion'], false),
        flag(args['reload'], false),
        note,
      )
      content.push({ type: 'text', text: `timing: ${note.join(', ')}` })
      return content
    },
  },
  icons_geom: {
    description:
      'Work out geometry with Paper.js: `pp` (boolean, unite, simplify, centre, transform), `geo` (geometry helpers) and `kit` (path, rect, ellipse, round, dot). Returns paste-ready path data. Example: pp.transform(kit.rect(4,10,16,4,2),{rotate:[-45]})',
    schema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
    call: (args) => Promise.resolve([{ type: 'text', text: evalGeom(String(args['expression'])) }]),
  },
  icons_find: {
    description:
      'List existing icon names containing any of these words (case-insensitive): the check that a concept is new.',
    schema: {
      type: 'object',
      properties: { words: { type: 'array', items: { type: 'string' } } },
      required: ['words'],
    },
    call(args) {
      const words = strings(args['words']).map((w) => w.toLowerCase())
      const names = readdirSync(iconDir)
        .filter((f) => f.endsWith('.svg'))
        .map((f) => f.slice(0, -4))
        .filter((n) => words.some((w) => n.includes(w)))
      return Promise.resolve([
        { type: 'text', text: names.length ? names.join(', ') : `no icon contains: ${words.join(', ')}` },
      ])
    },
  },
  icons_remove: {
    description: 'Delete the files of icons that were dropped (remove their entries from the batch file yourself).',
    schema: {
      type: 'object',
      properties: { names: { type: 'array', items: { type: 'string' } } },
      required: ['names'],
    },
    call(args) {
      const removed = strings(args['names']).filter((n) => {
        const file = fileURLToPath(new URL(`${n}.svg`, iconDir))
        if (!/^[a-z0-9-]+$/.test(n) || !existsSync(file)) return false
        rmSync(file)
        return true
      })
      return Promise.resolve([{ type: 'text', text: `removed: ${removed.join(', ') || 'nothing'}` }])
    },
  },
}

// ---------- JSON-RPC over stdio ----------

const send = (message: Json): void => {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
}

/** One tool call at a time: they share one browser page. */
let queue: Promise<unknown> = Promise.resolve()

async function handle(message: { id?: number | string; method?: string; params?: Json }): Promise<void> {
  const { id, method, params = {} } = message
  if (method === 'initialize') {
    send({
      id,
      result: {
        protocolVersion: typeof params['protocolVersion'] === 'string' ? params['protocolVersion'] : '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'icon-canvas', version: '0.1.0' },
      },
    })
    void bench().then(
      () => log('bench warm'),
      (error) => log(`bench failed: ${error instanceof Error ? error.message : error}`),
    )
  } else if (method === 'tools/list') {
    send({
      id,
      result: {
        tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.schema })),
      },
    })
  } else if (method === 'tools/call') {
    const tool = TOOLS[String(params['name'])]
    if (!tool) return send({ id, error: { code: -32602, message: `unknown tool ${String(params['name'])}` } })
    queue = queue.then(async () => {
      try {
        const content = await tool.call((params['arguments'] as Json | undefined) ?? {})
        send({ id, result: { content } })
      } catch (error) {
        send({
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          },
        })
      }
    })
  } else if (method === 'ping') send({ id, result: {} })
  else if (id !== undefined) send({ id, error: { code: -32601, message: `no such method ${String(method)}` } })
}

let buffer = ''
process.stdin.on('data', (chunk) => {
  buffer += chunk.toString()
  for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
    const line = buffer.slice(0, i).trim()
    buffer = buffer.slice(i + 1)
    if (line) void handle(JSON.parse(line))
  }
})

const shutdown = async (): Promise<void> => {
  if (benchStarting) await (await benchStarting).close().catch(() => undefined)
  process.exit(0)
}
process.stdin.on('end', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
