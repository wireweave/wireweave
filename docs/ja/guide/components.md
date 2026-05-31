# コンポーネント

Wireweaveは、ワイヤーフレームを素早く構築するためのセマンティックUIコンポーネントを提供します。

## コンポーネントカテゴリ

Wireweaveコンポーネントは10のカテゴリに分類されます：

| カテゴリ       | 目的                     | コンポーネント                                                   |
| -------------- | ------------------------ | ---------------------------------------------------------------- |
| **Layout**     | ページ構造               | page, header, main, footer, sidebar, section                     |
| **Grid**       | フレックスレイアウト     | row, col                                                         |
| **Container**  | コンテンツグループ化     | card, modal, drawer, accordion                                   |
| **Text**       | テキスト表示             | text, title, link                                                |
| **Input**      | ユーザー入力             | input, textarea, select, checkbox, radio, switch, slider, button |
| **Display**    | ビジュアル要素           | image, placeholder, avatar, badge, icon, divider                 |
| **Data**       | データ表示               | table, list                                                      |
| **Feedback**   | ステータスフィードバック | alert, toast, progress, spinner                                  |
| **Overlay**    | オーバーレイUI           | tooltip, popover, dropdown                                       |
| **Navigation** | ナビゲーション           | nav, tabs, breadcrumb                                            |

## Layout

ページ全体の構造を定義します。すべてのワイヤーフレームは`page`で始まります。

```wireframe
page "Dashboard" {
  header {
    // ロゴ、ナビゲーション
  }
  main {
    // メインコンテンツ
  }
  footer {
    // 著作権、リンク
  }
}
```

ダッシュボードレイアウトを作成するには`sidebar`を追加します：

```wireframe
page {
  header { }
  row {
    sidebar w=240 { }
    main { }
  }
}
```

## Grid

`row`と`col`で柔軟なレイアウトを構築します。

```wireframe
row gap=4 justify=between {
  col span=8 {
    // メインエリア（8/12）
  }
  col span=4 {
    // サイドエリア（4/12）
  }
}
```

ボタングループのようなシンプルな水平配置にも便利です：

```wireframe
row gap=2 justify=end {
  button "Cancel" secondary
  button "Save" primary
}
```

## Container

コンテンツを視覚的にグループ化します。

**card** - 最もよく使われるコンテナ：

```wireframe
card title="User Profile" {
  avatar "John"
  text "john@example.com"
}
```

**modal** - ユーザー確認が必要な場合：

```wireframe
modal "Delete Item?" {
  text "This action cannot be undone."
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

## Text

テキストコンテンツを表示します。

```wireframe
title "Welcome" level=1
text "Main description here"
text "Secondary info" muted
link "Learn more" href="/docs"
```

## Input

フォームとユーザー入力を処理します。

**基本的なフォームパターン：**

```wireframe
card {
  title "Login" level=2
  input "Email" inputType=email
  input "Password" inputType=password
  checkbox "Remember me"
  button "Sign In" primary
}
```

**さまざまな入力コンポーネント：**

```wireframe
select "Country" placeholder="Select..."
switch "Notifications" checked
slider "Volume" min=0 max=100 value=50
```

## Display

ビジュアル要素を表示します。

```wireframe
row gap=4 align=center {
  avatar "John" size=lg
  col {
    text "John Doe" weight=bold
    badge "Admin" variant=success
  }
}

divider my=4

placeholder "Product Image" w=300 h=200
```

## Data

構造化されたデータを表示します。

```wireframe
table striped hover {
  // テーブルデータ
}

list ordered {
  // 順序付きリスト
}
```

## Feedback

ユーザーにステータスを伝えます。

```wireframe
alert "Changes saved successfully" variant=success

progress value=75 label="Uploading..."

spinner label="Loading..."
```

## Overlay

追加情報やメニューをオーバーレイで表示します。

```wireframe
tooltip "Click to save" {
  button "Save" primary
}

dropdown {
  // ドロップダウンメニュー項目
}
```

## Navigation

ページナビゲーション用のコンポーネントです。

```wireframe
nav {
  // 水平ナビゲーション
}

tabs active=0 {
  // タブパネル
}

breadcrumb {
  // パス表示
}
```

## 一般的なパターン

### ログインフォーム

```wireframe
page "Login" centered {
  card w=400 p=6 {
    title "Sign In" level=2 align=center
    input "Email" inputType=email
    input "Password" inputType=password
    row justify=between align=center {
      checkbox "Remember me"
      link "Forgot password?"
    }
    button "Sign In" primary
    divider my=4
    button "Continue with Google" outline
  }
}
```

### ダッシュボード

```wireframe
page "Dashboard" {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      avatar "User"
    }
  }
  row {
    sidebar w=200 {
      nav vertical { }
    }
    main {
      row gap=4 {
        card { title "Users" text "1,234" }
        card { title "Revenue" text "$56K" }
        card { title "Orders" text "890" }
      }
    }
  }
}
```

## 次のステップ

- [レイアウトガイド](/ja/guide/layouts) - レイアウトの詳細
- [スタイリングガイド](/ja/guide/styling) - スタイリングオプション
- [コンポーネントリファレンス](/ja/reference/components) - すべての属性の詳細
