# API Reference

Complete API documentation for the Wireweave API Server.

## Base URL

```
https://api.wireweave.org
```

## Authentication

All `/tools/*` endpoints require authentication. Provide your API key via:

### Header (Recommended)

```bash
curl -H "x-api-key: your-api-key" https://api.wireweave.org/tools/parse
```

### Authorization Header

```bash
curl -H "Authorization: Bearer your-api-key" https://api.wireweave.org/tools/parse
```

### Query Parameter

```bash
curl "https://api.wireweave.org/tools/parse?api_key=your-api-key"
```

## Rate Limits

| Tier       | Per Minute | Per Day | Monthly Quota |
| ---------- | ---------- | ------- | ------------- |
| Free       | 10         | 100     | 1,000         |
| Basic      | 30         | 500     | 10,000        |
| Pro        | 60         | 2,000   | 50,000        |
| Enterprise | 120        | 10,000  | Unlimited     |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1699999999
```

## Endpoints

---

### GET /health

Health check endpoint (no authentication required).

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### POST /tools/parse

Parse Wireweave DSL source code into an AST.

**Request:**

```bash
curl -X POST https://api.wireweave.org/tools/parse \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" primary }"}'
```

**Request Body:**

| Field  | Type   | Required | Description               |
| ------ | ------ | -------- | ------------------------- |
| source | string | Yes      | Wireweave DSL source code |

**Response:**

```json
{
  "ast": {
    "type": "Document",
    "children": [
      {
        "type": "Page",
        "children": [
          {
            "type": "Button",
            "label": "Click",
            "modifiers": ["primary"]
          }
        ]
      }
    ]
  }
}
```

---

### POST /tools/validate

Validate Wireweave DSL syntax.

**Request:**

```bash
curl -X POST https://api.wireweave.org/tools/validate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" }"}'
```

**Request Body:**

| Field  | Type   | Required | Description               |
| ------ | ------ | -------- | ------------------------- |
| source | string | Yes      | Wireweave DSL source code |

**Success Response:**

```json
{
  "valid": true
}
```

**Error Response:**

```json
{
  "valid": false,
  "errors": [
    {
      "message": "Unexpected token",
      "line": 1,
      "column": 10
    }
  ]
}
```

---

### POST /tools/render/html

Render Wireweave DSL to HTML.

**Request:**

```bash
curl -X POST https://api.wireweave.org/tools/render/html \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "source": "page { card { heading \"Hello\" } }",
    "theme": "light",
    "fullDocument": false
  }'
```

**Request Body:**

| Field        | Type    | Required | Default | Description                   |
| ------------ | ------- | -------- | ------- | ----------------------------- |
| source       | string  | Yes      | -       | Wireweave DSL source          |
| theme        | string  | No       | "light" | "light" or "dark"             |
| fullDocument | boolean | No       | false   | Return complete HTML document |

**Response:**

```json
{
  "html": "<div class=\"page\">...</div>",
  "css": ".page { ... }"
}
```

When `fullDocument: true`:

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

---

### GET /tools/grammar

Get DSL grammar documentation.

**Request:**

```bash
curl https://api.wireweave.org/tools/grammar \
  -H "x-api-key: your-api-key"
```

**Response:**

```json
{
  "grammar": "...",
  "version": "1.0.0",
  "components": ["page", "card", "button", ...],
  "modifiers": ["primary", "secondary", ...]
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid source code",
  "details": "Syntax error at line 1, column 5"
}
```

### 401 Unauthorized

```json
{
  "error": "API key required"
}
```

### 403 Forbidden

```json
{
  "error": "Invalid API key"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

## Next Steps

- [MCP Server Guide](/guide/mcp-server) - AI integration
- [Dashboard](https://wireweave.org) - Manage API keys
