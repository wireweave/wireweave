import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { compileAppWithSchemaReferenceClosure, createAppBundle, linkAndCompileApp } from './index'
import { standaloneModuleSyntaxProfileRef, tryParseV4 } from '../parser'
import { jcs } from './v4'
import { languageSchemaSource, verifyLanguageSchemaReferenceClosure } from '../spec'

const productId = 'https://wireweave.org/contracts/product/1.0/schema.json'
const dependencyId = 'urn:wireweave:synthetic-registry-schema'
const dialect = languageSchemaSource.dialectId
const hash = (bytes: Uint8Array | string) =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const dependencySchema = {
  $id: dependencyId,
  $schema: dialect,
  $defs: { 'registry/shape': { type: 'object' }, 'display name': true },
}
const dependencyBytes = encode(dependencySchema)
const dependency = {
  schemaId: dependencyId,
  bytes: dependencyBytes,
  digest: hash(dependencyBytes),
  byteLength: dependencyBytes.byteLength,
}
const schemaFor = (ref: string) =>
  encode({ $id: productId, $schema: dialect, $defs: { Registry: { $ref: ref } } })
const product = schemaFor(`${dependencyId}#/$defs/registry~1shape`)
const pin = (bytes = product) => ({
  coreSchemaDigest: languageSchemaSource.resource.digest,
  productSchemaDigest: hash(bytes),
})
const requirementId = '019ac703-5ee0-7000-8000-000000000011'

function bundle(destination: string) {
  const source = `module main namespace=main {
    page "Home" id=home {
      title "Orders" requirementRefs=["${requirementId}"]
      link "Continue" id=continueOrders navigate="${destination}"
    }
    page "Review" id=review { text "Review the order" }
  }`
  const parsed = tryParseV4(source, { languageVersion: '4.0.0' })
  if (!parsed.ok) throw new Error('Test module must parse')
  const entries = [
    {
      kind: 'Requirement',
      id: requirementId,
      namespace: 'main',
      title: 'Open Orders',
      status: 'accepted',
      acceptance: [
        { id: 'open', given: 'An order', when: 'Orders opens', then: 'Orders is visible' },
      ],
    },
  ]
  const result = createAppBundle([parsed.value], {
    id: 'orders',
    entry: { namespace: 'main', id: 'home' },
    profile: parsed.value.app.profile,
    states: [],
    fixtures: [],
    registry: { schemaVersion: '1.0.0', entries, digest: hash(jcs(entries)) },
    moduleSources: { main: source },
  })
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}

describe('offline schema closure before application compilation', () => {
  it('binds pinned transitive resources to actual Core linker and compiler output', () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected schema fetch'))
    try {
      const closure = verifyLanguageSchemaReferenceClosure(pin(), product, [dependency])
      const app = bundle('review')
      const expected = linkAndCompileApp(app)
      const compiled = compileAppWithSchemaReferenceClosure(app, pin(), product, [dependency])
      expect(expected.ok).toBe(true)
      expect(closure).toMatchObject({
        ok: true,
        resources: expect.arrayContaining([
          {
            schemaId: dependencyId,
            digest: dependency.digest,
            byteLength: dependencyBytes.length,
          },
        ]),
      })
      if (!expected.ok || !closure.ok || !compiled.ok) throw new Error(JSON.stringify(compiled))
      expect(compiled.schemaReferenceClosureDigest).toBe(closure.digest)
      expect(compiled.artifact.manifest).toEqual(expected.value.manifest)
      expect(
        compiled.artifact.sourceMap.some((row) => row.requirementRefs.includes(requirementId)),
      ).toBe(true)
      expect(compiled.artifact.html).toContain('Review the order')
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      fetch.mockRestore()
    }
  })

  it('refuses syntax-only evidence, stale schema pins, missing resources and unresolved fragments', () => {
    const app = bundle('review')
    expect(
      compileAppWithSchemaReferenceClosure(
        app,
        standaloneModuleSyntaxProfileRef as unknown as ReturnType<typeof pin>,
        product,
        [dependency],
      ),
    ).toMatchObject({ ok: false, stage: 'schema' })
    expect(
      compileAppWithSchemaReferenceClosure(
        app,
        { ...pin(), coreSchemaDigest: hash('stale') },
        product,
        [dependency],
      ),
    ).toMatchObject({ ok: false, stage: 'schema' })
    expect(
      compileAppWithSchemaReferenceClosure(app, pin(), product, [
        { ...dependency, digest: hash('stale') },
      ]),
    ).toMatchObject({ ok: false, stage: 'schema' })
    expect(compileAppWithSchemaReferenceClosure(app, pin(), product)).toEqual({
      ok: false,
      stage: 'schema',
      diagnostic: 'invalid-reference',
    })
    for (const ref of [
      `${dependencyId}#/$defs/absent`,
      `${dependencyId}#/$id`,
      `${dependencyId}#/%`,
      `${dependencyId}#named`,
      `${dependencyId}#/$defs/display name`,
      'https://schemas.example.invalid/missing#/$defs/Registry',
      'registry.json#/$defs/Registry',
    ]) {
      const bytes = schemaFor(ref)
      expect(verifyLanguageSchemaReferenceClosure(pin(bytes), bytes, [dependency])).toEqual({
        ok: false,
        diagnostic: 'invalid-reference',
      })
    }
    const encodedFragment = schemaFor(`${dependencyId}#/$defs/display%20name`)
    expect(
      verifyLanguageSchemaReferenceClosure(pin(encodedFragment), encodedFragment, [dependency]),
    ).toMatchObject({ ok: true })
  })

  it('rejects aliased resources, unsupported references and parseable broken bundles', () => {
    expect(verifyLanguageSchemaReferenceClosure(pin(), product, [dependency, dependency])).toEqual({
      ok: false,
      diagnostic: 'invalid-resource',
    })
    expect(
      verifyLanguageSchemaReferenceClosure(pin(), product, [{ ...dependency, byteLength: 0 }]),
    ).toEqual({ ok: false, diagnostic: 'invalid-resource' })
    for (const bytes of [
      encode({ ...dependencySchema, $id: 'urn:wireweave:wrong-resource' }),
      encode({ ...dependencySchema, $dynamicRef: '#registry' }),
      encode({ ...dependencySchema, properties: { nested: { $id: 'urn:wireweave:nested' } } }),
      encode({ ...dependencySchema, properties: { nested: { $schema: dialect } } }),
      Uint8Array.of(0xff),
    ]) {
      expect(
        verifyLanguageSchemaReferenceClosure(pin(), product, [
          { ...dependency, bytes, digest: hash(bytes), byteLength: bytes.byteLength },
        ]),
      ).toEqual({ ok: false, diagnostic: 'invalid-resource' })
    }
    expect(
      compileAppWithSchemaReferenceClosure(bundle('missing'), pin(), product, [dependency]),
    ).toMatchObject({ ok: false, stage: 'app', diagnostics: expect.any(Array) })
  })
})
