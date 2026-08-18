---
status: building
target: packages/engine + packages/shared + apps/web + tools/replay (MP5 캠페인층)
---

# MP5 캠페인층 — 챕터 인계·전직·고정 성장

착수 2026-08-18. 사용자 지시 3건이 이 문서의 뿌리다:

1. **"다음장까지 기록하여 게임 완주시 누적되게 해줘"** — 챕터를 넘어 진행이 이어져야 한다.
2. **"이에따라 전략을 만들때 전직여부도 고려해야함"** — 전직이 전략 변수로 들어온다.
3. **"성장세트는 고정형 성장테이블을 따름"** — 레벨업 성장이 난수가 아니라 표를 따른다.

☠no-fiction: 아래 §1은 전부 파일에서 확인한 사실이다. 판독 근거가 있는 것과 **서비스 결정**인 것을
분리해 적는다 — 후자는 인게임과 갈라지는 지점이라 기전 장부에 등재된다.

---

## 1. 지금 실재하는 것 (확인 완료)

| 항목 | 위치 | 상태 |
|---|---|---|
| 경험치 획득·레벨업 | `packages/engine/src/battle.ts:839` grantExp | 5경로(공격·체인가드·지팡이·춤·인게이지기), 자군 한정 |
| 성장 굴림(난수) | `battle.ts:602` rollGrowth | 4시도 재굴림·255 클램프 — 정본 준수 |
| levelUp/exp 이벤트 | `packages/shared/src/battle.ts:258` | **절대값**이라 기보만으로 챕터 종료 스탯이 결정적으로 복원된다 |
| 자동레벨 스탯 표 | `packages/engine/src/stats.ts:35` deriveStats | 공개 영입 스탯 36명×9스탯 전수 일치(검증됨) |
| 전직 트리 | `data/fe17/tables/jobs.json` | `HighJob1` 24행 · `HighJob2` 15행 · `Rank` 111행 · `MaxLevel` 111행 · `Base.*`/`Limit.*` |
| 전직 규칙 | `~/fesim_data/extracted/il2cpp/STATS_GROWTH.md` §2-6 (ClassChange 0x1A3C7B0) | 승급 = 레벨 1·Exp 0·**BaseCapability 불변**·내부레벨 `clamp(IL+Lv-1, 0, N30/H40/L50)` |
| 전직 결과 앵커 | chart.xml 加入 시트 `Jid` 79행 | **M016 이후 상급직이 원문에 박제돼 있다** — 인계 결과 대조군 |
| 챕터별 가입 | `data/fe17/tables/chapternotes.json` `joins` | 54챕터 전수 |
| 소지품 인계 선례 | `apps/web/src/lib/fe17.ts:386` inheritItems | 현행 유일한 인계 기전(소지품만) |

## 2. 결손 — 인계를 켜기 전에 반드시 막아야 하는 것

☠**아래 2건은 인계를 켜는 순간 즉시 터진다.** 지금은 챕터가 항상 새 판이라 발현하지 않았을 뿐이다.

- **스탯 상한이 런타임에 없다.** `UnitState.cap`을 채우는 코드가 저장소에 없다(`fe17.ts:503 statCap`은
  초기 스탯 산출 입력으로만 쓰이고 `BoardUnitProp`에 `cap` 필드 자체가 없다). `rollGrowth`의 캡 게이트가
  실행 경로에서 항상 통과한다 → 인계로 레벨이 쌓이면 **상한 없는 성장**이 된다.
- **최대 레벨 정지가 없다.** `MaxLevel`을 읽는 코드 0건. `grantExp`는 20레벨을 넘겨도 계속 굴린다
  (정본 = `job.MaxLevel` 도달 시 Exp 0 고정, STATS_GROWTH.md).

그 밖의 결손(순서대로 선행):

