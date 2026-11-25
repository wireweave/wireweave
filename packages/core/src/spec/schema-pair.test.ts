import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  languageSchemaSource,
  resolveLanguageSourceResource,
  verifyLanguageSchemaPair,
} from './index'

const hash = (bytes: Uint8Array) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`
const productId = languageSchemaSource.externalRefs[0].resourceId
const productSchema = {
  $id: productId,
  $schema: languageSchemaSource.dialectId,
  $defs: { Registry: { type: 'object', title: 'Test registry — test only' } },
}
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const pinFor = (bytes: Uint8Array) => ({
  coreSchemaDigest: languageSchemaSource.resource.digest,
  productSchemaDigest: hash(bytes),
})

describe('explicit offline schema pairing', () => {
  it('binds the installed Core schema and the exact supplied bytes without registering the resource', () => {
    const bytes = encode(productSchema)
    const pin = pinFor(bytes)
    const result = verifyLanguageSchemaPair(pin, bytes)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.diagnostic)
    bytes.fill(0)
    expect(result.core).toBe(languageSchemaSource.resource)
    expect(result.product.schemaId).toBe(productId)
    expect(hash(new TextEncoder().encode(result.product.text))).toBe(pin.productSchemaDigest)
    expect(result.product.byteLength).toBe(bytes.byteLength)
    expect(Object.isFrozen(result.product)).toBe(true)
    expect(resolveLanguageSourceResource(productId)).toBeNull()
  })

  it('refuses absent inputs, a stale Core pin and changed product bytes', () => {
    const bytes = encode(productSchema)
    const pin = pinFor(bytes)
    expect(verifyLanguageSchemaPair(undefined, bytes)).toEqual({
      ok: false,
      diagnostic: 'core-schema-pin-mismatch',
    })
    expect(verifyLanguageSchemaPair({ ...pin, coreSchemaDigest: hash(bytes) }, bytes)).toEqual({
      ok: false,
      diagnostic: 'core-schema-pin-mismatch',
    })
    for (const unavailable of [
      undefined,
      new Uint8Array(0),
      new Uint8Array(512 * 1024 + 1),
      encode({ ...productSchema, description: 'Different bytes' }),
    ]) {
      expect(verifyLanguageSchemaPair(pin, unavailable)).toEqual({
        ok: false,
        diagnostic: 'product-schema-unavailable',
      })
    }
  })

  it('requires the declared identity, dialect and Registry definition even with a matching digest', () => {
    for (const bytes of [
      encode({ ...productSchema, $id: 'urn:other' }),
      encode({ ...productSchema, $schema: 'urn:other' }),
      encode({ ...productSchema, $defs: {} }),
      encode({ ...productSchema, $defs: { Registry: [] } }),
      Uint8Array.of(0xff),
    ]) {
      expect(verifyLanguageSchemaPair(pinFor(bytes), bytes)).toEqual({
        ok: false,
        diagnostic: 'invalid-product-schema',
      })
    }
  })
})
