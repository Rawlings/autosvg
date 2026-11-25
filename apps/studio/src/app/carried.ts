// The icon you are carrying. Where you are says which one: /studio/<icon> on the Studio, ?icon=<icon> on the other pages.
// A page with neither shows the one you carried last, and every link in the header takes it along.
import { ICONS } from '@icon-canvas/engine'
import { useCallback } from 'react'
import { setLook, useLook } from './look.ts'
import { useRouter } from './router.tsx'

const isIcon = (name: string | null | undefined): name is string => !!name && ICONS.some((i) => i.name === name)

/** The icon named by this address, if it names one. */
export function iconInAddress(path: string, params: URLSearchParams): string | undefined {
  const raw = path.startsWith('/studio/') ? decodeURIComponent(path.split('/')[2] ?? '') : params.get('icon')
  return isIcon(raw) ? raw : undefined
}

/** [the carried icon, a function that carries another one]. */
export function useCarried(): [string, (name: string) => void] {
  const { path, params, navigate } = useRouter()
  const look = useLook()
  const icon = iconInAddress(path, params) ?? look.icon
  const carry = useCallback(
    (name: string) => {
      setLook({ icon: name })
      navigate(path.startsWith('/studio') ? `/studio/${name}` : `${path}?icon=${name}`, { replace: true })
    },
    [path, navigate],
  )
  return [icon, carry]
}
