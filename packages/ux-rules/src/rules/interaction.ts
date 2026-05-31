/**
 * Interaction UX Rules
 *
 * Rules for detecting interactive elements without defined actions/destinations.
 * These rules help identify UI elements that need action definitions.
 */

import type { AnyNode } from '@wireweave/core'
import type { UXRule, UXRuleContext, UXIssue } from '../types'
import {
  coerceTextLower,
  getNodeLocation,
  getNodeText,
  hasChildren,
  hasChildMatching,
} from '../utils'

/**
 * Check if button has an action defined
 */
export const buttonHasAction: UXRule = {
  id: 'interaction-button-action',
  category: 'interaction',
  severity: 'warning',
  name: 'Button should have action',
  description: 'Buttons should have an onClick, action, or navigation target defined',
  appliesTo: ['Button'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    // Check for common action attributes
    const hasOnClick = 'onClick' in node
    const hasAction = 'action' in node
    const hasHref = 'href' in node
    const hasTo = 'to' in node
    const hasNavigate = 'navigate' in node
    const hasLink = 'link' in node
    // Check for submit button type (buttonType attribute, not node.type)
    const hasSubmit =
      'buttonType' in node && (node as Record<string, unknown>).buttonType === 'submit'
    const hasFormSubmit = 'submit' in node

    // Get button text for better error message
    const buttonText = getNodeText(node)

    if (
      !hasOnClick &&
      !hasAction &&
      !hasHref &&
      !hasTo &&
      !hasNavigate &&
      !hasLink &&
      !hasSubmit &&
      !hasFormSubmit
    ) {
      return {
        ruleId: 'interaction-button-action',
        category: 'interaction',
        severity: 'warning',
        message: buttonText
          ? `Button "${buttonText}" has no action defined`
          : 'Button has no action defined',
        description: 'Interactive buttons need an action to respond to user clicks',
        suggestion:
          'Add onClick, action, href, or navigate attribute to define what happens when clicked',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if link has a destination defined
 */
export const linkHasDestination: UXRule = {
  id: 'interaction-link-destination',
  category: 'interaction',
  severity: 'warning',
  name: 'Link should have destination',
  description: 'Links should have an href or navigation target defined',
  appliesTo: ['Link', 'NavLink', 'Anchor'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasHref = 'href' in node && node.href
    const hasTo = 'to' in node && node.to
    const hasNavigate = 'navigate' in node
    const hasUrl = 'url' in node && node.url

    // Get link text for better error message
    const linkText = getNodeText(node)

    if (!hasHref && !hasTo && !hasNavigate && !hasUrl) {
      return {
        ruleId: 'interaction-link-destination',
        category: 'interaction',
        severity: 'warning',
        message: linkText
          ? `Link "${linkText}" has no destination`
          : 'Link has no destination defined',
        description: 'Links need a destination URL or route to navigate to',
        suggestion: 'Add href, to, or navigate attribute to define the link destination',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if form has submit action defined
 */
export const formHasSubmitAction: UXRule = {
  id: 'interaction-form-submit',
  category: 'interaction',
  severity: 'warning',
  name: 'Form should have submit action',
  description: 'Forms should have an onSubmit action or form action defined',
  appliesTo: ['Form'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasOnSubmit = 'onSubmit' in node
    const hasAction = 'action' in node && node.action

    if (!hasOnSubmit && !hasAction) {
      return {
        ruleId: 'interaction-form-submit',
        category: 'interaction',
        severity: 'warning',
        message: 'Form has no submit action defined',
        description: 'Forms need an action to handle submission',
        suggestion: 'Add onSubmit or action attribute to define form submission behavior',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if tab/menu item has action or content target
 */
export const tabItemHasTarget: UXRule = {
  id: 'interaction-tab-target',
  category: 'interaction',
  severity: 'warning',
  name: 'Tab item should have target',
  description: 'Tab items should link to content or have an action',
  appliesTo: ['Tab', 'TabItem'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasTarget = 'target' in node
    const hasPanel = 'panel' in node
    const hasContent = 'content' in node
    const hasOnClick = 'onClick' in node
    const hasValue = 'value' in node

    // Get tab label for better error message
    const tabLabel = getNodeText(node)

    if (!hasTarget && !hasPanel && !hasContent && !hasOnClick && !hasValue) {
      return {
        ruleId: 'interaction-tab-target',
        category: 'interaction',
        severity: 'warning',
        message: tabLabel
          ? `Tab "${tabLabel}" has no target or action`
          : 'Tab item has no target or action defined',
        description: 'Tab items need to reference content or trigger an action',
        suggestion: 'Add target, panel, value, or onClick attribute',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if menu item has action defined
 */
export const menuItemHasAction: UXRule = {
  id: 'interaction-menu-action',
  category: 'interaction',
  severity: 'warning',
  name: 'Menu item should have action',
  description: 'Menu items should have an onClick, href, or action defined',
  appliesTo: ['MenuItem', 'DropdownItem'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasOnClick = 'onClick' in node
    const hasAction = 'action' in node
    const hasHref = 'href' in node
    const hasTo = 'to' in node
    const hasCommand = 'command' in node

    // Get menu item text for better error message
    const itemText = getNodeText(node)

    // Skip dividers or separators
    if ('divider' in node || 'separator' in node) {
      return null
    }

    if (!hasOnClick && !hasAction && !hasHref && !hasTo && !hasCommand) {
      return {
        ruleId: 'interaction-menu-action',
        category: 'interaction',
        severity: 'warning',
        message: itemText
          ? `Menu item "${itemText}" has no action`
          : 'Menu item has no action defined',
        description: 'Menu items need an action to respond to selection',
        suggestion: 'Add onClick, action, href, or command attribute',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if clickable card has action
 */
export const clickableCardHasAction: UXRule = {
  id: 'interaction-card-action',
  category: 'interaction',
  severity: 'info',
  name: 'Clickable card should have action',
  description: 'Cards marked as clickable should have an action defined',
  appliesTo: ['Card'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    // Only check cards that appear to be clickable
    const isClickable = 'clickable' in node || 'hoverable' in node || 'interactive' in node

    if (!isClickable) return null

    const hasOnClick = 'onClick' in node
    const hasHref = 'href' in node
    const hasTo = 'to' in node
    const hasAction = 'action' in node

    if (!hasOnClick && !hasHref && !hasTo && !hasAction) {
      return {
        ruleId: 'interaction-card-action',
        category: 'interaction',
        severity: 'info',
        message: 'Clickable card has no action defined',
        description: 'Cards marked as clickable/interactive need an action',
        suggestion: 'Add onClick, href, or action attribute to define click behavior',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if icon button has action
 */
export const iconButtonHasAction: UXRule = {
  id: 'interaction-icon-button-action',
  category: 'interaction',
  severity: 'warning',
  name: 'Icon button should have action',
  description: 'Icon buttons should have an action defined',
  appliesTo: ['IconButton'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasOnClick = 'onClick' in node
    const hasAction = 'action' in node
    const hasHref = 'href' in node
    const hasTo = 'to' in node

    // Get icon name for better error message
    const iconName =
      'icon' in node ? String(node.icon || '') : 'name' in node ? String(node.name || '') : ''

    if (!hasOnClick && !hasAction && !hasHref && !hasTo) {
      return {
        ruleId: 'interaction-icon-button-action',
        category: 'interaction',
        severity: 'warning',
        message: iconName
          ? `Icon button "${iconName}" has no action defined`
          : 'Icon button has no action defined',
        description: 'Icon buttons need an action to respond to clicks',
        suggestion: 'Add onClick, action, or href attribute',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * Check if modal has close action
 */
export const modalHasCloseAction: UXRule = {
  id: 'interaction-modal-close',
  category: 'interaction',
  severity: 'info',
  name: 'Modal should have close mechanism',
  description: 'Modals should have a way to close them',
  appliesTo: ['Modal', 'Dialog'],
  check: (node: AnyNode, context: UXRuleContext): UXIssue | null => {
    const hasOnClose = 'onClose' in node
    const hasCloseButton = 'closable' in node || 'closeButton' in node
    const hasDismiss = 'dismissible' in node || 'dismiss' in node

    // Check if modal has children with close buttons
    const hasCloseChild =
      hasChildren(node) &&
      hasChildMatching(node, (child) => {
        if (child.type === 'Button') {
          const fields = child as unknown as Record<string, unknown>
          const text = coerceTextLower(fields.text)
          const label = coerceTextLower(fields.label)
          const action = coerceTextLower(fields.action)
          return (
            text.includes('close') ||
            text.includes('cancel') ||
            label.includes('close') ||
            label.includes('cancel') ||
            action.includes('close')
          )
        }
        return false
      })

    if (!hasOnClose && !hasCloseButton && !hasDismiss && !hasCloseChild) {
      return {
        ruleId: 'interaction-modal-close',
        category: 'interaction',
        severity: 'info',
        message: 'Modal has no close mechanism defined',
        description: 'Users need a way to close modals',
        suggestion: 'Add onClose, closable attribute, or a close/cancel button',
        path: context.path,
        nodeType: node.type,
        location: getNodeLocation(node),
      }
    }
    return null
  },
}

/**
 * All interaction rules
 */
export const interactionRules: UXRule[] = [
  buttonHasAction,
  linkHasDestination,
  formHasSubmitAction,
  tabItemHasTarget,
  menuItemHasAction,
  clickableCardHasAction,
  iconButtonHasAction,
  modalHasCloseAction,
]
