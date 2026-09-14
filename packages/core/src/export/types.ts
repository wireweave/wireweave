/**
 * Export Types
 *
 * Types for exporting wireframes to various formats.
 */

import type {
  AppResult,
  Diagnostic,
  LinkedApp,
  LinkedIdentity,
  ScreenReference,
  SourceMapEntry,
} from '../app/v4'

/**
 * Simplified JSON node structure
 */
export interface JsonNode {
  /** Node type (e.g., 'page', 'button', 'input') */
  type: string
  /** Node content or label */
  content?: string
  /** Node attributes */
  attributes: Record<string, unknown>
  /** Child nodes */
  children: JsonNode[]
  /** Source location (optional) */
  location?: {
    line: number
    column: number
  }
}

/**
 * JSON export result
 */
export interface JsonExportResult {
  /** Export format version */
  version: string
  /** Export format */
  format: 'json'
  /** Exported pages */
  pages: JsonNode[]
  /** Metadata */
  metadata: {
    exportedAt: string
    sourceFormat: 'wireweave'
    nodeCount: number
    componentTypes: string[]
  }
}

/**
 * Figma node types that we can map to
 */
export type FigmaNodeType =
  'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'TEXT' | 'RECTANGLE' | 'INSTANCE' | 'COMPONENT'

/**
 * Figma Auto Layout mode
 */
export type FigmaLayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL'

/**
 * Figma sizing mode for Auto Layout
 */
export type FigmaSizingMode = 'FIXED' | 'HUG' | 'FILL'

/**
 * Figma primary axis alignment (justify)
 */
export type FigmaPrimaryAxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'

/**
 * Figma counter axis alignment (align)
 */
export type FigmaCounterAxisAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE'

/**
 * Figma text alignment
 */
export type FigmaTextAlign = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'

/**
 * Figma color (RGBA, 0-1 range)
 */
