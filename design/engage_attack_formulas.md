---
status: draft
target: packages/engine/src/battle.ts(engageAttack 실행 문법) + apps/web/src/lib/fe17.ts(emblemEngageArt 사영) + packages/shared/src/fidelity.ts(actions.engage-attack 근거 보강)
---

# 인게이지 기술 대미지 산식 — 리프 테트라트릭 · 카무이 용천포

조사 2026-09-05. 대상 = 두 엔게이지 기술의 **대미지에 영향을 주는 계산식**.
정본 서열 = 실행파일 판독(il2cpp 5.0.0 aarch64) > romfs 데이터 > 실측.
☠확정 못 한 것은 §4에 "미확정"으로 격리했다 — 추측을 산식에 섞지 않는다.

판독 도구 = `tools/exefs/nso_disasm.py` (절차 정본 = `design/verification.md` §2-7).
기존 판독 보고서 = `~/fesim_data/extracted/il2cpp/` (DAMAGE.md · SEQUENCE_BREAK.md · RATES_FORMULA.md ·
EMBLEM_ENGAGE.md · SKILL_ENGINE.md) — 본 문서는 그 위에 **기술 2건의 개별 산식**만 얹는다.

---

## 1. 두 기술이 공유하는 뼈대 (엔게이지 기술 공통)

### 1-1. 汎用設定이 전투 흐름을 통째로 고정한다

`SID_エンゲージ技_汎用設定` (skill.xml:444 · `SyncSids`로 두 기술 모두가 참조)

| 필드 | 값 |
|---|---|
| Timing | 3 (BattleDetail) |
| Stand | 1 (Offence) · Action 0 |
| Flag | 3 = Invisible(1) + EngageAttack(2) |
| ActNames / Op / Values | `命中率;必殺率;手番回数;攻撃回数;行動回数;相手の手番回数` / 전부 `=` / `100;0;1;1;1;0` |

`=` 연산의 정본 의미 = **Value 대입(계산식 결과를 덮어씀), Add·Scale은 살아남고 그 뒤 클램프**
(`SkillData.ExecuteImpl` RVA 0x248E470 · `BattleParamCommand.SetImpl` 0x1B45DE0 · RATES_FORMULA.md §172·189).

따라서 엔게이지 기술은:

1. **명중 100% 확정** — `命中率` Value=100, 클램프 [0,100]. 무기 Hit·기량·회피는 결과에 무관.
2. **필살 0% 확정** — `必殺率` Value=0. **필살 3배가 걸릴 수 없다.**
3. **반격 없음** — `相手の手番回数`=0 → 상대 `BattleInfoSide.BattleTimes`=0 →
   `CalcOrders`가 `min(手番回数,4) <= TotalOrder`에서 오더를 한 번도 안 준다
   (0x246FAEC · SEQUENCE_BREAK.md §2-4).
4. **자기 추격 없음** — `手番回数`=1로 고정(공속차 무관).
5. 타격 수의 기본값 `攻撃回数`=1 · `行動回数`=1.

★순서가 값을 정한다: 汎用設定은 Timing 3, 기술 자신의 행은 Timing 6/7이라 **기술 행이 나중에 이긴다**
(정렬 정본 = `SkillData.SortKey = (Timing<<18) + (Order<<11) + 데이터인덱스`, `OnBuild` 0x248AE90).

### 1-2. 대미지 파이프라인은 통상 전투와 같다

calculator.xml (romfs 정본, 코드에 하드코딩 없음 — REPORT_IL2CPP §2):

```
ユニット攻撃力計算 = (攻撃属性 == 魔法属性) ? 魔力 : 力
攻撃力計算       = ユニット攻撃力 + 武器攻撃力 * 武器特効
ユニット防御力計算 = (相手の攻撃属性 == 魔法属性) ? 魔防 : 守備
防御力計算       = ユニット防御力 + 地形防御          ; 베이스 지형 + 오버레이 2층 합산
威力計算         = max(攻撃力 - 相手の防御力, 0)
```

최종 정수화 (DAMAGE.md §1·§2-6):

```
damage = trunc( clamp( (威力計算 + ΣAdd) * ΠScale, 0, 999 ) ) * (필살 ? 3 : 1)
```

