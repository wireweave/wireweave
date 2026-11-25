import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  standaloneModuleSyntaxProfileBytes as bytes,
  standaloneModuleSyntaxProfileRef as profile,
  verifyStandaloneModuleSyntax as verify,
} from './index'
import { languageSourceResources } from '../spec/language-resources'
const source =
  'language "4.0.0"\nmodule fresh namespace=fresh { page "Review" id=review { main { text "Public page" } } }'
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map(
          (key) => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key]),
        )
        .join(',') +
      '}'
    )
  return JSON.stringify(value)
}
describe('Core standalone module syntax profile', () => {
  it('binds canonical descriptor bytes to exact owner resources without claiming full language closure', () => {
    const descriptor = JSON.parse(bytes)
    expect(bytes).toBe(canonical(descriptor))
    expect(profile.digest).toBe('sha256:' + createHash('sha256').update(bytes).digest('hex'))
    expect(descriptor.implementation.packageVersion).toBe(languageSourceResources.package.version)
    expect(descriptor.resources.schemaCoverage).toBe('partial')
    expect(descriptor.excludes).toContain('link')
    expect(Object.isFrozen(profile)).toBe(true)
  })
  it('uses the real parser on one explicit module and never reports linkage', () => {
    expect(verify(source, profile)).toMatchObject({
      ok: true,
      moduleId: 'fresh',
      namespace: 'fresh',
      pageId: 'review',
      coverage: 'standalone-module-syntax-only',
      linkage: 'not-run',
    })
    // Missing semantic reference is intentionally outside this syntax profile.
    expect(verify(source.replace('text "Public page"', 'use Missing'), profile)).toMatchObject({
      ok: true,
      linkage: 'not-run',
    })
  })
  it('rejects absent/wrong/extra profile fields instead of parsing under a default', () => {
    for (const ref of [
      undefined,
      null,
      {},
      { ...profile, digest: 'sha256:' + '0'.repeat(64) },
      { ...profile, id: 'other' },
      { ...profile, role: 'language' },
    ])
      expect(verify(source, ref)).toEqual({ ok: false, diagnostic: 'profile-unavailable' })
  })
  it('rejects malformed, bare Page, application and oversized source', () => {
    expect(verify('module {', profile)).toEqual({ ok: false, diagnostic: 'invalid-input' })
    expect(verify(source.replace(' id=review', ''), profile)).toEqual({
      ok: false,
      diagnostic: 'unsupported-source',
    })
    expect(verify('page "Bare" id=bare { main { text "x" } }', profile)).toEqual({
      ok: false,
      diagnostic: 'unsupported-source',
    })
    expect(
      verify(
        'app real entry={namespace="fresh",id="review"} { module fresh namespace=fresh { page "Review" id=review {} } }',
        profile,
      ),
    ).toEqual({ ok: false, diagnostic: 'unsupported-source' })
    expect(verify(source + ' '.repeat(65536), profile)).toEqual({ ok: false, diagnostic: 'limit' })
  })
})
