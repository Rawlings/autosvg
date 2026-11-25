// Headless icon engine: the model behind the app and the window.iconCanvas API (for devtools and agents).
import { STYLE } from '@icon-canvas/checks'
import { DEFAULT_STYLE } from '@icon-canvas/core'
import { ICONS } from '@icon-canvas/icons'
import { defineIconGlyph, defineIconMorph, renderIcon } from '@icon-canvas/runtime'
import { api, getSVG, type IconCanvasApi } from './api.ts'

defineIconGlyph() // <icon-glyph>: every icon in the app is drawn through its real CSS-variable interface
defineIconMorph() // <icon-morph>: any icon turning into any other

declare global {
  interface Window {
    iconCanvas: IconCanvasApi
  }
}

window.iconCanvas = api

export { DELIBERATE, lintSVG, overall } from '@icon-canvas/checks'
export { canonical, sized } from './markup.ts'
export { type CheckRow, measureChecks } from './measure.ts'
export { getSnapshot, replaceArtwork as setSourceText, type Snapshot, subscribe } from './state.ts'
export type { IconCanvasApi }
export { api, DEFAULT_STYLE, getSVG, ICONS, renderIcon, STYLE }
