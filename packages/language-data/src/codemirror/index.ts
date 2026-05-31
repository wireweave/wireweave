/**
 * CodeMirror Integration for Wireframe DSL
 *
 * Provides language definition, auto-completion, hover tooltips, and linting.
 *
 * Usage:
 * ```typescript
 * import { StreamLanguage } from '@codemirror/language';
 * import { autocompletion } from '@codemirror/autocomplete';
 * import { hoverTooltip } from '@codemirror/view';
 * import { linter } from '@codemirror/lint';
 * import {
 *   createTokenizer,
 *   createCompletionSource,
 *   createHoverTooltipSource,
 *   createLinter,
 * } from '@wireweave/language-data/codemirror';
 *
 * // Create language
 * const wireframeLanguage = StreamLanguage.define(createTokenizer());
 *
 * // Setup editor extensions
 * const extensions = [
 *   wireframeLanguage,
 *   autocompletion({ override: [createCompletionSource()] }),
 *   hoverTooltip(createHoverTooltipSource()),
 *   linter(createLinter()),
 * ];
 * ```
 */

// Language definition
export { createTokenizer, getLanguageConfig } from './language.js'

// Auto-completion
export { createCompletionSource } from './completion.js'

// Hover tooltips
export { createHoverTooltipSource } from './hover.js'

// Linting
export { validateCode, createLinter, type Diagnostic, type DiagnosticSeverity } from './linting.js'
