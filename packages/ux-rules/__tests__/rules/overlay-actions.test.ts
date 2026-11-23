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
