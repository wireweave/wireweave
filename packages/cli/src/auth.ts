import {
  clearToken,
  getConfigPath,
  loadToken,
  saveToken,
  verifyToken,
  type AuthOptions,
  type StoredConfig,
  type VerifyTokenResult,
} from '@wireweave/sdk'

export const DEFAULT_API_URL = 'https://api.wireweave.org'
export const VERIFY_ENDPOINT = '/billing/balance'

export interface AuthDeps {
  authOptions?: AuthOptions
  fetchFn?: typeof fetch
}

export interface AccountInfo {
  apiUrl: string
  tokenSuffix: string
  balance?: number
  subscriptionPlan?: string
  monthlyRemaining?: number
}

export interface LoginParams {
  apiKey: string
  apiUrl?: string
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

function resolveApiUrl(explicit?: string, stored?: StoredConfig | null): string {
  return explicit ?? stored?.apiUrl ?? process.env.WIREWEAVE_API_URL ?? DEFAULT_API_URL
}

function parseAccountBody(body: unknown): Omit<AccountInfo, 'apiUrl' | 'tokenSuffix'> {
  if (body === null || typeof body !== 'object') return {}
  const record = body as Record<string, unknown>
  const balance = typeof record.balance === 'number' ? record.balance : undefined
  const subscriptionPlan =
    typeof record.subscriptionPlan === 'string' ? record.subscriptionPlan : undefined
  const monthlyRemaining =
    typeof record.monthlyRemaining === 'number' ? record.monthlyRemaining : undefined
  return { balance, subscriptionPlan, monthlyRemaining }
}

function verifyResultToAccount(
  apiUrl: string,
  token: string,
  result: VerifyTokenResult,
): AccountInfo {
  return {
    apiUrl,
    tokenSuffix: token.slice(-4),
    ...parseAccountBody(result.body),
  }
}

function statusToMessage(status: number, fallback: string): string {
  if (status === 401) return 'Invalid API key. Get one at https://wireweave.org'
  if (status === 403) return 'API key is not allowed to access this account.'
  if (status === 429) return 'Rate limited. Wait a moment and try again.'
  if (status >= 500) return 'Service temporarily unavailable. Please retry.'
  return fallback
}

export async function login(params: LoginParams, deps: AuthDeps = {}): Promise<AccountInfo> {
  const apiKey = params.apiKey.trim()
  if (apiKey.length === 0) {
    throw new AuthError('API key is empty.')
  }
  const apiUrl = resolveApiUrl(params.apiUrl)

  const result = await verifyToken(apiKey, apiUrl, VERIFY_ENDPOINT, deps.fetchFn)
  if (!result.valid) {
    throw new AuthError(
      statusToMessage(result.status, `Login failed (HTTP ${result.status}).`),
      result.status,
    )
  }

  await saveToken({ token: apiKey, apiUrl }, deps.authOptions)
  return verifyResultToAccount(apiUrl, apiKey, result)
}

export interface WhoamiResult {
  loggedIn: boolean
  account?: AccountInfo
  configPath: string
  reason?: 'not-logged-in' | 'invalid-token'
}

export async function whoami(deps: AuthDeps = {}): Promise<WhoamiResult> {
  const configPath = getConfigPath(deps.authOptions)
  const stored = await loadToken(deps.authOptions)
  if (!stored) {
    return { loggedIn: false, configPath, reason: 'not-logged-in' }
  }
  const apiUrl = resolveApiUrl(undefined, stored)
  const result = await verifyToken(stored.token, apiUrl, VERIFY_ENDPOINT, deps.fetchFn)
  if (!result.valid) {
    return { loggedIn: false, configPath, reason: 'invalid-token' }
  }
  return {
    loggedIn: true,
    configPath,
    account: verifyResultToAccount(apiUrl, stored.token, result),
  }
}

export interface LogoutResult {
  removed: boolean
  configPath: string
}

export async function logout(deps: AuthDeps = {}): Promise<LogoutResult> {
  const configPath = getConfigPath(deps.authOptions)
  const stored = await loadToken(deps.authOptions)
  if (!stored) {
    return { removed: false, configPath }
  }
  await clearToken(deps.authOptions)
  return { removed: true, configPath }
}
