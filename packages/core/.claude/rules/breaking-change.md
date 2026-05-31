# BREAKING 변경 절차

`@wireweave/core` 는 7개 의존 패키지의 기반. BREAKING 은 신중하게.

## BREAKING 으로 간주되는 것

- 공개 함수 시그니처 변경 (인자 타입 / 반환 타입 / 인자 추가 with no default)
- 공개 타입의 필드 제거 / 필수 변경 / 타입 변경
- discriminated union 의 member 제거
- HTML 출력의 class / data-attribute 변경 (의존자 querySelector 깨짐)
- DSL 문법의 키워드 / 토큰 의미 변경
- 옵션 default 값 변경 (사용자가 명시 안 한 경우 동작이 바뀜)

## BREAKING 이 아닌 것

- 새 함수 / 타입 / 컴포넌트 추가 (기존 코드와 충돌 없으면)
- 새 옵셔널 필드 / 옵셔널 인자 추가
- 에러 메시지 문구 개선
- 내부 구조 리팩터 (public API 외형 동일)
- 성능 개선 (output 동일)

## 절차

### 1. 영향 평가

7개 의존 패키지 코드에서 변경 대상 심볼이 어떻게 사용되는지 확인:

```bash
# wireweave 폴더의 부모 디렉토리에서
for pkg in api-server markdown-plugin ux-rules vscode-extension dashboard admin examples; do
  echo "=== $pkg ==="
  grep -rn "<symbol-name>" wireweave/$pkg/src 2>/dev/null
done
```

각 사용처가 새 API 로 마이그레이션 가능한지, 마이그레이션 비용이 정당한지 평가.

### 2. RFC 또는 ADR

대규모 BREAKING (복수 함수 / 타입 / 동작 변경) 은 변경 문서를 먼저:

- 변경 사항 요약
- 변경 이유 (왜 minor / patch 로 못 가는가)
- migration guide
- 영향받는 의존 패키지와 예상 변경량

`docs/architecture/` 또는 PR 본문에 inline.

### 3. deprecation (가능한 경우)

가능하면 한 minor 사이클은 deprecation 으로 두 API 공존:

```ts
/**
 * @deprecated Use `renderCanvas` instead. Will be removed in 4.0.
 */
export function renderWithChrome(...) {
  console.warn('renderWithChrome is deprecated, use renderCanvas')
  return renderCanvas(...)
}
```

deprecation 기간 동안 의존 패키지가 마이그레이션 PR 을 진행.

### 4. major bump

`feat!: ...` 또는 본문에 `BREAKING CHANGE: ...` 가 있는 커밋 → release-it 이 자동 major bump.

```
feat(renderer)!: remove chrome option from renderCanvas

Renderer no longer outputs editor / preview chrome. Host apps
(dashboard) compose their own viewport / chrome on top of bounded
layout output.

BREAKING CHANGE: renderCanvas no longer accepts `chrome` option.
Migration: pass output through your own viewport component.

Clawket-Ref: WW-181
```

### 5. 의존 패키지 일괄 동기화

core 가 publish 되고 나서:

```bash
./scripts/update-core-deps.sh <new-version>
```

각 패키지 PR 은:

- `@wireweave/core` 버전 bump
- BREAKING 영향 코드 수정
- 패키지별 minor (또는 BREAKING 이 노출되면 major) bump

### 6. 외부 사용자 공지

`@wireweave/core` 는 npm public 패키지. 외부 사용자가 있을 수 있다.

- CHANGELOG.md 의 BREAKING 섹션
- npm publish 시 release notes
- `wireweave/docs/migration/` 에 가이드 (선택)

## 사례 — 3.0.0 (renderCanvas chrome 제거)

- 영향: dashboard 가 자체 viewport 구현으로 이전, examples / admin 영향 없음
- deprecation 미실시 (chrome 옵션이 너무 얽혀있어 공존 비용 > 마이그레이션 비용)
- migration: dashboard 의 EditorLayout 에 PanZoomViewport / GridLayer 신규 구현
- 의존 패키지 PR: api-server (guide.ts 문구), dashboard (canvas viewer), examples (의존 버전만)

## 결정이 어려울 때

- BREAKING vs minor 가 애매하면 BREAKING 으로 간주 (보수적 접근)
- 영향 평가가 끝나기 전에 publish 하지 않음
- 사용자 / 의존 패키지 메인테이너에게 미리 알림
