# VS Codeの設定

このガイドでは、Visual Studio CodeにWireweave MCPサーバーを設定する方法を説明します。

## 前提条件

- [VS Code](https://code.visualstudio.com/)がインストール済み
- MCP互換拡張機能（例：MCP対応GitHub Copilot拡張機能）
- Node.js 18+がインストール済み
- [ダッシュボード](https://wireweave.org/dashboard/keys)からWireweave APIキーを取得

::: info
VS Code自体はMCPをネイティブでサポートしていません。MCP対応のGitHub Copilot拡張機能または他のMCP互換AI拡張機能が必要です。
:::

## ステップ1：設定ファイルの場所を確認

VS Code MCP設定ファイルを見つけるか作成します：

::: code-group

```bash [macOS]
# 設定ファイルの場所
~/.vscode/mcp.json

# 必要に応じてディレクトリを作成
mkdir -p ~/.vscode
```

```bash [Windows]
# 設定ファイルの場所
%USERPROFILE%\.vscode\mcp.json

# 通常は以下のパス
C:\Users\<ユーザー名>\.vscode\mcp.json
```

```bash [Linux]
# 設定ファイルの場所
~/.vscode/mcp.json

# 必要に応じてディレクトリを作成
mkdir -p ~/.vscode
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

### プロジェクトレベルの設定

プロジェクトごとの設定には、ワークスペースに`.vscode/mcp.json`を作成します：

```bash
プロジェクト/
├── .vscode/
│   └── mcp.json    # プロジェクト固有のMCP設定
├── src/
└── wireframes/
```

## ステップ3：AI拡張機能を設定

使用するMCP互換拡張機能によっては、追加の設定が必要な場合があります：

### GitHub Copilot（MCP対応の場合）

1. VS Code設定を開く（Cmd/Ctrl + ,）
2. 「Copilot MCP」を検索
3. MCPサーバーサポートを有効化
4. VS Codeをリロード

### その他のMCP拡張機能

MCPサーバーのロードについては、拡張機能固有のドキュメントを参照してください。

## ステップ4：VS Codeを再起動

1. すべてのVS Codeウィンドウを閉じる
2. VS Codeを完全に終了
3. VS Codeとプロジェクトを再度開く

## ステップ5：設定を確認

AIチャットパネルで確認：

> 「利用可能なワイヤーフレームツールは何ですか？」

AIがWireweaveツールのリストを表示するはずです：

- `wireweave_parse`
- `wireweave_validate`
- `wireweave_render_html`
- `wireweave_render_html_file`
- `wireweave_grammar`

## Wireweave VS Code拡張機能との併用

最高の体験のために、Wireweave VS Code拡張機能もインストールしてください：

- `.wf`ファイルの構文ハイライト
- ワイヤーフレームのライブプレビュー
- エラー診断

### インストール

1. VS Code拡張機能を開く（Cmd/Ctrl + Shift + X）
2. 「Wireweave」を検索
3. 拡張機能をインストール
4. `.wf`ファイルを開いて構文ハイライトを確認

### ワイヤーフレームのプレビュー

1. `.wf`ファイルを開く
2. Cmd/Ctrl + Shift + Pを使用
3. 「Wireweave: Preview」を検索
4. サイドパネルにライブワイヤーフレームプレビューが表示

## 使用例

### 生成とプレビュー

1. AIに依頼：「設定ページのワイヤーフレームを作成して」
2. 生成されたコードを`settings.wf`として保存
3. Wireweave拡張機能でプレビュー

### ワイヤーフレームワークフロー

```
1. チャットでUIを説明
2. AIがMCPを使用して.wfコードを生成
3. wireframes/フォルダに保存
4. Wireweave拡張機能でプレビュー
5. AIフィードバックで反復
6. ワイヤーフレームに基づいて実装
```

## トラブルシューティング

### MCP拡張機能がサーバーを検出しない

1. MCP設定ファイルの場所を確認
2. 拡張機能のMCP設定を確認
3. VS CodeのPATHにNode.jsが含まれているか確認

### OS別のパス問題

npxが見つからない場合はフルパスを使用：

::: code-group

```json [macOS (nvm)]
{
  "command": "/Users/ユーザー/.nvm/versions/node/v20.0.0/bin/npx"
}
```

```json [Windows]
{
  "command": "C:\\Program Files\\nodejs\\npx.cmd"
}
```

```json [Linux (nvm)]
{
  "command": "/home/ユーザー/.nvm/versions/node/v20.0.0/bin/npx"
}
```

:::

### VS CodeターミナルのPATH

nvm/fnmを使用している場合、VS CodeがシェルのPATHを継承するように設定：

**macOS/Linux:**

```bash
# ~/.zshrcまたは~/.bashrcに
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

その後、ターミナルからVS Codeを再起動：

```bash
code .
```

### 設定ファイルがロードされない

1. JSON構文を検証
2. ファイル権限を確認
3. グローバル設定（`~/.vscode/mcp.json`）vs プロジェクト設定を試す

## 環境変数

| 変数                | 必須   | 説明                                                     |
| ------------------- | ------ | -------------------------------------------------------- |
| `WIREWEAVE_API_KEY` | はい   | ダッシュボードから取得したAPIキー                        |
| `WIREWEAVE_API_URL` | いいえ | カスタムAPI URL（デフォルト: https://api.wireweave.org） |

## 関連ツール

| ツール                                              | 目的                                     |
| --------------------------------------------------- | ---------------------------------------- |
| [Wireweave VS Code拡張](/ja/guide/vscode-extension) | 構文ハイライトとプレビュー               |
| [Markdownプラグイン](/ja/guide/markdown-plugin)     | ドキュメントにワイヤーフレームを埋め込む |

## 次のステップ

- [VS Code拡張ガイド](/ja/guide/vscode-extension) - 拡張機能の完全なドキュメント
- [DSL文法](/ja/reference/grammar) - ワイヤーフレーム構文を学ぶ
- [コンポーネントリファレンス](/ja/reference/components) - 利用可能なUIコンポーネント
