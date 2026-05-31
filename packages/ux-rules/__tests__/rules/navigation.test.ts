/**
 * Navigation Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Navigation Rules', () => {
  describe('nav-item-count', () => {
    it('should report warning for navigation with too many items', () => {
      const doc = parse(`
        page {
          nav [
            { label="Home" }
            { label="Products" }
            { label="Services" }
            { label="About" }
            { label="Blog" }
            { label="Contact" }
            { label="Support" }
            { label="FAQ" }
          ]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-item-count')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('8 items')
    })

    it('should pass for navigation with reasonable items', () => {
      const doc = parse(`
        page {
          nav [
            { label="Home" }
            { label="Products" }
            { label="About" }
            { label="Contact" }
          ]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-item-count')
      expect(issue).toBeUndefined()
    })

    it('should pass for navigation at limit (7 items)', () => {
      const doc = parse(`
        page {
          nav [
            { label="1" }
            { label="2" }
            { label="3" }
            { label="4" }
            { label="5" }
            { label="6" }
            { label="7" }
          ]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-item-count')
      expect(issue).toBeUndefined()
    })
  })

  describe('nav-active-state', () => {
    it('should report info for navigation without active state', () => {
      const doc = parse(`
        page {
          nav [
            { label="Home" }
            { label="Products" }
            { label="About" }
          ]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-active-state')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for navigation with active item', () => {
      const doc = parse(`
        page {
          nav [
            { label="Home" active }
            { label="Products" }
            { label="About" }
          ]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-active-state')
      expect(issue).toBeUndefined()
    })
  })

  describe('nav-breadcrumb-home', () => {
    it('should report info for breadcrumb without home link', () => {
      const doc = parse('page { breadcrumb ["Products", "Electronics", "Phones"] }')
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-breadcrumb-home')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for breadcrumb starting with Home', () => {
      const doc = parse('page { breadcrumb ["Home", "Products", "Electronics"] }')
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-breadcrumb-home')
      expect(issue).toBeUndefined()
    })

    it('should pass for breadcrumb starting with Dashboard', () => {
      const doc = parse('page { breadcrumb ["Dashboard", "Settings", "Profile"] }')
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-breadcrumb-home')
      expect(issue).toBeUndefined()
    })
  })

  describe('nav-tab-count', () => {
    it('should report warning for tabs with too many items', () => {
      const doc = parse(`
        page {
          tabs ["Tab 1", "Tab 2", "Tab 3", "Tab 4", "Tab 5", "Tab 6"]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-tab-count')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('6 items')
    })

    it('should pass for tabs with reasonable count', () => {
      const doc = parse(`
        page {
          tabs ["Overview", "Details", "Reviews"]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-tab-count')
      expect(issue).toBeUndefined()
    })

    it('should pass for tabs at limit (5 items)', () => {
      const doc = parse(`
        page {
          tabs ["1", "2", "3", "4", "5"]
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-tab-count')
      expect(issue).toBeUndefined()
    })
  })

  describe('nav-dropdown-items', () => {
    it('should report warning for empty dropdown', () => {
      const doc = parse(`
        page {
          dropdown {
          }
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-dropdown-items')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for dropdown with items', () => {
      const doc = parse(`
        page {
          dropdown {
            item "Option 1"
            item "Option 2"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['navigation'] })

      const issue = result.issues.find((i) => i.ruleId === 'nav-dropdown-items')
      expect(issue).toBeUndefined()
    })
  })
})
