/**
 * Wireweave AI agent HTTP client used by the VSCode extension.
 *
 * Mirrors the SSE parser pattern from `@wireweave/skill-cursor` but is a
 * standalone copy — `vscode-extension` is a separate npm package and does
 * not workspace-link its sibling packages (per the multi-repo rule).
 *
 * Auth: Bearer token from the extension's SecretStorage (see `./auth.ts`).
 * The 401 path throws `UnauthorizedError` so command handlers can re-trigger
 * the login flow without sniffing string messages.
 *
 * Runtime: relies on Node 18+ global `fetch` (VSCode 1.85+ ships Node 18+).
 */

const DEFAULT_API_URL = 'https://api.wireweave.org'

function getBaseUrl(): string {
  return process.env.WIREWEAVE_API_URL ?? DEFAULT_API_URL
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Streaming agent event surfaced to the caller.
 *
 * Per the v2.0 contract, `code_patch.code` is the **full replacement
 * document**, not a diff — accumulating the latest non-empty value yields
 * the final document.
 */
export type ChatEvent =
  | { type: 'text'; text: string }
  | { type: 'code_patch'; code: string }
  | { type: 'done'; code?: string }
  | { type: 'error'; error: string }

export interface ChatOptions {
  token: string
  message: string
  conversationId?: string
  signal?: AbortSignal
}

interface SseFrame {
  event: string
  data: unknown
}

function parseSseFrame(frame: string): SseFrame | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (dataLines.length === 0) return null
  const dataRaw = dataLines.join('\n')
  try {
    return { event, data: JSON.parse(dataRaw) }
  } catch {
    return { event, data: dataRaw }
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string
      message?: string
    }
    return body.error ?? body.message ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status} ${response.statusText}`.trim()
  }
}

/**
 * POST `/api/agent/chat` and return an async iterator over decoded SSE events.
 *
 * The iterator yields `text`, `code_patch`, `done`, and `error` events as the
 * server stream advances. The caller is responsible for accumulating the
 * latest `code_patch.code` (which is the full document replacement) — this
 * function intentionally does NOT collapse the stream so the UI can show
 * progressive feedback.
 */
export async function chat(options: ChatOptions): Promise<AsyncIterable<ChatEvent>> {
  const response = await fetch(`${getBaseUrl()}/api/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify({
      message: options.message,
      conversationId: options.conversationId,
    }),
    signal: options.signal,
  })

  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  if (!response.body) {
    throw new Error('Empty response body from agent stream')
  }

  return iterateSse(response.body)
}

async function* iterateSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatEvent, void, unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separatorIdx: number
      while ((separatorIdx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, separatorIdx)
        buffer = buffer.slice(separatorIdx + 2)
        const parsed = parseSseFrame(frame)
        if (!parsed) continue
        const mapped = mapFrame(parsed)
        if (mapped) yield mapped
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function mapFrame(parsed: SseFrame): ChatEvent | null {
  const data = parsed.data as
    | {
        text?: string
        code?: string
        error?: string
        message?: string
        output?: { code?: string }
      }
    | undefined

  switch (parsed.event) {
    case 'error': {
      const msg = data?.error ?? data?.message ?? 'Agent stream returned an error'
      return { type: 'error', error: msg }
    }
    case 'text':
    case 'message': {
      if (typeof data?.text === 'string') {
        return { type: 'text', text: data.text }
      }
      // progress frames may carry partial code
      const candidate = data?.output?.code ?? data?.code
      if (typeof candidate === 'string' && candidate.length > 0) {
        return { type: 'code_patch', code: candidate }
      }
      return null
    }
    case 'progress':
    case 'code_patch': {
      const candidate = data?.output?.code ?? data?.code
      if (typeof candidate === 'string' && candidate.length > 0) {
        return { type: 'code_patch', code: candidate }
      }
      return null
    }
    case 'complete':
    case 'done': {
      const candidate = data?.output?.code ?? data?.code
      return {
        type: 'done',
        code: typeof candidate === 'string' ? candidate : undefined,
      }
    }
    default:
      return null
  }
}

export interface UsageInfo {
  used: number
  limit: number
  remaining: number
  resetAt: string
}

/**
 * GET `/api/agent/usage/me` — returns the current AI quota state for the
 * caller's account.
 */
export async function getUsage(token: string): Promise<UsageInfo> {
  const response = await fetch(`${getBaseUrl()}/api/agent/usage/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const body = (await response.json()) as Partial<UsageInfo>
  if (
    typeof body.used !== 'number' ||
    typeof body.limit !== 'number' ||
    typeof body.remaining !== 'number' ||
    typeof body.resetAt !== 'string'
  ) {
    throw new Error('Usage response missing required fields')
  }
  return {
    used: body.used,
    limit: body.limit,
    remaining: body.remaining,
    resetAt: body.resetAt,
  }
}
