---
status: building
target: packages/engine (random·battle·ai) + packages/shared + tools/replay
---

# 난수 정본화 · AI 행동방식 정밀화 (MP7)

착수 2026-08-18. 사용자 지시 2건이 뿌리다:

1. **"게임의 데이터와 코드를 전수조사하여 난수를 정밀하게 구현. 시뮬레이션에 영향이 큼"**
2. **"AI의 행동방식도 중요"**

지금까지 난수는 **주입만 정본**이었다(계약 = `(국면, 행동, 난수소스) → 국면`). 굴림의 **개수·순서**는
기보에 기록돼 재생은 결정론이지만, **어떤 값이 나오는가**는 우리 것이고 인게임과 무관했다.
그래서 "같은 판을 인게임에서 돌리면 같은 결과가 나오는가"는 현재 **검증할 수단조차 없다**.

---

## 0. 착수 전 실측 (2026-08-18, IL2CPP)

이 절은 계획의 근거다. 전부 코드에서 직접 읽었고, 추정에는 (추정)을 붙였다.

### 0-1. PRNG 정체 = **xorshift128(Marsaglia) + MT식 시딩**

`App.RandomSeed`는 32비트 상태 4개(x,y,z,w)를 든다.

```
RandomSeed.GetValue()               ; 0x23750C0
    t = x ^ (x << 11)
    t ^= t >> 8
    t ^= w
    t ^= w >> 19
    x = y ; y = z ; z = w ; w = t
    return t & 0x7FFFFFFF           ; 31비트 양수

RandomSeed.Initialize(seed)         ; 0x2375000  — MT19937 초기화와 같은 상수 1812433253(0x6C078965)
    C = 1812433253
    x =  (s ^ (s >> 30)) * C
    y = ((x ^ (x >> 30)) * C) + 1
    z = ((y ^ (y >> 30)) * C) + 2
    w = ((z ^ (z >> 30)) * C) + 3
```

부속 = `Peek`(0x2375060, 상태 미전진) · `Spin(n)`(0x2375080, n회 전진) ·
`Serialize`/`Deserialize`(0x2375A20/0x2375D50, 세이브 왕복) · `GetFloat`(0x2375130).

☠**Peek는 GetValue와 식이 다르다** — `GetValue`는 `t ^= t>>8`을 **w와 xor하기 전에** 하는데
`Peek`는 마스킹 뒤에 `t>>8`을 xor한다. 같은 값을 미리보는 함수가 아니다(용도 미판독 — §미결 A).

### 0-2. 스트림이 7개다 — 판정·AI·연출이 **서로 다른 난수를 쓴다**

`App.Random.InitializeAll`(0x2374040)이 `App.Random` 7개를 만든다(`mov w1, #7`).
각각 이름 있는 접근자를 갖는다. 호출처를 전수 역참조해 분류했다:

| 스트림 | 접근자 | 호출처 | 실체 | 우리 범위 |
|---|---|---|---|---|
| **Game** | 0x2374C70 | 48 | `BattleMath`(명중·필살·발동) · `Unit` 생성 · `MapHistory.Rewind/Replay`(13+7) · 요리·연성 · `ScriptSystem.RandomGet` | ★핵심 |
| **System** | 0x23746E0 | 121 | ★**`AIThink` 24곳** · Amiibo · Relay · 사진 · 카메라 흔들림 | ★AI만 |
| **Spot** | 0x2374CE0 | 22 | `EncountDataManager`·`EncountUnitData`·`GmapUtil` = 조우·외전 생성 | ★포함(결정 D) |
| **KillBonus** | 0x2374E30 | 4 | `MapKillBonus` 전용 | ★소 |
| Combat | 0x2374EA0 | 94 | 카메라·FX·FSM·`MapCombatViewerSettings` = **전투 연출 전용** | 범위 밖 |
| Hub | 0x2374D50 | 15 | 소미아 거점 | 범위 밖 |
| HubItem | 0x2374DC0 | 3 | 거점 아이템 | 범위 밖 |

★**즉시 얻는 결론 2개**
- **판정(Game)과 AI(System)는 다른 스트림**이다 — 현행 엔진이 AI에 별도 스트림을 준 것은 우연히 맞았다.
- **Combat 94곳은 전부 연출**이다. 전투 난수라는 이름에 속아 붙이면 안 된다.

