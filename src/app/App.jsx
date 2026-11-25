import { Router, Link, useRouter } from './router.jsx'
import { useEngine } from './hooks.js'
import Library from '../pages/Library.jsx'
import Studio from '../pages/Studio.jsx'
import Motion from '../pages/Motion.jsx'
import Showcase from '../pages/Showcase.jsx'
import Quality from '../pages/Quality.jsx'

const NAV = [
  { to: '/', label: 'Library', match: (p) => p === '/' },
  { to: '/studio', label: 'Studio', match: (p) => p.startsWith('/studio') },
  { to: '/motion', label: 'Motion', match: (p) => p.startsWith('/motion') },
  { to: '/showcase', label: 'Showcase', match: (p) => p.startsWith('/showcase') },
  { to: '/quality', label: 'Quality', match: (p) => p.startsWith('/quality') },
]

function Header() {
  const { path } = useRouter()
  const snap = useEngine()
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to="/" className="brand" aria-label="Icon Canvas, home">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <path d="M8.5 15.5 12 8l3.5 7.5M9.9 13h4.2" />
          </svg>
          <span>Icon Canvas</span>
        </Link>
        <nav aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to === '/studio' && snap.name ? `/studio/${snap.name}` : n.to} aria-current={n.match(path) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Page() {
  const { path } = useRouter()
  if (path.startsWith('/studio')) return <Studio />
  if (path.startsWith('/motion')) return <Motion />
  if (path.startsWith('/showcase')) return <Showcase />
  if (path.startsWith('/quality')) return <Quality />
  return <Library />
}

export function App() {
  return (
    <Router>
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Page />
      </main>
    </Router>
  )
}
