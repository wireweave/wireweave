import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface ExportSvgCommandOptions {
  file: string
  output?: string
  allScreens?: boolean
  width?: number
  height?: number
  gap?: number
  background?: string
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile' | 'writeFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface ExportSvgToolResult {
  success: boolean
  svg?: string
  error?: string
  diagnostics?: unknown[]
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function exportSvgCommand(opts: ExportSvgCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs
  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (error) {
    writeLine(stderr, `export-svg failed: cannot read ${opts.file}: ${formatError(error)}`)
    return 1
  }
  const profile = {
    id: 'wireweave-static-svg-v1',
    screens: opts.allScreens === true ? 'all' : 'selected',
    ...(opts.width === undefined ? {} : { width: opts.width }),
    ...(opts.height === undefined ? {} : { height: opts.height }),
    ...(opts.gap === undefined ? {} : { gap: opts.gap }),
    ...(opts.background === undefined ? {} : { background: opts.background }),
  }
  const result = await callTool(
    'wireweave_export_svg',
    { source, languageVersion: '4.0.0', profile },
    opts.dispatchParams,
  )
  if (result.isError) {
    writeLine(stderr, `export-svg failed: ${extractFirstText(result.content)}`)
    return 1
  }
  const payload = parseJsonResult<ExportSvgToolResult>(result)
  if (!payload.success || typeof payload.svg !== 'string') {
    writeLine(
      stderr,
      `export-svg failed: ${payload.error ?? JSON.stringify(payload.diagnostics ?? [])}`,
    )
    return 2
  }
  if (opts.output) {
    try {
      await fsLike.writeFile(opts.output, payload.svg, 'utf8')
      writeLine(stdout, `Wrote ${opts.output}`)
    } catch (error) {
      writeLine(stderr, `export-svg failed: cannot write ${opts.output}: ${formatError(error)}`)
      return 1
    }
    return 0
  }
  writeLine(stdout, payload.svg)
  return 0
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function extractFirstText(content: { type: string; text?: string }[]): string {
  const first = content.find((block) => block.type === 'text')
  return first?.text ?? 'Unknown error'
}
