# 컴포넌트 레퍼런스

모든 Wireweave 컴포넌트의 완전한 레퍼런스와 예제입니다.

## 공통 속성 (Common Props)

모든 컴포넌트는 다음 공통 속성을 지원합니다. 코어 타입 시스템에서 상속되며 모든 컴포넌트에 사용할 수 있습니다.

### 간격 (Spacing)

| 속성 | 타입           | 설명        |
| ---- | -------------- | ----------- |
| p    | number         | 패딩 (전체) |
| px   | number         | 수평 패딩   |
| py   | number         | 수직 패딩   |
| pt   | number         | 상단 패딩   |
| pr   | number         | 우측 패딩   |
| pb   | number         | 하단 패딩   |
| pl   | number         | 좌측 패딩   |
| m    | number         | 마진 (전체) |
| mx   | number \| auto | 수평 마진   |
| my   | number         | 수직 마진   |
| mt   | number         | 상단 마진   |
| mr   | number         | 우측 마진   |
| mb   | number         | 하단 마진   |
| ml   | number         | 좌측 마진   |

간격 값은 토큰 스케일을 사용합니다: 0=0px, 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px. 명시적 단위도 지정 가능합니다 (예: `p=16px`, `m=2rem`).

### 크기 (Sizing)

| 속성 | 타입                                    | 설명      |
| ---- | --------------------------------------- | --------- |
| w    | number \| full \| auto \| screen \| fit | 너비      |
| h    | number \| full \| auto \| screen        | 높이      |
| minW | number                                  | 최소 너비 |
| maxW | number                                  | 최대 너비 |
| minH | number                                  | 최소 높이 |
| maxH | number                                  | 최대 높이 |

### 플렉스 (Flex)

| 속성      | 타입                                                  | 설명           |
| --------- | ----------------------------------------------------- | -------------- |
| flex      | boolean \| number                                     | 플렉스 증가    |
| direction | row \| column \| row-reverse \| column-reverse        | 플렉스 방향    |
| justify   | start \| center \| end \| between \| around \| evenly | 주축 정렬      |
| align     | start \| center \| end \| stretch \| baseline         | 교차축 정렬    |
| wrap      | boolean                                               | 줄바꿈 허용    |
| gap       | number                                                | 자식 요소 간격 |

### 위치 (Position)

| 속성 | 타입   | 설명                    |
| ---- | ------ | ----------------------- |
| x    | number | X 위치 (절대 위치 지정) |
| y    | number | Y 위치 (절대 위치 지정) |

### 외관 (Appearance)

| 속성   | 타입                          | 설명        |
| ------ | ----------------------------- | ----------- |
| bg     | muted \| primary \| secondary | 배경색      |
| border | boolean                       | 테두리 표시 |

---

## 인터랙티브 속성 (Interactive Props)

다음 컴포넌트는 인터랙티브 속성을 지원합니다: `button`, `link`, `card`, `image`, `avatar`, `badge`, `icon`.

| 속성     | 타입   | 설명                                        |
| -------- | ------ | ------------------------------------------- |
| navigate | string | 다른 페이지 또는 URL로 이동                 |
| opens    | string | id로 모달, 드로어 또는 오버레이 요소 열기   |
| toggles  | string | id로 요소의 가시성 또는 상태 토글           |
| action   | string | 커스텀 액션 식별자 (예: "submit", "logout") |

```wireframe
button "Open Settings" opens="settings-modal"
button "Go Home" navigate="/home"
icon "menu" toggles="sidebar"
card action="select-item" { }
```

---

## Layout

페이지 구조를 정의하는 컴포넌트입니다.

### page

페이지 루트 컨테이너. 모든 레이아웃의 시작점입니다. 하나의 `.wf` 파일에 여러 `page` 블록을 두면 와이어프레임 캔버스 위에 나란히 배치됩니다 — `at(x, y)` 로 명시적 좌표를 지정하거나, 생략하면 수평으로 자동 흐름합니다.

