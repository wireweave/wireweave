import languageSchema from '../../../../docs/spec/schema.json'
import { digestV4, failV4, tokenizeV4, type V4Token } from './v4-lexical'
import {
  V4ParseError,
  type CanonicalDefinition,
  type CanonicalModule,
  type CanonicalNode,
  type CanonicalParameter,
  type CanonicalPrimitive,
  type CanonicalSymbol,
  type CanonicalUse,
  type JsonObject,
  type JsonValue,
  type ParsedDocument,
  type PrimitiveKind,
  type V4ParseOptions,
  type V4ParseResult,
  type V4SourceSpan,
} from './v4-types'

// tsup embeds this JSON in both published bundles; parsing performs no I/O.
interface Shape {
  $ref?: string
  type?: string | string[]
  const?: unknown
  enum?: unknown[]
  properties?: Record<string, Shape>
  patternProperties?: Record<string, Shape>
  propertyNames?: Shape
  additionalProperties?: Shape | boolean
  required?: string[]
  items?: Shape
  minItems?: number
  maxItems?: number
  minProperties?: number
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  allOf?: Shape[]
  anyOf?: Shape[]
  oneOf?: Shape[]
  not?: Shape
  if?: Shape
  then?: Shape
  else?: Shape
}
const shapes = languageSchema.$defs as unknown as Record<string, Shape>
const attributes = new Set(Object.keys(shapes.Attributes?.properties ?? {}))
const flags = new Set(
  (
    'flex border rounded muted bold primary secondary outline ghost danger required ' +
    'disabled readonly checked loading external expanded centered vertical scroll dismissible ' +
    'indeterminate pill striped bordered hover ordered none wrap active'
  ).split(' '),
)
const containers = new Set(
  (
    'header main footer sidebar section row col stack relative card modal ' +
    'drawer accordion popover form'
  ).split(' '),
)
const leaves = new Set(
  (
    'text title link button input textarea checkbox radio switch slider image ' +
    'placeholder avatar badge icon divider alert toast progress spinner tooltip'
  ).split(' '),
)
const collections = new Set('select table list nav dropdown tabs breadcrumb annotations'.split(' '))
const keywords = new Set([
  ...containers,
  ...leaves,
  ...collections,
  'language',
  'app',
  'module',
  'import',
  'export',
  'page',
  'layout',
  'component',
  'use',
  'fill',
  'slot',
  'repeat',
  'columns',
  'item',
  'group',
  'tab',
  'option',
  'marker',
])
const idPattern = /^[A-Za-z_][A-Za-z0-9_-]{0,127}$/
const parameterReference = /^\$([A-Za-z_][A-Za-z0-9_-]{0,127})$/
const spans = new WeakMap<object, V4SourceSpan>()
const fieldSpans = new WeakMap<object, Map<string, V4SourceSpan>>()

/** Original-source metadata is kept outside the canonical JSON document. */
export function getV4SourceSpan(value: object): Readonly<V4SourceSpan> | undefined {
  const span = spans.get(value)
  return span === undefined ? undefined : Object.freeze({ ...span })
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ownSet(object: JsonObject, key: string, value: JsonValue): void {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  })
}

interface ShapeIssue {
  path: string
  keyword: string
}
const pointer = (path: string, key: string | number): string =>
  `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`

// Registry identities and references are resolved by bundle validation. The parser
// checks the envelope and retains every entry, including product-specific fields.
const registryEnvelope: Shape = {
  type: 'object',
  required: ['schemaVersion', 'entries', 'digest'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: '1.0.0' },
    entries: { type: 'array', items: { type: 'object' }, maxItems: 100000 },
    digest: { $ref: '#/$defs/Digest' },
  },
}

