import '@icon-canvas/engine' // registers <icon-glyph> and window.iconCanvas before anything renders
import '@icon-canvas/runtime/css/icons.css'
import '@icon-canvas/runtime/css/poses.css' // the one fixed stylesheet that turns pose data in each SVG into motion
import '@icon-canvas/runtime/css/swap.css' // one icon turning into another, driven by --icon-swap
import '@icon-canvas/runtime/css/morph.css' // any icon turning into any other, driven by --icon-morph
import '@icon-canvas/runtime/css/depth.css' // opt-in: a lit, glossy look and a cast shadow
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/showcase.css'
import './styles/industries.css'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { bootLook } from './app/look.ts'

bootLook() // the saved look and any look in the link, before the first icon is drawn
const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')
createRoot(root).render(<App />)
