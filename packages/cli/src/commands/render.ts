import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface RenderCommandOptions {
  file: string
  output?: string
  theme?: 'light' | 'dark'
  fullDocument?: boolean
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile' | 'writeFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface RenderToolResult {
  success: boolean
  html?: string
  css?: string
  error?: string
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function renderCommand(opts: RenderCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `render failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  const result = await callTool(
    'wireweave_render_html_code',
    { source, theme: opts.theme ?? 'light', fullDocument: opts.fullDocument === true },
    opts.dispatchParams,
  )

  if (result.isError) {
    writeLine(stderr, `render failed: ${extractFirstText(result.content)}`)
    return 1
  }

  const payload = parseJsonResult<RenderToolResult>(result)
  if (!payload.success) {
    writeLine(stderr, `render failed: ${payload.error ?? 'Unknown error'}`)
    return 1
  }

  const html = payload.html ?? ''
  if (opts.output) {
    try {
      await fsLike.writeFile(opts.output, html, 'utf8')
      writeLine(stdout, `Wrote ${opts.output} (${html.length} bytes)`)
    } catch (err) {
      writeLine(stderr, `render failed: cannot write ${opts.output}: ${formatError(err)}`)
      return 1
    }
  } else {
    stdout.write(html)
    if (!html.endsWith('\n')) stdout.write('\n')
  }

  return 0
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractFirstText(content: { type: string; text?: string }[]): string {
  const first = content.find((b) => b.type === 'text')
  return first?.text ?? 'Unknown error'
}
