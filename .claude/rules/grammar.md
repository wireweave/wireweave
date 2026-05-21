---
paths:
  - 'src/grammar/**'
  - 'src/parser/**'
---

# Peggy 문법 작성 규칙

`src/grammar/wireframe.peggy` — Wireweave DSL 의 단일 진실 공급원.

## 빌드 의존성

- 문법 변경 시 반드시 `pnpm build:grammar` 먼저 실행. 그렇지 않으면 `src/parser/generated-parser.js` 가 stale 상태로 TS 빌드 통과 후 런타임에 실패.
- `pnpm build` 가 두 단계를 순차 실행하지만, 단독 `pnpm build:ts` 는 grammar 빌드를 건너뛴다 — IDE / Storybook 에서 grammar 만 수정한 경우 명시적으로 grammar 빌드 필요.

## 문법 변경 = BREAKING 후보

Peggy 문법은 사용자가 작성한 `.wf` 파일을 직접 파싱한다. 다음 변경은 BREAKING 으로 간주:

- 기존 토큰의 의미 변경 (예: `Canvas:Mosaic` 동작 변경)
- 키워드 / 예약어 추가 (사용자 컴포넌트명과 충돌 가능)
- 컴포넌트 / 속성 이름 제거 또는 rename
- 옵셔널이던 속성을 필수로 변경

다음은 minor:

- 새 컴포넌트 추가 (기존 코드와 충돌하지 않으면)
- 새 옵셔널 속성 추가
- 새 syntactic sugar 추가 (기존 syntax 그대로 동작 보장)

다음은 patch:

- 파서 에러 메시지 개선
- 명시적 동작이 정의되어 있던 corner case 의 명시화 (코드 변경 없음)

## 작성 규칙

- 인라인 액션(`{ ... }`)은 최소화. 파싱 결과를 raw AST 로 두고 후처리는 `src/ast/` 에서.
- 문자 클래스 / 키워드 정의는 파일 상단 `declarations` 섹션에. 본문에 인라인 정의 금지.
- 새 노드 타입을 만들 때는 동시에:
  1. `src/ast/types.ts` 에 타입 추가
  2. `src/ast/visitor.ts` 의 visit 함수 추가 (있다면)
  3. `src/renderer/` 의 해당 노드 핸들러 추가
  4. 테스트 케이스 추가 (`__tests__/parser.test.ts`)

## 테스트

문법 변경의 회귀 검증:

```bash
pnpm test                         # vitest run
pnpm test parser                  # 파서만
pnpm test renderer                # 렌더러만
pnpm test -- --reporter=verbose   # 자세히
```

새 문법 추가 시:

1. `__tests__/fixtures/` 에 input `.wf` 와 expected AST JSON 추가
2. `__tests__/parser.test.ts` 에 매칭 검증

## generated-parser.js 처리

- `.gitignore` 에 등록되어 있지 않다면 commit 함 (배포 산출물 일부).
- 코드 리뷰에서 generated-parser.js 의 diff 는 검토하지 않음 (volume 만 확인).
- 직접 손으로 수정 금지. 발견되면 즉시 `pnpm build:grammar` 로 재생성.

## 외부 동기화

문법이 바뀌면 다음 패키지 데이터도 함께 업데이트:

- `@wireweave/api-server` — `src/agent/guide.ts` (LLM 에 주입되는 가이드)
- `@wireweave/language-data` — `src/components.ts`, `src/attributes.ts`
- `@wireweave/docs` — 컴포넌트 페이지 (선택)

순서: core 변경 → core publish → 의존 패키지 업데이트 → 의존 패키지 publish.
