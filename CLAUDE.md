# CLAUDE.md — FESim
주 인스턴스: WSL (`~/Projects/FESim`)

> 자동 로드 메모리. 강력한 룰만 담는다. 상태·수치는 코드를 직접 읽어라.

## 컨셉 한 줄
FE 전략 시뮬레이터·공유 플랫폼. 체스판(시뮬레이터)이 간판, 종합 공략 허브가 몸체.
철학 = 게이트 제로: 무계정으로 열람·제작·공유 전부 가능. 로그인(소셜)은 업그레이드.

## 확정 (Locked)
| 항목 | 결정 |
|---|---|
| 표기 | 항상 `FESim` (FEsim·FE Sim 금지) · UI 라벨은 기능명(시뮬레이터), 천체 코드네임은 내부용 |
| 스택 | Astro SSG + React 아일랜드 + Tailwind v4 + TS strict + Zustand/Immer + pnpm + Vitest |
| 백엔드 | CF Workers 정적 에셋(현행 배포, wrangler.jsonc) → +KV/R2/D1+Turnstile (M3~) · 서버 LLM ☠금지 |
| 성능 | ★열람 경로만 릴리즈 게이트: LCP<1s(4G)·INP<100ms·포커스모드 JS≤100KB — 제작 경로는 관대 |
| 데이터 | data/ = 파이프라인 산출물(git 포함) · romfs 원본은 data/staging(git 제외) |
| 타이틀 중립 | URL·데이터·기보에 게임ID(fe17) 네임스페이스 — 전 시리즈 확장 전제 |
| AI(적·위임) | AI.xml+dispos 파라미터는 정본 그대로, 평가함수는 실측 보정 — 리플레이 코퍼스로 수렴 |
| Claude 연동 | Max 플랜 표면(MCP·컨텍스트 팩)만 · ☠Anthropic API 과금 경로 금지 |
| 저작권 | 무광고·무수익 · 비제휴 면책 · 립 원본 재배포 금지(가공 데이터만) |

## 안전 불변식
1. ☠코드가 단일 진실 정본 — 산문 명세 이중화 금지. 스키마·계약은 타입이 소유
2. ☠design/ 문서는 수명 필수(status frontmatter) — 구현 완료 즉시 ./dev gc (집행기가 강제)
3. no-fiction — 실측 없는 수치 금지(성능·확률은 측정 후에만, 표본 병기)
4. 외부 부수효과(공유 포스팅·알림·analytics) 신설 = 샌드박스 판별이 완료 조건
5. 룰·판정 로직은 컴포넌트 밖 순수 함수로(packages/engine) — 훅·컴포넌트에 로직 금지

## 개발 규약
- TDD 상시: 레드 확인 → 구현 → 그린. 고친 결함 하나 = 테스트 하나(왜 위험했는지 독스트링)
- 엔진 계약: (국면, 행동, 난수소스) → 국면. 난수는 항상 주입(기록 재생|실굴림|열거)
- 상시 커밋(자유) — 결정 즉시 파일로 쓰고 커밋. **./dev done은 M단위 마감·main 병합에만**(훅이 강제)
- 배포: **main 머지 = 베타 게시(스테이블 불변) · 스테이블 = 명시 지시 시 ./dev promote** —
  ☠채널 주소·흐름·CF 설정의 정본 = `rules/deploy.md` (규약이 커지면 rules/에 주제별 분리)
- 새 스크립트·워커·cron은 package.json scripts 또는 ./dev에 반드시 등재(고아 금지)
- 마감(clear 준비) 지시 시: 플랜 §0 체크리스트·decisions 갱신 → ./dev done → main 병합(베타 게시) →
  beta 브랜치 동기화 → 작업트리 클린 확인 → 보고. 이 상태여야 /clear 안전
- ★모델 티어링: 설계·계획 문서 작업은 Fable 고정 · 서브에이전트 = Opus(난제 구현)/
  Sonnet(통상·기본값)/Haiku(기계적) — ☠퀄리티 저하 금지, 애매하면 상위. 새 모델 출시 시 표만 갱신(역할 불변)

## 주제별 진입점 (축당 3개 상한)
| 축 | 읽을 것 |
|---|---|
| 룰 엔진·AI | packages/engine/src/ 해당 모듈 · tests/ · design/의 building 문서 |
| 데이터 파이프라인 | tools/pipeline/ 머리말 · data/ 산출 스키마(shared 타입) |
| 공유 킷·배포 | rules/deploy.md(채널·승격) · workers/api/ (M3~) · apps/web/src/islands/ |
| 계획·이력 | design/fesim_plan.md(§0 체크리스트 = todo 정본) · registers/decisions.md(최신부터) · rules/design-lifecycle.md |

*결정 변경 시 이 파일 + registers/decisions.md 동시 갱신. ☠이 파일에 상태·수치 박제 금지.*
