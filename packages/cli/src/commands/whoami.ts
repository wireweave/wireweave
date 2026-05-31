import { whoami, type AuthDeps } from '../auth.js'

export interface WhoamiCommandOptions {
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  deps?: AuthDeps
}

const writeLine = (stream: NodeJS.WritableStream, text: string): void => {
  stream.write(text)
  stream.write('\n')
}

export async function whoamiCommand(opts: WhoamiCommandOptions = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  try {
    const result = await whoami(opts.deps)
    if (!result.loggedIn) {
      const reason =
        result.reason === 'invalid-token'
          ? 'Stored token is no longer valid. Run `wireweave login`.'
          : 'Not logged in. Run `wireweave login`.'
      writeLine(stdout, reason)
      return result.reason === 'invalid-token' ? 1 : 0
    }
    const account = result.account!
    writeLine(stdout, `Logged in to ${account.apiUrl} (token ...${account.tokenSuffix}).`)
    if (account.subscriptionPlan) {
      writeLine(stdout, `  plan: ${account.subscriptionPlan}`)
    }
    if (typeof account.balance === 'number') {
      writeLine(stdout, `  balance: ${account.balance}`)
    }
    if (typeof account.monthlyRemaining === 'number') {
      writeLine(stdout, `  monthly remaining: ${account.monthlyRemaining}`)
    }
    writeLine(stdout, `  config: ${result.configPath}`)
    return 0
  } catch (err) {
    writeLine(stderr, `whoami failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }
}
