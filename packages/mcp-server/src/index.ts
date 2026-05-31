#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

import { toolEndpoints, localToolNames } from './tools.js'
import { prompts } from './prompts.js'
import { resources } from './resources.js'
import { tools } from './tools.js'
import { type ApiConfig } from '@wireweave/sdk'
import {
  type HandlerContext,
  handleCallTool,
  handleGetPrompt,
  handleListPrompts,
  handleListResources,
  handleListTools,
  handleReadResource,
} from './handlers.js'

// API Server URL
const API_URL = process.env.WIREWEAVE_API_URL || 'https://api.wireweave.org'
const API_KEY = process.env.WIREWEAVE_API_KEY || ''

const apiConfig: ApiConfig = {
  apiUrl: API_URL,
  apiKey: API_KEY,
}

const handlerContext: HandlerContext = {
  apiConfig,
  endpoints: toolEndpoints,
}

// Transport mode detection
const isHttpMode = process.argv.includes('--http') || process.env.WIREWEAVE_TRANSPORT === 'http'
const HTTP_PORT = parseInt(process.env.WIREWEAVE_MCP_PORT || '3305', 10)
const HTTP_HOST = process.env.WIREWEAVE_MCP_HOST || '127.0.0.1'

// stdio mode reserves stdout for MCP JSON-RPC protocol — logs must go to stderr.
// HTTP mode allows stdout (no protocol on stdout).
function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓'
  const line = `[Wireweave] ${prefix} ${message}\n`
  if (isHttpMode) {
    process.stdout.write(line)
  } else {
    process.stderr.write(line)
  }
}

// Create MCP server instance — single rule: ALL outbound calls route through SDK `dispatch`.
// Handlers live in handlers.ts so they're directly testable (no transport mocking).
function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'wireweave-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    },
  )

  server.setRequestHandler(ListToolsRequestSchema, () => handleListTools())

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    return handleCallTool(name, args, handlerContext)
  })

  server.setRequestHandler(ListPromptsRequestSchema, () => handleListPrompts())

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name, arguments: args } = request.params
    return handleGetPrompt(name, args)
  })

  server.setRequestHandler(ListResourcesRequestSchema, () => handleListResources())

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params
    return handleReadResource(uri, handlerContext)
  })

  // Error handling - sanitized
  server.onerror = () => {
    log('An error occurred', 'error')
  }

  return server
}

// Start with stdio transport (default)
async function startStdio() {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.on('SIGINT', () => {
    void (async () => {
      await server.close()
      process.exit(0)
    })()
  })

  log(
    `MCP server started (stdio) with ${tools.length} tools (${localToolNames.size} local + ${tools.length - localToolNames.size} server), ${prompts.length} prompts, ${resources.length} resources`,
  )

  if (!API_KEY) {
    log('API key not configured. Get one at https://wireweave.org', 'warn')
  }
}

// Start with Streamable HTTP transport
function startHttp() {
  // Track active transports for session management
  const transports = new Map<string, { server: Server; transport: StreamableHTTPServerTransport }>()

  const httpServer = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`)

      // Only handle /mcp endpoint
      if (url.pathname !== '/mcp') {
        // Health check endpoint
        if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              status: 'ok',
              transport: 'streamable-http',
              activeSessions: transports.size,
              tools: tools.length,
            }),
          )
          return
        }

        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Not found. Use /mcp for MCP protocol.' }))
        return
      }

      // Check for existing session
      const sessionId = req.headers['mcp-session-id'] as string | undefined

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        const existing = transports.get(sessionId)!
        await existing.transport.handleRequest(req, res)
        return
      }

      // DELETE for unknown session (valid sessions handled above by handleRequest)
      if (req.method === 'DELETE') {
        res.writeHead(404)
        res.end()
        return
      }

      // Only POST can create a new session (GET/DELETE without session are invalid)
      if (req.method !== 'POST') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Session required. Send an initialization POST first.' }))
        return
      }

      // Session limit check
      const MAX_SESSIONS = parseInt(process.env.WIREWEAVE_MCP_MAX_SESSIONS || '10', 10)
      if (transports.size >= MAX_SESSIONS) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Too many active sessions' }))
        return
      }

      // New session: create transport and server
      const server = createMcpServer()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports.set(sessionId, { server, transport })
          log(`New session: ${sessionId}`)
        },
      })

      // Clean up on close (fires after DELETE or transport.close())
      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId)
          log(`Session closed: ${transport.sessionId}`)
        }
      }

      await server.connect(transport)
      await transport.handleRequest(req, res)
    })()
  })

  httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
    log(`MCP server started (streamable-http) at http://${HTTP_HOST}:${HTTP_PORT}/mcp`)
    log(`Health check: http://${HTTP_HOST}:${HTTP_PORT}/health`)
    log(
      `${tools.length} tools (${localToolNames.size} local + ${tools.length - localToolNames.size} server), ${prompts.length} prompts, ${resources.length} resources`,
    )

    if (!API_KEY) {
      log('API key not configured. Get one at https://wireweave.org', 'warn')
    }
  })

  process.on('SIGINT', () => {
    void (async () => {
      log('Shutting down...')
      for (const [, { server }] of transports) {
        await server.close()
      }
      httpServer.close()
      process.exit(0)
    })()
  })
}

// Start the server
async function main() {
  if (isHttpMode) {
    startHttp()
  } else {
    await startStdio()
  }
}

main().catch(() => {
  log('Failed to start server', 'error')
  process.exit(1)
})
