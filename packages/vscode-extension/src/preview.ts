/**
 * Wireframe Preview Panel
 *
 * Provides real-time preview of wireweave documents in a webview panel
 */

import * as vscode from 'vscode'
import { parse, render, renderToHtml, resolveViewport } from '@wireweave/core'
import type { WireframeDocument } from '@wireweave/core'

/**
 * Manages wireframe preview webview panels
 */
export class WireframePreviewPanel {
  private static currentPanel: WireframePreviewPanel | undefined
  private static readonly viewType = 'wireframePreview'

  private readonly panel: vscode.WebviewPanel
  private disposables: vscode.Disposable[] = []

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel

    // Handle disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    // Update content when panel becomes visible
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          const editor = vscode.window.activeTextEditor
          if (editor?.document.languageId === 'wireframe') {
            this.updateContent(editor.document)
          }
        }
      },
      null,
      this.disposables,
    )

    // Initial content
    const editor = vscode.window.activeTextEditor
    if (editor?.document.languageId === 'wireframe') {
      this.updateContent(editor.document)
    } else {
      this.showWelcome()
    }
  }

  /**
   * Create or show the preview panel
   */
  public static createOrShow(extensionUri: vscode.Uri, position: 'current' | 'side') {
    const column = position === 'side' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active

    // If we already have a panel, show it
    if (WireframePreviewPanel.currentPanel) {
      WireframePreviewPanel.currentPanel.panel.reveal(column)
      return
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      WireframePreviewPanel.viewType,
      'Wireframe Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    )

    WireframePreviewPanel.currentPanel = new WireframePreviewPanel(panel)
  }

  /**
   * Update the preview content from a document
   */
  public static update(document: vscode.TextDocument) {
    if (WireframePreviewPanel.currentPanel) {
      WireframePreviewPanel.currentPanel.updateContent(document)
    }
  }

  /**
   * Export document to HTML
   */
  public static async export(document: vscode.TextDocument): Promise<string> {
    const source = document.getText()

    try {
      const ast = parse(source)
      return renderToHtml(ast)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Parse error: ${message}`, { cause: error })
    }
  }

  /**
   * Update the webview content
   */
  private updateContent(document: vscode.TextDocument) {
    const source = document.getText()

    if (!source.trim()) {
      this.showWelcome()
      return
    }

    try {
      const ast = parse(source)
      const { html, css } = render(ast, {
        theme: this.getTheme(),
        includeStyles: true,
        background: 'transparent',
      })

      this.panel.webview.html = this.getWebviewContent(html, css, ast)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.panel.webview.html = this.getErrorContent(message)
    }
  }

  /**
   * Get the current theme setting
   */
  private getTheme(): 'light' | 'dark' {
    const config = vscode.workspace.getConfiguration('wireframe')
    const themeSetting = config.get<string>('theme', 'auto')

    if (themeSetting === 'auto') {
      return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light'
    }
    return themeSetting as 'light' | 'dark'
  }

  /**
   * Get the base preview width setting
   */
  private getPreviewWidth(): number {
    const config = vscode.workspace.getConfiguration('wireframe')
    return config.get<number>('previewWidth', 1200)
  }

  /**
   * Generate the webview HTML content
   * Uses SVG viewBox for automatic responsive scaling (same approach as markdown preview)
   */
  private getWebviewContent(html: string, css: string, ast?: WireframeDocument): string {
    const isDark = this.getTheme() === 'dark'
    // Border color: white for dark theme, black for light theme
    const borderColor = isDark ? '#ffffff' : '#000000'
    const outlineWidth = 1

    // Get viewport from first page, or use config setting as fallback
    let baseWidth = this.getPreviewWidth()
    let baseHeight = Math.round(baseWidth * 0.75) // Default 4:3 aspect ratio

    if (ast && ast.children.length > 0) {
      const firstPage = ast.children[0] as {
        width?: number
        height?: number
        viewport?: string
        device?: string
      }
      // Check direct width/height attributes first, then viewport/device
      if (firstPage?.width && firstPage?.height) {
        baseWidth = firstPage.width
        baseHeight = firstPage.height
      } else {
        const viewport = resolveViewport(firstPage?.viewport, firstPage?.device)
        baseWidth = viewport.width
        baseHeight = viewport.height
      }
    }

    // Wireframe CSS (inside SVG)
    const svgInternalCss = `
${css}
.wf-page {
  width: ${baseWidth}px;
  height: ${baseHeight}px;
  min-height: auto;
  overflow: auto;
  outline: ${outlineWidth}px solid ${borderColor};
  outline-offset: 0;
  border-radius: 0;
  margin: ${outlineWidth}px;
}
`

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    html, body {
      margin: 0;
      padding: 16px;
      width: 100%;
      height: 100%;
      background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), var(--vscode-editor-background);
      box-sizing: border-box;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 ${baseWidth + outlineWidth * 2} ${baseHeight + outlineWidth * 2}" preserveAspectRatio="xMidYMid meet">
    <style>${svgInternalCss}</style>
    <foreignObject x="0" y="0" width="${baseWidth + outlineWidth * 2}" height="${baseHeight + outlineWidth * 2}">
      <div xmlns="http://www.w3.org/1999/xhtml">
        ${html}
      </div>
    </foreignObject>
  </svg>
</body>
</html>`
  }

  /**
   * Show error content
   */
  private getErrorContent(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fef2f2;
      color: #991b1b;
    }
    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #dc2626;
    }
    pre {
      margin: 0;
      padding: 12px;
      background: #fee2e2;
      border-radius: 6px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <h3>Syntax Error</h3>
  <pre>${this.escapeHtml(message)}</pre>
</body>
</html>`
  }

  /**
   * Show welcome content when no file is open
   */
  private showWelcome(): void {
    this.panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #475569;
      text-align: center;
    }
    h2 {
      margin: 0 0 16px 0;
      color: #1e293b;
    }
    p {
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    code {
      display: block;
      margin: 24px auto;
      max-width: 400px;
      padding: 16px;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 8px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 13px;
      text-align: left;
      white-space: pre;
    }
  </style>
</head>
<body>
  <h2>Wireframe Lang Preview</h2>
  <p>Open a <strong>.wf</strong> or <strong>.wireframe</strong> file to see the preview.</p>
  <code>page "My App" {
  header {
    title "Welcome"
  }
  main {
    card "Hello" {
      text "Start editing!"
      button "Click me"
    }
  }
}</code>
</body>
</html>`
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Dispose the panel and clean up resources
   */
  private dispose() {
    WireframePreviewPanel.currentPanel = undefined

    this.panel.dispose()

    while (this.disposables.length) {
      const disposable = this.disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }
}
