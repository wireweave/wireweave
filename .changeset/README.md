# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) in **independent mode** — each publishable `@wireweave/*` package carries its own version line and is released on its own cadence. The configuration lives in `.changeset/config.json`.

## Why independent mode

The public packages (`core`, `language-data`, `markdown-plugin`, …) do not share a tightly coupled wire protocol; a change to one rarely forces a lockstep bump of the others. Independent versioning lets each package advance only when its own source changes, keeping CHANGELOGs and SemVer history meaningful per package.

## Workflow

1. Make your code change.
2. Run `pnpm changeset` and describe the change. Select only the packages it affects and the severity for each.
3. Commit the generated `.changeset/<name>.md` along with your code change.
4. On merge to `main`, CI runs `pnpm changeset version` (consumes the changeset, bumps affected packages, writes CHANGELOGs), commits the version bump with `[skip ci]`, then runs `pnpm changeset publish`.
5. On `develop`, CI publishes snapshot prereleases tagged `beta`.

## Notes

- `@wireweave/docs` (VitePress site, deployed to Vercel) and `wireweave-vscode` (published via vsce/ovsx) are listed in `ignore` — they are not changesets npm publish targets.
