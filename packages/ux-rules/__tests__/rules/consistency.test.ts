/**
 * Consistency Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Consistency Rules', () => {
  describe('consistency-button-styles', () => {
    it('should report info for many different button styles', () => {
      const doc = parse(`
        page {
          row {
            button "Primary" primary
            button "Outline" outline
            button "Ghost" ghost
          }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-button-styles')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for primary + outline pattern', () => {
      const doc = parse(`
        page {
          row {
            button "Save" primary
            button "Cancel" outline
          }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-button-styles')
      expect(issue).toBeUndefined()
    })

    it('should pass for primary + ghost pattern', () => {
      const doc = parse(`
        page {
          row {
            button "Confirm" primary
            button "Skip" ghost
          }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-button-styles')
      expect(issue).toBeUndefined()
    })

    it('should pass for primary + secondary pattern', () => {
      const doc = parse(`
        page {
          row {
            button "Submit" primary
            button "Draft" secondary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-button-styles')
      expect(issue).toBeUndefined()
    })

    it('should not check single button', () => {
      const doc = parse(`
        page {
          row {
            button "Only" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-button-styles')
      expect(issue).toBeUndefined()
    })
  })

  describe('consistency-spacing', () => {
    it('should report info for inconsistent gap values', () => {
      const doc = parse(`
        page {
          row gap=2 { text "A" }
          row gap=4 { text "B" }
          row gap=6 { text "C" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-spacing')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for consistent gap values', () => {
      const doc = parse(`
        page {
          row gap=4 { text "A" }
          row gap=4 { text "B" }
          row gap=4 { text "C" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-spacing')
      expect(issue).toBeUndefined()
    })

    it('should pass for two different gap values', () => {
      const doc = parse(`
        page {
          row gap=2 { text "A" }
          row gap=4 { text "B" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-spacing')
      expect(issue).toBeUndefined()
    })
  })

  describe('consistency-card-styling', () => {
    it('should report info for inconsistent card shadow', () => {
      const doc = parse(`
        page {
          card shadow { text "A" }
          card { text "B" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-card-styling')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('shadow')
    })

    it('should report info for inconsistent card padding', () => {
      const doc = parse(`
        page {
          card p=4 { text "A" }
          card p=2 { text "B" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-card-styling')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('padding')
    })

    it('should pass for consistent card styling', () => {
      const doc = parse(`
        page {
          card p=4 shadow { text "A" }
          card p=4 shadow { text "B" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-card-styling')
      expect(issue).toBeUndefined()
    })

    it('should not check single card', () => {
      const doc = parse(`
        page {
          card p=4 shadow { text "A" }
        }
      `)
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-card-styling')
      expect(issue).toBeUndefined()
    })
  })

  describe('consistency-alert-variants', () => {
    it('should report warning for error alert without danger variant', () => {
      const doc = parse('page { alert "Error: Something failed" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('danger')
    })

    it('should pass for error alert with danger variant', () => {
      const doc = parse('page { alert "Error: Something failed" variant="danger" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeUndefined()
    })

    it('should report warning for success alert without success variant', () => {
      const doc = parse('page { alert "Success! Data saved" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('success')
    })

    it('should pass for success alert with success variant', () => {
      const doc = parse('page { alert "Success! Data saved" variant="success" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeUndefined()
    })

    it('should report info for warning alert without warning variant', () => {
      const doc = parse('page { alert "Warning: Please check your input" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for neutral alert', () => {
      const doc = parse('page { alert "Here is some helpful information" }')
      const result = validateUX(doc, { categories: ['consistency'] })

      const issue = result.issues.find((i) => i.ruleId === 'consistency-alert-variants')
      expect(issue).toBeUndefined()
    })
  })
})
