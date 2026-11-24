import { renderLocalPagePreview } from '../packages/core/dist/index.js'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
const { values } = parseArgs({
  options: {
    playwright: { type: 'string' },
    executable: { type: 'string' },
    report: { type: 'string' },
  },
})
if (!values.playwright)
  throw new Error('Pass --playwright with an already installed Playwright entry')
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const { chromium } = createRequire(import.meta.url)(resolve(values.playwright))
const browser = await chromium.launch({
  ...(values.executable ? { executablePath: values.executable } : {}),
  headless: true,
})
const results = []
try {
  for (const [width, height, long] of [
    [800, 600, false],
    [1280, 800, false],
    [800, 600, true],
  ]) {
    const source = `page "Review" viewport="1280x800" { main { col gap=4 { title "Review draft" level=1 text "Local preview only" } textarea "Draft" value="Initial draft" row { button "Unavailable review" w=160 opens=review disabled button "Review" w=160 opens=review disabled=false } col h=620 { text "Public scroll content" } modal "Review draft" id=review w=480 { input "Review note" value="Initial note" ${long ? 'col h=700 { text "Long local content" }' : ''} row { button "Unavailable cancel" w=120 action=close disabled button "Cancel" w=120 action=close disabled=false } } } }`
    const result = renderLocalPagePreview(source)
    assert(result.ok, JSON.stringify(result))
    const p = await browser.newPage({ viewport: { width, height } })
    const requests = [],
      errors = [],
      popups = []
    p.on('request', (r) => requests.push(r.url()))
    p.on('pageerror', (e) => errors.push(e.message))
    p.on('popup', () => popups.push(true))
    await p.setContent(
      '<!doctype html><body style="margin:0"><div id="host-marker" hidden>unchanged</div></body>',
    )
    await p.evaluate((html) => {
      const frame = globalThis.document.createElement('iframe')
      frame.setAttribute('sandbox', 'allow-scripts')
      frame.style = 'width:100vw;height:100vh;border:0;display:block'
      frame.srcdoc = html
      globalThis.document.body.append(frame)
    }, result.html)
    const frame = await p.locator('iframe').elementHandle()
    const f = await frame.contentFrame()
    await f.waitForSelector('dialog', { state: 'attached' })
    const measure = () =>
      f.locator('.wf-page').evaluate((e) => {
        const b = e.getBoundingClientRect()
        return {
          x: b.x,
          right: b.right,
          w: b.width,
          h: b.height,
          scrollX: globalThis.scrollX,
          scrollY: globalThis.scrollY,
          viewport: globalThis.innerWidth,
        }
      })
    const start = await measure()
    assert(start.x >= 0)
    assert.equal(start.w, 1280)
    assert.equal(start.h, 800)
    await f.evaluate(() => globalThis.window.scrollTo(100000, 0))
    const edge = await measure()
    assert(edge.right <= width + 0.5)
    await f.getByRole('textbox', { name: 'Draft', exact: true }).fill('Edited, not saved')
    assert(await f.getByRole('button', { name: 'Unavailable review', exact: true }).isDisabled())
    const opener = f.getByRole('button', { name: 'Review', exact: true })
    await opener.focus()
    await p.keyboard.press('Enter')
    const dialog = f.getByRole('dialog', { name: 'Review draft', exact: true })
    await dialog.waitFor({ state: 'visible' })
    assert(await f.getByRole('button', { name: 'Unavailable cancel', exact: true }).isDisabled())
    const note = f.getByRole('textbox', { name: 'Review note', exact: true })
    assert(await note.evaluate((e) => e === globalThis.document.activeElement))
    await note.fill('Local edit')
    await p.keyboard.press('Shift+Tab')
    const cancel = f.getByRole('button', { name: 'Cancel', exact: true })
    assert(await cancel.evaluate((e) => e === globalThis.document.activeElement))
    await p.keyboard.press('Tab')
    assert(await note.evaluate((e) => e === globalThis.document.activeElement))
    await p.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert(await opener.evaluate((e) => e === globalThis.document.activeElement))
    assert.equal(
      await f.getByRole('textbox', { name: 'Draft', exact: true }).inputValue(),
      'Edited, not saved',
    )
    await opener.click()
    await cancel.focus()
    const bounds = await cancel.evaluate((e) => {
      const b = e.getBoundingClientRect(),
        d = e.closest('dialog').getBoundingClientRect()
      return {
        bottom: b.bottom,
        top: b.top,
        dialogBottom: d.bottom,
        visible: b.top >= d.top && b.bottom <= d.bottom && b.bottom <= globalThis.innerHeight,
      }
    })
    assert(bounds.visible, JSON.stringify(bounds))
    await p.keyboard.press('Enter')
    assert(await opener.evaluate((e) => e === globalThis.document.activeElement))
    await opener.click()
    await opener.evaluate((e) => e.remove())
    await p.keyboard.press('Escape')
    assert.equal(await f.evaluate(() => globalThis.document.activeElement.tagName), 'BODY')
    assert.equal(await p.locator('#host-marker').textContent(), 'unchanged')
    assert.equal(p.url(), 'about:blank')
    assert.equal(p.frames().length, 2)
    assert.deepEqual(requests, [])
    assert.deepEqual(errors, [])
    assert.deepEqual(popups, [])
    await p.locator('iframe').evaluate((e, html) => (e.srcdoc = html), result.html)
    const reset = await frame.contentFrame()
    await reset.waitForSelector('dialog', { state: 'attached' })
    assert.equal(
      await reset.getByRole('textbox', { name: 'Draft', exact: true }).inputValue(),
      'Initial draft',
    )
    assert.equal(await reset.getByRole('dialog').count(), 0)
    results.push({
      width,
      height,
      long,
      start,
      edge,
      bounds,
      runtimeDigest: result.runtimeDigest,
      inputDigest: result.inputDigest,
      htmlDigest: result.htmlDigest,
      requests,
      errors,
      reset: true,
      hostUnchanged: true,
    })
    await p.close()
  }
} finally {
  const report = JSON.stringify(
    {
      browser: browser.version(),
      scope: 'Core built package in opaque sandbox; public fixture, not Studio/native',
      results,
    },
    null,
    2,
  )
  if (values.report) writeFileSync(values.report, report)
  console.log(report)
  await browser.close()
}
