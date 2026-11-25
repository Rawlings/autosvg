import type { Style } from '@icon-canvas/core'
import { morphPlan } from '@icon-canvas/runtime'

const shape = (d: string): string => d.replace(/-?\d+(\.\d+)?/g, '#')
const numbers = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

/** How a morph audit went. */
export interface MorphAuditReport {
  ok: boolean
  flagged: string[]
  stats: { pairs: number; rough: number; avgMs: number; slowestMs: number }
}

/**
 * Checks morphs for a set of pairs (by default every icon into the next one, round the whole set): both ends of every
 * stroke have the same commands (what CSS needs to interpolate), no number is broken, every point stays on the canvas at
 * both ends (and so at every value in between, since a morph moves each point in a straight line), and a plan is
 * cheap enough to make on demand. Reports how many pairs are rough (a plain swap suits them better).
 */
export function morphAudit(
  pairs: readonly (readonly [string, string])[] | undefined,
  names: readonly string[] = [],
  params: Partial<Style> = {},
): MorphAuditReport {
  const list: readonly (readonly [string, string])[] =
    pairs ?? names.map((n, i): [string, string] => [n, names[(i + 1) % names.length] ?? n])
  const flagged: string[] = []
  let rough = 0
  let slowest = 0
  let total = 0
  for (const [a, b] of list) {
    const t0 = performance.now()
    let plan: ReturnType<typeof morphPlan>
    try {
      plan = morphPlan(a, b, params)
    } catch (e) {
      flagged.push(`${a} → ${b}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    const ms = performance.now() - t0
    total += ms
    slowest = Math.max(slowest, ms)
    if (plan.rough) rough++
    if (!plan.strokes.length) flagged.push(`${a} → ${b}: no strokes`)
    for (const [i, s] of plan.strokes.entries()) {
      if (shape(s.from) !== shape(s.to)) flagged.push(`${a} → ${b}: stroke ${i} has different commands at its two ends`)
      for (const v of [...numbers(s.from), ...numbers(s.to)]) {
        if (!Number.isFinite(v) || v < -1 || v > 25) {
          flagged.push(`${a} → ${b}: stroke ${i} has a point at ${v}, off the canvas`)
          break
        }
      }
    }
  }
  return {
    ok: !flagged.length,
    flagged,
    stats: {
      pairs: list.length,
      rough,
      avgMs: +(total / (list.length || 1)).toFixed(2),
      slowestMs: +slowest.toFixed(1),
    },
  }
}
