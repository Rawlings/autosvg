/** One icon turning into another, shape to shape (see src/morph.css). Decorative: the button that holds it carries the label. */
export function MorphIcon({ from, to, on, size, className }) {
  return <icon-morph from={from} to={to} state={on ? 'to' : undefined} class={className} aria-hidden="true" style={size ? { '--icon-size': `${size}px` } : undefined} />
}
