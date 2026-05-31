/**
 * UX Rules Main API Tests
 */

import { describe, it, expect } from 'vitest'
import { parse } from '@wireweave/core'
import {
  validateUX,
  isUXValid,
  getUXIssues,
  getUXScore,
  formatUXResult,
  allRules,
  getRulesForCategories,
  REFERENCE_COMPLEXITY,
} from '../src'

describe('validateUX', () => {
  it('should return valid result for simple page', () => {
    const doc = parse('page { text "Hello" }')
    const result = validateUX(doc)

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('issues')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('severityCounts')
  })

  it('should detect accessibility issue for input without label', () => {
    // Input without label should report warning (has placeholder)
    const doc = parse('page { input placeholder="Enter name" }')
    const result = validateUX(doc)

    // Should have issues including input label
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues.some((i) => i.ruleId === 'a11y-input-label')).toBe(true)
  })

  it('should report error for input without label or placeholder', () => {
    // Input without label or placeholder should report error
    const doc = parse('page { input }')
    const result = validateUX(doc)

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((i) => i.ruleId === 'a11y-input-label' && i.severity === 'error'),
    ).toBe(true)
  })

  it('should return high score for well-formed page', () => {
    const doc = parse(`
      page {
        card {
          title "Welcome"
          text "Hello"
          button "Click me" primary
        }
      }
    `)
    const result = validateUX(doc)

    // High score (may have minor info-level issues)
    expect(result.score).toBeGreaterThanOrEqual(90)
  })

  it('should filter by category', () => {
    const doc = parse('page { input placeholder="Test" }')
    const result = validateUX(doc, { categories: ['form'] })

    // Should only have form category issues, not accessibility
    const hasAccessibilityIssue = result.issues.some((i) => i.category === 'accessibility')
    expect(hasAccessibilityIssue).toBe(false)
  })

  it('should filter by minimum severity', () => {
    const doc = parse('page { input placeholder="Test" }')

    const allIssues = validateUX(doc, { minSeverity: 'info' })
    const warningsAndErrors = validateUX(doc, { minSeverity: 'warning' })
    const errorsOnly = validateUX(doc, { minSeverity: 'error' })

    expect(allIssues.issues.length).toBeGreaterThanOrEqual(warningsAndErrors.issues.length)
    expect(warningsAndErrors.issues.length).toBeGreaterThanOrEqual(errorsOnly.issues.length)
  })

  it('should respect maxIssues limit', () => {
    const doc = parse(`
      page {
        input placeholder="1"
        input placeholder="2"
        input placeholder="3"
        input placeholder="4"
        input placeholder="5"
      }
    `)
    const result = validateUX(doc, { maxIssues: 2 })

    expect(result.issues.length).toBeLessThanOrEqual(2)
  })

  it('should support custom rules', () => {
    const customRule = {
      id: 'custom-test-rule',
      category: 'usability' as const,
      severity: 'info' as const,
      name: 'Custom test',
      description: 'Test rule',
      appliesTo: ['Text'],
      check: () => ({
        ruleId: 'custom-test-rule',
        category: 'usability' as const,
        severity: 'info' as const,
        message: 'Custom issue',
        description: 'Custom description',
        suggestion: 'Custom suggestion',
        path: 'test',
        nodeType: 'Text',
      }),
    }

    const doc = parse('page { text "Hello" }')
    const result = validateUX(doc, { customRules: [customRule] })

    expect(result.issues.some((i) => i.ruleId === 'custom-test-rule')).toBe(true)
  })

  it('should support disabling rules', () => {
    const doc = parse('page { input placeholder="Test" }')

    const withRule = validateUX(doc)
    const withoutRule = validateUX(doc, { disabledRules: ['a11y-input-label'] })

    const hasRuleInWith = withRule.issues.some((i) => i.ruleId === 'a11y-input-label')
    const hasRuleInWithout = withoutRule.issues.some((i) => i.ruleId === 'a11y-input-label')

    expect(hasRuleInWith).toBe(true)
    expect(hasRuleInWithout).toBe(false)
  })

  it('should calculate score correctly', () => {
    // Simple page (may have minor info issues like no primary CTA)
    const simpleDoc = parse('page { text "Hello" }')
    const simpleResult = validateUX(simpleDoc)
    expect(simpleResult.score).toBeGreaterThanOrEqual(90)

    // Page with error (input without label)
    const errorDoc = parse('page { input }')
    const errorResult = validateUX(errorDoc)
    expect(errorResult.score).toBeLessThan(simpleResult.score)
  })

  it('should provide severity counts', () => {
    const doc = parse('page { input placeholder="Test" }')
    const result = validateUX(doc)

    expect(result.severityCounts).toHaveProperty('errors')
    expect(result.severityCounts).toHaveProperty('warnings')
    expect(result.severityCounts).toHaveProperty('info')
    expect(typeof result.severityCounts.errors).toBe('number')
  })

  it('exposes achieved complexity and the raw total-penalty score', () => {
    const result = validateUX(parse('page { text "Hello" }'))

    expect(result).toHaveProperty('rawScore')
    expect(result).toHaveProperty('complexity')
    expect(typeof result.complexity.score).toBe('number')
    expect(typeof result.complexity.level).toBe('string')
    expect(result.complexity.score).toBeGreaterThanOrEqual(1)
    expect(result.complexity.score).toBeLessThanOrEqual(10)
  })

  it('never lets normalization make the score worse than the raw score', () => {
    // Damping only ever reduces the soft penalty, so score >= rawScore always.
    for (const src of [
      'page { text "Hello" }',
      'page { input }',
      'page { card { input placeholder="a" button "Submit" primary } }',
    ]) {
      const result = validateUX(parse(src))
      expect(result.score).toBeGreaterThanOrEqual(result.rawScore)
    }
  })

  it('does not damp at or below the reference complexity (simple screens score as raw)', () => {
    const result = validateUX(parse('page { input placeholder="Email" }'))
    expect(result.complexity.score).toBeLessThanOrEqual(REFERENCE_COMPLEXITY)
    expect(result.score).toBe(result.rawScore)
  })

  it('never discounts hard errors (score <= 100 - errors*10)', () => {
    // Errors are absolute: complexity damping must not soften them.
    const result = validateUX(parse('page { input }'))
    expect(result.severityCounts.errors).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(100 - result.severityCounts.errors * 10)
  })

  it('does not punish scale: a genuinely complex doc damps its soft penalty', () => {
    // A dense dashboard: nav-heavy sidebar plus many stat cards, each carrying a
    // button. Soft (warning/info) penalty is a per-element heuristic, so a screen
    // this size accumulates more of it than a trivial page — yet the design is
    // intent-fitting, not defective. Once core `analyze()` rates the document
    // above the reference complexity, damping must engage and lift the normalized
    // score back above the raw total-penalty score.
    const stat = (label: string, val: string) => `card p=4 {
      text "${label}" muted
      title "${val}" level=3
      button "View" onClick="open"
    }`
    const group = (n: number) => `section "Group ${n}" {
      row gap=4 {
        ${stat('Users', '1,234')}
        ${stat('Revenue', '$12K')}
        ${stat('Sessions', '567')}
      }
    }`
    // Leading whitespace is insignificant in the DSL; dedent so the nested
    // template literals parse cleanly.
    const raw = `page "Dashboard" width=1280 height=900 {
      row {
        sidebar w=240px {
          section "Menu" {
            nav ["Home", "Reports", "Users", "Settings", "Billing", "Logs", "Help"] vertical active=0
          }
        }
        main p=6 {
          title "Analytics Overview" level=2
          ${[1, 2, 3, 4].map(group).join('\n')}
        }
      }
    }`.replace(/^[ \t]+/gm, '')
    const result = validateUX(parse(raw))

    expect(result.complexity.score).toBeGreaterThan(REFERENCE_COMPLEXITY)
    expect(result.score).toBeGreaterThanOrEqual(result.rawScore)
    if (result.severityCounts.warnings + result.severityCounts.info > 0 && result.rawScore > 0) {
      expect(result.score).toBeGreaterThan(result.rawScore)
    }
  })
})

