import { readdirSync, readFileSync } from 'node:fs'
import { createRegistry, nameOfFile, type VectorSource } from './registry.ts'

export type { VectorSource }

// The Node entry (scripts and tests): the same set as the browser one, read from the svg folder.
const dir = new URL('../svg/', import.meta.url)

const registry = createRegistry(
  readdirSync(dir)
    .filter((file) => file.endsWith('.svg'))
    .map((file): VectorSource => ({ name: nameOfFile(file), svg: readFileSync(new URL(file, dir), 'utf8').trim() })),
)

export const VECTORS = registry.all
export const getVector = registry.get
export const registerVector = registry.register
export const onVectorChange = registry.onChange

export * from './categories.ts'
