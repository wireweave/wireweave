# @wireweave/cli

The terminal frontend for the Wireweave wireframe DSL — parse, validate, render, analyze, diff, and export `.wf` files from your shell.

## What it does

The CLI is a thin frontend over [`@wireweave/sdk`](https://github.com/wireweave/sdk). Every command runs through the SDK's single `dispatch()` entry point, which routes the call to the right place:

- **Local commands** (`parse`, `validate`, `render`, `analyze`, `diff`, `validate-ux`, `export-json`, `export-figma`, `list-components`) run fully in-process. No network, no API key.
- **Auth commands** (`login`, `logout`, `whoami`) talk to the Wireweave API to verify and persist a key for tools that need one.

The persistent token lives at `~/.wireweave/config.json` (`0600`) with shape `{ "token": string, "apiUrl"?: string }`.

## Install

```bash
npm install -g @wireweave/cli
```

Or run without installing:

```bash
npx @wireweave/cli parse design.wf
```

Requires Node.js 18+.

## Usage

```bash
# Local — no network, no key required
wireweave parse design.wf
wireweave validate design.wf --strict
wireweave render design.wf --theme dark -o design.html
wireweave analyze design.wf --format summary
wireweave diff old.wf new.wf --ignore-order
wireweave validate-ux design.wf --min-severity warning
wireweave export-json design.wf -o design.json
wireweave export-figma design.wf -o design.figma.json
wireweave list-components --category form

# Auth
wireweave login --api-key <key>   # or pipe via stdin / WIREWEAVE_API_KEY
wireweave whoami
wireweave logout
```

## Commands

| Command               | Network | Description                                                                                                 |
| --------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `parse <file>`        | local   | Parse a `.wf`/`.wireframe` file and print its AST as JSON.                                                  |
| `validate <file>`     | local   | Validate syntax. `--strict` also rejects unknown attributes.                                                |
| `render <file>`       | local   | Render to HTML. `--theme light\|dark`, `--full-document`, `-o <path>`.                                      |
| `analyze <file>`      | local   | Statistics, accessibility, and complexity. `--format json\|summary`, `--no-*` toggles.                      |
| `diff <old> <new>`    | local   | Compare two wireframes. `--ignore-attributes`, `--ignore-order`, `--format`.                                |
| `validate-ux <file>`  | local   | Check against UX best-practice rules. `--categories`, `--min-severity`, `--max-issues`, `--disabled-rules`. |
| `export-json <file>`  | local   | Export as JSON. `--include-locations`, `--no-pretty-print`, `--include-empty-attributes`.                   |
| `export-figma <file>` | local   | Export to Figma-compatible JSON.                                                                            |
| `list-components`     | local   | List DSL components. `--category`, `--format table\|json`.                                                  |
| `login`               | network | Verify an API key and store it. `--api-key`, `--api-url`.                                                   |
| `whoami`              | network | Verify the stored key and show the configured account.                                                      |
| `logout`              | local   | Remove the stored API key from disk.                                                                        |

## Environment

| Variable            | Default                     | Purpose                                |
| ------------------- | --------------------------- | -------------------------------------- |
| `WIREWEAVE_API_URL` | `https://api.wireweave.org` | Override the API base.                 |
| `WIREWEAVE_API_KEY` | —                           | Per-shell override of the saved token. |

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
