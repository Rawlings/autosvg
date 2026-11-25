// The general-purpose treatments of one icon. Each is a tile; Industries.tsx files every one under the kind of business that would
// reach for it. Nothing here is another file: it is the same SVG, a few numbers (--icon-stroke, --icon-dash) and some CSS.
import { useRef } from 'react'
import { Glyph } from '../../components/Glyph.tsx'
import { cssVars } from '../../lib/css.ts'
import { Fx, range, useMask } from './fx.tsx'

type Props = { name: string }

const LONG = range(16)
  .map(() => 'drop-shadow(1px 1px 0 var(--fx-deep))')
  .join(' ')

export function Glass({ name }: Props) {
  const mask = useMask(name, 1.4)
  return (
    <Fx name={name} title="Etched glass" how="mask-image · backdrop-filter" tone="fx-glass">
      <span className="fx-glass-ink" style={cssVars({ '--m': mask })} />
    </Fx>
  )
}

export function Slab({ name }: Props) {
  return (
    <Fx name={name} title="Slab" how="14 copies · translateZ · preserve-3d" tone="fx-slab">
      <div className="fx-slab-turn">
        {range(14).map((i) => (
          <span key={i} className="fx-slab-layer" style={cssVars({ '--i': i })}>
            <Glyph name={name} size={130} />
          </span>
        ))}
      </div>
    </Fx>
  )
}

