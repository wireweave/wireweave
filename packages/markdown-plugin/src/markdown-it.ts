/**
 * markdown-it plugin for wireweave
 */

import type MarkdownIt from 'markdown-it'
import type { WireframePluginOptions } from './index'
import { renderWireframe } from './index'

/**
 * markdown-it plugin
 *
 * @example
 * ```typescript
 * import MarkdownIt from 'markdown-it';
 * import { markdownItWireframe } from '@wireweave/markdown-plugin/markdown-it';
 *
 * const md = new MarkdownIt();
 * md.use(markdownItWireframe, { format: 'svg' });
 *
 * const html = md.render('```wireframe\npage { text "Hello" }\n```');
 * ```
 */
export function markdownItWireframe(md: MarkdownIt, options: WireframePluginOptions = {}): void {
  const defaultFence = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim()

    if (info === 'wireframe' || info === 'wf') {
      return renderWireframe(token.content, options)
    }

    // Use default renderer for other code blocks
    if (defaultFence) {
      return defaultFence(tokens, idx, opts, env, self)
    }

    return `<pre><code class="language-${info}">${md.utils.escapeHtml(token.content)}</code></pre>`
  }
}
