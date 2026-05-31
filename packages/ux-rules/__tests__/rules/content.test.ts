/**
 * Content Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Content Rules', () => {
  describe('content-empty-text', () => {
    it('should report warning for empty text', () => {
      const doc = parse('page { text "" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-empty-text')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should report warning for Lorem ipsum', () => {
      const doc = parse('page { text "Lorem ipsum" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-empty-text')
      expect(issue).toBeDefined()
    })

    it('should pass for meaningful text', () => {
      const doc = parse('page { text "Welcome to our app" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-empty-text')
      expect(issue).toBeUndefined()
    })
  })

  describe('content-button-text-length', () => {
    it('should report info for very long button text', () => {
      const doc = parse(
        'page { button "Click here to submit your application and save all changes" }',
      )
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-button-text-length')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for concise button text', () => {
      const doc = parse('page { button "Submit" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-button-text-length')
      expect(issue).toBeUndefined()
    })
  })

  describe('content-title-length', () => {
    it('should report info for very long title', () => {
      const doc = parse(
        'page { title "This is an extremely long title that goes on and on and contains way too much information for a heading" }',
      )
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-title-length')
      expect(issue).toBeDefined()
    })

    it('should pass for reasonable title', () => {
      const doc = parse('page { title "User Settings" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-title-length')
      expect(issue).toBeUndefined()
    })
  })

  describe('content-page-title', () => {
    it('should report warning for page without title', () => {
      const doc = parse(`
        page {
          card {
            text "Some content"
            button "Click" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-page-title')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for page with title', () => {
      const doc = parse(`
        page {
          title "Dashboard"
          card {
            text "Some content"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-page-title')
      expect(issue).toBeUndefined()
    })

    it('should find title in nested container', () => {
      const doc = parse(`
        page {
          header {
            title "Dashboard"
          }
          main {
            text "Content"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-page-title')
      expect(issue).toBeUndefined()
    })
  })

  describe('content-link-text', () => {
    it('should report error for link without text', () => {
      const doc = parse('page { link "" href="/page" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-link-text')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('error')
    })

    it('should pass for link with text', () => {
      const doc = parse('page { link "Learn more" href="/page" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-link-text')
      expect(issue).toBeUndefined()
    })
  })

  describe('content-no-placeholder', () => {
    it('should report warning for lorem ipsum content', () => {
      const doc = parse('page { text "Lorem ipsum dolor sit amet" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-no-placeholder')
      expect(issue).toBeDefined()
    })

    it('should report warning for TODO content', () => {
      const doc = parse('page { text "TODO: Add real content" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-no-placeholder')
      expect(issue).toBeDefined()
    })

    it('should pass for real content', () => {
      const doc = parse('page { text "Welcome to our application" }')
      const result = validateUX(doc, { categories: ['content'] })

      const issue = result.issues.find((i) => i.ruleId === 'content-no-placeholder')
      expect(issue).toBeUndefined()
    })
  })
})
