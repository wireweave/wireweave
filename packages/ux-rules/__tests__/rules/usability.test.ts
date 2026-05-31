/**
 * Usability Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import type { WireframeDocument } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Usability Rules', () => {
  describe('usability-empty-container', () => {
    it('should report warning for empty card', () => {
      const doc = parse('page { card { } }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-empty-container')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for card with content', () => {
      const doc = parse('page { card { text "Hello" } }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-empty-container')
      expect(issue).toBeUndefined()
    })

    it('should check empty section', () => {
      const doc = parse('page { section { } }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-empty-container')
      expect(issue).toBeDefined()
    })

    it('should check empty modal', () => {
      const doc = parse('page { modal { } }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-empty-container')
      expect(issue).toBeDefined()
    })
  })

  describe('usability-clear-cta', () => {
    it('should report info for page without primary button', () => {
      const doc = parse(`
        page {
          text "Welcome"
          button "Click"
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-clear-cta')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for page with primary button', () => {
      const doc = parse(`
        page {
          text "Welcome"
          button "Get Started" primary
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-clear-cta')
      expect(issue).toBeUndefined()
    })

    it('should detect primary button in nested container', () => {
      const doc = parse(`
        page {
          card {
            text "Welcome"
            button "Get Started" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-clear-cta')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-loading-states', () => {
    it('should report info for submit button without loading state', () => {
      const doc = parse('page { button "Submit" primary }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-loading-states')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should report for upload button', () => {
      const doc = parse('page { button "Upload File" primary }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-loading-states')
      expect(issue).toBeDefined()
    })

    it('should pass for button with loading', () => {
      const doc = parse('page { button "Submit" primary loading }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-loading-states')
      expect(issue).toBeUndefined()
    })

    it('should not check non-async action buttons', () => {
      const doc = parse('page { button "Cancel" primary }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-loading-states')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-destructive-confirm', () => {
    it('should report warning for delete button without danger style', () => {
      const doc = parse('page { button "Delete" }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-destructive-confirm')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for delete button with danger style', () => {
      const doc = parse('page { button "Delete" danger }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-destructive-confirm')
      expect(issue).toBeUndefined()
    })

    it('should report for remove button', () => {
      const doc = parse('page { button "Remove Item" }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-destructive-confirm')
      expect(issue).toBeDefined()
    })

    it('should report for reset button', () => {
      const doc = parse('page { button "Reset All" }')
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-destructive-confirm')
      expect(issue).toBeDefined()
    })
  })

  describe('usability-modal-close', () => {
    it('should report warning for modal without close button', () => {
      const doc = parse(`
        page {
          modal {
            title "Dialog"
            text "Content"
            button "Confirm" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-modal-close')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for modal with close button', () => {
      const doc = parse(`
        page {
          modal {
            title "Dialog"
            text "Content"
            button "Close"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-modal-close')
      expect(issue).toBeUndefined()
    })

    it('should pass for modal with cancel button', () => {
      const doc = parse(`
        page {
          modal {
            title "Dialog"
            button "Cancel"
            button "Confirm" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-modal-close')
      expect(issue).toBeUndefined()
    })

    it('should pass for modal with X icon', () => {
      const doc = parse(`
        page {
          modal {
            icon "x"
            title "Dialog"
            text "Content"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-modal-close')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-nesting-depth', () => {
    it('should report warning for excessive nesting', () => {
      const doc = parse(`
        page {
          card {
            section {
              card {
                row {
                  col {
                    card {
                      row {
                        text "Too deep"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-nesting-depth')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('deep')
    })

    it('should pass for reasonable nesting', () => {
      const doc = parse(`
        page {
          card {
            row {
              col {
                text "OK"
              }
            }
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-nesting-depth')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-too-many-buttons', () => {
    it('should report warning for container with too many buttons', () => {
      const doc = parse(`
        page {
          card {
            button "A"
            button "B"
            button "C"
            button "D"
            button "E"
            button "F"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-too-many-buttons')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('6 buttons')
    })

    it('should pass for container with acceptable number of buttons', () => {
      const doc = parse(`
        page {
          row {
            button "Cancel"
            button "Save" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-too-many-buttons')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-too-many-form-fields', () => {
    it('should report info for form with too many fields', () => {
      const doc = parse(`
        page {
          card {
            input label="Field 1"
            input label="Field 2"
            input label="Field 3"
            input label="Field 4"
            input label="Field 5"
            input label="Field 6"
            input label="Field 7"
            input label="Field 8"
            input label="Field 9"
            input label="Field 10"
            input label="Field 11"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-too-many-form-fields')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
      expect(issue?.message).toContain('11 fields')
    })

    it('should count nested form fields', () => {
      const doc = parse(`
        page {
          section {
            row {
              col { input label="A" input label="B" input label="C" input label="D" input label="E" }
              col { input label="F" input label="G" input label="H" input label="I" input label="J" }
            }
            select label="K"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-too-many-form-fields')
      expect(issue).toBeDefined()
    })

    it('should pass for form with acceptable number of fields', () => {
      const doc = parse(`
        page {
          card {
            input label="Email"
            input label="Password" inputType="password"
            button "Login" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-too-many-form-fields')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-page-complexity', () => {
    it('should report info for page with too many elements', () => {
      // Generate a page with many elements (>50)
      let elements = ''
      for (let i = 0; i < 60; i++) {
        elements += `text "Item ${i}" `
      }
      const doc = parse(`page { ${elements} }`)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-page-complexity')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for simple page', () => {
      const doc = parse(`
        page {
          header { title "Hello" }
          main { text "Content" }
          footer { text "Footer" }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-page-complexity')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-drawer-width', () => {
    it('should report info for drawer without width', () => {
      const doc = parse(`
        page {
          drawer {
            nav items=["Home", "About"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-drawer-width')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for drawer with width', () => {
      const doc = parse(`
        page {
          drawer width=320 {
            nav items=["Home", "About"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-drawer-width')
      expect(issue).toBeUndefined()
    })

    it('should pass for drawer with w attribute', () => {
      const doc = parse(`
        page {
          drawer w=80 {
            nav items=["Home"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['usability'] })

      const issue = result.issues.find((i) => i.ruleId === 'usability-drawer-width')
      expect(issue).toBeUndefined()
    })
  })

  describe('usability-page-overlap', () => {
    // Multi-page coordinates use programmatic AST — `at(x, y)` grammar
    // sugar lands in core@>=2.8.0; the rule itself only depends on
    // PageNode.x / .y / .w / .h / .viewport already present in 2.7.x.
    function makeDoc(
      pages: Array<{
        title?: string
        x?: number
        y?: number
        viewport?: string
        w?: number
        h?: number
      }>,
    ): WireframeDocument {
      return {
        type: 'Document',
        children: pages.map((p) => ({
          type: 'Page',
          title: p.title,
          x: p.x,
          y: p.y,
          viewport: p.viewport,
          w: p.w,
          h: p.h,
          children: [],
        })),
      }
    }

    it('reports overlap when explicit at() boxes intersect', () => {
      const doc = makeDoc([
        { title: 'A', x: 0, y: 0, viewport: '1280x800' },
        { title: 'B', x: 640, y: 400, viewport: '1280x800' },
      ])
      const result = validateUX(doc, { categories: ['usability'] })
      const issue = result.issues.find((i) => i.ruleId === 'usability-page-overlap')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('"A"')
      expect(issue?.message).toContain('"B"')
    })

    it('passes when explicit pages are placed side-by-side without overlap', () => {
      const doc = makeDoc([
        { title: 'A', x: 0, y: 0, viewport: '1280x800' },
        { title: 'B', x: 1344, y: 0, viewport: '1280x800' },
      ])
      const result = validateUX(doc, { categories: ['usability'] })
      const issue = result.issues.find((i) => i.ruleId === 'usability-page-overlap')
      expect(issue).toBeUndefined()
    })

    it('ignores auto-flow pages (no at()) — they never overlap by construction', () => {
      const doc = makeDoc([
        { title: 'A', viewport: '1280x800' },
        { title: 'B', viewport: '1280x800' },
      ])
      const result = validateUX(doc, { categories: ['usability'] })
      const issue = result.issues.find((i) => i.ruleId === 'usability-page-overlap')
      expect(issue).toBeUndefined()
    })

    it('only flags overlap once per pair', () => {
      const doc = makeDoc([
        { title: 'A', x: 0, y: 0, viewport: '1280x800' },
        { title: 'B', x: 100, y: 100, viewport: '1280x800' },
      ])
      const result = validateUX(doc, { categories: ['usability'] })
      const overlapIssues = result.issues.filter((i) => i.ruleId === 'usability-page-overlap')
      expect(overlapIssues).toHaveLength(1)
    })

    it('respects explicit numeric w/h instead of viewport', () => {
      const doc = makeDoc([
        { title: 'A', x: 0, y: 0, w: 400, h: 300 },
        { title: 'B', x: 500, y: 0, w: 400, h: 300 },
      ])
      const result = validateUX(doc, { categories: ['usability'] })
      const issue = result.issues.find((i) => i.ruleId === 'usability-page-overlap')
      expect(issue).toBeUndefined()
    })
  })
})