엔게이지 기술은 필살률이 0이므로 **항상 ×1**. `ダメージ` 계열 보정(Timing 12)은 이 정수 뒤에 순차 적용되고
매 연산마다 절사된다.

### 1-3. 타격마다 무기가 바뀌는 기구 (코드 확정)

`BattleCalculator.SeparatorScope..ctor` RVA **0x19B6A70**, PushAttack(=16) 분기:

```
0x019b6b68  ldr w8,[x19,#8]            ; m_Push
0x019b6b6c  cmp w8, #0x10             ; == 16 (BattleScene.Kind.PushAttack)
0x019b6b98  ldr w2,[x0,#0xbc]         ; side.TotalAttack   ← 인덱스
0x019b6ba8  bl  0x1a29830             ; App.Unit$$GetSkillEquip(unit, skill, index)
0x019b6bc8  bl  0x1e8a580             ; App.BattleInfoSide$$SetSpecifiedItem
```

`Unit.GetSkillEquip`(0x1A29830)은 `SkillData.GetEquipItem`(0x2490800)을 인라인한다:

```
count = skill.m_EquipItems.Count          ; EquipIids 사영
if (count < 1) return null                ; → 유닛 현 장비 유지
if (index < 0) return skill.m_DefaultEquipItem
return m_EquipItems[index % count]        ; udiv/msub = 모듈로
```

⇒ **n번째 타격(0-base TotalAttack)은 `EquipIids[n % len]`을 그 타격의 무기로 쓴다.**
`TotalAttack`은 PushAttack 스코프 Dispose에서 +1 (SEQUENCE_BREAK.md §2-5).

### 1-4. 攻撃属性(물리/마법) 판정 — `ItemData.CalcAttr` RVA 0x27AC400 (전문 판독)

```
if (!m_IsWeapon /* +0x110 */)           return Attrs.None(0);
k = Kind /* +0x48 */ & ~1;              ; Sword1->0 Lance2->2 Axe3->2 Bow4->4 Dagger5->4
                                        ; Magic6->6 Rod7->6 Fist8->8 Special9->8
if (Flag & ReverseAttribute /* 0x10000 */)  return (k == 6) ? Physical(1) : Magic(2);
else                                        return (k == 6) ? Magic(2)    : Physical(1);
```

즉 **마법 = (Kind가 Magic|Rod) XOR ReverseAttribute**. `UnitItem.GetAttr`(0x1FAEEA0)은 이 값을 그대로 읽는다.
(item.xml에 Attr 열은 없다 — 로드 시 계산되는 파생값이다.)

---

## 2. 리프 — 테트라트릭 (テトラトリック / Quadruple Hit)

### 2-1. 정본 위치

- `god.xml:62` `Gid="GID_リーフ"` → `EngageAttack="SID_リーフエンゲージ技"` (`EngageAttackRampage`·`EngageAttackLink` 없음)
- `skill.xml:554` `SID_リーフエンゲージ技` — 스타일 변종 3건: 隠密 556 · 気功 557 · 竜族 555
- 인게임 설명(names/ja·ko·en, `MSID_H_LeafEngageAtk`): *"剣、槍、斧、弓で連続攻撃"*

### 2-2. 기술 행 필드

| 필드 | 값 | 의미 |
|---|---|---|
| Timing | 6 | OrderStart |
| Target | 0 | Target(단일 대상) |
| Stand / Action | 0 / 1 | 타격 역할 = 공격 |
| Flag | 2 | EngageAttack |
| ActNames/Op/Values | `攻撃回数` / `=` / `4` | **한 手番에 4타** |
| RangeI / RangeO | 1 / 1 | **인접 전용**(무기 사거리 1~2를 덮어쓴다) |
| EquipIids | 光の剣 → マスターランス → キラーアクス → マスターボウ | 타격 순서 |
| Cost | 0 | 게이지 차감 없음 |
| Power | 6 | ☠소비처 미확정(§4-1) |

### 2-3. 타격별 무기 (item.xml)