| # | 결손 | 근거 |
|---|---|---|
| 1 | `SetupUnit`에 `exp`·`internalLevel`·`jid`·`hp` 없음 | `shared/src/ephemeris.ts:30` — 인계 그릇 자체가 없다 |
| 2 | setup 키가 `u{순번}`(보드 인덱스) | `ephemeris.ts:25` — 챕터가 바뀌면 같은 인물이 다른 id다. **pid 기준 해석층**이 필요 |
| 3 | `projectUnit`이 무조건 `exp: 0` | `apps/web/src/lib/boardStore.ts:127` |
| 4 | 전직 액션·이벤트 없음 | `shared/src/battle.ts:263` BattleAction에 classChange 부재 |
| 5 | 마스터 프루프가 아이템 사영에서 탈락 | `fe17.ts:1110` — `AddTarget === 0`이라 걸러진다 |
| 6 | `internalLevel`이 job만 읽는다 | `fe17.ts:1217` — 정본은 person 우선·job 폴백(비0 person 17행이 버려진다) |
| 7 | `grownLevels`가 IL 숫자를 쓴다 | `stats.ts:28` — 정본은 `Rank != 0 ? 19 : 0` 불리언. 현 데이터에선 1행만 갈리지만 전직 재산출을 열면 표면화 |
| 8 | 저장 슬롯에 "런" 축이 없다 | `guestSave.ts:17` — 맵×난이도×국면. `loadSlot`이 cid 불일치 슬롯을 폐기해 **이월을 구조적으로 거부**한다 |
| 9 | 챕터 연쇄 순서가 산출물에 없다 | `chapterlist.json` = cid/category/recommendedLevel 3필드. chapter.xml `NextChapter`를 transform이 안 싣는다 |
| 10 | ★☠**BaseCapability 그릇이 없다**(2026-08-18 5-4 착수 점검에서 발견 — **전직의 선행**) | 정본 스탯 = `Clamp(job.Base + BaseCapability, 0, Limit) + Enhance`이고 전직은 **job만 갈고 BaseCapability는 그대로 둔다**(ClassChange 0x1A3C7B0). 그런데 엔진·어댑터는 합쳐진 `stats`만 들고 있다(`stats.ts deriveStats`는 반환값이 스탯 하나, 5-1 고정 성장도 `gains`를 `stats`에 직접 더한다) ⇒ 캡·하한이 이미 섞여 **되돌릴 수 없다**. 전직 후 스탯을 산출하려면 성장 누적분(BaseCapability)을 별도 필드로 들고 인계해야 한다 |

## 3. 고정 성장 — 스탯별 누적기 (2026-08-18 사용자 확정 = Q1 B)

★☠**2026-08-18 정정 — 이것은 서비스 이탈이 아니라 인게임 실재 모드다.**
`GameUserData.GetGrowMode()`의 `GrowMode{Random=0, Fixed=1}`이고, **사용자가 메인 메뉴에서 고른다**
(`MainMenuSequence.GrowModeSelectMenuSequence`). 즉 사용자 지시 3("고정형 성장테이블")은 게임의 Fixed 모드
그대로이며, 종전 서술("의도적 이탈 · 기전 장부 등재")은 **철회한다**. 알고리즘은 코드로 확정돼 있다
(`App.Unit.LevelUp` RVA 0x1A3A040 GrowMode.Fixed 분기, STATS_GROWTH.md §2-3(c)):

```
for i in 0..8:
   g = percents[i]; if (g == 0) continue
   if (GetNoEnhanceCapability(i) >= GetCapabilityLimit(i)) continue    ; ★상한 게이트는 루프 진입 전 1회
   m_GrowCapability[i] = Min(m_GrowCapability[i] + g, 255)             ; ★255 클램프
   while (m_GrowCapability[i] > 99) { BaseCapability.Add(i,1); m_GrowCapability[i] -= 100 }
```

정본이 뒤집은 종전 설계안 2건:

| 항목 | 종전 설계안(추정) | 정본(코드 확정) |
|---|---|---|
| 누적기 초기값 | 0 | **`person.Grow`**(유닛 생성 시 `Unit.CreateImpl1` 0x1A08944가 9회 대입) — 첫 레벨업이 그만큼 빠르다 |
| 상한 게이트 | 증가 1회마다 재확인 | **루프 진입 전 1회** — 캡에 닿은 스탯은 누적기 가산 자체를 건너뛴다 |

그 밖에 정본이 정한 것: 누적기는 `Min(acc+g, 255)` 클램프 · 조건은 `> 99`(= `>= 100`과 동치) ·
성장률 0인 스탯은 건너뛴다.

- ★누적기는 **유닛 상태의 일부**다 — 기보 재생과 챕터 인계가 이 값을 복원해야 다음 레벨업이 맞는다.
  ⇒ `levelUp` 이벤트에 누적기 스냅숏을 실어 절대 재생 계약을 지키고, `SetupUnit`에도 필드를 연다(5-2).
- Random 경로(난수 + 4시도 재굴림)는 **지우지 않는다** — 같은 게임의 다른 모드이고 엔진·테스트가 이미 있다.
  국면이 모드를 들고(`GameState.growMode`) 리듀서가 분기한다. 서비스 기본 = `fixed`(사용자 지시 3).
