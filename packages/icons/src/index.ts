import { createRegistry, type IconSource, nameOfFile } from './registry.ts'

export type { IconSource }

// The browser entry: every file in ../svg/*.svg is one icon, bundled by Vite. (Node reads the folder instead: see node.ts.)
const files = import.meta.glob<string>('../svg/*.svg', { query: '?raw', import: 'default', eager: true })

const registry = createRegistry(
  Object.entries(files).map(([path, svg]): IconSource => ({ name: nameOfFile(path), svg: svg.trim() })),
)

/** Every icon of the set, sorted by name. It changes only through {@link registerIcon}. */
export const ICONS = registry.all
export const getIcon = registry.get
/** Add an icon, or replace its drawing (the studio does this after saving a file). */
export const registerIcon = registry.register
/** Be told when {@link registerIcon} changes the set. Returns the way to stop. */
export const onIconChange = registry.onChange
