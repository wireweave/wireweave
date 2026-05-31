import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isLocalDispatchTool, LOCAL_DISPATCH_TOOL_NAMES } from '@wireweave/sdk'
import { callTool } from './dispatch-config.js'

let workDir: string

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wireweave-cli-routing-'))
})

afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true })
})

describe('dispatch routing', () => {
  it('local tools never invoke fetch', async () => {
    const fetchSpy = vi.fn()
    expect(isLocalDispatchTool('wireweave_parse')).toBe(true)

    await callTool(
      'wireweave_parse',
      { source: `page {\n  text "hi"\n}\n` },
      {
        authOptions: { configDir: workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    )

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('server tools call fetch exactly once against the apiUrl', async () => {
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    expect(isLocalDispatchTool('wireweave_grammar')).toBe(false)

    await callTool(
      'wireweave_grammar',
      {},
      {
        apiUrl: 'https://api.example.test',
        apiKey: 'sk-test-routing',
        authOptions: { configDir: workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const firstCall = fetchSpy.mock.calls[0]
    if (!firstCall) throw new Error('fetch not called')
    const input = firstCall[0]
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    expect(url.startsWith('https://api.example.test')).toBe(true)
  })

  it('unknown tool returns isError without invoking fetch', async () => {
    const fetchSpy = vi.fn()

    const result = await callTool(
      'wireweave_not_a_tool',
      {},
      {
        authOptions: { configDir: workDir },
        fetchFn: fetchSpy as unknown as typeof fetch,
      },
    )

    expect(result.isError).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('SDK exposes 9 local tools matching the published catalog', () => {
    expect(LOCAL_DISPATCH_TOOL_NAMES.size).toBe(9)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_parse')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_validate')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_render_html_code')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_validate_ux')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_diff')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_analyze')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_list_components')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_export_json')).toBe(true)
    expect(LOCAL_DISPATCH_TOOL_NAMES.has('wireweave_export_figma')).toBe(true)
  })
})
