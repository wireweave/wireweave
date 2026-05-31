import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PassThrough } from 'node:stream'
import { loginCommand } from './login.js'

interface TestEnv {
  configDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-login-'))
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const outChunks: Buffer[] = []
  const errChunks: Buffer[] = []
  stdout.on('data', (c: Buffer) => outChunks.push(c))
  stderr.on('data', (c: Buffer) => errChunks.push(c))
  return {
    configDir,
    stdout,
    stderr,
    readStdout: () => Buffer.concat(outChunks).toString('utf8'),
    readStderr: () => Buffer.concat(errChunks).toString('utf8'),
  }
}

function makeFetch(status: number, body: unknown = {}): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
}

describe('loginCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.configDir, { recursive: true, force: true })
  })

  it('returns 2 when no API key is supplied', async () => {
    const stdin = new PassThrough()
    Object.assign(stdin, { isTTY: true })

    const code = await loginCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      env: {},
      stdin,
      deps: { authOptions: { configDir: env.configDir } },
    })

    expect(code).toBe(2)
    expect(env.readStderr()).toMatch(/No API key/)
  })

  it('saves token and prints account info on success', async () => {
    const code = await loginCommand({
      apiKey: 'sk-test-1234',
      apiUrl: 'https://api.example.test',
      stdout: env.stdout,
      stderr: env.stderr,
      env: {},
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(200, { balance: 42, subscriptionPlan: 'pro' }),
      },
    })

    expect(code).toBe(0)
    expect(env.readStdout()).toMatch(
      /Signed in to https:\/\/api\.example\.test \(token \.\.\.1234\)/,
    )
    expect(env.readStdout()).toMatch(/plan: pro/)
    expect(env.readStdout()).toMatch(/balance: 42/)

    const stored = JSON.parse(
      await fs.readFile(path.join(env.configDir, 'config.json'), 'utf8'),
    ) as { token: string; apiUrl: string }
    expect(stored.token).toBe('sk-test-1234')
    expect(stored.apiUrl).toBe('https://api.example.test')
  })

  it('returns 1 with friendly message on 401', async () => {
    const code = await loginCommand({
      apiKey: 'sk-bad',
      apiUrl: 'https://api.example.test',
      stdout: env.stdout,
      stderr: env.stderr,
      env: {},
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(401, { error: 'unauthorized' }),
      },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/Invalid API key/)
    await expect(fs.access(path.join(env.configDir, 'config.json'))).rejects.toThrow()
  })

  it('uses WIREWEAVE_API_KEY when --api-key is not supplied', async () => {
    const code = await loginCommand({
      apiUrl: 'https://api.example.test',
      stdout: env.stdout,
      stderr: env.stderr,
      env: { WIREWEAVE_API_KEY: 'sk-env-9999' },
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(200, {}),
      },
    })

    expect(code).toBe(0)
    const stored = JSON.parse(
      await fs.readFile(path.join(env.configDir, 'config.json'), 'utf8'),
    ) as { token: string }
    expect(stored.token).toBe('sk-env-9999')
  })

  it('reads API key from stdin when not piped via flag or env', async () => {
    const stdin = new PassThrough()
    Object.assign(stdin, { isTTY: false })
    stdin.end('sk-piped-1111\n')

    const code = await loginCommand({
      apiUrl: 'https://api.example.test',
      stdout: env.stdout,
      stderr: env.stderr,
      env: {},
      stdin,
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(200, {}),
      },
    })

    expect(code).toBe(0)
    const stored = JSON.parse(
      await fs.readFile(path.join(env.configDir, 'config.json'), 'utf8'),
    ) as { token: string }
    expect(stored.token).toBe('sk-piped-1111')
  })
})
