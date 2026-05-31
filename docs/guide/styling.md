# Styling

Wireweave provides built-in themes and styling options for customizing wireframe appearance.

## Themes

### Light Theme (Default)

Light theme uses:

- Background: White (#FFFFFF)
- Text: Dark gray (#1F2937)
- Primary: Blue (#3B82F6)
- Borders: Light gray (#E5E7EB)

### Dark Theme

Dark theme uses:

- Background: Dark (#111827)
- Text: Light gray (#F9FAFB)
- Primary: Blue (#60A5FA)
- Borders: Gray (#374151)

### Render with Theme

When rendering, you can specify theme in options:

```javascript
import { render, renderToSvg } from '@wireweave/core'

// HTML render with theme
const { html, css } = render(doc, { theme: 'dark' })

// SVG render with theme
const { svg } = renderToSvg(doc, { theme: 'dark' })
```

## Colors

### Button Variants

```wireframe
button "Primary" primary      // Blue
button "Secondary" secondary  // Gray
button "Danger" danger        // Red
button "Outline" outline      // Border only
button "Ghost" ghost          // Transparent
```

### Alert Variants

```wireframe
alert "Success!" variant=success    // Green background
alert "Error!" variant=danger       // Red background
alert "Warning!" variant=warning    // Yellow background
alert "Info!" variant=info          // Blue background
```

### Badge Variants

```wireframe
badge "Active" variant=success
badge "Pending" variant=warning
badge "Inactive" variant=danger
badge "New" variant=info
```

## Typography

### Title Levels

```wireframe
title "H1 Title" level=1          // 32px
title "H2 Title" level=2          // 24px
title "H3 Title" level=3          // 20px
title "H4 Title" level=4          // 16px
```

### Text Styles

```wireframe
text "Regular text"
text "Bold text" weight=bold
text "Muted text" muted
text "Small text" size=sm
text "Large text" size=lg
```

### Text Sizes

| Size   | Value | Description    |
| ------ | ----- | -------------- |
| `xs`   | 12px  | Extra small    |
| `sm`   | 14px  | Small          |
| `base` | 16px  | Base (default) |
| `lg`   | 18px  | Large          |
| `xl`   | 20px  | Extra large    |
| `2xl`  | 24px  | 2X large       |

### Font Weights

```wireframe
text "Normal" weight=normal
text "Medium" weight=medium
text "Semibold" weight=semibold
text "Bold" weight=bold
```

## Component Styles

### Card Styles

```wireframe
card {
  // default with subtle shadow
}

card shadow=none {
  // no shadow
}

card shadow=lg {
  // larger shadow
}

card border {
  // with border
}

card rounded {
  // rounded corners
}
```

### Input States

```wireframe
input "Default"
input "Disabled" disabled
input "Readonly" readonly
input "Required" required
```

### Button Styles

```wireframe
button "Solid" primary
button "Outline" primary outline
button "Ghost" primary ghost
button "Disabled" primary disabled
button "Loading" primary loading
```

## Sizing

### Component Sizes

```wireframe
button "Small" primary size=sm
button "Medium" primary size=md
button "Large" primary size=lg

input "Small" size=sm
input "Large" size=lg
```

### Width and Height

```wireframe
card w=400 {
  // fixed width
}

placeholder w=300 h=200 {
  // fixed dimensions
}

card minW=200 maxW=600 {
  // min/max constraints
}
```

## Spacing

### Padding Shorthand

| Attribute | Description    |
| --------- | -------------- |
| `p`       | All sides      |
| `px`      | Left and right |
| `py`      | Top and bottom |
| `pt`      | Top only       |
| `pr`      | Right only     |
| `pb`      | Bottom only    |
| `pl`      | Left only      |

```wireframe
card p=16 {
  // 16px all sides
}

card px=24 py=16 {
  // horizontal 24px, vertical 16px
}
```

### Margin Shorthand

| Attribute | Description    |
| --------- | -------------- |
| `m`       | All sides      |
| `mx`      | Left and right |
| `my`      | Top and bottom |
| `mt`      | Top only       |
| `mr`      | Right only     |
| `mb`      | Bottom only    |
| `ml`      | Left only      |

```wireframe
card mb=16 {
  // bottom margin 16px
}

divider my=24 {
  // vertical margin 24px
}
```

## Render Options

### HTML Render

```javascript
import { parse, render } from '@wireweave/core'

const doc = parse(source)
const { html, css } = render(doc, {
  theme: 'light', // 'light' or 'dark'
})
```

### SVG Render

```javascript
import { parse, renderToSvg } from '@wireweave/core'

const doc = parse(source)
const { svg } = renderToSvg(doc, {
  width: 1200,
  padding: 24,
  theme: 'light',
})
```

## Best Practices

1. **Use semantic variants** - Use `primary`, `success`, `danger` instead of custom colors
2. **Maintain consistency** - Stick to one theme per wireframe
3. **Focus on layout** - Wireframes are about structure, not visual design
4. **Keep it simple** - Avoid over-styling; wireframes should be quick sketches
5. **Use spacing tokens** - Use consistent spacing values (8, 16, 24, 32)

## Next Steps

- [MCP Server Guide](/guide/mcp-server) - AI integration
- [Reference: Components](/reference/components) - Component details
