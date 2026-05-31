# Cursor 설정

이 가이드에서는 Cursor IDE에 Wireweave MCP 서버를 설정하는 방법을 안내합니다.

## 사전 준비

- [Cursor](https://cursor.sh/) 설치
- Node.js 18+ 설치
- [대시보드](https://wireweave.org/dashboard/keys)에서 Wireweave API 키 발급

## 1단계: 설정 파일 위치 확인

Cursor MCP 설정 파일을 찾거나 생성합니다:

::: code-group

```bash [macOS]
# 설정 파일 위치
~/.cursor/mcp.json

# 필요시 디렉토리 생성
mkdir -p ~/.cursor
```

```bash [Windows]
# 설정 파일 위치
%USERPROFILE%\.cursor\mcp.json

# 일반적으로 다음 경로
C:\Users\<사용자명>\.cursor\mcp.json
```

```bash [Linux]
# 설정 파일 위치
~/.cursor/mcp.json

# 필요시 디렉토리 생성
mkdir -p ~/.cursor
```

:::

## 2단계: MCP 설정 추가

`mcp.json` 파일을 생성하거나 편집하여 Wireweave MCP 서버를 추가합니다:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_여기에_api_키_입력"
      }
    }
  }
}
```

::: tip
Cursor는 MCP를 기본 지원합니다. MCP 지원이 활성화된 최신 버전을 사용하세요.
:::

### 대안: 프로젝트 수준 설정

프로젝트별로 MCP 설정을 추가할 수도 있습니다:

```bash
# 프로젝트 루트에
.cursor/mcp.json
```

이를 통해 프로젝트마다 다른 API 키를 사용할 수 있습니다.

## 3단계: Cursor 재시작

1. 모든 Cursor 창 닫기
2. Cursor 완전히 종료
3. Cursor와 프로젝트 다시 열기

## 4단계: 설정 확인

Cursor의 AI 채팅에서 요청합니다:

> "사용 가능한 와이어프레임 도구가 무엇인가요?"

Cursor가 Wireweave 도구를 표시해야 합니다:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Cursor에서 사용하기

### 인라인 와이어프레임 생성

코딩 중 Cmd/Ctrl+K를 사용하여 요청:

> "이 컴포넌트의 UI 와이어프레임을 만들어줘"

### Composer에서

Composer (Cmd/Ctrl+I)에서 더 큰 와이어프레임 요청:

> "다음 요소를 포함한 완전한 대시보드 와이어프레임을 디자인해줘:
>
> - 사이드바 네비게이션
> - 사용자 프로필이 있는 헤더
> - 차트가 있는 메인 컨텐츠 영역
> - 푸터"

### 컨텍스트 기반 생성

기존 코드를 선택하고 매칭되는 와이어프레임 생성 요청:

> "이 React 컴포넌트 구조에 맞는 와이어프레임을 생성해줘"

## Cursor 사용 모범 사례

### 워크스페이스 통합

1. 와이어프레임 파일(`.wf`)을 `wireframes/` 디렉토리에 보관
2. Cursor의 AI를 사용하여 디자인 반복
3. VS Code 확장 또는 브라우저로 미리보기

### 예시 워크플로우

```
1. Cursor에 요청: "사용자 프로필 페이지 와이어프레임 만들어줘"
2. 생성된 .wf 파일 검토
3. 요청: "다크 모드 버전 추가해줘"
4. 만족할 때까지 반복
5. 구현 참조용으로 와이어프레임 사용
```

## 문제 해결

### MCP가 인식되지 않음

1. Cursor 버전이 MCP를 지원하는지 확인 (릴리즈 노트 확인)
2. 설정 파일 위치와 문법 확인
3. Cursor 완전히 재시작

### "Command not found: npx"

Cursor가 Node.js 설치에 접근할 수 있어야 합니다:

```bash
# Node.js 접근 가능 여부 확인
which npx  # macOS/Linux
where npx  # Windows
```

nvm/fnm을 사용하는 경우 전체 경로를 지정해야 할 수 있습니다:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "/Users/사용자/.nvm/versions/node/v20.0.0/bin/npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_여기에_api_키_입력"
      }
    }
  }
}
```

### 설정이 로드되지 않음

1. JSON 문법 확인 (JSON 검증기 사용)
2. 파일 권한이 읽기를 허용하는지 확인
3. 프로젝트 설정이 작동하지 않으면 전역 설정 시도

### 디버그 모드

상세 로깅 활성화:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_여기에_api_키_입력",
        "DEBUG": "wireweave:*"
      }
    }
  }
}
```

## 환경 변수

| 변수                | 필수   | 설명                                               |
| ------------------- | ------ | -------------------------------------------------- |
| `WIREWEAVE_API_KEY` | 예     | 대시보드에서 발급받은 API 키                       |
| `WIREWEAVE_API_URL` | 아니오 | 커스텀 API URL (기본값: https://api.wireweave.org) |
| `DEBUG`             | 아니오 | 디버그 로깅 활성화 (`wireweave:*`)                 |

## 다음 단계

- [DSL 문법](/ko/reference/grammar) - 와이어프레임 문법 배우기
- [VS Code 확장](/ko/guide/vscode-extension) - 로컬에서 와이어프레임 미리보기
- [컴포넌트 레퍼런스](/ko/reference/components) - 사용 가능한 UI 컴포넌트
