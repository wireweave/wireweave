import { describe, expect, it, vi } from 'vitest'

import { buildRequest, callApi, extractCreditInfo, parseErrorMessage } from './client.js'
import { createMockFetch, sampleApiConfig, sampleEndpoints } from './__fixtures__/index.js'

describe('buildRequest', () => {
  it('builds POST request with JSON body', () => {
    const { url, options } = buildRequest(sampleApiConfig, sampleEndpoints.wireweave_validate_dsl, {
      source: 'page {}',
    })
    expect(url).toBe('https://api.wireweave.test/validate-dsl')
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({ source: 'page {}' }))
    expect((options.headers as Record<string, string>)['x-api-key']).toBe('test_api_key_12345')
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('builds GET request with query string', () => {
    const { url, options } = buildRequest(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_list_projects,
      {
        limit: 10,
        offset: 5,
      },
    )
    expect(url).toContain('https://api.wireweave.test/cloud/projects?')
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=5')
    expect(options.body).toBeUndefined()
    expect(options.method).toBe('GET')
  })

  it('substitutes pathParams and excludes them from body', () => {
    const { url, options } = buildRequest(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_get_project,
      {
        id: 'proj-123',
      },
    )
    expect(url).toBe('https://api.wireweave.test/cloud/projects/proj-123')
    expect(options.body).toBeUndefined()
  })

  it('joins array params with comma in query string', () => {
    const { url } = buildRequest(sampleApiConfig, sampleEndpoints.wireweave_cloud_list_projects, {
      tags: ['ui', 'web'],
    })
    expect(url).toContain('tags=ui%2Cweb')
  })

  it('skips null and undefined query params', () => {
    const { url } = buildRequest(sampleApiConfig, sampleEndpoints.wireweave_cloud_list_projects, {
      keep: 'yes',
      skipNull: null,
      skipUndefined: undefined,
    })
    expect(url).toContain('keep=yes')
    expect(url).not.toContain('skipNull')
    expect(url).not.toContain('skipUndefined')
  })

  it('omits body and query when no args', () => {
    const { url, options } = buildRequest(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_list_projects,
    )
    expect(url).toBe('https://api.wireweave.test/cloud/projects')
    expect(options.body).toBeUndefined()
  })

  it('serializes non-primitive params via JSON.stringify', () => {
    const { url } = buildRequest(sampleApiConfig, sampleEndpoints.wireweave_cloud_list_projects, {
      filter: { kind: 'active' },
    })
    expect(url).toContain('filter=')
    expect(decodeURIComponent(url.split('filter=')[1])).toBe('{"kind":"active"}')
  })
})

describe('parseErrorMessage', () => {
  it.each([
    [401, {}, 'Invalid API key. Get one at https://wireweave.org'],
    [402, { message: 'add credits' }, 'Insufficient credits. add credits'],
    [402, {}, 'Insufficient credits. Please add more credits.'],
    [403, {}, 'Access denied. Upgrade your plan for this feature.'],
    [429, {}, 'Rate limit exceeded. Please wait and try again.'],
    [500, {}, 'Service temporarily unavailable'],
    [503, {}, 'Service temporarily unavailable'],
  ])('maps status %i', (status, body, expected) => {
    expect(parseErrorMessage(status, body)).toBe(expected)
  })

  it('uses project-specific message on 404 when error mentions project', () => {
    expect(parseErrorMessage(404, { error: 'project not found' })).toContain('Project not found')
  })

  it('uses name-specific message on 400 when error mentions name', () => {
    expect(parseErrorMessage(400, { error: 'invalid name' })).toContain('Invalid wireframe name')
  })

  it('falls back to error or message field for unknown status', () => {
    expect(parseErrorMessage(418, { error: 'I am a teapot' })).toBe('I am a teapot')
    expect(parseErrorMessage(418, { message: 'oh' })).toBe('oh')
    expect(parseErrorMessage(418, {})).toBe('Request failed')
  })
})

describe('extractCreditInfo', () => {
  it('parses all three credit headers', () => {
    const headers = new Headers({
      'X-Credits-Balance': '100',
      'X-Credits-Monthly-Remaining': '50',
      'X-Credits-Total-Available': '150',
    })
    expect(extractCreditInfo(headers)).toEqual({
      balance: 100,
      monthlyRemaining: 50,
      totalAvailable: 150,
    })
  })

  it('returns undefined for missing headers', () => {
    const headers = new Headers()
    expect(extractCreditInfo(headers)).toEqual({
      balance: undefined,
      monthlyRemaining: undefined,
      totalAvailable: undefined,
    })
  })
})

describe('callApi', () => {
  it('throws if apiKey is missing', async () => {
    await expect(
      callApi({ apiUrl: 'http://x', apiKey: '' }, sampleEndpoints.wireweave_validate_dsl, {}),
    ).rejects.toThrow('WIREWEAVE_API_KEY')
  })

  it('returns response data on success', async () => {
    const fetchFn = createMockFetch({ status: 200, body: { ok: true, html: '<div/>' } })
    const result = await callApi(
      sampleApiConfig,
      sampleEndpoints.wireweave_render_html_code,
      { source: 'page {}' },
      fetchFn,
    )
    expect(result).toEqual({ ok: true, html: '<div/>' })
  })

  it('appends _credits when credit headers present', async () => {
    const fetchFn = createMockFetch({
      status: 200,
      body: { success: true },
      headers: {
        'X-Credits-Balance': '99',
        'X-Credits-Total-Available': '99',
      },
    })
    const result = (await callApi(
      sampleApiConfig,
      sampleEndpoints.wireweave_render_html_code,
      {},
      fetchFn,
    )) as { _credits?: { balance?: number } }
    expect(result._credits?.balance).toBe(99)
  })

  it('does not append _credits to array responses', async () => {
    const fetchFn = createMockFetch({
      status: 200,
      body: [{ id: 1 }],
      headers: { 'X-Credits-Balance': '99' },
    })
    const result = await callApi(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_list_projects,
      {},
      fetchFn,
    )
    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBe(1)
  })

  it('throws parsed error on non-OK response', async () => {
    const fetchFn = createMockFetch({ status: 401, body: { error: 'unauthorized' } })
    await expect(
      callApi(sampleApiConfig, sampleEndpoints.wireweave_validate_dsl, {}, fetchFn),
    ).rejects.toThrow('Invalid API key')
  })

  it('handles non-JSON error response gracefully', async () => {
    const fetchFn = vi.fn(async () =>
      Promise.resolve(new Response('not json', { status: 500 })),
    ) as unknown as typeof fetch
    await expect(
      callApi(sampleApiConfig, sampleEndpoints.wireweave_validate_dsl, {}, fetchFn),
    ).rejects.toThrow('Service temporarily unavailable')
  })
})
