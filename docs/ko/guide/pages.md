# 페이지

모든 Wireweave 와이어프레임은 `page` 컴포넌트로 시작합니다. 이것은 모든 콘텐츠의 루트 컨테이너입니다.

## 기본 페이지

```wireframe
page {
  // 콘텐츠가 들어갑니다
}
```

## 페이지 제목

페이지에 제목을 지정합니다:

```wireframe
page "Login" {
  // 콘텐츠
}
```

제목은 와이어프레임 헤더에 표시되며 문서화에 사용할 수 있습니다.

## 페이지 테마

전체 페이지의 색상 테마를 설정합니다:

```wireframe
page "Dashboard" theme:light {
  // 라이트 테마 (기본값)
}

page "Dashboard" theme:dark {
  // 다크 테마
}
```

## 페이지 레이아웃

### 전체 너비

```wireframe
page fullWidth {
  // 콘텐츠가 전체 너비를 차지합니다
}
```

### 중앙 정렬

```wireframe
page center {
  // 콘텐츠가 중앙에 정렬됩니다
}
```

### 최대 너비

```wireframe
page maxWidth:1200 {
  // 콘텐츠가 1200px로 제한됩니다
}
```

## 일반적인 페이지 구조

### 랜딩 페이지

```wireframe
page "Home" {
  navbar {
    logo "Brand"
    nav { link "Features" link "Pricing" link "About" }
    button "Sign Up" primary
  }

  section hero center {
    heading "Welcome to Our Product"
    text "The best solution for your needs"
    button "Get Started" primary
  }

  section features {
    grid columns:3 {
      card { heading "Fast" text "Lightning quick performance" }
      card { heading "Simple" text "Easy to use interface" }
      card { heading "Secure" text "Enterprise-grade security" }
    }
  }

  footer {
    text "Copyright 2026"
  }
}
```

### 대시보드

```wireframe
page "Dashboard" {
  navbar {
    logo "App"
    nav { link "Dashboard" active link "Settings" }
    avatar "User"
  }

  row {
    sidebar width:240 {
      menu {
        item "Overview"
        item "Analytics"
        item "Reports"
        item "Settings"
      }
    }

    main {
      heading "Overview"
      grid columns:4 {
        card { text "Users" heading "1,234" }
        card { text "Revenue" heading "$56,789" }
        card { text "Orders" heading "890" }
        card { text "Growth" heading "+12%" }
      }

      card {
        heading "Recent Activity"
        table { ... }
      }
    }
  }
}
```

### 인증 페이지

```wireframe
page "Login" center {
  card width:400 {
    heading "Welcome Back"
    text "Sign in to your account"

    input "Email" email
    input "Password" password

    row justify:between {
      checkbox "Remember me"
      link "Forgot password?"
    }

    button "Sign In" primary fullWidth

    divider "or"

    button "Continue with Google" secondary fullWidth
  }
}
```

### 설정 페이지

```wireframe
page "Settings" {
  navbar { ... }

  row {
    sidebar {
      menu {
        item "Profile"
        item "Account"
        item "Security"
        item "Notifications"
      }
    }

    main {
      heading "Profile Settings"

      card {
        row gap:24 {
          avatar "User" size:80
          stack {
            heading "John Doe" level:3
            text "john@example.com" muted
            button "Change Photo" secondary
          }
        }
      }

      card {
        heading "Personal Information" level:3
        form {
          row gap:16 {
            input "First Name" text
            input "Last Name" text
          }
          input "Email" email
          input "Bio" textarea

          row justify:end {
            button "Cancel" secondary
            button "Save Changes" primary
          }
        }
      }
    }
  }
}
```

## 캔버스 위의 다중 페이지

하나의 `.wf` 파일에 여러 `page` 블록을 선언하면 와이어프레임 캔버스 위에 나란히 배치됩니다.

### 자동 흐름

좌표가 없는 페이지는 수평 방향으로 흐르며, 기본 간격은 64px 입니다:

```wireframe
page "Login" viewport="375x812" {
  // 모바일 로그인 화면
}

page "Verify Code" viewport="375x812" {
  // SMS 코드 입력
}

page "Welcome" viewport="375x812" {
  // 가입 후 랜딩
}
```

### `at(x, y)` 로 명시적 배치

`at(x, y)` 로 페이지를 캔버스 좌표에 고정합니다. `at(...)` 가 있는 페이지는 지정한 위치에 정확히 배치되고, 없는 페이지는 계속 자동 흐름을 따릅니다.

```wireframe
page "Login" at(0, 0) viewport="1280x800" {
  // ...
}

page "Dashboard" at(1400, 0) viewport="1280x800" {
  // ...
}

page "Settings" at(1400, 900) viewport="1280x800" {
  // ...
}
```

선형 흐름에는 자동 흐름을, 캔버스 자체가 구조를 표현해야 할 때(분기, 전후 비교, 앱 영역)는 `at(x, y)` 를 사용하세요.

### 하나의 페이지 안에서 흐름 보여주기

페이지를 분리하지 않고 단일 페이지에서 *흐름을 서술*하고 싶다면 섹션을 사용합니다:

```wireframe
page "User Flow" {
  section "Step 1: Login"     { card { ... } }
  section "Step 2: Dashboard" { card { ... } }
  section "Step 3: Settings"  { card { ... } }
}
```

## 다음 단계

- [컴포넌트](/ko/guide/components) - 사용 가능한 UI 컴포넌트
- [레이아웃](/ko/guide/layouts) - 레이아웃 옵션
