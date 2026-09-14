import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync } from 'node:fs'
import {
  type HandlerContext,
  handleCallTool,
  handleGetPrompt,
  handleListPrompts,
  handleListResources,
  handleListTools,
  handleReadResource,
} from './handlers.js'

export function createMcpServer(
  context: HandlerContext,
  sessionSignal?: AbortSignal,
  onError: () => void = () => {},
): Server {
  // Both src/ and the bundled dist/ are directly beneath the published manifest.
  // Read at runtime: release versioning can happen after the bundle was built.
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    version: unknown
  }
  if (typeof manifest.version !== 'string' || !manifest.version) {
    throw new Error('MCP package version is missing')
  }
  const server = new Server(
    { name: 'wireweave-mcp', version: manifest.version },
    { capabilities: { tools: {}, prompts: {}, resources: {} } },
  )
  const signalFor = (requestSignal: AbortSignal): AbortSignal =>
    sessionSignal ? AbortSignal.any([requestSignal, sessionSignal]) : requestSignal

  server.setRequestHandler(ListToolsRequestSchema, () => handleListTools())
  server.setRequestHandler(CallToolRequestSchema, (request, extra) =>
    handleCallTool(request.params.name, request.params.arguments, context, signalFor(extra.signal)),
  )
  server.setRequestHandler(ListPromptsRequestSchema, () => handleListPrompts())
  server.setRequestHandler(GetPromptRequestSchema, (request) =>
    handleGetPrompt(request.params.name, request.params.arguments),
  )
  server.setRequestHandler(ListResourcesRequestSchema, () => handleListResources())
  server.setRequestHandler(ReadResourceRequestSchema, (request, extra) =>
    handleReadResource(request.params.uri, context, signalFor(extra.signal)),
  )
  server.onerror = onError
  return server
}
