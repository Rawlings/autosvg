import { ICONS } from '@icon-canvas/engine'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEngine } from '../../app/hooks.ts'
import { useLook } from '../../app/look.ts'
import { Glyph } from '../../components/Glyph.tsx'
import { lookOf } from '../../lib/materials.ts'
import { type Look, TubeGL } from '../../lib/tube-gl.ts'
import { buildTubes } from '../../lib/tube3d.ts'
import { Knob } from './depth.tsx'

/** A few well-drawn icons to jump between; the carried icon is added in front when it is not one of them. */
const FEATURED = ['bell', 'lock', 'heart', 'bolt', 'rocket', 'key', 'camera', 'cloud']

const MORPH_MS = 900
/** Drag: radians of turn per pixel, and how quickly the let-go spin dies away. */
const PER_PIXEL = 0.012
const FRICTION = 3.2
const PITCH_LIMIT = 0.7

const ease = (t: number) => t * t * (3 - 2 * t)
const NAMES = ICONS.map((i) => i.name)

/** The numbers a picture is made of, kept in a ref so that dragging never re-renders React. */
interface Scene {
  to: string
  t: number
  morphStart: number | undefined
  yaw: number
  pitch: number
  spin: number
  stroke: number
  radius: number
  curve: number
  look: Look
  dragging: boolean
}

interface Props {
  /** The icon to show. When it changes the shape morphs into the new one. */
  icon: string
  onIcon: (name: string) => void
}

const Chevron = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

/**
 * The carried icon as a real object: each stroke becomes a lit tube, drawn with WebGL from the same plain SVG paths the
 * rest of the set uses. Drag to turn it; any change of icon (a button, `[` and `]`, or arriving from the Library) morphs
 * the shape in the vertex shader. The colour comes from the shared look. A showcase: the library ships none of it.
 */
