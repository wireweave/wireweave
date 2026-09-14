import { promises as fs } from 'node:fs'
import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface ExportFigmaCommandOptions {
  file: string
  output?: string
  languageVersion?: string
  allScreens?: boolean
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  fsLike?: Pick<typeof fs, 'readFile' | 'writeFile'>
  dispatchParams?: BuildDispatchOptionsParams
}

interface ExportFigmaToolResult {
  success: boolean
  error?: string
  [key: string]: unknown
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function exportFigmaCommand(opts: ExportFigmaCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  let source: string
  try {
    source = await fsLike.readFile(opts.file, 'utf8')
  } catch (err) {
    writeLine(stderr, `export-figma failed: cannot read ${opts.file}: ${formatError(err)}`)
    return 1
  }

  if (opts.languageVersion !== undefined && opts.languageVersion !== '4.0.0') {
    writeLine(stderr, `export-figma failed: unsupported language version ${opts.languageVersion}`)
    return 4
  }
  const args =
    opts.languageVersion === '4.0.0'
      ? {
          source,
          languageVersion: '4.0.0',
          profile: {
            id: 'wireweave-figma-mapping-v1',
            target: 'figma-plugin-json-v1',
            screens: opts.allScreens === true ? 'all' : 'selected',
          },
        }
      : { source }
  const result = await callTool('wireweave_export_figma', args, opts.dispatchParams)
  if (result.isError) {
    writeLine(stderr, `export-figma failed: ${extractFirstText(result.content)}`)
    return opts.languageVersion === '4.0.0' ? 2 : 1
  }

  const payload = parseJsonResult<ExportFigmaToolResult>(result)
  if (!payload.success) {
    writeLine(stderr, `export-figma failed: ${payload.error ?? 'Unknown error'}`)
    return 1
  }

  const text = JSON.stringify(payload, null, 2)
  if (opts.output) {
    try {
      await fsLike.writeFile(opts.output, text, 'utf8')
      writeLine(stdout, `Wrote ${opts.output}`)
    } catch (err) {
      writeLine(stderr, `export-figma failed: cannot write ${opts.output}: ${formatError(err)}`)
      return 1
    }
    return 0
  }

  writeLine(stdout, text)
  return 0
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractFirstText(content: { type: string; text?: string }[]): string {
  const first = content.find((b) => b.type === 'text')
  return first?.text ?? 'Unknown error'
}
