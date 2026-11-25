/** One icon of the set. */
export interface IconSource {
  /** The file name without `.svg`: `bell`, `arrow`. (`arrow-left` is the arrow in a state, not a file.) */
  readonly name: string
  /** The saved file, trimmed. */
  readonly svg: string
}

const byName = (a: IconSource, b: IconSource): number => a.name.localeCompare(b.name)

/** The icon name a file path stands for: `/x/y/bell.svg` is `bell`. */
export function nameOfFile(path: string): string {
  const name = /([^/\\]+)\.svg$/.exec(path)?.[1]
  if (name === undefined) throw new Error(`not an icon file: ${path}`)
  return name
}

/**
 * The set of icons, sorted by name, that can change while the page runs (the studio saves and adds icons).
 * Whoever draws from it listens with `onChange` to throw away what it cached.
 */
export function createRegistry(initial: readonly IconSource[]) {
  const list: IconSource[] = [...initial].sort(byName)
  const index = new Map(list.map((icon) => [icon.name, icon]))
  const listeners = new Set<() => void>()

  return {
    /** Every icon, sorted by name. The same array for the life of the page; it changes only through `register`. */
    all: list as readonly IconSource[],

    get: (name: string): IconSource | undefined => index.get(name),

    /** Add an icon, or replace its drawing. Listeners are told. */
    register(icon: IconSource): void {
      const at = list.findIndex((i) => i.name === icon.name)
      if (at >= 0) list[at] = icon
      else list.push(icon)
      list.sort(byName)
      index.set(icon.name, icon)
      for (const listener of listeners) listener()
    },

    /** Be told when `register` changes the set. Returns the way to stop. */
    onChange(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
