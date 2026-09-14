import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, accessSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { clearTimeout, setTimeout } from 'node:timers'
import { URL, pathToFileURL } from 'node:url'

export const PACKAGE_NAME = '@wireweave/mcp-server'
export const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']
const SOURCE = 'page "Package smoke" { text "Installed package verified" }'
const MAX_OUTPUT = 8 * 1024 * 1024

export function assertCatalog(tools, expectedNames) {
  assert.ok(expectedNames.length > 0, 'Expected catalog must not be empty')
  assert.equal(new Set(expectedNames).size, expectedNames.length, 'Expected catalog has duplicates')
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length, 'Duplicate tool names')
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    [...expectedNames].sort(),
    'Installed tools/list differs from the expected catalog',
  )
  for (const tool of tools) {
    for (const hint of HINTS) {
      assert.equal(
        typeof tool.annotations?.[hint],
        'boolean',
        `${tool.name}: missing boolean ${hint}`,
      )
    }
  }
}

export function installedExecutable(consumer, expectedManifest) {
  const packageRoot = join(consumer, 'node_modules', PACKAGE_NAME)
  const manifestPath = join(packageRoot, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert.equal(manifest.name, PACKAGE_NAME, 'Wrong installed package')
  assert.equal(manifest.version, expectedManifest.version, 'Installed manifest version mismatch')
  const bin = manifest.bin?.['wireweave-mcp']
  assert.equal(typeof bin, 'string', 'Missing wireweave-mcp bin declaration')
  const target = resolve(packageRoot, bin)
  const within = relative(realpathSync(packageRoot), realpathSync(target))
  assert.ok(within && !within.startsWith('..') && !isAbsolute(within), 'Bin escapes package')
  assert.ok(statSync(target).isFile(), 'Bin is not a file')
  assert.match(readFileSync(target, 'utf8'), /^#![^\n]*\bnode\b/, 'Missing Node executable shebang')
  const executable = join(consumer, 'node_modules', '.bin', 'wireweave-mcp')
  accessSync(executable, constants.X_OK)
  assert.equal(realpathSync(executable), realpathSync(target), 'Installed bin resolves elsewhere')
  return { executable, manifestPath }
}

// The real SDK Client owns initialization, request IDs and result validation.
// This transport observes raw bytes too: an SDK parser may recover after a bad
// line, but stdout contamination must make the release gate red permanently.
class ObservedStdioTransport {
  constructor({ executable, cwd, env, messageSchema }) {
    Object.assign(this, { executable, cwd, env, messageSchema })
    this.decoder = new StringDecoder('utf8')
    this.pending = ''
    this.stderr = ''
    this.bytes = 0
    this.frames = 0
    this.failures = []
  }

  fail(error) {
    this.failures.push(error.message)
    this.onerror?.(error)
  }

  async start() {
    this.child = spawn(this.executable, [], {
      cwd: this.cwd,
      env: this.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    })
    this.closed = new Promise((done) => this.child.once('close', done))
    this.child.once('error', (error) => this.fail(error))
    this.child.stdin.on('error', (error) => this.fail(error))
    this.child.stdout.on('data', (chunk) => {
      this.bytes += chunk.length
      if (this.bytes > MAX_OUTPUT) {
        this.fail(new Error('MCP stdout exceeded byte limit'))
        this.child.kill('SIGKILL')
        return
      }
      this.pending += this.decoder.write(chunk)
      let end
      while ((end = this.pending.indexOf('\n')) !== -1) {
        const line = this.pending.slice(0, end)
        this.pending = this.pending.slice(end + 1)
        try {
          const message = this.messageSchema.parse(JSON.parse(line))
          this.frames++
          this.onmessage?.(message)
        } catch {
          this.fail(new Error('Invalid JSON-RPC on stdout'))
        }
      }
    })
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk.toString('utf8')
      if (this.stderr.length > 32 * 1024) {
        this.fail(new Error('MCP stderr exceeded byte limit'))
        this.child.kill('SIGKILL')
      }
    })
    this.child.once('close', (code, signal) => {
      if (code !== 0 && !(this.closing && signal === 'SIGTERM')) {
        this.fail(new Error(`MCP executable exited: code=${code}, signal=${signal}`))
      }
      this.onclose?.()
    })
  }

  async send(message) {
    await new Promise((done, reject) => {
      this.child.stdin.write(`${JSON.stringify(message)}\n`, (error) =>
        error ? reject(error) : done(),
      )
    })
  }

  async close() {
    if (this.closing) return this.closing
    this.closing = (async () => {
      if (!this.child) return
      this.child.stdin.end()
      const terminate = setTimeout(() => this.child.kill('SIGTERM'), 500)
      const kill = setTimeout(() => this.child.kill('SIGKILL'), 1500)
      try {
        await this.closed
      } finally {
        clearTimeout(terminate)
        clearTimeout(kill)
      }
      if ((this.pending + this.decoder.end()).length)
        this.fail(new Error('Unterminated MCP stdout'))
      if (this.stderr.includes('[MCP_SMOKE_NETWORK_DENIED]')) {
        this.fail(new Error('Installed executable attempted outbound I/O'))
      }
    })()
    return this.closing
  }
}

