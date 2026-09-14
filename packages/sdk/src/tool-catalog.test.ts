import { describe, expect, it } from 'vitest'
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js'
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv'
import catalog from './tool-catalog.json'
import { localToolNames, toolEndpoints, tools } from './generated/tools.js'
import { localToolNames as publicLocalNames, tools as publicTools } from './index.js'

// Independent public API expectations: changing a route or required inputs is a contract change.
const routes = [
  ['wireweave_parse', 'POST', '/tools/parse', 'source'],
  ['wireweave_validate', 'POST', '/tools/validate', 'source'],
  ['wireweave_grammar', 'GET', '/tools/grammar', ''],
  ['wireweave_guide', 'GET', '/tools/guide', ''],
  ['wireweave_patterns', 'GET', '/tools/patterns', ''],
  ['wireweave_examples', 'GET', '/tools/examples', ''],
  ['wireweave_list_components', 'GET', '/tools/list-components', ''],
  ['wireweave_render_html_code', 'POST', '/tools/render/html', 'source'],
  ['wireweave_validate_ux', 'POST', '/tools/validate/ux', 'source'],
  ['wireweave_ux_rules', 'GET', '/tools/ux-rules', ''],
  ['wireweave_diff', 'POST', '/tools/diff', 'oldSource,newSource'],
  ['wireweave_export_json', 'POST', '/tools/export/json', 'source'],
  ['wireweave_export_figma', 'POST', '/tools/export/figma', 'source'],
  ['wireweave_analyze', 'POST', '/tools/analyze', 'source'],
  ['wireweave_cloud_list_projects', 'GET', '/cloud/projects', ''],
  ['wireweave_cloud_create_project', 'POST', '/cloud/projects', 'name'],
  ['wireweave_cloud_update_project', 'PATCH', '/cloud/projects/:id', 'id'],
  ['wireweave_cloud_list_wireframes', 'GET', '/cloud/wireframes', ''],
  ['wireweave_cloud_get_wireframe', 'GET', '/cloud/wireframes/:id', 'id'],
  ['wireweave_cloud_save_wireframe', 'POST', '/cloud/wireframes', 'name,code'],
  ['wireweave_cloud_update_wireframe', 'PATCH', '/cloud/wireframes/:id', 'id'],
  ['wireweave_cloud_delete_wireframe', 'DELETE', '/cloud/wireframes/:id', 'id'],
  ['wireweave_cloud_get_versions', 'GET', '/cloud/wireframes/:wireframeId/versions', 'wireframeId'],
  [
    'wireweave_cloud_restore_version',
    'POST',
    '/cloud/wireframes/:wireframeId/versions/:version/restore',
    'wireframeId,version',
  ],
  [
    'wireweave_cloud_create_share_link',
    'POST',
    '/cloud/wireframes/:wireframeId/shares',
    'wireframeId',
  ],
  ['wireweave_cloud_list_shares', 'GET', '/cloud/wireframes/:wireframeId/shares', 'wireframeId'],
  [
    'wireweave_cloud_diff_versions',
    'GET',
    '/cloud/wireframes/:wireframeId/diff',
    'wireframeId,versionA,versionB',
  ],
  ['wireweave_account_balance', 'GET', '/billing/balance', ''],
  ['wireweave_account_subscription', 'GET', '/billing/subscription', ''],
  ['wireweave_account_transactions', 'GET', '/billing/transactions', ''],
  ['wireweave_pricing', 'GET', '/billing/pricing', ''],
  ['wireweave_gallery', 'GET', '/cloud/gallery', ''],
] as const