describe('isUXValid', () => {
  it('should return true for valid page', () => {
    const doc = parse('page { text "Hello" }')
    expect(isUXValid(doc)).toBe(true)
  })

  it('should return false for page with errors', () => {
    const doc = parse('page { input }')
    expect(isUXValid(doc)).toBe(false)
  })
})

describe('getUXIssues', () => {
  it('should return array of issues', () => {
    const doc = parse('page { input placeholder="Test" }')
    const issues = getUXIssues(doc)

    expect(Array.isArray(issues)).toBe(true)
    expect(issues.length).toBeGreaterThan(0)
  })

  it('should respect options', () => {
    const doc = parse('page { input placeholder="Test" }')
    const issues = getUXIssues(doc, { minSeverity: 'error' })

    // All returned issues should be errors
    expect(issues.every((i) => i.severity === 'error')).toBe(true)
  })
})

describe('getUXScore', () => {
  it('should return number between 0 and 100', () => {
    const doc = parse('page { text "Hello" }')
    const score = getUXScore(doc)

    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should return high score for simple page', () => {
    // Button needs an action to avoid interaction-button-action warning
    const doc = parse(
      'page { title "Welcome" text "Hello" button "Action" primary onClick="handleClick" }',
    )
    const score = getUXScore(doc)
    expect(score).toBe(100)
  })
})

describe('formatUXResult', () => {
  it('should return formatted string', () => {
    const doc = parse('page { text "Hello" }')
    const result = validateUX(doc)
    const formatted = formatUXResult(result)

    expect(typeof formatted).toBe('string')
    expect(formatted).toContain('UX Validation Score')
    expect(formatted).toContain('Status')
  })

  it('should include issues in output', () => {
    const doc = parse('page { input }')
    const result = validateUX(doc)
    const formatted = formatUXResult(result)

    expect(formatted).toContain('Issues')
    expect(formatted).toContain('a11y-input-label')
  })
})

describe('allRules', () => {
  it('should export all rules', () => {
    expect(Array.isArray(allRules)).toBe(true)
    expect(allRules.length).toBeGreaterThan(0)
  })

  it('should have valid rule structure', () => {
    for (const rule of allRules) {
      expect(rule).toHaveProperty('id')
      expect(rule).toHaveProperty('category')
      expect(rule).toHaveProperty('severity')
      expect(rule).toHaveProperty('name')
      expect(rule).toHaveProperty('description')
      expect(rule).toHaveProperty('appliesTo')
      expect(rule).toHaveProperty('check')
      expect(typeof rule.check).toBe('function')
    }
  })
})

describe('getRulesForCategories', () => {
  it('should return all rules for empty array', () => {
    const rules = getRulesForCategories([])
    expect(rules.length).toBe(allRules.length)
  })

  it('should filter by category', () => {
    const accessibilityRules = getRulesForCategories(['accessibility'])

    expect(accessibilityRules.length).toBeGreaterThan(0)
    expect(accessibilityRules.every((r) => r.category === 'accessibility')).toBe(true)
  })

  it('should support multiple categories', () => {
    const rules = getRulesForCategories(['accessibility', 'form'])

    expect(rules.length).toBeGreaterThan(0)
    expect(rules.every((r) => r.category === 'accessibility' || r.category === 'form')).toBe(true)
  })
})
