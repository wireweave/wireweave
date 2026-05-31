# レイアウト

Wireweaveは、ワイヤーフレームコンテンツを整理するための柔軟なレイアウトオプションを提供します。

## ページレイアウト

### 基本レイアウト

```wireframe
page "Basic" {
  header { }
  main { }
  footer { }
}
```

### サイドバーレイアウト

```wireframe
page "Dashboard" {
  header { }
  row {
    sidebar { }
    main { }
  }
  footer { }
}
```

### 2カラムレイアウト

```wireframe
page "Blog" {
  main {
    row {
      col span=8 { }
      col span=4 { }
    }
  }
}
```

## レイアウトコンポーネント

### Row

水平方向の配置：

```wireframe
row {
  card { }
  card { }
  card { }
}
```

### Col

グリッドカラム幅を持つ垂直セクション：

```wireframe
row {
  col span=6 {
    // 半分の幅
  }
  col span=6 {
    // 半分の幅
  }
}
```

### レスポンシブカラム

異なる画面サイズに対応するレスポンシブブレークポイント：

```wireframe
row {
  col span=12 md=6 lg=4 {
    // モバイルで全幅、タブレットで半分、デスクトップで1/3
  }
  col span=12 md=6 lg=4 {
    // モバイルで全幅、タブレットで半分、デスクトップで1/3
  }
  col span=12 md=12 lg=4 {
    // モバイル/タブレットで全幅、デスクトップで1/3
  }
}
```

### Stack

コンテンツの高さのみを使用する垂直スタック。`col`とは異なり、利用可能なスペースを埋めるためにフレックスしません。

```wireframe
stack gap=4 {
  text "アイテム 1"
  text "アイテム 2"
  text "アイテム 3"
}
```

Stackはコンテンツを中央に配置するのに最適です：

```wireframe
row justify=center align=center h=300 {
  stack align=center gap=4 {
    icon "star" size=xl
    text "中央配置されたコンテンツ"
    button "アクション" primary
  }
}
```

**属性：**

- `gap` - アイテム間のスペース
- `align` - 交差軸の配置: `start`, `center`, `end`, `stretch`
- `border` - ボーダーを表示
- `bg` - 背景色: `muted`, `primary`, `secondary`

### Relative

絶対位置指定のためのコンテナ。子要素は`x`と`y`属性で正確な位置を指定できます。

```wireframe
relative w=300 h=200 {
  image w=full h=full
  badge "New" x=10 y=10
}
```

画像の上にテキストをオーバーレイ：

```wireframe
relative {
  image w=full h=200
  col x=16 y=160 {
    text "写真タイトル" weight=bold
    text "説明" size=sm muted
  }
}
```

**ユースケース：**

- 商品画像にバッジを表示
- ヒーロー画像にテキストをオーバーレイ
- フローティングアクションボタン
- ウォーターマーク

### スクロール可能なコンテンツ

`scroll`属性を使用してコンテンツをスクロール可能にします：

```wireframe
page {
  header { text "固定ヘッダー" }
  main scroll {
    // スクロール可能なコンテンツ
    card { text "アイテム 1" }
    card { text "アイテム 2" }
    card { text "アイテム 3" }
  }
  footer { text "固定フッター" }
}
```

## 配置

### 水平配置 (justify)

```wireframe
row justify=start {
  // 左揃え（デフォルト）
}

row justify=center {
  // 水平中央揃え
}

row justify=end {
  // 右揃え
}
```

### 垂直配置 (align)

```wireframe
row align=start {
  // 上揃え
}

row align=center {
  // 垂直中央揃え
}

row align=end {
  // 下揃え
}
```

### 分配

```wireframe
row justify=between {
  // アイテム間にスペース
}

row justify=around {
  // アイテム周囲にスペース
}

row justify=evenly {
  // アイテム間に均等なスペース
}
```

## 間隔

### パディング

```wireframe
card p=16 {
  // 16pxパディング
}

card p=24 {
  // 24pxパディング
}

card px=16 py=8 {
  // 水平16px、垂直8px
}
```

### ギャップ

```wireframe
row gap=8 {
  // アイテム間8pxギャップ
}

col gap=16 {
  // アイテム間16pxギャップ
}
```

### マージン

```wireframe
section m=32 {
  // 32pxマージン
}

card mt=16 mb=8 {
  // 上16px、下8px
}
```

## レスポンシブヒント

Wireweaveはレスポンシブブレークポイントをサポートしています：

| ブレークポイント | プレフィックス | 最小幅 |
| ---------------- | -------------- | ------ |
| Small            | `sm`           | 576px  |
| Medium           | `md`           | 768px  |
| Large            | `lg`           | 992px  |
| Extra Large      | `xl`           | 1200px |

```wireframe
row wrap {
  col span=12 sm=6 md=4 lg=3 {
    // レスポンシブカラム幅
  }
}
```

## 一般的なパターン

### カードグリッド

```wireframe
row gap=24 wrap {
  col span=12 md=4 {
    card {
      image "Product 1"
      title "製品名" level=4
      text "$99.00"
      button "カートに追加"
    }
  }
  col span=12 md=4 {
    card {
      image "Product 2"
      title "製品名" level=4
      text "$99.00"
      button "カートに追加"
    }
  }
  col span=12 md=4 {
    card {
      image "Product 3"
      title "製品名" level=4
      text "$99.00"
      button "カートに追加"
    }
  }
}
```

### フォームレイアウト

```wireframe
card p=24 {
  col gap=16 {
    title "お問い合わせフォーム" level=2
    input "お名前"
    input "メール" inputType=email
    textarea "メッセージ"
    row justify=end gap=8 {
      button "キャンセル" secondary
      button "送信" primary
    }
  }
}
```

### ダッシュボードレイアウト

```wireframe
page "Dashboard" {
  header border {
    row justify=between align=center px=16 {
      title "アプリ" level=3
      nav { }
    }
  }
  row {
    sidebar w=240 {
      nav vertical { }
    }
    main p=24 {
      row gap=16 wrap {
        col span=6 lg=3 {
          card { title "ユーザー" level=4 text "1,234" }
        }
        col span=6 lg=3 {
          card { title "売上" level=4 text "$56,789" }
        }
        col span=6 lg=3 {
          card { title "注文" level=4 text "890" }
        }
        col span=6 lg=3 {
          card { title "成長率" level=4 text "+12%" }
        }
      }
    }
  }
}
```

## 次のステップ

- [スタイリングガイド](/ja/guide/styling) - 色とテーマのカスタマイズ
- [コンポーネントリファレンス](/ja/reference/components) - すべてのコンポーネント
