import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PassThrough } from 'node:stream'
import { logoutCommand } from './logout.js'

interface TestEnv {
  configDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-logout-'))
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

async function seedConfig(dir: string, token: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify({ token }, null, 2), {
    mode: 0o600,
  })
}

describe('logoutCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.configDir, { recursive: true, force: true })
  })

  it('reports already-logged-out when no token exists', async () => {
    const code = await logoutCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      deps: { authOptions: { configDir: env.configDir } },
    })

    expect(code).toBe(0)
    expect(env.readStdout()).toMatch(/Already logged out/)
  })

  it('removes the stored token file', async () => {
    await seedConfig(env.configDir, 'sk-bye-4444')
    const configFile = path.join(env.configDir, 'config.json')
    await expect(fs.access(configFile)).resolves.toBeUndefined()

    const code = await logoutCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      deps: { authOptions: { configDir: env.configDir } },
    })

    expect(code).toBe(0)
    expect(env.readStdout()).toMatch(/Logged out. Removed /)
    await expect(fs.access(configFile)).rejects.toThrow()
  })
})
