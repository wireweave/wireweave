import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface AnalyzeCommandOptions {
  file: string
  format?: 'json' | 'summary'
  includeComponentBreakdown?: boolean
  includeAccessibility?: boolean
  includeComplexity?: boolean
  includeLayout?: boolean
  includeContent?: boolean
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface AnalyzeToolResult {
  success?: boolean
  pageCount?: number
  componentCount?: number
  accessibility?: { score?: number }
  complexity?: { score?: number; level?: string }
  components?: Record<string, number>
  error?: string
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function analyzeCommand(opts: AnalyzeCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `analyze failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  const args: Record<string, unknown> = { source }
  if (opts.includeComponentBreakdown === false) args.includeComponentBreakdown = false
  if (opts.includeAccessibility === false) args.includeAccessibility = false
  if (opts.includeComplexity === false) args.includeComplexity = false
  if (opts.includeLayout === false) args.includeLayout = false
  if (opts.includeContent === false) args.includeContent = false

  const result = await callTool('wireweave_analyze', args, opts.dispatchParams)
  if (result.isError) {
    writeLine(stderr, `analyze failed: ${extractFirstText(result.content)}`)
    return 1
  }

  const payload = parseJsonResult<AnalyzeToolResult>(result)
  if (payload.success === false) {
    writeLine(stderr, `analyze failed: ${payload.error ?? 'Unknown error'}`)
    return 1
  }

  if (opts.format === 'summary') {
    writeLine(stdout, `Analysis: ${opts.file}`)
    if (typeof payload.pageCount === 'number') writeLine(stdout, `  pages: ${payload.pageCount}`)
    if (typeof payload.componentCount === 'number')
      writeLine(stdout, `  components: ${payload.componentCount}`)
    if (payload.accessibility && typeof payload.accessibility.score === 'number')
      writeLine(stdout, `  accessibility score: ${payload.accessibility.score}`)
    if (payload.complexity)
      writeLine(
        stdout,
        `  complexity: ${payload.complexity.level ?? 'n/a'} (score: ${payload.complexity.score ?? 'n/a'})`,
      )
    return 0
  }

  writeLine(stdout, JSON.stringify(payload, null, 2))
  return 0
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractFirstText(content: { type: string; text?: string }[]): string {
  const first = content.find((b) => b.type === 'text')
  return first?.text ?? 'Unknown error'
}
