---
paths:
  - 'src/tools.ts'
---

# 자동 생성 파일 — 직접 수정 금지

`src/tools.ts`는 api-server의 `scripts/generate-mcp-tools.ts`로 자동 생성된다.
이 파일을 직접 수정하면 다음 생성 시 덮어쓰기된다.

## 도구 추가/수정 절차

1. api-server의 `src/tool-definitions.ts` 수정
2. api-server에서 `pnpm tsx scripts/generate-mcp-tools.ts` 실행
3. mcp-server에서 생성된 `src/tools.ts` 확인
4. mcp-server 재배포
