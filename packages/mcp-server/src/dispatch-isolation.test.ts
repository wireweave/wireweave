import { describe, expect, it, vi } from 'vitest'
import { LOCAL_DISPATCH_TOOL_NAMES, type ApiConfig } from '@wireweave/sdk'

import {
  handleCallTool,
  handleGetPrompt,
  handleListPrompts,
  handleListResources,
  handleListTools,
  handleReadResource,
  type HandlerContext,
} from './handlers.js'
import { prompts } from './prompts.js'
import { resources, resourceToTool } from './resources.js'
import { tools, toolEndpoints, localToolNames } from './tools.js'

const apiConfig: ApiConfig = {
  apiUrl: 'https://api.test.invalid',
  apiKey: 'test-key',
}

function makeContext(fetchFn?: typeof fetch): HandlerContext {
  return { apiConfig, endpoints: toolEndpoints, fetchFn }
}

function emptyJsonResponse(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function urlOf(input: string | URL | Request | undefined): string {
  if (input === undefined) return ''
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

const SOURCE = 'page "Home" {\n  text "Hi"\n}\n'
const V4_SOURCE = `language "4.0.0"
app catalog entry={namespace="main",id="home"} profile={id="neutral-app",width=800,height=600,language="en",entryPolicy="explicit",unknownRoute="error-view",clockStartMs=0,limits="standard-1",assets=[],unicodeVersion="15.1.0"} states=[] registry={schemaVersion="1.0.0",entries=[],digest="sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"} fixtures=[] {
module main namespace=main { page "Home" id=home { main { title "Catalog" id=title level=1 } } }
}`

const LOCAL_FIXTURE_ARGS: Record<string, Record<string, unknown>> = {
  wireweave_parse: { source: SOURCE },
  wireweave_validate: { source: SOURCE, strict: true },
  wireweave_render_html_code: { source: SOURCE, fullDocument: true },
  wireweave_validate_ux: { source: SOURCE },
  wireweave_analyze: { source: SOURCE },
  wireweave_diff: {
    oldSource: SOURCE,
    newSource: SOURCE.replace('Hi', 'Bye'),
  },
  wireweave_list_components: {},
  wireweave_export_json: { source: SOURCE },
  wireweave_export_svg: {
    source: V4_SOURCE,
    languageVersion: '4.0.0',
    profile: { id: 'wireweave-static-svg-v1', screens: 'all' },
  },
  wireweave_export_figma: { source: SOURCE },
}

const LOCAL_EXPECTED_RESULTS: Record<string, Record<string, unknown>> = {
  wireweave_parse: { success: true, pageCount: 1, ast: { children: [{ type: 'Page' }] } },
  wireweave_validate: { valid: true, pageCount: 1, componentCount: 1 },
  wireweave_render_html_code: { success: true, html: expect.stringContaining('<html') },
  wireweave_validate_ux: { success: true, score: expect.any(Number), issues: expect.any(Array) },
  wireweave_analyze: {
    success: true,
    summary: { totalComponents: 2 },
    content: { textElements: 1 },
  },
  wireweave_diff: { success: true, identical: false, changes: expect.any(Array) },
  wireweave_list_components: {
    components: expect.arrayContaining([expect.objectContaining({ name: 'page' })]),
  },
  wireweave_export_json: { success: true, format: 'json', pages: [{ type: 'page' }] },
  wireweave_export_svg: {
    success: true,
    kind: 'V4SvgArtifact',
    mediaType: 'image/svg+xml',
    manifest: { exporter: 'wireweave-static-svg-v1' },
  },
  wireweave_export_figma: {
    success: true,
    format: 'figma',
    document: { type: 'DOCUMENT', children: [{ type: 'CANVAS' }] },
  },
}

const REMOTE_FIXTURE_ARGS: Record<string, Record<string, unknown>> = {
  wireweave_grammar: {},
  wireweave_guide: {},
  wireweave_patterns: {},
  wireweave_examples: { category: 'form', limit: 2 },
  wireweave_ux_rules: {},
  wireweave_cloud_list_projects: { includeArchived: true },
  wireweave_cloud_create_project: { name: 'Fixture project', color: '#123456' },
  wireweave_cloud_update_project: { id: 'project-1', name: 'Updated project' },
  wireweave_cloud_list_wireframes: { projectId: 'project-1', tags: ['ui'], limit: 2, offset: 1 },
  wireweave_cloud_get_wireframe: { id: 'wireframe-1' },
  wireweave_cloud_save_wireframe: { name: 'Fixture wireframe', code: SOURCE, isPublic: false },
  wireweave_cloud_update_wireframe: { id: 'wireframe-1', name: 'Updated wireframe', code: SOURCE },
  wireweave_cloud_delete_wireframe: { id: 'wireframe-1' },
  wireweave_cloud_get_versions: { wireframeId: 'wireframe-1' },
  wireweave_cloud_restore_version: { wireframeId: 'wireframe-1', version: 2 },
  wireweave_cloud_create_share_link: {
    wireframeId: 'wireframe-1',
    title: 'Review',
    allowCopy: false,
  },
  wireweave_cloud_list_shares: { wireframeId: 'wireframe-1' },
  wireweave_cloud_diff_versions: { wireframeId: 'wireframe-1', versionA: 1, versionB: 2 },
  wireweave_account_balance: {},
  wireweave_account_subscription: {},
  wireweave_account_transactions: { limit: 2, type: 'usage' },
  wireweave_pricing: {},
  wireweave_gallery: { tags: ['ui'], limit: 2 },
}

describe('proxy-discipline — single rule: ALL outbound goes through SDK dispatch', () => {
  it('mcp-server local tool set === SDK local dispatch set (single source of truth)', () => {
    expect(new Set(localToolNames)).toEqual(new Set(LOCAL_DISPATCH_TOOL_NAMES))
  })

  it('every tool name in the published catalog is either local or has a server endpoint', () => {
    for (const tool of tools) {
      const isLocal = localToolNames.has(tool.name)
      const hasEndpoint = Boolean(toolEndpoints[tool.name])
      expect(isLocal || hasEndpoint).toBe(true)
    }
  })

  it('every resource URI maps to a tool in the published catalog', () => {
    const toolNameSet = new Set(tools.map((t) => t.name))
    for (const resource of resources) {
      const toolName = resourceToTool[resource.uri]
      expect(toolName, `${resource.uri} → resourceToTool mapping`).toBeDefined()
      expect(toolNameSet.has(toolName), `${toolName} present in tools.ts`).toBe(true)
    }
  })

  it('handleListTools returns the published catalog as-is (no merge / filter)', () => {
    expect(handleListTools().tools).toBe(tools)
  })

  it('handleListPrompts returns the generated prompts as-is', () => {
    expect(handleListPrompts().prompts).toBe(prompts)
  })

  it('handleListResources returns the generated resources as-is', () => {
    expect(handleListResources().resources).toBe(resources)
  })
})

describe('proxy-discipline — CallTool isolation (per tool)', () => {
  it('has explicit successful inputs for every public tool with no empty fallback', () => {
    expect(Object.keys(LOCAL_FIXTURE_ARGS)).toHaveLength(10)
    expect(Object.keys(REMOTE_FIXTURE_ARGS)).toHaveLength(23)
    expect(Object.keys(LOCAL_EXPECTED_RESULTS).sort()).toEqual(
      Object.keys(LOCAL_FIXTURE_ARGS).sort(),
    )
    expect(
      [...Object.keys(LOCAL_FIXTURE_ARGS), ...Object.keys(REMOTE_FIXTURE_ARGS)].sort(),
    ).toEqual(tools.map(({ name }) => name).sort())
  })

  for (const tool of tools) {
    const isLocal = localToolNames.has(tool.name)
    const label = isLocal ? 'local' : 'server'

    it(`${tool.name} (${label}) routes correctly through dispatch`, async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(emptyJsonResponse())
      const args = isLocal ? LOCAL_FIXTURE_ARGS[tool.name] : REMOTE_FIXTURE_ARGS[tool.name]
      expect(args, `${tool.name} must have an explicit valid fixture`).toBeDefined()

      const result = await handleCallTool(tool.name, args, makeContext(fetchFn))
      expect(result.isError).toBeUndefined()
      expect(result.content).toHaveLength(1)
      const block = result.content[0]
      expect(block?.type).toBe('text')
      if (block?.type !== 'text') throw new Error(`Expected text result for ${tool.name}`)
      const payload = JSON.parse(block.text) as Record<string, unknown>

      if (isLocal) {
        expect(fetchFn, `${tool.name} (local) must not call fetch`).not.toHaveBeenCalled()
        expect(payload).toMatchObject(LOCAL_EXPECTED_RESULTS[tool.name])
        if (tool.name === 'wireweave_render_html_code') expect(payload.html).toContain('Hi')
        if (tool.name === 'wireweave_diff') expect(payload.changes).not.toHaveLength(0)
      } else {
        expect(fetchFn, `${tool.name} (server) must call fetch exactly once`).toHaveBeenCalledTimes(
          1,
        )
        const [callUrl, init] = fetchFn.mock.calls[0]
        expect(new URL(urlOf(callUrl)).origin).toBe(apiConfig.apiUrl)
        expect(new Headers(init?.headers).get('x-api-key')).toBe(apiConfig.apiKey)
        expect(init?.redirect).toBe('error')
        expect(payload).toEqual({ ok: true })
      }
    })
  }
})

describe('proxy-discipline — ReadResource isolation (per resource)', () => {
  for (const resource of resources) {
    const toolName = resourceToTool[resource.uri]
    const isLocal = localToolNames.has(toolName)
    const label = isLocal ? 'local-backed' : 'server-backed'

    it(`${resource.uri} (${label}) routes through dispatch — no direct callApi bypass`, async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(emptyJsonResponse())

      const result = await handleReadResource(resource.uri, makeContext(fetchFn))

      expect(result.contents[0]?.uri).toBe(resource.uri)
      expect(result.contents[0]?.mimeType).toBe(resource.mimeType)

      if (isLocal) {
        expect(fetchFn).not.toHaveBeenCalled()
      } else {
        expect(fetchFn).toHaveBeenCalledTimes(1)
        const callUrl = fetchFn.mock.calls[0]?.[0]
        expect(new URL(urlOf(callUrl)).origin).toBe(apiConfig.apiUrl)
        const content = result.contents[0]
        if (!content || !('text' in content)) throw new Error('Expected text resource')
        expect(content.text).toBe(JSON.stringify({ ok: true }, null, 2))
      }
    })
  }
})

