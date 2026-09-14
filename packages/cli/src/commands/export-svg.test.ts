import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportSvgCommand } from './export-svg.js'

const SOURCE = `language "4.0.0"
app catalog entry={namespace="main",id="home"} profile={id="neutral-app",width=800,height=600,language="en",entryPolicy="explicit",unknownRoute="error-view",clockStartMs=0,limits="standard-1",assets=[],unicodeVersion="15.1.0"} states=[] registry={schemaVersion="1.0.0",entries=[],digest="sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"} fixtures=[] {
module main namespace=main { page "Home" id=home { main { title "Catalog" id=title level=1 } } }
}`

describe('exportSvgCommand', () => {
  let workDir: string
  let stdout: PassThrough
  let stderr: PassThrough
  let out: Buffer[]
  let errors: Buffer[]

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-svg-'))
    stdout = new PassThrough()
    stderr = new PassThrough()
    out = []
    errors = []
    stdout.on('data', (chunk: Buffer) => out.push(chunk))
    stderr.on('data', (chunk: Buffer) => errors.push(chunk))
  })

  afterEach(async () => {
    await fs.rm(workDir, { recursive: true, force: true })
  })

  it('uses local v4 dispatch and writes raw deterministic SVG', async () => {
    const file = path.join(workDir, 'app.wf')
    const output = path.join(workDir, 'app.svg')
    await fs.writeFile(file, SOURCE, 'utf8')
    const fetchFn = vi.fn()
    const code = await exportSvgCommand({
      file,
      output,
      allScreens: true,
      stdout,
      stderr,
      dispatchParams: {
        authOptions: { configDir: workDir },
        fetchFn: fetchFn as unknown as typeof fetch,
      },
    })
    expect(code).toBe(0)
    expect(fetchFn).not.toHaveBeenCalled()
    expect(await fs.readFile(output, 'utf8')).toContain(
      'data-wireweave-export="wireweave-static-svg-v1"',
    )
    expect(Buffer.concat(out).toString('utf8')).toMatch(/Wrote /)
    expect(Buffer.concat(errors).toString('utf8')).toBe('')
  })

  it('returns semantic rejection without writing a partial artifact', async () => {
    const file = path.join(workDir, 'invalid.wf')
    const output = path.join(workDir, 'invalid.svg')
    await fs.writeFile(file, 'not a Wireweave 4 application', 'utf8')
    const code = await exportSvgCommand({ file, output, stdout, stderr })
    expect(code).toBe(2)
    await expect(fs.readFile(output, 'utf8')).rejects.toThrow()
    expect(Buffer.concat(errors).toString('utf8')).toContain('export-svg failed')
  })
})
