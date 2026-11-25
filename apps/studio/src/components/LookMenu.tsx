import { useEffect, useRef, useState } from 'react'
import { useCarried } from '../app/carried.ts'
import { useCopy, useEngine } from '../app/hooks.ts'
import { resetLook, setLook, shareLink, useLook } from '../app/look.ts'
import { useRouter } from '../app/router.tsx'
import { Appearance } from './Appearance.tsx'
import { Glyph } from './Glyph.tsx'

/**
 * The one place the look is set. It lives in the header on every page, so what you choose here follows you:
 * the Library, the Studio and the Showcase all read the same numbers.
 */
export function LookMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const look = useLook()
  const snap = useEngine()
  const [vector] = useCarried()
  const { path } = useRouter()
  const [copied, copy] = useCopy()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
    }
    addEventListener('pointerdown', onPointer)
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('pointerdown', onPointer)
      removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="look" ref={root}>
      <button
        type="button"
        className="look-btn"
        aria-expanded={open}
        aria-controls="look-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <Glyph name={vector} size={20} />
        <span>Look</span>
      </button>
      {open && (
        <div className="look-panel" id="look-panel" role="group" aria-label="Look">
          <Appearance style={snap.style} />
          <label className="field">
            <span className="field-head">
              <span>Colour</span>
              <output>{look.color}</output>
            </span>
            <input
              type="color"
              className="color-input"
              value={look.color}
              onChange={(e) => setLook({ color: e.target.value })}
            />
          </label>
          <div className="look-foot">
            <button
              type="button"
              className="btn"
              onClick={() => copy(shareLink(path.startsWith('/studio') ? '/showcase' : path))}
            >
              {copied ? 'Link copied' : 'Copy a link to this look'}
            </button>
            <button type="button" className="text-btn" onClick={resetLook}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
