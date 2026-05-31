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

// Tools that require non-empty input to even reach the dispatch boundary. They
// should still NOT invoke fetch (local) and should be counted as local — we
// pass a minimal valid source so localDispatch reaches its happy path.
const LOCAL_FIXTURE_ARGS: Record<string, Record<string, unknown>> = {
  wireweave_parse: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_validate: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_render_html_code: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_validate_ux: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_analyze: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_diff: {
    oldSource: 'page A {\n  text "Hi"\n}\n',
    newSource: 'page A {\n  text "Bye"\n}\n',
  },
  wireweave_list_components: {},
  wireweave_export_json: { source: 'page Home {\n  text "Hi"\n}\n' },
  wireweave_export_figma: { source: 'page Home {\n  text "Hi"\n}\n' },
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
  for (const tool of tools) {
    const isLocal = localToolNames.has(tool.name)
    const label = isLocal ? 'local' : 'server'

    it(`${tool.name} (${label}) routes correctly through dispatch`, async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(emptyJsonResponse())
      const args = isLocal ? (LOCAL_FIXTURE_ARGS[tool.name] ?? {}) : {}

      const result = await handleCallTool(tool.name, args, makeContext(fetchFn))

      if (isLocal) {
        expect(fetchFn, `${tool.name} (local) must not call fetch`).not.toHaveBeenCalled()
        expect(
          result.isError,
          `${tool.name} (local) must return non-error on happy path`,
        ).toBeUndefined()
      } else {
        expect(fetchFn, `${tool.name} (server) must call fetch exactly once`).toHaveBeenCalledTimes(
          1,
        )
        const callUrl = fetchFn.mock.calls[0]?.[0]
        const urlString = urlOf(callUrl)
        expect(
          urlString.startsWith(apiConfig.apiUrl),
          `${tool.name} fetch must target apiConfig.apiUrl`,
        ).toBe(true)
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
        expect(urlOf(callUrl).startsWith(apiConfig.apiUrl)).toBe(true)
      }
    })
  }
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
