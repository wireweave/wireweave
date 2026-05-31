import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PassThrough } from 'node:stream'
import { whoamiCommand } from './whoami.js'

interface TestEnv {
  configDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-whoami-'))
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

async function seedConfig(dir: string, token: string, apiUrl?: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify({ token, apiUrl }, null, 2), {
    mode: 0o600,
  })
}

describe('whoamiCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.configDir, { recursive: true, force: true })
  })

  it('returns 0 and prompts login when no token is stored', async () => {
    const code = await whoamiCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      deps: { authOptions: { configDir: env.configDir } },
    })

    expect(code).toBe(0)
    expect(env.readStdout()).toMatch(/Not logged in. Run `wireweave login`/)
  })

  it('returns 1 when stored token is invalid', async () => {
    await seedConfig(env.configDir, 'sk-stale-2222', 'https://api.example.test')

    const code = await whoamiCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(401),
      },
    })

    expect(code).toBe(1)
    expect(env.readStdout()).toMatch(/Stored token is no longer valid/)
  })

  it('prints account info on success', async () => {
    await seedConfig(env.configDir, 'sk-ok-3333', 'https://api.example.test')

    const code = await whoamiCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      deps: {
        authOptions: { configDir: env.configDir },
        fetchFn: makeFetch(200, {
          balance: 100,
          subscriptionPlan: 'starter',
          monthlyRemaining: 7,
        }),
      },
    })

    expect(code).toBe(0)
    const out = env.readStdout()
    expect(out).toMatch(/Logged in to https:\/\/api\.example\.test \(token \.\.\.3333\)/)
    expect(out).toMatch(/plan: starter/)
    expect(out).toMatch(/balance: 100/)
    expect(out).toMatch(/monthly remaining: 7/)
    expect(out).toMatch(/config: .*config\.json/)
  })
})
