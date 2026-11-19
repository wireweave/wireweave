import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL, URL } from 'node:url'

const require = createRequire(new URL('../packages/core/package.json', import.meta.url))
const { build } = createRequire(require.resolve('tsup'))('esbuild')
const [tarball] = process.argv.slice(2)
assert(tarball, 'Usage: node scripts/verify-packed-core-app.mjs CORE_TARBALL')
const directory = mkdtempSync(join(tmpdir(), 'wireweave-core-app-'))
const url = (path) => pathToFileURL(join(directory, path)).href

try {
  const installed = join(directory, 'node_modules/@wireweave/core')
  mkdirSync(installed, { recursive: true })
  execFileSync('tar', ['-xzf', resolve(tarball), '--strip-components=1', '-C', installed])
  const consumer = join(directory, 'consumer.mjs')
  const imports = `import * as parser from '@wireweave/core/parser'
import * as app from '@wireweave/core/app'`
  const fixture = `
const source = 'app demo entry={namespace=main,id=home} { module main namespace=main { page "Home" id=home { main { text "</script><quoted>" link "Continue" id=next navigate="next" } } page "Next" id=next { main { text "Destination" } } } }'
const parsed = parser.parse(source, {languageVersion:'4.0.0',sourceId:'fixture.wf'})
const module = parsed.modules[0]
const span = parser.getV4SourceSpan(module)
const bundle = app.createAppBundle([parsed], {
  id:parsed.app.id,entry:parsed.app.entry,profile:parsed.app.profile,registry:parsed.registry,
  states:parsed.states,fixtures:parsed.fixtures,moduleSources:{[module.id]:source.slice(span.start,span.end)}
})
if (!bundle.ok) throw new Error(JSON.stringify(bundle.diagnostics))
const result = app.linkAndCompileApp(bundle.value)
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
export const model = bundle.value
export const html = result.value.html
export const runtimeDigest = result.value.manifest.runtimeDigest
`
  writeFileSync(consumer, imports + fixture)
  writeFileSync(
    join(directory, 'cjs-consumer.mjs'),
    `
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const parser=require('@wireweave/core/parser')
const app=require('@wireweave/core/app')
` + fixture,
  )
  await build({
    entryPoints: [consumer],
    outfile: join(directory, 'minified.mjs'),
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2019',
  })
  const esm = await import(url('consumer.mjs'))
  const sha = (value) => createHash('sha256').update(value)
  for (const other of ['cjs-consumer.mjs', 'minified.mjs']) {
    const compiled = await import(url(other))
    assert.equal(
      JSON.stringify(compiled.model),
      JSON.stringify(esm.model),
      other + ' AppBundle differs',
    )
    assert.equal(
      sha(compiled.html).digest('hex'),
      sha(esm.html).digest('hex'),
      other + ' HTML SHA-256 differs',
    )
    assert.equal(compiled.html, esm.html, other + ' HTML bytes differ')
    assert.equal(compiled.runtimeDigest, esm.runtimeDigest)
  }
  const scripts = Array.from(esm.html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gu))
  const inline = scripts.filter((match) => match[1] === '')
  assert.equal(inline.length, 1)
  assert.equal(scripts.length, 5)
  const runtime = inline[0][2]
  assert(esm.html.includes('sha256-' + sha(runtime).digest('base64')))
  assert.equal(esm.runtimeDigest, 'sha256:' + sha(runtime).digest('hex'))
  assert(!esm.html.includes('</script><quoted>'))
  console.log('Packed Core /app: ESM, CJS and minified bundler HTML/CSP bytes match')

  // The release gate is offline. A preinstalled Playwright and Chromium can also exercise the artifact.
  if (process.env.WIREWEAVE_CORE_PLAYWRIGHT) {
    const { chromium } = require(resolve(process.env.WIREWEAVE_CORE_PLAYWRIGHT))
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext({ serviceWorkers: 'block' })
      const page = await context.newPage()
      const errors = [],
        requests = []
      const address = 'http://wireweave-app.invalid/'
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await context.route('**/*', (route) => {
        if (route.request().url() === address && route.request().isNavigationRequest()) {
          return route.fulfill({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: esm.html,
          })
        }
        requests.push(route.request().url())
        return route.abort()
      })
      await page.goto(address)
      await page.getByText('</script><quoted>', { exact: true }).waitFor()
      await page.keyboard.press('Tab')
      assert(
        await page
          .getByRole('link', { name: 'Continue' })
          .evaluate((link) => link === link.ownerDocument.activeElement),
      )
      await page.keyboard.press('Enter')
      await page.getByText('Destination', { exact: true }).waitFor()
      await page.goBack()
      await page.getByText('</script><quoted>', { exact: true }).waitFor()
      await page.goForward()
      await page.getByText('Destination', { exact: true }).waitFor()
      assert.deepEqual(errors, [])
      assert.deepEqual(requests, [])
      console.log('Packed Core /app: Chromium keyboard navigation, history and CSP verified')
    } finally {
      await browser.close()
    }
  }
} finally {
  rmSync(directory, { recursive: true, force: true })
}
