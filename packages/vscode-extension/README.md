<p align="center">
  <img src="icon.png" width="128" height="128" alt="Wireweave">
</p>

<h1 align="center">Wireweave for VS Code</h1>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=wireweave.wireweave-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/v/wireweave.wireweave-vscode" alt="Version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=wireweave.wireweave-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/i/wireweave.wireweave-vscode" alt="Installs">
  </a>
  <a href="https://github.com/wireweave/vscode-extension/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/wireweave/vscode-extension" alt="License">
  </a>
</p>

<p align="center">
  Syntax highlighting and live preview for <a href="https://wireweave.org">Wireweave</a> - a text-based wireframe DSL for AI-assisted design.
</p>

---

Edit `.wf` / `.wireframe` files as code and see them rendered. The extension bundles the Wireweave parser, renderer, and language data, so it works fully offline — AI features additionally require a Wireweave account.

## Features

- **Syntax Highlighting** - Full syntax highlighting for `.wf` and `.wireframe` files
- **Live Preview** - Real-time preview as you type
- **Auto-completion** - Smart suggestions for components, attributes, and values with snippets
- **Hover Documentation** - View component and attribute documentation on hover
- **Diagnostics** - Real-time error detection (unknown components, unmatched braces, etc.)
- **Markdown Integration** - Embed wireframes in Markdown with ` ```wireframe ` code blocks
- **Export Options** - Export wireframes as HTML
- **Theme Support** - Auto-detects VS Code theme (light/dark)
- **AI Generate & Improve** - Generate a wireframe from a prompt, or improve the current one, via the Wireweave dashboard account

Works in VS Code and Cursor (and other VS Code-compatible editors via Open VSX).

## Installation

### From VS Code Marketplace

1. Open **Extensions** sidebar (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for **"Wireweave"**
3. Click **Install**

Or install via command line:

```bash
code --install-extension wireweave.wireweave-vscode
```

## Quick Start

### 1. Create a wireframe file

Create a new file with `.wf` extension:

```wireframe
page "Login" {
  main p=8 {
    row justify=center {
      col span=4 {
        card p=6 {
          title "Sign In" level=2
          input "Email" inputType=email required
          input "Password" inputType=password required
          button "Sign In" primary
        }
      }
    }
  }
}
```

### 2. Open the preview

- **Keyboard**: `Cmd+K V` (Mac) / `Ctrl+K V` (Windows/Linux)
- **Command Palette**: `Wireweave: Open Preview to Side`
- **Editor Title**: Click the preview icon

### 3. Export (optional)

- `Wireweave: Export as HTML`

## Markdown Preview

Embed wireframes in your Markdown documentation:

````markdown
# Login Page Design

```wireframe
page {
  card p=4 {
    title "Login"
    input "Email" inputType=email
    button "Sign In" primary
  }
}
```
````

Open Markdown preview (`Cmd+Shift+V`) to see the rendered wireframe.

## Commands

| Command                           | Keybinding    | Description                                                             |
| --------------------------------- | ------------- | ----------------------------------------------------------------------- |
| `Wireweave: Open Preview`         | -             | Open preview in current panel                                           |
| `Wireweave: Open Preview to Side` | `Cmd+K V`     | Open preview in split view                                              |
| `Wireweave: Export as HTML`       | -             | Export to HTML file                                                     |
| `Wireweave: AI Generate`          | `Cmd+K Cmd+W` | AI 와이어프레임 생성 / Generate a wireframe with AI                     |
| `Wireweave: AI Improve`           | -             | 현재 코드 AI 개선 / Improve current wireframe with AI                   |
| `Wireweave: Login`                | -             | dashboard.wireweave.org 토큰으로 로그인 / Log in with a dashboard token |
| `Wireweave: Show Quota`           | -             | AI 사용량 확인 / Show current AI quota                                  |

## AI Features

The AI commands talk to your Wireweave dashboard account. Run `Wireweave: Login`
to authenticate — the dashboard issues a one-time token, stored in **VS Code
SecretStorage** (not on disk) under the `wireweave.token` secret. Use
`Wireweave: Show Quota` to check remaining usage.

- **AI Generate** streams DSL into the active wireframe editor, or opens an
  untitled `.wf` document when no wireframe editor is active.
- **AI Improve** shows a side-by-side diff before applying changes.

> This is a pre-release (`2.0.0-beta.0`). Use VS Code's "Install Pre-release
> Version" to try it.

## Settings

| Setting                  | Default | Description                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| `wireframe.theme`        | `auto`  | Preview theme (`auto`, `light`, `dark`)        |
| `wireframe.autoPreview`  | `false` | Auto-open preview when opening wireframe files |
| `wireframe.previewWidth` | `1200`  | Base width for preview (in pixels)             |

## Supported File Extensions

- `.wf` (recommended)
- `.wireframe`

## Learn More

- [Documentation](https://docs.wireweave.org)
- [Playground](https://wireweave.org)

## Feedback & Issues

- [GitHub Issues](https://github.com/wireweave/vscode-extension/issues)

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

[MIT](LICENSE)
