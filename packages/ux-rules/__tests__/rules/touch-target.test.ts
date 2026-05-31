/**
 * Touch Target Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Touch Target Rules', () => {
  describe('touch-button-size', () => {
    it('should report warning for xs button size (24px)', () => {
      const doc = parse('page { button "Click" size=xs }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
      expect(issue?.message).toContain('24px')
    })

    it('should report warning for sm button size (32px)', () => {
      const doc = parse('page { button "Click" size=sm }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('32px')
    })

    it('should report warning for md button size (40px < 44px min)', () => {
      const doc = parse('page { button "Click" size=md }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      // md is 40px which is still below 44px minimum
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('40px')
    })

    it('should pass for large button size (48px)', () => {
      const doc = parse('page { button "Click" size=lg }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      expect(issue).toBeUndefined()
    })

    it('should pass for xl button size (56px)', () => {
      const doc = parse('page { button "Click" size=xl }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      expect(issue).toBeUndefined()
    })

    it('should pass for button without explicit size', () => {
      const doc = parse('page { button "Click" }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-button-size')
      expect(issue).toBeUndefined()
    })
  })

  describe('touch-icon-button-size', () => {
    it('should report warning for small icon-only button without padding', () => {
      const doc = parse('page { button "" icon=search size=sm }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-icon-button-size')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for icon button with padding', () => {
      const doc = parse('page { button "" icon=search size=sm p=2 }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-icon-button-size')
      expect(issue).toBeUndefined()
    })

    it('should not check buttons with text', () => {
      const doc = parse('page { button "Search" icon=search size=sm }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-icon-button-size')
      expect(issue).toBeUndefined()
    })
  })

  describe('touch-checkbox-radio-size', () => {
    it('should report info for checkbox without label', () => {
      const doc = parse('page { checkbox }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-checkbox-radio-size')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for checkbox with label', () => {
      const doc = parse('page { checkbox label="Accept terms" }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-checkbox-radio-size')
      expect(issue).toBeUndefined()
    })

    it('should report info for radio without label', () => {
      const doc = parse('page { radio }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-checkbox-radio-size')
      expect(issue).toBeDefined()
    })

    it('should pass for radio with label', () => {
      const doc = parse('page { radio label="Option 1" }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-checkbox-radio-size')
      expect(issue).toBeUndefined()
    })
  })

  describe('touch-link-spacing', () => {
    it('should report info for links in row without gap', () => {
      const doc = parse(`
        page {
          row {
            link "Link 1" href="/1"
            link "Link 2" href="/2"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-link-spacing')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for links in row with adequate gap', () => {
      const doc = parse(`
        page {
          row gap=4 {
            link "Link 1" href="/1"
            link "Link 2" href="/2"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-link-spacing')
      expect(issue).toBeUndefined()
    })

    it('should not report for single link', () => {
      const doc = parse(`
        page {
          row {
            link "Only Link" href="/1"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-link-spacing')
      expect(issue).toBeUndefined()
    })
  })

  describe('touch-avatar-size', () => {
    it('should report info for xs avatar (24px)', () => {
      const doc = parse('page { avatar size=xs }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-avatar-size')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should report info for sm avatar (32px)', () => {
      const doc = parse('page { avatar size=sm }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-avatar-size')
      expect(issue).toBeDefined()
    })

    it('should report info for md avatar (40px < 44px)', () => {
      const doc = parse('page { avatar size=md }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-avatar-size')
      // md is 40px which is below 44px minimum
      expect(issue).toBeDefined()
    })

    it('should pass for large avatar (48px)', () => {
      const doc = parse('page { avatar size=lg }')
      const result = validateUX(doc, { categories: ['touch-target'] })

      const issue = result.issues.find((i) => i.ruleId === 'touch-avatar-size')
      expect(issue).toBeUndefined()
    })
  })
})
