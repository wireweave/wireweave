# Wireweave development harness

Read [CLAUDE.md](CLAUDE.md) for owner boundaries, [README.md](README.md) for the toolchain and commands, then [LANGUAGE](docs/spec/LANGUAGE.md), [RUNTIME](docs/spec/RUNTIME.md) or [TOOLING](docs/spec/TOOLING.md) for the affected contract and its tests. This file governs the agent workflow; it does not replace language specifications or grant future publication authority.

## Ownership and autonomy

This public repository owns deterministic DSL parsing, rendering, analysis and local SDK/CLI/MCP surfaces. Product planning belongs to the Wireweave binding in agent-harness; Studio owns user experience, persistence, current permissions and actual host I/O. Fix a language defect here rather than reproducing a compiler inside either consumer. Studio must consume a published registry version through its own dependency contract; a source symlink is not release evidence.

The approved v2 integration base is `release/v2.0.0`, seeded from the latest Core develop line; target this release branch for v2 PRs. The publication policy in `scripts/release-registry.mjs` remains separate: develop carries Core 4 beta while main carries Core 3 stable. PR verification runs on the release branch without adding it to npm publication triggers. Never promote a major or bypass beta registry verification merely to align sibling checkouts. The `@wireweave/core/app` AppBundle API and legacy fragment/CLI facades are separate verification surfaces.

Core language and runtime semantics are platform-independent. Studio's desktop acceptance covers Windows, macOS and Linux; passing Core or browser checks on one operating system does not establish native packaging, file authority, keychain, sidecar or updater behavior on the other systems. Record the actual OS/browser/toolchain and require the consuming product's per-platform evidence before declaring cross-platform readiness.

Use the existing isolated checkout. Do not create a worktree unless requested. Preserve user changes. Keep repository-specific facts in their owner document and link them from other agent entry points. Load only the contracts relevant to the current slice.

Within the user's accepted scope, continue reversible investigation, implementation and verification without asking for each step. Product direction, credentials and unavailable external capabilities remain real prerequisites. Honor an explicit request to approve a development direction before starting product implementation. Commit, push, PR, merge and publication authority comes from the active task; never infer a permanent grant from this file. A request to merge does not authorize overriding branch protection or publishing packages by another route.

## Development loop

1. State the user-visible defect or requested behavior, the owning package, a concrete input and the expected observable result. Reproduce a defect before changing it. Distinguish a missing environment prerequisite from a product defect.
2. Prefer removing the invalid state or dependency path in the codebase. If that is unsuitable, encode the recurring mistake in compiler, lint or CI checks. Add prose only for decisions that need judgment. Do not impose a blanket ban on existing comments or expand an unrelated cleanup.
3. Implement one small unit at the owner boundary. Use public package exports and maintain the free, local, credential-free tool boundary. Keep generated parser/icon sources reproducible through their owner scripts.
4. Drive the real interface using [verify-wireweave](.cursor/skills/verify-wireweave/SKILL.md). Assert observable values and file effects, with a rejected input as well as a successful input. Do not equate snapshots, prompt wording, zero tests or a running process with functional proof.
5. Run the relevant package regression tests, then the repository checks required by [the release verifier](scripts/verify-release.mjs). Use `pnpm release:verify --report .local/release-evidence/verification.json` for the full PR/release contract; do not replace it with a second hand-maintained list or weaken it to fit the patch. Run configured hooks normally. Record failed, skipped, blocked and unrun checks separately.
6. Review the actual diff and current commit identity. When PR/merge is authorized, create a focused PR with source identity and evidence, address findings, and wait for required checks on its exact head. Any later patch invalidates affected evidence. Never use admin bypass, force-push or stale green checks to manufacture a merge.
7. After a correction, update the structural guard or verification feature map at its owner. Retain a concise handoff containing source identity, accepted scope, evidence paths, unresolved blockers and the next executable step. Do not store secrets or personal configuration in tracked files.

## Verification and sources

The project-local skill supplies a portable CLI and feature map; it is usable from agents that do not auto-discover Cursor skills by reading its `SKILL.md` directly. Keep temporary state and proof under ignored `.local/`. Helpers must retain evidence after cleanup and stop only processes they created.

These rules adapt the five-layer ordering in [Lauren Tan's workflow summary](https://seungwoo321.github.io/blog/2026/11/04/agent-trust-environment-lauren-tan/) ([source at 5ce4879](https://github.com/Seungwoo321/seungwoo321.github.io/blob/5ce487977912387e620d9d2e87589bdfb91c8239/_posts/2026-11-04-agent-trust-environment-lauren-tan.md)) and [pstack](https://github.com/cursor/plugins/tree/bf0c7cd80abdbf7fe47b634978a7d1b4071f71a7/pstack), specifically `create-verification-skill`, `principle-encode-lessons-in-structure` and `principle-test-behavior-not-implementation`. They do not install or require a model-specific plugin, account, Bugbot subscription or global agent configuration.
