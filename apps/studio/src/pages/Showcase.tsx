// The icon you carried here: as a solid 3D object, in real places, and in many styles grouped by industry.
import { useCarried } from '../app/carried.ts'
import { Link } from '../app/router.tsx'
import { InPlace } from './showcase/Carried.tsx'
import { Industries } from './showcase/Industries.tsx'
import { Tube3D } from './showcase/Tube3D.tsx'

export default function Showcase() {
  const [icon, carry] = useCarried()
  return (
    <div className="page showcase">
      <div className="page-head">
        <div>
          <h1>Showcase</h1>
        </div>
      </div>

      <section className="sc-section sc-hero" aria-labelledby="sc-hero-title">
        <h2 id="sc-hero-title">
          {icon}, <span>in your look</span>
        </h2>
        <p>
          Drag to turn it. <kbd>[</kbd> and <kbd>]</kbd> step through the set.{' '}
          <Link to={`/?icon=${icon}`}>Back to {icon} in the Library</Link>.
        </p>
        <Tube3D icon={icon} onIcon={carry} />
        <InPlace name={icon} />
      </section>

      <section className="sc-section" aria-labelledby="sc-fx-title">
        <h2 id="sc-fx-title">
          One file, <span className="sc-ink">every look</span>
        </h2>
        <p>
          Every tile is the same <strong>{icon}</strong> file, grouped by the kind of business that would reach for it.
        </p>
        <Industries name={icon} />
      </section>
    </div>
  )
}
