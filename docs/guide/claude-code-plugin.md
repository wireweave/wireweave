# Claude Code Plugin

The Wireweave Claude Code plugin (`@wireweave/wireweave`) exposes a single slash command — `/wireweave` — that lets Claude Code drive the full Wireweave DSL toolchain (parse, validate, render, analyze, diff, UX rules, exporters). The plugin itself ships zero code; every subcommand is delegated to [`@wireweave/cli`](/guide/cli) through `npx -y`.

> **v0.1.0 — beta.** The plugin shape is stable; the cli surface it mirrors may still evolve before `1.0.0`.

## Install

The plugin is distributed as a Claude Code marketplace entry hosted on the GitHub repo. Add the marketplace and install in one Claude Code session:

```text
/plugin marketplace add wireweave/wireweave
/plugin install wireweave@wireweave
```

Requirements:

- Claude Code with plugin marketplace support
- Node.js 18+ (the plugin invokes the cli through `npx`)
- Network access to the npm registry on first use (subsequent calls are cached by npx)

After install, `/wireweave` is available in any Claude Code session.

## How it works

```
Claude Code  →  /wireweave <subcommand>
                      │
                      ▼
            npx -y @wireweave/cli <subcommand>
                      │
                      ▼
                @wireweave/sdk dispatch()
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
  local (in-process)        server (api.wireweave.org)
  parser / renderer /       login (key verification)
  ux-rules / exporters
```

- The plugin has no `src/` — it is a thin shell.
- The cli is fetched fresh per invocation via `npx -y @wireweave/cli`, so cli minor / patch upgrades reach plugin users without re-publishing the plugin.
- All local work (parsing, rendering, UX validation, exports) runs in-process inside the cli through the SDK's `localDispatch`. Server work (`login` key verification) routes through `api.wireweave.org`.

## Subcommands

The first token after `/wireweave` selects a subcommand; the rest is passed verbatim to the cli.

| Slash form                       | cli delegation                                       | Dispatch |
| -------------------------------- | ---------------------------------------------------- | -------- |
| `/wireweave login`               | `npx -y @wireweave/cli login`                        | auth     |
| `/wireweave whoami`              | `npx -y @wireweave/cli whoami`                       | auth     |
| `/wireweave logout`              | `npx -y @wireweave/cli logout`                       | auth     |
| `/wireweave parse <file>`        | `npx -y @wireweave/cli parse <file>`                 | local    |
| `/wireweave validate <file>`     | `npx -y @wireweave/cli validate <file> [--strict]`   | local    |
| `/wireweave render <file>`       | `npx -y @wireweave/cli render <file> [-o] [--theme]` | local    |
| `/wireweave list`                | `npx -y @wireweave/cli list-components`              | local    |
| `/wireweave analyze <file>`      | `npx -y @wireweave/cli analyze <file>`               | local    |
| `/wireweave diff <old> <new>`    | `npx -y @wireweave/cli diff <old> <new>`             | local    |
| `/wireweave validate-ux <file>`  | `npx -y @wireweave/cli validate-ux <file>`           | local    |
| `/wireweave export-json <file>`  | `npx -y @wireweave/cli export-json <file> [-o]`      | local    |
| `/wireweave export-figma <file>` | `npx -y @wireweave/cli export-figma <file> [-o]`     | local    |

Local subcommands (`parse` / `validate` / `render` / `list` / `analyze` / `diff` / `validate-ux` / `export-*`) do not require an API key. Only `login` contacts `api.wireweave.org` to verify the key.

For the full option surface of each subcommand, see the [CLI guide](/guide/cli).

## Authentication

The plugin holds no auth state. The cli stores the API key at `~/.wireweave/config.json`:

```text
/wireweave login            # prompt for an API key on the cli host
/wireweave whoami           # show the configured account
/wireweave logout           # remove the stored key
```

Issue API keys from [Wireweave dashboard → Keys](https://wireweave.org/dashboard/keys).

## Pinning a cli version

The plugin always uses the latest `@wireweave/cli` from the npm `latest` dist-tag — it does not pin a version. To pin a specific cli release for debugging or rollback, call the cli directly:

```bash
npx -y @wireweave/cli@<version> <subcommand>
```

cli breaking changes are documented in [`@wireweave/cli` CHANGELOG](https://github.com/wireweave/cli/blob/main/CHANGELOG.md).

## Troubleshooting

### `npx` cannot find `@wireweave/cli`

Verify the cli is published:

```bash
npm view @wireweave/cli version
```

If the package is not yet on npm, the slash command fails — the plugin has no fallback path. Until the cli is published, run it from a local checkout:

```bash
cd /path/to/wireweave/cli && pnpm build && pnpm link --global
wireweave <subcommand>
```

### Offline or registry unreachable

`npx -y @wireweave/cli` requires npm registry access on its first invocation on a given machine. Once cached, subsequent calls work offline. If the registry is unreachable and the cli is not cached, the slash command fails with an `npx` resolution error.

### `/wireweave login` fails

`login` contacts `api.wireweave.org` to verify the key. Confirm:

1. Network access to `api.wireweave.org`
2. The key was copied correctly from [the dashboard](https://wireweave.org/dashboard/keys)
3. The key is not revoked or expired

The API key is stored at `~/.wireweave/config.json` by the cli (mode `0600`).

## Comparison with other integrations

| Integration                                  | Surface                                | Best for                                                    |
| -------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Claude Code Plugin                           | `/wireweave` slash command (this page) | Driving the toolchain from a Claude Code session            |
| [CLI](/guide/cli)                            | `wireweave` shell binary               | Scripts, CI, terminal workflows                             |
| [MCP Server](/guide/mcp-server)              | MCP tools (`wireweave_*`)              | Any MCP-compatible client (Claude Desktop, Cursor, VS Code) |
| [VS Code Extension](/guide/vscode-extension) | Editor commands + live preview         | In-editor authoring with AI assistance                      |

All four share the same underlying tool catalog, mirrored through `@wireweave/sdk`.

## Next steps

- [CLI](/guide/cli) — full command-line reference (option surface, exit codes, CI use)
- [MCP Server](/guide/mcp-server) — same tools over the Model Context Protocol
- [VS Code Extension](/guide/vscode-extension) — IDE integration with live preview