```wireframe
page "Dashboard" centered {
  // 콘텐츠
}

page "Login" at(0, 0) viewport="1280x800" { }
page "Dashboard" at(1400, 0) viewport="1280x800" { }
```

| 속성      | 타입     | 설명                                                                               |
| --------- | -------- | ---------------------------------------------------------------------------------- |
| title     | string   | 페이지 제목                                                                        |
| viewport  | string   | 뷰포트 크기 (예: "1440x900")                                                       |
| device    | string   | 디바이스 프리셋 (아래 참조)                                                        |
| centered  | boolean  | 콘텐츠 중앙 정렬                                                                   |
| at        | function | 캔버스 배치 — `at(x, y)`. `at(...)` 가 없는 페이지는 64px 간격으로 수평 자동 흐름. |
| p, px, py | number   | 패딩                                                                               |
| gap       | number   | 자식 요소 간격                                                                     |

**디바이스 프리셋:**

| 카테고리 | 프리셋              | 크기      | 설명                  |
| -------- | ------------------- | --------- | --------------------- |
| 데스크톱 | `desktop-sm`        | 1280×800  | 소형 노트북           |
|          | `desktop`           | 1440×900  | 데스크톱 (기본값)     |
|          | `desktop-lg`        | 1920×1080 | Full HD               |
|          | `desktop-xl`        | 2560×1440 | QHD                   |
| 태블릿   | `ipad`              | 1024×768  | iPad (가로)           |
|          | `ipad-portrait`     | 768×1024  | iPad (세로)           |
|          | `ipad-pro`          | 1366×1024 | iPad Pro 12.9"        |
|          | `ipad-pro-portrait` | 1024×1366 | iPad Pro 12.9" (세로) |
| 모바일   | `iphone-se`         | 375×667   | iPhone SE             |
|          | `iphone14`          | 390×844   | iPhone 14             |
|          | `iphone14-pro`      | 393×852   | iPhone 14 Pro         |
|          | `iphone14-pro-max`  | 430×932   | iPhone 14 Pro Max     |
|          | `android`           | 360×800   | Android               |
|          | `android-lg`        | 412×915   | Android Large         |

---

### header

페이지 헤더 영역. 네비게이션, 로고 등을 배치합니다.

```wireframe
header border {
  row justify=between {
    title "Logo" level=3
    nav { }
  }
}
```

| 속성      | 타입    | 설명           |
| --------- | ------- | -------------- |
| border    | boolean | 하단 테두리    |
| p, px, py | number  | 패딩           |
| gap       | number  | 자식 요소 간격 |
| justify   | string  | 주축 정렬      |
| align     | string  | 교차축 정렬    |

---

### main

메인 콘텐츠 영역.

```wireframe
main {
  // 메인 콘텐츠
}

main scroll {
  // 스크롤 가능한 콘텐츠
}
```

| 속성      | 타입    | 설명               |
| --------- | ------- | ------------------ |
| scroll    | boolean | 수직 스크롤 활성화 |
| p, px, py | number  | 패딩               |
| gap       | number  | 자식 요소 간격     |

---

### footer

페이지 푸터 영역.

```wireframe
footer border {
  text "Copyright 2026" muted
}
```

| 속성   | 타입    | 설명        |
| ------ | ------- | ----------- |
| border | boolean | 상단 테두리 |

---

### sidebar

사이드바 영역.

```wireframe
sidebar position=left w=240 {
  nav vertical { }
}
```

| 속성     | 타입          | 설명          |
| -------- | ------------- | ------------- |
| position | left \| right | 사이드바 위치 |
| w        | number        | 너비          |

---

### section

섹션 영역. 콘텐츠를 논리적으로 그룹화합니다.

```wireframe
section title="Settings" expanded {
  // 콘텐츠
}
```

| 속성     | 타입    | 설명      |
| -------- | ------- | --------- |
| title    | string  | 섹션 제목 |
| expanded | boolean | 확장 상태 |

---

## Grid

플렉스 레이아웃을 위한 컴포넌트입니다.

### row

