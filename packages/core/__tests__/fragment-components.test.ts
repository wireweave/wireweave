import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { parse, render, renderCanvas, renderSite, renderToHtml } from '../src'

const SOURCE = `component ReviewBrand { text "ChangeNotes" }
component Frame(label: string) { card "$label" {
  use ReviewBrand
  slot body
} }
layout shell {
  header { use ReviewBrand }
  slot
}
page "Review" id=review uses=shell {
  use Frame(label="First") { fill body { button "Continue" } }
}
page "Other" id=other { use ReviewBrand }
`

const surfaces = {
  renderToHtml: (source: string) => renderToHtml(parse(source)),
  renderCanvas: (source: string) => renderCanvas(parse(source)).html,
  renderSite: (source: string) => renderSite(parse(source)),
}

describe('local component declarations at legacy public render boundaries', () => {
  for (const [name, output] of Object.entries(surfaces)) {
    it(`${name} emits actual declaration content and deterministic instances`, () => {
      const html = output(SOURCE)
      expect(output(SOURCE)).toBe(html)
      const dom = new JSDOM(html)
      const body = dom.window.document.body
      expect(body.querySelector('[data-wf-component-unresolved]')).toBeNull()
      expect(
        [...body.querySelectorAll('[data-wf-component="ReviewBrand"]')].every(
          (node) => node.textContent?.trim() === 'ChangeNotes',
        ),
      ).toBe(true)
      // Site shares one shell; fragment/canvas render each board independently.
      expect(
        body.querySelectorAll('[data-wf-component="ReviewBrand"]').length,
      ).toBeGreaterThanOrEqual(2)
      expect(body.querySelector('button')?.textContent).toBe('Continue')
      expect(body.textContent).not.toContain('$label')
      const ids = [...body.querySelectorAll('[data-wf-instance]')].map((node) =>
        node.getAttribute('data-wf-instance'),
      )
      expect(new Set(ids).size).toBe(ids.length)
      dom.window.close()
    })

    it.each([
      [
        'duplicate-definition',
        'component Brand { text "one" } component Brand { text "two" } page { use Brand }',
      ],
      ['cyclic-reference', 'component A { use B } component B { use A } page { use A }'],
      ['missing-reference', 'component A { use Missing } page { use A }'],
      [
        'invalid-component-invocation',
        'component A(n: number) { progress value="$n" } page { use A(n="bad") }',
      ],
    ])(`${name} rejects %s rather than emitting unresolved/partial markup`, (code, source) => {
      expect(() => output(source)).toThrow(`[${code}]`)
    })
  }

  it('prepares before variant boards and does not mutate/relink the source', () => {
    const document = parse(
      'component Brand { text "ChangeNotes" } page "Review" id=review variants=[one,two] { use Brand }',
    )
    const before = JSON.stringify(document)
    const first = render(document)
    expect(first.html.match(/>ChangeNotes<\/p>/g)).toHaveLength(2)
    expect(render(document)).toEqual(first)
    expect(JSON.stringify(document)).toBe(before)
  })
})
