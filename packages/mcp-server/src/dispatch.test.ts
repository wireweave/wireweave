import { describe, it, expect, vi } from 'vitest'
import {
  dispatch,
  LOCAL_DISPATCH_TOOL_NAMES,
  type ApiConfig,
  type DispatchOptions,
} from '@wireweave/sdk'
import { toolEndpoints, localToolNames } from './tools.js'

const apiConfig: ApiConfig = {
  apiUrl: 'http://example.invalid',
  apiKey: 'test-key',
}

const SOURCE = 'page "Home" {\n  text "Verified content"\n}\n'

describe('mcp-server dispatch integration', () => {
  it('local tool (parse) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_parse', { source: SOURCE }, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    expect(result.content[0]?.type).toBe('text')
    expect(JSON.parse(result.content[0]?.text ?? '')).toMatchObject({
      success: true,
      pageCount: 1,
      ast: {
        children: [{ type: 'Page', title: 'Home', children: [{ content: 'Verified content' }] }],
      },
    })
  })

  it('local tool (validate) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_validate', { source: SOURCE, strict: true }, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({
      valid: true,
      pageCount: 1,
      componentCount: 1,
    })
  })

  it('local tool (render_html_code) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch(
      'wireweave_render_html_code',
      { source: SOURCE, fullDocument: true },
      options,
    )

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0]?.text ?? '') as { success: boolean; html: string }
    expect(payload.success).toBe(true)
    expect(payload.html).toContain('<html')
    expect(payload.html).toContain('Verified content')
  })

  it('server tool routes through fetch to api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_account_balance', {}, options)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(result.isError).toBeUndefined()
    expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({ data: { ok: true } })
    expect(fetchFn.mock.calls[0]?.[0]).toBe('http://example.invalid/billing/balance')
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe('GET')
  })

  it('unknown tool returns isError', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_does_not_exist', {}, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('every name in localToolNames is recognized by SDK as a local dispatch tool', () => {
    for (const name of localToolNames) {
      expect(LOCAL_DISPATCH_TOOL_NAMES.has(name)).toBe(true)
    }
  })

  it('invalid local source produces a domain error without remote fallback', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_parse', { source: 'page { @@@' }, options)
    expect(fetchFn).not.toHaveBeenCalled()
    const payload = JSON.parse(result.content[0]?.text ?? '') as { success: boolean; error: string }
    expect(payload.success).toBe(false)
    expect(payload.error).toBeTypeOf('string')
    expect(payload.error.length).toBeGreaterThan(0)
  })
})
