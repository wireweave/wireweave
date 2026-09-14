import { type Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { type HttpConfig } from './http-config.js'

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const INITIALIZATION_TIMEOUT_MS = 30_000
const PREFLIGHT_METHODS = new Set(['GET', 'POST', 'DELETE'])
const PREFLIGHT_HEADERS = new Set([
  'authorization',
  'content-type',
  'mcp-session-id',
  'mcp-protocol-version',
  'accept',
  'last-event-id',
])

interface Session {
  transport: StreamableHTTPServerTransport
  controller: AbortController
  id?: string
  closed: boolean
  lastActivity: number
  timer?: ReturnType<typeof setTimeout>
}

interface HttpDependencies {
  createMcpServer: (signal: AbortSignal) => McpServer
  toolCount: number
  now?: () => number
  onError?: () => void
}

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function header(req: IncomingMessage, name: string): string | undefined {
  let count = 0
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i]?.toLowerCase() === name) count++
  }
  const value = req.headers[name]
  if (count > 1 || Array.isArray(value)) throw new RequestError(400, 'Ambiguous request headers')
  return value
}

function respond(res: ServerResponse, status: number, body: unknown): void {
  if (res.destroyed || res.writableEnded) return
  if (res.headersSent) {
    res.destroy()
    return
  }
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

export function createHttpServer(config: HttpConfig, dependencies: HttpDependencies) {
  const sessions = new Map<string, Session>()
  // This set owns both pending and active slots. Admission occurs before the first await.
  const slots = new Set<Session>()
  const now = dependencies.now ?? (() => performance.now())
  const tokenDigest = createHash('sha256').update(config.token).digest()
  const onError = dependencies.onError ?? (() => {})
  let stopping = false

  function release(session: Session): void {
    if (session.closed) return
    session.closed = true
    clearTimeout(session.timer)
    slots.delete(session)
    if (session.id) sessions.delete(session.id)
    session.controller.abort()
  }

  async function terminate(session: Session): Promise<void> {
    if (session.closed) return
    release(session)
    await session.transport.close()
  }

  function touch(session: Session): void {
    session.lastActivity = now()
    clearTimeout(session.timer)
    session.timer = setTimeout(() => {
      void terminate(session).catch(onError)
    }, IDLE_TIMEOUT_MS)
    session.timer.unref()
  }

  async function expireIdleSessions(): Promise<void> {
    await Promise.all(
      [...sessions.values()]
        .filter((session) => now() - session.lastActivity >= IDLE_TIMEOUT_MS)
        .map(terminate),
    )
  }

  function validateBoundary(req: IncomingMessage, res: ServerResponse): void {
    // Compare authorities directly; never parse a URL using an untrusted Host value.
    const host = config.host.includes(':') ? `[${config.host}]` : config.host
    const authority = `${host}:${req.socket.localPort}`
    const requestHost = header(req, 'host')
    if (requestHost !== authority && !(req.socket.localPort === 80 && requestHost === host)) {
      throw new RequestError(403, 'Forbidden Host')
    }
    const origin = header(req, 'origin')
    if (origin !== undefined) {
      if (!config.allowedOrigins.includes(origin)) throw new RequestError(403, 'Forbidden Origin')
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version')
      res.setHeader('Vary', 'Origin')
    }
  }

  function authenticate(req: IncomingMessage, res: ServerResponse): void {
    const authorization = header(req, 'authorization')
    const credential = authorization?.match(/^Bearer ([A-Za-z0-9._~+/-]+=*)$/i)?.[1]
    if (
      !credential ||
      !timingSafeEqual(createHash('sha256').update(credential).digest(), tokenDigest)
    ) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="wireweave-mcp"')
      throw new RequestError(401, 'Bearer authentication required')
    }
    // There is exactly one host-supplied principal. Session IDs never replace authentication.
  }

  function preflight(req: IncomingMessage, res: ServerResponse): boolean {
    if (req.method !== 'OPTIONS') return false
    const method = header(req, 'access-control-request-method')
    const requestedHeaders = header(req, 'access-control-request-headers')
    if (method === undefined && requestedHeaders === undefined) return false
    // validateBoundary already checked Host and every present Origin. A preflight must
    // additionally supply Origin; it negotiates access without admitting any MCP operation.
    if (header(req, 'origin') === undefined || !method || !PREFLIGHT_METHODS.has(method)) {
      throw new RequestError(403, 'Forbidden preflight origin or method')
    }
    const headers = requestedHeaders?.split(',').map((value) => value.trim().toLowerCase()) ?? []
    if (headers.some((value) => !PREFLIGHT_HEADERS.has(value))) {
      throw new RequestError(403, 'Forbidden preflight headers')
    }
    if (
      header(req, 'transfer-encoding') !== undefined ||
      Number(header(req, 'content-length') ?? '0') !== 0
    ) {
      throw new RequestError(400, 'Preflight must not contain a body')
    }
    res.setHeader('Access-Control-Allow-Methods', method)
    if (headers.length)
      res.setHeader('Access-Control-Allow-Headers', [...new Set(headers)].join(', '))
    res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
    res.setHeader('Cache-Control', 'no-store')
    res.writeHead(204)
    res.end()
    return true
  }

  async function initialize(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (slots.size >= config.maxSessions) {
      res.setHeader('Retry-After', '1')
      throw new RequestError(503, 'Too many active sessions')
    }
    const controller = new AbortController()
    const session: Session = {
      controller,
      closed: false,
      lastActivity: now(),
      transport: new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (id) => {
          if (session.closed) throw new Error('Initialization expired')
          session.id = id
          sessions.set(id, session)
          touch(session)
        },
      }),
    }
    slots.add(session)
    session.transport.onclose = () => release(session)
    session.timer = setTimeout(() => {
      respond(res, 408, { error: 'Initialization timed out' })
      void terminate(session).catch(onError)
    }, INITIALIZATION_TIMEOUT_MS)
    session.timer.unref()
    // A disconnected, incomplete handshake owns no session. Established sessions survive
    // network disconnects; only DELETE, expiry, shutdown or MCP cancellation abort work.
    const onDisconnect = () => {
      if (!session.id) void terminate(session).catch(onError)
    }
    res.once('close', onDisconnect)
    let success = false
    try {
      const server = dependencies.createMcpServer(controller.signal)
      await server.connect(session.transport)
      if (session.closed) return
      await session.transport.handleRequest(req, res)
      success = !!session.id && res.statusCode < 400
    } finally {
      res.off('close', onDisconnect)
      if (!success) await terminate(session)
    }
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    validateBoundary(req, res)
    // Origin-form only. Absolute URLs, dot-segment normalization and fragments are not routes.
    const path = req.url?.split('?')[0]
    if (path === '/health' && req.method === 'GET') {
      await expireIdleSessions()
      respond(res, 200, {
        status: 'ok',
        transport: 'streamable-http',
        activeSessions: sessions.size,
        tools: dependencies.toolCount,
      })
      return
    }
    if (path !== '/mcp') throw new RequestError(404, 'Not found')
    if (preflight(req, res)) return
    authenticate(req, res)
    const id = header(req, 'mcp-session-id')
    header(req, 'mcp-protocol-version')
    await expireIdleSessions()
    if (stopping) {
      res.setHeader('Retry-After', '1')
      throw new RequestError(503, 'Server is shutting down')
    }
    if (id !== undefined) {
      const session = sessions.get(id)
      if (!session) throw new RequestError(404, 'Session not found')
      touch(session)
      await session.transport.handleRequest(req, res)
      return
    }
    if (req.method !== 'POST') throw new RequestError(400, 'Initialization POST required')
    await initialize(req, res)
  }

  const httpServer = createServer(
    { requestTimeout: 30_000, headersTimeout: 10_000 },
    (req, res) => {
      void handle(req, res).catch((error: unknown) => {
        if (!(error instanceof RequestError)) onError()
        respond(res, error instanceof RequestError ? error.status : 500, {
          error: error instanceof RequestError ? error.message : 'Internal server error',
        })
      })
    },
  )

  async function close(): Promise<void> {
    stopping = true
    const closed = new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error && (!('code' in error) || error.code !== 'ERR_SERVER_NOT_RUNNING')) reject(error)
        else resolve()
      })
    })
    await Promise.allSettled([...slots].map(terminate))
    httpServer.closeAllConnections()
    await closed
  }

  return { httpServer, close, expireIdleSessions }
}
