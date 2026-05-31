# MCP Server

The Wireweave MCP Server enables AI assistants to generate wireframes through the Model Context Protocol.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is a standard for connecting AI assistants to external tools and data sources. Wireweave provides an MCP server that exposes wireframe generation capabilities.

## Installation

### Get an API Key

1. Visit the [Wireweave Dashboard](https://wireweave.org)
2. Sign up or log in
3. Create a new API key
4. Copy the key for configuration

### Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the MCP server.

## Available Tools

The MCP server provides these tools to AI assistants:

### wireweave_parse

Parse DSL source code into an AST (Abstract Syntax Tree).

**Input:**

- `source` (string): Wireweave DSL code

**Output:**

- Parsed AST in JSON format

### wireweave_validate

Validate DSL syntax without generating output.

**Input:**

- `source` (string): Wireweave DSL code

**Output:**

- Validation result with any errors

### wireweave_render_html

Render DSL to HTML and CSS. Returns the full HTML content.

**Input:**

- `source` (string): Wireweave DSL code
- `theme` (string, optional): "light" or "dark"
- `fullDocument` (boolean, optional): Return complete HTML document

**Output:**

- Generated HTML and CSS

### wireweave_render_html_code

Render DSL to HTML code. Alias for `wireweave_render_html` with explicit naming.

**Input:**

- `source` (string): Wireweave DSL code
- `theme` (string, optional): "light" or "dark"
- `fullDocument` (boolean, optional): Return complete HTML document

**Output:**

- Generated HTML and CSS

### wireweave_render_html_file

Render DSL to HTML and save to a local file. Returns the file path instead of HTML content. Useful for previewing in a browser.

**Input:**

- `source` (string): Wireweave DSL code
- `theme` (string, optional): "light" or "dark"
- `outputDir` (string, optional): Output directory (default: system temp)
- `filename` (string, optional): Filename without extension

**Output:**

- File path to the saved HTML file

### wireweave_grammar

Get DSL grammar documentation.

**Input:** None

**Output:**

- Grammar reference and syntax documentation

## Usage Examples

Once configured, you can ask Claude to create wireframes:

> "Create a wireframe for a user profile page with avatar, bio, and recent activity"

> "Generate a login form with email, password, and social login buttons"

> "Make a dashboard wireframe with sidebar navigation and stats cards"

Claude will use the MCP tools to generate and render wireframes.

## Rate Limits

Rate limits depend on your subscription tier:

| Tier       | Per Minute | Per Day | Monthly   |
| ---------- | ---------- | ------- | --------- |
| Free       | 10         | 100     | 1,000     |
| Basic      | 30         | 500     | 10,000    |
| Pro        | 60         | 2,000   | 50,000    |
| Enterprise | 120        | 10,000  | Unlimited |

## Environment Variables

| Variable            | Required | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `WIREWEAVE_API_KEY` | Yes      | Your API key from Dashboard                         |
| `WIREWEAVE_API_URL` | No       | Custom API URL (default: https://api.wireweave.org) |

## Troubleshooting

### "API key not set" Error

Ensure your API key is correctly set in the environment:

```json
{
  "env": {
    "WIREWEAVE_API_KEY": "ww_your_key_here"
  }
}
```

### Server Not Loading

1. Check Claude Desktop logs for errors
2. Verify the config file is valid JSON
3. Restart Claude Desktop after changes

### Rate Limit Exceeded

If you hit rate limits:

- Wait for the limit to reset
- Consider upgrading your plan
- Optimize requests to reduce usage

## Next Steps

- [VS Code Extension](/guide/vscode-extension) - Local development
- [API Reference](/reference/api) - Direct API access
