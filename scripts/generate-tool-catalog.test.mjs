import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { URL } from 'node:url'
import { renderCatalog, validateCatalog } from './generate-tool-catalog.mjs'

const { structuredClone } = globalThis
const source = JSON.parse(
  await readFile(new URL('../packages/sdk/src/tool-catalog.json', import.meta.url), 'utf8'),
)

test('rendering is deterministic and both committed outputs match the public source', async () => {
  const first = await renderCatalog(source)
  assert.deepEqual(await renderCatalog(structuredClone(source)), first)
  assert.equal(
    await readFile(new URL('../packages/sdk/src/generated/tools.ts', import.meta.url), 'utf8'),
    first.sdk,
  )
  assert.equal(
    await readFile(new URL('../packages/mcp-server/src/tools.ts', import.meta.url), 'utf8'),
    first.mcp,
  )
})

test('MCP imports the public SDK catalog without another list or private source dependency', async () => {
  const { mcp } = await renderCatalog(source)
  assert.match(mcp, /export \{ localToolNames, toolEndpoints, tools \} from '@wireweave\/sdk'/)
  assert.doesNotMatch(mcp, /const tools|tool-catalog\.json['"]|api-server/)
})

for (const hint of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
  test(`rejects a missing ${hint} rather than applying an implicit default`, () => {
    const catalog = structuredClone(source)
    delete catalog.tools[0].annotations[hint]
    assert.throws(() => validateCatalog(catalog), new RegExp(`${hint} must be an explicit boolean`))
  })
  test(`rejects a non-boolean ${hint}`, () => {
    const catalog = structuredClone(source)
    catalog.tools[0].annotations[hint] = 'false'
    assert.throws(() => validateCatalog(catalog), new RegExp(`${hint} must be an explicit boolean`))
  })
}

test('rejects duplicate tools before generation', () => {
  const catalog = structuredClone(source)
  catalog.tools.push(structuredClone(catalog.tools[0]))
  assert.throws(() => validateCatalog(catalog), /Duplicate tool/)
})

test('rejects an empty catalog and unsupported source versions', () => {
  assert.throws(() => validateCatalog({ schemaVersion: 1, tools: [] }), /must not be empty/)
  assert.throws(() => validateCatalog({ ...source, schemaVersion: 2 }), /Unsupported catalog/)
})

test('rejects undeclared required inputs', () => {
  const catalog = structuredClone(source)
  catalog.tools[0].inputSchema.required.push('undeclared')
  assert.throws(() => validateCatalog(catalog), /undeclared required field/)
})

test('rejects a path parameter missing from the input schema', () => {
  const catalog = structuredClone(source)
  catalog.tools[0].endpoint = { method: 'POST', path: '/tools/:missing', pathParams: ['missing'] }
  assert.throws(() => validateCatalog(catalog), /path parameter missing must be required/)
})

test('rejects endpoint pathParams that disagree with placeholders', () => {
  const catalog = structuredClone(source)
  catalog.tools[0].endpoint = { method: 'POST', path: '/tools/:source', pathParams: ['other'] }
  assert.throws(() => validateCatalog(catalog), /placeholders must match/)
})

test('rejects service endpoints that escape to another authority', () => {
  for (const path of ['https://example.org/tools/parse', '//example.org/tools/parse']) {
    const catalog = structuredClone(source)
    catalog.tools[0].endpoint.path = path
    assert.throws(() => validateCatalog(catalog), /endpoint/)
  }
})

test('rejects a local tool declared open-world or mutating', () => {
  const openWorld = structuredClone(source)
  openWorld.tools[0].annotations.openWorldHint = true
  assert.throws(() => validateCatalog(openWorld), /local tools cannot cross/)
  const mutating = structuredClone(source)
  mutating.tools[0].annotations.readOnlyHint = false
  assert.throws(() => validateCatalog(mutating), /local tools compute without mutation/)
})

test('rejects contradictory read-only and destructive hints', () => {
  const catalog = structuredClone(source)
  catalog.tools[0].annotations.destructiveHint = true
  assert.throws(() => validateCatalog(catalog), /a read cannot be destructive/)
})
