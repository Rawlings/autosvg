import { cssVars } from '../lib/css.ts'

interface MorphIconProps {
  from: string
  to: string
  /** shows the second icon */
  on?: boolean | undefined
  size?: number | undefined
  className?: string | undefined
}

/** One icon turning into another, shape to shape (see morph.css). Decorative: the button that holds it carries the label. */
export function MorphIcon({ from, to, on, size, className }: MorphIconProps) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: <icon-morph> is not focusable and is decorative
    <icon-morph
      from={from}
      to={to}
      state={on ? 'to' : undefined}
      class={className}
      aria-hidden="true"
      style={size ? cssVars({ '--icon-size': `${size}px` }) : undefined}
    />
  )
}
