---
paths:
  - 'src/extension.ts'
  - 'package.json'
---

# 확장 activation 정책

VSCode 확장은 activate 가 사용자 IDE 시작 시간에 직접 영향. 무거운 작업 / 광범위 activation 은 사용자 경험 악화.

## activationEvents

```json
{
  "activationEvents": [
    "onLanguage:wireframe",
    "onCommand:wireframe.preview",
    "onCommand:wireframe.previewToSide"
  ]
}
```

규칙:

- `*` (항상 activate) 금지
- `onStartupFinished` 도 신중 — 진짜 모든 워크스페이스에서 필요한가?
- 가능하면 language / command / file pattern 기반

## activate 함수

```ts
export async function activate(context: vscode.ExtensionContext) {
  // 가벼운 등록만
  context.subscriptions.push(
    vscode.commands.registerCommand('wireframe.preview', openPreview),
    vscode.languages.registerHoverProvider('wireframe', new HoverProvider()),
    /* ... */
  )
  // 무거운 초기화 (parser, ux-rules 카탈로그) 는 lazy
}
```

규칙:

- activate 는 가능한 한 동기 / 빠르게
- core / language-data / ux-rules 의 초기화는 첫 실제 사용 시점에 lazy
- 비동기 fetch / network 호출 금지 (사용자 input 없이)

## 설정 (configuration)

`package.json` `contributes.configuration`:

```json
{
  "wireframe.preview.theme": {
    "type": "string",
    "enum": ["light", "dark", "auto"],
    "default": "auto"
  },
  "wireframe.preview.bounded": { "type": "boolean", "default": true },
  "wireframe.lint.enabled": { "type": "boolean", "default": false }
}
```

- 변경 사항은 `vscode.workspace.onDidChangeConfiguration` 으로 반응
- preview WebView 는 설정 변경 시 postMessage 로 갱신 (재로드 X)

## 메모리 / dispose

- 모든 등록은 `context.subscriptions` 에 push
- WebView panel 은 `onDidDispose` 시 cleanup
- file system watcher 는 deactivate 에서 dispose

## deactivate

```ts
export function deactivate(): Promise<void> | void {
  // 백그라운드 작업 / 외부 리소스 정리
  // context.subscriptions 는 자동 dispose
}
```

## 절대 금지

- `activationEvents: ['*']`
- activate 안에서 큰 동기 파일 읽기 (전체 워크스페이스 스캔)
- activate 안에서 외부 네트워크 호출 (telemetry / update check 도 lazy)
- 사용자 알림 (showInformationMessage) 을 activate 직후 자동 노출
- WebView 의 `enableScripts: true` 인데 CSP 미설정