### 0-3. 되감기·세이브가 Game 스트림을 저장한다

`MapHistory.Rewind`가 `Random.Game`을 13곳에서, `Replay`가 7곳에서 만진다.
`Random.Serialize`/`Deserialize`(0x2375660/0x2375A90)와 `Random.IsSave`(0x2374C60)가 있다.
⇒ 인게임 되감기는 **난수 상태를 되돌린다**. 우리 `.eph`의 롤 기록과 어떻게 맞물리는지가 §3의 과제.

### 0-4. 예보 격리 = **시드 스택 + 시뮬레이션 모드** (판독 완료)

`BattleInfo.CalcParam`의 `Random.Game` 접촉 2곳(+0xE0·+0x218)은 **굴림이 아니라 상태 저장/복원**이었다.

```
CalcParam (예보 경로):
    Stack<RandomSeed>.Push(Random.Game 상태)     ; 0x1E78B00 → 0x35EF690
    BattleMath.PushSimulation()                   ; 0x1E7E490 — 전역 플래그 [0x6316143] = 1
    CalcFlags → CalcRange → CalcChain → ComplementConditions → CalcDetail → CalcActiveSkill
    ... (+0x218에서 Pop으로 상태 복원)
```

`PushSimulation`이 세우는 플래그가 HIT_RANDOM §1-2의 그 스위치다 —
`s_CurrentProbabilityHit` → `_IsProbabilityTrue`, `s_CurrentProbability100` → `_IsProbabilityFalse`.
⇒ **예보 중에는 명중이 항상 성공·확률 발동이 항상 실패로 고정**되고, 난수 상태는 스택으로 원복된다.

현행 엔진은 `forecastSide`가 **난수소스를 인자로 받지 않는** 순수 함수라 굴림을 축내지 않는다(요구 (a) 충족).
요구 (b)(예보의 명중·발동 고정)는 표시 계약과 대조가 필요하다 — A4의 실제 과제는 (b) 쪽이다.

### 0-4A. ★유닛별 난수 시드가 따로 있다 — `m_GrowSeed` / `m_DropSeed`

`Unit`은 `m_GrowSeed`(+0x70)·`m_DropSeed`(+0x74) 두 개의 **유닛 전용 시드**를 든다(dump.cs:738639).

```
MapSequence.MapBegin +0x740:  unit.m_GrowSeed = Random.Game.GetValue()   ; 챕터 개시마다 유닛별 시드 배포
Unit.LevelUp        (STATS_GROWTH §2):
    seed = unit.m_GrowSeed
    r    = new App.Random(seed)          ; ★유닛별 새 인스턴스 — 전역 Game 스트림을 쓰지 않는다
    ...굴림...
    unit.m_GrowSeed = r.GetValue()       ; 다음 시드로 갱신
```

⇒ **성장은 유닛별 독립 스트림**이다. 인게임에서 A의 레벨업 결과는 B가 몇 번 굴렸는지와 **무관**하다.
☠현행 엔진 `rollGrowth(unit, rng)`(battle.ts:620)는 **전역 rng**를 쓴다 — 행동 순서가 바뀌면 성장이 달라진다.
이것이 "시뮬레이션에 영향이 큼"의 실체 중 하나다(A2의 1순위 과제).

`m_DropSeed`는 드롭 판정용으로 보이나 **미판독**(A3 대상).

### 0-5. 이미 판독된 소비 지점 (재조사 불필요)

| 판정 | 소비 | 정본 |
|---|---|---|
| 명중 | `Game.GetValue(10000)` **1회** + sin 리맵 임계 | HIT_RANDOM.md |
| 성장(Random) | 스탯별 1롤, 잔여 0이면 **미소모**, 최대 4시도 재굴림(난수는 시도 간 이어짐) | STATS_GROWTH.md |
| 성장(Fixed) | **난수 미소비** | STATS_GROWTH.md |
| 방해 지팡이 | 명중 롤 1회(`RandomCheckHit` 공용) | MP1-5 |
| 파괴 커맨드 | **난수 0** | MP3_READINGS §3 |
| 체인가드 | 필살 롤 **무소비** | MP1-6 |

