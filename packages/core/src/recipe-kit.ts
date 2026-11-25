// The pieces recipes are written with: shape helpers that return markup, and the radius and curve settings they follow.
// A recipe is a function of the geometry settings; at the defaults (r = 1, c = 0) it must reproduce its saved icon file.
import { roundedPolygon, roundedPolyline, superellipse } from './geo.ts'
import type { Point } from './util.ts'

/** The geometry settings a recipe draws for: r is the corner radius multiplier, c the curve character. */
export interface RecipeParams {
  r: number
  c: number
}

/** A recipe returns the shapes of an icon, one markup string each. */
export type Recipe = (p: RecipeParams) => string[]

export const n = (v: number): number => +v.toFixed(2)
export const path = (d: string): string => `<path d="${d}" />`
export const rect = (x: number, y: number, w: number, h: number, r: number): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${n(r)}" />`
export const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`
export const dot = (cx: number, cy: number): string => `<circle cx="${cx}" cy="${cy}" r="0.5" />` // a dot stays a dot at any setting

/** A radius scaled by the radius setting, capped where the geometry would stop making sense. */
export const R = (base: number, p: RecipeParams, max = Number.POSITIVE_INFINITY): number => Math.min(base * p.r, max)

/**
 * A circle that becomes a squircle as the curve setting rises. Circles under radius 2 (a dot, an eyelet,
 * a sun on a photo) stay round: at 3px across a squircle can't be told from a circle.
 */
const SQUIRCLE_MAX = 4 // exponent at curve = 1 (2 = circle)
const MIN_CURVE_RADIUS = 2 // keep in step with checks/src/coverage.ts
export const exponent = (p: RecipeParams): number => 2 + (SQUIRCLE_MAX - 2) * p.c
export const round = (cx: number, cy: number, r: number, p: RecipeParams): string =>
  p.c > 0 && r >= MIN_CURVE_RADIUS
    ? path(superellipse(cx, cy, r, r, exponent(p)))
    : `<circle cx="${cx}" cy="${cy}" r="${r}" />`

/** Fillet radii for a polygon: only vertices that have a radius scale with the setting. */
export const radii = (list: readonly number[], p: RecipeParams): number[] => list.map((v) => (v ? v * p.r : 0))

/** Closed polygon / open polyline with filleted corners whose radii follow the setting. */
export const poly = (pts: readonly Point[], rads: readonly number[], p: RecipeParams): string =>
  path(roundedPolygon(pts, radii(rads, p)))
export const pline = (pts: readonly Point[], rads: readonly number[], p: RecipeParams): string =>
  path(roundedPolyline(pts, radii(rads, p)))
