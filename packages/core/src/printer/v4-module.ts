import {
  getV4SourceSpan,
  isExplicitV4ModuleDocument,
  requiresV4PrimitiveBlock,
  tryParseV4,
} from '../parser/v4'
import { jcs } from '../parser/v4-json'
import type {
  CanonicalModule,
  CanonicalNode,
  CanonicalPrimitive,
  JsonObject,
  JsonValue,
  ParsedDocument,
} from '../parser/v4-types'

function valueText(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(valueText).join(', ')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}=${valueText(value[key])}`)
      .join(', ')}}`
  }
  return JSON.stringify(value)
}

function attributesText(attributes: JsonObject): string {
  return Object.keys(attributes)
    .sort()
    .map((key) => ` ${key}=${valueText(attributes[key])}`)
    .join('')
}

function block(head: string, children: string[]): string {
  if (!children.length) return head + ' {}'
  return `${head} {\n${children.map((child) => child.replace(/^/gm, '  ')).join('\n')}\n}`
}

const itemSpelling: Partial<Record<CanonicalPrimitive['kind'], string>> = {
  'list-item': 'item',
  'nav-item': 'item',
  'nav-group': 'group',
  'dropdown-item': 'item',
  'annotation-item': 'item',
}

function breadcrumbItem(node: CanonicalNode): JsonObject {
  if (node.kind !== 'nav-item' || node.label === undefined || node.children.length) {
    throw new TypeError('Invalid V4 breadcrumb item')
  }
  return {
    label: node.label,
    ...(node.id === undefined ? {} : { id: node.id }),
    ...node.attributes,
  }
}

function nodeText(node: CanonicalNode): string {
  switch (node.kind) {
    case 'layout':
    case 'component': {
      const parameters = node.parameters
        .map(({ id, type, default: fallback }) =>
          fallback === undefined ? `${id}:${type}` : `${id}:${type}=${valueText(fallback)}`,
        )
        .join(', ')
      const signature = `${node.kind} ${node.id}${parameters ? `(${parameters})` : ''}`
      return block(signature + attributesText(node.attributes), node.children.map(nodeText))
    }
    case 'slot':
      return node.name === undefined ? 'slot;' : `slot ${node.name};`
    case 'repeat':
      return block(
        `repeat ${node.count}${node.id === undefined ? '' : ` id=${node.id}`}`,
        node.children.map(nodeText),
      )
    case 'use': {
      if (getV4SourceSpan(node)?.authoredId !== true) {
        throw new TypeError('V4 module printing requires explicit use IDs')
      }
      const args = Object.keys(node.inputs)
        .sort()
        .map((key) => {
          const input = node.inputs[key]
          return `${key}=${valueText('literal' in input ? input.literal : `$${input.param}`)}`
        })
        .join(', ')
      const namespace = node.namespace === undefined ? '' : ` from=${valueText(node.namespace)}`
      const head = `use ${node.name}(${args})${namespace} id=${node.id}`
      return node.fills.length
        ? block(
            head,
            node.fills.map((fill) => block(`fill ${fill.name}`, fill.children.map(nodeText))),
          )
        : head
    }
    default:
      return primitiveText(node)
  }
}

function primitiveText(node: CanonicalPrimitive): string {
  const attrs = { ...node.attributes, ...(node.id === undefined ? {} : { id: node.id }) }
  const spelling = itemSpelling[node.kind] ?? node.kind
  const number = node.number === undefined ? '' : ` ${node.number}`
  const label = node.label === undefined ? '' : ` ${valueText(node.label)}`
  const head = spelling + number + label
  if (node.kind === 'breadcrumb') {
    return `${head} ${valueText(node.children.map(breadcrumbItem))}${attributesText(attrs)}`
  }
  const declaration = head + attributesText(attrs)
  if (node.kind === 'table' && node.items?.length) {
    return block(
      declaration,
      node.items.map((row) => `row ${valueText(row)}`),
    )
  }
  return node.children.length || requiresV4PrimitiveBlock(node.kind) || node.kind === 'annotations'
    ? block(declaration, node.children.map(nodeText))
    : declaration
}

function moduleText(module: CanonicalModule): string {
  const imports = module.imports.map(
    ({ namespace, moduleId, digest, symbols }) =>
      `import ${namespace} from=${valueText(moduleId)} digest=${valueText(digest)} symbols=${valueText(
        symbols.map(({ kind, id }) => ({ kind, id })),
      )}`,
  )
  const exports = module.exports.map(({ kind, id }) => `export ${kind} ${id};`)
  return block(`module ${module.id} namespace=${module.namespace}`, [
    ...imports,
    ...exports,
    ...module.definitions.map(nodeText),
  ])
}

function semantics(document: ParsedDocument): string {
  return jcs({
    ...document,
    modules: document.modules.map(({ sourceDigest: _digest, ...module }) => module),
  })
}

/** Print one explicit module parsed by Core V4, without application metadata or I/O. */
export function printV4Module(document: ParsedDocument): string {
  const module = document?.modules?.[0]
  if (!module || document.modules.length !== 1 || !isExplicitV4ModuleDocument(document)) {
    throw new TypeError('Expected one explicit V4 module parsed by Core')
  }
  const expected = semantics(document)
  const source = moduleText(module) + '\n'
  const result = tryParseV4(source, { languageVersion: '4.0.0' })
  if (!result.ok || semantics(result.value) !== expected) {
    throw new TypeError('V4 module cannot be printed without changing its meaning')
  }
  return source
}
