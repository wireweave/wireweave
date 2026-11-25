import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as parserOwner from './v4'
import {
  standaloneModuleSyntaxProfileBytes as bytes,
  standaloneModuleSyntaxProfileRef as profile,
  verifyStandaloneModuleSyntax as verify,
} from './index'
import { languageSourceResources } from '../spec/language-resources'
import { languageCatalogFingerprint } from '../spec/catalog-fingerprint.generated'
afterEach(() => {
  vi.restoreAllMocks()
  vi.doUnmock('../spec/language-resources')
  vi.doUnmock('../spec/catalog-fingerprint.generated')
  vi.resetModules()
})
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
    expect(profile.revision).toBe(profile.digest)
    expect(descriptor.version).toBe('1.0.0')
    expect(descriptor.schemaVersion).toBe('1.0.0')
    expect(descriptor.implementation.packageVersion).toBe(languageSourceResources.package.version)
    expect(descriptor.resources.schemaCoverage).toBe('partial')
    expect(descriptor.excludes).toContain('link')
    expect(Object.isFrozen(profile)).toBe(true)
  })
  it('changes immutable Ref revision with package or catalog bytes, without issuing a release', async () => {
    for (const changed of ['package', 'catalog']) {
      vi.resetModules()
      vi.doMock('../spec/language-resources', () => ({
        languageSourceResources: {
          ...languageSourceResources,
          package: {
            ...languageSourceResources.package,
            version:
              changed === 'package'
                ? '4.0.0-beta.26-fixture'
                : languageSourceResources.package.version,
          },
        },
      }))
      vi.doMock('../spec/catalog-fingerprint.generated', () => ({
        languageCatalogFingerprint: {
          ...languageCatalogFingerprint,
          digest:
            changed === 'catalog' ? 'sha256:' + 'f'.repeat(64) : languageCatalogFingerprint.digest,
        },
      }))
      const next = await import('./standalone-module-profile')
      const descriptor = JSON.parse(next.standaloneModuleSyntaxProfileBytes)
      expect(next.standaloneModuleSyntaxProfileRef.digest).not.toBe(profile.digest)
      expect(next.standaloneModuleSyntaxProfileRef.revision).not.toBe(profile.revision)
      expect(next.standaloneModuleSyntaxProfileRef.revision).toBe(
        next.standaloneModuleSyntaxProfileRef.digest,
      )
      expect(descriptor.version).toBe('1.0.0')
      expect(descriptor.schemaVersion).toBe('1.0.0')
      expect(next.verifyStandaloneModuleSyntax(source, profile)).toEqual({
        ok: false,
        diagnostic: 'profile-unavailable',
      })
    }
  })
  it('rejects parser-owned app envelope provenance even with an absent entry projection', () => {
    const app =
      'app real entry={namespace="fresh",id="review"} { module fresh namespace=fresh { page "Review" id=review {} } }'
    const parsed = parserOwner.tryParseV4(app, { languageVersion: '4.0.0' })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) throw new Error('public app did not parse')
    expect(parserOwner.hasV4ApplicationEnvelope(parsed.value)).toBe(true)
    delete parsed.value.app.entry
    // Controlled projection regression, not a claim that missing-entry source
    // is currently accepted: actual parser provenance must remain authoritative.
    vi.spyOn(parserOwner, 'tryParseV4').mockReturnValue(parsed)
    expect(verify(app, profile)).toEqual({ ok: false, diagnostic: 'unsupported-source' })
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
