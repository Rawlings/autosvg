// Drawing a vector as SVG markup: no DOM, so Node scripts (the static export) and the browser share it.
// <icon-glyph> (glyph.ts) is the element that calls this from the page's CSS variables.
import { bakeState, DEFAULT_STYLE, POSES, poseRootAttrs, RECIPES, type Style, withPose } from '@autosvg/core'
import { getVector, onVectorChange } from '@autosvg/vectors'

const SVG_NS = 'http://www.w3.org/2000/svg'

const inner = (svg: string): string =>
  svg
    .replace(/^<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()

/** Drawn geometry per vector and radius/curve setting. */
const cache = new Map<string, string>()
onVectorChange(() => cache.clear()) // a saved or added vector is drawn from its new file

/** What a name means: a vector (`state` 0) or a vector in one of its states. */
export interface Resolved {
  base: string
  /** the stop number of --icon-state; 0 for the vector itself */
  state: number
}

/**
 * A name can be a vector, or a vector in one of its states: `mic-off` is `mic` in its off state, `unlock` is `lock` in
 * its open state. The set ships one vector for all of them. Returns { base, state } (state is the stop number, 0 for the
 * vector itself) or null if there is no such vector.
 */
export function resolve(name: string): Resolved | null {
  if (RECIPES[name] || getVector(name)) return { base: name, state: 0 }
  return aliasTable().get(name) ?? null
}

let aliases: Map<string, Resolved> | undefined
function aliasTable(): Map<string, Resolved> {
  if (aliases) return aliases
  const table = new Map<string, Resolved>()
  for (const [base, spec] of Object.entries(POSES)) {
    const states = spec.states ?? []
    for (const [i, state] of states.entries()) table.set(`${base}-${state}`, { base, state: i + 1 })
    for (const [alias, state] of Object.entries(spec.aliases ?? {}))
      table.set(alias, { base, state: states.indexOf(state) + 1 }) // 'normal' is not a state, so it gives 0
  }
  aliases = table
  return table
}

/** Every name that means a vector in one of its states, e.g. ['bell-off', 'eye-off', 'lock-open', 'unlock', ...]. */
export const stateNames = (): string[] => [...aliasTable().keys()].sort()

/**
 * SVG for a vector at the given settings.
 *  inline: false  root carries the default look and the page's CSS variables restyle it (what <icon-glyph> uses)
 *  inline: true   stroke, cap and join are written into the root, so the file stands alone (lint, measure, export)
 */
export function renderIcon(
  name: string,
  params: Partial<Style> = {},
  { inline = false }: { inline?: boolean } = {},
): string {
  const p = { ...DEFAULT_STYLE, ...params }
  const found = resolve(name)
  if (!found) throw new Error(`Unknown vector "${name}"`)
  const { base, state } = found
  const key = [base, p.radius, p.curve].join('|')
  let shapes = cache.get(key)
  if (shapes === undefined) {
    const recipe = RECIPES[base]
    const saved = getVector(base)
    if (!recipe && saved === undefined) throw new Error(`Vector "${base}" has neither a recipe nor a file`)
    shapes = recipe ? recipe({ r: p.radius, c: p.curve }).join('\n') : inner(saved?.svg ?? '')
    shapes = withPose(base, shapes, p.radius) // pose data travels in the SVG itself (see poses.css)
    if (cache.size > 4000) cache.clear() // a CSS transition passes through many values; keep the cache bounded
    cache.set(key, shapes)
  }
  // a standalone drawing of `mic-off` has the state baked in; <icon-glyph> keeps it live instead (see the state attribute)
  if (state && inline) {
    const look = `stroke-width="${p.stroke}" stroke-linecap="${p.cap}" stroke-linejoin="${p.join}"`
    return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ${look}>\n${bakeState(shapes, state)}\n</svg>`
  }
  const look = inline
    ? `stroke-width="${p.stroke}" stroke-linecap="${p.cap}" stroke-linejoin="${p.join}"`
    : `class="vector" stroke-width="${DEFAULT_STYLE.stroke}" stroke-linecap="${DEFAULT_STYLE.cap}" stroke-linejoin="${DEFAULT_STYLE.join}"`
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ${look}${poseRootAttrs(base)}>\n${shapes}\n</svg>`
}

/** Forget cached geometry (call after a vector file or recipe changes). */
export const clearVectorCache = (): void => cache.clear()
