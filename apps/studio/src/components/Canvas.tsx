import { safe } from '@icon-canvas/checks'
import { SPEC, type Style } from '@icon-canvas/core'
import { useState } from 'react'

const SIZE = SPEC.size
const ticks = Array.from({ length: SIZE + 1 }, (_, i) => i)

/**
 * The 24×24 drawing surface: grid, keylines and the artwork. The artwork is the engine's detached
 * drawing, rendered as markup; the engine (window.iconCanvas) is what edits it.
 */
interface CanvasProps {
  /** the shapes to draw */
  markup: string
  style: Style
  grid: boolean
  guides: boolean
}

export function Canvas({ markup, style, grid, guides }: CanvasProps) {
  const [at, setAt] = useState<[number, number] | null>(null)
  const pad = SPEC.padding
  const s = safe()
  return (
    <div className="canvas-wrap">
      <svg
        className="canvas"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Icon canvas"
        onPointerMove={(e) => {
          const svg = e.currentTarget
          const ctm = svg.getScreenCTM()
          if (!ctm) return
          const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
          setAt([p.x, p.y])
        }}
        onPointerLeave={() => setAt(null)}
      >
        {grid && (
          <g>
            {ticks.map((i) => {
              const cls = i % 12 === 0 ? 'g-major' : i % 4 === 0 ? 'g-mid' : 'g-minor'
              return (
                <g key={i} className={cls}>
                  <line x1={i} y1="0" x2={i} y2={SIZE} />
                  <line x1="0" y1={i} x2={SIZE} y2={i} />
                </g>
              )
            })}
          </g>
        )}
        {guides && (
          <g fill="none">
            <rect className="live" x={pad} y={pad} width={SIZE - pad * 2} height={SIZE - pad * 2} />
            <rect className="safe" x={s.min} y={s.min} width={s.max - s.min} height={s.max - s.min} />
            <g className="key">
              <circle cx="12" cy="12" r="10" />
              <rect x="3" y="3" width="18" height="18" />
              <rect x="4" y="2" width="16" height="20" />
              <rect x="2" y="4" width="20" height="16" />
              <line x1="2" y1="2" x2="22" y2="22" />
              <line x1="22" y1="2" x2="2" y2="22" />
            </g>
          </g>
        )}
        <g
          className="artwork"
          fill="none"
          stroke="currentColor"
          strokeWidth={style.stroke}
          strokeLinecap={style.cap}
          strokeLinejoin={style.join}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: the markup is the engine's own drawing, which sanitizes everything it parses
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </svg>
      <p className="coords" aria-hidden="true">
        {at ? `x ${at[0].toFixed(1)}   y ${at[1].toFixed(1)}` : ' '}
      </p>
    </div>
  )
}
