import { useState } from 'react'
import { CHECKS, type CheckOutcome, type QualityCheck } from './quality/checks.tsx'

export default function Quality() {
  const [results, setResults] = useState<Record<string, CheckOutcome>>({})
  const [running, setRunning] = useState<string | null>(null)

  async function run(check: QualityCheck) {
    setRunning(check.id)
    try {
      const out = await check.run()
      setResults((r) => ({ ...r, [check.id]: out }))
    } catch (e) {
      setResults((r) => ({
        ...r,
        [check.id]: {
          ok: false,
          summary: 'The check failed to run',
          details: [e instanceof Error ? e.message : String(e)],
        },
      }))
    }
    setRunning(null)
  }
  async function runAll() {
    for (const c of CHECKS) await run(c)
  }

  const done = CHECKS.filter((c) => results[c.id])
  const failing = done.filter((c) => !results[c.id]?.ok).length

  return (
    <div className="page quality">
      <div className="page-head">
        <div>
          <h1>Quality</h1>
          <p className="lede">
            Checks that run against the real icons in this page.
            {done.length ? ` ${done.length - failing} of ${done.length} run clean.` : ''}
          </p>
        </div>
        <button type="button" className="btn primary" disabled={!!running} onClick={runAll}>
          {running ? 'Running…' : 'Run all'}
        </button>
      </div>

      <ul className="checklist">
        {CHECKS.map((c) => {
          const r = results[c.id]
          return (
            <li key={c.id} className="check-row" data-status={r ? (r.ok ? 'pass' : 'warn') : 'idle'}>
              <div className="check-main">
                <h2>{c.title}</h2>
                <p className="muted">{c.about}</p>
                {r && (
                  <p className="result">
                    <span className="dot" aria-hidden="true" />
                    {r.summary}
                  </p>
                )}
                {r && r.details.length > 0 && (
                  <details>
                    <summary>
                      {r.details.length} {r.details.length === 1 ? 'finding' : 'findings'}
                    </summary>
                    <ul className="findings">
                      {r.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <button type="button" className="btn" disabled={!!running} onClick={() => run(c)}>
                {running === c.id ? 'Running…' : r ? 'Run again' : 'Run'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
