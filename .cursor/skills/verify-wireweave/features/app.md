# Compile and execute a Core 4 app

## Sub-features

- Parse canonical language 4.0.0 and admit an explicit AppBundle.
- Round-trip an explicit V4 module through the public `printV4Module` export.
- Link and compile deterministic standalone HTML with a matching digest.
- Reduce authored navigation events through the public runtime API.

## How to get to it (user POV)

Library consumers use `parse` from `@wireweave/core`, then `createAppBundle`, `linkApp`, `compileApp`, `createRuntime` and `reduceEvent` from `@wireweave/core/app`. The source fixture is `minimal-navigation` in `docs/spec/examples.json`.

## Driving it with verify-local-tools

Run `node scripts/verify-local-tools.mjs drive app` after building this develop checkout. The helper resolves the public package exports from the SDK consumer, parses the canonical fixture with language version 4.0.0, admits its explicit module bytes, links and compiles it twice. It verifies identical HTML and the artifact's SHA-256 digest. The public runtime starts at Home, accepts clicks on the authored `settingsLink` and `homeLink` identities, and produces Settings then Home without mutating the prior snapshot. Retain `app.wf`, `app.html`, and `app.json` with the manifest, actions and observed routes.

## Gotchas

This journey proves deterministic public library behavior, not DOM event binding, rendered geometry or browser accessibility. Use real browser controls for those scopes. The legacy fragment/CLI facade does not certify AppBundle support. The approved v2 PR base is `release/v2.0.0`; npm publication remains on develop/beta under the existing release policy. Do not change main/stable or substitute a private consumer's source checkout for a published beta artifact.

## Installed source-resource catalog

The public `/spec` exports `languageSourceResources` and
`resolveLanguageSourceResource(uri)`. After a fresh Core build and pack, import
both ESM and CJS from the installed tarball, encode each resource's text as UTF-8,
and compare byte length and SHA-256 with its manifest and canonical source.
Unknown URLs, paths and URI fragments must return null without network access.
The resources are frozen. These source assets do not establish the still-missing
external product schema closure, complete language profile or browser capability.
