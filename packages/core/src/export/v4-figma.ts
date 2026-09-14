import { digestV4 } from '../parser/v4-lexical'
import {
  diagnostic,
  failed,
  freeze,
  getLinkedAppData,
  jcs,
  type ExpandedNode,
  type LinkedApp,
  type ScreenReference,
  type SourceMapEntry,
} from '../app/v4'
import type {
  ExportLoss,
  FigmaMappingArtifact,
  FigmaMappingExportResult,
  FigmaMappingProfile,
  FigmaNode,
  FigmaNodeType,
  FigmaSemanticMapping,
  FigmaWireweaveMetadata,
  V4ExportDiagnostic,
} from './types'

interface ValidProfile extends FigmaMappingProfile {
  readonly screens: 'selected' | 'all'
}

function routeKey(route: ScreenReference): string {
  return `${route.namespace}/${route.id}/${route.variant ?? ''}`
}

function scalar(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return ''
}

function validateProfile(profile: unknown): ValidProfile | null {
  if (profile === null || typeof profile !== 'object') return null
  const value = profile as Record<string, unknown>
  if (value.id !== 'wireweave-figma-mapping-v1' || value.target !== 'figma-plugin-json-v1')
    return null
  const screens = value.screens === undefined ? 'selected' : value.screens
  if (screens !== 'selected' && screens !== 'all') return null
  const board = value.board
  if (
    board !== undefined &&
    (board === null ||
      typeof board !== 'object' ||
      typeof (board as Record<string, unknown>).namespace !== 'string' ||
      typeof (board as Record<string, unknown>).id !== 'string' ||
      ((board as Record<string, unknown>).variant !== undefined &&
        typeof (board as Record<string, unknown>).variant !== 'string'))
  )
    return null
  return {
    id: 'wireweave-figma-mapping-v1',
    target: 'figma-plugin-json-v1',
    ...(board === undefined ? {} : { board: board as FigmaMappingProfile['board'] }),
    screens,
  }
}

function figmaType(kind: string): FigmaNodeType {
  if (['text', 'title', 'link', 'badge', 'marker'].includes(kind)) return 'TEXT'
  if (['image', 'placeholder', 'divider', 'icon', 'avatar'].includes(kind)) return 'RECTANGLE'
  return 'FRAME'
}

function metadata(source: SourceMapEntry): FigmaWireweaveMetadata {
  return {
    identity: source.identity,
    moduleId: source.moduleId,
    source: source.source,
    invocationSources: source.invocationSources,
    requirementRefs: source.requirementRefs,
    obligationRefs: source.obligationRefs,
    operationIds: source.operationIds,
  }
}

function semanticId(renderedId: string): string {
  return `wf-${digestV4(renderedId).slice('sha256:'.length)}`
}

function nodeLabel(node: ExpandedNode): string {
  return (
    scalar(node.node.label ?? node.node.attributes.label ?? node.node.attributes.aria) ||
    node.node.kind
  )
}

function nodeToFigma(
  node: ExpandedNode,
  sources: ReadonlyMap<string, SourceMapEntry>,
  mappings: FigmaSemanticMapping[],
): FigmaNode {
  const source = sources.get(node.renderedId)
  if (source === undefined) throw new TypeError(`Missing linked source map for ${node.renderedId}`)
  const id = semanticId(node.renderedId)
  mappings.push({ renderedId: node.renderedId, figmaId: id, identity: source.identity, source })
  const type = figmaType(node.node.kind)
  const attributes = node.node.attributes
  const result: FigmaNode = {
    id,
    name: nodeLabel(node),
    type,
    visible: true,
    wireweaveType: node.node.kind,
    wireweaveMetadata: metadata(source),
    ...(Object.keys(attributes).length === 0 ? {} : { wireweaveAttributes: attributes }),
  }
  if (type === 'TEXT') {
    result.textStyle = {
      fontSize: 16,
      fontWeight: node.node.kind === 'title' ? 600 : 400,
      textAlignHorizontal: 'LEFT',
      characters: nodeLabel(node),
    }
  } else if (type === 'RECTANGLE') {
    result.size = { width: 200, height: node.node.kind === 'divider' ? 1 : 120 }
    result.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96, a: 1 } }]
  } else {
    result.autoLayout = {
      layoutMode: node.node.kind === 'row' ? 'HORIZONTAL' : 'VERTICAL',
      layoutSizingHorizontal: 'FILL',
      layoutSizingVertical: 'HUG',
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'STRETCH',
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      itemSpacing: 8,
      layoutWrap: 'NO_WRAP',
    }
    result.size = { width: 1_440, height: 1 }
  }
  if (node.children.length > 0)
    result.children = node.children.map((child) => nodeToFigma(child, sources, mappings))
  return result
}

