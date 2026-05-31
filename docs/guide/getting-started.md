# Getting Started

This guide will help you set up Wireweave and create your first wireframe.

## Installation

### Online Editor

The fastest way to try Wireweave is through the [Dashboard Editor](https://wireweave.org/dashboard). Sign in to create, edit, and save your wireframes online!

### NPM Package

Install the core library in your project:

```bash
npm install @wireweave/core
```

### MCP Server for AI Assistants

To use Wireweave with Claude or other AI assistants:

1. Get an API key from the [Dashboard](https://wireweave.org/dashboard)

2. Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

3. Ask Claude to create wireframes!

## Your First Wireframe

Let's create a simple contact form:

```wireframe
page "Contact" {
  header border {
    row justify=between align=center {
      title "Company" level=3
      nav ["Home", "About", "Contact"]
    }
  }

  main p=4 {
    title "Get in Touch" level=1
    text "We'd love to hear from you." muted

    card shadow=md p=4 {
      col gap=4 {
        input "Name" placeholder="Your name"
        input "Email" inputType=email placeholder="your@email.com"
        textarea "Message" placeholder="Your message" rows=4
        button "Send Message" primary
      }
    }
  }

  footer border p=4 {
    text "© 2026 Company Inc." muted
  }
}
```

## Understanding the Syntax

### Pages

Every wireframe starts with a `page`:

```wireframe
page "Page Title" {
  // content goes here
}
```

### Components

Components are nested inside pages:

```wireframe
page {
  card {
    title "Title" level=3
    text "Description"
    button "Action" primary
  }
}
```

### Attributes

Add attributes to customize components:

```wireframe
button "Click Me" primary           // primary style
button "Cancel" secondary           // secondary style
card shadow=md border { }           // card with shadow and border
input "Email" inputType=email       // email input type
row justify=center gap=4 { }        // centered row with gap
```

## Next Steps

- [Components Guide](/guide/components) - Learn about available components
- [Layouts Guide](/guide/layouts) - Master layout options
- [MCP Server Guide](/guide/mcp-server) - Set up AI integration
