import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { parse } from '../src/parser'
import { renderSite } from '../src/renderer'

const source = `page "Review" id=review viewport="1280x800" states=[{ name=marked, valueType=boolean, initial=false }] {
  title "Review" level=1
  textarea "Draft" rows=4
  button "Review requirements" opens=check
  button "Mark reviewed locally" on={ event=click, effects=[{ kind=set, state=marked, value=true }] }
  section visibleWhen={ state=marked, equals=true } { text "Local state retained" }
  link "Next" navigate=next
  modal "Check" id=check { button "Close" action=close }
}
page "Next" id=next { link "Back" navigate=review }`
const labels = { label: 'Presentation', fixed: 'Fixed', reflow: 'Reflow' }

describe('opt-in legacy site presentation', () => {
  it('owns a reversible overflow region without changing native tables or authored focus', () => {
    const demo = readFileSync(new URL('./corpus/e2-demo/demo.wf', import.meta.url), 'utf8')
    const dom = new JSDOM(
      renderSite(parse(demo), {
        entry: 'Dashboard',
        viewControls: { ...labels, tableScrollLabel: '표 읽기 "영역"' },
      }),
      { runScripts: 'dangerously', url: 'https://local.test/' },
    )
    const d = dom.window.document
    const table = d.querySelector('table')!
    table.setAttribute('aria-label', '   ')
    const original = table.outerHTML
    const page = table.closest('.wf-page')!
    const geometry = page.getAttribute('style')
    // JSDOM has no layout; only the real browser regression measures overflow.
    vi.spyOn(table, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList)
    let available = 200
    Object.defineProperties(dom.window.HTMLElement.prototype, {
      clientWidth: {
        configurable: true,
        get() {
          return available
        },
      },
      scrollWidth: {
        configurable: true,
        get() {
          return 600
        },
      },
    })
    const reflow = d.querySelector<HTMLButtonElement>('[data-wf-view-choice="reflow"]')!
    const fixed = d.querySelector<HTMLButtonElement>('[data-wf-view-choice="fixed"]')!
    expect(d.querySelector('[data-wf-table-scroll]')).toBeNull()
    reflow.click()
    const region = table.parentElement!
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toBe('표 읽기 "영역"')
    expect(region.tabIndex).toBe(0)
    expect(table.outerHTML).toBe(original)
    available = 800
    reflow.click()
    expect(region.hasAttribute('tabindex')).toBe(false)
    expect(region.hasAttribute('role')).toBe(false)
    available = 200
    reflow.click()
    expect(region.tabIndex).toBe(0)
    fixed.click()
    expect(region.hasAttribute('tabindex')).toBe(false)
    expect(region.hasAttribute('role')).toBe(false)
    expect(region.isConnected).toBe(false)
    expect(table.outerHTML).toBe(original)
    expect(page.getAttribute('style')).toBe(geometry)
    table.setAttribute('tabindex', '-1')
    reflow.click()
    fixed.click()
    expect(table.getAttribute('tabindex')).toBe('-1')
    expect(region.hasAttribute('tabindex')).toBe(false)
    table.parentElement!.classList.add('wf-relative')
    table.removeAttribute('tabindex')
    reflow.click()
    expect(table.parentElement!.hasAttribute('data-wf-table-scroll')).toBe(false)
    dom.window.close()
  })

  it('is absent by default and starts Fixed only when requested', () => {
    const plain = new JSDOM(renderSite(parse(source)))
    expect(plain.window.document.querySelector('[data-wf-view-controls]')).toBeNull()
    expect(plain.window.document.querySelector('[data-wf-view]')).toBeNull()
    const originalPages = [...plain.window.document.querySelectorAll('.wf-page')].map(
      (e) => e.outerHTML,
    )
    plain.window.close()
    const dom = new JSDOM(renderSite(parse(source), { viewControls: labels }))
    expect(dom.window.document.querySelector('.wf-site')?.getAttribute('data-wf-view')).toBe(
      'fixed',
    )
    expect(
      dom.window.document
        .querySelector('[data-wf-view-choice="fixed"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
    expect([...dom.window.document.querySelectorAll('.wf-page')].map((e) => e.outerHTML)).toEqual(
      originalPages,
    )
    dom.window.close()
  })

  it('changes only presentation, retaining the same input, route, overlay and focus lifecycle', () => {
    const dom = new JSDOM(renderSite(parse(source), { viewControls: labels }), {
      runScripts: 'dangerously',
      url: 'https://local.test/',
    })
    const d = dom.window.document
    const field = d.querySelector('textarea')!
    const page = d.querySelector('.wf-page')!
    const frameStyle = page.getAttribute('style')
    const controls = d.querySelector<HTMLElement>('[data-wf-view-controls]')!
    const reflow = controls.querySelector<HTMLButtonElement>('[data-wf-view-choice="reflow"]')!
    const fixed = controls.querySelector<HTMLButtonElement>('[data-wf-view-choice="fixed"]')!
    field.value = 'Exact unsaved draft\n두 번째 줄'
    field.focus()
    field.setSelectionRange(2, 8)
    const stateButton = [...d.querySelectorAll<HTMLButtonElement>('button')].find(
      (e) => e.textContent === 'Mark reviewed locally',
    )!
    stateButton.click()
    const guarded = [...d.querySelectorAll('section')].find((e) =>
      e.textContent?.includes('Local state retained'),
    )!
    expect(guarded.hasAttribute('hidden')).toBe(false)
    reflow.click()
    expect(guarded.hasAttribute('hidden')).toBe(false)
    expect(d.activeElement).toBe(field)
    expect(d.querySelector('textarea')).toBe(field)
    expect(field.selectionStart).toBe(2)
    expect(field.selectionEnd).toBe(8)
    expect(d.querySelector('.wf-site')?.getAttribute('data-wf-view')).toBe('reflow')
    const opener = d.querySelector<HTMLButtonElement>('[data-opens="check"]')!
    opener.focus()
    opener.click()
    expect(controls.hasAttribute('inert')).toBe(true)
    fixed.click() // Even a synthetic background click cannot change mode under a modal.
    expect(d.querySelector('.wf-site')?.getAttribute('data-wf-view')).toBe('reflow')
    d.activeElement!.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(d.activeElement).toBe(opener)
    expect(controls.hasAttribute('inert')).toBe(false)
    d.querySelector<HTMLAnchorElement>('[data-navigate="next"]')!.click()
    expect(dom.window.location.hash).toBe('#next')
    fixed.click()
    expect(dom.window.location.hash).toBe('#next')
    d.querySelector<HTMLAnchorElement>('[data-navigate="review"]')!.click()
    expect(guarded.hasAttribute('hidden')).toBe(false)
    expect(field.value).toBe('Exact unsaved draft\n두 번째 줄')
    expect(d.querySelector('textarea')).toBe(field)
    expect(page.getAttribute('style')).toBe(frameStyle)
    dom.window.close()
  })

  it('excludes every positioned drawing descendant from reflow rules', () => {
    const dom = new JSDOM(
      renderSite(
        parse(`page "Drawing" {
      relative w=480 h=240 {
        row w=360 h=180 anchor=top-left {
          card w=160 h=120 {
            col gap=2 { text "Positioned caption" size=lg button "Drawing action" }
          }
          card w=120 h=100 { text "Sibling" }
        }
      }
    }`),
        { viewControls: labels },
      ),
    )
    const d = dom.window.document
    d.querySelector('.wf-site')!.setAttribute('data-wf-view', 'reflow')
    const rules = [...d.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule): rule is CSSStyleRule => 'selectorText' in rule)
      .filter((rule) => rule.selectorText.includes('[data-wf-view="reflow"]'))
    expect(rules.length).toBeGreaterThan(5)
    for (const node of d.querySelectorAll('.wf-relative, .wf-relative *')) {
      for (const rule of rules) expect(node.matches(rule.selectorText)).toBe(false)
    }
    dom.window.close()
  })

  it('escapes caller-localized names with a custom prefix and refuses blank labels', () => {
    const dom = new JSDOM(
      renderSite(parse(source), {
        classPrefix: 'demo',
        viewControls: {
          label: '표현 "<&',
          fixed: '고정 <',
          reflow: '재배치 &',
        },
      }),
    )
    expect(dom.window.document.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      '표현 "<&',
    )
    expect(dom.window.document.querySelector('.demo-view-controls')?.textContent).toBe(
      '고정 <재배치 &',
    )
    expect(() => renderSite(parse(source), { viewControls: { ...labels, reflow: ' ' } })).toThrow(
      'nonblank',
    )
    dom.window.close()
  })
})