/** Interprets only the shape vocabulary used by the bundled Core contract. */
function shapeIssue(value: unknown, shape: Shape, path = ''): ShapeIssue | undefined {
  const issue = (keyword: string): ShapeIssue => ({ path, keyword })
  if (shape.$ref !== undefined) {
    const target = shape.$ref.startsWith('#/$defs/')
      ? shapes[shape.$ref.slice('#/$defs/'.length)]
      : shape.$ref === 'https://wireweave.org/contracts/product/1.0/schema.json#/$defs/Registry'
        ? registryEnvelope
        : undefined
    if (target === undefined) throw new Error(`Unbundled Core shape: ${shape.$ref}`)
    const result = shapeIssue(value, target, path)
    if (result !== undefined) return result
  }
  if (shape.type !== undefined) {
    const matches = (type: string): boolean => {
      if (type === 'null') return value === null
      if (type === 'object') return isObject(value)
      if (type === 'array') return Array.isArray(value)
      if (type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value)
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
      return typeof value === type
    }
    if (!(Array.isArray(shape.type) ? shape.type : [shape.type]).some(matches)) return issue('type')
  }
  if (Object.hasOwn(shape, 'const') && value !== shape.const) return issue('const')
  if (shape.enum !== undefined && !shape.enum.includes(value)) return issue('enum')
  if (typeof value === 'number') {
    if (shape.minimum !== undefined && value < shape.minimum) return issue('minimum')
    if (shape.maximum !== undefined && value > shape.maximum) return issue('maximum')
  }
  if (typeof value === 'string') {
    const length = [...value].length
    if (shape.minLength !== undefined && length < shape.minLength) return issue('minLength')
    if (shape.maxLength !== undefined && length > shape.maxLength) return issue('maxLength')
    if (shape.pattern !== undefined && !new RegExp(shape.pattern, 'u').test(value))
      return issue('pattern')
  }
  if (Array.isArray(value)) {
    if (shape.minItems !== undefined && value.length < shape.minItems) return issue('minItems')
    if (shape.maxItems !== undefined && value.length > shape.maxItems) return issue('maxItems')
    if (shape.items !== undefined) {
      for (const [index, item] of value.entries()) {
        const result = shapeIssue(item, shape.items, pointer(path, index))
        if (result !== undefined) return result
      }
    }
  }
  if (isObject(value)) {
    for (const name of shape.required ?? []) {
      if (!Object.hasOwn(value, name)) return { path: pointer(path, name), keyword: 'required' }
    }
    if (shape.minProperties !== undefined && Object.keys(value).length < shape.minProperties) {
      return issue('minProperties')
    }
    for (const [name, item] of Object.entries(value)) {
      const itemPath = pointer(path, name)
      if (shape.propertyNames !== undefined) {
        const result = shapeIssue(name, shape.propertyNames, itemPath)
        if (result !== undefined) return result
      }
      const direct =
        shape.properties !== undefined && Object.hasOwn(shape.properties, name)
          ? shape.properties[name]
          : undefined
      const patterns = Object.entries(shape.patternProperties ?? {})
        .filter(([pattern]) => new RegExp(pattern, 'u').test(name))
        .map(([, child]) => child)
      if (direct !== undefined) patterns.push(direct)
      if (patterns.length === 0) {
        if (shape.additionalProperties === false)
          return { path: itemPath, keyword: 'additionalProperties' }
        if (typeof shape.additionalProperties === 'object')
          patterns.push(shape.additionalProperties)
      }
      for (const child of patterns) {
        const result = shapeIssue(item, child, itemPath)
        if (result !== undefined) return result
      }
    }
  }
  for (const child of shape.allOf ?? []) {
    const result = shapeIssue(value, child, path)
    if (result !== undefined) return result
  }
  for (const kind of ['anyOf', 'oneOf'] as const) {
    const alternatives = shape[kind]
    if (alternatives === undefined) continue
    const results = alternatives.map((child) => shapeIssue(value, child, path))
    const matches = results.filter((result) => result === undefined).length
    if (matches === 0) {
      // Prefer the deepest authored field over a union's generic discriminator error.
      return results.reduce<ShapeIssue>(
        (best, result) =>
          result !== undefined && result.path.length > best.path.length ? result : best,
        issue(kind),
      )
    }
    if (kind === 'oneOf' && matches !== 1) return issue(kind)
  }
  if (shape.not !== undefined && shapeIssue(value, shape.not, path) === undefined)
    return issue('not')
  if (shape.if !== undefined) {
    const branch = shapeIssue(value, shape.if, path) === undefined ? shape.then : shape.else
    if (branch !== undefined) return shapeIssue(value, branch, path)
  }
  return undefined
}

class CanonicalParser {
  private cursor = 0
  private nodes = 0
  private depth = 0
  private templateDepth = 0
  private formDepth = 0
  private readonly tokens: V4Token[]

