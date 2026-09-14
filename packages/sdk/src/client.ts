import type { ApiConfig, ApiErrorBody, CreditInfo, ToolEndpoint } from './types.js'

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT'])

function stringifyParam(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value)
}

export function buildRequest(
  config: ApiConfig,
  endpoint: ToolEndpoint,
  args?: Record<string, unknown>,
): { url: string; options: RequestInit; bodyForGet: Record<string, unknown> } {
  let path = endpoint.path
  const body: Record<string, unknown> = { ...args }

  if (endpoint.pathParams) {
    for (const param of endpoint.pathParams) {
      const value = args?.[param]
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        value === '' ||
        value === '.' ||
        value === '..' ||
        (typeof value === 'number' && !Number.isFinite(value))
      ) {
        throw new Error(`Invalid or missing path parameter: ${param}`)
      }
      path = path.replace(`:${param}`, encodeURIComponent(String(value)))
      delete body[param]
    }
  }

  let url = `${config.apiUrl}${path}`
  const options: RequestInit = {
    method: endpoint.method,
    redirect: 'error',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    },
  }

  if (MUTATING_METHODS.has(endpoint.method) && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body)
  } else if (endpoint.method === 'GET' && Object.keys(body).length > 0) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) {
        params.append(key, value.map(stringifyParam).join(','))
      } else {
        params.append(key, stringifyParam(value))
      }
    }
    url = `${url}?${params.toString()}`
  }

  return { url, options, bodyForGet: body }
}

export function parseErrorMessage(status: number, error: ApiErrorBody): string {
  if (status === 401) return 'Invalid API key. Get one at https://wireweave.org'
  if (status === 402) return `Insufficient credits. ${error.message ?? 'Please add more credits.'}`
  if (status === 403) return 'Access denied. Upgrade your plan for this feature.'
  if (status === 404 && error.error?.includes('project')) {
    return 'Project not found. Call wireweave_cloud_list_projects to see available projects.'
  }
  if (status === 400 && error.error?.includes('name')) {
    return 'Invalid wireframe name. Provide a non-empty name for the wireframe.'
  }
  if (status === 429) return 'Rate limit exceeded. Please wait and try again.'
  if (status >= 500) return 'Service temporarily unavailable'
  return error.error ?? error.message ?? 'Request failed'
}

export function extractCreditInfo(headers: Headers): CreditInfo {
  const balance = headers.get('X-Credits-Balance')
  const monthlyRemaining = headers.get('X-Credits-Monthly-Remaining')
  const totalAvailable = headers.get('X-Credits-Total-Available')
  return {
    balance: balance !== null ? parseInt(balance, 10) : undefined,
    monthlyRemaining: monthlyRemaining !== null ? parseInt(monthlyRemaining, 10) : undefined,
    totalAvailable: totalAvailable !== null ? parseInt(totalAvailable, 10) : undefined,
  }
}

export async function callApi(
  config: ApiConfig,
  endpoint: ToolEndpoint,
  args?: Record<string, unknown>,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted()
  if (!config.apiKey) {
    throw new Error('WIREWEAVE_API_KEY environment variable is required')
  }

  const { url, options } = buildRequest(config, endpoint, args)
  const timeout = AbortSignal.timeout(30_000)
  options.signal = signal ? AbortSignal.any([signal, timeout]) : timeout

  const response = await fetchFn(url, options)
  options.signal.throwIfAborted()
  const creditInfo = extractCreditInfo(response.headers)

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Request failed' }))) as ApiErrorBody
    throw new Error(parseErrorMessage(response.status, error))
  }

  const result = (await response.json()) as unknown
  options.signal.throwIfAborted()

  if (
    typeof result === 'object' &&
    result !== null &&
    !Array.isArray(result) &&
    (creditInfo.balance !== undefined || creditInfo.totalAvailable !== undefined)
  ) {
    return { ...result, _credits: creditInfo }
  }

  return result
}
