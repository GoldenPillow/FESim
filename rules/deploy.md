# 배포 채널·릴리즈 규칙 (정본)

> CLAUDE.md가 이 문서를 배선한다. 변경 시 CLAUDE.md 포인터·decisions.md 요지 동시 갱신.
> 확정일 2026-08-16 (CF 대시보드 설정과 쌍 — 대시보드를 바꾸면 이 문서도 바꾼다).

## 채널

| 채널 | 주소 | 갱신 조건 |
|---|---|---|
| 스테이블(공개) | https://fesim.goldenpillow7.workers.dev | **명시 지시 시에만** `./dev promote` |
| 베타(관리자 전용) | https://beta-fesim.goldenpillow7.workers.dev | main 머지마다 자동 |
| 브랜치 프리뷰 | `<버전해시8>-fesim.goldenpillow7.workers.dev` | beta 브랜치 푸시마다(버전별 URL) |

## 흐름

```
로컬 개발(pnpm dev)
  → beta 브랜치 푸시        # CF: versions upload → 해시 프리뷰 URL
  → 사용자 승인
  → main 병합               # 훅 ./dev done 게이트 · CF: versions upload --preview-alias beta
                            #   = 베타 채널 갱신, ☠스테이블 불변
  → "스테이블 올려" 지시
  → ./dev promote [버전ID]  # 버전 승격 — 재빌드 없음(테스트본 = 배포본), 생략 시 최신
```

## 운용 명령

- 버전 목록(커밋 메시지 자동 부착): `npx wrangler versions list`
- 선택 승격: `./dev promote <버전ID>` — 최신이 아니어도 됨(베타 여러 개 중 택1)
- **롤백**: 이전 버전 ID로 `./dev promote` (즉시)
- ☠버전 = 커밋 시점 스냅숏. 기능 단위 선별은 배포가 아니라 **git에서**(기능 브랜치 선별 머지)

## CF 대시보드 설정 (fesim → 설정 → 빌드)

| 항목 | 값 |
|---|---|
| 빌드 명령 | `pnpm run build` |
| 배포 명령(프로덕션 분기) | `npx wrangler versions upload --preview-alias beta` |
| 버전 명령(비프로덕션 분기) | `npx wrangler versions upload` |
| 프로덕션 분기 | `main` · 비프로덕션 빌드 켬 |
| 루트 디렉터리 | `/` |

## 원칙

- ☠릴리즈(실사용자 발생) 후에는 main 병합도 명시 승인 필수 — 급작스런 업데이트 방지의 핵심은 "머지≠공개"
- 베타 URL은 비공개 링크 수준. 진짜 인증 게이트가 필요해지면 도메인 연결 후 beta.fesim.app + Cloudflare Access(무료)
- 실사용자 생기면 점진 배포 가능: `wrangler versions deploy <ID>@10%` → 관찰 → `@100%`
