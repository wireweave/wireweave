# Wireweave

Wireweave is a concise language for UI wireframes and observable behavior. The public Core parses, validates, links and renders reusable screens, state and interactions. It produces neutral HTML/SVG and machine-readable source and requirement mappings.

The language 4.0.0 contract starts at [LANGUAGE](docs/spec/LANGUAGE.md), with [RUNTIME](docs/spec/RUNTIME.md) and [TOOLING](docs/spec/TOOLING.md). [Grammar](docs/spec/language.ebnf), [JSON Schema](docs/spec/schema.json) and [examples](docs/spec/examples.json) are canonical release inputs. Installed package conformance is tied to the toolchain manifest, not inferred from a documentation version.

Core and deterministic tools run locally without an account or API key. The private agent harness owns scenario planning, context assembly, generation and repair policy. An external product-definition system is a separate integration; Wireweave is its dogfood binding. Hosted collaboration, account and billing contracts belong to their service/product owners.

## Packages

| Package                                       | Responsibility                                                      |
| --------------------------------------------- | ------------------------------------------------------------------- |
| [core](packages/core)                         | Deterministic language, linking, runtime, rendering and source maps |
| [language-data](packages/language-data)       | Versioned component and attribute catalogs for language consumers   |
| [ux-rules](packages/ux-rules)                 | Independent observable UX checks, exclusions and findings           |
| [agent-prompts](packages/agent-prompts)       | Public language context derived from the canonical catalog          |
| [markdown-plugin](packages/markdown-plugin)   | Static and isolated app fence rendering through Core                |
| [sdk](packages/sdk)                           | Explicit local/remote dispatch and host I/O admission               |
| [cli](packages/cli)                           | Terminal adapter using shared tool contracts                        |
| [mcp-server](packages/mcp-server)             | MCP adapter with local deterministic defaults                       |
| [vscode-extension](packages/vscode-extension) | Language service, preview, export and authorized candidate edits    |
| [docs](docs)                                  | Canonical public documentation and local search                     |

## Workspace commands

Use Node >=22.13.0 and pnpm >=11.0.0, with the repository's pinned `packageManager` and lockfile. Internal dependencies use `workspace:*`.

| Command                                 | Purpose                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm install`                          | Install locked workspace dependencies                                                   |
| `pnpm build`                            | Build packages in dependency order; grammar/catalog generation precedes their consumers |
| `pnpm typecheck`                        | Check all workspace TypeScript/Vue types                                                |
| `pnpm lint`                             | Check repository and package ESLint rules                                               |
| `pnpm format:check` / `pnpm format`     | Check / apply repository Prettier formatting                                            |
| `pnpm test`                             | Run package tests and registered generated-source checks                                |
| `pnpm dist:check`                       | Verify source/dist content fingerprints                                                 |
| `pnpm tarball:check`                    | Pack and check actual published entry containment, resolvability and content            |
| `pnpm sideeffects:check`                | Observe every entry that declares import-side-effect freedom                            |
| `pnpm --filter @wireweave/core build`   | Build Core and its generated artifacts                                                  |
| `pnpm --filter @wireweave/docs dev`     | Run the documentation site on port 3304                                                 |
| `pnpm --filter @wireweave/docs build`   | Check syntax dependencies and build the public site                                     |
| `pnpm --filter @wireweave/docs preview` | Inspect the built site                                                                  |

The complete check scope and evidence requirements are in [TOOLING §7](docs/spec/TOOLING.md#7-build-compatibility-and-evidence). Schema validation, parser conformance and browser execution are separate proofs.

## Publication

Changesets versions public npm packages independently. `develop` publishes beta versions; `main` publishes stable versions. Publication uses pnpm and npm OIDC trusted publishing with provenance. Docs deployment and VS Code/Open VSX publication use their separate pipelines and remain excluded from npm Changesets publication.

`pnpm changeset` records release intent; `pnpm version-packages` updates package versions and changelogs. Packed manifests must resolve their actual dist files. Workspace source resolution does not establish published-package validity. Source/dist fingerprints, tarball checks and independent import observations are mandatory publication evidence.

Contributions use Conventional Commits and repository checks. Commit, push and publication require the task owner's explicit authorization. [License: MIT](package.json). [Public repository](https://github.com/wireweave/wireweave) · [Documentation](https://docs.wireweave.org).
