import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearToken, getConfigPath, loadToken, saveToken, verifyToken } from './auth.js'

let tempDir: string

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-sdk-test-'))
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('getConfigPath', () => {
  it('returns ~/.wireweave/config.json by default', () => {
    const p = getConfigPath()
    expect(p).toBe(path.join(os.homedir(), '.wireweave', 'config.json'))
  })

  it('respects configDir override', () => {
    const p = getConfigPath({ configDir: '/tmp/custom' })
    expect(p).toBe('/tmp/custom/config.json')
  })

  it('respects configFileName override', () => {
    const p = getConfigPath({ configDir: '/tmp/custom', configFileName: 'creds.json' })
    expect(p).toBe('/tmp/custom/creds.json')
  })
})

describe('saveToken / loadToken / clearToken', () => {
  it('round-trips token + apiUrl', async () => {
    await saveToken(
      { token: 'sk_test_123', apiUrl: 'https://api.example.com' },
      { configDir: tempDir },
    )
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toEqual({ token: 'sk_test_123', apiUrl: 'https://api.example.com' })
  })

  it('round-trips token only (apiUrl optional)', async () => {
    await saveToken({ token: 'sk_only' }, { configDir: tempDir })
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toEqual({ token: 'sk_only', apiUrl: undefined })
  })

  it('returns null when no config file exists', async () => {
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toBeNull()
  })

  it('returns null for malformed JSON', async () => {
    await fs.mkdir(tempDir, { recursive: true })
    await fs.writeFile(path.join(tempDir, 'config.json'), 'not json')
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toBeNull()
  })

  it('returns null when token field is missing or empty', async () => {
    await fs.mkdir(tempDir, { recursive: true })
    await fs.writeFile(path.join(tempDir, 'config.json'), JSON.stringify({ apiUrl: 'x' }))
    expect(await loadToken({ configDir: tempDir })).toBeNull()

    await fs.writeFile(path.join(tempDir, 'config.json'), JSON.stringify({ token: '' }))
    expect(await loadToken({ configDir: tempDir })).toBeNull()
  })

  it('ignores non-string apiUrl', async () => {
    await fs.mkdir(tempDir, { recursive: true })
    await fs.writeFile(
      path.join(tempDir, 'config.json'),
      JSON.stringify({ token: 'sk', apiUrl: 123 }),
    )
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toEqual({ token: 'sk', apiUrl: undefined })
  })

  it('creates parent dir on save', async () => {
    const nested = path.join(tempDir, 'deep', 'nested')
    await saveToken({ token: 'sk' }, { configDir: nested })
    const stat = await fs.stat(path.join(nested, 'config.json'))
    expect(stat.isFile()).toBe(true)
  })

  it('clearToken removes the file', async () => {
    await saveToken({ token: 'sk' }, { configDir: tempDir })
    await clearToken({ configDir: tempDir })
    const loaded = await loadToken({ configDir: tempDir })
    expect(loaded).toBeNull()
  })

  it('clearToken is idempotent when file does not exist', async () => {
    await expect(clearToken({ configDir: tempDir })).resolves.toBeUndefined()
  })
})

describe('verifyToken', () => {
  it('returns valid=true on 2xx response', async () => {
    const fetchFn = vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify({ userId: 'u1' }), { status: 200 })),
    ) as unknown as typeof fetch

    const result = await verifyToken('sk_123', 'https://api.example.com', '/auth/verify', fetchFn)
    expect(result.valid).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ userId: 'u1' })
  })

  it('returns valid=false on 401', async () => {
    const fetchFn = vi.fn(async () =>
      Promise.resolve(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })),
    ) as unknown as typeof fetch

    const result = await verifyToken('sk_bad', 'https://api.example.com', '/auth/verify', fetchFn)
    expect(result.valid).toBe(false)
    expect(result.status).toBe(401)
  })

  it('sends x-api-key header with the token', async () => {
    const fetchFn = vi.fn(async () =>
      Promise.resolve(new Response('{}', { status: 200 })),
    ) as unknown as typeof fetch

    await verifyToken('sk_abc', 'https://api.example.com', '/auth/verify', fetchFn)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/auth/verify',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'x-api-key': 'sk_abc' }) as unknown,
      }),
    )
  })

  it('returns body=undefined when response is not JSON', async () => {
    const fetchFn = vi.fn(async () =>
      Promise.resolve(new Response('not json', { status: 200 })),
    ) as unknown as typeof fetch

    const result = await verifyToken('sk', 'https://api.example.com', '/v', fetchFn)
    expect(result.body).toBeUndefined()
  })
})