const mutations: Record<string, { destructiveHint: boolean; idempotentHint: boolean }> = {
  wireweave_cloud_create_project: { destructiveHint: false, idempotentHint: false },
  wireweave_cloud_update_project: { destructiveHint: true, idempotentHint: true },
  wireweave_cloud_save_wireframe: { destructiveHint: false, idempotentHint: false },
  wireweave_cloud_update_wireframe: { destructiveHint: true, idempotentHint: false },
  wireweave_cloud_delete_wireframe: { destructiveHint: true, idempotentHint: true },
  wireweave_cloud_restore_version: { destructiveHint: true, idempotentHint: false },
  wireweave_cloud_create_share_link: { destructiveHint: false, idempotentHint: false },
}
const publicInteractions = new Set([
  'wireweave_cloud_save_wireframe',
  'wireweave_cloud_update_wireframe',
  'wireweave_cloud_delete_wireframe',
  'wireweave_cloud_restore_version',
  'wireweave_cloud_create_share_link',
  'wireweave_gallery',
])

describe('public catalog contract', () => {
  it('retains exactly the 32 public tools and exports the same objects', () => {
    expect(tools.map(({ name }) => name)).toEqual(routes.map(([name]) => name))
    expect(Object.keys(toolEndpoints)).toEqual(routes.map(([name]) => name))
    expect(publicTools).toBe(tools)
    expect(publicLocalNames).toBe(localToolNames)
  })

  it('keeps the nine no-network dispatch tools explicit', () => {
    expect([...localToolNames]).toEqual([
      'wireweave_parse',
      'wireweave_validate',
      'wireweave_list_components',
      'wireweave_render_html_code',
      'wireweave_validate_ux',
      'wireweave_diff',
      'wireweave_export_json',
      'wireweave_export_figma',
      'wireweave_analyze',
    ])
  })

  it.each(routes)('%s retains its endpoint and required inputs', (name, method, path, required) => {
    const tool = tools.find((entry) => entry.name === name)!
    const params = [...path.matchAll(/:(\w+)/g)].map((match) => match[1])
    expect(toolEndpoints[name]).toEqual({
      method,
      path,
      ...(params.length > 0 ? { pathParams: params } : {}),
    })
    expect(tool.inputSchema.required).toEqual(required ? required.split(',') : [])
    for (const param of params) {
      expect(tool.inputSchema.required).toContain(param)
      expect(tool.inputSchema.properties).toHaveProperty(param)
    }
  })

  it.each(tools)(
    '$name exposes the canonical schema and four explicit, meaningful hints',
    (tool) => {
      const source = catalog.tools.find((entry) => entry.name === tool.name)!
      expect(ToolSchema.safeParse(tool).success).toBe(true)
      expect(tool.inputSchema).toEqual(source.inputSchema)
      expect(tool.description).toEqual(source.description)
      expect(tool.annotations).toEqual(source.annotations)
      expect(tool.annotations).toEqual({
        readOnlyHint: !Object.hasOwn(mutations, tool.name),
        destructiveHint: mutations[tool.name]?.destructiveHint ?? false,
        idempotentHint: mutations[tool.name]?.idempotentHint ?? true,
        openWorldHint: publicInteractions.has(tool.name),
      })
      expect(source.annotationReason.length).toBeGreaterThan(0)
      expect(localToolNames.has(tool.name)).toBe(source.dispatch === 'local')
    },
  )

  it.each(tools)('$name has a compilable object schema with valid defaults', (tool) => {
    const validator = new AjvJsonSchemaValidator()
    const validate = validator.getValidator(tool.inputSchema)
    for (const input of [null, [], 'source', 1, true]) {
      expect(validate(input).valid).toBe(false)
    }
    if (tool.inputSchema.required?.length === 0) expect(validate({}).valid).toBe(true)
    for (const property of Object.values(tool.inputSchema.properties ?? {})) {
      const schema = property as Record<string, unknown>
      if (Object.hasOwn(schema, 'default')) {
        const validateProperty = validator.getValidator({
          type: 'object',
          properties: { value: schema },
          required: ['value'],
        })
        expect(validateProperty({ value: schema.default }).valid).toBe(true)
      }
    }
  })
})
