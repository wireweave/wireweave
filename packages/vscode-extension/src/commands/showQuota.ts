/**
 * `wireweave.showQuota` — surface the current AI quota state.
 *
 * If the user is not logged in we route them through the same login prompt
 * `aiGenerate`/`aiImprove` use, so the experience is consistent regardless
 * of which command first hits the auth wall.
 */

import * as vscode from 'vscode'
import { getToken, login } from '../auth'
import { getUsage, UnauthorizedError } from '../api'

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

function formatResetAt(resetAt: string): string {
  // Try ISO timestamp first, fall back to raw string so unexpected formats
  // still surface usefully instead of "Invalid Date".
  const ms = Date.parse(resetAt)
  if (Number.isNaN(ms)) return resetAt
  return new Date(ms).toLocaleString()
}

export async function showQuota(context: vscode.ExtensionContext): Promise<void> {
  const token = await ensureToken(context)
  if (!token) return

  try {
    const usage = await getUsage(token)
    vscode.window.showInformationMessage(
      `AI 사용량: ${usage.used}/${usage.limit} (남은 ${usage.remaining}, 리셋 ${formatResetAt(usage.resetAt)})`,
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
    const message = err instanceof Error ? err.message : String(err)
    vscode.window.showErrorMessage(`Wireweave: ${message}`)
  }
}
