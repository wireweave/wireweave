import {
  createServer as createUpstreamServer,
  request,
  type IncomingHttpHeaders,
  type OutgoingHttpHeaders,
} from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readHttpConfig } from './http-config.js'
import { createHttpServer, IDLE_TIMEOUT_MS } from './http-server.js'
import { createMcpServer } from './mcp-server.js'
import { type HandlerContext } from './handlers.js'
import { tools, toolEndpoints } from './tools.js'

const token = 'http-regression-test-token'
const initialize = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'http-regression', version: '1.0.0' },
  },
})
const context: HandlerContext = {
  apiConfig: { apiUrl: 'https://example.invalid', apiKey: 'remote-test-key' },
  endpoints: toolEndpoints,
}

type App = ReturnType<typeof createHttpServer>
const apps: App[] = []
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
  vi.restoreAllMocks()
})

async function start(
  env: NodeJS.ProcessEnv = {},
  overrides: Partial<Parameters<typeof createHttpServer>[1]> = {},
) {
  const app = createHttpServer(readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, ...env }), {
    createMcpServer: (signal) => createMcpServer(context, signal),
    toolCount: tools.length,
    ...overrides,
  })
  apps.push(app)
  app.httpServer.listen(0, '127.0.0.1')
  await once(app.httpServer, 'listening')
  const address = app.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener')
  return { ...app, port: address.port }
}

interface HttpResult {
  status: number
  headers: IncomingHttpHeaders
  body: string
}

function begin(port: number, method = 'POST', headers: OutgoingHttpHeaders = {}, path = '/mcp') {
  const req = request({
    hostname: '127.0.0.1',
    port,
    method,
    path,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...headers,
    },
    agent: false,
  })
  const result = new Promise<HttpResult>((resolve, reject) => {
    req.on('error', reject)
    req.on('response', (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
        })
      })
    })
  })
  return { req, result }
}

function send(
  port: number,
  method = 'POST',
  body = initialize,
  headers: OutgoingHttpHeaders = {},
  path = '/mcp',
): Promise<HttpResult> {
  const pending = begin(port, method, headers, path)
  pending.req.end(method === 'POST' ? body : undefined)
  return pending.result
}

async function session(port: number): Promise<string> {
  const response = await send(port)
  expect(response.status).toBe(200)
  const id = response.headers['mcp-session-id']
  if (typeof id !== 'string') throw new Error('Initialization did not issue a session')
  return id
}

async function health(port: number): Promise<unknown> {
  return JSON.parse((await send(port, 'GET', '', {}, '/health')).body) as unknown
}

function preflight(
  port: number,
  headers: OutgoingHttpHeaders = {},
  omit: string[] = [],
  body?: string,
): Promise<HttpResult> {
  const pending = begin(port, 'OPTIONS', {
    Origin: 'https://client.example',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers':
      'authorization,content-type,mcp-session-id,mcp-protocol-version',
    ...headers,
  })
  for (const name of ['Authorization', ...omit]) pending.req.removeHeader(name)
  pending.req.end(body)
  return pending.result
}

describe('HTTP startup configuration', () => {
  it.each([undefined, '', 'has whitespace', 'line\nbreak', 'x'.repeat(4097)])(
    'rejects a missing or malformed bearer credential (%s)',
    (value) => {
      expect(() => readHttpConfig({ WIREWEAVE_MCP_TOKEN: value })).toThrow('WIREWEAVE_MCP_TOKEN')
    },
  )

  it.each(['', '0', '-1', '1.5', '10junk', ' 10', '+10', '1e2', 'Infinity', '65536'])(
    'rejects invalid ports (%s)',
    (value) => {
      expect(() =>
        readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, WIREWEAVE_MCP_PORT: value }),
      ).toThrow('WIREWEAVE_MCP_PORT')
    },
  )

  it.each(['', '0', '-1', '1.5', '10junk', ' 10', '1025'])(
    'rejects invalid session limits (%s)',
    (value) => {
      expect(() =>
        readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, WIREWEAVE_MCP_MAX_SESSIONS: value }),
      ).toThrow('WIREWEAVE_MCP_MAX_SESSIONS')
    },
  )

  it.each(['0.0.0.0', '::', '192.168.1.1', 'example.org', '', '[::1]'])(
    'rejects unsupported binding (%s)',
    (host) => {
      expect(() =>
        readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, WIREWEAVE_MCP_HOST: host }),
      ).toThrow('loopback')
    },
  )

  it.each(['127.0.0.1', '127.0.0.2', 'localhost', '::1'])(
    'accepts loopback binding (%s)',
    (host) => {
      expect(readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, WIREWEAVE_MCP_HOST: host }).host).toBe(
        host,
      )
    },
  )

  it.each([
    '*',
    'null',
    'https://*.example.org',
    'https://example.org/',
    'https://user:secret@example.org',
    'https://example.org/path',
    'https://example.org,',
    'file:///tmp',
  ])('rejects invalid Origin configuration (%s)', (origin) => {
    expect(() =>
      readHttpConfig({ WIREWEAVE_MCP_TOKEN: token, WIREWEAVE_MCP_ALLOWED_ORIGINS: origin }),
    ).toThrow('WIREWEAVE_MCP_ALLOWED_ORIGINS')
  })
})

