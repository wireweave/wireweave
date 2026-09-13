/** Canonical parser values for the Wireweave 4.0.0 language contract. */
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject
export interface JsonObject {
  [key: string]: JsonValue
}

export interface V4ParseOptions {
  languageVersion: string
  sourceId?: string
}

export interface V4SourceSpan {
  sourceId: string
  /** Original UTF-16 code-unit offsets; end is exclusive. */
  start: number
  end: number
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  /** False identifies a fragment inspection ID, not an authored durable ID. */
  authoredId?: boolean
}

export interface V4Diagnostic {
  severity: 'error'
  code: string
  phase: 'parse' | 'schema'
  sourceId: string
  start: number
  end: number
  path: string
  messageKey: string
  details: JsonObject
  related: { sourceId: string; start: number; end: number }[]
}

export class V4ParseError extends Error {
  override name = 'ParseError'
  constructor(readonly diagnostics: readonly V4Diagnostic[]) {
    super(diagnostics[0]?.messageKey ?? 'parse.invalid-source')
  }
}

export type V4ParseResult =
  | { ok: true; value: ParsedDocument; diagnostics: [] }
  | { ok: false; value: null; diagnostics: readonly V4Diagnostic[] }

export interface CanonicalParameter {
  id: string
  type: 'string' | 'number' | 'boolean' | 'record' | 'list'
  default?: JsonValue
}

export type PrimitiveKind =
  | 'page'
  | 'header'
  | 'main'
  | 'footer'
  | 'sidebar'
  | 'section'
  | 'row'
  | 'col'
  | 'stack'
  | 'relative'
  | 'card'
  | 'modal'
  | 'drawer'
  | 'accordion'
  | 'text'
  | 'title'
  | 'link'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'button'
  | 'image'
  | 'placeholder'
  | 'avatar'
  | 'badge'
  | 'icon'
  | 'table'
  | 'list'
  | 'alert'
  | 'toast'
  | 'progress'
  | 'spinner'
  | 'tooltip'
  | 'popover'
  | 'dropdown'
  | 'nav'
  | 'tabs'
  | 'breadcrumb'
  | 'divider'
  | 'marker'
  | 'annotations'
  | 'form'
  | 'nav-item'
  | 'nav-group'
  | 'dropdown-item'
  | 'list-item'
  | 'tab'
  | 'option'
  | 'annotation-item'

export interface CanonicalPrimitive {
  kind: PrimitiveKind
  id?: string
  label?: string
  number?: number
  items?: JsonValue[]
  attributes: JsonObject
  children: CanonicalNode[]
}

export interface CanonicalDefinition {
  kind: 'layout' | 'component'
  id: string
  parameters: CanonicalParameter[]
  attributes: JsonObject
  children: CanonicalNode[]
}

export interface CanonicalUse {
  kind: 'use'
  id: string
  name: string
  namespace?: string
  inputs: Record<string, { literal: JsonValue } | { param: string }>
  fills: { name: string; children: CanonicalNode[] }[]
}

export type CanonicalNode =
  | CanonicalPrimitive
  | CanonicalDefinition
  | CanonicalUse
  | { kind: 'slot'; name?: string }
  | { kind: 'repeat'; count: number; id?: string; children: CanonicalNode[] }

export interface CanonicalSymbol {
  kind: 'page' | 'layout' | 'component'
  id: string
}

export interface CanonicalModule {
  id: string
  namespace: string
  sourceDigest: string
  imports: { namespace: string; moduleId: string; digest: string; symbols: CanonicalSymbol[] }[]
  exports: CanonicalSymbol[]
  definitions: (CanonicalPrimitive | CanonicalDefinition)[]
}

export interface ParsedDocument {
  schemaVersion: '1.0.0'
  languageVersion: '4.0.0'
  modules: CanonicalModule[]
  states: JsonObject[]
  registry: { schemaVersion: '1.0.0'; entries: JsonObject[]; digest: string }
  fixtures: JsonObject[]
  app: {
    id: string
    entry?: { namespace: string; id: string; variant?: string }
    profile: JsonObject
  }
}
