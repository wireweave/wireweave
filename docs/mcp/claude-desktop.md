# Claude Desktop Setup

This guide walks you through setting up Wireweave MCP server with Claude Desktop.

## Prerequisites

- [Claude Desktop](https://claude.ai/download) installed
- Node.js 18+ installed
- Wireweave API key from [Dashboard](https://wireweave.org/dashboard/keys)

## Step 1: Locate Config File

Find or create the Claude Desktop configuration file:

::: code-group

```bash [macOS]
# Config location
~/Library/Application Support/Claude/claude_desktop_config.json

# Create directory if needed
mkdir -p ~/Library/Application\ Support/Claude
```

```bash [Windows]
# Config location
%APPDATA%\Claude\claude_desktop_config.json

# Typically at
C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json
```

:::

## Step 2: Add MCP Configuration

Open the config file in your editor and add the Wireweave MCP server:

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
If the file already has other MCP servers, add `wireweave` alongside them in the `mcpServers` object.
:::

### Complete Example with Multiple Servers

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_your_api_key_here"
      }
    },
    "other-server": {
      "command": "npx",
      "args": ["other-mcp-server"]
    }
  }
}
```

## Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely (check system tray/menu bar)
2. Reopen Claude Desktop
3. The MCP server will be loaded automatically

## Step 4: Verify Setup

Ask Claude to verify the connection:

> "What wireframe tools do you have available?"

Claude should respond listing the Wireweave tools:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Usage Examples

Once configured, try these prompts:

### Create a Simple Wireframe

> "Create a wireframe for a login page with email, password fields, and a submit button"

### Generate Dashboard Layout

> "Design a dashboard wireframe with a sidebar, header, and three stat cards"

### Mobile-First Design

> "Make a mobile-friendly wireframe for a product listing page with search and filters"

## Troubleshooting

### Server Not Loading

1. **Check config syntax** - Ensure valid JSON (no trailing commas)
2. **Verify file location** - Config must be in the correct directory
3. **Check Claude Desktop logs**:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### "API key not set" Error

Verify your API key format:

```json
{
  "env": {
    "WIREWEAVE_API_KEY": "ww_xxxxxxxxxxxx"
  }
}
```

Keys should start with `ww_` prefix.

### "npx command not found"

Ensure Node.js is installed and in your PATH:

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npx availability
npx --version
```

### Rate Limit Issues

If you see rate limit errors:

- Free tier: 10 requests/minute, 1,000/month
- [Upgrade your plan](https://wireweave.org/pricing) for higher limits

## Environment Variables

| Variable            | Required | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `WIREWEAVE_API_KEY` | Yes      | Your API key from Dashboard                         |
| `WIREWEAVE_API_URL` | No       | Custom API URL (default: https://api.wireweave.org) |

## Next Steps

- [Available Tools](/guide/mcp-server#available-tools) - Learn what each tool does
- [DSL Grammar](/reference/grammar) - Understand the wireframe syntax
- [Examples](/guide/getting-started#examples) - See more wireframe examples
