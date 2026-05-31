import { describe, it, expect } from 'vitest'
import {
  ALL_COMPONENTS,
  COMPONENT_MAP,
  NODE_TYPE_MAP,
  VALID_COMPONENT_NAMES,
  ATTRIBUTES,
  ATTRIBUTE_MAP,
  COMMON_ATTRIBUTES,
  VALID_ATTRIBUTE_NAMES,
  CATEGORY_LABELS,
  VALUE_KEYWORDS,
  getComponent,
  getComponentByNodeType,
  getAttribute,
  getValidChildren,
  isValidChild,
  getComponentAttributes,
  getComponentsByCategory,
  getAttributeTypeLabel,
  formatAttributeValues,
  isComponent,
  isAttribute,
  getComponentNames,
  getAttributeNames,
  getCategories,
} from '../src/index.js'

describe('Components', () => {
  it('should have components defined', () => {
    expect(ALL_COMPONENTS.length).toBeGreaterThan(0)
  })

  it('should have matching COMPONENT_MAP size', () => {
    expect(COMPONENT_MAP.size).toBe(ALL_COMPONENTS.length)
  })

  it('should have matching NODE_TYPE_MAP size', () => {
    expect(NODE_TYPE_MAP.size).toBe(ALL_COMPONENTS.length)
  })

  it('should have matching VALID_COMPONENT_NAMES size', () => {
    expect(VALID_COMPONENT_NAMES.size).toBe(ALL_COMPONENTS.length)
  })

  it('should have required fields for every component', () => {
    for (const comp of ALL_COMPONENTS) {
      expect(comp.name).toBeTruthy()
      expect(comp.nodeType).toBeTruthy()
      expect(comp.category).toBeTruthy()
      expect(comp.description).toBeTruthy()
      expect(comp.example).toBeTruthy()
      expect(typeof comp.hasChildren).toBe('boolean')
      expect(Array.isArray(comp.attributes)).toBe(true)
    }
  })

  it('should have unique component names', () => {
    const names = ALL_COMPONENTS.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('should have unique node types', () => {
    const types = ALL_COMPONENTS.map((c) => c.nodeType)
    expect(new Set(types).size).toBe(types.length)
  })
})

describe('Attributes', () => {
  it('should have attributes defined', () => {
    expect(ATTRIBUTES.length).toBeGreaterThan(0)
  })

  it('should have matching ATTRIBUTE_MAP size', () => {
    expect(ATTRIBUTE_MAP.size).toBe(ATTRIBUTES.length)
  })

  it('should have matching VALID_ATTRIBUTE_NAMES size', () => {
    expect(VALID_ATTRIBUTE_NAMES.size).toBe(ATTRIBUTES.length)
  })

  it('should have unique attribute names', () => {
    const names = ATTRIBUTES.map((a) => a.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('should have enum values for enum type attributes', () => {
    const enums = ATTRIBUTES.filter((a) => a.type === 'enum')
    for (const attr of enums) {
      expect(attr.values).toBeDefined()
      expect(attr.values!.length).toBeGreaterThan(0)
    }
  })

  it('should have COMMON_ATTRIBUTES as valid attribute names', () => {
    for (const name of COMMON_ATTRIBUTES) {
      expect(ATTRIBUTE_MAP.has(name)).toBe(true)
    }
  })

  it('exposes the at(x, y) functional attribute', () => {
    const at = ATTRIBUTE_MAP.get('at')
    expect(at).toBeDefined()
    expect(at!.type).toBe('function')
    expect(at!.example).toMatch(/^at\(/)
  })

  it('page component lists at as a valid attribute', () => {
    const page = getComponent('page')
    expect(page).toBeDefined()
    expect(page!.attributes).toContain('at')
  })
})

describe('Keywords', () => {
  it('should have category labels for all categories', () => {
    const categories = getCategories()
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]).toBeTruthy()
    }
  })

  it('should have value keywords defined', () => {
    expect(VALUE_KEYWORDS.length).toBeGreaterThan(0)
  })
})

describe('Utils', () => {
  it('getComponent should return component by name', () => {
    expect(getComponent('page')).toBeDefined()
    expect(getComponent('page')!.nodeType).toBe('Page')
  })

  it('getComponent should be case-insensitive', () => {
    expect(getComponent('Page')).toBeDefined()
    expect(getComponent('PAGE')).toBeDefined()
  })

  it('getComponent should return undefined for unknown', () => {
    expect(getComponent('nonexistent')).toBeUndefined()
  })

  it('getComponentByNodeType should return component', () => {
    expect(getComponentByNodeType('Page')).toBeDefined()
    expect(getComponentByNodeType('Page')!.name).toBe('page')
  })

  it('getAttribute should return attribute by name', () => {
    expect(getAttribute('border')).toBeDefined()
    expect(getAttribute('border')!.type).toBe('boolean')
  })

  it('getValidChildren should return children for page', () => {
    const children = getValidChildren('page')
    expect(children.length).toBeGreaterThan(0)
  })

  it('getValidChildren should return empty for leaf components', () => {
    const children = getValidChildren('button')
    expect(children).toEqual([])
  })

  it('isValidChild should validate parent-child relationships', () => {
    expect(isValidChild('header', 'page')).toBe(true)
    expect(isValidChild('page', 'button')).toBe(false)
  })

  it('getComponentAttributes should return attributes for a component', () => {
    const attrs = getComponentAttributes('button')
    expect(attrs.length).toBeGreaterThan(0)
    expect(attrs.some((a) => a.name === 'primary')).toBe(true)
  })

  it('getComponentsByCategory should return components', () => {
    const layouts = getComponentsByCategory('layout')
    expect(layouts.length).toBeGreaterThan(0)
    expect(layouts.every((c) => c.category === 'layout')).toBe(true)
  })

  it('getAttributeTypeLabel should format types', () => {
    expect(
      getAttributeTypeLabel({ name: 'x', type: 'boolean', description: '', example: '' }),
    ).toBe('boolean')
    expect(getAttributeTypeLabel({ name: 'x', type: 'number', description: '', example: '' })).toBe(
      'number',
    )
    expect(getAttributeTypeLabel({ name: 'x', type: 'string', description: '', example: '' })).toBe(
      'string',
    )
    expect(
      getAttributeTypeLabel({
        name: 'x',
        type: 'enum',
        values: ['a', 'b'],
        description: '',
        example: '',
      }),
    ).toBe('a | b')
  })

  it('formatAttributeValues should format values', () => {
    expect(
      formatAttributeValues({ name: 'x', type: 'boolean', description: '', example: '' }),
    ).toContain('boolean')
    expect(
      formatAttributeValues({
        name: 'x',
        type: 'enum',
        values: ['a', 'b'],
        description: '',
        example: '',
      }),
    ).toContain('a | b')
  })

  it('isComponent should identify components', () => {
    expect(isComponent('page')).toBe(true)
    expect(isComponent('nonexistent')).toBe(false)
  })

  it('isAttribute should identify attributes', () => {
    expect(isAttribute('border')).toBe(true)
    expect(isAttribute('nonexistent')).toBe(false)
  })

  it('getComponentNames should return all names', () => {
    const names = getComponentNames()
    expect(names.length).toBe(ALL_COMPONENTS.length)
  })

  it('getAttributeNames should return all names', () => {
    const names = getAttributeNames()
    expect(names.length).toBe(ATTRIBUTES.length)
  })

  it('getCategories should return unique categories', () => {
    const categories = getCategories()
    expect(new Set(categories).size).toBe(categories.length)
    expect(categories.length).toBeGreaterThan(0)
  })
})
