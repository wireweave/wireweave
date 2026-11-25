import { digestV4 } from '../parser/v4-lexical'
import { languageSchemaSource } from './language-resources'

export interface LanguageSchemaPairPin {
  readonly coreSchemaDigest: string
  readonly productSchemaDigest: string
}

export type LanguageSchemaPairResult =
  | {
      readonly ok: true
      readonly core: typeof languageSchemaSource.resource
      readonly product: Readonly<{
        schemaId: string
        digest: string
        byteLength: number
        text: string
      }>
    }
  | {
      readonly ok: false
      readonly diagnostic:
        'core-schema-pin-mismatch' | 'product-schema-unavailable' | 'invalid-product-schema'
    }

const MAX_PRODUCT_SCHEMA_BYTES = 512 * 1024

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** Pair installed Core source and a host-supplied product schema by exact bytes.
 * This does not resolve transitive references, validate an AppBundle, or admit a profile.
 */
export function verifyLanguageSchemaPair(
  pin: LanguageSchemaPairPin | undefined,
  productSchemaBytes: Uint8Array | undefined,
): LanguageSchemaPairResult {
  const { resource, dialectId, externalRefs } = languageSchemaSource
  if (pin?.coreSchemaDigest !== resource.digest) {
    return { ok: false, diagnostic: 'core-schema-pin-mismatch' }
  }
  if (
    !(productSchemaBytes instanceof Uint8Array) ||
    productSchemaBytes.byteLength === 0 ||
    productSchemaBytes.byteLength > MAX_PRODUCT_SCHEMA_BYTES
  ) {
    return { ok: false, diagnostic: 'product-schema-unavailable' }
  }

  const [registry] = externalRefs
  if (
    externalRefs.length !== 1 ||
    !registry ||
    registry.ref !== `${registry.resourceId}#/$defs/Registry`
  ) {
    return { ok: false, diagnostic: 'product-schema-unavailable' }
  }
  const bytes = new Uint8Array(productSchemaBytes)
  let text: string
  let schema: Record<string, unknown> | undefined
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    if (digestV4(text) !== pin.productSchemaDigest) {
      return { ok: false, diagnostic: 'product-schema-unavailable' }
    }
    schema = record(JSON.parse(text))
  } catch {
    return { ok: false, diagnostic: 'invalid-product-schema' }
  }
  if (
    schema?.$id !== registry.resourceId ||
    schema.$schema !== dialectId ||
    !record(record(schema.$defs)?.Registry)
  ) {
    return { ok: false, diagnostic: 'invalid-product-schema' }
  }
  return Object.freeze({
    ok: true,
    core: resource,
    product: Object.freeze({
      schemaId: registry.resourceId,
      digest: pin.productSchemaDigest,
      byteLength: bytes.byteLength,
      text,
    }),
  })
}
