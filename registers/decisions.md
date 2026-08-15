# decisions.md — 시간순 결정 기록 (1줄/건, 최신이 아래)

- 2026-08-15 서비스명 FESim 확정(항상 `FESim` 표기) · 저장소 `~/Projects/FESim` 공개(오픈소스, LLM 컨텍스트 팩 전제)
- 2026-08-15 스택 확정: Astro 5 SSG + React 19 아일랜드 + Tailwind v4 + TS strict + Zustand/Immer + pnpm workspaces + Vitest
- 2026-08-15 배포: CF Pages(GitHub 연동) 우선 → M3에 Workers 이전 검토 → 도메인은 웹 동작 확인 후(fesim.app, CF Registrar 권장)
- 2026-08-15 소셜 로그인(T1): better-auth, 대중 프로바이더 전부 로드맵 — Google·Discord 먼저, X·Kakao·Naver 순차
- 2026-08-15 게이트 제로(T0 무계정 기본) · 서버 LLM ☠금지(컨텍스트 팩 왕복) · Claude 연동은 Max 플랜 표면만(API 금지)
- 2026-08-15 문서 수명 규칙 도입: design/ frontmatter 필수, 구현 완료 = done + gc, doccheck가 기계 집행(CLAUDE.md ≤100줄 포함)
- 2026-08-15 적 행동·위임: AI.xml+dispos 파라미터는 정본 그대로, 평가함수는 실측 보정 — 리플레이 코퍼스로 수렴(packages/engine/src/ai)
- 2026-08-15 romfs 서브셋을 ~/fesim_data/romfs(ext4, 저장소 밖)로 이관, data/staging/romfs 심링크로 접근 — 원본 덤프는 E: 보존
- 2026-08-15 [미룸] 파이프라인 venv(~/venvs/fesim, Python 3.12+UnityPy) — 선행 조건: M0 파이프라인 착수. 구 ~/venvs/astrafe는 불변
- 2026-08-15 [미룸] unitindexes.bundle 등 추가 에셋 서브셋 복사 — 선행 조건: M0/M1에서 해당 에셋 필요 시
- 2026-08-15 [미룸] workers/api 생성 — 선행 조건: M3(공유 킷) 착수
- 2026-08-15 Astro 7.2로 init(계획서 표기 v5는 작성 시점 최신 — 버전은 문서에 박제하지 않음, CLAUDE.md 표기 중립화)
- 2026-08-15 TS 이원화: apps/web은 TS6 핀(astro check가 TS7 네이티브 API 미지원), packages/tools는 TS7
