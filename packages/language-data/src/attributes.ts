/**
 * Attribute definitions for Wireweave DSL
 *
 * Complete attribute definitions for editor integrations.
 * This is the authoritative source for editor-related attribute data.
 */

import type { AttributeDef } from './types.js'

/**
 * Common attributes available to most components
 */
export const COMMON_ATTRIBUTES: readonly string[] = [
  // Spacing
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'gap',
  // Size
  'w',
  'h',
  'minW',
  'maxW',
  'minH',
  'maxH',
  // Flex
  'flex',
  'direction',
  'justify',
  'align',
  'wrap',
  // Grid
  'span',
  // Position
  'x',
  'y',
]

/**
 * All attributes in Wireweave DSL
 */
export const ATTRIBUTES: AttributeDef[] = [
  // ============================================
  // Spacing Attributes
  // ============================================
  { name: 'p', type: 'number', description: 'Padding (all sides)', example: 'p=4' },
  { name: 'px', type: 'number', description: 'Horizontal padding', example: 'px=4' },
  { name: 'py', type: 'number', description: 'Vertical padding', example: 'py=4' },
  { name: 'pt', type: 'number', description: 'Top padding', example: 'pt=4' },
  { name: 'pr', type: 'number', description: 'Right padding', example: 'pr=4' },
  { name: 'pb', type: 'number', description: 'Bottom padding', example: 'pb=4' },
  { name: 'pl', type: 'number', description: 'Left padding', example: 'pl=4' },
  { name: 'm', type: 'number', description: 'Margin (all sides)', example: 'm=4' },
  {
    name: 'mx',
    type: 'string',
    description: 'Horizontal margin (number or "auto")',
    example: 'mx=auto',
  },
  { name: 'my', type: 'number', description: 'Vertical margin', example: 'my=4' },
  { name: 'mt', type: 'number', description: 'Top margin', example: 'mt=4' },
  { name: 'mr', type: 'number', description: 'Right margin', example: 'mr=4' },
  { name: 'mb', type: 'number', description: 'Bottom margin', example: 'mb=4' },
  { name: 'ml', type: 'number', description: 'Left margin', example: 'ml=4' },
  { name: 'gap', type: 'number', description: 'Gap between children', example: 'gap=4' },

  // ============================================
  // Size Attributes
  // ============================================
  {
    name: 'w',
    type: 'string',
    description: 'Width (number, "full", "auto", "screen", "fit")',
    example: 'w=full',
  },
  {
    name: 'h',
    type: 'string',
    description: 'Height (number, "full", "auto", "screen")',
    example: 'h=full',
  },
  {
    name: 'width',
    type: 'number',
    description: 'Width in pixels (page only)',
    example: 'width=400',
  },
  {
    name: 'height',
    type: 'number',
    description: 'Height in pixels (page only)',
    example: 'height=300',
  },
  { name: 'minW', type: 'number', description: 'Minimum width', example: 'minW=200' },
  { name: 'maxW', type: 'number', description: 'Maximum width', example: 'maxW=600' },
  { name: 'minH', type: 'number', description: 'Minimum height', example: 'minH=100' },
  { name: 'maxH', type: 'number', description: 'Maximum height', example: 'maxH=400' },

  // ============================================
  // Flex/Grid Layout Attributes
  // ============================================
  { name: 'flex', type: 'boolean', description: 'Enable flexbox', example: 'flex' },
  {
    name: 'direction',
    type: 'enum',
    values: ['row', 'column', 'row-reverse', 'column-reverse'],
    description: 'Flex direction',
    example: 'direction=column',
  },
  {
    name: 'justify',
    type: 'enum',
    values: ['start', 'center', 'end', 'between', 'around', 'evenly'],
    description: 'Main axis alignment',
    example: 'justify=center',
  },
  {
    name: 'align',
    type: 'enum',
    values: ['start', 'center', 'end', 'stretch', 'baseline'],
    description: 'Cross axis alignment',
    example: 'align=center',
  },
  { name: 'wrap', type: 'boolean', description: 'Enable flex wrap', example: 'wrap' },
  { name: 'span', type: 'number', description: 'Grid column span (1-12)', example: 'span=6' },
  { name: 'sm', type: 'number', description: 'Responsive span at 576px+', example: 'sm=6' },
  { name: 'md', type: 'number', description: 'Responsive span at 768px+', example: 'md=4' },
  { name: 'lg', type: 'number', description: 'Responsive span at 992px+', example: 'lg=3' },
  { name: 'xl', type: 'number', description: 'Responsive span at 1200px+', example: 'xl=2' },
  { name: 'order', type: 'number', description: 'Flex order', example: 'order=1' },

  // ============================================
  // Position Attributes
  // ============================================
  { name: 'x', type: 'number', description: 'Horizontal position', example: 'x=100' },
  { name: 'y', type: 'number', description: 'Vertical position', example: 'y=50' },
  {
    name: 'position',
    type: 'enum',
    values: [
      'left',
      'right',
      'top',
      'bottom',
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ],
    description: 'Position preset',
    example: 'position=left',
  },

  // ============================================
  // Visual Attributes
  // ============================================
  { name: 'border', type: 'boolean', description: 'Show border', example: 'border' },
  { name: 'rounded', type: 'boolean', description: 'Apply border radius', example: 'rounded' },
  {
    name: 'shadow',
    type: 'enum',
    values: ['none', 'sm', 'md', 'lg', 'xl'],
    description: 'Box shadow',
    example: 'shadow=md',
  },
  {
    name: 'bg',
    type: 'enum',
    values: ['muted', 'primary', 'secondary'],
    description: 'Background variant',
    example: 'bg=muted',
  },

  // ============================================
  // Text Attributes
  // ============================================
  {
    name: 'size',
    type: 'enum',
    values: ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl'],
    description: 'Size preset',
    example: 'size=lg',
  },
  {
    name: 'weight',
    type: 'enum',
    values: ['normal', 'medium', 'semibold', 'bold'],
    description: 'Font weight',
    example: 'weight=bold',
  },
  { name: 'level', type: 'number', description: 'Heading level (1-6)', example: 'level=2' },
  { name: 'muted', type: 'boolean', description: 'Muted/dimmed style', example: 'muted' },
  { name: 'bold', type: 'boolean', description: 'Bold text', example: 'bold' },

  // ============================================
  // Button Variant Attributes
  // ============================================
  { name: 'primary', type: 'boolean', description: 'Primary style', example: 'primary' },
  { name: 'secondary', type: 'boolean', description: 'Secondary style', example: 'secondary' },
  { name: 'outline', type: 'boolean', description: 'Outline style', example: 'outline' },
  { name: 'ghost', type: 'boolean', description: 'Ghost/transparent style', example: 'ghost' },
  { name: 'danger', type: 'boolean', description: 'Danger/destructive style', example: 'danger' },

  // ============================================
  // Status Variant Attributes
  // ============================================
  {
    name: 'variant',
    type: 'enum',
    values: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'],
    description: 'Status variant',
    example: 'variant=success',
  },

  // ============================================
  // Form Attributes
  // ============================================
  {
    name: 'inputType',
    type: 'enum',
    values: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date'],
    description: 'Input field type',
    example: 'inputType=email',
  },
  {
    name: 'placeholder',
    type: 'string',
    description: 'Placeholder text',
    example: 'placeholder="Enter text"',
  },
  { name: 'value', type: 'string', description: 'Default value', example: 'value="default"' },
  { name: 'label', type: 'string', description: 'Field label', example: 'label="Name"' },
  { name: 'name', type: 'string', description: 'Form field name', example: 'name="field"' },
  { name: 'required', type: 'boolean', description: 'Required field', example: 'required' },
  { name: 'disabled', type: 'boolean', description: 'Disabled state', example: 'disabled' },
  { name: 'readonly', type: 'boolean', description: 'Read-only state', example: 'readonly' },
  { name: 'checked', type: 'boolean', description: 'Checked state', example: 'checked' },
  { name: 'loading', type: 'boolean', description: 'Loading state', example: 'loading' },
  { name: 'rows', type: 'number', description: 'Textarea rows', example: 'rows=4' },
  { name: 'min', type: 'number', description: 'Minimum value', example: 'min=0' },
  { name: 'max', type: 'number', description: 'Maximum value', example: 'max=100' },
  { name: 'step', type: 'number', description: 'Step increment', example: 'step=1' },

  // ============================================
  // Content Attributes
  // ============================================
  { name: 'title', type: 'string', description: 'Title text', example: 'title="Title"' },
  { name: 'src', type: 'string', description: 'Source URL', example: 'src="/image.png"' },
  { name: 'alt', type: 'string', description: 'Alt text', example: 'alt="Image"' },
  { name: 'href', type: 'string', description: 'Link URL', example: 'href="/path"' },
  { name: 'icon', type: 'string', description: 'Icon name', example: 'icon="home"' },
  { name: 'external', type: 'boolean', description: 'External link', example: 'external' },

  // ============================================
  // State Attributes
  // ============================================
  { name: 'active', type: 'number', description: 'Active index', example: 'active=0' },
  { name: 'expanded', type: 'boolean', description: 'Expanded state', example: 'expanded' },
  { name: 'centered', type: 'boolean', description: 'Center content', example: 'centered' },
  { name: 'vertical', type: 'boolean', description: 'Vertical orientation', example: 'vertical' },
  { name: 'scroll', type: 'boolean', description: 'Enable scrolling', example: 'scroll' },

  // ============================================
  // Feedback Attributes
  // ============================================
  { name: 'dismissible', type: 'boolean', description: 'Can be dismissed', example: 'dismissible' },
  {
    name: 'indeterminate',
    type: 'boolean',
    description: 'Indeterminate state',
    example: 'indeterminate',
  },
  { name: 'pill', type: 'boolean', description: 'Pill/rounded style', example: 'pill' },

  // ============================================
  // Data Attributes
  // ============================================
  { name: 'striped', type: 'boolean', description: 'Striped rows', example: 'striped' },
  { name: 'bordered', type: 'boolean', description: 'Full borders', example: 'bordered' },
  { name: 'hover', type: 'boolean', description: 'Hover effect', example: 'hover' },
  { name: 'ordered', type: 'boolean', description: 'Ordered list', example: 'ordered' },
  { name: 'none', type: 'boolean', description: 'No list markers', example: 'none' },

  // ============================================
  // Page/Viewport Attributes
  // ============================================
  {
    name: 'viewport',
    type: 'string',
    description: 'Viewport size (e.g., "1440x900")',
    example: 'viewport="1440x900"',
  },
  { name: 'device', type: 'string', description: 'Device preset', example: 'device="iphone14"' },
  {
    name: 'at',
    type: 'function',
    description:
      'Place page on the multi-page canvas at (x, y) — pages without at() auto-flow horizontally',
    example: 'at(0, 0)',
  },

  // ============================================
  // Interactive Attributes
  // ============================================
  {
    name: 'navigate',
    type: 'string',
    description: 'Navigation target URL or page',
    example: 'navigate="/dashboard"',
  },
  {
    name: 'opens',
    type: 'string',
    description: 'Opens a modal, drawer, or popup',
    example: 'opens="settings-modal"',
  },
  {
    name: 'toggles',
    type: 'string',
    description: 'Toggles visibility of an element',
    example: 'toggles="menu"',
  },
  {
    name: 'action',
    type: 'string',
    description: 'Action identifier for event handling',
    example: 'action="submit-form"',
  },

  // ============================================
  // Annotation Attributes
  // ============================================
  {
    name: 'anchor',
    type: 'enum',
    values: [
      'top-left',
      'top-center',
      'top-right',
      'center-left',
      'center',
      'center-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ],
    description: 'Anchor position for marker in relative container',
    example: 'anchor=top-right',
  },
  {
    name: 'color',
    type: 'enum',
    values: ['blue', 'red', 'green', 'yellow', 'purple', 'orange'],
    description: 'Marker color',
    example: 'color=blue',
  },
]

/**
 * Map of attribute name to definition for quick lookup
 */
export const ATTRIBUTE_MAP: Map<string, AttributeDef> = new Map(
  ATTRIBUTES.map((attr) => [attr.name, attr]),
)

/**
 * Set of all valid attribute names
 */
export const VALID_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set(
  ATTRIBUTES.map((attr) => attr.name),
)
