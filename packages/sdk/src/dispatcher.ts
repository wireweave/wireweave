import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv-provider.js'
import type { JsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/types.js'
import { callApi } from './client.js'
import { tools } from './generated/tools.js'
import { isLocalDispatchTool, localDispatch } from './local-dispatcher.js'
import type { ApiConfig, LocalToolContentBlock, LocalToolResult, ToolEndpoint } from './types.js'

export interface DispatchOptions {
  apiConfig: ApiConfig
  endpoints: Record<string, ToolEndpoint>
  fetchFn?: typeof fetch
  signal?: AbortSignal
}

const catalog = new Map(tools.map((tool) => [tool.name, tool]))
const validators = new Map<string, JsonSchemaValidator<Record<string, unknown>>>()
let schemaValidator: AjvJsonSchemaValidator | undefined

export async function dispatch(
  toolName: string,
  args: Record<string, unknown>,
  options: DispatchOptions,
): Promise<LocalToolResult> {
  const tool = catalog.get(toolName)
  if (!tool) {
    return errorResult(`Unknown tool: ${toolName}`)
  }

  try {
    options.signal?.throwIfAborted()
    let validate = validators.get(toolName)
    if (!validate) {
      schemaValidator ??= new AjvJsonSchemaValidator()
      validate = schemaValidator.getValidator<Record<string, unknown>>(tool.inputSchema)
      validators.set(toolName, validate)
    }
    const validation = validate(args)
    if (!validation.valid) {
      return errorResult(`Invalid arguments for ${toolName}: ${validation.errorMessage}`)
    }

    if (isLocalDispatchTool(toolName)) {
      return localDispatch(toolName, args)
    }

    const endpoint = Object.hasOwn(options.endpoints, toolName)
      ? options.endpoints[toolName]
      : undefined
    if (!endpoint) return errorResult(`Unknown tool: ${toolName}`)

    const result = await callApi(options.apiConfig, endpoint, args, options.fetchFn, options.signal)
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
