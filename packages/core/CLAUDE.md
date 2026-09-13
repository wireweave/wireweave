# @wireweave/core authoring contract

The permanent language contract is `docs/spec/LANGUAGE.md` in this repository (`contract:core/language`). Runtime/output is `docs/spec/RUNTIME.md`; public tools and release checks are `docs/spec/TOOLING.md`. Grammar, canonical JSON schema and contract examples live beside them. These documents jointly define the target behavior; source generators and implementation conform to them.

Core owns deterministic parsing, printing, linking, typed semantics, reusable modules/components/layouts, state/operation runtime, neutral rendering, bounded canvas layout and source maps. It accepts caller-supplied bytes and produces values. It does not own interviews, providers, generation plans, product scenario coverage, credentials, filesystem/network I/O, project storage or host canvas chrome.

Use one linked semantic model for runtime, transition extraction and all output projections. Never add title-based navigation, first-wins identity resolution, silent resize, unknown-action success or an inline user-code escape hatch. Ordinary comments cannot hold required product facts; the typed requirement registry and references must survive printing and export.

Grammar/type changes include parser generation, schema, canonical printer, runtime/renderer, catalogs, downstream tool descriptions and conformance fixtures. Generated parser/catalog/icon artifacts are never edited manually. The generator implementation cannot replace the permanent language specification. Public package exports and packed declarations must match the tool contract and remain import-side-effect-free.

Run the applicable checks described in `docs/spec/TOOLING.md#7-build-compatibility-and-evidence`. Source typecheck and lint are `pnpm --filter @wireweave/core typecheck` and `pnpm --filter @wireweave/core lint`; generated grammar precedes implementation tests (`pnpm --filter @wireweave/core test`). Contract-schema validation, source parser tests and browser execution are distinct evidence scopes. Do not claim one proves the others.

Production and verification are independent roles. Report file/criterion/command evidence and unresolved errors. Do not commit, push or change project governance without the task owner's authorization. Other agents can be working in this repository; preserve their edits and stay within assigned ownership.
