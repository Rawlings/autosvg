// A small history-API router: four pages need nothing more.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext(null)

// old links looked like /#bell; keep them working
function initial() {
  const hash = location.hash.slice(1)
  if (location.pathname === '/' && /^[a-z0-9-]+$/.test(hash)) {
    history.replaceState(null, '', `/studio/${hash}`)
  }
  return location.pathname + location.search
}

export function Router({ children }) {
  const [url, setUrl] = useState(initial)

  useEffect(() => {
    const onPop = () => setUrl(location.pathname + location.search)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === location.pathname + location.search) return
    history[replace ? 'replaceState' : 'pushState'](null, '', to)
    setUrl(to)
    if (!replace) scrollTo(0, 0)
  }, [])

  const value = useMemo(() => {
    const [path, search = ''] = url.split('?')
    return { path, params: new URLSearchParams(search), navigate }
  }, [url, navigate])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useRouter = () => useContext(Ctx)

export function Link({ to, replace, children, ...rest }) {
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
