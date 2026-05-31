# Cursor Setup

This guide walks you through setting up Wireweave MCP server with Cursor IDE.

## Prerequisites

- [Cursor](https://cursor.sh/) installed
- Node.js 18+ installed
- Wireweave API key from [Dashboard](https://wireweave.org/dashboard/keys)

## Step 1: Locate Config File

Find or create the Cursor MCP configuration file:

::: code-group

```bash [macOS]
# Config location
~/.cursor/mcp.json

# Create directory if needed
mkdir -p ~/.cursor
```

```bash [Windows]
# Config location
%USERPROFILE%\.cursor\mcp.json

# Typically at
C:\Users\<username>\.cursor\mcp.json
```

```bash [Linux]
# Config location
~/.cursor/mcp.json

# Create directory if needed
mkdir -p ~/.cursor
```

:::

## Step 2: Add MCP Configuration

Create or edit `mcp.json` with the Wireweave MCP server:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_your_api_key_here"
      }
    }
  }
}
```

::: tip
Cursor supports MCP natively. Make sure you're using a recent version with MCP support enabled.
:::

### Alternative: Project-Level Config

You can also add MCP config at the project level:

```bash
# In your project root
.cursor/mcp.json
```

This allows different API keys for different projects.

## Step 3: Restart Cursor

1. Close all Cursor windows
2. Quit Cursor completely
3. Reopen Cursor and your project

## Step 4: Verify Setup

In Cursor's AI chat, ask:

> "What wireframe tools do you have available?"

Cursor should show the Wireweave tools:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Usage with Cursor

### Inline Wireframe Generation

While coding, use Cmd/Ctrl+K and ask:

> "Create a wireframe for this component's UI"

### In Composer

Use the Composer (Cmd/Ctrl+I) for larger wireframe requests:

> "Design a complete dashboard wireframe with:
>
> - Sidebar navigation
> - Header with user profile
> - Main content area with charts
> - Footer"

### Contextual Generation

Select existing code and ask Cursor to create a matching wireframe:

> "Generate a wireframe that matches this React component's structure"

## Best Practices for Cursor

### Workspace Integration

1. Keep wireframe files (`.wf`) in a `wireframes/` directory
2. Use Cursor's AI to iterate on designs
3. Preview with VS Code extension or browser

### Example Workflow

```
1. Ask Cursor: "Create wireframe for user profile page"
2. Review generated .wf file
3. Ask: "Add a dark mode version"
4. Iterate until satisfied
5. Use wireframe for implementation reference
```

## Troubleshooting

### MCP Not Recognized

1. Ensure Cursor version supports MCP (check release notes)
2. Verify config file location and syntax
3. Restart Cursor completely

### "Command not found: npx"

Cursor needs access to your Node.js installation:

```bash
# Verify Node.js is accessible
which npx  # macOS/Linux
where npx  # Windows
```

If using nvm/fnm, you may need to specify the full path:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "/Users/you/.nvm/versions/node/v20.0.0/bin/npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_your_api_key_here"
      }
    }
  }
}
```

### Config Not Loading

1. Check JSON syntax (use a JSON validator)
2. Ensure file permissions allow reading
3. Try global config if project config doesn't work

### Debug Mode

Enable verbose logging:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_your_api_key_here",
        "DEBUG": "wireweave:*"
      }
    }
  }
}
```

## Environment Variables

| Variable            | Required | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `WIREWEAVE_API_KEY` | Yes      | Your API key from Dashboard                         |
| `WIREWEAVE_API_URL` | No       | Custom API URL (default: https://api.wireweave.org) |
| `DEBUG`             | No       | Enable debug logging (`wireweave:*`)                |

## Next Steps

- [DSL Grammar](/reference/grammar) - Learn the wireframe syntax
- [VS Code Extension](/guide/vscode-extension) - Preview wireframes locally
- [Components Reference](/reference/components) - Available UI components