  constructor(
    private readonly source: string,
    sourceId: string,
  ) {
    this.tokens = tokenizeV4(source, sourceId)
  }

  private get token(): V4Token {
    return this.tokens[this.cursor]
  }
  private get previous(): V4Token {
    return this.tokens[Math.max(0, this.cursor - 1)]
  }
  private at(text: string): boolean {
    return this.token.kind !== 'string' && this.token.kind !== 'end' && this.token.text === text
  }
  private take(): V4Token {
    const token = this.token
    if (token.kind !== 'end') this.cursor++
    return token
  }
  private accept(text: string): boolean {
    if (!this.at(text)) return false
    this.take()
    return true
  }
  private expect(text: string): V4Token {
    if (!this.at(text)) this.syntax('parse.expected-token', { expected: text })
    return this.take()
  }
  private syntax(key: string, details: JsonObject = {}): never {
    return failV4('WW_SYNTAX', this.token.span, key, details)
  }
  private mark<T extends object>(value: T, start: V4Token, authoredId?: boolean): T {
    const end = this.previous.span.end < start.span.end ? start : this.previous
    spans.set(value, {
      ...start.span,
      end: end.span.end,
      endLine: end.span.endLine,
      endColumn: end.span.endColumn,
      ...(authoredId === undefined ? {} : { authoredId }),
    })
    return value
  }
  private nested<T>(callback: () => T): T {
    if (++this.depth > 128) failV4('WW_LIMIT', this.token.span, 'parse.nesting-limit')
    try {
      return callback()
    } finally {
      this.depth--
    }
  }
  private identifier(definition = false): string {
    const token = this.token
    if (token.kind !== 'word' || !idPattern.test(token.text))
      this.syntax('parse.expected-identifier')
    if (definition && keywords.has(token.text)) this.syntax('parse.reserved-definition-id')
    this.take()
    return token.text
  }
  private string(): string {
    if (this.token.kind !== 'string') this.syntax('parse.expected-string')
    return this.take().value as string
  }
  private unsigned(): number {
    if (
      this.token.kind !== 'value' ||
      !/^\d+$/.test(this.token.text) ||
      typeof this.token.value !== 'number' ||
      !Number.isSafeInteger(this.token.value)
    ) {
      this.syntax('parse.expected-unsigned-integer')
    }
    return this.take().value as number
  }

  private set(object: JsonObject, key: string, value: JsonValue, token: V4Token): void {
    if (Object.hasOwn(object, key))
      failV4('WW_DUPLICATE_KEY', token.span, 'parse.duplicate-key', { key })
    ownSet(object, key, value)
    let fields = fieldSpans.get(object)
    if (fields === undefined) {
      fields = new Map()
      fieldSpans.set(object, fields)
    }
    fields.set(key, token.span)
  }

  private value(): JsonValue {
    const start = this.token
    if (this.accept('['))
      return this.nested(() => {
        const values: JsonValue[] = []
        while (!this.at(']')) {
          if (values.length >= 100000) failV4('WW_LIMIT', this.token.span, 'parse.array-limit')
          values.push(this.value())
          this.accept(',')
        }
        this.expect(']')
        return this.mark(values, start)
      })
    if (this.accept('{'))
      return this.nested(() => {
        const values: JsonObject = {}
        while (!this.at('}')) {
          const keyToken = this.token
          const key = keyToken.kind === 'string' ? this.string() : this.identifier()
          const value = this.accept('=')
            ? this.value()
            : flags.has(key)
              ? true
              : this.syntax('parse.expected-token', { expected: '=' })
          this.set(values, key, value, keyToken)
          this.accept(',')
        }
        this.expect('}')
        return this.mark(values, start)
      })
    if (start.kind === 'word' || start.kind === 'string' || start.kind === 'value') {
      this.take()
      if (isObject(start.value)) this.mark(start.value, start)
      return start.value
    }
    return this.syntax('parse.expected-value')
  }

