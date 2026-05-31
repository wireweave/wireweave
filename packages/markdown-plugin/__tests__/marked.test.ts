/**
 * marked extension tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { marked } from 'marked'
import { markedWireframe } from '../src/marked'

describe('marked extension', () => {
  beforeEach(() => {
    // Reset marked to default state
    marked.setOptions({ renderer: new marked.Renderer() })
  })

  it('should render wireframe code block', () => {
    marked.use(markedWireframe({ format: 'html' }))

    const input = '```wireframe\npage { text "Hello" }\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should support wf alias', () => {
    marked.use(markedWireframe({ format: 'html' }))

    const input = '```wf\npage { text "Hello" }\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should not affect other code blocks', () => {
    marked.use(markedWireframe())

    const input = '```javascript\nconsole.log("hello");\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('code')
    expect(output).not.toContain('wireframe-container')
  })

  it('should handle parse errors gracefully', () => {
    marked.use(markedWireframe({ errorHandling: 'both' }))

    const input = '```wireframe\ninvalid syntax {{{ \n```'
    const output = marked.parse(input) as string

    expect(output).toContain('wireframe-error')
  })

  it('should render as SVG image by default', () => {
    marked.use(markedWireframe())

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('data:image/svg+xml;base64')
    expect(output).toContain('<img')
  })

  it('should render as inline SVG when format is svg', () => {
    marked.use(markedWireframe({ format: 'svg' }))

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('<svg')
    expect(output).not.toContain('<img')
  })

  it('should use custom container class', () => {
    marked.use(markedWireframe({ format: 'html', containerClass: 'custom-class' }))

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = marked.parse(input) as string

    expect(output).toContain('custom-class')
  })

  it('should render complex wireframes', () => {
    marked.use(markedWireframe({ format: 'html' }))

    const input = `\`\`\`wireframe
page {
  row {
    col span=6 { button "Left" }
    col span=6 { button "Right" }
  }
}
\`\`\``
    const output = marked.parse(input) as string

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Left')
    expect(output).toContain('Right')
  })
})
