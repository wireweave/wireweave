import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  languageSchemaSource,
  languageSourceResources,
  resolveLanguageSourceResource,
} from './language-resources'

describe('immutable canonical language source resources', () => {
  it('preserves every canonical asset byte and digest with package identity', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(languageSourceResources.package).toEqual({ name: pkg.name, version: pkg.version })
    expect(languageSourceResources.resources.map((r) => r.path)).toEqual([
      'docs/spec/LANGUAGE.md',
      'docs/spec/RUNTIME.md',
      'docs/spec/TOOLING.md',
      'docs/spec/language.ebnf',
      'docs/spec/schema.json',
    ])
    for (const resource of languageSourceResources.resources) {
      const bytes = readFileSync(new URL(`../../../../${resource.path}`, import.meta.url))
      expect(Buffer.from(resource.text, 'utf8')).toEqual(bytes)
      expect(resource.byteLength).toBe(bytes.length)
      expect(resource.digest).toBe(`sha256:${createHash('sha256').update(bytes).digest('hex')}`)
      expect(resolveLanguageSourceResource(resource.uri)).toBe(resource)
      expect(Object.isFrozen(resource)).toBe(true)
    }
    expect(Object.isFrozen(languageSourceResources)).toBe(true)
    expect(Object.isFrozen(languageSourceResources.package)).toBe(true)
    expect(Object.isFrozen(languageSourceResources.resources)).toBe(true)
  })
  it('reports the public schema as partial without resolving the dialect or Registry', () => {
    const { coverage, schemaId, dialectId, resource, externalRefs } = languageSchemaSource
    expect(coverage).toBe('partial')
    expect(resource.mediaType).toBe('application/schema+json')
    const schema = JSON.parse(resource.text)
    expect(schemaId).toBe(schema.$id)
    expect(dialectId).toBe(schema.$schema)
    expect(externalRefs).toEqual([
      {
        resourceId: 'https://wireweave.org/contracts/product/1.0/schema.json',
        ref: 'https://wireweave.org/contracts/product/1.0/schema.json#/$defs/Registry',
      },
    ])
    for (const identifier of [
      schemaId,
      dialectId,
      externalRefs[0].resourceId,
      externalRefs[0].ref,
    ]) {
      expect(resolveLanguageSourceResource(identifier)).toBeNull()
    }
    expect(resolveLanguageSourceResource(resource.uri)).toBe(resource)
    expect(Object.isFrozen(languageSchemaSource)).toBe(true)
    expect(Object.isFrozen(externalRefs)).toBe(true)
    expect(Object.isFrozen(externalRefs[0])).toBe(true)
  })
  it('does not interpret unknown URIs, fragments or paths', () => {
    for (const uri of [
      'https://example.invalid/schema.json',
      '../LANGUAGE.md',
      '',
      `${languageSourceResources.resources[0].uri}#fragment`,
    ]) {
      expect(resolveLanguageSourceResource(uri)).toBeNull()
    }
  })
})
