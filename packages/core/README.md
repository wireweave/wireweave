# @wireweave/core

Wireweave is a concise UI wireframe language with deterministic parsing, reusable modules, canonical printing and neutral HTML/SVG rendering. Core compiles authored screens, state and interactions; people and programs can use it without an agent harness, account or hosted service.

## Contract

The language contract is [LANGUAGE](../../docs/spec/LANGUAGE.md), with formal syntax in [language.ebnf](../../docs/spec/language.ebnf), canonical data in [schema.json](../../docs/spec/schema.json), and positive/negative [examples](../../docs/spec/examples.json). [RUNTIME](../../docs/spec/RUNTIME.md) defines fixed viewports, native controls, route/history, fixture simulation, structured implementation obligations and standalone HTML. [TOOLING](../../docs/spec/TOOLING.md) defines library APIs, CLI/MCP/editor/markdown adapters and release validation.

The language and schema versions are explicit artifact inputs. Product claims are tied to the installed release's conformance manifest. A schema-valid example and a running browser artifact are different evidence.

## Author a screen

```wireframe
page "Contact" id=contact viewport="1440x900" {
  main {
    title "Contact" level=1
    text "Choose how to contact the team."
    link "Email" href="mailto:team@example.com"
  }
}
```

A multi-screen app declares an entry and modules. Internal links use screen IDs, state has app/shell/screen/component scope, shared structure uses layout/component/slot, and externally implemented effects remain typed obligations. Core preserves the same meaning across canvas, executable HTML and machine-readable handoff.

## Install and validate

Install the Core version pinned by the consuming project's toolchain profile with `npm install @wireweave/core@<version>`. ESM/CJS and typed subpaths are described in the tool contract. Core itself performs no account, filesystem or network operations.

Library code is checked with typecheck, lint, generated parser/catalog checks, unit tests and browser conformance. Contract data is checked against Draft 2020-12 JSON Schema and semantic fixtures. The public tool surface includes parse/print, link/compile, fragment/canvas/SVG, validation, transition extraction, analysis, diff, export and traversal; their inputs, failures and execution scope have one definition in TOOLING.

MIT license. Part of the Wireweave public monorepo.
