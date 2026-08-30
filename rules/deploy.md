# 배포 채널·릴리즈 규칙 (정본)

> CLAUDE.md가 이 문서를 배선한다. 변경 시 CLAUDE.md 포인터·decisions.md 요지 동시 갱신.
> 확정일 2026-08-16 (CF 대시보드 설정과 쌍 — 대시보드를 바꾸면 이 문서도 바꾼다).

## 채널

| 채널 | 주소 | 갱신 조건 |
|---|---|---|
| 스테이블(공개) | https://fesim.emblemengage.workers.dev | **명시 지시 시에만** `./dev promote` |
| 베타(관리자 전용) | https://beta-fesim.emblemengage.workers.dev | main 머지마다 자동 |
| ★빌더 단독(공개, ☠비계) | https://fb.emblemengage.workers.dev | `./dev builder:publish` 수동 — 경량 게이트(타입+웹 테스트)만, 본체 게이트·기보와 분리(2026-08-31 사용자 결정: 작은 피쳐를 마감 절차 없이 낸다). 구성 = `wrangler.builder.jsonc` + `workers/builder.js` 경로 가드(빌더·에셋 외 404, 홈 버튼 제거). ☠제거 조건 = 빌더를 본체 공개 채널로 흡수할 때 워커를 **301 리다이렉트 스텁으로 격하**(폐기 금지 — 배포된 링크가 죽는다. §피쳐 채널 원칙) |
| 브랜치 프리뷰 | `<버전해시8>-fesim.emblemengage.workers.dev` | 비main 브랜치 푸시마다(버전별 URL) |

## 흐름

```
로컬 개발(pnpm dev) — 작업 브랜치(beta) 커밋은 로컬 전용, ☠푸시 금지
  → ./dev done              # ★마감 1개 명령 = 게이트 → main 병합 → main 푸시 → beta 동기 → /clear 판정
                            #   CF: versions upload --preview-alias beta = 베타 채널 갱신, ☠스테이블 불변
  → "스테이블 올려" 지시
  → ./dev promote [버전ID]  # 버전 승격 — 재빌드 없음(테스트본 = 배포본), 생략 시 최신
```

### `./dev done` = 마감 1개 명령 (2026-08-18 사용자 지시)

| 단계 | 하는 일 | 중단 조건 |
|---|---|---|
| 0 | 작업트리·브랜치 확인 | 더러우면 중단(무엇을 게시하는지가 불명확) · main에서 실행하면 중단 |
| 1 | `check` + `test` + `doccheck` | 레드면 중단 |
| 2 | `main` 체크아웃 → `--no-ff` 병합 → **main 푸시 = 베타 게시** | 병합·푸시 실패 시 작업 브랜치로 복귀 |
| 3 | 작업 브랜치로 복귀 → `--ff-only main` 동기 | — |
| 4 | **`/clear` 손실 점검** — 미커밋·main 미푸시·미게시 커밋 | 하나라도 걸리면 종료코드 1 |

- 게이트만 필요하면 **`./dev gate`** · 판정만 보려면 **`./dev clear-check`** · 게시 없이 예행하려면 **`./dev done --dry-run`**.
- ☠**훅(pre-merge-commit·pre-push)은 `gate`를 부른다** — `done`을 부르면 게시가 자기를 다시 부른다.
  `done`이 도는 동안은 `FESIM_PUBLISHING=1`이라 훅이 게이트를 생략한다(같은 트리를 방금 통과시켰다 — 머지 커밋은 트리를 안 바꾼다).
- beta 브랜치는 **푸시하지 않는다**(푸시마다 CF 프리뷰 빌드가 하나씩 쌓인다). 원격 beta는 의도적으로 뒤처져 있다.

⚠**브랜치 전환 직후 첫 게이트가 실패할 수 있다**(2026-08-18 2회 관측: main 체크아웃 직후 push 훅 1회·머지 훅 1회).
같은 트리에서 **즉시 재실행하면 그린**이고, 훅 스크립트를 손으로 돌려도 그린이다 — 실패한 단계는 아직 포착하지 못했다
(콜드 캐시 의심: 전환으로 파일이 대량 바뀐 뒤의 첫 `astro check`/vitest). ☠**우회(`--no-verify`) 금지** — 재실행으로 통과한다.

## 운용 명령

- 버전 목록(커밋 메시지 자동 부착): `npx wrangler versions list`
- 선택 승격: `./dev promote <버전ID>` — 최신이 아니어도 됨(베타 여러 개 중 택1). 루트 wrangler.jsonc로 동작(이름·계정만 필요)
- **롤백**: 이전 버전 ID로 `./dev promote` (즉시)
- ☠버전 = 커밋 시점 스냅숏 = **코드+정적 에셋+바인딩**(KV 바인딩 변경도 새 버전 업로드로만 반영). 기능 단위 선별은 배포가 아니라 **git에서**(기능 브랜치 선별 머지)

