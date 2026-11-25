import { cssVars } from '../lib/css.ts'

interface MorphIconProps {
  from: string
  to: string
  /** shows the second vector */
  on?: boolean | undefined
  size?: number | undefined
  className?: string | undefined
}

/** One vector turning into another, shape to shape (see morph.css). Decorative: the button that holds it carries the label. */
export function MorphIcon({ from, to, on, size, className }: MorphIconProps) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: <autosvg-morph> is not focusable and is decorative
    <autosvg-morph
      from={from}
      to={to}
      state={on ? 'to' : undefined}
      class={className}
      aria-hidden="true"
      style={size ? cssVars({ '--autosvg-size': `${size}px` }) : undefined}
    />
  )
}
