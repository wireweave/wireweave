import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface ValidateCommandOptions {
  file: string
  strict?: boolean
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface ValidateToolResult {
  valid: boolean
  pageCount?: number
  componentCount?: number
  error?: string
  strictErrors?: string[]
  location?: unknown
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function validateCommand(opts: ValidateCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `validate failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  const result = await callTool(
    'wireweave_validate',
    { source, strict: opts.strict === true },
    opts.dispatchParams,
  )
  const payload = parseJsonResult<ValidateToolResult>(result)

  if (!payload.valid) {
    writeLine(stderr, `validate failed: ${payload.error ?? 'Unknown error'}`)
    if (payload.strictErrors && payload.strictErrors.length > 0) {
      for (const message of payload.strictErrors) {
        writeLine(stderr, `  - ${message}`)
      }
    }
    if (payload.location) {
      writeLine(stderr, `  at: ${JSON.stringify(payload.location)}`)
    }
    return 1
  }

  writeLine(
    stdout,
    `OK: ${opts.file} (pages: ${payload.pageCount ?? 0}, components: ${payload.componentCount ?? 0})`,
  )
  return 0
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
