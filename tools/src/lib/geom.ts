// Evaluates a geometry expression with Paper.js tools in scope. Shared by `pnpm geom` and the MCP server.
import * as pp from '@autosvg/checks/paper'
import * as geo from '@autosvg/core/geo'
import * as kit from '@autosvg/core/kit'

/** The result printed for pasting: markup becomes one `path('…'),` per line, anything else as text. */
export function evalGeom(expression: string): string {
  const run = new Function('pp', 'geo', 'kit', `return (${expression})`) as (
    pp: unknown,
    geo: unknown,
    kit: unknown,
  ) => unknown
  const result = run(pp, geo, kit)
  if (typeof result === 'string' && result.includes('<')) {
    return result
      .split('\n')
      .map((shape) => {
        const d = /^<path d="([^"]*)" \/>$/.exec(shape.trim())?.[1]
        return d === undefined ? shape : `path('${d}'),`
      })
      .join('\n')
  }
  return typeof result === 'string' ? result : JSON.stringify(result)
}
