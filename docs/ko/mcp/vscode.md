# VS Code 설정

이 가이드에서는 Visual Studio Code에 Wireweave MCP 서버를 설정하는 방법을 안내합니다.

## 사전 준비

- [VS Code](https://code.visualstudio.com/) 설치
- MCP 호환 확장 (예: MCP 지원 GitHub Copilot 확장)
- Node.js 18+ 설치
- [대시보드](https://wireweave.org/dashboard/keys)에서 Wireweave API 키 발급

::: info
VS Code 자체는 MCP를 기본 지원하지 않습니다. MCP 지원 GitHub Copilot 확장 또는 다른 MCP 호환 AI 확장이 필요합니다.
:::

## 1단계: 설정 파일 위치 확인

VS Code MCP 설정 파일을 찾거나 생성합니다:

::: code-group

```bash [macOS]
# 설정 파일 위치
~/.vscode/mcp.json

# 필요시 디렉토리 생성
mkdir -p ~/.vscode
```

```bash [Windows]
# 설정 파일 위치
%USERPROFILE%\.vscode\mcp.json

# 일반적으로 다음 경로
C:\Users\<사용자명>\.vscode\mcp.json
```

```bash [Linux]
# 설정 파일 위치
~/.vscode/mcp.json

# 필요시 디렉토리 생성
mkdir -p ~/.vscode
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

### 프로젝트 수준 설정

프로젝트별 설정을 위해 워크스페이스에 `.vscode/mcp.json`을 생성합니다:

```bash
프로젝트/
├── .vscode/
│   └── mcp.json    # 프로젝트별 MCP 설정
├── src/
└── wireframes/
```

## 3단계: AI 확장 설정

사용하는 MCP 호환 확장에 따라 추가 설정이 필요할 수 있습니다:

### GitHub Copilot (MCP 지원 시)

1. VS Code 설정 열기 (Cmd/Ctrl + ,)
2. "Copilot MCP" 검색
3. MCP 서버 지원 활성화
4. VS Code 다시 로드

### 기타 MCP 확장

MCP 서버 로드를 위한 확장별 문서를 참조하세요.

## 4단계: VS Code 재시작

1. 모든 VS Code 창 닫기
2. VS Code 완전히 종료
3. VS Code와 프로젝트 다시 열기

## 5단계: 설정 확인

AI 채팅 패널에서 요청합니다:

> "사용 가능한 와이어프레임 도구가 무엇인가요?"

AI가 Wireweave 도구 목록을 표시해야 합니다:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Wireweave VS Code 확장과 함께 사용

최상의 경험을 위해 Wireweave VS Code 확장도 설치하세요:

- `.wf` 파일 구문 강조
- 와이어프레임 실시간 미리보기
- 오류 진단

### 설치

1. VS Code 확장 열기 (Cmd/Ctrl + Shift + X)
2. "Wireweave" 검색
3. 확장 설치
4. `.wf` 파일을 열어 구문 강조 확인

### 와이어프레임 미리보기

1. `.wf` 파일 열기
2. Cmd/Ctrl + Shift + P 사용
3. "Wireweave: Preview" 검색
4. 사이드 패널에 실시간 와이어프레임 미리보기 표시

## 사용 예시

### 생성 및 미리보기

1. AI에 요청: "설정 페이지 와이어프레임 만들어줘"
2. 생성된 코드를 `settings.wf`로 저장
3. Wireweave 확장으로 미리보기

### 와이어프레임 워크플로우

```
1. 채팅에서 UI 설명
2. AI가 MCP를 사용하여 .wf 코드 생성
3. wireframes/ 폴더에 저장
4. Wireweave 확장으로 미리보기
5. AI 피드백으로 반복
6. 와이어프레임 기반으로 구현
```

## 문제 해결

### MCP 확장이 서버를 감지하지 못함

1. MCP 설정 파일 위치 확인
2. 확장의 MCP 설정 확인
3. VS Code의 PATH에 Node.js가 있는지 확인

### OS별 경로 문제

npx를 찾을 수 없는 경우 전체 경로 사용:

::: code-group

```json [macOS (nvm)]
{
  "command": "/Users/사용자/.nvm/versions/node/v20.0.0/bin/npx"
}
```

```json [Windows]
{
  "command": "C:\\Program Files\\nodejs\\npx.cmd"
}
```

```json [Linux (nvm)]
{
  "command": "/home/사용자/.nvm/versions/node/v20.0.0/bin/npx"
}
```

:::

### VS Code 터미널 PATH

nvm/fnm 사용 시 VS Code가 쉘의 PATH를 상속하도록 설정:

**macOS/Linux:**

```bash
# ~/.zshrc 또는 ~/.bashrc에
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

그런 다음 터미널에서 VS Code 재시작:

```bash
code .
```

### 설정 파일이 로드되지 않음

1. JSON 문법 검증
2. 파일 권한 확인
3. 전역 설정(`~/.vscode/mcp.json`) vs 프로젝트 설정 시도

## 환경 변수

| 변수                | 필수   | 설명                                               |
| ------------------- | ------ | -------------------------------------------------- |
| `WIREWEAVE_API_KEY` | 예     | 대시보드에서 발급받은 API 키                       |
| `WIREWEAVE_API_URL` | 아니오 | 커스텀 API URL (기본값: https://api.wireweave.org) |

## 관련 도구

| 도구                                                 | 목적                       |
| ---------------------------------------------------- | -------------------------- |
| [Wireweave VS Code 확장](/ko/guide/vscode-extension) | 구문 강조 및 미리보기      |
| [마크다운 플러그인](/ko/guide/markdown-plugin)       | 문서에 와이어프레임 임베드 |

## 다음 단계

- [VS Code 확장 가이드](/ko/guide/vscode-extension) - 전체 확장 문서
- [DSL 문법](/ko/reference/grammar) - 와이어프레임 문법 배우기
- [컴포넌트 레퍼런스](/ko/reference/components) - 사용 가능한 UI 컴포넌트
