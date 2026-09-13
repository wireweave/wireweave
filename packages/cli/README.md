# @wireweave/cli

The terminal entry point for Wireweave language tools.

The [public tool contract](../../docs/spec/TOOLING.md#4-cli) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
npm install --global '@wireweave/cli@<pinned-version>'
```

The installed executable is `wireweave`. Setup, transports and credentials are defined by the tool contract.

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/cli run build
pnpm --filter @wireweave/cli run typecheck
pnpm --filter @wireweave/cli run lint
pnpm --filter @wireweave/cli run test
pnpm --filter @wireweave/cli run format:check
```

License: MIT.
