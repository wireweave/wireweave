import type { BaseNode, TopLevelNode, WireframeDocument } from '../ast/types'
import { linkApp } from './linker'
import type { AppModuleInput, AppSourceSpan } from './types'

const ORIGIN = { line: 1, column: 1, offset: 0 }

function source(node: BaseNode): AppSourceSpan {
  return {
    sourceId: 'fragment',
    location: node.loc ?? { start: ORIGIN, end: ORIGIN },
  }
}

/** Resolve local declarations before a fragment is split into boards/shells.
 * Uses the same typed-argument, slot, duplicate and cycle checks as app linking.
 * Removing nonvisual component declarations makes preparation idempotent while
 * preserving the linked invocation identities through downstream render calls.
 */
export function resolveFragmentComponents(document: WireframeDocument): WireframeDocument {
  if (!document.children.some((node) => node.type === 'Component')) return document

  const components: AppModuleInput['components'][number][] = []
  const layouts: AppModuleInput['layouts'][number][] = []
  const screens: AppModuleInput['screens'][number][] = []
  for (const node of document.children) {
    if (node.type === 'Component') {
      components.push({ id: node.name, node, source: source(node) })
    } else if (node.type === 'Layout') {
      layouts.push({ id: node.name, node, source: source(node) })
    } else if (node.type === 'Page') {
      // Inspection identity is structural, independent of duplicate display
      // titles or an authored screen ID's spelling. The node retains its ID.
      screens.push({ id: String(screens.length), node, source: source(node) })
    }
  }
  const linked = linkApp(
    {
      id: 'fragment',
      sourceId: 'fragment',
      modules: [{ id: 'fragment', namespace: 'fragment', location: source(document).location }],
    },
    [{ id: 'fragment', source: source(document), components, layouts, screens }],
  )
  if (!linked.ok) {
    throw Object.assign(
      new Error(linked.diagnostics.map((entry) => `[${entry.code}] ${entry.message}`).join('\n')),
      { diagnostics: linked.diagnostics },
    )
  }
  const resolvedLayouts = new Map(linked.document.layouts.map((entry) => [entry.id, entry.node]))
  const resolvedScreens = new Map(linked.document.screens.map((entry) => [entry.id, entry.node]))
  let screenIndex = 0
  return {
    ...document,
    children: document.children.flatMap<TopLevelNode>((node) => {
      if (node.type === 'Component') return []
      if (node.type === 'Layout') return [resolvedLayouts.get(node.name) ?? node]
      if (node.type === 'Page') return [resolvedScreens.get(String(screenIndex++)) ?? node]
      return [node]
    }),
  }
}
