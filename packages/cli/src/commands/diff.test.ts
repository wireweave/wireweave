import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { diffCommand } from './diff.js'

interface TestEnv {
  workDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-diff-'))
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

describe('diffCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.workDir, { recursive: true, force: true })
  })

  it('runs locally without fetch and reports identical for equal files', async () => {
    const oldFile = path.join(env.workDir, 'old.wf')
    const newFile = path.join(env.workDir, 'new.wf')
    const src = `page {\n  text "hi"\n}\n`
    await fs.writeFile(oldFile, src, 'utf8')
    await fs.writeFile(newFile, src, 'utf8')
    const fetchSpy = vi.fn()

    const code = await diffCommand({
      oldFile,
      newFile,
      format: 'summary',
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: {
        authOptions: { configDir: env.workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    })

    expect(code).toBe(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(env.readStdout()).toMatch(/Identical:/)
  })

  it('reports changes when files differ', async () => {
    const oldFile = path.join(env.workDir, 'old.wf')
    const newFile = path.join(env.workDir, 'new.wf')
    await fs.writeFile(oldFile, `page {\n  text "hi"\n}\n`, 'utf8')
    await fs.writeFile(newFile, `page {\n  text "bye"\n}\n`, 'utf8')

    const code = await diffCommand({
      oldFile,
      newFile,
      format: 'json',
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(0)
    const payload = JSON.parse(env.readStdout()) as { identical: boolean }
    expect(payload.identical).toBe(false)
  })

  it('returns 1 when a source file is missing', async () => {
    const code = await diffCommand({
      oldFile: path.join(env.workDir, 'missing-old.wf'),
      newFile: path.join(env.workDir, 'missing-new.wf'),
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/diff failed/)
  })
})