### 0-6. AI 난수 소비 지점 24곳 (`AIThink` → `Random.System`)

```
GetAttackScore+0x59c · GetHealRodScore+0xd8 · GetRangeHealRodScore+0x320 · GetInterferenceScore+0x2c8
EnchantHealGetScore+0x320 · CheckAttackPriorityImpl+0x238 · OverlapSkills.GetByRandom+0x54
InterferenceTo+0x4bc · RodWarpTo+0xa4c · RodRescueTo+0xa30 · CommandSkillOverlapTo+0x170
Engage{Attack,Wait,Summon,Overlap,Heal,Dance,Charge,Bless}To · EntrustMoveEngageCount(2곳)
DecideToProhibit{Rod,Engage,Turn}
```
현행 엔진은 `aiIsRandom = rng.next(2) !== 0`(동점 코인플립)만 모델한다(`ai/attack.ts:39`).
**24곳 각각이 코인플립인지, 스코어에 흔들림을 더하는지, 후보를 뽑는지는 미판독**이다.

---

## 1. 트랙 A — 난수 정본화

- **A1 PRNG 이식** — `packages/engine/src/random.ts` 신설. xorshift128 + MT식 시딩 + `Spin`/직렬화.
  현행 `RandomSource`(`next(bound)`) 계약은 **그대로 둔다** — 정본 PRNG는 그 계약의 한 구현이다.
  ☠`GetValue(bound)`가 `value % bound`인지 스케일링인지 판독 선행(§미결 B).
- **A2 스트림 분리** — `GameState`에 스트림별 상태. 최소 `game`·`ai`·`killBonus` 3개
  (Spot은 조우 맵 착수 시, Hub/Combat은 범위 밖). 기보 `rolls` 스키마에 스트림 태그가 필요한지 판단.
- **A3 소비 전수 대조** — Game 48 + System 24 + KillBonus 4 + Spot 22 = **98개 호출처를 하나씩 분류**.
  산출 = 판정별 (스트림, 굴림 수, 인자, 순서) 표. 우리 엔진의 실제 소비와 대조해 차이를 장부에 등재.
- **A4 예보 격리** — `PushRandomSeed`/`PopRandomSeed` 판독 후, 우리 예보·AI 평가가 실굴림을
  소비하지 않음을 테스트로 못박는다(현행 미검증).
- **A5 시드 계약** — 챕터 개시 시드가 어디서 오는가(세이브? 시각?), 되감기가 무엇을 되돌리는가.
  `.eph`가 **롤 배열**을 기록하는 현행 계약을 **시드 기록**으로 바꿀 수 있는지 판단
  (바꾸면 기보가 극적으로 작아지고 인게임 대조가 가능해진다 — 다만 우리 소비 순서가 완전히
  일치해야만 성립하므로 A3의 결과에 종속된다).
- **A6 배선·회귀** — TDD + 기존 기보 재생성 + RULE_VERSION 범프.

## 2. 트랙 B — AI 행동방식 정밀화

- **B1 난수 지점 24곳 판독** — 각 지점이 코인플립/스코어 흔들림/후보 추첨 중 무엇인지 확정.
- **B2 MP4 잔여 결손 종결** — `EG_Attack` 22(람다 미판독) · `CS_Yell`/`Enchant` 27(버프 미모델) ·
  `MV_Force`/`Hero` 11 · `ドロー` 6 · 기타 5.
- **B3 스코어 assumed 층 확정** — 경감·발동·밀치기 등(AI_ENGINE §8 잔여).
- **B4 전 54챕터 재측정** — ☠3-7 배치 수리 전에 잰 98.8%는 유령 유닛이 섞인 값이라 무효.
  시드 고정(`./dev replay --seed`)으로 재현 가능한 측정으로 바꾼다.

## 3. 순서 제안

```
B4 재측정(선행 — 지금 숫자가 거짓이라 우선순위 판단이 안 선다)
  → A3 소비 전수 대조(가장 큰 덩어리, 여기서 나오는 차이가 A1·A2의 요구를 정한다)
  → A1 PRNG + A2 스트림 → A4 예보 격리 → A6 배선
  → B1 → B2 → B3
  → A5 시드 계약(가장 마지막 — A3가 100% 일치를 보인 뒤에만 의미)
```

