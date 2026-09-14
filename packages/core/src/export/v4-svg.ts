import type { JsonObject } from '../parser/v4-types'
import { digestV4 } from '../parser/v4-lexical'
import {
  diagnostic,
  failed,
  freeze,
  getLinkedAppData,
  jcs,
  type ExpandedNode,
  type LinkedApp,
} from '../app/v4'
import type {
  ExportLoss,
  V4ExportDiagnostic,
  V4SvgArtifact,
  V4SvgExportResult,
  V4SvgProfile,
} from './types'

const MAX_DIMENSION = 16_384
const DEFAULT_WIDTH = 1_440
const DEFAULT_HEIGHT = 900
const DEFAULT_GAP = 64

interface Board {
  route: { namespace: string; id: string; variant?: string }
  children: ExpandedNode[]
  x: number
}

interface ValidProfile extends V4SvgProfile {
  readonly width: number
  readonly height: number
  readonly gap: number
  readonly background: string
  readonly screens: 'selected' | 'all'
}

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function scalar(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return ''
}

function label(node: ExpandedNode): string {
  const attrs = node.node.attributes
  return scalar(node.node.label ?? attrs.label ?? attrs.aria ?? '')
}

function estimateHeight(node: ExpandedNode): number {
  const children = node.children.reduce((sum, child) => sum + estimateHeight(child), 0)
  return Math.max(42, 34 + children + (children > 0 ? 12 : 0))
}