function payload(result, operation) {
  assert.notEqual(result.isError, true, `${operation} returned an MCP error`)
  assert.equal(result.content?.[0]?.type, 'text', `${operation} returned no text payload`)
  const value = JSON.parse(result.content[0].text)
  assert.equal(value.success, true, `${operation} failed`)
  return value
}

export async function probeInstalled({
  consumer,
  expectedManifest,
  expectedNames,
  timeoutMs = 15000,
  sdkManifestPath,
  signal,
}) {
  signal?.throwIfAborted()
  const { executable, manifestPath } = installedExecutable(consumer, expectedManifest)
  const require = createRequire(sdkManifestPath ?? manifestPath)
  const { Client } = await import(
    pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/index.js')).href
  )
  const { JSONRPCMessageSchema } = await import(
    pathToFileURL(require.resolve('@modelcontextprotocol/sdk/types.js')).href
  )
  signal?.throwIfAborted()
  const env = {
    PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
    TMPDIR: consumer,
    NODE_ENV: 'production',
    NODE_OPTIONS: `--permission --allow-fs-read=* --import=${new URL('./mcp-package-smoke-network.mjs', import.meta.url).href}`,
    WIREWEAVE_TRANSPORT: 'stdio',
    WIREWEAVE_API_URL: 'https://mcp-smoke.invalid',
  }
  const transport = new ObservedStdioTransport({
    executable,
    cwd: consumer,
    env,
    messageSchema: JSONRPCMessageSchema,
  })
  const client = new Client({ name: 'wireweave-release-probe', version: '1.0.0' })
  const started = Date.now()
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`MCP smoke timed out after ${timeoutMs}ms`))
      void transport.close()
    }, timeoutMs)
  })
  const abort = () => {
    void transport.close()
  }
  signal?.addEventListener('abort', abort, { once: true })
  let report
  try {
    report = await Promise.race([
      deadline,
      (async () => {
        await client.connect(transport, { timeout: timeoutMs })
        assert.equal(
          client.getServerVersion()?.version,
          expectedManifest.version,
          'Initialize version differs from packed manifest',
        )
        const tools = []
        const cursors = new Set()
        let cursor
        do {
          const page = await client.listTools(cursor ? { cursor } : {}, { timeout: timeoutMs })
          tools.push(...page.tools)
          cursor = page.nextCursor
          if (cursor) {
            assert.ok(!cursors.has(cursor) && cursors.size < 100, 'Invalid catalog pagination')
            cursors.add(cursor)
          }
        } while (cursor)
        assertCatalog(tools, expectedNames)
        const parsed = payload(
          await client.callTool(
            { name: 'wireweave_parse', arguments: { source: SOURCE } },
            undefined,
            { timeout: timeoutMs },
          ),
          'parse',
        )
        assert.equal(parsed.ast?.children?.length, 1, 'Parse returned no page AST')
        assert.ok(
          JSON.stringify(parsed.ast).includes('Installed package verified'),
          'Parse lost source text',
        )
        const rendered = payload(
          await client.callTool(
            {
              name: 'wireweave_render_html_code',
              arguments: { source: SOURCE, fullDocument: true },
            },
            undefined,
            { timeout: timeoutMs },
          ),
          'render',
        )
        assert.match(rendered.html, /<html[\s>]/i, 'Render returned no HTML document')
        assert.ok(rendered.html.includes('Installed package verified'), 'Render lost source text')
        return {
          version: expectedManifest.version,
          toolCount: tools.length,
          catalogSha256: createHash('sha256').update(JSON.stringify(tools)).digest('hex'),
        }
      })(),
    ])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
    await transport.close()
    await client.close()
  }
  signal?.throwIfAborted()
  assert.deepEqual(transport.failures, [], 'MCP process/protocol isolation failed')
  return {
    ...report,
    frames: transport.frames,
    network: 'blocked',
    credentials: 'absent',
    elapsedMs: Date.now() - started,
  }
}
