// Pose lint: checks every vector's pose data and what it does when drawn.
//
//   structure   only known data- attributes, numeric, beats are contiguous, drawing shapes carry pathLength, labels agree
//   in sync     the saved file carries exactly the pose the table says
//   at rest     with every channel at 0 the vector is identical to its plain drawing
//   states      off-state strokes are invisible in the file (opacity="0"), so the plain vector is unchanged
//   independent motion moves a vector as much in every state (groups must not leak their numbers into their shapes)
//   smooth      a state changes a little at a time: no more than a third of the ink may appear from nowhere or vanish between neighbouring frames
//   alive       every channel the vector uses visibly changes it somewhere in its travel
//   bounds      at any value of a channel (springs overshoot to 1.25) the drawn ink stays inside the canvas
//   xml         the SVG is valid XML (a bare attribute such as data-x with no value breaks it when drawn as an image)
//   pivots      a part that scales does so about a point on or near itself (a wrong pivot flings it across the canvas)
//   notes       not failures: channels whose choreography is thin (one beat, or one move with one timing)
import {
  AMOUNTS,
  BEATS,
  CHANNELS,
  type Channel,
  channelsOf,
  DEFAULT_STYLE,
  POSE_ATTR,
  POSES,
  type PoseSpec,
  poseBytes,
  STATE,
  splitTop,
  withPose,
} from '@autosvg/core'
import { renderIcon } from '@autosvg/runtime'
import { VECTORS } from '@autosvg/vectors'
import { analyse, inkDiff, maxJump, posedSvg } from './measure/index.ts'

const MARGIN = 0.5 // drawn ink must stay this far inside the 24 canvas
const ALIVE = 0.004 // fraction of drawn pixels that must change at some point in a channel's travel
const REST = 0.0015 // at rest the posed vector may differ from the plain one by at most this
const GESTURE = [0.15, 0.3, 0.5, 0.7, 1, 1.25] // values tried on a 0 to 1 channel (1.25 is a spring's overshoot)
const LOOK = [-1.25, -1, -0.5, 0.5, 1, 1.25] // and on a -1 to 1 channel
const STEP = 0.1 // how finely a state is walked when looking for snaps
const SNAP = 0.35 // the most ink that may appear from nowhere, or vanish, between two neighbouring frames of a state (real states top out near 0.2)
const TRAVEL = [0.11, 0.23, 0.37, 0.61, 0.83, 1] // not multiples of a quarter: a 2-swing wave is zero at every one of those

const innerOf = (svg: string): string =>
  svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
/** The pose attributes of every element, one string per element: two drawings with equal signatures carry the same pose. */
const sig = (markup: string): string[] =>
  [...markup.matchAll(/<(?:path|circle|rect|line|polyline|polygon|ellipse|g)\b[^>]*>/g)].map((m) =>
    (m[0].match(POSE_ATTR) ?? [])
      .map((a) => a.trim())
      .sort()
      .join(' '),
  )
const KEY = /^data-(?:ox|oy|b|o|z|st|gr|[cktwn][1-4]|[rxyshvaqg][1-4])$/
const isLook = (k: Channel): boolean => k === 3 || k === 4 // channels 3 and 4 run from -1 to 1; the rest from 0 to 1

