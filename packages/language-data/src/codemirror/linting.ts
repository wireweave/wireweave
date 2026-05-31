/**
 * CodeMirror Linting Provider for Wireframe DSL
 *
 * Provides diagnostics for syntax errors, unknown components, etc.
 */

import type { Diagnostic as CMDiagnostic } from '@codemirror/lint'
import type { EditorView } from '@codemirror/view'
import { getComponent, getAttribute } from '../index.js'

/**
 * Diagnostic severity levels
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

/**
 * Diagnostic interface
 */
export interface Diagnostic {
  from: number
  to: number
  severity: DiagnosticSeverity
  message: string
}

/**
 * Validate wireframe code and return diagnostics
 */
export function validateCode(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const lines = text.split('\n')

  const braceStack: { line: number; col: number; pos: number; component?: string }[] = []
  let hasPage = false
  let currentPos = 0

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const lineStart = currentPos

    // Skip comments
    if (line.trim().startsWith('//')) {
      currentPos += line.length + 1
      continue
    }

    // Check for page component
    const pageMatch = line.match(/^\s*page\b/)
    if (pageMatch) {
      if (hasPage) {
        const matchStart = lineStart + line.indexOf('page')
        diagnostics.push({
          from: matchStart,
          to: matchStart + 4,
          severity: 'error',
          message: 'Only one page component is allowed.',
        })
      }
      hasPage = true
    }

    // Check for unknown components (at start of line, not after =)
    const componentMatch = line.match(/^\s*(\w+)(?:\s|{|")/)
    if (componentMatch) {
      const compName = componentMatch[1]
      if (!getComponent(compName) && !['true', 'false'].includes(compName)) {
        // Make sure it's not a value after =
        const beforeMatch = line.substring(0, componentMatch.index)
        if (!beforeMatch.match(/=\s*$/)) {
          const matchStart = lineStart + (componentMatch.index || 0)
          diagnostics.push({
            from: matchStart,
            to: matchStart + compName.length,
            severity: 'warning',
            message: `Unknown component: "${compName}"`,
          })
        }
      }
    }

    // Check for unknown attributes
    const attrRegex = /\b(\w+)\s*=/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(line)) !== null) {
      const attrName = attrMatch[1]
      if (!getAttribute(attrName) && !getComponent(attrName)) {
        const matchStart = lineStart + attrMatch.index
        diagnostics.push({
          from: matchStart,
          to: matchStart + attrName.length,
          severity: 'warning',
          message: `Unknown attribute: "${attrName}"`,
        })
      }
    }

    // Track braces for matching
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '{') {
        const beforeBrace = line.substring(0, col)
        const compMatch = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
        braceStack.push({
          line: lineNum,
          col,
          pos: lineStart + col,
          component: compMatch ? compMatch[1] : undefined,
        })
      } else if (line[col] === '}') {
        if (braceStack.length === 0) {
          diagnostics.push({
            from: lineStart + col,
            to: lineStart + col + 1,
            severity: 'error',
            message: 'Unmatched closing brace',
          })
        } else {
          braceStack.pop()
        }
      }
    }

    // Check for unclosed strings
    const quotes = line.match(/"/g)
    if (quotes && quotes.length % 2 !== 0) {
      diagnostics.push({
        from: lineStart,
        to: lineStart + line.length,
        severity: 'error',
        message: 'Unclosed string',
      })
    }

    currentPos += line.length + 1
  }

  // Check for unclosed braces
  for (const brace of braceStack) {
    diagnostics.push({
      from: brace.pos,
      to: brace.pos + 1,
      severity: 'error',
      message: `Unclosed brace${brace.component ? ` (${brace.component})` : ''}`,
    })
  }

  // Info if no page component
  if (!hasPage && text.trim()) {
    diagnostics.push({
      from: 0,
      to: 0,
      severity: 'info',
      message: 'Consider starting with a page component.',
    })
  }

  return diagnostics
}

/**
 * Create linter extension for CodeMirror
 *
 * Usage:
 * ```typescript
 * import { linter } from '@codemirror/lint';
 * import { createLinter } from '@wireweave/language-data/codemirror';
 *
 * const extensions = [
 *   linter(createLinter())
 * ];
 * ```
 */
export function createLinter() {
  return (view: EditorView): CMDiagnostic[] => {
    const text = view.state.doc.toString()
    const diagnostics = validateCode(text)

    return diagnostics.map((d) => ({
      from: d.from,
      to: d.to,
      severity: d.severity,
      message: d.message,
    }))
  }
}
