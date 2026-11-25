/** Core-owned, syntax-only source profile. Never app linkage or run admission. */
import { tryParseV4, getV4SourceSpan, hasV4ApplicationEnvelope } from './v4'
import { digestV4 } from './v4-lexical'
import { languageSourceResources } from '../spec/language-resources'
import { languageCatalogFingerprint } from '../spec/catalog-fingerprint.generated'

// Keys are JCS ordered; arrays retain their declared order. Independent tests
// compare these exact UTF-8 bytes with canonical JSON and a SHA-256 implementation.
export const standaloneModuleSyntaxProfileBytes = JSON.stringify({
  coverage: 'standalone-module-syntax-only',
  criteria: ['explicit-v4-module', 'one-page-with-id', 'no-imports-or-application-envelope'],
  excludes: ['link', 'render', 'runtime', 'schema-closure', 'binding-impact', 'project-authority'],
  id: 'wireweave.standalone-module-syntax',
  implementation: {
    commands: ['tryParseV4', 'verifyStandaloneModuleSyntax'],
    export: './parser',
    package: languageSourceResources.package.name,
    packageVersion: languageSourceResources.package.version,
  },
  languageVersion: '4.0.0',
  limits: { maxSourceUtf8Bytes: 65536 },
  resources: {
    catalogDigest: languageCatalogFingerprint.digest,
    schemaCoverage: 'partial',
    sources: languageSourceResources.resources.map((resource) => ({
      byteLength: resource.byteLength,
      digest: resource.digest,
      mediaType: resource.mediaType,
      path: resource.path,
      uri: resource.uri,
    })),
  },
  role: 'language',
  schemaVersion: '1.0.0',
  version: '1.0.0',
})
const profileDigest = digestV4(standaloneModuleSyntaxProfileBytes)
export const standaloneModuleSyntaxProfileRef = Object.freeze({
  kind: 'LanguageProfile',
  origin: 'urn:wireweave:core',
  id: 'wireweave.standalone-module-syntax',
  // Format versions remain in the descriptor; the artifact revision is immutable content.
  revision: profileDigest,
  digest: profileDigest,
})
export type StandaloneModuleSyntaxResult =
  | {
      ok: false
      diagnostic: 'profile-unavailable' | 'invalid-input' | 'unsupported-source' | 'limit'
    }
  | {
      ok: true
      coverage: 'standalone-module-syntax-only'
      profileDigest: string
      sourceDigest: string
      moduleId: string
      namespace: string
      pageId: string
      linkage: 'not-run'
    }

/** Exact opt-in profile, bounded parser execution, no fallback and no I/O.
 * A successful result is not a LinkedApp, render artifact, verified project or grant.
 */
export function verifyStandaloneModuleSyntax(
  source: unknown,
  profile?: unknown,
): StandaloneModuleSyntaxResult {
  if (
    profile === null ||
    typeof profile !== 'object' ||
    Array.isArray(profile) ||
    Object.keys(profile).sort().join() !== 'digest,id,kind,origin,revision' ||
    Object.entries(standaloneModuleSyntaxProfileRef).some(
      ([key, value]) => (profile as Record<string, unknown>)[key] !== value,
    )
  )
    return { ok: false, diagnostic: 'profile-unavailable' }
  if (typeof source !== 'string') return { ok: false, diagnostic: 'invalid-input' }
  if (source.length > 65536 || new TextEncoder().encode(source).byteLength > 65536)
    return { ok: false, diagnostic: 'limit' }
  const result = tryParseV4(source, { languageVersion: '4.0.0', sourceId: 'standalone-module' })
  if (!result.ok) return { ok: false, diagnostic: 'invalid-input' }
  const document = result.value
  const module = document.modules[0]
  const span = module && getV4SourceSpan(module)
  const pages = module?.definitions.filter((definition) => definition.kind === 'page') ?? []
  if (
    !module ||
    document.modules.length !== 1 ||
    !span ||
    !/^module\b/u.test(source.slice(span.start, span.end)) ||
    hasV4ApplicationEnvelope(document) ||
    module.imports.length ||
    document.states.length ||
    document.fixtures.length ||
    document.registry.entries.length ||
    pages.length !== 1 ||
    typeof pages[0]?.id !== 'string'
  )
    return { ok: false, diagnostic: 'unsupported-source' }
  return {
    ok: true,
    coverage: 'standalone-module-syntax-only',
    profileDigest: standaloneModuleSyntaxProfileRef.digest,
    sourceDigest: digestV4(source),
    moduleId: module.id,
    namespace: module.namespace,
    pageId: pages[0].id,
    linkage: 'not-run',
  }
}