가로 방향 플렉스 컨테이너.

```wireframe
row gap=4 justify=between align=center {
  button "Cancel" secondary
  button "Submit" primary
}
```

| 속성    | 타입                                                  | 설명           |
| ------- | ----------------------------------------------------- | -------------- |
| gap     | number                                                | 자식 요소 간격 |
| justify | start \| center \| end \| between \| around \| evenly | 주축 정렬      |
| align   | start \| center \| end \| stretch \| baseline         | 교차축 정렬    |
| wrap    | boolean                                               | 줄바꿈 허용    |

---

### col

세로 방향 플렉스 컨테이너 또는 그리드 컬럼.

```wireframe
row {
  col span=6 { }
  col span=6 { }
}

col scroll {
  // 스크롤 가능한 컬럼
}
```

| 속성           | 타입    | 설명               |
| -------------- | ------- | ------------------ |
| span           | 1-12    | 그리드 컬럼 너비   |
| sm, md, lg, xl | number  | 반응형 컬럼 너비   |
| scroll         | boolean | 수직 스크롤 활성화 |
| order          | number  | 플렉스 순서        |
| gap            | number  | 자식 요소 간격     |

---

### stack

세로 방향 스택 컨테이너. 각 자식 요소가 콘텐츠 높이만큼만 차지합니다 (flex: 0 0 auto). `col`과 달리 남은 공간을 채우지 않습니다.

```wireframe
stack gap=4 {
  text "Item 1"
  text "Item 2"
  text "Item 3"
}
```

| 속성   | 타입                          | 설명           |
| ------ | ----------------------------- | -------------- |
| gap    | number                        | 자식 요소 간격 |
| border | boolean                       | 테두리 표시    |
| bg     | muted \| primary \| secondary | 배경색         |

---

### relative

절대 위치 오버레이 컨테이너. 자식 요소에 `x`, `y` 속성을 사용하여 정밀 배치할 수 있습니다.

```wireframe
relative w=300 h=200 {
  image w=full h=full
  badge "New" x=10 y=10
}
```

| 속성 | 타입   | 설명 |
| ---- | ------ | ---- |
| w    | number | 너비 |
| h    | number | 높이 |

---

## Container

콘텐츠를 그룹화하는 컴포넌트입니다.

### card

카드 컴포넌트. 콘텐츠를 그룹화하여 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
card title="Settings" shadow=md border {
  // 콘텐츠
}
```

| 속성   | 타입                         | 설명        |
| ------ | ---------------------------- | ----------- |
| title  | string                       | 카드 제목   |
| shadow | none \| sm \| md \| lg \| xl | 그림자 크기 |
| border | boolean                      | 테두리 표시 |
| p      | number                       | 패딩        |

---

### modal

모달 다이얼로그. 오버레이 위에 콘텐츠를 표시합니다.

```wireframe
modal "Confirm Delete" id="delete-modal" {
  text "Are you sure?"
  row justify=end gap=2 {
    button "Cancel" secondary
    button "Delete" danger
  }
}
```

| 속성  | 타입   | 설명                                            |
| ----- | ------ | ----------------------------------------------- |
| title | string | 모달 제목                                       |
| id    | string | `opens`/`toggles`로 타겟팅하기 위한 고유 식별자 |
| w, h  | number | 너비, 높이                                      |

---

### drawer

드로어 패널. 화면 가장자리에서 슬라이드됩니다.

```wireframe
drawer "Menu" id="side-menu" position=left {
  nav vertical { }
}
```

| 속성     | 타입                           | 설명                                            |
| -------- | ------------------------------ | ----------------------------------------------- |
| title    | string                         | 드로어 제목                                     |
| id       | string                         | `opens`/`toggles`로 타겟팅하기 위한 고유 식별자 |
| position | left \| right \| top \| bottom | 위치                                            |

---

### accordion

아코디언. 접을 수 있는 콘텐츠 패널입니다.

```wireframe
accordion "Advanced Settings" {
  // 콘텐츠
}
```

| 속성  | 타입   | 설명          |
| ----- | ------ | ------------- |
| title | string | 아코디언 제목 |

---

## Text

텍스트를 표시하는 컴포넌트입니다.

### text

일반 텍스트를 표시합니다.

```wireframe
text "Regular text"
text "Muted description" muted
text "Important" weight=bold size=lg
text "Large heading" size=3xl align=justify
```

| 속성   | 타입                                             | 설명        |
| ------ | ------------------------------------------------ | ----------- |
| size   | xs \| sm \| base \| md \| lg \| xl \| 2xl \| 3xl | 텍스트 크기 |
| weight | normal \| medium \| semibold \| bold             | 글자 굵기   |
| align  | left \| center \| right \| justify               | 텍스트 정렬 |
| muted  | boolean                                          | 흐린 스타일 |

---

### title

제목 요소. h1~h6 헤딩을 표시합니다.

```wireframe
title "Main Title" level=1
title "Subtitle" level=2
title "Section" level=3
```

| 속성  | 타입   | 설명        |
| ----- | ------ | ----------- |
| level | 1-6    | 헤딩 레벨   |
| size  | string | 텍스트 크기 |
| align | string | 텍스트 정렬 |

---

### link

클릭 가능한 하이퍼링크를 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
link "Learn more" href="/docs"
link "GitHub" href="https://github.com" external
```

