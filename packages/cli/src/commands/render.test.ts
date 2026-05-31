import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { renderCommand } from './render.js'

interface TestEnv {
  workDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-render-'))
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

const SIMPLE_WF = `page {\n  text "hello"\n}\n`
const BAD_WF = `page {\n  ???\n}`

describe('renderCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.workDir, { recursive: true, force: true })
  })

  it('renders a valid file to stdout (local — fetch is not invoked)', async () => {
    const file = path.join(env.workDir, 'home.wf')
    await fs.writeFile(file, SIMPLE_WF, 'utf8')
    const fetchSpy = vi.fn()

    const code = await renderCommand({
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
    expect(env.readStdout()).toContain('hello')
  })

  it('writes HTML to --output when supplied', async () => {
    const file = path.join(env.workDir, 'home.wf')
    const out = path.join(env.workDir, 'out.html')
    await fs.writeFile(file, SIMPLE_WF, 'utf8')

    const code = await renderCommand({
      file,
      output: out,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(0)
    const html = await fs.readFile(out, 'utf8')
    expect(html).toContain('hello')
    expect(env.readStdout()).toContain(`Wrote ${out}`)
  })

  it('returns 1 with friendly message when file is missing', async () => {
    const code = await renderCommand({
      file: path.join(env.workDir, 'nope.wf'),
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/render failed: cannot read/)
  })

  it('returns 1 with parse error when DSL is invalid', async () => {
    const file = path.join(env.workDir, 'bad.wf')
    await fs.writeFile(file, BAD_WF, 'utf8')

    const code = await renderCommand({
      file,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/render failed/)
  })
})
