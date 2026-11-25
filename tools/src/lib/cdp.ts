// A very small Chrome DevTools Protocol client: enough to open a page, run a script in it and take a screenshot.
// No dependency: Node has WebSocket built in, and Chrome prints the port it listens on.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

/** A connection to one page of a headless Chrome. */
export class Page {
  #socket: WebSocket
  #nextId = 1
  #pending = new Map<number, Pending>()

  private constructor(socket: WebSocket) {
    this.#socket = socket
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } }
      if (message.id === undefined) return
      const waiting = this.#pending.get(message.id)
      if (!waiting) return
      this.#pending.delete(message.id)
      if (message.error) waiting.reject(new Error(message.error.message))
      else waiting.resolve(message.result)
    })
  }

  static async connect(url: string): Promise<Page> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)), { once: true })
    })
    return new Page(socket)
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.#nextId++
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, { resolve: (value) => resolve(value as T), reject })
      this.#socket.send(JSON.stringify({ id, method, params }))
    })
  }

  /** Run an expression in the page (it may return a promise) and get its value back as JSON. */
  async evaluate<T>(expression: string): Promise<T> {
    const { result, exceptionDetails } = await this.send<{
      result: { value?: T }
      exceptionDetails?: { text: string; exception?: { description?: string } }
    }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value as T
  }

  async navigate(url: string): Promise<void> {
    await this.send('Page.enable')
    await this.send('Page.navigate', { url })
  }

  /** Wait until `condition` (an expression) is true in the page. */
  async waitFor(condition: string, timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        if (await this.evaluate<boolean>(condition)) return
      } catch {
        // the page is still loading
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`timed out waiting for ${condition}`)
  }

  /** The whole page as a PNG, at 2x. */
  async screenshot(width: number): Promise<Buffer> {
    const height = await this.evaluate<number>(
      "Math.ceil((document.querySelector('.grid')?.getBoundingClientRect().bottom ?? document.documentElement.scrollHeight) + 14)",
    )
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false })
    const { data } = await this.send<{ data: string }>('Page.captureScreenshot', { format: 'png' })
    return Buffer.from(data, 'base64')
  }

  close(): void {
    this.#socket.close()
  }
}

/** A headless Chrome that is stopped (and its profile removed) by `stop`. */
export interface Browser {
  page: Page
  stop: () => Promise<void>
}

export async function launchChrome(): Promise<Browser> {
  const binary = process.env['CHROME_PATH'] ?? CHROME_PATHS.find((path) => existsSync(path))
  if (!binary) throw new Error('Chrome not found: set CHROME_PATH')
  const profile = mkdtempSync(join(tmpdir(), 'icon-chrome-'))
  const child: ChildProcess = spawn(
    binary,
    ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const stop = async (): Promise<void> => {
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))
    child.kill()
    await exited
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
  try {
    const port = await new Promise<number>((resolve, reject) => {
      let log = ''
      child.stderr?.on('data', (chunk: Buffer) => {
        log += chunk.toString()
        const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(log)
        if (match?.[1]) resolve(Number(match[1]))
      })
      child.once('exit', () => reject(new Error(`Chrome exited early:\n${log}`)))
      setTimeout(() => reject(new Error('Chrome did not start in 15 s')), 15_000)
    })
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string
      webSocketDebuggerUrl: string
    }[]
    const target = targets.find((t) => t.type === 'page')
    if (!target) throw new Error('Chrome has no page to drive')
    return { page: await Page.connect(target.webSocketDebuggerUrl), stop }
  } catch (error) {
    await stop()
    throw error
  }
}
