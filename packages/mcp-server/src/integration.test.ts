import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  dispatch,
  LOCAL_DISPATCH_TOOL_NAMES,
  type ApiConfig,
  type DispatchOptions,
} from '@wireweave/sdk'
import { tools, toolEndpoints, localToolNames } from './tools.js'

const apiConfig: ApiConfig = {
  apiUrl: 'http://example.invalid',
  apiKey: 'test-key',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ListTools — generated tools.ts is the single published catalog', () => {
  it('exposes every generated tool exactly once (no merge step needed)', () => {
    const names = new Set(tools.map((t) => t.name))
    expect(names.size).toBe(tools.length)
    expect(names.has('wireweave_parse')).toBe(true)
    expect(names.has('wireweave_account_balance')).toBe(true)
  })

  it('every generated tool exposes a valid MCP Tool shape', () => {
    for (const t of tools) {
      expect(t.name).toMatch(/^wireweave_/)
      expect(typeof t.description).toBe('string')
      expect(t.inputSchema.type).toBe('object')
    }
  })

  it('mcp-server local tool set is a subset of the published catalog', () => {
    const names = new Set(tools.map((t) => t.name))
    for (const name of localToolNames) {
      expect(names.has(name)).toBe(true)
    }
  })

  it('mcp-server local tool set matches the SDK local dispatch set', () => {
    expect(new Set(localToolNames)).toEqual(new Set(LOCAL_DISPATCH_TOOL_NAMES))
  })
})

describe('CallTool routing — server tool reaches api-server, local tool stays in-process', () => {
  it('server tool (account_balance) makes a single fetch to the mapped endpoint', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { balance: 100 } }))
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_account_balance', {}, options)

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [callUrl, callOpts] = fetchFn.mock.calls[0]
    const urlString = typeof callUrl === 'string' ? callUrl : (callUrl as URL).toString()
    expect(urlString).toContain('/billing/balance')
    expect(callOpts?.method).toBe('GET')
    expect(result.isError).toBeUndefined()
  })

  it('local tool (parse) does not invoke fetch and returns parsed AST text', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch(
      'wireweave_parse',
      { source: 'page "Home" { text "hi" }' },
      options,
    )

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text) as Record<string, unknown>
    expect(payload).toHaveProperty('ast')
  })
})

describe('Error conversion — api-server error status → MCP error result', () => {
  const cases: Array<{ status: number; body: object; expectedSubstring: string }> = [
    { status: 401, body: { error: 'UNAUTHORIZED' }, expectedSubstring: 'Invalid API key' },
    {
      status: 402,
      body: { error: 'CREDIT_EXHAUSTED', message: 'Need more credits' },
      expectedSubstring: 'Insufficient credits',
    },
    { status: 403, body: { error: 'FORBIDDEN' }, expectedSubstring: 'Access denied' },
    { status: 429, body: { error: 'RATE_LIMITED' }, expectedSubstring: 'Rate limit exceeded' },
    { status: 500, body: { error: 'SERVER_ERROR' }, expectedSubstring: 'Service temporarily' },
    { status: 503, body: { error: 'SERVICE_DOWN' }, expectedSubstring: 'Service temporarily' },
  ]

  afterEach(() => {
    vi.restoreAllMocks()
  })

  for (const { status, body, expectedSubstring } of cases) {
    it(`HTTP ${status} → MCP error result with message containing "${expectedSubstring}"`, async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status))
      const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

      const result = await dispatch('wireweave_account_balance', {}, options)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain(expectedSubstring)
    })
  }

  it('network failure → MCP error result with original message preserved', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'))
    const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints, fetchFn }

    const result = await dispatch('wireweave_account_balance', {}, options)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('ECONNREFUSED')
  })

  it('missing api key throws via callApi and surfaces as MCP error result', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const options: DispatchOptions = {
      apiConfig: { apiUrl: 'http://example.invalid', apiKey: '' },
      endpoints: toolEndpoints,
      fetchFn,
    }

    const result = await dispatch('wireweave_account_balance', {}, options)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('WIREWEAVE_API_KEY')
  })
})
