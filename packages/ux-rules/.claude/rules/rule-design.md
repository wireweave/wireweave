---
paths:
  - 'src/rules/**'
---

# 룰 함수 설계

## 단일 책임

한 룰은 한 가지 검증만. 두 가지를 잡으려면 두 룰로 분리.

```ts
// 좋음 — 단일 의도
export const buttonLabel: Rule = {
  id: 'a11y/button-label',
  category: 'accessibility',
  severity: 'error',
  description: 'Button must have a non-empty visible label or aria-label',
  apply: (ast) => visit(ast, 'Button').filter(b => !hasLabel(b)).map(b => issue(b, ...)),
}

// 나쁨 — 두 가지를 한 룰에서
export const buttonAccessibility: Rule = {
  apply: (ast) => [...checkLabel(ast), ...checkContrast(ast)],
}
```

## pure function

- 룰 함수는 pure. 외부 상태 / 글로벌 mutate 금지
- 동일 AST → 동일 결과 (idempotent)
- AST 를 mutate 하지 않음 (복사 후 변경도 금지 — 검증만)

## AST 순회 유틸

`src/lib/visit.ts` 의 헬퍼 사용. 각 룰이 자체 traversal 작성하지 않는다:

```ts
import { visit } from '@/lib/visit'

const buttons = visit(ast, 'Button') // 모든 Button 노드
const inputs = visitWhere(ast, (n) => n.kind === 'Input' && n.attrs.required)
```

## issue 메시지

- 사용자가 어떻게 고쳐야 하는지 명확하게
- "missing label" (X) → "Add a visible text or aria-label to the Button" (O)
- 영문 + 한글 동시 지원 — message catalog 분리 권장 (i18n 도입 시)

## fix 힌트

```ts
fix: {
  description: 'Add aria-label="<button purpose>" attribute'
}
```

- 자동 적용은 본 패키지 범위 외 (호스트 책임)
- description 은 한 줄로 명확. 사용자가 이해 가능한 언어.

## 테스트

각 룰은 최소 3개 케이스:

```ts
describe('a11y/button-label', () => {
  it('flags Button without label', () => { ... })
  it('passes Button with aria-label', () => { ... })
  it('passes Button with text content', () => { ... })
})
```

edge case: 빈 문자열 label, whitespace-only label, 동적 label.

## 절대 금지

- 룰 함수에서 외부 fetch / DB 조회
- 글로벌 state 의존 (룰끼리 공유 cache 등)
- AST mutation
- 룰 ID 에 카테고리 prefix 누락 (`'button-label'` X, `'a11y/button-label'` O)
- 새 룰 추가 시 default 'error' 로 강제 ON (도입 단계는 'warning' 권장)
