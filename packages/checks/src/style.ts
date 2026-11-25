import { DEFAULT_STYLE, SPEC, type Style } from '@icon-canvas/core'

/**
 * The look currently being previewed (the Style panel). Everything displayed and every check follows it,
 * so you can see how the set behaves at another weight without touching any file. The engine changes it;
 * the checks only read it.
 */
export const STYLE: Style = { ...DEFAULT_STYLE }

/** Geometry (not stroke) must stay inside this box so stroke ends within the live area. Follows the weight. */
export const safe = (): { min: number; max: number } => ({
  min: SPEC.padding + STYLE.stroke / 2,
  max: SPEC.size - SPEC.padding - STYLE.stroke / 2,
})

/** Visible white required between strokes: at least one stroke width. Follows the weight. */
export const minGap = (): number => STYLE.stroke
