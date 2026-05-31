# CLI

Wireweave CLI（`@wireweave/cli`）は Wireweave DSL のコマンドラインコンパニオンです。パーサー、レンダラー、UX ルール、エクスポーター、アナライザーをローカルで — ネットワーク往復なしで — 実行し、認証が必要なコマンド（認証状態、今後のリリースでの agent / クラウド呼び出し）では Wireweave API へサインインします。

> **v0.1.0 — ベータ。** npm の `beta` dist-tag で公開されています。`1.0.0` 以前にコマンド形が変わる可能性があります。

## インストール

```bash
npm install -g @wireweave/cli@beta
```

Node.js 18 以上が必要。バイナリ名は `wireweave` です。

インストール確認:

```bash
wireweave --version
wireweave --help
```

## 認証

`login` は API キーを Wireweave API で検証し、`~/.wireweave/config.json` に保存して以後のセッションで再利用します。

```bash
# 対話 — stdin で API キーを入力
wireweave login

# 非対話 — フラグまたは環境変数で渡す
wireweave login --api-key <KEY>
WIREWEAVE_API_KEY=<KEY> wireweave login

# セルフホスト API を指定
wireweave login --api-url https://api.example.com
```

保存された資格情報の確認 / 解除:

```bash
wireweave whoami   # アカウントメール + マスクされたキーを表示
wireweave logout   # ~/.wireweave/config.json を削除
```

API キーは [Wireweave ダッシュボード → Keys](https://wireweave.org/dashboard/keys) ページから発行します。

## ローカルコマンド

以下のコマンドは完全オフラインです — `@wireweave/core` と `@wireweave/ux-rules` を同一プロセス内でロードし、API を呼び出しません。

### `render` — DSL → HTML

```bash
wireweave render design.wf
wireweave render design.wf -o design.html
wireweave render design.wf --theme dark --full-document
```

| オプション        | 用途                                                           |
| ----------------- | -------------------------------------------------------------- |
| `-o, --output`    | HTML を stdout ではなくファイルへ書き出す                      |
| `--theme <name>`  | `light`（デフォルト）または `dark`                             |
| `--full-document` | 完全な `<!doctype html>` ドキュメントを出力（既定は fragment） |

### `parse` — DSL → AST

```bash
wireweave parse design.wf > design.ast.json
```

パースした AST を JSON として出力。他ツールへのパイプ用途に便利。

### `validate` — 文法チェック

```bash
wireweave validate design.wf
wireweave validate design.wf --strict   # 未知の属性を拒否
```

文法エラーで非ゼロ終了。CI でコミットゲートに利用できます。

### `validate-ux` — UX ベストプラクティスルール

```bash
wireweave validate-ux design.wf
wireweave validate-ux design.wf --format summary
wireweave validate-ux design.wf --categories accessibility,usability --min-severity warning
wireweave validate-ux design.wf --disabled-rules form/label-association --max-issues 50
```

| オプション                | 用途                                                     |
| ------------------------- | -------------------------------------------------------- |
| `--categories <list>`     | カンマ区切りのルールカテゴリ（例: `accessibility,form`） |
| `--min-severity <level>`  | `error` \| `warning` \| `info`                           |
| `--max-issues <n>`        | 報告するイシューの上限                                   |
| `--disabled-rules <list>` | スキップするルール ID（カンマ区切り）                    |
| `--format <fmt>`          | `json`（デフォルト）または `summary`                     |

### `list-components` — DSL コンポーネントカタログ

```bash
wireweave list-components
wireweave list-components --category form
wireweave list-components --format json
```

`@wireweave/language-data` に定義されたすべてのコンポーネントとカテゴリ、属性概要を一覧表示します。

### `analyze` — ワイヤーフレーム統計

```bash
wireweave analyze design.wf
wireweave analyze design.wf --format summary
wireweave analyze design.wf --no-accessibility --no-complexity
```

コンポーネント分布、アクセシビリティカバレッジ、複雑度、レイアウト、コンテンツ統計を報告します。各軸は `--no-<axis>` で無効化できます。

### `diff` — 2 つのワイヤーフレームを比較

```bash
wireweave diff old.wf new.wf
wireweave diff old.wf new.wf --ignore-attributes
wireweave diff old.wf new.wf --ignore-order --format summary
```

2 つの AST ツリー間の構造 diff。既定は `json`、`--format summary` で人間可読フォーマット。

### `export-json` — AST を JSON として出力

```bash
wireweave export-json design.wf -o design.json
wireweave export-json design.wf --include-locations
wireweave export-json design.wf --no-pretty-print
```

### `export-figma` — Figma 互換 JSON

```bash
wireweave export-figma design.wf -o design.figma.json
```

Wireweave プラグインを通じて Figma にインポート可能な JSON ペイロードを出力します（エクスポート専用 — 逆方向ラウンドトリップは未対応）。

## 環境変数

| 変数                | デフォルト                  | 用途                                                        |
| ------------------- | --------------------------- | ----------------------------------------------------------- |
| `WIREWEAVE_API_URL` | `https://api.wireweave.org` | API ベース URL の上書き（セルフホスト / ステージング / CI） |
| `WIREWEAVE_API_KEY` | —                           | 現在のシェルのトークン上書き                                |

環境変数は `~/.wireweave/config.json` より優先されます。

## 設定ファイル

```
~/.wireweave/config.json
```

形:

```json
{
  "token": "wk_live_...",
  "apiUrl": "https://api.wireweave.org"
}
```

トークンは `0600` 権限で書き込まれます。ローテートするには `wireweave logout` の後、新しいキーで `wireweave login` を再実行してください。

## 終了コード

| コード | 意味                                                |
| ------ | --------------------------------------------------- |
| `0`    | 成功                                                |
| `1`    | 一般的な失敗（I/O、ネットワーク、予期しないエラー） |
| `2`    | パーサー / バリデーターが入力を拒否                 |
| `3`    | UX ルールが要求された深刻度以上のイシューを報告     |

## CI での利用例

```yaml
# .github/workflows/wireframe-check.yml
- run: npm install -g @wireweave/cli@beta
- run: wireweave validate src/wireframes/*.wf --strict
- run: wireweave validate-ux src/wireframes/*.wf --min-severity warning
```

ローカル専用コマンド (`render` / `parse` / `validate` / `validate-ux` / `list-components` / `analyze` / `diff` / `export-*`) は `WIREWEAVE_API_KEY` を必要としないため、CI はシークレットなしで動作します。

## 次のステップ

- [Claude Code プラグイン](/ja/guide/claude-code-plugin) — CLI に委譲するスラッシュコマンド
- [VS Code 拡張](/ja/guide/vscode-extension) — ライブプレビュー付き IDE 統合
- [MCP サーバー](/ja/guide/mcp-server) — 同じツールを Model Context Protocol で提供
