# Wireweave for VS Code

Editor integration for Wireweave files in VS Code and compatible editors.

The [editor contract](../../docs/spec/TOOLING.md#editor-integrations) defines commands, settings, preview, Markdown integration and generation behavior. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns extension contributions, versions and scripts.

## Installation

The extension identifier is `wireweave.wireweave-vscode`; its publisher is `wireweave`. It requires VS Code `^1.85.0` or a compatible host.

```bash
code --install-extension wireweave.wireweave-vscode
```

Use the extension version selected for your toolchain. A packaged `.vsix` can also be installed with the editor's **Install from VSIX** command. Client compatibility and release admission follow the [tool contract](../../docs/spec/TOOLING.md#7-build-compatibility-and-evidence).

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter wireweave-vscode run build
pnpm --filter wireweave-vscode run typecheck
pnpm --filter wireweave-vscode run lint
pnpm --filter wireweave-vscode run format:check
pnpm --filter wireweave-vscode run package
```

The `package` script creates the VSIX with `vsce package --no-dependencies`. Package and release verification are defined by the tool contract.

License: MIT.
