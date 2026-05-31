/**
 * CodeMirror Hover Provider for Wireframe DSL
 *
 * Provides hover tooltips for components, attributes, and values
 */

import type { EditorView } from '@codemirror/view'
import { ATTRIBUTES, getComponent, getAttribute, VALUE_KEYWORDS } from '../index.js'
import { CATEGORY_LABELS } from '../keywords.js'

/**
 * Get category label for display
 */
function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

/**
 * Get word at position in text
 */
function getWordAt(text: string, pos: number): { word: string; from: number; to: number } | null {
  // Find word boundaries
  let from = pos
  let to = pos

  while (from > 0 && /\w/.test(text[from - 1])) from--
  while (to < text.length && /\w/.test(text[to])) to++

  if (from === to) return null

  return {
    word: text.slice(from, to),
    from,
    to,
  }
}

/**
 * Create hover tooltip extension for CodeMirror
 *
 * Usage:
 * ```typescript
 * import { hoverTooltip } from '@codemirror/view';
 * import { createHoverTooltipSource } from '@wireweave/language-data/codemirror';
 *
 * const extensions = [
 *   hoverTooltip(createHoverTooltipSource())
 * ];
 * ```
 */
export function createHoverTooltipSource() {
  return (view: EditorView, pos: number, _side: -1 | 1) => {
    const { state } = view
    const text = state.doc.toString()
    const wordInfo = getWordAt(text, pos)

    if (!wordInfo) return null

    const { word, from, to } = wordInfo

    // Check if it's a component
    const component = getComponent(word)
    if (component) {
      return {
        pos: from,
        end: to,
        above: true,
        create() {
          const dom = document.createElement('div')
          dom.className = 'cm-tooltip-hover'
          dom.innerHTML = `
            <div style="padding: 8px 12px; max-width: 400px;">
              <div style="font-weight: bold; margin-bottom: 4px;">
                ${component.name}
                <span style="opacity: 0.7; font-weight: normal; font-size: 0.9em;">
                  (${getCategoryLabel(component.category)})
                </span>
              </div>
              <div style="margin-bottom: 8px; opacity: 0.9;">${component.description}</div>
              ${component.example ? `<code style="display: block; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-size: 0.85em; white-space: pre;">${component.example}</code>` : ''}
              <div style="margin-top: 8px; font-size: 0.85em; opacity: 0.7;">
                Attributes: ${component.attributes.join(', ')}
              </div>
            </div>
          `
          return { dom }
        },
      }
    }

    // Check if it's an attribute
    const attribute = getAttribute(word)
    if (attribute) {
      let valueInfo = ''
      if (attribute.type === 'number') {
        valueInfo = 'Type: number'
      } else if (attribute.type === 'string') {
        valueInfo = 'Type: string'
      } else if (attribute.type === 'boolean') {
        valueInfo = 'Type: boolean'
      } else if (attribute.type === 'enum' && attribute.values) {
        valueInfo = `Values: ${attribute.values.join(' | ')}`
      } else if (attribute.type === 'function') {
        valueInfo = `Functional shorthand. Example: ${attribute.example}`
      }

      return {
        pos: from,
        end: to,
        above: true,
        create() {
          const dom = document.createElement('div')
          dom.className = 'cm-tooltip-hover'
          dom.innerHTML = `
            <div style="padding: 8px 12px; max-width: 400px;">
              <div style="font-weight: bold; margin-bottom: 4px;">
                ${attribute.name}
                <span style="opacity: 0.7; font-weight: normal; font-size: 0.9em;">(attribute)</span>
              </div>
              <div style="margin-bottom: 4px; opacity: 0.9;">${attribute.description}</div>
              ${valueInfo ? `<div style="font-size: 0.85em; opacity: 0.8; font-family: monospace;">${valueInfo}</div>` : ''}
              ${attribute.example ? `<div style="margin-top: 4px; font-size: 0.85em; opacity: 0.7;">Example: <code>${attribute.example}</code></div>` : ''}
            </div>
          `
          return { dom }
        },
      }
    }

    // Check if it's a value keyword
    if (VALUE_KEYWORDS.includes(word)) {
      const relatedAttrs = ATTRIBUTES.filter((a) => a.type === 'enum' && a.values?.includes(word))

      if (relatedAttrs.length > 0) {
        return {
          pos: from,
          end: to,
          above: true,
          create() {
            const dom = document.createElement('div')
            dom.className = 'cm-tooltip-hover'
            dom.innerHTML = `
              <div style="padding: 8px 12px; max-width: 300px;">
                <div style="font-weight: bold; margin-bottom: 4px;">
                  ${word}
                  <span style="opacity: 0.7; font-weight: normal; font-size: 0.9em;">(value)</span>
                </div>
                <div style="font-size: 0.9em; opacity: 0.8;">
                  Used in: ${relatedAttrs.map((a) => a.name).join(', ')}
                </div>
              </div>
            `
            return { dom }
          },
        }
      }
    }

    return null
  }
}
