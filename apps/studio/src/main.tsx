import '@autosvg/engine' // registers <autosvg> and window.autosvg before anything renders
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

// <autosvg> is a plain element (a custom element name needs a hyphen), so React's development build warns once that it does not
// know the tag. It is intended; every other warning still shows.
if (import.meta.env.DEV) {
  // biome-ignore lint/suspicious/noConsole: filtering one known development warning
  const warn = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('is unrecognized in this browser') && args.includes('autosvg'))
      return
    warn(...args)
  }
}

import { App } from './app/App.tsx'
import { bootLook } from './app/look.ts'

bootLook() // the saved look and any look in the link, before the first vector is drawn
const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')
createRoot(root).render(<App />)
