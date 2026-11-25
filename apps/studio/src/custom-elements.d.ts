// The set's custom elements, typed for JSX.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type Element<Own> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Own

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      autosvg: Element<{ name?: string; state?: string; depth?: string }>
      'autosvg-morph': Element<{ from?: string; to?: string; state?: string }>
    }
  }
}
