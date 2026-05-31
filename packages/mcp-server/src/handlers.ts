import {
  type CallToolResult,
  type GetPromptResult,
  type ListPromptsResult,
  type ListResourcesResult,
  type ListToolsResult,
  type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js'
import { dispatch, type ApiConfig, type DispatchOptions, type ToolEndpoint } from '@wireweave/sdk'

import { prompts, promptTemplates } from './prompts.js'
import { resources, resourceToTool } from './resources.js'
import { tools } from './tools.js'

export interface HandlerContext {
  apiConfig: ApiConfig
  endpoints: Record<string, ToolEndpoint>
  fetchFn?: typeof fetch
}

function dispatchOptions(ctx: HandlerContext): DispatchOptions {
  return {
    apiConfig: ctx.apiConfig,
    endpoints: ctx.endpoints,
    fetchFn: ctx.fetchFn,
  }
}

export function handleListTools(): ListToolsResult {
  return { tools }
}

export async function handleCallTool(
  name: string,
  args: Record<string, unknown> | undefined,
  ctx: HandlerContext,
): Promise<CallToolResult> {
  return dispatch(name, args ?? {}, dispatchOptions(ctx))
}

export function handleListPrompts(): ListPromptsResult {
  return { prompts }
}

export function handleGetPrompt(
  name: string,
  args: Record<string, unknown> | undefined,
): GetPromptResult {
  const prompt = prompts.find((p) => p.name === name)
  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`)
  }

  const template = promptTemplates[name]
  if (!template) {
    throw new Error(`Prompt template not found: ${name}`)
  }

  let messageText = template
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      messageText = messageText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
    }
  }
  messageText = messageText.replace(/\{\{[^}]+\}\}/g, '')

  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: messageText,
        },
      },
    ],
  }
}

export function handleListResources(): ListResourcesResult {
  return { resources }
}

export async function handleReadResource(
  uri: string,
  ctx: HandlerContext,
): Promise<ReadResourceResult> {
  const resource = resources.find((r) => r.uri === uri)
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`)
  }

  const toolName = resourceToTool[uri]
  if (!toolName) {
    throw new Error(`No tool mapping for resource: ${uri}`)
  }

  const result = await dispatch(toolName, {}, dispatchOptions(ctx))

  if (result.isError) {
    const message = result.content[0]?.text ?? 'Unknown error'
    throw new Error(`Failed to fetch resource: ${message}`)
  }

  const text = result.content[0]?.text ?? ''

  return {
    contents: [
      {
        uri,
        mimeType: resource.mimeType,
        text,
      },
    ],
  }
}
