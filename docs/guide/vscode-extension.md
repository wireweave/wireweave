# VS Code Extension

The Wireweave VS Code extension provides syntax highlighting, live preview, code completion, and Wireweave AI agent integration for `.wf` / `.wireframe` files.

> **v2.0 Pre-release.** AI agent integration (Generate / Improve) and dashboard login ship in `2.0.0-beta.0`. Use VS Code's **Install Pre-release Version** to try it; otherwise stay on the latest stable `1.x`.

## Installation

### From VS Code Marketplace

1. Open VS Code Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for "Wireweave"
3. Click **Install** for the stable release, or **Install Pre-release Version** to try `2.0-beta`

### Manual Installation

```bash
code --install-extension wireweave.wireweave-vscode
```

## Features

### Syntax Highlighting, Hover, and Completion

Open any `.wf` or `.wireframe` file:

- Component keyword highlighting (`page`, `card`, `button`, …)
- Hover docs for components and attributes
- Autocomplete for component names, modifiers, and attribute keys
- Real-time syntax error diagnostics in the Problems panel

### Live Preview

1. Open a `.wf` file
2. Press `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows) to open the preview, or `Cmd+K V` to open it in a split panel
3. The preview updates as you edit

### AI Generate (v2.0)

Generate a wireframe from a natural-language prompt:

- Keybinding: `Cmd+K Cmd+W` (Mac) / `Ctrl+K Ctrl+W` (Windows)
- Or run **Wireweave: AI Generate** from the command palette

If a wireframe editor is active, the generated DSL replaces its contents; otherwise a new untitled `.wf` document opens. The result streams in as it is generated.

### AI Improve (v2.0)

Refine the current wireframe (selection or full document) with an instruction:

- Run **Wireweave: AI Improve** from the command palette
- A `vscode.diff` view opens — review the change side-by-side and apply if it looks right

### Login & Quota (v2.0)

AI features require authentication against the Wireweave dashboard:

- Run **Wireweave: Login** — opens `dashboard.wireweave.org/auth/cli?source=vscode` in your browser
- The dashboard issues a one-time token. The extension stores it in **VS Code SecretStorage** under the key `wireweave.token` — tokens are never written to `~/.wireweave/config.json` for the extension.
- Run **Wireweave: Show Quota** to see your current AI usage (`used/limit` and reset time)

### Export to HTML

Run **Wireweave: Export as HTML** to write the rendered HTML to a file.

## Commands

| Command                           | Keybinding                      | Description                                  |
| --------------------------------- | ------------------------------- | -------------------------------------------- |
| `Wireweave: Open Preview`         | —                               | Open preview in the current panel            |
| `Wireweave: Open Preview to Side` | `Cmd+K V` / `Ctrl+K V`          | Open preview in a split view                 |
| `Wireweave: Export as HTML`       | —                               | Export the current wireframe to an HTML file |
| `Wireweave: AI Generate`          | `Cmd+K Cmd+W` / `Ctrl+K Ctrl+W` | Generate DSL from a natural-language prompt  |
| `Wireweave: AI Improve`           | —                               | Refine the current wireframe via a diff view |
| `Wireweave: Login`                | —                               | Sign in with a Wireweave dashboard token     |
| `Wireweave: Show Quota`           | —                               | Show current AI usage and reset time         |

## File Association

The extension associates with `.wf` and `.wireframe` files. To set the association manually:

```json
{
  "files.associations": {
    "*.wf": "wireframe",
    "*.wireframe": "wireframe"
  }
}
```

## Settings

Open VS Code settings and search for `Wireweave` to configure preview behavior and the API endpoint. AI tokens are managed through **Wireweave: Login** and stored in SecretStorage — never expose them in `settings.json`.

## Troubleshooting

### Preview not loading

1. Check the DSL for syntax errors (Problems panel)
2. Reload VS Code (`Cmd+Shift+P` → "Reload Window")
3. Check the Output panel (View → Output → Wireweave)

### AI commands fail with "Not signed in"

Run **Wireweave: Login** to obtain a dashboard token. The token is stored in VS Code SecretStorage under `wireweave.token`. Re-running **Login** rotates the token.

### Syntax highlighting not working

1. Verify the file extension is `.wf` or `.wireframe`
2. Check the language mode in the status bar (should be "Wireframe")
3. Reinstall the extension

## Next Steps

- [Markdown Plugin](/guide/markdown-plugin) — embed wireframes in docs
- [MCP Server](/guide/mcp-server) — AI integration for other clients
- [v2.0 Release Notes](/releases/v2.0-beta) — what's new in the AI agent release
