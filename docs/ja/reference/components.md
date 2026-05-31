# コンポーネントリファレンス

すべてのWireweaveコンポーネントの完全なリファレンスと例です。

## 共通プロパティ (Common Props)

すべてのコンポーネントは以下の共通プロパティをサポートしています。コアタイプシステムから継承され、すべてのコンポーネントで使用できます。

### スペーシング (Spacing)

| 属性 | タイプ         | 説明                 |
| ---- | -------------- | -------------------- |
| p    | number         | パディング（全方向） |
| px   | number         | 水平パディング       |
| py   | number         | 垂直パディング       |
| pt   | number         | 上パディング         |
| pr   | number         | 右パディング         |
| pb   | number         | 下パディング         |
| pl   | number         | 左パディング         |
| m    | number         | マージン（全方向）   |
| mx   | number \| auto | 水平マージン         |
| my   | number         | 垂直マージン         |
| mt   | number         | 上マージン           |
| mr   | number         | 右マージン           |
| mb   | number         | 下マージン           |
| ml   | number         | 左マージン           |

スペーシング値はトークンスケールを使用します：0=0px、1=4px、2=8px、3=12px、4=16px、5=20px、6=24px、8=32px。明示的な単位も指定できます（例：`p=16px`、`m=2rem`）。

### サイジング (Sizing)

| 属性 | タイプ                                  | 説明     |
| ---- | --------------------------------------- | -------- |
| w    | number \| full \| auto \| screen \| fit | 幅       |
| h    | number \| full \| auto \| screen        | 高さ     |
| minW | number                                  | 最小幅   |
| maxW | number                                  | 最大幅   |
| minH | number                                  | 最小高さ |
| maxH | number                                  | 最大高さ |

### フレックス (Flex)

| 属性      | タイプ                                                | 説明           |
| --------- | ----------------------------------------------------- | -------------- |
| flex      | boolean \| number                                     | フレックス拡大 |
| direction | row \| column \| row-reverse \| column-reverse        | フレックス方向 |
| justify   | start \| center \| end \| between \| around \| evenly | 主軸の揃え     |
| align     | start \| center \| end \| stretch \| baseline         | 交差軸の揃え   |
| wrap      | boolean                                               | 折り返しを許可 |
| gap       | number                                                | 子要素の間隔   |

### 位置 (Position)

| 属性 | タイプ | 説明                  |
| ---- | ------ | --------------------- |
| x    | number | X位置（絶対位置指定） |
| y    | number | Y位置（絶対位置指定） |

### 外観 (Appearance)

| 属性   | タイプ                        | 説明         |
| ------ | ----------------------------- | ------------ |
| bg     | muted \| primary \| secondary | 背景色       |
| border | boolean                       | ボーダー表示 |

---

## インタラクティブプロパティ (Interactive Props)

以下のコンポーネントはインタラクティブプロパティをサポートしています：`button`、`link`、`card`、`image`、`avatar`、`badge`、`icon`。

| 属性     | タイプ | 説明                                                 |
| -------- | ------ | ---------------------------------------------------- |
| navigate | string | 別のページまたはURLに移動                            |
| opens    | string | idでモーダル、ドロワー、またはオーバーレイ要素を開く |
| toggles  | string | idで要素の表示/非表示状態を切り替え                  |
| action   | string | カスタムアクション識別子（例："submit"、"logout"）   |

```wireframe
button "Open Settings" opens="settings-modal"
button "Go Home" navigate="/home"
icon "menu" toggles="sidebar"
card action="select-item" { }
```

---

## Layout

ページ構造を定義するコンポーネントです。

### page

ページルートコンテナ。すべてのレイアウトの出発点です。1つの `.wf` ファイルに複数の `page` ブロックを置くと、ワイヤーフレームキャンバス上に横並びで配置されます — `at(x, y)` で明示的に座標を指定するか、省略すれば水平方向にオートフローします。

```wireframe
page "Dashboard" centered {
  // コンテンツ
}

page "Login" at(0, 0) viewport="1280x800" { }
page "Dashboard" at(1400, 0) viewport="1280x800" { }
```

