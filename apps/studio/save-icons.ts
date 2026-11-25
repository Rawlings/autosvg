import { writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const iconsDir = new URL('../../packages/icons/svg/', import.meta.url)

/** What the canvas sends: the icon's name and its drawing. */
interface SaveRequest {
  name: string
  svg: string
}

function reply(res: ServerResponse, code: number, body: { ok: boolean; name?: string; error?: string }): void {
  res.statusCode = code
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

/** The one request body this endpoint accepts, or a thrown error that says what is wrong with it. */
function parseRequest(body: string): SaveRequest {
  const { name, svg } = JSON.parse(body) as Partial<SaveRequest>
  if (typeof name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error('name must be kebab-case')
  if (typeof svg !== 'string' || !svg.trim().startsWith('<svg') || /<script|\son\w+=/i.test(svg)) {
    throw new Error('not a plain SVG')
  }
  return { name, svg }
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'POST') {
    reply(res, 405, { ok: false, error: 'POST only' })
    return
  }
  // the dev server can be reached from the local network (to look at it on a phone); only this machine may write files
  if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress ?? '')) {
    reply(res, 403, { ok: false, error: 'saving is only allowed from this machine' })
    return
  }
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) {
    reply(res, 403, { ok: false, error: 'cross-origin' })
    return
  }
  let body = ''
  req.on('data', (chunk: Buffer) => {
    body += chunk
    if (body.length > 100_000) req.destroy()
  })
  req.on('end', () => {
    try {
      const { name, svg } = parseRequest(body)
      writeFileSync(fileURLToPath(new URL(`${name}.svg`, iconsDir)), `${svg.trim()}\n`)
      reply(res, 200, { ok: true, name })
    } catch (e) {
      reply(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
}

/**
 * Dev-server only: lets the canvas save an icon straight to packages/icons/svg/<name>.svg.
 * Local use: same-origin requests only, kebab-case names only, SVG only.
 */
export function saveIcons(): Plugin {
  return {
    name: 'save-icons',
    configureServer(server) {
      server.middlewares.use('/__save-icon', handle)
    },
  }
}
