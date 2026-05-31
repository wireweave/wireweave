import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface ParseCommandOptions {
  file: string
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface ParseToolResult {
  success: boolean
  ast?: unknown
  pageCount?: number
  error?: string
  location?: unknown
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function parseCommand(opts: ParseCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `parse failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  const result = await callTool('wireweave_parse', { source }, opts.dispatchParams)
  const payload = parseJsonResult<ParseToolResult>(result)

  if (!payload.success) {
    writeLine(stderr, `parse failed: ${payload.error ?? 'Unknown error'}`)
    if (payload.location) {
      writeLine(stderr, `  at: ${JSON.stringify(payload.location)}`)
    }
    return 1
  }

  writeLine(stdout, JSON.stringify({ pageCount: payload.pageCount, ast: payload.ast }, null, 2))
  return 0
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
