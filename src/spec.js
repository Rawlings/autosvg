/**
 * Icon system tokens. Single source of truth: the canvas, the linter and the
 * icon files all derive from these values. Human-readable rules: ../SPEC.md
 */
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
  allowedElements: ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'],
  // Pure line icons: all styling is inherited from the root <svg>. Shapes carry geometry only.
  forbiddenAttrs: [
    'id', 'class', 'style', 'transform', 'filter', 'mask', 'clip-path',
    'opacity', 'fill', 'fill-opacity', 'stroke', 'stroke-opacity',
    'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  ],
  previewSizes: [16, 24, 32, 48, 64],
}

/** The family's default look. Saved files use this unless the Style panel's "save with this style" is on. */
export const DEFAULT_STYLE = {
  stroke: SPEC.stroke,
  cap: SPEC.cap,
  join: SPEC.join,
  radius: 1, // corner radius multiplier (icons with a recipe)
  curve: 0, // 0 = circles, 1 = squircles (icons with a recipe)
}

/**
 * The look currently being previewed (Style panel). Everything displayed and every check follows it,
 * so you can see how the set behaves at another weight without touching any file.
 */
export const STYLE = { ...DEFAULT_STYLE }

/** Geometry (not stroke) must stay inside this box so stroke ends within the live area. Follows the weight. */
export const safe = () => ({
  min: SPEC.padding + STYLE.stroke / 2,
  max: SPEC.size - SPEC.padding - STYLE.stroke / 2,
})

/** Visible white required between strokes: at least one stroke width. Follows the weight. */
export const minGap = () => STYLE.stroke
