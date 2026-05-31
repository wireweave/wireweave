/**
 * remarkable plugin for wireweave
 */

import type { Remarkable } from 'remarkable'
import type { WireframePluginOptions } from './index'
import { renderWireframe } from './index'

/**
 * remarkable plugin
 *
 * @example
 * ```typescript
 * import { Remarkable } from 'remarkable';
 * import { remarkableWireframe } from '@wireweave/markdown-plugin/remarkable';
 *
 * const md = new Remarkable();
 * md.use(remarkableWireframe({ format: 'svg' }));
 *
 * const html = md.render('```wireframe\npage { text "Hello" }\n```');
 * ```
 */
/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function remarkableWireframe(
  options: WireframePluginOptions = {},
): (md: Remarkable) => void {
  return (md: Remarkable) => {
    const rules = md.renderer.rules

    // Override fence rule completely (params contextually typed as Remarkable.Rule<FenceToken>)
    rules.fence = (tokens, idx): string => {
      const token = tokens[idx]
      const lang = token.params || ''

      if (lang === 'wireframe' || lang === 'wf') {
        return renderWireframe(token.content, options)
      }

      // Render other code blocks with syntax highlighting class
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      return `<pre><code${langClass}>${escapeHtml(token.content)}</code></pre>\n`
    }
  }
}
