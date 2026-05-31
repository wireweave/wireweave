# スタイリング

Wireweaveは、ワイヤーフレームの外観をカスタマイズするための組み込みテーマとスタイリングオプションを提供します。

## テーマ

### ライトテーマ（デフォルト）

ライトテーマの色：

- 背景：白 (#FFFFFF)
- テキスト：濃いグレー (#1F2937)
- Primary：青 (#3B82F6)
- ボーダー：薄いグレー (#E5E7EB)

### ダークテーマ

ダークテーマの色：

- 背景：暗い色 (#111827)
- テキスト：薄いグレー (#F9FAFB)
- Primary：青 (#60A5FA)
- ボーダー：グレー (#374151)

### テーマを使用したレンダリング

レンダリング時にオプションでテーマを指定できます：

```javascript
import { render, renderToSvg } from '@wireweave/core'

// テーマ付きHTMLレンダリング
const { html, css } = render(doc, { theme: 'dark' })

// テーマ付きSVGレンダリング
const { svg } = renderToSvg(doc, { theme: 'dark' })
```

## 色

### ボタンバリアント

```wireframe
button "Primary" primary      // 青
button "Secondary" secondary  // グレー
button "Danger" danger        // 赤
button "Outline" outline      // ボーダーのみ
button "Ghost" ghost          // 透明
```

### アラートバリアント

```wireframe
alert "成功!" variant=success     // 緑の背景
alert "エラー!" variant=danger    // 赤の背景
alert "警告!" variant=warning     // 黄の背景
alert "情報!" variant=info        // 青の背景
```

### バッジバリアント

```wireframe
badge "アクティブ" variant=success
badge "保留中" variant=warning
badge "非アクティブ" variant=danger
badge "新規" variant=info
```

## タイポグラフィ

### タイトルレベル

```wireframe
title "H1タイトル" level=1        // 32px
title "H2タイトル" level=2        // 24px
title "H3タイトル" level=3        // 20px
title "H4タイトル" level=4        // 16px
```

### テキストスタイル

```wireframe
text "通常テキスト"
text "太字テキスト" weight=bold
text "ミュートテキスト" muted
text "小さいテキスト" size=sm
text "大きいテキスト" size=lg
```

### テキストサイズ

| サイズ | 値   | 説明               |
| ------ | ---- | ------------------ |
| `xs`   | 12px | 極小               |
| `sm`   | 14px | 小                 |
| `base` | 16px | 基本（デフォルト） |
| `lg`   | 18px | 大                 |
| `xl`   | 20px | 特大               |
| `2xl`  | 24px | 2倍大              |

### フォントウェイト

```wireframe
text "Normal" weight=normal
text "Medium" weight=medium
text "Semibold" weight=semibold
text "Bold" weight=bold
```

## コンポーネントスタイル

### カードスタイル

```wireframe
card {
  // デフォルト - 控えめなシャドウ
}

card shadow=none {
  // シャドウなし
}

card shadow=lg {
  // 大きなシャドウ
}

card border {
  // ボーダー付き
}

card rounded {
  // 角丸
}
```

### 入力状態

```wireframe
input "デフォルト"
input "無効" disabled
input "読み取り専用" readonly
input "必須" required
```

### ボタンスタイル

```wireframe
button "ソリッド" primary
button "アウトライン" primary outline
button "ゴースト" primary ghost
button "無効" primary disabled
button "ローディング" primary loading
```

## サイズ調整

### コンポーネントサイズ

```wireframe
button "小" primary size=sm
button "中" primary size=md
button "大" primary size=lg

input "小" size=sm
input "大" size=lg
```

### 幅と高さ

```wireframe
card w=400 {
  // 固定幅
}

placeholder w=300 h=200 {
  // 固定サイズ
}

card minW=200 maxW=600 {
  // 最小/最大制約
}
```

## 間隔

### パディング省略形

| 属性 | 説明   |
| ---- | ------ |
| `p`  | 全方向 |
| `px` | 左右   |
| `py` | 上下   |
| `pt` | 上のみ |
| `pr` | 右のみ |
| `pb` | 下のみ |
| `pl` | 左のみ |

```wireframe
card p=16 {
  // 全方向16px
}

card px=24 py=16 {
  // 水平24px、垂直16px
}
```

### マージン省略形

| 属性 | 説明   |
| ---- | ------ |
| `m`  | 全方向 |
| `mx` | 左右   |
| `my` | 上下   |
| `mt` | 上のみ |
| `mr` | 右のみ |
| `mb` | 下のみ |
| `ml` | 左のみ |

```wireframe
card mb=16 {
  // 下マージン16px
}

divider my=24 {
  // 垂直マージン24px
}
```

## レンダーオプション

### HTMLレンダー

```javascript
import { parse, render } from '@wireweave/core'

const doc = parse(source)
const { html, css } = render(doc, {
  theme: 'light', // 'light' または 'dark'
})
```

### SVGレンダー

```javascript
import { parse, renderToSvg } from '@wireweave/core'

const doc = parse(source)
const { svg } = renderToSvg(doc, {
  width: 1200,
  padding: 24,
  theme: 'light',
})
```

## ベストプラクティス

1. **セマンティックバリアントを使用** - カスタムカラーの代わりに `primary`, `success`, `danger` を使用
2. **一貫性を維持** - ワイヤーフレームごとに1つのテーマを維持
3. **レイアウトに集中** - ワイヤーフレームは構造に関するもので、ビジュアルデザインではない
4. **シンプルに保つ** - 過度なスタイリングを避ける；ワイヤーフレームは素早いスケッチであるべき
5. **間隔トークンを使用** - 一貫した間隔値を使用 (8, 16, 24, 32)

## 次のステップ

- [MCPサーバーガイド](/ja/guide/mcp-server) - AI統合
- [コンポーネントリファレンス](/ja/reference/components) - コンポーネントの詳細
