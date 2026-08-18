# CLAUDE.md — FESim
주 인스턴스: WSL (`~/Projects/FESim`)

> 자동 로드 메모리. 강력한 룰만 담는다. 상태·수치는 코드를 직접 읽어라.

## 컨셉 한 줄
FE 전략 시뮬레이터·공유 플랫폼. 체스판(시뮬레이터)이 간판, 종합 공략 허브가 몸체.
철학 = 게이트 제로(열람·제작·로컬 보관은 무계정) · 링크 공유·서버 게시는 로그인(소셜).

## 확정 (Locked)
| 항목 | 결정 |
|---|---|
| 표기 | 항상 `FESim` (FEsim·FE Sim 금지) · UI 라벨은 기능명(시뮬레이터), 천체 코드네임은 내부용 |
| 스택 | Astro SSG + React 아일랜드 + Tailwind v4 + TS strict + Zustand/Immer + pnpm + Vitest |
| 백엔드 | CF Workers 정적 에셋(현행 배포, wrangler.jsonc) → +KV (M3) → +D1/R2+better-auth(공유 게시=로그인) (M4~) · 서버 LLM ☠금지 |
| 성능 | ★릴리즈 게이트 = **렌더링·응답만**(열람 경로 LCP<1s(4G)·INP<100ms) · **용량은 게이트 아님**(JS 100KB·보드 JSON = 참고 지표, 2026-08-19 사용자 결정) — 제작 경로는 관대 |
| 데이터 | data/ = 파이프라인 산출물(git 포함) · romfs 원본·추출본 = 저장소 밖 ~/fesim_data (data/staging = 심링크, git 제외) |
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
- 상시 커밋(자유) — 결정 즉시 파일로 쓰고 커밋. ☠**./dev done = 마감 1개 명령**(게이트 → main 병합 → main 푸시 = 베타 게시 → beta 동기 → /clear 손실 판정) — **M단위 마감에만**. 작업 중 게이트는 `./dev gate`
- ★마일스톤 종점 = **베타 병합 + clear 준비**(2026-08-18 사용자 확정). 작업 구간의 커밋·테스트는
  **로컬 전용 — ☠푸시 금지**(beta 푸시마다 CF 프리뷰 빌드가 올라간다). 푸시는 종점 마감 절차에서만
  (머지 커밋·main 푸시를 훅이 강제, 비main 머지는 경고만)
- 배포: **main 머지 = 베타 게시(스테이블 불변) · 스테이블 = 명시 지시 시 ./dev promote** —
  ☠채널 주소·흐름·CF 설정의 정본 = `rules/deploy.md` (규약이 커지면 rules/에 주제별 분리)
- ★**맵·룰이 바뀌면 기보를 다시 만든다**(2026-08-18 사용자 지시) — 지형·상호작용·액션 계약이 바뀌면
  `data/fe17/replays/`의 기보는 **낡은 판의 기록**이다. 사슬은 앞 장부터 `--carry`로 다시 잇는다
  (`./dev replay <cid> --seed <n> --carry <앞 기보>`). ☠표시만 바뀐 수리는 제외 — 국면이 바뀌었는지로 가른다
- 새 스크립트·워커·cron은 package.json scripts 또는 ./dev에 반드시 등재(고아 금지)
- 마감(clear 준비) 지시 시: 플랜 §0 체크리스트·decisions 갱신·커밋 → **`./dev done`** (병합·게시·동기·판정을
  이 명령이 전부 한다) → 보고. `== /clear 안전: 손실 없음 ==`이 떠야 /clear 가능(종료코드 0)
- ★모델 티어링: 설계·계획 문서 작업은 Fable 고정 · 서브에이전트 = Opus(난제 구현)/
  Sonnet(통상·기본값)/Haiku(기계적) — ☠퀄리티 저하 금지, 애매하면 상위. 새 모델 출시 시 표만 갱신(역할 불변)

## 주제별 진입점 (축당 3개 상한)
| 축 | 읽을 것 |
|---|---|
| 룰 엔진·AI | packages/engine/src/ 해당 모듈 · tests/ · design/의 building 문서 |
| 데이터 파이프라인 | tools/pipeline/ 머리말 · data/ 산출 스키마(shared 타입) · ~/fesim_data/extracted(추출본·보고서, 저장소 밖) |
| 공유 킷·배포 | rules/deploy.md(채널·승격) · workers/api/ (M3~) · apps/web/src/components/ |
| 계획·이력 | design/fesim_plan.md(§0 체크리스트 = todo 정본) · registers/decisions.md(최신이 맨 아래) · rules/design-lifecycle.md |

*결정 변경 시 이 파일 + registers/decisions.md 동시 갱신. ☠이 파일에 상태·수치 박제 금지.*