---

## 2A. A3 진행 — `Game` 스트림 48곳 분류 (2026-08-18)

| 갈래 | 곳 | 판정 |
|---|---|---|
| 전투 확률 | 4 | `_IsProbabilityHit`(명중, HIT_RANDOM 판독 완료) · `_IsProbability100`(0.001% 해상도 발동) · `GetRandom` 2종 = `Random.Game.GetValue(n)` **모듈로** 얇은 래퍼 |
| **예보 격리** | 4 | `PushRandomSeed`/`PopRandomSeed` + `BattleInfo.CalcParam` 2곳 — **굴림이 아니라 상태 저장/복원**(§0-4) |
| 유닛 생성 | 6 | `Unit.CreateImpl1`(성장 시드 배포 포함) · `CreateDlcGodEnemyImpl1` · `CreateForSummonImpl1` · `UnitUtil.GetSummonRank`/`CalcSummon`/`TryMultiChangeGod` |
| **되감기·재생** | 16 | `MapHistory.Rewind` 13 · `Replay` 7의 일부 — 난수 **상태 스냅숏 직렬화**(굴림 아님). 우리 `.eph` 롤 기록과 대응하는 층 |
| 맵 개시 | 2 | `MapSequence.MapBegin` — Game 재시드 + 유닛별 `m_GrowSeed` 배포(§0-4A·§A5) |
| Lua | 2 | `ScriptSystem.RandomGet` — 스크립트가 직접 굴린다 |
| 범위 밖 | 14 | 요리 3 · 요리 대화 2 · 반지 연성 2 · 조우 적 수 1 · 챌린지 1 · 맵스킬 커밋 1 외 |

⇒ **실제 "굴림"은 생각보다 적다.** 48곳 중 20곳이 저장/복원·시드 관리이고, 전투 판정은 4곳에 모여 있다.
남은 미분류 = `MapSkill.FixedCalculator.Commit`(맵 스킬 확정 시 굴림 — 소비 개수 미판독).

---

## 3A. B4 재측정 결과 (2026-08-18 확정 — 시드 42 고정, 전 54챕터)

☠**종전 98.8%는 폐기**한다. 유령 유닛(비자군 1,624 과배치·증원 조기 배치) 위에서 잰 값이었다.

| 지표 | 값 |
|---|---|
| 측정 성립 챕터 | **54 / 54** (1차엔 9챕터가 개시조차 못 했다 — §3A-2에서 전건 복구) |
| `verified` | **54 / 54** |
| 비자군 유닛 합계 | 3,133 |
| 결손 유닛 | 126 → **자동화율 95.98%** |
| 결손 건수 | 671 |
| 결손 0 챕터 | 24 / 54 |

계열별 = 외전(s) 98.14% · 본편(m) 95.93% · 신룡(g) 95.68% · 엔게이지(e) 93.99%.

### 3A-1. 결손 671건의 정체 — **미판독 함수 하나가 78%다**

| 건수 | 원인 |
|---|---|
| **524 (78%)** | ★`AIThink.GetSidePosition`(0x195FC80) 미판독 — 가드 위치 규칙. `HealToAttack` 200 · `Attack` 165 · `Enchant` 51 · `AttackToHeal` 42 · `Heal` 22 · `Interference` 16 · `AttackToHealForceOnly` 12 외 |
| 74 | 옵코드 62 `AI_MI_Village` 미구현 |
| 16 | 옵코드 50 `AI_AT_EngageAttack` |
| 13 | 옵코드 89 `AI_MV_Hero` |
| 12 | 옵코드 120 `AI_AT_EngageCSYell` |
| 11 | 옵코드 97 `AI_MV_NearestFriend` |
| 나머지 | `HealMindToTerrain` 게이트 · 엔진(페이즈 미진행·1000액션 초과) |

⇒ **B 트랙 우선순위 확정**: `GetSidePosition` 판독 1건이 결손의 **78%**를 지운다. 그다음이 `AI_MI_Village`.
착수 지점 = `MapFor.RangeFunction` + 람다 `<GetSidePosition>b__0`(0x28EBD10) — 범위 열거 후 선택 규칙.

### 3A-2. 1차 측정을 막았던 9챕터 — 전건 복구 (2026-08-18)

