/** A point on the 24 x 24 canvas: [x, y]. */
export type Point = readonly [x: number, y: number]

/** A circle: centre and radius. */
export interface Circle {
  readonly cx: number
  readonly cy: number
  readonly r: number
}

/**
 * The item at `index`, or a thrown error. For arrays whose length the caller has already established
 * (loops over `0..length`, wrapped neighbours), where `array[index]` would only add `| undefined`.
 */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new RangeError(`index ${index} is outside 0..${items.length - 1}`)
  return item
}

/** The last item of a non-empty array. */
export const last = <T>(items: readonly T[]): T => at(items, items.length - 1)
