import { getV4SourceSpan, parseV4, V4ParseError } from '../parser'
import { digestV4 } from '../parser/v4-lexical'
import type {
  CanonicalDefinition,
  CanonicalModule,
  CanonicalNode,
  CanonicalPrimitive,
  JsonObject,
  JsonValue,
  ParsedDocument,
  V4SourceSpan,
} from '../parser/v4-types'

export interface Diagnostic {
  severity: 'error'
  code: string
  phase: 'schema' | 'import' | 'link' | 'compile'
  sourceId: string
  start: number
  end: number
  path: string
  messageKey: string
  details: JsonObject
  related: { sourceId: string; start: number; end: number }[]
}
export type AppResult<T> =
  | { ok: true; value: T; diagnostics: readonly [] }
  | { ok: false; value: null; html: null; diagnostics: readonly Diagnostic[] }

export interface ScreenReference {
  namespace: string
  id: string
  variant?: string
}
export interface CreateAppBundleOptions {
  id: string
  entry: ScreenReference
  profile: JsonObject
  states: JsonObject[]
  registry: ParsedDocument['registry']
  fixtures: JsonObject[]
  /** Exact original module bytes. Source maps address these bytes as moduleId.wf. */
  moduleSources: Readonly<Record<string, string>>
}
const bundleBrand: unique symbol = Symbol('AppBundle')
const linkedBrand: unique symbol = Symbol('LinkedApp')
export interface AppBundle {
  readonly [bundleBrand]: true
  readonly schemaVersion: '1.0.0'
  readonly languageVersion: '4.0.0'
  readonly id: string
  readonly entry: Readonly<ScreenReference>
  readonly profile: Readonly<JsonObject>
  readonly states: readonly JsonObject[]
  readonly registry: Readonly<ParsedDocument['registry']>
  readonly fixtures: readonly JsonObject[]
  readonly modules: readonly CanonicalModule[]
}
export type InstanceStep =
  { kind: 'use'; id: string } | { kind: 'repeat'; id: string; index: number }
export interface LinkedIdentity {
  namespace: string
  definitionKind: 'page' | 'layout' | 'component'
  definitionId: string
  instanceRoot:
    | { kind: 'screen'; namespace: string; id: string }
    | { kind: 'shell'; namespace: string; id: string; profileDigest: string }
  instancePath: InstanceStep[]
  localId: string
}
export interface SourceMapEntry {
  renderedId: string
  identity: LinkedIdentity
  moduleId: string
  source: Readonly<V4SourceSpan>
  invocationSources: readonly Readonly<V4SourceSpan>[]
  requirementRefs: readonly string[]
  obligationRefs: readonly string[]
  operationIds: readonly string[]
}
export interface LinkedApp {
  readonly [linkedBrand]: true
  readonly kind: 'LinkedApp'
  readonly languageVersion: '4.0.0'
  readonly id: string
  readonly digest: string
  readonly sourceMap: readonly SourceMapEntry[]
}
export interface AppArtifact {
  readonly kind: 'AppArtifact'
  readonly schemaVersion: '1.0.0'
  readonly languageVersion: '4.0.0'
  readonly html: string
  readonly mediaType: 'text/html'
  readonly byteLength: number
  readonly digest: string
  readonly modelDigest: string
  readonly profileDigest: string
  readonly runtimeDigest: string
  readonly registryDigest: string
  readonly entry: Readonly<ScreenReference>
  readonly screenIndex: readonly { route: ScreenReference; renderedId: string }[]
  readonly operationIndex: readonly {
    renderedId: string
    handlerId: string
    operationId: string
    executionClass: string
    operation: JsonObject
  }[]
  readonly diagnostics: readonly []
  readonly sourceMap: readonly SourceMapEntry[]
  readonly manifest: {
    readonly appId: string
    readonly modelDigest: string
    readonly profileDigest: string
    readonly registryDigest: string
    readonly htmlDigest: string
    readonly runtimeDigest: string
    readonly executionScope: 'standard-1'
    readonly unsupportedOperations: readonly {
      renderedId: string
      handlerId: string
      operationId: string
    }[]
  }
}

