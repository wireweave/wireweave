/**
 * Language Features for Wireframe Lang
 *
 * Provides completion, hover, diagnostics and other language features
 * Using shared language data from @wireweave/language-data
 */

import * as vscode from 'vscode'
import {
  ALL_COMPONENTS,
  ATTRIBUTES,
  VALUE_KEYWORDS,
  CATEGORY_LABELS,
  getComponent,
  getAttribute,
  getComponentAttributes,
  getValidChildren,
  getAttributeTypeLabel,
  formatAttributeValues,
} from '@wireweave/language-data'

/**
 * Get category label for display
 */
function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

/**
 * Find the parent component at a given position
 */
function findParentComponent(
  document: vscode.TextDocument,
  position: vscode.Position,
): string | null {
  let braceCount = 0

  for (let line = position.line; line >= 0; line--) {
    const lineText = document.lineAt(line).text
    const endCol = line === position.line ? position.character : lineText.length

    for (let col = endCol - 1; col >= 0; col--) {
      if (lineText[col] === '}') braceCount++
      if (lineText[col] === '{') {
        braceCount--
        if (braceCount < 0) {
          // Found opening brace, get component name
          const beforeBrace = lineText.substring(0, col)
          const match = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
          return match ? match[1] : null
        }
      }
    }
  }

  return null
}

/**
 * Register language features
 */
