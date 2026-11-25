/**
 * Findings the set consistency check reports but that are deliberate, each with its reason. They are listed in the audit result so the
 * exception stays visible. Anything not here that the check flags is a flaw to fix (undo was 3 px off-centre and was one).
 */
export const DELIBERATE: { small: Record<string, string>; centre: Record<string, string> } = {
  small: {
    arrow: 'a mark: a single line and a head',
    check: 'a mark, small by nature',
    chevron: 'a mark, small by nature',
    close: 'a mark, small by nature',
    edit: 'a pencil along the diagonal, shorter than the grid',
    plus: 'a mark, small by nature (and minus is the same icon)',
    skip: 'a bar and a triangle, a compact glyph',
  },
  centre: { play: 'the triangle is centred by its weight, not its extent' },
}
