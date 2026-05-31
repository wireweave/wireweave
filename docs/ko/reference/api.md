# API 레퍼런스

Wireweave API 서버의 완전한 API 문서입니다.

## 기본 URL

```
https://api.wireweave.org
```

## 인증

모든 `/tools/*` 엔드포인트는 인증이 필요합니다. API 키를 다음 방법으로 제공합니다:

### 헤더 (권장)

```bash
curl -H "x-api-key: your-api-key" https://api.wireweave.org/tools/parse
```

### Authorization 헤더

```bash
curl -H "Authorization: Bearer your-api-key" https://api.wireweave.org/tools/parse
```

### 쿼리 파라미터

```bash
curl "https://api.wireweave.org/tools/parse?api_key=your-api-key"
```

## 요청 제한

| 등급       | 분당 | 일일   | 월간 할당량 |
| ---------- | ---- | ------ | ----------- |
| Free       | 10   | 100    | 1,000       |
| Basic      | 30   | 500    | 10,000      |
| Pro        | 60   | 2,000  | 50,000      |
| Enterprise | 120  | 10,000 | 무제한      |

### 요청 제한 헤더

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1699999999
```

## 엔드포인트

---

### GET /health

헬스 체크 엔드포인트 (인증 불필요).

**응답:**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

### POST /tools/parse

Wireweave DSL 소스 코드를 AST로 파싱합니다.

**요청:**

```bash
curl -X POST https://api.wireweave.org/tools/parse \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" primary }"}'
```

**요청 본문:**

| 필드   | 타입   | 필수 | 설명                    |
| ------ | ------ | ---- | ----------------------- |
| source | string | 예   | Wireweave DSL 소스 코드 |

**응답:**

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

Wireweave DSL 문법을 검증합니다.

**요청:**

```bash
curl -X POST https://api.wireweave.org/tools/validate \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"source": "page { button \"Click\" }"}'
```

**요청 본문:**

| 필드   | 타입   | 필수 | 설명                    |
| ------ | ------ | ---- | ----------------------- |
| source | string | 예   | Wireweave DSL 소스 코드 |

**성공 응답:**

```json
{
  "valid": true
}
```

**오류 응답:**

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

Wireweave DSL을 HTML로 렌더링합니다.

**요청:**

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

**요청 본문:**

| 필드         | 타입    | 필수   | 기본값  | 설명                  |
| ------------ | ------- | ------ | ------- | --------------------- |
| source       | string  | 예     | -       | Wireweave DSL 소스    |
| theme        | string  | 아니오 | "light" | "light" 또는 "dark"   |
| fullDocument | boolean | 아니오 | false   | 완전한 HTML 문서 반환 |

**응답:**

```json
{
  "html": "<div class=\"page\">...</div>",
  "css": ".page { ... }"
}
```

`fullDocument: true` 인 경우:

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

---

### GET /tools/grammar

DSL 문법 문서를 가져옵니다.

**요청:**

```bash
curl https://api.wireweave.org/tools/grammar \
  -H "x-api-key: your-api-key"
```

**응답:**

```json
{
  "grammar": "...",
  "version": "1.0.0",
  "components": ["page", "card", "button", ...],
  "modifiers": ["primary", "secondary", ...]
}
```

## 오류 응답

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

## 다음 단계

- [MCP 서버 가이드](/ko/guide/mcp-server) - AI 통합
- [Dashboard](https://wireweave.org) - API 키 관리
