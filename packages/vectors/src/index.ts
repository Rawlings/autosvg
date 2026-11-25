import { createRegistry, nameOfFile, type VectorSource } from './registry.ts'

export type { VectorSource }

// The browser entry: every file in ../svg/*.svg is one vector, bundled by Vite. (Node reads the folder instead: see node.ts.)
const files = import.meta.glob<string>('../svg/*.svg', { query: '?raw', import: 'default', eager: true })

const registry = createRegistry(
  Object.entries(files).map(([path, svg]): VectorSource => ({ name: nameOfFile(path), svg: svg.trim() })),
)

/** Every vector of the set, sorted by name. It changes only through {@link registerVector}. */
export const VECTORS = registry.all
export const getVector = registry.get
/** Add a vector, or replace its drawing (the studio does this after saving a file). */
export const registerVector = registry.register
/** Be told when {@link registerVector} changes the set. Returns the way to stop. */
export const onVectorChange = registry.onChange
