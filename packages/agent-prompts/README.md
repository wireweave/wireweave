# @wireweave/agent-prompts

Versioned grammar prompts derived from the Wireweave language contract.

The [public tool contract](../../docs/spec/TOOLING.md#5-mcp-and-agent-plugins) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/agent-prompts@<pinned-version>'
```

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/agent-prompts run build
pnpm --filter @wireweave/agent-prompts run typecheck
pnpm --filter @wireweave/agent-prompts run lint
pnpm --filter @wireweave/agent-prompts run test
pnpm --filter @wireweave/agent-prompts run format:check
```

License: MIT.
