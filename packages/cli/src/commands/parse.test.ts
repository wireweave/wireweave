import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { parseCommand } from './parse.js'

interface TestEnv {
  workDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-parse-'))
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

describe('parseCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.workDir, { recursive: true, force: true })
  })

  it('prints AST + pageCount for a valid file (no fetch)', async () => {
    const file = path.join(env.workDir, 'home.wf')
    await fs.writeFile(file, `page {\n  text "hi"\n}\n`, 'utf8')
    const fetchSpy = vi.fn()

    const code = await parseCommand({
      file,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: {
        authOptions: { configDir: env.workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    })

    expect(code).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    const out = JSON.parse(env.readStdout()) as { pageCount: number; ast: unknown }
    expect(out.pageCount).toBe(1)
    expect(out.ast).toBeTruthy()
  })

  it('returns 1 with location on parse failure', async () => {
    const file = path.join(env.workDir, 'bad.wf')
    await fs.writeFile(file, `page {\n  ???\n}\n`, 'utf8')

    const code = await parseCommand({
      file,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/parse failed/)
  })
})
