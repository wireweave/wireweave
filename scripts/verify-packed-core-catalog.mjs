// Copied next to the unpacked package by the tarball gate. Resolve only public exports.
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import net from 'node:net'
import tls from 'node:tls'

const forbidden = () => {
  throw new Error('Unexpected network call while verifying packed Core /spec')
}
globalThis.fetch = forbidden
for (const transport of [http, https]) transport.request = transport.get = forbidden
net.connect = net.createConnection = tls.connect = forbidden
syncBuiltinESMExports()

const catalogExports = [
  'GRAMMAR_ELEMENTS',
  'GRAMMAR_BLOCK_NODE_TYPES',
  'GRAMMAR_CHILD_KEYWORDS',
  'COMPONENT_SPECS',
  'BLOCK_NODE_SPECS',
  'ATTRIBUTE_SPECS',
  'ATTRIBUTE_OVERRIDES',
  'LUCIDE_ICON_NAMES',
]

function sortedJson(value) {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${sortedJson(value[key])}`)
      .join(',')}}`
  }
  if (value === null || ['string', 'boolean'].includes(typeof value) || Number.isFinite(value)) {
    return JSON.stringify(value)
  }
  throw new Error('Unexpected value in packed catalog')
}

function fingerprint(catalog, scope, canonicalization) {
  const bytes = Buffer.from(sortedJson({ scope, canonicalization, catalog }), 'utf8')
  return {
    scope,
    canonicalization,
    byteLength: bytes.length,
    digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
  }
}

const esm = await import('@wireweave/core/spec')
const cjs = createRequire(import.meta.url)('@wireweave/core/spec')
assert.deepEqual(esm.languageCatalogFingerprint, cjs.languageCatalogFingerprint)

for (const spec of [esm, cjs]) {
  const metadata = spec.languageCatalogFingerprint
  assert(Object.isFrozen(metadata))
  const { scope, canonicalization } = metadata
  assert.equal(scope, 'wireweave-core-dsl-catalog-v1')
  assert.equal(canonicalization, 'wireweave-sorted-json-v1')
  const catalog = Object.fromEntries(catalogExports.map((name) => [name, spec[name]]))
  assert.deepEqual(fingerprint(catalog, scope, canonicalization), metadata)

  const [attribute, ...remaining] = catalog.ATTRIBUTE_SPECS
  const changed = {
    ...catalog,
    ATTRIBUTE_SPECS: [
      { ...attribute, description: attribute.description + ' (changed description)' },
      ...remaining,
    ],
  }
  assert.notEqual(fingerprint(changed, scope, canonicalization).digest, metadata.digest)
}

console.log('Packed Core /spec: ESM and CJS catalog fingerprints verified from public exports')
