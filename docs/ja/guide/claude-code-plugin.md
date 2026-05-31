# Claude Code プラグイン

Wireweave Claude Code プラグイン（`@wireweave/wireweave`）は単一のスラッシュコマンド — `/wireweave` — を公開し、Claude Code から Wireweave DSL ツールチェーン全体（parse, validate, render, analyze, diff, UX rules, exporters）を駆動できるようにします。プラグイン自体はコードを含まず、すべてのサブコマンドは `npx -y` を介して [`@wireweave/cli`](/ja/guide/cli) に委譲されます。

> **v0.1.0 — ベータ。** プラグイン形状は安定していますが、ミラーする cli の表面は `1.0.0` 以前に変更される可能性があります。

## インストール

プラグインは GitHub リポジトリにホストされた Claude Code マーケットプレイスエントリとして配布されます。1 つの Claude Code セッションでマーケットプレイスを追加し、インストールします:

```text
/plugin marketplace add wireweave/wireweave
/plugin install wireweave@wireweave
```

要件:

- プラグインマーケットプレイス対応の Claude Code
- Node.js 18 以上（プラグインが `npx` 経由で cli を呼び出します）
- 初回利用時に npm レジストリへのネットワークアクセス（以降は npx によりキャッシュ）

インストール後、すべての Claude Code セッションで `/wireweave` が利用可能になります。

## 仕組み

```
Claude Code  →  /wireweave <subcommand>
                      │
                      ▼
            npx -y @wireweave/cli <subcommand>
                      │
                      ▼
                @wireweave/sdk dispatch()
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
  local (in-process)        server (api.wireweave.org)
  parser / renderer /       login（キー検証）
  ux-rules / exporters
```

- プラグインに `src/` はありません — 薄いシェルです。
- cli は呼び出しごとに `npx -y @wireweave/cli` で新規取得されるため、cli の minor / patch アップグレードはプラグインを再公開せずにユーザーへ到達します。
- すべてのローカル処理（パース、レンダリング、UX 検証、エクスポート）は SDK の `localDispatch` を介して cli 内の同一プロセスで実行されます。サーバー処理（`login` キー検証）は `api.wireweave.org` を経由します。

## サブコマンド

`/wireweave` の直後の最初のトークンがサブコマンドを選択し、残りはそのまま cli に渡されます。

| スラッシュ形式                   | cli 委譲                                             | ディスパッチ |
| -------------------------------- | ---------------------------------------------------- | ------------ |
| `/wireweave login`               | `npx -y @wireweave/cli login`                        | auth         |
| `/wireweave whoami`              | `npx -y @wireweave/cli whoami`                       | auth         |
| `/wireweave logout`              | `npx -y @wireweave/cli logout`                       | auth         |
| `/wireweave parse <file>`        | `npx -y @wireweave/cli parse <file>`                 | local        |
| `/wireweave validate <file>`     | `npx -y @wireweave/cli validate <file> [--strict]`   | local        |
| `/wireweave render <file>`       | `npx -y @wireweave/cli render <file> [-o] [--theme]` | local        |
| `/wireweave list`                | `npx -y @wireweave/cli list-components`              | local        |
| `/wireweave analyze <file>`      | `npx -y @wireweave/cli analyze <file>`               | local        |
| `/wireweave diff <old> <new>`    | `npx -y @wireweave/cli diff <old> <new>`             | local        |
| `/wireweave validate-ux <file>`  | `npx -y @wireweave/cli validate-ux <file>`           | local        |
| `/wireweave export-json <file>`  | `npx -y @wireweave/cli export-json <file> [-o]`      | local        |
| `/wireweave export-figma <file>` | `npx -y @wireweave/cli export-figma <file> [-o]`     | local        |

ローカルサブコマンド（`parse` / `validate` / `render` / `list` / `analyze` / `diff` / `validate-ux` / `export-*`）は API キーを必要としません。`login` のみがキー検証のために `api.wireweave.org` に接続します。

各サブコマンドの全オプションは [CLI ガイド](/ja/guide/cli) を参照してください。

## 認証

プラグインは認証状態を保持しません。cli が `~/.wireweave/config.json` に API キーを保存します:

```text
/wireweave login            # cli ホスト上で API キー入力プロンプト
/wireweave whoami           # 設定されたアカウントを表示
/wireweave logout           # 保存されたキーを削除
```

API キーは [Wireweave ダッシュボード → Keys](https://wireweave.org/dashboard/keys) から発行します。

## cli バージョンの固定

プラグインは常に npm `latest` dist-tag の `@wireweave/cli` を使用します — バージョンを固定しません。デバッグやロールバックのために特定の cli リリースに固定するには、cli を直接呼び出してください:

```bash
npx -y @wireweave/cli@<version> <subcommand>
```

cli の BREAKING 変更は [`@wireweave/cli` CHANGELOG](https://github.com/wireweave/cli/blob/main/CHANGELOG.md) にドキュメント化されています。

## トラブルシューティング

### `npx` が `@wireweave/cli` を見つけられない

cli が公開されているか確認:

```bash
npm view @wireweave/cli version
```

パッケージがまだ npm 上にない場合、スラッシュコマンドは失敗します — プラグインにフォールバック経路はありません。cli が公開されるまで、ローカルチェックアウトから実行してください:

```bash
cd /path/to/wireweave/cli && pnpm build && pnpm link --global
wireweave <subcommand>
```

### オフラインまたはレジストリに到達不可

`npx -y @wireweave/cli` は当該マシンでの初回呼び出し時に npm レジストリへのアクセスが必要です。キャッシュされた後はオフラインでも動作します。レジストリに到達できず cli がキャッシュされていない場合、スラッシュコマンドは `npx` の解決エラーで失敗します。

### `/wireweave login` が失敗

`login` はキー検証のために `api.wireweave.org` に接続します。次を確認してください:

1. `api.wireweave.org` へのネットワークアクセス
2. キーが [ダッシュボード](https://wireweave.org/dashboard/keys) から正しくコピーされたか
3. キーが取り消されていない、または有効期限切れではないか

API キーは cli により `~/.wireweave/config.json` に `0600` パーミッションで保存されます。

## 他の統合との比較

| 統合                                       | 表面                                        | 適した用途                                                       |
| ------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------- |
| Claude Code プラグイン                     | `/wireweave` スラッシュコマンド（本ページ） | Claude Code セッションからツールチェーンを駆動                   |
| [CLI](/ja/guide/cli)                       | `wireweave` シェルバイナリ                  | スクリプト、CI、ターミナルワークフロー                           |
| [MCP サーバー](/ja/guide/mcp-server)       | MCP ツール（`wireweave_*`）                 | あらゆる MCP 対応クライアント（Claude Desktop, Cursor, VS Code） |
| [VS Code 拡張](/ja/guide/vscode-extension) | エディタコマンド + ライブプレビュー         | AI アシスタンス付きのエディタ内オーサリング                      |

4 つの統合はすべて同じツールカタログを共有し、`@wireweave/sdk` を介してミラーされます。

## 次のステップ

- [CLI](/ja/guide/cli) — フルコマンドラインリファレンス（オプション表面、終了コード、CI 利用）
- [MCP サーバー](/ja/guide/mcp-server) — 同じツールを Model Context Protocol で提供
- [VS Code 拡張](/ja/guide/vscode-extension) — ライブプレビュー付き IDE 統合
