/**
 * `wireweave.aiImprove` — refine the current wireframe using AI.
 *
 * Sends the current selection (or full document if no selection) to the
 * agent along with the user's improvement instruction. The proposed code is
 * shown in a `vscode.diff` view so the user can review before applying;
 * a follow-up QuickPick offers Apply / Cancel rather than relying on the
 * diff editor's hidden actions, which differ between VSCode and Cursor.
 *
 * Why "current code + improvement" instead of `conversationId`: the user
 * may invoke this command on arbitrary documents across sessions; sending
 * the snippet inline keeps the prompt self-contained and avoids stale-state
 * bugs when the local file diverged from the last AI conversation.
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

interface EditorSnapshot {
  editor: vscode.TextEditor
  current: string
  isSelection: boolean
  range: vscode.Range
}

function snapshotEditor(): EditorSnapshot | undefined {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('활성 편집기가 없습니다 / No active editor')
    return undefined
  }
  if (editor.document.languageId !== 'wireframe') {
    vscode.window.showErrorMessage(
      '현재 파일은 wireframe 이 아닙니다 / Active file is not a wireframe',
    )
    return undefined
  }

  const sel = editor.selection
  if (!sel.isEmpty) {
    return {
      editor,
      current: editor.document.getText(sel),
      isSelection: true,
      range: new vscode.Range(sel.start, sel.end),
    }
  }
  const text = editor.document.getText()
  return {
    editor,
    current: text,
    isSelection: false,
    range: new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(text.length)),
  }
}

async function streamImprove(
  token: string,
  message: string,
  signal: AbortSignal,
  onProgress: (msg: string) => void,
): Promise<string> {
  const stream = await chat({ token, message, signal })
  let latest = ''
  for await (const event of stream as AsyncIterable<ChatEvent>) {
    if (event.type === 'error') {
      throw new Error(event.error)
    }
    if (event.type === 'code_patch' && event.code) {
      latest = event.code
      onProgress('개선 중... / Improving...')
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

/**
 * In-memory document content provider used to back the diff view. We register
 * once per command invocation under a unique scheme so concurrent invocations
 * don't collide.
 */
class StaticDocProvider implements vscode.TextDocumentContentProvider {
  private docs = new Map<string, string>()

  set(uri: vscode.Uri, content: string): void {
    this.docs.set(uri.toString(), content)
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.docs.get(uri.toString()) ?? ''
  }
}

export async function aiImprove(context: vscode.ExtensionContext): Promise<void> {
  const token = await ensureToken(context)
  if (!token) return

  const snap = snapshotEditor()
  if (!snap) return

  const userPrompt = await vscode.window.showInputBox({
    title: 'Wireweave AI Improve',
    prompt: '어떻게 개선할까요? / How should I improve this?',
    placeHolder: 'e.g. 모바일 레이아웃으로 변경, 폼에 검증 메시지 추가',
    ignoreFocusOut: true,
  })
  if (!userPrompt) return

  const message = `현재 코드:\n${snap.current}\n\n개선:${userPrompt}`

  let proposed: string
  try {
    proposed = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Wireweave: AI 개선 중...',
        cancellable: true,
      },
      async (progress, cancelToken) => {
        const controller = new AbortController()
        cancelToken.onCancellationRequested(() => controller.abort())
        return streamImprove(token, message, controller.signal, (m) =>
          progress.report({ message: m }),
        )
      },
    )
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
    const errMessage = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`Wireweave: ${errMessage}`)
    return
  }

  // Show the diff. We use a synthetic scheme so the diff editor doesn't try
  // to write back to disk.
  const scheme = `wireweave-improve-${Date.now()}`
  const provider = new StaticDocProvider()
  const registration = vscode.workspace.registerTextDocumentContentProvider(scheme, provider)
  context.subscriptions.push(registration)

  const leftUri = vscode.Uri.parse(`${scheme}:current.wf`)
  const rightUri = vscode.Uri.parse(`${scheme}:proposed.wf`)
  provider.set(leftUri, snap.current)
  provider.set(rightUri, proposed)

  await vscode.commands.executeCommand(
    'vscode.diff',
    leftUri,
    rightUri,
    'Wireweave: AI Improve (current ↔ proposed)',
  )

  const choice = await vscode.window.showQuickPick(
    [
      { label: '$(check) Apply', id: 'apply' as const },
      { label: '$(close) Cancel', id: 'cancel' as const },
    ],
    {
      title: 'Wireweave AI Improve',
      placeHolder: '제안된 변경을 적용할까요? / Apply the proposed change?',
    },
  )

  if (choice?.id !== 'apply') {
    registration.dispose()
    return
  }

  await snap.editor.edit((edit) => {
    edit.replace(snap.range, proposed)
  })
  registration.dispose()
}
