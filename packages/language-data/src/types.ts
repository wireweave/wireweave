/**
 * Type definitions for Wireweave language data
 *
 * Editor-specific types for IDE integrations.
 * This package is independent of @wireweave/core.
 */

/**
 * Attribute value type
 */
export type AttributeValueType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'string[]'
  | 'enum'
  /** Functional shorthand like `at(x, y)` — value is parenthesized arguments, not `name=value`. */
  | 'function'

/**
 * Component category
 */
export type ComponentCategory =
  | 'layout'
  | 'grid'
  | 'container'
  | 'text'
  | 'input'
  | 'display'
  | 'data'
  | 'feedback'
  | 'overlay'
  | 'navigation'
  | 'annotation'

/**
 * Component definition for editors
 */
export interface ComponentDef {
  /** Component name (lowercase, as used in DSL) */
  name: string
  /** AST node type (PascalCase) */
  nodeType: string
  /** Component category */
  category: ComponentCategory
  /** Valid attributes for this component */
  attributes: string[]
  /** Whether this component can have children */
  hasChildren: boolean
  /** Human-readable description */
  description: string
  /** Code example for documentation */
  example: string
  /** Valid child components (for autocomplete) */
  validChildren?: string[]
  /** Valid parent components (for validation hints) */
  validParents?: string[]
}

/**
 * Attribute definition for editors
 */
export interface AttributeDef {
  /** Attribute name */
  name: string
  /** Value type */
  type: AttributeValueType
  /** Enum values (if type is 'enum') */
  values?: string[]
  /** Human-readable description */
  description: string
  /** Code example for documentation */
  example: string
}
