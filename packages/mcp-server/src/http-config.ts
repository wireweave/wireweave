import { isIP } from 'node:net'

export interface HttpConfig {
  readonly host: string
  readonly port: number
  readonly maxSessions: number
  readonly token: string
  readonly allowedOrigins: readonly string[]
}

export class HttpConfigurationError extends Error {}

function integer(value: string | undefined, fallback: number, max: number, name: string): number {
  if (value === undefined) return fallback
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new HttpConfigurationError(`${name} must be an integer from 1 to ${max}`)
  }
  return Number(value)
}

export function readHttpConfig(env: NodeJS.ProcessEnv): HttpConfig {
  const token = env.WIREWEAVE_MCP_TOKEN
  if (!token || token.length > 4096 || !/^[A-Za-z0-9._~+/-]+=*$/.test(token)) {
    throw new HttpConfigurationError('WIREWEAVE_MCP_TOKEN must contain a valid bearer credential')
  }

  const host = env.WIREWEAVE_MCP_HOST ?? '127.0.0.1'
  if (host !== 'localhost' && host !== '::1' && !(isIP(host) === 4 && host.startsWith('127.'))) {
    throw new HttpConfigurationError(
      'WIREWEAVE_MCP_HOST must be loopback; no non-loopback deployment profile is installed',
    )
  }

  const origins = env.WIREWEAVE_MCP_ALLOWED_ORIGINS ?? ''
  const allowedOrigins = origins === '' ? [] : origins.split(',').map((origin) => origin.trim())
  for (const origin of allowedOrigins) {
    let valid = false
    try {
      const url = new URL(origin)
      valid =
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === origin &&
        !origin.includes('*')
    } catch {
      // Report the setting, never its untrusted value or any credentials it contains.
    }
    if (!valid) {
      throw new HttpConfigurationError(
        'WIREWEAVE_MCP_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or wildcards',
      )
    }
  }

  return Object.freeze({
    host,
    port: integer(env.WIREWEAVE_MCP_PORT, 3305, 65535, 'WIREWEAVE_MCP_PORT'),
    maxSessions: integer(env.WIREWEAVE_MCP_MAX_SESSIONS, 10, 1024, 'WIREWEAVE_MCP_MAX_SESSIONS'),
    token,
    allowedOrigins: Object.freeze([...new Set(allowedOrigins)]),
  })
}