function fillFor(kind: string): string {
  if (kind === 'page') return '#ffffff'
  if (['title', 'text'].includes(kind)) return '#fafafa'
  if (['button', 'link', 'nav-item', 'dropdown-item'].includes(kind)) return '#e5e7eb'
  if (['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(kind))
    return '#f3f4f6'
  if (['alert', 'toast', 'annotation-item'].includes(kind)) return '#fef3c7'
  return '#ffffff'
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function operationLosses(
  node: ExpandedNode,
  source: V4SvgArtifact['manifest']['sourceMap'][number],
): ExportLoss[] {
  const handlers = Array.isArray(node.node.attributes.on) ? node.node.attributes.on : []
  const losses: ExportLoss[] = []
  for (const handler of handlers) {
    if (!isObject(handler) || !Array.isArray(handler.operations)) continue
    for (const operation of handler.operations) {
      if (!isObject(operation)) continue
      const operationId = scalar(operation.id)
      if (!operationId) continue
      losses.push({
        code: 'WW_EXPORT_STATIC_INTERACTION',
        kind: 'interaction',
        message: 'Stateful interaction semantics require the executable app runtime.',
        renderedId: node.renderedId,
        operationId,
        source,
        details: { executionClass: scalar(operation.executionClass) },
      })
    }
  }
  return losses
}

function validateProfile(
  profile: unknown,
  data: ReturnType<typeof getLinkedAppData>,
): ValidProfile | null {
  if (profile === null || typeof profile !== 'object') return null
  const value = profile as Record<string, unknown>
  if (value.id !== 'wireweave-static-svg-v1') return null
  const fallbackWidth = Number(data?.bundle.profile.width ?? DEFAULT_WIDTH)
  const fallbackHeight = Number(data?.bundle.profile.height ?? DEFAULT_HEIGHT)
  const width = value.width === undefined ? fallbackWidth : value.width
  const height = value.height === undefined ? fallbackHeight : value.height
  const gap = value.gap === undefined ? DEFAULT_GAP : value.gap
  const background = value.background === undefined ? '#ffffff' : value.background
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof gap !== 'number' ||
    typeof background !== 'string' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(gap) ||
    width <= 0 ||
    height <= 0 ||
    gap < 0 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    gap > MAX_DIMENSION ||
    background.length === 0 ||
    background.length > 128
  )
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
    id: 'wireweave-static-svg-v1',
    ...(board === undefined ? {} : { board: board as V4SvgProfile['board'] }),
    width,
    height,
    gap,
    background,
    screens,
  }
}

function routeKey(route: { namespace: string; id: string; variant?: string }): string {
  return `${route.namespace}/${route.id}/${route.variant ?? ''}`
}

function routeHref(route: { namespace: string; id: string; variant?: string }): string {
  return `#wf/${encodeURIComponent(route.namespace)}/${encodeURIComponent(route.id)}${route.variant === undefined ? '' : `?variant=${encodeURIComponent(route.variant)}`}`
}

function renderNode(
  node: ExpandedNode,
  x: number,
  y: number,
  width: number,
  sourceMap: Map<string, V4SvgArtifact['manifest']['sourceMap'][number]>,
): { markup: string; height: number } {
  const height = estimateHeight(node)
  const kind = node.node.kind
  const text = label(node)
  const source = sourceMap.get(node.renderedId)
  const identity = source === undefined ? '{}' : jcs(source.identity)
  const attrs = node.node.attributes
  const interactionIds = Array.isArray(attrs.on)
    ? attrs.on
        .filter(isObject)
        .flatMap((handler) =>
          Array.isArray(handler.operations)
            ? handler.operations.filter(isObject).map((operation) => scalar(operation.id))
            : [],
        )
        .filter(Boolean)
        .join(',')
    : ''
  const metadata =
    ` id="${escapeXml(node.renderedId)}" data-wf-kind="${escapeXml(kind)}"` +
    ` data-wf-source="${escapeXml(node.source.sourceId)}:${node.source.start}-${node.source.end}"` +
    ` data-wf-identity="${escapeXml(identity)}"` +
    (interactionIds ? ` data-wf-operation-ids="${escapeXml(interactionIds)}"` : '')
  const rect = `<rect x="${x}" y="${y}" width="${Math.max(1, width)}" height="${height}" rx="4" fill="${escapeXml(fillFor(kind))}" stroke="#52525b" stroke-width="1"/>`
  const title = text
    ? `<text x="${x + 10}" y="${y + 23}" font-family="system-ui,sans-serif" font-size="14" fill="#18181b">${escapeXml(text)}</text>`
    : `<text x="${x + 10}" y="${y + 23}" font-family="system-ui,sans-serif" font-size="11" fill="#71717a">${escapeXml(kind)}</text>`
  let childY = y + 34
  const children = node.children
    .map((child) => {
      const rendered = renderNode(child, x + 16, childY, Math.max(32, width - 32), sourceMap)
      childY += rendered.height
      return rendered.markup
    })
    .join('')
  let group = `<g${metadata}>${rect}${title}${children}</g>`
  if (node.route !== undefined) group = `<a href="${escapeXml(routeHref(node.route))}">${group}</a>`
  return { markup: group, height }
}

function screenRoots(
  data: NonNullable<ReturnType<typeof getLinkedAppData>>,
  screen: {
    route: { namespace: string; id: string; variant?: string }
    shell?: string
    children: ExpandedNode[]
  },
): ExpandedNode[] {
  const shell =
    screen.shell === undefined
      ? undefined
      : data.shells.find((entry) => entry.owner.key === screen.shell)
  return [...(shell?.children ?? []), ...screen.children]
}

export function exportLinkedAppToSvg(linked: LinkedApp, profile: V4SvgProfile): V4SvgExportResult {
  const data = getLinkedAppData(linked)
  if (data === undefined)
    return failed([diagnostic('WW_SCHEMA', 'app.untrusted-linked-model', undefined, {}, 'compile')])
  const valid = validateProfile(profile, data)
  if (valid === null)
    return failed([
      diagnostic('WW_EXPORT_PROFILE', 'export.invalid-svg-profile', undefined, {}, 'compile'),
    ])

  const screens = data.screens
    .slice()
    .sort((a, b) => routeKey(a.route).localeCompare(routeKey(b.route)))
  const selected =
    valid.screens === 'all'
      ? screens
      : screens.filter((screen) => {
          const target = valid.board ?? data.bundle.entry
          return routeKey(screen.route) === routeKey(target)
        })
  if (selected.length === 0)
    return failed([
      diagnostic('WW_EXPORT_BOARD', 'export.board-not-found', undefined, {}, 'compile'),
    ])

  const boards: Board[] = selected.map((screen, index) => ({
    route: screen.route,
    children: screenRoots(data, screen),
    x: index * (valid.width + valid.gap),
  }))
  const renderedNodes = boards.flatMap((board) => {
    const pending = [...board.children]
    const result: ExpandedNode[] = []
    while (pending.length > 0) {
      const node = pending.shift()!
      result.push(node)
      pending.unshift(...node.children)
    }
    return result
  })
  const sourceMap = new Map(
    data.sourceMap
      .filter((entry) => renderedNodes.some((node) => node.renderedId === entry.renderedId))
      .sort((a, b) => a.renderedId.localeCompare(b.renderedId))
      .map((entry) => [entry.renderedId, entry] as const),
  )
  const lossReport = renderedNodes.flatMap((node) => {
    const source = sourceMap.get(node.renderedId)
    return source === undefined ? [] : operationLosses(node, source)
  })
  const diagnostics: V4ExportDiagnostic[] = lossReport.length
    ? [
        {
          severity: 'warning',
          code: 'WW_EXPORT_STATIC_INTERACTION',
          message: 'The SVG is static; operation semantics are recorded in lossReport.',
          details: { count: lossReport.length },
        },
      ]
    : []
  const boardMarkup = boards
    .map((board) => {
      const route = escapeXml(routeKey(board.route))
      let rootY = 44
      const roots = board.children
        .map((node) => {
          const rendered = renderNode(node, board.x + 16, rootY, valid.width - 32, sourceMap)
          rootY += rendered.height
          return rendered.markup
        })
        .join('')
      return `<g data-wf-board="${route}"><rect x="${board.x}" y="0" width="${valid.width}" height="${valid.height}" fill="${escapeXml(valid.background)}" stroke="#27272a" stroke-width="2"/><text x="${board.x + 16}" y="26" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="#18181b">${escapeXml(route)}</text>${roots}</g>`
    })
    .join('')
  const width =
    valid.screens === 'all'
      ? valid.width * boards.length + valid.gap * (boards.length - 1)
      : valid.width
  const height = valid.height
  const manifest = {
    schemaVersion: '1.0.0' as const,
    exporter: 'wireweave-static-svg-v1' as const,
    appId: data.bundle.id,
    linkedDigest: linked.digest,
    profileDigest: digestV4(jcs(valid)),
    boardRoutes: boards.map(({ route }) => route),
    sourceMap: [...sourceMap.values()],
    lossReport,
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-wireweave-export="${manifest.exporter}"><title>${escapeXml(data.bundle.id)}</title><desc>Wireweave static projection for ${escapeXml(manifest.boardRoutes.map(routeKey).join(', '))}</desc><metadata>${escapeXml(jcs(manifest))}</metadata>${boardMarkup}</svg>`
  const artifact: V4SvgArtifact = freeze({
    kind: 'V4SvgArtifact',
    mediaType: 'image/svg+xml',
    svg,
    width,
    height,
    digest: digestV4(svg),
    manifest,
    diagnostics,
  })
  return { ok: true, value: artifact, diagnostics: [] }
}
