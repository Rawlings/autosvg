// The vector you carried here: as a solid 3D object, in real places, and in many styles grouped by industry.
import { useRef } from 'react'
import { useCarried } from '../app/carried.ts'
import { Link } from '../app/router.tsx'
import { InPlace } from './showcase/Carried.tsx'
import { Industries } from './showcase/Industries.tsx'
import { Tube3D } from './showcase/Tube3D.tsx'

export default function Showcase() {
  const [vector, carry] = useCarried()
  // the state and motion numbers go here, so the 3D view and every tile below follow them
  const root = useRef<HTMLDivElement>(null)
  return (
    <div className="page showcase" ref={root}>
      <div className="page-head">
        <div>
          <h1>Showcase</h1>
        </div>
      </div>

      <section className="sc-section sc-hero" aria-labelledby="sc-hero-title">
        <h2 id="sc-hero-title">
          {vector}, <span>in your look</span>
        </h2>
        <p>
          Drag to turn it. <kbd>[</kbd> and <kbd>]</kbd> step through the set.{' '}
          <Link to={`/?vector=${vector}`}>Back to {vector} in the Library</Link>.
        </p>
        <Tube3D vector={vector} onVector={carry} target={root} />
        <InPlace name={vector} />
      </section>

      <section className="sc-section" aria-labelledby="sc-fx-title">
        <h2 id="sc-fx-title">
          One file, <span className="sc-ink">every look</span>
        </h2>
        <p>
          Every tile is the same <strong>{vector}</strong> file, grouped by the kind of business that would reach for
          it.
        </p>
        <Industries name={vector} />
      </section>
    </div>
  )
}