export function registerLanguageFeatures(context: vscode.ExtensionContext) {
  // Completion provider
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'wireframe',
    {
      provideCompletionItems(document, position) {
        const items: vscode.CompletionItem[] = []
        const lineText = document.lineAt(position.line).text
        const textUntilPosition = lineText.substring(0, position.character)

        // After '=' - suggest values
        const attrMatch = textUntilPosition.match(/(\w+)\s*=\s*$/)
        if (attrMatch) {
          const attrName = attrMatch[1]
          const attr = getAttribute(attrName)

          if (attr && Array.isArray(attr.values)) {
            attr.values.forEach((value) => {
              const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember)
              item.detail = `value for ${attrName}`
              items.push(item)
            })
            return items
          } else if (attr?.type === 'number') {
            // Suggest common numbers
            ;[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24, 32].forEach((n) => {
              const item = new vscode.CompletionItem(String(n), vscode.CompletionItemKind.Value)
              item.detail = 'number'
              items.push(item)
            })
            return items
          }
        }

        // At the start of line or after { - suggest components
        if (textUntilPosition.match(/^\s*$/) || textUntilPosition.match(/\{\s*$/)) {
          const parentComponent = findParentComponent(document, position)
          const validChildren = parentComponent ? getValidChildren(parentComponent) : []
          const validChildNames = new Set(validChildren.map((c) => c.name))
          const isRootLevel = !parentComponent

          ALL_COMPONENTS.forEach((comp) => {
            const isValidInContext = isRootLevel
              ? comp.name === 'page'
              : validChildNames.size === 0 || validChildNames.has(comp.name)

            const item = new vscode.CompletionItem(
              comp.name,
              isValidInContext
                ? vscode.CompletionItemKind.Class
                : vscode.CompletionItemKind.Reference,
            )

            item.detail = isValidInContext
              ? `${getCategoryLabel(comp.category)} (recommended)`
              : getCategoryLabel(comp.category)

            item.documentation = new vscode.MarkdownString(
              `${comp.description}\n\n` +
                (comp.example ? `\`\`\`wireframe\n${comp.example}\n\`\`\`\n\n` : '') +
                `Attributes: \`${comp.attributes.join('`, `')}\``,
            )

            // Snippet with braces for container components
            if (comp.hasChildren) {
              item.insertText = new vscode.SnippetString(`${comp.name} {\n\t$0\n}`)
            }

            item.sortText = isValidInContext ? `0_${comp.name}` : `1_${comp.name}`
            items.push(item)
          })

          return items
        }

        // After component name - suggest attributes
        const componentMatch = textUntilPosition.match(/(\w+)(?:\s+"[^"]*")?\s+(\w*)$/)
        if (componentMatch) {
          const compName = componentMatch[1]
          const component = getComponent(compName)

          if (component) {
            const attrs = getComponentAttributes(compName)
            attrs.forEach((attr) => {
              const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property)
              item.detail = getAttributeTypeLabel(attr)

              const docLines = [attr.description]
              if (attr.example) docLines.push(`\nExample: \`${attr.example}\``)
              const valueInfo = formatAttributeValues(attr)
              if (valueInfo) docLines.push(`\n${valueInfo}`)
              item.documentation = new vscode.MarkdownString(docLines.join(''))

              // Snippet based on attribute type
              if (attr.type === 'string') {
                item.insertText = new vscode.SnippetString(`${attr.name}="$1"`)
              } else if (attr.type === 'number') {
                item.insertText = new vscode.SnippetString(`${attr.name}=$1`)
              } else if (Array.isArray(attr.values)) {
                item.insertText = new vscode.SnippetString(`${attr.name}=$1`)
              }
              // Boolean attributes just use the name

              items.push(item)
            })
          } else {
            // Component not found, suggest all attributes
            ATTRIBUTES.forEach((attr) => {
              const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property)
              item.detail = getAttributeTypeLabel(attr)
              item.documentation = new vscode.MarkdownString(attr.description)

              if (attr.type === 'string') {
                item.insertText = new vscode.SnippetString(`${attr.name}="$1"`)
              } else if (attr.type === 'number') {
                item.insertText = new vscode.SnippetString(`${attr.name}=$1`)
              } else if (Array.isArray(attr.values)) {
                item.insertText = new vscode.SnippetString(`${attr.name}=$1`)
              }

              items.push(item)
            })
          }

          return items
        }

        // Default: suggest all components and attributes
        ALL_COMPONENTS.forEach((comp) => {
          const item = new vscode.CompletionItem(comp.name, vscode.CompletionItemKind.Class)
          item.detail = getCategoryLabel(comp.category)
          item.documentation = new vscode.MarkdownString(comp.description)
          if (comp.hasChildren) {
            item.insertText = new vscode.SnippetString(`${comp.name} {\n\t$0\n}`)
          }
          items.push(item)
        })

        ATTRIBUTES.forEach((attr) => {
          const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property)
          item.detail = getAttributeTypeLabel(attr)
          item.documentation = new vscode.MarkdownString(attr.description)
          items.push(item)
        })

        return items
      },
    },
    ' ',
    '=',
    '"',
  )

  // Hover provider
  const hoverProvider = vscode.languages.registerHoverProvider('wireframe', {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position)
      if (!range) return null

      const word = document.getText(range)

      // Check if it's a component
      const component = getComponent(word)
      if (component) {
        const markdown = new vscode.MarkdownString()
        markdown.appendMarkdown(
          `**${component.name}** _(${getCategoryLabel(component.category)})_\n\n`,
        )
        markdown.appendMarkdown(`${component.description}\n\n`)
        if (component.example) {
          markdown.appendCodeblock(component.example, 'wireframe')
        }
        markdown.appendMarkdown(`\n\nAttributes: \`${component.attributes.join('`, `')}\``)
        return new vscode.Hover(markdown)
      }

      // Check if it's an attribute
      const attribute = getAttribute(word)
      if (attribute) {
        const markdown = new vscode.MarkdownString()
        markdown.appendMarkdown(`**${attribute.name}** _(attribute)_\n\n`)
        markdown.appendMarkdown(`${attribute.description}\n\n`)
        const valueInfo = formatAttributeValues(attribute)
        if (valueInfo) {
          markdown.appendMarkdown(`\`${valueInfo}\`\n\n`)
        }
        if (attribute.example) {
          markdown.appendMarkdown(`Example: \`${attribute.example}\``)
        }
        return new vscode.Hover(markdown)
      }

      // Check if it's a value keyword
      if (VALUE_KEYWORDS.includes(word)) {
        const relatedAttrs = ATTRIBUTES.filter(
          (a) => Array.isArray(a.values) && a.values.includes(word),
        )

        if (relatedAttrs.length > 0) {
          const markdown = new vscode.MarkdownString()
          markdown.appendMarkdown(`**${word}** _(value)_\n\n`)
          markdown.appendMarkdown(`Used in: ${relatedAttrs.map((a) => `\`${a.name}\``).join(', ')}`)
          return new vscode.Hover(markdown)
        }
      }

      return null
    },
  })

  // Diagnostics
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('wireframe')

  const validateDocument = (document: vscode.TextDocument) => {
    if (document.languageId !== 'wireframe') return

    const diagnostics: vscode.Diagnostic[] = []
    const text = document.getText()
    const lines = text.split('\n')

    const braceStack: { line: number; col: number; component?: string }[] = []
    let hasPage = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Skip comments
      if (line.trim().startsWith('//')) continue

      // Check for page component
      if (line.match(/^\s*page\b/)) {
        if (hasPage) {
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(i, 0, i, line.length),
              'Only one page component is allowed.',
              vscode.DiagnosticSeverity.Error,
            ),
          )
        }
        hasPage = true
      }

      // Check for unknown components
      const componentMatch = line.match(/^\s*(\w+)(?:\s|{|")/)
      if (componentMatch) {
        const compName = componentMatch[1]
        if (!getComponent(compName) && !['true', 'false'].includes(compName)) {
          const beforeMatch = line.substring(0, componentMatch.index!)
          if (!beforeMatch.match(/=\s*$/)) {
            diagnostics.push(
              new vscode.Diagnostic(
                new vscode.Range(
                  i,
                  componentMatch.index || 0,
                  i,
                  (componentMatch.index || 0) + compName.length,
                ),
                `Unknown component: "${compName}"`,
                vscode.DiagnosticSeverity.Warning,
              ),
            )
          }
        }
      }

      // Check for unknown attributes
      const attrMatches = line.matchAll(/\b(\w+)\s*=/g)
      for (const match of attrMatches) {
        const attrName = match[1]
        if (!getAttribute(attrName) && !getComponent(attrName)) {
          diagnostics.push(
            new vscode.Diagnostic(
              new vscode.Range(i, match.index!, i, match.index! + attrName.length),
              `Unknown attribute: "${attrName}"`,
              vscode.DiagnosticSeverity.Warning,
            ),
          )
        }
      }

      // Track braces for matching
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') {
          const beforeBrace = line.substring(0, j)
          const compMatch = beforeBrace.match(/(\w+)(?:\s+"[^"]*")?\s*$/)
          braceStack.push({
            line: i,
            col: j,
            component: compMatch ? compMatch[1] : undefined,
          })
        } else if (line[j] === '}') {
          if (braceStack.length === 0) {
            diagnostics.push(
              new vscode.Diagnostic(
                new vscode.Range(i, j, i, j + 1),
                'Unmatched closing brace',
                vscode.DiagnosticSeverity.Error,
              ),
            )
          } else {
            braceStack.pop()
          }
        }
      }

      // Check for unclosed strings
      const quotes = line.match(/"/g)
      if (quotes && quotes.length % 2 !== 0) {
        diagnostics.push(
          new vscode.Diagnostic(
            new vscode.Range(i, 0, i, line.length),
            'Unclosed string',
            vscode.DiagnosticSeverity.Error,
          ),
        )
      }
    }

    // Check for unclosed braces
    for (const brace of braceStack) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(brace.line, brace.col, brace.line, brace.col + 1),
          `Unclosed brace${brace.component ? ` (${brace.component})` : ''}`,
          vscode.DiagnosticSeverity.Error,
        ),
      )
    }

    // Info if no page component
    if (!hasPage && text.trim()) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          'Consider starting with a page component.',
          vscode.DiagnosticSeverity.Information,
        ),
      )
    }

    diagnosticCollection.set(document.uri, diagnostics)
  }

  // Validate on open and change
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument((e) => validateDocument(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnosticCollection.delete(doc.uri)),
  )

  // Validate already open documents
  vscode.workspace.textDocuments.forEach(validateDocument)

  context.subscriptions.push(completionProvider, hoverProvider, diagnosticCollection)
}
