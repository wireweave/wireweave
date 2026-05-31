import { promises as fs } from 'node:fs'
import { AuthError, login, type AuthDeps, type LoginParams } from '../auth.js'

export interface LoginCommandOptions {
  apiKey?: string
  apiUrl?: string
  stdin?: NodeJS.ReadableStream
  env?: NodeJS.ProcessEnv
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  deps?: AuthDeps
  fsLike?: Pick<typeof fs, 'stat'>
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8').trim()
}

async function resolveApiKey(opts: LoginCommandOptions): Promise<string | null> {
  if (opts.apiKey && opts.apiKey.length > 0) return opts.apiKey
  const env = opts.env ?? process.env
  if (env.WIREWEAVE_API_KEY && env.WIREWEAVE_API_KEY.length > 0) return env.WIREWEAVE_API_KEY
  const stdin = opts.stdin ?? process.stdin
  if (!('isTTY' in stdin) || stdin.isTTY === false) {
    const piped = await readStdin(stdin)
    if (piped.length > 0) return piped
  }
  return null
}

export async function loginCommand(opts: LoginCommandOptions = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const fsLike = opts.fsLike ?? fs

  const apiKey = await resolveApiKey(opts)
  if (apiKey === null) {
    writeLine(
      stderr,
      'No API key supplied. Use --api-key, WIREWEAVE_API_KEY, or pipe the key to stdin.',
    )
    return 2
  }

  const params: LoginParams = { apiKey, apiUrl: opts.apiUrl }
  try {
    const account = await login(params, opts.deps)
    writeLine(stdout, `Signed in to ${account.apiUrl} (token ...${account.tokenSuffix}).`)
    if (account.subscriptionPlan) {
      writeLine(
        stdout,
        `  plan: ${account.subscriptionPlan}` +
          (typeof account.balance === 'number' ? `, balance: ${account.balance}` : ''),
      )
    }

    const { getConfigPath } = await import('@wireweave/sdk')
    const configPath = getConfigPath(opts.deps?.authOptions)
    try {
      const stat = await fsLike.stat(configPath)
      const mode = stat.mode & 0o777
      if (mode !== 0o600) {
        writeLine(stderr, `warning: ${configPath} permission is ${mode.toString(8)}, expected 600.`)
      }
    } catch {
      writeLine(stderr, `warning: cannot stat ${configPath}.`)
    }

    return 0
  } catch (err) {
    if (err instanceof AuthError) {
      writeLine(stderr, `login failed: ${err.message}`)
      return 1
    }
    writeLine(stderr, `login failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}