describe('MCP handlers preserve schema and cancellation boundaries', () => {
  it('rejects omitted arguments for a cloud write before fetch', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const result = await handleCallTool(
      'wireweave_cloud_save_wireframe',
      undefined,
      makeContext(fetchFn),
    )
    expect(result.isError).toBe(true)
    const block = result.content[0]
    expect(block?.type).toBe('text')
    if (block?.type !== 'text') throw new Error('Expected text error')
    expect(block.text).toContain('Invalid arguments')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rejects invalid enum values at the MCP boundary', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const result = await handleCallTool(
      'wireweave_account_transactions',
      { type: 'transfer' },
      makeContext(fetchFn),
    )
    expect(result.isError).toBe(true)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([
    ['wireweave_parse', { source: SOURCE }],
    ['wireweave_cloud_save_wireframe', { name: 'Cancelled wireframe', code: SOURCE }],
  ] satisfies [string, Record<string, unknown>][])(
    'does not admit an already cancelled %s call',
    async (name, args) => {
      const fetchFn = vi.fn<typeof fetch>()
      const result = await handleCallTool(
        name,
        args,
        makeContext(fetchFn),
        AbortSignal.abort(new Error('caller cancelled')),
      )
      expect(result.isError).toBe(true)
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify({ error: 'caller cancelled' }, null, 2) },
      ])
      expect(fetchFn).not.toHaveBeenCalled()
    },
  )

  it('propagates cancellation of an in-flight resource request', async () => {
    const controller = new AbortController()
    let finish!: (response: Response) => void
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const pending = handleReadResource('wireweave://guide', makeContext(fetchFn), controller.signal)
    const rejected = expect(pending).rejects.toThrow('caller cancelled')
    controller.abort(new Error('caller cancelled'))
    expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
    finish(emptyJsonResponse())
    await rejected
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})

describe('proxy-discipline — GetPrompt is purely local (no outbound)', () => {
  for (const prompt of prompts) {
    it(`${prompt.name} substitutes template without fetch`, () => {
      const fetchFn = vi.fn<typeof fetch>()
      const args: Record<string, unknown> = {}
      for (const arg of prompt.arguments) {
        if (arg.required) args[arg.name] = `__test_${arg.name}__`
      }

      const result = handleGetPrompt(prompt.name, args)

      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.description).toBe(prompt.description)
      expect(result.messages[0]?.role).toBe('user')
      expect(result.messages[0]?.content.type).toBe('text')
    })
  }
})

describe('proxy-discipline — unknown names return isError without fetching', () => {
  it('handleCallTool with unknown tool name returns isError, no fetch', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const result = await handleCallTool('wireweave_not_a_real_tool', {}, makeContext(fetchFn))
    expect(result.isError).toBe(true)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('handleReadResource with unknown URI throws synchronously, no fetch', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    await expect(handleReadResource('wireweave://unknown', makeContext(fetchFn))).rejects.toThrow(
      /Resource not found/,
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
