// The colour the 3D view and the rest of the app share. One colour picker sets it; the 3D shading makes it a polished metal.
import type { Look } from './tube-gl.ts'

export const DEFAULT_COLOR = '#39ff14'

/** How metallic the 3D tubes are: enough to catch the light, low enough that the picked colour stays the colour. */
const METAL = 0.8

export const isColor = (value: string | null | undefined): value is string => !!value && /^#[0-9a-f]{6}$/i.test(value)

/** `#d9825f` as the numbers the renderer wants (0 to 1 each) and a metal amount. */
export function lookOf(hex: string): Look {
  const n = Number.parseInt(hex.slice(1), 16)
  return { color: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], metal: METAL }
}
