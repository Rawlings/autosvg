/** One icon from the set, drawn by the <icon-glyph> runtime so it follows the --icon-* variables. `state` puts it in one of its states (for example "off"); an empty string is its normal look. */
export function Glyph({ name, size, className, state, label }) {
  return (
    <icon-glyph
      name={name}
      className={className}
      state={state}
      aria-label={label}
      style={size ? { '--icon-size': `${size}px` } : undefined}
    />
  )
}
