import { describe, expect, it, vi } from 'vitest'

import { dispatch } from './dispatcher.js'
import { localToolNames, toolEndpoints, tools } from './generated/tools.js'
import type { LocalToolResult } from './types.js'

const SOURCE = 'page "Home" {\n  text "Hello contract"\n}\n'
const config = { apiUrl: 'https://api.test.invalid', apiKey: 'contract-test-key' }

interface LocalFixture {
  name: string
  args: Record<string, unknown>
  expected: Record<string, unknown>
}

const localFixtures: LocalFixture[] = [
  {
    name: 'wireweave_parse',
    args: { source: SOURCE },
    expected: {
      success: true,
      pageCount: 1,
      ast: {
        children: [{ type: 'Page', children: [{ type: 'Text', content: 'Hello contract' }] }],
      },
    },
  },
  {
    name: 'wireweave_validate',
    args: { source: SOURCE, strict: true },
    expected: { valid: true, pageCount: 1, componentCount: 1 },
  },
  {
    name: 'wireweave_render_html_code',
    args: { source: SOURCE, theme: 'dark', fullDocument: true },
    expected: { success: true, html: expect.stringContaining('Hello contract') },
  },
  {
    name: 'wireweave_validate_ux',
    args: { source: SOURCE, categories: ['accessibility'], minSeverity: 'error', maxIssues: 5 },
    expected: { success: true, valid: expect.any(Boolean), score: expect.any(Number), issues: [] },
  },
  {
    name: 'wireweave_diff',
    args: { oldSource: SOURCE, newSource: SOURCE.replace('Hello contract', 'Changed contract') },
    expected: {
      success: true,
      identical: false,
      changes: expect.arrayContaining([
        expect.objectContaining({
          type: 'added',
          newNode: expect.objectContaining({ content: 'Changed contract' }),
        }),
        expect.objectContaining({
          type: 'removed',
          oldNode: expect.objectContaining({ content: 'Hello contract' }),
        }),
      ]),
    },
  },
  {
    name: 'wireweave_analyze',
    args: { source: SOURCE },
    expected: { success: true, summary: { totalComponents: 2 }, content: { textElements: 1 } },
  },
  {
    name: 'wireweave_list_components',
    args: { category: 'layout' },
    expected: {
      components: expect.arrayContaining([
        expect.objectContaining({ name: 'page', category: 'layout' }),
      ]),
    },
  },
  {
    name: 'wireweave_export_json',
    args: { source: SOURCE, includeLocations: true },
    expected: {
      success: true,
      format: 'json',
      pages: [{ type: 'page', children: [{ type: 'text', content: 'Hello contract' }] }],
      metadata: { sourceFormat: 'wireweave', nodeCount: 2 },
    },
  },
  {
    name: 'wireweave_export_figma',
    args: { source: SOURCE },
    expected: {
      success: true,
      format: 'figma',
      document: {
        type: 'DOCUMENT',
        children: [
          {
            type: 'CANVAS',
            children: [{ type: 'TEXT', textStyle: { characters: 'Hello contract' } }],
          },
        ],
      },
    },
  },
]

interface RemoteFixture {
  name: string
  args: Record<string, unknown>
  method: string
  path: string
  body?: Record<string, unknown>
  query?: Record<string, string>
  response: Record<string, unknown>
}