| 속성     | 타입    | 설명              |
| -------- | ------- | ----------------- |
| href     | string  | 링크 URL          |
| external | boolean | 외부 링크 (새 탭) |

---

## Input

사용자 입력을 받는 컴포넌트입니다.

### input

입력 필드. 텍스트, 이메일, 비밀번호 등을 입력받습니다.

```wireframe
input "Email" inputType=email placeholder="Enter email"
input "Password" inputType=password
input "Name" required disabled
```

| 속성        | 타입                                                                | 설명         |
| ----------- | ------------------------------------------------------------------- | ------------ |
| label       | string                                                              | 라벨 텍스트  |
| inputType   | text \| email \| password \| number \| tel \| url \| search \| date | 입력 타입    |
| placeholder | string                                                              | 플레이스홀더 |
| value       | string                                                              | 기본값       |
| disabled    | boolean                                                             | 비활성화     |
| required    | boolean                                                             | 필수 입력    |
| readonly    | boolean                                                             | 읽기 전용    |
| icon        | string                                                              | 아이콘       |
| size        | sm \| md \| lg                                                      | 입력 크기    |

---

### textarea

여러 줄 입력 필드.

```wireframe
textarea "Message" placeholder="Enter your message" rows=4
textarea "Bio" value="Hello world" required
```

| 속성        | 타입    | 설명         |
| ----------- | ------- | ------------ |
| label       | string  | 라벨 텍스트  |
| placeholder | string  | 플레이스홀더 |
| value       | string  | 기본값       |
| rows        | number  | 줄 수        |
| disabled    | boolean | 비활성화     |
| required    | boolean | 필수 입력    |

---

### select

드롭다운 선택.

```wireframe
select "Country" placeholder="Select country" options=["USA", "Canada", "UK"]
select "Status" options=["Active", "Inactive"] value="Active"
```

| 속성        | 타입    | 설명         |
| ----------- | ------- | ------------ |
| label       | string  | 라벨 텍스트  |
| placeholder | string  | 플레이스홀더 |
| options     | array   | 옵션 목록    |
| value       | string  | 선택된 값    |
| disabled    | boolean | 비활성화     |
| required    | boolean | 필수 입력    |

---

### checkbox

체크박스. 참/거짓 값을 선택합니다.

```wireframe
checkbox "Remember me"
checkbox "I agree to terms" checked
```

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 라벨 텍스트 |
| checked  | boolean | 체크 상태   |
| disabled | boolean | 비활성화    |

---

### radio

라디오 버튼. 그룹 내에서 하나를 선택합니다.

