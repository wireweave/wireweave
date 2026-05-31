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

describe('mcp-server dispatch integration', () => {
  it('local tool (parse) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_parse', { source: 'Page Home {}' }, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    expect(result.content[0]?.type).toBe('text')
  })

  it('local tool (validate) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_validate', { source: 'Page Home {}' }, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
  })

  it('local tool (render_html_code) executes in-process without calling api-server', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_render_html_code', { source: 'Page Home {}' }, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
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

  it('no local tool appears in fetch-bound server endpoints test path', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    for (const name of localToolNames) {
      await dispatch(name, { source: 'Page Home {}' }, options)
    }

    expect(fetchFn).not.toHaveBeenCalled()
  })
})
