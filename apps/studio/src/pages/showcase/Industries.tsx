import { useMemo, useRef } from 'react'
import { Glyph } from '../../components/Glyph.tsx'
import { cssVars } from '../../lib/css.ts'
import { Fx, FxDefs, Group, range, useMask, useRaster } from './fx.tsx'
import {
  Blueprint,
  Breathing,
  Chroma,
  Contours,
  Dotted,
  Drawn,
  Echo,
  Glass,
  Goo,
  GradientInk,
  Hollow,
  Hologram,
  Kaleidoscope,
  Letterpress,
  LongShadow,
  Neon,
  Slab,
  Sticker,
  Stitched,
  Tilt,
  Wallpaper,
} from './Styles.tsx'

/** A tile whose whole picture is the icon as a mask over something painted. */
function Masked({
  name,
  title,
  how,
  tone,
  ink,
  thicker = 1.8,
  children,
}: {
  name: string
  title: string
  how: string
  tone: string
  ink: string
  thicker?: number
  children?: React.ReactNode
}) {
  const mask = useMask(name, thicker)
  return (
    <Fx name={name} title={title} how={how} tone={tone}>
      <span className={ink} style={cssVars({ '--m': mask })} />
      {children}
    </Fx>
  )
}

// ---------- games ----------

function Pixel({ name }: { name: string }) {
  const grid = useRaster(name, 20, 1.5)
  const cells = useMemo(() => {
    if (!grid) return []
    const n = 20
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && (grid[y * n + x] ?? 0) > 0.38
    const out: { x: number; y: number; k: string }[] = []
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (on(x, y)) {
          const k = !on(x + 1, y) || !on(x, y + 1) ? 'shade' : !on(x - 1, y) || !on(x, y - 1) ? 'light' : 'base'
          out.push({ x, y, k })
        } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) out.push({ x, y, k: 'edge' })
      }
    }
    return out
  }, [grid])
  return (
    <Fx
      name={name}
      title="Pixel art"
      how="the icon rasterised to 20 × 20 · rects · shade and outline"
      tone="fx-pixel-stage"
    >
      <svg viewBox="-1 -1 22 22" className="fx-pixel" shapeRendering="crispEdges" aria-hidden="true">
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" className={`px-${c.k}`} />
        ))}
      </svg>
    </Fx>
  )
}

function Led({ name }: { name: string }) {
  const n = 24
  const grid = useRaster(name, n, 1.4)
  return (
    <Fx name={name} title="LED matrix" how="24 × 24 lamps · coverage sets brightness · glow" tone="fx-led-stage">
      <svg viewBox={`0 0 ${n} ${n}`} className="fx-led" aria-hidden="true">
        {grid &&
          range(n * n).map((i) => {
            const a = grid[i] ?? 0
            return (
              <circle
                key={i}
                cx={(i % n) + 0.5}
                cy={Math.floor(i / n) + 0.5}
                r="0.36"
                className={a > 0.25 ? 'lit' : 'dark'}
                fillOpacity={a > 0.25 ? 0.4 + 0.6 * a : 1}
              />
            )
          })}
      </svg>
    </Fx>
  )
}

function Rare({ name }: { name: string }) {
  return (
    <Fx
      name={name}
      title="Legendary item"
      how="clip-path hexagon · a turning conic border · rising sparks"
      tone="fx-rare"
    >
      <div className="fx-rare-hex">
        <Glyph name={name} size={96} />
      </div>
      {range(9).map((i) => (
        <span key={i} className="fx-spark" style={cssVars({ '--i': i })} />
      ))}
    </Fx>
  )
}

// ---------- tech ----------

function Ascii({ name }: { name: string }) {
  const n = 24
  const grid = useRaster(name, n, 1.3)
  const rows = useMemo(() => {
    if (!grid) return ''
    const ramp = ' .:-=+*#%@'
    return range(n)
      .map((y) =>
        range(n)
          .map((x) => ramp[Math.min(9, Math.floor((grid[y * n + x] ?? 0) * 10))] ?? ' ')
          .join(''),
      )
      .join('\n')
  }, [grid])
  return (
    <Fx
      name={name}
      title="ASCII terminal"
      how="the icon rasterised · a ramp of characters · a blinking cursor"
      tone="fx-ascii-stage"
    >
      <pre className="fx-ascii" aria-hidden="true">
        {rows}
        <span className="fx-caret">█</span>
      </pre>
    </Fx>
  )
}

