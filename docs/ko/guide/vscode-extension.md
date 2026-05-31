# VS Code 확장

Wireweave VS Code 확장은 `.wf` / `.wireframe` 파일에 대해 구문 강조, 실시간 미리보기, 코드 자동 완성, Wireweave AI 에이전트 통합을 제공합니다.

> **v2.0 사전 릴리스.** AI 에이전트 통합(생성/개선)과 대시보드 로그인은 `2.0.0-beta.0`부터 제공됩니다. VS Code의 **사전 릴리스 버전 설치(Install Pre-release Version)** 로 사용하거나, 안정 버전을 원하면 `1.x` 최신을 유지하세요.

## 설치

### VS Code Marketplace

1. VS Code 확장 뷰 열기 (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. "Wireweave" 검색
3. 안정 버전은 **Install**, `2.0-beta`를 시도하려면 **Install Pre-release Version** 클릭

### 수동 설치

```bash
code --install-extension wireweave.wireweave-vscode
```

## 기능

### 구문 강조 / 호버 / 자동 완성

`.wf` 또는 `.wireframe` 파일을 열면 다음을 사용할 수 있습니다:

- 컴포넌트 키워드 강조 (`page`, `card`, `button`, …)
- 컴포넌트와 속성에 대한 호버 문서
- 컴포넌트 이름, 수정자, 속성 키 자동 완성
- Problems 패널의 실시간 문법 오류 진단

### 실시간 미리보기

1. `.wf` 파일 열기
2. `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows) 로 미리보기 열기, 또는 `Cmd+K V` 로 분할 패널 열기
3. 코드를 편집하면 미리보기가 자동 갱신됩니다

### AI 생성 (v2.0)

자연어 프롬프트에서 와이어프레임 생성:

- 단축키: `Cmd+K Cmd+W` (Mac) / `Ctrl+K Ctrl+W` (Windows)
- 또는 명령 팔레트에서 **Wireweave: AI Generate** 실행

활성 와이어프레임 에디터가 있으면 생성된 DSL이 그 내용을 대체하고, 없으면 새 untitled `.wf` 문서가 열립니다. 결과는 생성되면서 스트리밍됩니다.

### AI 개선 (v2.0)

현재 와이어프레임(선택 영역 또는 전체 문서)을 지시문으로 다듬습니다:

- 명령 팔레트에서 **Wireweave: AI Improve** 실행
- `vscode.diff` 뷰가 열립니다 — 변경을 좌우로 검토하고 적용 여부를 결정

### 로그인 / 사용량 (v2.0)

AI 기능은 Wireweave 대시보드 인증이 필요합니다:

- **Wireweave: Login** 실행 → 브라우저에서 `dashboard.wireweave.org/auth/cli?source=vscode` 열림
- 대시보드가 일회용 토큰을 발급하며, 확장은 이를 **VS Code SecretStorage** 의 `wireweave.token` 키에 저장합니다. 이 확장의 토큰은 `~/.wireweave/config.json` 에 기록되지 않습니다.
- **Wireweave: Show Quota** 로 현재 AI 사용량(`used/limit` 및 리셋 시각)을 확인

### HTML 내보내기

**Wireweave: Export as HTML** 로 렌더된 HTML을 파일에 저장합니다.

## 명령

| 명령                              | 단축키                          | 설명                                     |
| --------------------------------- | ------------------------------- | ---------------------------------------- |
| `Wireweave: Open Preview`         | —                               | 현재 패널에서 미리보기 열기              |
| `Wireweave: Open Preview to Side` | `Cmd+K V` / `Ctrl+K V`          | 분할 뷰에서 미리보기 열기                |
| `Wireweave: Export as HTML`       | —                               | 현재 와이어프레임을 HTML 파일로 내보내기 |
| `Wireweave: AI Generate`          | `Cmd+K Cmd+W` / `Ctrl+K Ctrl+W` | 자연어 프롬프트에서 DSL 생성             |
| `Wireweave: AI Improve`           | —                               | diff 뷰로 현재 와이어프레임 개선         |
| `Wireweave: Login`                | —                               | Wireweave 대시보드 토큰으로 로그인       |
| `Wireweave: Show Quota`           | —                               | 현재 AI 사용량 및 리셋 시각 표시         |

## 파일 연결

확장은 `.wf` / `.wireframe` 파일과 자동 연결됩니다. 수동 설정:

```json
{
  "files.associations": {
    "*.wf": "wireframe",
    "*.wireframe": "wireframe"
  }
}
```

## 설정

VS Code 설정에서 `Wireweave` 를 검색해 미리보기 동작과 API 엔드포인트를 조정할 수 있습니다. AI 토큰은 **Wireweave: Login** 으로 관리되며 SecretStorage에 저장됩니다 — `settings.json` 에 노출하지 마세요.

## 문제 해결

### 미리보기가 표시되지 않음

1. DSL 문법 오류 확인 (Problems 패널)
2. VS Code 재시작 (`Cmd+Shift+P` → "Reload Window")
3. Output 패널 확인 (보기 → 출력 → Wireweave)

### AI 명령이 "로그인되지 않음" 으로 실패

**Wireweave: Login** 으로 대시보드 토큰을 받으세요. 토큰은 SecretStorage의 `wireweave.token` 에 저장됩니다. **Login** 을 다시 실행하면 토큰이 갱신됩니다.

### 구문 강조가 작동하지 않음

1. 파일 확장자가 `.wf` 또는 `.wireframe` 인지 확인
2. 상태 표시줄의 언어 모드가 "Wireframe" 인지 확인
3. 확장 재설치

## 다음 단계

- [마크다운 플러그인](/ko/guide/markdown-plugin) — 문서에 와이어프레임 삽입
- [MCP 서버](/ko/guide/mcp-server) — 다른 클라이언트용 AI 통합
- [v2.0 릴리스 노트](/releases/v2.0-beta) — AI 에이전트 릴리스의 변경 사항
