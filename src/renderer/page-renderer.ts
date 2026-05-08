/**
 * Page renderer — single-Page primitive.
 *
 * `renderPage` is the *pure* unit of this renderer: its output depends only
 * on the page itself, never on sibling pages or canvas-level options. This
 * is what export pipelines (1 page = 1 file) consume, and it is also the
 * building block `renderCanvas` composes when laying multiple pages out.
 */

import type { PageNode } from '../ast/types';
import type { RenderOptions, PageRenderResult } from './types';
import { HtmlRenderer } from './html';
import { resolveViewport } from '../viewport';

/**
 * Render a single page to self-contained HTML + CSS.
 *
 * The page's HTML output is identical to what `render(document)` produces
 * for a document containing only this page — we route through `HtmlRenderer`
 * so the existing renderer pipeline (themes, prefix, indentation, minify)
 * applies uniformly.
 */
export function renderPage(page: PageNode, options: RenderOptions = {}): PageRenderResult {
  const renderer = new HtmlRenderer(options);
  const { html, css } = renderer.render({
    type: 'Document',
    children: [page],
  });
  const { width, height } = resolvePageDimensions(page);
  return { html, css, width, height };
}

/**
 * Resolve a page's pixel dimensions from explicit `w`/`h` or viewport/device.
 *
 * Mirrors the precedence used inside `HtmlRenderer.renderPage`:
 *   1. Explicit numeric `w` and `h` both set → use them.
 *   2. Otherwise resolve via viewport string / device preset.
 *
 * Non-numeric `w`/`h` (e.g. keyword `'full'` or `ValueWithUnit`) fall through
 * to the viewport — those are layout-internal hints, not canvas dimensions.
 */
export function resolvePageDimensions(page: PageNode): { width: number; height: number } {
  const pageAny = page as PageNode & { width?: number; height?: number };
  const explicitW = page.w ?? pageAny.width;
  const explicitH = page.h ?? pageAny.height;

  if (typeof explicitW === 'number' && typeof explicitH === 'number') {
    return { width: explicitW, height: explicitH };
  }

  const viewport = resolveViewport(page.viewport, page.device);
  return { width: viewport.width, height: viewport.height };
}
