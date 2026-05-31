# CLI

The Wireweave CLI (`@wireweave/cli`) is the command-line companion to the Wireweave DSL. It runs the parser, renderer, UX rules, exporters, and analyzers locally — no network round-trip — and signs you in to the Wireweave API for the few commands that need it (auth state, in upcoming releases agent / cloud calls).

> **v0.1.0 — beta.** Published under the `beta` dist-tag. Command shape may still change before `1.0.0`.

## Install

```bash
npm install -g @wireweave/cli@beta
```

Requires Node.js 18+. The binary is `wireweave`.

Verify the install:

```bash
wireweave --version
wireweave --help
```

## Authentication

`login` validates an API key against the Wireweave API and saves it to `~/.wireweave/config.json` for future sessions.

```bash
# Interactive — prompts for the API key on stdin
wireweave login

# Non-interactive — pass the key via flag or env
wireweave login --api-key <KEY>
WIREWEAVE_API_KEY=<KEY> wireweave login

# Point at a self-hosted API
wireweave login --api-url https://api.example.com
```

Inspect or revoke the stored credential:

```bash
wireweave whoami   # shows account email + masked key
wireweave logout   # removes ~/.wireweave/config.json
```

API keys are issued from the [Wireweave dashboard → Keys](https://wireweave.org/dashboard/keys) page.

## Local commands

These commands run entirely offline — they load `@wireweave/core` and `@wireweave/ux-rules` in-process and never call the API.

### `render` — DSL → HTML

```bash
wireweave render design.wf
wireweave render design.wf -o design.html
wireweave render design.wf --theme dark --full-document
```

| Option            | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `-o, --output`    | Write HTML to a file instead of stdout                         |
| `--theme <name>`  | `light` (default) or `dark`                                    |
| `--full-document` | Emit a complete `<!doctype html>` document (default: fragment) |

### `parse` — DSL → AST

```bash
wireweave parse design.wf > design.ast.json
```

Prints the parsed AST as JSON. Useful for piping into other tools.

### `validate` — syntax check

```bash
wireweave validate design.wf
wireweave validate design.wf --strict   # reject unknown attributes
```

Exits non-zero on syntax errors. Pair with CI to gate commits.

### `validate-ux` — best-practice rules

```bash
wireweave validate-ux design.wf
wireweave validate-ux design.wf --format summary
wireweave validate-ux design.wf --categories accessibility,usability --min-severity warning
wireweave validate-ux design.wf --disabled-rules form/label-association --max-issues 50
```

| Option                    | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `--categories <list>`     | Comma-separated rule categories (e.g. `accessibility,form`) |
| `--min-severity <level>`  | `error` \| `warning` \| `info`                              |
| `--max-issues <n>`        | Cap the issue list                                          |
| `--disabled-rules <list>` | Comma-separated rule IDs to skip                            |
| `--format <fmt>`          | `json` (default) or `summary`                               |

### `list-components` — DSL component catalog

```bash
wireweave list-components
wireweave list-components --category form
wireweave list-components --format json
```

Lists every component defined in `@wireweave/language-data` with its category and attribute summary.

### `analyze` — wireframe statistics

```bash
wireweave analyze design.wf
wireweave analyze design.wf --format summary
wireweave analyze design.wf --no-accessibility --no-complexity
```

Reports component breakdown, accessibility coverage, complexity, layout, and content statistics. Each axis can be disabled with `--no-<axis>`.

### `diff` — compare two wireframes

```bash
wireweave diff old.wf new.wf
wireweave diff old.wf new.wf --ignore-attributes
wireweave diff old.wf new.wf --ignore-order --format summary
```

Structural diff between two AST trees. Defaults to `json`; use `--format summary` for a human-readable view.

### `export-json` — AST as JSON

```bash
wireweave export-json design.wf -o design.json
wireweave export-json design.wf --include-locations
wireweave export-json design.wf --no-pretty-print
```

### `export-figma` — Figma-compatible JSON

```bash
wireweave export-figma design.wf -o design.figma.json
```

Emits a JSON payload that can be imported into Figma via the Wireweave plugin (export-only — round-tripping back is not supported).

## Environment variables

| Variable            | Default                     | Purpose                                           |
| ------------------- | --------------------------- | ------------------------------------------------- |
| `WIREWEAVE_API_URL` | `https://api.wireweave.org` | Override the API base (self-hosted, staging, CI). |
| `WIREWEAVE_API_KEY` | —                           | Per-shell override of the saved token.            |

Env values take precedence over `~/.wireweave/config.json` and over flags resolved later in the command pipeline.

## Configuration file

```
~/.wireweave/config.json
```

Shape:

```json
{
  "token": "wk_live_...",
  "apiUrl": "https://api.wireweave.org"
}
```

The token is written with `0600` permissions. To rotate, run `wireweave logout` then `wireweave login` again with the new key.

## Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | Success                                                     |
| `1`  | Generic failure (I/O, network, unexpected error)            |
| `2`  | Parser / validator rejected the input                       |
| `3`  | UX rules reported issues at or above the requested severity |

## Use in CI

```yaml
# .github/workflows/wireframe-check.yml
- run: npm install -g @wireweave/cli@beta
- run: wireweave validate src/wireframes/*.wf --strict
- run: wireweave validate-ux src/wireframes/*.wf --min-severity warning
```

Local-only commands (`render` / `parse` / `validate` / `validate-ux` / `list-components` / `analyze` / `diff` / `export-*`) do not require `WIREWEAVE_API_KEY`, so CI runs work without secrets.

## Next steps

- [Claude Code Plugin](/guide/claude-code-plugin) — slash command that delegates to the CLI
- [VS Code Extension](/guide/vscode-extension) — IDE integration with live preview
- [MCP Server](/guide/mcp-server) — same tools exposed over the Model Context Protocol
