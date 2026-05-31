# 컴포넌트

Wireweave는 와이어프레임을 빠르게 구축할 수 있는 시맨틱 UI 컴포넌트를 제공합니다.

## 컴포넌트 카테고리

Wireweave 컴포넌트는 10가지 카테고리로 구성됩니다:

| 카테고리       | 목적            | 컴포넌트                                                         |
| -------------- | --------------- | ---------------------------------------------------------------- |
| **Layout**     | 페이지 구조     | page, header, main, footer, sidebar, section                     |
| **Grid**       | 플렉스 레이아웃 | row, col                                                         |
| **Container**  | 콘텐츠 그룹화   | card, modal, drawer, accordion                                   |
| **Text**       | 텍스트 표시     | text, title, link                                                |
| **Input**      | 사용자 입력     | input, textarea, select, checkbox, radio, switch, slider, button |
| **Display**    | 시각적 요소     | image, placeholder, avatar, badge, icon, divider                 |
| **Data**       | 데이터 표시     | table, list                                                      |
| **Feedback**   | 상태 피드백     | alert, toast, progress, spinner                                  |
| **Overlay**    | 오버레이 UI     | tooltip, popover, dropdown                                       |
| **Navigation** | 네비게이션      | nav, tabs, breadcrumb                                            |

## Layout

전체 페이지 구조를 정의합니다. 모든 와이어프레임은 `page`로 시작합니다.

```wireframe
page "Dashboard" {
  header {
    // 로고, 네비게이션
  }
  main {
    // 메인 콘텐츠
  }
  footer {
    // 저작권, 링크
  }
}
```

대시보드 레이아웃을 만들려면 `sidebar`를 추가합니다:

```wireframe
page {
  header { }
  row {
    sidebar w=240 { }
    main { }
  }
}
```

## Grid

`row`와 `col`로 유연한 레이아웃을 구축합니다.

```wireframe
row gap=4 justify=between {
  col span=8 {
    // 메인 영역 (8/12)
  }
  col span=4 {
    // 사이드 영역 (4/12)
  }
}
```

버튼 그룹과 같은 단순한 가로 배치에도 유용합니다:

```wireframe
row gap=2 justify=end {
  button "Cancel" secondary
  button "Save" primary
}
```

## Container

콘텐츠를 시각적으로 그룹화합니다.

**card** - 가장 많이 사용되는 컨테이너:

```wireframe
card title="User Profile" {
  avatar "John"
  text "john@example.com"
}
```

**modal** - 사용자 확인이 필요할 때:

```wireframe
modal "Delete Item?" {
  text "This action cannot be undone."
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

## Text

텍스트 콘텐츠를 표시합니다.

```wireframe
title "Welcome" level=1
text "Main description here"
text "Secondary info" muted
link "Learn more" href="/docs"
```

## Input

폼과 사용자 입력을 처리합니다.

**기본 폼 패턴:**

```wireframe
card {
  title "Login" level=2
  input "Email" inputType=email
  input "Password" inputType=password
  checkbox "Remember me"
  button "Sign In" primary
}
```

**다양한 입력 컴포넌트:**

```wireframe
select "Country" placeholder="Select..."
switch "Notifications" checked
slider "Volume" min=0 max=100 value=50
```

## Display

시각적 요소를 표시합니다.

```wireframe
row gap=4 align=center {
  avatar "John" size=lg
  col {
    text "John Doe" weight=bold
    badge "Admin" variant=success
  }
}

divider my=4

placeholder "Product Image" w=300 h=200
```

## Data

구조화된 데이터를 표시합니다.

```wireframe
table striped hover {
  // 테이블 데이터
}

list ordered {
  // 순서가 있는 목록
}
```

## Feedback

사용자에게 상태를 전달합니다.

```wireframe
alert "Changes saved successfully" variant=success

progress value=75 label="Uploading..."

spinner label="Loading..."
```

## Overlay

추가 정보나 메뉴를 오버레이로 표시합니다.

```wireframe
tooltip "Click to save" {
  button "Save" primary
}

dropdown {
  // 드롭다운 메뉴 항목
}
```

## Navigation

페이지 네비게이션을 위한 컴포넌트입니다.

```wireframe
nav {
  // 가로 네비게이션
}

tabs active=0 {
  // 탭 패널
}

breadcrumb {
  // 경로 표시
}
```

## 일반적인 패턴

### 로그인 폼

```wireframe
page "Login" centered {
  card w=400 p=6 {
    title "Sign In" level=2 align=center
    input "Email" inputType=email
    input "Password" inputType=password
    row justify=between align=center {
      checkbox "Remember me"
      link "Forgot password?"
    }
    button "Sign In" primary
    divider my=4
    button "Continue with Google" outline
  }
}
```

### 대시보드

```wireframe
page "Dashboard" {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      avatar "User"
    }
  }
  row {
    sidebar w=200 {
      nav vertical { }
    }
    main {
      row gap=4 {
        card { title "Users" text "1,234" }
        card { title "Revenue" text "$56K" }
        card { title "Orders" text "890" }
      }
    }
  }
}
```

## 다음 단계

- [레이아웃 가이드](/ko/guide/layouts) - 레이아웃 상세
- [스타일링 가이드](/ko/guide/styling) - 스타일링 옵션
- [컴포넌트 레퍼런스](/ko/reference/components) - 모든 속성 상세