describe('real HTTP request boundary', () => {
  it('admits exact browser preflight without executing an MCP operation', async () => {
    const createServer = vi.fn((signal: AbortSignal) => createMcpServer(context, signal))
    const { port } = await start(
      { WIREWEAVE_MCP_ALLOWED_ORIGINS: 'https://client.example' },
      { createMcpServer: createServer },
    )
    const response = await preflight(port)
    expect(response.status).toBe(204)
    expect(response.body).toBe('')
    expect(response.headers['access-control-allow-origin']).toBe('https://client.example')
    expect(response.headers['access-control-allow-methods']).toBe('POST')
    expect(response.headers['access-control-allow-headers']).toBe(
      'authorization, content-type, mcp-session-id, mcp-protocol-version',
    )
    expect(response.headers['mcp-session-id']).toBeUndefined()
    expect(response.headers.vary).toBe(
      'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    )
    expect(createServer).not.toHaveBeenCalled()
    expect(await health(port)).toMatchObject({ activeSessions: 0 })

    const actualHeaders = { Origin: 'https://client.example', Authorization: '' }
    expect((await send(port, 'POST', initialize, actualHeaders)).status).toBe(401)
    const initialized = await send(port, 'POST', initialize, { Origin: 'https://client.example' })
    expect(initialized.status).toBe(200)
    const id = initialized.headers['mcp-session-id']
    expect(typeof id).toBe('string')
    for (const method of ['GET', 'DELETE']) {
      expect(
        (await send(port, method, '', { ...actualHeaders, 'Mcp-Session-Id': id })).status,
      ).toBe(401)
    }
    expect(await health(port)).toMatchObject({ activeSessions: 1 })
  })

  it.each(['GET', 'POST', 'DELETE'])(
    'negotiates only the requested allowed method %s',
    async (method) => {
      const { port } = await start({ WIREWEAVE_MCP_ALLOWED_ORIGINS: 'https://client.example' })
      const response = await preflight(port, {
        'Access-Control-Request-Method': method,
        'Access-Control-Request-Headers': 'Authorization, Last-Event-ID, ACCEPT',
      })
      expect(response.status).toBe(204)
      expect(response.headers['access-control-allow-methods']).toBe(method)
      expect(response.headers['access-control-allow-headers']).toBe(
        'authorization, last-event-id, accept',
      )
    },
  )

  const rejectedPreflights: {
    name: string
    headers?: OutgoingHttpHeaders
    omit?: string[]
    status: number
  }[] = [
    { name: 'foreign Host', headers: { Host: 'evil.example' }, status: 403 },
    { name: 'malformed Host', headers: { Host: '[' }, status: 403 },
    { name: 'absent Origin', omit: ['Origin'], status: 403 },
    { name: 'foreign Origin', headers: { Origin: 'https://evil.example' }, status: 403 },
    { name: 'null Origin', headers: { Origin: 'null' }, status: 403 },
    {
      name: 'different Origin port',
      headers: { Origin: 'https://client.example:8443' },
      status: 403,
    },
    {
      name: 'duplicate Origin',
      headers: { Origin: ['https://client.example', 'https://evil.example'] },
      status: 400,
    },
    { name: 'absent method', omit: ['Access-Control-Request-Method'], status: 403 },
    {
      name: 'unsupported method',
      headers: { 'Access-Control-Request-Method': 'PATCH' },
      status: 403,
    },
    { name: 'lowercase method', headers: { 'Access-Control-Request-Method': 'post' }, status: 403 },
    {
      name: 'multiple methods',
      headers: { 'Access-Control-Request-Method': 'POST,DELETE' },
      status: 403,
    },
    {
      name: 'duplicate method header',
      headers: { 'Access-Control-Request-Method': ['POST', 'GET'] },
      status: 400,
    },
    {
      name: 'unknown header',
      headers: { 'Access-Control-Request-Headers': 'authorization,x-api-key' },
      status: 403,
    },
    { name: 'wildcard header', headers: { 'Access-Control-Request-Headers': '*' }, status: 403 },
    {
      name: 'empty header token',
      headers: { 'Access-Control-Request-Headers': 'authorization,' },
      status: 403,
    },
    {
      name: 'duplicate request headers field',
      headers: { 'Access-Control-Request-Headers': ['authorization', 'content-type'] },
      status: 400,
    },
  ]
  it.each(rejectedPreflights)('rejects preflight with $name', async ({ headers, omit, status }) => {
    const { port } = await start({ WIREWEAVE_MCP_ALLOWED_ORIGINS: 'https://client.example' })
    const response = await preflight(port, headers, omit)
    expect(response.status).toBe(status)
    expect(response.headers['access-control-allow-methods']).toBeUndefined()
    expect(response.headers['access-control-allow-headers']).toBeUndefined()
    expect(await health(port)).toMatchObject({ activeSessions: 0 })
  })

  it('keeps preflight closed by default and rejects attempts to submit a body', async () => {
    const denied = await start()
    expect((await preflight(denied.port)).status).toBe(403)
    const allowed = await start({ WIREWEAVE_MCP_ALLOWED_ORIGINS: 'https://client.example' })
    const response = await preflight(
      allowed.port,
      { 'Content-Length': Buffer.byteLength(initialize) },
      [],
      initialize,
    )
    expect(response.status).toBe(400)
    expect(await health(allowed.port)).toMatchObject({ activeSessions: 0 })
  })

  it.each(['GET', 'POST', 'DELETE', 'OPTIONS'])(
    'requires bearer authentication on %s',
    async (method) => {
      const { port } = await start()
      const response = await send(port, method, initialize, { Authorization: '' })
      expect(response.status).toBe(401)
      expect(response.headers['www-authenticate']).toContain('Bearer')
      expect(await health(port)).toMatchObject({ activeSessions: 0 })
    },
  )

  it('never accepts an API key or session ID in place of the transport credential', async () => {
    const { port } = await start()
    const id = await session(port)
    for (const Authorization of [
      'Bearer remote-test-key',
      'Basic http-regression-test-token',
      `Bearer ${id}`,
    ]) {
      expect((await send(port, 'GET', '', { Authorization, 'Mcp-Session-Id': id })).status).toBe(
        401,
      )
    }
  })

  it.each(['[', 'evil.example', 'localhost:1', '127.0.0.1:1', '127.0.0.1.evil.example'])(
    'rejects Host %s without crashing',
    async (Host) => {
      const { port } = await start()
      expect((await send(port, 'POST', initialize, { Host })).status).toBe(403)
      expect((await send(port)).status).toBe(200)
    },
  )

  it.each(['https://evil.example', 'null', ''])(
    'rejects every present Origin by default (%s)',
    async (Origin) => {
      const { port } = await start()
      expect((await send(port, 'POST', initialize, { Origin })).status).toBe(403)
    },
  )

  it('uses exact Origin matches and never sends wildcard CORS', async () => {
    const { port } = await start({ WIREWEAVE_MCP_ALLOWED_ORIGINS: 'https://client.example:8443' })
    for (const Origin of [
      'https://client.example',
      'https://client.example:8443.evil.example',
      'https://client.example:8443/',
    ]) {
      expect((await send(port, 'POST', initialize, { Origin })).status).toBe(403)
    }
    const accepted = await send(port, 'POST', initialize, { Origin: 'https://client.example:8443' })
    expect(accepted.status).toBe(200)
    expect(accepted.headers['access-control-allow-origin']).toBe('https://client.example:8443')
  })

  it('rejects duplicate credentials and duplicate session headers', async () => {
    const { port } = await start()
    expect(
      (await send(port, 'POST', initialize, { Authorization: [`Bearer ${token}`, 'Bearer other'] }))
        .status,
    ).toBe(400)
    expect(
      (await send(port, 'POST', initialize, { 'Mcp-Session-Id': ['one', 'two'] })).status,
    ).toBe(400)
  })

  it('returns only the contracted health fields and rejects other routes', async () => {
    const { port } = await start()
    await session(port)
    expect(await health(port)).toEqual({
      status: 'ok',
      transport: 'streamable-http',
      activeSessions: 1,
      tools: tools.length,
    })
    for (const path of [
      '/',
      '/health/extra',
      '/mcp/extra',
      '/wrong/../mcp',
      'http://evil.example/mcp',
    ]) {
      expect((await send(port, 'GET', '', {}, path)).status).toBe(404)
    }
  })

  it('reports the package version in the real initialization response', async () => {
    const { port } = await start()
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string }
    expect((await send(port)).body).toContain(`"version":"${manifest.version}"`)
  })
})

