# ページ

すべてのWireweaveワイヤーフレームは`page`コンポーネントで始まります。これはすべてのコンテンツのルートコンテナです。

## 基本的なページ

```wireframe
page {
  // コンテンツがここに入ります
}
```

## ページタイトル

ページにタイトルを付けます：

```wireframe
page "Login" {
  // コンテンツ
}
```

タイトルはワイヤーフレームのヘッダーに表示され、ドキュメントに使用できます。

## ページテーマ

ページ全体のカラーテーマを設定します：

```wireframe
page "Dashboard" theme:light {
  // ライトテーマ（デフォルト）
}

page "Dashboard" theme:dark {
  // ダークテーマ
}
```

## ページレイアウト

### 全幅

```wireframe
page fullWidth {
  // コンテンツが全幅を占めます
}
```

### 中央揃え

```wireframe
page center {
  // コンテンツが中央に揃えられます
}
```

### 最大幅

```wireframe
page maxWidth:1200 {
  // コンテンツが1200pxに制限されます
}
```

## 一般的なページ構造

### ランディングページ

```wireframe
page "Home" {
  navbar {
    logo "Brand"
    nav { link "Features" link "Pricing" link "About" }
    button "Sign Up" primary
  }

  section hero center {
    heading "Welcome to Our Product"
    text "The best solution for your needs"
    button "Get Started" primary
  }

  section features {
    grid columns:3 {
      card { heading "Fast" text "Lightning quick performance" }
      card { heading "Simple" text "Easy to use interface" }
      card { heading "Secure" text "Enterprise-grade security" }
    }
  }

  footer {
    text "Copyright 2026"
  }
}
```

### ダッシュボード

```wireframe
page "Dashboard" {
  navbar {
    logo "App"
    nav { link "Dashboard" active link "Settings" }
    avatar "User"
  }

  row {
    sidebar width:240 {
      menu {
        item "Overview"
        item "Analytics"
        item "Reports"
        item "Settings"
      }
    }

    main {
      heading "Overview"
      grid columns:4 {
        card { text "Users" heading "1,234" }
        card { text "Revenue" heading "$56,789" }
        card { text "Orders" heading "890" }
        card { text "Growth" heading "+12%" }
      }

      card {
        heading "Recent Activity"
        table { ... }
      }
    }
  }
}
```

### 認証ページ

```wireframe
page "Login" center {
  card width:400 {
    heading "Welcome Back"
    text "Sign in to your account"

    input "Email" email
    input "Password" password

    row justify:between {
      checkbox "Remember me"
      link "Forgot password?"
    }

    button "Sign In" primary fullWidth

    divider "or"

    button "Continue with Google" secondary fullWidth
  }
}
```

### 設定ページ

```wireframe
page "Settings" {
  navbar { ... }

  row {
    sidebar {
      menu {
        item "Profile"
        item "Account"
        item "Security"
        item "Notifications"
      }
    }

    main {
      heading "Profile Settings"

      card {
        row gap:24 {
          avatar "User" size:80
          stack {
            heading "John Doe" level:3
            text "john@example.com" muted
            button "Change Photo" secondary
          }
        }
      }

      card {
        heading "Personal Information" level:3
        form {
          row gap:16 {
            input "First Name" text
            input "Last Name" text
          }
          input "Email" email
          input "Bio" textarea

          row justify:end {
            button "Cancel" secondary
            button "Save Changes" primary
          }
        }
      }
    }
  }
}
```

## キャンバス上の複数ページ

1つの `.wf` ファイルに複数の `page` ブロックを宣言すると、ワイヤーフレームキャンバス上に横並びで配置されます。

### オートフロー

座標を指定しないページは水平方向に流れ、デフォルトの間隔は 64px です：

```wireframe
page "Login" viewport="375x812" {
  // モバイルログイン画面
}

page "Verify Code" viewport="375x812" {
  // SMSコード入力
}

page "Welcome" viewport="375x812" {
  // サインアップ後のランディング
}
```

### `at(x, y)` で明示的に配置

`at(x, y)` でページをキャンバス座標に固定します。`at(...)` 付きのページは指定通りの位置に配置され、ないページはオートフローを続けます。

```wireframe
page "Login" at(0, 0) viewport="1280x800" {
  // ...
}

page "Dashboard" at(1400, 0) viewport="1280x800" {
  // ...
}

page "Settings" at(1400, 900) viewport="1280x800" {
  // ...
}
```

線形の体験フローにはオートフローを、キャンバス自体が構造を表現する場合（分岐、ビフォーアフター、アプリ領域など）には `at(x, y)` を使ってください。

### 1ページ内でフローを表現

ページを分けずに単一ページで*フローを叙述*したい場合は、セクションを使います：

```wireframe
page "User Flow" {
  section "Step 1: Login"     { card { ... } }
  section "Step 2: Dashboard" { card { ... } }
  section "Step 3: Settings"  { card { ... } }
}
```

## 次のステップ

- [コンポーネント](/ja/guide/components) - 利用可能なUIコンポーネント
- [レイアウト](/ja/guide/layouts) - レイアウトオプション
