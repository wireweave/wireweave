// Public, offline catalog generation. Run from any cwd with --write or --check.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'
import { format, resolveConfig } from 'prettier'

const root = new URL('../', import.meta.url)
const sourcePath = new URL('packages/sdk/src/tool-catalog.json', root)
const sdkPath = new URL('packages/sdk/src/generated/tools.ts', root)
const mcpPath = new URL('packages/mcp-server/src/tools.ts', root)
const requireSdk = createRequire(new URL('packages/sdk/package.json', root))
const { ToolSchema } = requireSdk('@modelcontextprotocol/sdk/types.js')
const { AjvJsonSchemaValidator } = requireSdk('@modelcontextprotocol/sdk/validation/ajv')

const annotationKeys = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']
const methods = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])

export function validateCatalog(catalog) {
  assert.equal(catalog.schemaVersion, 1, 'Unsupported catalog schemaVersion')
  assert.ok(Array.isArray(catalog.tools) && catalog.tools.length > 0, 'Catalog must not be empty')
  const names = new Set()
  const validator = new AjvJsonSchemaValidator()

  for (const entry of catalog.tools) {
    const { name, description, inputSchema, endpoint, dispatch, annotations, annotationReason } =
      entry
    assert.match(name, /^wireweave_[a-z0-9_]+$/, 'Invalid tool name')
    assert.ok(!names.has(name), `Duplicate tool: ${name}`)
    names.add(name)
    assert.ok(
      typeof description === 'string' && description.trim(),
      `${name}: description required`,
    )
    assert.ok(
      typeof annotationReason === 'string' && annotationReason.trim(),
      `${name}: annotation reason required`,
    )
    assert.ok(dispatch === 'local' || dispatch === 'server', `${name}: invalid dispatch`)
    for (const key of annotationKeys) {
      assert.equal(
        typeof annotations?.[key],
        'boolean',
        `${name}: ${key} must be an explicit boolean`,
      )
    }
    ToolSchema.parse({ name, description, inputSchema, annotations })
    validator.getValidator(inputSchema)
    assert.ok(
      inputSchema.properties && typeof inputSchema.properties === 'object',
      `${name}: properties required`,
    )
    assert.ok(Array.isArray(inputSchema.required), `${name}: required array required`)
    assert.equal(
      new Set(inputSchema.required).size,
      inputSchema.required.length,
      `${name}: duplicate required field`,
    )
    for (const key of inputSchema.required) {
      assert.ok(
        Object.hasOwn(inputSchema.properties, key),
        `${name}: undeclared required field ${key}`,
      )
    }

    assert.ok(methods.has(endpoint?.method), `${name}: invalid HTTP method`)
    assert.match(
      endpoint.path,
      /^\/[a-zA-Z0-9_:/-]+$/,
      `${name}: endpoint must be a service-relative path`,
    )
    assert.ok(!endpoint.path.startsWith('//'), `${name}: endpoint cannot have an authority`)
    const params = [...endpoint.path.matchAll(/:([a-zA-Z][a-zA-Z0-9_]*)/g)].map((match) => match[1])
    assert.deepEqual(
      endpoint.pathParams ?? [],
      params,
      `${name}: endpoint placeholders must match pathParams`,
    )
    assert.equal(new Set(params).size, params.length, `${name}: duplicate path parameter`)
    for (const key of params) {
      assert.ok(
        inputSchema.required.includes(key),
        `${name}: path parameter ${key} must be required`,
      )
      assert.ok(
        ['string', 'number', 'integer'].includes(inputSchema.properties[key]?.type),
        `${name}: path parameter ${key} must be scalar`,
      )
    }
    if (annotations.readOnlyHint) {
      assert.equal(annotations.destructiveHint, false, `${name}: a read cannot be destructive`)
      assert.equal(annotations.idempotentHint, true, `${name}: repeated reads cannot mutate state`)
    }
    if (endpoint.method === 'GET') {
      assert.equal(annotations.readOnlyHint, true, `${name}: GET must not mutate state`)
    }
    if (dispatch === 'local') {
      assert.equal(annotations.readOnlyHint, true, `${name}: local tools compute without mutation`)
      assert.equal(
        annotations.openWorldHint,
        false,
        `${name}: local tools cannot cross an external boundary`,
      )
    }
  }
}

export async function renderCatalog(catalog) {
  validateCatalog(catalog)
  const options = {
    ...(await resolveConfig(fileURLToPath(new URL('.prettierrc.json', root)))),
    parser: 'typescript',
  }
  const tools = catalog.tools.map(({ name, description, inputSchema, annotations }) => ({
    name,
    description,
    inputSchema,
    annotations,
  }))
  const endpoints = Object.fromEntries(catalog.tools.map(({ name, endpoint }) => [name, endpoint]))
  const localNames = catalog.tools
    .filter(({ dispatch }) => dispatch === 'local')
    .map(({ name }) => name)
  const header = `/**
 * AUTO-GENERATED. Do not edit directly.
 * Source: packages/sdk/src/tool-catalog.json
 * Regenerate: node scripts/generate-tool-catalog.mjs --write
 * Verify: node scripts/generate-tool-catalog.mjs --check
 */\n`
  const sdk = await format(
    `${header}
import type { Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { ToolEndpoint } from '../types.js'
export type { HttpMethod, ToolEndpoint } from '../types.js'

export type RequiredToolAnnotations = Required<Pick<ToolAnnotations,
  'readOnlyHint' | 'destructiveHint' | 'idempotentHint' | 'openWorldHint'
>>
export type AnnotatedTool = Tool & { annotations: RequiredToolAnnotations }

export const tools: AnnotatedTool[] = ${JSON.stringify(tools, null, 2)}

// Local tools retain their service endpoint for existing explicit remote callers.
export const toolEndpoints: Record<string, ToolEndpoint> = ${JSON.stringify(endpoints, null, 2)}

export const localToolNames: ReadonlySet<string> = new Set(${JSON.stringify(localNames, null, 2)})
`,
    options,
  )
  const mcp = await format(
    `${header}
export { localToolNames, toolEndpoints, tools } from '@wireweave/sdk'
export type { AnnotatedTool, HttpMethod, RequiredToolAnnotations, ToolEndpoint } from '@wireweave/sdk'
`,
    options,
  )
  return { sdk, mcp }
}

export async function generateCatalog(mode) {
  assert.ok(
    mode === '--check' || mode === '--write',
    'Usage: node scripts/generate-tool-catalog.mjs --check|--write',
  )
  const catalog = JSON.parse(await readFile(sourcePath, 'utf8'))
  const { sdk, mcp } = await renderCatalog(catalog)
  // Validate and render every output before writing any of them.
  const outputs = [
    [sdkPath, sdk],
    [mcpPath, mcp],
  ]
  const stale = []
  for (const [url, content] of outputs) {
    const current = await readFile(url, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (current === content) continue
    if (mode === '--write') await writeFile(url, content, 'utf8')
    else stale.push(fileURLToPath(url))
  }
  assert.equal(
    stale.length,
    0,
    `Stale tool catalogs:\n${stale.join('\n')}\nRun node scripts/generate-tool-catalog.mjs --write`,
  )
  console.log(
    `Tool catalog ${mode === '--check' ? 'verified' : 'generated'}: ${catalog.tools.length} tools (${catalog.tools.filter(({ dispatch }) => dispatch === 'local').length} local), 2 outputs`,
  )
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    assert.equal(
      process.argv.length,
      3,
      'Usage: node scripts/generate-tool-catalog.mjs --check|--write',
    )
    await generateCatalog(process.argv[2])
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
