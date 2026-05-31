/**
 * Keywords and labels for Wireweave DSL
 */

import type { ComponentCategory } from './types.js'

// Category labels for display
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  layout: 'Layout',
  container: 'Container',
  grid: 'Grid',
  text: 'Text',
  input: 'Input',
  display: 'Display',
  data: 'Data',
  feedback: 'Feedback',
  overlay: 'Overlay',
  navigation: 'Navigation',
  annotation: 'Annotation',
}

// Value keywords used in the language
export const VALUE_KEYWORDS = [
  // Booleans
  'true',
  'false',

  // Button variants
  'primary',
  'secondary',
  'outline',
  'ghost',

  // Status variants
  'success',
  'danger',
  'warning',
  'info',
  'default',

  // Sizes
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'base',
  '2xl',
  '3xl',

  // Flex alignment
  'start',
  'center',
  'end',
  'between',
  'around',
  'evenly',
  'stretch',
  'baseline',

  // Positions
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
  'center-left',
  'center-right',

  // Marker colors
  'blue',
  'red',
  'green',
  'yellow',
  'purple',
  'orange',

  // Sizing
  'full',
  'auto',
  'screen',
  'fit',

  // Font weights
  'normal',
  'medium',
  'semibold',
  'bold',

  // Input types
  'text',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'search',
  'date',

  // Flex direction
  'row',
  'column',
  'row-reverse',
  'column-reverse',

  // List
  'none',
  'nowrap',
]

// Common number suggestions for attributes
export const COMMON_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64]

// Spacing scale (4px base)
export const SPACING_SCALE: Record<number, string> = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
}
