---
paths:
  - 'src/preview/**'
  - 'src/webview/**'
---

# WebView 보안 / 메시지 패턴

## CSP (Content Security Policy)

WebView 의 HTML 은 항상 CSP 동반:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none';
           img-src ${webview.cspSource} https: data:;
           style-src ${webview.cspSource} 'unsafe-inline';
           script-src 'nonce-${nonce}';
           font-src ${webview.cspSource};"
/>
```

규칙:

- `default-src 'none'` 시작 — 모든 리소스 명시적 허용
- 인라인 스크립트는 nonce 기반만 (`'unsafe-inline'` 금지)
- nonce 는 매 panel 생성마다 새로 생성 (crypto.randomBytes)
- `img-src` 의 `data:` 는 base64 이미지 사용 시만 추가

## script-src

core 의 `renderCanvas` 결과 HTML 에는 스크립트가 없다 (보안 계약). 따라서 사용자 콘텐츠가 스크립트 주입 못 함.

WebView 자체 스크립트 (preview 컨트롤, postMessage 핸들러) 만 nonce 기반:

```html
<script nonce="${nonce}" src="${webview.asWebviewUri(scriptUri)}"></script>
```

## postMessage 통신

```ts
// extension → webview
panel.webview.postMessage({ type: 'update', html, theme })

// webview → extension
window.acquireVsCodeApi().postMessage({ type: 'navigate', target: 'page-2' })

// extension 측 수신
panel.webview.onDidReceiveMessage((msg) => {
  // 반드시 zod 또는 discriminated union 으로 검증
  const validated = WebviewMessageSchema.parse(msg)
  switch (validated.type) { ... }
})
```

규칙:

- 양방향 모두 schema 검증 (webview 가 untrusted 영역으로 간주)
- `eval`, `Function`, `setTimeout(string)` 등 동적 코드 실행 금지
- file 시스템 접근은 extension 측에서만 (webview 는 요청, extension 이 검증 후 수행)

## 리소스 URI

```ts
const scriptUri = panel.webview.asWebviewUri(
  vscode.Uri.joinPath(context.extensionUri, 'media', 'preview.js'),
)
```

- 절대 file:// path 직접 사용 금지
- localResourceRoots 명시 (`webview.options.localResourceRoots`)

## panel lifecycle

```ts
const panel = vscode.window.createWebviewPanel(
  'wireframePreview',
  'Wireframe Preview',
  vscode.ViewColumn.Beside,
  { enableScripts: true, localResourceRoots: [extensionUri], retainContextWhenHidden: true },
)

panel.onDidDispose(
  () => {
    /* cleanup: dispose subscriptions */
  },
  null,
  context.subscriptions,
)
panel.onDidChangeViewState((e) => {
  if (e.webviewPanel.active) refreshPreview()
})
```

- `retainContextWhenHidden: true` 는 메모리 비용 — preview 가 큰 경우 false 로 둘 것
- panel 갱신은 postMessage 로 (전체 reload X — flicker 방지)

## 절대 금지

- `enableCommandUris: true` 없이 사용자 콘텐츠에서 link 클릭 허용
- `enableScripts: true` + CSP 미설정
- webview 메시지 검증 없이 file system / settings mutate
- `Object.assign(window, { ...secrets })` 같은 패턴 (secrets 노출)
- HTTP / HTTPS resource 직접 로드 (asWebviewUri 우회)
