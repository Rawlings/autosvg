// Takes a close-up of one element of a page in headless Chrome, at any pixel density, optionally after running a bit of script.
//
//   pnpm shot <url> <selector> <out.png> [scale=3] [script]
//
// For looking at CSS (shadows, filters, 3D) at a size the in-app screenshot cannot show.
import { writeFileSync } from 'node:fs'
import { launchChrome } from './lib/cdp.ts'

const [url, selector, out, scale = '3', before = ''] = process.argv.slice(2)
const b = await launchChrome()
try {
  await b.page.send('Emulation.setDeviceMetricsOverride', {
    width: 1100,
    height: 1400,
    deviceScaleFactor: Number(scale),
    mobile: false,
  })
  await b.page.navigate(url as string)
  await b.page.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`)
  if (before) await b.page.evaluate(before)
  await new Promise((r) => setTimeout(r, 800))
  const rect = await b.page.evaluate<{ x: number; y: number; width: number; height: number }>(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView(); const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height } })()`,
  )
  const { data } = await b.page.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    clip: { ...rect, scale: 1 },
  })
  writeFileSync(out as string, Buffer.from(data, 'base64'))
  console.log('saved', out, JSON.stringify(rect))
} finally {
  await b.stop()
}
