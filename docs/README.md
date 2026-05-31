<p align="center">
  <img src="https://docs.wireweave.org/logo.svg" width="128" height="128" alt="Wireweave Docs">
</p>

<h1 align="center">@wireweave/docs</h1>

<p align="center">Wireweave 공식 문서 사이트</p>

<p align="center">
  <a href="https://docs.wireweave.org">Live Site</a> •
  <a href="https://wireweave.org">Landing</a> •
  <a href="https://github.com/wireweave/wireweave">GitHub</a>
</p>

## 개요

Wireweave DSL의 사용자 가이드, 레퍼런스, 문법·컴포넌트 문서를 담은 [VitePress](https://vitepress.dev/) 사이트입니다. 모노레포 내 `@wireweave/docs` 패키지로, npm에 발행되지 않고 Vercel로만 배포됩니다.

영문(`/`)을 원문으로 한국어(`/ko/`)·일본어(`/ja/`) 번역을 제공합니다.

## 콘텐츠 소스

문법·컴포넌트·UX 규칙 메타데이터는 문서에서 다시 작성하지 않고 빌드 시 패키지에서 가져와 생성합니다.

| 콘텐츠               | 소스                       |
| -------------------- | -------------------------- |
| 컴포넌트 목록 / 속성 | `@wireweave/language-data` |
| UX 규칙 카탈로그     | `@wireweave/ux-rules`      |
| DSL 문법             | `@wireweave/core`          |

튜토리얼·가이드 본문 등 서술형 콘텐츠만 직접 작성합니다.

## 개발

레포 루트에서 필터로 실행하거나, `docs/` 디렉터리로 진입해 실행합니다.

```bash
# 레포 루트에서
pnpm --filter @wireweave/docs dev

# 또는 docs/ 디렉터리에서
pnpm dev          # 개발 서버 (http://localhost:3304)
pnpm build        # 프로덕션 빌드 (.vitepress/dist)
pnpm preview      # 빌드 결과 미리보기
pnpm typecheck    # vue-tsc --noEmit
pnpm lint         # ESLint
pnpm format       # Prettier
```

## 구조

```
.vitepress/   VitePress 설정 + 커스텀 테마 + 구문 강조 grammar
guide/        영문 가이드
reference/    영문 레퍼런스 (grammar · components · api)
mcp/          MCP 통합 문서
ko/           한국어 번역
ja/           일본어 번역
public/       정적 자산 (logo, robots.txt)
index.md      홈 페이지
```

## 배포

- URL: [docs.wireweave.org](https://docs.wireweave.org)
- 플랫폼: Vercel (wireweave org의 public 레포에서 `main` push 시 자동 배포)
- 빌드 출력: `.vitepress/dist/`

## 라이선스

MIT
