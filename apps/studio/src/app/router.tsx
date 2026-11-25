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

// old links looked like /#bell; keep them working
function initial(): string {
  const hash = location.hash.slice(1)
  if (location.pathname === '/' && /^[a-z0-9-]+$/.test(hash)) {
    history.replaceState(null, '', `/studio/${hash}`)
  }
  // the Motion page became part of the Library's detail: old links land there, with the vector
  if (location.pathname === '/motion') history.replaceState(null, '', `/${location.search}`)
  return location.pathname + location.search
}

export function Router({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState(initial)

  useEffect(() => {
    const onPop = () => setUrl(location.pathname + location.search)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback<RouterValue['navigate']>((to, { replace = false } = {}) => {
    if (to === location.pathname + location.search) return
    const go = () => {
      if (replace) history.replaceState(null, '', to)
      else history.pushState(null, '', to)
      setUrl(to)
      if (!replace) scrollTo(0, 0)
    }
    // a change of page is a view transition: whatever carries the same `view-transition-name` on both pages
    // (the carried vector's stage) travels between them instead of cutting
    const samePage = to.split('?')[0] === location.pathname
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
      href={to}
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
