import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { TextDecoder } from 'node:util'

import { formatGeneratedSource } from './format-generated.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = resolve(root, 'packages/core/src/spec/language-resources.generated.ts')
/** @type {unknown} */
const rawPackage = JSON.parse(readFileSync(resolve(root, 'packages/core/package.json'), 'utf8'))
if (
  !rawPackage ||
  typeof rawPackage !== 'object' ||
  !('name' in rawPackage) ||
  !('version' in rawPackage) ||
  typeof rawPackage.name !== 'string' ||
  typeof rawPackage.version !== 'string'
)
  throw new Error('Invalid Core package identity')
const pkg = { name: rawPackage.name, version: rawPackage.version }
const schemaPath = 'docs/spec/schema.json'
const files = ['LANGUAGE.md', 'RUNTIME.md', 'TOOLING.md', 'language.ebnf', 'schema.json']
const resources = files.map((name) => {
  const path = `docs/spec/${name}`
  const bytes = readFileSync(resolve(root, path))
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  return {
    uri: `urn:wireweave:core:resource:${digest}`,
    path,
    digest,
    byteLength: bytes.length,
    mediaType:
      name === 'schema.json'
        ? 'application/schema+json'
        : name.endsWith('.md')
          ? 'text/markdown'
          : 'text/plain',
    text,
  }
})
const schemaResource = resources.find(({ path }) => path === schemaPath)
if (!schemaResource) throw new Error('Missing public schema source')
/** @type {unknown} */
const schema = JSON.parse(schemaResource.text)
if (
  !schema ||
  typeof schema !== 'object' ||
  !('$id' in schema) ||
  typeof schema.$id !== 'string' ||
  !('$schema' in schema) ||
  typeof schema.$schema !== 'string'
)
  throw new Error('Invalid public schema identity')
const schemaId = new URL(schema.$id).href
const dialectId = new URL(schema.$schema).href
/** @type {Map<string, { ref: string, resourceId: string }>} */
const externalRefs = new Map()
/** @param {unknown} value */
function collectRefs(value) {
  if (value === null || typeof value !== 'object') return
  if (value !== schema && '$id' in value) {
    throw new Error('Embedded schema resource IDs require scope-aware reference inventory')
  }
  /** @type {[string, unknown][]} */
  const entries = Object.entries(value)
  for (const [keyword, child] of entries) {
    if (['$ref', '$dynamicRef', '$recursiveRef'].includes(keyword)) {
      if (typeof child !== 'string') throw new Error('Invalid schema reference')
      const target = new URL(child, schemaId)
      target.hash = ''
      if (target.href !== schemaId) externalRefs.set(child, { ref: child, resourceId: target.href })
    } else {
      collectRefs(child)
    }
  }
}
collectRefs(schema)
const schemaMetadata = {
  coverage: 'partial',
  schemaId,
  dialectId,
  externalRefs: [...externalRefs.keys()].sort().map((key) => externalRefs.get(key)),
}
const source = await formatGeneratedSource(
  `// Generated from canonical docs/spec sources. Do not edit.\nexport const LANGUAGE_RESOURCE_PACKAGE = ${JSON.stringify({ name: pkg.name, version: pkg.version })} as const\nexport const LANGUAGE_RESOURCE_DATA = ${JSON.stringify(resources)} as const\nexport const LANGUAGE_SCHEMA_METADATA = ${JSON.stringify(schemaMetadata)} as const\n`,
  output,
)
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== source)
    throw new Error('Language resources are stale; run build:language-resources')
} else writeFileSync(output, source)
