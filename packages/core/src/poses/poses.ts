// Pose data for every vector (table.ts) and the functions that write it into the SVG as data- attributes.
//
// How a pose works (see poses.css, a FIXED-size stylesheet no matter how many vectors exist):
//   - a part that moves carries up to four beats, each a few data- numbers: which channel drives it, where in the
//     channel's travel it plays, what curve (ramp, pulse, wave) and how much it rotates, moves, scales, fades or draws
//   - the root says what each channel means:  data-pose-1="ring"
//   - a consumer sets  --autosvg-pose-1 .. --autosvg-pose-4  (numbers) on any ancestor. That is all.
// This table is the source; the saved .svg files are generated from it (tools/src/seed-poses.ts), and the
// pose lint checks the two agree. Vocabulary: dsl.ts.

import { at, type Point } from '../util.ts'
import { ALL, BEATS, type Beat, type Channel, type PoseSpec, STATE, type StateAccessory } from './dsl.ts'
import { POSES } from './table.ts'

/** The beat numbers that move something (as opposed to timing). */
export type AmountKey = 'r' | 'x' | 'y' | 's' | 'h' | 'v' | 'a' | 'q' | 'g'
export const AMOUNTS: readonly AmountKey[] = ['r', 'x', 'y', 's', 'h', 'v', 'a', 'q', 'g']
/** The amounts that move or reshape an element (everything but opacity and drawing). */
const MOVES: readonly AmountKey[] = ['r', 'x', 'y', 's', 'h', 'v', 'q']
/** The beat numbers that say when and how a beat plays. */
type TimingKey = 'k' | 't' | 'w' | 'n'
const TIMING: readonly TimingKey[] = ['k', 't', 'w', 'n']
// ---------------------------------------------------------------------------------------------------
// Writing the data into SVG markup
// ---------------------------------------------------------------------------------------------------

/** Every attribute this system owns: pivot, the beats' numbers, and the pathLength that drawing needs. */
export const POSE_ATTR = /\sdata-(?:p|ox|oy|b|o|z|[cktwn][1-4]|[rxyshvaqg][1-4])="[^"]*"|\spathLength="[^"]*"/g

/** The top-level elements of a markup string (so part indices mean "the nth shape"). */
export function splitTop(markup: string): string[] {
  const out: string[] = []
  const s = markup
  let i = 0
  while (i < s.length) {
    const lt = s.indexOf('<', i)
    if (lt === -1) break
    if (s[lt + 1] === '/' || s[lt + 1] === '!') {
      i = s.indexOf('>', lt) + 1 || s.length
      continue
    }
    let j = lt + 1
    let q: string | null = null
    for (; j < s.length; j++) {
      const c = s[j]
      if (q) {
        if (c === q) q = null
      } else if (c === '"' || c === "'") q = c
      else if (c === '>') break
    }
    const tag = /^<([\w:-]+)/.exec(s.slice(lt))?.[1]
    if (tag === undefined) throw new Error(`not an element: ${s.slice(lt, lt + 20)}`)
    let end = j + 1
    if (s[j - 1] !== '/') {
      const re = new RegExp(`<${tag}(?=[\\s>/])[^>]*?(/?)>|</${tag}>`, 'g')
      re.lastIndex = end
      let depth = 1
      let m = re.exec(s)
      while (m && depth > 0) {
        if (m[0].startsWith('</')) depth--
        else if (m[1] !== '/') depth++
        if (depth > 0) m = re.exec(s)
      }
      end = m ? m.index + m[0].length : s.length
    }
    out.push(s.slice(lt, end))
    i = end
  }
  return out
}

/** Remove any pose attributes already on an element. */
export const stripPose = (el: string): string => el.replace(POSE_ATTR, '')

/** Split the chosen top-level paths at every M, so each stroke is a shape of its own. */
export function splitSubpaths(els: readonly string[], which: readonly number[]): string[] {
  return els.flatMap((el, i) => {
    if (!which.includes(i)) return [el]
    const d = /^<path\s[^>]*?\bd="([^"]*)"/.exec(el)?.[1]
    if (d === undefined) throw new Error(`shape ${i} is not a path, cannot split it`)
    if (/m/.test(d)) throw new Error(`shape ${i} uses a relative m; it cannot be split safely`)
    return d.split(/(?=M)/).map((piece) => `<path d="${piece.trim()}" />`)
  })
}

