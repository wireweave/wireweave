# VS Code拡張

Wireweave VS Code拡張は、`.wf` / `.wireframe`ファイルに対してシンタックスハイライト、ライブプレビュー、コード補完、Wireweave AIエージェント統合を提供します。

> **v2.0プレリリース。** AIエージェント統合（生成 / 改善）とダッシュボードログインは`2.0.0-beta.0`で提供されます。VS Codeの**プレリリース版をインストール（Install Pre-release Version）** で試すか、安定版を使う場合は`1.x`の最新を維持してください。

## インストール

### VS Code Marketplace

1. VS Code 拡張ビューを開く（`Cmd+Shift+X` / `Ctrl+Shift+X`）
2. "Wireweave" を検索
3. 安定版は **Install**、`2.0-beta` を試すには **Install Pre-release Version** をクリック

### 手動インストール

```bash
code --install-extension wireweave.wireweave-vscode
```

## 機能

### シンタックスハイライト / ホバー / 補完

`.wf` または `.wireframe` ファイルを開くと利用可能：

- コンポーネントキーワードのハイライト（`page`, `card`, `button`, …）
- コンポーネントと属性のホバードキュメント
- コンポーネント名・モディファイア・属性キーの自動補完
- Problems パネルでのリアルタイム文法エラー診断

### ライブプレビュー

1. `.wf` ファイルを開く
2. `Cmd+Shift+V`（Mac） / `Ctrl+Shift+V`（Windows）でプレビューを開く、または `Cmd+K V` で分割パネルを開く
3. コードを編集すると、プレビューが自動更新されます

### AI生成（v2.0）

自然言語プロンプトからワイヤーフレームを生成：

- ショートカット：`Cmd+K Cmd+W`（Mac） / `Ctrl+K Ctrl+W`（Windows）
- またはコマンドパレットから **Wireweave: AI Generate** を実行

アクティブなワイヤーフレームエディタがあれば生成された DSL がその内容を置き換え、なければ新しい untitled `.wf` ドキュメントが開きます。結果は生成されながらストリーミングされます。

### AI改善（v2.0）

現在のワイヤーフレーム（選択範囲または文書全体）を指示文で洗練：

- コマンドパレットから **Wireweave: AI Improve** を実行
- `vscode.diff` ビューが開きます — 変更を並べて確認し、適用するか判断

### ログイン / 使用量（v2.0）

AI機能はWireweaveダッシュボード認証が必要です：

- **Wireweave: Login** を実行 → ブラウザで `dashboard.wireweave.org/auth/cli?source=vscode` が開きます
- ダッシュボードがワンタイムトークンを発行し、拡張は **VS Code SecretStorage** の `wireweave.token` キーに保存します。この拡張のトークンは `~/.wireweave/config.json` に書き込まれません。
- **Wireweave: Show Quota** で現在の AI 使用量（`used/limit` とリセット時刻）を確認

### HTML エクスポート

**Wireweave: Export as HTML** でレンダリングされた HTML をファイルに出力します。

## コマンド

| コマンド                          | ショートカット                  | 説明                                                 |
| --------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `Wireweave: Open Preview`         | —                               | 現在のパネルでプレビューを開く                       |
| `Wireweave: Open Preview to Side` | `Cmd+K V` / `Ctrl+K V`          | 分割ビューでプレビューを開く                         |
| `Wireweave: Export as HTML`       | —                               | 現在のワイヤーフレームを HTML ファイルにエクスポート |
| `Wireweave: AI Generate`          | `Cmd+K Cmd+W` / `Ctrl+K Ctrl+W` | 自然言語プロンプトから DSL を生成                    |
| `Wireweave: AI Improve`           | —                               | diff ビューで現在のワイヤーフレームを改善            |
| `Wireweave: Login`                | —                               | Wireweave ダッシュボードトークンでログイン           |
| `Wireweave: Show Quota`           | —                               | 現在の AI 使用量とリセット時刻を表示                 |

## ファイル関連付け

拡張は `.wf` / `.wireframe` ファイルと自動的に関連付けられます。手動で設定する場合：

```json
{
  "files.associations": {
    "*.wf": "wireframe",
    "*.wireframe": "wireframe"
  }
}
```

## 設定

VS Code 設定で `Wireweave` を検索すると、プレビュー動作と API エンドポイントを調整できます。AI トークンは **Wireweave: Login** で管理され SecretStorage に保存されます — `settings.json` に公開しないでください。

## トラブルシューティング

### プレビューが表示されない

1. DSL の文法エラーを確認（Problems パネル）
2. VS Code を再起動（`Cmd+Shift+P` → "Reload Window"）
3. Output パネルを確認（表示 → 出力 → Wireweave）

### AI コマンドが「サインインしていません」で失敗する

**Wireweave: Login** を実行してダッシュボードトークンを取得してください。トークンは SecretStorage の `wireweave.token` に保存されます。**Login** を再実行するとトークンが更新されます。

### シンタックスハイライトが動作しない

1. ファイル拡張子が `.wf` または `.wireframe` か確認
2. ステータスバーの言語モードが "Wireframe" か確認
3. 拡張を再インストール

## 次のステップ

- [Markdown プラグイン](/ja/guide/markdown-plugin) — ドキュメントにワイヤーフレームを埋め込む
- [MCP サーバー](/ja/guide/mcp-server) — 他のクライアント向け AI 統合
- [v2.0 リリースノート](/releases/v2.0-beta) — AI エージェントリリースの新機能