// These expectations are written independently of toolEndpoints. They verify
// adapter contracts against mocked responses, not the live backend's behavior.
const remoteFixtures: RemoteFixture[] = [
  {
    name: 'wireweave_grammar',
    args: {},
    method: 'GET',
    path: '/tools/grammar',
    response: { grammar: 'page Name { text "Hello" }' },
  },
  {
    name: 'wireweave_guide',
    args: {},
    method: 'GET',
    path: '/tools/guide',
    response: { guide: '# Wireweave guide' },
  },
  {
    name: 'wireweave_patterns',
    args: {},
    method: 'GET',
    path: '/tools/patterns',
    response: { patterns: [{ name: 'header', source: SOURCE }] },
  },
  {
    name: 'wireweave_examples',
    args: { category: 'form', limit: 2 },
    method: 'GET',
    path: '/tools/examples',
    query: { category: 'form', limit: '2' },
    response: { examples: [{ source: SOURCE }] },
  },
  {
    name: 'wireweave_ux_rules',
    args: {},
    method: 'GET',
    path: '/tools/ux-rules',
    response: { rules: [{ id: 'test-rule', severity: 'error' }] },
  },
  {
    name: 'wireweave_cloud_list_projects',
    args: { includeArchived: true },
    method: 'GET',
    path: '/cloud/projects',
    query: { includeArchived: 'true' },
    response: { projects: [{ id: 'project-1', name: 'Contract project' }] },
  },
  {
    name: 'wireweave_cloud_create_project',
    args: { name: 'Contract project', color: '#123456' },
    method: 'POST',
    path: '/cloud/projects',
    body: { name: 'Contract project', color: '#123456' },
    response: { project: { id: 'project-1', name: 'Contract project' } },
  },
  {
    name: 'wireweave_cloud_update_project',
    args: { id: 'project-1', name: 'Updated project', isArchived: true },
    method: 'PATCH',
    path: '/cloud/projects/project-1',
    body: { name: 'Updated project', isArchived: true },
    response: { project: { id: 'project-1', name: 'Updated project', isArchived: true } },
  },
  {
    name: 'wireweave_cloud_list_wireframes',
    args: { projectId: 'project-1', tags: ['ui', 'a&b'], limit: 2, offset: 1 },
    method: 'GET',
    path: '/cloud/wireframes',
    query: { projectId: 'project-1', tags: 'ui,a&b', limit: '2', offset: '1' },
    response: { wireframes: [{ id: 'wireframe-1', code: SOURCE }] },
  },
  {
    name: 'wireweave_cloud_get_wireframe',
    args: { id: 'wireframe-1' },
    method: 'GET',
    path: '/cloud/wireframes/wireframe-1',
    response: { wireframe: { id: 'wireframe-1', code: SOURCE } },
  },
  {
    name: 'wireweave_cloud_save_wireframe',
    args: {
      name: 'Contract wireframe',
      code: SOURCE,
      projectId: 'project-1',
      tags: ['ui'],
      isPublic: false,
    },
    method: 'POST',
    path: '/cloud/wireframes',
    body: {
      name: 'Contract wireframe',
      code: SOURCE,
      projectId: 'project-1',
      tags: ['ui'],
      isPublic: false,
    },
    response: { wireframe: { id: 'wireframe-1', version: 1 } },
  },
  {
    name: 'wireweave_cloud_update_wireframe',
    args: {
      id: 'wireframe-1',
      name: 'Updated wireframe',
      code: SOURCE,
      tags: ['updated'],
      isPublic: false,
    },
    method: 'PATCH',
    path: '/cloud/wireframes/wireframe-1',
    body: { name: 'Updated wireframe', code: SOURCE, tags: ['updated'], isPublic: false },
    response: { wireframe: { id: 'wireframe-1', version: 2 } },
  },
  {
    name: 'wireweave_cloud_delete_wireframe',
    args: { id: 'wireframe-1' },
    method: 'DELETE',
    path: '/cloud/wireframes/wireframe-1',
    response: { deleted: true, id: 'wireframe-1' },
  },
  {
    name: 'wireweave_cloud_get_versions',
    args: { wireframeId: 'wireframe-1' },
    method: 'GET',
    path: '/cloud/wireframes/wireframe-1/versions',
    response: { versions: [{ version: 1, code: SOURCE }] },
  },
  {
    name: 'wireweave_cloud_restore_version',
    args: { wireframeId: 'wireframe-1', version: 2 },
    method: 'POST',
    path: '/cloud/wireframes/wireframe-1/versions/2/restore',
    response: { wireframe: { id: 'wireframe-1', version: 3 } },
  },
  {
    name: 'wireweave_cloud_create_share_link',
    args: {
      wireframeId: 'wireframe-1',
      title: 'Review',
      allowCopy: false,
      password: 'fixture-only-password',
      expiresInDays: 7,
    },
    method: 'POST',
    path: '/cloud/wireframes/wireframe-1/shares',
    body: {
      title: 'Review',
      allowCopy: false,
      password: 'fixture-only-password',
      expiresInDays: 7,
    },
    response: { share: { id: 'share-1', url: 'https://share.test.invalid/review' } },
  },
  {
    name: 'wireweave_cloud_list_shares',
    args: { wireframeId: 'wireframe-1' },
    method: 'GET',
    path: '/cloud/wireframes/wireframe-1/shares',
    response: { shares: [{ id: 'share-1', allowCopy: false }] },
  },
  {
    name: 'wireweave_cloud_diff_versions',
    args: { wireframeId: 'wireframe-1', versionA: 1, versionB: 2 },
    method: 'GET',
    path: '/cloud/wireframes/wireframe-1/diff',
    query: { versionA: '1', versionB: '2' },
    response: { identical: false, changes: [{ type: 'modified' }] },
  },
  {
    name: 'wireweave_account_balance',
    args: {},
    method: 'GET',
    path: '/billing/balance',
    response: { balance: 42, totalAvailable: 50 },
  },
  {
    name: 'wireweave_account_subscription',
    args: {},
    method: 'GET',
    path: '/billing/subscription',
    response: { subscription: { status: 'active' } },
  },
  {
    name: 'wireweave_account_transactions',
    args: { limit: 2, type: 'usage' },
    method: 'GET',
    path: '/billing/transactions',
    query: { limit: '2', type: 'usage' },
    response: { transactions: [{ id: 'transaction-1', type: 'usage', amount: -1 }] },
  },
  {
    name: 'wireweave_pricing',
    args: {},
    method: 'GET',
    path: '/billing/pricing',
    response: { pricing: [{ tool: 'wireweave_guide', credits: 1 }] },
  },
  {
    name: 'wireweave_gallery',
    args: { tags: ['ui', 'public'], limit: 2 },
    method: 'GET',
    path: '/cloud/gallery',
    query: { tags: 'ui,public', limit: '2' },
    response: { wireframes: [{ id: 'public-1', isPublic: true }] },
  },
]

