# Render a design to HTML

## Sub-features

- Render supported DSL through the local SDK/CLI path.
- Save a complete HTML document with the authored text and button.

## How to get to it (user POV)

Run `wireweave render design.wf --full-document -o design.html`, then open the result. Theme flags, fragment output and interactive browser behavior are separate cases when a patch affects them.

## Driving it with verify-local-tools

Run `node scripts/verify-local-tools.mjs drive render`. It invokes the built CLI on the seeded valid design, reads `proof.html` back from disk, and requires a document doctype, `Saved proof` text and an actual button element with `Continue`. Inspect the command status, saved file and result in the printed evidence directory.

## Gotchas

An emitted HTML file is not a browser behavior proof. Navigation, events, layout, keyboard and accessibility changes require a real browser run through authored controls. A missing document or content fails this journey; do not replace its assertions with an output-size check.

For legacy `renderSite` modal changes, execute the emitted document in a browser:
activate an authored opener by keyboard, require focus inside its dialog, and
check Close and Escape return to that exact opener. Duplicate-label openers,
nested dialogs, navigation away, and removed/hidden/disabled openers are separate
cases. Keep the normal and compact viewport evidence with the authored input.
The focused regression is `packages/core/__tests__/renderer-site-modal-focus.test.ts`.
This legacy site runtime is separate from the Core 4 AppBundle browser adapter;
a pass here does not establish V4 parity or native Studio acceptance.
