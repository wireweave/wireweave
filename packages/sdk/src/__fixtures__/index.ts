import { vi } from 'vitest'

import type { ApiConfig, ToolEndpoint } from '../types.js'

export const sampleApiConfig: ApiConfig = {
  apiUrl: 'https://api.wireweave.test',
  apiKey: 'test_api_key_12345',
}

export const sampleEndpoints: Record<string, ToolEndpoint> = {
  wireweave_validate_dsl: {
    method: 'POST',
    path: '/validate-dsl',
  },
  wireweave_render_html_code: {
    method: 'POST',
    path: '/render-html-code',
  },
  wireweave_cloud_get_project: {
    method: 'GET',
    path: '/cloud/projects/:id',
    pathParams: ['id'],
  },
  wireweave_cloud_list_projects: {
    method: 'GET',
    path: '/cloud/projects',
  },
}

export interface MockResponseInit {
  status?: number
  body?: unknown
  headers?: Record<string, string>
  ok?: boolean
}

function createMockResponse(init: MockResponseInit = {}): Response {
  const { status = 200, body = {}, headers = {}, ok } = init
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body)

  return new Response(bodyText, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    statusText: ok === false || status >= 400 ? 'Error' : 'OK',
  })
}

export function createMockFetch(responses: MockResponseInit | MockResponseInit[]): typeof fetch {
  const queue = Array.isArray(responses) ? [...responses] : [responses]
  return vi.fn(() => {
    const next = queue.shift() ?? queue[queue.length - 1] ?? { status: 200, body: {} }
    return Promise.resolve(createMockResponse(next))
  })
}
