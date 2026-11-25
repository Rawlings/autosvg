// A warm test bench for vectors: the studio's dev server and a headless Chrome, started once and reused. `pnpm verify-vectors` starts one
// for a single run; the MCP server (mcp.ts) keeps one alive between calls.
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { root } from '../paths.ts'
import { type Browser, launchChrome } from './cdp.ts'

/** What the page sends back. */
export interface Report {
  vectors: Record<string, { ok: boolean; issues: string[]; ink: number; extent: [number, number]; shape?: unknown }>
  pose: { pass: number; total: number; issues: Record<string, string[]> }
  perf: { ok: boolean; flagged: string[] }
  coverageMissing: Record<string, string>
  recipeStale: Record<string, string>
  /** milliseconds each group of checks took in the page */
  ms: Record<string, number>
  /** the vectors of the set that look most like each one, nearest first */
  nearest: Record<string, { name: string; diff: number }[]>
}

/** The checks, run in the page against the engine (the same ones `window.autosvg` offers). */
const checkScript = (names: string[] | 'all'): string => `(async () => {
  const c = window.autosvg
  const wanted = ${JSON.stringify(names)} === 'all' ? c.vectors : ${JSON.stringify(names)}
  const vectors = {}
  for (const name of wanted) {
    if (!c.vectors.includes(name)) { vectors[name] = { ok: false, issues: ['no such vector file (seed it first: pnpm seed)'], ink: 0, extent: [0, 0] }; continue }
    const r = await c.verify(name)
    const i = await c.inspect(name)
    const issues = r.issues.filter((text) => !(c.deliberate.centre[name] && text.includes('off-centre')))
    vectors[name] = { ok: issues.length === 0, issues, ink: r.ink, extent: r.extent, shape: { kinks: i.kinks, loose: i.loose, inflections: i.inflections, symmetry: i.symmetry, gaps: i.gaps, offset: i.offset } }
  }
  const known = wanted.filter((n) => c.vectors.includes(n))
  const ms = {}
  const time = async (key, work) => { const t = performance.now(); const value = await work(); ms[key] = Math.round(performance.now() - t); return value }
  const pose = await time('pose', () => c.poseLint(known))
  const perf = await time('perf', () => c.perfAudit(known))
  const cov = await time('coverage', () => c.coverage(known))
  const rs = await time('recipes', () => c.recipeStatus(known))
  const nearest = await time('nearest', () => c.nearest(known, 3))
  return {
    ms,
    nearest,
    vectors,
    pose: { pass: pose.pass, total: pose.total, issues: pose.issues },
    perf: { ok: perf.ok, flagged: perf.flagged },
    coverageMissing: cov.missing,
    recipeStale: rs.stale,
  }
})()`

/** Replace the page with a grid of vectors: big, small, or in motion. Returns once they are drawn. */
const drawScript = (names: string[], mode: 'sheet' | 'motion', nearest: Report['nearest']): string => `(async () => {
  const nearest = ${JSON.stringify(nearest)}
  const c = window.autosvg
  const names = ${JSON.stringify(names)}
  const mode = ${JSON.stringify(mode)}
  const glyph = (name, vars) => '<auto-svg name="' + name + '" style="' + vars + '"></auto-svg>'
  const cells = names.map((name) => {
    const pose = c.poses[name]
    const states = pose?.states ?? []
    if (mode === 'sheet') {
      const sizes = [16, 24, 48].map((px) => glyph(name, '--autosvg-size:' + px + 'px')).join('')
      const near = (nearest[name] ?? []).slice(0, 2).map((x) => '<figure>' + glyph(x.name, '--autosvg-size:40px') + '<small>' + x.name + ' ' + Math.round(x.diff * 100) + '%</small></figure>').join('')
      return '<div class="cell">' + glyph(name, '--autosvg-size:96px') + '<div class="row">' + sizes + '</div><b>' + name + '</b><div class="row" style="opacity:.8">' + near + '</div></div>'
    }
    const motion = [0, 0.25, 0.5, 0.75, 1].map((v) => '<figure>' + glyph(name, '--autosvg-size:56px;--autosvg-motion:' + v) + '<small>' + v + '</small></figure>').join('')
    const stops = states.length ? ['', ...states].map((s, i) => '<figure>' + glyph(name, '--autosvg-size:56px;--autosvg-state:' + i) + '<small>' + (s || 'normal') + '</small></figure>').join('') : ''
    return '<div class="strip"><b>' + name + ' <small>' + (pose?.labels?.[0] ?? '') + '</small></b><div class="row">' + motion + '</div>' + (stops ? '<div class="row">' + stops + '</div>' : '') + '</div>'
  })
  document.body.innerHTML = '<style>html,body{background:#fff;color:#111;margin:0;font:12px system-ui}' +
    '.grid{display:grid;grid-template-columns:repeat(' + (mode === 'sheet' ? 5 : 2) + ',1fr);gap:10px;padding:14px}' +
    '.cell,.strip{border:1px solid #ddd;border-radius:8px;padding:10px}.cell{text-align:center}' +
    '.row{display:flex;gap:12px;align-items:center;justify-content:' + (mode === 'sheet' ? 'center' : 'flex-start') + ';margin:6px 0}' +
    'figure{margin:0;text-align:center}small{color:#777;font-weight:400}</style><div class="grid">' + cells.join('') + '</div>'
  await new Promise((resolve) => setTimeout(resolve, 300))
})()`

