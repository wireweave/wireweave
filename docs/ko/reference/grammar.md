# 문법 레퍼런스

Wireweave DSL의 완전한 문법 레퍼런스입니다.

## 기본 문법

### 주석

```wireframe
// 한 줄 주석

/* 여러 줄
   주석 */
```

### 문자열

```wireframe
"쌍따옴표 문자열"
'홑따옴표 문자열'
```

### 숫자

```wireframe
100        // 정수
3.14       // 실수
```

### 불리언

```wireframe
true
false
```

## 구조

### Page

```wireframe
page [title] [at(x, y)] [modifiers] {
  [children]
}
```

예제:

```wireframe
page { }
page "Title" { }
page "Title" centered { }
page "Title" at(0, 0) viewport="1280x800" { }
```

같은 `.wf` 파일에 여러 `page` 블록을 두면 와이어프레임 캔버스에 나란히 배치됩니다. `at(x, y)` 가 있는 페이지는 지정한 캔버스 좌표에 고정되고, 없는 페이지는 64px 간격으로 수평 자동 흐름을 따릅니다. 자세한 내용은 [페이지 — 캔버스 위의 다중 페이지](/ko/guide/pages#캔버스-위의-다중-페이지) 참고.

### 컴포넌트

```wireframe
component_name [label] [modifiers] {
  [children]
}
```

예제:

```wireframe
card { }
card "Title" { }
card shadow=md border { }
button "Click" primary
```

## 컴포넌트 레퍼런스

### Layout

페이지 구조를 정의하는 컴포넌트입니다.

| 컴포넌트  | 설명                 | 속성                                          |
| --------- | -------------------- | --------------------------------------------- |
| `page`    | 페이지 루트 컨테이너 | title, viewport, device, centered, at, p, gap |
| `header`  | 페이지 헤더 영역     | p, border, gap, justify, align                |
| `main`    | 메인 콘텐츠 영역     | p, gap                                        |
| `footer`  | 페이지 푸터 영역     | p, border, gap                                |
| `sidebar` | 사이드바 영역        | position, w, p, gap                           |
| `section` | 섹션 영역            | title, expanded, p, gap                       |

```wireframe
page "Dashboard" {
  header { }
  main { }
  footer { }
}
```

### Grid

플렉스 레이아웃을 위한 컴포넌트입니다.

| 컴포넌트 | 설명                      | 속성                                   |
| -------- | ------------------------- | -------------------------------------- |
| `row`    | 가로 플렉스 컨테이너      | gap, justify, align, wrap, p, m        |
| `col`    | 세로 컨테이너/그리드 컬럼 | span, sm, md, lg, xl, order, gap, p, w |

```wireframe
row gap=4 justify=between {
  col span=6 { }
  col span=6 { }
}
```

### Container

콘텐츠를 그룹화하는 컴포넌트입니다.

| 컴포넌트    | 설명            | 속성                          |
| ----------- | --------------- | ----------------------------- |
| `card`      | 카드 컴포넌트   | title, p, shadow, border, gap |
| `modal`     | 모달 다이얼로그 | title, w, h, p                |
| `drawer`    | 드로어 패널     | title, position, p            |
| `accordion` | 아코디언 패널   | title, p                      |

```wireframe
card title="Settings" shadow=md {
  // 콘텐츠
}

modal "Confirm" {
  text "Are you sure?"
  button "OK" primary
}
```

### Text

텍스트를 표시하는 컴포넌트입니다.

| 컴포넌트 | 설명         | 속성                          |
| -------- | ------------ | ----------------------------- |
| `text`   | 일반 텍스트  | size, weight, align, muted, m |
| `title`  | 제목 (h1~h6) | level, size, align, m         |
| `link`   | 하이퍼링크   | href, external                |

```wireframe
title "Welcome" level=1
text "Description" muted
link "Learn more" href="/docs"
```

### Input

사용자 입력을 받는 컴포넌트입니다.

| 컴포넌트   | 설명          | 속성                                                                      |
| ---------- | ------------- | ------------------------------------------------------------------------- |
| `input`    | 입력 필드     | label, type, placeholder, value, disabled, required, icon                 |
| `textarea` | 여러 줄 입력  | label, placeholder, value, rows, disabled                                 |
| `select`   | 드롭다운 선택 | label, placeholder, value, disabled                                       |
| `checkbox` | 체크박스      | label, checked, disabled                                                  |
| `radio`    | 라디오 버튼   | label, name, checked, disabled                                            |
| `switch`   | 토글 스위치   | label, checked, disabled                                                  |
| `slider`   | 슬라이더      | label, min, max, value, step, disabled                                    |
| `button`   | 버튼          | primary, secondary, outline, ghost, danger, size, icon, disabled, loading |

입력 타입: `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`

```wireframe
input "Email" inputType=email placeholder="Enter email"
textarea "Message" rows=4
select "Country" { }
checkbox "Agree" checked
button "Submit" primary
button "Cancel" outline
```

### Display

시각적 요소를 표시하는 컴포넌트입니다.

| 컴포넌트      | 설명         | 속성                      |
| ------------- | ------------ | ------------------------- |
| `image`       | 이미지       | src, alt, w, h            |
| `placeholder` | 플레이스홀더 | label, w, h               |
| `avatar`      | 아바타       | name, src, size           |
| `badge`       | 뱃지         | variant, pill, icon, size |
| `icon`        | 아이콘       | name, size, muted         |
| `divider`     | 구분선       | m, my, mx                 |

```wireframe
image src="/photo.jpg" w=200
avatar "John" size=lg
badge "New" variant=success pill
icon "home" size=md
divider my=4
```

### Data

데이터를 표시하는 컴포넌트입니다.

| 컴포넌트 | 설명   | 속성                     |
| -------- | ------ | ------------------------ |
| `table`  | 테이블 | striped, bordered, hover |
| `list`   | 리스트 | ordered, none, gap       |

```wireframe
table striped hover {
  // 컬럼과 행 정의
}

list ordered {
  // 항목
}
```

### Feedback

사용자에게 피드백을 제공하는 컴포넌트입니다.

| 컴포넌트   | 설명          | 속성                             |
| ---------- | ------------- | -------------------------------- |
| `alert`    | 알림 메시지   | variant, dismissible, icon       |
| `toast`    | 토스트 알림   | position, variant                |
| `progress` | 프로그레스 바 | value, max, label, indeterminate |
| `spinner`  | 로딩 스피너   | label, size                      |

Variant: `success`, `warning`, `danger`, `info`

```wireframe
alert "Success!" variant=success
progress value=75 label="Loading..."
spinner size=lg
```

### Overlay

오버레이 UI 컴포넌트입니다.

| 컴포넌트   | 설명          | 속성     |
| ---------- | ------------- | -------- |
| `tooltip`  | 툴팁          | position |
| `popover`  | 팝오버        | title    |
| `dropdown` | 드롭다운 메뉴 | -        |

```wireframe
tooltip "Help text" position=top {
  button "?" outline
}

dropdown {
  // 항목
}
```

### Navigation

네비게이션 컴포넌트입니다.

| 컴포넌트     | 설명            | 속성          |
| ------------ | --------------- | ------------- |
| `nav`        | 네비게이션 메뉴 | vertical, gap |
| `tabs`       | 탭 컴포넌트     | active        |
| `breadcrumb` | 브레드크럼      | -             |

```wireframe
nav vertical {
  // 네비게이션 항목
}

tabs active=0 {
  // 탭 패널
}

breadcrumb {
  // 브레드크럼 항목
}
```

## 속성 문법

### 키-값 속성

```wireframe
component attribute=value
component attribute="string value"
```

예제:

```wireframe
col span=6
input placeholder="Enter email"
progress value=75
```

### 불리언 속성

```wireframe
component attribute   // true로 설정
```

예제:

```wireframe
button primary        // primary=true
input disabled        // disabled=true
checkbox checked      // checked=true
```

## 간격 시스템

Wireweave는 간격 토큰 시스템을 사용합니다:

| 토큰 | 값   |
| ---- | ---- |
| 0    | 0px  |
| 1    | 4px  |
| 2    | 8px  |
| 3    | 12px |
| 4    | 16px |
| 5    | 20px |
| 6    | 24px |
| 8    | 32px |
| 10   | 40px |
| 12   | 48px |

```wireframe
card p=4          // padding: 16px
row gap=2         // gap: 8px
text mt=6         // margin-top: 24px
```

## 전체 예제

```wireframe
page "User Management" centered {
  header border {
    row justify=between align=center {
      title "Admin" level=3
      nav {
        // 네비게이션 항목
      }
      avatar "Admin"
    }
  }

  row {
    sidebar w=200 {
      nav vertical {
        // 메뉴 항목
      }
    }

    main {
      row justify=between {
        title "Users" level=2
        button "Add User" primary
      }

      card {
        table striped hover {
          // 테이블 콘텐츠
        }
      }

      row justify=center gap=2 {
        button "Previous" secondary
        text "Page 1 of 10"
        button "Next" secondary
      }
    }
  }
}
```
