import { logout, type AuthDeps } from '../auth.js'

export interface LogoutCommandOptions {
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  deps?: AuthDeps
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function logoutCommand(opts: LogoutCommandOptions = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  try {
    const result = await logout(opts.deps)
    if (!result.removed) {
      writeLine(stdout, `Already logged out (no token at ${result.configPath}).`)
      return 0
    }
    writeLine(stdout, `Logged out. Removed ${result.configPath}.`)
    return 0
  } catch (err) {
    writeLine(stderr, `logout failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}
