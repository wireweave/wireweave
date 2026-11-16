# Parse and validate a design

## Sub-features

- Parse a valid `.wf` file to a page AST.
- Reject malformed DSL with nonzero exit status and a parse diagnostic.
- Strictly validate a supported design.

## How to get to it (user POV)

Run `wireweave parse design.wf` or `wireweave validate design.wf --strict` in a terminal. In this checkout, use `node packages/cli/dist/index.js` in place of the installed `wireweave` executable.

## Driving it with verify-local-tools

Run `node scripts/verify-local-tools.mjs doctor`, then `node scripts/verify-local-tools.mjs drive parse`. The helper writes `page "Harness proof" { text "Saved proof" button "Continue" }` to a fresh `.wf` file. The real CLI must return one page with that title and text, reject `page { ??? }` with status 1, and report one page for strict validation. Inspect `parsed.json` and `commands.json` in the printed proof directory.

## Gotchas

Missing built dependencies or stale dist fails doctor. The rejected input is an expected failure inside a successful journey, not an ignored product failure. This fixture does not prove diagnostics for every grammar production or unknown attribute; run the affected parser and validation regression suites for those changes.
