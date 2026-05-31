# Claude Code 플러그인

Wireweave Claude Code 플러그인(`@wireweave/wireweave`)은 단일 슬래시 명령 — `/wireweave` — 을 노출하여 Claude Code 가 Wireweave DSL 도구 체인 전체(parse, validate, render, analyze, diff, UX rules, exporters)를 구동할 수 있게 합니다. 플러그인 자체에는 코드가 포함되어 있지 않으며, 모든 서브명령은 `npx -y` 를 통해 [`@wireweave/cli`](/ko/guide/cli) 로 위임됩니다.

> **v0.1.0 — 베타.** 플러그인 형태는 안정적이지만, 미러링하는 cli 표면은 `1.0.0` 이전에 변경될 수 있습니다.

## 설치

플러그인은 GitHub 레포에 호스팅된 Claude Code 마켓플레이스 엔트리로 배포됩니다. 하나의 Claude Code 세션에서 마켓플레이스를 추가하고 설치합니다:

```text
/plugin marketplace add wireweave/wireweave
/plugin install wireweave@wireweave
```

요구 사항:

- 플러그인 마켓플레이스를 지원하는 Claude Code
- Node.js 18 이상 (플러그인이 `npx` 를 통해 cli 를 호출)
- 첫 사용 시 npm 레지스트리 네트워크 접근 (이후 호출은 npx 가 캐시)

설치 후, 모든 Claude Code 세션에서 `/wireweave` 가 사용 가능합니다.

## 동작 방식

```
Claude Code  →  /wireweave <subcommand>
                      │
                      ▼
            npx -y @wireweave/cli <subcommand>
                      │
                      ▼
                @wireweave/sdk dispatch()
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
  local (in-process)        server (api.wireweave.org)
  parser / renderer /       login (키 검증)
  ux-rules / exporters
```

- 플러그인에는 `src/` 가 없습니다 — 얇은 셸일 뿐입니다.
- cli 는 호출마다 `npx -y @wireweave/cli` 로 새로 가져오므로, cli 의 minor / patch 업그레이드가 플러그인 재배포 없이 사용자에게 도달합니다.
- 모든 로컬 작업(파싱, 렌더링, UX 검증, 익스포트)은 SDK 의 `localDispatch` 를 통해 cli 내부에서 같은 프로세스로 실행됩니다. 서버 작업(`login` 키 검증)은 `api.wireweave.org` 를 경유합니다.

## 서브명령

`/wireweave` 다음의 첫 토큰이 서브명령을 선택하며, 나머지는 그대로 cli 에 전달됩니다.

| 슬래시 형식                      | cli 위임                                             | 디스패치 |
| -------------------------------- | ---------------------------------------------------- | -------- |
| `/wireweave login`               | `npx -y @wireweave/cli login`                        | auth     |
| `/wireweave whoami`              | `npx -y @wireweave/cli whoami`                       | auth     |
| `/wireweave logout`              | `npx -y @wireweave/cli logout`                       | auth     |
| `/wireweave parse <file>`        | `npx -y @wireweave/cli parse <file>`                 | local    |
| `/wireweave validate <file>`     | `npx -y @wireweave/cli validate <file> [--strict]`   | local    |
| `/wireweave render <file>`       | `npx -y @wireweave/cli render <file> [-o] [--theme]` | local    |
| `/wireweave list`                | `npx -y @wireweave/cli list-components`              | local    |
| `/wireweave analyze <file>`      | `npx -y @wireweave/cli analyze <file>`               | local    |
| `/wireweave diff <old> <new>`    | `npx -y @wireweave/cli diff <old> <new>`             | local    |
| `/wireweave validate-ux <file>`  | `npx -y @wireweave/cli validate-ux <file>`           | local    |
| `/wireweave export-json <file>`  | `npx -y @wireweave/cli export-json <file> [-o]`      | local    |
| `/wireweave export-figma <file>` | `npx -y @wireweave/cli export-figma <file> [-o]`     | local    |

