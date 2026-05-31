# MCP 서버

Wireweave MCP 서버를 사용하면 Claude 및 기타 AI 어시스턴트와 Wireweave를 통합할 수 있습니다.

## MCP란?

MCP(Model Context Protocol)는 AI 모델이 외부 도구 및 서비스와 상호작용할 수 있게 해주는 프로토콜입니다. Wireweave MCP 서버는 AI 어시스턴트가 대화를 통해 와이어프레임을 생성할 수 있게 합니다.

## 설치

### 1. API 키 발급

[Dashboard](https://wireweave.org)에서 API 키를 발급받습니다.

### 2. Claude Desktop 설정

Claude Desktop 설정 파일에 MCP 서버를 추가합니다:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 3. Claude Desktop 재시작

설정 변경 후 Claude Desktop을 재시작합니다.

## 사용 방법

Claude에게 와이어프레임 생성을 요청하면 됩니다:

- "로그인 페이지 와이어프레임 만들어줘"
- "대시보드 레이아웃 설계해줘"
- "이커머스 상품 목록 페이지 보여줘"

## 사용 가능한 도구

MCP 서버는 다음 도구를 제공합니다:

### wireweave_render_html

와이어프레임을 HTML로 렌더링합니다. 전체 HTML 콘텐츠를 반환합니다.

```
입력:
- source: Wireweave DSL 소스 코드
- theme: "light" 또는 "dark" (선택)
- fullDocument: 전체 HTML 문서 반환 여부 (선택)

출력:
- 렌더링된 HTML 및 CSS
```

### wireweave_render_html_code

`wireweave_render_html`과 동일. 명시적인 이름의 별칭입니다.

### wireweave_render_html_file

와이어프레임을 HTML로 렌더링하고 로컬 파일로 저장합니다. 브라우저에서 미리보기할 때 유용합니다.

```
입력:
- source: Wireweave DSL 소스 코드
- theme: "light" 또는 "dark" (선택)
- outputDir: 출력 디렉토리 (기본: 시스템 임시 폴더)
- filename: 파일명 (확장자 제외)

출력:
- 저장된 HTML 파일 경로
```

### wireweave_validate

Wireweave DSL 문법을 검증합니다.

```
입력:
- source: Wireweave DSL 소스 코드

출력:
- valid: 유효 여부
- errors: 오류 목록 (있는 경우)
```

### wireweave_grammar

DSL 문법 문서를 가져옵니다.

```
출력:
- 문법 설명
- 사용 가능한 컴포넌트 목록
- 수정자 목록
```

## 예제 대화

**사용자**: 간단한 로그인 페이지 와이어프레임 만들어줘

**Claude**: 네, 로그인 페이지 와이어프레임을 만들겠습니다.

```wireframe
page "Login" centered {
  card w=400 p=6 {
    title "Sign In" level=2 align=center
    input "Email" inputType=email
    input "Password" inputType=password
    checkbox "Remember me"
    button "Sign In" primary
    divider my=4
    text "Don't have an account?" align=center
    link "Sign Up" align=center
  }
}
```

[와이어프레임 이미지 렌더링]

## 문제 해결

### 서버가 연결되지 않음

1. API 키가 올바른지 확인
2. Claude Desktop 재시작
3. 설정 파일 경로 확인

### 렌더링 실패

1. DSL 문법 확인
2. API 사용량 제한 확인
3. 네트워크 연결 상태 확인

## 다음 단계

- [VS Code 확장](/ko/guide/vscode-extension) - 에디터 통합
- [API 레퍼런스](/ko/reference/api) - API 상세 문서
