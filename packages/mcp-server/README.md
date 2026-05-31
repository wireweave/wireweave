# @wireweave/mcp-server

A Model Context Protocol (MCP) server that exposes the Wireweave wireframe DSL to MCP clients like Claude Desktop and Cursor.

## What it does

This server is a thin wrapper over [`@wireweave/sdk`](https://github.com/wireweave/sdk). Every tool call from the MCP client is forwarded to the SDK's single `dispatch()` entry point, which routes it to one of two places:

- **Local tools** run in-process via `@wireweave/core` and `@wireweave/ux-rules`. No network, no credits — they work even without an API key.
- **Server tools** are proxied to the Wireweave API server (`api-server`) over HTTP. These require an API key (cloud project/wireframe storage, account & billing, hosted reference content such as the grammar and LLM guide).

It serves **32 tools** (9 local + 23 server) plus the prompts and resources defined by the api-server contract. The server does not classify, cache, or post-process results — the SDK and api-server own that logic.

Local tools:

`wireweave_parse` · `wireweave_validate` · `wireweave_render_html_code` · `wireweave_validate_ux` · `wireweave_diff` · `wireweave_analyze` · `wireweave_list_components` · `wireweave_export_json` · `wireweave_export_figma`

## Install

```bash
npm install -g @wireweave/mcp-server
```

Or run directly:

```bash
npx @wireweave/mcp-server
```

Requires Node.js 20+. Get an API key from the [Wireweave dashboard](https://wireweave.org).

## Usage

### MCP client configuration

Add the server to your MCP client config. For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

The same `command` / `args` / `env` shape works for any stdio MCP client (Cursor, etc.).

### Transport

The server runs over **stdio** by default. A streamable-HTTP transport is available with `--http` (or `WIREWEAVE_TRANSPORT=http`), serving the MCP endpoint at `/mcp` and a health check at `/health`.

```bash
wireweave-mcp            # stdio (default)
wireweave-mcp --http     # streamable HTTP on 127.0.0.1:3305
```

## Environment

| Variable                     | Default                     | Purpose                                                                                                                            |
| ---------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `WIREWEAVE_API_KEY`          | —                           | API key from the dashboard. Required for server tools; local tools work without it. The server logs a warning at startup if unset. |
| `WIREWEAVE_API_URL`          | `https://api.wireweave.org` | Override the API base.                                                                                                             |
| `WIREWEAVE_TRANSPORT`        | `stdio`                     | Set to `http` for streamable HTTP (same as `--http`).                                                                              |
| `WIREWEAVE_MCP_PORT`         | `3305`                      | HTTP transport port.                                                                                                               |
| `WIREWEAVE_MCP_HOST`         | `127.0.0.1`                 | HTTP transport host.                                                                                                               |
| `WIREWEAVE_MCP_MAX_SESSIONS` | `10`                        | Max concurrent HTTP sessions.                                                                                                      |

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
