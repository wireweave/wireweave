import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse, render, renderSite } from '../src'

const fields = [
  ['input "Name & <review>"', 'input'],
  ['select "Name & <review>" ["X", "Threads"]', 'select'],
  ['slider "Name & <review>" min=0 max=100 value=40', 'input[type=range]'],
] as const

describe('single-control native field labels', () => {
  it.each(fields)('associates escaped caption for %s', (source, selector) => {
    const { html } = render(parse(`page { ${source} }`))
    const document = new JSDOM(html).window.document
    const control = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!
    expect(control.labels).toHaveLength(1)
    expect(control.labels![0].control).toBe(control)
    expect(control.labels![0].querySelector('span')!.textContent).toBe('Name & <review>')
    expect(html).toContain('Name &amp; &lt;review&gt;')
    expect(control.id).toBe('')
  })

  it.each(fields)(
    'keeps repeated fields and scoped authored ids independent for %s',
    (source, selector) => {
      const html = renderSite(
        parse(
          `page "One" { ${source} id=field repeat 2 { ${source} } } page "Two" { ${source} id=field }`,
        ),
      )
      const document = new JSDOM(html).window.document
      const controls = [
        ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(selector),
      ]
      expect(controls).toHaveLength(4)
      expect(new Set(controls.map((control) => control.labels![0])).size).toBe(4)
      for (const control of controls) expect(control.labels![0].control).toBe(control)
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id)
      expect(new Set(ids).size).toBe(ids.length)
    },
  )

  it('leaves the icon-adorned wrapper separate and adds no enclosing native label', () => {
    const { html } = render(parse('page { input "Search" icon="search" }'))
    const document = new JSDOM(html).window.document
    expect(document.querySelector('input')!.closest('label')).toBeNull()
    expect(document.querySelector('.wf-field')!.tagName).toBe('DIV')
    expect(document.querySelector('.wf-input-wrapper svg')).not.toBeNull()
  })
})
