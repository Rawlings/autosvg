import { api } from '../engine.js'
import { DEFAULT_STYLE } from '../spec.js'

const same = (a, b) => Object.keys(DEFAULT_STYLE).every((k) => a[k] === b[k])

function Slider({ label, value, min, max, step, onChange }) {
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

function Choice({ label, value, options, onChange }) {
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

/** The brand levers. They only preview: the icon files never change. */
export function Appearance({ style }) {
  const set = (patch) => api.setStyle(patch)
  return (
    <div className="stack">
      <Slider label="Stroke" value={style.stroke} min={0.75} max={3} step={0.25} onChange={(v) => set({ stroke: v })} />
      <Slider label="Corner radius" value={style.radius} min={0} max={2.5} step={0.25} onChange={(v) => set({ radius: v })} />
      <Slider label="Curve" value={style.curve} min={0} max={1} step={0.1} onChange={(v) => set({ curve: v })} />
      <Choice label="Caps" value={style.cap} options={['round', 'square', 'butt']} onChange={(cap) => set({ cap })} />
      <Choice label="Joins" value={style.join} options={['round', 'miter']} onChange={(join) => set({ join })} />
      <div className="field-foot">
        <span className="muted">A preview. Files are never changed.</span>
        <button type="button" className="text-btn" disabled={same(style, DEFAULT_STYLE)} onClick={() => api.resetStyle()}>
          Reset
        </button>
      </div>
    </div>
  )
}
