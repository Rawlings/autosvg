// The set's custom elements, typed for JSX.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type Element<Own> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Own

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'auto-svg': Element<{ name?: string; state?: string; depth?: string }>
      'auto-svg-morph': Element<{ from?: string; to?: string; state?: string }>
    }
  }
}
