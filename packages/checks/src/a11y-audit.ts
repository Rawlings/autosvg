// Accessibility audit: how vectors are used in a page, checked on the live DOM.
//
//   decorative   every <autosvg> is hidden from assistive technology, or is a labelled image
//   names        every control that holds a vector has an accessible name (text, aria-label, aria-labelledby or title)
//   swap         the vectors inside an .autosvg-swap are hidden (the control carries the name and state)
//   state        a switch, checkbox or radio says whether it is on (aria-checked); a radiogroup is named and has exactly one stop in the tab order
//   size         every control is at least 24 by 24 CSS pixels (WCAG 2.2, target size minimum)
//   motion       the page's CSS turns vector transitions and animations off under prefers-reduced-motion
//
// It audits any root: pass a container, or nothing for the whole document.
const CONTROL =
  'button, a[href], [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], summary, input[type="checkbox"], input[type="radio"]'

/** The accessible name of an element: aria-label, aria-labelledby, its own text without vectors, or its title. */
const nameOf = (el: Element): string => {
  const label = el.getAttribute('aria-label')?.trim()
  if (label) return label
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const t = by
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (t) return t
  }
  const clone = el.cloneNode(true) as Element
  for (const n of clone.querySelectorAll('autosvg, svg, [aria-hidden="true"]')) n.remove()
  const text = (clone.textContent ?? '').trim()
  if (text) return text
  return el.getAttribute('title')?.trim() ?? ''
}

const describe = (el: Element): string =>
  `<${el.localName}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}>`

/** True if the page's stylesheets switch vector motion off for people who ask for reduced motion. */
function reducedMotionHandled(): boolean {
  let found = false
  const visit = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule && /prefers-reduced-motion:\s*reduce/.test(rule.media.mediaText)) {
        if (/transition(-duration)?:\s*(none|1ms|0s)/.test(rule.cssText) || /animation:\s*none/.test(rule.cssText))
          found = true
      }
      if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList) visit(rule.cssRules)
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {
      /* a cross-origin sheet cannot be read */
    }
  }
  return found
}

/** What the audit counted. */
export interface A11yStats {
  vectors: number
  decorative: number
  labelled: number
  controls: number
  tooSmall: number
  reducedMotion: boolean
}

export interface A11yReport {
  ok: boolean
  flagged: string[]
  stats: A11yStats
}

export function a11yAudit(root: ParentNode = document): A11yReport {
  const flagged: string[] = []
  const glyphs = [...root.querySelectorAll('autosvg')]
  let decorative = 0
  let labelled = 0
  for (const g of glyphs) {
    const hidden = g.getAttribute('aria-hidden') === 'true' || g.closest('[aria-hidden="true"]') !== null
    const image = g.getAttribute('role') === 'img' && !!g.getAttribute('aria-label')
    if (hidden) decorative++
    else if (image) labelled++
    else
      flagged.push(
        `${describe(g)} name="${g.getAttribute('name')}" is neither hidden (aria-hidden) nor a labelled image (role="img" + aria-label)`,
      )
  }

  const controls = [...root.querySelectorAll(CONTROL)].filter((c) => c.querySelector('autosvg'))
  let tooSmall = 0
  for (const c of controls) {
    if (!nameOf(c)) flagged.push(`${describe(c)} holds a vector but has no accessible name`)
    const r = c.getBoundingClientRect()
    if (r.width && (r.width < 24 || r.height < 24)) {
      tooSmall++
      flagged.push(
        `${describe(c)} is ${Math.round(r.width)}×${Math.round(r.height)}px, under the 24×24px minimum target`,
      )
    }
  }
  for (const c of root.querySelectorAll('[role="switch"], [role="checkbox"], [role="radio"]')) {
    if (!c.hasAttribute('aria-checked'))
      flagged.push(`${describe(c)} has role="${c.getAttribute('role')}" but no aria-checked`)
  }
  for (const g of root.querySelectorAll('[role="radiogroup"]')) {
    if (!nameOf(g)) flagged.push(`${describe(g)} is a radiogroup without a name`)
    const custom = [...g.querySelectorAll<HTMLElement>('[role="radio"]')] // native <input type="radio"> manages its own tab stop
    const stops = custom.filter((r) => r.tabIndex >= 0).length
    if (custom.length && stops !== 1)
      flagged.push(`${describe(g)} has ${stops} radios in the tab order, it should have exactly 1 (roving tabindex)`)
  }
  for (const s of root.querySelectorAll('.autosvg-swap')) {
    if (s.getAttribute('aria-hidden') !== 'true')
      flagged.push('an .autosvg-swap is not aria-hidden: the control around it should carry the name and state')
  }
  const motion = reducedMotionHandled()
  if (!motion) flagged.push('no prefers-reduced-motion rule turns vector transitions or animations off')

  return {
    ok: flagged.length === 0,
    flagged,
    stats: { vectors: glyphs.length, decorative, labelled, controls: controls.length, tooSmall, reducedMotion: motion },
  }
}
