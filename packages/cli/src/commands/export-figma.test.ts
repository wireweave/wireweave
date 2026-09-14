import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { exportFigmaCommand } from './export-figma.js'

interface TestEnv {
  workDir: string
  stdout: PassThrough
  stderr: PassThrough
  readStdout: () => string
  readStderr: () => string
}

async function makeEnv(): Promise<TestEnv> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-exfig-'))
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

describe('exportFigmaCommand', () => {
  let env: TestEnv

  beforeEach(async () => {
    env = await makeEnv()
  })

  afterEach(async () => {
    await fs.rm(env.workDir, { recursive: true, force: true })
  })

  it('runs locally without fetch (export-figma is local-dispatch)', async () => {
    const file = path.join(env.workDir, 'home.wf')
    await fs.writeFile(file, `page {\n  text "hi"\n}\n`, 'utf8')
    const fetchSpy = vi.fn()

    const code = await exportFigmaCommand({
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
    const payload = JSON.parse(env.readStdout()) as { success: boolean }
    expect(payload.success).toBe(true)
  })

  it('writes output to disk when --output is provided', async () => {
    const file = path.join(env.workDir, 'home.wf')
    const outFile = path.join(env.workDir, 'home.figma.json')
    await fs.writeFile(file, `page {\n  text "hi"\n}\n`, 'utf8')

    const code = await exportFigmaCommand({
      file,
      output: outFile,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(0)
    const written = await fs.readFile(outFile, 'utf8')
    const payload = JSON.parse(written) as { success: boolean }
    expect(payload.success).toBe(true)
    expect(env.readStdout()).toMatch(/Wrote /)
  })

  it('returns 1 when source file is missing', async () => {
    const code = await exportFigmaCommand({
      file: path.join(env.workDir, 'missing.wf'),
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })

    expect(code).toBe(1)
    expect(env.readStderr()).toMatch(/export-figma failed/)
  })

  it('uses the linked semantic exporter when Wireweave 4 is selected', async () => {
    const file = path.join(env.workDir, 'app.wf')
    await fs.writeFile(
      file,
      `language "4.0.0"
app catalog entry={namespace="main",id="home"} profile={id="neutral-app",width=800,height=600,language="en",entryPolicy="explicit",unknownRoute="error-view",clockStartMs=0,limits="standard-1",assets=[],unicodeVersion="15.1.0"} states=[] registry={schemaVersion="1.0.0",entries=[],digest="sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"} fixtures=[] {
module main namespace=main { page "Home" id=home { main { title "Catalog" id=title level=1 } } }
}`,
      'utf8',
    )
    const code = await exportFigmaCommand({
      file,
      languageVersion: '4.0.0',
      allScreens: true,
      stdout: env.stdout,
      stderr: env.stderr,
      dispatchParams: { authOptions: { configDir: env.workDir } },
    })
    expect(code).toBe(0)
    const payload = JSON.parse(env.readStdout()) as { kind: string; mappings: unknown[] }
    expect(payload.kind).toBe('FigmaMappingArtifact')
    expect(payload.mappings.length).toBeGreaterThan(0)
  })
})