export function Tube3D({ icon, onIcon }: Props) {
  const look = useLook()
  const { style } = useEngine()
  const canvas = useRef<HTMLCanvasElement>(null)
  const gl = useRef<TubeGL | undefined>(undefined)
  const scene = useRef<Scene>({
    to: icon,
    t: 1,
    morphStart: undefined,
    yaw: -0.5,
    pitch: 0.08,
    spin: 0,
    stroke: 1.5,
    radius: 1,
    curve: 0,
    look: lookOf(look.color),
    dragging: false,
  })
  const frame = useRef(0)
  const visible = useRef(true)
  const last = useRef<number | undefined>(undefined)
  const reduced = useRef(false)
  const [turn, setTurn] = useState(-29)
  const [supported, setSupported] = useState(true)

  const draw = useCallback((time: number) => {
    frame.current = 0
    const renderer = gl.current
    const s = scene.current
    if (!renderer) return
    const dt = Math.min((time - (last.current ?? time)) / 1000, 0.05)
    last.current = time
    let moving = false
    if (s.morphStart !== undefined) {
      s.t = Math.min((time - s.morphStart) / MORPH_MS, 1)
      if (s.t >= 1) s.morphStart = undefined
      else moving = true
    }
    if (!s.dragging && Math.abs(s.spin) > 0.01) {
      s.yaw += s.spin * dt
      s.spin *= Math.exp(-FRICTION * dt)
      moving = true
    }
    // a slow sway when nothing is happening, so the form reads as solid; never under reduced motion
    const sway = reduced.current ? 0 : Math.sin(time / 1700) * 0.28
    renderer.draw({ t: ease(s.t), yaw: s.yaw + sway, pitch: s.pitch, stroke: s.stroke, look: s.look })
    if (visible.current && (moving || !reduced.current)) frame.current = requestAnimationFrame(draw)
  }, [])

  const wake = useCallback(() => {
    if (frame.current === 0) frame.current = requestAnimationFrame(draw)
  }, [draw])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const renderer = TubeGL.create(element)
    if (!renderer) {
      setSupported(false)
      return
    }
    gl.current = renderer
    const { radius, curve } = scene.current
    renderer.setTubes(buildTubes(scene.current.to, scene.current.to, { radius, curve }))
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onQuery = () => {
      reduced.current = query.matches
      wake()
    }
    onQuery()
    query.addEventListener('change', onQuery)
    const watcher = new IntersectionObserver(([entry]) => {
      visible.current = entry?.isIntersecting ?? true
      if (visible.current) wake()
    })
    watcher.observe(element)
    const resizer = new ResizeObserver(wake)
    resizer.observe(element)
    wake()
    return () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      query.removeEventListener('change', onQuery)
      watcher.disconnect()
      resizer.disconnect()
      renderer.dispose()
      gl.current = undefined
    }
  }, [wake])

  // the shared colour
  useEffect(() => {
    scene.current.look = lookOf(look.color)
    wake()
  }, [look.color, wake])

  // the shared style: stroke thickens the tubes, corner radius and curve reshape the icon itself
  useEffect(() => {
    const s = scene.current
    s.stroke = style.stroke
    const reshaped = s.radius !== style.radius || s.curve !== style.curve
    s.radius = style.radius
    s.curve = style.curve
    if (reshaped && gl.current) {
      gl.current.setTubes(buildTubes(s.to, s.to, { radius: style.radius, curve: style.curve }))
      s.t = 1
      s.morphStart = undefined
    }
    wake()
  }, [style.stroke, style.radius, style.curve, wake])

  // the carried icon changed (from here, from the header, from the address): morph to it
  useEffect(() => {
    const s = scene.current
    const renderer = gl.current
    if (!renderer || s.to === icon) return
    // a change during a morph lands the first one at once, then the new one starts from there
    renderer.setTubes(buildTubes(s.to, icon, { radius: s.radius, curve: s.curve }))
    s.to = icon
    if (reduced.current) {
      s.t = 1
      s.morphStart = undefined
    } else {
      s.t = 0
      s.morphStart = performance.now()
    }
    wake()
  }, [icon, wake])

  // step through the whole set with [ and ], as in the Studio
  const index = NAMES.indexOf(icon)
  const step = useCallback(
    (by: number) => onIcon(NAMES[(index + by + NAMES.length) % NAMES.length] ?? icon),
    [index, icon, onIcon],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/input|textarea|select/i.test(document.activeElement?.tagName ?? '') || !visible.current) return
      if (e.key === '[') step(-1)
      if (e.key === ']') step(1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [step])

  const pointer = useRef<{ x: number; y: number; time: number } | undefined>(undefined)
  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { x: event.clientX, y: event.clientY, time: event.timeStamp }
    scene.current.dragging = true
    scene.current.spin = 0
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const from = pointer.current
    if (!from) return
    const s = scene.current
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    const dt = Math.max((event.timeStamp - from.time) / 1000, 0.001)
    s.yaw += dx * PER_PIXEL
    s.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, s.pitch + dy * PER_PIXEL))
    s.spin = (dx * PER_PIXEL) / dt
    pointer.current = { x: event.clientX, y: event.clientY, time: event.timeStamp }
    setTurn(Math.round((((s.yaw * 180) / Math.PI + 180) % 360) - 180))
    wake()
  }
  const up = () => {
    pointer.current = undefined
    scene.current.dragging = false
    if (reduced.current) scene.current.spin = 0
    wake()
  }

  const strip = FEATURED.includes(icon) ? FEATURED : [icon, ...FEATURED]

  return (
    <div className="sc-3d">
      <div className="sc-3d-stage">
        {supported ? (
          <canvas
            ref={canvas}
            className="sc-3d-canvas"
            role="img"
            aria-label={`The ${icon} icon as a lit three-dimensional tube. Drag to turn it.`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
        ) : (
          <p className="sc-3d-fallback">This needs WebGL2.</p>
        )}
        <div className="sc-3d-bar">
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Previous icon"
            title="Previous ( [ )"
            onClick={() => step(-1)}
          >
            <Chevron d="m14.5 6-6 6 6 6" />
          </button>
          <p className="sc-3d-name" aria-live="polite">
            <strong>{icon}</strong>
            <span>
              {index + 1} / {NAMES.length}
            </span>
          </p>
          <button
            type="button"
            className="btn icon-btn"
            aria-label="Next icon"
            title="Next ( ] )"
            onClick={() => step(1)}
          >
            <Chevron d="m9.5 6 6 6-6 6" />
          </button>
        </div>
      </div>
      <div className="sc-3d-controls">
        <div className="sc-3d-icons" role="group" aria-label="Icon">
          {strip.map((name) => (
            <button
              key={name}
              type="button"
              className="sc-3d-icon"
              aria-label={name}
              aria-pressed={icon === name}
              onClick={() => onIcon(name)}
            >
              <Glyph name={name} size={24} />
            </button>
          ))}
        </div>
        <div className="sc-3d-knobs">
          <Knob
            label="Turn"
            value={turn}
            min={-180}
            max={180}
            step={5}
            onChange={(value) => {
              scene.current.yaw = (value * Math.PI) / 180
              scene.current.spin = 0
              setTurn(value)
              wake()
            }}
          />
        </div>
      </div>
    </div>
  )
}
