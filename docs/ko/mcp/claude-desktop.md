# Claude Desktop 설정

이 가이드에서는 Claude Desktop에 Wireweave MCP 서버를 설정하는 방법을 안내합니다.

## 사전 준비

- [Claude Desktop](https://claude.ai/download) 설치
- Node.js 18+ 설치
- [대시보드](https://wireweave.org/dashboard/keys)에서 Wireweave API 키 발급

## 1단계: 설정 파일 위치 확인

Claude Desktop 설정 파일을 찾거나 생성합니다:

::: code-group

```bash [macOS]
# 설정 파일 위치
~/Library/Application Support/Claude/claude_desktop_config.json

# 필요시 디렉토리 생성
mkdir -p ~/Library/Application\ Support/Claude
```

```bash [Windows]
# 설정 파일 위치
%APPDATA%\Claude\claude_desktop_config.json

# 일반적으로 다음 경로
C:\Users\<사용자명>\AppData\Roaming\Claude\claude_desktop_config.json
```

:::

## 2단계: MCP 설정 추가

에디터에서 설정 파일을 열고 Wireweave MCP 서버를 추가합니다:

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
이미 다른 MCP 서버가 설정되어 있다면, `mcpServers` 객체에 `wireweave`를 추가하세요.
:::

### 여러 서버가 있는 전체 예시

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_여기에_api_키_입력"
      }
    },
    "other-server": {
      "command": "npx",
      "args": ["other-mcp-server"]
    }
  }
}
```

## 3단계: Claude Desktop 재시작

1. Claude Desktop을 완전히 종료 (시스템 트레이/메뉴바 확인)
2. Claude Desktop 다시 열기
3. MCP 서버가 자동으로 로드됩니다

## 4단계: 설정 확인

Claude에게 연결 확인을 요청합니다:

> "사용 가능한 와이어프레임 도구가 무엇인가요?"

Claude가 Wireweave 도구 목록을 응답해야 합니다:

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## 사용 예시

설정이 완료되면 다음과 같은 요청을 해보세요:

### 간단한 와이어프레임 생성

> "이메일, 비밀번호 필드와 제출 버튼이 있는 로그인 페이지 와이어프레임을 만들어주세요"

### 대시보드 레이아웃 생성

> "사이드바, 헤더, 세 개의 통계 카드가 있는 대시보드 와이어프레임을 디자인해주세요"

### 모바일 우선 디자인

> "검색과 필터가 있는 상품 목록 페이지의 모바일 친화적 와이어프레임을 만들어주세요"

## 문제 해결

### 서버가 로드되지 않음

1. **설정 문법 확인** - 유효한 JSON인지 확인 (후행 쉼표 없음)
2. **파일 위치 확인** - 올바른 디렉토리에 설정 파일 있는지 확인
3. **Claude Desktop 로그 확인**:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### "API key not set" 오류

API 키 형식 확인:

```json
{
  "env": {
    "WIREWEAVE_API_KEY": "ww_xxxxxxxxxxxx"
  }
}
```

키는 `ww_` 접두사로 시작해야 합니다.

### "npx command not found"

Node.js가 설치되어 있고 PATH에 등록되어 있는지 확인:

```bash
# Node.js 버전 확인
node --version  # 18 이상이어야 함

# npx 사용 가능 여부 확인
npx --version
```

### 요청 제한 문제

요청 제한 오류가 발생하면:

- 무료 티어: 분당 10회, 월 1,000회
- 더 높은 제한은 [요금제 업그레이드](https://wireweave.org/pricing)

## 환경 변수

| 변수                | 필수   | 설명                                               |
| ------------------- | ------ | -------------------------------------------------- |
| `WIREWEAVE_API_KEY` | 예     | 대시보드에서 발급받은 API 키                       |
| `WIREWEAVE_API_URL` | 아니오 | 커스텀 API URL (기본값: https://api.wireweave.org) |

## 다음 단계

- [사용 가능한 도구](/ko/guide/mcp-server#available-tools) - 각 도구의 기능 알아보기
- [DSL 문법](/ko/reference/grammar) - 와이어프레임 문법 이해하기
- [예제](/ko/guide/getting-started#examples) - 더 많은 와이어프레임 예제 보기
