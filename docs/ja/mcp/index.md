# MCPクライアント設定

このセクションでは、さまざまなAIアシスタントにWireweave MCPサーバーを接続する方法を説明します。

## MCPとは？

[Model Context Protocol](https://modelcontextprotocol.io/)（MCP）は、AIアシスタントが外部ツールやデータソースと連携できるオープンスタンダードです。Wireweaveは、MCP互換クライアントでワイヤーフレーム生成機能を使用できるMCPサーバーを提供しています。

## 前提条件

MCPクライアントをセットアップする前に、以下が必要です：

1. **APIキー** - [Wireweaveダッシュボード](https://wireweave.org/dashboard/keys)で取得
2. **Node.js 18+** - npxでMCPサーバーを実行するために必要
3. **MCP互換クライアント** - Claude Desktop、Cursor、VS Codeなど

## 対応クライアント

| クライアント                             | ステータス   | プラットフォーム      |
| ---------------------------------------- | ------------ | --------------------- |
| [Claude Desktop](/ja/mcp/claude-desktop) | フルサポート | macOS, Windows        |
| [Cursor](/ja/mcp/cursor)                 | フルサポート | macOS, Windows, Linux |
| [VS Code](/ja/mcp/vscode)                | フルサポート | macOS, Windows, Linux |

## クイックスタート

すべてのクライアントは同様の設定形式を使用します：

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ここにAPIキーを入力"
      }
    }
  }
}
```

クライアント間の主な違い：

- **設定ファイルの場所** - クライアントごとに異なるパスに設定を保存
- **設定形式** - 一部のクライアントは追加オプションを提供

詳細な設定方法については、上記のリストからクライアントを選択してください。

## 利用可能なツール

設定が完了すると、AIアシスタントで以下のワイヤーフレームツールを使用できます：

| ツール                       | 説明                           | クレジット |
| ---------------------------- | ------------------------------ | ---------- |
| `wireweave_parse`            | DSLをASTにパース               | 0          |
| `wireweave_validate`         | DSL構文を検証                  | 0          |
| `wireweave_render_html`      | HTML/CSSにレンダリング         | 0          |
| `wireweave_render_html_file` | ファイルにレンダリングして保存 | 0          |
| `wireweave_grammar`          | DSL文法ドキュメントを取得      | 0          |

> v2.0以降、非AIツールはすべて無料です。AI生成ツール(`wireweave_ai_generate`、`wireweave_ai_generate_from_image`、`wireweave_ai_improve`)のみクレジットを消費します。

## トラブルシューティング

### よくある問題

- **"API key not set"** - envセクションの`WIREWEAVE_API_KEY`が正しく設定されているか確認
- **"Server not found"** - Node.js 18+がインストールされPATHに設定されているか確認
- **"Rate limit exceeded"** - リセットを待つかプランをアップグレード

### サポート

- [トラブルシューティングガイド](/ja/guide/mcp-server#troubleshooting)を確認
- [support@wireweave.org](mailto:support@wireweave.org)にお問い合わせ
