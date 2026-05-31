---
paths:
  - 'src/monaco/**'
  - 'src/codemirror/**'
---

# 에디터 통합 규칙 (Monaco / CodeMirror)

## 공통

- 두 에디터 통합 모두 동일한 메타 데이터 (`components.ts`, `attributes.ts`, `tokens.ts`) 를 사용
- 에디터별 어댑터에서만 변환 (Monarch tokenizer / CM Lezer parser 표현)
- 호스트(host) 는 한 줄로 등록:

```ts
// Monaco 호스트
import { registerWireframe } from '@wireweave/language-data/monaco'
registerWireframe(monaco)

// CodeMirror 호스트
import { wireframeLanguage } from '@wireweave/language-data/codemirror'
new EditorView({ extensions: [wireframeLanguage()], ... })
```

## Monaco

### Monarch tokenizer

- 키워드 / 컴포넌트명 / 속성명 / 토큰명 / 문자열 / 주석 색상 분리
- core grammar 변경 시 tokenizer 재검증 (테스트가 강제)

### Provider 종류

| Provider                         | 책임                              |
| -------------------------------- | --------------------------------- |
| `CompletionItemProvider`         | 자동완성 (컴포넌트, 속성, 토큰값) |
| `HoverProvider`                  | hover 시 메타 description 표시    |
| `DocumentFormattingEditProvider` | 포맷팅 (선택)                     |
| `LinkedEditingRangeProvider`     | 짝 토큰 자동 갱신 (선택)          |

### 등록 시점

`registerWireframe(monaco)` 는 idempotent. 여러 번 호출되어도 중복 등록 안 됨.

## CodeMirror

### Lezer / stream parser

- core grammar 와 동일 토큰 카테고리
- syntax highlighting, indentation, completion, lint 모두 동일 메타 사용

### Extension 결합

```ts
wireframeLanguage({
  completion: true, // default true
  hover: true,
  lint: true, // ux-rules 통합 (선택)
})
```

옵션은 host 의 use case 에 따라 결정. dashboard 는 lint on, vscode-extension 은 별도 LSP.

## ux-rules 통합 (선택)

`@wireweave/ux-rules` 의 검증 결과를 lint diagnostic 으로 변환:

```ts
import { validate } from '@wireweave/ux-rules'

const diagnostics = validate(parseResult).map((issue) => ({
  from: issue.range.start,
  to: issue.range.end,
  severity: issue.severity, // 'error' | 'warning' | 'info'
  message: issue.message,
}))
```

ux-rules 의 직접 의존은 옵션 — 필요한 host 만 별도 등록.

## peer dependency

| Peer                                                            | 이유                   |
| --------------------------------------------------------------- | ---------------------- |
| `monaco-editor`                                                 | host 가 자체 버전 사용 |
| `@codemirror/state`, `@codemirror/view`, `@codemirror/language` | host 가 자체 버전      |

`peerDependenciesMeta` 로 optional 선언 (Monaco 만 쓰는 host 가 CM 의존성 강제 X).

## 절대 금지

- monaco / codemirror 를 dependency 로 추가 (peer 만)
- 에디터별 어댑터에서 components.ts 메타를 우회해 별도 list 정의 (drift)
- runtime 에 monaco 글로벌(`window.monaco`) 의존 — host 가 명시적으로 전달
- `import 'monaco-editor/esm/vs/...'` 같은 deep import (host bundler 가 처리)
