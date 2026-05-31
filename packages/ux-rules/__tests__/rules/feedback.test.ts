/**
 * Feedback Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Feedback Rules', () => {
  describe('feedback-spinner-context', () => {
    it('should report info for spinner without text', () => {
      const doc = parse('page { spinner }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-spinner-context')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for spinner with text', () => {
      const doc = parse('page { spinner "Loading..." }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-spinner-context')
      expect(issue).toBeUndefined()
    })

    it('should pass for spinner with label', () => {
      const doc = parse('page { spinner label="Please wait" }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-spinner-context')
      expect(issue).toBeUndefined()
    })

    it('should pass if sibling text provides context', () => {
      const doc = parse(`
        page {
          row {
            spinner
            text "Loading data..."
          }
        }
      `)
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-spinner-context')
      expect(issue).toBeUndefined()
    })
  })

  describe('feedback-progress-value', () => {
    it('should report info for progress without value', () => {
      const doc = parse('page { progress }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-progress-value')
      expect(issue).toBeDefined()
    })

    it('should pass for progress with value', () => {
      const doc = parse('page { progress value=50 }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-progress-value')
      expect(issue).toBeUndefined()
    })

    it('should pass for indeterminate progress', () => {
      const doc = parse('page { progress indeterminate }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-progress-value')
      expect(issue).toBeUndefined()
    })
  })

  describe('feedback-toast-duration', () => {
    it('should report info for toast with very short duration', () => {
      const doc = parse('page { toast "Message" duration=1000 }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-toast-duration')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('too short')
    })

    it('should report info for toast with very long duration', () => {
      const doc = parse('page { toast "Message" duration=15000 }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-toast-duration')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('too long')
    })

    it('should pass for toast with reasonable duration', () => {
      const doc = parse('page { toast "Message" duration=5000 }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-toast-duration')
      expect(issue).toBeUndefined()
    })
  })

  describe('feedback-alert-dismissible', () => {
    it('should report info for info alert that is not dismissible', () => {
      const doc = parse('page { alert "Info message" variant="info" }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-alert-dismissible')
      expect(issue).toBeDefined()
    })

    it('should report info for success alert that is not dismissible', () => {
      const doc = parse('page { alert "Success!" variant="success" }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-alert-dismissible')
      expect(issue).toBeDefined()
    })

    it('should pass for dismissible info alert', () => {
      const doc = parse('page { alert "Info" variant="info" dismissible }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-alert-dismissible')
      expect(issue).toBeUndefined()
    })

    it('should not check error alerts', () => {
      const doc = parse('page { alert "Error!" variant="danger" }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-alert-dismissible')
      expect(issue).toBeUndefined()
    })
  })

  describe('feedback-tooltip-length', () => {
    it('should report info for very long tooltip', () => {
      const longText =
        'This is a very long tooltip that contains way too much information and should probably be shown in a different way like a popover or modal instead'
      const doc = parse(`page { tooltip "${longText}" }`)
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-tooltip-length')
      expect(issue).toBeDefined()
    })

    it('should pass for short tooltip', () => {
      const doc = parse('page { tooltip "Click to save" }')
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-tooltip-length')
      expect(issue).toBeUndefined()
    })
  })

  describe('feedback-form-errors', () => {
    it('should report info for form without error handling', () => {
      const doc = parse(`
        page {
          card {
            input label="Email"
            input label="Password" inputType="password"
            button "Login" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-form-errors')
      expect(issue).toBeDefined()
    })

    it('should pass for form with input error attribute', () => {
      const doc = parse(`
        page {
          card {
            input label="Email" error="Invalid email"
            button "Submit" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-form-errors')
      expect(issue).toBeUndefined()
    })

    it('should pass for form with error alert', () => {
      const doc = parse(`
        page {
          card {
            alert "Invalid credentials" variant="danger"
            input label="Email"
            button "Submit" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['feedback'] })

      const issue = result.issues.find((i) => i.ruleId === 'feedback-form-errors')
      expect(issue).toBeUndefined()
    })
  })
})
