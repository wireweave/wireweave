import { describe, expect, it } from 'vitest'

import {
  createAppNodeId,
  linkApp,
  parse,
  type AppComponentInput,
  type AppLayoutInput,
  type AppManifest,
  type AppModuleInput,
  type AppReferenceInput,
  type AppScreenInput,
  type AppSourceSpan,
  type SourceLocation,
} from '../src'

function location(line: number, offset: number): SourceLocation {
  return {
    start: { line, column: 1, offset },
    end: { line, column: 8, offset: offset + 7 },
  }
}

function source(sourceId: string, line: number, offset: number): AppSourceSpan {
  return { sourceId, location: location(line, offset) }
}

function manifest(entries: readonly { id: string; namespace: string }[]): AppManifest {
  return {
    id: 'example-app',
    sourceId: 'app.json',
    modules: entries.map((entry, index) => ({
      ...entry,
      location: location(index + 1, index * 10),
    })),
  }
}

function layout(
  id: string,
  line: number,
  references: readonly AppReferenceInput[] = [],
): AppLayoutInput {
  return {
    id,
    node: { type: 'Layout', name: id, children: [] },
    source: source('module.wf', line, line * 10),
    references,
  }
}

function component(
  id: string,
  line: number,
  references: readonly AppReferenceInput[] = [],
): AppComponentInput {
  return {
    id,
    node: { type: 'Component', name: id, children: [] },
    source: source('module.wf', line, line * 10),
    references,
  }
}

function screen(
  id: string,
  line: number,
  references: readonly AppReferenceInput[] = [],
): AppScreenInput {
  return {
    id,
    node: { type: 'Page', id, title: id, children: [] },
    source: source('screen.wf', line, line * 10),
    references,
  }
}

function moduleInput(
  id: string,
  values: {
    layouts?: readonly AppLayoutInput[]
    components?: readonly AppComponentInput[]
    screens?: readonly AppScreenInput[]
  },
): AppModuleInput {
  return {
    id,
    source: source(`${id}.wf`, 1, 0),
    layouts: values.layouts ?? [],
    components: values.components ?? [],
    screens: values.screens ?? [],
  }
}

function reference(
  kind: 'layout' | 'component',
  id: string,
  line: number,
  namespace?: string,
): AppReferenceInput {
  return {
    kind,
    id,
    ...(namespace === undefined ? {} : { namespace }),
    source: source('references.wf', line, line * 10),
  }
}

function parsedModule(id: string, sourceText: string): AppModuleInput {
  const document = parse(sourceText)
  const span = (node: { loc?: SourceLocation }): AppSourceSpan => ({
    sourceId: `${id}.wf`,
    location: node.loc ?? location(1, 0),
  })
  return {
    id,
    source: span(document),
    layouts: document.children.flatMap((node) =>
      node.type === 'Layout' ? [{ id: node.name, node, source: span(node) }] : [],
    ),
    components: document.children.flatMap((node) =>
      node.type === 'Component' ? [{ id: node.name, node, source: span(node) }] : [],
    ),
    screens: document.children.flatMap((node) =>
      node.type === 'Page' ? [{ id: node.id ?? 'home', node, source: span(node) }] : [],
    ),
  }
}