| 属性      | タイプ   | 説明                                                                                        |
| --------- | -------- | ------------------------------------------------------------------------------------------- |
| title     | string   | ページタイトル                                                                              |
| viewport  | string   | ビューポートサイズ（例："1440x900"）                                                        |
| device    | string   | デバイスプリセット（以下参照）                                                              |
| centered  | boolean  | コンテンツを中央揃え                                                                        |
| at        | function | キャンバス配置 — `at(x, y)`。`at(...)` がないページは 64px の間隔で水平方向にオートフロー。 |
| p, px, py | number   | パディング                                                                                  |
| gap       | number   | 子要素の間隔                                                                                |

**デバイスプリセット:**

| カテゴリ     | プリセット          | サイズ    | 説明                       |
| ------------ | ------------------- | --------- | -------------------------- |
| デスクトップ | `desktop-sm`        | 1280×800  | 小型ノートPC               |
|              | `desktop`           | 1440×900  | デスクトップ（デフォルト） |
|              | `desktop-lg`        | 1920×1080 | Full HD                    |
|              | `desktop-xl`        | 2560×1440 | QHD                        |
| タブレット   | `ipad`              | 1024×768  | iPad（横向き）             |
|              | `ipad-portrait`     | 768×1024  | iPad（縦向き）             |
|              | `ipad-pro`          | 1366×1024 | iPad Pro 12.9"             |
|              | `ipad-pro-portrait` | 1024×1366 | iPad Pro 12.9"（縦向き）   |
| モバイル     | `iphone-se`         | 375×667   | iPhone SE                  |
|              | `iphone14`          | 390×844   | iPhone 14                  |
|              | `iphone14-pro`      | 393×852   | iPhone 14 Pro              |
|              | `iphone14-pro-max`  | 430×932   | iPhone 14 Pro Max          |
|              | `android`           | 360×800   | Android                    |
|              | `android-lg`        | 412×915   | Android Large              |

---

### header

ページヘッダー領域。ナビゲーション、ロゴなどを配置します。

```wireframe
header border {
  row justify=between {
    title "Logo" level=3
    nav { }
  }
}
```

| 属性      | タイプ  | 説明         |
| --------- | ------- | ------------ |
| border    | boolean | 下部ボーダー |
| p, px, py | number  | パディング   |
| gap       | number  | 子要素の間隔 |
| justify   | string  | 主軸の揃え   |
| align     | string  | 交差軸の揃え |

---

### main

メインコンテンツ領域。

```wireframe
main {
  // メインコンテンツ
}

main scroll {
  // スクロール可能なコンテンツ
}
```

| 属性      | タイプ  | 説明                   |
| --------- | ------- | ---------------------- |
| scroll    | boolean | 垂直スクロールを有効化 |
| p, px, py | number  | パディング             |
| gap       | number  | 子要素の間隔           |

---

### footer

ページフッター領域。

```wireframe
footer border {
  text "Copyright 2026" muted
}
```

| 属性   | タイプ  | 説明         |
| ------ | ------- | ------------ |
| border | boolean | 上部ボーダー |

---

### sidebar

サイドバー領域。

```wireframe
sidebar position=left w=240 {
  nav vertical { }
}
```

| 属性     | タイプ        | 説明             |
| -------- | ------------- | ---------------- |
| position | left \| right | サイドバーの位置 |
| w        | number        | 幅               |

---

### section

セクション領域。コンテンツを論理的にグループ化します。

```wireframe
section title="Settings" expanded {
  // コンテンツ
}
```

| 属性     | タイプ  | 説明               |
| -------- | ------- | ------------------ |
| title    | string  | セクションタイトル |
| expanded | boolean | 展開状態           |

---

## Grid

フレックスレイアウト用のコンポーネントです。

### row

水平方向のフレックスコンテナ。

```wireframe
row gap=4 justify=between align=center {
  button "Cancel" secondary
  button "Submit" primary
}
```

