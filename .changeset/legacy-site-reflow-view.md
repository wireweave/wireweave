---
'@wireweave/core': patch
---

Add optional caller-localized Fixed/Reflow presentation controls to legacy renderSite, preserving one DOM and runtime, unsaved form values, modal focus and authored fixed dimensions. Existing callers remain unchanged unless they opt in; region-specific two-dimensional layouts still require separate verification.
