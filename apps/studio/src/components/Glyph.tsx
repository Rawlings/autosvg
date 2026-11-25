interface GlyphProps {
  /** an icon name, or an icon in a state: `mic`, `mic-off` */
  name: string
  /** pixels; leave out to follow `--icon-size` */
  size?: number | undefined
  className?: string | undefined
  /** puts the icon in one of its states (for example "off"); an empty string is its normal look */
  state?: string | undefined
  /** gives the icon a name for assistive technology; without it the icon is decorative */
  label?: string | undefined
  /** opt in to the lit look and cast shadow of depth.css: `tube`, `shadow` or both */
  depth?: string | undefined
}

/** One icon from the set, drawn by the <icon-glyph> runtime so it follows the --icon-* variables. */
import { cssVars } from '../lib/css.ts'

export function Glyph({ name, size, className, state, label, depth }: GlyphProps) {
  return (
    <icon-glyph
      name={name}
      class={className}
      state={state}
      depth={depth}
      aria-label={label}
      style={size ? cssVars({ '--icon-size': `${size}px` }) : undefined}
    />
  )
}
