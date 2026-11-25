// Works out geometry with Paper.js in Node and prints it ready to paste into a recipe. For shapes that are awkward by hand:
// a diagonal, a union, a notch cut out of a ring.
//
//   pnpm geom "pp.transform(kit.rect(4, 10, 16, 4, 2), { rotate: [-45] })"
//   pnpm geom "pp.boolean('subtract', kit.round(16, 8, 4.5), kit.rect(15, 2, 8, 6, 0))"
//
// In scope: `pp` (boolean, unite, simplify, centre, transform, analyse), `geo` (the geometry helpers) and `kit` (the shape helpers
// recipes use: path, rect, ellipse, dot). A result that is markup is printed one shape per line; anything else is printed as it is.
import { evalGeom } from './lib/geom.ts'

const expression = process.argv.slice(2).join(' ')
if (!expression)
  throw new Error('give an expression, for example: pnpm geom "pp.transform(kit.path(\'M4 12h16\'), { rotate: [45] })"')
console.log(evalGeom(expression))
