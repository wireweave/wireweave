# VS Code Setup

This guide walks you through setting up Wireweave MCP server with Visual Studio Code.

## Prerequisites

- [VS Code](https://code.visualstudio.com/) installed
- MCP-compatible extension (e.g., GitHub Copilot with MCP support)
- Node.js 18+ installed
- Wireweave API key from [Dashboard](https://wireweave.org/dashboard/keys)

::: info
VS Code itself doesn't natively support MCP. You'll need an extension that provides MCP capabilities, such as the GitHub Copilot extension with MCP support or other MCP-compatible AI extensions.
:::

## Step 1: Locate Config File

Find or create the VS Code MCP configuration file:

::: code-group

```bash [macOS]
# Config location
~/.vscode/mcp.json

# Create directory if needed
mkdir -p ~/.vscode
```

```bash [Windows]
# Config location
%USERPROFILE%\.vscode\mcp.json

# Typically at
C:\Users\<username>\.vscode\mcp.json
```

```bash [Linux]
# Config location
~/.vscode/mcp.json

# Create directory if needed
mkdir -p ~/.vscode
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

### Project-Level Config

For per-project configuration, create `.vscode/mcp.json` in your workspace:

```bash
your-project/
├── .vscode/
│   └── mcp.json    # Project-specific MCP config
├── src/
└── wireframes/
```

## Step 3: Configure Your AI Extension

Depending on your MCP-capable extension, you may need additional setup:

### GitHub Copilot (if MCP supported)

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Copilot MCP"
3. Enable MCP server support
4. Reload VS Code

### Other MCP Extensions

Follow the extension's specific documentation for loading MCP servers.

## Step 4: Restart VS Code

1. Close all VS Code windows
2. Quit VS Code completely
3. Reopen VS Code and your project

## Step 5: Verify Setup

In your AI chat panel, ask:

> "What wireframe tools do you have available?"

The AI should list Wireweave tools:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Using with Wireweave VS Code Extension

For the best experience, also install the Wireweave VS Code Extension for:

- Syntax highlighting for `.wf` files
- Live preview of wireframes
- Error diagnostics

### Installation

1. Open VS Code Extensions (Cmd/Ctrl + Shift + X)
2. Search for "Wireweave"
3. Install the extension
4. Open any `.wf` file to see syntax highlighting

### Previewing Wireframes

1. Open a `.wf` file
2. Use Cmd/Ctrl + Shift + P
3. Search for "Wireweave: Preview"
4. Side panel shows live wireframe preview

## Usage Examples

### Generate and Preview

1. Ask AI: "Create a wireframe for a settings page"
2. Save the generated code as `settings.wf`
3. Use Wireweave extension to preview

### Workflow with Wireframes

```
1. Describe UI in chat
2. AI generates .wf code using MCP
3. Save to wireframes/ folder
4. Preview with Wireweave extension
5. Iterate with AI feedback
6. Implement based on wireframe
```

## Troubleshooting

### MCP Extension Not Detecting Server

1. Verify the MCP config file location
2. Check your extension's MCP settings
3. Ensure Node.js is in VS Code's PATH

### Path Issues on Different OS

If npx isn't found, use the full path:

::: code-group

```json [macOS (nvm)]
{
  "command": "/Users/you/.nvm/versions/node/v20.0.0/bin/npx"
}
```

```json [Windows]
{
  "command": "C:\\Program Files\\nodejs\\npx.cmd"
}
```

```json [Linux (nvm)]
{
  "command": "/home/you/.nvm/versions/node/v20.0.0/bin/npx"
}
```

:::

### VS Code Terminal PATH

If using nvm/fnm, ensure VS Code inherits your shell's PATH:

**macOS/Linux:**

```bash
# In ~/.zshrc or ~/.bashrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then restart VS Code from terminal:

```bash
code .
```

### Config File Not Loading

1. Validate JSON syntax
2. Check file permissions
3. Try global config (`~/.vscode/mcp.json`) vs project config

## Environment Variables

| Variable            | Required | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `WIREWEAVE_API_KEY` | Yes      | Your API key from Dashboard                         |
| `WIREWEAVE_API_URL` | No       | Custom API URL (default: https://api.wireweave.org) |

## Related Tools

| Tool                                                   | Purpose                       |
| ------------------------------------------------------ | ----------------------------- |
| [Wireweave VS Code Extension](/guide/vscode-extension) | Syntax highlighting & preview |
| [Markdown Plugin](/guide/markdown-plugin)              | Embed wireframes in docs      |

## Next Steps

- [VS Code Extension Guide](/guide/vscode-extension) - Full extension documentation
- [DSL Grammar](/reference/grammar) - Learn the wireframe syntax
- [Components Reference](/reference/components) - Available UI components
