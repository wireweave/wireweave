import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import languageSchema from '../../../../docs/spec/schema.json'
import {
  getV4SourceSpan,
  parse,
  tryParse,
  V4ParseError,
  type ParsedDocument,
  type CanonicalPrimitive,
  type CanonicalDefinition,
} from './index'
import { digestV4 } from './v4-lexical'

const options = { languageVersion: '4.0.0', sourceId: 'test.wf' }
const corpus = JSON.parse(
  readFileSync(new URL('../../../../docs/spec/examples.json', import.meta.url), 'utf8'),
) as {
  valid: {
    id: string
    source: string
    moduleSources: Record<string, string>
    value: Omit<ParsedDocument, 'app'> & ParsedDocument['app']
  }[]
  syntaxInvalid: { id: string; source: string; expectedDiagnostic: string }[]
}
const digest = (source: string): string =>
  `sha256:${createHash('sha256').update(source, 'utf8').digest('hex')}`
const page = (body = '', attrs = ''): string => `page "Home" id=home ${attrs} { ${body} }`
const app = (attrs = '', body = page()): string =>
  `app demo entry={namespace=main,id=home} ${attrs} { module main namespace=main { ${body} } }`
const firstPage = (source: string): CanonicalPrimitive =>
  parse(source, options).modules[0].definitions[0] as CanonicalPrimitive

describe('4.0 canonical parser contract corpus', () => {
  it.each(corpus.valid)(
    '$id has the exact normalized contract value through parse and tryParse',
    (fixture) => {
      const { id, entry, profile, ...bundle } = fixture.value
      const expected = { ...bundle, app: { id, entry, profile } }
      expect(parse(fixture.source, options)).toEqual(expected)
      expect(tryParse(fixture.source, options)).toEqual({
        ok: true,
        value: expected,
        diagnostics: [],
      })
      for (const module of parse(fixture.source, options).modules) {
        expect(module.sourceDigest).toBe(digest(fixture.moduleSources[module.id]))
      }
    },
  )

  it('materializes an empty fragment without inventing an entry', () => {
    const result = parse('', options)
    expect(result.modules).toEqual([
      {
        id: 'main',
        namespace: 'main',
        sourceDigest: digest(''),
        definitions: [],
        imports: [],
        exports: [],
      },
    ])
    expect(result.states).toEqual([])
    expect(result.fixtures).toEqual([])
    expect(result.registry).toEqual({ schemaVersion: '1.0.0', entries: [], digest: digest('[]') })
    expect(result.app).toEqual({
      id: 'main',
      profile: {
        id: 'neutral-app',
        width: 1440,
        height: 900,
        language: 'en',
        entryPolicy: 'explicit',
        unknownRoute: 'error-view',
        clockStartMs: 0,
        limits: 'standard-1',
        unicodeVersion: '15.1.0',
        assets: [],
      },
    })
  })

  it.each(corpus.syntaxInvalid)(
    '$id returns the authored syntax diagnostic',
    ({ source, expectedDiagnostic }) => {
      const result = tryParse(source, options)
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('Expected failure')
      expect(result.value).toBeNull()
      expect(result.diagnostics[0]).toMatchObject({
        code: expectedDiagnostic,
        sourceId: 'test.wf',
        severity: 'error',
      })
    },
  )
})

