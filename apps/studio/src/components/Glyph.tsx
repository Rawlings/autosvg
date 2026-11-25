interface GlyphProps {
  /** a vector name, or a vector in a state: `mic`, `mic-off` */
  name: string
  /** pixels; leave out to follow `--autosvg-size` */
  size?: number | undefined
  className?: string | undefined
  /** puts the vector in one of its states (for example "off"); an empty string is its normal look */
  state?: string | undefined
  /** gives the vector a name for assistive technology; without it the vector is decorative */
  label?: string | undefined
  /** opt in to the lit look and cast shadow of depth.css: `tube`, `shadow` or both */
  depth?: string | undefined
}

/** One vector from the set, drawn by the <auto-svg> runtime so it follows the --autosvg-* variables. */
import { cssVars } from '../lib/css.ts'

export function Glyph({ name, size, className, state, label, depth }: GlyphProps) {
  return (
    <auto-svg
      name={name}
      class={className}
      state={state}
      depth={depth}
      aria-label={label}
      style={size ? cssVars({ '--autosvg-size': `${size}px` }) : undefined}
    />
  )
}
