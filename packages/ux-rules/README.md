# @wireweave/ux-rules

Deterministic UX diagnostics for Wireweave documents and applications.

The [public tool contract](../../docs/spec/TOOLING.md#2-pure-library-api) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/ux-rules@<pinned-version>'
```

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/ux-rules run build
pnpm --filter @wireweave/ux-rules run typecheck
pnpm --filter @wireweave/ux-rules run lint
pnpm --filter @wireweave/ux-rules run test
pnpm --filter @wireweave/ux-rules run format:check
```

License: MIT.