/** Structure problems in one vector's rendered SVG. */
function structure(svg: string): string[] {
  const out: string[] = []
  const used = new Set<number>()
  const rootTag = svg.slice(0, svg.indexOf('>'))
  const stops = (/\sdata-states="([^"]*)"/.exec(rootTag)?.[1] ?? '').split(' ').filter(Boolean).length // named states: 1, 2, ... stops
  const body = svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  // every element, including the group that carries vector-level beats and the shapes inside it
  for (const [i, m] of [...body.matchAll(/<(?:path|circle|rect|line|polyline|polygon|ellipse|g)\b[^>]*>/g)].entries()) {
    const tag = m[0]
    const attrs = [...tag.matchAll(/\s(data-[\w-]+)="([^"]*)"/g)].map((a) => ({ key: a[1] ?? '', value: a[2] ?? '' }))
    const names = attrs.map((a) => a.key)
    const attr = (key: string): string | undefined => attrs.find((a) => a.key === key)?.value
    for (const { key, value } of attrs) {
      if (!KEY.test(key)) out.push(`shape ${i}: unknown attribute ${key}`)
      else if (key !== 'data-st' && !Number.isFinite(+value)) out.push(`shape ${i}: ${key} is not a number`)
    }
    if (names.includes('data-ox') !== names.includes('data-oy'))
      out.push(`shape ${i}: pivot needs both data-ox and data-oy`)
    const beats = [...new Set(names.flatMap((n) => /^data-[cktwnrxyshvaqg]([1-4])$/.exec(n)?.[1] ?? []))]
      .map(Number)
      .sort((a, b) => a - b)
    if (beats.length) {
      if (beats.join() !== Array.from({ length: beats.length }, (_, j) => j + 1).join())
        out.push(`shape ${i}: beats ${beats.join(',')} are not contiguous from 1`)
      if (beats.length > BEATS) out.push(`shape ${i}: more than ${BEATS} beats`)
      for (const b of beats) {
        const c = Number(attr(`data-c${b}`))
        if (!(c >= 1 && c <= CHANNELS)) out.push(`shape ${i}: beat ${b} has no valid channel`)
        else used.add(c)
        const hasAmount = names.some((n) => new RegExp(`^data-[rxyshvaqg]${b}$`).test(n))
        if (!hasAmount) out.push(`shape ${i}: beat ${b} moves nothing`)
        const w = attr(`data-w${b}`)
        const t = attr(`data-t${b}`)
        const limit = c === STATE ? stops : 1 // the state channel travels 0 to its number of states
        if (+(t ?? 0) + +(w ?? 1) > limit + 0.0001)
          out.push(`shape ${i}: beat ${b} ends after the channel's travel (t + w > ${limit})`)
        if (c === STATE && +(attr(`data-k${b}`) ?? 0) !== 0)
          out.push(`shape ${i}: beat ${b} is on the state channel, so it must be a ramp (a state holds)`)
      }
    }
    if (names.some((n) => /^data-g[1-4]$/.test(n)) && !/\spathLength="1"/.test(tag))
      out.push(`shape ${i}: draws a stroke but has no pathLength="1"`)
    if (names.includes('data-st') && !/\sopacity="0"/.test(tag))
      out.push(`shape ${i}: an off-state stroke must be invisible in the file (opacity="0")`)
  }
  const hasMotion = /\sdata-motion="[^"]+"/.test(rootTag)
  if (used.has(1) && !hasMotion) out.push('has a motion but the root has no data-motion label')
  if (hasMotion && !used.has(1)) out.push('root names a motion but nothing uses channel 1')
  if (used.has(STATE) && !stops) out.push('uses the state channel but the root has no data-states')
  if (stops && !used.has(STATE)) out.push('root names states but nothing uses the state channel')
  if (/\sdata-lean\b|\sdata-pose-\d/.test(rootTag))
    out.push('retired root attribute (data-lean, data-pose-N): see data-motion and data-states')
  return out
}

type Vars = Partial<Record<Channel, number>>
const ink = (svg: string, vars: Vars): string => posedSvg(svg, vars)

/** Is the markup valid XML? Returns the parser's complaint, or ''. */
function xmlProblem(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return doc.querySelector('parsererror')?.textContent?.trim().split('\n')[0] ?? ''
}

/** The bounding box of each top-level shape of a vector, measured in a hidden host. */
function shapeBoxes(host: HTMLElement, svg: string): (DOMRect | null)[] {
  host.innerHTML = svg
  return [
    ...(host
      .querySelector('svg')
      ?.querySelectorAll<SVGGraphicsElement>('path,circle,rect,line,polyline,polygon,ellipse') ?? []),
  ].map((el) => {
    try {
      return el.getBBox()
    } catch {
      return null
    }
  })
}

/**
 * Scale beats about a pivot that is not on the shape fling it away as it grows: the classic wrong-pivot mistake.
 * A pivot is fine if it sits on (or within 1.5 of) the shape along the axes that scale, or if other shapes of the vector
 * scale about the very same point (the whole vector flips or breathes together).
 */
