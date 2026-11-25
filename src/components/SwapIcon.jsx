import { Glyph } from './Glyph.jsx'

/** One icon turning into another (see src/swap.css). Decorative: the button that holds it carries the label. */
export function SwapIcon({ from, to, on, size = 24 }) {
  return (
    <span className="icon-swap" data-state={on ? 'on' : 'off'} aria-hidden="true">
      <Glyph name={from} size={size} />
      <Glyph name={to} size={size} />
    </span>
  )
}
