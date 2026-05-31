# Markdownプラグイン

Wireweave Markdownプラグインを使用すると、Markdownドキュメントにワイヤーフレームを埋め込むことができます。

## インストール

```bash
npm install @wireweave/markdown-plugin
```

## 使用方法

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

## Markdownでの使用

Markdownファイルで`wireframe`コードブロックを使用します：

````markdown
# ログインページデザイン

以下はログインページのワイヤーフレームです：

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

このデザインはシンプルで使いやすいです。
````

## 出力形式

### HTML出力（デフォルト）

````markdown
```wireframe
page { button "Click" primary }
```
````

````

HTMLとしてレンダリングされます：

```html
<div class="wireframe-container">
  <div class="page">
    <button class="button primary">Click</button>
  </div>
</div>
````

### SVG出力

````markdown
```wireframe format=svg
page { button "Click" primary }
```
````

````

SVG画像としてレンダリングされます。

## オプション

### テーマ

```markdown
```wireframe theme=dark
page { card { text "Dark theme" } }
````

````

### 幅

```markdown
```wireframe width=600
page { card { text "Fixed width" } }
````

````

### タイトル

```markdown
```wireframe title="Login Wireframe"
page { card { text "With title" } }
````

````

## プラグインオプション

プラグイン初期化時にオプションを指定できます：

```typescript
md.use(wireweavePlugin, {
  defaultTheme: 'light',
  defaultFormat: 'html',
  defaultWidth: 800,
  containerClass: 'wireframe-container'
});
````

### 利用可能なオプション

| オプション       | デフォルト    | 説明               |
| ---------------- | ------------- | ------------------ |
| `defaultTheme`   | `"light"`     | デフォルトテーマ   |
| `defaultFormat`  | `"html"`      | デフォルト出力形式 |
| `defaultWidth`   | `800`         | デフォルト幅       |
| `containerClass` | `"wireframe"` | コンテナCSSクラス  |

## スタイリング

デフォルトスタイルをカスタマイズできます：

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

## トラブルシューティング

### レンダリングされない

1. プラグインが正しく登録されているか確認
2. コードブロックの言語が`wireframe`か確認
3. DSL構文エラーを確認

### スタイルが適用されない

1. CSSファイルが含まれているか確認
2. クラス名が正しいか確認

## 次のステップ

- [文法リファレンス](/ja/reference/grammar) - 完全なDSL文法
- [コンポーネントリファレンス](/ja/reference/components) - すべてのコンポーネント
