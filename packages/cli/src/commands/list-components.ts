import { callTool, parseJsonResult, type BuildDispatchOptionsParams } from '../dispatch-config.js'

export interface ListComponentsCommandOptions {
  category?: string
  format?: 'table' | 'json'
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  dispatchParams?: BuildDispatchOptionsParams
}

interface ComponentEntry {
  name: string
  category: string
  description?: string
  hasChildren?: boolean
}

interface ListComponentsResult {
  count: number
  components: ComponentEntry[]
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function listComponentsCommand(opts: ListComponentsCommandOptions): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  const args: Record<string, unknown> = {}
  if (opts.category) args.category = opts.category

  const result = await callTool('wireweave_list_components', args, opts.dispatchParams)
  if (result.isError) {
    writeLine(stderr, `list-components failed: ${textOf(result.content)}`)
    return 1
  }

  const payload = parseJsonResult<ListComponentsResult>(result)
  if (opts.format === 'json') {
    writeLine(stdout, JSON.stringify(payload, null, 2))
    return 0
  }

  writeLine(
    stdout,
    `Components: ${payload.count}${opts.category ? ` (category=${opts.category})` : ''}`,
  )
  for (const c of payload.components) {
    const children = c.hasChildren ? ' [container]' : ''
    writeLine(stdout, `  ${c.name.padEnd(20)} ${c.category.padEnd(14)}${children}`)
  }
  return 0
}

function textOf(content: { text: string }[]): string {
  const first = content[0]
  return first ? first.text : ''
}
