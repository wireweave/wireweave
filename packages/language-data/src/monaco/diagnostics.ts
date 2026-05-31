/**
 * Monaco Diagnostics for Wireframe DSL
 *
 * Provides real-time code validation and error markers
 */

import type * as Monaco from 'monaco-editor'
import { getComponent, getAttribute } from '../utils.js'

/**
 * Marker severity levels (matching Monaco's MarkerSeverity)
 */
export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
} as const

export type MarkerSeverityType = (typeof MarkerSeverity)[keyof typeof MarkerSeverity]

/**
 * Marker data structure (compatible with Monaco's IMarkerData)
 */
export interface MarkerData {
  severity: MarkerSeverityType
  message: string
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

/**
 * Validate wireframe code and return markers
 * This is editor-agnostic and returns plain marker objects
 */
export function validateCode(text: string): MarkerData[] {
  const markers: MarkerData[] = []
  const lines = text.split('\n')

  const braceStack: { line: number; col: number; component?: string }[] = []
  let hasPage = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    // Skip comments
    if (line.trim().startsWith('//')) continue

    // Check for page component
    if (line.match(/^\s*page\b/)) {
      if (hasPage) {
        markers.push({
          severity: MarkerSeverity.Error,
          message: 'Only one page component is allowed.',
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: line.length + 1,
        })
      }
      hasPage = true
    }

    // Check for unknown components
    const componentMatch = line.match(/^\s*(\w+)(?:\s|{|")/)
    if (componentMatch) {
      const compName = componentMatch[1]
      if (!getComponent(compName) && !['true', 'false'].includes(compName)) {
        // Check if it's an attribute value, not a component
        const beforeMatch = line.substring(0, componentMatch.index)
        if (!beforeMatch.match(/=\s*$/)) {
          markers.push({
            severity: MarkerSeverity.Warning,
            message: `Unknown component: "${compName}"`,
            startLineNumber: lineNumber,
            startColumn: (componentMatch.index || 0) + 1,
            endLineNumber: lineNumber,
            endColumn: (componentMatch.index || 0) + compName.length + 1,
          })
        }
      }
    }

    // Check for unknown attributes
    const attrMatches = line.matchAll(/\b(\w+)\s*=/g)
    for (const match of attrMatches) {
      const attrName = match[1]
      if (!getAttribute(attrName) && !getComponent(attrName)) {
        markers.push({
          severity: MarkerSeverity.Warning,
          message: `Unknown attribute: "${attrName}"`,
          startLineNumber: lineNumber,
          startColumn: match.index + 1,
          endLineNumber: lineNumber,
          endColumn: match.index + attrName.length + 1,
        })
      }
    }

    // Track braces for matching
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '{') {
        const beforeBrace = line.substring(0, j)
        const compMatch = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
        braceStack.push({
          line: lineNumber,
          col: j + 1,
          component: compMatch ? compMatch[1] : undefined,
        })
      } else if (line[j] === '}') {
        if (braceStack.length === 0) {
          markers.push({
            severity: MarkerSeverity.Error,
            message: 'Unmatched closing brace',
            startLineNumber: lineNumber,
            startColumn: j + 1,
            endLineNumber: lineNumber,
            endColumn: j + 2,
          })
        } else {
          braceStack.pop()
        }
      }
    }

    // Check for unclosed strings
    const quotes = line.match(/"/g)
    if (quotes && quotes.length % 2 !== 0) {
      markers.push({
        severity: MarkerSeverity.Error,
        message: 'Unclosed string',
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
      })
    }
  }

  // Check for unclosed braces
  for (const brace of braceStack) {
    markers.push({
      severity: MarkerSeverity.Error,
      message: `Unclosed brace${brace.component ? ` (${brace.component})` : ''}`,
      startLineNumber: brace.line,
      startColumn: brace.col,
      endLineNumber: brace.line,
      endColumn: brace.col + 1,
    })
  }

  // Warning if no page component
  if (!hasPage && text.trim()) {
    markers.push({
      severity: MarkerSeverity.Info,
      message: 'Consider starting with a page component.',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    })
  }

  return markers
}

/**
 * Create a diagnostics setup function for Monaco
 *
 * Usage:
 * const cleanup = setupDiagnostics(monaco, editor);
 * // Later: cleanup();
 */
export function createDiagnosticsSetup(monaco: typeof Monaco) {
  return function setupDiagnostics(editor: Monaco.editor.IStandaloneCodeEditor): () => void {
    let timeout: ReturnType<typeof setTimeout> | null = null

    const validate = () => {
      const model = editor.getModel()
      if (!model) return

      const text = model.getValue()
      const markers = validateCode(text)

      // Convert to Monaco markers
      const monacoMarkers = markers.map((m) => ({
        ...m,
        severity: m.severity,
      }))

      monaco.editor.setModelMarkers(model, 'wireframe', monacoMarkers)
    }

    // Initial validation
    validate()

    // Validate on change with debounce
    const disposable = editor.onDidChangeModelContent(() => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(validate, 500)
    })

    // Return cleanup function
    return () => {
      disposable.dispose()
      if (timeout) clearTimeout(timeout)
    }
  }
}
