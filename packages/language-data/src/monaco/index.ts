/**
 * Monaco Editor Integration for Wireframe DSL
 *
 * Provides language definition, IntelliSense, and diagnostics for Monaco Editor.
 *
 * Usage:
 * ```typescript
 * import * as monaco from 'monaco-editor';
 * import {
 *   LANGUAGE_ID,
 *   getMonarchTokensProvider,
 *   getLanguageConfiguration,
 *   createHoverProvider,
 *   createCompletionProvider,
 *   createDiagnosticsSetup,
 * } from '@wireweave/language-data/monaco';
 *
 * // Register language
 * monaco.languages.register({ id: LANGUAGE_ID });
 * monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, getMonarchTokensProvider());
 * monaco.languages.setLanguageConfiguration(LANGUAGE_ID, getLanguageConfiguration());
 *
 * // Register providers
 * monaco.languages.registerHoverProvider(LANGUAGE_ID, createHoverProvider(monaco));
 * monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, createCompletionProvider(monaco));
 *
 * // Setup diagnostics
 * const editor = monaco.editor.create(...);
 * const setupDiagnostics = createDiagnosticsSetup(monaco);
 * const cleanup = setupDiagnostics(editor);
 * ```
 */

import type * as Monaco from 'monaco-editor'

// Language definition
export {
  LANGUAGE_ID,
  LANGUAGE_ALIASES,
  LANGUAGE_EXTENSIONS,
  getMonarchTokensProvider,
  getLanguageConfiguration,
} from './language.js'

// IntelliSense providers
export { createHoverProvider, createCompletionProvider } from './providers.js'

// Diagnostics
export {
  MarkerSeverity,
  type MarkerSeverityType,
  type MarkerData,
  validateCode,
  createDiagnosticsSetup,
} from './diagnostics.js'

// Import for registerWireframeLanguage
import {
  LANGUAGE_ID as _LANGUAGE_ID,
  getMonarchTokensProvider as _getMonarchTokensProvider,
  getLanguageConfiguration as _getLanguageConfiguration,
} from './language.js'
import {
  createHoverProvider as _createHoverProvider,
  createCompletionProvider as _createCompletionProvider,
} from './providers.js'

/**
 * Register wireframe language with Monaco
 * Convenience function that registers everything at once
 */
export function registerWireframeLanguage(monaco: typeof Monaco): void {
  // Register language
  monaco.languages.register({
    id: _LANGUAGE_ID,
    aliases: ['Wireframe', 'wireweave', 'wf'],
    extensions: ['.wf', '.wireframe'],
  })

  // Set tokenizer and configuration
  monaco.languages.setMonarchTokensProvider(_LANGUAGE_ID, _getMonarchTokensProvider())
  monaco.languages.setLanguageConfiguration(_LANGUAGE_ID, _getLanguageConfiguration())

  // Register providers
  monaco.languages.registerHoverProvider(_LANGUAGE_ID, _createHoverProvider(monaco))
  monaco.languages.registerCompletionItemProvider(_LANGUAGE_ID, _createCompletionProvider(monaco))
}
