import { describe, expect, it } from 'vitest'

import {
  compileApp,
  linkAndCompileApp,
  parse,
  type AppManifest,
  type AppModuleInput,
  type AppSourceSpan,
  type ComponentUseNode,
  type LayoutDefinitionNode,
  type PageNode,
  type SourceLocation,
} from '../src'

function count(value: string, needle: string): number {
  return value.split(needle).length - 1
}

function location(line: number, offset: number): SourceLocation {
  return {
    start: { line, column: 1, offset },
    end: { line, column: 2, offset: offset + 1 },
  }
}

function source(sourceId: string, node: { loc?: SourceLocation }): AppSourceSpan {
  return { sourceId, location: node.loc ?? location(1, 0) }
}

function inputs(): { manifest: AppManifest; modules: AppModuleInput[] } {
  const sharedSource = `component badge(label: string) { card { text "$label" } }
layout shell {
  header { title "Shared shell" }
  slot
  footer { use badge(label="Shared footer") }
}`
  const screensSource = `page "One" id=one uses=shell { use badge(label="First") }
page "Two" id=two uses=shell { use badge(label="Second") }
page "Three" id=three uses=shell { use badge(label="Third") }`
  const sharedDocument = parse(sharedSource)
  const screensDocument = parse(screensSource)
  const layout = sharedDocument.children.find(
    (node): node is LayoutDefinitionNode => node.type === 'Layout',
  )
  const component = sharedDocument.children.find((node) => node.type === 'Component')
  const screens = screensDocument.children.filter((node): node is PageNode => node.type === 'Page')
  if (layout === undefined || component === undefined)
    throw new Error('expected shared definitions')

  for (const screen of screens) {
    const use = screen.children[0] as ComponentUseNode
    use.namespace = 'shared'
  }

  const sharedId = 'shared.wf'
  const screensId = 'screens.wf'
  const manifest: AppManifest = {
    id: 'three-screen-app',
    sourceId: 'wireweave.app.json',
    modules: [
      { id: 'shared', namespace: 'shared', location: location(1, 0) },
      { id: 'screens', namespace: 'app', location: location(2, 10) },
    ],
  }
  const modules: AppModuleInput[] = [
    {
      id: 'shared',
      source: source(sharedId, layout),
      layouts: [{ id: layout.name, node: layout, source: source(sharedId, layout) }],
      components: [{ id: component.name, node: component, source: source(sharedId, component) }],
      screens: [],
    },
    {
      id: 'screens',
      source: source(screensId, screens[0] ?? {}),
      layouts: [],
      components: [],
      screens: screens.map((screen) => ({
        id: screen.id ?? screen.title ?? 'screen',
        node: screen,
        source: source(screensId, screen),
        references: [
          {
            kind: 'layout',
            id: 'shell',
            namespace: 'shared',
            source: source(screensId, screen),
          },
        ],
      })),
    },
  ]
  return { manifest, modules }
}

function parsedInputs(sources: Readonly<Record<string, string>>): {
  manifest: AppManifest
  modules: AppModuleInput[]
} {
  const modules = Object.entries(sources).map(([id, text]): AppModuleInput => {
    const document = parse(text)
    return {
      id,
      source: source(`${id}.wf`, document),
      layouts: document.children.flatMap((node) =>
        node.type === 'Layout' ? [{ id: node.name, node, source: source(`${id}.wf`, node) }] : [],
      ),
      components: document.children.flatMap((node) =>
        node.type === 'Component'
          ? [{ id: node.name, node, source: source(`${id}.wf`, node) }]
          : [],
      ),
      screens: document.children.flatMap((node) =>
        node.type === 'Page'
          ? [{ id: node.id ?? 'home', node, source: source(`${id}.wf`, node) }]
          : [],
      ),
    }
  })
  return {
    manifest: {
      id: 'reuse-app',
      sourceId: 'app.json',
      modules: modules.map((module) => ({
        id: module.id,
        namespace: module.id,
        location: module.source.location,
      })),
    },
    modules,
  }
}