const DEFAULT_BEAT: Record<TimingKey, number> = { k: 0, t: 0, w: 1, n: 2 }

/** The opening tag of an element: `<path d="...">`. */
const openingTag = (el: string): string => /^<[^>]*>/.exec(el)?.[0] ?? ''

/** Shapes that exist only in a vector's off state carry data-st; they are regenerated from the table, never trusted from a file. */
const isState = (el: string): boolean => /\sdata-st="/.test(openingTag(el))

/** A group that carries the vector-level beats (the rotation of an arrow turning to point another way) wraps the shapes in the file. */
const unwrap = (els: readonly string[]): string[] =>
  els.flatMap((el) =>
    /^<g\s[^>]*\bdata-gr=/.test(el) ? splitTop(el.replace(/^<g\b[^>]*>/, '').replace(/<\/g>\s*$/, '')) : [el],
  )

/** The shapes of a vector's own drawing, without any off-state strokes. */
export const baseShapes = (markup: string): string[] => unwrap(splitTop(markup).filter((el) => !isState(el)))

/** The beats that land on one shape, from every part of the pose that targets it (plus going away in the off state). */
function beatsFor(spec: PoseSpec, index: number): { beats: Beat[]; o: Point | undefined } {
  const beats: Beat[] = []
  let o: Point | undefined
  for (const part of spec.parts) {
    if (part.at === ALL || (typeof part.at === 'number' ? part.at === index : part.at.includes(index))) {
      beats.push(...part.beats)
      if (part.o) o = part.o
    }
  }
  return { beats, o }
}

/** The attribute string for a list of beats and an optional pivot. */
function attrsFrom(beats: readonly Beat[], o: Point | undefined, what: string): string {
  if (!beats.length) return ''
  if (beats.length > BEATS) throw new Error(`${what} has ${beats.length} beats; the most is ${BEATS}`)
  let a = beats.some((b) => b.g) ? ' pathLength="1"' : ''
  if (o) a += ` data-ox="${o[0]}" data-oy="${o[1]}"`
  for (const [j, b] of beats.entries()) {
    const i = j + 1
    a += ` data-c${i}="${b.c}"`
    for (const key of TIMING)
      if (b[key] !== undefined && b[key] !== DEFAULT_BEAT[key]) a += ` data-${key}${i}="${b[key]}"`
    for (const key of AMOUNTS) if (b[key]) a += ` data-${key}${i}="${b[key]}"`
  }
  return a
}

/** The attribute string for one shape, merged from every part of the pose that targets it (or ''). */
function attrsFor(spec: PoseSpec, index: number): string {
  const { beats, o } = beatsFor(spec, index)
  return attrsFrom(beats, o, `shape ${index}`)
}

/**
 * One element that exists only in a state (an accessory: the slash through a microphone, the dot on a bell, the rays of a
 * lit bulb, the check inside a cloud). It is invisible in the file (opacity="0") and the stylesheet introduces it when
 * --autosvg-state reaches its stop, and takes it away again when the state passes on.
 *   d, circle [cx, cy, r], rect [x, y, w, h, rx]   what it is
 *   in   the state it belongs to (default 1); it appears between in-1 and in (t and w override the window)
 *   out  the state at which it goes away again, starting at out-1 (default: it stays); exitW is how long leaving takes (0.6: quicker than arriving)
 *   kind 'draw' (a stroke drawn on, the default for paths) or 'pop' (scaled and faded in, the default for circles and rects)
 *   pivot [x, y] the centre it pops from (found for circles and rects)
 */