- 파급: Fixed는 난수를 안 쓰므로 **난수 소비 계약이 바뀐다** → RULE_VERSION 범프 + m002 기보 재생성.

## 4. 인계 구조 (제안)

- **런(playthrough) = 챕터 기보의 사슬.** 챕터 종료 국면에서 자군 로스터를 뽑아 다음 챕터의
  `setup`으로 넣는다. `.eph`의 setup 스냅숏이 이미 "열람 정본"이라 그릇이 맞다(§2-1·2-2 확장 후).
- **인계 키 = pid.** 챕터마다 보드 인덱스가 달라지므로 `setup.units`를 pid로 적고 로드 시 슬롯에 해석한다.
- **인계 항목(최소형)**: 레벨 · 경험치 · 스탯 스냅숏 · 직업(jid) · 내부레벨 · 소지품 · 현재 HP(만HP로 회복이
  인게임 문법이므로 회복 처리) · 엠블렘·絆.
- **골드·SP·인연 조각·계승·소미아**는 이 단계 밖(MP5 본체) — 발현 시 흡수.
- 저장 = `fesim:run:{game}` 1개 런(게이트 제로 유지). 로그인 서버 저장은 M4.

## 5. 전직 (사용자 지시 2)

판독이 끝나 있어 가정 없이 구현 가능하다(§1).

★**조작 위치 = 챕터 사이, 결정 주체 = 사용자**(2026-08-18 확정 = Q2 A). 근거 = 인게임도 정비에서
전직하므로 재현이 갈리지 않고, 기보는 챕터 단위를 유지한 채 `setup.jid`만 실리면 되어 **재생 계약이
안 바뀐다**. 상급직 분기(HighJob1/HighJob2)도 사용자 선택으로 남는다(자동 승급이면 이 선택지가 사라진다).

전략층 영향: `design/ma_walkthrough.md:88`이 "CC는 서두르지 않는다 — 주력은 Lv10+α까지 기본급 유지가
경험 효율"이라 적고 [지식] 표기(미검증)를 달아 뒀다. 고정 성장이 들어오면 이 판단이 **계산 가능해진다**
(승급 시점별 최종 스탯을 표로 비교). 기보 생성기 정책이 이 계산을 쓰게 된다.

## 6. 단계 (승인 후 착수)

- [x] **5-0 안전장치**(2026-08-18 완료) — `cap` 보드 프롭 배선 + `MaxLevel` 정지. ☠인계보다 먼저(§2 상단 2건)
  - 배선 = `unitCap` → `BoardUnitProp.cap`/`maxLevel` → `projectUnit` → `UnitState` · 엔진 `grantExp` 정지·잔여 0 강제
  - ★**자군 한정 사영** — 경험치·레벨업이 자군 한정(grantExp force 0)이고, 전 유닛에 실으면 챕터 JSON 예산(§11 50KB gz)을
    넘긴다(e006.ko 실측 52,656B). 자군만 = 51,112B로 통과 · ☠**여유가 88B뿐이다**(기준선 50,311B) — 보드 JSON에
    유닛 필드를 더 얹기 전에 압축이 선행돼야 한다(미룸 등재)
  - 부수 정정 = `statCap`에 `Clamp(0,255)`(GetCapabilityLimit 0x1A30B60 — person Limit은 -3까지 음수)
  - 재생 계약 = `levelUp` 이벤트에 잔여 경험치 **절대값** `exp` 추가(부재 = 구기보 → 종전대로 100 차감 — 무회귀)
  - 테스트 = battle.test.ts 3건(정지·잔여 0 강제·무회귀) · fe17.test.ts 1건(cap·maxLevel 실값) · boardStore.test.ts 1건(국면 사영)
- [x] **5-1 고정 성장**(2026-08-18 완료) — GrowMode.Fixed 배선 · RULE_VERSION fe17-8 범프 · 장부 등재 · m002 기보 재생성
  - 엔진 = `GameState.growMode`(부재 = fixed) 분기 · `UnitState.growthAcc`(부재 = growth가 초기값) ·
    `levelUp` 이벤트 `acc` 절대값 스냅숏 · Random 경로는 정본으로 보존
  - m002 재생성 = 84스텝(종전 69) · 승리 8턴 · verified · 결손 0 · 자군 4명 생존
  - 테스트 6건(초기값·미달 누적·이월 복원·255 클램프·캡 게이트·난수 무소비) + 기존 Random 절 5건에 모드 명시
