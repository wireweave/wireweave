// Bounded real-browser regression for legacy fixed-board document access.
// No browser download, provider, filesystem authority or canonical app assertion.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { pathToFileURL, URL } from 'node:url'
import { resolve } from 'node:path'

const { values } = parseArgs({
  options: {
    playwright: { type: 'string' },
    executable: { type: 'string' },
    'core-entry': { type: 'string' },
    surface: { type: 'string', default: 'site' },
  },
})
assert(values.playwright, 'Pass --playwright with an already installed Playwright module')
assert(['site', 'document'].includes(values.surface), 'surface must be site or document')
const { parse, renderSite, renderToHtml } = await import(
  values['core-entry']
    ? pathToFileURL(resolve(values['core-entry'])).href
    : new URL('../packages/core/dist/index.js', import.meta.url).href
)
const { chromium } = createRequire(import.meta.url)(resolve(values.playwright))
const browser = await chromium.launch(
  values.executable ? { executablePath: values.executable } : {},
)
const results = []
try {
  for (const shell of values.surface === 'site' ? [false, true] : [false]) {
    const source = `${shell ? 'layout app { header { text "Shell" } slot }' : ''}
page "Review" id=review ${shell ? 'uses=app' : ''} viewport="1280x800" {
  main { title "Review" level=1 col height=620 { text "Public scroll regression" } row { button "Continue" } }
}`
    const html = values.surface === 'site' ? renderSite(parse(source)) : renderToHtml(parse(source))
    const context = await browser.newContext({
      viewport: { width: 800, height: 600 },
      offline: true,
      serviceWorkers: 'block',
    })
    try {
      await context.route('**/*', (route) => route.abort())
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.name))
      await page.setContent(html)
      const read = () =>
        page.locator('.wf-page').evaluate((element) => {
          const box = element.getBoundingClientRect()
          return {
            x: box.x,
            right: box.right,
            width: box.width,
            height: box.height,
            scrollX: globalThis.scrollX,
            viewport: globalThis.innerWidth,
          }
        })
      const narrowStart = await read()
      assert(narrowStart.x >= 0, `${shell ? 'shell' : 'standalone'} leading edge is unreachable`)
      assert.equal(narrowStart.width, 1280)
      assert.equal(narrowStart.height, 800)
      await page.evaluate(() => globalThis.window.scrollTo(10000, 0))
      const narrowEnd = await read()
      assert(narrowEnd.right <= 800.5, 'Trailing edge must be scroll-reachable')
      await page.evaluate(() => globalThis.window.scrollTo(0, 0))
      assert.equal((await read()).x, narrowStart.x)
      const action = page.getByRole('button', { name: 'Continue', exact: true })
      await action.focus()
      assert(
        await action.evaluate((element) => {
          const box = element.getBoundingClientRect()
          return (
            globalThis.document.activeElement === element &&
            box.top >= 0 &&
            box.bottom <= globalThis.innerHeight &&
            box.left >= 0 &&
            box.right <= globalThis.innerWidth
          )
        }),
        'Focused trailing action must remain visible',
      )
      await page.setViewportSize({ width: 1600, height: 1000 })
      await page.evaluate(() => globalThis.window.scrollTo(0, 0))
      const wide = await read()
      assert.equal(wide.width, 1280)
      assert.equal(wide.height, 800)
      assert(Math.abs(wide.x - 160) < 0.5, 'Fitting board must remain centered')
      assert.deepEqual(errors, [])
      results.push({ shell, narrowStart, narrowEnd, wide, focusedActionVisible: true })
    } finally {
      await context.close()
    }
  }
  console.log(
    JSON.stringify({ browser: browser.version(), surface: values.surface, results }, null, 2),
  )
} finally {
  await browser.close()
}