```wireframe
radio "Option A" name="options"
radio "Option B" name="options" checked
```

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 라벨 텍스트 |
| name     | string  | 그룹 이름   |
| checked  | boolean | 선택 상태   |
| disabled | boolean | 비활성화    |

---

### switch

토글 스위치. 온/오프 상태를 전환합니다.

```wireframe
switch "Dark mode"
switch "Notifications" checked
```

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 라벨 텍스트 |
| checked  | boolean | 활성 상태   |
| disabled | boolean | 비활성화    |

---

### slider

슬라이더. 범위 내 값을 선택합니다.

```wireframe
slider "Volume" min=0 max=100 value=50
```

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 라벨 텍스트 |
| min      | number  | 최소값      |
| max      | number  | 최대값      |
| value    | number  | 현재값      |
| step     | number  | 증가 단위   |
| disabled | boolean | 비활성화    |

---

### button

버튼 요소. 클릭 가능한 버튼을 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
button "Submit" primary
button "Cancel" secondary
button "Delete" danger outline
button "Loading..." primary loading
```

| 속성      | 타입                       | 설명             |
| --------- | -------------------------- | ---------------- |
| primary   | boolean                    | 기본 강조 스타일 |
| secondary | boolean                    | 보조 스타일      |
| outline   | boolean                    | 아웃라인 스타일  |
| ghost     | boolean                    | 투명 스타일      |
| danger    | boolean                    | 위험/삭제 스타일 |
| size      | xs \| sm \| md \| lg \| xl | 버튼 크기        |
| icon      | string                     | 아이콘           |
| disabled  | boolean                    | 비활성화         |
| loading   | boolean                    | 로딩 상태        |

---

## Display

시각적 요소를 표시하는 컴포넌트입니다.

### image

이미지를 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
image src="/photo.jpg" alt="Photo" w=200 h=150
```

| 속성 | 타입   | 설명            |
| ---- | ------ | --------------- |
| src  | string | 이미지 소스 URL |
| alt  | string | 대체 텍스트     |
| w    | number | 너비            |
| h    | number | 높이            |

---

### placeholder

이미지나 콘텐츠 자리 표시자입니다.

```wireframe
placeholder "Image" w=300 h=200
```

| 속성  | 타입   | 설명        |
| ----- | ------ | ----------- |
| label | string | 라벨 텍스트 |
| w     | number | 너비        |
| h     | number | 높이        |

---

### avatar

사용자 프로필 이미지를 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
avatar "John Doe"
avatar "JD" size=lg src
```

| 속성 | 타입                                 | 설명               |
| ---- | ------------------------------------ | ------------------ |
| name | string                               | 이름 (이니셜 생성) |
| src  | boolean                              | 이미지 표시        |
| size | xs \| sm \| md \| lg \| xl \| number | 크기               |

---

### badge

상태나 카운트를 작은 라벨로 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
badge "New"
badge "Active" variant=success
badge "3" variant=danger pill
badge "!" anchor=top-right
```

| 속성    | 타입                                                                    | 설명                           |
| ------- | ----------------------------------------------------------------------- | ------------------------------ |
| variant | default \| primary \| secondary \| success \| warning \| danger \| info | 스타일                         |
| pill    | boolean                                                                 | 둥근 모서리                    |
| icon    | string                                                                  | 아이콘                         |
| size    | xs \| sm \| md \| lg                                                    | 크기                           |
| anchor  | top-left \| top-right \| bottom-left \| bottom-right \| ...             | 오버레이 컨테이너 내 앵커 위치 |

---

### icon

