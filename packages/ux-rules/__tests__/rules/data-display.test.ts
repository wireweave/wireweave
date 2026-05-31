/**
 * Data Display Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Data Display Rules', () => {
  describe('data-table-header', () => {
    it('should report warning for table without header', () => {
      const doc = parse('page { table { } }')
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-header')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for table with columns', () => {
      const doc = parse(`
        page {
          table {
            columns ["Name", "Email", "Status"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-header')
      expect(issue).toBeUndefined()
    })
  })

  describe('data-list-empty-state', () => {
    it('should report info for empty list without empty state', () => {
      const doc = parse('page { list { } }')
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-empty-state')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for list with items', () => {
      const doc = parse('page { list items=["Item 1", "Item 2"] }')
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-empty-state')
      expect(issue).toBeUndefined()
    })

    it('should pass for empty list with emptyState', () => {
      const doc = parse('page { list emptyState="No items found" }')
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-empty-state')
      expect(issue).toBeUndefined()
    })
  })

  describe('data-table-empty-state', () => {
    it('should report info for empty table without empty state', () => {
      const doc = parse(`
        page {
          table {
            columns ["A", "B"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-empty-state')
      expect(issue).toBeDefined()
    })

    it('should pass for table with rows', () => {
      const doc = parse(`
        page {
          table {
            columns ["A"]
            row ["Row 1"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-empty-state')
      expect(issue).toBeUndefined()
    })
  })

  describe('data-list-pagination', () => {
    it('should report info for list with many items', () => {
      const items = Array.from({ length: 25 }, (_, i) => `"Item ${i}"`).join(', ')
      const doc = parse(`page { list items=[${items}] }`)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-pagination')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('25 items')
    })

    it('should pass for list with pagination', () => {
      const items = Array.from({ length: 25 }, (_, i) => `"Item ${i}"`).join(', ')
      const doc = parse(`page { list items=[${items}] pagination }`)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-pagination')
      expect(issue).toBeUndefined()
    })

    it('should pass for short list', () => {
      const doc = parse('page { list items=["A", "B", "C"] }')
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-list-pagination')
      expect(issue).toBeUndefined()
    })
  })

  describe('data-table-columns', () => {
    it('should report warning for table with too many columns', () => {
      const columns = Array.from({ length: 10 }, (_, i) => `"Col ${i}"`).join(', ')
      const doc = parse(`
        page {
          table {
            columns [${columns}]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-columns')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for table with reasonable columns', () => {
      const doc = parse(`
        page {
          table {
            columns ["Name", "Email", "Status", "Actions"]
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-table-columns')
      expect(issue).toBeUndefined()
    })
  })

  describe('data-card-grid', () => {
    it('should report info for card grid with inconsistent heights', () => {
      const doc = parse(`
        page {
          row {
            card height=100 { text "A" }
            card height=150 { text "B" }
            card height=200 { text "C" }
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-card-grid')
      expect(issue).toBeDefined()
    })

    it('should pass for card grid with consistent heights', () => {
      const doc = parse(`
        page {
          row {
            card height=100 { text "A" }
            card height=100 { text "B" }
            card height=100 { text "C" }
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-card-grid')
      expect(issue).toBeUndefined()
    })

    it('should not check rows with fewer than 3 cards', () => {
      const doc = parse(`
        page {
          row {
            card height=100 { text "A" }
            card height=200 { text "B" }
          }
        }
      `)
      const result = validateUX(doc, { categories: ['data-display'] })

      const issue = result.issues.find((i) => i.ruleId === 'data-card-grid')
      expect(issue).toBeUndefined()
    })
  })
})
