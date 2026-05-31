/**
 * Monaco IntelliSense Providers for Wireframe DSL
 *
 * Provides hover tooltips, auto-completion, and diagnostics
 * These are factory functions that return provider configurations
 */

import type * as Monaco from 'monaco-editor'
import {
  ALL_COMPONENTS,
  ATTRIBUTES,
  getComponent,
  getAttribute,
  getComponentAttributes,
  getValidChildren,
  getAttributeTypeLabel,
} from '../index.js'
import { VALUE_KEYWORDS, CATEGORY_LABELS } from '../keywords.js'

type MonacoApi = typeof Monaco
type TextModel = Monaco.editor.ITextModel
type Position = Monaco.Position

/**
 * Helper to get category label
 */
function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

/**
 * Create hover provider configuration
 * Returns an object compatible with monaco.languages.registerHoverProvider
 *
 * Usage in Monaco:
 * monaco.languages.registerHoverProvider('wireframe', createHoverProvider(monaco))
 */
export function createHoverProvider(monaco: MonacoApi): Monaco.languages.HoverProvider {
  return {
    provideHover(model: TextModel, position: Position) {
      const word = model.getWordAtPosition(position)
      if (!word) return null

      const wordText = word.word

      // Check if it's a component
      const component = getComponent(wordText)
      if (component) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [
            { value: `**${component.name}** _(${getCategoryLabel(component.category)})_` },
            { value: component.description },
            { value: `\`\`\`\nAttributes: ${component.attributes.join(', ')}\n\`\`\`` },
          ],
        }
      }

      // Check if it's an attribute
      const attribute = getAttribute(wordText)
      if (attribute) {
        let valueInfo = ''
        if (attribute.type === 'number') {
          valueInfo = 'Type: number'
        } else if (attribute.type === 'string') {
          valueInfo = 'Type: string'
        } else if (attribute.type === 'boolean') {
          valueInfo = 'Type: boolean (can be omitted)'
        } else if (attribute.type === 'enum' && attribute.values) {
          valueInfo = `Values: ${attribute.values.join(' | ')}`
        } else if (attribute.type === 'function') {
          valueInfo = `Functional shorthand. Example: ${attribute.example}`
        }

        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [
            { value: `**${attribute.name}** _(attribute)_` },
            { value: attribute.description },
            { value: valueInfo ? `\`${valueInfo}\`` : '' },
            { value: attribute.example ? `Example: \`${attribute.example}\`` : '' },
          ].filter((c) => c.value),
        }
      }

      // Check if it's a value keyword
      if (VALUE_KEYWORDS.includes(wordText)) {
        const relatedAttrs = ATTRIBUTES.filter(
          (a) => a.type === 'enum' && a.values?.includes(wordText),
        )

        if (relatedAttrs.length > 0) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn,
            ),
            contents: [
              { value: `**${wordText}** _(value)_` },
              { value: `Used in: ${relatedAttrs.map((a) => a.name).join(', ')}` },
            ],
          }
        }
      }

      return null
    },
  }
}

/**
 * Find parent component from cursor position
 */
function findParentComponent(model: TextModel, position: Position): string | null {
  let braceCount = 0

  for (let line = position.lineNumber; line >= 1; line--) {
    const lineContent = model.getLineContent(line)
    const endCol = line === position.lineNumber ? position.column - 1 : lineContent.length

    for (let col = endCol - 1; col >= 0; col--) {
      if (lineContent[col] === '}') braceCount++
      if (lineContent[col] === '{') {
        braceCount--
        if (braceCount < 0) {
          const beforeBrace = lineContent.substring(0, col)
          const match = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
          return match ? match[1] : null
        }
      }
    }
  }

  return null
}

/**
 * Create completion provider configuration
 * Returns an object compatible with monaco.languages.registerCompletionItemProvider
 *
 * Usage in Monaco:
 * monaco.languages.registerCompletionItemProvider('wireframe', createCompletionProvider(monaco))
 */
