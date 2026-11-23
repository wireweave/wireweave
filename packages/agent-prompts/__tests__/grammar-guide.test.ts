import { describe, expect, it } from 'vitest'
import { buildCompactGrammarPrompt, buildGrammarPrompt } from '../src/index.js'
import { parse } from '../../core/src/parser/index.js'

describe('buildGrammarPrompt', () => {
  const prompt = buildGrammarPrompt()

  it('assembles explicit heading guidance with valid DSL while preserving independent contexts', () => {
    const line = prompt.split('\n').find((value) => value.startsWith('- HEADING LEVELS:'))!
    expect(line).toContain('page title with level=1')
    expect(line).toContain('main section/card headings with level=2')
    expect(line).toContain('level=3 and deeper')
    expect(line).toContain('Each separate page starts its own hierarchy')
    expect(line).toContain(
      'dialogs and other independent contexts keep their product-specific hierarchy',
    )
    expect(line).toContain('instead of using title merely to enlarge text')
    const examples = line.slice(line.indexOf('For example: ') + 'For example: '.length).split('; ')
    const code = `page "Heading guide" {\n${examples.join('\n')}\n}`
    const parsed = parse(code)
    expect(parsed.children[0]?.children?.map((node) => node.type)).toEqual([
      'Title',
      'Title',
      'Text',
    ])
    expect(
      parsed.children[0]?.children
        ?.filter((node) => node.type === 'Title')
        .map((node) => node.level),
    ).toEqual([1, 2])
    // Every page can declare its own level-1 title: this is guidance, not a blanket gate.
    expect(() =>
      parse('page "First" { title "First" level=1 } page "Second" { title "Second" level=1 }'),
    ).not.toThrow()
  })

  it('returns a non-empty string', () => {
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(1000)
  })

  it('documents that .wf files may contain MORE THAN ONE top-level page', () => {
    expect(prompt).toMatch(/one OR MORE top-level page declarations/i)
  })

  it('documents the at(x, y) functional attribute on page', () => {
    expect(prompt).toMatch(/at\(x, y\)/)
    expect(prompt).toMatch(/at\(0, 0\)/)
  })

  it('documents the viewport="WxH" attribute on page', () => {
    expect(prompt).toMatch(/viewport="WxH"/)
    expect(prompt).toMatch(/viewport="1280x800"/)
  })

  it('describes the multi-page canvas mode', () => {
    expect(prompt).toMatch(/MULTI-PAGE CANVAS/i)
    expect(prompt).toMatch(/side-by-side on (one|a single) canvas/i)
  })

  it('mentions the renderer modes (render / renderCanvas / renderPage)', () => {
    expect(prompt).toMatch(/render\(doc\)/)
    expect(prompt).toMatch(/renderCanvas\(doc\)/)
    expect(prompt).toMatch(/renderPage\(page\)/)
  })

  it('still forbids nesting page inside page', () => {
    expect(prompt).toMatch(/Do NOT nest page inside page/i)
  })

  it('forbids collapsing multi-view apps into one page with sidebar tabs', () => {
    expect(prompt).toMatch(/separate top-level pages/i)
  })

  it('keeps inputType vs type warning', () => {
    expect(prompt).toMatch(/use inputType, NOT type/i)
  })

  it('documents the four interaction wiring attrs with their semantics', () => {
    expect(prompt).toMatch(/# INTERACTION WIRING/)
    expect(prompt).toMatch(/navigate="Page Title or URL"/)
    expect(prompt).toMatch(/opens="id"/)
    expect(prompt).toMatch(/toggles="id"/)
    expect(prompt).toMatch(/action="name"/)
    expect(prompt).toMatch(/action="none"/)
  })

  it('lists navigate/opens/toggles/action on every clickable component entry', () => {
    for (const entry of [
      'card:',
      'link:',
      'icon:',
      'avatar:',
      'badge:',
      'image:',
      'button:',
      'item:',
    ]) {
      const line = prompt.split('\n').find((l) => l.startsWith(entry))
      expect(line, entry).toMatch(/navigate, opens, toggles, action/)
    }
  })

  it('documents modal/drawer id as the opens/toggles target anchor', () => {
    expect(prompt).toMatch(
      /modal: Dialog\. String arg for title\. Attrs: w, h, id \(opens\/toggles target\)\./,
    )
    expect(prompt).toMatch(
      /drawer: Slide panel\. String arg for title\. Attrs: w, position, id \(opens\/toggles target\)\./,
    )
    expect(prompt).toMatch(/modal "Confirm delete" id="confirm-delete"/)
  })

  it('shows item-level wiring in nav/dropdown block syntax', () => {
    expect(prompt).toMatch(/item "Help" icon="info" opens="help-modal"/)
    expect(prompt).toMatch(/item "Logout" action="logout"/)
  })

  it('requires exactly one interaction per clickable element in the constraints', () => {
    expect(prompt).toMatch(/exactly one interaction attr \(navigate\/opens\/toggles\/action\)/)
  })
})

describe('buildCompactGrammarPrompt', () => {
  const prompt = buildCompactGrammarPrompt()

  it('returns a non-empty string', () => {
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(200)
  })

  it('is strictly shorter than the full prompt', () => {
    expect(prompt.length).toBeLessThan(buildGrammarPrompt().length)
  })

  it('still documents multi-page support', () => {
    expect(prompt).toMatch(/MULTI-PAGE CANVAS/i)
    expect(prompt).toMatch(/ONE OR MORE top-level page declarations/i)
    expect(prompt).toMatch(/at\(x, y\)/)
    expect(prompt).toMatch(/viewport="WxH"/)
  })

  it('still warns about sidebar collapse anti-pattern', () => {
    expect(prompt).toMatch(/separate top-level pages/i)
  })

  it('documents interaction wiring compactly', () => {
    expect(prompt).toMatch(/# INTERACTIONS/)
    expect(prompt).toMatch(/exactly ONE of: navigate="Page Title or URL"/)
    expect(prompt).toMatch(/opens="modal\/drawer id"/)
    expect(prompt).toMatch(/modal\/drawer take id="…" as the opens\/toggles target/)
    expect(prompt).toMatch(/exactly one of navigate\/opens\/toggles\/action/)
  })
})

describe.each([
  ['full', buildGrammarPrompt],
  ['compact', buildCompactGrammarPrompt],
] as const)('%s header text grouping', (_name, buildPrompt) => {
  it('assembles valid stacked and intentional inline header examples', () => {
    const prompt = buildPrompt()
    const line = prompt.split('\n').find((value) => value.startsWith('- HEADER TEXT GROUPS:'))!
    expect(line).toContain('horizontal flex row')
    expect(line).toContain('explicit gap')
    expect(line).toContain('inline headers')
    expect(line).toContain('authored board')
    const examples = line.slice(line.indexOf('Stacked: ') + 'Stacked: '.length).split('; Inline: ')
    expect(examples).toHaveLength(2)
    const groups = examples.map((example) => {
      const doc = parse(`page "Header grouping" viewport="1280x800" { ${example} }`)
      const header = doc.children[0]?.children?.[0]
      expect(header?.type).toBe('Header')
      expect(header?.children).toHaveLength(1)
      const group = header?.children?.[0]
      expect(group?.children?.map((child) => child.type)).toEqual(['Title', 'Text'])
      return group
    })
    expect(groups[0]).toMatchObject({ type: 'Col', gap: 2 })
    expect(groups[1]).toMatchObject({ type: 'Row', gap: 3, wrap: true })
    // This is composition guidance, not a new validator or forced reflow rule.
    expect(() =>
      parse('page "Inline remains legal" { header { title "Title" text "Description" } }'),
    ).not.toThrow()
  })
})