function payload(result: LocalToolResult): Record<string, unknown> {
  expect(result.content).toHaveLength(1)
  expect(result.content[0]?.type).toBe('text')
  return JSON.parse(result.content[0]?.text ?? '') as Record<string, unknown>
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('public dispatch contract coverage', () => {
  it('has explicit independent fixtures for all 32 tools, 9 local and 23 remote', () => {
    expect(localFixtures).toHaveLength(9)
    expect(remoteFixtures).toHaveLength(23)
    const names = [...localFixtures, ...remoteFixtures].map(({ name }) => name)
    expect(new Set(names).size).toBe(32)
    expect([...names].sort()).toEqual(tools.map(({ name }) => name).sort())
    expect(localFixtures.map(({ name }) => name).sort()).toEqual([...localToolNames].sort())
  })

  it.each(localFixtures)(
    '$name produces meaningful local output without credentials or network',
    async ({ name, args, expected }) => {
      const fetchFn = vi.fn<typeof fetch>()
      const result = await dispatch(name, args, {
        apiConfig: { ...config, apiKey: '' },
        endpoints: toolEndpoints,
        fetchFn,
      })
      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.isError).toBeUndefined()
      expect(payload(result)).toMatchObject(expected)
      if (name === 'wireweave_render_html_code') expect(payload(result).html).toContain('<html')
    },
  )

  it.each(remoteFixtures)(
    '$name preserves its authenticated HTTP request and mocked response contract',
    async (fixture) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response(fixture.response))
      const args = structuredClone(fixture.args)
      const result = await dispatch(fixture.name, args, {
        apiConfig: config,
        endpoints: toolEndpoints,
        fetchFn,
      })
      expect(result.isError).toBeUndefined()
      expect(payload(result)).toEqual(fixture.response)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      const [input, init] = fetchFn.mock.calls[0]
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      )
      expect(url.origin).toBe(config.apiUrl)
      expect(url.pathname).toBe(fixture.path)
      expect(url.hash).toBe('')
      expect(Object.fromEntries(url.searchParams)).toEqual(fixture.query ?? {})
      expect([...url.searchParams]).toHaveLength(Object.keys(fixture.query ?? {}).length)
      expect(init?.method).toBe(fixture.method)
      expect(init?.redirect).toBe('error')
      expect(new Headers(init?.headers).get('x-api-key')).toBe(config.apiKey)
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      expect(init?.signal?.aborted).toBe(false)
      expect(init?.body).toBe(fixture.body ? JSON.stringify(fixture.body) : undefined)
      expect(args).toEqual(fixture.args)
    },
  )

  it.each(remoteFixtures)(
    '$name converts a mocked authorization failure into a tool error',
    async ({ name, args }) => {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(response({ error: 'Unauthorized' }, 401))
      const result = await dispatch(name, args, {
        apiConfig: config,
        endpoints: toolEndpoints,
        fetchFn,
      })
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(result.isError).toBe(true)
      expect(payload(result)).toEqual({
        error: 'Invalid API key. Get one at https://wireweave.org',
      })
    },
  )
})