export function createCompletionProvider(
  monaco: MonacoApi,
): Monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: [' ', '=', '"'],

    provideCompletionItems(model: TextModel, position: Position) {
      const lineContent = model.getLineContent(position.lineNumber)
      const textUntilPosition = lineContent.substring(0, position.column - 1)

      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: Monaco.languages.CompletionItem[] = []

      // After '=' - suggest values
      if (textUntilPosition.match(/\w+\s*=\s*$/)) {
        const attrMatch = textUntilPosition.match(/(\w+)\s*=\s*$/)
        if (attrMatch) {
          const attrName = attrMatch[1]
          const attr = getAttribute(attrName)

          if (attr && attr.type === 'enum' && attr.values) {
            attr.values.forEach((value: string) => {
              suggestions.push({
                label: value,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                insertText: value,
                range,
                detail: `value for ${attrName}`,
              })
            })
          } else if (attr?.type === 'number') {
            ;[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].forEach((n) => {
              suggestions.push({
                label: String(n),
                kind: monaco.languages.CompletionItemKind.Value,
                insertText: String(n),
                range,
                detail: 'number',
              })
            })
          }

          return { suggestions }
        }
      }

      // At the start of line or after { - suggest components
      if (textUntilPosition.match(/^\s*$/) || textUntilPosition.match(/\{\s*$/)) {
        const parentComponent = findParentComponent(model, position)
        const validChildren = parentComponent ? getValidChildren(parentComponent) : []
        const validChildNames = new Set(validChildren.map((c) => c.name))
        const isRootLevel = !parentComponent

        ALL_COMPONENTS.forEach((comp) => {
          const isValidInContext = isRootLevel
            ? comp.name === 'page'
            : validChildNames.size === 0 || validChildNames.has(comp.name)

          suggestions.push({
            label: isValidInContext ? `★ ${comp.name}` : comp.name,
            kind: isValidInContext
              ? monaco.languages.CompletionItemKind.Class
              : monaco.languages.CompletionItemKind.Reference,
            insertText: comp.hasChildren ? `${comp.name} {\n\t$0\n}` : comp.name,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: isValidInContext
              ? `${getCategoryLabel(comp.category)} (recommended)`
              : getCategoryLabel(comp.category),
            documentation: comp.description,
            sortText: isValidInContext ? `0_${comp.name}` : `1_${comp.name}`,
            filterText: comp.name,
          })
        })

        return { suggestions }
      }

      // After component name - suggest attributes
      const componentMatch = textUntilPosition.match(/(\w+)(?:\s+"[^"]*")?\s+(\w*)$/)
      if (componentMatch) {
        const compName = componentMatch[1]
        const component = getComponent(compName)

        if (component) {
          const attrs = getComponentAttributes(compName)
          attrs.forEach((attr) => {
            let insertText = attr.name
            if (attr.type === 'string') {
              insertText = `${attr.name}="$1"`
            } else if (attr.type === 'number') {
              insertText = `${attr.name}=$1`
            } else if (attr.type === 'enum') {
              insertText = `${attr.name}=$1`
            } else if (attr.type === 'function') {
              insertText = `${attr.name}($1, $2)`
            }

            suggestions.push({
              label: attr.name,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: getAttributeTypeLabel(attr),
              documentation:
                attr.description + (attr.example ? `\n\nExample: ${attr.example}` : ''),
            })
          })
        } else {
          ATTRIBUTES.forEach((attr) => {
            let insertText = attr.name
            if (attr.type === 'string') {
              insertText = `${attr.name}="$1"`
            } else if (attr.type === 'number') {
              insertText = `${attr.name}=$1`
            } else if (attr.type === 'enum') {
              insertText = `${attr.name}=$1`
            } else if (attr.type === 'function') {
              insertText = `${attr.name}($1, $2)`
            }

            suggestions.push({
              label: attr.name,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: getAttributeTypeLabel(attr),
              documentation: attr.description,
            })
          })
        }

        return { suggestions }
      }

      // Default: suggest components
      const parentComponent = findParentComponent(model, position)
      const validChildren = parentComponent ? getValidChildren(parentComponent) : []
      const validChildNames = new Set(validChildren.map((c) => c.name))
      const isRootLevel = !parentComponent

      ALL_COMPONENTS.forEach((comp) => {
        const isValidInContext = isRootLevel
          ? comp.name === 'page'
          : validChildNames.size === 0 || validChildNames.has(comp.name)

        suggestions.push({
          label: isValidInContext ? `★ ${comp.name}` : comp.name,
          kind: isValidInContext
            ? monaco.languages.CompletionItemKind.Class
            : monaco.languages.CompletionItemKind.Reference,
          insertText: comp.hasChildren ? `${comp.name} {\n\t$0\n}` : comp.name,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: isValidInContext
            ? `${getCategoryLabel(comp.category)} (recommended)`
            : getCategoryLabel(comp.category),
          documentation: comp.description,
          sortText: isValidInContext ? `0_${comp.name}` : `1_${comp.name}`,
          filterText: comp.name,
        })
      })

      return { suggestions }
    },
  }
}
