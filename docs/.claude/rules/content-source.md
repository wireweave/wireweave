---
paths:
  - 'src/**/*.md'
  - '.vitepress/**'
---

# 콘텐츠 single source 분리

docs 의 페이지는 두 종류:

1. **자동 생성** — 코드 / 메타 데이터에서 build 시 추출
2. **수동 작성** — 튜토리얼 / 가이드 / 사례

두 영역을 섞지 않는다.

## 자동 생성 영역

```
.vitepress/scripts/
  generate-component-pages.ts    # @wireweave/language-data → 컴포넌트 페이지
  generate-rules-catalog.ts      # @wireweave/ux-rules → 룰 카탈로그
  generate-api-reference.ts      # api-server tool-definitions → API 레퍼런스
```

빌드 시 (`vitepress build` 전 hook) 실행되어 `src/components/`, `src/rules/`, `src/api/` 하위에 마크다운 생성.

규칙:

- 생성 결과 마크다운은 `.gitignore`. PR 에 포함 X.
- 생성 결과를 사람이 직접 수정 금지 — source 변경 후 재생성
- generator 자체는 typecheck / lint 대상 (코드 품질)

## 수동 작성 영역

```
src/
  guide/                # 시작하기, 튜토리얼
  recipes/              # 패턴 / 사례 / FAQ
  migration/            # 메이저 마이그레이션 가이드 (3.x → 4.x 등)
  about/                # 프로젝트 소개, 비전
```

규칙:

- 컴포넌트 목록 / 속성 표 직접 작성 금지 — `<!-- include: components/Button.md -->` 로 자동 생성 영역 import
- 코드 예제는 build 시 `parse()` 로 검증 (잘못된 DSL 미게시)
- 외부 링크는 안정적 도메인만 (도메인 사라지면 dead link)

## 마크다운 규칙

- frontmatter 의 `lang`, `title`, `description` 필수
- heading 위계 (h1 → h2 → h3) 건너뛰지 않음
- 코드 블록은 항상 언어 명시 (` ```ts `, ` ```wireframe `)
- 이미지는 `/public/` 또는 `images/` 하위, alt text 필수

## 콘텐츠 PR 체크리스트

- [ ] 영문 작성 / 수정
- [ ] 한국어 / 일본어 동기화 (i18n.md 참조)
- [ ] DSL 예제 parse 검증 통과
- [ ] dead link 없음 (`pnpm dlx markdown-link-check` 또는 CI)
- [ ] 자동 생성 영역에 사람 수정 없음

## 절대 금지

- 자동 생성 영역의 마크다운을 사람이 직접 수정
- 코드 예제를 검증 없이 게시 (parse 실패하는 DSL)
- 한 페이지에 자동 생성 + 수동 작성을 섞음 (한쪽만 갱신되어 drift)
- 컴포넌트 메타를 docs 안에서 다시 적기 (`@wireweave/language-data` 참조)