describe('4.0 normalization and original source metadata', () => {
  it('preserves module bytes and UTF-16 positions across BOM, CRLF, comments, and Unicode labels', () => {
    const moduleSource =
      'module main namespace=main {\r\n  page "화면 😀" id=home {\r\n    text "e\\u0301"\r\n  }\r\n}'
    const source = `\ufeff// file comment\r\nlanguage "4.0.0";\r\n /* gap */ ${moduleSource}\r\n// end`
    const result = parse(source, options)
    const module = result.modules[0]
    const child = (module.definitions[0] as CanonicalPrimitive).children[0] as CanonicalPrimitive
    expect(module.sourceDigest).toBe(digest(moduleSource))
    expect(getV4SourceSpan(module)).toMatchObject({
      sourceId: 'test.wf',
      start: source.indexOf('module'),
      end: source.indexOf('module') + moduleSource.length,
      startLine: 3,
    })
    expect(getV4SourceSpan(child)).toMatchObject({
      start: source.indexOf('text'),
      end: source.indexOf('text') + 'text "e\\u0301"'.length,
      startLine: 5,
      startColumn: 5,
    })
    expect(child.label).toBe('e\u0301')
    expect(JSON.stringify(result)).not.toContain('sourceId')
    expect(Object.isFrozen(getV4SourceSpan(child))).toBe(true)
  })

  it('hashes the entire original file for bare definitions and retains identifier provenance', () => {
    const source =
      '\ufeff// before\r\npage "Anonymous" { use Card }\r\ncomponent Card { text "Card" }\r\n'
    const result = parse(source, options)
    const screen = result.modules[0].definitions[0] as CanonicalPrimitive
    const use = screen.children[0]
    expect(result.modules[0].sourceDigest).toBe(digest(source))
    expect(getV4SourceSpan(screen)?.authoredId).toBe(false)
    expect(getV4SourceSpan(use)?.authoredId).toBe(false)
    expect(use).toMatchObject({
      kind: 'use',
      id: expect.stringMatching(/^_inspection_/),
      name: 'Card',
    })
  })

  it('normalizes numeric lexical priority, units, booleans, and negative zero', () => {
    const nodes = firstPage('page { text "Size" size=2xl w=2em h=1e3 muted=true x=-0 }').children
    expect(nodes[0]).toMatchObject({
      attributes: { size: '2xl', w: { value: 2, unit: 'em' }, h: 1000, muted: true, x: 0 },
    })
    expect(Object.is((nodes[0] as CanonicalPrimitive).attributes.x, -0)).toBe(false)
  })

  it('preserves compile-time parameter values, empty fills, slot boundaries, and repeat sites', () => {
    const source =
      'layout shell { slot\n footer {} }\ncomponent Card(title:string="Card", count:number=0,) { slot actions; text "$title" }\n' +
      'component Outer(title:string) { use Card(title="$title",count=2,) id=child { fill actions {} } }\n' +
      'page id=home uses=shell { repeat 2 id=cards { use Outer(title="Order") id=order } }'
    const definitions = parse(source, options).modules[0].definitions
    expect(definitions[0].children.map((node) => node.kind)).toEqual(['slot', 'footer'])
    expect((definitions[1] as CanonicalDefinition).parameters).toEqual([
      { id: 'title', type: 'string', default: 'Card' },
      { id: 'count', type: 'number', default: 0 },
    ])
    expect(definitions[2].children[0]).toMatchObject({
      kind: 'use',
      id: 'child',
      inputs: { title: { param: 'title' }, count: { literal: 2 } },
      fills: [{ name: 'actions', children: [] }],
    })
    expect(definitions[3].children[0]).toMatchObject({ kind: 'repeat', id: 'cards', count: 2 })
  })

  it('normalizes equivalent array/block collections without competing representations', () => {
    const array = firstPage(
      page(
        'table [["Name","Count"],["A",1]] select "Country" ["KR","JP"] list ["A","B"] tabs ["One","Two"]',
      ),
    ).children
    const blocks = firstPage(
      page(
        'table { columns ["Name","Count"] row ["A",1] } select "Country" { option "KR" option "JP" } list { item "A" item "B" } tabs { tab "One" {} tab "Two" {} }',
      ),
    ).children
    expect(array).toEqual(blocks)
    const items = firstPage(page('dropdown ["Edit","---","Delete"] nav ["divider"]')).children
    expect((items[0] as CanonicalPrimitive).children.map((node) => node.kind)).toEqual([
      'dropdown-item',
      'divider',
      'dropdown-item',
    ])
    expect((items[1] as CanonicalPrimitive).children[0]).toMatchObject({
      kind: 'nav-item',
      label: 'divider',
    })
  })

  it('retains data keys as own properties without prototype mutation', () => {
    const source = app(
      'states=[{id=record,type=record,initial={"__proto__"={polluted=true},constructor="own"},lifetime=session,sensitive=false}]',
    )
    const state = parse(source, options).states[0]
    expect(Object.hasOwn(state.initial as object, '__proto__')).toBe(true)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    expect((state.initial as Record<string, unknown>).constructor).toBe('own')
  })
})