describe('real HTTP session lifecycle', () => {
  it.each(['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'])(
    'returns 404 for an unknown session on %s without reinitializing',
    async (method) => {
      const { port } = await start()
      expect((await send(port, method, initialize, { 'Mcp-Session-Id': 'unknown' })).status).toBe(
        404,
      )
      expect(await health(port)).toMatchObject({ activeSessions: 0 })
    },
  )

  it('rejects unsupported negotiated protocols without terminating the session', async () => {
    const { port } = await start()
    const id = await session(port)
    expect(
      (
        await send(port, 'DELETE', '', {
          'Mcp-Session-Id': id,
          'Mcp-Protocol-Version': '2099-01-01',
        })
      ).status,
    ).toBe(400)
    expect(await health(port)).toMatchObject({ activeSessions: 1 })
  })

  it('reserves a slot while an initialization body is still arriving', async () => {
    let admitted!: () => void
    const admission = new Promise<void>((resolve) => {
      admitted = resolve
    })
    const { port } = await start(
      { WIREWEAVE_MCP_MAX_SESSIONS: '1' },
      {
        createMcpServer: (signal) => {
          admitted()
          return createMcpServer(context, signal)
        },
      },
    )
    const first = begin(port)
    first.req.write(initialize.slice(0, 30))
    await admission
    const second = await send(port)
    expect(second.status).toBe(503)
    expect(second.headers['retry-after']).toBe('1')
    expect(await health(port)).toMatchObject({ activeSessions: 0 })
    first.req.end(initialize.slice(30))
    expect((await first.result).status).toBe(200)
    expect(await health(port)).toMatchObject({ activeSessions: 1 })
    expect((await send(port)).status).toBe(503)
  })

  it.each(['{', JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list' })])(
    'releases failed initialization reservations (%s)',
    async (body) => {
      const { port } = await start({ WIREWEAVE_MCP_MAX_SESSIONS: '1' })
      expect((await send(port, 'POST', body)).status).toBe(400)
      expect((await send(port)).status).toBe(200)
    },
  )

  it('isolates unexpected request failures and returns their reserved slot', async () => {
    const onError = vi.fn()
    let fail = true
    const { port } = await start(
      { WIREWEAVE_MCP_MAX_SESSIONS: '1' },
      {
        onError,
        createMcpServer: (signal) => {
          if (fail) {
            fail = false
            throw new Error('private diagnostic with credentials')
          }
          return createMcpServer(context, signal)
        },
      },
    )
    const failed = await send(port)
    expect(failed.status).toBe(500)
    expect(failed.body).not.toContain('private diagnostic')
    expect(onError).toHaveBeenCalledOnce()
    expect((await send(port)).status).toBe(200)
  })

  it('releases a disconnected incomplete handshake', async () => {
    let admitted!: () => void
    let aborted!: () => void
    const admission = new Promise<void>((resolve) => {
      admitted = resolve
    })
    const cancellation = new Promise<void>((resolve) => {
      aborted = resolve
    })
    const { port } = await start(
      { WIREWEAVE_MCP_MAX_SESSIONS: '1' },
      {
        createMcpServer: (signal) => {
          signal.addEventListener('abort', () => aborted(), { once: true })
          admitted()
          return createMcpServer(context, signal)
        },
      },
    )
    const pending = begin(port)
    const disconnected = pending.result.catch(() => undefined)
    pending.req.write(initialize.slice(0, 30))
    await admission
    pending.req.destroy()
    await cancellation
    await disconnected
    expect((await send(port)).status).toBe(200)
  })

  it('DELETE cancels the session and immediately permits another initialization', async () => {
    let lifetime: AbortSignal | undefined
    const { port } = await start(
      { WIREWEAVE_MCP_MAX_SESSIONS: '1' },
      {
        createMcpServer: (signal) => {
          lifetime = signal
          return createMcpServer(context, signal)
        },
      },
    )
    const id = await session(port)
    expect(lifetime?.aborted).toBe(false)
    expect((await send(port, 'DELETE', '', { 'Mcp-Session-Id': id })).status).toBe(200)
    expect(lifetime?.aborted).toBe(true)
    expect((await send(port, 'POST', initialize, { 'Mcp-Session-Id': id })).status).toBe(404)
    expect((await send(port)).status).toBe(200)
  })

  it('expires idle sessions at 30 minutes, refreshing only on session activity', async () => {
    let clock = 0
    let lifetime: AbortSignal | undefined
    const { port } = await start(
      { WIREWEAVE_MCP_MAX_SESSIONS: '1' },
      {
        now: () => clock,
        createMcpServer: (signal) => {
          lifetime = signal
          return createMcpServer(context, signal)
        },
      },
    )
    const id = await session(port)
    clock = IDLE_TIMEOUT_MS - 1
    expect(await health(port)).toMatchObject({ activeSessions: 1 })
    const headers = { 'Mcp-Session-Id': id, 'Mcp-Protocol-Version': '2025-11-25' }
    expect(
      (await send(port, 'POST', JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }), headers))
        .status,
    ).toBe(200)
    clock += IDLE_TIMEOUT_MS - 1
    expect(await health(port)).toMatchObject({ activeSessions: 1 })
    clock++
    expect((await send(port, 'POST', initialize, headers)).status).toBe(404)
    expect(lifetime?.aborted).toBe(true)
    expect((await send(port)).status).toBe(200)
  })

  it('shutdown cancels all live sessions', async () => {
    const lifetimes: AbortSignal[] = []
    const app = await start(
      {},
      {
        createMcpServer: (signal) => {
          lifetimes.push(signal)
          return createMcpServer(context, signal)
        },
      },
    )
    await session(app.port)
    await session(app.port)
    await app.close()
    expect(lifetimes.map((signal) => signal.aborted)).toEqual([true, true])
  })

  it.each(['notification', 'DELETE', 'expiry', 'shutdown'] as const)(
    '%s aborts a real upstream fetch; a client disconnect alone does not',
    async (mode) => {
      let started!: () => void
      let upstreamClosed = false
      let clock = 0
      const startedRequest = new Promise<void>((resolve) => {
        started = resolve
      })
      const upstream = createUpstreamServer((req, res) => {
        req.resume()
        res.once('close', () => {
          upstreamClosed = true
        })
        started()
        // Deliberately keep the HTTP response pending until cancellation closes the socket.
      })
      upstream.listen(0, '127.0.0.1')
      await once(upstream, 'listening')
      const address = upstream.address()
      if (!address || typeof address === 'string') throw new Error('Expected upstream port')
      const remoteContext: HandlerContext = {
        ...context,
        apiConfig: { ...context.apiConfig, apiUrl: `http://127.0.0.1:${address.port}` },
      }
      const app = await start(
        {},
        {
          now: () => clock,
          createMcpServer: (signal) => createMcpServer(remoteContext, signal),
        },
      )
      try {
        const id = await session(app.port)
        const headers = { 'Mcp-Session-Id': id, 'Mcp-Protocol-Version': '2025-11-25' }
        const pending = begin(app.port, 'POST', headers)
        const outcome = pending.result.catch(() => undefined)
        pending.req.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 7,
            method: 'tools/call',
            params: { name: 'wireweave_account_balance', arguments: {} },
          }),
        )
        await startedRequest
        // Losing the response connection cannot cancel already admitted tool work.
        const disconnected = once(pending.req, 'close')
        pending.req.destroy()
        await disconnected
        await outcome
        expect(await health(app.port)).toMatchObject({ activeSessions: 1 })
        expect(upstreamClosed).toBe(false)

        if (mode === 'notification') {
          const response = await send(
            app.port,
            'POST',
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/cancelled',
              params: { requestId: 7 },
            }),
            headers,
          )
          expect(response.status).toBe(202)
        } else if (mode === 'DELETE') {
          expect((await send(app.port, 'DELETE', '', headers)).status).toBe(200)
        } else if (mode === 'expiry') {
          clock = IDLE_TIMEOUT_MS
          await app.expireIdleSessions()
        } else {
          await app.close()
        }
        await expect.poll(() => upstreamClosed).toBe(true)
        if (mode !== 'shutdown') {
          expect(await health(app.port)).toMatchObject({
            activeSessions: mode === 'notification' ? 1 : 0,
          })
        }
      } finally {
        await app.close()
        const closed = new Promise<void>((resolve) => upstream.close(() => resolve()))
        upstream.closeAllConnections()
        await closed
      }
    },
  )
})
