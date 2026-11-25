// A small history-API router: four pages need nothing more.
import {
  type AnchorHTMLAttributes,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

interface RouterValue {
  path: string
  params: URLSearchParams
  navigate: (to: string, options?: { replace?: boolean }) => void
}

const Ctx = createContext<RouterValue | null>(null)

/** Where the app is served from: `/` on a dev server, `/autosvg/` on GitHub Pages (set by Vite's `base`). Pages and links never see it. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** The address as the pages see it (no base), and as the browser holds it (base first). */
const inApp = (pathname: string): string =>
  BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) || '/' : pathname
export const withBase = (to: string): string => (to.startsWith('/') ? BASE + to : to)
const here = (): string => inApp(location.pathname) + location.search

// old links looked like /#bell; keep them working
function initial(): string {
  const hash = location.hash.slice(1)
  if (inApp(location.pathname) === '/' && /^[a-z0-9-]+$/.test(hash)) {
    history.replaceState(null, '', withBase(`/studio/${hash}`))
  }
  // the Motion page became part of the Library's detail: old links land there, with the vector
  if (inApp(location.pathname) === '/motion') history.replaceState(null, '', withBase(`/${location.search}`))
  return here()
}

export function Router({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState(initial)

  useEffect(() => {
    const onPop = () => setUrl(here())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback<RouterValue['navigate']>((to, { replace = false } = {}) => {
    if (to === here()) return
    const go = () => {
      if (replace) history.replaceState(null, '', withBase(to))
      else history.pushState(null, '', withBase(to))
      setUrl(to)
      if (!replace) scrollTo(0, 0)
    }
    // a change of page is a view transition: whatever carries the same `view-transition-name` on both pages
    // (the carried vector's stage) travels between them instead of cutting
    const samePage = to.split('?')[0] === inApp(location.pathname)
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (replace || samePage || still || !document.startViewTransition) go()
    else document.startViewTransition(() => flushSync(go))
  }, [])

  const value = useMemo<RouterValue>(() => {
    const [path = '/', search = ''] = url.split('?')
    return { path, params: new URLSearchParams(search), navigate }
  }, [url, navigate])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRouter(): RouterValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useRouter must be used inside <Router>')
  return value
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  replace?: boolean
}

export function Link({ to, replace = false, children, ...rest }: LinkProps) {
  const { navigate } = useRouter()
  return (
    <a
      href={withBase(to)}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to, { replace })
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