export interface FigmaColor {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Figma solid fill
 */
export interface FigmaSolidFill {
  type: 'SOLID'
  color: FigmaColor
  opacity?: number
}

/**
 * Figma stroke
 */
export interface FigmaStroke {
  type: 'SOLID'
  color: FigmaColor
}

/**
 * Figma Auto Layout properties
 */
export interface FigmaAutoLayout {
  layoutMode: FigmaLayoutMode
  layoutSizingHorizontal: FigmaSizingMode
  layoutSizingVertical: FigmaSizingMode
  primaryAxisAlignItems: FigmaPrimaryAxisAlign
  counterAxisAlignItems: FigmaCounterAxisAlign
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  itemSpacing: number
  layoutWrap?: 'NO_WRAP' | 'WRAP'
}

/**
 * Figma size properties
 */
export interface FigmaSize {
  width: number
  height: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
}

/**
 * Figma text properties
 */
export interface FigmaTextStyle {
  fontSize: number
  fontWeight: number
  textAlignHorizontal: FigmaTextAlign
  characters: string
}

/**
 * Figma-compatible node structure
 * Based on Figma's Plugin API structure
 */
export interface FigmaNode {
  /** Unique identifier */
  id: string
  /** Node name */
  name: string
  /** Node type */
  type: FigmaNodeType
  /** Visibility */
  visible: boolean
  /** Original Wireweave type */
  wireweaveType?: string
  /** Original Wireweave attributes */
  wireweaveAttributes?: Record<string, unknown>
  /** Child nodes */
  children?: FigmaNode[]
  /** Auto Layout properties (for FRAME) */
  autoLayout?: FigmaAutoLayout
  /** Size properties */
  size?: FigmaSize
  /** Text properties (for TEXT) */
  textStyle?: FigmaTextStyle
  /** Background fills */
  fills?: FigmaSolidFill[]
  /** Border strokes */
  strokes?: FigmaStroke[]
  /** Stroke weight */
  strokeWeight?: number
  /** Corner radius */
  cornerRadius?: number
  /** v4 semantic provenance. Omitted by the legacy exporter. */
  wireweaveMetadata?: FigmaWireweaveMetadata
}

/**
 * Figma export result
 */
export interface FigmaExportResult {
  /** Export format version */
  version: string
  /** Export format */
  format: 'figma'
  /** Document structure */
  document: FigmaNode
  /** Component mappings for reference */
  componentMappings: Record<string, string>
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Include source locations */
  includeLocations?: boolean
  /** Pretty print JSON (with indentation) */
  prettyPrint?: boolean
  /** Include empty attributes */
  includeEmptyAttributes?: boolean
}

/** A static export profile is part of the exported artifact identity. */
export interface V4SvgProfile {
  readonly id: 'wireweave-static-svg-v1'
  readonly board?: ScreenReference
  readonly screens?: 'selected' | 'all'
  readonly width?: number
  readonly height?: number
  readonly gap?: number
  readonly background?: string
}

/** Figma mapping profiles describe a local mapping document, never a server write. */
export interface FigmaMappingProfile {
  readonly id: 'wireweave-figma-mapping-v1'
  readonly board?: ScreenReference
  readonly screens?: 'selected' | 'all'
  readonly target: 'figma-plugin-json-v1'
}

export interface V4ExportDiagnostic {
  readonly severity: 'warning' | 'info'
  readonly code: string
  readonly message: string
  readonly renderedId?: string
  readonly details?: Record<string, unknown>
}

export interface ExportLoss {
  readonly code: string
  readonly kind: 'interaction' | 'asset' | 'layout' | 'semantic'
  readonly message: string
  readonly renderedId: string
  readonly operationId?: string
  readonly source?: SourceMapEntry
  readonly details?: Record<string, unknown>
}

export interface V4SvgManifest {
  readonly schemaVersion: '1.0.0'
  readonly exporter: 'wireweave-static-svg-v1'
  readonly appId: string
  readonly linkedDigest: string
  readonly profileDigest: string
  readonly boardRoutes: readonly ScreenReference[]
  readonly sourceMap: readonly SourceMapEntry[]
  readonly lossReport: readonly ExportLoss[]
}

export interface V4SvgArtifact {
  readonly kind: 'V4SvgArtifact'
  readonly mediaType: 'image/svg+xml'
  readonly svg: string
  readonly width: number
  readonly height: number
  readonly digest: string
  readonly manifest: V4SvgManifest
  readonly diagnostics: readonly V4ExportDiagnostic[]
}

export interface FigmaWireweaveMetadata {
  readonly identity: LinkedIdentity
  readonly moduleId: string
  readonly source: SourceMapEntry['source']
  readonly invocationSources: SourceMapEntry['invocationSources']
  readonly requirementRefs: readonly string[]
  readonly obligationRefs: readonly string[]
  readonly operationIds: readonly string[]
}

export interface FigmaSemanticMapping {
  readonly renderedId: string
  readonly figmaId: string
  readonly identity: LinkedIdentity
  readonly source: SourceMapEntry
}

export interface FigmaMappingArtifact {
  readonly kind: 'FigmaMappingArtifact'
  readonly version: '4.0.0'
  readonly format: 'figma'
  readonly target: FigmaMappingProfile['target']
  readonly appId: string
  readonly linkedDigest: string
  readonly profileDigest: string
  readonly document: FigmaNode
  readonly mappings: readonly FigmaSemanticMapping[]
  readonly sourceMap: readonly SourceMapEntry[]
  readonly lossReport: readonly ExportLoss[]
  readonly diagnostics: readonly V4ExportDiagnostic[]
}

export type V4SvgExportResult = AppResult<V4SvgArtifact>
export type FigmaMappingExportResult = AppResult<FigmaMappingArtifact>

/** Public input marker used by the v4 overloads. */
export type V4LinkedExportInput = LinkedApp

/** Keep the diagnostic type visible to adapter authors without duplicating it. */
export type CoreExportDiagnostic = Diagnostic