// ---------- space ----------

function Stars({ name }: { name: string }) {
  const n = 44
  const grid = useRaster(name, n, 1.25)
  const stars = useMemo(() => {
    if (!grid) return { dots: [] as { x: number; y: number }[], lines: [] as number[][] }
    const candidates: { x: number; y: number }[] = []
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) if ((grid[y * n + x] ?? 0) > 0.55) candidates.push({ x: x + 0.5, y: y + 0.5 })
    // a fixed shuffle (a small linear congruential generator), so the sky is the same every time
    let seed = 7
    const next = () => {
      seed = (seed * 16807) % 2147483647
      return seed
    }
    const order = candidates.map((c) => ({ c, key: next() }))
    order.sort((p, q) => p.key - q.key)
    const dots: { x: number; y: number }[] = []
    for (const { c } of order) if (dots.every((d) => Math.hypot(d.x - c.x, d.y - c.y) > 3.3)) dots.push(c)
    const lines: number[][] = []
    for (const [i, a] of dots.entries()) {
      for (const b of dots.slice(i + 1)) if (Math.hypot(a.x - b.x, a.y - b.y) < 5.8) lines.push([a.x, a.y, b.x, b.y])
    }
    return { dots, lines }
  }, [grid])
  return (
    <Fx
      name={name}
      title="Constellation"
      how="stars picked along the rasterised stroke · lines between neighbours"
      tone="fx-sky"
    >
      <svg viewBox={`0 0 ${n} ${n}`} className="fx-stars" aria-hidden="true">
        {stars.lines.map((l) => (
          <line key={l.join('-')} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} className="ln" />
        ))}
        {stars.dots.map((d, i) => (
          <circle
            key={`${d.x}-${d.y}`}
            cx={d.x}
            cy={d.y}
            r={0.45 + (i % 3) * 0.2}
            className="star"
            style={cssVars({ '--i': i })}
          />
        ))}
      </svg>
    </Fx>
  )
}

// ---------- safety ----------

function Torch({ name }: { name: string }) {
  const stage = useRef<HTMLDivElement>(null)
  return (
    <figure className="fx">
      {/* the pointer sets two numbers; without one, the light wanders by itself */}
      <div
        ref={stage}
        className="fx-stage fx-torch"
        role="img"
        aria-label={`${name}, a reflective icon lit by a torch`}
        onPointerMove={(e) => {
          const el = stage.current
          if (!el) return
          const r = el.getBoundingClientRect()
          el.dataset['live'] = '1'
          el.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`)
          el.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`)
        }}
        onPointerLeave={() => {
          const el = stage.current
          if (!el) return
          delete el.dataset['live']
          el.style.removeProperty('--px')
          el.style.removeProperty('--py')
        }}
      >
        <span className="fx-torch-ghost">
          <Glyph name={name} size={150} />
        </span>
        <span className="fx-torch-lit">
          <Glyph name={name} size={150} />
        </span>
      </div>
      <figcaption>
        <strong>Reflective, torch-lit</strong>
        <code>mask: radial-gradient at --px --py · move over it</code>
      </figcaption>
    </figure>
  )
}

/**
 * The same icon, dressed for fourteen kinds of business. Each group is what a brand in that field tends to reach for: metal and
 * foil for money, pixels and lamps for games, chalk and stamps for food, hazard stripes for building sites. None is another file.
 */
