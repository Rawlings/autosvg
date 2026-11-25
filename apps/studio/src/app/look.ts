// The look that follows you from page to page: the icon you are carrying, the style numbers (stroke, radius, curve, caps,
// joins) and a colour. It lives in one place, is kept between visits, and can be put in a link.
//
// The style numbers themselves belong to the engine (it publishes them as --icon-* on the page); this file saves and restores them.
import { DEFAULT_STYLE, type Style } from '@icon-canvas/core'
import { api, getSnapshot, ICONS, subscribe as subscribeEngine } from '@icon-canvas/engine'
import { useSyncExternalStore } from 'react'
import { DEFAULT_COLOR, isColor } from '../lib/materials.ts'

export interface LookState {
  /** The icon being carried between pages. */
  icon: string
  /** The colour of the 3D view and of the accents that show the carried icon (`#rrggbb`). */
  color: string
}

const DEFAULT_ICON = 'bell'
const KEY = 'icon-canvas.look.v1'
const STYLE_KEYS = Object.keys(DEFAULT_STYLE) as (keyof Style)[]

let state: LookState = { icon: DEFAULT_ICON, color: DEFAULT_COLOR }
const listeners = new Set<() => void>()

const isIcon = (name: string | null | undefined): name is string => !!name && ICONS.some((i) => i.name === name)

function writeInk(): void {
  document.documentElement.style.setProperty('--look-ink', state.color)
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, style: api.getStyle(), tile: getSnapshot().tile }))
  } catch {
    // storage is off (private mode): the look still works for this visit
  }
}

/** Change the look; every page that reads it updates. */
export function setLook(patch: Partial<LookState>): void {
  const next = { ...state, ...patch }
  if ((Object.keys(patch) as (keyof LookState)[]).every((k) => next[k] === state[k])) return
  state = next
  writeInk()
  save()
  for (const listener of listeners) listener()
}

/** Back to the set's own look: the style numbers and the colour. The carried icon stays. */
export function resetLook(): void {
  api.resetStyle()
  setLook({ color: DEFAULT_COLOR })
  save()
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useLook = (): LookState => useSyncExternalStore(subscribe, () => state)

/** The style as the engine holds it, for a link. Only what differs from the set's own look. */
function styleParams(): URLSearchParams {
  const params = new URLSearchParams()
  const style = api.getStyle()
  for (const key of STYLE_KEYS) if (style[key] !== DEFAULT_STYLE[key]) params.set(key, String(style[key]))
  return params
}

/** A link to `path` that opens with this icon and this look. */
export function shareLink(path: string): string {
  const params = styleParams()
  params.set('icon', state.icon)
  if (state.color !== DEFAULT_COLOR) params.set('color', state.color.slice(1))
  return `${location.origin}${path}?${params}`
}

const LOOK_PARAMS = [...STYLE_KEYS, 'color'] as const

/** Read the saved look, then any look in the link (a link wins), and hand the style to the engine. Call once, before the first render. */
export function bootLook(): void {
  let saved: Partial<LookState> & { style?: Partial<Style>; tile?: number } = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as typeof saved
  } catch {
    // a damaged entry is the same as none
  }
  const params = new URLSearchParams(location.search)
  const num = (value: string | null | undefined): number | undefined =>
    value !== null && value !== undefined && value !== '' && Number.isFinite(+value) ? +value : undefined

  const style: Partial<Style> = { ...saved.style }
  for (const key of STYLE_KEYS) {
    const raw = params.get(key)
    if (raw === null) continue
    if (key === 'cap' || key === 'join') style[key] = raw as never
    else style[key] = num(raw) ?? style[key] ?? DEFAULT_STYLE[key]
  }
  api.setStyle(style)
  if (saved.tile) api.setTileSize(saved.tile)

  const fromLink = params.get('color')
  const color = fromLink ? `#${fromLink}` : saved.color
  const icon = params.get('icon') ?? saved.icon
  state = {
    icon: isIcon(icon) ? icon : DEFAULT_ICON,
    color: isColor(color) ? color.toLowerCase() : DEFAULT_COLOR,
  }
  writeInk()

  // the look parameters have done their job: keep the address short (the icon stays, it is where you are)
  if (LOOK_PARAMS.some((k) => params.has(k))) {
    for (const k of LOOK_PARAMS) params.delete(k)
    const rest = params.toString()
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : ''))
  }
  save() // what you see is what is kept, including a look that came in a link
  subscribeEngine(save)
}
