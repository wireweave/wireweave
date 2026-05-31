/**
 * Usability UX Rules
 *
 * General usability rules for better user experience.
 */

import type { AnyNode, PageNode } from '@wireweave/core'
import { resolveViewport } from '@wireweave/core'
import type { UXRule, UXRuleContext, UXIssue } from '../types'
import {
  MAX_NESTING_DEPTH,
  MAX_BUTTONS,
  MAX_FORM_FIELDS,
  MAX_PAGE_ELEMENTS,
  ASYNC_ACTION_WORDS,
  DESTRUCTIVE_WORDS,
  CLOSE_WORDS,
  FORM_INPUT_TYPES,
} from '../constants'
import {
  getNodeText,
  hasChildren,
  getChildren,
  getNodeLocation,
  hasChildMatching,
  countInChildren,
} from '../utils'

/**
 * Check for empty containers
 */
export const noEmptyContainers: UXRule = {
  id: 'usability-empty-container',
  category: 'usability',
  severity: 'warning',
  name: 'Avoid empty containers',
  description: 'Containers without content may confuse users or indicate missing content',
  appliesTo: ['Card', 'Section', 'Modal', 'Drawer'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!('children' in node) || !Array.isArray(node.children) || node.children.length === 0) {
      return {
        ruleId: 'usability-empty-container',
        category: 'usability',
        severity: 'warning',
        message: `${node.type} has no content`,
        description: 'Empty containers may represent incomplete design or confuse users',
        suggestion:
          'Add content to this container or use a placeholder to indicate intended content',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for clear CTA (Call to Action)
 */
export const clearCTA: UXRule = {
  id: 'usability-clear-cta',
  category: 'usability',
  severity: 'info',
  name: 'Clear call to action',
  description: 'Pages should have a clear primary action for users',
  appliesTo: ['Page'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    // Look for a primary button anywhere in the page
    const hasPrimaryButton = hasChildMatching(
      node,
      (child) => child.type === 'Button' && 'primary' in child && !!child.primary,
    )

    if (!hasPrimaryButton) {
      return {
        ruleId: 'usability-clear-cta',
        category: 'usability',
        severity: 'info',
        message: 'Page has no primary button (CTA)',
        description: 'A clear call-to-action helps guide users to the main action',
        suggestion: 'Add a primary button for the main action on this page',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for loading states
 */
export const loadingStates: UXRule = {
  id: 'usability-loading-states',
  category: 'usability',
  severity: 'info',
  name: 'Consider loading states',
  description: 'Actions that may take time should have loading indicators',
  appliesTo: ['Button'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const content = getNodeText(node).toLowerCase()
    const hasLoading = 'loading' in node
    const isPrimary = 'primary' in node && node.primary

    if (isPrimary && ASYNC_ACTION_WORDS.some((a) => content.includes(a)) && !hasLoading) {
      return {
        ruleId: 'usability-loading-states',
        category: 'usability',
        severity: 'info',
        message: `Button "${content}" may need a loading state`,
        description: 'Async actions should show progress to prevent double-clicks and inform users',
        suggestion: 'Consider adding a loading variant for this button when action is in progress',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for destructive action confirmation
 */
export const destructiveActionConfirmation: UXRule = {
  id: 'usability-destructive-confirm',
  category: 'usability',
  severity: 'warning',
  name: 'Destructive actions need confirmation',
  description: 'Destructive actions should have clear warning styling',
  appliesTo: ['Button'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const content = getNodeText(node).toLowerCase()
    const isDanger = 'danger' in node && node.danger

    if (DESTRUCTIVE_WORDS.some((w) => content.includes(w)) && !isDanger) {
      return {
        ruleId: 'usability-destructive-confirm',
        category: 'usability',
        severity: 'warning',
        message: `Destructive action "${content}" should use danger styling`,
        description: 'Users should be visually warned about destructive actions',
        suggestion: 'Add the danger attribute to this button',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check modal has close mechanism
 */
export const modalCloseButton: UXRule = {
  id: 'usability-modal-close',
  category: 'usability',
  severity: 'warning',
  name: 'Modal should have close mechanism',
  description: 'Users should be able to close modals easily',
  appliesTo: ['Modal'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    // Look for a close button or cancel button
    const hasCloseButton = hasChildMatching(node, (child) => {
      if (child.type === 'Button') {
        const content = getNodeText(child).toLowerCase()
        const icon = 'icon' in child ? String(child.icon || '').toLowerCase() : ''
        return CLOSE_WORDS.some((w) => content.includes(w) || icon.includes(w))
      }
      if (child.type === 'Icon') {
        const name = 'name' in child ? String(child.name || '').toLowerCase() : ''
        return name === 'x' || name === 'close'
      }
      return false
    })

    if (!hasCloseButton) {
      return {
        ruleId: 'usability-modal-close',
        category: 'usability',
        severity: 'warning',
        message: 'Modal has no visible close button',
        description: 'Users should have a clear way to dismiss the modal',
        suggestion: 'Add a close button (icon "x") or a "Cancel" button',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for excessive nesting depth
 */
export const maxNestingDepth: UXRule = {
  id: 'usability-nesting-depth',
  category: 'usability',
  severity: 'warning',
  name: 'Avoid excessive nesting',
  description: 'Deeply nested layouts can be confusing and hard to maintain',
  appliesTo: ['Row', 'Col', 'Card', 'Section'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (context.depth > MAX_NESTING_DEPTH) {
      return {
        ruleId: 'usability-nesting-depth',
        category: 'usability',
        severity: 'warning',
        message: `Component is nested ${context.depth} levels deep (max recommended: ${MAX_NESTING_DEPTH})`,
        description: 'Excessive nesting makes layouts harder to understand and maintain',
        suggestion: 'Consider flattening the layout or breaking into separate sections',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for too many buttons in a container (decision fatigue)
 */
export const tooManyButtons: UXRule = {
  id: 'usability-too-many-buttons',
  category: 'usability',
  severity: 'warning',
  name: 'Too many buttons in container',
  description: 'Too many buttons can cause decision fatigue for users',
  appliesTo: ['Card', 'Section', 'Row', 'Modal'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    // Count direct button children only (not recursive)
    const buttonCount = getChildren(node).filter((c) => c.type === 'Button').length

    if (buttonCount > MAX_BUTTONS) {
      return {
        ruleId: 'usability-too-many-buttons',
        category: 'usability',
        severity: 'warning',
        message: `Container has ${buttonCount} buttons (recommended max: ${MAX_BUTTONS})`,
        description: 'Too many choices can overwhelm users and slow decision-making',
        suggestion:
          'Consider grouping actions in a dropdown or prioritizing the most important actions',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for forms with too many fields
 */
export const tooManyFormFields: UXRule = {
  id: 'usability-too-many-form-fields',
  category: 'usability',
  severity: 'info',
  name: 'Too many form fields',
  description: 'Forms with many fields have higher abandonment rates',
  appliesTo: ['Card', 'Section', 'Main', 'Modal'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    // Count all form fields recursively
    const formFieldCount = countInChildren(node, (child) => FORM_INPUT_TYPES.includes(child.type))

    if (formFieldCount > MAX_FORM_FIELDS) {
      return {
        ruleId: 'usability-too-many-form-fields',
        category: 'usability',
        severity: 'info',
        message: `Form area has ${formFieldCount} fields (recommended max: ${MAX_FORM_FIELDS})`,
        description: 'Long forms increase cognitive load and abandonment rates',
        suggestion:
          'Consider breaking into multiple steps, using progressive disclosure, or removing optional fields',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for page with too many elements (cognitive overload)
 */
export const tooManyPageElements: UXRule = {
  id: 'usability-page-complexity',
  category: 'usability',
  severity: 'info',
  name: 'Page may be too complex',
  description: 'Pages with too many elements can overwhelm users',
  appliesTo: ['Page'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    if (!hasChildren(node)) {
      return null
    }

    // Count all elements recursively
    const elementCount = countInChildren(node, () => true)

    if (elementCount > MAX_PAGE_ELEMENTS) {
      return {
        ruleId: 'usability-page-complexity',
        category: 'usability',
        severity: 'info',
        message: `Page has ${elementCount} elements (consider if this complexity is necessary)`,
        description: 'Complex pages can be overwhelming and slow to render',
        suggestion: 'Consider splitting into multiple pages, using tabs, or simplifying the layout',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check for drawer without proper width
 */
export const drawerWidth: UXRule = {
  id: 'usability-drawer-width',
  category: 'usability',
  severity: 'info',
  name: 'Drawer should have appropriate width',
  description: 'Drawers should have a defined width for consistent UX',
  appliesTo: ['Drawer'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasWidth = 'width' in node || 'w' in node

    if (!hasWidth) {
      return {
        ruleId: 'usability-drawer-width',
        category: 'usability',
        severity: 'info',
        message: 'Drawer has no width specified',
        description: 'Drawers without explicit width may render inconsistently across devices',
        suggestion: 'Add a width attribute (e.g., width="320" or w="80")',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

function pageDimensions(page: PageNode): { width: number; height: number } {
  const explicitW = typeof page.w === 'number' ? page.w : undefined
  const explicitH = typeof page.h === 'number' ? page.h : undefined
  if (explicitW !== undefined && explicitH !== undefined) {
    return { width: explicitW, height: explicitH }
  }
  const vp = resolveViewport(page.viewport, page.device)
  return { width: vp.width, height: vp.height }
}

function pageBox(page: PageNode): { x: number; y: number; w: number; h: number } {
  const { width, height } = pageDimensions(page)
  return {
    x: typeof page.x === 'number' ? page.x : 0,
    y: typeof page.y === 'number' ? page.y : 0,
    w: width,
    h: height,
  }
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Detect overlapping pages on a multi-page canvas.
 *
 * Only fires when both pages have explicit `at(x, y)` coordinates — pages
 * without coordinates auto-flow horizontally and never overlap by construction.
 * Each overlap is reported once on the lower-indexed page.
 */
export const noPageOverlap: UXRule = {
  id: 'usability-page-overlap',
  category: 'usability',
  severity: 'warning',
  name: 'Pages should not overlap on the canvas',
  description:
    'Pages placed at explicit coordinates may visually overlap when their bounding boxes intersect',
  appliesTo: ['Page'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue[] | null => {
    if (node.type !== 'Page') return null
    const page = node
    if (typeof page.x !== 'number' || typeof page.y !== 'number') return null

    const issues: UXIssue[] = []
    const myBox = pageBox(page)

    for (let i = context.index + 1; i < context.siblings.length; i++) {
      const other = context.siblings[i]
      if (!other || other.type !== 'Page') continue
      const otherPage = other
      if (typeof otherPage.x !== 'number' || typeof otherPage.y !== 'number') continue

      if (boxesOverlap(myBox, pageBox(otherPage))) {
        const myTitle = page.title ?? `pages[${context.index}]`
        const otherTitle = otherPage.title ?? `pages[${i}]`
        issues.push({
          ruleId: 'usability-page-overlap',
          category: 'usability',
          severity: 'warning',
          message: `Page "${myTitle}" overlaps page "${otherTitle}" on the canvas`,
          description:
            'Two pages with explicit at(x, y) coordinates have intersecting bounding boxes',
          suggestion:
            'Move one page so the bounding boxes do not intersect, or remove at() to let the page auto-flow',
          path: context.path,
          nodeType: node.type,
          location: getNodeLocation(node),
        })
      }
    }

    return issues.length > 0 ? issues : null
  },
}

/**
 * All usability rules
 */
export const usabilityRules: UXRule[] = [
  noEmptyContainers,
  clearCTA,
  loadingStates,
  destructiveActionConfirmation,
  modalCloseButton,
  maxNestingDepth,
  tooManyButtons,
  tooManyFormFields,
  tooManyPageElements,
  drawerWidth,
  noPageOverlap,
]
