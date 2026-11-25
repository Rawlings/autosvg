import { type ReactNode, useEffect, useRef } from 'react'

export interface CardProps {
  title: string
  note: string
  /** the CSS or markup that drives the demo, shown under it */
  driver: string
  children: ReactNode
}

export function Card({ title, note, driver, children }: CardProps) {
  return (
    <article className="sc-card">
      <div>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
      <div className="sc-demo">{children}</div>
      <code className="sc-driver">{driver}</code>
    </article>
  )
}

export function useTimeouts() {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(
    () => () => {
      for (const id of ids.current) clearTimeout(id)
    },
    [],
  )
  return (fn: () => void, ms: number): void => {
    ids.current.push(setTimeout(fn, ms))
  }
}
