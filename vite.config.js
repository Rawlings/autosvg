import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), 'src', 'icons')

// Dev-server only: lets the canvas save an icon straight to src/icons/<name>.svg.
// Local use: same-origin requests only, kebab-case names only, SVG only.
function saveIcons() {
  return {
    name: 'save-icons',
    configureServer(server) {
      server.middlewares.use('/__save-icon', (req, res) => {
        const reply = (code, body) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return reply(405, { ok: false, error: 'POST only' })
        // the dev server can be reached from the local network (to look at it on a phone); only this machine may write files
        if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress ?? '')) return reply(403, { ok: false, error: 'saving is only allowed from this machine' })
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return reply(403, { ok: false, error: 'cross-origin' })
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > 100_000) req.destroy()
        })
        req.on('end', () => {
          try {
            const { name, svg } = JSON.parse(body)
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error('name must be kebab-case')
            if (typeof svg !== 'string' || !svg.trim().startsWith('<svg') || /<script|\son\w+=/i.test(svg)) {
              throw new Error('not a plain SVG')
            }
            writeFileSync(join(iconsDir, `${name}.svg`), svg.trim() + '\n')
            reply(200, { ok: true, name })
          } catch (e) {
            reply(400, { ok: false, error: e.message })
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), saveIcons()],
  server: {
    port: 5173,
    host: true, // listen on the network too, so a phone on the same Wi-Fi can open it. Saving icons stays local-only (see above)
  },
})
