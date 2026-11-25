// Importing this module defines <autosvg-glyph> and <autosvg-morph>. Load the stylesheets from ./css next to it.
import { defineAutosvgGlyph } from './glyph.ts'
import { defineAutosvgMorph } from './morph/index.ts'

defineAutosvgGlyph()
defineAutosvgMorph()
