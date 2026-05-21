---
paths:
  - 'src/parser/**'
  - 'src/ast/**'
---

# 파서 레이어 규칙

Peggy 가 생성한 `generated-parser.js` 위에 얇은 파사드만 둔다.

## 책임

- Peggy 파서 호출 + 에러 변환
- raw AST → 검증된 AST 변환 (`src/ast/`)
- 사용자 친화적 SyntaxError 메시지

## 비책임

- 렌더링 (HTML/CSS/SVG) — `src/renderer/` 의 책임
- 레이아웃 계산 — `src/layout/` (또는 `renderer/canvas-layout.ts`) 의 책임
- 파일 I/O — 호출자(에디터 / VSCode 확장) 의 책임

## 진입점

```ts
parse(source: string): WireframeDocument
parseToCanvas(source: string): CanvasDocument
```

새 진입점 추가 전 검토:

- 기존 `parse` 결과를 변환하면 충분한가?
- 변환 비용이 무거우면 별도 진입점이 정당화됨

## 에러 처리

Peggy 의 SyntaxError 는 `expected` / `found` 토큰 정보를 제공. 사용자에게 노출할 때:

- 줄/열 번호 보존
- "expected X, found Y" 보다 "X 가 와야 하는데 Y 가 왔습니다" 형태의 한국어 메시지 우선
- 가능하면 fix 힌트 첨부 (예: "Page 선언에 width/height 가 누락된 것 같습니다")

영어 메시지가 필요한 경우(라이브러리 사용자 대상): `errors/messages.en.ts` 와 `errors/messages.ko.ts` 분리.

## 입력 검증

- `parse(undefined)` / `parse(null)` → TypeError throw (TS 타입으로 막혀 있어도 런타임 가드)
- `parse('')` → 빈 문서 반환 (에러 아님)
- 매우 긴 입력(>1MB) 도 stack overflow 없이 처리 — Peggy 가 좌재귀를 처리하도록 문법 작성

## AST 검증

raw AST 가 만들어진 후 (Peggy 출력) 다음 검증을 거친다:

- 페이지 ID 중복 검사
- 컴포넌트 nest 깊이 sanity check (DoS 방지, 기본 50)
- 속성 값 도메인 검증 (예: width 가 양수 정수)

검증 실패 시 SyntaxError 의 location 정보와 함께 throw.

## type-safety

- `WireframeDocument`, `Page`, `Component` 등 AST 타입은 `src/ast/types.ts` 에서 union/discriminated union 으로 표현.
- discriminated union 의 `type` 필드는 string literal. 새 타입 추가 시 모든 visitor / renderer 의 switch 가 컴파일 타임에 알게 됨.
- `as` 단언 금지. AST 노드 좁히기는 `if (node.type === 'Page')` 또는 type guard 함수.

## generated-parser.js 와의 경계

- generated-parser.js 는 어떤 비즈니스 로직도 알지 못한다 (Peggy 가 생성한 토큰 트리만 만든다).
- 렌더러나 ux-rules 가 generated-parser.js 를 직접 import 하지 않는다 — 항상 `parse` / `parseToCanvas` 진입점 경유.
- 이 경계가 깨지면 향후 파서 교체 (Peggy → 다른 파서) 시 모든 의존자가 깨진다.
