---
paths:
  - 'src/components.ts'
  - 'src/attributes.ts'
  - 'src/tokens.ts'
---

# 메타 데이터 형식 / 호환성

## components.ts

```ts
export interface ComponentMeta {
  name: string                  // 'Button' / 'Input' / ...
  category: 'atom' | 'molecule' | 'organism'
  description: string           // 자동완성 hover 에 표시
  attributes: AttributeRef[]    // 사용 가능한 속성 list
  examples: string[]            // 자동완성 snippet
  since: string                 // 추가된 core 버전 — '2.0.0'
}

export const COMPONENTS: ReadonlyArray<ComponentMeta> = [...]
```

규칙:

- `name` 은 core grammar 의 컴포넌트 이름과 1:1 일치
- `since` 는 추가된 core 버전. 제거 시 `removedSince` 필드 추가 후 한 메이저 동안 deprecated 로 남김
- `category` 는 디자인 시스템의 atom/molecule/organism 분류
- `examples` 는 실제 동작하는 DSL 스니펫 (test 에서 parse 검증)

## attributes.ts

```ts
export interface AttributeMeta {
  name: string // 'variant' / 'size' / ...
  type: 'string' | 'number' | 'boolean' | 'enum' | 'color'
  values?: string[] // enum 일 때만
  description: string
  appliesTo: string[] // 적용 가능한 컴포넌트 이름 list
  since: string
}
```

## tokens.ts

```ts
export interface TokenMeta {
  name: string // '@primary' / '@spacing-md' ...
  category: 'color' | 'spacing' | 'typography' | 'radius' | 'shadow'
  description: string
  cssVar?: string // 매핑되는 CSS 변수 — '--color-primary'
}
```

## 검증 (테스트)

`__tests__/meta-consistency.test.ts` 가 다음 검증:

- 모든 `examples` 가 core parser 로 파싱 가능
- `attributes.appliesTo` 의 컴포넌트가 `COMPONENTS` 에 존재
- 중복 `name` 없음
- `since` 가 semver 형식

core 메이저 bump 시 이 테스트가 깨지면 메타 동기화 누락 신호.

## 호환성

- 메타 추가 (새 컴포넌트, 새 속성) — minor
- 메타 삭제 / 의미 변경 — major
- description / examples 보정 — patch

## 절대 금지

- core 에 없는 컴포넌트를 메타에만 추가 (사용자가 자동완성 후 parse error)
- `since` 누락 (호환성 추적 불가)
- runtime 에 ComponentMeta 를 mutate (불변)