export function Neon({ name }: Props) {
  return (
    <Fx name={name} title="Neon" how="drop-shadow ×3 · a flicker on opacity" tone="fx-neon">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function GradientInk({ name }: Props) {
  const mask = useMask(name, 1.7)
  return (
    <Fx name={name} title="Gradient ink" how="mask over a turning conic-gradient · box-reflect" tone="fx-floor">
      <span className="fx-ink" style={cssVars({ '--m': mask })} />
    </Fx>
  )
}

export function Hollow({ name }: Props) {
  return (
    <Fx name={name} title="Hollow tube" how="two strokes: wide, then the stage colour" tone="fx-hollow fx-stack">
      <Glyph name={name} size={150} className="fx-o" />
      <Glyph name={name} size={150} className="fx-i" />
    </Fx>
  )
}

export function Contours({ name }: Props) {
  return (
    <Fx name={name} title="Contours" how="five strokes, wide to thin, alternating" tone="fx-contour fx-stack">
      {range(5).map((i) => (
        <Glyph key={i} name={name} size={150} className="fx-c" />
      ))}
    </Fx>
  )
}

export function Dotted({ name }: Props) {
  return (
    <Fx name={name} title="Dotted, marching" how="--icon-dash: 0 2.7 · round caps · dashoffset" tone="fx-dots">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function Drawn({ name }: Props) {
  return (
    <Fx name={name} title="Drawn by hand" how="--icon-dash: 200 · dashoffset 200 → 0" tone="fx-draw">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function LongShadow({ name }: Props) {
  return (
    <Fx name={name} title="Long shadow" how="drop-shadow(1px 1px 0) × 16" tone="fx-long">
      <span style={{ filter: LONG }}>
        <Glyph name={name} size={150} />
      </span>
    </Fx>
  )
}

export function Sticker({ name }: Props) {
  return (
    <Fx name={name} title="Sticker" how="a white stroke behind, a drop shadow, a tilt" tone="fx-sticker fx-stack">
      <Glyph name={name} size={150} className="fx-back" />
      <Glyph name={name} size={150} className="fx-front" />
    </Fx>
  )
}

export function Chroma({ name }: Props) {
  return (
    <Fx
      name={name}
      title="Chromatic split"
      how="3 copies · mix-blend-mode: screen · stepped offset"
      tone="fx-chroma fx-stack"
    >
      <Glyph name={name} size={150} className="fx-r" />
      <Glyph name={name} size={150} className="fx-g" />
      <Glyph name={name} size={150} className="fx-b" />
    </Fx>
  )
}

export function Blueprint({ name }: Props) {
  return (
    <Fx name={name} title="Blueprint" how="thin stroke · dashed outline · a grid behind" tone="fx-blue fx-stack">
      <Glyph name={name} size={150} className="fx-halo" />
      <Glyph name={name} size={150} className="fx-line" />
      <span className="fx-label">24 × 24 · 1.5</span>
    </Fx>
  )
}

export function Hologram({ name }: Props) {
  return (
    <Fx name={name} title="Hologram" how="cyan glow · scanlines · a sweeping band" tone="fx-holo fx-stack">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function Goo({ name }: Props) {
  return (
    <Fx name={name} title="Liquid" how="SVG blur + threshold · a breathing stroke" tone="fx-goo">
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="fx-defs">
        <filter id="fx-goo-filter">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
        </filter>
      </svg>
      <span className="fx-goo-ink">
        <Glyph name={name} size={150} />
      </span>
    </Fx>
  )
}

export function Echo({ name }: Props) {
  return (
    <Fx name={name} title="Echo" how="12 copies · rotate × a registered --spread" tone="fx-echo fx-stack">
      {range(12)
        .reverse()
        .map((i) => (
          <span key={i} className="fx-e" style={cssVars({ '--i': i })}>
            <Glyph name={name} size={130} />
          </span>
        ))}
    </Fx>
  )
}

export function Kaleidoscope({ name }: Props) {
  return (
    <Fx name={name} title="Kaleidoscope" how="6 rotated copies · alternate mirrored" tone="fx-kal">
      <div className="fx-kal-turn">
        {range(6).map((i) => (
          <span key={i} className="fx-kal-arm" style={cssVars({ '--i': i })}>
            <Glyph name={name} size={56} />
          </span>
        ))}
      </div>
    </Fx>
  )
}

export function Wallpaper({ name }: Props) {
  return (
    <Fx
      name={name}
      title="Wallpaper, with a wave"
      how="20 copies · animation-delay × --i · --icon-motion"
      tone="fx-paper"
    >
      {range(20).map((i) => (
        <span key={i} className="fx-tile" style={cssVars({ '--i': (i % 5) + Math.floor(i / 5) * 2 })}>
          <Glyph name={name} size={34} />
        </span>
      ))}
    </Fx>
  )
}

export function Tilt({ name }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const set = (vars: Record<string, string>) => {
    for (const [k, v] of Object.entries(vars)) stage.current?.style.setProperty(k, v)
  }
  return (
    <figure className="fx">
      {/* the pointer only sets four numbers; the CSS turns them into a card */}
      <div
        ref={stage}
        className="fx-stage fx-tilt"
        role="img"
        aria-label={`${name}, tilting card`}
        onPointerMove={(e) => {
          if (reduced() || !stage.current) return
          const r = stage.current.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          set({
            '--rx': `${-y * 24}deg`,
            '--ry': `${x * 30}deg`,
            '--gx': `${(x + 0.5) * 100}%`,
            '--gy': `${(y + 0.5) * 100}%`,
          })
        }}
        onPointerLeave={() => set({ '--rx': '0deg', '--ry': '0deg', '--gx': '50%', '--gy': '30%' })}
      >
        <div className="fx-tilt-card">
          <span className="fx-tilt-back">
            <Glyph name={name} size={112} />
          </span>
          <span className="fx-tilt-front">
            <Glyph name={name} size={112} />
          </span>
        </div>
      </div>
      <figcaption>
        <strong>Tilt card</strong>
        <code>pointer sets --rx --ry · translateZ layers</code>
      </figcaption>
    </figure>
  )
}

export function Letterpress({ name }: Props) {
  return (
    <Fx name={name} title="Letterpress" how="two 1px drop-shadows, light and dark" tone="fx-press">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function Breathing({ name }: Props) {
  return (
    <Fx name={name} title="Breathing stroke" how="--icon-stroke from a registered --breath" tone="fx-breath">
      <Glyph name={name} size={150} />
    </Fx>
  )
}

export function Stitched({ name }: Props) {
  return (
    <Fx name={name} title="Stitched" how="a thick stroke, then a dashed one on top" tone="fx-stitch fx-stack">
      <Glyph name={name} size={150} className="fx-cloth" />
      <Glyph name={name} size={150} className="fx-thread" />
    </Fx>
  )
}
