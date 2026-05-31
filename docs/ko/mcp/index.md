# MCP 클라이언트 설정

이 섹션에서는 다양한 AI 어시스턴트에 Wireweave MCP 서버를 연결하는 방법을 안내합니다.

## MCP란?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP)은 AI 어시스턴트가 외부 도구 및 데이터 소스와 상호작용할 수 있게 해주는 개방형 표준입니다. Wireweave는 MCP 호환 클라이언트에서 와이어프레임 생성 기능을 사용할 수 있도록 MCP 서버를 제공합니다.

## 사전 준비

MCP 클라이언트를 설정하기 전에 다음이 필요합니다:

1. **API 키** - [Wireweave 대시보드](https://wireweave.org/dashboard/keys)에서 발급
2. **Node.js 18+** - npx로 MCP 서버를 실행하기 위해 필요
3. **MCP 호환 클라이언트** - Claude Desktop, Cursor, VS Code 등

## 지원 클라이언트

| 클라이언트                               | 상태      | 플랫폼                |
| ---------------------------------------- | --------- | --------------------- |
| [Claude Desktop](/ko/mcp/claude-desktop) | 완전 지원 | macOS, Windows        |
| [Cursor](/ko/mcp/cursor)                 | 완전 지원 | macOS, Windows, Linux |
| [VS Code](/ko/mcp/vscode)                | 완전 지원 | macOS, Windows, Linux |

## 빠른 시작

모든 클라이언트는 비슷한 설정 형식을 사용합니다:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "여기에-api-키-입력"
      }
    }
  }
}
```

클라이언트 간 주요 차이점:

- **설정 파일 위치** - 클라이언트마다 다른 경로에 설정 저장
- **설정 형식** - 일부 클라이언트는 추가 옵션 제공

자세한 설정 방법은 위 목록에서 클라이언트를 선택하세요.

## 사용 가능한 도구

설정이 완료되면 AI 어시스턴트에서 다음 와이어프레임 도구를 사용할 수 있습니다:

| 도구                         | 설명                  | 크레딧 |
| ---------------------------- | --------------------- | ------ |
| `wireweave_parse`            | DSL을 AST로 파싱      | 0      |
| `wireweave_validate`         | DSL 문법 검증         | 0      |
| `wireweave_render_html`      | HTML/CSS로 렌더링     | 0      |
| `wireweave_render_html_file` | 파일로 렌더링 및 저장 | 0      |
| `wireweave_grammar`          | DSL 문법 문서 조회    | 0      |

> v2.0부터 비-AI 도구는 모두 무료입니다. AI 생성 도구(`wireweave_ai_generate`, `wireweave_ai_generate_from_image`, `wireweave_ai_improve`)만 크레딧을 소비합니다.

## 문제 해결

### 자주 발생하는 문제

- **"API key not set"** - env 섹션의 `WIREWEAVE_API_KEY`가 올바르게 설정되었는지 확인
- **"Server not found"** - Node.js 18+ 설치 및 PATH 설정 확인
- **"Rate limit exceeded"** - 리셋까지 대기하거나 요금제 업그레이드

### 도움 받기

- [문제 해결 가이드](/ko/guide/mcp-server#troubleshooting) 확인
- [support@wireweave.org](mailto:support@wireweave.org)로 문의
