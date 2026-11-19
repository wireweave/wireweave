import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const files = ['LANGUAGE.md', 'RUNTIME.md', 'TOOLING.md', 'language.ebnf']
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
    mediaType: name.endsWith('.md') ? 'text/markdown' : 'text/plain',
    text,
  }
})
const source = await formatGeneratedSource(
  `// Generated from canonical docs/spec sources. Do not edit.\nexport const LANGUAGE_RESOURCE_PACKAGE = ${JSON.stringify({ name: pkg.name, version: pkg.version })} as const\nexport const LANGUAGE_RESOURCE_DATA = ${JSON.stringify(resources)} as const\n`,
  output,
)
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== source)
    throw new Error('Language resources are stale; run build:language-resources')
} else writeFileSync(output, source)