  private attrs(allowed = attributes): JsonObject {
    const start = this.token
    const result: JsonObject = {}
    while (this.token.kind === 'word') {
      const token = this.token
      const key = token.text
      if (this.tokens[this.cursor + 1]?.text === '=') {
        if (!allowed.has(key))
          failV4('WW_UNKNOWN_ATTRIBUTE', token.span, 'parse.unknown-attribute', { key })
        this.identifier()
        this.expect('=')
        this.set(result, key, this.value(), token)
      } else if (
        key === 'at' &&
        this.tokens[this.cursor + 1]?.text === '(' &&
        allowed === attributes
      ) {
        this.take()
        this.expect('(')
        const x = this.value()
        this.expect(',')
        const y = this.value()
        this.expect(')')
        if (typeof x !== 'number' || typeof y !== 'number') this.syntax('parse.expected-coordinate')
        this.set(result, 'x', x, token)
        this.set(result, 'y', y, token)
      } else if (flags.has(key) && allowed.has(key)) {
        this.take()
        this.set(result, key, true, token)
      } else break
    }
    return this.mark(result, start)
  }

  parse(): ParsedDocument {
    const start = this.token
    if (this.accept('language')) {
      const versionToken = this.token
      const version = this.string()
      if (version !== '4.0.0')
        failV4('WW_VERSION', versionToken.span, 'parse.unsupported-language', { version })
      this.accept(';')
    }
    const result: ParsedDocument = {
      schemaVersion: '1.0.0',
      languageVersion: '4.0.0',
      modules: [],
      states: [],
      fixtures: [],
      registry: { schemaVersion: '1.0.0', entries: [], digest: digestV4('[]') },
      app: {
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
      },
    }
    if (this.accept('app')) {
      result.app.id = this.identifier()
      const attrs = this.attrs(new Set(['entry', 'profile', 'states', 'registry', 'fixtures']))
      if (!Object.hasOwn(attrs, 'entry'))
        failV4('WW_SCHEMA', this.token.span, 'parse.app-entry-required', {}, '/app/entry', 'schema')
      result.app.entry = attrs.entry as ParsedDocument['app']['entry']
      if (Object.hasOwn(attrs, 'profile')) result.app.profile = attrs.profile as JsonObject
      for (const key of ['states', 'registry', 'fixtures'] as const) {
        if (Object.hasOwn(attrs, key)) Object.assign(result, { [key]: attrs[key] })
      }
      fieldSpans.set(result.app, fieldSpans.get(attrs) ?? new Map<string, V4SourceSpan>())
      this.expect('{')
      while (!this.at('}')) {
        if (result.modules.length >= 256) failV4('WW_LIMIT', this.token.span, 'parse.module-limit')
        result.modules.push(this.module())
      }
      this.expect('}')
    } else if (this.at('module')) result.modules.push(this.module())
    else {
      const module: CanonicalModule = {
        id: 'main',
        namespace: 'main',
        sourceDigest: digestV4(this.source),
        imports: [],
        exports: [],
        definitions: [],
      }
      while (this.token.kind !== 'end') module.definitions.push(this.definition())
      result.modules.push(this.mark(module, start))
    }
    if (this.token.kind !== 'end') this.syntax('parse.trailing-input')
    this.mark(result, start)
    spans.set(result.app, spans.get(result)!)
    const issue = shapeIssue(result, shapes.ParsedDocument)
    if (issue !== undefined) {
      failV4(
        'WW_SCHEMA',
        this.locate(result, issue.path),
        'parse.invalid-shape',
        { keyword: issue.keyword },
        issue.path,
        'schema',
      )
    }
    return result
  }

  private locate(root: object, path: string): V4SourceSpan {
    let value: unknown = root
    let span = spans.get(root) ?? this.token.span
    for (const encoded of path.split('/').slice(1)) {
      const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~')
      if (typeof value !== 'object' || value === null) break
      span = fieldSpans.get(value)?.get(key) ?? spans.get(value) ?? span
      value = (value as Record<string, unknown>)[key]
      if (typeof value === 'object' && value !== null) span = spans.get(value) ?? span
    }
    return span
  }