☠전부 MP3 3-7 수리 **이전** 커밋(1583cd0)에서도 같은 오류로 재현됐다 = 선행 결함이었다.

| 원인 | 챕터 | 종결 |
|---|---|---|
| 챕터 전용 Include 미탑재 | g002·g003·g005 | `common*`은 클라이언트가 fetch하지만 `Include("G002_Gimmick")` 같은 챕터 전속 소스는 아무도 안 실었다. `sources`에 싣고 SID/GID/IID/TID 사영 폐포도 넓혔다 |
| 소지품 계약 오해 | e005·e006·m014 | **우리 구현이 틀렸다**: `ScriptUnit.UnitPutOffItem`(0x219B290)은 슬롯 0..7을 훑다 못 찾으면 `ret`, `Unit.ItemEquip`(0x1A21530)은 0을 반환할 뿐 예외가 없다 — 원기는 조용히 무시한다 |
| ★MoonSharp 확장 3번째 | g001·g004 | `return`이 블록의 마지막 문장이 아니어도 되고 **그 자리에서 블록이 닫힌다**(원문이 실제로 `end` 1개 부족 — g001 토큰 실측 열림 60 · `end` 59). 파이프라인이 `do return x end` + 블록 닫기로 정규화(블록 추적, 여는 블록이 `if`가 아니면 중단) |
| ★재생 전이 순서 | m001 · (m022 회귀) | `endPhase`는 `forces`에서 다음 진영을 고르고 **그 진영만** 활성화 리셋을 받는데, 훅이 진영 구성을 바꾸면 훅이 전이 앞/뒤 어느 쪽에서 났는지에 따라 라이브와 재생이 갈린다(m001 = 앞, m022 = 뒤 — 둘 다 실측이라 한쪽 순서로 고정하면 반대가 깨진다). ⇒ 순서를 추측하지 않고 **기록된 절대 `phase`와 맞는 경로를 채택**한다. 부수 = `phase` 이벤트 절대 적용(단 `turn`은 전이 직전 값이라 대입 금지) · `spawn` 멱등화 |

**잔여 1건** = e005 `MapOverlapSet` — 의도적 미등록(런타임 오버레이 생성 미모델, no-op이 곧 오재현
— 瘴気는 피해가 본질). 챕터 부트 스모크에만 걸리고 실제 완주에는 영향이 없다. 선행 = 오버레이 생성 모델.

---

## 4. 미결 (사용자 결정 필요)

**A. `Peek`의 용도** — **[2026-08-18 종결: 죽은 코드]** `Random.Peek`(0x2375040)·`RandomSeed.Peek`(0x2375060)
둘 다 **호출처 0곳**. `Spin`(0x2375080)도 `CreateFirstChallenge` 1곳뿐(챌린지 모드 = 범위 밖).
⇒ 이식 불필요.

**B. `GetValue(bound)`의 축약** — **[2026-08-18 종결: 모듈로]** `App.Random.GetValue(int)`(0x2375170)이
`sdiv`+`msub`로 `v % bound`를 낸다. 스케일링이 아니다. 모듈로 편향까지 그대로 재현해야 정합이다.

**C. `.eph` 롤 기록 vs 시드 기록** — §A5. **[2026-08-18 결정: A3 종료 후 재판단]** 소비 76→98곳
전수 대조가 100% 일치를 보이기 전에는 시드 기록으로 못 간다(한 곳만 어긋나도 기보 전체가 무효).
그때까지 **현행 롤 기록 유지**.

**D. 범위** — **[2026-08-18 결정: Spot 포함]** Game 48 + System 24 + KillBonus 4 + **Spot 22 = 98곳**.
이유 = 외전·조우 적 생성이 MA 공략(외전 개방 시기·조우 보상)과 맞물린다. Hub/HubItem 18곳은 제외
(거점 트랙 자체가 없다 — 장부 등재로 미룸). Combat 94곳은 연출이라 영구 제외.

**E. 트랙 A와 B의 선후** — **[2026-08-18 결정: B4 → A 전체 → B 나머지]**
MP4의 98.8%가 유령 유닛 위에서 잰 값이라 우선순위 판단이 안 선다. 측정 신뢰 회복이 먼저다.
