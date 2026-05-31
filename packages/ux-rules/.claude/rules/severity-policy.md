---
paths:
  - 'src/rules/**'
---

# severity 분류 정책

`error` / `warning` / `info` 의 분류 기준. 기준 없이 정하면 사용자가 신호 / 노이즈 비율을 잃는다.

## error

다음 중 하나 만족:

- 결과물이 사용자에게 사용 불가 (form 제출 실패, 키보드 접근 불가, 색맹 사용자에게 정보 손실)
- WCAG AA 위반
- 데이터 손상 위험

예: `Form` 안의 `Input` 이 `name` 속성 없음 / `Button` 에 label 없음 / 색만으로 정보 전달

## warning

다음 중 하나:

- 결과물이 사용 가능하지만 UX 가 저하됨 (touch target 작음, 일관성 없음)
- 성능 / 가독성 문제 (지나친 nesting, 800자 넘는 복사)
- best practice 위반 (확실하지만 강제 X)

예: 터치 target < 44px / 한 페이지에 동일 버튼 3개 이상 / 라벨 없는 아이콘 버튼 (장식 아이콘)

## info

다음 중 하나:

- 더 나은 패턴 제안 (대안 제시)
- 디자인 시스템 가이드 일치 권장
- 정보성 (이 페이지의 양식이 다른 페이지와 다름 — 일관성 hint)

예: `Input` 대신 `Textarea` 권장 (긴 입력 예상) / 헤딩 hierarchy 권장

## severity 변경

- 새 룰 도입 단계 — default `warning` (info 도 가능, error 는 신중)
- production 사용량 / 피드백 후 `error` 승격 가능
- severity 변경은 **major** (기존 통과/실패 결과 변경)

## 카테고리별 분포 가이드

| 카테고리      | error 비율 | 비고                                              |
| ------------- | ---------- | ------------------------------------------------- |
| accessibility | 70%+       | 대부분 WCAG 위반은 error                          |
| form          | 50%        | 데이터 손상 / 제출 불가는 error, 가이드는 warning |
| touch-target  | 30%        | iOS HIG 미달은 warning, 큰 차이는 error           |
| consistency   | 0%         | warning / info — 강제하면 위양성 큼               |
| usability     | 20%        | 명확한 안티패턴만 error                           |
| navigation    | 30%        | 막힘은 error, 비권장은 warning                    |
| content       | 10%        | 대부분 info / warning                             |
| data-display  | 20%        | 데이터 손실 / 잘림은 error                        |
| feedback      | 30%        | 에러 미표시는 error, 부족한 피드백은 warning      |
| interaction   | 30%        | 키보드 미지원은 error                             |

이 분포는 가이드. 룰별 individual 판단 필요.

## 호스트 측 정책

- vscode-extension: error 는 빨간 underline, warning 은 노란 underline, info 는 미표시 (옵션)
- dashboard: validate 패널에서 error / warning 은 카운트 표시, info 는 "suggestions" 별도
- api-server `validate_ux`: 모두 반환, severity 별 그룹

## 절대 금지

- error / warning 의 자의적 변경 (semver 위반)
- "이 룰은 사용자 화나게 해서 warning 으로 낮춤" — 진짜 issue 면 error 유지, 아니면 룰 제거 검토
- severity 별 카운트만 보이고 ruleId 안 보이는 응답 (drift 추적 불가)
