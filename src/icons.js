// Every file in ./icons/*.svg is one icon; the file name is the icon name.
const files = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default', eager: true })

export const ICONS = Object.entries(files)
  .map(([path, svg]) => ({ name: path.match(/\/([^/]+)\.svg$/)[1], svg: svg.trim() }))
  .sort((a, b) => a.name.localeCompare(b.name))