| 属性    | タイプ                                                | 説明           |
| ------- | ----------------------------------------------------- | -------------- |
| gap     | number                                                | 子要素の間隔   |
| justify | start \| center \| end \| between \| around \| evenly | 主軸の揃え     |
| align   | start \| center \| end \| stretch \| baseline         | 交差軸の揃え   |
| wrap    | boolean                                               | 折り返しを許可 |

---

### col

垂直方向のフレックスコンテナまたはグリッドカラム。

```wireframe
row {
  col span=6 { }
  col span=6 { }
}

col scroll {
  // スクロール可能なカラム
}
```

| 属性           | タイプ  | 説明                   |
| -------------- | ------- | ---------------------- |
| span           | 1-12    | グリッドカラム幅       |
| sm, md, lg, xl | number  | レスポンシブカラム幅   |
| scroll         | boolean | 垂直スクロールを有効化 |
| order          | number  | フレックス順序         |
| gap            | number  | 子要素の間隔           |

---

### stack

垂直スタックコンテナ。各子要素がコンテンツの高さ分だけ占有します（flex: 0 0 auto）。`col`と異なり、残りのスペースを埋めません。

```wireframe
stack gap=4 {
  text "Item 1"
  text "Item 2"
  text "Item 3"
}
```

| 属性   | タイプ                        | 説明         |
| ------ | ----------------------------- | ------------ |
| gap    | number                        | 子要素の間隔 |
| border | boolean                       | ボーダー表示 |
| bg     | muted \| primary \| secondary | 背景色       |

---

### relative

絶対位置オーバーレイコンテナ。子要素に`x`と`y`属性を使用して正確な配置ができます。

```wireframe
relative w=300 h=200 {
  image w=full h=full
  badge "New" x=10 y=10
}
```

| 属性 | タイプ | 説明 |
| ---- | ------ | ---- |
| w    | number | 幅   |
| h    | number | 高さ |

---

## Container

コンテンツをグループ化するコンポーネントです。

### card

