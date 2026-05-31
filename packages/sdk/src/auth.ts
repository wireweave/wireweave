import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface StoredConfig {
  token: string
  apiUrl?: string
}

export interface AuthOptions {
  configDir?: string
  configFileName?: string
}

const DEFAULT_CONFIG_DIR_NAME = '.wireweave'
const DEFAULT_CONFIG_FILE_NAME = 'config.json'

function resolveConfigDir(opts?: AuthOptions): string {
  return opts?.configDir ?? path.join(os.homedir(), DEFAULT_CONFIG_DIR_NAME)
}

export function getConfigPath(opts?: AuthOptions): string {
  return path.join(resolveConfigDir(opts), opts?.configFileName ?? DEFAULT_CONFIG_FILE_NAME)
}

export async function loadToken(opts?: AuthOptions): Promise<StoredConfig | null> {
  try {
    const raw = await fs.readFile(getConfigPath(opts), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoredConfig>
    if (typeof parsed.token !== 'string' || parsed.token.length === 0) {
      return null
    }
    return {
      token: parsed.token,
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : undefined,
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    return null
  }
}

export async function saveToken(config: StoredConfig, opts?: AuthOptions): Promise<void> {
  const configDir = resolveConfigDir(opts)
  await fs.mkdir(configDir, { recursive: true, mode: 0o700 })
  await fs.writeFile(getConfigPath(opts), JSON.stringify(config, null, 2), { mode: 0o600 })
}

export async function clearToken(opts?: AuthOptions): Promise<void> {
  try {
    await fs.unlink(getConfigPath(opts))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw err
  }
}

export interface VerifyTokenResult {
  valid: boolean
  status: number
  body?: unknown
}

export async function verifyToken(
  token: string,
  apiUrl: string,
  verifyEndpoint: string,
  fetchFn: typeof fetch = fetch,
): Promise<VerifyTokenResult> {
  const url = `${apiUrl}${verifyEndpoint}`
  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token,
    },
  })
  const body = (await response.json().catch(() => undefined)) as unknown
  return {
    valid: response.ok,
    status: response.status,
    body,
  }
}
