# TODO: 커뮤니티 페이지 개선 - 프로젝트 단위 쇼케이스

## 배경

현재 wireweave 대시보드의 커뮤니티 페이지는 **단일 화면 1개를 미리보기**하는 수준이다.
실제로 wireweave를 활용한 화면 기획은 **여러 화면을 시나리오/주제별로 묶어서** 기획서(md) 형태로 관리한다.
이 갭을 메우기 위해 커뮤니티 페이지를 **프로젝트 단위 쇼케이스**로 개선해야 한다.

## 실제 사례: Game Master 체스 앱 화면 기획

### 프로젝트 개요

- **위치**: `/Users/mzc01-swlee/dev/repository/github/claude-code/game-master/`
- **AIDLC 문서**: `docs/aidlc-docs_chess-screen-design/`
- **총 58개 화면**, 8개 볼트(Bolt), 8개 기획서(md)

### 산출물 구조

```
docs/aidlc-docs_chess-screen-design/
├── project-goal-report.md          # 프로젝트 목적/목표
├── application-approach-report.md  # 설계 방법론
├── plan.md                         # 전체 볼트 계획 + 체크박스
├── prompts/                        # 볼트별 프롬프트 (8개)
└── inception/
    ├── bolt-01/                    # 공통 레이아웃 + 체스 보드 (8화면)
    │   ├── 01-01-tab-bar.wf/.html/.png
    │   ├── ...
    │   └── 01-10-spec.md           # 통합 기획서
    ├── bolt-02/                    # 온보딩 + 홈 (7화면)
    ├── bolt-03/                    # 오프닝 학습 (10화면)
    ├── bolt-04/                    # 엔드게임 학습 (7화면)
    ├── bolt-05/                    # 택틱스 퍼즐 (8화면)
    ├── bolt-06/                    # 봇 대전 (8화면)
    ├── bolt-07/                    # 통계/설정/상점 (5화면)
    └── bolt-08/                    # 엣지 케이스 (5화면)
```

### 각 화면의 산출물 3종 세트

```
XX-NN-화면명.wf    → wireweave DSL 원본
XX-NN-화면명.html  → 렌더링 결과
XX-NN-화면명.png   → 스크린샷
```

### 기획서(md) 구조

각 볼트의 통합 기획서는 다음 구조를 따른다:

- 화면별 PNG 임베드 (`![화면명](XX-NN-화면명.png)`)
- 화면 구성 테이블 (요소 | 설명)
- UX 사양 테이블 (항목 | 내용)
- 이전 화면과의 차이점 비교 테이블
- 화면 플로우 (ASCII 다이어그램)
- 데이터 바인딩 포인트 테이블

## 개선 방향

### 1. 프로젝트 단위 쇼케이스

현재: 단일 .wf 파일 → 미리보기
개선: **프로젝트(여러 .wf + .md)**를 하나의 쇼케이스로 묶어 표시

```
[프로젝트 카드]
├── 프로젝트명: Chess Master 화면 기획
├── 설명: 체스 학습 앱의 전체 화면 기획 (58개 화면)
├── 태그: #모바일앱 #게임 #학습 #체스
├── 볼트/챕터 목록 (접기/펼치기)
│   ├── Bolt 01: 공통 레이아웃 (8화면) → 기획서 보기
│   ├── Bolt 02: 온보딩 + 홈 (7화면) → 기획서 보기
│   └── ...
└── README.md 또는 통합 기획서 렌더링
```

### 2. 기획서(md) 뷰어

- md 파일 내 상대 경로 이미지(PNG) 렌더링 지원
- GitHub Flavored Markdown 스타일
- 테이블, 코드블록, ASCII 다이어그램 지원

### 3. 화면 간 플로우 시각화

- 기획서 내 화면 플로우(ASCII)를 인터랙티브 다이어그램으로 변환
- 화면 카드 클릭 시 해당 .wf 미리보기

### 4. 쇼케이스 업로드 방식

- wireweave cloud에 프로젝트 단위 업로드 (여러 .wf + .md 묶음)
- 또는 GitHub 저장소 연동 (URL 입력 → 자동 임포트)

## 참고할 기획서 파일 (8개)

| 볼트 | 기획서                                        | 화면 수 |
| ---- | --------------------------------------------- | ------- |
| 01   | `inception/bolt-01/01-10-spec.md`             | 8       |
| 02   | `inception/bolt-02/02-home-onboarding.md`     | 7       |
| 03   | `inception/bolt-03/03-learning-course.md`     | 10      |
| 04   | `inception/bolt-04/04-learning-endgame.md`    | 7       |
| 05   | `inception/bolt-05/05-puzzle.md`              | 8       |
| 06   | `inception/bolt-06/06-practice-match.md`      | 8       |
| 07   | `inception/bolt-07/07-stats-settings-shop.md` | 5       |
| 08   | `inception/bolt-08/08-edge-cases.md`          | 5       |

## 핵심 인사이트

wireweave의 가치는 단순히 "와이어프레임을 DSL로 그리는 것"이 아니라:

1. **AI와 협업하여 앱 전체 화면을 기획**하는 워크플로
2. **기획서(md) + 와이어프레임(wf/png)이 하나의 패키지**로 관리됨
3. **볼트 단위로 진행 → 승인 → 다음 볼트** 체계적 프로세스
4. 기획서만으로 **construction(구현) AI-DLC의 입력**으로 사용 가능

이 워크플로를 커뮤니티 페이지에서 보여줄 수 있으면 wireweave의 실전 활용 사례가 된다.