describe('Core application compiler', () => {
  it('emits one deterministic document for 3+ screens with shared layout and components', () => {
    const { manifest, modules } = inputs()
    const first = linkAndCompileApp(manifest, [...modules].reverse())
    const second = linkAndCompileApp(manifest, modules)
    expect(first.ok).toBe(true)
    expect(second).toEqual(first)
    if (!first.ok) return

    const html = first.html
    expect(compileApp(first.document)).toBe(html)
    expect(count(html, '<!DOCTYPE html>')).toBe(1)
    expect(count(html, '<style>')).toBe(1)
    expect(count(html, '<script>')).toBe(1)
    expect(count(html, 'var R = ')).toBe(1)
    expect(count(html, 'data-layout="shared:layout:shell"')).toBe(1)
    expect(count(html, 'data-screen="')).toBe(3)
    expect(count(html, 'data-wf-instance="')).toBe(4)
    expect(count(html, 'Shared shell')).toBe(1)
    expect(count(html, 'Shared footer')).toBe(1)
    expect(html).toContain('background: #000000')
    expect(html).not.toContain('#3b82f6')
  })

  it('is self-contained and does not emit host screen or arrow controls', () => {
    const { manifest, modules } = inputs()
    const result = linkAndCompileApp(manifest, modules)
    if (!result.ok) throw new Error('expected application to compile')

    expect(result.html).not.toContain('<link')
    expect(result.html).not.toMatch(/<script[^>]+>/)
    expect(result.html).not.toContain('@import')
    expect(result.html).not.toContain('<select')
    expect(result.html).not.toContain('screen-picker')
    expect(result.html).not.toContain('wf-arrow')
  })

  it('preserves deterministic linker diagnostics without partial HTML', () => {
    const { manifest, modules } = inputs()
    const broken = linkAndCompileApp(
      manifest,
      modules.filter((module) => module.id !== 'shared'),
    )

    expect(broken).toMatchObject({
      ok: false,
      document: null,
      html: null,
    })
    expect(broken.diagnostics.map((diagnostic) => diagnostic.code)).toContain('missing-module')
  })

  it.each([
    'component recursive { use recursive() }\npage "Home" id=home { use recursive() }',
    `component first { section { use second() } }
component second { use first() }
page "Home" id=home { use first() }`,
    'component unused { use unused() }\npage "Home" id=home { text "Valid screen" }',
  ])('returns a cycle diagnostic and no HTML for recursive source %#', (text) => {
    const { manifest, modules } = parsedInputs({ app: text })
    const result = linkAndCompileApp(manifest, modules)

    expect(result).toMatchObject({
      ok: false,
      document: null,
      html: null,
      diagnostics: [{ code: 'cyclic-reference', source: { sourceId: 'app.wf' } }],
    })
    expect(result.diagnostics).toHaveLength(1)
  })

  it('expands shared definition references in their declaring namespace', () => {
    const { manifest, modules } = parsedInputs({
      shared: `component badge { text "Shared badge" }
component frame { use badge()\nslot body }`,
      app: `component badge {
  use frame() from="shared" { fill body { text "Caller content" } }
}
page "One" id=one { use badge() }
page "Two" id=two { use badge() }`,
    })
    const before = structuredClone(modules)
    const result = linkAndCompileApp(manifest, modules)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected acyclic shared components to compile')
    expect(linkAndCompileApp(manifest, [...modules].reverse())).toEqual(result)
    expect(count(result.html, 'Shared badge')).toBe(2)
    expect(count(result.html, 'Caller content')).toBe(2)
    expect(count(result.html, 'data-wf-instance="')).toBe(6)
    expect(modules).toEqual(before)
  })

  it('keeps caller-authored fill references in the caller namespace', () => {
    const { manifest, modules } = parsedInputs({
      shared: `component leaf { text "Shared leaf" }
component frame { slot body }`,
      app: `component leaf { text "Caller leaf" }
page "Home" id=home {
  use frame() from="shared" { fill body { use leaf() } }
}`,
    })
    const result = linkAndCompileApp(manifest, modules)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected caller-owned fill to compile')
    expect(result.html).toContain('Caller leaf')
    expect(result.html).not.toContain('Shared leaf')
    expect(count(result.html, 'data-wf-instance="')).toBe(2)
  })
})
