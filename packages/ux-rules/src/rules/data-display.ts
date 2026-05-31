/**
 * Data Display UX Rules
 *
 * Rules for tables, lists, and data presentation components.
 */

import type { AnyNode } from '@wireweave/core'
import type { UXRule, UXRuleContext, UXIssue } from '../types'
import { MAX_LIST_ITEMS, MAX_TABLE_COLUMNS } from '../constants'
import { hasChildren, getChildren, getNodeLocation, isNodeType, getNodeItems } from '../utils'

/**
 * Check if table has header row
 */
export const tableHasHeader: UXRule = {
  id: 'data-table-header',
  category: 'data-display',
  severity: 'warning',
  name: 'Table should have header',
  description: 'Tables should have a header row to identify columns',
  appliesTo: ['Table'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasHeader = 'header' in node && node.header
    const hasColumns = 'columns' in node && Array.isArray(node.columns) && node.columns.length > 0

    if (!hasHeader && !hasColumns) {
      return {
        ruleId: 'data-table-header',
        category: 'data-display',
        severity: 'warning',
        message: 'Table has no header or columns defined',
        description: 'Table headers help users understand what each column represents',
        suggestion: 'Add a header attribute or define columns for the table',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for empty list without empty state
 */
export const listEmptyState: UXRule = {
  id: 'data-list-empty-state',
  category: 'data-display',
  severity: 'info',
  name: 'Consider empty state for list',
  description: 'Lists should indicate when they have no items',
  appliesTo: ['List'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const items = getNodeItems(node)
    const children = hasChildren(node) ? getChildren(node) : []
    const hasEmptyStateAttr = 'emptyState' in node || 'empty' in node

    // If list has items, no need for empty state warning
    if (items.length > 0 || children.length > 0) {
      return null
    }

    if (!hasEmptyStateAttr) {
      return {
        ruleId: 'data-list-empty-state',
        category: 'data-display',
        severity: 'info',
        message: 'Empty list has no empty state defined',
        description: 'Users should see a helpful message when lists are empty',
        suggestion: 'Add an emptyState attribute or component to show when list is empty',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for table without empty state consideration
 */
export const tableEmptyState: UXRule = {
  id: 'data-table-empty-state',
  category: 'data-display',
  severity: 'info',
  name: 'Consider empty state for table',
  description: 'Tables should indicate when they have no data',
  appliesTo: ['Table'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const rows = 'rows' in node && Array.isArray(node.rows) ? node.rows : []
    const data = 'data' in node && Array.isArray(node.data) ? node.data : []
    const hasEmptyState = 'emptyState' in node || 'empty' in node

    // If table has data, no need for empty state warning
    if (rows.length > 0 || data.length > 0) {
      return null
    }

    if (!hasEmptyState) {
      return {
        ruleId: 'data-table-empty-state',
        category: 'data-display',
        severity: 'info',
        message: 'Empty table has no empty state defined',
        description: 'Users should see a helpful message when tables have no data',
        suggestion: 'Add an emptyState attribute to show when table is empty',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for list with too many items
 */
export const listTooManyItems: UXRule = {
  id: 'data-list-pagination',
  category: 'data-display',
  severity: 'info',
  name: 'Long list may need pagination',
  description: 'Lists with many items should consider pagination or virtualization',
  appliesTo: ['List'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const items = getNodeItems(node)
    const children = hasChildren(node) ? getChildren(node) : []
    const hasPagination = 'pagination' in node || 'paginated' in node

    const itemCount = items.length || children.filter((c) => isNodeType(c, 'ListItem')).length

    if (itemCount > MAX_LIST_ITEMS && !hasPagination) {
      return {
        ruleId: 'data-list-pagination',
        category: 'data-display',
        severity: 'info',
        message: `List has ${itemCount} items (consider pagination for better performance)`,
        description: 'Long lists can be slow to render and overwhelming for users',
        suggestion: 'Add pagination, infinite scroll, or virtualization for long lists',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for table with too many columns
 */
export const tableTooManyColumns: UXRule = {
  id: 'data-table-columns',
  category: 'data-display',
  severity: 'warning',
  name: 'Table has too many columns',
  description: 'Tables with many columns are hard to read on smaller screens',
  appliesTo: ['Table'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const columns = 'columns' in node && Array.isArray(node.columns) ? node.columns : []

    if (columns.length > MAX_TABLE_COLUMNS) {
      return {
        ruleId: 'data-table-columns',
        category: 'data-display',
        severity: 'warning',
        message: `Table has ${columns.length} columns (recommended max: ${MAX_TABLE_COLUMNS})`,
        description: 'Tables with many columns are difficult to read and may not fit on mobile',
        suggestion: 'Consider hiding less important columns on mobile or using a different layout',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for card grid without consistent sizing
 */
export const cardGridConsistency: UXRule = {
  id: 'data-card-grid',
  category: 'data-display',
  severity: 'info',
  name: 'Card grid should have consistent items',
  description: 'Cards in a grid layout should have consistent dimensions',
  appliesTo: ['Row'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    const cards = getChildren(node).filter((c) => c.type === 'Card')
    if (cards.length < 3) return null // Not really a grid

    // Check if cards have varying heights defined
    const heights = cards.map((c) => ('height' in c ? c.height : 'h' in c ? c.h : null))
    const definedHeights = heights.filter((h) => h !== null)
    const uniqueHeights = [...new Set(definedHeights)]

    if (uniqueHeights.length > 1) {
      return {
        ruleId: 'data-card-grid',
        category: 'data-display',
        severity: 'info',
        message: 'Card grid has inconsistent card heights',
        description: 'Inconsistent card sizes can create visual imbalance',
        suggestion: 'Consider using consistent heights for cards in a grid layout',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * All data display rules
 */
export const dataDisplayRules: UXRule[] = [
  tableHasHeader,
  listEmptyState,
  tableEmptyState,
  listTooManyItems,
  tableTooManyColumns,
  cardGridConsistency,
]
