---
paths:
  - 'src/ast/**'
---

# AST 타입 안정성

`src/ast/types.ts` 의 타입은 사실상 wireweave 의 wire format. 변경 영향이 큼.

## 핵심 타입

- `WireframeDocument` — 최상위 (pages + 메타)
- `Page` — 단일 페이지 (id, width, height, components)
- `Component` — 재귀 트리 노드 (type, attrs, children)
- `CanvasDocument` — 다중 페이지 + canvas 메타 (gap, layout)
- `PlacedPage` — layout 계산 결과 (id, x, y, width, height, html, css)

## 타입 변경 분류

| 변경 종류                           | 분류  | 비고                                                           |
| ----------------------------------- | ----- | -------------------------------------------------------------- |
| 새 옵셔널 필드 추가                 | minor | 기존 코드와 호환                                               |
| 새 컴포넌트 type 추가               | minor | discriminated union 확장. switch 의 exhaustive check 가 알려줌 |
| 옵셔널 필드를 필수로 변경           | major | 모든 생성자 깨짐                                               |
| 필드 타입 변경 (string → number 등) | major | 모든 reader 깨짐                                               |
| 필드 제거                           | major | 외부 reader 깨짐                                               |
| union member 제거                   | major | 동일                                                           |

## discriminated union 작성 규칙

```ts
// 좋음
type Component =
  | { type: 'Box', attrs: BoxAttrs, children: Component[] }
  | { type: 'Text', attrs: TextAttrs }
  | { type: 'Image', attrs: ImageAttrs }

// 나쁨 — type 필드 없으면 좁히기 불가
type Component = {
  kind?: string  // ← 옵셔널이면 좁히기 어려움
  ...
}
```

새 type 추가 시 모든 visitor / renderer 의 switch 가 컴파일 에러로 알려주도록 `exhaustive` check:

```ts
function visitComponent(c: Component) {
  switch (c.type) {
    case 'Box': return ...
    case 'Text': return ...
    case 'Image': return ...
    default:
      const _exhaustive: never = c
      throw new Error(`Unknown component type: ${(c as { type: string }).type}`)
  }
}
```

## 직렬화 호환

AST 는 JSON 직렬화 가능해야 한다 (LLM 에 전달 / DB 저장 / 파일 저장).

- Date / Map / Set / undefined 사용 금지
- function / class instance 포함 금지
- circular reference 금지 (parent 포인터 만들지 않음 — 필요하면 별도 인덱스 자료구조)

## 타입 → 런타임 검증

`src/ast/validators.ts` 가 raw parser 출력을 AST 타입으로 좁힌다. 외부 입력(JSON 파일, LLM 응답 등)을 AST 로 받을 때도 이 validator 경유 — `as WireframeDocument` 단언 금지.

## 변경 시 동기화 체크리스트

AST 타입 변경 후:

1. `src/ast/validators.ts` 갱신
2. `src/parser/` 의 raw → AST 변환 갱신
3. `src/renderer/` 의 visitor 갱신 (compile error 가 알려줌)
4. `__tests__/fixtures/` 의 expected JSON 갱신
5. 외부 의존자 영향 평가:
   - api-server 가 AST 를 LLM 에 전달하는 경우 prompt 도 갱신
   - language-data 의 컴포넌트 정의도 갱신
6. `.claude/rules/breaking-change.md` 의 절차 따름

## type-only export

내부 implementation 디테일은 type 으로 export 하지 않는다 (의도치 않게 public API 가 됨).

```ts
// 좋음
export type { WireframeDocument, Page, Component }
export type { PlacedPage }

// 피하기 — 내부 helper 가 외부 API 가 되면 향후 변경 어려움
export type { ParserContext, RenderState, InternalCache }
```
