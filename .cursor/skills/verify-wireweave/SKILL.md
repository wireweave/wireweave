---
name: verify-wireweave
description: Verify Wireweave's public Core 4 AppBundle/runtime API and local CLI parse/render/export through real built artifacts; use after language, SDK dispatch or CLI changes.
---

# Verify Wireweave

The primary surface here is a local library and CLI. Studio's UI, agent generation and hosted APIs belong to their own repositories. Read the [feature map](features/README.md) and choose the affected user journeys. Other agents can read and execute this skill directly; Cursor is not required.

## Launch

From the repository root, activate the Node and pnpm versions in `package.json` and install with `pnpm install --frozen-lockfile`. Run `pnpm build` to build the actual CLI and its local workspace dependencies. There is no server or port for these short-lived commands. A fresh checkout without built artifacts is not ready to drive.

The helper uses the current Node executable and resolves the repository relative to its own location. No credential, provider or external service is required for the mapped local tools. It does not execute login, logout, publish, vendor sync or remote commands.

## Doctor

Run this read-only check before driving and whenever results look stale:

```sh
node scripts/verify-local-tools.mjs doctor
```

It checks Node compatibility, the built CLI, the existing content-based dist freshness gate and the real CLI's version response. Missing or stale builds fail; rebuild them rather than bypassing the gate. This is evidence about this source checkout's local artifacts, not an npm tarball or hosted API.

## Drive

```sh
node scripts/verify-local-tools.mjs drive parse
node scripts/verify-local-tools.mjs drive render
node scripts/verify-local-tools.mjs drive export
node scripts/verify-local-tools.mjs drive app
node scripts/verify-local-tools.mjs drive all
```

Each invocation creates its own input and scratch directory and returns nonzero for a wrong exit status, wrong content, missing file or timeout. The CLI journeys run `packages/cli/dist/index.js` in real Node subprocesses. Parse includes valid DSL, rejected malformed DSL and strict validation. Render and export reopen the files written by the actual CLI. The separate `app` journey resolves the public Core 4 library exports from the SDK consumer, admits and compiles the canonical navigation fixture, checks deterministic HTML/digest and executes authored runtime transitions Home → Settings → Home. Parallel invocations have separate scratch and evidence directories and do not share a server or user project.

## Evidence

The helper prints its unique `.local/verification/cli-*` directory. Keep `result.json`, `commands.json`, `input.wf` and the requested `parsed.json`, `proof.html`, `export.json` or `app.wf`/`app.html`/`app.json`. Results include the Git HEAD, runtime, CLI version, selected journey, checked outcomes and cleanup result. HEAD alone does not identify an uncommitted diff: attach `git diff` and relevant untracked patch files when reviewing work before commit, and rerun against the final PR head.

Capture commands and resulting state together. Reopen generated files to verify side effects. HTML content checks prove that the renderer emitted authored elements; they do not prove navigation, layout, keyboard behavior or accessibility. A change affecting those needs a real browser journey with actions, console/network evidence and screenshots through the relevant consumer. Do not replace a failing user path with an internal setter or a mocked implementation.

The existing `pnpm release:verify --report .local/release-evidence/verification.json` runs this smoke after the build and dist freshness check. It also owns the full PR/release verification including existing test suites, installed MCP and packaging; the smoke alone does not replace those checks. A local pass does not establish registry availability, remote authentication or compatibility with a different Core release line.

## Cleanup

Every drive removes only its own `scratch-*` directory in `finally`, including failed attempts. No long-running process remains. The sibling proof files survive. Confirm `scratchRemoved: true` and inspect `result.json` after the process exits. Never delete a shared `.local/` tree or kill processes by name for this check. The helper does not remove evidence; prune a specific proof directory only after its result has been consumed.

## Helpers

`scripts/verify-local-tools.mjs` is executable, and all its supported invocations are shown above. It uses only Node built-ins and the repository's existing built CLI. Maintain the feature map alongside user-facing behavior; pstack's `/maintain-verification-skill` is an optional maintenance aid, not a runtime dependency.
