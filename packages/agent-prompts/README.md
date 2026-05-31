# @wireweave/agent-prompts

Canonical grammar-guide prompts that teach an LLM to generate Wireweave DSL.

## What it does

Exports the Wireweave DSL grammar guide as ready-to-inject prompt strings. Each function returns a single Markdown-flavoured string that you drop verbatim into an LLM system message so the model emits valid `.wf` wireframes — including the multi-page canvas model (multiple top-level `page` declarations, `at(x, y)` positioning, `viewport="WxH"`).

It is the single source of truth for the grammar guide; downstream consumers (`agent-harness`, `api-server`, future plugins) import it so they stay in sync with `@wireweave/core`. The package has no runtime dependencies.

## Install

```bash
pnpm add @wireweave/agent-prompts
```

## Usage

```ts
import { buildGrammarPrompt, buildCompactGrammarPrompt } from '@wireweave/agent-prompts'

// Full guide (~180 lines) — generation phase.
const system = buildGrammarPrompt()

// Compact guide (~60 lines) — analyze / plan phases, fewer tokens.
const compact = buildCompactGrammarPrompt()
```

## API

### `buildGrammarPrompt(): string`

The full grammar guide for the generation phase. Covers syntax structure, the multi-page canvas model, the renderer surface (`render` / `renderCanvas` / `renderPage`), the layout / content / form / nav / data / feedback / overlay / utility component contracts, and how to map common UI concepts to DSL components.

### `buildCompactGrammarPrompt(): string`

A condensed grammar guide for the analyze / plan phases, where the full guide is more than needed.

Part of the [Wireweave monorepo](https://github.com/wireweave/wireweave).

## License

MIT
