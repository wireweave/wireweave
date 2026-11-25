import { digestV4 } from '../parser/v4-lexical'
import { languageSchemaSource } from './language-resources'
import { verifyLanguageSchemaPair, type LanguageSchemaPairPin } from './schema-pair'

export interface LanguageSchemaResourceInput {
  readonly schemaId: string
  readonly digest: string
  readonly byteLength: number
  readonly bytes: Uint8Array
}

interface SchemaIdentity {
  readonly schemaId: string
  readonly digest: string
  readonly byteLength: number
}

export type LanguageSchemaReferenceClosureResult =
  | { readonly ok: true; readonly digest: string; readonly resources: readonly SchemaIdentity[] }
  | {
      readonly ok: false
      readonly diagnostic:
        'schema-pair-mismatch' | 'invalid-resource' | 'invalid-reference' | 'limit'
    }

const MAX_RESOURCES = 16
const MAX_SCHEMA_BYTES = 512 * 1024
const MAX_TOTAL_BYTES = 2 * 1024 * 1024
const MAX_SCHEMA_NODES = 16384
const MAX_SCHEMA_DEPTH = 64
const digestPattern = /^sha256:[a-f0-9]{64}$/u
const fragmentPattern = /^[A-Za-z0-9._~!$&'()*+,;=:@/?%-]*$/u

const maps = ['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas']
const lists = ['allOf', 'anyOf', 'oneOf', 'prefixItems']
const singles = [
  'additionalProperties',
  'unevaluatedProperties',
  'propertyNames',
  'items',
  'unevaluatedItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'contentSchema',
]
const unsupported = [
  '$anchor',
  '$dynamicAnchor',
  '$dynamicRef',
  '$recursiveAnchor',
  '$recursiveRef',
  '$vocabulary',
  'additionalItems',
  'dependencies',
]
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const pointerKey = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')

function isResourceId(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^(?:https:\/\/|urn:[a-z0-9][a-z0-9-]{0,31}:)[^#\s]+$/u.test(value) ||
    /%(?![0-9a-f]{2})/iu.test(value)
  )
    return false
  try {
    return new URL(value).href === value
  } catch {
    return false
  }
}

/** Verify the reachable, exact schema resources and their static references.
 * Does not validate instances or grant profile admission. No external resolver is used.
 */
export function verifyLanguageSchemaReferenceClosure(
  pin: LanguageSchemaPairPin,
  productSchemaBytes: Uint8Array,
  dependencies: readonly LanguageSchemaResourceInput[] = [],
): LanguageSchemaReferenceClosureResult {
  const pair = verifyLanguageSchemaPair(pin, productSchemaBytes)
  if (!pair.ok) return { ok: false, diagnostic: 'schema-pair-mismatch' }
  if (!Array.isArray(dependencies)) return { ok: false, diagnostic: 'invalid-resource' }
  if (dependencies.length > MAX_RESOURCES - 2) return { ok: false, diagnostic: 'limit' }

  const installed = {
    schemaId: languageSchemaSource.schemaId,
    digest: pair.core.digest,
    byteLength: pair.core.byteLength,
    text: pair.core.text,
  }
  const resources = new Map([
    [installed.schemaId, installed],
    [pair.product.schemaId, pair.product],
  ])
  let totalBytes = installed.byteLength + pair.product.byteLength
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  for (const dependency of dependencies as readonly unknown[]) {
    if (
      !object(dependency) ||
      !isResourceId(dependency.schemaId) ||
      resources.has(dependency.schemaId) ||
      typeof dependency.digest !== 'string' ||
      !digestPattern.test(dependency.digest) ||
      !(dependency.bytes instanceof Uint8Array) ||
      dependency.bytes.byteLength === 0 ||
      dependency.byteLength !== dependency.bytes.byteLength
    )
      return { ok: false, diagnostic: 'invalid-resource' }
    const byteLength = dependency.bytes.byteLength
    totalBytes += byteLength
    if (byteLength > MAX_SCHEMA_BYTES || totalBytes > MAX_TOTAL_BYTES) {
      return { ok: false, diagnostic: 'limit' }
    }
    let text: string
    try {
      text = decoder.decode(new Uint8Array(dependency.bytes))
    } catch {
      return { ok: false, diagnostic: 'invalid-resource' }
    }
    if (digestV4(text) !== dependency.digest) return { ok: false, diagnostic: 'invalid-resource' }
    resources.set(dependency.schemaId, {
      schemaId: dependency.schemaId,
      digest: dependency.digest,
      byteLength,
      text,
    })
  }

  const pointers = new Map<string, Set<string>>()
  const references = new Map<string, string[]>()
  let nodeCount = 0
  for (const resource of resources.values()) {
    let root: unknown
    try {
      root = JSON.parse(resource.text)
    } catch {
      return { ok: false, diagnostic: 'invalid-resource' }
    }
    if (
      !object(root) ||
      root.$id !== resource.schemaId ||
      root.$schema !== languageSchemaSource.dialectId
    ) {
      return { ok: false, diagnostic: 'invalid-resource' }
    }
    const paths = new Set<string>()
    const refs: string[] = []
    pointers.set(resource.schemaId, paths)
    references.set(resource.schemaId, refs)
    const visit = (schema: unknown, path: string, depth: number): boolean => {
      if (++nodeCount > MAX_SCHEMA_NODES || depth > MAX_SCHEMA_DEPTH) return false
      paths.add(path)
      if (typeof schema === 'boolean') return true
      if (
        !object(schema) ||
        (depth > 0 && (Object.hasOwn(schema, '$id') || Object.hasOwn(schema, '$schema'))) ||
        unsupported.some((key) => Object.hasOwn(schema, key))
      )
        return false
      if (Object.hasOwn(schema, '$ref')) {
        if (typeof schema.$ref !== 'string') return false
        refs.push(schema.$ref)
      }
      return (
        maps.every(
          (key) =>
            !Object.hasOwn(schema, key) ||
            (object(schema[key]) &&
              Object.entries(schema[key]).every(([name, child]) =>
                visit(child, `${path}/${key}/${pointerKey(name)}`, depth + 1),
              )),
        ) &&
        lists.every(
          (key) =>
            !Object.hasOwn(schema, key) ||
            (Array.isArray(schema[key]) &&
              schema[key].every((child: unknown, index: number) =>
                visit(child, `${path}/${key}/${index}`, depth + 1),
              )),
        ) &&
        singles.every(
          (key) => !Object.hasOwn(schema, key) || visit(schema[key], `${path}/${key}`, depth + 1),
        )
      )
    }
    if (!visit(root, '', 0)) return { ok: false, diagnostic: 'invalid-resource' }
  }

  const visited = new Set<string>()
  const pending: string[] = [installed.schemaId]
  for (const schemaId of pending) {
    if (visited.has(schemaId)) continue
    visited.add(schemaId)
    for (const ref of references.get(schemaId) ?? []) {
      const separator = ref.indexOf('#')
      const target = (separator < 0 ? ref : ref.slice(0, separator)) || schemaId
      let path = ''
      try {
        if (separator >= 0) {
          const fragment = ref.slice(separator + 1)
          if (!fragmentPattern.test(fragment)) return { ok: false, diagnostic: 'invalid-reference' }
          path = decodeURIComponent(fragment)
        }
      } catch {
        return { ok: false, diagnostic: 'invalid-reference' }
      }
      if (!pointers.get(target)?.has(path)) return { ok: false, diagnostic: 'invalid-reference' }
      if (!visited.has(target)) pending.push(target)
    }
  }
  if (visited.size !== resources.size) return { ok: false, diagnostic: 'invalid-resource' }

  const identities = [...visited].sort().map((schemaId) => {
    const { digest, byteLength } = resources.get(schemaId)!
    return Object.freeze({ schemaId, digest, byteLength })
  })
  return Object.freeze({
    ok: true,
    digest: digestV4(JSON.stringify(identities)),
    resources: Object.freeze(identities),
  })
}