describe('4.0 element attribute admission', () => {
  it.each([
    ['row', 'row order=-2 {}', { order: -2 }],
    ['row', 'row order=0 {}', { order: 0 }],
    ['tab', 'tabs "Views" { tab "One" disabled {} }', { disabled: true }],
    ['tab', 'tabs "Views" { tab "One" disabled=false {} }', { disabled: false }],
    ['tabs', 'tabs "Views" vertical { tab "One" {} }', { vertical: true }],
    ['tabs', 'tabs "Views" vertical=false { tab "One" {} }', { vertical: false }],
  ] as const)('normalizes typed %s attributes in %s', (kind, body, attributes) => {
    const root = firstPage(page(body)).children[0] as CanonicalPrimitive
    const node = kind === 'tab' ? (root.children[0] as CanonicalPrimitive) : root
    expect(node.kind).toBe(kind)
    expect(node.attributes).toMatchObject(attributes)
    expect(tryParse(page(body), options).ok).toBe(true)
  })

  it.each([
    'row order=1.5 {}',
    'row order=true {}',
    'row order="first" {}',
    'row disabled=true {}',
    'tabs "Views" vertical="yes" { tab "One" {} }',
    'tabs "Views" { tab "One" disabled="no" {} }',
    'button "Wrong kind" vertical=true',
  ])('keeps type and element restrictions for %s', (body) => {
    const result = tryParse(page(body), options)
    expect(result.ok).toBe(false)
    if (result.ok) throw Error('Expected invalid authored attributes')
    expect(result.value).toBeNull()
    expect(result.diagnostics[0].code).toBe('WW_SCHEMA')
    expect(result.diagnostics[0].path).toContain('/attributes/')
  })

  it('keeps completion membership equal to every primitive schema allowlist', () => {
    const rules = languageSchema.$defs.PrimitiveNode.allOf as {
      if?: { properties: { kind: { const: string } } }
      then?: { properties: { attributes: { propertyNames: { enum: string[] } } } }
    }[]
    const vocabulary: Record<string, { attributes: string[] }> = languageSchema['x-vocabulary']
    for (const rule of rules) {
      const kind = rule.if?.properties.kind.const
      const allowed = rule.then?.properties.attributes.propertyNames.enum
      if (!kind || !allowed) continue
      expect(vocabulary[kind], kind).toBeDefined()
      expect(
        [...new Set(vocabulary[kind].attributes.filter((name) => name !== 'id'))].sort(),
        kind,
      ).toEqual([...allowed].sort())
    }
  })
})

