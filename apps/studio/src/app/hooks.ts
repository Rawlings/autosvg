import {
  type CheckRow,
  canonical,
  getSnapshot,
  lintSVG,
  measureChecks,
  overall,
  type Snapshot,
  subscribe,
} from '@autosvg/engine'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

/** The engine's current state: drawing, current vector name, preview style, tile size. */
export const useEngine = (): Snapshot => useSyncExternalStore(subscribe, getSnapshot)

interface Measured {
  /** the drawing these rows are about */
  svg: string
  rows: CheckRow[]
  info: string
}

/** Spec checks for the drawing on the canvas: instant rule checks, then measured ones as they arrive. */
export function useChecks(snap: Snapshot) {
  const svg = useMemo(() => (snap.markup ? canonical(snap.markup, snap.style) : ''), [snap.markup, snap.style])
  const rules = useMemo(() => (svg ? lintSVG(svg) : []), [svg])
  const [measured, setMeasured] = useState<Measured>({ svg: '', rows: [], info: '' })

  useEffect(() => {
    if (!svg) return
    let stale = false
    measureChecks(svg, snap.name)
      .then((m) => {
        if (!stale) setMeasured({ svg, ...m })
      })
      .catch(() => {
        // a measurement that fails leaves the quick rule checks on screen
      })
    return () => {
      stale = true
    }
  }, [svg, snap.name])

  const rows: CheckRow[] = useMemo(
    () => [...rules, ...(svg && measured.svg === svg ? measured.rows : [])],
    [rules, measured, svg],
  )
  let status = rows.length ? overall(rules) : null
  if (status === 'pass' && rows.some((r) => r.status === 'warn')) status = 'warn'
  return { svg, rows, status, info: measured.svg === svg ? measured.info : '' }
}

/** Copy text; returns [copied, copy] where `copied` is true for a moment afterwards. */
export function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])
  return [
    copied,
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      } catch {
        /* clipboard unavailable: nothing to do */
      }
    },
  ]
}
