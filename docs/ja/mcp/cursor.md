# Cursorの設定

このガイドでは、Cursor IDEにWireweave MCPサーバーを設定する方法を説明します。

## 前提条件

- [Cursor](https://cursor.sh/)がインストール済み
- Node.js 18+がインストール済み
- [ダッシュボード](https://wireweave.org/dashboard/keys)からWireweave APIキーを取得

## ステップ1：設定ファイルの場所を確認

Cursor MCP設定ファイルを見つけるか作成します：

::: code-group

```bash [macOS]
# 設定ファイルの場所
~/.cursor/mcp.json

# 必要に応じてディレクトリを作成
mkdir -p ~/.cursor
```

```bash [Windows]
# 設定ファイルの場所
%USERPROFILE%\.cursor\mcp.json

# 通常は以下のパス
C:\Users\<ユーザー名>\.cursor\mcp.json
```

```bash [Linux]
# 設定ファイルの場所
~/.cursor/mcp.json

# 必要に応じてディレクトリを作成
mkdir -p ~/.cursor
```

:::

## ステップ2：MCP設定を追加

`mcp.json`ファイルを作成または編集してWireweave MCPサーバーを追加します：

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
CursorはMCPをネイティブでサポートしています。MCP対応の最新バージョンを使用してください。
:::

### 代替案：プロジェクトレベルの設定

プロジェクトレベルでMCP設定を追加することもできます：

```bash
# プロジェクトルートに
.cursor/mcp.json
```

これにより、プロジェクトごとに異なるAPIキーを使用できます。

## ステップ3：Cursorを再起動

1. すべてのCursorウィンドウを閉じる
2. Cursorを完全に終了
3. Cursorとプロジェクトを再度開く

## ステップ4：設定を確認

CursorのAIチャットで確認：

> 「利用可能なワイヤーフレームツールは何ですか？」

CursorがWireweaveツールを表示するはずです：

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Cursorでの使用

### インラインワイヤーフレーム生成

コーディング中にCmd/Ctrl+Kを使用して依頼：

> 「このコンポーネントのUIワイヤーフレームを作成して」

### Composerで

Composer（Cmd/Ctrl+I）でより大きなワイヤーフレームをリクエスト：

> 「以下の要素を含む完全なダッシュボードワイヤーフレームをデザインして：
>
> - サイドバーナビゲーション
> - ユーザープロファイル付きヘッダー
> - チャート付きメインコンテンツエリア
> - フッター」

### コンテキストベースの生成

既存のコードを選択してマッチするワイヤーフレームを生成依頼：

> 「このReactコンポーネントの構造に合うワイヤーフレームを生成して」

## Cursorでのベストプラクティス

### ワークスペース統合

1. ワイヤーフレームファイル（`.wf`）を`wireframes/`ディレクトリに保管
2. CursorのAIを使ってデザインを反復
3. VS Code拡張機能またはブラウザでプレビュー

### ワークフロー例

```
1. Cursorに依頼：「ユーザープロファイルページのワイヤーフレームを作成して」
2. 生成された.wfファイルを確認
3. 依頼：「ダークモードバージョンを追加して」
4. 満足するまで反復
5. 実装の参照としてワイヤーフレームを使用
```

## トラブルシューティング

### MCPが認識されない

1. CursorバージョンがMCPをサポートしているか確認（リリースノートを確認）
2. 設定ファイルの場所と構文を確認
3. Cursorを完全に再起動

### "Command not found: npx"

CursorがNode.jsインストールにアクセスできる必要があります：

```bash
# Node.jsにアクセスできるか確認
which npx  # macOS/Linux
where npx  # Windows
```

nvm/fnmを使用している場合、フルパスを指定する必要があるかもしれません：

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "/Users/ユーザー/.nvm/versions/node/v20.0.0/bin/npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_ここにAPIキーを入力"
      }
    }
  }
}
```

### 設定がロードされない

1. JSON構文を確認（JSONバリデーターを使用）
2. ファイル権限が読み取りを許可しているか確認
3. プロジェクト設定が機能しない場合はグローバル設定を試す

### デバッグモード

詳細ログを有効化：

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "ww_ここにAPIキーを入力",
        "DEBUG": "wireweave:*"
      }
    }
  }
}
```

## 環境変数

| 変数                | 必須   | 説明                                                     |
| ------------------- | ------ | -------------------------------------------------------- |
| `WIREWEAVE_API_KEY` | はい   | ダッシュボードから取得したAPIキー                        |
| `WIREWEAVE_API_URL` | いいえ | カスタムAPI URL（デフォルト: https://api.wireweave.org） |
| `DEBUG`             | いいえ | デバッグログを有効化（`wireweave:*`）                    |

## 次のステップ

- [DSL文法](/ja/reference/grammar) - ワイヤーフレーム構文を学ぶ
- [VS Code拡張](/ja/guide/vscode-extension) - ローカルでワイヤーフレームをプレビュー
- [コンポーネントリファレンス](/ja/reference/components) - 利用可能なUIコンポーネント