  private module(): CanonicalModule {
    const start = this.expect('module')
    const id = this.identifier()
    this.expect('namespace')
    this.expect('=')
    const namespace = this.identifier()
    const result: CanonicalModule = {
      id,
      namespace,
      sourceDigest: '',
      imports: [],
      exports: [],
      definitions: [],
    }
    this.expect('{')
    while (!this.at('}')) {
      if (this.accept('import')) {
        const importStart = this.previous
        const alias = this.identifier()
        this.expect('from')
        this.expect('=')
        const moduleId = this.string()
        this.expect('digest')
        this.expect('=')
        const digest = this.string()
        this.expect('symbols')
        this.expect('=')
        const symbols = this.value()
        if (!Array.isArray(symbols)) this.syntax('parse.expected-array')
        this.accept(';')
        result.imports.push(
          this.mark(
            {
              namespace: alias,
              moduleId,
              digest,
              symbols: symbols as unknown as CanonicalSymbol[],
            },
            importStart,
          ),
        )
      } else if (this.accept('export')) {
        const exportStart = this.previous
        if (!this.at('page') && !this.at('layout') && !this.at('component'))
          this.syntax('parse.expected-definition-kind')
        const kind = this.take().text as CanonicalSymbol['kind']
        const id = this.identifier(true)
        this.expect(';')
        result.exports.push(this.mark({ kind, id }, exportStart))
      } else {
        if (result.definitions.length >= 10000)
          failV4('WW_LIMIT', this.token.span, 'parse.definition-limit')
        result.definitions.push(this.definition())
      }
    }
    this.expect('}')
    const bytes = this.source.slice(start.span.start, this.previous.span.end)
    if (new TextEncoder().encode(bytes).byteLength > 8 * 1024 * 1024) {
      failV4('WW_LIMIT', start.span, 'parse.module-byte-limit')
    }
    result.sourceDigest = digestV4(bytes)
    return this.mark(result, start)
  }

  private definition(): CanonicalPrimitive | CanonicalDefinition {
    if (this.at('page')) return this.primitive('page')
    if (!this.at('layout') && !this.at('component')) this.syntax('parse.expected-definition')
    const start = this.take()
    const kind = start.text as 'layout' | 'component'
    const id = this.identifier(true)
    const parameters: CanonicalParameter[] = []
    if (kind === 'component' && this.accept('(')) {
      const names = new Set<string>()
      while (!this.at(')')) {
        const parameterStart = this.token
        const name = this.identifier()
        this.expect(':')
        if (names.has(name))
          failV4('WW_DUPLICATE_KEY', parameterStart.span, 'parse.duplicate-parameter', {
            key: name,
          })
        names.add(name)
        const type = this.identifier()
        if (!['string', 'number', 'boolean', 'record', 'list'].includes(type))
          this.syntax('parse.invalid-parameter-type')
        const parameter: CanonicalParameter = { id: name, type: type as CanonicalParameter['type'] }
        if (this.accept('=')) {
          parameter.default = this.value()
          const expected = type === 'record' ? 'object' : type === 'list' ? 'array' : type
          if (shapeIssue(parameter.default, { type: expected }) !== undefined) {
            failV4(
              'WW_SCHEMA',
              parameterStart.span,
              'parse.invalid-parameter-default',
              { type },
              '',
              'schema',
            )
          }
        }
        parameters.push(this.mark(parameter, parameterStart))
        if (!this.accept(',') && !this.at(')'))
          this.syntax('parse.expected-token', { expected: ',' })
      }
      this.expect(')')
    }
    const attributes = this.attrs()
    if (Object.hasOwn(attributes, 'id'))
      failV4('WW_DUPLICATE_KEY', start.span, 'parse.duplicate-definition-id')
    this.templateDepth++
    let children: CanonicalNode[]
    try {
      children = this.block()
    } finally {
      this.templateDepth--
    }
    return this.mark({ kind, id, parameters, attributes, children }, start, true)
  }

  private block(): CanonicalNode[] {
    this.expect('{')
    return this.nested(() => {
      const children: CanonicalNode[] = []
      while (!this.at('}')) children.push(this.node())
      this.expect('}')
      return children
    })
  }