describe('Core app module linker', () => {
  it('links modules in manifest order with stable namespaces, identities, and source maps', () => {
    const shared = moduleInput('shared', {
      layouts: [layout('shell', 2, [reference('component', 'nav', 2)])],
      components: [component('nav', 4)],
    })
    const account = moduleInput('account', {
      screens: [
        screen('home', 3, [
          reference('layout', 'shell', 3, 'shared/ui'),
          reference('component', 'nav', 3, 'shared/ui'),
        ]),
      ],
    })

    const result = linkApp(
      manifest([
        { id: 'shared', namespace: 'shared/ui' },
        { id: 'account', namespace: 'account' },
      ]),
      [account, shared],
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected a linked app')

    expect(result.document.modules.map(({ id, namespace }) => ({ id, namespace }))).toEqual([
      { id: 'shared', namespace: 'shared/ui' },
      { id: 'account', namespace: 'account' },
    ])
    expect(result.document.layouts[0]?.nodeId).toBe('shared%2Fui:layout:shell')
    expect(result.document.components[0]?.nodeId).toBe('shared%2Fui:component:nav')
    expect(result.document.screens[0]?.references.map((item) => item.targetId)).toEqual([
      createAppNodeId('shared/ui', 'layout', 'shell'),
      createAppNodeId('shared/ui', 'component', 'nav'),
    ])
    expect(result.document.sourceMap).toEqual([
      {
        nodeId: createAppNodeId('shared/ui', 'layout', 'shell'),
        source: shared.layouts[0]?.source,
      },
      {
        nodeId: createAppNodeId('shared/ui', 'component', 'nav'),
        source: shared.components[0]?.source,
      },
      {
        nodeId: createAppNodeId('account', 'screen', 'home'),
        source: account.screens[0]?.source,
      },
    ])
  })

  it.each(['layout', 'component'] as const)(
    'refuses duplicate %s definitions at the second declaration location',
    (kind) => {
      const definitions =
        kind === 'layout'
          ? { layouts: [layout('duplicate', 2), layout('duplicate', 7)] }
          : { components: [component('duplicate', 2), component('duplicate', 7)] }
      const result = linkApp(manifest([{ id: 'broken', namespace: 'broken' }]), [
        moduleInput('broken', definitions),
      ])

      expect(result).toMatchObject({
        ok: false,
        document: null,
        diagnostics: [
          {
            code: 'duplicate-definition',
            source: { sourceId: 'module.wf', location: { start: { line: 7 } } },
          },
        ],
      })
    },
  )

  it.each(['layout', 'component'] as const)(
    'refuses a missing %s reference at the reference location',
    (kind) => {
      const result = linkApp(manifest([{ id: 'broken', namespace: 'broken' }]), [
        moduleInput('broken', { screens: [screen('home', 2, [reference(kind, 'absent', 9)])] }),
      ])

      expect(result).toMatchObject({
        ok: false,
        document: null,
        diagnostics: [
          {
            code: 'missing-reference',
            message: `Missing ${kind} reference "broken:absent"`,
            source: { sourceId: 'references.wf', location: { start: { line: 9 } } },
          },
        ],
      })
    },
  )

  it('refuses mixed layout/component cycles with deterministic diagnostics', () => {
    const cyclic = moduleInput('cyclic', {
      layouts: [layout('shell', 2, [reference('component', 'nav', 8)])],
      components: [component('nav', 4, [reference('layout', 'shell', 6)])],
    })
    const appManifest = manifest([{ id: 'cyclic', namespace: 'app' }])

    const first = linkApp(appManifest, [cyclic])
    const second = linkApp(appManifest, [cyclic])

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      ok: false,
      document: null,
      diagnostics: [
        {
          code: 'cyclic-reference',
          message: 'Cyclic layout/component reference among app:component:nav, app:layout:shell',
          source: { sourceId: 'references.wf', location: { start: { line: 6 } } },
        },
      ],
    })
  })

  it('sorts independent diagnostics by source location instead of traversal order', () => {
    const result = linkApp(manifest([{ id: 'broken', namespace: 'app' }]), [
      moduleInput('broken', {
        screens: [
          screen('home', 2, [reference('layout', 'late', 12), reference('component', 'early', 3)]),
        ],
      }),
    ])

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Missing component reference "app:early"',
      'Missing layout reference "app:late"',
    ])
  })

  it.each([
    {
      name: 'a direct invocation cycle used by a screen',
      sourceText: `component recursive {
  use recursive()
}
page "Home" id=home { use recursive() }`,
      members: 'app:component:recursive',
    },
    {
      name: 'an indirect cycle nested below ordinary children',
      sourceText: `component first {
  section { card { use second() } }
}
component second { use first() }
page "Home" id=home { use first() }`,
      members: 'app:component:first, app:component:second',
    },
    {
      name: 'a recursive invocation inside a named fill',
      sourceText: `component recursive {
  use frame() { fill body { section { use recursive() } } }
}
component frame { slot body }
page "Home" id=home { use recursive() }`,
      members: 'app:component:recursive',
    },
    {
      name: 'a cycle in definitions no screen uses',
      sourceText: `component first {
  use second()
}
component second { use first() }
page "Home" id=home { text "Independent screen" }`,
      members: 'app:component:first, app:component:second',
    },
  ])('rejects $name before expansion', ({ sourceText, members }) => {
    const module = parsedModule('cycle', sourceText)
    const before = structuredClone(module)
    const appManifest = manifest([{ id: 'cycle', namespace: 'app' }])

    const first = linkApp(appManifest, [module])
    const second = linkApp(appManifest, [module])

    expect(second).toEqual(first)
    expect(first).toMatchObject({
      ok: false,
      document: null,
      diagnostics: [
        {
          code: 'cyclic-reference',
          message: `Cyclic layout/component reference among ${members}`,
          source: { sourceId: 'cycle.wf', location: { start: { line: 2 } } },
        },
      ],
    })
    expect(first.diagnostics).toHaveLength(1)
    expect(module).toEqual(before)
  })

  it('reports cross-module invocation cycles identically for either module input order', () => {
    const left = parsedModule(
      'left',
      `component first { use second() from="right" }
page "Home" id=home { use first() }`,
    )
    const right = parsedModule('right', 'component second { use first() from="left" }')
    const appManifest = manifest([
      { id: 'left', namespace: 'left' },
      { id: 'right', namespace: 'right' },
    ])

    const first = linkApp(appManifest, [left, right])
    expect(linkApp(appManifest, [right, left])).toEqual(first)
    expect(first).toMatchObject({
      ok: false,
      document: null,
      diagnostics: [
        {
          code: 'cyclic-reference',
          message:
            'Cyclic layout/component reference among left:component:first, right:component:second',
          source: { sourceId: 'left.wf', location: { start: { line: 1 } } },
        },
      ],
    })
  })

  it('diagnoses a 6,000-definition cycle without exhausting the JavaScript call stack', () => {
    const count = 6_000
    const components = Array.from({ length: count }, (_, index) => {
      const definition = component(`c${index}`, index + 1)
      definition.node.children.push({
        type: 'ComponentUse',
        name: `c${(index + 1) % count}`,
        inputs: {},
        fills: [],
      })
      return definition
    })
    const result = linkApp(manifest([{ id: 'deep', namespace: 'app' }]), [
      moduleInput('deep', { components }),
    ])

    expect(result.ok).toBe(false)
    expect(result.document).toBeNull()
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0]).toMatchObject({
      code: 'cyclic-reference',
      source: { sourceId: 'module.wf', location: { start: { line: 1 } } },
    })
  })
})
