# Claude Desktopの設定

このガイドでは、Claude DesktopにWireweave MCPサーバーを設定する方法を説明します。

## 前提条件

- [Claude Desktop](https://claude.ai/download)がインストール済み
- Node.js 18+がインストール済み
- [ダッシュボード](https://wireweave.org/dashboard/keys)からWireweave APIキーを取得

## ステップ1：設定ファイルの場所を確認

Claude Desktop設定ファイルを見つけるか作成します：

::: code-group

```bash [macOS]
# 設定ファイルの場所
~/Library/Application Support/Claude/claude_desktop_config.json

# 必要に応じてディレクトリを作成
mkdir -p ~/Library/Application\ Support/Claude
```

```bash [Windows]
# 設定ファイルの場所
%APPDATA%\Claude\claude_desktop_config.json

# 通常は以下のパス
C:\Users\<ユーザー名>\AppData\Roaming\Claude\claude_desktop_config.json
```

:::

## ステップ2：MCP設定を追加

エディターで設定ファイルを開き、Wireweave MCPサーバーを追加します：

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_ここにAPIキーを入力"
      }
    }
  }
}
```

::: tip
すでに他のMCPサーバーが設定されている場合は、`mcpServers`オブジェクトに`wireweave`を追加してください。
:::

### 複数サーバーの完全な例

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_ここにAPIキーを入力"
      }
    },
    "other-server": {
      "command": "npx",
      "args": ["other-mcp-server"]
    }
  }
}
```

## ステップ3：Claude Desktopを再起動

1. Claude Desktopを完全に終了（システムトレイ/メニューバーを確認）
2. Claude Desktopを再度開く
3. MCPサーバーが自動的にロードされます

## ステップ4：設定を確認

Claudeに接続確認を依頼します：

> 「利用可能なワイヤーフレームツールは何ですか？」

ClaudeがWireweaveツールのリストを表示するはずです：

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## 使用例

設定が完了したら、以下のようなプロンプトを試してください：

### シンプルなワイヤーフレームを作成

> 「メール、パスワードフィールドと送信ボタンがあるログインページのワイヤーフレームを作成してください」

### ダッシュボードレイアウトを生成

> 「サイドバー、ヘッダー、3つの統計カードがあるダッシュボードのワイヤーフレームをデザインしてください」

### モバイルファーストデザイン

> 「検索とフィルターがある商品一覧ページのモバイルフレンドリーなワイヤーフレームを作成してください」

## トラブルシューティング

### サーバーがロードされない

1. **設定構文を確認** - 有効なJSONであることを確認（末尾のカンマなし）
2. **ファイルの場所を確認** - 設定ファイルが正しいディレクトリにあることを確認
3. **Claude Desktopのログを確認**：
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### "API key not set"エラー

APIキーの形式を確認：

```json
{
  "env": {
    "WIREWEAVE_API_KEY": "ww_xxxxxxxxxxxx"
  }
}
```

キーは`ww_`プレフィックスで始まる必要があります。

### "npx command not found"

Node.jsがインストールされPATHに登録されていることを確認：

```bash
# Node.jsバージョンを確認
node --version  # 18以上である必要があります

# npxが利用可能か確認
npx --version
```

### レート制限の問題

レート制限エラーが発生した場合：

- 無料ティア：1分あたり10回、月1,000回
- より高い制限は[プランをアップグレード](https://wireweave.org/pricing)

## 環境変数

| 変数                | 必須   | 説明                                                     |
| ------------------- | ------ | -------------------------------------------------------- |
| `WIREWEAVE_API_KEY` | はい   | ダッシュボードから取得したAPIキー                        |
| `WIREWEAVE_API_URL` | いいえ | カスタムAPI URL（デフォルト: https://api.wireweave.org） |

## 次のステップ

- [利用可能なツール](/ja/guide/mcp-server#available-tools) - 各ツールの機能を学ぶ
- [DSL文法](/ja/reference/grammar) - ワイヤーフレーム構文を理解する
- [例](/ja/guide/getting-started#examples) - より多くのワイヤーフレーム例を見る
