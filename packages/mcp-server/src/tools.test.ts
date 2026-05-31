import { describe, it, expect } from 'vitest'
import { tools, toolEndpoints } from './tools.js'

describe('tools', () => {
  it('should export an array of tools', () => {
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
  })

  it('each tool should have required properties', () => {
    for (const tool of tools) {
      expect(tool).toHaveProperty('name')
      expect(tool).toHaveProperty('description')
      expect(tool).toHaveProperty('inputSchema')

      expect(typeof tool.name).toBe('string')
      expect(typeof tool.description).toBe('string')
      expect(typeof tool.inputSchema).toBe('object')
    }
  })

  it('each tool should have a valid inputSchema', () => {
    for (const tool of tools) {
      expect(tool.inputSchema).toHaveProperty('type', 'object')
      expect(tool.inputSchema).toHaveProperty('properties')
      expect(tool.inputSchema).toHaveProperty('required')
      expect(Array.isArray(tool.inputSchema.required)).toBe(true)
    }
  })

  it('tool names should follow naming convention (wireweave_*)', () => {
    for (const tool of tools) {
      expect(tool.name).toMatch(/^wireweave_/)
    }
  })

  it('tool names should be unique', () => {
    const names = tools.map((t) => t.name)
    const uniqueNames = [...new Set(names)]
    expect(names.length).toBe(uniqueNames.length)
  })
})

describe('toolEndpoints', () => {
  it('should export a record of endpoints', () => {
    expect(typeof toolEndpoints).toBe('object')
    expect(Object.keys(toolEndpoints).length).toBeGreaterThan(0)
  })

  it('each tool should have a corresponding endpoint', () => {
    for (const tool of tools) {
      expect(toolEndpoints).toHaveProperty(tool.name)
    }
  })

  it('each endpoint should have method and path', () => {
    for (const [_name, endpoint] of Object.entries(toolEndpoints)) {
      expect(endpoint).toHaveProperty('method')
      expect(endpoint).toHaveProperty('path')

      expect(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).toContain(endpoint.method)
      expect(typeof endpoint.path).toBe('string')
      expect(endpoint.path.startsWith('/')).toBe(true)
    }
  })

  it('endpoints with path parameters should declare them', () => {
    for (const [_name, endpoint] of Object.entries(toolEndpoints)) {
      const pathParams = endpoint.path.match(/:(\w+)/g)

      if (pathParams) {
        expect(endpoint.pathParams).toBeDefined()
        expect(Array.isArray(endpoint.pathParams)).toBe(true)

        // Each path param should be declared
        for (const param of pathParams) {
          const paramName = param.substring(1) // Remove leading ':'
          expect(endpoint.pathParams).toContain(paramName)
        }
      }
    }
  })

  describe('core tools endpoints', () => {
    it('parse should POST to /tools/parse', () => {
      expect(toolEndpoints.wireweave_parse).toEqual({
        method: 'POST',
        path: '/tools/parse',
      })
    })

    it('validate should POST to /tools/validate', () => {
      expect(toolEndpoints.wireweave_validate).toEqual({
        method: 'POST',
        path: '/tools/validate',
      })
    })

    it('grammar should GET from /tools/grammar', () => {
      expect(toolEndpoints.wireweave_grammar).toEqual({
        method: 'GET',
        path: '/tools/grammar',
      })
    })

    it('render_html_code should POST to /tools/render/html', () => {
      expect(toolEndpoints.wireweave_render_html_code).toEqual({
        method: 'POST',
        path: '/tools/render/html',
      })
    })

    // Note: render_svg is an internal API (is_public=false), not exposed via MCP
  })

  describe('cloud tools endpoints', () => {
    it('cloud_list_projects should GET from /cloud/projects', () => {
      expect(toolEndpoints.wireweave_cloud_list_projects).toEqual({
        method: 'GET',
        path: '/cloud/projects',
      })
    })

    it('cloud_update_project should PATCH to /cloud/projects/:id', () => {
      expect(toolEndpoints.wireweave_cloud_update_project).toEqual({
        method: 'PATCH',
        path: '/cloud/projects/:id',
        pathParams: ['id'],
      })
    })

    it('cloud_restore_version should POST with multiple path params', () => {
      expect(toolEndpoints.wireweave_cloud_restore_version).toEqual({
        method: 'POST',
        path: '/cloud/wireframes/:wireframeId/versions/:version/restore',
        pathParams: ['wireframeId', 'version'],
      })
    })
  })

  describe('billing tools endpoints', () => {
    it('account_balance should GET from /billing/balance', () => {
      expect(toolEndpoints.wireweave_account_balance).toEqual({
        method: 'GET',
        path: '/billing/balance',
      })
    })

    it('pricing should GET from /billing/pricing', () => {
      expect(toolEndpoints.wireweave_pricing).toEqual({
        method: 'GET',
        path: '/billing/pricing',
      })
    })
  })
})
