import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, canonical, lintSVG, overall, measureChecks } from '../engine.js'

/** The engine's current state: drawing, current icon name, preview style, tile size. */
export const useEngine = () => useSyncExternalStore(subscribe, getSnapshot)

/** Spec checks for the drawing on the canvas: instant rule checks, then measured ones as they arrive. */
export function useChecks(snap) {
  const svg = useMemo(() => (snap.markup ? canonical(snap.markup, snap.style) : ''), [snap.markup, snap.style])
  const rules = useMemo(() => (svg ? lintSVG(svg) : []), [svg])
  const [measured, setMeasured] = useState({ svg: '', rows: [], info: '' })

  useEffect(() => {
    if (!svg) return
    let stale = false
    measureChecks(svg, snap.name)
      .then((m) => !stale && setMeasured({ svg, ...m }))
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [svg, snap.name])

  const rows = useMemo(() => [...rules, ...(svg && measured.svg === svg ? measured.rows : [])], [rules, measured, svg])
  let status = rows.length ? overall(rules) : null
  if (status === 'pass' && rows.some((r) => r.status === 'warn')) status = 'warn'
  return { svg, rows, status, info: measured.svg === svg ? measured.info : '' }
}

/** Copy text; returns [copied, copy] where `copied` is true for a moment afterwards. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])
  return [
    copied,
    async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      } catch {
        /* clipboard unavailable: nothing to do */
      }
    },
  ]
}
