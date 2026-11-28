import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import { renderLocalPagePreview } from './index'

const fixture = (viewport: string) => `page "Release review" viewport="${viewport}" {
  main {
    title "Release review"
    input "Outer reference" placeholder="Reference"
    button "Open review note" opens=reviewNote
    modal "Review decision note" id=reviewNote w=440px {
      textarea "Explain the review decision and note what still needs follow-up" rows=4
      button "Close" action=close
    }
  }
}`

it.each(['800x600', '1280x800'])(
  'retains page styles in the native modal at %s without replacing the page',
  (viewport) => {
    const output = renderLocalPagePreview(fixture(viewport))
    expect(output.ok).toBe(true)
    if (!output.ok) throw Error(output.diagnostic)
    const { window } = new JSDOM(output.html, {
      runScripts: 'dangerously',
      beforeParse(window) {
        // JSDOM lacks the native dialog/focus geometry implementation.
        window.HTMLDialogElement.prototype.showModal = function () {
          this.open = true
        }
        window.HTMLDialogElement.prototype.close = function () {
          this.open = false
        }
        Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', {
          value: () => [{ width: 1, height: 1 }],
        })
      },
    })
    const { document } = window
    const dialog = document.querySelector('dialog')!
    const page = document.querySelector('.wf-page')!
    const input = document.querySelector('input')!
    const note = dialog.querySelector('textarea')!
    const opener = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Open review note',
    )!
    const closer = dialog.querySelector('button')!

    expect(dialog.closest('.wf-page') === page).toBe(true)
    expect(input.closest('.wf-page') === page).toBe(true)
    expect(note.matches('.wf-page :where(textarea)')).toBe(true)
    expect(dialog.getAttribute('aria-label')).toBe('Review decision note')
    expect(dialog.open).toBe(false)
    opener.click()
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(note)
    note.value = 'Keep this local edit'
    closer.click()
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(opener)
    opener.click()
    expect(note.value).toBe('Keep this local edit')
    const cancel = new window.Event('cancel', { cancelable: true })
    expect(dialog.dispatchEvent(cancel)).toBe(false)
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(opener)
    window.close()
  },
)