## CF 대시보드 설정 (fesim → 설정 → 빌드)

☠M3(2026-08-16)부터 워커 배포 설정 정본 = **빌드 산출물** `apps/web/dist/server/wrangler.json`(어댑터가 main·assets·바인딩을 흡수해 산출). 루트 wrangler.jsonc는 입력 설정이라 배포 명령에 직접 쓰면 main이 미해결이다 — `-c` 지정 필수.

| 항목 | 값 |
|---|---|
| 빌드 명령 | `pnpm run build` |
| 배포 명령(프로덕션 분기) | `npx wrangler versions upload --preview-alias beta -c apps/web/dist/server/wrangler.json` |
| 버전 명령(비프로덕션 분기) | `npx wrangler versions upload -c apps/web/dist/server/wrangler.json` |
| 프로덕션 분기 | `main` · 비프로덕션 빌드 켬 |
| 루트 디렉터리 | `/` |

## KV (M3~)

- 네임스페이스 `fesim-links` (id `7e9aa0f0cbce4a709c8d291edc2d91bf`, 바인딩 `LINKS`) — 짧은 링크 장부(키 = 링크 id, 값 = .eph 원문, 발급 후 불변)
- ☠**베타/스테이블 KV 공유**: 단일 워커의 버전 승격 모델이라 채널별 네임스페이스 분리 불가(구조적) — 레코드 불변이라 무해, 베타에서 등재한 링크가 승격 후에도 열린다
- 원격 kv 명령은 `account_id` 필요(루트 wrangler.jsonc에 등재됨. 미지정 시 auth error 10000)
- 링크 등재(M3 = 운영자 수동): `./dev link:put <id> <eph.json>` (기본 원격, `--local` = 로컬 상태)
- 로컬 검증: `pnpm -C apps/web build` → `wrangler dev -c apps/web/dist/server/wrangler.json --persist-to .wrangler/state` → `./dev link:put <id> <file> --local` (같은 persist 경로여야 dev가 읽음)
- pnpm `allowBuilds.workerd` 필요(pnpm-workspace.yaml 등재됨) — 없으면 로컬 실행 불가

## 피쳐 채널 원칙 (2026-08-31 사용자 확정)

- ★**피쳐의 정본(영구 안내) 주소 = 본체 오리진 경로**(`/{locale}/fe17/<피쳐>`) — fesim이 대표이고
  피쳐는 그 안에 폴더링된다(구조 정본 = rules/feature-ui.md, 실물 예 = features/builder). 차후 도메인
  구입 시 본체 워커에 바인딩만 하면 경로가 불변이라 재작업이 없다.
- **분리 워커(fb.* 등)는 스테이블 미포함 기간의 임시 선공개 채널로 한정.** 본체 흡수 시
  ☠폐기가 아니라 **301 리다이렉트 스텁으로 격하**(경로 보존) — 유저에게 배포된 링크를 영구히 지킨다.
- ☠**저장물(localStorage)은 오리진 귀속이라 이사하지 않는다** — 실데이터를 저장하는 피쳐는
  처음부터 본체 오리진에서 낸다(임시 워커에는 가벼운 설정값만 허용).

## 원칙

- ☠릴리즈(실사용자 발생) 후에는 main 병합도 명시 승인 필수 — 급작스런 업데이트 방지의 핵심은 "머지≠공개"
- 베타 URL은 비공개 링크 수준. 진짜 인증 게이트가 필요해지면 도메인 연결 후 beta.fesim.app + Cloudflare Access(무료)
- 실사용자 생기면 점진 배포 가능: `wrangler versions deploy <ID>@10%` → 관찰 → `@100%`

## 채널 워터마크 (2026-08-18 규약)

- 전 페이지 하단 우측 고정 배지(layouts/Base.astro) — **베타 = 황색 `BETA <버전>` · 릴리즈(스테이블) = 청회색 `<버전>`**.
- 버전 = 빌드 시점 git 짧은 해시(astro.config.mjs가 `PUBLIC_BUILD`로 주입) — 승격·실기 대조의 식별자.
- 표기 = 기본 굵기·JetBrains Mono 스택(웹폰트 미탑재 — 로컬 폰트 우선, 모노 폴백).
- 채널 판별 = **호스트명 런타임 분기**(`beta-*`·localhost = 베타) — 승격이 같은 빌드를 재사용하므로 빌드 플래그로는 채널을 못 가른다.