describe('dispatch validates the public input contract before admitting work', () => {
  for (const fixture of [...localFixtures, ...remoteFixtures]) {
    const tool = tools.find(({ name }) => name === fixture.name)!
    for (const field of tool.inputSchema.required ?? []) {
      it(`${fixture.name} rejects missing ${field} without fetching or producing output`, async () => {
        const fetchFn = vi.fn<typeof fetch>()
        const args = { ...fixture.args }
        delete args[field]
        const result = await dispatch(fixture.name, args, {
          apiConfig: config,
          endpoints: toolEndpoints,
          fetchFn,
        })
        expect(fetchFn).not.toHaveBeenCalled()
        expect(result.isError).toBe(true)
        expect(payload(result).error).toContain(`Invalid arguments for ${fixture.name}`)
        expect(payload(result).error).toContain(field)
      })
    }
  }

  it.each([
    ['wireweave_parse', { source: 42 }],
    ['wireweave_validate', { source: SOURCE, strict: 'true' }],
    ['wireweave_render_html_code', { source: SOURCE, theme: 'sepia' }],
    ['wireweave_validate_ux', { source: SOURCE, categories: ['unknown-category'] }],
    ['wireweave_examples', { category: 'unknown-category' }],
    ['wireweave_account_transactions', { type: 'transfer' }],
    ['wireweave_cloud_create_project', { name: false }],
    ['wireweave_cloud_save_wireframe', { name: 'Test', code: SOURCE, isPublic: 'true' }],
    ['wireweave_cloud_update_wireframe', { id: 'wireframe-1', tags: [42] }],
    ['wireweave_cloud_restore_version', { wireframeId: 'wireframe-1', version: '2' }],
    ['wireweave_gallery', { limit: '2' }],
  ] satisfies [string, Record<string, unknown>][])(
    '%s rejects wrong types and enum values without coercion or fetch',
    async (name, args) => {
      const original = structuredClone(args)
      const fetchFn = vi.fn<typeof fetch>()
      const result = await dispatch(name, args, {
        apiConfig: config,
        endpoints: toolEndpoints,
        fetchFn,
      })
      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.isError).toBe(true)
      expect(payload(result).error).toContain(`Invalid arguments for ${name}`)
      expect(args).toEqual(original)
    },
  )

  it.each(['__proto__', 'constructor', 'toString', 'wireweave_unknown'])(
    'rejects unregistered tool %s even with an endpoint',
    async (name) => {
      const fetchFn = vi.fn<typeof fetch>()
      const result = await dispatch(
        name,
        {},
        {
          apiConfig: config,
          endpoints: { [name]: { method: 'POST', path: '/unexpected' } },
          fetchFn,
        },
      )
      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.isError).toBe(true)
      expect(payload(result)).toEqual({ error: `Unknown tool: ${name}` })
    },
  )
})

describe('dispatch cancellation', () => {
  it.each([...localFixtures, ...remoteFixtures])(
    '$name rejects an already cancelled request before execution',
    async ({ name, args }) => {
      const fetchFn = vi.fn<typeof fetch>()
      const result = await dispatch(name, args, {
        apiConfig: config,
        endpoints: toolEndpoints,
        fetchFn,
        signal: AbortSignal.abort(new Error('caller cancelled')),
      })
      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.isError).toBe(true)
      expect(payload(result)).toEqual({ error: 'caller cancelled' })
    },
  )

  it('propagates cancellation to an in-flight fetch and discards a late success', async () => {
    const controller = new AbortController()
    let finish!: (response: Response) => void
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const pending = dispatch(
      'wireweave_cloud_get_wireframe',
      { id: 'wireframe-1' },
      {
        apiConfig: config,
        endpoints: toolEndpoints,
        fetchFn,
        signal: controller.signal,
      },
    )
    const requestSignal = fetchFn.mock.calls[0]?.[1]?.signal
    expect(requestSignal?.aborted).toBe(false)
    controller.abort(new Error('caller cancelled'))
    expect(requestSignal?.aborted).toBe(true)
    finish(response({ wireframe: { code: 'must not be admitted' } }))
    const result = await pending
    expect(result.isError).toBe(true)
    expect(payload(result)).toEqual({ error: 'caller cancelled' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
