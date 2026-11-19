import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { formatGeneratedSource } from './format-generated.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(packageRoot, 'src/spec/catalog-fingerprint.generated.ts')
const require = createRequire(import.meta.url)
/** @type {unknown} */
const esbuild = createRequire(require.resolve('tsup'))('esbuild')
const { build } =
  /** @type {{build: (options: Record<string, unknown>) => Promise<{outputFiles?: {contents: Uint8Array}[]}>}} */ (
    esbuild
  )

/**
 * Sorted-object JSON with unchanged array order and ordinary JSON scalar encodings.
 * @param {unknown} value
 * @param {string} path
 * @param {Set<object>} ancestors
 * @returns {string}
 */
export function canonicalCatalogJson(value, path = '$', ancestors = new Set()) {
  const invalid = () => {
    throw new TypeError(`Non-JSON catalog value at ${path}`)
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : invalid()
  if (typeof value !== 'object' || ancestors.has(value)) return invalid()

  ancestors.add(value)
  try {
    const keys = Reflect.ownKeys(value)
    /** @param {PropertyKey} key */
    const child = (key) => {
      const property = Object.getOwnPropertyDescriptor(value, key)
      if (!property?.enumerable || !('value' in property)) return invalid()
      /** @type {unknown} */
      const childValue = property.value
      return canonicalCatalogJson(childValue, `${path}.${String(key)}`, ancestors)
    }
    if (Array.isArray(value)) {
      if (keys.length !== value.length + 1 || Object.getPrototypeOf(value) !== Array.prototype)
        return invalid()
      return `[${Array.from({ length: value.length }, (_, index) => child(String(index))).join(',')}]`
    }
    /** @type {unknown} */
    const prototype = Object.getPrototypeOf(value)
    if (
      (prototype !== Object.prototype && prototype !== null) ||
      keys.some((key) => typeof key !== 'string')
    )
      return invalid()
    return `{${keys
      .sort()
      .map((key) => `${JSON.stringify(key)}:${child(key)}`)
      .join(',')}}`
  } finally {
    ancestors.delete(value)
  }
}

export async function generateCatalogFingerprint() {
  const { outputFiles } = await build({
    stdin: {
      resolveDir: resolve(packageRoot, 'src/spec'),
      contents: `
        export { GRAMMAR_ELEMENTS, GRAMMAR_BLOCK_NODE_TYPES, GRAMMAR_CHILD_KEYWORDS } from './grammar-elements.generated'
        export { COMPONENT_SPECS, BLOCK_NODE_SPECS } from './components'
        export { ATTRIBUTE_SPECS } from './attributes'
        export { ATTRIBUTE_OVERRIDES } from './attribute-overrides'
        export { LUCIDE_ICON_NAMES } from './icon-names.generated'
      `,
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  })
  const bundle = outputFiles?.[0]
  if (!bundle) throw new Error('Catalog bundler returned no source')
  /** @type {unknown} */
  const catalog = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.contents).toString('base64')}`
  )
  if (!catalog || typeof catalog !== 'object') throw new Error('Catalog exports are unavailable')
  const scope = 'wireweave-core-dsl-catalog-v1'
  const canonicalization = 'wireweave-sorted-json-v1'
  const canonicalJson = canonicalCatalogJson({ scope, canonicalization, catalog: { ...catalog } })
  return {
    scope,
    canonicalization,
    digest: `sha256:${createHash('sha256').update(canonicalJson, 'utf8').digest('hex')}`,
    byteLength: Buffer.byteLength(canonicalJson, 'utf8'),
  }
}

async function main() {
  const fingerprint = await generateCatalogFingerprint()
  const source = await formatGeneratedSource(
    `// Generated from Core catalog exports. Do not edit.\nexport const languageCatalogFingerprint = Object.freeze(${JSON.stringify(fingerprint)})\n`,
    output,
  )
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== source)
      throw new Error('Catalog fingerprint is stale; run build:catalog-fingerprint')
  } else writeFileSync(output, source)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await main()
