/**
 * Icon system tokens. Single source of truth: the canvas, the linter and the
 * icon files all derive from these values. Human-readable rules: SPEC.md
 */

export type Cap = 'butt' | 'round' | 'square'
export type Join = 'miter' | 'round' | 'bevel'

/** The look of the set: what a consumer can change with `--icon-*` variables. */
export interface Style {
  /** line weight */
  stroke: number
  cap: Cap
  join: Join
  /** corner radius multiplier (icons with a recipe) */
  radius: number
  /** 0 = circles, 1 = squircles (icons with a recipe) */
  curve: number
}

export const SPEC = {
  size: 24, // viewBox is 0 0 24 24
  padding: 2, // live area = 20x20, stroke included
  stroke: 1.5, // one stroke weight for the whole family
  cap: 'round',
  join: 'round',
  grid: 0.5, // primitive coordinates sit on a half-unit grid
  maxDecimals: 2,
  maxShapes: 8, // more than this is too detailed for 24px
  tolerance: 0.05, // measurement slack for curve bounding boxes
  minGap: 1.5, // clear space between parallel strokes (visible white): at least one stroke width
  maxCentreOffset: 0.75, // the drawn extent (ink bounding box) may sit this far from the canvas centre
  allowedElements: ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'] as readonly string[],
  // Pure line icons: all styling is inherited from the root <svg>. Shapes carry geometry only.
  forbiddenAttrs: [
    'id',
    'class',
    'style',
    'transform',
    'filter',
    'mask',
    'clip-path',
    'opacity',
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-opacity',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
  ] as readonly string[],
  previewSizes: [16, 24, 32, 48, 64] as readonly number[],
} satisfies { cap: Cap; join: Join } & Record<string, unknown>

/** The family's default look. Saved files use this. */
export const DEFAULT_STYLE: Readonly<Style> = {
  stroke: SPEC.stroke,
  cap: SPEC.cap,
  join: SPEC.join,
  radius: 1,
  curve: 0,
}
