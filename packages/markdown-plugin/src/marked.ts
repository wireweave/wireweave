/**
 * marked extension for wireweave
 */

import type { MarkedExtension, Tokens } from 'marked'
import type { WireframePluginOptions } from './index'
import { renderWireframe } from './index'

/**
 * marked extension
 *
 * @example
 * ```typescript
 * import { marked } from 'marked';
 * import { markedWireframe } from '@wireweave/markdown-plugin/marked';
 *
 * marked.use(markedWireframe({ format: 'svg' }));
 *
 * const html = marked.parse('```wireframe\npage { text "Hello" }\n```');
 * ```
 */
export function markedWireframe(options: WireframePluginOptions = {}): MarkedExtension {
  return {
    renderer: {
      code(token: Tokens.Code): string | false {
        if (token.lang === 'wireframe' || token.lang === 'wf') {
          return renderWireframe(token.text, options)
        }
        return false // Use default renderer
      },
    },
  }
}
