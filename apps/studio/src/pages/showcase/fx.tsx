import { renderIcon } from '@icon-canvas/engine'
import { type HTMLAttributes, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useEngine } from '../../app/hooks.ts'

export interface FxProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  title: string
  /** what does it: the CSS or the trick, in a few words */
  how: string
  tone?: string
  children: ReactNode
}

/** One treatment: a stage with the icon in it, and a line saying how it is done. The stage is one picture for assistive technology. */
export function Fx({ name, title, how, tone = '', children, ...rest }: FxProps) {
  return (
    <figure className="fx">
      <div {...rest} className={`fx-stage ${tone}`} role="img" aria-label={`${name}, ${title}`}>
        {children}
      </div>
      <figcaption>
        <strong>{title}</strong>
        <code>{how}</code>
      </figcaption>
    </figure>
  )
}

/** A group of treatments for one kind of business, with what its visual conventions are. */
export function Group({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <section className="fx-group">
      <h3>{title}</h3>
      <p>{blurb}</p>
      <div className="fx-grid">{children}</div>
    </section>
  )
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** The icon as a CSS mask, at the stroke, radius and curve of the Look (and a thicker stroke when the effect wants one). */
export function useMask(name: string, thicker = 1): string {
  const { style } = useEngine()
  return useMemo(() => {
    const svg = renderIcon(name, { ...style, stroke: style.stroke * thicker }, { inline: true })
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }, [name, style, thicker])
}

/**
 * The icon drawn into a small grid of `n` by `n` cells, as the coverage (0 to 1) of each cell. For the treatments that rebuild the
 * picture from cells: pixels, lamps, characters, stars. It is the same SVG, rasterised.
 */
export function useRaster(name: string, n: number, thicker = 1.5): Float32Array | undefined {
  const { style } = useEngine()
  const [grid, setGrid] = useState<Float32Array>()
  useEffect(() => {
    let live = true
    const svg = renderIcon(name, { ...style, stroke: style.stroke * thicker }, { inline: true }).replace(
      '<svg ',
      `<svg width="${n * 8}" height="${n * 8}" `,
    )
    const img = new Image()
    img.onload = () => {
      if (!live) return
      const canvas = document.createElement('canvas')
      canvas.width = n
      canvas.height = n
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(img, 0, 0, n, n)
      const data = context.getImageData(0, 0, n, n).data
      const out = new Float32Array(n * n)
      for (let i = 0; i < out.length; i++) out[i] = (data[i * 4 + 3] ?? 0) / 255
      setGrid(out)
    }
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`
    return () => {
      live = false
    }
  }, [name, style, n, thicker])
  return grid
}

/**
 * The SVG filters some treatments use (chalk, crayon, rubber stamp, spray, watercolour, pencil). Drawn once for the whole gallery:
 * noise that roughens the edge of the line, and noise that takes specks out of it.
 */
export function FxDefs() {
  const grain = (frequency: number, seed: number, lo: number, hi: number, id: string) => (
    <>
      <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="2" seed={seed} result={`${id}-n`} />
      <feColorMatrix
        in={`${id}-n`}
        type="matrix"
        values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${hi} 0 0 0 ${lo}`}
        result={`${id}-a`}
      />
    </>
  )
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="fx-defs">
      <filter id="fx-chalk" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" result="d" />
        {grain(1.4, 8, -0.9, 3.2, 'chalk')}
        <feComposite in="d" in2="chalk-a" operator="in" />
      </filter>
      <filter id="fx-crayon" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="5" result="d" />
        {grain(1.1, 2, -0.15, 2.2, 'wax')}
        <feComposite in="d" in2="wax-a" operator="in" />
      </filter>
      <filter id="fx-stamp" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="11" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" result="d" />
        {grain(0.55, 4, -2.3, 7, 'ink')}
        <feComposite in="d" in2="ink-a" operator="in" />
      </filter>
      <filter id="fx-spray" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
        {grain(1.2, 6, -0.6, 3, 'spray')}
        <feComposite in="b" in2="spray-a" operator="in" />
      </filter>
      <filter id="fx-water" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="9" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="9" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.9" />
      </filter>
      <filter id="fx-sketch" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="1" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" />
      </filter>
      <filter id="fx-sketch-b" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="w" />
        <feDisplacementMap in="SourceGraphic" in2="w" scale="3.2" />
      </filter>
    </svg>
  )
}
