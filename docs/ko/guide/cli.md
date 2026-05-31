# CLI

Wireweave CLI(`@wireweave/cli`)는 Wireweave DSL의 커맨드라인 컴패니언입니다. 파서, 렌더러, UX 룰, 익스포터, 분석기를 로컬에서 — 네트워크 왕복 없이 — 실행하며, 인증이 필요한 명령(인증 상태, 향후 릴리스의 agent / 클라우드 호출)에서는 Wireweave API에 로그인합니다.

> **v0.1.0 — 베타.** npm의 `beta` dist-tag 로 게시되어 있습니다. `1.0.0` 이전에 명령 형태가 변경될 수 있습니다.

## 설치

```bash
npm install -g @wireweave/cli@beta
```

Node.js 18 이상 필요. 바이너리 이름은 `wireweave`입니다.

설치 확인:

```bash
wireweave --version
wireweave --help
```

## 인증

`login` 은 API 키를 Wireweave API 에 검증한 뒤 `~/.wireweave/config.json` 에 저장하여 이후 세션에서 재사용합니다.

```bash
# 대화형 — stdin 으로 API 키 입력
wireweave login

# 비대화형 — 플래그 또는 환경변수로 전달
wireweave login --api-key <KEY>
WIREWEAVE_API_KEY=<KEY> wireweave login

# 셀프 호스팅 API 지정
wireweave login --api-url https://api.example.com
```

저장된 자격 확인 / 해제:

```bash
wireweave whoami   # 계정 이메일 + 마스킹된 키 표시
wireweave logout   # ~/.wireweave/config.json 삭제
```

API 키는 [Wireweave 대시보드 → Keys](https://wireweave.org/dashboard/keys) 페이지에서 발급합니다.

## 로컬 명령

다음 명령은 완전 오프라인입니다 — `@wireweave/core` 와 `@wireweave/ux-rules` 를 같은 프로세스 내에서 로드하며 API 를 호출하지 않습니다.

### `render` — DSL → HTML

```bash
wireweave render design.wf
wireweave render design.wf -o design.html
wireweave render design.wf --theme dark --full-document
```

| 옵션              | 용도                                                 |
| ----------------- | ---------------------------------------------------- |
| `-o, --output`    | HTML 을 stdout 대신 파일로 저장                      |
| `--theme <name>`  | `light` (기본) 또는 `dark`                           |
| `--full-document` | 완전한 `<!doctype html>` 문서 출력 (기본은 fragment) |

### `parse` — DSL → AST

```bash
wireweave parse design.wf > design.ast.json
```

파싱된 AST 를 JSON 으로 출력. 다른 도구와 파이프할 때 유용합니다.

### `validate` — 문법 검사

```bash
wireweave validate design.wf
wireweave validate design.wf --strict   # 알 수 없는 속성 거부
```

문법 오류 시 0이 아닌 종료 코드. CI 에서 커밋 게이트로 사용 가능합니다.

### `validate-ux` — UX 모범 규칙 검사

```bash
wireweave validate-ux design.wf
wireweave validate-ux design.wf --format summary
wireweave validate-ux design.wf --categories accessibility,usability --min-severity warning
wireweave validate-ux design.wf --disabled-rules form/label-association --max-issues 50
```

| 옵션                      | 용도                                             |
| ------------------------- | ------------------------------------------------ |
| `--categories <list>`     | 콤마 구분 룰 카테고리 (예: `accessibility,form`) |
| `--min-severity <level>`  | `error` \| `warning` \| `info`                   |
| `--max-issues <n>`        | 이슈 개수 상한                                   |
| `--disabled-rules <list>` | 건너뛸 룰 ID (콤마 구분)                         |
| `--format <fmt>`          | `json` (기본) 또는 `summary`                     |

### `list-components` — DSL 컴포넌트 카탈로그

```bash
wireweave list-components
wireweave list-components --category form
wireweave list-components --format json
```

`@wireweave/language-data` 에 정의된 모든 컴포넌트의 카테고리와 속성 요약을 나열합니다.

### `analyze` — 와이어프레임 통계

```bash
wireweave analyze design.wf
wireweave analyze design.wf --format summary
wireweave analyze design.wf --no-accessibility --no-complexity
```

컴포넌트 분포, 접근성 커버리지, 복잡도, 레이아웃, 콘텐츠 통계를 보고합니다. 각 축은 `--no-<axis>` 로 비활성화할 수 있습니다.

### `diff` — 두 와이어프레임 비교

```bash
wireweave diff old.wf new.wf
wireweave diff old.wf new.wf --ignore-attributes
wireweave diff old.wf new.wf --ignore-order --format summary
```

두 AST 트리의 구조적 diff. 기본은 `json` 이며, `--format summary` 로 사람이 읽기 쉬운 형식 사용 가능.

### `export-json` — AST 를 JSON 으로

```bash
wireweave export-json design.wf -o design.json
wireweave export-json design.wf --include-locations
wireweave export-json design.wf --no-pretty-print
```

### `export-figma` — Figma 호환 JSON

```bash
wireweave export-figma design.wf -o design.figma.json
```

Wireweave 플러그인을 통해 Figma 로 임포트 가능한 JSON 페이로드를 출력합니다 (export 전용 — 역방향 round-trip 미지원).

## 환경변수

| 변수                | 기본값                      | 용도                                                    |
| ------------------- | --------------------------- | ------------------------------------------------------- |
| `WIREWEAVE_API_URL` | `https://api.wireweave.org` | API 베이스 URL 오버라이드 (셀프 호스팅 / 스테이징 / CI) |
| `WIREWEAVE_API_KEY` | —                           | 현재 셸의 토큰 오버라이드                               |

환경변수가 `~/.wireweave/config.json` 보다 우선합니다.

## 설정 파일

```
~/.wireweave/config.json
```

형태:

```json
{
  "token": "wk_live_...",
  "apiUrl": "https://api.wireweave.org"
}
```

토큰은 `0600` 권한으로 기록됩니다. 회전하려면 `wireweave logout` 후 새 키로 `wireweave login` 을 다시 실행하세요.

## 종료 코드

| 코드 | 의미                                        |
| ---- | ------------------------------------------- |
| `0`  | 성공                                        |
| `1`  | 일반 실패 (I/O, 네트워크, 예기치 못한 오류) |
| `2`  | 파서 / 검증기가 입력을 거부                 |
| `3`  | UX 룰이 요청한 심각도 이상의 이슈 보고      |

## CI 사용 예

```yaml
# .github/workflows/wireframe-check.yml
- run: npm install -g @wireweave/cli@beta
- run: wireweave validate src/wireframes/*.wf --strict
- run: wireweave validate-ux src/wireframes/*.wf --min-severity warning
```

로컬 전용 명령 (`render` / `parse` / `validate` / `validate-ux` / `list-components` / `analyze` / `diff` / `export-*`) 은 `WIREWEAVE_API_KEY` 가 필요 없으므로 CI 가 시크릿 없이 실행됩니다.

## 다음 단계

- [Claude Code 플러그인](/ko/guide/claude-code-plugin) — CLI 를 위임하는 슬래시 명령
- [VS Code 확장](/ko/guide/vscode-extension) — 라이브 프리뷰가 있는 IDE 통합
- [MCP 서버](/ko/guide/mcp-server) — 같은 도구를 Model Context Protocol 로 제공