| # | IID | Kind | Power | Weight | Hit | Crit | Range | Flag | 攻撃属性 | 기타 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `IID_リーフ_ひかりの剣` | 1 Sword | 15 | 6 | 75 | 20 | 1-2 | 65667 | **마법**(ReverseAttribute) | Enhance.Luck +10 |
| 2 | `IID_リーフ_マスターランス` | 2 Lance | 7 | 16 | 55 | 0 | 1-2 | 131 | 물리 | EquipSids `SID_２回行動` (무효, §2-5) |
| 3 | `IID_リーフ_キラーアクス` | 3 Axe | 11 | 11 | 65 | 30 | 1-1 | 131 | 물리 | — |
| 4 | `IID_リーフ_マスターボウ` | 4 Bow | 6 | 14 | 65 | 0 | 1-2 | 131 | 물리 | EquipSids `SID_２回行動` (무효) |

Flag 131 = Rarity(1)+NotTrade(2)+Engage(128) · 65667 = 131+ReverseAttribute(65536).

### 2-4. 산식 — 타격 n(1..4)

```
w      = 표의 n번째 무기                         ; TotalAttack % 4
공격력  = (w.magic ? 魔力 : 力) + w.Power * 武器特効
방어력  = (w.magic ? 相手の魔防 : 相手の守備) + 相手の地形防御(베이스+오버레이)
dmg_n  = trunc( clamp( (max(공격력 - 방어력, 0) + ΣAdd) * ΠScale, 0, 999 ) )
명중    = 100% 확정   ·   필살 = 0% 확정(3배 없음)
반격    = 없음(相手の手番回数 = 0)
```

- **1타만 마법 대미지**(相手の魔防 참조), 2~4타는 물리(相手の守備). 실질적으로 **혼합 속성 4연타**다.
- `武器特効` = 4자루 모두 특효 없음(EquipSids·PassiveSids에 특효 스킬 없음) → 1.
- 무기 Hit(75/55/65/65)·Crit(20/0/30/0)는 **결과에 관여하지 않는다**(汎用設定이 덮어쓴다) —
  예보 UI가 이 값을 그리면 안 된다.
- 무게(6/16/11/14)는 명중·추격에는 무영향이지만 `SID_重撃`(Timing 3, `威力 += min(武器の重さ-体格,5)`) 보유 시
  타격마다 다른 값을 얹는다.
- `ひかりの剣`의 `Enhance.Luck=10`은 장비 스탯 보정 — 명중·필살이 고정이라 대미지에는 영향 없다
  (幸運 조건 스킬만 흔든다).

### 2-5. `SID_２回行動`이 발동하지 않는 이유 (코드 확정)

`SID_２回行動`(skill.xml:879) = `行動回数 *= 2`, **Flag 65 = Invisible(1) + IgnoreEngageAttacking(64)**.
`SkillData.Flags.IgnoreEngageAttacking = 64` (dump.cs:608666~) = **엔게이지 기술 중 무시**.
⇒ 마스터랜스·마스터보우가 브레이브 무기임에도 테트라트릭은 8타가 아니라 **4타**다.

### 2-6. 스타일 변종 (`GetEngageAttack` 0x2341640 → `m_StyleSkills[job.Style]`)

| 스타일 | Sid | 추가 SyncSid | 효과 |
|---|---|---|---|
| 竜族 | `SID_リーフエンゲージ技_竜族` | `SID_ダメージ１２０％` | Timing 12 Order 85 · `相手のダメージ = ceil-ish(dmg*1.2)` (식이 소수부 있으면 +1로 올림을 직접 구현) |
| 気功 | `_気功` | `SID_リーフエンゲージ技_ブレイク` | Timing 11(HitAfter) · `Condition 総攻撃回数 == 3` → `GiveSids SID_気絶` = **브레이크 확정** |
| 隠密 | `_隠密` | `SID_お金入手_1000G` | Timing 17 · `相手の生存==0 && スキル確率(幸運)` → 1000G |
| 그 외(騎馬·重装·飛行·魔法) | 변종 없음 → 기본 행 | — | — |

竜族 변종의 대미지 배율은 `威力`이 아니라 **`ダメージ`(정수화 이후)** 단계라 `trunc` 뒤에 곱해진다.

---

## 3. 카무이 — 용천포 (竜穿砲 / Torrential Roar)

