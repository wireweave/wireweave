# 마크다운 플러그인

Wireweave 마크다운 플러그인을 사용하면 마크다운 문서에 와이어프레임을 삽입할 수 있습니다.

## 설치

```bash
npm install @wireweave/markdown-plugin
```

## 사용 방법

### VitePress

```typescript
// .vitepress/config.ts
import { wireweavePlugin } from '@wireweave/markdown-plugin'

export default {
  markdown: {
    config: (md) => {
      md.use(wireweavePlugin)
    },
  },
}
```

### Remark/Rehype

```typescript
import { remarkWireweave } from '@wireweave/markdown-plugin'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

const processor = unified().use(remarkParse).use(remarkWireweave)
```

### Docusaurus

```javascript
// docusaurus.config.js
const wireweavePlugin = require('@wireweave/markdown-plugin/docusaurus')

module.exports = {
  plugins: [wireweavePlugin],
}
```

## 마크다운에서 사용

마크다운 파일에서 `wireframe` 코드 블록을 사용합니다:

````markdown
# 로그인 페이지 디자인

아래는 로그인 페이지 와이어프레임입니다:

```wireframe
page "Login" centered {
  card w=400 {
    title "Sign In" level=2
    input "Email" inputType=email
    input "Password" inputType=password
    button "Sign In" primary
  }
}
```

이 디자인은 간단하고 사용하기 쉽습니다.
````

## 출력 형식

### HTML 출력 (기본값)

````markdown
```wireframe
page { button "Click" primary }
```
````

````

HTML로 렌더링됩니다:

```html
<div class="wireframe-container">
  <div class="page">
    <button class="button primary">Click</button>
  </div>
</div>
````

### SVG 출력

````markdown
```wireframe format=svg
page { button "Click" primary }
```
````

````

SVG 이미지로 렌더링됩니다.

## 옵션

### 테마

```markdown
```wireframe theme=dark
page { card { text "Dark theme" } }
````

````

### 너비

```markdown
```wireframe width=600
page { card { text "Fixed width" } }
````

````

### 제목

```markdown
```wireframe title="Login Wireframe"
page { card { text "With title" } }
````

````

## 플러그인 옵션

플러그인 초기화 시 옵션을 지정할 수 있습니다:

```typescript
md.use(wireweavePlugin, {
  defaultTheme: 'light',
  defaultFormat: 'html',
  defaultWidth: 800,
  containerClass: 'wireframe-container'
});
````

### 사용 가능한 옵션

| 옵션             | 기본값        | 설명                |
| ---------------- | ------------- | ------------------- |
| `defaultTheme`   | `"light"`     | 기본 테마           |
| `defaultFormat`  | `"html"`      | 기본 출력 형식      |
| `defaultWidth`   | `800`         | 기본 너비           |
| `containerClass` | `"wireframe"` | 컨테이너 CSS 클래스 |

## 스타일링

기본 스타일을 커스터마이즈할 수 있습니다:

```css
.wireframe-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
}

.wireframe-title {
  background: #f9fafb;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}
```

## 문제 해결

### 렌더링되지 않음

1. 플러그인이 올바르게 등록되었는지 확인
2. 코드 블록 언어가 `wireframe`인지 확인
3. DSL 문법 오류 확인

### 스타일이 적용되지 않음

1. CSS 파일이 포함되었는지 확인
2. 클래스 이름이 올바른지 확인

## 다음 단계

- [문법 레퍼런스](/ko/reference/grammar) - 전체 DSL 문법
- [컴포넌트 레퍼런스](/ko/reference/components) - 모든 컴포넌트
