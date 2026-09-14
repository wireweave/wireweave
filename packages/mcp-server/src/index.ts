#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { type HandlerContext } from './handlers.js'
import { HttpConfigurationError, readHttpConfig } from './http-config.js'
import { createHttpServer } from './http-server.js'
import { createMcpServer } from './mcp-server.js'
import { tools, toolEndpoints } from './tools.js'

function log(message: string): void {
  process.stderr.write(`[Wireweave] ${message}\n`)
}

function onShutdown(close: () => Promise<void>): void {
  let stopping = false
  const shutdown = () => {
    if (stopping) return
    stopping = true
    void close().then(
      () => process.exit(0),
      () => {
        log('Server shutdown failed')
        process.exit(1)
      },
    )
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

async function main(): Promise<void> {
  const context: HandlerContext = {
    apiConfig: {
      apiUrl: process.env.WIREWEAVE_API_URL || 'https://api.wireweave.org',
      apiKey: process.env.WIREWEAVE_API_KEY || '',
    },
    endpoints: toolEndpoints,
  }
  const onError = () => log('MCP request failed')
  if (process.argv.includes('--http') || process.env.WIREWEAVE_TRANSPORT === 'http') {
    const config = readHttpConfig(process.env)
    const app = createHttpServer(config, {
      createMcpServer: (signal) => createMcpServer(context, signal, onError),
      toolCount: tools.length,
      onError,
    })
    await new Promise<void>((resolve, reject) => {
      app.httpServer.once('error', reject)
      app.httpServer.listen(config.port, config.host, () => {
        app.httpServer.off('error', reject)
        app.httpServer.on('error', onError)
        resolve()
      })
    })
    onShutdown(app.close)
    log(`MCP server started (streamable-http) on port ${config.port}`)
  } else {
    const server = createMcpServer(context, undefined, onError)
    await server.connect(new StdioServerTransport())
    onShutdown(() => server.close())
    log(`MCP server started (stdio) with ${tools.length} tools`)
  }
}

main().catch((error: unknown) => {
  log(error instanceof HttpConfigurationError ? error.message : 'Failed to start server')
  process.exit(1)
})
