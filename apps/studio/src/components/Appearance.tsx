import type { Cap, Join, Style } from '@autosvg/core'
import { api } from '@autosvg/engine'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className="field">
      <span className="field-head">
        <span>{label}</span>
        <output>{value}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  )
}

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}

function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field-head">
        <span>{label}</span>
      </span>
      <div className="seg">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

const CAPS: readonly Cap[] = ['round', 'square', 'butt']
const JOINS: readonly Join[] = ['round', 'miter']

/** The style levers (the stroke, corners, caps and joins). Only the Look menu shows them; they only preview, the vector files never change. */
export function Appearance({ style }: { style: Style }) {
  const set = (patch: Partial<Style>) => api.setStyle(patch)
  return (
    <div className="stack">
      <Slider label="Stroke" value={style.stroke} min={0.25} max={3} step={0.05} onChange={(v) => set({ stroke: v })} />
      <Slider
        label="Corner radius"
        value={style.radius}
        min={0}
        max={2.5}
        step={0.25}
        onChange={(v) => set({ radius: v })}
      />
      <Slider label="Curve" value={style.curve} min={0} max={1} step={0.1} onChange={(v) => set({ curve: v })} />
      <Choice label="Caps" value={style.cap} options={CAPS} onChange={(cap) => set({ cap })} />
      <Choice label="Joins" value={style.join} options={JOINS} onChange={(join) => set({ join })} />
    </div>
  )
}
