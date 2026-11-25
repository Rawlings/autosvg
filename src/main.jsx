import { createRoot } from 'react-dom/client'
import './engine.js' // registers <icon-glyph> and window.iconCanvas before anything renders
import './icons.css'
import './poses.css' // the one fixed stylesheet that turns pose data in each SVG into motion
import './swap.css' // one icon turning into another, driven by --icon-swap
import './morph.css' // any icon turning into any other, driven by --icon-morph
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/showcase.css'
import { App } from './app/App.jsx'

createRoot(document.getElementById('root')).render(<App />)
