import {
  analyze,
  diff,
  exportToFigma,
  exportToJson,
  parse,
  render,
  renderToHtml,
  validate,
  walkDocument,
  type AnalysisOptions,
  type DiffOptions,
  type ExportOptions,
  type ParseError,
  type SourceLocation,
  type WireframeDocument,
} from '@wireweave/core'
import { validateUX, type UXRuleCategory, type UXValidationOptions } from '@wireweave/ux-rules'
import { ALL_COMPONENTS } from '@wireweave/language-data'

import { localToolNames } from './generated/tools.js'
import type { LocalToolContentBlock, LocalToolResult } from './types.js'

export const LOCAL_DISPATCH_TOOL_NAMES: ReadonlySet<string> = localToolNames

export function isLocalDispatchTool(name: string): boolean {
  return localToolNames.has(name)
}

export function localDispatch(toolName: string, args: Record<string, unknown>): LocalToolResult {
  switch (toolName) {
    case 'wireweave_parse':
      return parseTool(args)
    case 'wireweave_validate':
      return validateTool(args)
    case 'wireweave_render_html_code':
      return renderHtmlCodeTool(args)
    case 'wireweave_validate_ux':
      return validateUxTool(args)
    case 'wireweave_diff':
      return diffTool(args)
    case 'wireweave_analyze':
      return analyzeTool(args)
    case 'wireweave_list_components':
      return listComponentsTool(args)
    case 'wireweave_export_json':
      return exportJsonTool(args)
    case 'wireweave_export_figma':
      return exportFigmaTool(args)
    default:
      return errorResult(`Unknown local tool: ${toolName}`)
  }
}

function successResult(payload: Record<string, unknown>): LocalToolResult {
  const block: LocalToolContentBlock = {
    type: 'text',
    text: JSON.stringify(payload, null, 2),
  }
  return { content: [block] }
}

function errorResult(message: string): LocalToolResult {
  const block: LocalToolContentBlock = {
    type: 'text',
    text: JSON.stringify({ error: message }, null, 2),
  }
  return { content: [block], isError: true }
}

function requireString(args: Record<string, unknown>, key: string): string | null {
  const value = args[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function isParseError(err: unknown): err is ParseError {
  return (
    err instanceof Error &&
    (err as { name?: unknown }).name === 'ParseError' &&
    typeof (err as { location?: unknown }).location === 'object' &&
    (err as { location?: unknown }).location !== null
  )
}

function getParseErrorLocation(err: unknown): SourceLocation | undefined {
  return isParseError(err) ? err.location : undefined
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

function countComponents(doc: WireframeDocument): number {
  let count = 0
  walkDocument(doc, (n) => {
    if (n.type !== 'Page') count++
  })
  return count
}

function parseTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  try {
    const ast = parse(source)
    return successResult({
      success: true,
      ast,
      pageCount: ast.children.length,
    })
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'Parse error'),
      location: getParseErrorLocation(err),
    })
  }
}

function validateTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  const strict = args.strict === true
  try {
    const ast = parse(source)
    const result: {
      valid: boolean
      pageCount: number
      componentCount: number
      error?: string
      strictErrors?: string[]
    } = {
      valid: true,
      pageCount: ast.children.length,
      componentCount: countComponents(ast),
    }
    if (strict) {
      const v = validate(ast)
      if (!v.valid) {
        result.valid = false
        result.error = v.errorSummary ?? 'Unknown attributes found'
        result.strictErrors = v.errors.map((e) => e.message)
      }
    }
    return successResult(result)
  } catch (err) {
    return successResult({
      valid: false,
      error: errorMessage(err, 'Validation error'),
      location: getParseErrorLocation(err),
    })
  }
}

function renderHtmlCodeTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  const theme = args.theme === 'dark' ? 'dark' : 'light'
  const fullDocument = args.fullDocument === true
  try {
    const ast = parse(source)
    if (fullDocument) {
      const html = renderToHtml(ast, { theme })
      return successResult({ success: true, html })
    }
    const result = render(ast, { theme })
    return successResult({ success: true, html: result.html, css: result.css })
  } catch (err) {
    return successResult({ success: false, error: errorMessage(err, 'Render error') })
  }
}

function validateUxTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  try {
    const ast = parse(source)
    const options: UXValidationOptions = {
      categories: Array.isArray(args.categories)
        ? (args.categories as UXRuleCategory[])
        : undefined,
      minSeverity:
        args.minSeverity === 'error' ||
        args.minSeverity === 'warning' ||
        args.minSeverity === 'info'
          ? args.minSeverity
          : undefined,
      maxIssues: typeof args.maxIssues === 'number' ? args.maxIssues : undefined,
      disabledRules: Array.isArray(args.disabledRules)
        ? (args.disabledRules as string[])
        : undefined,
    }
    const result = validateUX(ast, options)
    return successResult({
      success: true,
      valid: result.valid,
      score: result.score,
      issues: result.issues,
      summary: result.summary,
      severityCounts: result.severityCounts,
    })
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'UX validation error'),
      location: getParseErrorLocation(err),
    })
  }
}

function diffTool(args: Record<string, unknown>): LocalToolResult {
  const oldSource = requireString(args, 'oldSource')
  const newSource = requireString(args, 'newSource')
  if (oldSource === null) return errorResult('oldSource is required')
  if (newSource === null) return errorResult('newSource is required')
  try {
    const oldAst = parse(oldSource)
    const newAst = parse(newSource)
    const options: DiffOptions = {
      ignoreAttributes: args.ignoreAttributes === true ? true : undefined,
      ignoreOrder: args.ignoreOrder === true ? true : undefined,
    }
    const result = diff(oldAst, newAst, options)
    return successResult({
      success: true,
      identical: result.identical,
      summary: result.summary,
      changes: result.changes,
      description: result.description,
    })
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'Diff error'),
      location: getParseErrorLocation(err),
    })
  }
}

function listComponentsTool(args: Record<string, unknown>): LocalToolResult {
  const category =
    typeof args.category === 'string' && args.category.length > 0 ? args.category : undefined
  const components = category
    ? ALL_COMPONENTS.filter((c) => c.category === category)
    : ALL_COMPONENTS
  return successResult({ count: components.length, components })
}

function exportJsonTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  try {
    const ast = parse(source)
    const options: ExportOptions = {
      includeLocations: args.includeLocations === true ? true : undefined,
      prettyPrint: args.prettyPrint === false ? false : undefined,
      includeEmptyAttributes: args.includeEmptyAttributes === true ? true : undefined,
    }
    const result = exportToJson(ast, options)
    return successResult({ success: true, ...(result as unknown as Record<string, unknown>) })
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'Export error'),
      location: getParseErrorLocation(err),
    })
  }
}

function exportFigmaTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  try {
    const ast = parse(source)
    const result = exportToFigma(ast)
    return successResult({ success: true, ...(result as unknown as Record<string, unknown>) })
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'Export error'),
      location: getParseErrorLocation(err),
    })
  }
}

function analyzeTool(args: Record<string, unknown>): LocalToolResult {
  const source = requireString(args, 'source')
  if (source === null) return errorResult('source is required')
  try {
    const ast = parse(source)
    const options: AnalysisOptions = {
      includeComponentBreakdown: args.includeComponentBreakdown !== false,
      includeAccessibility: args.includeAccessibility !== false,
      includeComplexity: args.includeComplexity !== false,
      includeLayout: args.includeLayout !== false,
      includeContent: args.includeContent !== false,
    }
    const result = analyze(ast, options)
    return successResult(result as unknown as Record<string, unknown>)
  } catch (err) {
    return successResult({
      success: false,
      error: errorMessage(err, 'Analysis error'),
      location: getParseErrorLocation(err),
    })
  }
}
