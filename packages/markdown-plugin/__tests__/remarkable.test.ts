/**
 * remarkable plugin tests
 */

import { describe, it, expect } from 'vitest'
import { Remarkable } from 'remarkable'
import { remarkableWireframe } from '../src/remarkable'

describe('remarkable plugin', () => {
  it('should render wireframe code block', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ format: 'html' }))

    const input = '```wireframe\npage { text "Hello" }\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should support wf alias', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ format: 'html' }))

    const input = '```wf\npage { text "Hello" }\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should not affect other code blocks', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe())

    const input = '```javascript\nconsole.log("hello");\n```'
    const output = md.render(input)

    expect(output).toContain('language-javascript')
    expect(output).not.toContain('wireframe-container')
  })

  it('should handle parse errors gracefully', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ errorHandling: 'both' }))

    const input = '```wireframe\ninvalid syntax {{{ \n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-error')
  })

  it('should render as SVG image by default', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe())

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('data:image/svg+xml;base64')
    expect(output).toContain('<img')
  })

  it('should render as inline SVG when format is svg', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ format: 'svg' }))

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('<svg')
    expect(output).not.toContain('<img')
  })

  it('should use custom container class', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ format: 'html', containerClass: 'my-custom-class' }))

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('my-custom-class')
  })

  it('should render complex wireframes with cards', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ format: 'html' }))

    const input = `\`\`\`wireframe
page "Dashboard" {
  main {
    card "Stats" {
      text "Total Users: 1,234"
    }
    card "Revenue" {
      text "$12,345"
    }
  }
}
\`\`\``
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Stats')
    expect(output).toContain('Revenue')
  })

  it('should show only error when errorHandling is error', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ errorHandling: 'error' }))

    const input = '```wireframe\nbad {{{ syntax\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-error')
    expect(output).not.toContain('wireframe-source')
  })

  it('should show only code when errorHandling is code', () => {
    const md = new Remarkable()
    md.use(remarkableWireframe({ errorHandling: 'code' }))

    const input = '```wireframe\nbad {{{ syntax\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-source')
    expect(output).not.toContain('wireframe-error')
  })
})
