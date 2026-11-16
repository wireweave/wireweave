# Export a design to JSON

## Sub-features

- Export local DSL through the public JSON export command.
- Save structured content to a user-selected file.

## How to get to it (user POV)

Run `wireweave export-json design.wf -o design.json`, then consume the generated JSON. Figma export and option-specific representations are additional journeys when affected.

## Driving it with verify-local-tools

Run `node scripts/verify-local-tools.mjs drive export`. The helper exports the seeded design through the real CLI and reads `export.json` back from disk. The result must report success, contain one page titled `Harness proof`, and preserve the `Continue` button's type and content. Inspect `commands.json` for the command and exit status and `export.json` for the side effect.

## Gotchas

A success log alone does not prove the file was written correctly. Do not derive expected values by calling the same exporter a second time. Export timestamps vary; assert semantic content instead. This check does not prove that Figma or another external consumer accepts the file.
