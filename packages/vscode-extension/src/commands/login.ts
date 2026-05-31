/**
 * `wireweave.login` — interactive browser-based login.
 *
 * Thin wrapper over `auth.login`; the heavy lifting (browser open, input box,
 * SecretStorage write) lives in the auth module so other commands can reuse
 * it after a 401.
 */

import type * as vscode from 'vscode'
import { login as authLogin } from '../auth'

export async function login(context: vscode.ExtensionContext): Promise<void> {
  await authLogin(context)
}
