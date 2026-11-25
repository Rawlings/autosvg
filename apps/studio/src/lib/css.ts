import type { CSSProperties } from 'react'

/** Inline CSS custom properties (`--autosvg-size`, `--tile`), which React's style type does not know about. */
export const cssVars = (vars: Record<`--${string}`, string | number>): CSSProperties => vars as CSSProperties
