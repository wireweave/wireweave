/**
 * `wireweave.aiGenerate` — generate Wireweave DSL from a natural-language
 * prompt.
 *
 * Flow:
 *   1. Ensure auth (prompt login if needed).
 *   2. Ask the user for a description.
 *   3. Stream `chat` events with a progress UI; accumulate the latest
 *      `code_patch.code` (= full document replacement, per v2.0 contract).
 *   4. If a `wireframe` editor is active, replace its content. Otherwise
 *      open a new untitled `.wf` document so the user can save it.
 *
 * 401 mid-stream re-routes to login so users do not have to retype prompts
 * in a separate flow when their token has just expired.
 */

import * as vscode from 'vscode'
import { getToken, login } from '../auth'
import { chat, UnauthorizedError, type ChatEvent } from '../api'

async function ensureToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  const existing = await getToken(context)
  if (existing) return existing

  const choice = await vscode.window.showWarningMessage(
    '로그인이 필요합니다 / Login required',
    'Login',
  )
  if (choice !== 'Login') return undefined
  const ok = await login(context)
  if (!ok) return undefined
  return getToken(context)
}

async function streamGenerate(
  token: string,
  prompt: string,
  signal: AbortSignal,
  onProgress: (msg: string) => void,
): Promise<string> {
  const stream = await chat({ token, message: prompt, signal })
  let latest = ''
  for await (const event of stream as AsyncIterable<ChatEvent>) {
    if (event.type === 'error') {
      throw new Error(event.error)
    }
    if (event.type === 'code_patch' && event.code) {
      latest = event.code
      onProgress('코드 생성 중... / Generating...')
    } else if (event.type === 'done') {
      if (event.code) latest = event.code
    } else if (event.type === 'text' && event.text) {
      onProgress(event.text)
    }
  }
  if (!latest) {
    throw new Error('Agent stream completed without producing code')
  }
  return latest
}

async function applyResult(code: string): Promise<void> {
  const editor = vscode.window.activeTextEditor

  if (editor && editor.document.languageId === 'wireframe') {
    await editor.edit((edit) => {
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length),
      )
      edit.replace(fullRange, code)
    })
    return
  }

  // Open a new untitled .wf document so VSCode infers the wireframe language
  // from the extension once the user saves.
  const doc = await vscode.workspace.openTextDocument({
    language: 'wireframe',
    content: code,
  })
  await vscode.window.showTextDocument(doc)
}

export async function aiGenerate(context: vscode.ExtensionContext): Promise<void> {
  const token = await ensureToken(context)
  if (!token) return

  const prompt = await vscode.window.showInputBox({
    title: 'Wireweave AI Generate',
    prompt: '어떤 와이어프레임을 만들까요? / Describe the wireframe you want to generate',
    placeHolder: 'e.g. 로그인 페이지, 가운데 정렬 카드, 이메일/비밀번호 입력',
    ignoreFocusOut: true,
  })
  if (!prompt) return

  try {
    const code = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Wireweave: AI 생성 중...',
        cancellable: true,
      },
      async (progress, cancelToken) => {
        const controller = new AbortController()
        cancelToken.onCancellationRequested(() => controller.abort())
        return streamGenerate(token, prompt, controller.signal, (msg) =>
          progress.report({ message: msg }),
        )
      },
    )

    await applyResult(code)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      const choice = await vscode.window.showWarningMessage(
        '세션이 만료되었습니다 / Session expired. Login again?',
        'Login',
      )
      if (choice === 'Login') {
        await login(context)
      }
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`Wireweave: ${message}`)
  }
}
