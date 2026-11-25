// Fails when the categories and the vector files disagree: a vector with no category, a category naming a file that
// does not exist, a name in two categories, or a name that is a state (mic-off) instead of a base vector.
import { CATEGORIES, listedNames, VECTORS } from '@autosvg/vectors'

const files = new Set(VECTORS.map((v) => v.name))
const { names, duplicates } = listedNames()
const listed = new Set(names)

const missing = [...files].filter((n) => !listed.has(n))
const unknown = names.filter((n) => !files.has(n))
const unsorted = CATEGORIES.filter((c) => c.members.join(' ') !== [...c.members].sort().join(' ')).map((c) => c.id)

const problems: string[] = []
if (missing.length) problems.push(`no category: ${missing.join(', ')}`)
if (unknown.length) problems.push(`not a vector file: ${unknown.join(', ')}`)
if (duplicates.length) problems.push(`in two categories: ${duplicates.join(', ')}`)
if (unsorted.length) problems.push(`not sorted: ${unsorted.join(', ')}`)

if (problems.length) {
  console.error(`categories: ${problems.join('\n            ')}`)
  process.exit(1)
}
console.log(`${files.size} vectors in ${CATEGORIES.length} categories, each in exactly one`)
