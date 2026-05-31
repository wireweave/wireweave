/**
 * UX Rules Type Definitions
 *
 * Types for UX validation rules engine.
 */

import type { AnyNode } from '@wireweave/core'

/**
 * Severity level of UX issues
 */
export type UXIssueSeverity = 'error' | 'warning' | 'info'

/**
 * Category of UX rule
 */
export type UXRuleCategory =
  | 'accessibility' // 접근성
  | 'usability' // 사용성
  | 'consistency' // 일관성
  | 'touch-target' // 터치 타겟
  | 'navigation' // 네비게이션
  | 'form' // 폼
  | 'feedback' // 피드백
  | 'content' // 콘텐츠
  | 'data-display' // 데이터 표시
  | 'interaction' // 상호작용

/**
 * UX validation issue
 */
export interface UXIssue {
  /** Unique rule ID */
  ruleId: string
  /** Rule category */
  category: UXRuleCategory
  /** Issue severity */
  severity: UXIssueSeverity
  /** Human-readable message */
  message: string
  /** Detailed description of the issue */
  description: string
  /** How to fix the issue */
  suggestion: string
  /** Path to the problematic node */
  path: string
  /** Node type where issue occurred */
  nodeType: string
  /** Source location (if available) */
  location?: {
    line: number
    column: number
  }
}

/**
 * UX validation result
 */
export interface UXValidationResult {
  /** Whether all checks passed (no errors) */
  valid: boolean
  /**
   * Quality score (0-100). Errors are an absolute penalty (-10 each); the soft
   * penalty (warnings + info) is damped by the document's achieved complexity,
   * so a dense, intent-fitting design is not punished merely for having more
   * elements to fault. See `rawScore` for the undamped value.
   */
  score: number
  /**
   * Undamped total-penalty score: `100 - (errors*10 + warnings*3 + info*1)`,
   * clamped to [0,100]. Kept for transparency and migration; `score >= rawScore`
   * always holds.
   */
  rawScore: number
  /** Achieved complexity of the document, from core `analyze()`. */
  complexity: {
    /** Overall complexity score (1-10, higher = more complex). */
    score: number
    /** Complexity band: `'simple' | 'moderate' | 'complex' | 'very-complex'`. */
    level: string
  }
  /** Issues found */
  issues: UXIssue[]
  /** Summary by category */
  summary: {
    category: UXRuleCategory
    passed: number
    failed: number
    warnings: number
  }[]
  /** Summary by severity */
  severityCounts: {
    errors: number
    warnings: number
    info: number
  }
}

/**
 * UX rule definition
 */
export interface UXRule {
  /** Unique rule ID */
  id: string
  /** Rule category */
  category: UXRuleCategory
  /** Default severity */
  severity: UXIssueSeverity
  /** Rule name */
  name: string
  /** Rule description */
  description: string
  /** Component types this rule applies to (empty = all) */
  appliesTo: string[]
  /** Check function */
  check: (node: AnyNode, context: UXRuleContext) => UXIssue | UXIssue[] | null
}

/**
 * Context provided to rule check functions
 */
export interface UXRuleContext {
  /** Path to current node */
  path: string
  /** Parent node (if any) */
  parent: AnyNode | null
  /** Root document */
  root: AnyNode
  /** All siblings of current node */
  siblings: AnyNode[]
  /** Index in parent's children */
  index: number
  /** Depth in tree */
  depth: number
}

/**
 * UX validation options
 */
export interface UXValidationOptions {
  /** Categories to check (empty = all) */
  categories?: UXRuleCategory[]
  /** Minimum severity to report */
  minSeverity?: UXIssueSeverity
  /** Maximum issues to collect */
  maxIssues?: number
  /** Custom rules to add */
  customRules?: UXRule[]
  /** Rules to disable by ID */
  disabledRules?: string[]
}
