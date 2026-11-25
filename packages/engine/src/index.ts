// Headless vector engine: the model behind the app and the window.autosvg API (for devtools and agents).
import { STYLE } from '@autosvg/checks'
import { DEFAULT_STYLE } from '@autosvg/core'
import { defineAutosvgGlyph, defineAutosvgMorph, renderIcon } from '@autosvg/runtime'
import { VECTORS } from '@autosvg/vectors'
import { type AutosvgApi, api, getSVG } from './api.ts'

defineAutosvgGlyph() // <autosvg-glyph>: every vector in the app is drawn through its real CSS-variable interface
defineAutosvgMorph() // <autosvg-morph>: any vector turning into any other

declare global {
  interface Window {
    autosvg: AutosvgApi
  }
}

window.autosvg = api

export { DELIBERATE, lintSVG, overall } from '@autosvg/checks'
export { canonical, sized } from './markup.ts'
export { type CheckRow, measureChecks } from './measure.ts'
export { getSnapshot, replaceArtwork as setSourceText, type Snapshot, subscribe } from './state.ts'
export type { AutosvgApi }
export { api, DEFAULT_STYLE, getSVG, renderIcon, STYLE, VECTORS }
