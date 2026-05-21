import { parse, render } from '../index'

/**
 * Parse DSL and render to HTML string (without wrapper CSS, since preview.ts handles that)
 */
export function renderDSL(dsl: string): string {
  const doc = parse(dsl)
  const { html } = render(doc)
  return html
}
