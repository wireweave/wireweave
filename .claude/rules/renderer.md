---
paths:
  - 'src/renderer/**'
---

# 렌더러 레이어 규칙

AST → HTML / CSS / SVG. 환경 비의존적.

## 책임

- 단일 페이지 렌더 (legacy `render`)
- 다중 페이지 캔버스 렌더 (`renderCanvas`)
- bounded layout 계산 (`layoutCanvas` — 페이지 좌표 결정)
- HTML attribute 인코딩, CSS escape

## 비책임

- 무한 캔버스 viewport (pan/zoom/pinch/grid) — host 앱 (dashboard) 책임
- 페이지 chrome (header/footer/decoration) — host 앱이 PlacedPage 위에 그림
- 클라이언트 인터랙션 (클릭, 호버, focus) — host 앱

## bounded layout 정책 (3.0+)

3.0.0 BREAKING — `chrome` 옵션이 제거되었다. `renderCanvas` 는 항상 bounded layout 만 출력:

- 단일 절대좌표 컨테이너에 페이지가 `position: absolute` 로 배치됨
- 각 페이지는 `data-page-*` 속성 (id, x, y, width, height) 으로 메타데이터 노출
- host 앱이 이 출력 위에 자기 viewport / chrome 을 그린다

```html
<div class="ww-canvas" style="position:relative; width:Wpx; height:Hpx">
  <div
    class="ww-page"
    data-page-id="..."
    data-page-x="..."
    data-page-y="..."
    style="position:absolute; left:Xpx; top:Ypx; width:Wpx; height:Hpx"
  >
    ...
  </div>
</div>
```

`PlacedPage` 타입(`{ id, x, y, width, height, html, css }`) 도 직접 export — host 앱이 페이지를 따로 배치하고 싶을 때 사용.

## 환경 독립성

`.claude/rules/no-responsive.md` 참조. 핵심:

- 페이지는 고정 크기. 뷰포트 따라 줄어들지 않음.
- 축소는 host 앱이 `transform: scale()` 로 처리 — 렌더러 출력 자체는 동일.
- 에디터 / Storybook / VSCode 어디서 열어도 같은 HTML.

## 출력 안정성

HTML 출력의 외형 안정성:

- class 이름 prefix `ww-*` 로 충돌 방지
- inline style 은 layout / position 한정 (background, color 같은 시각 토큰은 host CSS 에 의존)
- data-attribute 는 `data-page-*` 로 namespace
- 동일 입력 → 동일 출력 (deterministic. 시간/랜덤 의존 금지)

## CSS 분리 전략

- 페이지별 unique CSS (예: 사용자 정의 색)는 inline style
- 공통 base CSS 는 정적 string 으로 export — host 가 한 번만 주입
- `<style>` 태그를 출력 HTML 에 inline 하지 않음 (CSP / hydration 충돌)

## 보안

- 모든 사용자 텍스트 (Component label, Page title 등) → HTML escape
- href / src 속성 → URL 검증 (javascript: protocol 거부)
- inline script 출력 금지 (어떤 경우에도)

## 테스트

- snapshot 테스트는 회귀 검증 용도로만 — semantic 변경 시 의도적으로 갱신
- 의미 있는 unit 테스트: data-attribute 존재 / class 이름 / 좌표 계산 / escape 동작
- DOM 구조 의존 테스트는 querySelector 로 — 정확한 HTML string 비교 지양

## 변경 영향도 평가

renderer 변경 시 영향:

| 변경 종류                 | 영향받는 의존 패키지                                                |
| ------------------------- | ------------------------------------------------------------------- |
| HTML 구조 변경            | dashboard, admin, vscode-extension, markdown-plugin (스크린샷 회귀) |
| CSS class 이름 변경       | 위와 동일 + 외부 사용자 (BREAKING 후보)                             |
| data-attribute 변경       | dashboard (Canvas viewer 가 `data-page-*` 의존) — BREAKING          |
| layout 좌표 알고리즘 변경 | dashboard 의 selection / bounding box 로직 — BREAKING 가능          |

renderer 의 public 출력은 의존 패키지의 implicit contract. 변경 시 `.claude/rules/breaking-change.md` 참조.