export function Industries({ name }: { name: string }) {
  return (
    <>
      <FxDefs />

      <Group
        title="Software and SaaS"
        blurb="Interfaces made of light: frosted glass, soft gradients, flat shadows, repeating patterns."
      >
        <Glass name={name} />
        <GradientInk name={name} />
        <Hollow name={name} />
        <LongShadow name={name} />
        <Wallpaper name={name} />
      </Group>

      <Group
        title="Finance and luxury"
        blurb="Trust is shown by weight: real metal, foil that catches the light, engraving, embossing."
      >
        <Masked
          name={name}
          title="Gold foil"
          how="mask over a sliding metal gradient"
          tone="fx-foil-stage"
          ink="fx-foil"
          thicker={1.7}
        />
        <Fx
          name={name}
          title="Embossed card"
          how="two shadows, light and dark · a glint across the card"
          tone="fx-card-stage"
        >
          <div className="fx-card">
            <span className="fx-chip" />
            <span className="fx-card-no">•••• 4242</span>
            <span className="fx-card-icon">
              <Glyph name={name} size={64} />
            </span>
          </div>
        </Fx>
        <Masked
          name={name}
          title="Holographic foil"
          how="mask over a rainbow gradient, drifting"
          tone="fx-holofoil-stage"
          ink="fx-holofoil"
          thicker={1.8}
        />
        <Fx name={name} title="Brass plaque" how="inset drop-shadows · four screws in radial-gradients" tone="fx-brass">
          <Glyph name={name} size={150} />
        </Fx>
        <Letterpress name={name} />
      </Group>

      <Group
        title="Games and arcade"
        blurb="The screen is the material: pixels you can count, lamps, and items that announce their rarity."
      >
        <Pixel name={name} />
        <Led name={name} />
        <Rare name={name} />
        <Chroma name={name} />
        <Tilt name={name} />
      </Group>

      <Group
        title="Health and wellness"
        blurb="Calm, clean, a little clinical: soft shapes, one cool colour, and signs of life."
      >
        <Fx name={name} title="Pulse" how="three rings scaling out · staggered delays" tone="fx-pulse">
          {range(3).map((i) => (
            <span key={i} className="fx-ring" style={cssVars({ '--i': i })} />
          ))}
          <span className="fx-badge">
            <Glyph name={name} size={72} />
          </span>
        </Fx>
        <Fx
          name={name}
          title="Monitor trace"
          how="--icon-dash: 14 34 · a bright dash running the path"
          tone="fx-monitor fx-stack"
        >
          <Glyph name={name} size={150} className="fx-trail" />
          <Glyph name={name} size={150} className="fx-tracer" />
        </Fx>
        <Fx name={name} title="Soft UI" how="a raised plate: one light, one dark shadow" tone="fx-neu">
          <span className="fx-plate">
            <Glyph name={name} size={84} />
          </span>
        </Fx>
        <Breathing name={name} />
      </Group>

      <Group
        title="Food and hospitality"
        blurb="Hand-made signs: chalk on a board, ink from a stamp, stripes on a pole."
      >
        <Fx
          name={name}
          title="Chalkboard"
          how="feTurbulence displacement · speckled alpha · a dust halo"
          tone="fx-chalkboard fx-stack"
        >
          <Glyph name={name} size={150} className="fx-dust" />
          <Glyph name={name} size={150} className="fx-chalk" />
        </Fx>
        <Fx
          name={name}
          title="Rubber stamp"
          how="double ring · noise takes specks out · multiply"
          tone="fx-stamp-stage"
        >
          <span className="fx-stamp">
            <Glyph name={name} size={108} />
          </span>
        </Fx>
        <Masked
          name={name}
          title="Barber pole"
          how="mask over moving diagonal stripes"
          tone="fx-barber-stage"
          ink="fx-barber"
          thicker={2}
        />
      </Group>

      <Group title="Kids and education" blurb="Wobbly, bright, tactile: made by a hand, or blown up like a toy.">
        <Fx
          name={name}
          title="Crayon"
          how="low-frequency wobble · waxy grain · two passes"
          tone="fx-crayon-stage fx-stack"
        >
          <Glyph name={name} size={150} className="fx-wax-b" />
          <Glyph name={name} size={150} className="fx-wax-a" />
        </Fx>
        <Drawn name={name} />
        <Kaleidoscope name={name} />
        <Fx name={name} title="Balloon" how="a fat stroke · the lit-tube filter · a gentle float" tone="fx-balloon">
          <Glyph name={name} size={150} depth="tube shadow" />
        </Fx>
        <Fx name={name} title="Colourways" how="four copies · four palettes · rounded tiles" tone="fx-tiles">
          {range(4).map((i) => (
            <span key={i} className="fx-quad" style={cssVars({ '--i': i })}>
              <Glyph name={name} size={74} />
            </span>
          ))}
        </Fx>
      </Group>

      <Group
        title="Sport and fitness"
        blurb="Speed and heat: italic lean, trailing ghosts, gradients that burn, club badges."
      >
        <Fx name={name} title="Speed" how="skewX · four fading ghosts · lines sliding past" tone="fx-speed fx-stack">
          {range(5)
            .reverse()
            .map((i) => (
              <span key={i} className="fx-ghost" style={cssVars({ '--i': i })}>
                <Glyph name={name} size={130} />
              </span>
            ))}
        </Fx>
        <Masked
          name={name}
          title="Heat map"
          how="mask over a gradient rising through the icon"
          tone="fx-heat-stage"
          ink="fx-heat"
          thicker={2}
        />
        <Fx name={name} title="Club patch" how="satin thread over felt · a stitched edge" tone="fx-patch">
          <span className="fx-felt">
            <Glyph name={name} size={96} className="fx-sat" />
            <Glyph name={name} size={96} className="fx-hi" />
          </span>
        </Fx>
        <Stitched name={name} />
      </Group>

      <Group title="Developer tools" blurb="Text and signal: characters on a grid, data falling, a prompt waiting.">
        <Ascii name={name} />
        <Masked
          name={name}
          title="Digital rain"
          how="mask ∩ columns over falling gradients"
          tone="fx-rain-stage"
          ink="fx-rain"
          thicker={2.2}
        />
      </Group>

      <Group
        title="Architecture and engineering"
        blurb="Precision on paper, then the block it describes, then the tape that fences it off."
      >
        <Slab name={name} />
        <Blueprint name={name} />
        <Fx name={name} title="Technical drawing" how="a thin line · red dimension lines and ticks" tone="fx-tech">
          <Glyph name={name} size={130} />
          <svg viewBox="0 0 230 230" className="fx-dims" aria-hidden="true">
            <path d="M52 204h126M52 198v12M178 198v12" />
            <path d="M206 52v126M200 52h12M200 178h12" />
            <path d="M115 22v22M22 115h22" className="dash" />
            <text x="115" y="196" textAnchor="middle">
              24
            </text>
            <text x="198" y="118" textAnchor="middle" transform="rotate(90 198 118)">
              24
            </text>
          </svg>
        </Fx>
        <Fx name={name} title="Isometric block" how="rotateX · rotateZ · 12 layers on translateZ" tone="fx-iso">
          <div className="fx-iso-turn">
            {range(12).map((i) => (
              <span key={i} className="fx-iso-layer" style={cssVars({ '--i': i })}>
                <Glyph name={name} size={150} />
              </span>
            ))}
          </div>
        </Fx>
        <Masked
          name={name}
          title="Hazard tape"
          how="mask over 45° yellow and black stripes"
          tone="fx-hazard-stage"
          ink="fx-hazard"
          thicker={2.1}
        />
      </Group>

      <Group
        title="Fashion and street"
        blurb="Print mistakes made on purpose: misregistered inks, halftone dots, spray."
      >
        <Contours name={name} />
        <Sticker name={name} />
        <Fx
          name={name}
          title="Risograph"
          how="two inks · multiply · 5 px off register · a dot screen"
          tone="fx-riso fx-stack"
        >
          <Glyph name={name} size={150} className="fx-pink" />
          <Glyph name={name} size={150} className="fx-blue-ink" />
        </Fx>
        <Masked
          name={name}
          title="Halftone"
          how="mask over a radial-gradient dot screen"
          tone="fx-half-stage"
          ink="fx-half"
          thicker={2.3}
        />
        <Fx
          name={name}
          title="Spray paint"
          how="blur · speckle alpha · an overspray copy"
          tone="fx-spray-stage fx-stack"
        >
          <Glyph name={name} size={150} className="fx-over" />
          <Glyph name={name} size={150} className="fx-paint" />
        </Fx>
      </Group>

      <Group
        title="Music and nightlife"
        blurb="Sound and light made visible: meters that dance, records that spin, signs that buzz."
      >
        <Neon name={name} />
        <Echo name={name} />
        <Fx name={name} title="Equalizer" how="mask over bars · clip-path inset · delays by --i" tone="fx-eq-stage">
          <EqualizerInk name={name} />
        </Fx>
        <Fx
          name={name}
          title="Record label"
          how="repeating-radial-gradient grooves · a conic shine · spin"
          tone="fx-vinyl-stage"
        >
          <div className="fx-vinyl">
            <span className="fx-label-disc">
              <Glyph name={name} size={60} />
            </span>
          </div>
        </Fx>
      </Group>

      <Group
        title="Travel and nature"
        blurb="Paper, ink and water: stamps in a passport, paint that bleeds, pencil, contour lines."
      >
        <Dotted name={name} />
        <Fx
          name={name}
          title="Passport stamp"
          how="a double ring · displaced and speckled ink · tilted"
          tone="fx-passport"
        >
          <span className="fx-visa">
            <Glyph name={name} size={96} />
            <span className="fx-date">12 · 03 · 24</span>
          </span>
        </Fx>
        <Fx
          name={name}
          title="Watercolour"
          how="three washes · low-frequency displacement · multiply"
          tone="fx-wash-stage fx-stack"
        >
          <Glyph name={name} size={150} className="fx-wash-a" />
          <Glyph name={name} size={150} className="fx-wash-b" />
          <Glyph name={name} size={150} className="fx-wash-c" />
        </Fx>
        <Fx
          name={name}
          title="Pencil sketch"
          how="two passes with different noise seeds · a faint grid"
          tone="fx-pencil fx-stack"
        >
          <Glyph name={name} size={150} className="fx-pen-a" />
          <Glyph name={name} size={150} className="fx-pen-b" />
        </Fx>
        <Fx
          name={name}
          title="Topographic"
          how="ten copies scaled outward · thin strokes · brown to green"
          tone="fx-topo fx-stack"
        >
          {range(10)
            .reverse()
            .map((i) => (
              <span key={i} className="fx-contour-ring" style={cssVars({ '--i': i })}>
                <Glyph name={name} size={112} />
              </span>
            ))}
        </Fx>
      </Group>

      <Group title="Space and sci-fi" blurb="Points of light and speed: a night sky, and the jump to hyperspace.">
        <Hologram name={name} />
        <Stars name={name} />
        <Fx name={name} title="Warp" how="repeating-conic-gradient streaks · a radial mask · scale loop" tone="fx-warp">
          <span className="fx-warp-core">
            <Glyph name={name} size={100} />
          </span>
        </Fx>
      </Group>

      <Group title="Safety and automotive" blurb="Made to be seen at night, and made to look expensive at speed.">
        <Torch name={name} />
        <Masked
          name={name}
          title="Chrome emblem"
          how="mask over a sliding chrome gradient · carbon weave"
          tone="fx-carbon"
          ink="fx-chrome"
          thicker={1.9}
        />
        <Fx
          name={name}
          title="Backlit dashboard"
          how="--icon-dash: 2.2 0.35 · butt caps · glow behind glass"
          tone="fx-lcd fx-stack"
        >
          <Glyph name={name} size={150} className="fx-unlit" />
          <Glyph name={name} size={150} className="fx-segments" />
        </Fx>
      </Group>

      <Group title="Beauty" blurb="Soft metals, sparkle and liquid.">
        <Masked
          name={name}
          title="Rose gold"
          how="mask over a rose-gold gradient · four-point sparkles"
          tone="fx-rose-stage"
          ink="fx-rose"
          thicker={1.8}
        >
          {range(5).map((i) => (
            <i key={i} className="fx-sparkle" style={cssVars({ '--i': i })} />
          ))}
        </Masked>
        <Goo name={name} />
      </Group>
    </>
  )
}

function EqualizerInk({ name }: { name: string }) {
  const mask = useMask(name, 2.2)
  return (
    <span className="fx-eq" style={cssVars({ '--m': mask })}>
      {range(16).map((i) => (
        <i key={i} style={cssVars({ '--i': i })} />
      ))}
    </span>
  )
}
