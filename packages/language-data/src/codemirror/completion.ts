/**
 * CodeMirror Completion Provider for Wireframe DSL
 *
 * Provides auto-completion for components, attributes, and values
 */

import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import {
  ALL_COMPONENTS,
  ATTRIBUTES,
  getComponent,
  getAttribute,
  getComponentAttributes,
  getValidChildren,
} from '../index.js'
import { CATEGORY_LABELS } from '../keywords.js'

/**
 * Get category label for display
 */
function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

/**
 * Find parent component from cursor position
 */
function findParentComponent(text: string, pos: number): string | null {
  let braceCount = 0

  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] === '}') braceCount++
    if (text[i] === '{') {
      braceCount--
      if (braceCount < 0) {
        // Find component name before this brace
        const beforeBrace = text.substring(0, i)
        const match = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
        return match ? match[1] : null
      }
    }
  }

  return null
}

/**
 * Completion option type for CodeMirror
 */
interface CompletionOption {
  label: string
  type: string
  detail?: string
  info?: string
  boost?: number
  apply?: string
}

/**
 * Create completion source for CodeMirror
 *
 * Usage:
 * ```typescript
 * import { autocompletion } from '@codemirror/autocomplete';
 * import { createCompletionSource } from '@wireweave/language-data/codemirror';
 *
 * const extensions = [
 *   autocompletion({ override: [createCompletionSource()] })
 * ];
 * ```
 */
export function createCompletionSource() {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context
    const line = state.doc.lineAt(pos)
    const textBefore = state.doc.sliceString(line.from, pos)
    const fullText = state.doc.toString()

    // Get word at cursor
    const wordMatch = textBefore.match(/(\w*)$/)
    const word = wordMatch ? wordMatch[1] : ''
    const from = pos - word.length

    const options: CompletionOption[] = []

    // After '=' - suggest values
    const attrMatch = textBefore.match(/(\w+)\s*=\s*$/)
    if (attrMatch) {
      const attrName = attrMatch[1]
      const attr = getAttribute(attrName)

      if (attr && attr.type === 'enum' && attr.values) {
        attr.values.forEach((value: string) => {
          options.push({
            label: value,
            type: 'enum',
            detail: `value for ${attrName}`,
          })
        })
      } else if (attr?.type === 'number') {
        ;[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].forEach((n) => {
          options.push({
            label: String(n),
            type: 'constant',
            detail: 'number',
          })
        })
      }

      if (options.length > 0) {
        return { from, options }
      }
    }

    // At start of line or after { - suggest components
    if (textBefore.match(/^\s*\w*$/) || textBefore.match(/\{\s*\w*$/)) {
      const parentComponent = findParentComponent(fullText, pos)
      const validChildren = parentComponent ? getValidChildren(parentComponent) : []
      const validChildNames = new Set(validChildren.map((c) => c.name))
      const isRootLevel = !parentComponent

      ALL_COMPONENTS.forEach((comp) => {
        const isValidInContext = isRootLevel
          ? comp.name === 'page'
          : validChildNames.size === 0 || validChildNames.has(comp.name)

        options.push({
          label: comp.name,
          type: isValidInContext ? 'class' : 'type',
          detail: isValidInContext
            ? `${getCategoryLabel(comp.category)} (recommended)`
            : getCategoryLabel(comp.category),
          info: comp.description,
          boost: isValidInContext ? 10 : 0,
          apply: comp.hasChildren ? `${comp.name} {\n\t\n}` : comp.name,
        })
      })

      return { from, options }
    }

    // After component name - suggest attributes
    const componentMatch = textBefore.match(/(\w+)(?:\s+"[^"]*")?\s+(\w*)$/)
    if (componentMatch) {
      const compName = componentMatch[1]
      const component = getComponent(compName)

      if (component) {
        const attrs = getComponentAttributes(compName)
        attrs.forEach((attr) => {
          let apply = attr.name
          if (attr.type === 'string') {
            apply = `${attr.name}=""`
          } else if (attr.type === 'number' || attr.type === 'enum') {
            apply = `${attr.name}=`
          } else if (attr.type === 'function') {
            apply = `${attr.name}(`
          }

          options.push({
            label: attr.name,
            type: 'property',
            detail: attr.type,
            info: attr.description,
            apply,
          })
        })
      } else {
        // Unknown component, suggest all attributes
        ATTRIBUTES.forEach((attr) => {
          let apply = attr.name
          if (attr.type === 'string') {
            apply = `${attr.name}=""`
          } else if (attr.type === 'number' || attr.type === 'enum') {
            apply = `${attr.name}=`
          } else if (attr.type === 'function') {
            apply = `${attr.name}(`
          }

          options.push({
            label: attr.name,
            type: 'property',
            detail: attr.type,
            info: attr.description,
            apply,
          })
        })
      }

      return { from, options }
    }

    // Default: suggest components
    ALL_COMPONENTS.forEach((comp) => {
      options.push({
        label: comp.name,
        type: 'class',
        detail: getCategoryLabel(comp.category),
        info: comp.description,
        apply: comp.hasChildren ? `${comp.name} {\n\t\n}` : comp.name,
      })
    })

    return { from, options }
  }
}
