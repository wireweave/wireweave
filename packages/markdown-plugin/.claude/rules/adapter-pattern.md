---
paths:
  - 'src/**/*'
---

# 어댑터 패턴 통일성

3개 마크다운 라이브러리에 같은 결과를 내야 한다. 어댑터별 행동 차이가 있으면 문서 portability 가 깨진다.

## 공통 변환 함수

`src/lib/render-fence.ts` 가 단일 진실 공급원:

```ts
import { parse, renderCanvas } from '@wireweave/core'

export function renderFence(code: string, options: WireframeOptions): string {
  try {
    const ast = parse(code)
    const html = renderCanvas(ast, {
      /* bounded layout default */
    })
    const className = options.className ?? 'wireweave-canvas'
    return `<div class="${className}">${html}</div>`
  } catch (err) {
    return options.onError?.(err as Error, code) ?? defaultErrorHtml(err, code)
  }
}
```

각 어댑터는 라이브러리별 hook 에서 `renderFence` 를 호출만. 별도 변환 로직 작성 금지.

## markdown-it 어댑터

```ts
export function markdownItWireframe(md: MarkdownIt, options: WireframeOptions = {}) {
  const fenceLanguage = options.fenceLanguage ?? 'wireframe'
  const defaultFence = md.renderer.rules.fence!

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]
    if (token.info.trim() === fenceLanguage) return renderFence(token.content, options)
    return defaultFence(tokens, idx, opts, env, self)
  }
}
```

## marked 어댑터

````ts
export function markedWireframe(options: WireframeOptions = {}): MarkedExtension {
  const fenceLanguage = options.fenceLanguage ?? 'wireframe'
  return {
    extensions: [
      {
        name: 'wireframe',
        level: 'block',
        tokenizer(src) {
          const match = /^```\s*wireframe\s*\n([\s\S]+?)\n```/.exec(src)
          // ... return token if match
        },
        renderer({ code }) {
          return renderFence(code, options)
        },
      },
    ],
  }
}
````

## remarkable 어댑터

```ts
export function remarkableWireframe(md: Remarkable, options: WireframeOptions = {}) {
  const fenceLanguage = options.fenceLanguage ?? 'wireframe'
  const defaultFence = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, ...rest) => {
    const token = tokens[idx]
    if ((token.params ?? '').trim() === fenceLanguage) return renderFence(token.content, options)
    return defaultFence(tokens, idx, ...rest)
  }
}
```

## 결과 검증

`__tests__/cross-adapter.test.ts` 가 같은 입력에 같은 HTML 을 내는지 검증:

```ts
const code = '...'
const expected = '<div class="wireweave-canvas">...'
expect(mdItRender(code)).toBe(expected)
expect(markedRender(code)).toBe(expected)
expect(remarkableRender(code)).toBe(expected)
```

drift 가 발생하면 `renderFence` 의 단일 책임이 깨진 것 — 어댑터 코드를 줄이고 공통 함수로 끌어올림.

## 절대 금지

- 어댑터별로 별도 parse / render 호출 (drift 유발)
- 어댑터에서만 별도 wrapper / 클래스 추가 (호스트마다 결과 다름)
- core 결과 HTML 을 어댑터에서 추가 가공 (`replace`, `regex`) — core 책임
- 새 마크다운 라이브러리 추가 시 별도 변환 로직 — 무조건 `renderFence` 경유