function pivotProblems(host: HTMLElement, svg: string): string[] {
  const out: string[] = []
  const boxes = shapeBoxes(host, svg)
  const shapes = [...svg.matchAll(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*>/g)].map((m, i) => {
    const tag = m[0]
    const has = (l: string): boolean => new RegExp(`\\sdata-${l}[1-4]=`).test(tag)
    if (!has('s') && !has('h') && !has('v')) return null
    const ox = +(/data-ox="([^"]*)"/.exec(tag)?.[1] ?? 12)
    const oy = +(/data-oy="([^"]*)"/.exec(tag)?.[1] ?? 12)
    return { i, ox, oy, x: has('s') || has('h'), y: has('s') || has('v') }
  })
  const scaling = shapes.filter((s) => s !== null)
  for (const sh of scaling) {
    const b = boxes[sh.i]
    if (!b) continue
    const slack = 1.5
    const offX = sh.x && (sh.ox < b.x - slack || sh.ox > b.x + b.width + slack)
    const offY = sh.y && (sh.oy < b.y - slack || sh.oy > b.y + b.height + slack)
    const shared = scaling.filter((o) => o.ox === sh.ox && o.oy === sh.oy).length > 1
    if ((offX || offY) && !shared) {
      out.push(
        `shape ${sh.i} scales about (${sh.ox}, ${sh.oy}) but sits at x ${b.x.toFixed(1)}..${(b.x + b.width).toFixed(1)}, y ${b.y.toFixed(1)}..${(b.y + b.height).toFixed(1)}: give it a pivot on itself`,
      )
    }
  }
  return out
}

/** What a thin pose lint finds. */
interface Thin {
  issues: string[]
  notes: string[]
}

/**
 * Thin choreography: a gesture that is a single beat, or one move with one timing, is the "cheap nudge". On the
 * main gesture (channel 1) it is a failure unless the vector is declared `simple`; on the second it is only a note.
 */
function thin(spec: PoseSpec): Thin {
  const result: Thin = { issues: [], notes: [] }
  for (const k of [1]) {
    const beats = spec.parts.flatMap((p) => p.beats.filter((b) => b.c === k))
    if (!beats.length) continue
    const timings = new Set(beats.map((b) => `${b.k ?? 0}|${b.t ?? 0}|${b.w ?? 1}`))
    const props = new Set(beats.flatMap((b) => AMOUNTS.filter((l) => b[l])))
    const label = spec.labels[k - 1] || k
    const why =
      beats.length === 1 ? 'a single beat' : timings.size === 1 && props.size === 1 ? 'one move with one timing' : ''
    if (!why) continue
    if (!spec.simple)
      result.issues.push(
        `motion (${label}) is ${why}: add anticipation, lag or a second part, or declare the vector simple()`,
      )
  }
  return result
}

/**
 * Lint poses for the given vectors (default: all). Returns { total, posed, pass, issues, notes, channels, avgBytes, beats }.
 * `issues` maps a vector name to a list of problems; vectors that pass are not listed.
 */
/** The result of linting poses. */
export interface PoseLintReport {
  total: number
  posed: number
  pass: number
  /** problems per vector; vectors that pass are not listed */
  issues: Record<string, string[]>
  notes: Record<string, string[]>
  /** how many vectors use each channel */
  channels: Record<number, number>
  avgBytes: number
  beats: number
}

