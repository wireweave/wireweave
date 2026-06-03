# Changelog

## 2.0.0

All notable changes to the Wireweave VS Code extension will be documented in this file.

## [2.0.0-beta.0] - 2026-04-29

Pre-release. Adds Wireweave AI agent integration.

### Added

- `Wireweave: AI Generate` — generate DSL from a natural-language prompt
  (keybinding: `Cmd+K Cmd+W` / `Ctrl+K Ctrl+W`). Streams the result; replaces
  the active wireframe editor when present, otherwise opens a new untitled
  `.wf` document.
- `Wireweave: AI Improve` — refine the current wireframe (selection or full
  document) with an instruction; shows a `vscode.diff` view and prompts to
  apply.
- `Wireweave: Login` — opens `dashboard.wireweave.org/auth/cli?source=vscode`
  in the browser and stores the resulting token in **VS Code SecretStorage**
  under the key `wireweave.token`. Tokens are no longer written to
  `~/.wireweave/config.json` for the extension.
- `Wireweave: Show Quota` — shows current AI usage (`used/limit` and reset
  time) via the `/api/agent/usage/me` endpoint.

### Changed

- Marked package as `preview` (VS Code pre-release).
- Bumped version 1.1.3 → 2.0.0-beta.0.

## [1.0.1] - 2026-01-17

### Fixed

- Fix broken links in README (examples, discussions removed)
- Add Documentation and Playground links

## [1.0.0] - 2026-01-17

### Added

- Syntax highlighting for `.wf` and `.wireframe` files
- Live preview panel with real-time updates
- Theme support (auto-detects VS Code light/dark theme)
- Theme-aware outline border for preview panel
- Transparent background support for preview
- Markdown integration with `wireframe` code blocks
- Export to HTML
- Auto-completion for components and attributes
- Hover documentation

### Commands

- `Wireweave: Open Preview` - Open preview in current panel
- `Wireweave: Open Preview to Side` - Open preview in split view
- `Wireweave: Export as HTML` - Export wireframe as HTML

### Settings

- `wireframe.theme` - Preview theme (auto/light/dark)
- `wireframe.autoPreview` - Auto-open preview on file open
- `wireframe.previewWidth` - Base width for preview