/** Below this difference a vector is a near copy of another one (calibrated on the set: 48 of 259 vectors have a twin under 10%, feather/leaf is 6%). */
const LOOKALIKE = 0.08

const mark = (ok: boolean): string => (ok ? '✓' : '✗')

export function formatReport(report: Report, names: string[]): { text: string; ok: boolean } {
  const lines: string[] = []
  let failed = false
  for (const name of names) {
    const r = report.vectors[name]
    if (!r) continue
    const poseIssues = report.pose.issues[name] ?? []
    const ok = r.ok && poseIssues.length === 0
    failed ||= !ok
    lines.push(`${mark(ok)} ${name.padEnd(16)} ink ${String(r.ink).padStart(4)}%  extent ${r.extent.join('×')}`)
    for (const issue of r.issues) lines.push(`    ${issue}`)
    for (const issue of poseIssues) lines.push(`    pose: ${issue}`)
    const near = report.nearest[name] ?? []
    const first = near[0]
    if (first && first.diff < LOOKALIKE)
      lines.push(`    ~ looks like ${first.name}: only ${Math.round(first.diff * 100)}% different`)
    else if (names.length <= 12)
      lines.push(`    closest: ${near.map((x) => `${x.name} ${Math.round(x.diff * 100)}%`).join(', ')}`)
  }
  for (const flag of report.perf.flagged) {
    lines.push(`  perf: ${flag}`)
    failed = true
  }
  for (const [name, why] of Object.entries(report.coverageMissing)) {
    lines.push(`  coverage: ${name}: ${why}`)
    failed = true
  }
  for (const [name, why] of Object.entries(report.recipeStale)) {
    lines.push(`  recipe out of sync: ${name}: ${why}`)
    failed = true
  }
  lines.push(`${mark(!failed)} ${names.length} vectors, pose lint ${report.pose.pass}/${report.pose.total}`)
  return { text: lines.join('\n'), ok: !failed }
}

/** A running dev server and Chrome with the studio open. */
export class Bench {
  readonly #server: ViteDevServer
  readonly #browser: Browser
  readonly #url: string

  private constructor(server: ViteDevServer, browser: Browser, url: string) {
    this.#server = server
    this.#browser = browser
    this.#url = url
  }

  static async start(): Promise<Bench> {
    const server = await createServer({
      root: fileURLToPath(new URL('apps/studio/', root)),
      logLevel: 'error',
      server: { port: 0, host: '127.0.0.1' },
    })
    await server.listen()
    const url = server.resolvedUrls?.local[0]
    if (!url) throw new Error('the dev server did not say where it listens')
    const browser = await launchChrome()
    const bench = new Bench(server, browser, `${url}quality`)
    await bench.#open()
    return bench
  }

  async #open(): Promise<void> {
    await this.#browser.page.navigate(this.#url)
    await this.#browser.page.waitFor(READY)
  }

  /** Load the page again, so vectors and recipes written since are picked up. */
  async reload(): Promise<void> {
    this.#server.moduleGraph.invalidateAll() // a new vector file changes what the glob in packages/vectors finds
    await this.#browser.page.evaluate('window.__stale = true')
    await this.#browser.page.navigate(this.#url)
    await this.#browser.page.waitFor(`!window.__stale && ${READY}`)
  }

  names(): Promise<string[]> {
    return this.#browser.page.evaluate<string[]>('window.autosvg.vectors')
  }

  check(names: string[] | 'all'): Promise<Report> {
    return this.#browser.page.evaluate<Report>(checkScript(names))
  }

  /** The vectors drawn on a page of their own, as a PNG. */
  async draw(names: string[], mode: 'sheet' | 'motion', nearest: Report['nearest']): Promise<Buffer> {
    await this.#browser.page.evaluate(drawScript(names, mode, nearest))
    return this.#browser.page.screenshot(mode === 'sheet' ? 1200 : 900)
  }

  async close(): Promise<void> {
    this.#browser.page.close()
    await this.#browser.stop()
    await this.#server.close()
  }
}

const READY = "typeof window.autosvg === 'object' && window.autosvg.vectors.length > 0"

/** Vectors whose file does not exist yet cannot be drawn. */
export const missing = (report: Report, name: string): boolean =>
  report.vectors[name]?.issues[0] === 'no such vector file (seed it first: pnpm seed)'
