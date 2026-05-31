/**
 * UX Rules Utilities
 *
 * Helper functions for common rule patterns.
 */

import type { AnyNode } from '@wireweave/core'
import { SIZE_MAP } from './constants'

/**
 * Coerce an unknown property value to a string, but only when it is a
 * primitive (string/number). Avoids `[object Object]` stringification.
 */
export function coerceText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * Coerce an unknown property value to a lowercase string (primitive only).
 */
export function coerceTextLower(value: unknown): string {
  return coerceText(value).toLowerCase()
}

/**
 * Safely get text content from a node.
 * Checks 'content', 'text', and 'label' properties.
 */
export function getNodeText(node: AnyNode): string {
  const record = node as unknown as Record<string, unknown>
  return coerceText(record.content) || coerceText(record.text) || coerceText(record.label)
}

/**
 * Get text content in lowercase for comparison.
 */
export function getNodeTextLower(node: AnyNode): string {
  return getNodeText(node).toLowerCase()
}

/**
 * Check if node has children array.
 */
export function hasChildren(node: AnyNode): node is AnyNode & { children: AnyNode[] } {
  return 'children' in node && Array.isArray(node.children)
}

/**
 * Get children array from node (returns empty array if none).
 */
export function getChildren(node: AnyNode): AnyNode[] {
  if (hasChildren(node)) {
    return node.children
  }
  return []
}

/**
 * Find first child matching predicate (recursive).
 */
export function findInChildren(
  node: AnyNode,
  predicate: (child: AnyNode) => boolean,
): AnyNode | null {
  const children = getChildren(node)

  for (const child of children) {
    if (predicate(child)) {
      return child
    }
    const found = findInChildren(child, predicate)
    if (found) {
      return found
    }
  }

  return null
}

/**
 * Check if any child matches predicate (recursive).
 */
export function hasChildMatching(node: AnyNode, predicate: (child: AnyNode) => boolean): boolean {
  return findInChildren(node, predicate) !== null
}

/**
 * Count children matching predicate (recursive).
 */
export function countInChildren(node: AnyNode, predicate: (child: AnyNode) => boolean): number {
  const children = getChildren(node)
  let count = 0

  for (const child of children) {
    if (predicate(child)) {
      count++
    }
    count += countInChildren(child, predicate)
  }

  return count
}

/**
 * Get all children matching predicate (recursive).
 */
export function filterChildren(node: AnyNode, predicate: (child: AnyNode) => boolean): AnyNode[] {
  const children = getChildren(node)
  const result: AnyNode[] = []

  for (const child of children) {
    if (predicate(child)) {
      result.push(child)
    }
    result.push(...filterChildren(child, predicate))
  }

  return result
}

/**
 * Get numeric size from size attribute.
 */
export function getSizeValue(node: AnyNode): number | null {
  if (!('size' in node)) return null

  const size = node.size
  if (typeof size === 'number') return size
  if (typeof size === 'string' && size in SIZE_MAP) return SIZE_MAP[size]

  return null
}

/**
 * Check if text contains any of the given words.
 */
export function containsAnyWord(text: string, words: string[]): boolean {
  const lowerText = text.toLowerCase()
  return words.some((word) => lowerText.includes(word))
}

/**
 * Check if text exactly matches any of the given words.
 */
export function matchesAnyWord(text: string, words: string[]): boolean {
  const lowerText = text.toLowerCase().trim()
  return words.includes(lowerText)
}

/**
 * Get location info from node for issue reporting.
 */
export function getNodeLocation(node: AnyNode): { line: number; column: number } | undefined {
  if ('loc' in node && node.loc && 'start' in node.loc) {
    return {
      line: node.loc.start.line,
      column: node.loc.start.column,
    }
  }
  return undefined
}

/**
 * Check if node is a specific type.
 */
export function isNodeType(node: AnyNode, type: string | string[]): boolean {
  if (Array.isArray(type)) {
    return type.includes(node.type)
  }
  return node.type === type
}

/**
 * Get button style from node.
 */
export function getButtonStyle(node: AnyNode): string {
  if ('primary' in node && node.primary) return 'primary'
  if ('secondary' in node && node.secondary) return 'secondary'
  if ('outline' in node && node.outline) return 'outline'
  if ('ghost' in node && node.ghost) return 'ghost'
  if ('danger' in node && node.danger) return 'danger'
  return 'default'
}

/**
 * Type guard to check if a value is a valid AnyNode.
 */
export function isAnyNode(value: unknown): value is AnyNode {
  return (
    value !== null && typeof value === 'object' && 'type' in value && typeof value.type === 'string'
  )
}

/**
 * Safely convert an array of unknown values to AnyNode array.
 * Filters out invalid nodes.
 */
export function toAnyNodeArray(values: unknown[]): AnyNode[] {
  return values.filter(isAnyNode)
}

/**
 * Get items array from node (for components like Nav, List, Dropdown, etc.)
 */
export function getNodeItems(node: AnyNode): unknown[] {
  return 'items' in node && Array.isArray(node.items) ? node.items : []
}
