# Markdown Plugin

The Wireweave Markdown plugin lets you embed wireframes directly in your documentation.

## Installation

```bash
npm install @wireweave/markdown-plugin
```

## Usage

### Basic Usage

In your Markdown files, use fenced code blocks with the `wire` language:

````markdown
```wireframe
page "Example" {
  card {
    heading "Hello World"
    button "Click Me" primary
  }
}
```
````

The plugin renders the wireframe inline in your documentation.

### With Options

Pass options after the language identifier:

````markdown
```wireframe theme=dark width=800
page "Dark Theme" {
  // content
}
```
````

## Configuration

### VitePress

```js
// .vitepress/config.js
import { wireweavePlugin } from '@wireweave/markdown-plugin'

export default {
  markdown: {
    config: (md) => {
      md.use(wireweavePlugin, {
        defaultTheme: 'light',
        defaultWidth: 600,
      })
    },
  },
}
```

### Docusaurus

```js
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      '@wireweave/markdown-plugin/docusaurus',
      {
        defaultTheme: 'light',
      },
    ],
  ],
}
```

### Remark (MDX)

```js
import { remarkWireweave } from '@wireweave/markdown-plugin'

const result = await unified()
  .use(remarkParse)
  .use(remarkWireweave, { theme: 'light' })
  .use(remarkHtml)
  .process(markdown)
```

## Options

### Block Options

Options can be set per code block:

| Option    | Values          | Description            |
| --------- | --------------- | ---------------------- |
| `theme`   | `light`, `dark` | Color theme            |
| `width`   | number          | Width in pixels        |
| `height`  | number          | Height in pixels       |
| `format`  | `svg`, `html`   | Output format          |
| `padding` | number          | Padding around content |

Example:

````markdown
```wireframe theme=dark width=400 padding=16
page { ... }
```
````

### Global Options

Set defaults in your configuration:

```js
md.use(wireweavePlugin, {
  defaultTheme: 'light',
  defaultWidth: 600,
  defaultFormat: 'svg',
  defaultPadding: 24,
})
```

## Output Formats

### SVG (Default)

Renders as inline SVG:

- Crisp at any scale
- Good for documentation
- No interactivity

### HTML

Renders as embedded HTML:

- Interactive elements
- Hover states work
- Larger file size

## Examples

### Simple Card

````markdown
```wireframe
card {
  heading "Feature"
  text "Description of the feature"
  button "Learn More" link
}
```
````

### Form Example

````markdown
```wireframe width=400
card {
  heading "Sign Up"
  input "Email" email
  input "Password" password
  checkbox "Remember me"
  button "Create Account" primary fullWidth
}
```
````

### Dashboard Layout

````markdown
```wireframe theme=dark width=800
page "Dashboard" {
  navbar { logo "App" nav { link "Home" link "Settings" } }
  row {
    sidebar { menu { item "Overview" item "Analytics" } }
    main {
      grid columns:3 {
        card { heading "Users" text "1,234" }
        card { heading "Revenue" text "$56K" }
        card { heading "Orders" text "890" }
      }
    }
  }
}
```
````

## Troubleshooting

### Wireframe Not Rendering

1. Check for syntax errors in your DSL code
2. Verify the plugin is correctly configured
3. Check console for error messages

### Styling Conflicts

If your documentation styles conflict with rendered wireframes:

```css
/* Scope wireframe styles */
.wireweave-embed {
  all: initial;
}
```

## Next Steps

- [VS Code Extension](/guide/vscode-extension) - Local editing
- [Grammar Reference](/reference/grammar) - Syntax details
