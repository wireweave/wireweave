import { describe, expect, it, vi } from 'vitest'

import { dispatch } from './dispatcher.js'
import { createMockFetch, sampleApiConfig, sampleEndpoints } from './__fixtures__/index.js'

const VALID_SOURCE = 'page Home {\n  text "Hi"\n}\n'

describe('dispatch: local tool', () => {
  it('routes wireweave_parse to localDispatch and does NOT call fetch', async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch
    const result = await dispatch(
      'wireweave_parse',
      { source: VALID_SOURCE },
      { apiConfig: sampleApiConfig, endpoints: sampleEndpoints, fetchFn },
    )
    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text) as { success: boolean; pageCount: number }
    expect(payload.success).toBe(true)
    expect(payload.pageCount).toBe(1)
  })

  it('routes wireweave_render_html_code locally without fetch', async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch
    const result = await dispatch(
      'wireweave_render_html_code',
      { source: VALID_SOURCE, fullDocument: true },
      { apiConfig: sampleApiConfig, endpoints: sampleEndpoints, fetchFn },
    )
    expect(fetchFn).not.toHaveBeenCalled()
    const payload = JSON.parse(result.content[0].text) as { success: boolean; html: string }
    expect(payload.success).toBe(true)
    expect(payload.html).toContain('<html')
  })
})

describe('dispatch: server tool', () => {
  it('calls fetch via callApi for wireweave_cloud_list_projects', async () => {
    const fetchFn = createMockFetch({
      status: 200,
      body: { projects: [{ id: 'p1' }] },
    })
    const result = await dispatch(
      'wireweave_cloud_list_projects',
      {},
      { apiConfig: sampleApiConfig, endpoints: sampleEndpoints, fetchFn },
    )
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text) as { projects: { id: string }[] }
    expect(payload.projects).toHaveLength(1)
  })

  it('returns isError when server tool endpoint is missing', async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch
    const result = await dispatch(
      'wireweave_guide',
      {},
      { apiConfig: sampleApiConfig, endpoints: sampleEndpoints, fetchFn },
    )
    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown tool')
  })

  it('returns isError when api call fails (non-OK)', async () => {
    const fetchFn = createMockFetch({ status: 500, body: { error: 'boom' } })
    const result = await dispatch(
      'wireweave_cloud_list_projects',
      {},
      { apiConfig: sampleApiConfig, endpoints: sampleEndpoints, fetchFn },
    )
    expect(fetchFn).toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })
})