### 3-1. 정본 위치

- `god.xml:67` `Gid="GID_カムイ"` → `EngageAttack="SID_カムイエンゲージ技"`
- `skill.xml:663` `SID_カムイエンゲージ技` · 竜族 변종 664
- 인게임 설명(`MSID_H_KamuiEngageAtk`): *"水の力で直線3マスを攻撃し／マスを「水たまり」にする／隣接時限定"* ·
  竜族 = *"【竜族】攻撃範囲を＋1する"*

### 3-2. 기술 행 필드

| 필드 | 값 | 의미 |
|---|---|---|
| Timing | 7 | ActionStart |
| Target | **5** | `SkillData.Targets.Range` = 범위기(dump.cs:608557) |
| Stand / Action | 0 / 1 | 타격 역할 = 공격 |
| Flag | 2 | EngageAttack |
| ActNames/Op/Values | `威力` / `*` / `1` | **항등 — 배율 없음** |
| AttackRange | `カムイ攻撃範囲` | 피해 범위 패턴 |
| OverlapRange | `カムイ攻撃範囲` | 지형 덮어쓰기 범위(피해 범위와 동일) |
| OverlapTerrain | `TID_水溜まり` | 웅덩이 |
| RangeI / RangeO | 1 / 1 | **인접 전용**(隣接時限定) |
| EquipIids | `IID_カムイ_竜穿` 1자루 | 모든 타격이 같은 무기 |
| 攻撃回数 | 미지정 → 汎用設定의 1 | **1타** |
| Cost | 0 | 게이지 차감 없음 |
| Power | 7 | ☠소비처 미확정(§4-1) |

### 3-3. 무기 `IID_カムイ_竜穿` (item.xml:538)

| Kind | Power | Weight | Hit | Crit | Range | Flag | 攻撃属性 |
|---|---|---|---|---|---|---|---|
| 9 Special | **20** | 7 | 100 | 0 | 1-1 | 131 | **물리** |

★핵심 판정: Flag 131에 **ReverseAttribute(0x10000)가 없다** → `CalcAttr`의 `k = 9 & ~1 = 8 != 6` 분기 →
**Physical**. 즉 용천포는 브레스 연출이지만 **물리 대미지(力 대 守備)**다.
대조군이 그 판정을 뒷받침한다 — 같은 Kind 9의 `IID_火のブレス`·`IID_氷のブレス`·`IID_チキ_ブレス_魔法`는
전부 Flag에 0x10000을 달아 마법으로 돌리는데, `IID_カムイ_竜穿`만 안 달았다.
`ItemData.Flags.Breath(0x2000000)`·`Dragon(0x4000000)`도 없다(브레스 전용 특수 취급 없음).

### 3-4. 범위 패턴 (`range.xml`, `RangeData.Targets` 셀 값)

값 의미(dump.cs:605767) = `None 0 · Self 1 · Enemy 2 · Friend 3 · Both 4`.

```
カムイ攻撃範囲            カムイ攻撃範囲_竜族
  2                        2
  2                        2
  2                        2
  1  <- 시전자 칸           2
                           1  <- 시전자 칸
```

⇒ 시전자가 바라보는 방향으로 **직선 3칸**(竜族 스타일 = **4칸**). 패턴 회전은
`MapSkill.GetRangeDir`(0x1F4F4E0) → `MapSkill.ForeachAttackRange`(0x1F501B0)가 담당한다.

대상 수집 경로 = `MapSequenceMind.MultiTarget`(0x267DD20):

```
if (관통형) CalcPierce(...)
else {
  ForeachAttackRange(UnitFunc)     ; 0x267E124 — 패턴 칸의 유닛 수집
  ForeachOverlapRange(TerrainFunc) ; 0x267E1C4 — 같은 패턴 칸에 OverlapTerrain 설치
}
MapMind.MultiTargets.Add(...)      ; 0x267E248 — 대상 목록
```

### 3-5. 지형 변화 — `TID_水溜まり` (terrain.xml:174)

| Defense | Avoid | MoveCost | FlyCost | Life | 비고 |
|---|---|---|---|---|---|
| 0 | **-30** | 1 | 0 | **1** | 오버레이 레이어(`MapOverlap`) |