export async function lintPoses(
  names: readonly string[] = VECTORS.map((i) => i.name),
  { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
): Promise<PoseLintReport> {
  const issues: Record<string, string[]> = {}
  const notes: Record<string, string[]> = {}
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden'
  document.body.append(host)
  const channelCount: Record<number, number> = Object.fromEntries(
    Array.from({ length: CHANNELS }, (_, i) => [i + 1, 0]),
  )
  let posed = 0
  let bytes = 0
  let beatTotal = 0
  let done = 0

  for (const name of names) {
    const problems: string[] = []
    const spec = POSES[name]
    if (!spec) {
      problems.push('no pose data')
    } else {
      posed++
      const svg = renderIcon(name, DEFAULT_STYLE, { inline: true })
      problems.push(...structure(svg))
      const xml = xmlProblem(svg)
      if (xml) problems.push(`not valid XML: ${xml}`)
      problems.push(...pivotProblems(host, svg))
      const t = thin(spec)
      problems.push(...t.issues)
      if (t.notes.length) notes[name] = t.notes
      const channels = channelsOf(name)
      const N = spec.states?.length || 1 // the state channel runs 0 to N
      for (const c of channels) channelCount[c] = (channelCount[c] ?? 0) + 1
      bytes += poseBytes(name, innerOf(svg))
      beatTotal += spec.parts.reduce((s, p) => s + p.beats.length * (p.at === 'all' ? 1 : [p.at].flat().length), 0)

      // the saved file must carry exactly the pose the table describes
      const file = VECTORS.find((i) => i.name === name)
      if (!file) problems.push('no saved file')
      else {
        const inner = innerOf(file.svg)
        if (JSON.stringify(sig(inner)) !== JSON.stringify(sig(withPose(name, inner)))) {
          problems.push('saved file out of sync with the pose table (run pnpm seed)')
        }
        if (splitTop(inner).length !== splitTop(innerOf(svg)).length) {
          problems.push('saved file and renderer disagree on the number of shapes')
        }
      }

      // at rest the vector is its plain drawing: same ink with the pose attributes removed
      const plain = svg.replace(POSE_ATTR, '')
      const rest = await inkDiff(ink(svg, {}), plain)
      if (rest > REST)
        problems.push(
          `at rest it differs from the plain vector by ${(rest * 100).toFixed(2)}% (a drawing beat leaves a seam?)`,
        )

      // motion and state are independent: a vector turned or mirrored as a whole moves just as much in every state (a custom
      // property leaking from the group into its shapes once made the mirrored refresh collapse to a line)
      if (spec.group && !spec.group.at && channels.includes(1)) {
        const base = await inkDiff(ink(svg, { 1: 0.5 }), ink(svg, {}))
        for (let k = 1; k <= N; k++) {
          const moved = await inkDiff(ink(svg, { 1: 0.5, 2: k }), ink(svg, { 2: k }))
          if (base > ALIVE && (moved < 0.5 * base || moved > 2 * base)) {
            problems.push(
              `its motion changes the vector by ${(base * 100).toFixed(1)}% normally but ${(moved * 100).toFixed(1)}% in state ${k}: motion and state must stay independent`,
            )
            break
          }
        }
      }

      for (const k of channels) {
        // alive: somewhere in the channel's travel it must visibly change
        let moved = 0
        for (const v of TRAVEL) moved = Math.max(moved, await inkDiff(svg, ink(svg, { [k]: v * (k === 2 ? N : 1) })))
        if (moved < ALIVE)
          problems.push(
            `channel ${k} (${spec.labels[k - 1] || '?'}) barely changes the vector (${(moved * 100).toFixed(2)}%)`,
          )

        // smooth: a state moves a little at a time. Ink that appears or vanishes between neighbouring frames, rather than moves, is a
        // snap (a beat on the wrong window, a part appearing from nowhere), the kind of frame that looks broken when scrubbed. Ink that
        // merely moves, turns or grows stays near where it was, so it does not count
        // a flip (a scale of -1 or less on the state) passes through a flat frame by construction, and grows back fast: not a snap
        const holders = [...spec.parts.map((p) => p.beats), ...(spec.group ? [spec.group.beats] : [])]
        const flips = holders.some((beats) =>
          beats.some((b) => b.c === 2 && [b.h, b.v, b.s].some((x) => x !== undefined && x <= -1)),
        )
        if (k === 2 && !flips) {
          const values: number[] = []
          for (let v = 0; v <= N + 1e-9; v += STEP) values.push(+v.toFixed(3))
          const { jump, at } = await maxJump(values.map((v) => ink(svg, { 2: v })))
          if (jump > SNAP)
            problems.push(
              `the state jumps between ${values[at - 1]} and ${values[at]} (${(jump * 100).toFixed(0)}% of the ink appears or vanishes in one step)`,
            )
        }

        // bounds: at any value, including a spring's overshoot, the ink stays on the canvas (unless the vector exits on purpose)
        if (spec.exits) continue
        for (const v of isLook(k) ? LOOK : GESTURE.map((g) => g * (k === 2 ? N : 1))) {
          const m = await analyse(ink(svg, { [k]: v }))
          const x0 = m.bx - m.w / 2
          const x1 = m.bx + m.w / 2
          const y0 = m.by - m.h / 2
          const y1 = m.by + m.h / 2
          const out: string[] = []
          if (x0 < MARGIN) out.push(`left ${x0.toFixed(1)}`)
          if (y0 < MARGIN) out.push(`top ${y0.toFixed(1)}`)
          if (x1 > 24 - MARGIN) out.push(`right ${x1.toFixed(1)}`)
          if (y1 > 24 - MARGIN) out.push(`bottom ${y1.toFixed(1)}`)
          if (out.length) {
            problems.push(`channel ${k} at ${v} leaves the canvas: ${out.join(', ')}`)
            break
          }
        }
      }
    }
    if (problems.length) issues[name] = problems
    onProgress?.(++done, names.length)
  }
  host.remove()

  return {
    total: names.length,
    posed,
    pass: names.length - Object.keys(issues).length,
    issues,
    notes,
    channels: channelCount,
    avgBytes: posed ? Math.round(bytes / posed) : 0,
    beats: beatTotal,
  }
}
