// Static analysis: which brand settings should this icon respond to?
//
//   radius  applies to rounded corners: a rect with rx, or a small circular arc that joins a straight line
//   curve   applies to circles (not the tiny dots)
//
// The coverage check compares this with what the icon actually does when the settings change, so an
// icon that has corners or circles but no recipe is caught instead of silently ignoring them.

/**
 * Icons whose arcs are not corners and whose circles are not circles to reshape. Exempt on purpose and
 * listed in the coverage result, so the exception is visible and has a reason.
 */
export const EXEMPT = {
  cloud: 'built from overlapping lobes, not corners',
  link: 'chain lobes, not corners',
  phone: 'a sculpted handset: its curves are the shape, not corners to round',
  pill: 'a capsule: its ends are half-circles of its width, not corners to round',
  palette: 'organic outline; its dots are not circles to reshape',
}

const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

/** Path data as absolute segments: { type: 'move' | 'line' | 'arc' | 'curve', r?, to }. */
export function parsePath(d) {
  const segs = []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  for (const [, cmd, rest] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const up = cmd.toUpperCase()
    const rel = cmd !== up
    const nums = (rest.match(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) || []).map(Number)
    if (up === 'Z') {
      segs.push({ type: 'line', to: [sx, sy] }) // closing edge is a straight line
      x = sx
      y = sy
      continue
    }
    const n = ARITY[up]
    for (let i = 0, first = true; i + n <= nums.length; i += n, first = false) {
      const a = nums.slice(i, i + n)
      const ox = rel ? x : 0
      const oy = rel ? y : 0
      if (up === 'M') {
        x = a[0] + ox
        y = a[1] + oy
        if (first) {
          sx = x
          sy = y
          segs.push({ type: 'move', to: [x, y] })
        } else segs.push({ type: 'line', to: [x, y] }) // extra pairs after M are lines
      } else if (up === 'L') {
        x = a[0] + ox
        y = a[1] + oy
        segs.push({ type: 'line', to: [x, y] })
      } else if (up === 'H') {
        x = a[0] + (rel ? x : 0)
        segs.push({ type: 'line', to: [x, y] })
      } else if (up === 'V') {
        y = a[0] + (rel ? y : 0)
        segs.push({ type: 'line', to: [x, y] })
      } else if (up === 'A') {
        x = a[5] + ox
        y = a[6] + oy
        segs.push({ type: 'arc', rx: a[0], ry: a[1], to: [x, y] })
      } else {
        // C S Q T: a curve ending at the last pair
        x = a[n - 2] + ox
        y = a[n - 1] + oy
        segs.push({ type: 'curve', to: [x, y] })
      }
    }
  }
  return segs
}

/** What an icon has that radius and curve should act on. */
export function features(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  // circles under radius 2 are details (a dot, an eyelet), too small for a squircle to differ; keep in step with recipes.js
  const circles = [...doc.querySelectorAll('circle')].filter((c) => parseFloat(c.getAttribute('r')) >= 2).length
  let corners = [...doc.querySelectorAll('rect')].filter((r) => parseFloat(r.getAttribute('rx')) > 0).length
  for (const p of doc.querySelectorAll('path')) {
    const segs = parsePath(p.getAttribute('d') || '')
    segs.forEach((s, i) => {
      if (s.type !== 'arc' || s.rx > 4.5 || Math.abs(s.rx - s.ry) > 0.01) return
      // a corner arc sits next to a straight edge; a dome or a link lobe does not
      if (segs[i - 1]?.type === 'line' || segs[i + 1]?.type === 'line') corners++
    })
  }
  return { circles, corners }
}
