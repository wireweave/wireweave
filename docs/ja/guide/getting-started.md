# はじめる

このガイドでは、Wireweaveをセットアップして最初のワイヤーフレームを作成する方法を説明します。

## インストール

### オンラインエディター

Wireweaveを試す最も簡単な方法は[ダッシュボードエディター](https://wireweave.org/dashboard)を使用することです。サインインして、オンラインでワイヤーフレームを作成、編集、保存できます！

### NPMパッケージ

プロジェクトにコアライブラリをインストールします：

```bash
npm install @wireweave/core
```

### AIアシスタント用MCPサーバー

Claudeやその他のAIアシスタントでWireweaveを使用するには：

1. [ダッシュボード](https://wireweave.org/dashboard)でAPIキーを取得します

2. Claude Desktopの設定に追加します：

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

3. Claudeにワイヤーフレームの作成を依頼しましょう！

## 最初のワイヤーフレーム

シンプルなお問い合わせフォームを作成してみましょう：

```wireframe
page "Contact" {
  header border {
    row justify=between align=center {
      title "Company" level=3
      nav ["Home", "About", "Contact"]
    }
  }

  main p=4 {
    title "Get in Touch" level=1
    text "We'd love to hear from you." muted

    card shadow=md p=4 {
      col gap=4 {
        input "Name" placeholder="Your name"
        input "Email" inputType=email placeholder="your@email.com"
        textarea "Message" placeholder="Your message" rows=4
        button "Send Message" primary
      }
    }
  }

  footer border p=4 {
    text "© 2026 Company Inc." muted
  }
}
```

## 構文を理解する

### ページ

すべてのワイヤーフレームは`page`で始まります：

```wireframe
page "Page Title" {
  // コンテンツがここに入ります
}
```

### コンポーネント

コンポーネントはページ内にネストされます：

```wireframe
page {
  card {
    title "Title" level=3
    text "Description"
    button "Action" primary
  }
}
```

### 属性

属性を追加してコンポーネントをカスタマイズします：

```wireframe
button "Click Me" primary           // primaryスタイル
button "Cancel" secondary           // secondaryスタイル
card shadow=md border { }           // シャドウとボーダー付きカード
input "Email" inputType=email       // メール入力タイプ
row justify=center gap=4 { }        // 中央揃えrowとギャップ
```

## 次のステップ

- [コンポーネントガイド](/ja/guide/components) - 利用可能なコンポーネントを学ぶ
- [レイアウトガイド](/ja/guide/layouts) - レイアウトオプションをマスターする
- [MCPサーバーガイド](/ja/guide/mcp-server) - AI統合をセットアップする
