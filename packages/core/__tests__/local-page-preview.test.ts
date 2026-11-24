import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { renderLocalPagePreview } from '../src/renderer/local-preview'

const source = `page "Review" id=home viewport="1280x800" {
  main { title "Review" level=1 textarea "Draft" value="Unsaved" button "Review" opens=review
    modal "Review draft" id=review { text "Local only" input "Note" button "Cancel" action=close }
  }
}`

describe('bounded local Page execution profile', () => {
  it('binds exact emitted fixed runtime and reviewed input with deterministic digests', () => {
    const result = renderLocalPagePreview(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(renderLocalPagePreview(source)).toEqual(result)
    const scripts = [...result.html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    expect(scripts).toHaveLength(1)
    const runtime = scripts[0][1]
    expect(result.runtimeDigest).toBe(
      'sha256:' + createHash('sha256').update(runtime).digest('hex'),
    )
    expect(result.html).toContain(
      `script-src 'sha256-${createHash('sha256').update(runtime).digest('base64')}'`,
    )
    expect(result.inputDigest).toBe('sha256:' + createHash('sha256').update(source).digest('hex'))
    expect(result.htmlDigest).toBe(
      'sha256:' + createHash('sha256').update(result.html).digest('hex'),
    )
    expect(result.sandbox).toBe('allow-scripts')
    expect(result.html.indexOf('Content-Security-Policy')).toBeLessThan(
      result.html.indexOf('<style>'),
    )
    expect(result.html).not.toMatch(
      /\b(?:fetch|XMLHttpRequest|postMessage|localStorage|sessionStorage|indexedDB|eval)\b/,
    )
    expect(result.html).not.toMatch(/\s(?:href|src|action|on[a-z]+)=/)
  })

  it.each([
    'page "A" {} page "B" {}',
    'layout shell { slot } page "A" uses=shell {}',
    'page { link "External" href="https://example.invalid" }',
    'page { image src="https://example.invalid/image" }',
    'page { button "Submit" action=submit }',
    'page { button "Unknown" }',
    'page { button "Missing" opens=absent }',
    'page { button "Wrong" opens=review text "Not a modal" }',
    'page { button "Open" opens=review modal "A" id=review { button "Close" action=close } modal "B" id=review {} }',
    'page { button "Open" opens=review modal "A" id=review { button "Open again" opens=review button "Close" action=close } }',
    'page { button "Close outside" action=close }',
    'page id=review { button "Open" opens=review modal "Review" id=review { button "Close" action=close } }',
    'page { button "Open" opens=review modal "A" id=review { text "No close" } }',
    'page { input "File" type=file }',
    'page { button "Open" opens=review toggles=other modal "A" id=review { button "Close" action=close } }',
    'page { button "Typed" on={click:{kind=navigate,target=other}} }',
  ])('rejects unsupported closure/effect or unresolved targets: %s', (code) => {
    const result = renderLocalPagePreview(code)
    expect(result.ok).toBe(false)
    expect(result).not.toHaveProperty('html')
  })

  it('escapes authored text without allowing authored markup or script', () => {
    const result = renderLocalPagePreview(
      'page { text "<script>not executable</script>" textarea "Draft" value="<b>text</b>" }',
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.html).toContain('&lt;script&gt;')
      expect(result.html).not.toContain('<b>text</b>')
    }
  })

  it('bounds source, tree and viewport; invalid input returns a diagnostic only', () => {
    expect(renderLocalPagePreview('x'.repeat(64 * 1024 + 1))).toEqual({
      ok: false,
      diagnostic: 'limit',
    })
    expect(renderLocalPagePreview('page { ' + 'text "x" '.repeat(1001) + '}')).toEqual({
      ok: false,
      diagnostic: 'limit',
    })
    expect(renderLocalPagePreview('page viewport="9000x800" {}')).toEqual({
      ok: false,
      diagnostic: 'limit',
    })
    expect(renderLocalPagePreview('not DSL')).toEqual({ ok: false, diagnostic: 'invalid-input' })
  })
})