아이콘을 표시합니다. [인터랙티브 속성](#인터랙티브-속성-interactive-props)을 지원합니다.

```wireframe
icon "home"
icon "settings" size=lg muted
```

| 속성  | 타입                                 | 설명        |
| ----- | ------------------------------------ | ----------- |
| name  | string                               | 아이콘 이름 |
| size  | xs \| sm \| md \| lg \| xl \| number | 크기        |
| muted | boolean                              | 흐린 스타일 |

---

### divider

구분선 요소. 콘텐츠를 시각적으로 구분합니다.

```wireframe
divider
divider my=4
divider vertical
```

| 속성      | 타입    | 설명      |
| --------- | ------- | --------- |
| vertical  | boolean | 세로 방향 |
| m, my, mx | number  | 마진      |

---

## Data

데이터를 표시하는 컴포넌트입니다.

### table

테이블 컴포넌트. 데이터를 표 형식으로 표시합니다.

**간결 문법** (배열의 배열):

```wireframe
table [["Name", "Email", "Role"], ["John", "john@example.com", "Admin"], ["Jane", "jane@example.com", "User"]]
```

**블록 문법** (columns + row):

```wireframe
table striped hover bordered {
  columns ["Name", "Email", "Role"]
  row ["John", "john@example.com", "Admin"]
  row ["Jane", "jane@example.com", "User"]
}
```

| 속성     | 타입    | 설명          |
| -------- | ------- | ------------- |
| columns  | array   | 컬럼 헤더     |
| striped  | boolean | 줄무늬 스타일 |
| bordered | boolean | 테두리 스타일 |
| hover    | boolean | 호버 효과     |

---

### list

리스트 컴포넌트. 항목들을 목록으로 표시합니다.

**배열 문법**:

```wireframe
list ["Apple", "Banana", "Cherry"]
list ["First", "Second", "Third"] ordered
```

**블록 문법** (중첩 지원):

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

| 속성    | 타입    | 설명             |
| ------- | ------- | ---------------- |
| ordered | boolean | 순서 있는 목록   |
| none    | boolean | 목록 스타일 없음 |
| gap     | number  | 항목 간격        |

---

## Feedback

사용자에게 피드백을 제공하는 컴포넌트입니다.

### alert

알림 요소. 사용자에게 메시지를 표시합니다.

```wireframe
alert "Operation successful" variant=success
alert "Please check your input" variant=warning
alert "An error occurred" variant=danger dismissible
```

| 속성        | 타입                                 | 설명      |
| ----------- | ------------------------------------ | --------- |
| variant     | success \| warning \| danger \| info | 스타일    |
| dismissible | boolean                              | 닫기 가능 |
| icon        | string                               | 아이콘    |

---

### toast

토스트 알림. 일시적인 메시지를 표시합니다.

```wireframe
toast "Saved!" position=top-right variant=success
```

| 속성     | 타입                                                                                | 설명   |
| -------- | ----------------------------------------------------------------------------------- | ------ |
| position | top-left \| top-center \| top-right \| bottom-left \| bottom-center \| bottom-right | 위치   |
| variant  | success \| warning \| danger \| info                                                | 스타일 |

---

### progress

프로그레스 바. 진행 상태를 표시합니다.

```wireframe
progress value=75
progress value=50 label="Uploading..."
progress indeterminate
```

| 속성          | 타입    | 설명           |
| ------------- | ------- | -------------- |
| value         | number  | 진행률 (0-100) |
| max           | number  | 최대값         |
| label         | string  | 라벨 텍스트    |
| indeterminate | boolean | 불확정 상태    |

---

### spinner

로딩 스피너. 로딩 상태를 표시합니다.

```wireframe
spinner
spinner size=lg label="Loading..."
```

| 속성  | 타입                                 | 설명        |
| ----- | ------------------------------------ | ----------- |
| size  | xs \| sm \| md \| lg \| xl \| number | 크기        |
| label | string                               | 라벨 텍스트 |

---

## Overlay

오버레이 UI 컴포넌트입니다.

### tooltip

툴팁 요소. 호버 시 추가 정보를 표시합니다.

```wireframe
tooltip "Click to save" position=top {
  button "Save" primary
}
```

| 속성     | 타입                           | 설명      |
| -------- | ------------------------------ | --------- |
| content  | string                         | 툴팁 내용 |
| position | top \| right \| bottom \| left | 위치      |

---

### popover

팝오버. 클릭 시 추가 콘텐츠를 표시합니다.

```wireframe
popover title="Options" {
  // 콘텐츠
}
```

| 속성  | 타입   | 설명        |
| ----- | ------ | ----------- |
| title | string | 팝오버 제목 |

---

### dropdown

드롭다운 메뉴. 클릭 시 메뉴가 펼쳐집니다.

**배열 문법**:

```wireframe
dropdown ["Edit", "Delete", "---", "Cancel"]
```

`"---"`를 사용하여 항목 사이에 구분선을 삽입합니다.

**블록 문법** (icon, href, danger, disabled 지원):

```wireframe
dropdown {
  item "Edit" icon="edit"
  item "Duplicate" icon="copy"
  divider
  item "Delete" icon="trash" danger
}
```

| 속성  | 타입  | 설명      |
| ----- | ----- | --------- |
| items | array | 메뉴 항목 |

**항목 속성 (블록 문법):**

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 항목 라벨   |
| icon     | string  | 항목 아이콘 |
| href     | string  | 링크 URL    |
| danger   | boolean | 위험 스타일 |
| disabled | boolean | 비활성화    |

---

## Navigation

네비게이션 컴포넌트입니다.

### nav

네비게이션 영역. 메뉴 항목들을 배치합니다.

**배열 문법**:

```wireframe
nav ["Home", "About", "Contact"]
```

**블록 문법** (그룹, 구분선, 아이콘, 활성 상태 지원):

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

| 속성     | 타입    | 설명                        |
| -------- | ------- | --------------------------- |
| vertical | boolean | 세로 방향                   |
| gap      | number  | 항목 간격                   |
| items    | array   | 네비게이션 항목 (배열 문법) |

**항목 속성 (블록 문법):**

| 속성     | 타입    | 설명        |
| -------- | ------- | ----------- |
| label    | string  | 항목 라벨   |
| icon     | string  | 항목 아이콘 |
| href     | string  | 링크 URL    |
| active   | boolean | 활성 상태   |
| disabled | boolean | 비활성화    |

---

### tabs

탭 컴포넌트. 여러 패널을 탭으로 전환합니다.

**배열 + 블록 문법**:

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

| 속성   | 타입   | 설명           |
| ------ | ------ | -------------- |
| items  | array  | 탭 라벨        |
| active | number | 활성 탭 인덱스 |

---

### breadcrumb

브레드크럼. 현재 위치를 경로로 표시합니다.

**배열 문법**:

```wireframe
breadcrumb ["Home", "Products", "Detail"]
```

| 속성  | 타입  | 설명                                        |
| ----- | ----- | ------------------------------------------- |
| items | array | 브레드크럼 항목 (문자열 또는 {label, href}) |

---

## Annotation

와이어프레임을 번호 마커와 설명 패널로 문서화하는 컴포넌트입니다.

### marker

번호 마커 오버레이. UI 요소에 배치하여 어노테이션 패널에서 참조합니다.

```wireframe
marker 1
marker 2 color=blue
marker 3 anchor=top-right color=red
```

| 속성   | 타입                                                                                                                         | 설명                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| color  | blue \| red \| green \| yellow \| purple \| orange                                                                           | 마커 색상                 |
| anchor | top-left \| top-center \| top-right \| center-left \| center \| center-right \| bottom-left \| bottom-center \| bottom-right | relative 컨테이너 내 위치 |

---

### annotations

어노테이션 패널 컨테이너. `item` 자식 요소와 함께 상세 설명을 포함합니다.

```wireframe
annotations title="화면 설명" {
  item 1 "로그인 버튼" {
    text "OAuth 연동 예정"
  }
  item 2 "비밀번호 필드" {
    text "최소 8자 이상 필요"
  }
}
```

| 속성  | 타입   | 설명      |
| ----- | ------ | --------- |
| title | string | 패널 제목 |

---

### item

개별 어노테이션 항목. `annotations`의 자식으로 마커 번호와 제목을 가집니다.

```wireframe
item 1 "버튼 설명" {
  text "상세 설명 내용"
  text "추가 참고사항" muted
}
```
