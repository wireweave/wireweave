import { describe, expect, it } from 'vitest'
import { buildCompactGrammarPrompt, buildGrammarPrompt } from '../src/index.js'

describe('buildGrammarPrompt', () => {
  const prompt = buildGrammarPrompt()

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
})
