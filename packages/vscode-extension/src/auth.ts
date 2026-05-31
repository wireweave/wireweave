/**
 * Token persistence for the Wireweave VSCode extension.
 *
 * Unlike `@wireweave/skill-cursor` which stores tokens at
 * `~/.wireweave/config.json` (because Cursor skills run as plain Node
 * processes), the VSCode extension uses `context.secrets` (SecretStorage).
 * This is the platform-recommended store: per-user encrypted, isolated from
 * other extensions, and synced across devices when settings sync is enabled.
 *
 * Login flow:
 *   1. Open `https://dashboard.wireweave.org/auth/cli?source=vscode` in the
 *      user's default browser via `vscode.env.openExternal`.
 *   2. The dashboard generates a CLI token and shows it for copy.
 *   3. The extension prompts for the token via `showInputBox` and persists
 *      it to SecretStorage under the key `wireweave.token`.
 */

import * as vscode from 'vscode'

export const TOKEN_KEY = 'wireweave.token'
export const LOGIN_URL = 'https://dashboard.wireweave.org/auth/cli?source=vscode'

/**
 * Interactive login: opens the dashboard, prompts the user for the resulting
 * token, and stores it in SecretStorage.
 *
 * Returns `true` if a token was stored, `false` if the user cancelled.
 */
export async function login(context: vscode.ExtensionContext): Promise<boolean> {
  await vscode.env.openExternal(vscode.Uri.parse(LOGIN_URL))

  const token = await vscode.window.showInputBox({
    title: 'Wireweave Login',
    prompt: '브라우저에서 발급된 토큰을 붙여넣으세요 / Paste the token issued in your browser',
    placeHolder: 'wwv_...',
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) =>
      value.trim().length === 0 ? '토큰을 입력하세요 / Token required' : undefined,
  })

  if (!token) {
    return false
  }

  await context.secrets.store(TOKEN_KEY, token.trim())
  vscode.window.showInformationMessage('Wireweave 로그인 성공 / Logged in to Wireweave')
  return true
}

/**
 * Returns the stored token, or `undefined` if the user is not logged in.
 */
export async function getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(TOKEN_KEY)
}

/**
 * Clears the stored token. Idempotent — safe to call when no token exists.
 */
export async function logout(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(TOKEN_KEY)
}
