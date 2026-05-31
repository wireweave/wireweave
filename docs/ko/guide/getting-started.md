# 시작하기

이 가이드는 Wireweave를 설정하고 첫 번째 와이어프레임을 만드는 방법을 안내합니다.

## 설치

### 온라인 에디터

Wireweave를 시작하는 가장 빠른 방법은 [대시보드 에디터](https://wireweave.org/dashboard)를 사용하는 것입니다. 로그인하여 온라인에서 와이어프레임을 만들고, 편집하고, 저장할 수 있습니다!

### NPM 패키지

프로젝트에 코어 라이브러리를 설치합니다:

```bash
npm install @wireweave/core
```

### AI 어시스턴트용 MCP 서버

Claude 또는 다른 AI 어시스턴트와 Wireweave를 사용하려면:

1. [대시보드](https://wireweave.org/dashboard)에서 API 키를 발급받습니다

2. Claude Desktop 설정에 추가합니다:

```json
{
  "mcpServers": {
    "wireweave": {
      "command": "npx",
      "args": ["@wireweave/mcp-server"],
      "env": {
        "WIREWEAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

3. Claude에게 와이어프레임 생성을 요청하세요!

## 첫 번째 와이어프레임

간단한 연락처 폼을 만들어 봅시다:

```wireframe
page "Contact" {
  header border {
    row justify=between align=center {
      title "Company" level=3
      nav ["Home", "About", "Contact"]
    }
  }

  main p=4 {
    title "Get in Touch" level=1
    text "We'd love to hear from you." muted

    card shadow=md p=4 {
      col gap=4 {
        input "Name" placeholder="Your name"
        input "Email" inputType=email placeholder="your@email.com"
        textarea "Message" placeholder="Your message" rows=4
        button "Send Message" primary
      }
    }
  }

  footer border p=4 {
    text "© 2026 Company Inc." muted
  }
}
```

## 문법 이해하기

### 페이지

모든 와이어프레임은 `page`로 시작합니다:

```wireframe
page "Page Title" {
  // 콘텐츠가 들어갑니다
}
```

### 컴포넌트

컴포넌트는 페이지 내부에 중첩됩니다:

```wireframe
page {
  card {
    title "Title" level=3
    text "Description"
    button "Action" primary
  }
}
```

### 속성

속성을 추가하여 컴포넌트를 커스터마이즈합니다:

```wireframe
button "Click Me" primary           // primary 스타일
button "Cancel" secondary           // secondary 스타일
card shadow=md border { }           // 그림자와 테두리가 있는 카드
input "Email" inputType=email       // 이메일 입력 타입
row justify=center gap=4 { }        // 중앙 정렬 row와 간격
```

## 다음 단계

- [컴포넌트 가이드](/ko/guide/components) - 사용 가능한 컴포넌트 알아보기
- [레이아웃 가이드](/ko/guide/layouts) - 레이아웃 옵션 마스터하기
- [MCP 서버 가이드](/ko/guide/mcp-server) - AI 통합 설정하기
