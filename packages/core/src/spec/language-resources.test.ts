import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { languageSourceResources, resolveLanguageSourceResource } from './language-resources'

describe('immutable canonical language source resources', () => {
  it('preserves every canonical asset byte and digest with package identity', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(languageSourceResources.package).toEqual({ name: pkg.name, version: pkg.version })
    expect(languageSourceResources.resources.map((r) => r.path)).toEqual([
      'docs/spec/LANGUAGE.md',
      'docs/spec/RUNTIME.md',
      'docs/spec/TOOLING.md',
      'docs/spec/language.ebnf',
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
