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

For exported site changes, activate the authored modal with keyboard input at a normal and narrow host viewport. Inspect the actual dialog role and computed accessible name: a nonblank authored title names the dialog without generated title IDs. Focus must enter the dialog, wrap for Tab and Shift+Tab, and return to the exact enabled visible opener after authored close and Escape. Check nested modal return, removed/hidden/disabled invokers, route switches and non-modal overlays separately. The board remains at its authored dimensions; keyboard reachability does not prove compact visual quality or native desktop acceptance.

## Opt-in legacy site reflow

`renderSite(document, {viewControls: {label, fixed, reflow}})` adds localized presentation buttons and starts Fixed. Existing callers omit the option and get no controls. Reflow restacks ordinary row/column/landmark/card content and uses scalable form/text typography on the same DOM; it does not rewrite authored viewport metadata or create another runtime. Tables, drawings and explicitly positioned regions need their own two-dimensional overflow verification; this option alone is not a whole-document WCAG claim.

At 320 CSS px with 200% root text sizing, verify readable flow content and reachable form/review actions without horizontal page overflow. Preserve the exact unsaved value, selection and node identity across the switch; check keyboard review → dialog → Escape → opener focus and inert presentation controls while the dialog is open. Switch back and compare the exact original fixed frame dimensions and inline styles. Check default omission, custom prefix/localized escaping, routes and state separately. Studio's ordinary Demo must opt in only after adopting the verified official Core artifact; CLI/Handoff callers remain unchanged.
