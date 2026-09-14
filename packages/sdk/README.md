# @wireweave/sdk

The typed dispatch and I/O adapter used by Wireweave clients.

The [public tool contract](https://github.com/wireweave/wireweave/blob/develop/docs/spec/TOOLING.md#3-sdk-dispatch-and-io-admission) defines this package's APIs, behavior, configuration and compatibility. The [language contract](https://github.com/wireweave/wireweave/blob/develop/docs/spec/LANGUAGE.md) defines the DSL. Package metadata owns versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
pnpm add --save-exact '@wireweave/sdk@<pinned-version>'
```

`dispatch` validates arguments against the shared public tool schema before execution. Local tools never require an account or perform a remote fallback. Remote calls send the supplied API key to the configured API URL, reject redirects and have a 30-second timeout. Pass `DispatchOptions.signal` to cancel pending work. See the [MCP adapter's credential and data-flow guide](https://github.com/wireweave/wireweave/tree/main/packages/mcp-server#http-and-credentials) and [Privacy Policy](https://www.wireweave.org/privacy) for hosted-service behavior.

## Development

Run from the monorepo root after the [workspace setup](https://github.com/wireweave/wireweave#workspace-commands).

```bash
pnpm --filter @wireweave/sdk run build
pnpm --filter @wireweave/sdk run typecheck
pnpm --filter @wireweave/sdk run lint
pnpm --filter @wireweave/sdk run test
pnpm --filter @wireweave/sdk run format:check
```

License: MIT.
