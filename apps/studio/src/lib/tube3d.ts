// Real 3D from the plain SVGs: every icon is a set of centre-lines with round caps and joins, which is exactly a chain of capsules.
// This turns an icon (or a morph between two) into instance data for the renderer: one cylinder per piece of line and one sphere
// per point. The same points at both ends of a morph mean the shader can blend them with a single number.
import type { Style } from '@icon-canvas/core'
import { morphPlan } from '@icon-canvas/runtime'

/** Floats per cylinder instance: the two ends at the start and at the end of the morph (12), and the radius factor at each (2). */
export const CYLINDER_FLOATS = 14
/** Floats per sphere instance: the point at the start and at the end of the morph (6), and the radius factor at each (2). */
export const SPHERE_FLOATS = 8

export interface TubeData {
  cylinders: Float32Array
  spheres: Float32Array
}

/** Points along each cubic: enough that the facets of the cylinders disappear under the spheres. */
const SAMPLES = 8

type P3 = readonly [number, number, number]

/** The icon's 24 grid as a cube about the origin: x right, y up, 1 is the edge of the canvas. */
const world = (x: number, y: number): P3 => [(x - 12) / 12, (12 - y) / 12, 0]

/** `M x y C x y x y x y C ...` as points along the curves. */
function pointsOf(d: string): P3[] {
  const tokens = d.match(/[MC]|-?\d*\.?\d+/g) ?? []
  const out: P3[] = []
  let i = 0
  let x = 0
  let y = 0
  while (i < tokens.length) {
    const command = tokens[i++]
    if (command === 'M') {
      x = Number(tokens[i++])
      y = Number(tokens[i++])
      out.push(world(x, y))
    } else if (command === 'C') {
      while (i < tokens.length && tokens[i] !== 'M' && tokens[i] !== 'C') {
        const [x1, y1, x2, y2, x3, y3] = tokens.slice(i, i + 6).map(Number) as [
          number,
          number,
          number,
          number,
          number,
          number,
        ]
        i += 6
        for (let s = 1; s <= SAMPLES; s++) {
          const t = s / SAMPLES
          const u = 1 - t
          const px = u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
          const py = u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
          out.push(world(px, py))
        }
        x = x3
        y = y3
      }
    }
  }
  return out
}

/** Tubes for icon `from` turning into icon `to` (the same name twice for a still icon), drawn at the corner radius and curve of `style`. */
export function buildTubes(from: string, to: string, style: Partial<Style> = {}): TubeData {
  const plan = morphPlan(from, to, style)
  const cylinders: number[] = []
  const spheres: number[] = []
  for (const stroke of plan.strokes) {
    const a = pointsOf(stroke.from)
    const b = pointsOf(stroke.to)
    const n = Math.min(a.length, b.length)
    // a stroke with no partner shrinks away (or grows in) instead of moving
    const r0 = stroke.fade === 'in' ? 0 : 1
    const r1 = stroke.fade === 'out' ? 0 : 1
    for (let i = 0; i < n; i++) {
      const p0 = a[i]
      const p1 = b[i]
      if (!p0 || !p1) continue
      spheres.push(...p0, ...p1, r0, r1)
      const q0 = a[i + 1]
      const q1 = b[i + 1]
      if (q0 && q1 && i + 1 < n) cylinders.push(...p0, ...q0, ...p1, ...q1, r0, r1)
    }
  }
  return { cylinders: new Float32Array(cylinders), spheres: new Float32Array(spheres) }
}
