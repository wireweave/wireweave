/**
 * Form Rules Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import { validateUX } from '../../src'

describe('Form Rules', () => {
  describe('form-submit-button', () => {
    it('should report warning for form without submit button', () => {
      const doc = parse(`
        page {
          card {
            input label="Name"
            input label="Email"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-submit-button')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('warning')
    })

    it('should pass for form with primary button', () => {
      const doc = parse(`
        page {
          card {
            input label="Name"
            button "Submit" primary
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-submit-button')
      expect(issue).toBeUndefined()
    })

    it('should pass for form with submit-like button text', () => {
      const doc = parse(`
        page {
          card {
            input label="Name"
            button "Save"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-submit-button')
      expect(issue).toBeUndefined()
    })

    it('should not check containers without inputs', () => {
      const doc = parse(`
        page {
          card {
            text "Hello"
            button "Click"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-submit-button')
      expect(issue).toBeUndefined()
    })
  })

  describe('form-required-indicator', () => {
    it('should report info for required field without indicator', () => {
      const doc = parse('page { input label="Email" required }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-required-indicator')
      expect(issue).toBeDefined()
      expect(issue?.severity).toBe('info')
    })

    it('should pass for required field with asterisk', () => {
      const doc = parse('page { input label="Email *" required }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-required-indicator')
      expect(issue).toBeUndefined()
    })

    it('should pass for required field with "required" text', () => {
      const doc = parse('page { input label="Email (required)" required }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-required-indicator')
      expect(issue).toBeUndefined()
    })

    it('should not check non-required fields', () => {
      const doc = parse('page { input label="Email" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-required-indicator')
      expect(issue).toBeUndefined()
    })
  })

  describe('form-input-type', () => {
    it('should report warning for email field without email type', () => {
      const doc = parse('page { input label="Email" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-input-type')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('email')
    })

    it('should pass for email field with email type', () => {
      const doc = parse('page { input label="Email" inputType="email" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-input-type')
      expect(issue).toBeUndefined()
    })

    it('should report warning for phone field without tel type', () => {
      const doc = parse('page { input label="Phone Number" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-input-type')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('tel')
    })

    it('should report warning for password field without password type', () => {
      const doc = parse('page { input label="Password" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-input-type')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('password')
    })

    it('should report warning for URL field without url type', () => {
      const doc = parse('page { input label="Website URL" }')
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-input-type')
      expect(issue).toBeDefined()
      expect(issue?.message).toContain('url')
    })
  })

  describe('form-password-confirm', () => {
    it('should report info for password in signup without confirm field', () => {
      const doc = parse(`
        page {
          card title="Sign Up" {
            input label="Email" inputType="email"
            input label="Password" inputType="password"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-password-confirm')
      expect(issue).toBeDefined()
    })

    it('should pass for signup with confirm password field', () => {
      const doc = parse(`
        page {
          card title="Sign Up" {
            input label="Email" inputType="email"
            input label="Password" inputType="password"
            input label="Confirm Password" inputType="password"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-password-confirm')
      expect(issue).toBeUndefined()
    })

    it('should not check login forms', () => {
      const doc = parse(`
        page {
          card title="Login" {
            input label="Email" inputType="email"
            input label="Password" inputType="password"
          }
        }
      `)
      const result = validateUX(doc, { categories: ['form'] })

      const issue = result.issues.find((i) => i.ruleId === 'form-password-confirm')
      expect(issue).toBeUndefined()
    })
  })
})
