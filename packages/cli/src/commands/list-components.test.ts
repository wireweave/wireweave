import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { listComponentsCommand } from './list-components.js'

interface TestEnv {
  workDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-list-components-'))
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const outChunks: Buffer[] = []
  const errChunks: Buffer[] = []
  stdout.on('data', (c: Buffer) => outChunks.push(c))
  stderr.on('data', (c: Buffer) => errChunks.push(c))
  return {
    workDir,
    stdout,
    stderr,
    readStdout: () => Buffer.concat(outChunks).toString('utf8'),
    readStderr: () => Buffer.concat(errChunks).toString('utf8'),
  }
}

describe('listComponentsCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.workDir, { recursive: true, force: true })
  })

  it('prints a table by default (local — no fetch)', async () => {
    const fetchSpy = vi.fn()
    const code = await listComponentsCommand({
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: {
        authOptions: { configDir: env.workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    })
    expect(code).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    const out = env.readStdout()
    expect(out).toMatch(/^Components: \d+/)
    expect(out).toContain('page')
  })

  it('emits JSON when --format json', async () => {
    const code = await listComponentsCommand({
      format: 'json',
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })
    expect(code).toBe(0)
    const payload = JSON.parse(env.readStdout()) as { count: number; components: unknown[] }
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.components.length).toBe(payload.count)
  })

  it('filters by category and never invokes fetch', async () => {
    const fetchSpy = vi.fn()
    const code = await listComponentsCommand({
      category: 'layout',
      format: 'json',
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: {
        authOptions: { configDir: env.workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    })
    expect(code).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    const payload = JSON.parse(env.readStdout()) as {
      count: number
      components: { category: string }[]
    }
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.components.every((c) => c.category === 'layout')).toBe(true)
  })
})
