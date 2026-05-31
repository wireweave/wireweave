/**
 * wireweave VSCode Extension
 *
 * Provides syntax highlighting, real-time preview, and export functionality
 * for wireweave DSL files.
 */

import * as vscode from 'vscode'
import { WireframePreviewPanel } from './preview'
import { registerLanguageFeatures } from './language'
import { parse, render, resolveViewport } from '@wireweave/core'
import { aiGenerate } from './commands/aiGenerate'
import { aiImprove } from './commands/aiImprove'
import { login } from './commands/login'
import { showQuota } from './commands/showQuota'

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Render wireframe code to HTML for markdown preview
 *
 * Uses SVG foreignObject with viewBox for automatic responsive scaling.
 * Key: <style> tag must be a direct child of <svg>, not inside foreignObject.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/foreignObject
 */
function renderWireframeToHtml(code: string): string {
  try {
    const doc = parse(code)
    const { html, css } = render(doc, {
      theme: 'light',
      includeStyles: true,
      background: 'transparent',
    })

    // Generate unique ID for CSS scoping
    const scopeId = `wf-${Math.random().toString(36).substring(2, 9)}`

    // Get viewport from first page
    const firstPage = doc.children[0] as {
      width?: number
      height?: number
      viewport?: string
      device?: string
    }
    let baseWidth: number
    let baseHeight: number

    // Check direct width/height attributes first, then viewport/device
    if (firstPage?.width && firstPage?.height) {
      baseWidth = firstPage.width
      baseHeight = firstPage.height
    } else {
      const viewport = resolveViewport(firstPage?.viewport, firstPage?.device)
      baseWidth = viewport.width
      baseHeight = viewport.height
    }

    // Scale settings for container sizing
    const maxScale = baseWidth > 800 ? 0.5 : 0.8
    const scaledWidth = Math.round(baseWidth * maxScale)

    // Container CSS (outside SVG)
    const containerCss = `
.${scopeId} {
  all: initial;
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 16px 0;
  padding: 16px;
}
.${scopeId} .wireframe-container {
  display: flex;
  justify-content: center;
}
.${scopeId} .wireframe-svg-wrapper {
  width: 100%;
  max-width: ${scaledWidth}px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 4px;
  overflow: hidden;
}
.${scopeId} .wireframe-svg-wrapper > svg {
  display: block;
  width: 100%;
  height: auto;
}
`

    // Wireframe CSS (inside SVG <style> tag - must be direct child of <svg>)
    const svgInternalCss = `
${css}
/* Override core's min-height: 100vh with fixed viewport dimensions */
.wf-page {
  width: ${baseWidth}px;
  height: ${baseHeight}px;
  min-height: auto;
  overflow: auto;
}
`

    // SVG with foreignObject - style tag is direct child of svg (per MDN)
    return `<div class="${scopeId}">
  <style>${containerCss}</style>
  <div class="wireframe-container">
    <div class="wireframe-svg-wrapper">
      <svg viewBox="0 0 ${baseWidth} ${baseHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        <style>${svgInternalCss}</style>
        <foreignObject x="0" y="0" width="${baseWidth}" height="${baseHeight}">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${html}
          </div>
        </foreignObject>
      </svg>
    </div>
  </div>
</div>`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return `<div class="wireframe-preview-error">
  <strong>Wireframe Error:</strong> ${escapeHtml(message)}
</div>
<pre class="wireframe-preview-source"><code>${escapeHtml(code)}</code></pre>`
  }
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  // Register preview commands
  context.subscriptions.push(
    vscode.commands.registerCommand('wireframe.preview', () => {
      WireframePreviewPanel.createOrShow(context.extensionUri, 'current')
    }),

    vscode.commands.registerCommand('wireframe.previewToSide', () => {
      WireframePreviewPanel.createOrShow(context.extensionUri, 'side')
    }),

    vscode.commands.registerCommand('wireframe.exportHtml', () => {
      exportToFile()
    }),

    // v2.0 AI agent commands
    vscode.commands.registerCommand('wireweave.aiGenerate', () => aiGenerate(context)),
    vscode.commands.registerCommand('wireweave.aiImprove', () => aiImprove(context)),
    vscode.commands.registerCommand('wireweave.login', () => login(context)),
    vscode.commands.registerCommand('wireweave.showQuota', () => showQuota(context)),
  )

  // Update preview on document change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'wireframe') {
        WireframePreviewPanel.update(e.document)
      }
    }),
  )

  // Update preview when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'wireframe') {
        WireframePreviewPanel.update(editor.document)
      }
    }),
  )

  // Auto-preview on file open (if enabled)
  const config = vscode.workspace.getConfiguration('wireframe')
  if (config.get('autoPreview')) {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === 'wireframe') {
          // Small delay to ensure editor is ready
          setTimeout(() => {
            vscode.commands.executeCommand('wireframe.previewToSide')
          }, 100)
        }
      }),
    )
  }

  // Register language features (completion, hover)
  registerLanguageFeatures(context)

  // Return markdown-it plugin for markdown preview
  return {
    extendMarkdownIt(md: MarkdownIt) {
      const defaultFence = md.renderer.rules.fence

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const info = token.info ? token.info.trim() : ''

        // Check if this is a wireframe code block
        if (info === 'wireframe' || info === 'wf') {
          return renderWireframeToHtml(token.content)
        }

        // For other code blocks, use the default renderer
        if (defaultFence) {
          return defaultFence(tokens, idx, options, env, self)
        }
        return self.renderToken(tokens, idx, options)
      }

      return md
    },
  }
}

// Type definition for markdown-it (simplified)
interface MarkdownIt {
  renderer: {
    rules: {
      fence?: (
        tokens: Array<{ info?: string; content: string }>,
        idx: number,
        options: unknown,
        env: unknown,
        self: { renderToken: (tokens: unknown[], idx: number, options: unknown) => string },
      ) => string
    }
  }
}

/**
 * Export the current wireframe to HTML file
 */
async function exportToFile() {
  const editor = vscode.window.activeTextEditor

  if (!editor || editor.document.languageId !== 'wireframe') {
    vscode.window.showErrorMessage('No wireframe file is active')
    return
  }

  // Get default file name
  const currentFileName = editor.document.fileName
  const baseName = currentFileName.replace(/\.(wf|wireframe)$/, '')
  const defaultFileName = `${baseName}.html`

  // Show save dialog
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultFileName),
    filters: {
      HTML: ['html'],
    },
  })

  if (!uri) {
    return // User cancelled
  }

  try {
    const content = await WireframePreviewPanel.export(editor.document)
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'))
    vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    vscode.window.showErrorMessage(`Export failed: ${message}`)
  }
}

/**
 * Extension deactivation
 */
export function deactivate() {
  // Cleanup if needed
}
