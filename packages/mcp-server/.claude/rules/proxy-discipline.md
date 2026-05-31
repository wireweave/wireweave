---
paths:
  - 'src/**/*'
---

# proxy 규율 — thin dispatcher, 로직 금지

mcp-server 는 **thin dispatcher**. 도구 호출을 SDK 의 `dispatch()` 에 위임하고, 도구 분류·실행 로직을 자체적으로 가지지 않는다. 자체 가공 / 검증 / 캐시가 추가되면 SDK·api-server 와 drift 발생.

## 도구 호출 계약

도구는 **로컬 / 서버** 두 종류. 분류 권한은 mcp-server 에 없다 — `api-server/src/tool-definitions.ts` 의 `dispatch: 'local' | 'server'` 가 single source of truth 이고, SDK 가 그 메타데이터를 기준으로 분기한다.

| 분류      | 실행 경로                                                                 | 네트워크 호출 | 크레딧 차감        |
| --------- | ------------------------------------------------------------------------- | ------------- | ------------------ |
| 로컬 도구 | SDK `localDispatch` → `@wireweave/core` / `@wireweave/ux-rules` 직접 실행 | 없음          | 없음               |
| 서버 도구 | SDK `callApi` → `https://api.wireweave.org/<endpoint>` (HTTP)             | 1 회 HTTP     | api-server 가 차감 |

mcp-server 의 책임은 `CallToolRequestSchema` 핸들러에서 `dispatch(name, args, { apiConfig, endpoints })` 를 호출하고 결과를 그대로 반환하는 것뿐.

## 허용

- API 키 헤더 추가 (SDK 가 자동 주입 — `ApiConfig` 만 전달)
- 환경변수 (`WIREWEAVE_API_URL`, `WIREWEAVE_API_KEY`) 기반 `ApiConfig` 구성
- ListTools 시 `generated tools.ts` 그대로 노출 (로컬+서버 통합 목록 — 별도 병합 없음)
- 세션 lifecycle (stdio / streamable-http) 관리
- transport-level 로깅 (stdio 모드는 stderr / http 모드는 stdout)

## 금지

- 도구 분류를 mcp-server 가 결정 (로컬/서버 판단은 SDK 가 책임)
- 도구 호출 결과를 가공 / 추가 검증 / 합산 / 요약 / pretty-print
- 도구 input 을 mcp-server 에서 부분 검증 (SDK / api-server 가 책임 — 두 곳 검증은 drift)
- mcp-server 자체 캐시 / state
- mcp-server 만의 도구 추가 (`tool-definitions.ts` 등록 없이) — 단일 진실 공급원 위반
- 크레딧 차감 추적 (서버 도구는 api-server, 로컬 도구는 차감 없음 — mcp-server 는 모름)

## 호출 시퀀스

### 로컬 도구

```
MCP 호스트 → mcp-server (stdio / http)
            ↓
            CallToolRequestSchema 핸들러
            ↓
            SDK dispatch()
            ↓
            isLocalDispatchTool(name) === true
            ↓
            localDispatch(name, args)
            ↓
            @wireweave/core (parse / render / diff ...) 또는 @wireweave/ux-rules
            ↓
            LocalToolResult (그대로 MCP 응답)
```

### 서버 도구

```
MCP 호스트 → mcp-server (stdio / http)
            ↓
            CallToolRequestSchema 핸들러
            ↓
            SDK dispatch()
            ↓
            isLocalDispatchTool(name) === false → endpoints[name] 조회
            ↓
            SDK callApi()
            ↓
            HTTP POST/GET https://api.wireweave.org/<endpoint>
              + header: x-api-key: $WIREWEAVE_API_KEY
            ↓
            api-server 응답 (성공 / 에러)
            ↓
            LocalToolResult (그대로 MCP 응답 또는 isError=true)
```

## 에러 변환

서버 도구는 SDK 의 `callApi` 가 HTTP status 를 사용자 친화 메시지로 변환한 뒤 throw — `dispatch` 가 그 메시지를 `{ content: [...], isError: true }` 로 감싸 반환. mcp-server 는 추가 변환을 하지 않는다.

| HTTP 상태 | SDK 변환 메시지 (substring)                          |
| --------- | ---------------------------------------------------- |
| 401       | `Invalid API key. Get one at https://wireweave.org`  |
| 402       | `Insufficient credits.` (메시지 본문 포함)           |
| 403       | `Access denied. Upgrade your plan for this feature.` |
| 404       | (리소스별 메시지 — 예: project not found)            |
| 422       | api-server 의 zod 메시지 그대로                      |
| 429       | `Rate limit exceeded. Please wait and try again.`    |
| 5xx       | `Service temporarily unavailable`                    |
| network   | underlying Error 메시지 (예: `ECONNREFUSED`)         |

로컬 도구는 `LocalToolResult` 의 `isError: true` 로 분기 (parse 실패, ux validation 에러 등). 형식은 동일.

## SSE 도구 (스트리밍)

SSE 응답이 필요한 도구는 현재 SDK dispatch 에서 다루지 않는다. SSE 가 필요한 시점이 오면 SDK 가 그 책임을 갖고, mcp-server 는 그 결과를 MCP progress 이벤트로 그대로 중계만 한다. mcp-server 는 SSE 파서 / 콘텐츠 변환 / 합산을 수행하지 않는다.

## 절대 금지

- mcp-server 안에 LLM 호출 / DB 직접 / 외부 API 호출 (SDK·api-server 가 책임)
- 도구 분류 (`isLocal`) 를 mcp-server 가 자체 판단
- 도구 응답을 합산 / 요약 / pretty-print
- API 키 노출 (로그 / response)
- proxy / dispatch 호출 실패를 mock / fallback 으로 마스킹 — 호스트에 정직하게 전달
