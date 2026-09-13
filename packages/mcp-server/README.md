# @wireweave/mcp-server

An MCP transport adapter for Wireweave tools.

The [public tool contract](../../docs/spec/TOOLING.md#5-mcp-and-agent-plugins) defines this package's APIs, behavior, configuration and compatibility. The [language contract](../../docs/spec/LANGUAGE.md) defines the DSL. [Package metadata](package.json) owns package versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
npm install --global '@wireweave/mcp-server@<pinned-version>'
```

The installed executable is `wireweave-mcp`. Setup, transports and credentials are defined by the tool contract.

## Development

Run from the monorepo root after the [workspace setup](../../README.md).

```bash
pnpm --filter @wireweave/mcp-server run build
pnpm --filter @wireweave/mcp-server run typecheck
pnpm --filter @wireweave/mcp-server run lint
pnpm --filter @wireweave/mcp-server run test
pnpm --filter @wireweave/mcp-server run format:check
```

License: MIT.
