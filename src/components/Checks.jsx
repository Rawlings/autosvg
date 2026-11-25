const MARK = { pass: 'Pass', warn: 'Warning', fail: 'Fail' }

function Row({ r }) {
  return (
    <li data-status={r.status}>
      <span className="dot" role="img" aria-label={MARK[r.status]} />
      <span>
        <span className="check-label">{r.label}</span>
        {r.status !== 'pass' && r.detail && <span className="check-detail">{r.detail}</span>}
      </span>
    </li>
  )
}

/** Findings first; passing checks are one quiet line that opens on demand. */
export function Checks({ rows, info }) {
  if (!rows.length) return <p className="muted">Nothing on the canvas yet.</p>
  const open = rows.filter((r) => r.status !== 'pass')
  const passing = rows.filter((r) => r.status === 'pass')
  return (
    <div className="stack tight">
      {open.length > 0 && (
        <ul className="checks">
          {open.map((r, i) => (
            <Row key={i} r={r} />
          ))}
        </ul>
      )}
      {passing.length > 0 && (
        <details className="passing">
          <summary>
            {open.length ? `${passing.length} passing` : `All ${passing.length} checks pass`}
          </summary>
          <ul className="checks">
            {passing.map((r, i) => (
              <Row key={i} r={r} />
            ))}
          </ul>
        </details>
      )}
      {info && <p className="muted small">{info}</p>}
    </div>
  )
}
