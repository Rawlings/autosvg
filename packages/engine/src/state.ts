import { STYLE } from '@autosvg/checks'
import type { Style } from '@autosvg/core'
import { parseMarkup, SVG_NS, stripNs } from './markup.ts'

// The drawing on the canvas is a detached <g>. The UI renders it, the API edits it, and `subscribe`
// tells React when anything changed. Nothing here touches the page's layout.

const artwork = document.createElementNS(SVG_NS, 'g')
let currentName = '' // the vector being edited in the canvas
let tile = 32 // gallery vector size

/** Everything the UI needs to draw itself; a new object whenever something changed. */
export interface Snapshot {
  rev: number
  name: string
  markup: string
  style: Style
  tile: number
}

/** The shapes on the canvas as markup. */
export const markup = (): string => stripNs(artwork.innerHTML).trim()

export const getName = (): string => currentName
export const getTile = (): number => tile

// ---------- store (for React's useSyncExternalStore) ----------

const listeners = new Set<() => void>()
let rev = 0
let snapshot: Snapshot = take()

function take(): Snapshot {
  return { rev: ++rev, name: currentName, markup: markup(), style: { ...STYLE }, tile }
}

/** Something changed: publish a new snapshot. */
export function changed(): void {
  snapshot = take()
  for (const listener of listeners) listener()
}

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getSnapshot = (): Snapshot => snapshot

// ---------- editing ----------

/** Replace the artwork with markup (inner shapes or a whole <svg>). Throws on invalid markup and leaves the drawing as it was. */
export function replaceArtwork(text: string): void {
  artwork.replaceChildren(...parseMarkup(text).map((n) => document.importNode(n, true)))
  changed()
}

export function appendArtwork(text: string): void {
  artwork.append(...parseMarkup(text).map((n) => document.importNode(n, true)))
  changed()
}

/** Set attributes on every element matching `selector`; null removes. Returns how many it touched. */
export function patchArtwork(selector: string, attrs: Record<string, string | number | null>): number {
  const targets = artwork.querySelectorAll(selector)
  for (const t of targets) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null) t.removeAttribute(k)
      else t.setAttribute(k, String(v))
    }
  }
  changed()
  return targets.length
}

export function clearArtwork(): void {
  artwork.replaceChildren()
  currentName = ''
  changed()
}

export function setName(name: string): void {
  currentName = name
}

/** Name the drawing and publish. */
export function nameArtwork(name: string): void {
  currentName = name
  changed()
}

export function setTile(px: number): number {
  tile = Math.min(64, Math.max(16, Math.round(px)))
  changed()
  return tile
}
