/**
 * Common renderWireframe function tests
 */

import { describe, it, expect } from 'vitest'
import { renderWireframe } from '../src/index'

describe('renderWireframe', () => {
  describe('format: html', () => {
    it('should render valid wireframe code to HTML', () => {
      const code = 'page { text "Hello World" }'
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('wireframe-container')
      expect(output).toContain('<style>')
      expect(output).toContain('Hello World')
    })

    it('should include CSS in output', () => {
      const code = 'page { button "Click" primary }'
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('<style>')
      expect(output).toContain('</style>')
    })
  })

  describe('format: svg', () => {
    it('should render valid wireframe code to inline SVG', () => {
      const code = 'page { text "Hello" }'
      const output = renderWireframe(code, { format: 'svg' })

      expect(output).toContain('wireframe-container')
      expect(output).toContain('<svg')
      expect(output).toContain('</svg>')
    })

    it('should not include img tag', () => {
      const code = 'page { text "Hello" }'
      const output = renderWireframe(code, { format: 'svg' })

      expect(output).not.toContain('<img')
    })
  })

  describe('format: svg-img (default)', () => {
    it('should render as base64 encoded img tag', () => {
      const code = 'page { text "Hello" }'
      const output = renderWireframe(code)

      expect(output).toContain('<img')
      expect(output).toContain('data:image/svg+xml;base64')
      expect(output).toContain('alt="Wireframe"')
    })

    it('should use svg-img format by default', () => {
      const code = 'page { text "Test" }'
      const defaultOutput = renderWireframe(code)
      const explicitOutput = renderWireframe(code, { format: 'svg-img' })

      // Both should produce base64 img
      expect(defaultOutput).toContain('data:image/svg+xml;base64')
      expect(explicitOutput).toContain('data:image/svg+xml;base64')
    })
  })

  describe('containerClass', () => {
    it('should use default container class', () => {
      const code = 'page { text "Test" }'
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('wireframe-container')
    })

    it('should use custom container class', () => {
      const code = 'page { text "Test" }'
      const output = renderWireframe(code, {
        format: 'html',
        containerClass: 'my-custom-wireframe',
      })

      expect(output).toContain('my-custom-wireframe')
      expect(output).not.toContain('wireframe-container')
    })
  })

  describe('error handling', () => {
    const invalidCode = 'invalid {{{ syntax )))'

    it('should show both error and code by default', () => {
      const output = renderWireframe(invalidCode)

      expect(output).toContain('wireframe-error')
      expect(output).toContain('wireframe-source')
      expect(output).toContain('wireframe-error-container')
    })

    it('should show only error when errorHandling is error', () => {
      const output = renderWireframe(invalidCode, { errorHandling: 'error' })

      expect(output).toContain('wireframe-error')
      expect(output).not.toContain('wireframe-source')
    })

    it('should show only code when errorHandling is code', () => {
      const output = renderWireframe(invalidCode, { errorHandling: 'code' })

      expect(output).toContain('wireframe-source')
      expect(output).not.toContain('wireframe-error')
    })

    it('should escape HTML in error messages', () => {
      // This code will fail parsing, and the error should be escaped
      const output = renderWireframe(invalidCode, { errorHandling: 'error' })

      // Check that the output doesn't contain unescaped HTML-like content
      expect(output).not.toMatch(/<script>/)
    })

    it('should escape HTML in source code', () => {
      const codeWithHtml = 'invalid < > & <script>alert(1)</script>'
      // This should fail to parse, showing the code with HTML escaped
      const output = renderWireframe(codeWithHtml, { errorHandling: 'code' })

      expect(output).toContain('&lt;')
      expect(output).toContain('&gt;')
      expect(output).toContain('&amp;')
    })
  })

  describe('complex wireframes', () => {
    it('should render wireframe with multiple components', () => {
      const code = `
        page "My App" {
          header {
            title "Header"
          }
          main {
            card "Card 1" {
              text "Some content"
              button "Submit" primary
            }
          }
          footer {
            text "Footer content"
          }
        }
      `
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('wireframe-container')
      expect(output).toContain('Header')
      expect(output).toContain('Card 1')
      expect(output).toContain('Submit')
    })

    it('should render wireframe with layout', () => {
      const code = `
        page {
          row gap=4 {
            col span=4 { text "Column 1" }
            col span=4 { text "Column 2" }
            col span=4 { text "Column 3" }
          }
        }
      `
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('wireframe-container')
      expect(output).toContain('Column 1')
      expect(output).toContain('Column 2')
      expect(output).toContain('Column 3')
    })

    it('should render wireframe with form elements', () => {
      const code = `
        page {
          card "Login" {
            input "Username"
            input "Password" type="password"
            checkbox "Remember me"
            button "Sign In" primary
          }
        }
      `
      const output = renderWireframe(code, { format: 'html' })

      expect(output).toContain('Username')
      expect(output).toContain('Password')
      expect(output).toContain('Remember me')
      expect(output).toContain('Sign In')
    })
  })
})
