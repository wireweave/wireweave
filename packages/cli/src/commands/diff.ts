import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface DiffCommandOptions {
  oldFile: string
  newFile: string
  ignoreAttributes?: boolean
  ignoreOrder?: boolean
  format?: 'json' | 'summary'
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface DiffToolResult {
  success: boolean
  identical?: boolean
  summary?: { added?: number; removed?: number; modified?: number }
  description?: string
  changes?: unknown[]
  error?: string
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function diffCommand(opts: DiffCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let oldSource: string
  let newSource: string
  try {
    oldSource = await fsLike.readFile(opts.oldFile, 'utf8')
  } catch (err) {
    writeLine(stderr, `diff failed: cannot read ${opts.oldFile}: ${formatError(err)}`)
    return 1
  }
  try {
    newSource = await fsLike.readFile(opts.newFile, 'utf8')
  } catch (err) {
    writeLine(stderr, `diff failed: cannot read ${opts.newFile}: ${formatError(err)}`)
    return 1
  }

  const args: Record<string, unknown> = { oldSource, newSource }
  if (opts.ignoreAttributes === true) args.ignoreAttributes = true
  if (opts.ignoreOrder === true) args.ignoreOrder = true

  const result = await callTool('wireweave_diff', args, opts.dispatchParams)
  if (result.isError) {
    writeLine(stderr, `diff failed: ${extractFirstText(result.content)}`)
    return 1
  }

  const payload = parseJsonResult<DiffToolResult>(result)
  if (!payload.success) {
    writeLine(stderr, `diff failed: ${payload.error ?? 'Unknown error'}`)
    return 1
  }

  if (opts.format === 'summary') {
    if (payload.identical) {
      writeLine(stdout, `Identical: ${opts.oldFile} <-> ${opts.newFile}`)
      return 0
    }
    const s = payload.summary ?? {}
    writeLine(stdout, `Diff: ${opts.oldFile} <-> ${opts.newFile}`)
    writeLine(
      stdout,
      `  added: ${s.added ?? 0}, removed: ${s.removed ?? 0}, modified: ${s.modified ?? 0}`,
    )
    if (payload.description) writeLine(stdout, `  ${payload.description}`)
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
