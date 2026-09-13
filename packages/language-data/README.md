# @wireweave/language-data

Language catalogs and editor adapters for Wireweave.

The [public tool contract](../../docs/spec/TOOLING.md#editor-integrations) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/language-data@<pinned-version>'
```

The optional Monaco and CodeMirror adapters use their declared peer dependencies; install the editor peers for the adapter you select.

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/language-data run build
pnpm --filter @wireweave/language-data run typecheck
pnpm --filter @wireweave/language-data run lint
pnpm --filter @wireweave/language-data run test
pnpm --filter @wireweave/language-data run format:check
```

License: MIT.
