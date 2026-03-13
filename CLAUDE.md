# @wireweave/core

DSL 파서 및 렌더러 핵심 라이브러리.

## 빌드 순서

문법 파일(`.peggy`)에서 파서를 먼저 생성해야 TypeScript 빌드 가능.

```bash
pnpm build:grammar   # 1. Peggy -> generated-parser.js
pnpm build:ts        # 2. TypeScript 빌드
pnpm build           # 또는 전체 (위 두 단계 순차 실행)
```

## 주의사항

- `src/parser/generated-parser.js`는 자동 생성 파일. 직접 수정 금지.
- 문법 변경 시 반드시 `build:grammar` 먼저 실행 후 테스트.
- 문법/기능 변경 시 `api-server`의 `guide.ts`, `language-data`의 컴포넌트/속성 데이터도 동기화 필요.

## 테스트

```bash
pnpm test            # Vitest
pnpm test:watch      # 워치 모드
```