カードコンポーネント。コンテンツをグループ化して表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
card title="Settings" shadow=md border {
  // コンテンツ
}
```

| 属性   | タイプ                       | 説明           |
| ------ | ---------------------------- | -------------- |
| title  | string                       | カードタイトル |
| shadow | none \| sm \| md \| lg \| xl | シャドウサイズ |
| border | boolean                      | ボーダー表示   |
| p      | number                       | パディング     |

---

### modal

モーダルダイアログ。オーバーレイ上にコンテンツを表示します。

```wireframe
modal "Confirm Delete" id="delete-modal" {
  text "Are you sure?"
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

| 属性  | タイプ | 説明                                                |
| ----- | ------ | --------------------------------------------------- |
| title | string | モーダルタイトル                                    |
| id    | string | `opens`/`toggles`でターゲットするための一意の識別子 |
| w, h  | number | 幅、高さ                                            |

---

### drawer

ドロワーパネル。画面端からスライドします。

```wireframe
drawer "Menu" id="side-menu" position=left {
  nav vertical { }
}
```

| 属性     | タイプ                         | 説明                                                |
| -------- | ------------------------------ | --------------------------------------------------- |
| title    | string                         | ドロワータイトル                                    |
| id       | string                         | `opens`/`toggles`でターゲットするための一意の識別子 |
| position | left \| right \| top \| bottom | 位置                                                |

---

### accordion

アコーディオン。折りたたみ可能なコンテンツパネルです。

```wireframe
accordion "Advanced Settings" {
  // コンテンツ
}
```

| 属性  | タイプ | 説明                   |
| ----- | ------ | ---------------------- |
| title | string | アコーディオンタイトル |

---

## Text

テキストを表示するコンポーネントです。

### text

通常のテキストを表示します。

```wireframe
text "Regular text"
text "Muted description" muted
text "Important" weight=bold size=lg
text "Large heading" size=3xl align=justify
```

| 属性   | タイプ                                           | 説明             |
| ------ | ------------------------------------------------ | ---------------- |
| size   | xs \| sm \| base \| md \| lg \| xl \| 2xl \| 3xl | テキストサイズ   |
| weight | normal \| medium \| semibold \| bold             | フォントウェイト |
| align  | left \| center \| right \| justify               | テキスト揃え     |
| muted  | boolean                                          | ミュートスタイル |

---

### title

タイトル要素。h1〜h6見出しを表示します。

```wireframe
title "Main Title" level=1
title "Subtitle" level=2
title "Section" level=3
```

| 属性  | タイプ | 説明           |
| ----- | ------ | -------------- |
| level | 1-6    | 見出しレベル   |
| size  | string | テキストサイズ |
| align | string | テキスト揃え   |

---

### link

クリック可能なハイパーリンクを表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
link "Learn more" href="/docs"
link "GitHub" href="https://github.com" external
```

| 属性     | タイプ  | 説明                     |
| -------- | ------- | ------------------------ |
| href     | string  | リンクURL                |
| external | boolean | 外部リンク（新しいタブ） |

---

## Input

ユーザー入力を受け取るコンポーネントです。

### input

入力フィールド。テキスト、メール、パスワードなどを入力します。

```wireframe
input "Email" inputType=email placeholder="Enter email"
input "Password" inputType=password
input "Name" required disabled
```

| 属性        | タイプ                                                              | 説明             |
| ----------- | ------------------------------------------------------------------- | ---------------- |
| label       | string                                                              | ラベルテキスト   |
| inputType   | text \| email \| password \| number \| tel \| url \| search \| date | 入力タイプ       |
| placeholder | string                                                              | プレースホルダー |
| value       | string                                                              | デフォルト値     |
| disabled    | boolean                                                             | 無効状態         |
| required    | boolean                                                             | 必須入力         |
| readonly    | boolean                                                             | 読み取り専用     |
| icon        | string                                                              | アイコン         |
| size        | sm \| md \| lg                                                      | 入力サイズ       |

---

### textarea

複数行入力フィールド。

```wireframe
textarea "Message" placeholder="Enter your message" rows=4
textarea "Bio" value="Hello world" required
```

| 属性        | タイプ  | 説明             |
| ----------- | ------- | ---------------- |
| label       | string  | ラベルテキスト   |
| placeholder | string  | プレースホルダー |
| value       | string  | デフォルト値     |
| rows        | number  | 行数             |
| disabled    | boolean | 無効状態         |
| required    | boolean | 必須入力         |

---

### select

ドロップダウン選択。

```wireframe
select "Country" placeholder="国を選択" options=["日本", "アメリカ", "イギリス"]
select "Status" options=["アクティブ", "非アクティブ"] value="アクティブ"
```

| 属性        | タイプ  | 説明             |
| ----------- | ------- | ---------------- |
| label       | string  | ラベルテキスト   |
| placeholder | string  | プレースホルダー |
| options     | array   | オプションリスト |
| value       | string  | 選択された値     |
| disabled    | boolean | 無効状態         |
| required    | boolean | 必須入力         |

---

### checkbox

チェックボックス。真偽値を選択します。

```wireframe
checkbox "Remember me"
checkbox "I agree to terms" checked
```

| 属性     | タイプ  | 説明           |
| -------- | ------- | -------------- |
| label    | string  | ラベルテキスト |
| checked  | boolean | チェック状態   |
| disabled | boolean | 無効状態       |

---

### radio

ラジオボタン。グループ内で1つを選択します。

```wireframe
radio "Option A" name="options"
radio "Option B" name="options" checked
```

| 属性     | タイプ  | 説明           |
| -------- | ------- | -------------- |
| label    | string  | ラベルテキスト |
| name     | string  | グループ名     |
| checked  | boolean | 選択状態       |
| disabled | boolean | 無効状態       |

---

### switch

トグルスイッチ。オン/オフ状態を切り替えます。

```wireframe
switch "Dark mode"
switch "Notifications" checked
```

| 属性     | タイプ  | 説明           |
| -------- | ------- | -------------- |
| label    | string  | ラベルテキスト |
| checked  | boolean | アクティブ状態 |
| disabled | boolean | 無効状態       |

---

### slider

スライダー。範囲内の値を選択します。

```wireframe
slider "Volume" min=0 max=100 value=50
```

| 属性     | タイプ  | 説明           |
| -------- | ------- | -------------- |
| label    | string  | ラベルテキスト |
| min      | number  | 最小値         |
| max      | number  | 最大値         |
| value    | number  | 現在値         |
| step     | number  | ステップ増分   |
| disabled | boolean | 無効状態       |

---

### button

ボタン要素。クリック可能なボタンを表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
button "Submit" primary
button "Cancel" secondary
button "Delete" danger outline
button "Loading..." primary loading
```

| 属性      | タイプ                     | 説明                   |
| --------- | -------------------------- | ---------------------- |
| primary   | boolean                    | プライマリ強調スタイル |
| secondary | boolean                    | セカンダリスタイル     |
| outline   | boolean                    | アウトラインスタイル   |
| ghost     | boolean                    | ゴースト/透明スタイル  |
| danger    | boolean                    | 危険/削除スタイル      |
| size      | xs \| sm \| md \| lg \| xl | ボタンサイズ           |
| icon      | string                     | アイコン               |
| disabled  | boolean                    | 無効状態               |
| loading   | boolean                    | ローディング状態       |

---

## Display

ビジュアル要素を表示するコンポーネントです。

### image

画像を表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
image src="/photo.jpg" alt="Photo" w=200 h=150
```

| 属性 | タイプ | 説明          |
| ---- | ------ | ------------- |
| src  | string | 画像ソースURL |
| alt  | string | 代替テキスト  |
| w    | number | 幅            |
| h    | number | 高さ          |

---

### placeholder

画像やコンテンツのプレースホルダーです。

```wireframe
placeholder "Image" w=300 h=200
```

| 属性  | タイプ | 説明           |
| ----- | ------ | -------------- |
| label | string | ラベルテキスト |
| w     | number | 幅             |
| h     | number | 高さ           |

---

### avatar

ユーザープロフィール画像を表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
avatar "John Doe"
avatar "JD" size=lg src
```

| 属性 | タイプ                               | 説明                   |
| ---- | ------------------------------------ | ---------------------- |
| name | string                               | 名前（イニシャル生成） |
| src  | boolean                              | 画像表示               |
| size | xs \| sm \| md \| lg \| xl \| number | サイズ                 |

---

### badge

ステータスやカウントを小さなラベルで表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
badge "New"
badge "Active" variant=success
badge "3" variant=danger pill
badge "!" anchor=top-right
```

| 属性    | タイプ                                                                  | 説明                                 |
| ------- | ----------------------------------------------------------------------- | ------------------------------------ |
| variant | default \| primary \| secondary \| success \| warning \| danger \| info | スタイルバリアント                   |
| pill    | boolean                                                                 | 丸みのある角                         |
| icon    | string                                                                  | アイコン                             |
| size    | xs \| sm \| md \| lg                                                    | サイズ                               |
| anchor  | top-left \| top-right \| bottom-left \| bottom-right \| ...             | オーバーレイコンテナ内のアンカー位置 |

---

### icon

アイコンを表示します。[インタラクティブプロパティ](#インタラクティブプロパティ-interactive-props)をサポートしています。

```wireframe
icon "home"
icon "settings" size=lg muted
```

| 属性  | タイプ                               | 説明             |
| ----- | ------------------------------------ | ---------------- |
| name  | string                               | アイコン名       |
| size  | xs \| sm \| md \| lg \| xl \| number | サイズ           |
| muted | boolean                              | ミュートスタイル |

---

### divider

区切り線要素。コンテンツを視覚的に分離します。

```wireframe
divider
divider my=4
divider vertical
```

| 属性      | タイプ  | 説明     |
| --------- | ------- | -------- |
| vertical  | boolean | 垂直方向 |
| m, my, mx | number  | マージン |

---

## Data

データを表示するコンポーネントです。

### table

テーブルコンポーネント。データを表形式で表示します。

**簡潔構文**（配列の配列）：

```wireframe
table [["Name", "Email", "Role"], ["John", "john@example.com", "Admin"], ["Jane", "jane@example.com", "User"]]
```

**ブロック構文**（columns + row）：

```wireframe
table striped hover bordered {
  columns ["Name", "Email", "Role"]
  row ["John", "john@example.com", "Admin"]
  row ["Jane", "jane@example.com", "User"]
}
```

| 属性     | タイプ  | 説明             |
| -------- | ------- | ---------------- |
| columns  | array   | カラムヘッダー   |
| striped  | boolean | ストライプ行     |
| bordered | boolean | ボーダースタイル |
| hover    | boolean | ホバー効果       |

---

### list

リストコンポーネント。項目をリストとして表示します。

**配列構文**：

```wireframe
list ["Apple", "Banana", "Cherry"]
list ["First", "Second", "Third"] ordered
```

**ブロック構文**（ネスト対応）：

```wireframe
list {
  item "Fruits" {
    item "Apple"
    item "Banana"
  }
  item "Vegetables" {
    item "Carrot"
    item "Potato"
  }
}
```

| 属性    | タイプ  | 説明               |
| ------- | ------- | ------------------ |
| ordered | boolean | 順序付きリスト     |
| none    | boolean | リストスタイルなし |
| gap     | number  | 項目の間隔         |

---

## Feedback

ユーザーにフィードバックを提供するコンポーネントです。

### alert

アラート要素。ユーザーにメッセージを表示します。

```wireframe
alert "Operation successful" variant=success
alert "Please check your input" variant=warning
alert "An error occurred" variant=danger dismissible
```

| 属性        | タイプ                               | 説明               |
| ----------- | ------------------------------------ | ------------------ |
| variant     | success \| warning \| danger \| info | スタイルバリアント |
| dismissible | boolean                              | 閉じることができる |
| icon        | string                               | アイコン           |

---

### toast

トースト通知。一時的なメッセージを表示します。

```wireframe
toast "Saved!" position=top-right variant=success
```

| 属性     | タイプ                                                                              | 説明               |
| -------- | ----------------------------------------------------------------------------------- | ------------------ |
| position | top-left \| top-center \| top-right \| bottom-left \| bottom-center \| bottom-right | 位置               |
| variant  | success \| warning \| danger \| info                                                | スタイルバリアント |

---

### progress

プログレスバー。進行状況を表示します。

```wireframe
progress value=75
progress value=50 label="Uploading..."
progress indeterminate
```

| 属性          | タイプ  | 説明            |
| ------------- | ------- | --------------- |
| value         | number  | 進行値（0-100） |
| max           | number  | 最大値          |
| label         | string  | ラベルテキスト  |
| indeterminate | boolean | 不確定状態      |

---

### spinner

ローディングスピナー。ローディング状態を表示します。

```wireframe
spinner
spinner size=lg label="Loading..."
```

| 属性  | タイプ                               | 説明           |
| ----- | ------------------------------------ | -------------- |
| size  | xs \| sm \| md \| lg \| xl \| number | サイズ         |
| label | string                               | ラベルテキスト |

---

## Overlay

オーバーレイUIコンポーネントです。

### tooltip

ツールチップ要素。ホバー時に追加情報を表示します。

```wireframe
tooltip "Click to save" position=top {
  button "Save" primary
}
```

| 属性     | タイプ                         | 説明             |
| -------- | ------------------------------ | ---------------- |
| content  | string                         | ツールチップ内容 |
| position | top \| right \| bottom \| left | 位置             |

---

### popover

ポップオーバー。クリック時に追加コンテンツを表示します。

```wireframe
popover title="Options" {
  // コンテンツ
}
```

| 属性  | タイプ | 説明                   |
| ----- | ------ | ---------------------- |
| title | string | ポップオーバータイトル |

---

### dropdown

ドロップダウンメニュー。クリック時にメニューが展開します。

**配列構文**：

```wireframe
dropdown ["Edit", "Delete", "---", "Cancel"]
```

`"---"`を使用して項目間に区切り線を挿入します。

**ブロック構文**（icon、href、danger、disabled対応）：

```wireframe
dropdown {
  item "Edit" icon="edit"
  item "Duplicate" icon="copy"
  divider
  item "Delete" icon="trash" danger
}
```

| 属性  | タイプ | 説明         |
| ----- | ------ | ------------ |
| items | array  | メニュー項目 |

**項目属性（ブロック構文）：**

| 属性     | タイプ  | 説明         |
| -------- | ------- | ------------ |
| label    | string  | 項目ラベル   |
| icon     | string  | 項目アイコン |
| href     | string  | リンクURL    |
| danger   | boolean | 危険スタイル |
| disabled | boolean | 無効状態     |

---

## Navigation

ナビゲーションコンポーネントです。

### nav

ナビゲーション領域。メニュー項目を配置します。

**配列構文**：

```wireframe
nav ["Home", "About", "Contact"]
```

**ブロック構文**（グループ、区切り線、アイコン、アクティブ状態対応）：

```wireframe
nav vertical {
  group "Main" {
    item "Dashboard" icon="home" active
    item "Settings" icon="settings"
  }
  divider
  group "Tools" {
    item "Analytics" icon="chart"
    item "Reports" icon="file"
  }
}
```

| 属性     | タイプ  | 説明                           |
| -------- | ------- | ------------------------------ |
| vertical | boolean | 垂直方向                       |
| gap      | number  | 項目の間隔                     |
| items    | array   | ナビゲーション項目（配列構文） |

**項目属性（ブロック構文）：**

| 属性     | タイプ  | 説明           |
| -------- | ------- | -------------- |
| label    | string  | 項目ラベル     |
| icon     | string  | 項目アイコン   |
| href     | string  | リンクURL      |
| active   | boolean | アクティブ状態 |
| disabled | boolean | 無効状態       |

---

### tabs

タブコンポーネント。複数のパネルをタブで切り替えます。

**配列 + ブロック構文**：

```wireframe
tabs ["General", "Security", "Notifications"] active=0 {
  tab "General" {
    text "General settings content"
  }
  tab "Security" {
    text "Security settings content"
  }
  tab "Notifications" {
    text "Notification preferences"
  }
}
```

| 属性   | タイプ | 説明                       |
| ------ | ------ | -------------------------- |
| items  | array  | タブラベル                 |
| active | number | アクティブタブインデックス |

---

### breadcrumb

パンくずリスト。現在の位置をパスとして表示します。

**配列構文**：

```wireframe
breadcrumb ["Home", "Products", "Detail"]
```

| 属性  | タイプ | 説明                                      |
| ----- | ------ | ----------------------------------------- |
| items | array  | パンくず項目（文字列または{label, href}） |

---

## Annotation

ワイヤーフレームを番号マーカーと説明パネルで文書化するコンポーネントです。

### marker

番号マーカーオーバーレイ。UI要素に配置してアノテーションパネルで参照します。

```wireframe
marker 1
marker 2 color=blue
marker 3 anchor=top-right color=red
```

| 属性   | タイプ                                                                                                                       | 説明                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| color  | blue \| red \| green \| yellow \| purple \| orange                                                                           | マーカーの色             |
| anchor | top-left \| top-center \| top-right \| center-left \| center \| center-right \| bottom-left \| bottom-center \| bottom-right | relativeコンテナ内の位置 |

---

### annotations

アノテーションパネルコンテナ。`item`子要素と共に詳細な説明を含みます。

```wireframe
annotations title="画面説明" {
  item 1 "ログインボタン" {
    text "OAuth連携予定"
  }
  item 2 "パスワードフィールド" {
    text "最低8文字以上必要"
  }
}
```

| 属性  | タイプ | 説明           |
| ----- | ------ | -------------- |
| title | string | パネルタイトル |

---

### item

個別アノテーション項目。`annotations`の子要素としてマーカー番号とタイトルを持ちます。

```wireframe
item 1 "ボタン説明" {
  text "詳細な説明内容"
  text "追加の注記" muted
}
```
