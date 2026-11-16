# Local tool feature map

| Feature                                  | User entry                                          | Proof                                                                                 |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Parse and validate](parse.md)           | `wireweave parse` and `wireweave validate --strict` | Valid AST/content, invalid input rejected, strict success                             |
| [Render HTML](render.md)                 | `wireweave render --full-document -o`               | Reopened HTML file contains authored text and button                                  |
| [Export JSON](export.md)                 | `wireweave export-json -o`                          | Reopened JSON preserves page and child content                                        |
| [Compile and execute Core 4 app](app.md) | Public `@wireweave/core/app` exports                | Deterministic artifact/digest and authored Home → Settings → Home runtime transitions |

Run `node scripts/verify-local-tools.mjs drive all` for the seeded map. These journeys cover representative deterministic local tools and the canonical Core 4 AppBundle API, not every CLI command, browser interaction, SDK mode, extension or MCP transport. Extend the map when a change adds or changes a user entry point; run its relevant existing tests as well.