로컬 서브명령(`parse` / `validate` / `render` / `list` / `analyze` / `diff` / `validate-ux` / `export-*`)은 API 키가 필요 없습니다. `login` 만 키 검증을 위해 `api.wireweave.org` 에 접속합니다.

각 서브명령의 전체 옵션은 [CLI 가이드](/ko/guide/cli)를 참조하세요.

## 인증

플러그인은 인증 상태를 보관하지 않습니다. cli 가 `~/.wireweave/config.json` 에 API 키를 저장합니다:

```text
/wireweave login            # cli 호스트에서 API 키 입력 프롬프트
/wireweave whoami           # 설정된 계정 표시
/wireweave logout           # 저장된 키 제거
```

API 키는 [Wireweave 대시보드 → Keys](https://wireweave.org/dashboard/keys) 에서 발급합니다.

## cli 버전 고정

플러그인은 항상 npm `latest` dist-tag 의 `@wireweave/cli` 를 사용합니다 — 버전을 고정하지 않습니다. 디버깅이나 롤백을 위해 특정 cli 릴리스에 고정하려면 cli 를 직접 호출하세요:

```bash
npx -y @wireweave/cli@<version> <subcommand>
```

cli 의 BREAKING 변경은 [`@wireweave/cli` CHANGELOG](https://github.com/wireweave/cli/blob/main/CHANGELOG.md) 에 문서화되어 있습니다.

## 트러블슈팅

### `npx` 가 `@wireweave/cli` 를 찾지 못함

cli 가 게시되어 있는지 확인:

```bash
npm view @wireweave/cli version
```

패키지가 아직 npm 에 없으면 슬래시 명령이 실패합니다 — 플러그인에는 폴백 경로가 없습니다. cli 가 게시되기 전까지는 로컬 체크아웃에서 실행하세요:

```bash
cd /path/to/wireweave/cli && pnpm build && pnpm link --global
wireweave <subcommand>
```

### 오프라인 또는 레지스트리 도달 불가

`npx -y @wireweave/cli` 는 해당 머신에서 처음 실행할 때 npm 레지스트리 접근이 필요합니다. 캐시된 이후에는 오프라인에서도 동작합니다. 레지스트리에 도달할 수 없고 cli 가 캐시되어 있지 않으면 슬래시 명령은 `npx` 해석 오류로 실패합니다.

### `/wireweave login` 실패

`login` 은 키 검증을 위해 `api.wireweave.org` 에 접속합니다. 다음을 확인하세요:

1. `api.wireweave.org` 네트워크 접근
2. [대시보드](https://wireweave.org/dashboard/keys) 에서 키를 정확히 복사했는지
3. 키가 폐기 / 만료되지 않았는지

API 키는 cli 에 의해 `~/.wireweave/config.json` 에 `0600` 권한으로 저장됩니다.

## 다른 통합과의 비교

| 통합                                       | 표면                                 | 적합한 사용처                                              |
| ------------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| Claude Code 플러그인                       | `/wireweave` 슬래시 명령 (본 페이지) | Claude Code 세션에서 도구 체인 구동                        |
| [CLI](/ko/guide/cli)                       | `wireweave` 셸 바이너리              | 스크립트, CI, 터미널 워크플로우                            |
| [MCP 서버](/ko/guide/mcp-server)           | MCP 도구 (`wireweave_*`)             | 모든 MCP 호환 클라이언트 (Claude Desktop, Cursor, VS Code) |
| [VS Code 확장](/ko/guide/vscode-extension) | 에디터 명령 + 라이브 프리뷰          | AI 보조와 함께 에디터 내 작성                              |

네 가지 통합은 모두 동일한 도구 카탈로그를 공유하며, `@wireweave/sdk` 를 통해 미러링됩니다.

## 다음 단계

- [CLI](/ko/guide/cli) — 전체 커맨드라인 레퍼런스 (옵션 표면, 종료 코드, CI 사용)
- [MCP 서버](/ko/guide/mcp-server) — 같은 도구를 Model Context Protocol 로 제공
- [VS Code 확장](/ko/guide/vscode-extension) — 라이브 프리뷰가 있는 IDE 통합
