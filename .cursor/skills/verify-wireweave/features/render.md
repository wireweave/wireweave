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

## Modal lifecycle

For exported site changes, activate the authored modal with keyboard input at a normal and narrow host viewport. Focus must enter the dialog, wrap for Tab and Shift+Tab, and return to the exact enabled visible opener after authored close and Escape. Check nested modal return, removed/hidden/disabled invokers, route switches and non-modal overlays separately. The board remains at its authored dimensions; keyboard reachability does not prove compact visual quality or native desktop acceptance.
