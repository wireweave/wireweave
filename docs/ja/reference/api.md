# APIリファレンス

Wireweave APIサーバーの完全なAPIドキュメントです。

## ベースURL

```
https://api.wireweave.org
```

## 認証

すべての`/tools/*`エンドポイントは認証が必要です。APIキーを以下の方法で提供します：

### ヘッダー（推奨）

```bash
curl -H "x-api-key: your-api-key" https://api.wireweave.org/tools/parse
```

### Authorizationヘッダー

```bash
curl -H "Authorization: Bearer your-api-key" https://api.wireweave.org/tools/parse
```

### クエリパラメータ

```bash
curl "https://api.wireweave.org/tools/parse?api_key=your-api-key"
```

## レート制限

| ティア     | 分あたり | 日あたり | 月間クォータ |
| ---------- | -------- | -------- | ------------ |
| Free       | 10       | 100      | 1,000        |
| Basic      | 30       | 500      | 10,000       |
| Pro        | 60       | 2,000    | 50,000       |
| Enterprise | 120      | 10,000   | 無制限       |

### レート制限ヘッダー

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1699999999
```

## エンドポイント

---

### GET /health

ヘルスチェックエンドポイント（認証不要）。

**レスポンス：**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### POST /tools/parse

Wireweave DSLソースコードをASTにパースします。

**リクエスト：**

```bash
curl -X POST https://api.wireweave.org/tools/parse \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" primary }"}'
```

**リクエストボディ：**

| フィールド | タイプ | 必須 | 説明                      |
| ---------- | ------ | ---- | ------------------------- |
| source     | string | はい | Wireweave DSLソースコード |

**レスポンス：**

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

Wireweave DSL構文を検証します。

**リクエスト：**

```bash
curl -X POST https://api.wireweave.org/tools/validate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" }"}'
```

**リクエストボディ：**

| フィールド | タイプ | 必須 | 説明                      |
| ---------- | ------ | ---- | ------------------------- |
| source     | string | はい | Wireweave DSLソースコード |

**成功レスポンス：**

```json
{
  "valid": true
}
```

**エラーレスポンス：**

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

Wireweave DSLをHTMLにレンダリングします。

**リクエスト：**

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

**リクエストボディ：**

| フィールド   | タイプ  | 必須   | デフォルト | 説明                         |
| ------------ | ------- | ------ | ---------- | ---------------------------- |
| source       | string  | はい   | -          | Wireweave DSLソース          |
| theme        | string  | いいえ | "light"    | "light"または"dark"          |
| fullDocument | boolean | いいえ | false      | 完全なHTMLドキュメントを返す |

**レスポンス：**

```json
{
  "html": "<div class=\"page\">...</div>",
  "css": ".page { ... }"
}
```

`fullDocument: true`の場合：

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

---

### GET /tools/grammar

DSL文法ドキュメントを取得します。

**リクエスト：**

```bash
curl https://api.wireweave.org/tools/grammar \
  -H "x-api-key: your-api-key"
```

**レスポンス：**

```json
{
  "grammar": "...",
  "version": "1.0.0",
  "components": ["page", "card", "button", ...],
  "modifiers": ["primary", "secondary", ...]
}
```

## エラーレスポンス

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

## 次のステップ

- [MCPサーバーガイド](/ja/guide/mcp-server) - AI統合
- [Dashboard](https://wireweave.org) - APIキー管理
