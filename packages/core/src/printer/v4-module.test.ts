import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import examples from '../../../../docs/spec/examples.json'
import { compileApp, createAppBundle, linkApp, type AppResult } from '../app'
import {
  formatWireframeCode,
  getV4SourceSpan,
  parse,
  printV4Module,
  printWireframe,
  tryParse,
} from '../index'
import type { ParsedDocument } from '../parser/v4-types'

const options = { languageVersion: '4.0.0', sourceId: 'roundtrip.wf' }
const firstScreen = `\ufefflanguage '4.0.0'\r
// New module, separate from the app's existing entry.\r
module review namespace=review {\r
  export page review;\r
  page 'Order review' id=review {\r
    main p=12 gap=8 {\r
      title 'Review — 주문'\r
      button 'Show details' primary id=details opens='detailsModal'\r
      modal 'Details' id=detailsModal { text 'Pending' }\r
    }\r
  }\r
}\r
`
const existing = 'module base namespace=base { page "Home" id=home { text "Existing" } }'

function semanticAst(document: ParsedDocument) {
  return {
    ...document,
    modules: document.modules.map(({ sourceDigest: _digest, ...module }) => module),
  }
}

function value<T>(result: AppResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}

function sourceBytes(document: ParsedDocument, source: string) {
  const span = getV4SourceSpan(document.modules[0])!
  return source.slice(span.start, span.end)
}

describe('public V4 module printer', () => {
  it('round-trips canonical first-screen source and links it with an untouched existing module', () => {
    const original = parse(firstScreen, options)
    const printed = printV4Module(original)
    expect(printed).toContain('    main gap=8 p=12 {\n')
    expect(printed).toContain(
      'button "Show details" id="details" opens="detailsModal" primary=true',
    )
    expect(printed).not.toMatch(/\r|\ufeff|\/\//)
    expect(printed.endsWith('}\n')).toBe(true)
    const reparsed = parse(printed, options)
    expect(semanticAst(reparsed)).toEqual(semanticAst(original))
    expect(printV4Module(reparsed)).toBe(printed)
    const bytes = sourceBytes(reparsed, printed)
    expect(reparsed.modules[0].sourceDigest).toBe(
      'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    )
    expect(reparsed.modules[0].sourceDigest).not.toBe(original.modules[0].sourceDigest)

    const base = parse(existing, options)
    const bundle = value(
      createAppBundle([base, reparsed], {
        id: 'orders',
        entry: { namespace: 'base', id: 'home' },
        profile: base.app.profile,
        registry: base.registry,
        states: base.states,
        fixtures: base.fixtures,
        moduleSources: { base: existing, review: bytes },
      }),
    )
    expect(bundle.modules[0].sourceDigest).toBe(base.modules[0].sourceDigest)
    const linked = value(linkApp(bundle))
    const compiled = value(compileApp(linked))
    expect(compiled.html).toContain('Order review')
    expect(compiled.operationIndex).toHaveLength(1)
    expect(compiled.manifest.htmlDigest).toBe(
      'sha256:' + createHash('sha256').update(compiled.html).digest('hex'),
    )
  })

  for (const fixture of examples.valid) {
    for (const [id, source] of Object.entries(fixture.moduleSources)) {
      it(`preserves ${fixture.id}/${id} module semantics`, () => {
        const original = parse(source, options)
        const printed = printV4Module(original)
        const reparsed = parse(printed, options)
        expect(semanticAst(reparsed)).toEqual(semanticAst(original))
        expect(printV4Module(reparsed)).toBe(printed)
      })
    }
  }

  it('does not substitute a module for an app, bare fragment, detached AST or inspection-use ID', () => {
    const invalid = [
      parse(examples.valid[0].source, options),
      parse('page "Bare" id=bare {}', options),
      structuredClone(parse(existing, options)),
      parse('module m namespace=m { component Card {} page "P" id=p { use Card() } }', options),
    ]
    for (const document of invalid) expect(() => printV4Module(document)).toThrow(TypeError)
    const altered = parse(existing, options)
    altered.app.id = 'changed'
    expect(() => printV4Module(altered)).toThrow(/without changing its meaning/)
    expect(tryParse('module broken namespace=m {', options).ok).toBe(false)
  })

  it('leaves link failures to the canonical linker after a successful round-trip', () => {
    const source = firstScreen.replace("opens='detailsModal'", "opens='missingModal'")
    const printed = printV4Module(parse(source, options))
    const reparsed = parse(printed, options)
    const linked = linkApp(
      value(
        createAppBundle([reparsed], {
          id: 'review',
          entry: { namespace: 'review', id: 'review' },
          profile: reparsed.app.profile,
          registry: reparsed.registry,
          states: reparsed.states,
          fixtures: reparsed.fixtures,
          moduleSources: { review: sourceBytes(reparsed, printed) },
        }),
      ),
    )
    expect(linked.ok).toBe(false)
    expect(linked.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'WW_REFERENCE',
        messageKey: 'app.invalid-effect-target',
      }),
    )
  })

  it('leaves legacy fragment printing and formatting behavior available', () => {
    const legacy = 'page "Home" { text "Legacy" }'
    expect(printWireframe(parse(legacy))).toBe(formatWireframeCode(legacy))
    expect(formatWireframeCode(legacy)).toContain('text "Legacy"')
  })
})
