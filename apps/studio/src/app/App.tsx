import { useEffect } from 'react'
import { LookMenu } from '../components/LookMenu.tsx'
import Library from '../pages/Library.tsx'
import Quality from '../pages/Quality.tsx'
import Showcase from '../pages/Showcase.tsx'
import Studio from '../pages/Studio.tsx'
import { iconInAddress, useCarried } from './carried.ts'
import { setLook, useLook } from './look.ts'
import { Link, Router, useRouter } from './router.tsx'

/** Where each page's link goes when you are carrying an icon: the Studio keeps it in the path, the others in `?icon=`. */
const NAV: { to: string; label: string; match: (path: string) => boolean; carry: (icon: string) => string }[] = [
  { to: '/', label: 'Library', match: (p) => p === '/', carry: (i) => `/?icon=${i}` },
  { to: '/studio', label: 'Studio', match: (p) => p.startsWith('/studio'), carry: (i) => `/studio/${i}` },
  { to: '/showcase', label: 'Showcase', match: (p) => p.startsWith('/showcase'), carry: (i) => `/showcase?icon=${i}` },
  { to: '/quality', label: 'Quality', match: (p) => p.startsWith('/quality'), carry: () => '/quality' },
]

function Header() {
  const { path, params } = useRouter()
  const [icon] = useCarried()
  const look = useLook()
  // an icon named by the address becomes the one carried
  const named = iconInAddress(path, params)
  useEffect(() => {
    if (named && named !== look.icon) setLook({ icon: named })
  }, [named, look.icon])
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to="/" className="wordmark" aria-label="Icon Canvas, home">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <path d="M8.5 15.5 12 8l3.5 7.5M9.9 13h4.2" />
          </svg>
          <span>Icon Canvas</span>
        </Link>
        <nav aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.to} to={n.carry(icon)} aria-current={n.match(path) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <LookMenu />
      </div>
    </header>
  )
}

function Page() {
  const { path } = useRouter()
  if (path.startsWith('/studio')) return <Studio />
  if (path.startsWith('/showcase')) return <Showcase />
  if (path.startsWith('/quality')) return <Quality />
  return <Library />
}

export function App() {
  return (
    <Router>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Page />
      </main>
    </Router>
  )
}