`TID_水溜まり_永続`(Life=0 = 무기한)이 따로 존재하므로 **기술이 까는 웅덩이는 한시적**이다.
오버레이 지형 보정은 베이스 지형에 **덧붙는다**(`BattleDetail.CalcDefense/CalcAvoid` 0x1E746C0/0x1E74900 —
Terrain 0x40과 OverlapTerrain 0x48을 각각 합산, MOVE_TERRAIN.md §2-6). 회피 -30은 그 칸에 남는 적에게 적용된다.

### 3-6. 산식 — 범위 안 대상 각각

```
공격력  = 力 + 20 * 武器特効          ; 竜穿은 물리 · 특효 없음 → 武器特効 = 1
방어력  = 相手の守備 + 相手の地形防御(베이스 + 오버레이)
dmg    = trunc( clamp( (max(공격력 - 방어력, 0) + ΣAdd) * ΠScale, 0, 999 ) )
명중    = 100% 확정   ·   필살 = 0% 확정   ·   반격 없음   ·   1타
방어무시 = 없음(`IID_弾_防御無視` 같은 전용 항목이 竜穿에는 없다)
배율    = 없음(`威力 * 1` = 항등)
```

竜族 스타일은 **사거리 패턴만 +1칸**이고 대미지 보정은 없다(`SID_カムイエンゲージ技_竜族`의 Act도 `威力 *1`).

---

## 4. 미확정 (☠추측 금지 구간)

1. **`SkillData.Power`(리프 6 · 카무이 7)의 소비처.** `SkillArray.GetPower()`(0x2489450)는 필터 없이 전 스킬
   SUM이지만 호출부를 못 찾았다(직접 BL 0건 = 인라인 또는 미사용). SKILL_ENGINE.md §5-3에서도 미결로 남은 항목.
   ⇒ **대미지와 무관하다고 단정하지 않는다.** 다만 대미지 경로(威力/攻撃力/ダメージ 커맨드)에는 이 필드가 없다.
2. **엔게이지 기술 타격이 통상 브레이크(무기 상성)를 유발하는가.** `CalcAttack`의 브레이크 조건 5개
   (명중 · 대미지>=1 · 공격측 Offense · 방어측 Defense · `CanBreakable` · `GetBreaked`)에 엔게이지 제외 조항은
   보이지 않지만, 엔게이지 경로 전용 게이트를 직접 확인하지 않았다. 리프 気功 변종이 `SID_気絶`을 **따로**
   부여하고 설명이 *"ブレイク確定"*이라는 점은 기본형이 확정 브레이크가 아님을 시사한다(정황이지 확정 아님).
3. **범위기(Target=5)가 대상마다 별개 BattleInfo를 만드는가.** `MultiTarget`이 대상 **목록**을 만드는 것까지는
   확인했으나(0x267DD20), 그 뒤 전투 실행이 대상별 1전투인지 확정하지 않았다.
   ⇒ 대상별 지형방어·魔防이 따로 적용되는지가 여기 달려 있다(통상 파이프라인상으로는 별개일 가능성이 높다).
4. **AttackRange 패턴과 OverlapRange 패턴의 적용 순서.** 웅덩이(Avoid -30)가 **그 전투의 회피에 반영되는지**
   (지형 먼저 깔리고 때리는지, 때리고 나서 깔리는지)를 확정하지 않았다. 엔게이지 기술은 명중 100%라
   **대미지에는 영향이 없다** — 대상 생존 후 다음 전투부터 문제가 된다.
5. **각인(Engrave)·연성(Refine)이 기술 전용 무기(SpecifiedItem)에 얹히는가.** `武器攻撃力`에 리프 4무기·竜穿의
   Power가 그대로 들어가는 것까지는 확정했으나, 각인 보정의 합류 지점을 대조하지 않았다.
6. **`威力 * 1`(카무이)이 항등인데 존재하는 이유.** `HasExecuteAct()` 게이트를 채우기 위한 형식 행으로 보이나
   확인하지 않았다. 값은 항등이므로 대미지에는 무영향.

---

## 5. 우리 엔진 반영 여부

### 5-1. 이미 반영된 것

