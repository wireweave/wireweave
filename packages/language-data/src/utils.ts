/**
 * Utility functions for Wireweave language data
 */

import type { ComponentDef, AttributeDef } from './types.js'
import { ALL_COMPONENTS, COMPONENT_MAP, NODE_TYPE_MAP } from './components.js'
import { ATTRIBUTES, ATTRIBUTE_MAP } from './attributes.js'

/**
 * Get component definition by name
 */
export function getComponent(name: string): ComponentDef | undefined {
  return COMPONENT_MAP.get(name.toLowerCase())
}

/**
 * Get component definition by AST node type
 */
export function getComponentByNodeType(nodeType: string): ComponentDef | undefined {
  return NODE_TYPE_MAP.get(nodeType)
}

/**
 * Get attribute definition by name
 */
export function getAttribute(name: string): AttributeDef | undefined {
  return ATTRIBUTE_MAP.get(name)
}

/**
 * Get valid child components for a parent component
 */
export function getValidChildren(componentName: string): ComponentDef[] {
  const component = getComponent(componentName)
  if (!component || !component.hasChildren) return []

  if (component.validChildren === undefined) {
    // All components except page are valid children
    return ALL_COMPONENTS.filter((c) => c.name !== 'page')
  }

  return component.validChildren
    .map((name) => getComponent(name))
    .filter((c): c is ComponentDef => c !== undefined)
}

/**
 * Check if a component is a valid child of another
 */
export function isValidChild(childName: string, parentName: string): boolean {
  const parent = getComponent(parentName)
  if (!parent || !parent.hasChildren) return false

  if (parent.validChildren === undefined) return true
  return parent.validChildren.includes(childName.toLowerCase())
}

/**
 * Get attribute definitions for a specific component
 */
export function getComponentAttributes(componentName: string): AttributeDef[] {
  const component = getComponent(componentName)
  if (!component) return ATTRIBUTES

  return ATTRIBUTES.filter((attr) => component.attributes.includes(attr.name))
}

/**
 * Get all components in a category
 */
export function getComponentsByCategory(category: string): ComponentDef[] {
  return ALL_COMPONENTS.filter((c) => c.category === category)
}

/**
 * Get attribute type label for display
 */
export function getAttributeTypeLabel(attr: AttributeDef): string {
  if (attr.type === 'boolean') return 'boolean'
  if (attr.type === 'number') return 'number'
  if (attr.type === 'string' || attr.type === 'string[]') return 'string'
  if (attr.type === 'enum' && attr.values) {
    const preview = attr.values.slice(0, 3).join(' | ')
    return attr.values.length > 3 ? `${preview}...` : preview
  }
  if (attr.type === 'function') return `function (${attr.example})`
  return attr.type
}

/**
 * Format attribute values for display
 */
export function formatAttributeValues(attr: AttributeDef): string {
  if (attr.type === 'number') return 'Type: number'
  if (attr.type === 'string') return 'Type: string'
  if (attr.type === 'boolean') return 'Type: boolean (can be omitted)'
  if (attr.type === 'enum' && attr.values) {
    return `Values: ${attr.values.join(' | ')}`
  }
  if (attr.type === 'function') return `Functional shorthand. Example: ${attr.example}`
  return `Type: ${attr.type}`
}

/**
 * Check if a word is a known component
 */
export function isComponent(word: string): boolean {
  return COMPONENT_MAP.has(word.toLowerCase())
}

/**
 * Check if a word is a known attribute
 */
export function isAttribute(word: string): boolean {
  return ATTRIBUTE_MAP.has(word)
}

/**
 * Get all component names
 */
export function getComponentNames(): string[] {
  return ALL_COMPONENTS.map((c) => c.name)
}

/**
 * Get all attribute names
 */
export function getAttributeNames(): string[] {
  return ATTRIBUTES.map((a) => a.name)
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(ALL_COMPONENTS.map((c) => c.category))]
}
