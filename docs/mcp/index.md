# MCP Client Setup

This section provides detailed setup guides for connecting the Wireweave MCP server to various AI assistants.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that enables AI assistants to interact with external tools and data sources. Wireweave provides an MCP server that exposes wireframe generation capabilities to any MCP-compatible client.

## Prerequisites

Before setting up any MCP client, you'll need:

1. **API Key** - Get one from the [Wireweave Dashboard](https://wireweave.org/dashboard/keys)
2. **Node.js 18+** - Required to run the MCP server via npx
3. **MCP-compatible client** - Claude Desktop, Cursor, VS Code, etc.

## Supported Clients

| Client                                | Status          | Platform              |
| ------------------------------------- | --------------- | --------------------- |
| [Claude Desktop](/mcp/claude-desktop) | Fully Supported | macOS, Windows        |
| [Cursor](/mcp/cursor)                 | Fully Supported | macOS, Windows, Linux |
| [VS Code](/mcp/vscode)                | Fully Supported | macOS, Windows, Linux |

## Quick Start

All clients use a similar configuration format:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

The main difference between clients is:

- **Config file location** - Each client stores its config in a different path
- **Config format** - Some clients may have additional options

Choose your client from the list above for detailed instructions.

## Available Tools

Once configured, your AI assistant will have access to these wireframe tools:

| Tool                         | Description             | Credits |
| ---------------------------- | ----------------------- | ------- |
| `wireweave_parse`            | Parse DSL into AST      | 0       |
| `wireweave_validate`         | Validate DSL syntax     | 0       |
| `wireweave_render_html`      | Render to HTML/CSS      | 0       |
| `wireweave_render_html_file` | Render and save to file | 0       |
| `wireweave_grammar`          | Get DSL grammar docs    | 0       |

> Non-AI tools are free as of v2.0. Only AI generation (`wireweave_ai_generate`, `wireweave_ai_generate_from_image`, `wireweave_ai_improve`) consumes credits.

## Troubleshooting

### Common Issues

- **"API key not set"** - Ensure `WIREWEAVE_API_KEY` is correctly set in the env section
- **"Server not found"** - Make sure Node.js 18+ is installed and in your PATH
- **"Rate limit exceeded"** - Wait for reset or upgrade your plan

### Getting Help

- Check [Troubleshooting Guide](/guide/mcp-server#troubleshooting)
- Contact [support@wireweave.org](mailto:support@wireweave.org)