| 항목 | 자리 |
|---|---|
| 汎用設定 흐름(攻撃回数·手番回数·相手の手番回数) | `packages/engine/src/battle.ts:1564-1572` — `flow()` 질의, 기본 1 |
| 명중 100 / 필살 0 대입 | `formula/calculator.ts:eval` 말미가 `命中率計算 -> modify("命中率", …)`로 훅을 걸고, `skills.ts:336`의 `=` 분기가 base를 덮는다 |
| 타격 슬롯별 강제 무기(EquipIids, `IID_無し` = 현 장비) | `battle.ts:1492` `strikeWeapon(i)` + `fe17.ts:1289` |
| 스타일 분기(竜族·気功·隠密 선택) | `fe17.ts:1280` `styleVariantSid` |
| 竜族 `ダメージ１２０％` | `battle.ts:1580` `flow("相手のダメージ", numbers.damage)` |
| 기술 사거리(RangeI/O 1) 우선, 0이면 무기 사거리로 강하 | `fe17.ts:1298` + `battle.ts:1495` |
| 威力 클램프[0,999] + 절사, 필살 3배는 절사 후 | `formula/combat.ts:266` |
| 지형방어 2층(베이스+오버레이) 합산 | `battle.ts:507` |

⇒ **리프 테트라트릭은 산식상 이미 정본과 일치한다**(4타 · 1타 마법 · 명중 100 · 필살 0 · 무반격 · 竜族 1.2배).

### 5-2. 결손 — 카무이 용천포

`emblemEngageArt`(`fe17.ts:1275`)는 `Target=4`(Pierce)와 `Rewarp`만 사영한다.
**`Target=5`(Range)·`AttackRange`·`OverlapRange`·`OverlapTerrain`은 사영도 실행도 없다.**
현재 엔진에서 용천포는 **인접 1명 단일 대상 1타**로 나간다 — 직선 3칸도, 웅덩이 설치도 없다.
오류·경고 없이 조용히 축소되는 자리다(장부 `actions.engage-attack`의 "미배선" 목록에 이 갈래가 아직 없다).

배선하려면 필요한 것:
1. `EngageArt`에 `area?: { offsets, targets }`(range.xml 패턴 사영 + 방향 회전) + `overlapTerrain?: string`.
2. `range.xml` 파이프라인 사영(현재 `data/fe17/tables/`에 range 테이블 없음).
3. `battle.ts` engageAttack에 범위형 분기(pierce와 같은 층: `victims` 목록을 패턴에서 산출).
4. 지형 오버레이 설치 이벤트(웅덩이 Life=1) — `terrainPatches` 층에 얹는다.

### 5-3. 부수 관찰 — 攻撃属性 판정의 미세 차이

현행 사영은 `magic = (Kind === 6) || (Flag & 0x10000)` (`fe17.ts:1230`),
정본은 `magic = (Kind == Magic|Rod) XOR ReverseAttribute` (`CalcAttr` 0x27AC400).
실제로 갈리는 것은 **지팡이(Kind 7) 41종뿐**이고(정본 마법 / 현행 물리), 지팡이는 통상 대미지식을 안 타므로
현재 발현하지 않는다. 본 조사의 두 기술(ひかりの剣 = 마법 · 竜穿 = 물리)은 양쪽 규칙이 같은 답을 준다.
⇒ **지금 고칠 필요 없음**. 발현 조건 = 지팡이가 대미지 경로에 들어오거나 Kind 6 + ReverseAttribute 항목이 생길 때.

### 5-4. 무기 순환의 모듈로

정본은 `EquipIids[TotalAttack % len]`, 현행은 `art.weapons?.[i] ?? own`(모듈로 없음).
전수 대조 결과 **`攻撃回数 > EquipIids.length`인 행은 없다**(리프 4/4 · 三級長 3/3 · セネリオ 3/3 ·
エイリーク 2/2 · 마르스·린은 EquipIids 자체가 없어 현 장비로 강하 = 정본의 `count<1 → null` 경로와 동형).
⇒ 현재 발현하지 않는다. 데이터가 늘면 모듈로를 넣어야 한다(비계 아님 — 등가 조건이 데이터에 있다).
