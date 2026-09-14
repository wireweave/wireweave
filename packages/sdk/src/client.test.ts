import { describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'

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

  it.each([
    ['a/b?admin=true#secret', 'a%2Fb%3Fadmin%3Dtrue%23secret'],
    ['../other-project', '..%2Fother-project'],
    ['%2e%2e', '%252e%252e'],
    ['a\\b', 'a%5Cb'],
    ['hello world', 'hello%20world'],
    ['한글', '%ED%95%9C%EA%B8%80'],
  ])('encodes path parameter %s as one segment without changing origin or query', (id, encoded) => {
    const args = { id }
    const { url, options } = buildRequest(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_get_project,
      args,
    )
    expect(url).toBe(`https://api.wireweave.test/cloud/projects/${encoded}`)
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://api.wireweave.test')
    expect(parsed.pathname.split('/')).toHaveLength(4)
    expect(parsed.search).toBe('')
    expect(parsed.hash).toBe('')
    expect(options.body).toBeUndefined()
    expect(args).toEqual({ id })
  })

  it.each([undefined, null, '', '.', '..', true, {}, [], NaN, Infinity, -Infinity])(
    'rejects invalid or missing path parameter %j',
    (id) => {
      expect(() =>
        buildRequest(sampleApiConfig, sampleEndpoints.wireweave_cloud_get_project, { id }),
      ).toThrow('Invalid or missing path parameter: id')
    },
  )

  it('encodes multiple path parameters and excludes each from the request body', () => {
    const args = { wireframeId: 'wireframe/1', version: 0, name: 'Restore' }
    const { url, options } = buildRequest(
      sampleApiConfig,
      {
        method: 'POST',
        path: '/cloud/wireframes/:wireframeId/versions/:version/restore',
        pathParams: ['wireframeId', 'version'],
      },
      args,
    )
    expect(url).toBe('https://api.wireweave.test/cloud/wireframes/wireframe%2F1/versions/0/restore')
    expect(options.body).toBe(JSON.stringify({ name: 'Restore' }))
    expect(args).toEqual({ wireframeId: 'wireframe/1', version: 0, name: 'Restore' })
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

  it('rejects a missing path parameter before fetching', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    await expect(
      callApi(sampleApiConfig, sampleEndpoints.wireweave_cloud_get_project, {}, fetchFn),
    ).rejects.toThrow('Invalid or missing path parameter: id')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rejects an already aborted request before fetching', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const signal = AbortSignal.abort(new Error('caller cancelled'))
    await expect(
      callApi(sampleApiConfig, sampleEndpoints.wireweave_cloud_list_projects, {}, fetchFn, signal),
    ).rejects.toThrow('caller cancelled')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('combines caller cancellation with the request deadline and discards a late response', async () => {
    const controller = new AbortController()
    let finish!: (response: Response) => void
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const pending = callApi(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_list_projects,
      {},
      fetchFn,
      controller.signal,
    )
    const rejected = expect(pending).rejects.toThrow('caller cancelled')
    const requestSignal = fetchFn.mock.calls[0]?.[1]?.signal
    expect(requestSignal).toBeInstanceOf(AbortSignal)
    expect(requestSignal?.aborted).toBe(false)
    controller.abort(new Error('caller cancelled'))
    expect(requestSignal?.aborted).toBe(true)
    expect(requestSignal?.reason).toBe(controller.signal.reason)
    finish(new Response(JSON.stringify({ projects: ['must not be returned'] })))
    await rejected
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('discards success if cancellation happens while reading the response body', async () => {
    const controller = new AbortController()
    let finishBody!: (value: unknown) => void
    let markReading!: () => void
    const reading = new Promise<void>((resolve) => {
      markReading = resolve
    })
    const response = new Response('{}')
    vi.spyOn(response, 'json').mockImplementation(() => {
      markReading()
      return new Promise((resolve) => {
        finishBody = resolve
      })
    })
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response)
    const pending = callApi(
      sampleApiConfig,
      sampleEndpoints.wireweave_cloud_list_projects,
      {},
      fetchFn,
      controller.signal,
    )
    const rejected = expect(pending).rejects.toThrow('cancelled during body')
    await reading
    controller.abort(new Error('cancelled during body'))
    finishBody({ projects: ['must not be returned'] })
    await rejected
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it.each([false, true])(
    'enforces the 30-second timeout with caller signal=%s',
    async (withCallerSignal) => {
      const deadline = new AbortController()
      const caller = new AbortController()
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
      try {
        const fetchFn = vi.fn<typeof fetch>().mockImplementation(
          (_input, init) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener(
                'abort',
                () => {
                  const reason: unknown = init.signal?.reason
                  reject(reason instanceof Error ? reason : new Error('Request aborted'))
                },
                { once: true },
              )
            }),
        )
        const pending = callApi(
          sampleApiConfig,
          sampleEndpoints.wireweave_cloud_list_projects,
          {},
          fetchFn,
          withCallerSignal ? caller.signal : undefined,
        )
        const rejected = expect(pending).rejects.toThrow('request deadline exceeded')
        expect(timeoutSpy).toHaveBeenCalledWith(30_000)
        deadline.abort(new DOMException('request deadline exceeded', 'TimeoutError'))
        await rejected
        expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
        expect(caller.signal.aborted).toBe(false)
        expect(fetchFn).toHaveBeenCalledTimes(1)
      } finally {
        timeoutSpy.mockRestore()
      }
    },
  )
})

async function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Expected an ephemeral TCP listener'))
        return
      }
      resolve(`http://127.0.0.1:${address.port}`)
    })
  })
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
}

describe('callApi redirect isolation with real loopback HTTP', () => {
  it.each([301, 302, 303, 307, 308])(
    'rejects HTTP %i without forwarding credentials or the request to another origin',
    async (status) => {
      const sourceRequests: unknown[] = []
      const targetRequests: unknown[] = []
      const target = createServer((request, response) => {
        targetRequests.push({ path: request.url, apiKey: request.headers['x-api-key'] })
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end('{}')
      })
      let targetUrl = ''
      const source = createServer((request, response) => {
        sourceRequests.push({
          method: request.method,
          path: request.url,
          apiKey: request.headers['x-api-key'],
        })
        response.writeHead(status, { Location: `${targetUrl}/capture` })
        response.end()
      })
      try {
        targetUrl = await listen(target)
        const apiUrl = await listen(source)
        await expect(
          callApi(
            { apiUrl, apiKey: 'loopback-fixture-key' },
            { method: 'POST', path: '/wireframes' },
            { name: 'Fixture', code: 'page "Home" {}' },
          ),
        ).rejects.toThrow()
        expect(sourceRequests).toEqual([
          { method: 'POST', path: '/wireframes', apiKey: 'loopback-fixture-key' },
        ])
        expect(targetRequests).toEqual([])
      } finally {
        await Promise.all([close(source), close(target)])
      }
    },
  )
})