const FMT = (v: number): number => +(+v).toFixed(2)
function stateShape(e: StateAccessory, radius = 1): string {
  const kind = e.kind ?? (e.d ? 'draw' : 'pop')
  const t = e.t ?? (e.in ?? 1) - 1
  const w = e.w ?? 1
  const base = `<%TAG% data-st="" opacity="0"${kind === 'draw' ? ' pathLength="1" data-b="0"' : ' data-o="0" data-z="0"'}`
  let tag = 'path'
  let geometry = ` d="${e.d}"`
  let pivot: Point | undefined = e.pivot
  if (e.circle) {
    tag = 'circle'
    geometry = ` cx="${e.circle[0]}" cy="${e.circle[1]}" r="${e.circle[2]}"`
    pivot ??= [e.circle[0], e.circle[1]]
  } else if (e.rect) {
    const [x, y, rw, rh, rxSpec = 0] = e.rect
    // a corner radius is a number, or [base, max]: it then follows the --autosvg-radius setting like the rest of the vector
    const rx = typeof rxSpec === 'number' ? rxSpec : FMT(Math.min(rxSpec[0] * radius, rxSpec[1]))
    tag = 'rect'
    geometry = ` x="${x}" y="${y}" width="${rw}" height="${rh}"${rx ? ` rx="${rx}"` : ''}`
    pivot ??= [FMT(x + rw / 2), FMT(y + rh / 2)]
  }
  const beat = (i: number, bt: number, bw: number, sign: 1 | -1): string =>
    ` data-c${i}="${STATE}"${bt ? ` data-t${i}="${FMT(bt)}"` : ''}${bw !== 1 ? ` data-w${i}="${FMT(bw)}"` : ''}` +
    (kind === 'draw' ? ` data-g${i}="${sign}"` : ` data-a${i}="${sign}" data-s${i}="${sign}"`)
  let attrs =
    base.replace('%TAG%', tag) +
    (kind === 'pop' && pivot ? ` data-ox="${pivot[0]}" data-oy="${pivot[1]}"` : '') +
    beat(1, t, w, 1)
  if (e.out) attrs += beat(2, e.out - 1, e.exitW ?? 0.6, -1) // leaving is quicker than arriving
  return `${attrs}${geometry} />`
}

/** Markup with this vector's pose (and off-state strokes) written into it. Idempotent. */
export function withPose(name: string, markup: string, radius = 1): string {
  const spec = POSES[name]
  let els = baseShapes(markup)
  if (spec?.split && els.length === spec.split.from) els = splitSubpaths(els, spec.split.at)
  const shapes = els.map((el, i) => {
    const clean = stripPose(el)
    const a = spec ? attrsFor(spec, i) : ''
    return a ? clean.replace(/^<([\w:-]+)/, `<$1${a}`) : clean
  })
  // beats on the whole vector (turning an arrow to point another way) go on a group, so the parts inside keep moving in its frame
  let body = shapes
  if (spec?.group) {
    const inside = spec.group.at ?? shapes.map((_, i) => i) // all the shapes, unless it wraps only some
    const wrapped = `<g data-gr=""${attrsFrom(spec.group.beats, spec.group.o, 'the group')}>\n${inside.map((i) => at(shapes, i)).join('\n')}\n</g>`
    body = []
    for (const [i, sh] of shapes.entries()) {
      if (i === inside[0]) body.push(wrapped)
      if (!inside.includes(i)) body.push(sh)
    }
  }
  if (spec?.add) body.push(...spec.add.map((e) => stateShape(e, radius)))
  return body.join('\n')
}

/** What the root says about the vector: its motion's name and its states, e.g. data-motion="ring" data-states="off". */
export function poseRootAttrs(name: string): string {
  const spec = POSES[name]
  if (!spec) return ''
  const used = channelsOf(name)
  return (
    (used.includes(1) && spec.labels[0] ? ` data-motion="${spec.labels[0]}"` : '') +
    (spec.states ? ` data-states="${spec.states.join(' ')}"` : '')
  )
}

/** Channels a vector has beats for, e.g. [1, 2] or [1, 3, 4]. */
export function channelsOf(name: string): Channel[] {
  const spec = POSES[name]
  if (!spec) return []
  const set = new Set<Channel>()
  for (const part of spec.parts) for (const b of part.beats) set.add(b.c)
  for (const b of spec.group?.beats ?? []) set.add(b.c) // beats on the whole vector count too
  if (spec.add?.length) set.add(STATE)
  return [...set].sort((a, b) => a - b)
}

/** Bytes of pose data a vector carries in its SVG. */
export function poseBytes(name: string, markup: string): number {
  return (withPose(name, markup).match(POSE_ATTR) || []).join('').length + poseRootAttrs(name).length
}