function screenRoots(
  data: NonNullable<ReturnType<typeof getLinkedAppData>>,
  screen: {
    route: ScreenReference
    shell?: string
    children: ExpandedNode[]
  },
): ExpandedNode[] {
  const shell =
    screen.shell === undefined
      ? undefined
      : data.shells.find((item) => item.owner.key === screen.shell)
  return [...(shell?.children ?? []), ...screen.children]
}

function interactionLosses(sources: readonly SourceMapEntry[]): ExportLoss[] {
  return sources.flatMap((source) =>
    source.operationIds.map((operationId) => ({
      code: 'WW_EXPORT_FIGMA_INTERACTION',
      kind: 'interaction' as const,
      message: 'Figma mapping preserves operation identity but cannot execute runtime semantics.',
      renderedId: source.renderedId,
      operationId,
      source,
      details: { target: 'figma-plugin-json-v1' },
    })),
  )
}

export function exportLinkedAppToFigma(
  linked: LinkedApp,
  profile: FigmaMappingProfile,
): FigmaMappingExportResult {
  const data = getLinkedAppData(linked)
  if (data === undefined)
    return failed([diagnostic('WW_SCHEMA', 'app.untrusted-linked-model', undefined, {}, 'compile')])
  const valid = validateProfile(profile)
  if (valid === null)
    return failed([
      diagnostic('WW_EXPORT_PROFILE', 'export.invalid-figma-profile', undefined, {}, 'compile'),
    ])
  const screens = data.screens
    .slice()
    .sort((a, b) => routeKey(a.route).localeCompare(routeKey(b.route)))
  const target = valid.board ?? data.bundle.entry
  const selected =
    valid.screens === 'all'
      ? screens
      : screens.filter((screen) => routeKey(screen.route) === routeKey(target))
  if (selected.length === 0)
    return failed([
      diagnostic('WW_EXPORT_BOARD', 'export.board-not-found', undefined, {}, 'compile'),
    ])

  const renderedIds = new Set<string>()
  for (const screen of selected) {
    const pending = screenRoots(data, screen)
    while (pending.length > 0) {
      const node = pending.shift()!
      renderedIds.add(node.renderedId)
      pending.unshift(...node.children)
    }
  }
  const sourceMap = data.sourceMap
    .filter((entry) => renderedIds.has(entry.renderedId))
    .slice()
    .sort((a, b) => a.renderedId.localeCompare(b.renderedId))
  const sourceById = new Map(sourceMap.map((entry) => [entry.renderedId, entry] as const))
  const mappings: FigmaSemanticMapping[] = []
  const document: FigmaNode = {
    id: `document-${digestV4(linked.digest).slice('sha256:'.length)}`,
    name: data.bundle.id,
    type: 'DOCUMENT',
    visible: true,
    children: selected.map((screen) => ({
      id: `canvas-${digestV4(routeKey(screen.route)).slice('sha256:'.length)}`,
      name: routeKey(screen.route),
      type: 'CANVAS' as const,
      visible: true,
      children: screenRoots(data, screen).map((node) => nodeToFigma(node, sourceById, mappings)),
    })),
  }
  mappings.sort((a, b) => a.renderedId.localeCompare(b.renderedId))
  const lossReport = interactionLosses(sourceMap)
  const diagnostics: V4ExportDiagnostic[] = lossReport.length
    ? [
        {
          severity: 'warning',
          code: 'WW_EXPORT_FIGMA_INTERACTION',
          message: 'Runtime operations are preserved as metadata and recorded in lossReport.',
          details: { count: lossReport.length },
        },
      ]
    : []
  const artifact: FigmaMappingArtifact = freeze({
    kind: 'FigmaMappingArtifact',
    version: '4.0.0',
    format: 'figma',
    target: valid.target,
    appId: data.bundle.id,
    linkedDigest: linked.digest,
    profileDigest: digestV4(jcs(valid)),
    document,
    mappings,
    sourceMap,
    lossReport,
    diagnostics,
  })
  return { ok: true, value: artifact, diagnostics: [] }
}
