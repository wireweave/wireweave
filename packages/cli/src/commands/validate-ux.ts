import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export type UxSeverity = 'error' | 'warning' | 'info'

export interface ValidateUxCommandOptions {
  file: string
  categories?: string[]
  minSeverity?: UxSeverity
  maxIssues?: number
  disabledRules?: string[]
  format?: 'json' | 'summary'
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface UxIssue {
  ruleId?: string
  category?: string
  severity?: UxSeverity
  message?: string
  location?: unknown
}

interface ValidateUxToolResult {
  success: boolean
  valid?: boolean
  score?: number
  issues?: UxIssue[]
  summary?: string
  severityCounts?: Record<string, number>
  error?: string
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function validateUxCommand(opts: ValidateUxCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `validate-ux failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  const args: Record<string, unknown> = { source }
  if (opts.categories && opts.categories.length > 0) args.categories = opts.categories
  if (opts.minSeverity) args.minSeverity = opts.minSeverity
  if (typeof opts.maxIssues === 'number') args.maxIssues = opts.maxIssues
  if (opts.disabledRules && opts.disabledRules.length > 0) args.disabledRules = opts.disabledRules

  const result = await callTool('wireweave_validate_ux', args, opts.dispatchParams)
  if (result.isError) {
    writeLine(stderr, `validate-ux failed: ${extractFirstText(result.content)}`)
    return 1
  }

  const payload = parseJsonResult<ValidateUxToolResult>(result)
  if (!payload.success) {
    writeLine(stderr, `validate-ux failed: ${payload.error ?? 'Unknown error'}`)
    return 1
  }

  if (opts.format === 'summary') {
    const counts = payload.severityCounts ?? {}
    writeLine(
      stdout,
      `UX: ${opts.file} — ${payload.valid ? 'OK' : 'ISSUES'} (score: ${payload.score ?? 'n/a'})`,
    )
    writeLine(
      stdout,
      `  errors: ${counts.error ?? 0}, warnings: ${counts.warning ?? 0}, info: ${counts.info ?? 0}`,
    )
    for (const issue of payload.issues ?? []) {
      const sev = (issue.severity ?? 'info').toUpperCase()
      writeLine(stdout, `  [${sev}] ${issue.ruleId ?? '?'}: ${issue.message ?? ''}`)
    }
    return payload.valid ? 0 : 1
  }

  writeLine(stdout, JSON.stringify(payload, null, 2))
  return payload.valid ? 0 : 1
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractFirstText(content: { type: string; text?: string }[]): string {
  const first = content.find((b) => b.type === 'text')
  return first?.text ?? 'Unknown error'
}