describe('4.0 authored failures fail closed', () => {
  const failures: [string, string, string][] = [
    ['wrong language header', 'language "5.0.0" page {}', 'WW_VERSION'],
    ['language number', 'language 4 page {}', 'WW_SYNTAX'],
    ['missing app entry', 'app demo { module main namespace=main {} }', 'WW_SCHEMA'],
    [
      'wrong app member',
      'app demo entry={namespace=main,id=home} { page id=home {} }',
      'WW_SYNTAX',
    ],
    ['unknown app attribute', app('typo=true'), 'WW_UNKNOWN_ATTRIBUTE'],
    ['bad entry shape', 'app demo entry=home {}', 'WW_SCHEMA'],
    ['missing module namespace', 'module main { page {} }', 'WW_SYNTAX'],
    ['module name string', 'module "main" namespace=main {}', 'WW_SYNTAX'],
    ['module body node', 'module main namespace=main { text "Bad" }', 'WW_SYNTAX'],
    ['multiple module documents', 'module a namespace=a {} module b namespace=b {}', 'WW_SYNTAX'],
    ['missing page block', 'page id=home', 'WW_SYNTAX'],
    ['page body declaration', 'page { page {} }', 'WW_SYNTAX'],
    ['invalid page ID', 'page id="bad.id" {}', 'WW_SCHEMA'],
    ['reserved page ID', 'page id=button {}', 'WW_SCHEMA'],
    ['unknown attribute', page('button typo=true'), 'WW_UNKNOWN_ATTRIBUTE'],
    ['wrong boolean', page('button disabled="yes"'), 'WW_SCHEMA'],
    ['wrong element attribute', page('text checked=true'), 'WW_SCHEMA'],
    ['duplicate attribute', page('button disabled=true disabled=true'), 'WW_DUPLICATE_KEY'],
    ['duplicate object key', app('states=[] states=[]'), 'WW_DUPLICATE_KEY'],
    ['duplicate nested key', app('states=[{id=x,id=x}]'), 'WW_DUPLICATE_KEY'],
    ['duplicate positional label', page('button "Send" label="Send"'), 'WW_DUPLICATE_KEY'],
    ['duplicate image source', page('image "a" src="a"'), 'WW_DUPLICATE_KEY'],
    ['duplicate coordinate', page('text x=1 at(1,2)'), 'WW_DUPLICATE_KEY'],
    ['duplicate parameter', 'component Card(a:string,a:number) {}', 'WW_DUPLICATE_KEY'],
    ['invalid parameter default', 'component Card(a:number="one") {}', 'WW_SCHEMA'],
    ['duplicate argument', page('use Card(a=1,a=2)'), 'WW_DUPLICATE_KEY'],
    ['duplicate fill', page('use Card { fill actions {} fill actions {} }'), 'WW_DUPLICATE_KEY'],
    ['slot outside template', page('slot'), 'WW_SYNTAX'],
    ['missing slot terminator', 'layout shell { slot footer {} }', 'WW_SYNTAX'],
    ['leaf block', page('button "Send" {}'), 'WW_SYNTAX'],
    ['nested form', page('form { form {} }'), 'WW_SYNTAX'],
    ['nonfinite number', page('progress value=1e999'), 'WW_SYNTAX'],
    ['unsafe repeat integer', page('repeat 9007199254740992 {}'), 'WW_SYNTAX'],
    ['repeat maximum', page('repeat 1001 {}'), 'WW_SCHEMA'],
    ['mismatched table row', page('table [["A","B"],[1]]'), 'WW_SCHEMA'],
    ['object table cell', page('table [["A"],[{x=1}]]'), 'WW_SCHEMA'],
    ['table data conflict', page('table [["A"],[1]] data={state="app:rows"}'), 'WW_SCHEMA'],
    ['competing select', page('select ["A"] options=["A"]'), 'WW_DUPLICATE_KEY'],
    ['competing list', page('list ["A"] { item "A" }'), 'WW_SYNTAX'],
    ['mismatched tabs', page('tabs ["A"] { tab "B" {} }'), 'WW_SYNTAX'],
    [
      'wrong initial state',
      app('states=[{id=x,type=number,initial="one",lifetime=session,sensitive=false}]'),
      'WW_SCHEMA',
    ],
    [
      'wrong operation class',
      page(
        'button on=[{id=click,event=click,concurrency=drop,operations=[{id=auth,executionClass=executable,effect={kind=simulate,fixtureRef=auth,resultState="app:result",statusState="app:status",errorState="app:error",timeoutMs=5000},after=[],onFailure=stop,obligationRefs=[]}]}]',
      ),
      'WW_SCHEMA',
    ],
    [
      'unknown effect',
      page(
        'button on=[{id=click,event=click,concurrency=drop,operations=[{id=go,executionClass=executable,effect={kind=eval},after=[],onFailure=stop,obligationRefs=[]}]}]',
      ),
      'WW_SCHEMA',
    ],
    [
      'specified effect without obligation',
      page(
        'button on=[{id=click,event=click,concurrency=drop,operations=[{id=go,executionClass=specified,effect={kind=specify},after=[],onFailure=stop,obligationRefs=[]}]}]',
      ),
      'WW_SCHEMA',
    ],
    ['wrong guard shape', page('button visibleWhen={op=eq,left={literal=1}}'), 'WW_SCHEMA'],
    [
      'negative fixture delay',
      app(
        'fixtures=[{id=x,steps=[{delayMs=-1,result={kind=success,value=null}}],exhaustion=error}]',
      ),
      'WW_SCHEMA',
    ],
    [
      'invalid registry envelope',
      app('registry={schemaVersion="1.0.0",entries=[],digest="no"}'),
      'WW_SCHEMA',
    ],
    ['unterminated comment', '/* not closed', 'WW_SYNTAX'],
    ['escaped lone surrogate', 'page "\\uD800" {}', 'WW_ENCODING'],
    ['raw lone surrogate', 'page "\uD800" {}', 'WW_ENCODING'],
    ['trailing escape', 'page "broken\\', 'WW_SYNTAX'],
    ['invalid value syntax', page('text value={x:1}'), 'WW_SYNTAX'],
  ]
  it.each(failures)(
    '%s returns a stable diagnostic and no partial value',
    (_name, source, code) => {
      const result = tryParse(source, options)
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('Expected authored failure')
      expect(result.value).toBeNull()
      const diagnostic = result.diagnostics[0]
      expect(diagnostic).toMatchObject({ severity: 'error', code, sourceId: 'test.wf' })
      expect(diagnostic.start).toBeGreaterThanOrEqual(0)
      expect(diagnostic.end).toBeGreaterThanOrEqual(diagnostic.start)
      expect(diagnostic.end).toBeLessThanOrEqual(source.length)
      expect(() => parse(source, options)).toThrow(V4ParseError)
    },
  )

  it('reports a duplicate at the second authored key', () => {
    const source = '\ufeffpage id=home {\r\n button disabled=true disabled=true\r\n}'
    const result = tryParse(source, options)
    if (result.ok) throw new Error('Expected duplicate')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'WW_DUPLICATE_KEY',
      start: source.lastIndexOf('disabled'),
      end: source.lastIndexOf('disabled') + 8,
    })
  })

  it('rejects a zero viewport at the authored profile field', () => {
    const source = corpus.valid[0].source.replace('width=1440', 'width=0')
    expect(source).toContain('width=0')
    const result = tryParse(source, options)
    if (result.ok) throw new Error('Expected profile failure')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'WW_SCHEMA',
      path: '/app/profile/width',
      start: source.indexOf('width=0'),
      end: source.indexOf('width=0') + 5,
    })
  })

  it('points to an unpaired surrogate in the original source', () => {
    const source = '// comment\r\npage "bad\uD800" {}'
    const result = tryParse(source, options)
    if (result.ok) throw new Error('Expected encoding failure')
    expect(result.diagnostics[0]).toMatchObject({
      code: 'WW_ENCODING',
      start: source.indexOf('\uD800'),
      end: source.indexOf('\uD800') + 1,
    })
  })

  it('rejects excessive nesting with an authored limit instead of RangeError', () => {
    const source = page('card {'.repeat(129) + '}'.repeat(129))
    const result = tryParse(source, options)
    expect(result).toMatchObject({ ok: false, value: null, diagnostics: [{ code: 'WW_LIMIT' }] })
  })

  it('rejects an explicitly unsupported version and keeps programmer failures distinct', () => {
    expect(tryParse('', { languageVersion: '5.0.0' })).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'WW_VERSION' }],
    })
    expect(() => tryParse(42 as unknown as string, options)).toThrow(TypeError)
    expect(() => tryParse('', { ...options, sourceId: '' })).toThrow(TypeError)
  })
})

describe('compatibility and browser-safe digest', () => {
  it('keeps the existing unversioned parser AST and result contract', () => {
    expect(parse('page "Legacy" { text "Hello" }')).toMatchObject({ type: 'Document' })
    expect(tryParse('page "Legacy" {}')).toMatchObject({ success: true, errors: [] })
    expect(tryParse('page "Broken')).toMatchObject({ success: false, document: null })
  })

  it.each([
    '',
    'abc',
    '한글😀',
    '\ufeffpage {}\r\n',
    ...[55, 56, 63, 64, 65, 1000].map((count) => 'x'.repeat(count)),
  ])('matches the independent platform SHA-256 oracle for %j', (source) => {
    expect(digestV4(source)).toBe(digest(source))
  })
})
