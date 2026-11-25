/** One vector of the set. */
export interface VectorSource {
  /** The file name without `.svg`: `bell`, `arrow`. (`arrow-left` is the arrow in a state, not a file.) */
  readonly name: string
  /** The saved file, trimmed. */
  readonly svg: string
}

const byName = (a: VectorSource, b: VectorSource): number => a.name.localeCompare(b.name)

/** The vector name a file path stands for: `/x/y/bell.svg` is `bell`. */
export function nameOfFile(path: string): string {
  const name = /([^/\\]+)\.svg$/.exec(path)?.[1]
  if (name === undefined) throw new Error(`not a vector file: ${path}`)
  return name
}

/**
 * The set of vectors, sorted by name, that can change while the page runs (the studio saves and adds vectors).
 * Whoever draws from it listens with `onChange` to throw away what it cached.
 */
export function createRegistry(initial: readonly VectorSource[]) {
  const list: VectorSource[] = [...initial].sort(byName)
  const index = new Map(list.map((vector) => [vector.name, vector]))
  const listeners = new Set<() => void>()

  return {
    /** Every vector, sorted by name. The same array for the life of the page; it changes only through `register`. */
    all: list as readonly VectorSource[],

    get: (name: string): VectorSource | undefined => index.get(name),

    /** Add a vector, or replace its drawing. Listeners are told. */
    register(vector: VectorSource): void {
      const at = list.findIndex((i) => i.name === vector.name)
      if (at >= 0) list[at] = vector
      else list.push(vector)
      list.sort(byName)
      index.set(vector.name, vector)
      for (const listener of listeners) listener()
    },

    /** Be told when `register` changes the set. Returns the way to stop. */
    onChange(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
