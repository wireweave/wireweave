# 文法リファレンス

Wireweave DSLの完全な文法リファレンスです。

## 基本構文

### コメント

```wireframe
// 単一行コメント

/* 複数行
   コメント */
```

### 文字列

```wireframe
"ダブルクォート文字列"
'シングルクォート文字列'
```

### 数値

```wireframe
100        // 整数
3.14       // 浮動小数点
```

### ブーリアン

```wireframe
true
false
```

## 構造

### Page

```wireframe
page [title] [at(x, y)] [modifiers] {
  [children]
}
```

例：

```wireframe
page { }
page "Title" { }
page "Title" centered { }
page "Title" at(0, 0) viewport="1280x800" { }
```

同じ `.wf` ファイル内に複数の `page` ブロックを置くと、ワイヤーフレームキャンバス上に横並びで配置されます。`at(x, y)` 付きのページは指定されたキャンバス座標に固定され、`at(...)` がないページは 64px の間隔で水平方向にオートフローします。詳細は [ページ — キャンバス上の複数ページ](/ja/guide/pages#キャンバス上の複数ページ) を参照。

### コンポーネント

```wireframe
component_name [label] [modifiers] {
  [children]
}
```

例：

```wireframe
card { }
card "Title" { }
card shadow=md border { }
button "Click" primary
```

## コンポーネントリファレンス

### Layout

ページ構造を定義するコンポーネントです。

| コンポーネント | 説明                 | 属性                                          |
| -------------- | -------------------- | --------------------------------------------- |
| `page`         | ページルートコンテナ | title, viewport, device, centered, at, p, gap |
| `header`       | ページヘッダー領域   | p, border, gap, justify, align                |
| `main`         | メインコンテンツ領域 | p, gap                                        |
| `footer`       | ページフッター領域   | p, border, gap                                |
| `sidebar`      | サイドバー領域       | position, w, p, gap                           |
| `section`      | セクション領域       | title, expanded, p, gap                       |

```wireframe
page "Dashboard" {
  header { }
  main { }
  footer { }
}
```

### Grid

フレックスレイアウト用のコンポーネントです。

| コンポーネント | 説明                        | 属性                                   |
| -------------- | --------------------------- | -------------------------------------- |
| `row`          | 水平フレックスコンテナ      | gap, justify, align, wrap, p, m        |
| `col`          | 垂直コンテナ/グリッドカラム | span, sm, md, lg, xl, order, gap, p, w |

```wireframe
row gap=4 justify=between {
  col span=6 { }
  col span=6 { }
}
```

### Container

コンテンツをグループ化するコンポーネントです。

| コンポーネント | 説明                 | 属性                          |
| -------------- | -------------------- | ----------------------------- |
| `card`         | カードコンポーネント | title, p, shadow, border, gap |
| `modal`        | モーダルダイアログ   | title, w, h, p                |
| `drawer`       | ドロワーパネル       | title, position, p            |
| `accordion`    | アコーディオンパネル | title, p                      |

```wireframe
card title="Settings" shadow=md {
  // コンテンツ
}

modal "Confirm" {
  text "Are you sure?"
  button "OK" primary
}
```

### Text

テキストを表示するコンポーネントです。

| コンポーネント | 説明             | 属性                          |
| -------------- | ---------------- | ----------------------------- |
| `text`         | 通常テキスト     | size, weight, align, muted, m |
| `title`        | 見出し（h1〜h6） | level, size, align, m         |
| `link`         | ハイパーリンク   | href, external                |

```wireframe
title "Welcome" level=1
text "Description" muted
link "Learn more" href="/docs"
```

### Input

ユーザー入力を受け取るコンポーネントです。

| コンポーネント | 説明               | 属性                                                                      |
| -------------- | ------------------ | ------------------------------------------------------------------------- |
| `input`        | 入力フィールド     | label, type, placeholder, value, disabled, required, icon                 |
| `textarea`     | 複数行入力         | label, placeholder, value, rows, disabled                                 |
| `select`       | ドロップダウン選択 | label, placeholder, value, disabled                                       |
| `checkbox`     | チェックボックス   | label, checked, disabled                                                  |
| `radio`        | ラジオボタン       | label, name, checked, disabled                                            |
| `switch`       | トグルスイッチ     | label, checked, disabled                                                  |
| `slider`       | スライダー         | label, min, max, value, step, disabled                                    |
| `button`       | ボタン             | primary, secondary, outline, ghost, danger, size, icon, disabled, loading |

入力タイプ：`text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`

```wireframe
input "Email" inputType=email placeholder="Enter email"
textarea "Message" rows=4
select "Country" { }
checkbox "Agree" checked
button "Submit" primary
button "Cancel" outline
```

### Display

ビジュアル要素を表示するコンポーネントです。

| コンポーネント | 説明             | 属性                      |
| -------------- | ---------------- | ------------------------- |
| `image`        | 画像             | src, alt, w, h            |
| `placeholder`  | プレースホルダー | label, w, h               |
| `avatar`       | アバター         | name, src, size           |
| `badge`        | バッジ           | variant, pill, icon, size |
| `icon`         | アイコン         | name, size, muted         |
| `divider`      | 区切り線         | m, my, mx                 |

```wireframe
image src="/photo.jpg" w=200
avatar "John" size=lg
badge "New" variant=success pill
icon "home" size=md
divider my=4
```

### Data

データを表示するコンポーネントです。

| コンポーネント | 説明     | 属性                     |
| -------------- | -------- | ------------------------ |
| `table`        | テーブル | striped, bordered, hover |
| `list`         | リスト   | ordered, none, gap       |

```wireframe
table striped hover {
  // カラムと行の定義
}

list ordered {
  // 項目
}
```

### Feedback

ユーザーにフィードバックを提供するコンポーネントです。

| コンポーネント | 説明                 | 属性                             |
| -------------- | -------------------- | -------------------------------- |
| `alert`        | アラートメッセージ   | variant, dismissible, icon       |
| `toast`        | トースト通知         | position, variant                |
| `progress`     | プログレスバー       | value, max, label, indeterminate |
| `spinner`      | ローディングスピナー | label, size                      |

Variant: `success`, `warning`, `danger`, `info`

```wireframe
alert "Success!" variant=success
progress value=75 label="Loading..."
spinner size=lg
```

### Overlay

オーバーレイUIコンポーネントです。

| コンポーネント | 説明                   | 属性     |
| -------------- | ---------------------- | -------- |
| `tooltip`      | ツールチップ           | position |
| `popover`      | ポップオーバー         | title    |
| `dropdown`     | ドロップダウンメニュー | -        |

```wireframe
tooltip "Help text" position=top {
  button "?" outline
}

dropdown {
  // 項目
}
```

### Navigation

ナビゲーションコンポーネントです。

| コンポーネント | 説明                   | 属性          |
| -------------- | ---------------------- | ------------- |
| `nav`          | ナビゲーションメニュー | vertical, gap |
| `tabs`         | タブコンポーネント     | active        |
| `breadcrumb`   | パンくずリスト         | -             |

```wireframe
nav vertical {
  // ナビゲーション項目
}

tabs active=0 {
  // タブパネル
}

breadcrumb {
  // パンくず項目
}
```

## 属性構文

### キー値属性

```wireframe
component attribute=value
component attribute="string value"
```

例：

```wireframe
col span=6
input placeholder="Enter email"
progress value=75
```

### ブーリアン属性

```wireframe
component attribute   // trueに設定
```

例：

```wireframe
button primary        // primary=true
input disabled        // disabled=true
checkbox checked      // checked=true
```

## 間隔システム

Wireweaveは間隔トークンシステムを使用します：

| トークン | 値   |
| -------- | ---- |
| 0        | 0px  |
| 1        | 4px  |
| 2        | 8px  |
| 3        | 12px |
| 4        | 16px |
| 5        | 20px |
| 6        | 24px |
| 8        | 32px |
| 10       | 40px |
| 12       | 48px |

```wireframe
card p=4          // padding: 16px
row gap=2         // gap: 8px
text mt=6         // margin-top: 24px
```

## 完全な例

```wireframe
page "User Management" centered {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      nav {
        // ナビゲーション項目
      }
      avatar "Admin"
    }
  }

  row {
    sidebar w=200 {
      nav vertical {
        // メニュー項目
      }
    }

    main {
      row justify=between {
        title "Users" level=2
        button "Add User" primary
      }

      card {
        table striped hover {
          // テーブルコンテンツ
        }
      }

      row justify=center gap=2 {
        button "Previous" secondary
        text "Page 1 of 10"
        button "Next" secondary
      }
    }
  }
}
```