// ---------------------------------------------------------------------------------------------------
// States as plain drawings
// ---------------------------------------------------------------------------------------------------

const smooth = (u: number): number => u * u * (3 - 2 * u)
const num = (tag: string, name: string, d = 0): number => {
  const m = new RegExp(`\\sdata-${name}="([^"]*)"`).exec(tag)
  return m?.[1] !== undefined ? +m[1] : d
}

/** What the state channel adds up to for one element at a state stop: its end values, since state beats are ramps. */
function stateSums(tag: string, stop: number): Record<AmountKey, number> {
  const sum: Record<AmountKey, number> = { r: 0, x: 0, y: 0, s: 0, h: 0, v: 0, q: 0, a: 0, g: 0 }
  for (let i = 1; i <= BEATS; i++) {
    if (num(tag, `c${i}`, 0) !== STATE) continue
    const e = smooth(Math.min(1, Math.max(0, (stop - num(tag, `t${i}`, 0)) / num(tag, `w${i}`, 1))))
    for (const k of AMOUNTS) sum[k] += num(tag, `${k}${i}`, 0) * e
  }
  return sum
}

/** The transform and opacity attributes that stand in for those sums in a static drawing. */
function stateAttrs(tag: string, sum: Record<AmountKey, number>): string {
  const f = (v: number): number => +v.toFixed(3)
  let attrs = ''
  if (MOVES.some((k) => Math.abs(sum[k]) > 1e-6)) {
    const ox = num(tag, 'ox', 12)
    const oy = num(tag, 'oy', 12)
    attrs += ` transform="translate(${f(sum.x)} ${f(sum.y)}) translate(${ox} ${oy}) rotate(${f(sum.r)}) scale(${f(1 + sum.s + sum.h)} ${f(1 + sum.s + sum.v)}) skewX(${f(sum.q)}) translate(${-ox} ${-oy})"`
  }
  const opacity = Math.min(1, Math.max(0, num(tag, 'o', 1) + sum.a))
  if (opacity < 1 && opacity > 0) attrs += ` opacity="${f(opacity)}"`
  return attrs
}

/**
 * The vector in one of its states, as a plain static drawing with no pose data: what a consumer that cannot see CSS
 * (an <img>, a mask, a copy-paste) needs for `mic-off` or `lock-open`. Only the state channel (2) is applied, and its
 * beats are ramps, so each element's end values are computed here: transforms become a transform attribute, fades become
 * opacity, accessories that belong to the state are shown and the others dropped.
 */
export function bakeState(markup: string, stop: number): string {
  return splitTop(markup)
    .map((el) => {
      const tag = openingTag(el)
      const sum = stateSums(tag, stop)
      if (/^<g\s[^>]*\bdata-gr=/.test(tag)) {
        const children = bakeState(el.replace(/^<g\b[^>]*>/, '').replace(/<\/g>\s*$/, ''), stop)
        return `<g${stateAttrs(tag, sum)}>\n${children}\n</g>`
      }
      const plain = stripPose(el).replace(/\sdata-st="[^"]*"/, '')
      if (isState(el)) {
        // an accessory: shown in this state if it is drawn (b plus the draw) and visible (o plus the fade) enough
        if (/\sdata-b="/.test(tag) && num(tag, 'b', 1) + sum.g < 0.5) return ''
        if (/\sdata-o="/.test(tag) && num(tag, 'o', 1) + sum.a < 0.5) return ''
        return plain.replace(/\sopacity="0"/, '')
      }
      if (Math.min(1, Math.max(0, 1 + sum.a)) < 0.02 || 1 + sum.g < 0.5) return '' // gone in this state
      const attrs = stateAttrs(tag, sum)
      return attrs ? plain.replace(/^<([\w:-]+)/, `<$1${attrs}`) : plain
    })
    .filter(Boolean)
    .join('\n')
}

/** The state names of a vector, in order: stop 1 is the first. */
export const statesOf = (name: string): readonly string[] => POSES[name]?.states ?? []

/** The drawing without its state-only elements: what the vector is when no state brings anything in. */
export const stripStateShapes = (svg: string): string =>
  svg.replace(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*\sdata-st=[^>]*?(?:\/>|><\/\1>)\s*/g, '') // a file writes `<path />`, the canvas's own markup `<path></path>`
