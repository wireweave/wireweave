import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse } from '../src/parser'
import { renderSite } from '../src/renderer'

const source = `page "Home" id=home {
  button "Open review" opens=review
  button "Open review" opens=review
  modal "Review" id=review {
    button "Unavailable" disabled
    button "Close review" action=close
    button "Open nested" opens=nested
    link "Next" navigate=next
  }
  modal "Nested" id=nested { button "Close nested" action=close }
}
page "Next" id=next { button "Next control" }
`
function mount() {
  const dom = new JSDOM(renderSite(parse(source)), {
    runScripts: 'dangerously',
    url: 'https://local.test/',
  })
  const document = dom.window.document
  const openers = document.querySelectorAll<HTMLButtonElement>('[data-opens="review"]')
  const review = document.querySelector<HTMLElement>('[id$="-review"]')!
  const close = review.querySelector<HTMLButtonElement>('[data-action="close"]')!
  const escape = () =>
    document.activeElement!.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  return { dom, document, openers, review, close, escape }
}

describe('legacy renderSite modal focus lifecycle', () => {
  it('enters the dialog and returns to the actual opener for Close and Escape, even with duplicate labels', () => {
    const { dom, document, openers, review, close, escape } = mount()
    for (const opener of openers) {
      opener.focus()
      opener.click()
      expect(document.activeElement).toBe(close)
      close.click()
      expect(document.activeElement).toBe(opener)
      opener.click()
      escape()
      expect(review.classList.contains('wf-closed')).toBe(true)
      expect(document.activeElement).toBe(opener)
    }
    dom.window.close()
  })
  it('preserves the outer context when Escape closes a nested dialog', () => {
    const { dom, document, openers, review, close, escape } = mount()
    openers[0].click()
    const nestedOpener = review.querySelector<HTMLButtonElement>('[data-opens="nested"]')!
    nestedOpener.click()
    expect(document.activeElement?.textContent).toBe('Close nested')
    escape()
    expect(document.activeElement).toBe(nestedOpener)
    expect(review.classList.contains('wf-closed')).toBe(false)
    close.click()
    expect(document.activeElement).toBe(openers[0])
    dom.window.close()
  })
  it.each(['removed', 'disabled', 'hidden'] as const)(
    'does not grab focus when the opener is %s',
    (state) => {
      const { dom, document, openers, close } = mount()
      const opener = openers[0]
      opener.click()
      if (state === 'removed') opener.remove()
      if (state === 'disabled') opener.disabled = true
      if (state === 'hidden') opener.hidden = true
      close.click()
      expect(document.activeElement).not.toBe(opener)
      dom.window.close()
    },
  )
  it('does not duplicate the focus record on repeated open and restores on backdrop dismissal', () => {
    const { dom, document, openers, review, escape } = mount()
    openers[1].click()
    openers[1].click()
    review.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    expect(document.activeElement).toBe(openers[1])
    const other = openers[0]
    other.focus()
    escape()
    expect(document.activeElement).toBe(other)
    dom.window.close()
  })
  it('focuses the dialog itself when it has no enabled focusable child', () => {
    const dom = new JSDOM(
      renderSite(
        parse(
          'page "Home" { button "Open" opens=empty modal "Empty" id=empty { text "Read only" } }',
        ),
      ),
      { runScripts: 'dangerously' },
    )
    const document = dom.window.document
    const opener = document.querySelector<HTMLButtonElement>('button')!
    opener.click()
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')
    document.activeElement!.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(document.activeElement).toBe(opener)
    dom.window.close()
  })
  it('does not restore the previous screen opener after navigation', () => {
    const { dom, document, openers, review, escape } = mount()
    openers[0].click()
    review.querySelector<HTMLAnchorElement>('[data-navigate="next"]')!.click()
    const next = document.querySelector<HTMLButtonElement>('[data-screen="1"] button')!
    next.focus()
    escape()
    expect(document.activeElement).toBe(next)
    expect(document.querySelector('.wf-site')?.getAttribute('data-current-screen')).toBe('1')
    dom.window.close()
  })
})
