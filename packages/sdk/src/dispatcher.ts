import { callApi } from './client.js'
import { isLocalDispatchTool, localDispatch } from './local-dispatcher.js'
import type { ApiConfig, LocalToolContentBlock, LocalToolResult, ToolEndpoint } from './types.js'

export interface DispatchOptions {
  apiConfig: ApiConfig
  endpoints: Record<string, ToolEndpoint>
  fetchFn?: typeof fetch
}

export async function dispatch(
  toolName: string,
  args: Record<string, unknown>,
  options: DispatchOptions,
): Promise<LocalToolResult> {
  if (isLocalDispatchTool(toolName)) {
    return localDispatch(toolName, args)
  }

  const endpoint = options.endpoints[toolName]
  if (!endpoint) {
    return errorResult(`Unknown tool: ${toolName}`)
  }

  try {
    const result = await callApi(options.apiConfig, endpoint, args, options.fetchFn)
    return successResult(result as Record<string, unknown>)
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : 'Unknown error')
  }
}

function successResult(payload: Record<string, unknown>): LocalToolResult {
  const block: LocalToolContentBlock = {
    type: 'text',
    text: JSON.stringify(payload, null, 2),
  }
  return { content: [block] }
}

function errorResult(message: string): LocalToolResult {
  const block: LocalToolContentBlock = {
    type: 'text',
    text: JSON.stringify({ error: message }, null, 2),
  }
  return { content: [block], isError: true }
}
