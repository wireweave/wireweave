/** Localized, opt-in presentation controls for the legacy site document.
 * These change styles on the existing DOM, never the authored AST or runtime. */
export interface SiteViewControls {
  label: string
  fixed: string
  reflow: string
  /** Accessible fallback for overflowing tables without an authored caption/label. */
  tableScrollLabel?: string
}

export function siteViewStyles(prefix: string): string {
  const site = `.${prefix}-site[data-wf-view="reflow"]`
  const outsideDrawing = `:not(.${prefix}-relative, .${prefix}-relative *)`
  return `
.${prefix}-view-controls {
  display: flex; flex-wrap: wrap; gap: .5rem; padding: .5rem;
  font: 1rem/1.5 sans-serif;
}
.${prefix}-view-controls button { font: inherit; padding: .25rem .5rem; }
.${prefix}-view-controls button[aria-pressed="true"] { font-weight: bold; }
${site} { display: block; overflow: visible; }
${site} .${prefix}-page${outsideDrawing} {
  width: 100% !important; height: auto !important; min-height: 0 !important;
  max-width: 100%; font-size: 1rem; overflow: visible !important;
}
/* No reflow declaration descends into the legacy positioned drawing root.
   Only ordinary flow groups are restacked. Canvas/relative drawings and
   tables keep their two-dimensional structure. Flow tables get a separate
   local scroll container below; positioned drawings remain untouched. */
${site} :is(.${prefix}-row, .${prefix}-col, .${prefix}-stack, .${prefix}-header,
  .${prefix}-main, .${prefix}-footer, .${prefix}-section, .${prefix}-card, .${prefix}-slot)${outsideDrawing} {
  flex-direction: column !important; flex: 0 1 auto !important;
  width: auto !important; min-width: 0 !important; max-width: 100% !important;
  height: auto !important; min-height: 0 !important; overflow: visible !important;
}
${site} :is(.${prefix}-text, .${prefix}-title, .${prefix}-input-label,
  .${prefix}-button, .${prefix}-badge, .${prefix}-field)${outsideDrawing} {
  min-width: 0; max-width: 100%; white-space: normal !important; overflow-wrap: anywhere;
}
${site} :is(.${prefix}-text, .${prefix}-input-label, .${prefix}-input,
  .${prefix}-textarea, .${prefix}-select, .${prefix}-button, .${prefix}-badge)${outsideDrawing} {
  font-size: 1rem !important; line-height: 1.5;
}
${site} .${prefix}-title${outsideDrawing} { font-size: 1.25rem !important; }
${site} h1.${prefix}-title${outsideDrawing} { font-size: 2.25rem !important; }
${site} h2.${prefix}-title${outsideDrawing} { font-size: 1.875rem !important; }
${site} h3.${prefix}-title${outsideDrawing} { font-size: 1.5rem !important; }
${site} h5.${prefix}-title${outsideDrawing} { font-size: 1.125rem !important; }
${site} h6.${prefix}-title${outsideDrawing} { font-size: 1rem !important; }
${site} :is(.${prefix}-input, .${prefix}-textarea, .${prefix}-select)${outsideDrawing} {
  min-width: 0; max-width: 100%; height: auto !important;
}
/* Fixed keeps the original table formatting context. Only the opt-in local
   wrapper scrolls; table/row/cell display and semantics remain native. */
${site} .${prefix}-table-scroll${outsideDrawing} {
  display: block; width: 100%; max-width: 100%; min-width: 0; overflow-x: auto;
}
${site} table.${prefix}-table${outsideDrawing} { font-size: 1rem !important; }
${site} .${prefix}-modal-backdrop${outsideDrawing} { position: fixed; padding: .5rem; }
${site} .${prefix}-modal${outsideDrawing} {
  min-width: 0 !important; width: 100% !important; max-width: 100% !important;
  max-height: calc(100dvh - 1rem); overflow: auto; padding: 1rem;
}
`
}
