// The vector you are carrying. Where you are says which one: /studio/<vector> on the Studio, ?vector=<vector> on the other pages.
// A page with neither shows the one you carried last, and every link in the header takes it along.
import { VECTORS } from '@autosvg/engine'
import { useCallback } from 'react'
import { setLook, useLook } from './look.ts'
import { useRouter } from './router.tsx'

const isVector = (name: string | null | undefined): name is string => !!name && VECTORS.some((i) => i.name === name)

/** The vector named by this address, if it names one. */
export function vectorInAddress(path: string, params: URLSearchParams): string | undefined {
  const raw = path.startsWith('/studio/') ? decodeURIComponent(path.split('/')[2] ?? '') : params.get('vector')
  return isVector(raw) ? raw : undefined
}

/** [the carried vector, a function that carries another one]. */
export function useCarried(): [string, (name: string) => void] {
  const { path, params, navigate } = useRouter()
  const look = useLook()
  const vector = vectorInAddress(path, params) ?? look.vector
  const carry = useCallback(
    (name: string) => {
      setLook({ vector: name })
      navigate(path.startsWith('/studio') ? `/studio/${name}` : `${path}?vector=${name}`, { replace: true })
    },
    [path, navigate],
  )
  return [vector, carry]
}