- [x] **5-2 인계 그릇**(2026-08-18 완료) — SetupUnit 확장(exp·internalLevel·jid·hp·growthAcc) + pid 키 해석층 + `projectUnit` override
  - 키 계약 = 순번 키(u{i}) **우선**, 없으면 pid 키 · pid 키는 **자군만**(적은 pid가 겹친다 — 환영병)
  - 테스트 3건(pid 해석·순번 우선·자군 한정) · ☠jid override는 그릇만 열었다(스탯·캡·스킬 재산출 = 5-4 전직)
- [x] **5-3 런 저장**(2026-08-18 완료) — `fesim:run:*` 계층 + 챕터 연쇄 순서
  - `RunState`(game·difficulty·chapter·cleared·roster·updated) · 게임당 1런(다중 슬롯 = M4 보관함)
  - 인계 산출 = `carryover(state)`(engine/campaign.ts) — 생존 자군만 pid 키 · **현재 HP는 안 나른다**(챕터 개시 만회복) ·
    ☠사망 자군은 `removed: true`(안 적으면 다음 챕터 dispos가 기본 스탯으로 되살린다)
  - 파이프라인 = chapterlist에 `next`(NextChapter 31건) + `unlock`(GmapSpotOpenCondition 20건 — 외전 개방 시기, MA 공략 입력)
  - 테스트 = campaign.test.ts 6건 · guestSave.test.ts 3건 · fe17.test.ts 2건
  - 잔여: 챕터 승리 → 런 갱신·다음 챕터 진입 **배선은 5-6 UI**, 사슬 실증은 5-5
- [ ] **5-4 전직** — Q2 결정에 따라 배선 + 마스터 프루프 사영 복원
  - ☠**선행 = §2-10 BaseCapability 그릇 도입**(2026-08-18 점검). 없으면 전직 스탯을 산출할 수 없다(job.Base를 되빼는 역산은
    캡·하한이 섞여 불가). 범위 = `deriveStats`가 baseCap을 함께 내고 · `UnitState`/`SetupUnit`이 들고 · 고정 성장이 baseCap에 누적
  - 함께 해소할 정확도 결손 = §2-6 `internalLevel` person 우선·job 폴백 · §2-7 `grownLevels`는 IL 숫자가 아니라 `Rank != 0 ? 19 : 0`
  - 발현 조건 = 전직 자체(3장까지 사슬에선 미발현) — Q3 범위 밖이라 사용자 지시 대기
- [~] **5-5 기보 생성기 확장** — `./dev replay <cid> --carry <앞 챕터 eph.json>`(2026-08-18 배선) · 전직 정책 = 5-4 뒤
  - ★**Q3 사슬 실증 완료(2026-08-18)**: m002 → m003 인계 4명(뤼에르 Lv2 exp8 · 반드레 exp9 · 클랜 exp47 · 프랑 exp13),
    m003 검증 통과·AI 결손 0·6턴 승리. 인계 경로가 실기보 → carryover → setup → 국면까지 닫혔다
  - ☠**수리 1건**: 생성기가 `seek(끝)` 뒤 `store.game`을 읽어 **경험치·레벨이 통째로 0인 로스터**를 조용히 인계했다.
    커서 국면의 소유자는 `displayState`다(seek은 커서만 옮긴다) — boardStore.test.ts에 박제
  - ☠**m003 기보는 탑재하지 않는다**: 자군 1명(프랑) 손실이라 `./dev replay`가 실패로 끝난다(exit 1).
    ★인계 탓이 아니다 — 인계 없이 생성해도 같은 손실이 난다(실측 대조). 원인 = 정책 플레이어 한계 ⇒ MA 트랙 소관
- [ ] **5-6 UI** — 런 진행 표시·이어하기 진입점

## §결정 (2026-08-18 사용자)

- **Q1 = 스탯별 누적기**(§3). 누적기를 기보·인계 스키마에 추가한다.
- **Q2 = 챕터 사이 사용자 지정**(§5).
- **Q3 = 3장까지 사슬 실증** — 안전장치·고정 성장·인계 그릇·런 저장을 깔고 m002→m003 인계 1건을 실측으로 닫는다.
  전 챕터 사슬은 계약이 증명된 뒤.

## §미결 (발현 시 결정)

- 전직 UI의 자리(정비 화면 신설 vs 로스터 카드 인라인) — 5-4 착수 시.
- 상급직 분기 추천(생성기 정책이 HighJob1/2 중 무엇을 고르나) — 5-5 착수 시. 현행 방침 = 사용자 지정 우선,
  미지정이면 생성기가 고르고 그 선택을 런 상태에 기록한다.
