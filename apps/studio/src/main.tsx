import '@autosvg/engine' // registers <autosvg-glyph> and window.autosvg before anything renders
import '@autosvg/runtime/css/icons.css'
import '@autosvg/runtime/css/poses.css' // the one fixed stylesheet that turns pose data in each SVG into motion
import '@autosvg/runtime/css/swap.css' // one vector turning into another, driven by --autosvg-swap
import '@autosvg/runtime/css/morph.css' // any vector turning into any other, driven by --autosvg-morph
import '@autosvg/runtime/css/depth.css' // opt-in: a lit, glossy look and a cast shadow
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/showcase.css'
import './styles/industries.css'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { bootLook } from './app/look.ts'

bootLook() // the saved look and any look in the link, before the first vector is drawn
const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')
createRoot(root).render(<App />)
