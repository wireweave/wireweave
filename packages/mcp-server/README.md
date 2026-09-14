# @wireweave/mcp-server

An MCP transport adapter for Wireweave tools.

The [public tool contract](https://github.com/wireweave/wireweave/blob/develop/docs/spec/TOOLING.md#5-mcp-and-agent-plugins) defines this package's APIs, behavior, configuration and compatibility. The [language contract](https://github.com/wireweave/wireweave/blob/develop/docs/spec/LANGUAGE.md) defines the DSL. Package metadata owns versions, exports, dependencies and scripts.

## Installation

Use Node.js >=22.13.0. Replace `<pinned-version>` with the release selected for your toolchain.

```bash
npm install --global '@wireweave/mcp-server@<pinned-version>'
```

The installed executable is `wireweave-mcp`. Setup, transports and credentials are defined by the tool contract.

Run `wireweave-mcp` for stdio. Local parsing, validation, rendering, analysis, diffing, component discovery and JSON/Figma export need no account or API key. stdout contains only MCP protocol messages; diagnostics use stderr.

## HTTP and credentials

HTTP mode (`wireweave-mcp --http`) requires a host-provided `WIREWEAVE_MCP_TOKEN`. Clients send it as `Authorization: Bearer <token>` on every MCP operation. Use a randomly generated secret and keep it in the host's secret store. The server binds to loopback by default. `WIREWEAVE_MCP_ALLOWED_ORIGINS` is an exact, comma-separated Origin allowlist; an empty list rejects requests carrying an Origin header. An allowed browser's CORS preflight needs no bearer token and cannot create a session or execute a tool; its actual request still requires authentication. See the public tool contract for configuration bounds and session behavior.

The HTTP transport token is separate from `WIREWEAVE_API_KEY`. The latter authenticates explicitly invoked remote tools at `WIREWEAVE_API_URL` (default `https://api.wireweave.org`), using the `x-api-key` header. Remote tools include cloud storage/sharing, account/billing, gallery and hosted language guides/examples. Saving or updating a cloud wireframe sends its source and supplied metadata to that service. Local failures never fall back to remote execution. Remote calls time out after 30 seconds and do not follow redirects.

## Privacy and security

Read the [Privacy Policy](https://www.wireweave.org/privacy) for hosted-service data handling, retention and deletion requests. Local deterministic calls do not upload source or credentials. Every tool declares its read-only, destructive, idempotent and external-interaction hints; these describe behavior and do not replace authentication or authorization.

## Development

Run from the monorepo root after the [workspace setup](https://github.com/wireweave/wireweave#workspace-commands).

```bash
pnpm --filter @wireweave/mcp-server run build
pnpm --filter @wireweave/mcp-server run typecheck
pnpm --filter @wireweave/mcp-server run lint
pnpm --filter @wireweave/mcp-server run test
pnpm --filter @wireweave/mcp-server run format:check
```

License: MIT.
