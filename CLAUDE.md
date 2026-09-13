# Wireweave public monorepo contract

This repository owns the public language engine, deterministic tools and client adapters. The permanent language/model contract is `docs/spec/LANGUAGE.md`; execution/output is `docs/spec/RUNTIME.md`; public APIs, adapters and release evidence are `docs/spec/TOOLING.md`. Grammar/schema/examples beside them are canonical release inputs. Package inventory and workspace/publication commands live in README.md.

Core accepts explicit immutable inputs and produces deterministic values. It owns no filesystem/network I/O, provider call, credentials, project persistence, interview, generation plan or UX decision. Public adapters supply authorized host seams and consume Core. The private `agent-harness` repository owns reusable orchestration; its Wireweave binding owns generation/context/repair policies. Product contracts live in `wireweave-ssot`; an external product-definition system is a separate integration and Wireweave is a dogfood binding.

Use a single linked semantic model for output, runtime, transitions and source mappings. Preserve explicit identity, typed operations, structured obligations and native accessible behavior. Never infer targets from labels, route by canvas index, silently resize a viewport, treat fixture success as backend success or accept unknown actions as no-ops. Account/pricing policy has one product owner and is not duplicated into package guides.

Workspace dependencies use `workspace:*`. TypeScript is strict, including unchecked indexed access and exact optional properties. ESLint and Prettier configuration are inherited through the workspace; generated parser/catalog/icon files are produced by generators and never hand edited. Grammar generation and source/dist freshness precede consumers that resolve dist, including syntax generators.

Workspace source resolution and published dist are separate contracts. Packed manifests must contain substantive resolvable entries, and release checks independently derive expected artifacts from public resolution fields. Do not define the expected tarball contents from the packer's `files` allowance itself. Each entry declaring sideEffects=false is imported in an isolated process with observed globals/prototypes/environment/output and enforced I/O permissions. No successful empty coverage or stale fingerprint establishes a release.

Use the README command table and TOOLING §7 for verification. Contract-only evidence must not be reported as parser/runtime implementation evidence. Independent production and verification roles record exact inputs, commands, digests and results. All affected consumers and public documentation links are included in the check scope.

The public docs expose one canonical snapshot with browser-local search and no visitor analytics. Editor/CLI/MCP deterministic commands are local and require no account. Remote execution is explicit and authorized; a local failure never transmits source as fallback.

Keep permanent facts in repository artifacts and work progress in the task owner's work system. Do not add temporal status to these rules. Preserve other agents' edits and assigned file ownership. Do not commit, push, publish, reset repository state or change governance without explicit authorization. Package contracts refine this boundary and cannot create a competing language specification.
