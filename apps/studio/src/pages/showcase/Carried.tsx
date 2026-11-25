import { Glyph } from '../../components/Glyph.tsx'
import { Card } from './card.tsx'

const SIZES = [16, 20, 24, 32, 48, 64] as const

/** `arrow-up-right` as a label. */
const words = (name: string) => name.replace(/-/g, ' ')

/**
 * The carried vector in real places, drawn with the shared look: the stroke, radius, curve, caps and joins set in the Look menu
 * reach every one of these through the --autosvg-* variables, with no code here that knows about them.
 */
export function InPlace({ name }: { name: string }) {
  const label = words(name)
  return (
    <div className="sc-grid">
      <Card
        title="At every size"
        note="The same drawing, 16 to 64 px, at the stroke and corner radius set in the Look menu."
        driver="--autosvg-size · --autosvg-stroke"
      >
        <div className="sc-c-sizes">
          {SIZES.map((px) => (
            <figure key={px}>
              <Glyph name={name} size={px} />
              <figcaption>{px}</figcaption>
            </figure>
          ))}
        </div>
      </Card>
      <Card
        title="In buttons"
        note="Filled, outlined, vector only. Hover or focus one to play the vector's own gesture."
        driver=".sc-hover:hover { --autosvg-motion: 1 }"
      >
        <div className="sc-c-buttons">
          <button type="button" className="sc-c-btn primary sc-hover">
            <Glyph name={name} size={20} />
            {label}
          </button>
          <button type="button" className="sc-c-btn sc-hover">
            <Glyph name={name} size={20} />
            {label}
          </button>
          <button type="button" className="sc-c-btn round sc-hover" aria-label={label}>
            <Glyph name={name} size={22} />
          </button>
        </div>
      </Card>
      <Card
        title="In a tab bar"
        note="Between two neighbours, so you can judge its weight and size beside other vectors."
        driver="aria-current=page · --autosvg-motion"
      >
        <div className="sc-c-tabs" role="group" aria-label="Tab bar example">
          {[
            { key: 'before', vector: 'home', text: 'home', on: false },
            { key: 'carried', vector: name, text: label, on: true },
            { key: 'search', vector: 'search', text: 'search', on: false },
            { key: 'user', vector: 'user', text: 'user', on: false },
          ].map((tab) => (
            <button key={tab.key} type="button" className="sc-c-tab sc-hover" aria-pressed={tab.on}>
              <Glyph name={tab.vector} size={24} />
              <span>{tab.text}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card
        title="Large, in your colour"
        note="Big, on light and on dark, in the colour chosen in the Look menu."
        driver="color: var(--look-ink)"
      >
        <div className="sc-c-big">
          <div className="sc-c-big-light">
            <Glyph name={name} size={96} />
          </div>
          <div className="sc-c-big-dark">
            <Glyph name={name} size={96} />
          </div>
        </div>
      </Card>
    </div>
  )
}