  private node(): CanonicalNode {
    if (++this.nodes > 250000) failV4('WW_LIMIT', this.token.span, 'parse.node-limit')
    if (this.at('use')) return this.use()
    if (this.at('slot')) {
      const start = this.take()
      if (this.templateDepth === 0) failV4('WW_SYNTAX', start.span, 'parse.slot-outside-template')
      const result: { kind: 'slot'; name?: string } = { kind: 'slot' }
      if (
        this.token.kind === 'word' &&
        !keywords.has(this.token.text) &&
        this.token.span.startLine === start.span.endLine
      )
        result.name = this.identifier()
      if (
        !this.accept(';') &&
        !this.at('}') &&
        this.token.span.startLine === this.previous.span.endLine
      ) {
        this.syntax('parse.slot-terminator')
      }
      return this.mark(result, start)
    }
    if (this.at('repeat')) {
      const start = this.take()
      const count = this.unsigned()
      let id: string | undefined
      if (this.accept('id')) {
        this.expect('=')
        id = this.identifier()
      }
      const children = this.block()
      return this.mark(
        { kind: 'repeat', count, ...(id === undefined ? {} : { id }), children },
        start,
        id !== undefined,
      )
    }
    if (
      this.token.kind !== 'word' ||
      (!containers.has(this.token.text) &&
        !leaves.has(this.token.text) &&
        !collections.has(this.token.text) &&
        !this.at('marker'))
    )
      this.syntax('parse.expected-node')
    return this.primitive(this.token.text as PrimitiveKind)
  }

