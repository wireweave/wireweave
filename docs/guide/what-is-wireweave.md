# What is Wireweave?

Wireweave is a domain-specific language (DSL) designed for describing UI wireframes in a simple, human-readable format. It was created specifically to enable AI assistants to generate wireframes naturally through conversation.

## Why Wireweave?

Traditional wireframing tools require manual drag-and-drop operations, which AI assistants cannot perform. Wireweave solves this by providing a text-based format that:

- **Is easy to read and write** - Both humans and AI can understand the syntax
- **Generates professional output** - Produces clean HTML/SVG wireframes
- **Supports rapid iteration** - Change code and see results instantly
- **Integrates with AI tools** - Native MCP (Model Context Protocol) support

## Example

Here's a simple login page wireframe:

```wireframe
page "Login" {
  card center {
    heading "Welcome Back"
    input "Email" email
    input "Password" password
    button "Sign In" primary
    link "Forgot password?"
  }
}
```

This code generates a complete wireframe with proper styling and layout.

## Key Features

### Semantic Components

Wireweave provides high-level UI components that map to common UI patterns:

- **Page** - The root container
- **Card** - Grouped content with optional borders
- **Form** - Input collection with labels
- **Table** - Data display with headers
- **Navigation** - Menus and links

### Multiple Output Formats

Generate wireframes in different formats:

- **HTML** - Interactive prototypes with CSS
- **SVG** - Static images for documentation
- **AST** - JSON for custom renderers

### AI Integration

Wireweave is designed to work with AI assistants through:

- **MCP Server** - Model Context Protocol integration
- **VS Code Extension** - Syntax highlighting and preview
- **Markdown Plugin** - Embed wireframes in documentation

## Next Steps

- [Getting Started](/guide/getting-started) - Install and create your first wireframe
- [Components Reference](/reference/components) - Full list of available components
- [Grammar Reference](/reference/grammar) - Complete syntax documentation
