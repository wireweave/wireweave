# @wireweave/mcp-server

A Model Context Protocol (MCP) server that exposes the Wireweave wireframe DSL to MCP clients like Claude Desktop and Cursor.

## What it does

This server is a thin wrapper over [`@wireweave/sdk`](https://github.com/wireweave/wireweave/tree/main/packages/sdk). Every tool call from the MCP client is forwarded to the SDK's single `dispatch()` entry point, which validates the public input schema and routes it to one of two places:

- **Local tools** run in-process via `@wireweave/core` and `@wireweave/ux-rules`. No network, no credits — they work even without an API key.
- **Server tools** are proxied to the Wireweave API server (`api-server`) over HTTP. These require an API key (cloud project/wireframe storage, account & billing, hosted reference content such as the grammar and LLM guide).

It serves **32 tools** (9 local + 23 server) plus prompts and resources. Tool definitions, routing and all four behavioral annotations come from the SDK's public `src/tool-catalog.json`. The offline generator and regression tests keep both adapters consistent; private service access is not required to build the catalog.

Local tools:

`wireweave_parse` · `wireweave_validate` · `wireweave_render_html_code` · `wireweave_validate_ux` · `wireweave_diff` · `wireweave_analyze` · `wireweave_list_components` · `wireweave_export_json` · `wireweave_export_figma`

## Install

```bash
npm install -g '@wireweave/mcp-server@<pinned-version>'
```

Or run directly:

```bash
npx '@wireweave/mcp-server@<pinned-version>'
```

Requires Node.js >=22.13.0. Replace `<pinned-version>` with the stable release selected for your toolchain. Only remote tools require an API key from the [Wireweave dashboard](https://wireweave.org).

## Usage

### MCP client configuration

Register the installed executable in your MCP client's supported stdio configuration, for example:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "wireweave-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

Use the installed executable's absolute path if your client does not inherit its PATH. Client configuration locations and envelopes depend on the installed client; consult that client's setup instructions.

### Transport

The server runs over **stdio** by default. A streamable-HTTP transport is available with `--http` (or `WIREWEAVE_TRANSPORT=http`), serving the MCP endpoint at `/mcp` and a health check at `/health`.

```bash
wireweave-mcp            # stdio (default)
wireweave-mcp --http     # requires WIREWEAVE_MCP_TOKEN; loopback port 3305
```

## Environment

| Variable                        | Default                     | Purpose                                                                                   |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `WIREWEAVE_API_KEY`             | —                           | Required only for remote tools. Local tools work without it.                              |
| `WIREWEAVE_API_URL`             | `https://api.wireweave.org` | Override the API base.                                                                    |
| `WIREWEAVE_TRANSPORT`           | `stdio`                     | Set to `http` for streamable HTTP (same as `--http`).                                     |
| `WIREWEAVE_MCP_PORT`            | `3305`                      | HTTP port; integer 1–65535.                                                               |
| `WIREWEAVE_MCP_HOST`            | `127.0.0.1`                 | Loopback host. Non-loopback binding fails startup without a supported deployment profile. |
| `WIREWEAVE_MCP_MAX_SESSIONS`    | `10`                        | Active plus initializing session limit; integer 1–1024.                                   |
| `WIREWEAVE_MCP_TOKEN`           | —                           | Required host-provided bearer credential for HTTP; separate from the account API key.     |
| `WIREWEAVE_MCP_ALLOWED_ORIGINS` | Empty                       | Exact comma-separated HTTP(S) origins. Empty rejects every request carrying Origin.       |

### HTTP and credentials

Send `Authorization: Bearer <WIREWEAVE_MCP_TOKEN>` on every MCP operation. Use a randomly generated token from the host secret store. Host and Origin are validated before dispatch. An allowed browser's OPTIONS preflight needs no bearer token but cannot create a session or execute a tool; its actual request still requires authentication. Wildcard CORS is not supported.

Unknown or expired sessions return 404. Exhausted capacity returns 503 with `Retry-After: 1`. Idle sessions expire after 30 minutes. Termination cancels their pending work and frees capacity. Invalid configuration fails startup; malformed requests cannot terminate the process. Stdout is reserved for MCP messages and diagnostics use stderr.

Remote tools send `WIREWEAVE_API_KEY` only to `WIREWEAVE_API_URL` using `x-api-key`. Saving or updating cloud wireframes transmits the supplied source and metadata. Requests time out after 30 seconds, carry cancellation and reject redirects. A local failure never triggers remote execution.

### Privacy and security

The [Privacy Policy](https://www.wireweave.org/privacy) describes hosted-service data handling, retention and deletion requests. Local deterministic calls do not upload source or credentials. Tool annotations describe read-only, destructive, idempotent and external-interaction behavior; they are hints, not authorization.

## Tools

Once connected, ask your MCP client to work with wireframes, for example:

> "Parse and validate this Wireweave DSL." (local)
>
> "Check this wireframe against UX best practices." (local)
>
> "Save this wireframe as 'Dashboard v2' in my project." (server — needs an API key)

Server tools cover cloud project/wireframe CRUD and versioning, share links, the public gallery, account balance & subscription, pricing, and hosted reference content (grammar, guide, patterns, examples, UX rules). Calls that need a key fail with a clear message if one is not configured.

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
