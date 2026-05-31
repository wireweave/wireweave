/**
 * Component definitions for Wireweave DSL
 *
 * Complete component definitions for editor integrations.
 * This is the authoritative source for editor-related component data.
 */

import type { ComponentDef } from './types.js'
import { COMMON_ATTRIBUTES } from './attributes.js'

/**
 * All components in Wireweave DSL
 */
export const ALL_COMPONENTS: ComponentDef[] = [
  // ============================================
  // Layout Components
  // ============================================
  {
    name: 'page',
    nodeType: 'Page',
    category: 'layout',
    attributes: [
      ...COMMON_ATTRIBUTES,
      'title',
      'width',
      'height',
      'viewport',
      'device',
      'centered',
      'at',
    ],
    hasChildren: true,
    description:
      'Root container for a wireframe page. Multiple pages in one .wf file lay out side-by-side on a canvas; use at(x, y) for explicit placement, or omit for auto-flow.',
    example: 'page "Login" at(0, 0) viewport="1280x800" { ... }',
    validChildren: ['header', 'main', 'footer', 'sidebar', 'section', 'nav', 'row', 'col', 'card'],
    validParents: [],
  },
  {
    name: 'header',
    nodeType: 'Header',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'border'],
    hasChildren: true,
    description: 'Page header section',
    example: 'header h=56 border { ... }',
    validParents: ['page'],
  },
  {
    name: 'main',
    nodeType: 'Main',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'scroll'],
    hasChildren: true,
    description: 'Main content section',
    example: 'main p=6 scroll { ... }',
    validParents: ['page'],
  },
  {
    name: 'footer',
    nodeType: 'Footer',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'border'],
    hasChildren: true,
    description: 'Page footer section',
    example: 'footer h=48 border { ... }',
    validParents: ['page'],
  },
  {
    name: 'sidebar',
    nodeType: 'Sidebar',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'position', 'border', 'bg'],
    hasChildren: true,
    description: 'Side navigation or content area',
    example: 'sidebar w=240 border { ... }',
    validParents: ['page'],
  },
  {
    name: 'section',
    nodeType: 'Section',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'title', 'expanded'],
    hasChildren: true,
    description: 'Grouped content section',
    example: 'section "Settings" expanded { ... }',
  },

  // ============================================
  // Grid Components
  // ============================================
  {
    name: 'row',
    nodeType: 'Row',
    category: 'grid',
    attributes: [...COMMON_ATTRIBUTES, 'border', 'bg'],
    hasChildren: true,
    description: 'Horizontal flex container',
    example: 'row flex gap=4 justify=between { ... }',
  },
  {
    name: 'col',
    nodeType: 'Col',
    category: 'grid',
    attributes: [...COMMON_ATTRIBUTES, 'sm', 'md', 'lg', 'xl', 'order', 'border', 'bg', 'scroll'],
    hasChildren: true,
    description: 'Vertical flex container or grid column',
    example: 'col span=6 md=4 { ... }',
  },
  {
    name: 'stack',
    nodeType: 'Stack',
    category: 'grid',
    attributes: [...COMMON_ATTRIBUTES, 'border', 'bg'],
    hasChildren: true,
    description: 'Vertical stack that only takes content height (unlike col which fills)',
    example: 'stack gap=4 align=center { ... }',
  },
  {
    name: 'relative',
    nodeType: 'Relative',
    category: 'grid',
    attributes: [...COMMON_ATTRIBUTES],
    hasChildren: true,
    description: 'Container for overlaying elements with absolute positioning',
    example: 'relative { button "Submit" marker 1 anchor=top-right }',
  },

  // ============================================
  // Container Components
  // ============================================
  {
    name: 'card',
    nodeType: 'Card',
    category: 'container',
    attributes: [...COMMON_ATTRIBUTES, 'title', 'shadow', 'border', 'rounded'],
    hasChildren: true,
    description: 'Card container with optional title',
    example: 'card "Settings" p=4 shadow=md { ... }',
  },
  {
    name: 'modal',
    nodeType: 'Modal',
    category: 'container',
    attributes: [...COMMON_ATTRIBUTES, 'title'],
    hasChildren: true,
    description: 'Modal dialog overlay',
    example: 'modal "Confirm" w=400 { ... }',
  },
  {
    name: 'drawer',
    nodeType: 'Drawer',
    category: 'container',
    attributes: [...COMMON_ATTRIBUTES, 'title', 'position'],
    hasChildren: true,
    description: 'Slide-in drawer panel',
    example: 'drawer "Menu" position=left { ... }',
  },
  {
    name: 'accordion',
    nodeType: 'Accordion',
    category: 'container',
    attributes: [...COMMON_ATTRIBUTES, 'title'],
    hasChildren: true,
    description: 'Collapsible sections container',
    example: 'accordion { section "FAQ 1" { ... } }',
  },

  // ============================================
  // Text Components
  // ============================================
  {
    name: 'text',
    nodeType: 'Text',
    category: 'text',
    attributes: [...COMMON_ATTRIBUTES, 'size', 'weight', 'muted', 'bold'],
    hasChildren: false,
    description: 'Text content',
    example: 'text "Hello World" size=lg weight=bold',
  },
  {
    name: 'title',
    nodeType: 'Title',
    category: 'text',
    attributes: [...COMMON_ATTRIBUTES, 'level', 'size'],
    hasChildren: false,
    description: 'Heading element (h1-h6)',
    example: 'title "Welcome" level=2',
  },
  {
    name: 'link',
    nodeType: 'Link',
    category: 'text',
    attributes: [...COMMON_ATTRIBUTES, 'href', 'external'],
    hasChildren: false,
    description: 'Hyperlink text',
    example: 'link "Learn more" href="/docs" external',
  },

  // ============================================
  // Input Components
  // ============================================
  {
    name: 'input',
    nodeType: 'Input',
    category: 'input',
    attributes: [
      ...COMMON_ATTRIBUTES,
      'label',
      'inputType',
      'placeholder',
      'value',
      'disabled',
      'required',
      'readonly',
      'icon',
      'size',
      'rounded',
    ],
    hasChildren: false,
    description: 'Text input field',
    example: 'input "Email" inputType=email placeholder="user@example.com" required',
  },
  {
    name: 'textarea',
    nodeType: 'Textarea',
    category: 'input',
    attributes: [
      ...COMMON_ATTRIBUTES,
      'label',
      'placeholder',
      'value',
      'rows',
      'disabled',
      'required',
    ],
    hasChildren: false,
    description: 'Multi-line text input',
    example: 'textarea "Description" rows=4 placeholder="Enter description..."',
  },
  {
    name: 'select',
    nodeType: 'Select',
    category: 'input',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'placeholder', 'value', 'disabled', 'required'],
    hasChildren: false,
    description: 'Dropdown select',
    example: 'select "Country" ["USA", "Canada", "UK"] placeholder="Select..."',
  },
  {
    name: 'checkbox',
    nodeType: 'Checkbox',
    category: 'input',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'checked', 'disabled'],
    hasChildren: false,
    description: 'Checkbox input',
    example: 'checkbox "I agree to terms" checked',
  },
  {
    name: 'radio',
    nodeType: 'Radio',
    category: 'input',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'name', 'checked', 'disabled'],
    hasChildren: false,
    description: 'Radio button input',
    example: 'radio "Option A" name="choice" checked',
  },
  {
    name: 'switch',
    nodeType: 'Switch',
    category: 'input',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'checked', 'disabled'],
    hasChildren: false,
    description: 'Toggle switch',
    example: 'switch "Dark mode" checked',
  },
  {
    name: 'slider',
    nodeType: 'Slider',
    category: 'input',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'min', 'max', 'value', 'step', 'disabled'],
    hasChildren: false,
    description: 'Range slider',
    example: 'slider "Volume" min=0 max=100 value=50',
  },
  {
    name: 'button',
    nodeType: 'Button',
    category: 'input',
    attributes: [
      ...COMMON_ATTRIBUTES,
      'primary',
      'secondary',
      'outline',
      'ghost',
      'danger',
      'size',
      'icon',
      'disabled',
      'loading',
    ],
    hasChildren: false,
    description: 'Clickable button',
    example: 'button "Submit" primary icon=send',
  },

  // ============================================
  // Display Components
  // ============================================
  {
    name: 'image',
    nodeType: 'Image',
    category: 'display',
    attributes: [...COMMON_ATTRIBUTES, 'src', 'alt'],
    hasChildren: false,
    description: 'Image placeholder',
    example: 'image w=200 h=150',
  },
  {
    name: 'placeholder',
    nodeType: 'Placeholder',
    category: 'display',
    attributes: [...COMMON_ATTRIBUTES, 'label'],
    hasChildren: true,
    description: 'Generic placeholder',
    example: 'placeholder "Banner Image" w=full h=200 { ... }',
  },
  {
    name: 'avatar',
    nodeType: 'Avatar',
    category: 'display',
    attributes: [...COMMON_ATTRIBUTES, 'name', 'src', 'size'],
    hasChildren: false,
    description: 'User avatar',
    example: 'avatar "John Doe" size=lg',
  },
  {
    name: 'badge',
    nodeType: 'Badge',
    category: 'display',
    attributes: [...COMMON_ATTRIBUTES, 'variant', 'pill', 'icon', 'size'],
    hasChildren: false,
    description: 'Status badge',
    example: 'badge "New" variant=success pill',
  },
  {
    name: 'icon',
    nodeType: 'Icon',
    category: 'display',
    attributes: [...COMMON_ATTRIBUTES, 'size', 'muted'],
    hasChildren: false,
    description: 'Lucide icon',
    example: 'icon "settings" size=lg',
  },

  // ============================================
  // Data Components
  // ============================================
  {
    name: 'table',
    nodeType: 'Table',
    category: 'data',
    attributes: [...COMMON_ATTRIBUTES, 'striped', 'bordered', 'hover'],
    hasChildren: false,
    description: 'Data table',
    example:
      'table striped bordered { columns ["Name", "Email"] row ["John", "john@example.com"] }',
  },
  {
    name: 'list',
    nodeType: 'List',
    category: 'data',
    attributes: [...COMMON_ATTRIBUTES, 'ordered', 'none'],
    hasChildren: false,
    description: 'List of items',
    example: 'list ordered ["First", "Second", "Third"]',
  },

  // ============================================
  // Feedback Components
  // ============================================
  {
    name: 'alert',
    nodeType: 'Alert',
    category: 'feedback',
    attributes: [...COMMON_ATTRIBUTES, 'variant', 'dismissible', 'icon'],
    hasChildren: false,
    description: 'Alert message',
    example: 'alert "Changes saved!" variant=success',
  },
  {
    name: 'toast',
    nodeType: 'Toast',
    category: 'feedback',
    attributes: [...COMMON_ATTRIBUTES, 'position', 'variant'],
    hasChildren: false,
    description: 'Toast notification',
    example: 'toast "Item deleted" position=bottom-right variant=danger',
  },
  {
    name: 'progress',
    nodeType: 'Progress',
    category: 'feedback',
    attributes: [...COMMON_ATTRIBUTES, 'value', 'max', 'label', 'indeterminate'],
    hasChildren: false,
    description: 'Progress bar',
    example: 'progress value=75 label="Uploading..."',
  },
  {
    name: 'spinner',
    nodeType: 'Spinner',
    category: 'feedback',
    attributes: [...COMMON_ATTRIBUTES, 'label', 'size'],
    hasChildren: false,
    description: 'Loading spinner',
    example: 'spinner size=lg',
  },

  // ============================================
  // Overlay Components
  // ============================================
  {
    name: 'tooltip',
    nodeType: 'Tooltip',
    category: 'overlay',
    attributes: [...COMMON_ATTRIBUTES, 'position'],
    hasChildren: false,
    description: 'Tooltip on hover',
    example: 'tooltip "More info" position=top { icon "help-circle" }',
  },
  {
    name: 'popover',
    nodeType: 'Popover',
    category: 'overlay',
    attributes: [...COMMON_ATTRIBUTES, 'title'],
    hasChildren: true,
    description: 'Popover panel',
    example: 'popover "Details" { ... }',
  },
  {
    name: 'dropdown',
    nodeType: 'Dropdown',
    category: 'overlay',
    attributes: [...COMMON_ATTRIBUTES],
    hasChildren: false,
    description: 'Dropdown menu',
    example: 'dropdown { item "Edit" icon=edit item "Delete" icon=trash danger }',
  },

  // ============================================
  // Navigation Components
  // ============================================
  {
    name: 'nav',
    nodeType: 'Nav',
    category: 'navigation',
    attributes: [...COMMON_ATTRIBUTES, 'vertical'],
    hasChildren: false,
    description: 'Navigation menu',
    example: 'nav [{ label="Home" icon=home active }, { label="Settings" icon=settings }] vertical',
  },
  {
    name: 'tabs',
    nodeType: 'Tabs',
    category: 'navigation',
    attributes: [...COMMON_ATTRIBUTES, 'active'],
    hasChildren: true,
    description: 'Tab navigation',
    example: 'tabs { tab "General" active { ... } tab "Advanced" { ... } }',
  },
  {
    name: 'breadcrumb',
    nodeType: 'Breadcrumb',
    category: 'navigation',
    attributes: [...COMMON_ATTRIBUTES],
    hasChildren: false,
    description: 'Breadcrumb navigation',
    example: 'breadcrumb [{ label="Home" href="/" }, { label="Products" }, { label="Details" }]',
  },

  // ============================================
  // Divider Component
  // ============================================
  {
    name: 'divider',
    nodeType: 'Divider',
    category: 'layout',
    attributes: [...COMMON_ATTRIBUTES, 'vertical'],
    hasChildren: false,
    description: 'Horizontal separator',
    example: 'divider my=4',
  },

  // ============================================
  // Annotation Components
  // ============================================
  {
    name: 'marker',
    nodeType: 'Marker',
    category: 'annotation',
    attributes: [...COMMON_ATTRIBUTES, 'color', 'anchor'],
    hasChildren: false,
    description: 'Number marker for referencing in annotations',
    example: 'marker 1 anchor=top-right color=blue',
  },
  {
    name: 'annotations',
    nodeType: 'Annotations',
    category: 'annotation',
    attributes: [...COMMON_ATTRIBUTES, 'title'],
    hasChildren: true,
    description: 'Documentation panel for screen specifications',
    example: 'annotations title="화면 설명" { item 1 "제목" { text "설명" } }',
    validChildren: ['item'],
  },
  {
    name: 'item',
    nodeType: 'AnnotationItem',
    category: 'annotation',
    attributes: [],
    hasChildren: true,
    description: 'Individual annotation entry with marker number and title',
    example: 'item 1 "로그인 버튼" { text "OAuth 연동 예정" }',
    validParents: ['annotations'],
  },
]

/**
 * Map of component name to definition for quick lookup
 */
export const COMPONENT_MAP: Map<string, ComponentDef> = new Map(
  ALL_COMPONENTS.map((comp) => [comp.name, comp]),
)

/**
 * Map of AST node type to definition for quick lookup
 */
export const NODE_TYPE_MAP: Map<string, ComponentDef> = new Map(
  ALL_COMPONENTS.map((comp) => [comp.nodeType, comp]),
)

/**
 * Set of all valid component names
 */
export const VALID_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  ALL_COMPONENTS.map((comp) => comp.name),
)
