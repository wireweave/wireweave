# @wireweave/sdk

The typed dispatch and I/O adapter used by Wireweave clients.

The [public tool contract](../../docs/spec/TOOLING.md#3-sdk-dispatch-and-io-admission) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/sdk@<pinned-version>'
```

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/sdk run build
pnpm --filter @wireweave/sdk run typecheck
pnpm --filter @wireweave/sdk run lint
pnpm --filter @wireweave/sdk run test
pnpm --filter @wireweave/sdk run format:check
```

License: MIT.
