import {
  dispatch,
  loadToken,
  toolEndpoints,
  type ApiConfig,
  type DispatchOptions,
  type LocalToolResult,
} from '@wireweave/sdk'

export const DEFAULT_API_URL = 'https://api.wireweave.org'

export interface BuildDispatchOptionsParams {
  apiUrl?: string
  apiKey?: string
  fetchFn?: typeof fetch
  authOptions?: Parameters<typeof loadToken>[0]
}

function resolveApiUrl(explicit?: string, stored?: string | null): string {
  return explicit ?? stored ?? process.env.WIREWEAVE_API_URL ?? DEFAULT_API_URL
}

export async function buildDispatchOptions(
  params: BuildDispatchOptionsParams = {},
): Promise<DispatchOptions> {
  const stored = await loadToken(params.authOptions)
  const apiKey = params.apiKey ?? stored?.token ?? ''
  const apiUrl = resolveApiUrl(params.apiUrl, stored?.apiUrl)
  const apiConfig: ApiConfig = { apiUrl, apiKey }
  const options: DispatchOptions = { apiConfig, endpoints: toolEndpoints }
  if (params.fetchFn) options.fetchFn = params.fetchFn
  return options
}

export async function callTool(
  toolName: string,
  args: Record<string, unknown>,
  params: BuildDispatchOptionsParams = {},
): Promise<LocalToolResult> {
  const options = await buildDispatchOptions(params)
  return dispatch(toolName, args, options)
}

export function extractText(result: LocalToolResult): string {
  return result.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

export function parseJsonResult<T = unknown>(result: LocalToolResult): T {
  return JSON.parse(extractText(result)) as T
}