  private use(): CanonicalUse {
    const start = this.expect('use')
    const name = this.identifier(true)
    const inputs: CanonicalUse['inputs'] = {}
    if (this.accept('(')) {
      while (!this.at(')')) {
        const token = this.token
        const key = this.identifier()
        this.expect('=')
        if (Object.hasOwn(inputs, key))
          failV4('WW_DUPLICATE_KEY', token.span, 'parse.duplicate-argument', { key })
        const value = this.value()
        const match = typeof value === 'string' ? parameterReference.exec(value) : null
        Object.defineProperty(inputs, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: match === null ? { literal: value } : { param: match[1] },
        })
        if (!this.accept(',') && !this.at(')'))
          this.syntax('parse.expected-token', { expected: ',' })
      }
      this.expect(')')
    }
    let namespace: string | undefined
    if (this.accept('from')) {
      this.expect('=')
      namespace = this.string()
    }
    let id: string | undefined
    if (this.accept('id')) {
      this.expect('=')
      id = this.identifier()
    }
    const fills: CanonicalUse['fills'] = []
    if (this.accept('{'))
      this.nested(() => {
        const names = new Set<string>()
        while (!this.at('}')) {
          const fillStart = this.expect('fill')
          const name = this.identifier()
          if (names.has(name))
            failV4('WW_DUPLICATE_KEY', fillStart.span, 'parse.duplicate-fill', { key: name })
          names.add(name)
          fills.push(this.mark({ name, children: this.block() }, fillStart))
        }
        this.expect('}')
      })
    return this.mark(
      {
        kind: 'use',
        id: id ?? `_inspection_${start.span.start}`,
        name,
        ...(namespace === undefined ? {} : { namespace }),
        inputs,
        fills,
      },
      start,
      id !== undefined,
    )
  }

  private primitive(kind: PrimitiveKind, spelling: string = kind): CanonicalPrimitive {
    const start = this.expect(spelling)
    let number: number | undefined
    if (kind === 'marker' || kind === 'annotation-item') number = this.unsigned()
    const labelToken = this.token.kind === 'string' ? this.take() : undefined
    const label = labelToken?.value as string | undefined
    let array: JsonValue[] | undefined
    if (collections.has(kind) && this.at('[')) array = this.value() as JsonValue[]
    const attrs = this.attrs()
    const result: CanonicalPrimitive = { kind, attributes: attrs, children: [] }
    if (Object.hasOwn(attrs, 'id')) {
      if (
        typeof attrs.id !== 'string' ||
        !idPattern.test(attrs.id) ||
        (kind === 'page' && keywords.has(attrs.id))
      ) {
        failV4(
          'WW_SCHEMA',
          fieldSpans.get(attrs)?.get('id') ?? start.span,
          'parse.invalid-id',
          {},
          '',
          'schema',
        )
      }
      result.id = attrs.id
      delete attrs.id
    }
    if (label !== undefined && labelToken !== undefined) {
      if (kind === 'image') this.set(attrs, 'src', label, labelToken)
      else if (kind === 'avatar' || kind === 'icon') this.set(attrs, 'name', label, labelToken)
      else {
        if (Object.hasOwn(attrs, 'label'))
          failV4('WW_DUPLICATE_KEY', labelToken.span, 'parse.duplicate-key', { key: 'label' })
        result.label = label
      }
    }
    if (number !== undefined) result.number = number
    if (collections.has(kind)) this.collection(result, array, start)
    else if (kind === 'form') {
      if (this.formDepth !== 0) failV4('WW_SYNTAX', start.span, 'parse.nested-form')
      this.formDepth++
      try {
        result.children = this.block()
      } finally {
        this.formDepth--
      }
    } else if (kind === 'page' || containers.has(kind) || kind === 'tab' || kind === 'nav-group') {
      result.children = kind === 'nav-group' ? this.itemBlock('nav-group') : this.block()
    } else if (kind === 'list-item' && this.at('{')) result.children = this.itemBlock('list')
    else if (
      (kind === 'placeholder' || kind === 'tooltip' || kind === 'annotation-item') &&
      this.at('{')
    )
      result.children = this.block()
    else if (this.at('{')) this.syntax('parse.leaf-block')
    return this.mark(result, start, result.id !== undefined)
  }

  private collection(
    result: CanonicalPrimitive,
    array: JsonValue[] | undefined,
    start: V4Token,
  ): void {
    const { kind, attributes: attrs } = result
    if (kind === 'table') {
      this.table(result, array, start)
      return
    }
    let blockChildren: CanonicalNode[] | undefined
    if (this.at('{')) blockChildren = this.itemBlock(kind)
    if (kind === 'select') {
      const sources =
        Number(array !== undefined) +
        Number(Object.hasOwn(attrs, 'options')) +
        Number(blockChildren !== undefined)
      if (sources > 1) failV4('WW_DUPLICATE_KEY', start.span, 'parse.competing-options')
      const options = array ?? attrs.options
      if (options !== undefined) {
        if (!Array.isArray(options))
          failV4('WW_SCHEMA', start.span, 'parse.invalid-options', {}, '', 'schema')
        ownSet(
          attrs,
          'options',
          options.map((option) => this.option(option, start)),
        )
      } else if (blockChildren !== undefined) {
        ownSet(
          attrs,
          'options',
          blockChildren.map((child) => {
            const option = child as CanonicalPrimitive
            return {
              label: option.label ?? '',
              value: option.attributes.value ?? option.label ?? '',
              ...option.attributes,
            }
          }),
        )
      }
      return
    }
    const mapped = array?.map((item) => this.collectionItem(item, kind, start))
    if (mapped !== undefined && blockChildren !== undefined) {
      if (
        kind !== 'tabs' ||
        mapped.length !== blockChildren.length ||
        mapped.some(
          (item, index) => item.label !== (blockChildren[index] as CanonicalPrimitive).label,
        )
      ) {
        failV4('WW_SYNTAX', start.span, 'parse.competing-children')
      }
    }
    result.children = blockChildren ?? mapped ?? []
    if (kind === 'breadcrumb' && array === undefined)
      failV4('WW_SYNTAX', start.span, 'parse.breadcrumb-array-required')
    if (kind === 'annotations' && blockChildren === undefined)
      failV4('WW_SYNTAX', start.span, 'parse.annotation-block-required')
    if (attrs.data !== undefined && (array !== undefined || blockChildren !== undefined)) {
      failV4('WW_SCHEMA', start.span, 'parse.competing-data', {}, '', 'schema')
    }
  }

  private option(value: JsonValue, start: V4Token): JsonObject {
    if (typeof value === 'string') return { label: value, value }
    if (!isObject(value) || typeof value.label !== 'string') {
      failV4('WW_SCHEMA', start.span, 'parse.invalid-option', {}, '', 'schema')
    }
    return { ...value, value: value.value ?? value.label }
  }

  private collectionItem(
    value: JsonValue,
    parent: PrimitiveKind,
    start: V4Token,
  ): CanonicalPrimitive {
    const kind: PrimitiveKind =
      parent === 'tabs'
        ? 'tab'
        : parent === 'list'
          ? 'list-item'
          : parent === 'dropdown'
            ? 'dropdown-item'
            : 'nav-item'
    if (
      parent === 'dropdown' &&
      typeof value === 'string' &&
      ['---', '-', 'divider'].includes(value)
    ) {
      return this.mark({ kind: 'divider', attributes: {}, children: [] }, start)
    }
    if (typeof value === 'string')
      return this.mark({ kind, label: value, attributes: {}, children: [] }, start)
    if (!isObject(value) || typeof value.label !== 'string') {
      failV4('WW_SCHEMA', start.span, 'parse.invalid-collection-item', {}, '', 'schema')
    }
    const { label, id, ...attributes } = value
    const result: CanonicalPrimitive = { kind, label, attributes, children: [] }
    if (id !== undefined) {
      if (typeof id !== 'string' || !idPattern.test(id))
        failV4('WW_SCHEMA', start.span, 'parse.invalid-id', {}, '', 'schema')
      result.id = id
    }
    return this.mark(result, start, id !== undefined)
  }

  private itemBlock(parent: PrimitiveKind): CanonicalNode[] {
    this.expect('{')
    return this.nested(() => {
      const children: CanonicalNode[] = []
      while (!this.at('}')) {
        let kind: PrimitiveKind
        let spelling: string
        if (
          (parent === 'nav' || parent === 'nav-group' || parent === 'dropdown') &&
          this.at('divider')
        ) {
          kind = 'divider'
          spelling = 'divider'
        } else if (parent === 'nav' && this.at('group')) {
          kind = 'nav-group'
          spelling = 'group'
        } else if (parent === 'tabs') {
          kind = 'tab'
          spelling = 'tab'
        } else if (parent === 'select') {
          kind = 'option'
          spelling = 'option'
        } else {
          kind =
            parent === 'list'
              ? 'list-item'
              : parent === 'annotations'
                ? 'annotation-item'
                : parent === 'dropdown'
                  ? 'dropdown-item'
                  : 'nav-item'
          spelling = 'item'
        }
        if (spelling !== 'divider') {
          const labelIndex = this.cursor + (kind === 'annotation-item' ? 2 : 1)
          if (this.tokens[labelIndex]?.kind !== 'string') this.syntax('parse.item-label-required')
        }
        children.push(this.primitive(kind, spelling))
      }
      this.expect('}')
      return children
    })
  }

  private table(result: CanonicalPrimitive, array: JsonValue[] | undefined, start: V4Token): void {
    let columns: JsonValue | undefined
    const rows: JsonValue[] = []
    if (array !== undefined) {
      ;[columns] = array
      rows.push(...array.slice(1))
    }
    if (this.accept('{')) {
      if (array !== undefined) failV4('WW_SYNTAX', start.span, 'parse.competing-table-bodies')
      if (this.accept('columns')) columns = this.value()
      while (!this.at('}')) {
        this.expect('row')
        rows.push(this.value())
      }
      this.expect('}')
    }
    if (columns !== undefined) this.set(result.attributes, 'columns', columns, start)
    columns = result.attributes.columns
    if (
      !Array.isArray(columns) ||
      columns.length === 0 ||
      columns.some((cell) => typeof cell !== 'string')
    ) {
      failV4('WW_SCHEMA', start.span, 'parse.invalid-table-columns', {}, '', 'schema')
    }
    if (
      rows.some(
        (row) =>
          !Array.isArray(row) ||
          row.length !== columns.length ||
          row.some((cell) => typeof cell === 'object' && cell !== null),
      )
    ) {
      failV4('WW_SCHEMA', start.span, 'parse.invalid-table-row', {}, '', 'schema')
    }
    if (Object.hasOwn(result.attributes, 'data')) {
      if (rows.length !== 0)
        failV4('WW_SCHEMA', start.span, 'parse.competing-data', {}, '', 'schema')
    } else result.items = rows
  }
}

export function parseV4(source: string, options: V4ParseOptions): ParsedDocument {
  if (typeof source !== 'string') throw new TypeError('Wireweave source must be a string')
  if (
    options.sourceId !== undefined &&
    (typeof options.sourceId !== 'string' || options.sourceId.length === 0)
  ) {
    throw new TypeError('sourceId must be a non-empty string')
  }
  const sourceId = options.sourceId ?? 'source'
  if (options.languageVersion !== '4.0.0') {
    failV4(
      'WW_VERSION',
      { sourceId, start: 0, end: 0, startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
      'parse.unsupported-language',
      { version: options.languageVersion },
    )
  }
  return new CanonicalParser(source, sourceId).parse()
}

export function tryParseV4(source: string, options: V4ParseOptions): V4ParseResult {
  try {
    return { ok: true, value: parseV4(source, options), diagnostics: [] }
  } catch (error) {
    if (error instanceof V4ParseError)
      return { ok: false, value: null, diagnostics: error.diagnostics }
    throw error
  }
}
