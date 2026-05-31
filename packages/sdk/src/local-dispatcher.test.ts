import { describe, expect, it } from 'vitest'

import { localToolNames } from './generated/tools.js'
import {
  LOCAL_DISPATCH_TOOL_NAMES,
  isLocalDispatchTool,
  localDispatch,
} from './local-dispatcher.js'

const VALID_SOURCE = 'page Home {\n  text "Hello"\n}\n'
const VALID_SOURCE_2 = 'page Home {\n  text "World"\n}\n'
const INVALID_SOURCE = 'page { not valid syntax @@@'

function parsePayload(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>
}

describe('LOCAL_DISPATCH_TOOL_NAMES / isLocalDispatchTool', () => {
  it('is the same instance as generated localToolNames (DB single source of truth)', () => {
    expect(LOCAL_DISPATCH_TOOL_NAMES).toBe(localToolNames)
  })

  it('matches the generated public local tool set', () => {
    expect(new Set(LOCAL_DISPATCH_TOOL_NAMES)).toEqual(new Set(localToolNames))
  })

  it('isLocalDispatchTool identifies registered tools', () => {
    expect(isLocalDispatchTool('wireweave_parse')).toBe(true)
    expect(isLocalDispatchTool('wireweave_guide')).toBe(false)
    expect(isLocalDispatchTool('nonexistent')).toBe(false)
  })
})

describe('localDispatch: unknown tool', () => {
  it('returns isError for unknown tool name', () => {
    const result = localDispatch('wireweave_unknown', {})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown local tool')
  })
})

describe('localDispatch: wireweave_parse', () => {
  it('returns ast + pageCount for valid source', () => {
    const result = localDispatch('wireweave_parse', { source: VALID_SOURCE })
    expect(result.isError).toBeUndefined()
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      pageCount: number
      ast: { children: unknown[] }
    }
    expect(payload.success).toBe(true)
    expect(payload.pageCount).toBe(1)
    expect(payload.ast.children).toHaveLength(1)
  })

  it('returns success=false for invalid source', () => {
    const result = localDispatch('wireweave_parse', { source: INVALID_SOURCE })
    expect(result.isError).toBeUndefined()
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      error: string
    }
    expect(payload.success).toBe(false)
    expect(typeof payload.error).toBe('string')
  })

  it('returns isError when source is missing', () => {
    const result = localDispatch('wireweave_parse', {})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('source is required')
  })
})

describe('localDispatch: wireweave_validate', () => {
  it('returns valid=true for valid source (non-strict default)', () => {
    const result = localDispatch('wireweave_validate', { source: VALID_SOURCE })
    const payload = parsePayload(result.content[0].text) as {
      valid: boolean
      pageCount: number
      componentCount: number
    }
    expect(payload.valid).toBe(true)
    expect(payload.pageCount).toBe(1)
    expect(typeof payload.componentCount).toBe('number')
  })

  it('honors strict=true and reports strictErrors when present', () => {
    const result = localDispatch('wireweave_validate', {
      source: VALID_SOURCE,
      strict: true,
    })
    const payload = parsePayload(result.content[0].text) as {
      valid: boolean
      strictErrors?: string[]
    }
    expect(typeof payload.valid).toBe('boolean')
    if (payload.valid === false) {
      expect(Array.isArray(payload.strictErrors)).toBe(true)
    }
  })

  it('returns valid=false for unparseable source', () => {
    const result = localDispatch('wireweave_validate', { source: INVALID_SOURCE })
    const payload = parsePayload(result.content[0].text) as {
      valid: boolean
      error: string
    }
    expect(payload.valid).toBe(false)
    expect(typeof payload.error).toBe('string')
  })
})

