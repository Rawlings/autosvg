import { Glyph } from './Glyph.tsx'

interface SwapIconProps {
  from: string
  to: string
  /** shows the second vector */
  on?: boolean
  size?: number
}

/** One vector turning into another (see swap.css). Decorative: the button that holds it carries the label. */
export function SwapIcon({ from, to, on, size = 24 }: SwapIconProps) {
  return (
    <span className="icon-swap" data-state={on ? 'on' : 'off'} aria-hidden="true">
      <Glyph name={from} size={size} />
      <Glyph name={to} size={size} />
    </span>
  )
}
