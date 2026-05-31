# 스타일링

Wireweave는 와이어프레임 외관을 커스터마이즈하기 위한 내장 테마와 스타일링 옵션을 제공합니다.

## 테마

### 라이트 테마 (기본값)

```wireframe
page "Light Mode" theme:light {
  // 콘텐츠
}
```

라이트 테마 색상:

- 배경: 흰색 (#FFFFFF)
- 텍스트: 진한 회색 (#1F2937)
- Primary: 파랑 (#3B82F6)
- 테두리: 연한 회색 (#E5E7EB)

### 다크 테마

```wireframe
page "Dark Mode" theme:dark {
  // 콘텐츠
}
```

다크 테마 색상:

- 배경: 어두운 색 (#111827)
- 텍스트: 연한 회색 (#F9FAFB)
- Primary: 파랑 (#60A5FA)
- 테두리: 회색 (#374151)

## 색상

### 버튼 색상

```wireframe
button "Primary" primary      // 파랑
button "Secondary" secondary  // 회색
button "Success" success      // 초록
button "Danger" danger        // 빨강
button "Warning" warning      // 노랑
```

### 알림 색상

```wireframe
alert "Success!" success      // 초록 배경
alert "Error!" error          // 빨강 배경
alert "Warning!" warning      // 노랑 배경
alert "Info!" info            // 파랑 배경
```

### 뱃지 색상

```wireframe
badge "Active" success
badge "Pending" warning
badge "Inactive" error
badge "New" info
```

## 타이포그래피

### 헤딩 크기

```wireframe
heading "H1 Title"            // 32px
heading "H2 Title" level:2    // 24px
heading "H3 Title" level:3    // 20px
heading "H4 Title" level:4    // 16px
```

### 텍스트 스타일

```wireframe
text "Regular text"
text "Bold text" bold
text "Muted text" muted
text "Small text" small
text "Large text" large
```

## 컴포넌트 스타일

### 카드 스타일

```wireframe
card {
  // 기본값 - 은은한 그림자
}

card outlined {
  // 그림자 대신 테두리
}

card flat {
  // 그림자나 테두리 없음
}

card elevated {
  // 더 큰 그림자
}
```

### 입력 스타일

```wireframe
input "Default" text
input "Error" text error
input "Disabled" text disabled
input "Readonly" text readonly
```

### 버튼 스타일

```wireframe
button "Solid" primary
button "Outline" primary outline
button "Ghost" primary ghost
button "Link" link
```

## 크기 조절

### 컴포넌트 크기

```wireframe
button "Small" primary size:sm
button "Medium" primary size:md
button "Large" primary size:lg

input "Small" text size:sm
input "Large" text size:lg
```

### 너비 옵션

```wireframe
input "Full Width" text fullWidth
button "Full Width" primary fullWidth

card width:400 {
  // 고정 너비
}
```

## 렌더 옵션

렌더링 시 옵션을 지정할 수 있습니다:

### HTML 렌더

```javascript
renderHtml(source, {
  theme: 'light', // 또는 'dark'
  fullDocument: true, // 완전한 HTML 문서
})
```

### SVG 렌더

```javascript
renderSvg(source, {
  width: 1200,
  padding: 24,
  theme: 'light',
})
```

## 모범 사례

1. **시맨틱 색상 사용** - 커스텀 색상 대신 `primary`, `success`, `danger` 사용
2. **일관성 유지** - 와이어프레임당 하나의 테마 유지
3. **레이아웃에 집중** - 와이어프레임은 구조에 관한 것, 비주얼 디자인이 아님
4. **단순하게 유지** - 과도한 스타일링 피하기; 와이어프레임은 빠른 스케치여야 함

## 다음 단계

- [MCP 서버 가이드](/ko/guide/mcp-server) - AI 통합
- [컴포넌트 레퍼런스](/ko/reference/components) - 컴포넌트 상세