describe('localDispatch: wireweave_render_html_code', () => {
  it('returns html + css for default (non-full) render', () => {
    const result = localDispatch('wireweave_render_html_code', {
      source: VALID_SOURCE,
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      html: string
      css?: string
    }
    expect(payload.success).toBe(true)
    expect(typeof payload.html).toBe('string')
    expect(typeof payload.css).toBe('string')
  })

  it('returns full document when fullDocument=true', () => {
    const result = localDispatch('wireweave_render_html_code', {
      source: VALID_SOURCE,
      fullDocument: true,
      theme: 'dark',
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      html: string
      css?: string
    }
    expect(payload.success).toBe(true)
    expect(payload.html).toContain('<html')
    expect(payload.css).toBeUndefined()
  })

  it('returns success=false on parse error', () => {
    const result = localDispatch('wireweave_render_html_code', {
      source: INVALID_SOURCE,
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      error: string
    }
    expect(payload.success).toBe(false)
    expect(typeof payload.error).toBe('string')
  })
})

describe('localDispatch: wireweave_validate_ux', () => {
  it('returns ux validation result', () => {
    const result = localDispatch('wireweave_validate_ux', {
      source: VALID_SOURCE,
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      valid: boolean
      score: number
      issues: unknown[]
    }
    expect(payload.success).toBe(true)
    expect(typeof payload.valid).toBe('boolean')
    expect(typeof payload.score).toBe('number')
    expect(Array.isArray(payload.issues)).toBe(true)
  })

  it('accepts category / severity / maxIssues options', () => {
    const result = localDispatch('wireweave_validate_ux', {
      source: VALID_SOURCE,
      minSeverity: 'error',
      maxIssues: 5,
      disabledRules: [],
    })
    const payload = parsePayload(result.content[0].text) as { success: boolean }
    expect(payload.success).toBe(true)
  })

  it('returns success=false on parse error', () => {
    const result = localDispatch('wireweave_validate_ux', { source: INVALID_SOURCE })
    const payload = parsePayload(result.content[0].text) as { success: boolean }
    expect(payload.success).toBe(false)
  })
})

describe('localDispatch: wireweave_diff', () => {
  it('reports identical=true when sources are equal', () => {
    const result = localDispatch('wireweave_diff', {
      oldSource: VALID_SOURCE,
      newSource: VALID_SOURCE,
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      identical: boolean
    }
    expect(payload.success).toBe(true)
    expect(payload.identical).toBe(true)
  })

  it('reports identical=false when sources differ', () => {
    const result = localDispatch('wireweave_diff', {
      oldSource: VALID_SOURCE,
      newSource: VALID_SOURCE_2,
    })
    const payload = parsePayload(result.content[0].text) as {
      success: boolean
      identical: boolean
      changes: unknown[]
    }
    expect(payload.success).toBe(true)
    expect(payload.identical).toBe(false)
    expect(Array.isArray(payload.changes)).toBe(true)
  })

  it('returns isError when oldSource missing', () => {
    const result = localDispatch('wireweave_diff', { newSource: VALID_SOURCE })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('oldSource is required')
  })

  it('returns isError when newSource missing', () => {
    const result = localDispatch('wireweave_diff', { oldSource: VALID_SOURCE })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('newSource is required')
  })
})

describe('localDispatch: wireweave_analyze', () => {
  it('returns analysis result', () => {
    const result = localDispatch('wireweave_analyze', { source: VALID_SOURCE })
    const payload = parsePayload(result.content[0].text)
    expect(payload).toBeDefined()
  })

  it('accepts include* options', () => {
    const result = localDispatch('wireweave_analyze', {
      source: VALID_SOURCE,
      includeAccessibility: false,
      includeComplexity: false,
    })
    expect(result.isError).toBeUndefined()
  })

  it('returns success=false on parse error', () => {
    const result = localDispatch('wireweave_analyze', { source: INVALID_SOURCE })
    const payload = parsePayload(result.content[0].text) as { success?: boolean }
    expect(payload.success).toBe(false)
  })
})

describe('localDispatch: wireweave_list_components', () => {
  it('returns full component catalog when no category given', () => {
    const result = localDispatch('wireweave_list_components', {})
    expect(result.isError).toBeUndefined()
    const payload = parsePayload(result.content[0].text) as {
      count: number
      components: { name: string; category: string }[]
    }
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.components.length).toBe(payload.count)
    expect(payload.components.some((c) => c.name === 'page')).toBe(true)
  })

  it('filters by category', () => {
    const result = localDispatch('wireweave_list_components', { category: 'layout' })
    const payload = parsePayload(result.content[0].text) as {
      count: number
      components: { name: string; category: string }[]
    }
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.components.every((c) => c.category === 'layout')).toBe(true)
  })

  it('returns empty list for unknown category', () => {
    const result = localDispatch('wireweave_list_components', { category: '__nope__' })
    const payload = parsePayload(result.content[0].text) as { count: number }
    expect(payload.count).toBe(0)
  })
})

describe('localDispatch: export tools dispatch locally', () => {
  it.each(['wireweave_export_json', 'wireweave_export_figma'])(
    'handles %s as a local tool',
    (name) => {
      const result = localDispatch(name, { source: VALID_SOURCE })
      expect(result.isError).toBeUndefined()
      const payload = parsePayload(result.content[0].text) as { success: boolean }
      expect(payload.success).toBe(true)
    },
  )
})

describe('localDispatch: tools removed from public set return Unknown local tool', () => {
  it.each(['wireweave_render_html_file'])('rejects %s (not in DB public set)', (name) => {
    const result = localDispatch(name, { source: VALID_SOURCE })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown local tool')
  })
})
