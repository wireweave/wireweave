import { describe, expect, it } from 'vitest'
import { parse } from '@wireweave/core'
import { getChildren, validateUX } from '../../src'

const issues = (code: string) => validateUX(parse(code)).issues.map((issue) => issue.ruleId)

describe('authored overlay controls', () => {
  it.each(['opens', 'toggles'])(
    'recognizes a nonblank %s target as a defined button action',
    (attribute) => {
      expect(
        issues(
          `page { button "Review requirements" ${attribute}=requirements modal "Requirements" id=requirements { button "Return to draft" action=close } }`,
        ),
      ).not.toContain('interaction-button-action')
    },
  )
  it.each(['', 'opens=""', 'toggles=" "'])(
    'still warns for missing or blank overlay actions (%s)',
    (attribute) => {
      expect(issues(`page { button "Review requirements" ${attribute} }`)).toContain(
        'interaction-button-action',
      )
    },
  )
  it('recognizes an enabled authored close action within a layout group', () => {
    expect(
      issues('page { modal "Requirements" { col { button "Return to draft" action=close } } }'),
    ).not.toContain('usability-modal-close')
  })
  it.each(['action=none', 'action=close disabled'])(
    'does not credit an unrelated or disabled action (%s)',
    (attribute) => {
      expect(
        issues(`page { modal "Requirements" { col { button "Return to draft" ${attribute} } } }`),
      ).toContain('usability-modal-close')
    },
  )
})

describe('overlay resolution boundaries', () => {
  it.each([
    'text "Not an overlay" id=requirements',
    'modal "Other" id=other { text "Other" }',
    'modal "One" id=requirements {} modal "Two" id=requirements {}',
    'modal "Outer" id=outer { modal "Nested" id=requirements {} }',
    'modal "Outer" id=outer { modal "Nested" id=requirements {} } modal "Direct" id=requirements {}',
    'col visibleWhen=unproven { modal "Hidden" id=requirements {} } modal "Direct" id=requirements {}',
  ])('does not clear the warning for an invalid local target (%s)', (content) => {
    expect(issues(`page { button "Review" opens=requirements ${content} }`)).toContain(
      'interaction-button-action',
    )
  })
  it('does not resolve an overlay from a sibling page', () => {
    expect(
      issues(
        'page "First" { modal "Requirements" id=requirements {} } page "Second" { button "Review" opens=requirements }',
      ),
    ).toContain('interaction-button-action')
  })
  it('resolves the second page’s own overlay rather than the first page root', () => {
    expect(
      issues(
        'page "First" { text "First" } page "Second" { button "Review" opens=requirements modal "Requirements" id=requirements { button "Return" action=close } }',
      ),
    ).not.toContain('interaction-button-action')
  })
  it('does not count text with an action or a nested modal close as the parent dismissal', () => {
    const result = validateUX(
      parse(
        'page { modal "Outer" { text "Return" action=close modal "Inner" { button "Return" action=close } } }',
      ),
    )
    expect(result.issues.filter((issue) => issue.ruleId === 'usability-modal-close')).toHaveLength(
      1,
    )
  })
  it('does not count a close control inside a conditional branch', () => {
    const doc = parse('page { modal "Review" { col { button "Return" action=close } } }')
    const modal = getChildren(doc.children[0])[0]
    Object.assign(getChildren(modal)[0], { visibleWhen: 'unproven' })
    expect(validateUX(doc).issues.map((issue) => issue.ruleId)).toContain('usability-modal-close')
  })
})

describe('overlay priority and validation-local indexing', () => {
  it.each(['opens=wrong toggles=good', 'opens=missing toggles=good'])(
    'does not credit a secondary toggle after nonblank opens (%s)',
    (attributes) => {
      expect(
        issues(
          `page { button "Review" ${attributes} text "Not an overlay" id=wrong modal "Good" id=good { button "Return" action=close } }`,
        ),
      ).toContain('interaction-button-action')
    },
  )
  it.each([
    'toggles=good',
    'opens="" toggles=good',
    'opens=" " toggles=good',
    'opens=good toggles=missing',
  ])('uses the effective overlay intent (%s)', (attributes) => {
    expect(
      issues(
        `page { button "Review" ${attributes} modal "Good" id=good { button "Return" action=close } }`,
      ),
    ).not.toContain('interaction-button-action')
  })
  it('indexes a page once rather than walking it for every valid button', () => {
    const countReads = (count: number) => {
      const doc = parse(
        `page { ${'button "Review" opens=good '.repeat(count)} modal "Good" id=good { button "Return" action=close } }`,
      )
      const modal = getChildren(doc.children[0]).find((node) => node.type === 'Modal')!
      const original = JSON.stringify(doc)
      let reads = 0
      Object.defineProperty(modal, 'id', {
        enumerable: true,
        configurable: true,
        get: () => {
          reads++
          return 'good'
        },
      })
      const result = validateUX(doc, { categories: ['interaction'] })
      const measured = reads
      expect(result.issues).toHaveLength(0)
      expect(JSON.stringify(doc)).toBe(original)
      return measured
    }
    expect(countReads(250)).toBeLessThanOrEqual(countReads(10) + 2)
  })
  it('rebuilds the index on the next validation after source changes', () => {
    const doc = parse(
      'page { button "Review" opens=good modal "Good" id=good { button "Return" action=close } }',
    )
    expect(validateUX(doc).issues.map((issue) => issue.ruleId)).not.toContain(
      'interaction-button-action',
    )
    const modal = getChildren(doc.children[0]).find((node) => node.type === 'Modal')!
    Object.assign(modal, { id: 'changed' })
    expect(validateUX(doc).issues.map((issue) => issue.ruleId)).toContain(
      'interaction-button-action',
    )
  })
})
