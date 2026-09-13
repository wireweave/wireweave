# @wireweave/markdown-plugin

Markdown adapters that render Wireweave code fences through Core.

The [public tool contract](../../docs/spec/TOOLING.md#editor-integrations) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/markdown-plugin@<pinned-version>'
```

Install the Markdown engine used by your selected adapter as a peer dependency. Adapter entries and registration are defined by the tool contract.

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/markdown-plugin run build
pnpm --filter @wireweave/markdown-plugin run typecheck
pnpm --filter @wireweave/markdown-plugin run lint
pnpm --filter @wireweave/markdown-plugin run test
pnpm --filter @wireweave/markdown-plugin run format:check
```

License: MIT.
