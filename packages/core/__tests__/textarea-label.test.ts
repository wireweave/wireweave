import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse, render, renderSite } from '../src'

describe('textarea native label association', () => {
  it('associates the escaped authored label without using its placeholder as a name', () => {
    const { html } = render(
      parse('page { textarea "Draft & <review>" placeholder="Not the name" }'),
    )
    const document = new JSDOM(html).window.document
    const control = document.querySelector('textarea')!
    expect(control.labels).toHaveLength(1)
    expect(control.labels[0].querySelector('span')!.textContent).toBe('Draft & <review>')
    expect(control.labels[0].control).toBe(control)
    expect(html).toContain('Draft &amp; &lt;review&gt;')
    expect(control.getAttribute('aria-label')).toBeNull()
    expect(control.id).toBe('')
  })

  it('keeps each repeated idless control paired only with its own visible label', () => {
    const { html } = render(parse('page { repeat 3 { textarea "Draft" } }'))
    const document = new JSDOM(html).window.document
    const controls = [...document.querySelectorAll('textarea')]
    expect(controls).toHaveLength(3)
    for (const control of controls) {
      expect(control.labels).toHaveLength(1)
      expect(control.labels[0].control).toBe(control)
    }
    expect(new Set(controls.map((control) => control.labels[0])).size).toBe(3)
  })

  it('preserves scoped authored identity across pages without introducing label ids', () => {
    const source =
      'page "One" { textarea "First" id=draft } page "Two" { textarea "Second" id=draft }'
    const document = new JSDOM(renderSite(parse(source))).window.document
    const controls = [...document.querySelectorAll('textarea')]
    expect(controls).toHaveLength(2)
    for (const control of controls) {
      expect(control.labels).toHaveLength(1)
      expect(control.labels[0].control).toBe(control)
    }
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
