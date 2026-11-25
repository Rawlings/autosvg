import { readdirSync, readFileSync } from 'node:fs'
import { createRegistry, type IconSource, nameOfFile } from './registry.ts'

export type { IconSource }

// The Node entry (scripts and tests): the same set as the browser one, read from the svg folder.
const dir = new URL('../svg/', import.meta.url)

const registry = createRegistry(
  readdirSync(dir)
    .filter((file) => file.endsWith('.svg'))
    .map((file): IconSource => ({ name: nameOfFile(file), svg: readFileSync(new URL(file, dir), 'utf8').trim() })),
)

export const ICONS = registry.all
export const getIcon = registry.get
export const registerIcon = registry.register
export const onIconChange = registry.onChange
