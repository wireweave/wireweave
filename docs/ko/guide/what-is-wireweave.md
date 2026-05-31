# Wireweave란?

Wireweave는 간단하고 사람이 읽기 쉬운 형식으로 UI 와이어프레임을 설명하기 위해 설계된 도메인 특화 언어(DSL)입니다. AI 어시스턴트가 대화를 통해 자연스럽게 와이어프레임을 생성할 수 있도록 특별히 만들어졌습니다.

## Wireweave를 사용하는 이유

기존 와이어프레임 도구는 수동 드래그 앤 드롭 작업이 필요한데, AI 어시스턴트는 이를 수행할 수 없습니다. Wireweave는 텍스트 기반 형식을 제공하여 이 문제를 해결합니다:

- **읽고 쓰기 쉬움** - 사람과 AI 모두 문법을 이해할 수 있습니다
- **전문적인 결과물 생성** - 깔끔한 HTML/SVG 와이어프레임을 생성합니다
- **빠른 반복 지원** - 코드를 변경하면 즉시 결과를 확인할 수 있습니다
- **AI 도구와 통합** - 네이티브 MCP(Model Context Protocol) 지원

## 예제

간단한 로그인 페이지 와이어프레임입니다:

```wireframe
page "Login" {
  card center {
    heading "Welcome Back"
    input "Email" email
    input "Password" password
    button "Sign In" primary
    link "Forgot password?"
  }
}
```

이 코드는 적절한 스타일링과 레이아웃이 적용된 완전한 와이어프레임을 생성합니다.

## 주요 기능

### 시맨틱 컴포넌트

Wireweave는 일반적인 UI 패턴에 매핑되는 고수준 UI 컴포넌트를 제공합니다:

- **Page** - 루트 컨테이너
- **Card** - 선택적 테두리가 있는 그룹화된 콘텐츠
- **Form** - 라벨이 있는 입력 필드 모음
- **Table** - 헤더가 있는 데이터 표시
- **Navigation** - 메뉴와 링크

### 다양한 출력 형식

다양한 형식으로 와이어프레임을 생성합니다:

- **HTML** - CSS가 포함된 인터랙티브 프로토타입
- **SVG** - 문서용 정적 이미지
- **AST** - 커스텀 렌더러를 위한 JSON

### AI 통합

Wireweave는 AI 어시스턴트와 함께 작동하도록 설계되었습니다:

- **MCP 서버** - Model Context Protocol 통합
- **VS Code 확장** - 구문 강조 및 미리보기
- **마크다운 플러그인** - 문서에 와이어프레임 삽입

## 다음 단계

- [시작하기](/ko/guide/getting-started) - 설치하고 첫 번째 와이어프레임 만들기
- [컴포넌트 레퍼런스](/ko/reference/components) - 사용 가능한 컴포넌트 전체 목록
- [문법 레퍼런스](/ko/reference/grammar) - 완전한 문법 문서
