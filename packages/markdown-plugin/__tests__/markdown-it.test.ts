/**
 * markdown-it plugin tests
 */

import { describe, it, expect } from 'vitest'
import MarkdownIt from 'markdown-it'
import { markdownItWireframe } from '../src/markdown-it'

describe('markdown-it plugin', () => {
  it('should render wireframe code block', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { format: 'html' })

    const input = '```wireframe\npage { text "Hello" }\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should support wf alias', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { format: 'html' })

    const input = '```wf\npage { text "Hello" }\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Hello')
  })

  it('should not affect other code blocks', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe)

    const input = '```javascript\nconsole.log("hello");\n```'
    const output = md.render(input)

    expect(output).toContain('language-javascript')
    expect(output).not.toContain('wireframe-container')
  })

  it('should handle parse errors gracefully', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { errorHandling: 'both' })

    const input = '```wireframe\ninvalid syntax {{{ \n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-error')
  })

  it('should render as SVG image by default', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe)

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('data:image/svg+xml;base64')
    expect(output).toContain('<img')
  })

  it('should render as inline SVG when format is svg', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { format: 'svg' })

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('<svg')
    expect(output).toContain('wireframe-container')
    expect(output).not.toContain('<img')
  })

  it('should use custom container class', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { format: 'html', containerClass: 'my-wireframe' })

    const input = '```wireframe\npage { text "Test" }\n```'
    const output = md.render(input)

    expect(output).toContain('my-wireframe')
    expect(output).not.toContain('wireframe-container')
  })

  it('should render complex wireframes', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { format: 'html' })

    const input = `\`\`\`wireframe
page "Login" {
  header {
    title "My App"
  }
  main {
    card "Sign In" {
      input "Email" placeholder="Enter email"
      input "Password" type="password"
      button "Login" primary
    }
  }
}
\`\`\``
    const output = md.render(input)

    expect(output).toContain('wireframe-container')
    expect(output).toContain('Login')
    expect(output).toContain('Email')
    expect(output).toContain('Password')
  })

  it('should show only error when errorHandling is error', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { errorHandling: 'error' })

    const input = '```wireframe\ninvalid {{{ syntax\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-error')
    expect(output).not.toContain('wireframe-source')
  })

  it('should show only code when errorHandling is code', () => {
    const md = new MarkdownIt()
    md.use(markdownItWireframe, { errorHandling: 'code' })

    const input = '```wireframe\ninvalid {{{ syntax\n```'
    const output = md.render(input)

    expect(output).toContain('wireframe-source')
    expect(output).not.toContain('wireframe-error')
  })
})