interface BundleData {
  sourceByPath: Map<string, V4SourceSpan>
}
interface Owner {
  module: CanonicalModule
  definition: CanonicalPrimitive | CanonicalDefinition
  key: string
}
export interface StateBinding {
  key: string
  initial: JsonValue
  type: string
  lifetime: 'mount' | 'session'
  sensitive: boolean
  root: string
}
export interface ExpandedNode {
  node: CanonicalPrimitive
  owner: Owner
  identity: LinkedIdentity
  renderedId: string
  children: ExpandedNode[]
  source: V4SourceSpan
  invocationSources: V4SourceSpan[]
  route?: ScreenReference
  slot?: boolean
  parent?: ExpandedNode
  formTarget?: string
  effectTargets?: Record<string, string>
  stateBindings: Record<string, StateBinding>
}
interface Screen {
  owner: Owner
  route: ScreenReference
  children: ExpandedNode[]
  shell?: string
}
interface Shell {
  owner: Owner
  children: ExpandedNode[]
  slotId: string
}
export interface LinkedData {
  bundle: AppBundle
  screens: Screen[]
  shells: Shell[]
  sourceMap: SourceMapEntry[]
  nodes: ExpandedNode[]
  artifact?: AppArtifact
}
const bundles = new WeakMap<object, BundleData>()
const links = new WeakMap<object, LinkedData>()
const identifiers = /^[A-Za-z_][A-Za-z0-9_-]{0,127}$/
const uuids = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const containers = new Set(
  'page header main footer sidebar section row col stack relative card modal drawer accordion popover form tab nav-group list-item annotation-item'.split(
    ' ',
  ),
)

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return value === undefined || value === null ? '' : jcs(value)
}
function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function isArray(value: unknown): boolean {
  return Array.isArray(value)
}
function diagnostic(
  code: string,
  messageKey: string,
  source?: V4SourceSpan,
  details: JsonObject = {},
  phase: Diagnostic['phase'] = 'link',
  path = '',
): Diagnostic {
  return {
    severity: 'error',
    code,
    phase,
    sourceId: source?.sourceId ?? 'app',
    start: source?.start ?? 0,
    end: source?.end ?? 0,
    path,
    messageKey,
    details,
    related: [],
  }
}
function failed<T>(diagnostics: Diagnostic[]): AppResult<T> {
  const sorted = diagnostics
    .slice()
    .sort(
      (a, b) =>
        (a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0) ||
        a.start - b.start ||
        (a.phase < b.phase ? -1 : a.phase > b.phase ? 1 : 0) ||
        (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
    )
  if (sorted.length > 1000) {
    const omitted = sorted.length - 999
    sorted.length = 999
    sorted.push(diagnostic('WW_DIAGNOSTIC_LIMIT', 'app.diagnostic-limit', undefined, { omitted }))
  }
  return { ok: false, value: null, html: null, diagnostics: sorted }
}

/** JCS key order and ECMAScript scalar serialization; never expands references. */
function jcs(value: unknown, depth = 0, ancestors = new Set<object>()): string {
  if (depth > 512) throw new TypeError('JSON nesting limit')
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number')
    return JSON.stringify(value)
  }
  if (typeof value !== 'object' || value === null || ancestors.has(value))
    throw new TypeError('Invalid or cyclic JSON value')
  ancestors.add(value)
  try {
    if (Array.isArray(value))
      return `[${value.map((item) => jcs(item, depth + 1, ancestors)).join(',')}]`
    if (Object.prototype.toString.call(value) !== '[object Object]')
      throw new TypeError('Invalid JSON object')
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${jcs((value as JsonObject)[key], depth + 1, ancestors)}`,
      )
      .join(',')}}`
  } finally {
    ancestors.delete(value)
  }
}
function freeze<T>(value: T): T {
  const stack: unknown[] = [value]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current !== null && typeof current === 'object' && !Object.isFrozen(current)) {
      for (const child of Object.values(current)) stack.push(child)
      Object.freeze(current)
    }
  }
  return value
}
function dsl(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(dsl).join(',')}]`
  if (object(value))
    return `{${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}=${dsl(item)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
function plain<T>(value: T): T {
  return JSON.parse(jcs(value)) as T
}
function sourceId(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? 'source.wf'
}
function sourceOf(value: object, fallback?: V4SourceSpan): V4SourceSpan {
  const found = getV4SourceSpan(value) ?? fallback
  return found === undefined
    ? { sourceId: 'app', start: 0, end: 0, startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
    : { ...found, sourceId: sourceId(found.sourceId) }
}

export function createAppBundle(
  documents: readonly ParsedDocument[],
  options: CreateAppBundleOptions,
): AppResult<AppBundle> {
  if (!isArray(documents) || !object(options) || !object(options.moduleSources))
    throw new TypeError('Parsed documents and explicit bundle options are required')
  const diagnostics: Diagnostic[] = []
  const modules: CanonicalModule[] = []
  const sourceByPath = new Map<string, V4SourceSpan>()
  try {
    jcs(options)
    if (!identifiers.test(options.id))
      return failed([diagnostic('WW_SCHEMA', 'app.invalid-id', undefined, {}, 'schema')])
    const configuration = parseV4(
      `app ${options.id} entry=${dsl(options.entry)} profile=${dsl(options.profile)} states=${dsl(options.states)} registry=${dsl(options.registry)} fixtures=${dsl(options.fixtures)} {}`,
      { languageVersion: '4.0.0', sourceId: 'app' },
    )
    for (const document of documents) {
      if (
        document.languageVersion !== '4.0.0' ||
        document.schemaVersion !== '1.0.0' ||
        !isArray(document.modules)
      ) {
        diagnostics.push(
          diagnostic('WW_UNSUPPORTED_VERSION', 'app.document-version', undefined, {}, 'schema'),
        )
        continue
      }
      for (const module of document.modules) {
        const bytes = options.moduleSources[module.id]
        if (modules.some((prior) => prior.id === module.id)) {
          diagnostics.push(
            diagnostic('WW_DUPLICATE_ID', 'app.duplicate-module', sourceOf(module), {
              id: module.id,
            }),
          )
          continue
        }
        if (typeof bytes !== 'string') {
          diagnostics.push(
            diagnostic(
              'WW_IMPORT',
              'app.missing-source-bytes',
              sourceOf(module),
              { id: module.id },
              'import',
            ),
          )
          continue
        }
        const reparsed = parseV4(bytes, { languageVersion: '4.0.0', sourceId: `${module.id}.wf` })
        if (
          digestV4(bytes) !== module.sourceDigest ||
          reparsed.modules.length !== 1 ||
          jcs(reparsed.modules[0]) !== jcs(module)
        ) {
          diagnostics.push(
            diagnostic(
              'WW_IMPORT',
              'app.source-content-mismatch',
              sourceOf(module),
              { id: module.id },
              'import',
            ),
          )
          continue
        }
        const stack: { value: unknown; path: string; fallback: V4SourceSpan }[] = [
          { value: reparsed.modules[0], path: module.id, fallback: sourceOf(reparsed.modules[0]) },
        ]
        while (stack.length > 0) {
          const item = stack.pop()!
          if (item.value !== null && typeof item.value === 'object') {
            const span = sourceOf(item.value, item.fallback)
            sourceByPath.set(item.path, span)
            for (const [key, value] of Object.entries(item.value))
              stack.push({ value, path: `${item.path}/${key}`, fallback: span })
          }
        }
        modules.push(plain(module))
      }
    }
    if (modules.length === 0 || modules.length > 256)
      diagnostics.push(diagnostic('WW_LIMIT', 'app.module-count', undefined, {}, 'schema'))
    for (const id of Object.keys(options.moduleSources))
      if (!modules.some((module) => module.id === id)) {
        diagnostics.push(
          diagnostic('WW_IMPORT', 'app.unselected-source', undefined, { id }, 'import'),
        )
      }
    if (diagnostics.length > 0) return failed(diagnostics)
    const candidate = {
      [bundleBrand]: true as const,
      schemaVersion: '1.0.0' as const,
      languageVersion: '4.0.0' as const,
      id: configuration.app.id,
      entry: configuration.app.entry!,
      profile: configuration.app.profile,
      states: configuration.states,
      registry: configuration.registry,
      fixtures: configuration.fixtures,
      modules,
    }
    if (new TextEncoder().encode(jcs(candidate)).byteLength > 64 * 1024 * 1024)
      return failed([diagnostic('WW_LIMIT', 'app.bundle-byte-limit')])
    const bundle: AppBundle = freeze(candidate)
    bundles.set(bundle, { sourceByPath })
    return { ok: true, value: bundle, diagnostics: [] }
  } catch (error) {
    if (error instanceof V4ParseError)
      return failed(error.diagnostics.map((item) => ({ ...item, phase: 'schema' })))
    if (error instanceof TypeError)
      return failed([diagnostic('WW_SCHEMA', 'app.invalid-json', undefined, {}, 'schema')])
    throw error
  }
}

class Linker {
  readonly diagnostics: Diagnostic[] = []
  readonly owners = new Map<string, Owner>()
  readonly moduleById = new Map<string, CanonicalModule>()
  readonly ownerByNode = new WeakMap<object, Owner>()
  readonly pathByNode = new WeakMap<object, string>()
  readonly expanded: ExpandedNode[] = []
  readonly screens: Screen[] = []
  readonly shells: Shell[] = []
  private readonly moduleEdges = new Map<string, string[]>()
  private readonly definitionEdges = new Map<string, string[]>()
  private readonly registry = new Map<string, JsonObject>()
  private expandedCount = 0
  private readonly domIds = new Set<string>()
  constructor(
    readonly bundle: AppBundle,
    readonly data: BundleData,
  ) {}
  source(node: object): V4SourceSpan {
    return this.data.sourceByPath.get(this.pathByNode.get(node) ?? '') ?? sourceOf(node)
  }
  error(code: string, key: string, node?: object, details: JsonObject = {}): void {
    this.diagnostics.push(
      diagnostic(
        code,
        key,
        node === undefined ? undefined : this.source(node),
        details,
        code === 'WW_IMPORT' ? 'import' : 'link',
        node === undefined ? '' : (this.pathByNode.get(node) ?? ''),
      ),
    )
  }
  key(namespace: string, kind: string, id: string): string {
    return `${namespace}/${kind}/${id}`
  }
  walk(
    root: CanonicalNode,
    visit: (node: CanonicalNode, path: string) => void,
    rootPath: string,
  ): void {
    const stack = [{ node: root, path: rootPath }]
    while (stack.length > 0) {
      const { node, path } = stack.pop()!
      visit(node, path)
      if (node.kind === 'use') {
        for (let i = node.fills.length - 1; i >= 0; i--)
          for (let j = node.fills[i].children.length - 1; j >= 0; j--)
            stack.push({
              node: node.fills[i].children[j],
              path: `${path}/fills/${i}/children/${j}`,
            })
      } else if ('children' in node)
        for (let i = node.children.length - 1; i >= 0; i--)
          stack.push({ node: node.children[i], path: `${path}/children/${i}` })
    }
  }
  index(): void {
    const namespaces = new Set<string>()
    for (const module of this.bundle.modules) {
      this.pathByNode.set(module, module.id)
      this.moduleById.set(module.id, module)
      if (namespaces.has(module.namespace))
        this.error('WW_DUPLICATE_ID', 'app.duplicate-namespace', module, {
          namespace: module.namespace,
        })
      namespaces.add(module.namespace)
      for (const [index, definition] of module.definitions.entries()) {
        const id = definition.id
        if (id === undefined) {
          this.error('WW_REFERENCE', 'app.page-id-required', module)
          continue
        }
        const key = this.key(module.namespace, definition.kind, id)
        const owner: Owner = { module, definition, key }
        this.walk(
          definition,
          (node, path) => {
            this.ownerByNode.set(node, owner)
            this.pathByNode.set(node, path)
          },
          `${module.id}/definitions/${index}`,
        )
        if (this.owners.has(key))
          this.error('WW_DUPLICATE_ID', 'app.duplicate-definition', definition, { id })
        else this.owners.set(key, owner)
        const localIds = new Set<string>()
        this.walk(
          definition,
          (node) => {
            if ('id' in node && node.id !== undefined) {
              if (localIds.has(node.id))
                this.error('WW_DUPLICATE_ID', 'app.duplicate-local-id', node, { id: node.id })
              localIds.add(node.id)
            }
          },
          '',
        )
      }
    }
  }
  resolve(
    owner: Owner,
    kind: 'page' | 'layout' | 'component',
    id: string,
    alias?: string,
    node: object = owner.definition,
  ): Owner | undefined {
    let namespace = owner.module.namespace
    if (alias !== undefined) {
      const imported = owner.module.imports.find((item) => item.namespace === alias)
      const target = imported === undefined ? undefined : this.moduleById.get(imported.moduleId)
      if (
        target === undefined ||
        imported === undefined ||
        !imported.symbols.some((symbol) => symbol.kind === kind && symbol.id === id)
      ) {
        this.error('WW_REFERENCE', 'app.unimported-symbol', node, { kind, id, namespace: alias })
        return undefined
      }
      namespace = target.namespace
    }
    const target = this.owners.get(this.key(namespace, kind, id))
    if (target === undefined)
      this.error('WW_REFERENCE', 'app.missing-symbol', node, { kind, id, namespace })
    return target
  }
  imports(): void {
    for (const module of this.bundle.modules) {
      const aliases = new Set<string>()
      const edges: string[] = []
      for (const [index, imported] of module.imports.entries()) {
        this.pathByNode.set(imported, `${module.id}/imports/${index}`)
        if (aliases.has(imported.namespace))
          this.error('WW_DUPLICATE_ID', 'app.duplicate-import-alias', imported)
        aliases.add(imported.namespace)
        const target = this.moduleById.get(imported.moduleId)
        if (target === undefined || target.sourceDigest !== imported.digest) {
          this.error('WW_IMPORT', 'app.import-digest-or-module', imported)
          continue
        }
        edges.push(target.id)
        const selected = new Set<string>()
        for (const symbol of imported.symbols) {
          const key = `${symbol.kind}/${symbol.id}`
          if (selected.has(key))
            this.error('WW_DUPLICATE_ID', 'app.duplicate-import-symbol', imported)
          selected.add(key)
          if (!target.exports.some((entry) => entry.kind === symbol.kind && entry.id === symbol.id))
            this.error('WW_IMPORT', 'app.unexported-symbol', imported, { symbol: key })
        }
      }
      const exports = new Set<string>()
      for (const item of module.exports) {
        const key = this.key(module.namespace, item.kind, item.id)
        if (exports.has(key)) this.error('WW_DUPLICATE_ID', 'app.duplicate-export', module)
        exports.add(key)
        if (!this.owners.has(key))
          this.error('WW_IMPORT', 'app.missing-export', module, { id: item.id })
      }
      this.moduleEdges.set(module.id, edges)
    }
    this.cycles(this.moduleEdges, 64)
  }
  cycles(edges: Map<string, string[]>, depthLimit: number): void {
    const colors = new Map<string, number>()
    for (const start of edges.keys()) {
      if (colors.has(start)) continue
      const frames = [{ id: start, cursor: 0 }]
      colors.set(start, 1)
      while (frames.length > 0) {
        const current = frames[frames.length - 1]
        const neighbors = edges.get(current.id) ?? []
        if (current.cursor === neighbors.length) {
          colors.set(current.id, 2)
          frames.pop()
          continue
        }
        const next = neighbors[current.cursor++]
        if (colors.get(next) === 1) {
          this.error(
            'WW_CYCLE',
            'app.dependency-cycle',
            this.owners.get(current.id)?.definition ?? this.moduleById.get(current.id),
            { from: current.id, to: next },
          )
          continue
        }
        if (colors.has(next)) continue
        if (frames.length >= depthLimit) {
          this.error('WW_LIMIT', 'app.dependency-depth', undefined, { id: next })
          continue
        }
        colors.set(next, 1)
        frames.push({ id: next, cursor: 0 })
      }
    }
  }
  references(): void {
    for (const owner of this.owners.values()) {
      const edges: string[] = []
      const slots = new Set<string>()
      this.walk(
        owner.definition,
        (node) => {
          if (node.kind === 'use') {
            const target = this.resolve(owner, 'component', node.name, node.namespace, node)
            if (target !== undefined) edges.push(target.key)
          }
          if (node.kind === 'slot') {
            const name = node.name ?? ''
            if (slots.has(name)) this.error('WW_SLOT', 'app.duplicate-slot', node)
            slots.add(name)
            if (owner.definition.kind === 'component' && name === '')
              this.error('WW_SLOT', 'app.component-slot-name', node)
          }
        },
        '',
      )
      if (owner.definition.kind === 'layout' && (slots.size !== 1 || !slots.has('')))
        this.error('WW_SLOT', 'app.layout-slot-cardinality', owner.definition)
      const uses = owner.definition.attributes.uses
      if (typeof uses === 'string') {
        if (owner.definition.kind !== 'page')
          this.error('WW_REFERENCE', 'app.layout-nesting', owner.definition)
        const [alias, id] = uses.includes('::') ? uses.split('::') : [undefined, uses]
        const target = this.resolve(owner, 'layout', id, alias)
        if (target !== undefined) edges.push(target.key)
      }
      this.definitionEdges.set(owner.key, edges)
    }
    this.cycles(this.definitionEdges, 10000)
  }
  registryChecks(): void {
    const entries = this.bundle.registry.entries
    const sorted = entries.slice().sort((a, b) => {
      const left = `${textValue(a.kind)}\u0000${textValue(a.namespace)}\u0000${textValue(a.id)}`
      const right = `${textValue(b.kind)}\u0000${textValue(b.namespace)}\u0000${textValue(b.id)}`
      return left < right ? -1 : left > right ? 1 : 0
    })
    if (jcs(entries) !== jcs(sorted) || digestV4(jcs(entries)) !== this.bundle.registry.digest)
      this.error('WW_REGISTRY', 'app.registry-digest')
    for (const entry of entries) {
      if (
        typeof entry.id !== 'string' ||
        !uuids.test(entry.id) ||
        typeof entry.namespace !== 'string' ||
        !['Requirement', 'ImplementationObligation'].includes(textValue(entry.kind))
      ) {
        this.error('WW_REGISTRY', 'app.registry-identity')
        continue
      }
      if (this.registry.has(entry.id))
        this.error('WW_REGISTRY', 'app.duplicate-registry-id', undefined, { id: entry.id })
      this.registry.set(entry.id, entry)
      if (
        typeof entry.title !== 'string' ||
        entry.title.length === 0 ||
        !Array.isArray(entry.acceptance) ||
        entry.acceptance.length === 0
      )
        this.error('WW_REGISTRY', 'app.incomplete-requirement', undefined, { id: entry.id })
      if (entry.kind === 'ImplementationObligation') {
        for (const field of ['trigger', 'authority'])
          if (typeof entry[field] !== 'string' || entry[field].length === 0)
            this.error('WW_REGISTRY', 'app.incomplete-obligation', undefined, {
              id: entry.id,
              field,
            })
        for (const field of ['preconditions', 'success', 'failureCases', 'requirementRefs'])
          if (
            !Array.isArray(entry[field]) ||
            (field !== 'preconditions' && entry[field].length === 0)
          )
            this.error('WW_REGISTRY', 'app.incomplete-obligation', undefined, {
              id: entry.id,
              field,
            })
        for (const field of ['request', 'response'])
          if (
            !object(entry[field]) ||
            !['schema', 'not-applicable'].includes(textValue(entry[field].mode))
          )
            this.error('WW_REGISTRY', 'app.incomplete-obligation', undefined, {
              id: entry.id,
              field,
            })
      }
    }
    for (const entry of entries) {
      for (const ref of Array.isArray(entry.requirementRefs) ? entry.requirementRefs : []) {
        const target = object(ref) ? this.registry.get(textValue(ref.id)) : undefined
        if (
          target?.kind !== 'Requirement' ||
          !object(ref) ||
          ref.namespace !== target.namespace ||
          ref.kind !== 'Requirement'
        )
          this.error('WW_REGISTRY', 'app.obligation-requirement-reference')
      }
    }
    for (const owner of this.owners.values())
      this.walk(
        owner.definition,
        (node) => {
          if (!('attributes' in node)) return
          this.registryRefs(node.attributes, node)
          for (const handler of asObjects(node.attributes.on))
            for (const operation of asObjects(handler.operations))
              this.registryRefs(operation, node)
        },
        '',
      )
  }
  registryRefs(value: JsonObject, node: object): void {
    for (const [field, kind] of [
      ['requirementRefs', 'Requirement'],
      ['obligationRefs', 'ImplementationObligation'],
    ]) {
      for (const id of Array.isArray(value[field]) ? value[field] : []) {
        if (typeof id !== 'string' || this.registry.get(id)?.kind !== kind)
          this.error('WW_REGISTRY', 'app.unresolved-registry-reference', node, { field, id })
      }
    }
  }
  binding(value: JsonValue): void {
    if (!object(value)) {
      this.error('WW_REGISTRY', 'app.invalid-source-binding')
      return
    }
    if (
      value.scope === 'instance' &&
      (!object(value.instanceRoot) || !Array.isArray(value.instancePath))
    ) {
      this.error('WW_REGISTRY', 'app.invalid-instance-binding')
      return
    }
    if (!['module', 'definition', 'instance', 'app-state'].includes(textValue(value.scope))) {
      this.error('WW_REGISTRY', 'app.invalid-source-binding')
      return
    }
    if (value.scope === 'app-state') {
      if (
        value.appId !== this.bundle.id ||
        !this.bundle.states.some((state) => `app:${textValue(state.id)}` === value.stateRef)
      )
        this.error('WW_REGISTRY', 'app.unresolved-source-binding')
      return
    }
    const module = this.moduleById.get(textValue(value.moduleId))
    if (module === undefined) {
      this.error('WW_REGISTRY', 'app.unresolved-source-binding')
      return
    }
    if (value.scope === 'module') return
    const owner = this.owners.get(
      this.key(module.namespace, textValue(value.definitionKind), textValue(value.definitionId)),
    )
    if (owner === undefined) {
      this.error('WW_REGISTRY', 'app.unresolved-source-binding')
      return
    }
    if (
      value.scope === 'instance' &&
      (value.appId !== this.bundle.id ||
        !this.expanded.some(
          (entry) =>
            entry.owner === owner &&
            jcs(entry.identity.instanceRoot) === jcs(value.instanceRoot) &&
            jcs(entry.identity.instancePath) === jcs(value.instancePath) &&
            (!['element', 'operation'].includes(textValue(value.targetKind)) ||
              entry.node.id === value.elementId),
        ))
    )
      this.error('WW_REGISTRY', 'app.unresolved-instance-binding')
    if (value.targetKind === 'definition') return
    if (value.targetKind === 'variant') {
      if (
        !Array.isArray(owner.definition.attributes.variants) ||
        !owner.definition.attributes.variants.includes(value.variantId)
      )
        this.error('WW_REGISTRY', 'app.unresolved-source-binding')
      return
    }
    if (value.targetKind === 'state') {
      const scope =
        owner.definition.kind === 'page'
          ? 'screen'
          : owner.definition.kind === 'layout'
            ? 'shell'
            : 'component'
      if (
        !asObjects(owner.definition.attributes.states).some(
          (state) => value.stateRef === `${scope}:${textValue(state.id)}`,
        )
      )
        this.error('WW_REGISTRY', 'app.unresolved-source-binding')
      return
    }
    let found = false
    this.walk(
      owner.definition,
      (node) => {
        if (!('id' in node) || node.id !== value.elementId || !('attributes' in node)) return
        found =
          value.targetKind === 'element' ||
          asObjects(node.attributes.on).some((handler) =>
            asObjects(handler.operations).some((operation) => operation.id === value.operationId),
          )
      },
      '',
    )
    if (!found) this.error('WW_REGISTRY', 'app.unresolved-source-binding')
  }

  route(reference: ScreenReference, node?: object, code = 'WW_REFERENCE'): Owner | undefined {
    const target = this.owners.get(this.key(reference.namespace, 'page', reference.id))
    if (
      target === undefined ||
      (reference.variant !== undefined &&
        (!Array.isArray(target.definition.attributes.variants) ||
          !target.definition.attributes.variants.includes(reference.variant)))
    ) {
      this.error(code, 'app.unresolved-route', node, {
        namespace: reference.namespace,
        id: reference.id,
      })
      return undefined
    }
    return target
  }
  frame(owner: Owner): void {
    const attrs = owner.definition.attributes
    const { width, height } = this.bundle.profile
    const pair =
      attrs.viewport === undefined ? null : /^(\d+)(?:x(\d+))?$/.exec(textValue(attrs.viewport))
    const presets: Record<string, number[]> = {
      'desktop-sm': [1280, 800],
      desktop: [1440, 900],
      'desktop-lg': [1920, 1080],
      'desktop-xl': [2560, 1440],
      ipad: [1024, 768],
      'ipad-portrait': [768, 1024],
      'ipad-pro': [1366, 1024],
      'ipad-pro-portrait': [1024, 1366],
      'iphone-se': [375, 667],
      iphone14: [390, 844],
      'iphone14-pro': [393, 852],
      'iphone14-pro-max': [430, 932],
      android: [360, 800],
      'android-lg': [412, 915],
    }
    const device = presets[textValue(attrs.device)]
    if (
      (attrs.viewport !== undefined &&
        (pair === null || Number(pair[1]) !== width || Number(pair[2] ?? 900) !== height)) ||
      (attrs.device !== undefined && (!device || device[0] !== width || device[1] !== height)) ||
      ['w', 'width'].some(
        (key) =>
          attrs[key] !== undefined &&
          attrs[key] !== width &&
          attrs[key] !== 'screen' &&
          attrs[key] !== 'full',
      ) ||
      ['h', 'height'].some(
        (key) =>
          attrs[key] !== undefined &&
          attrs[key] !== height &&
          attrs[key] !== 'screen' &&
          attrs[key] !== 'full',
      )
    )
      this.error('WW_VIEWPORT', 'app.incompatible-frame', owner.definition)
  }
  expandAll(): void {
    this.route(this.bundle.entry, undefined, 'WW_ROUTE')
    const pages = [...this.owners.values()].filter((owner) => owner.definition.kind === 'page')
    if (pages.length === 0 || pages.length > 2000) this.error('WW_LIMIT', 'app.screen-count')
    for (const owner of pages) {
      this.frame(owner)
      const screen: Screen = {
        owner,
        route: { namespace: owner.module.namespace, id: owner.definition.id! },
        children: [],
      }
      const root: LinkedIdentity['instanceRoot'] = { kind: 'screen', ...screen.route }
      const uses = owner.definition.attributes.uses
      if (typeof uses === 'string') {
        const [alias, id] = uses.includes('::') ? uses.split('::') : [undefined, uses]
        const layout = this.resolve(owner, 'layout', id, alias)
        if (layout !== undefined) {
          screen.shell = layout.key
          if (!this.shells.some((shell) => shell.owner === layout)) {
            this.frame(layout)
            const shellRoot: LinkedIdentity['instanceRoot'] = {
              kind: 'shell',
              namespace: layout.module.namespace,
              id: layout.definition.id!,
              profileDigest: digestV4(jcs(this.bundle.profile)),
            }
            const children = this.expandChildren([layout.definition], {
              owner: layout,
              root: shellRoot,
              path: [],
              bindings: {},
              fills: new Map(),
              invocationSources: [],
              depth: 0,
            })
            const slot = this.expanded.find((node) => node.slot && node.owner === layout)
            this.shells.push({ owner: layout, children, slotId: slot?.renderedId ?? '' })
          }
        }
      }
      screen.children = this.expandChildren([owner.definition], {
        owner,
        root,
        path: [],
        bindings: {},
        fills: new Map(),
        invocationSources: [],
        depth: 0,
      })
      this.screens.push(screen)
      if (this.expandedCount > 1000000) break
    }
  }
  expandChildren(nodes: readonly CanonicalNode[], context: Expansion): ExpandedNode[] {
    const result: ExpandedNode[] = []
    for (const node of nodes) {
      if (++this.expandedCount > 1000000 || context.depth > 128) {
        this.error('WW_LIMIT', 'app.expansion-limit', node)
        break
      }
      if (node.kind === 'use') {
        const target = this.resolve(context.owner, 'component', node.name, node.namespace, node)
        if (target === undefined || target.definition.kind !== 'component') continue
        if (this.bundle.profile.id === 'neutral-app' && this.source(node).authoredId === false)
          this.error('WW_REFERENCE', 'app.invocation-id-required', node)
        const bindings: JsonObject = {}
        const parameters = target.definition.parameters
        for (const name of Object.keys(node.inputs))
          if (!parameters.some((parameter) => parameter.id === name))
            this.error('WW_PARAMETER', 'app.unknown-argument', node, { name })
        for (const parameter of parameters) {
          const input = node.inputs[parameter.id]
          const value =
            input === undefined
              ? parameter.default
              : 'literal' in input
                ? input.literal
                : context.bindings[input.param]
          if (!matchesType(value, parameter.type))
            this.error('WW_PARAMETER', 'app.argument-type', node, {
              name: parameter.id,
              type: parameter.type,
            })
          else Object.defineProperty(bindings, parameter.id, { value, enumerable: true })
        }
        const slots = new Set<string>()
        this.walk(
          target.definition,
          (child) => {
            if (child.kind === 'slot') slots.add(child.name ?? '')
          },
          '',
        )
        const fills = new Map<string, { nodes: CanonicalNode[]; context: Expansion }>()
        for (const fill of node.fills) {
          if (!slots.has(fill.name))
            this.error('WW_SLOT', 'app.unknown-fill', node, { name: fill.name })
          if (fills.has(fill.name))
            this.error('WW_SLOT', 'app.duplicate-fill', node, { name: fill.name })
          fills.set(fill.name, { nodes: fill.children, context })
        }
        if (this.diagnostics.length > 0) continue
        const children = this.expandChildren(target.definition.children, {
          ...context,
          owner: target,
          bindings,
          fills,
          path: [...context.path, { kind: 'use', id: node.id }],
          invocationSources: [...context.invocationSources, this.source(node)],
          depth: context.depth + 1,
        })
        for (const child of children) result.push(child)
      } else if (node.kind === 'repeat') {
        if (this.bundle.profile.id === 'neutral-app' && node.id === undefined)
          this.error('WW_REFERENCE', 'app.repeat-id-required', node)
        if (node.count > 0 && node.count * node.children.length + this.expandedCount > 1000000) {
          this.error('WW_LIMIT', 'app.expansion-limit', node)
          continue
        }
        for (let index = 0; index < node.count; index++) {
          const children = this.expandChildren(node.children, {
            ...context,
            path: [
              ...context.path,
              { kind: 'repeat', id: node.id ?? `_repeat_${this.source(node).start}`, index },
            ],
            depth: context.depth + 1,
          })
          for (const child of children) result.push(child)
          if (this.expandedCount > 1000000) break
        }
      } else if (node.kind === 'slot' && context.owner.definition.kind === 'component') {
        const fill = context.fills.get(node.name ?? '')
        if (fill !== undefined) {
          const children = this.expandChildren(fill.nodes, {
            ...fill.context,
            root: context.root,
            path: context.path,
            invocationSources: context.invocationSources,
            depth: context.depth + 1,
          })
          for (const child of children) result.push(child)
        }
      } else {
        if (
          node.kind === 'component' ||
          (node.kind === 'layout' && node !== context.owner.definition)
        ) {
          this.error('WW_SCHEMA', 'app.nested-definition', node)
          continue
        }
        const slot = node.kind === 'slot'
        const source = this.source(node)
        const replacement = (value: JsonValue): JsonValue =>
          context.owner.definition.kind === 'component'
            ? substitute(value, context.bindings, (name) =>
                this.error('WW_PARAMETER', 'app.unbound-parameter', node, { name }),
              )
            : value
        const authored = node as CanonicalPrimitive
        const primitive: CanonicalPrimitive = slot
          ? { kind: 'section', attributes: {}, children: [] }
          : {
              ...authored,
              ...(node.kind === 'layout' ? { kind: 'section' as const } : {}),
              attributes: plain(replacement(authored.attributes)) as JsonObject,
              ...(authored.label === undefined
                ? {}
                : { label: replacement(authored.label) as string }),
              children: [],
            }
        this.pathByNode.set(primitive, this.pathByNode.get(node) ?? '')
        if (context.owner.definition.kind === 'component') this.checkSubstituted(primitive, node)
        const identity: LinkedIdentity = {
          namespace: context.owner.module.namespace,
          definitionKind: context.owner.definition.kind as LinkedIdentity['definitionKind'],
          definitionId: context.owner.definition.id!,
          instanceRoot: context.root,
          instancePath: context.path,
          localId:
            primitive.id ??
            (slot
              ? '_slot'
              : `_node_${digestV4(this.pathByNode.get(node) ?? textValue(source.start)).slice(7)}`),
        }
        const renderedId = `wf-${digestV4(jcs({ identity, projectionId: this.bundle.profile.id })).slice(7)}`
        if (this.domIds.has(renderedId))
          this.error('WW_DUPLICATE_ID', 'app.rendered-identity-collision', node)
        this.domIds.add(renderedId)
        const expanded: ExpandedNode = {
          node: primitive,
          owner: context.owner,
          identity,
          renderedId,
          source,
          invocationSources: context.invocationSources,
          children: [],
          stateBindings: {},
          ...(slot ? { slot: true } : {}),
        }
        this.expanded.push(expanded)
        if (!slot && 'children' in node) {
          expanded.children = this.expandChildren(node.children, {
            ...context,
            depth: context.depth + 1,
          })
          for (const child of expanded.children) child.parent = expanded
        }
        result.push(expanded)
      }
    }
    return result
  }
  checkSubstituted(node: CanonicalPrimitive, source: object): void {
    const name =
      node.kind === 'nav-item' ||
      node.kind === 'dropdown-item' ||
      node.kind === 'list-item' ||
      node.kind === 'annotation-item'
        ? 'item'
        : node.kind === 'nav-group'
          ? 'group'
          : node.kind
    const label = node.label === undefined ? '' : ` ${dsl(node.label)}`
    let snippet = `${name}${node.number === undefined ? '' : ` ${node.number}`}${label} ${attrsDsl(node.attributes)}${containers.has(node.kind) ? ' {}' : ''}`
    if (node.kind === 'table') snippet = `table ${attrsDsl(node.attributes)} {}`
    const parent = (
      {
        'nav-item': 'nav',
        'nav-group': 'nav',
        'dropdown-item': 'dropdown',
        'list-item': 'list',
        tab: 'tabs',
        option: 'select',
        'annotation-item': 'annotations',
      } as Record<string, string>
    )[node.kind]
    if (parent !== undefined) snippet = `${parent} { ${snippet} }`
    try {
      parseV4(`page { ${snippet} }`, { languageVersion: '4.0.0' })
    } catch (error) {
      if (error instanceof V4ParseError)
        this.error('WW_PARAMETER', 'app.substituted-attribute-domain', source)
      else throw error
    }
  }
  state(ref: string, expanded: ExpandedNode): JsonObject | undefined {
    const [scope, id] = ref.split(':')
    let declarations: readonly JsonObject[] = []
    if (scope === 'app') declarations = this.bundle.states
    else if (scope === 'component' && expanded.owner.definition.kind === 'component')
      declarations = asObjects(expanded.owner.definition.attributes.states)
    else if (scope === 'screen' && expanded.identity.instanceRoot.kind === 'screen') {
      const root = expanded.identity.instanceRoot
      const owner = this.owners.get(this.key(root.namespace, 'page', root.id))
      declarations = asObjects(owner?.definition.attributes.states)
    } else if (scope === 'shell') {
      const root = expanded.identity.instanceRoot
      const screen =
        root.kind === 'screen'
          ? this.screens.find(
              (screen) => screen.route.namespace === root.namespace && screen.route.id === root.id,
            )
          : undefined
      const owner =
        root.kind === 'shell'
          ? this.owners.get(this.key(root.namespace, 'layout', root.id))
          : this.owners.get(screen?.shell ?? '')
      declarations = asObjects(owner?.definition.attributes.states)
    }
    const state = declarations.find((state) => state.id === id)
    if (state === undefined) this.error('WW_STATE', 'app.unresolved-state', expanded.node, { ref })
    else {
      const root = expanded.identity.instanceRoot
      const shellOwner =
        root.kind === 'shell'
          ? this.owners.get(this.key(root.namespace, 'layout', root.id))
          : this.owners.get(
              this.screens.find(
                (screen) =>
                  screen.route.namespace === root.namespace && screen.route.id === root.id,
              )?.shell ?? '',
            )
      const stateRoot =
        scope === 'app'
          ? 'app'
          : scope === 'shell'
            ? `shell/${shellOwner?.module.namespace}/${shellOwner?.definition.id}`
            : `${root.kind}/${root.namespace}/${root.id}`
      const key =
        scope === 'app'
          ? ref
          : scope === 'component'
            ? `${expanded.owner.key}/${jcs(root)}/${jcs(componentPath(expanded.identity.instancePath))}/${id}`
            : scope === 'screen'
              ? `screen/${root.namespace}/${root.id}/${id}`
              : `${stateRoot}/${id}`
      expanded.stateBindings[ref] = {
        key,
        initial: state.initial,
        type: textValue(state.type),
        lifetime: state.lifetime === 'mount' ? 'mount' : 'session',
        sensitive: state.sensitive === true,
        root: stateRoot,
      }
    }
    return state
  }
  semantics(): void {
    for (const entry of this.bundle.registry.entries)
      for (const binding of Array.isArray(entry.bindings) ? entry.bindings : [])
        this.binding(binding)
    if (
      asObjects(this.bundle.profile.assets).length > 0 ||
      this.bundle.profile.fontAssetId !== undefined
    )
      this.error('WW_ASSET', 'app.asset-decoder-unavailable')
    const scopes = [
      { node: undefined, states: this.bundle.states, app: true },
      ...[...this.owners.values()].map((owner) => ({
        node: owner.definition,
        states: asObjects(owner.definition.attributes.states),
        app: false,
      })),
    ]
    for (const scope of scopes) {
      const ids = new Set<string>()
      for (const state of scope.states) {
        const id = textValue(state.id)
        if (!matchesType(state.initial, textValue(state.type)))
          this.error('WW_STATE', 'app.state-initial-type', scope.node)
        if (ids.has(id)) this.error('WW_DUPLICATE_ID', 'app.duplicate-state', scope.node, { id })
        ids.add(id)
        if (scope.app && state.lifetime !== 'session')
          this.error('WW_STATE', 'app.app-state-lifetime', scope.node)
      }
    }
    const fixtureIds = new Set<string>()
    for (const fixture of this.bundle.fixtures) {
      const id = textValue(fixture.id)
      if (fixtureIds.has(id))
        this.error('WW_DUPLICATE_ID', 'app.duplicate-fixture', undefined, { id })
      fixtureIds.add(id)
    }
    for (const expanded of this.expanded) {
      const { node, owner } = expanded
      const attrs = node.attributes
      const strict = this.bundle.profile.id === 'neutral-app'
      if (
        ['row', 'col', 'stack'].includes(node.kind) &&
        ['left', 'right', 'justify'].includes(textValue(attrs.align))
      )
        this.error('WW_LAYOUT', 'app.container-alignment', node)
      if (attrs.src !== undefined && attrs.src !== true)
        this.error('WW_ASSET', 'app.unresolved-asset', node)
      const interactive = [
        'input',
        'textarea',
        'select',
        'checkbox',
        'radio',
        'switch',
        'slider',
        'button',
        'link',
        'nav-item',
        'dropdown-item',
      ]
      const descendants = (root: ExpandedNode): ExpandedNode[] => {
        const result: ExpandedNode[] = [],
          pending = [...root.children]
        while (pending.length) {
          const child = pending.pop()!
          result.push(child)
          pending.push(...child.children)
        }
        return result
      }
      const descend =
        ['form', 'card', 'tooltip'].includes(node.kind) ||
        attrs.initialFocus !== undefined ||
        attrs.order !== undefined
          ? descendants(expanded)
          : []
      if (node.kind === 'form') {
        if (descend.some((child) => child.node.kind === 'form'))
          this.error('WW_FORM', 'app.nested-form', node)
        const names = new Map<string, ExpandedNode>()
        for (const child of descend.filter((child) =>
          ['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider'].includes(
            child.node.kind,
          ),
        )) {
          const name = textValue(child.node.attributes.name ?? child.node.id)
          const previous = names.get(name)
          if (
            previous &&
            !(
              previous.node.kind === 'radio' &&
              child.node.kind === 'radio' &&
              jcs(previous.node.attributes.bind) === jcs(child.node.attributes.bind) &&
              jcs(previous.node.attributes.value) !== jcs(child.node.attributes.value)
            )
          )
            this.error('WW_FORM', 'app.duplicate-field-name', child.node, { name })
          names.set(name, child)
        }
      }
      if (
        node.kind === 'card' &&
        (attrs.on !== undefined || attrs.navigate !== undefined) &&
        descend.some((child) => interactive.includes(child.node.kind))
      )
        this.error('WW_ACCESSIBILITY', 'app.nested-interactive-card', node)
      if (attrs.role !== undefined) {
        const natural: Record<string, string[]> = {
          button: ['button'],
          link: ['link'],
          image: ['img'],
          alert: ['alert', 'status'],
          toast: ['status', 'alert'],
          spinner: ['status'],
          section: ['region'],
        }
        if (!(natural[node.kind] ?? []).includes(textValue(attrs.role)))
          this.error('WW_ACCESSIBILITY', 'app.incompatible-role', node)
      }
      if (
        attrs.initialFocus !== undefined &&
        !descend.some(
          (child) =>
            child.node.id === attrs.initialFocus &&
            interactive.includes(child.node.kind) &&
            child.node.attributes.disabled !== true,
        )
      )
        this.error('WW_ACCESSIBILITY', 'app.invalid-initial-focus', node)
      if (
        node.kind === 'tooltip' &&
        (expanded.children.length !== 1 ||
          descend.slice(1).some((child) => interactive.includes(child.node.kind)))
      )
        this.error('WW_ACCESSIBILITY', 'app.tooltip-trigger', node)
      if (
        node.kind === 'tabs' &&
        (typeof attrs.active === 'boolean' ||
          Number(attrs.active ?? 0) >=
            expanded.children.filter((child) => child.node.kind === 'tab').length ||
          expanded.children.filter((child) => child.node.kind === 'tab')[Number(attrs.active ?? 0)]
            ?.node.attributes.disabled === true)
      )
        this.error('WW_ACCESSIBILITY', 'app.tab-selection', node)
      if (
        attrs.order !== undefined &&
        attrs.order !== 0 &&
        (interactive.includes(node.kind) ||
          descend.some((child) => interactive.includes(child.node.kind)))
      )
        this.error('WW_ACCESSIBILITY', 'app.visual-focus-order', node)
      for (const key of ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'gap'])
        if (
          attrs[key] === 'auto' ||
          (typeof attrs[key] === 'number'
            ? Number(attrs[key]) < 0
            : object(attrs[key]) && Number(attrs[key].value) < 0)
        )
          this.error('WW_LAYOUT', 'app.invalid-spacing', node, { key })
      for (const key of ['m', 'my', 'mt', 'mr', 'mb', 'ml'])
        if (attrs[key] === 'auto') this.error('WW_LAYOUT', 'app.invalid-spacing', node, { key })
      for (const [minimum, maximum] of [
        ['minW', 'maxW'],
        ['minH', 'maxH'],
        ['minLength', 'maxLength'],
        ['min', 'max'],
      ])
        if (
          typeof attrs[minimum] === 'number' &&
          typeof attrs[maximum] === 'number' &&
          Number(attrs[minimum]) > Number(attrs[maximum])
        )
          this.error('WW_LAYOUT', 'app.inverted-bounds', node, { minimum, maximum })
      for (const key of ['minW', 'maxW', 'minH', 'maxH'])
        if (typeof attrs[key] === 'string')
          this.error('WW_LAYOUT', 'app.bound-keyword', node, { key })
      if (
        attrs.h === 'fit' ||
        (typeof attrs.flex === 'number' && attrs.flex < 0) ||
        (typeof attrs.step === 'number' && attrs.step <= 0)
      )
        this.error('WW_LAYOUT', 'app.invalid-layout-value', node)
      if (
        (attrs.bold === true && attrs.weight !== undefined && attrs.weight !== 'bold') ||
        (attrs.primary === true && attrs.secondary === true) ||
        (attrs.outline === true && attrs.ghost === true)
      )
        this.error('WW_LAYOUT', 'app.conflicting-presentation', node)
      if (
        node.kind !== 'page' &&
        (attrs.x !== undefined || attrs.y !== undefined || attrs.anchor !== undefined)
      ) {
        let parent = expanded.parent
        while (parent && parent.node.kind !== 'relative') parent = parent.parent
        if (!parent) this.error('WW_LAYOUT', 'app.missing-relative-container', node)
      }
      if (object(attrs.h) && attrs.h.unit === '%') {
        const height = expanded.parent?.node.attributes.h ?? expanded.parent?.node.attributes.height
        if (expanded.parent?.node.kind !== 'page' && (height === undefined || height === 'auto'))
          this.error('WW_LAYOUT', 'app.indefinite-percentage-height', node)
      }
      if (
        strict &&
        ['input', 'textarea', 'select', 'checkbox', 'radio', 'switch', 'slider', 'button'].includes(
          node.kind,
        ) &&
        ![node.label, attrs.label, attrs.aria, attrs['aria-label']].some(
          (label) => typeof label === 'string' && label.trim().length > 0,
        )
      )
        this.error('WW_ACCESSIBILITY', 'app.missing-control-name', node)
      if (
        attrs.aria !== undefined &&
        attrs['aria-label'] !== undefined &&
        attrs.aria !== attrs['aria-label']
      )
        this.error('WW_ACCESSIBILITY', 'app.conflicting-name', node)
      if (
        node.kind === 'button' &&
        (attrs.buttonType === 'submit' || attrs.action === 'submit' || attrs.form !== undefined)
      ) {
        let target = expanded.parent
        if (typeof attrs.form === 'string')
          target = this.element(
            {
              scope:
                owner.definition.kind === 'component'
                  ? 'component'
                  : owner.definition.kind === 'layout'
                    ? 'shell'
                    : 'screen',
              id: attrs.form,
            },
            expanded,
          )
        else while (target !== undefined && target.node.kind !== 'form') target = target.parent
        if (target?.node.kind !== 'form' || target.node.id === undefined)
          this.error('WW_REFERENCE', 'app.missing-form', node)
        else expanded.formTarget = target.renderedId
        if (
          attrs.action === 'submit' &&
          attrs.buttonType !== undefined &&
          attrs.buttonType !== 'submit'
        )
          this.error('WW_EVENT', 'app.conflicting-submit-button', node)
      }
      if (
        strict &&
        node.id === undefined &&
        ['on', 'bind', 'navigate', 'opens', 'toggles', 'action'].some(
          (key) => attrs[key] !== undefined,
        )
      )
        this.error('WW_REFERENCE', 'app.addressed-id-required', node)
      if (attrs.navigate !== undefined) {
        if (
          typeof attrs.navigate !== 'string' ||
          (!attrs.navigate.includes('::') && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(attrs.navigate))
        )
          this.error('WW_REFERENCE', 'app.explicit-url-required', node)
        else {
          const [alias, id] = attrs.navigate.includes('::')
            ? attrs.navigate.split('::')
            : [undefined, attrs.navigate]
          const target = this.resolve(owner, 'page', id, alias, node)
          if (target !== undefined)
            expanded.route = { namespace: target.module.namespace, id: target.definition.id! }
        }
      }
      if (typeof attrs.href === 'string' && !safeUrl(attrs.href))
        this.error('WW_REFERENCE', 'app.unsafe-url', node)
      if (
        attrs.action !== undefined &&
        !['back', 'close', 'submit'].includes(textValue(attrs.action))
      )
        this.error('WW_REFERENCE', 'app.unknown-action', node)
      const shorthand = ['navigate', 'opens', 'toggles'].filter((key) => attrs[key] !== undefined)
      if (attrs.action === 'back' || attrs.action === 'close') shorthand.push('action')
      if (
        shorthand.length > 1 ||
        (shorthand.length > 0 && asObjects(attrs.on).some((handler) => handler.event === 'click'))
      )
        this.error('WW_EVENT', 'app.competing-click-handlers', node)
      if (shorthand.length === 1) {
        let effect: JsonObject | undefined
        if (expanded.route)
          effect = {
            kind: 'navigate',
            target: { kind: 'screen', screen: { ...expanded.route } },
            history: 'push',
          }
        else if (attrs.action === 'back') effect = { kind: 'navigateBack' }
        else {
          const scope =
            owner.definition.kind === 'component'
              ? 'component'
              : owner.definition.kind === 'layout'
                ? 'shell'
                : 'screen'
          let id = textValue(attrs.opens ?? attrs.toggles)
          if (attrs.action === 'close') {
            let parent = expanded.parent
            while (parent && !['modal', 'drawer', 'popover', 'dropdown'].includes(parent.node.kind))
              parent = parent.parent
            if (!parent?.node.id) this.error('WW_REFERENCE', 'app.missing-owning-overlay', node)
            else id = parent.node.id
          }
          if (id)
            effect = {
              kind:
                attrs.action === 'close'
                  ? 'close'
                  : attrs.toggles === undefined
                    ? 'open'
                    : 'toggleOverlay',
              target: { scope, id },
            }
        }
        if (effect)
          attrs.on = [
            ...asObjects(attrs.on),
            {
              id: 'shorthand_click',
              event: 'click',
              concurrency: 'drop',
              operations: [
                {
                  id: 'primary_click',
                  executionClass: 'executable',
                  effect,
                  after: [],
                  onFailure: 'stop',
                  obligationRefs: [],
                },
              ],
            },
          ]
      }
      const declarationScope =
        owner.definition.kind === 'component'
          ? 'component'
          : owner.definition.kind === 'layout'
            ? 'shell'
            : 'screen'
      for (const declaration of asObjects(owner.definition.attributes.states))
        this.state(`${declarationScope}:${textValue(declaration.id)}`, expanded)
      const stack: JsonValue[] = [attrs]
      while (stack.length > 0) {
        const value = stack.pop()!
        if (Array.isArray(value)) {
          for (const item of value) stack.push(item)
          continue
        }
        if (!object(value)) continue
        if (typeof value.state === 'string') this.state(value.state, expanded)
        for (const key of ['resultState', 'statusState', 'errorState', 'source', 'target'])
          if (typeof value[key] === 'string' && /^(app|shell|screen|component):/.test(value[key]))
            this.state(value[key], expanded)
        if (
          object(value.read) &&
          Array.isArray(value.read.path) &&
          value.read.path.some((part) =>
            ['__proto__', 'constructor', 'prototype'].includes(textValue(part)),
          )
        )
          this.error('WW_EFFECT', 'app.unsafe-read-path', node)
        for (const [key, child] of Object.entries(value))
          if (!['literal', 'initial', 'states', 'options'].includes(key)) stack.push(child)
      }
      if (object(attrs.bind)) {
        const state = this.state(textValue(attrs.bind.state), expanded)
        if (
          state !== undefined &&
          ((attrs.bind.property === 'checked' && state.type !== 'boolean') ||
            (attrs.bind.property === 'value' &&
              !['number', 'string', 'boolean'].includes(textValue(state.type))))
        )
          this.error('WW_STATE', 'app.binding-type', node)
      }
      if (object(attrs.data) && typeof attrs.data.state === 'string') {
        const state = this.state(attrs.data.state, expanded)
        if (state !== undefined) {
          const rows = state.initial
          const columns = Array.isArray(attrs.columns) ? attrs.columns : []
          if (
            !Array.isArray(rows) ||
            (node.kind === 'table' &&
              rows.some(
                (row) =>
                  !object(row) ||
                  columns.some(
                    (column) =>
                      typeof column !== 'string' ||
                      !Object.hasOwn(row, column) ||
                      (row[column] !== null &&
                        !['string', 'number', 'boolean'].includes(typeof row[column])),
                  ),
              ))
          )
            this.error('WW_STATE', 'app.bound-data-shape', node)
        }
      }
      const handlerIds = new Set<string>(),
        events = new Set<string>(),
        operationIds = new Set<string>()
      for (const handler of asObjects(attrs.on)) {
        const event = `${textValue(handler.event)}/${textValue(handler.key ?? '')}`
        if (handlerIds.has(textValue(handler.id)) || events.has(event))
          this.error('WW_DUPLICATE_ID', 'app.duplicate-handler', node)
        handlerIds.add(textValue(handler.id))
        events.add(event)
        const lifecycleOwner =
          node.kind === 'page' ||
          (owner.definition.kind === 'layout' && node.id === owner.definition.id)
        if (
          (['enter', 'exit'].includes(textValue(handler.event)) && !lifecycleOwner) ||
          (handler.event === 'submit' && node.kind !== 'form')
        )
          this.error('WW_EVENT', 'app.event-owner', node)
        const previous = new Set<string>()
        for (const operation of asObjects(handler.operations)) {
          const id = textValue(operation.id)
          if (operationIds.has(id)) this.error('WW_DUPLICATE_ID', 'app.duplicate-operation', node)
          operationIds.add(id)
          for (const dependency of Array.isArray(operation.after) ? operation.after : [])
            if (!previous.has(textValue(dependency)))
              this.error('WW_EFFECT', 'app.operation-dependency', node, { id })
          previous.add(id)
          const effect = object(operation.effect) ? operation.effect : {}
          if (
            object(effect.target) &&
            ['open', 'close', 'toggleOverlay', 'focus', 'validate'].includes(textValue(effect.kind))
          ) {
            const target = this.element(effect.target, expanded)
            if (
              target === undefined ||
              (effect.kind === 'validate' && target.node.kind !== 'form') ||
              (['open', 'close', 'toggleOverlay'].includes(textValue(effect.kind)) &&
                !['modal', 'drawer', 'popover', 'dropdown', 'tooltip'].includes(target.node.kind))
            )
              this.error('WW_REFERENCE', 'app.invalid-effect-target', node)
            else {
              expanded.effectTargets ??= {}
              expanded.effectTargets[
                `${textValue(effect.target.scope)}:${textValue(effect.target.id)}`
              ] = target.renderedId
            }
          }
          if (
            handler.event === 'exit' &&
            (operation.executionClass !== 'executable' ||
              !['set', 'reset', 'toggle', 'filter', 'sort', 'close'].includes(
                textValue(effect.kind),
              ))
          )
            this.error('WW_EVENT', 'app.exit-effect', node)
          if (effect.kind === 'simulate') {
            const fixture = this.bundle.fixtures.find((fixture) => fixture.id === effect.fixtureRef)
            if (!fixtureIds.has(textValue(effect.fixtureRef)))
              this.error('WW_EFFECT', 'app.missing-fixture', node)
            const result = expanded.stateBindings[textValue(effect.resultState)],
              status = expanded.stateBindings[textValue(effect.statusState)],
              error = expanded.stateBindings[textValue(effect.errorState)]
            if (
              !result ||
              !status ||
              !error ||
              new Set([result.key, status.key, error.key]).size !== 3 ||
              status.type !== 'string' ||
              status.initial !== 'idle' ||
              error.type !== 'record' ||
              jcs(error.initial) !== '{}'
            )
              this.error('WW_EFFECT', 'app.fixture-output-contract', node)
            else if (
              asObjects(fixture?.steps).some(
                (step) => step.outcome === 'success' && !matchesType(step.value, result.type),
              )
            )
              this.error('WW_EFFECT', 'app.fixture-result-type', node)
          }
          if (effect.kind === 'navigate' && object(effect.target)) {
            if (effect.target.kind === 'screen' && object(effect.target.screen))
              this.route(effect.target.screen as unknown as ScreenReference, node)
            if (effect.target.kind === 'url' && !safeUrl(textValue(effect.target.url)))
              this.error('WW_REFERENCE', 'app.unsafe-url', node)
          }
        }
      }
    }
    const stateKeys = new Set(this.bundle.states.map((state) => `app:${textValue(state.id)}`))
    for (const entry of this.expanded)
      for (const state of Object.values(entry.stateBindings)) stateKeys.add(state.key)
    if (stateKeys.size > 4096) this.error('WW_LIMIT', 'app.state-count')
    for (const screen of this.screens) {
      const active = this.expanded.filter((entry) =>
        entry.identity.instanceRoot.kind === 'screen'
          ? entry.identity.instanceRoot.namespace === screen.route.namespace &&
            entry.identity.instanceRoot.id === screen.route.id
          : entry.owner.key === screen.shell,
      )
      if (active.filter((entry) => entry.node.kind === 'main').length > 1)
        this.error('WW_ACCESSIBILITY', 'app.multiple-main-landmarks', screen.children[0]?.node)
    }
  }

  element(ref: JsonObject, source: ExpandedNode): ExpandedNode | undefined {
    const kind = ref.scope === 'screen' ? 'page' : ref.scope === 'shell' ? 'layout' : 'component'
    const candidates = this.expanded.filter(
      (entry) =>
        entry.node.id === ref.id &&
        entry.owner.definition.kind === kind &&
        (kind === 'component' ? entry.owner === source.owner : true) &&
        jcs(entry.identity.instanceRoot) === jcs(source.identity.instanceRoot) &&
        entry.identity.instancePath.length <= source.identity.instancePath.length &&
        entry.identity.instancePath.every(
          (step, index) => jcs(step) === jcs(source.identity.instancePath[index]),
        ),
    )
    candidates.sort((a, b) => b.identity.instancePath.length - a.identity.instancePath.length)
    return candidates[0]
  }
}

interface Expansion {
  owner: Owner
  root: LinkedIdentity['instanceRoot']
  path: InstanceStep[]
  bindings: JsonObject
  fills: Map<string, { nodes: CanonicalNode[]; context: Expansion }>
  invocationSources: V4SourceSpan[]
  depth: number
}
function matchesType(value: JsonValue | undefined, type: string): value is JsonValue {
  return type === 'record'
    ? object(value)
    : type === 'list'
      ? Array.isArray(value)
      : typeof value === type
}
function componentPath(path: InstanceStep[]): InstanceStep[] {
  for (let index = path.length - 1; index >= 0; index--)
    if (path[index].kind === 'use') return path.slice(0, index + 1)
  return []
}
function substitute(
  value: JsonValue,
  bindings: JsonObject,
  missing: (name: string) => void,
): JsonValue {
  if (typeof value === 'string') {
    if (value.startsWith('$$')) return value.slice(1)
    const match = /^\$([A-Za-z_][A-Za-z0-9_-]*)$/.exec(value)
    if (match === null) return value
    if (!Object.hasOwn(bindings, match[1])) {
      missing(match[1])
      return value
    }
    return bindings[match[1]]
  }
  if (Array.isArray(value)) return value.map((item) => substitute(item, bindings, missing))
  if (object(value)) {
    if (typeof value.param === 'string' && Object.keys(value).length === 1) {
      if (!Object.hasOwn(bindings, value.param)) {
        missing(value.param)
        return value
      }
      return { literal: bindings[value.param] }
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, substitute(item, bindings, missing)]),
    )
  }
  return value
}
function attrsDsl(attrs: JsonObject): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}=${dsl(value)}`)
    .join(' ')
}
function safeUrl(value: string): boolean {
  if (
    [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
  )
    return false
  try {
    const url = new URL(value)
    return (
      ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

function asObjects(value: JsonValue | undefined): JsonObject[] {
  return Array.isArray(value) ? value.filter(object) : []
}

export function linkAppV4(bundle: AppBundle): AppResult<LinkedApp> {
  const data = typeof bundle === 'object' && bundle !== null ? bundles.get(bundle) : undefined
  if (data === undefined) return failed([diagnostic('WW_SCHEMA', 'app.untrusted-bundle')])
  const linker = new Linker(bundle, data)
  linker.index()
  linker.imports()
  linker.references()
  linker.registryChecks()
  if (linker.diagnostics.length > 0) return failed(linker.diagnostics)
  linker.expandAll()
  linker.semantics()
  if (linker.diagnostics.length > 0) return failed(linker.diagnostics)
  const sourceMap = linker.expanded.map((entry): SourceMapEntry => ({
    renderedId: entry.renderedId,
    identity: entry.identity,
    moduleId: entry.owner.module.id,
    source: entry.source,
    invocationSources: entry.invocationSources,
    requirementRefs: stringArray(entry.node.attributes.requirementRefs),
    obligationRefs: stringArray(entry.node.attributes.obligationRefs),
    operationIds: asObjects(entry.node.attributes.on).flatMap((handler) =>
      asObjects(handler.operations).map((operation) => textValue(operation.id)),
    ),
  }))
  const linked: LinkedApp = freeze({
    [linkedBrand]: true as const,
    kind: 'LinkedApp' as const,
    languageVersion: '4.0.0' as const,
    id: bundle.id,
    digest: digestV4(jcs(bundle)),
    sourceMap,
  })
  links.set(linked, {
    bundle,
    screens: linker.screens,
    shells: linker.shells,
    nodes: linker.expanded,
    sourceMap,
  })
  return { ok: true, value: linked, diagnostics: [] }
}

function stringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/** Internal compiler boundary; callers cannot manufacture link provenance. */
export function getLinkedAppData(linked: LinkedApp): LinkedData | undefined {
  return typeof linked === 'object' && linked !== null ? links.get(linked) : undefined
}

export { asObjects, diagnostic, failed, freeze, jcs, object, textValue }
