/**
 * UX Rules Constants
 *
 * Centralized constants for UX validation rules.
 * Based on WCAG, Material Design, Apple HIG, and UX research.
 */

// =============================================================================
// LIMITS - Numeric thresholds for various rules
// =============================================================================

/** Maximum navigation items (Miller's Law: 7±2) */
export const MAX_NAV_ITEMS = 7

/** Maximum tab count */
export const MAX_TABS = 5

/** Maximum nesting depth for layouts */
export const MAX_NESTING_DEPTH = 6

/** Maximum buttons in a single container (decision fatigue prevention) */
export const MAX_BUTTONS = 5

/** Maximum form fields before recommending multi-step */
export const MAX_FORM_FIELDS = 10

/** Maximum elements on a page (cognitive overload prevention) */
export const MAX_PAGE_ELEMENTS = 50

/** Maximum button text length */
export const MAX_BUTTON_TEXT_LENGTH = 25

/** Maximum title length */
export const MAX_TITLE_LENGTH = 60

/** Maximum tooltip content length */
export const MAX_TOOLTIP_LENGTH = 100

/** Maximum list items before recommending pagination */
export const MAX_LIST_ITEMS = 20

/** Maximum table columns */
export const MAX_TABLE_COLUMNS = 8

// =============================================================================
// SCORING - Complexity normalization calibration
// =============================================================================

/**
 * Complexity calibration point for score normalization.
 *
 * The headline score damps the *soft* penalty (warnings + info) by
 * `REFERENCE_COMPLEXITY / max(REFERENCE_COMPLEXITY, complexity.score)`, where
 * `complexity.score` ∈ [1,10] comes from core `analyze()`. At or below this
 * point the factor is 1 (no relief), so a trivial screen can never earn a
 * softer penalty by being simple; above it, a richer design gets proportional
 * relief for the per-element warnings it is expected to accumulate. Errors are
 * never damped. `3` corresponds to core's "moderate" complexity band.
 */
export const REFERENCE_COMPLEXITY = 3

// =============================================================================
// TOUCH TARGET - Size thresholds based on WCAG and platform guidelines
// =============================================================================

/** Minimum touch target size (WCAG 2.5.5 AAA: 44x44px) */
export const MIN_TOUCH_TARGET = 44

/** Recommended touch target size (Material Design: 48x48px) */
export const RECOMMENDED_TOUCH_TARGET = 48

/** Size presets mapping to pixels */
export const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
}

// =============================================================================
// TIMING - Duration thresholds
// =============================================================================

/** Minimum toast duration (ms) */
export const MIN_TOAST_DURATION = 2000

/** Maximum toast duration (ms) */
export const MAX_TOAST_DURATION = 10000

// =============================================================================
// KEYWORDS - Commonly used word lists for pattern matching
// =============================================================================

/** Generic/non-descriptive link texts that should be avoided */
export const GENERIC_LINK_TEXTS = ['click here', 'here', 'read more', 'more', 'link']

/** Words indicating asynchronous/loading actions */
export const ASYNC_ACTION_WORDS = [
  'submit',
  'save',
  'send',
  'upload',
  'download',
  'export',
  'import',
  'sync',
  'load',
]

/** Words indicating destructive/dangerous actions */
export const DESTRUCTIVE_WORDS = [
  'delete',
  'remove',
  'destroy',
  'clear',
  'reset',
  'revoke',
  'terminate',
]

/** Words indicating form submission */
export const SUBMIT_WORDS = [
  'submit',
  'save',
  'send',
  'create',
  'add',
  'update',
  'confirm',
  'ok',
  'done',
]

/** Words indicating errors */
export const ERROR_WORDS = ['error', 'fail', 'invalid', 'wrong', 'denied']

/** Words indicating success */
export const SUCCESS_WORDS = ['success', 'saved', 'created', 'updated', 'complete']

/** Words indicating warnings */
export const WARNING_WORDS = ['warning', 'caution', 'attention', 'note']

/** Words indicating home/root navigation */
export const HOME_WORDS = ['home', 'dashboard', 'main', 'start']

/** Words indicating close/dismiss actions */
export const CLOSE_WORDS = ['close', 'cancel', 'dismiss', 'x']

/** Placeholder content patterns that should be replaced */
export const PLACEHOLDER_PATTERNS = [
  'lorem ipsum',
  'dolor sit amet',
  'placeholder',
  'sample text',
  'text here',
  'enter text',
  'todo',
  'tbd',
  'xxx',
]

/** Input type suggestions based on keywords */
export const INPUT_TYPE_SUGGESTIONS: { keywords: string[]; type: string }[] = [
  { keywords: ['email', 'e-mail'], type: 'email' },
  { keywords: ['phone', 'tel', 'mobile', 'cell'], type: 'tel' },
  { keywords: ['url', 'website', 'link'], type: 'url' },
  { keywords: ['password', 'pwd'], type: 'password' },
  { keywords: ['search', 'find', 'query'], type: 'search' },
  { keywords: ['date', 'birthday', 'dob'], type: 'date' },
  { keywords: ['number', 'quantity', 'amount', 'count', 'age'], type: 'number' },
]

// =============================================================================
// NODE TYPES - Commonly grouped node types
// =============================================================================

/** Form input node types */
export const FORM_INPUT_TYPES = ['Input', 'Textarea', 'Select', 'Checkbox', 'Radio']

/** Container node types */
export const CONTAINER_TYPES = ['Card', 'Section', 'Modal', 'Drawer', 'Main']

/** Text content node types */
export const TEXT_CONTENT_TYPES = ['Text', 'Title', 'Label']
