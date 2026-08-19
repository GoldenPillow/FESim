# FESim Rulebook — fe17 / fe17-13

☠**Generated document.** `./dev rulebook` extracts it from code — hand edits are lost on regeneration.

## Board grammar

```json
{
  "coordinates": "인게임 (X, Z) — 좌하단 원점. 표기 정본 = apps/web/src/lib/grid.ts coordLabel",
  "phases": "force 오름차순 순환(0 자군 · 1 적군 · 2 우군). 한 바퀴 = 1턴",
  "activation": "유닛당 이동 1회 + 행동 1회. 행동이 재이동 창을 연다(moved 해제)",
  "ruleVersion": "fe17-13"
}
```

**Sources**: `TryAddDeadScene` 0x2472D20 · `CanRevive` 0x1A4F860 · `Revive` 0x1A4F8B0 · `GetSyncroSkills` 0x2342530 · `Unit.CreateImpl1` 0x1A08944 · `AddExp` 0x1A39D40 · `JobData.IsFly` 0x2055D30 · `MapSkill.CalcPierce` 0x1F4EC90 · `Unit.GetMovePowerImpl` 0x1A5B690 · `CalcAvoid` 0x1E746C0 · `TerrainData.IsNotTarget` 0x21E33D0 · `MapDeployTemplate.UnitRewarp` 0x2C1FE40

## Action inventory

```json
{
  "types": [
    "setup",
    "move",
    "visit",
    "attack",
    "staff",
    "item",
    "dance",
    "guard",
    "engage",
    "engageAttack",
    "trade",
    "destroy",
    "wait",
    "endPhase"
  ],
  "rejections": [
    "유닛 없음/사망: ${id}",
    "페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다",
    "기절 상태: ${u.id}는 행동할 수 없다",
    "행동 완료 유닛: ${u.id}",
    "페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다",
    "재이동 불가: ${u.id}는 이 창에서 이미 이동했다",
    "행동 완료 유닛: ${u.id}",
    "이동타입 코스트 없음: ${u.moveType}",
    "불법 이동: (${action.x}, ${action.y}",
    "파괴 대상 없음: (${action.x}, ${action.y}",
    "방문할 민가가 없다",
    "이미 방문한 민가다",
    "같은 군은 공격할 수 없다",
    "불법 무기 인덱스: ${action.weapon}",
    "사거리 밖 공격",
    "자기 자신은 지팡이 대상이 아니다",
    "불법 지팡이 인덱스: ${idx}",
    "지팡이 사용 횟수 소진",
    "침묵 상태 — 지팡이 사용 불가",
    "사거리 밖 지팡이",
    "지팡이 회복은 같은 군만 대상이다",
    "회복 대상 아님(무손상",
    "방해 지팡이는 적만 대상이다",
    "미배선 방해 지팡이(효과 미판독",
    "워프는 같은 군만 대상이다",
    "워프 목적지 없음",
    "불법 워프 목적지: (${action.x}, ${action.y}",
    "미배선 지팡이 종류(회복·방해·워프만 배선",
    "불법 아이템 인덱스: ${idx}",
    "미배선 아이템 종류(범위 회복만 배선",
    "아이템 소진",
    "사용 대상 없음(범위 내 무손상",
    "춤 스킬 없음",
    "춤은 같은 군만 대상이다",
    "자기 자신은 춤 대상이 아니다",
    "춤은 인접 1칸만",
    "행동 완료 유닛만 재행동 대상이다",
    "체인가드 자격 없음(気功 스타일",
    "체인가드 불가 — HP가 가득해야 한다",
    "교환은 같은 군만 대상이다",
    "자기 자신과는 교환할 수 없다",
    "교환은 인접 1칸만",
    "불법 교환 인덱스: ${action.kind}[${action.index}]",
    "페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다",
    "기절 상태: ${u.id}는 행동할 수 없다",
    "행동 완료 유닛: ${u.id}",
    "엠블렘 미장착",
    "교환 후에는 인게이지 발동 불가",
    "게이지 미만충",
    "같은 군은 공격할 수 없다",
    "인게이지 기술 없음",
    "인게이지 중에만 기술을 쓸 수 있다",
    "현 장비로는 쓸 수 없는 인게이지 기술",
    "게이지 부족(技コスト",
    "무기 없는 유닛은 기술을 쓸 수 없다",
    "리워프형 기술은 착지 칸이 필요하다",
    "맵 밖 착지",
    "워프 금지 지형(IsNotTarget",
    "착지 칸에 유닛이 있다",
    "착지 칸이 기술 사거리 밖이다",
    "사거리 밖 기술",
    "관통 경로 불성립(맵 밖·아군 차단·착지 불가"
  ],
  "note": "거부 문구는 엔진이 실제로 던지는 것 그대로다 — 산문 요약이 아니다"
}
```

## Formulas

```json
{
  "formulaCount": 52,
  "formulas": [
    {
      "name": "ユニット攻撃力計算",
      "expression": "{\"conditions\":[\"攻撃属性 == 魔法属性\"],\"functions\":[\"魔力\",\"力\"]}"
    },
    {
      "name": "ユニット防御力計算",
      "expression": "{\"conditions\":[\"相手の攻撃属性 == 魔法属性\"],\"functions\":[\"魔防\",\"守備\"]}"
    },
    {
      "name": "攻撃力計算",
      "expression": "{\"conditions\":[],\"functions\":[\"ユニット攻撃力 + 武器攻撃力 * 武器特効\"]}"
    },
    {
      "name": "防御力計算",
      "expression": "{\"conditions\":[],\"functions\":[\"ユニット防御力 + 地形防御\"]}"
    },
    {
      "name": "命中値計算",
      "expression": "{\"conditions\":[],\"functions\":[\"技*2 + int(幸運/2) + 武器命中 + 支援命中\"]}"
    },
    {
      "name": "回避値計算",
      "expression": "{\"conditions\":[],\"functions\":[\"攻撃速度*2 + int(幸運/2) + 武器回避 + 支援回避 + 地形回避\"]}"
    },
    {
      "name": "必殺値計算",
      "expression": "{\"conditions\":[],\"functions\":[\"int(技/2) + 武器必殺 + 支援必殺\"]}"
    },
    {
      "name": "必殺回避計算",
      "expression": "{\"conditions\":[],\"functions\":[\"幸運 + 武器必殺回避 + 支援必殺回避\"]}"
    },
    {
      "name": "威力計算",
      "expression": "{\"conditions\":[],\"functions\":[\"max(攻撃力 - 相手の防御力, 0)\"]}"
    },
    {
      "name": "割込み威力計算",
      "expression": "{\"conditions\":[],\"functions\":[\"威力計算\"]}"
    },
    {
      "name": "命中率計算",
      "expression": "{\"conditions\":[],\"functions\":[\"命中値 - 相手の回避値\"]}"
    },
    {
      "name": "必殺率計算",
      "expression": "{\"conditions\":[],\"functions\":[\"必殺値 - 相手の必殺回避\"]}"
    },
    {
      "name": "妨害杖命中値計算",
      "expression": "{\"conditions\":[],\"functions\":[\"魔力+技+武器命中\"]}"
    },
    {
      "name": "妨害杖回避値計算",
      "expression": "{\"conditions\":[],\"functions\":[\"int((魔防*3+幸運)/2)+地形回避\"]}"
    },
    {
      "name": "後キャン発動位置",
      "expression": "{\"conditions\":[],\"functions\":[\"0.5\"]}"
    },
    {
      "name": "ブレイク時後キャン発動位置",
      "expression": "{\"conditions\":[],\"functions\":[\"0.75\"]}"
    },
    {
      "name": "重い動作速度",
      "expression": "{\"conditions\":[],\"functions\":[\"1\"]}"
    },
    {
      "name": "素早い動作速度",
      "expression": "{\"conditions\":[],\"functions\":[\"1\"]}"
    },
    {
      "name": "間合い判断値",
      "expression": "{\"conditions\":[],\"functions\":[\"0.5\"]}"
    },
    {
      "name": "攻撃速度計算",
      "expression": "{\"conditions\":[],\"functions\":[\"速さ - max(武器の重さ - 体格, 0)\"]}"
    },
    {
      "name": "相性補正",
      "expression": "{\"conditions\":[\"武器相性 == 有利\",\"武器相性 == 不利\"],\"functions\":[\"0\",\"0\",\"0\"]}"
    },
    {
      "name": "追撃条件",
      "expression": "{\"conditions\":[\"攻撃速度 - 相手の攻撃速度 >= 5\"],\"functions\":[\"1\",\"0\"]}"
    },
    {
      "name": "チェインアタック威力計算",
      "expression": "{\"conditions\":[],\"functions\":[\"max(相手のMaxHP*0.1, 1)\"]}"
    },
    {
      "name": "チェインアタック命中率計算",
      "expression": "{\"conditions\":[],\"functions\":[\"80\"]}"
    },
    {
      "name": "チェインアタック必殺率計算",
      "expression": "{\"conditions\":[],\"functions\":[\"0\"]}"
    },
    {
      "name": "チェインガードダメージ",
      "expression": "{\"conditions\":[],\"functions\":[\"HP * 0.2\"]}"
    },
    {
      "name": "エンゲージガードダメージ",
      "expression": "{\"conditions\":[],\"functions\":[\"0\"]}"
    },
    {
      "name": "レベル差",
      "expression": "{\"conditions\":[\"相手のレベル != 0\"],\"functions\":[\"(相手のレベル + 相手の内部レベル) - (レベル + 内部レベル)\",\"0\"]}"
    },
    {
      "name": "戦闘基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"戦闘基本値ルナティック( レベル差 )\",\"戦闘基本値ハード( レベル差 )\",\"戦闘基本値ノーマル( レベル差 )\"]}"
    },
    {
      "name": "戦闘最低保証値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"戦闘最低保証値ルナティック( 相手のレベル + 相手の内部レベル )\",\"戦闘最低保証値ハード( 相手のレベル + 相手の内部レベル )\",\"戦闘最低保証値ノーマル( 相手のレベル + 相手の内部レベル )\"]}"
    },
    {
      "name": "戦闘減衰値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\"],\"functions\":[\"max( 相手の与戦闘経験累積数 - 2, 0 )\",\"0\"]}"
    },
    {
      "name": "戦闘経験値",
      "expression": "{\"conditions\":[],\"functions\":[\"max( 戦闘基本値, 戦闘最低保証値 ) - 戦闘減衰値\"]}"
    },
    {
      "name": "チェインアタック経験値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"clamp( チェインアタック基本値ルナティック( レベル差 ) * チェインアタック回数, 0, 15 )\",\"clamp( チェインアタック基本値ハード( レベル差 ) * チェインアタック回数, 0, 30 )\",\"clamp( チェインアタック基本値ノーマル( レベル差 ) * チェインアタック回数, 0, 30 )\"]}"
    },
    {
      "name": "撃破基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"撃破基本値ルナティック( レベル差 )\",\"撃破基本値ハード( レベル差 )\",\"撃破基本値ノーマル( レベル差 )\"]}"
    },
    {
      "name": "撃破最低保証値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"撃破最低保証値ルナティック( 相手のレベル + 相手の内部レベル )\",\"撃破最低保証値ハード( 相手のレベル + 相手の内部レベル )\",\"撃破最低保証値ノーマル( 相手のレベル + 相手の内部レベル )\"]}"
    },
    {
      "name": "撃破経験値",
      "expression": "{\"conditions\":[],\"functions\":[\"max( 撃破基本値, 撃破最低保証値 )\"]}"
    },
    {
      "name": "戦闘経験計算",
      "expression": "{\"conditions\":[\"闘技場中 == 0\",\"クリア済み == 0 && 難易度 == ルナティック\"],\"functions\":[\"clamp( 戦闘経験値 + チェインアタック経験値, 0, 100 )\",\"10\",\"闘技場戦闘経験値( レベル差 )\"]}"
    },
    {
      "name": "撃破経験計算",
      "expression": "{\"conditions\":[\"闘技場中 == 0\",\"クリア済み == 0 && 難易度 == ルナティック\"],\"functions\":[\"clamp(戦闘経験値 + チェインアタック経験値 + 撃破経験値, 1, 100)\",\"10\",\"clamp( 闘技場戦闘経験値( レベル差 ) + 闘技場撃破経験値( レベル差 ), 1, 100 )\"]}"
    },
    {
      "name": "杖減衰値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"杖減衰値ルナティック( レベル + 内部レベル )\",\"杖減衰値ハード( レベル + 内部レベル )\",\"杖減衰値ノーマル( レベル + 内部レベル )\"]}"
    },
    {
      "name": "杖補助レベル差減衰値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"補助レベル差減衰値ルナティック( レベル差 )\",\"補助レベル差減衰値ハード( レベル差 )\",\"補助レベル差減衰値ノーマル( レベル差 )\"]}"
    },
    {
      "name": "杖経験計算",
      "expression": "{\"conditions\":[],\"functions\":[\"clamp( 杖経験値 + 杖減衰値 + 杖補助レベル差減衰値, 1, 100)\"]}"
    },
    {
      "name": "踊り基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"踊り基本値ルナティック( レベル + 内部レベル )\",\"踊り基本値ハード( レベル + 内部レベル )\",\"踊り基本値ノーマル( レベル + 内部レベル )\"]}"
    },
    {
      "name": "踊り補助レベル差減衰値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"補助レベル差減衰値ルナティック( レベル差 )\",\"補助レベル差減衰値ハード( レベル差 )\",\"補助レベル差減衰値ノーマル( レベル差 )\"]}"
    },
    {
      "name": "踊り経験計算",
      "expression": "{\"conditions\":[],\"functions\":[\"clamp( 踊り基本値 + 踊り補助レベル差減衰値, 1, 100 )\"]}"
    },
    {
      "name": "チェインガード基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"ガード基本値ルナティック( レベル + 内部レベル )\",\"ガード基本値ハード( レベル + 内部レベル )\",\"ガード基本値ノーマル( レベル + 内部レベル )\"]}"
    },
    {
      "name": "チェインガード補助レベル差減衰値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"補助レベル差減衰値ルナティック( レベル差 )\",\"補助レベル差減衰値ハード( レベル差 )\",\"補助レベル差減衰値ノーマル( レベル差 )\"]}"
    },
    {
      "name": "チェインガード経験計算",
      "expression": "{\"conditions\":[],\"functions\":[\"clamp( チェインガード基本値 + チェインガード補助レベル差減衰値, 1, 100 )\"]}"
    },
    {
      "name": "召喚基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"召喚基本値ルナティック( レベル + 内部レベル )\",\"召喚基本値ハード( レベル + 内部レベル )\",\"召喚基本値ノーマル( レベル + 内部レベル )\"]}"
    },
    {
      "name": "召喚経験計算",
      "expression": "{\"conditions\":[],\"functions\":[\"clamp( 召喚基本値, 1, 100 )\"]}"
    },
    {
      "name": "エンチャント基本値",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"エンチャント基本値ルナティック( レベル + 内部レベル )\",\"エンチャント基本値ハード( レベル + 内部レベル )\",\"エンチャント基本値ノーマル( レベル + 内部レベル )\"]}"
    },
    {
      "name": "エンチャント経験計算",
      "expression": "{\"conditions\":[],\"functions\":[\"clamp( エンチャント基本値, 1, 100 )\"]}"
    },
    {
      "name": "内部レベル計算",
      "expression": "{\"conditions\":[\"難易度 == ルナティック\",\"難易度 == ハード\"],\"functions\":[\"clamp( 内部レベル + レベル-1, 0, 50 )\",\"clamp( 内部レベル + レベル-1, 0, 40 )\",\"clamp( 内部レベル + レベル-1, 0, 30 )\"]}"
    }
  ],
  "hitCurve": "명중은 sin 리맵(51~99만 상향, 100은 예외) — formula/probability.ts hitThreshold10000",
  "probability": "일반 확률은 percent*1000 > roll(0..99999), ☠percent<=0이면 굴림 자체가 없다"
}
```

## RNG

```json
{
  "prng": "xorshift128(Marsaglia) — t = x^(x<<11); t ^= t>>>8; t ^= w^(w>>>19)",
  "seeding": "MT식 시딩(1812433253) + 시딩 뒤 공전 20회",
  "rewind": "되감기 = 상태 4워드 복원. 굴림 1회 = 전진 1회이므로 '시드 + 남은 롤 수 공전'과 등가",
  "quirks": [
    "GetValue(0)은 예외가 아니라 원값(aarch64 sdiv 0)",
    "IsProbability100(pct<=0)·GetIndex(빈 표)는 굴림을 소비하지 않는다"
  ]
}
```

**Sources**: `RandomSeed.Initialize` 0x2375000 · `Random.Peek` 0x2375060 · `Random.Spin` 0x2375080 · `Random.GetMinMax` 0x23751B0 · `Random.GetMaxMin` 0x2375240 · `Random.GetF01` 0x23750F0 · `Random.IsProbability100` 0x23754B0 · `Random.GetIndex` 0x2375520

## Enemy AI

```json
{
  "priorityLadder": [
    "S0 첫 후보는 무조건 채택(target.Unit == null)",
    "S1 Decoy 하드 게이트 — 즉시 return, OR에 넣지 않는다",
    "S2 Bullet 적합성 · S3 ChainAttackCount · S4 Blow · S5 Command(맨해튼, v1 좌표)",
    "S6 넷 중 하나라도 우세면 스코어를 보지 않고 채택",
    "S7 Score는 uint 단일 무부호 비교 — ☠다필드 사전식이 아니다",
    "S8 동점이면 Random.System.GetValue(2)==0에서 새 후보"
  ],
  "thinkModes": {
    "cause": 1,
    "mind": 2,
    "attack": 3,
    "attackLongRange": 4,
    "attackHigh": 5,
    "attackMiddle": 6,
    "attackLow": 7,
    "move": 8
  },
  "opcodes": {
    "attackDefault": 0,
    "attackMiddleLow": 1,
    "attackLow": 2,
    "attackHero": 3,
    "attackPerson": 4,
    "attackExcludePerson": 5,
    "attackExcludeBand": 6,
    "attackJob": 7,
    "attackJobNearestPosition": 8,
    "attackForce": 9,
    "attackPriorItem": 10,
    "attackExcludePerson2": 14,
    "rodHeal": 20,
    "rodInterference": 30,
    "rodInterferenceHighMagic": 31,
    "rodInterferenceLowMagic": 32,
    "rodInterferencePerson": 33,
    "rodInterferenceExcludePerson": 34,
    "rodInterferenceWeapon": 35,
    "rodInterferenceFrequency": 36,
    "healDefault": 40,
    "healMiddleLow": 41,
    "healNearingHero": 42,
    "mindTreasure": 61,
    "mindBreakDown": 65,
    "mindEscape": 63,
    "mindEscapeSlow": 64,
    "mindTorch": 70,
    "mindGuard": 71,
    "mindGuardBattleScore": 72,
    "mindVillage": 62,
    "mindGuardPerson": 73,
    "mindGuardNoMove": 74,
    "moveIdle": 81,
    "moveAttackRange": 82,
    "moveAttackRangeSide": 83,
    "moveAttackRangeExcludePerson": 84,
    "moveAttackRangeIgnore": 85,
    "moveWeakRange": 86,
    "moveWeakRangeSide": 87,
    "moveHero": 89,
    "movePerson": 90,
    "movePosition": 91,
    "moveTreasure": 94,
    "moveEscape": 96,
    "moveBreakDown": 100,
    "moveAttackRangeExcludePerson2": 109
  }
}
```

**Sources**: `GetAttackScore` 0x19561E0 · `GetAttackPosition` 0x193CB30 · `CheckAttackPriorityImpl` 0x1955ED0 · `CompareAttackPriorityWithBlow` 0x19552D0

## Constants

```json
{
  "constants": {
    "RULE_VERSION": "fe17-13",
    "INIT_SPIN": 20,
    "BAD_STATE": {
      "silence": 32,
      "freeze": 256,
      "stun": 1024,
      "decoy": 4096
    },
    "BLOW_SCORE": {
      "none": 0,
      "wall": 1,
      "blew": 2,
      "hole": 3
    },
    "AI_THINK": {
      "cause": 1,
      "mind": 2,
      "attack": 3,
      "attackLongRange": 4,
      "attackHigh": 5,
      "attackMiddle": 6,
      "attackLow": 7,
      "move": 8
    },
    "AI_FLAG": {
      "notActivateByAttacked": 1,
      "dummy": 2,
      "zeroAttack": 4,
      "heal": 8,
      "break": 16,
      "chain": 32,
      "equipShortAfterLongRange": 64,
      "moveBreak": 128,
      "engageAttackOnce": 256
    },
    "ATTACK_FLAG": {
      "side": 1,
      "nearest": 2,
      "aheadIgnore": 4,
      "scoreExpectation": 32,
      "interferenceHighMagic": 128,
      "interferenceLowMagic": 256,
      "break": 512,
      "chain": 1024,
      "magicOnly": 2048,
      "chainAttackCount": 4096,
      "pierceMultiple": 8192,
      "interferenceRange": 16384,
      "equipSkillMultiple": 32768
    },
    "ACT": {
      "attackDefault": 0,
      "attackMiddleLow": 1,
      "attackLow": 2,
      "attackHero": 3,
      "attackPerson": 4,
      "attackExcludePerson": 5,
      "attackExcludeBand": 6,
      "attackJob": 7,
      "attackJobNearestPosition": 8,
      "attackForce": 9,
      "attackPriorItem": 10,
      "attackExcludePerson2": 14,
      "rodHeal": 20,
      "rodInterference": 30,
      "rodInterferenceHighMagic": 31,
      "rodInterferenceLowMagic": 32,
      "rodInterferencePerson": 33,
      "rodInterferenceExcludePerson": 34,
      "rodInterferenceWeapon": 35,
      "rodInterferenceFrequency": 36,
      "healDefault": 40,
      "healMiddleLow": 41,
      "healNearingHero": 42,
      "mindTreasure": 61,
      "mindBreakDown": 65,
      "mindEscape": 63,
      "mindEscapeSlow": 64,
      "mindTorch": 70,
      "mindGuard": 71,
      "mindGuardBattleScore": 72,
      "mindVillage": 62,
      "mindGuardPerson": 73,
      "mindGuardNoMove": 74,
      "moveIdle": 81,
      "moveAttackRange": 82,
      "moveAttackRangeSide": 83,
      "moveAttackRangeExcludePerson": 84,
      "moveAttackRangeIgnore": 85,
      "moveWeakRange": 86,
      "moveWeakRangeSide": 87,
      "moveHero": 89,
      "movePerson": 90,
      "movePosition": 91,
      "moveTreasure": 94,
      "moveEscape": 96,
      "moveBreakDown": 100,
      "moveAttackRangeExcludePerson2": 109
    }
  }
}
```

## Emblem passives

```json
{
  "note": "絆 레벨마다 붙는 싱크로(상시)·인게이지(발동 중) 패시브 전수. wired=false는 데이터는 있는데 엔진이 읽지 않는다는 뜻이다 — ActName이 calculator 공식 이름과 일치할 때만 질의되기 때문이다.",
  "emblems": [
    {
      "gid": "GID_マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_見切り",
              "name": "간파",
              "act": [
                "回避値+15 + 速さ * 0.25"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_メディウス特効",
              "name": "SID_メディウス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_ブレイク時追撃",
              "name": "몰아붙이기",
              "condition": "攻撃結果(ブレイク) && スキル所持(\"追撃不可\") == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_不屈",
              "name": "불굴",
              "act": [
                "HP=min(HP + MaxHP * 0.2, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*20",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_不屈＋",
              "name": "불굴+",
              "act": [
                "HP=min(HP + MaxHP * 0.3, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*30",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_見切り＋",
              "name": "간파+",
              "act": [
                "回避値+30 + 速さ * 0.25"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_不屈＋＋",
              "name": "불굴++",
              "act": [
                "HP=min(HP + MaxHP * 0.4, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*40",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_シグルド",
      "name": "시구르드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_再移動",
              "name": "재이동",
              "wired": false
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_体格＋１",
              "name": "MSID_Phy_1",
              "enhance": [
                "Phys+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_移動＋１",
              "name": "이동+1",
              "enhance": [
                "Move+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ロプトウス特効",
              "name": "SID_ロプトウス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_迅走",
              "name": "질주",
              "enhance": [
                "Move+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_助走",
              "name": "도움닫기",
              "act": [
                "攻撃力+min( 移動距離, 10 )"
              ],
              "condition": "移動距離 > 0 && 総行動回数 == 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_猛進",
              "name": "맹진",
              "wired": false
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_体格＋２",
              "name": "MSID_Phy_2",
              "enhance": [
                "Phys+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_再移動＋",
              "name": "재이동+",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_助走＋",
              "name": "도움닫기+",
              "act": [
                "攻撃力+移動距離"
              ],
              "condition": "移動距離 > 0 && 総行動回数 == 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_セリカ",
      "name": "세리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_異形リベンジ",
              "name": "이형 리벤지",
              "act": [
                "相手のダメージ=ダメージ*0.1"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 10 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ドーマ特効",
              "name": "SID_ドーマ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_重唱",
              "name": "중창",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法",
              "name": "공명의 흑마법",
              "act": [
                "HP-1",
                "威力+2"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_大好物",
              "name": "가장 좋아하는 음식",
              "wired": false
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_異形リベンジ＋",
              "name": "이형 리벤지+",
              "act": [
                "相手のダメージ=ダメージ*0.3"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 4 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法＋",
              "name": "공명의 흑마법+",
              "act": [
                "HP-1",
                "威力+3"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_異形リベンジ＋＋",
              "name": "이형 리벤지++",
              "act": [
                "相手のダメージ=ダメージ*0.5"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 2 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔力＋５",
              "name": "마력+5",
              "enhance": [
                "Magic+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ミカヤ",
      "name": "미카야",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_杖使い",
              "name": "지팡이 숙련",
              "wired": false
            },
            {
              "sid": "SID_アスタルテ特効",
              "name": "SID_アスタルテ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_増幅",
              "name": "증폭",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_癒しの響き",
              "name": "치유의 울림",
              "act": [
                "回復=max( 相手の回復 * 0.5, 1 )"
              ],
              "condition": "武器の種類 == 杖 && 相手の回復 > 0 && HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "回復"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_サイレス無効",
              "name": "사일런스 가드",
              "wired": false
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_杖使い＋",
              "name": "지팡이 숙련+",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_杖使い＋＋",
              "name": "지팡이 숙련++",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔防＋５",
              "name": "마방+5",
              "enhance": [
                "Mdef+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ロイ",
      "name": "로이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_踏ん張り",
              "name": "분발",
              "condition": "HP*100 >= (MaxHP * 30)",
              "wired": false
            },
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_イドゥン特効",
              "name": "SID_イドゥン特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_超越",
              "name": "초월",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_踏み込み",
              "name": "진입",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋",
              "name": "분발+",
              "condition": "HP*100 >= (MaxHP * 20)",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋＋",
              "name": "분발++",
              "condition": "HP*100 >= (MaxHP * 10)",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋＋＋",
              "name": "분발+++",
              "condition": "HP >= 2",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋６",
              "name": "힘+6",
              "enhance": [
                "Str+6"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_リーフ",
      "name": "리프",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_武器相性激化",
              "name": "급소 회피",
              "act": [
                "相手の威力-3"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ベルド特効",
              "name": "SID_ベルド特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_順応",
              "name": "즉응",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_待ち伏せ",
              "name": "매복",
              "condition": "HP*100 <= MaxHP * 25 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_体格＋４",
              "name": "체격+4",
              "enhance": [
                "Phys+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋",
              "name": "급소 회피+",
              "act": [
                "相手の威力-5"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_待ち伏せ＋",
              "name": "매복+",
              "condition": "HP*100 <= MaxHP * 50 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_体格＋５",
              "name": "체격+5",
              "enhance": [
                "Phys+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋＋",
              "name": "급소 회피++",
              "act": [
                "相手の威力-7"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_待ち伏せ＋＋",
              "name": "매복++",
              "condition": "HP*100 <= MaxHP * 75 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ルキナ",
      "name": "루키나",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_絆の力",
              "name": "듀얼 어택",
              "wired": false
            },
            {
              "sid": "SID_ギムレー特効",
              "name": "SID_ギムレー特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_絆盾",
              "name": "인연 방패",
              "condition": "スキル確率(80)",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_デュアルアシスト",
              "name": "듀얼 어시스트",
              "condition": "スキル所持(\"チェインアタック許可\") && 武器の種類 > 0 && スキル確率(35)",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_デュアルサポート",
              "name": "듀얼 서포트",
              "act": [
                "回避値+隣接支援合計値 * 5"
              ],
              "condition": "周囲の味方数 > 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_デュアルアシスト＋",
              "name": "듀얼 어시스트+",
              "condition": "スキル所持(\"チェインアタック許可\") && 武器の種類 > 0 && スキル確率(70)",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋５",
              "name": "기술+5",
              "enhance": [
                "Tech+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_リン",
      "name": "린",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_攻め立て",
              "name": "연속 공격",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 9",
              "wired": false
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ネルガル特効",
              "name": "SID_ネルガル特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_残像",
              "name": "잔상",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_速さの吸収",
              "name": "속도 흡수",
              "condition": "相手の生存 == 0 && スキル所持( \"速さの増強＋１０\" ) == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_攻め立て＋",
              "name": "연속 공격+",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 7",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_攻め立て＋＋",
              "name": "연속 공격++",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 5",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋５",
              "name": "속도+5",
              "enhance": [
                "Quick+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_アイク",
      "name": "아이크",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_破壊",
              "name": "파괴",
              "act": [
                "相手のダメージ=相手のHP"
              ],
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_勇将",
              "name": "용장",
              "wired": false
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_アシュナード特効",
              "name": "SID_アシュナード特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_アイクエンゲージスキル",
              "name": "부동",
              "act": [
                "回避値*0"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_引き戻し",
              "name": "데려오기",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_怒り",
              "name": "분노",
              "act": [
                "必殺値+min(MaxHP - HP, 30)"
              ],
              "condition": "HP < MaxHP",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_勇将＋",
              "name": "용장+",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_守備＋５",
              "name": "수비+5",
              "enhance": [
                "Def+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ベレト",
      "name": "벨레트",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_天刻の拍動",
              "name": "천각의 박동",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 30 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ネメシス特効",
              "name": "SID_ネメシス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_先生",
              "name": "지도",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_師の導き",
              "name": "스승의 인도",
              "wired": false
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_拾得",
              "name": "습득",
              "condition": "スキル確率( 幸運 )",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_天刻の拍動＋",
              "name": "천각의 박동+",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 50 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１２",
              "name": "행운+12",
              "enhance": [
                "Luck+12"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_カムイ",
      "name": "카무이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_竜脈",
              "name": "용맥",
              "wired": false
            },
            {
              "sid": "SID_ハイドラ特効",
              "name": "SID_ハイドラ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_呪縛",
              "name": "주박",
              "condition": "生存",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_スキンシップ",
              "name": "스킨십",
              "act": [
                "相手のHP+5"
              ],
              "condition": "相手のHP < 相手のMaxHP",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_竜呪",
              "name": "용의 저주",
              "condition": "生存 && 相手の生存",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_防陣",
              "name": "방진",
              "act": [
                "ダメージ=0"
              ],
              "condition": "相手の立場 == 援護",
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１２",
              "name": "HP+12",
              "enhance": [
                "Hp+12"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_スキンシップ＋",
              "name": "스킨십+",
              "act": [
                "相手のHP+10"
              ],
              "condition": "相手のHP < 相手のMaxHP",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１５",
              "name": "HP+15",
              "enhance": [
                "Hp+15"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_エイリーク",
      "name": "에이리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_オルタネイト",
              "name": "얼터네이트",
              "wired": false
            },
            {
              "sid": "SID_月の腕輪",
              "name": "달의 팔찌",
              "act": [
                "威力+相手の守備 * 0.2"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_フォデス特効",
              "name": "SID_フォデス特効",
              "wired": false
            },
            {
              "sid": "SID_月輪",
              "name": "MSID_Moon",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_双聖",
              "name": "쌍성",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_優風",
              "name": "우풍",
              "act": [
                "相手の威力-3"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_月の腕輪＋",
              "name": "달의 팔찌+",
              "act": [
                "威力+相手の守備 * 0.3"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_優風＋",
              "name": "우풍+",
              "act": [
                "相手の威力-5"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_エフラム",
      "name": "에브라임",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_オルタネイト",
              "name": "얼터네이트",
              "wired": false
            },
            {
              "sid": "SID_月の腕輪",
              "name": "달의 팔찌",
              "act": [
                "威力+相手の守備 * 0.2"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_フォデス特効",
              "name": "SID_フォデス特効",
              "wired": false
            },
            {
              "sid": "SID_月輪",
              "name": "MSID_Moon",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_双聖",
              "name": "쌍성",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_優風",
              "name": "우풍",
              "act": [
                "相手の威力-3"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_月の腕輪＋",
              "name": "달의 팔찌+",
              "act": [
                "威力+相手の守備 * 0.3"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_優風＋",
              "name": "우풍+",
              "act": [
                "相手の威力-5"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_リュール",
      "name": "뤼에르",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_リュール邪竜特効",
              "name": "사룡 유효",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_以心",
              "name": "이심",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 5,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            },
            {
              "sid": "SID_絆を繋薙くもの",
              "name": "인연을 잇는 자",
              "condition": "相手の神将レベル != 0",
              "wired": false
            },
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 10,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 20,
          "synchro": [
            {
              "sid": "SID_絆を繋薙くもの＋",
              "name": "인연을 잇는 자+",
              "condition": "相手の神将レベル != 0",
              "wired": false
            },
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１２",
              "name": "HP+12",
              "enhance": [
                "Hp+12"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            },
            {
              "sid": "SID_神竜の加護",
              "name": "신룡의 가호",
              "wired": false
            },
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１５",
              "name": "HP+15",
              "enhance": [
                "Hp+15"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 21,
          "synchro": [
            {
              "sid": "SID_エレオスの祝福",
              "name": "엘레오스의 축복",
              "act": [
                "必殺値+行動済みの味方数 * 2",
                "必殺回避+行動済みの味方数 * 2"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M002_シグルド",
      "name": "시구르드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_移動＋１",
              "name": "이동+1",
              "enhance": [
                "Move+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_再移動",
              "name": "재이동",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_迅走",
              "name": "질주",
              "enhance": [
                "Move+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M007_敵ルキナ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_絆の力",
              "name": "듀얼 어택",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M008_敵リーフ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋",
              "name": "급소 회피+",
              "act": [
                "相手の威力-5"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            },
            {
              "sid": "SID_待ち伏せ＋",
              "name": "매복+",
              "condition": "HP*100 <= MaxHP * 50 && 手番回数 > 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_順応",
              "name": "즉응",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M010_敵ベレト",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_天刻の拍動",
              "name": "천각의 박동",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 30 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            },
            {
              "sid": "SID_師の導き",
              "name": "스승의 인도",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_先生",
              "name": "지도",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M010_敵リン",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_攻め立て＋",
              "name": "연속 공격+",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 7",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_残像",
              "name": "잔상",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_不屈＋",
              "name": "불굴+",
              "act": [
                "HP=min(HP + MaxHP * 0.3, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*30",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵シグルド",
      "name": "시구르드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_再移動",
              "name": "재이동",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_迅走_闇",
              "name": "질주(어둠)",
              "enhance": [
                "Move+3"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵セリカ",
      "name": "세리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法＋",
              "name": "공명의 흑마법+",
              "act": [
                "HP-1",
                "威力+3"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵ミカヤ",
      "name": "미카야",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_杖使い＋",
              "name": "지팡이 숙련+",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_増幅_闇",
              "name": "증폭(어둠)",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵ロイ",
      "name": "로이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋",
              "name": "분발+",
              "condition": "HP*100 >= (MaxHP * 20)",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_超越_闇",
              "name": "초월(어둠)",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M011_敵リーフ",
      "name": "리프",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋",
              "name": "급소 회피+",
              "act": [
                "相手の威力-5"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            },
            {
              "sid": "SID_待ち伏せ＋",
              "name": "매복+",
              "condition": "HP*100 <= MaxHP * 50 && 手番回数 > 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_順応",
              "name": "즉응",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M014_敵ベレト",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_天刻の拍動＋",
              "name": "천각의 박동+",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 50 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_先生",
              "name": "지도",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_見切り＋",
              "name": "간파+",
              "act": [
                "回避値+30 + 速さ * 0.25"
              ],
              "wired": true
            },
            {
              "sid": "SID_不屈＋",
              "name": "불굴+",
              "act": [
                "HP=min(HP + MaxHP * 0.3, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*30",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_ブレイク時追撃",
              "name": "몰아붙이기",
              "condition": "攻撃結果(ブレイク) && スキル所持(\"追撃不可\") == 0",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵シグルド",
      "name": "시구르드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_再移動＋",
              "name": "재이동+",
              "wired": false
            },
            {
              "sid": "SID_助走＋",
              "name": "도움닫기+",
              "act": [
                "攻撃力+移動距離"
              ],
              "condition": "移動距離 > 0 && 総行動回数 == 0",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_迅走",
              "name": "질주",
              "enhance": [
                "Move+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_猛進",
              "name": "맹진",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵セリカ",
      "name": "세리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法＋",
              "name": "공명의 흑마법+",
              "act": [
                "HP-1",
                "威力+3"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_重唱",
              "name": "중창",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵ミカヤ",
      "name": "미카야",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_杖使い",
              "name": "지팡이 숙련",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_増幅_闇",
              "name": "증폭(어둠)",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵ロイ",
      "name": "로이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋",
              "name": "분발+",
              "condition": "HP*100 >= (MaxHP * 20)",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_超越_闇",
              "name": "초월(어둠)",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M017_敵リーフ",
      "name": "리프",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋",
              "name": "급소 회피+",
              "act": [
                "相手の威力-5"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            },
            {
              "sid": "SID_待ち伏せ＋",
              "name": "매복+",
              "condition": "HP*100 <= MaxHP * 50 && 手番回数 > 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_順応",
              "name": "즉응",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M019_敵ミカヤ",
      "name": "미카야",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_杖使い",
              "name": "지팡이 숙련",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_増幅",
              "name": "증폭",
              "wired": false
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_サイレス無効",
              "name": "사일런스 가드",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M019_敵ロイ",
      "name": "로이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋＋",
              "name": "분발++",
              "condition": "HP*100 >= (MaxHP * 10)",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_超越_闇",
              "name": "초월(어둠)",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M020_敵セリカ",
      "name": "세리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法＋",
              "name": "공명의 흑마법+",
              "act": [
                "HP-1",
                "威力+3"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_異形リベンジ＋＋_闇",
              "name": "리벤지",
              "act": [
                "相手のダメージ=ダメージ*0.5"
              ],
              "condition": "相手のユニット属性(異形属性) == 0 && HP > ダメージ && ダメージ >= 2 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_重唱",
              "name": "중창",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M021_敵マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_見切り＋",
              "name": "간파+",
              "act": [
                "回避値+30 + 速さ * 0.25"
              ],
              "wired": true
            },
            {
              "sid": "SID_不屈＋＋",
              "name": "불굴++",
              "act": [
                "HP=min(HP + MaxHP * 0.4, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*40",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            },
            {
              "sid": "SID_ブレイク時追撃",
              "name": "몰아붙이기",
              "condition": "攻撃結果(ブレイク) && スキル所持(\"追撃不可\") == 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_M024_敵マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_見切り＋",
              "name": "간파+",
              "act": [
                "回避値+30 + 速さ * 0.25"
              ],
              "wired": true
            },
            {
              "sid": "SID_不屈＋＋",
              "name": "불굴++",
              "act": [
                "HP=min(HP + MaxHP * 0.4, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*40",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手マルス",
      "name": "마르스",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_見切り",
              "name": "간파",
              "act": [
                "回避値+15 + 速さ * 0.25"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_メディウス特効",
              "name": "SID_メディウス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_カウンター",
              "name": "신속",
              "act": [
                "手番回数+1"
              ],
              "condition": "手番回数 > 0 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_ブレイク時追撃",
              "name": "몰아붙이기",
              "condition": "攻撃結果(ブレイク) && スキル所持(\"追撃不可\") == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_不屈",
              "name": "불굴",
              "act": [
                "HP=min(HP + MaxHP * 0.2, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*20",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_不屈＋",
              "name": "불굴+",
              "act": [
                "HP=min(HP + MaxHP * 0.3, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*30",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_見切り＋",
              "name": "간파+",
              "act": [
                "回避値+30 + 速さ * 0.25"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_不屈＋＋",
              "name": "불굴++",
              "act": [
                "HP=min(HP + MaxHP * 0.4, MaxHP)"
              ],
              "condition": "HP*100 <= MaxHP*40",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手シグルド",
      "name": "시구르드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_再移動",
              "name": "재이동",
              "wired": false
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_体格＋１",
              "name": "MSID_Phy_1",
              "enhance": [
                "Phys+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_移動＋１",
              "name": "이동+1",
              "enhance": [
                "Move+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ロプトウス特効",
              "name": "SID_ロプトウス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_迅走",
              "name": "질주",
              "enhance": [
                "Move+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_助走",
              "name": "도움닫기",
              "act": [
                "攻撃力+min( 移動距離, 10 )"
              ],
              "condition": "移動距離 > 0 && 総行動回数 == 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_猛進",
              "name": "맹진",
              "wired": false
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_体格＋２",
              "name": "MSID_Phy_2",
              "enhance": [
                "Phys+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_再移動＋",
              "name": "재이동+",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_助走＋",
              "name": "도움닫기+",
              "act": [
                "攻撃力+移動距離"
              ],
              "condition": "移動距離 > 0 && 総行動回数 == 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手セリカ",
      "name": "세리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_異形リベンジ",
              "name": "이형 리벤지",
              "act": [
                "相手のダメージ=ダメージ*0.1"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 10 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ドーマ特効",
              "name": "SID_ドーマ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_重唱",
              "name": "중창",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法",
              "name": "공명의 흑마법",
              "act": [
                "HP-1",
                "威力+2"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_大好物",
              "name": "가장 좋아하는 음식",
              "wired": false
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_異形リベンジ＋",
              "name": "이형 리벤지+",
              "act": [
                "相手のダメージ=ダメージ*0.3"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 4 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_共鳴の黒魔法＋",
              "name": "공명의 흑마법+",
              "act": [
                "HP-1",
                "威力+3"
              ],
              "condition": "手番回数 > 0 && 武器の種類 == 魔道書 && HP > 1",
              "wired": true,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_異形リベンジ＋＋",
              "name": "이형 리벤지++",
              "act": [
                "相手のダメージ=ダメージ*0.5"
              ],
              "condition": "相手のユニット属性(異形属性) && HP > ダメージ && ダメージ >= 2 && ( 相手の攻撃属性 == 魔法属性 && ( スキル所持( \"マジックシールド\" ) || スキル所持( \"EN_魔防の薬_効果\" ) ) ) == 0 && ( 相手の攻撃属性 == 物理属性 && スキル所持( \"EN_守備の薬_効果\" ) ) == 0",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔力＋５",
              "name": "마력+5",
              "enhance": [
                "Magic+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ミカヤ",
      "name": "미카야",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_杖使い",
              "name": "지팡이 숙련",
              "wired": false
            },
            {
              "sid": "SID_アスタルテ特効",
              "name": "SID_アスタルテ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_増幅",
              "name": "증폭",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_癒しの響き",
              "name": "치유의 울림",
              "act": [
                "回復=max( 相手の回復 * 0.5, 1 )"
              ],
              "condition": "武器の種類 == 杖 && 相手の回復 > 0 && HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "回復"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_サイレス無効",
              "name": "사일런스 가드",
              "wired": false
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_杖使い＋",
              "name": "지팡이 숙련+",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_杖使い＋＋",
              "name": "지팡이 숙련++",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔防＋５",
              "name": "마방+5",
              "enhance": [
                "Mdef+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ロイ",
      "name": "로이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_踏ん張り",
              "name": "분발",
              "condition": "HP*100 >= (MaxHP * 30)",
              "wired": false
            },
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_イドゥン特効",
              "name": "SID_イドゥン特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_超越",
              "name": "초월",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_踏み込み",
              "name": "진입",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋",
              "name": "분발+",
              "condition": "HP*100 >= (MaxHP * 20)",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋＋",
              "name": "분발++",
              "condition": "HP*100 >= (MaxHP * 10)",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_踏ん張り＋＋＋",
              "name": "분발+++",
              "condition": "HP >= 2",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋６",
              "name": "힘+6",
              "enhance": [
                "Str+6"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手リーフ",
      "name": "리프",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_武器相性激化",
              "name": "급소 회피",
              "act": [
                "相手の威力-3"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ベルド特効",
              "name": "SID_ベルド特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_順応",
              "name": "즉응",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_待ち伏せ",
              "name": "매복",
              "condition": "HP*100 <= MaxHP * 25 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_体格＋４",
              "name": "체격+4",
              "enhance": [
                "Phys+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋",
              "name": "급소 회피+",
              "act": [
                "相手の威力-5"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_待ち伏せ＋",
              "name": "매복+",
              "condition": "HP*100 <= MaxHP * 50 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_体格＋５",
              "name": "체격+5",
              "enhance": [
                "Phys+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_武器相性激化＋＋",
              "name": "급소 회피++",
              "act": [
                "相手の威力-7"
              ],
              "condition": "武器相性 == 有利",
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_待ち伏せ＋＋",
              "name": "매복++",
              "condition": "HP*100 <= MaxHP * 75 && 手番回数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ルキナ",
      "name": "루키나",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_絆の力",
              "name": "듀얼 어택",
              "wired": false
            },
            {
              "sid": "SID_ギムレー特効",
              "name": "SID_ギムレー特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_絆盾",
              "name": "인연 방패",
              "condition": "スキル確率(80)",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_デュアルアシスト",
              "name": "듀얼 어시스트",
              "condition": "スキル所持(\"チェインアタック許可\") && 武器の種類 > 0 && スキル確率(35)",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_デュアルサポート",
              "name": "듀얼 서포트",
              "act": [
                "回避値+隣接支援合計値 * 5"
              ],
              "condition": "周囲の味方数 > 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_デュアルアシスト＋",
              "name": "듀얼 어시스트+",
              "condition": "スキル所持(\"チェインアタック許可\") && 武器の種類 > 0 && スキル確率(70)",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋５",
              "name": "기술+5",
              "enhance": [
                "Tech+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手リン",
      "name": "린",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_攻め立て",
              "name": "연속 공격",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 9",
              "wired": false
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ネルガル特効",
              "name": "SID_ネルガル特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_残像",
              "name": "잔상",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_速さの吸収",
              "name": "속도 흡수",
              "condition": "相手の生存 == 0 && スキル所持( \"速さの増強＋１０\" ) == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_攻め立て＋",
              "name": "연속 공격+",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 7",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_攻め立て＋＋",
              "name": "연속 공격++",
              "condition": "スキル所持( \"追撃不可\" ) == 0 && 総手番回数 == 0 &&  (攻撃速度 - 相手の攻撃速度) >= 5",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋５",
              "name": "속도+5",
              "enhance": [
                "Quick+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手アイク",
      "name": "아이크",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_破壊",
              "name": "파괴",
              "act": [
                "相手のダメージ=相手のHP"
              ],
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_勇将",
              "name": "용장",
              "wired": false
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_アシュナード特効",
              "name": "SID_アシュナード特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_アイクエンゲージスキル",
              "name": "부동",
              "act": [
                "回避値*0"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_引き戻し",
              "name": "데려오기",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_怒り",
              "name": "분노",
              "act": [
                "必殺値+min(MaxHP - HP, 30)"
              ],
              "condition": "HP < MaxHP",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_勇将＋",
              "name": "용장+",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_守備＋５",
              "name": "수비+5",
              "enhance": [
                "Def+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ベレト",
      "name": "벨레트",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_天刻の拍動",
              "name": "천각의 박동",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 30 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ネメシス特効",
              "name": "SID_ネメシス特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_先生",
              "name": "지도",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_師の導き",
              "name": "스승의 인도",
              "wired": false
            }
          ]
        },
        {
          "bond": 6,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_拾得",
              "name": "습득",
              "condition": "スキル確率( 幸運 )",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_天刻の拍動＋",
              "name": "천각의 박동+",
              "act": [
                "攻撃結果=ヒット"
              ],
              "condition": "攻撃結果 == ミス && 神将スキル確率( 50 + 幸運 )",
              "wired": false,
              "unreadActNames": [
                "攻撃結果"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１２",
              "name": "행운+12",
              "enhance": [
                "Luck+12"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手カムイ",
      "name": "카무이",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_竜脈",
              "name": "용맥",
              "wired": false
            },
            {
              "sid": "SID_ハイドラ特効",
              "name": "SID_ハイドラ特効",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_呪縛",
              "name": "주박",
              "condition": "生存",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_スキンシップ",
              "name": "스킨십",
              "act": [
                "相手のHP+5"
              ],
              "condition": "相手のHP < 相手のMaxHP",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_竜呪",
              "name": "용의 저주",
              "condition": "生存 && 相手の生存",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_防陣",
              "name": "방진",
              "act": [
                "ダメージ=0"
              ],
              "condition": "相手の立場 == 援護",
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１２",
              "name": "HP+12",
              "enhance": [
                "Hp+12"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_スキンシップ＋",
              "name": "스킨십+",
              "act": [
                "相手のHP+10"
              ],
              "condition": "相手のHP < 相手のMaxHP",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１５",
              "name": "HP+15",
              "enhance": [
                "Hp+15"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手エイリーク",
      "name": "에이리카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_オルタネイト",
              "name": "얼터네이트",
              "wired": false
            },
            {
              "sid": "SID_月の腕輪",
              "name": "달의 팔찌",
              "act": [
                "威力+相手の守備 * 0.2"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_フォデス特効",
              "name": "SID_フォデス特効",
              "wired": false
            },
            {
              "sid": "SID_月輪",
              "name": "MSID_Moon",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_双聖",
              "name": "쌍성",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_優風",
              "name": "우풍",
              "act": [
                "相手の威力-3"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_月の腕輪＋",
              "name": "달의 팔찌+",
              "act": [
                "威力+相手の守備 * 0.3"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_優風＋",
              "name": "우풍+",
              "act": [
                "相手の威力-5"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手エフラム",
      "name": "에브라임",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_オルタネイト",
              "name": "얼터네이트",
              "wired": false
            },
            {
              "sid": "SID_月の腕輪",
              "name": "달의 팔찌",
              "act": [
                "威力+相手の守備 * 0.2"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_フォデス特効",
              "name": "SID_フォデス特効",
              "wired": false
            },
            {
              "sid": "SID_月輪",
              "name": "MSID_Moon",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_双聖",
              "name": "쌍성",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_優風",
              "name": "우풍",
              "act": [
                "相手の威力-3"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_月の腕輪＋",
              "name": "달의 팔찌+",
              "act": [
                "威力+相手の守備 * 0.3"
              ],
              "condition": "攻撃属性 == 物理属性",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_優風＋",
              "name": "우풍+",
              "act": [
                "相手の威力-5"
              ],
              "wired": false,
              "unreadActNames": [
                "相手の威力"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手リュール",
      "name": "뤼에르",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_リュール邪竜特効",
              "name": "사룡 유효",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_以心",
              "name": "이심",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 5,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            },
            {
              "sid": "SID_絆を繋薙くもの",
              "name": "인연을 잇는 자",
              "condition": "相手の神将レベル != 0",
              "wired": false
            },
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 10,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 20,
          "synchro": [
            {
              "sid": "SID_絆を繋薙くもの＋",
              "name": "인연을 잇는 자+",
              "condition": "相手の神将レベル != 0",
              "wired": false
            },
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１２",
              "name": "HP+12",
              "enhance": [
                "Hp+12"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            },
            {
              "sid": "SID_神竜の加護",
              "name": "신룡의 가호",
              "wired": false
            },
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋１５",
              "name": "HP+15",
              "enhance": [
                "Hp+15"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 21,
          "synchro": [
            {
              "sid": "SID_エレオスの祝福",
              "name": "엘레오스의 축복",
              "act": [
                "必殺値+行動済みの味方数 * 2",
                "必殺回避+行動済みの味方数 * 2"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_エーデルガルト",
      "name": "에델가르트",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ディミトリ",
      "name": "디미트리",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_クロード",
      "name": "클로드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_チキ",
      "name": "치키",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_星玉の加護",
              "name": "성옥의 가호",
              "wired": false
            },
            {
              "sid": "SID_チキ装備中",
              "name": "SID_チキ装備中",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_竜化",
              "name": "용화",
              "enhance": [
                "Hp+10",
                "Str+5",
                "Tech+5",
                "Quick+5",
                "Luck+5",
                "Def+5",
                "Magic+5",
                "Mdef+5",
                "Phys+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_地玉の加護",
              "name": "토옥의 가호",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_命玉の加護",
              "name": "명옥의 가호",
              "act": [
                "HP=min( HP+20, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 10,
          "synchro": [
            {
              "sid": "SID_光玉の加護",
              "name": "광옥의 가호",
              "act": [
                "相手の必殺率*0.5"
              ],
              "condition": "相手の手番回数 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の必殺率"
              ]
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_命玉の加護＋",
              "name": "명옥의 가호+",
              "act": [
                "HP=min( HP+30, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 15,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_地玉の加護＋",
              "name": "토옥의 가호+",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_命玉の加護＋＋",
              "name": "명옥의 가호++",
              "act": [
                "HP=min( HP+40, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "name": "헥터",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_体格＋１",
              "name": "MSID_Phy_1",
              "enhance": [
                "Phys+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切り返し",
              "name": "받아치기",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*80 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_鉄壁",
              "name": "철벽",
              "act": [
                "守備*1.3",
                "魔防*1.3"
              ],
              "wired": false,
              "unreadActNames": [
                "守備",
                "魔防"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_適応能力",
              "name": "적응 능력",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_体格＋２",
              "name": "MSID_Phy_2",
              "enhance": [
                "Phys+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_重撃",
              "name": "중격",
              "act": [
                "威力+min(武器の重さ - 体格, 5)"
              ],
              "condition": "攻撃属性 == 物理属性 && 武器の重さ > 体格 && 手番回数 > 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_角の睨み",
              "name": "모퉁이 견제",
              "act": [
                "HP-MaxHP*0.2"
              ],
              "condition": "HP == MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_切り返し＋",
              "name": "받아치기+",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*60 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_守備＋５",
              "name": "수비+5",
              "enhance": [
                "Def+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_適応能力＋",
              "name": "적응 능력+",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ヴェロニカ",
      "name": "베로니카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_血讐",
              "name": "피의 복수",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.3"
              ],
              "condition": "( ( MaxHP - HP ) * 30 ) >= 100",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_契約",
              "name": "계약",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_異界の力",
              "name": "이계의 힘",
              "condition": "スキル所持( \"異界の力_科\" ) == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_限界突破",
              "name": "한계 돌파",
              "condition": "( ( 相手のレベル + cond( 相手の兵種ランク == 上級職, 20, 0 ) ) > ( レベル + cond( 兵種ランク == 上級職, 20, 0 ) ) )",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_SPコンバート",
              "name": "SP 컨버트",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_血讐＋",
              "name": "피의 복수+",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.5"
              ],
              "condition": "( ( MaxHP - HP ) * 50 ) >= 100",
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔力＋５",
              "name": "마력+5",
              "enhance": [
                "Magic+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_セネリオ",
      "name": "세네리오",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_囮指名",
              "name": "미끼 지명",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_陽光",
              "name": "양광",
              "act": [
                "相手の魔防*0.8"
              ],
              "condition": "武器の種類 == 魔道書",
              "wired": false,
              "unreadActNames": [
                "相手の魔防"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_理魔法＋",
              "name": "이론의 진수",
              "wired": false
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_慧眼",
              "name": "혜안",
              "act": [
                "相手のダメージ+5"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_復帰阻止",
              "name": "복귀 저지",
              "condition": "武器の種類 == 魔道書 && 相手のスキル所持(\"気絶\") && 相手のスキル所持(\"気絶継続\") == 0 && スキル確率( min( max( 速さ - 相手の速さ, 0 ) * 5, 50 ) )",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_慧眼＋",
              "name": "혜안+",
              "act": [
                "相手のダメージ+7"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔防＋５",
              "name": "마방+5",
              "enhance": [
                "Mdef+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_カミラ",
      "name": "카밀라",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_竜脈・異",
              "name": "용맥·암",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_天駆",
              "name": "천구",
              "enhance": [
                "Move+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_後始末",
              "name": "마무리",
              "act": [
                "相手のHP=max(相手のHP - 5, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_デトックス",
              "name": "디톡스",
              "condition": "スキル所持(\"毒\") || スキル所持(\"猛毒\") || スキル所持(\"劇毒\")",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_地脈吸収",
              "name": "지맥 흡수",
              "act": [
                "HP+10"
              ],
              "condition": "配置除去可能",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_後始末＋",
              "name": "마무리+",
              "act": [
                "相手のHP=max(相手のHP - 10, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋５",
              "name": "속도+5",
              "enhance": [
                "Quick+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_クロム",
      "name": "크롬",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_不意打ち",
              "name": "기습",
              "act": [
                "相手の手番回数=0"
              ],
              "condition": "地形回避 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の手番回数"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_半身",
              "name": "반신",
              "enhance": [
                "Magic+10"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_七色の叫び",
              "name": "무지개색 외침",
              "wired": false
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_力まかせ",
              "name": "전력투구",
              "act": [
                "相手のダメージ*4 / 3"
              ],
              "condition": "攻撃結果(必殺) && 攻撃属性 == 物理属性",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_カリスマ",
              "name": "카리스마",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_七色の叫び＋",
              "name": "무지개색 외침+",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋５",
              "name": "기술+5",
              "enhance": [
                "Tech+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_ルフレ",
      "name": "러플레",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_不意打ち",
              "name": "기습",
              "act": [
                "相手の手番回数=0"
              ],
              "condition": "地形回避 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の手番回数"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_半身",
              "name": "반신",
              "enhance": [
                "Magic+10"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_七色の叫び",
              "name": "무지개색 외침",
              "wired": false
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_力まかせ",
              "name": "전력투구",
              "act": [
                "相手のダメージ*4 / 3"
              ],
              "condition": "攻撃結果(必殺) && 攻撃属性 == 物理属性",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_カリスマ",
              "name": "카리스마",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_七色の叫び＋",
              "name": "무지개색 외침+",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋５",
              "name": "기술+5",
              "enhance": [
                "Tech+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E001_敵チキ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_命玉の加護",
              "name": "명옥의 가호",
              "act": [
                "HP=min( HP+20, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            },
            {
              "sid": "SID_地玉の加護",
              "name": "토옥의 가호",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_竜化",
              "name": "용화",
              "enhance": [
                "Hp+10",
                "Str+5",
                "Tech+5",
                "Quick+5",
                "Luck+5",
                "Def+5",
                "Magic+5",
                "Mdef+5",
                "Phys+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E002_敵ヘクトル",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切り返し",
              "name": "받아치기",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*80 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            },
            {
              "sid": "SID_適応能力",
              "name": "적응 능력",
              "wired": false
            },
            {
              "sid": "SID_角の睨み",
              "name": "모퉁이 견제",
              "act": [
                "HP-MaxHP*0.2"
              ],
              "condition": "HP == MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_鉄壁",
              "name": "철벽",
              "act": [
                "守備*1.3",
                "魔防*1.3"
              ],
              "wired": false,
              "unreadActNames": [
                "守備",
                "魔防"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E003_敵ヴェロニカ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_血讐",
              "name": "피의 복수",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.3"
              ],
              "condition": "( ( MaxHP - HP ) * 30 ) >= 100",
              "wired": true
            },
            {
              "sid": "SID_限界突破",
              "name": "한계 돌파",
              "condition": "( ( 相手のレベル + cond( 相手の兵種ランク == 上級職, 20, 0 ) ) > ( レベル + cond( 兵種ランク == 上級職, 20, 0 ) ) )",
              "wired": false
            },
            {
              "sid": "SID_異界の力",
              "name": "이계의 힘",
              "condition": "スキル所持( \"異界の力_科\" ) == 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_契約",
              "name": "계약",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E004_敵セネリオ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_理魔法＋",
              "name": "이론의 진수",
              "wired": false
            },
            {
              "sid": "SID_慧眼",
              "name": "혜안",
              "act": [
                "相手のダメージ+5"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_陽光_闇",
              "name": "양광",
              "act": [
                "HP=HP"
              ],
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E004_敵カミラ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_竜脈・異",
              "name": "용맥·암",
              "wired": false
            },
            {
              "sid": "SID_後始末",
              "name": "마무리",
              "act": [
                "相手のHP=max(相手のHP - 5, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            },
            {
              "sid": "SID_デトックス",
              "name": "디톡스",
              "condition": "スキル所持(\"毒\") || スキル所持(\"猛毒\") || スキル所持(\"劇毒\")",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_天駆",
              "name": "천구",
              "enhance": [
                "Move+2"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E005_敵クロム",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_不意打ち",
              "name": "기습",
              "act": [
                "相手の手番回数=0"
              ],
              "condition": "地形回避 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の手番回数"
              ]
            },
            {
              "sid": "SID_力まかせ",
              "name": "전력투구",
              "act": [
                "相手のダメージ*4 / 3"
              ],
              "condition": "攻撃結果(必殺) && 攻撃属性 == 物理属性",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_カリスマ",
              "name": "카리스마",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_半身",
              "name": "반신",
              "enhance": [
                "Magic+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E005_敵ヘクトル",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切り返し＋",
              "name": "받아치기+",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*60 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            },
            {
              "sid": "SID_適応能力",
              "name": "적응 능력",
              "wired": false
            },
            {
              "sid": "SID_重撃",
              "name": "중격",
              "act": [
                "威力+min(武器の重さ - 体格, 5)"
              ],
              "condition": "攻撃属性 == 物理属性 && 武器の重さ > 体格 && 手番回数 > 0",
              "wired": true
            },
            {
              "sid": "SID_角の睨み",
              "name": "모퉁이 견제",
              "act": [
                "HP-MaxHP*0.2"
              ],
              "condition": "HP == MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_鉄壁",
              "name": "철벽",
              "act": [
                "守備*1.3",
                "魔防*1.3"
              ],
              "wired": false,
              "unreadActNames": [
                "守備",
                "魔防"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E005_敵ヴェロニカ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_血讐",
              "name": "피의 복수",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.3"
              ],
              "condition": "( ( MaxHP - HP ) * 30 ) >= 100",
              "wired": true
            },
            {
              "sid": "SID_限界突破",
              "name": "한계 돌파",
              "condition": "( ( 相手のレベル + cond( 相手の兵種ランク == 上級職, 20, 0 ) ) > ( レベル + cond( 兵種ランク == 上級職, 20, 0 ) ) )",
              "wired": false
            },
            {
              "sid": "SID_異界の力",
              "name": "이계의 힘",
              "condition": "スキル所持( \"異界の力_科\" ) == 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_契約",
              "name": "계약",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵チキ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_光玉の加護",
              "name": "광옥의 가호",
              "act": [
                "相手の必殺率*0.5"
              ],
              "condition": "相手の手番回数 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の必殺率"
              ]
            },
            {
              "sid": "SID_命玉の加護＋＋",
              "name": "명옥의 가호++",
              "act": [
                "HP=min( HP+40, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            },
            {
              "sid": "SID_地玉の加護＋",
              "name": "토옥의 가호+",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_竜化",
              "name": "용화",
              "enhance": [
                "Hp+10",
                "Str+5",
                "Tech+5",
                "Quick+5",
                "Luck+5",
                "Def+5",
                "Magic+5",
                "Mdef+5",
                "Phys+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵ヘクトル",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切り返し＋",
              "name": "받아치기+",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*60 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            },
            {
              "sid": "SID_適応能力",
              "name": "적응 능력",
              "wired": false
            },
            {
              "sid": "SID_重撃",
              "name": "중격",
              "act": [
                "威力+min(武器の重さ - 体格, 5)"
              ],
              "condition": "攻撃属性 == 物理属性 && 武器の重さ > 体格 && 手番回数 > 0",
              "wired": true
            },
            {
              "sid": "SID_角の睨み",
              "name": "모퉁이 견제",
              "act": [
                "HP-MaxHP*0.2"
              ],
              "condition": "HP == MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_鉄壁",
              "name": "철벽",
              "act": [
                "守備*1.3",
                "魔防*1.3"
              ],
              "wired": false,
              "unreadActNames": [
                "守備",
                "魔防"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵ヴェロニカ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_血讐＋",
              "name": "피의 복수+",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.5"
              ],
              "condition": "( ( MaxHP - HP ) * 50 ) >= 100",
              "wired": true
            },
            {
              "sid": "SID_限界突破",
              "name": "한계 돌파",
              "condition": "( ( 相手のレベル + cond( 相手の兵種ランク == 上級職, 20, 0 ) ) > ( レベル + cond( 兵種ランク == 上級職, 20, 0 ) ) )",
              "wired": false
            },
            {
              "sid": "SID_異界の力",
              "name": "이계의 힘",
              "condition": "スキル所持( \"異界の力_科\" ) == 0",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_契約",
              "name": "계약",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵セネリオ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_理魔法＋",
              "name": "이론의 진수",
              "wired": false
            },
            {
              "sid": "SID_慧眼＋",
              "name": "혜안+",
              "act": [
                "相手のダメージ+7"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_復帰阻止",
              "name": "복귀 저지",
              "condition": "武器の種類 == 魔道書 && 相手のスキル所持(\"気絶\") && 相手のスキル所持(\"気絶継続\") == 0 && スキル確率( min( max( 速さ - 相手の速さ, 0 ) * 5, 50 ) )",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_陽光_闇",
              "name": "양광",
              "act": [
                "HP=HP"
              ],
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵カミラ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_竜脈・異",
              "name": "용맥·암",
              "wired": false
            },
            {
              "sid": "SID_後始末＋",
              "name": "마무리+",
              "act": [
                "相手のHP=max(相手のHP - 10, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            },
            {
              "sid": "SID_デトックス",
              "name": "디톡스",
              "condition": "スキル所持(\"毒\") || スキル所持(\"猛毒\") || スキル所持(\"劇毒\")",
              "wired": false
            },
            {
              "sid": "SID_地脈吸収",
              "name": "지맥 흡수",
              "act": [
                "HP+10"
              ],
              "condition": "配置除去可能",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_天駆",
              "name": "천구",
              "enhance": [
                "Move+2"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵クロム",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_不意打ち",
              "name": "기습",
              "act": [
                "相手の手番回数=0"
              ],
              "condition": "地形回避 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の手番回数"
              ]
            },
            {
              "sid": "SID_力まかせ",
              "name": "전력투구",
              "act": [
                "相手のダメージ*4 / 3"
              ],
              "condition": "攻撃結果(必殺) && 攻撃属性 == 物理属性",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            },
            {
              "sid": "SID_カリスマ",
              "name": "카리스마",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_半身",
              "name": "반신",
              "enhance": [
                "Magic+10"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵エーデルガルト",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            },
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵ディミトリ",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            },
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_E006_敵クロード",
      "name": "???",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            },
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手エーデルガルト",
      "name": "에델가르트",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ディミトリ",
      "name": "디미트리",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手クロード",
      "name": "클로드",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切磋琢磨",
              "name": "절차탁마",
              "wired": false
            },
            {
              "sid": "SID_計略",
              "name": "계략",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_戦技",
              "name": "전투 기술",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_血統",
              "name": "혈통",
              "act": [
                "取得経験*1.2"
              ],
              "wired": false,
              "unreadActNames": [
                "取得経験"
              ]
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_武器シンクロ",
              "name": "무기 싱크로",
              "act": [
                "攻撃力+5"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_武器シンクロ＋",
              "name": "무기 싱크로+",
              "act": [
                "攻撃力+7"
              ],
              "condition": "エンゲージ中 || ( スキル所持(\"チキ装備中\") == 0 && 武器の種類 == 紋章士の得意武器 ) || ( スキル所持(\"チキ装備中\") == 1 && スキル所持(\"追加アイテム1\") == 1 )",
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_力＋５",
              "name": "힘+5",
              "enhance": [
                "Str+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手チキ",
      "name": "치키",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_守備＋１",
              "name": "수비+1",
              "enhance": [
                "Def+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_星玉の加護",
              "name": "성옥의 가호",
              "wired": false
            },
            {
              "sid": "SID_チキ装備中",
              "name": "SID_チキ装備中",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_竜化",
              "name": "용화",
              "enhance": [
                "Hp+10",
                "Str+5",
                "Tech+5",
                "Quick+5",
                "Luck+5",
                "Def+5",
                "Magic+5",
                "Mdef+5",
                "Phys+5"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_地玉の加護",
              "name": "토옥의 가호",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_命玉の加護",
              "name": "명옥의 가호",
              "act": [
                "HP=min( HP+20, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 10,
          "synchro": [
            {
              "sid": "SID_光玉の加護",
              "name": "광옥의 가호",
              "act": [
                "相手の必殺率*0.5"
              ],
              "condition": "相手の手番回数 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の必殺率"
              ]
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋１０",
              "name": "HP+10",
              "enhance": [
                "Hp+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_命玉の加護＋",
              "name": "명옥의 가호+",
              "act": [
                "HP=min( HP+30, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 15,
          "synchro": [
            {
              "sid": "SID_幸運＋８",
              "name": "행운+8",
              "enhance": [
                "Luck+8"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_地玉の加護＋",
              "name": "토옥의 가호+",
              "condition": "周囲の味方数 > 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_幸運＋１０",
              "name": "행운+10",
              "enhance": [
                "Luck+10"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_命玉の加護＋＋",
              "name": "명옥의 가호++",
              "act": [
                "HP=min( HP+40, MaxHP )"
              ],
              "condition": "HP < MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "name": "헥터",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_守備＋２",
              "name": "수비+2",
              "enhance": [
                "Def+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_体格＋１",
              "name": "MSID_Phy_1",
              "enhance": [
                "Phys+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_切り返し",
              "name": "받아치기",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*80 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_鉄壁",
              "name": "철벽",
              "act": [
                "守備*1.3",
                "魔防*1.3"
              ],
              "wired": false,
              "unreadActNames": [
                "守備",
                "魔防"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_適応能力",
              "name": "적응 능력",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_守備＋３",
              "name": "수비+3",
              "enhance": [
                "Def+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_体格＋２",
              "name": "MSID_Phy_2",
              "enhance": [
                "Phys+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_重撃",
              "name": "중격",
              "act": [
                "威力+min(武器の重さ - 体格, 5)"
              ],
              "condition": "攻撃属性 == 物理属性 && 武器の重さ > 体格 && 手番回数 > 0",
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_角の睨み",
              "name": "모퉁이 견제",
              "act": [
                "HP-MaxHP*0.2"
              ],
              "condition": "HP == MaxHP",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_守備＋４",
              "name": "수비+4",
              "enhance": [
                "Def+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_力＋４",
              "name": "힘+4",
              "enhance": [
                "Str+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_切り返し＋",
              "name": "받아치기+",
              "act": [
                "手番回数=2"
              ],
              "condition": "( HP*100 >= MaxHP*60 ) && 手番回数 == 1 && スキル所持(\"追撃不可\") == 0",
              "wired": false,
              "unreadActNames": [
                "手番回数"
              ]
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_体格＋３",
              "name": "체격+3",
              "enhance": [
                "Phys+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_守備＋５",
              "name": "수비+5",
              "enhance": [
                "Def+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_適応能力＋",
              "name": "적응 능력+",
              "wired": false
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手ヴェロニカ",
      "name": "베로니카",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_幸運＋２",
              "name": "행운+2",
              "enhance": [
                "Luck+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_血讐",
              "name": "피의 복수",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.3"
              ],
              "condition": "( ( MaxHP - HP ) * 30 ) >= 100",
              "wired": true
            }
          ],
          "engaged": [
            {
              "sid": "SID_契約",
              "name": "계약",
              "wired": false
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_異界の力",
              "name": "이계의 힘",
              "condition": "スキル所持( \"異界の力_科\" ) == 0",
              "wired": false
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_幸運＋４",
              "name": "행운+4",
              "enhance": [
                "Luck+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_限界突破",
              "name": "한계 돌파",
              "condition": "( ( 相手のレベル + cond( 相手の兵種ランク == 上級職, 20, 0 ) ) > ( レベル + cond( 兵種ランク == 上級職, 20, 0 ) ) )",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_幸運＋６",
              "name": "행운+6",
              "enhance": [
                "Luck+6"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_SPコンバート",
              "name": "SP 컨버트",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_血讐＋",
              "name": "피의 복수+",
              "act": [
                "攻撃力+( MaxHP - HP ) * 0.5"
              ],
              "condition": "( ( MaxHP - HP ) * 50 ) >= 100",
              "wired": true
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔力＋５",
              "name": "마력+5",
              "enhance": [
                "Magic+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手セネリオ",
      "name": "세네리오",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔力＋１",
              "name": "MSID_Mag_1",
              "enhance": [
                "Magic+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_技＋１",
              "name": "기술+1",
              "enhance": [
                "Tech+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_囮指名",
              "name": "미끼 지명",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_陽光",
              "name": "양광",
              "act": [
                "相手の魔防*0.8"
              ],
              "condition": "武器の種類 == 魔道書",
              "wired": false,
              "unreadActNames": [
                "相手の魔防"
              ]
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔力＋２",
              "name": "마력+2",
              "enhance": [
                "Magic+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_理魔法＋",
              "name": "이론의 진수",
              "wired": false
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_魔力＋３",
              "name": "마력+3",
              "enhance": [
                "Magic+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_慧眼",
              "name": "혜안",
              "act": [
                "相手のダメージ+5"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_復帰阻止",
              "name": "복귀 저지",
              "condition": "武器の種類 == 魔道書 && 相手のスキル所持(\"気絶\") && 相手のスキル所持(\"気絶継続\") == 0 && スキル確率( min( max( 速さ - 相手の速さ, 0 ) * 5, 50 ) )",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_魔力＋４",
              "name": "마력+4",
              "enhance": [
                "Magic+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_慧眼＋",
              "name": "혜안+",
              "act": [
                "相手のダメージ+7"
              ],
              "condition": "攻撃結果( 特効 ) ",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_魔防＋５",
              "name": "마방+5",
              "enhance": [
                "Mdef+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手カミラ",
      "name": "카밀라",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_魔防＋１",
              "name": "MSID_Res_1",
              "enhance": [
                "Mdef+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_ＨＰ＋３",
              "name": "MSID_Hp_3",
              "enhance": [
                "Hp+3"
              ],
              "wired": true
            },
            {
              "sid": "SID_竜脈・異",
              "name": "용맥·암",
              "wired": false
            }
          ],
          "engaged": [
            {
              "sid": "SID_天駆",
              "name": "천구",
              "enhance": [
                "Move+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_魔防＋２",
              "name": "마방+2",
              "enhance": [
                "Mdef+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋５",
              "name": "HP+5",
              "enhance": [
                "Hp+5"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_後始末",
              "name": "마무리",
              "act": [
                "相手のHP=max(相手のHP - 5, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_デトックス",
              "name": "디톡스",
              "condition": "スキル所持(\"毒\") || スキル所持(\"猛毒\") || スキル所持(\"劇毒\")",
              "wired": false
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_魔防＋３",
              "name": "마방+3",
              "enhance": [
                "Mdef+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_地脈吸収",
              "name": "지맥 흡수",
              "act": [
                "HP+10"
              ],
              "condition": "配置除去可能",
              "wired": false,
              "unreadActNames": [
                "HP"
              ]
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_ＨＰ＋７",
              "name": "HP+7",
              "enhance": [
                "Hp+7"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 16,
          "synchro": [
            {
              "sid": "SID_魔防＋４",
              "name": "마방+4",
              "enhance": [
                "Mdef+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_後始末＋",
              "name": "마무리+",
              "act": [
                "相手のHP=max(相手のHP - 10, cond(相手のスキル所持(\"ダメージ無効化\") || 相手のスキル所持(\"バリア４\") || 相手のスキル所持(\"死亡回避\") || スキル所持(\"慈悲\"), 1, 0))"
              ],
              "condition": "生存 && 相手のHP > 0 && 総攻撃結果(必殺)",
              "wired": false,
              "unreadActNames": [
                "相手のHP"
              ]
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_速さ＋５",
              "name": "속도+5",
              "enhance": [
                "Quick+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    },
    {
      "gid": "GID_相手クロム",
      "name": "크롬",
      "levels": [
        {
          "bond": 1,
          "synchro": [
            {
              "sid": "SID_技＋２",
              "name": "기술+2",
              "enhance": [
                "Tech+2"
              ],
              "wired": true
            },
            {
              "sid": "SID_速さ＋１",
              "name": "속도+1",
              "enhance": [
                "Quick+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_力＋１",
              "name": "힘+1",
              "enhance": [
                "Str+1"
              ],
              "wired": true
            },
            {
              "sid": "SID_不意打ち",
              "name": "기습",
              "act": [
                "相手の手番回数=0"
              ],
              "condition": "地形回避 > 0",
              "wired": false,
              "unreadActNames": [
                "相手の手番回数"
              ]
            }
          ],
          "engaged": [
            {
              "sid": "SID_半身",
              "name": "반신",
              "enhance": [
                "Magic+10"
              ],
              "wired": true
            },
            {
              "sid": "SID_敵エンゲージ技ダメージ軽減",
              "name": "SID_敵エンゲージ技ダメージ軽減",
              "act": [
                "ダメージ-ダメージ * 0.2"
              ],
              "wired": false,
              "unreadActNames": [
                "ダメージ"
              ]
            }
          ]
        },
        {
          "bond": 2,
          "synchro": [
            {
              "sid": "SID_速さ＋２",
              "name": "속도+2",
              "enhance": [
                "Quick+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 3,
          "synchro": [
            {
              "sid": "SID_力＋２",
              "name": "힘+2",
              "enhance": [
                "Str+2"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 4,
          "synchro": [
            {
              "sid": "SID_七色の叫び",
              "name": "무지개색 외침",
              "wired": false
            }
          ]
        },
        {
          "bond": 7,
          "synchro": [
            {
              "sid": "SID_技＋３",
              "name": "기술+3",
              "enhance": [
                "Tech+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 8,
          "synchro": [
            {
              "sid": "SID_力まかせ",
              "name": "전력투구",
              "act": [
                "相手のダメージ*4 / 3"
              ],
              "condition": "攻撃結果(必殺) && 攻撃属性 == 物理属性",
              "wired": false,
              "unreadActNames": [
                "相手のダメージ"
              ]
            }
          ]
        },
        {
          "bond": 9,
          "synchro": [
            {
              "sid": "SID_速さ＋３",
              "name": "속도+3",
              "enhance": [
                "Quick+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 12,
          "synchro": [
            {
              "sid": "SID_力＋３",
              "name": "힘+3",
              "enhance": [
                "Str+3"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 13,
          "synchro": [
            {
              "sid": "SID_カリスマ",
              "name": "카리스마",
              "wired": false
            }
          ]
        },
        {
          "bond": 14,
          "synchro": [
            {
              "sid": "SID_技＋４",
              "name": "기술+4",
              "enhance": [
                "Tech+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 17,
          "synchro": [
            {
              "sid": "SID_速さ＋４",
              "name": "속도+4",
              "enhance": [
                "Quick+4"
              ],
              "wired": true
            }
          ]
        },
        {
          "bond": 18,
          "synchro": [
            {
              "sid": "SID_七色の叫び＋",
              "name": "무지개색 외침+",
              "wired": false
            }
          ]
        },
        {
          "bond": 19,
          "synchro": [
            {
              "sid": "SID_技＋５",
              "name": "기술+5",
              "enhance": [
                "Tech+5"
              ],
              "wired": true
            }
          ]
        }
      ]
    }
  ],
  "unwiredCount": 166,
  "unwired": [
    {
      "gid": "GID_マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_マルス",
      "bond": 7,
      "kind": "synchro",
      "sid": "SID_不屈",
      "name": "불굴",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_マルス",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_不屈＋",
      "name": "불굴+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_マルス",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_不屈＋＋",
      "name": "불굴++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_シグルド",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_セリカ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_異形リベンジ",
      "name": "이형 리벤지",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_セリカ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_セリカ",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_異形リベンジ＋",
      "name": "이형 리벤지+",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_セリカ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_異形リベンジ＋＋",
      "name": "이형 리벤지++",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_ミカヤ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ミカヤ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_癒しの響き",
      "name": "치유의 울림",
      "unreadActNames": [
        "回復"
      ]
    },
    {
      "gid": "GID_ロイ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_リーフ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_武器相性激化",
      "name": "급소 회피",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_リーフ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_リーフ",
      "bond": 7,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋",
      "name": "급소 회피+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_リーフ",
      "bond": 16,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋＋",
      "name": "급소 회피++",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_ルキナ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_リン",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_アイク",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_破壊",
      "name": "파괴",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_アイク",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ベレト",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_天刻の拍動",
      "name": "천각의 박동",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_ベレト",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ベレト",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_天刻の拍動＋",
      "name": "천각의 박동+",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_カムイ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_カムイ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_スキンシップ",
      "name": "스킨십",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_カムイ",
      "bond": 13,
      "kind": "synchro",
      "sid": "SID_防陣",
      "name": "방진",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_カムイ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_スキンシップ＋",
      "name": "스킨십+",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_エイリーク",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_エイリーク",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_優風",
      "name": "우풍",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_エイリーク",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_優風＋",
      "name": "우풍+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_エフラム",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_エフラム",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_優風",
      "name": "우풍",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_エフラム",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_優風＋",
      "name": "우풍+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_リュール",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_M008_敵リーフ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋",
      "name": "급소 회피+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_M010_敵ベレト",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_天刻の拍動",
      "name": "천각의 박동",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_M011_敵マルス",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不屈＋",
      "name": "불굴+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_M011_敵マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_M011_敵リーフ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋",
      "name": "급소 회피+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_M014_敵ベレト",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_天刻の拍動＋",
      "name": "천각의 박동+",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_M017_敵マルス",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不屈＋",
      "name": "불굴+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_M017_敵マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_M017_敵リーフ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋",
      "name": "급소 회피+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_M020_敵セリカ",
      "bond": 2,
      "kind": "synchro",
      "sid": "SID_異形リベンジ＋＋_闇",
      "name": "리벤지",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_M021_敵マルス",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不屈＋＋",
      "name": "불굴++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_M021_敵マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_M024_敵マルス",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不屈＋＋",
      "name": "불굴++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_M024_敵マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_相手マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_カウンター",
      "name": "신속",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_相手マルス",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手マルス",
      "bond": 7,
      "kind": "synchro",
      "sid": "SID_不屈",
      "name": "불굴",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手マルス",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_不屈＋",
      "name": "불굴+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手マルス",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_不屈＋＋",
      "name": "불굴++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手シグルド",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手セリカ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_異形リベンジ",
      "name": "이형 리벤지",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手セリカ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手セリカ",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_異形リベンジ＋",
      "name": "이형 리벤지+",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手セリカ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_異形リベンジ＋＋",
      "name": "이형 리벤지++",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手ミカヤ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手ミカヤ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_癒しの響き",
      "name": "치유의 울림",
      "unreadActNames": [
        "回復"
      ]
    },
    {
      "gid": "GID_相手ロイ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手リーフ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_武器相性激化",
      "name": "급소 회피",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手リーフ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手リーフ",
      "bond": 7,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋",
      "name": "급소 회피+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手リーフ",
      "bond": 16,
      "kind": "synchro",
      "sid": "SID_武器相性激化＋＋",
      "name": "급소 회피++",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手ルキナ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手リン",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手アイク",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_破壊",
      "name": "파괴",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手アイク",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手ベレト",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_天刻の拍動",
      "name": "천각의 박동",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_相手ベレト",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手ベレト",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_天刻の拍動＋",
      "name": "천각의 박동+",
      "unreadActNames": [
        "攻撃結果"
      ]
    },
    {
      "gid": "GID_相手カムイ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手カムイ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_スキンシップ",
      "name": "스킨십",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_相手カムイ",
      "bond": 13,
      "kind": "synchro",
      "sid": "SID_防陣",
      "name": "방진",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手カムイ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_スキンシップ＋",
      "name": "스킨십+",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_相手エイリーク",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手エイリーク",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_優風",
      "name": "우풍",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手エイリーク",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_優風＋",
      "name": "우풍+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手エフラム",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手エフラム",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_優風",
      "name": "우풍",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手エフラム",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_優風＋",
      "name": "우풍+",
      "unreadActNames": [
        "相手の威力"
      ]
    },
    {
      "gid": "GID_相手リュール",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_エーデルガルト",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_エーデルガルト",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_ディミトリ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ディミトリ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_クロード",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_クロード",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_チキ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_チキ",
      "bond": 8,
      "kind": "synchro",
      "sid": "SID_命玉の加護",
      "name": "명옥의 가호",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_チキ",
      "bond": 10,
      "kind": "synchro",
      "sid": "SID_光玉の加護",
      "name": "광옥의 가호",
      "unreadActNames": [
        "相手の必殺率"
      ]
    },
    {
      "gid": "GID_チキ",
      "bond": 14,
      "kind": "synchro",
      "sid": "SID_命玉の加護＋",
      "name": "명옥의 가호+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_チキ",
      "bond": 19,
      "kind": "synchro",
      "sid": "SID_命玉の加護＋＋",
      "name": "명옥의 가호++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_切り返し",
      "name": "받아치기",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_鉄壁",
      "name": "철벽",
      "unreadActNames": [
        "守備",
        "魔防"
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_角の睨み",
      "name": "모퉁이 견제",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_ヘクトル",
      "bond": 16,
      "kind": "synchro",
      "sid": "SID_切り返し＋",
      "name": "받아치기+",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_ヴェロニカ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_陽光",
      "name": "양광",
      "unreadActNames": [
        "相手の魔防"
      ]
    },
    {
      "gid": "GID_セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_セネリオ",
      "bond": 9,
      "kind": "synchro",
      "sid": "SID_慧眼",
      "name": "혜안",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_セネリオ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_慧眼＋",
      "name": "혜안+",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_カミラ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_カミラ",
      "bond": 4,
      "kind": "synchro",
      "sid": "SID_後始末",
      "name": "마무리",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_カミラ",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_地脈吸収",
      "name": "지맥 흡수",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_カミラ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_後始末＋",
      "name": "마무리+",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不意打ち",
      "name": "기습",
      "unreadActNames": [
        "相手の手番回数"
      ]
    },
    {
      "gid": "GID_クロム",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_クロム",
      "bond": 8,
      "kind": "synchro",
      "sid": "SID_力まかせ",
      "name": "전력투구",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_ルフレ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不意打ち",
      "name": "기습",
      "unreadActNames": [
        "相手の手番回数"
      ]
    },
    {
      "gid": "GID_ルフレ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_ルフレ",
      "bond": 8,
      "kind": "synchro",
      "sid": "SID_力まかせ",
      "name": "전력투구",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_E001_敵チキ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_命玉の加護",
      "name": "명옥의 가호",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E002_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_切り返し",
      "name": "받아치기",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_E002_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_角の睨み",
      "name": "모퉁이 견제",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E002_敵ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_鉄壁",
      "name": "철벽",
      "unreadActNames": [
        "守備",
        "魔防"
      ]
    },
    {
      "gid": "GID_E004_敵セネリオ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_慧眼",
      "name": "혜안",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_E004_敵セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_陽光_闇",
      "name": "양광",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E004_敵カミラ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_後始末",
      "name": "마무리",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_E005_敵クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不意打ち",
      "name": "기습",
      "unreadActNames": [
        "相手の手番回数"
      ]
    },
    {
      "gid": "GID_E005_敵クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_力まかせ",
      "name": "전력투구",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_E005_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_切り返し＋",
      "name": "받아치기+",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_E005_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_角の睨み",
      "name": "모퉁이 견제",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E005_敵ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_鉄壁",
      "name": "철벽",
      "unreadActNames": [
        "守備",
        "魔防"
      ]
    },
    {
      "gid": "GID_E006_敵チキ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_光玉の加護",
      "name": "광옥의 가호",
      "unreadActNames": [
        "相手の必殺率"
      ]
    },
    {
      "gid": "GID_E006_敵チキ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_命玉の加護＋＋",
      "name": "명옥의 가호++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E006_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_切り返し＋",
      "name": "받아치기+",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_E006_敵ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_角の睨み",
      "name": "모퉁이 견제",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E006_敵ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_鉄壁",
      "name": "철벽",
      "unreadActNames": [
        "守備",
        "魔防"
      ]
    },
    {
      "gid": "GID_E006_敵セネリオ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_慧眼＋",
      "name": "혜안+",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_E006_敵セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_陽光_闇",
      "name": "양광",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E006_敵カミラ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_後始末＋",
      "name": "마무리+",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_E006_敵カミラ",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_地脈吸収",
      "name": "지맥 흡수",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_E006_敵クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不意打ち",
      "name": "기습",
      "unreadActNames": [
        "相手の手番回数"
      ]
    },
    {
      "gid": "GID_E006_敵クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_力まかせ",
      "name": "전력투구",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手エーデルガルト",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手エーデルガルト",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_相手ディミトリ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手ディミトリ",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_相手クロード",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手クロード",
      "bond": 3,
      "kind": "synchro",
      "sid": "SID_血統",
      "name": "혈통",
      "unreadActNames": [
        "取得経験"
      ]
    },
    {
      "gid": "GID_相手チキ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手チキ",
      "bond": 8,
      "kind": "synchro",
      "sid": "SID_命玉の加護",
      "name": "명옥의 가호",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手チキ",
      "bond": 10,
      "kind": "synchro",
      "sid": "SID_光玉の加護",
      "name": "광옥의 가호",
      "unreadActNames": [
        "相手の必殺率"
      ]
    },
    {
      "gid": "GID_相手チキ",
      "bond": 14,
      "kind": "synchro",
      "sid": "SID_命玉の加護＋",
      "name": "명옥의 가호+",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手チキ",
      "bond": 19,
      "kind": "synchro",
      "sid": "SID_命玉の加護＋＋",
      "name": "명옥의 가호++",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_切り返し",
      "name": "받아치기",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_鉄壁",
      "name": "철벽",
      "unreadActNames": [
        "守備",
        "魔防"
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_角の睨み",
      "name": "모퉁이 견제",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手ヘクトル",
      "bond": 16,
      "kind": "synchro",
      "sid": "SID_切り返し＋",
      "name": "받아치기+",
      "unreadActNames": [
        "手番回数"
      ]
    },
    {
      "gid": "GID_相手ヴェロニカ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_陽光",
      "name": "양광",
      "unreadActNames": [
        "相手の魔防"
      ]
    },
    {
      "gid": "GID_相手セネリオ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手セネリオ",
      "bond": 9,
      "kind": "synchro",
      "sid": "SID_慧眼",
      "name": "혜안",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手セネリオ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_慧眼＋",
      "name": "혜안+",
      "unreadActNames": [
        "相手のダメージ"
      ]
    },
    {
      "gid": "GID_相手カミラ",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手カミラ",
      "bond": 4,
      "kind": "synchro",
      "sid": "SID_後始末",
      "name": "마무리",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_相手カミラ",
      "bond": 12,
      "kind": "synchro",
      "sid": "SID_地脈吸収",
      "name": "지맥 흡수",
      "unreadActNames": [
        "HP"
      ]
    },
    {
      "gid": "GID_相手カミラ",
      "bond": 18,
      "kind": "synchro",
      "sid": "SID_後始末＋",
      "name": "마무리+",
      "unreadActNames": [
        "相手のHP"
      ]
    },
    {
      "gid": "GID_相手クロム",
      "bond": 1,
      "kind": "synchro",
      "sid": "SID_不意打ち",
      "name": "기습",
      "unreadActNames": [
        "相手の手番回数"
      ]
    },
    {
      "gid": "GID_相手クロム",
      "bond": 1,
      "kind": "engaged",
      "sid": "SID_敵エンゲージ技ダメージ軽減",
      "name": "SID_敵エンゲージ技ダメージ軽減",
      "unreadActNames": [
        "ダメージ"
      ]
    },
    {
      "gid": "GID_相手クロム",
      "bond": 8,
      "kind": "synchro",
      "sid": "SID_力まかせ",
      "name": "전력투구",
      "unreadActNames": [
        "相手のダメージ"
      ]
    }
  ],
  "outOfScopeCount": 82,
  "outOfScopeNote": "효과 필드(EnhanceValue·ActNames)가 없어 이 기준으로는 판정할 수 없는 스킬 수. 특효 마스크·GiveSids 등 다른 경로로 작동하며, 결손이라는 뜻이 아니다."
}
```

**Sources**: `undefined` undefined · `undefined` undefined · `undefined` undefined

## Contract examples

```json
{
  "contracts": [
    {
      "file": "packages/engine/tests/battle.test.ts",
      "cases": [
        "삼각 관계와 체술 우위",
        "상성 유리 + 대상 무장 시만 참, 중장·무효 스킬·기브레이크는 거짓",
        "이동 범위 내로 이동한다",
        "이동력 밖·타 페이즈 행동은 거부한다 (엔진 = 합법성 심판)",
        "활성화당 이동은 1회 — 재이동은 거부하고, 페이즈가 돌아오면 다시 이동한다",
        "재이동(시구르드): 행동 후 Removable칸 1회 — 거리 정본 = skills.json Removable(再移動力)",
        "재이동 거리는 Removable이 정본 — SID 접두·Power와 무관하다",
        "통과 판정 = 진영 동맹표 — 자군은 우군 칸을 통과하고, 적은 양쪽과 상호 차단",
        "이동력 = 클램프된 베이스 + EnhanceValue.Move(런타임 가산·상한 99)",
        "행동 전 = 이동력 · 이동 후 = 0 · 행동 후 = 재이동 Removable 또는 불가",
        "reduce의 이동 수락 = moveBudget과 일치한다",
        "SID_主人公 보유 유닛이 죽으면 즉시 패배 — 다른 자군이 남아 있어도",
        "격파: 명중 → 브레이크(검>도끼) → 추격으로 사망, 반격 몰수, 승리 판정",
        "동종 무기(상성 없음)면 반격이 들어온다",
        "중장 스타일은 브레이크 면역",
        "브레이크는 피격 전투 1회 직후 해제 — 같은 페이즈 세 번째 공격부터 반격 재개",
        "무기 지정 공격(weapon 인덱스): 지정 무기로 판정·장비하고, 사거리 심판도 그 무기 기준",
        "빗나감 = 데미지 0, 필살 = 3배 (롤 소비: 명중 → 명중시 필살)",
        "체인어택: 연계 스타일 아군이 사거리 안이면 협공 (위력 = floor(max(MaxHP*0.1, 1)), 명중 80)",
        "체인어택 경험치 = 실제 체인 참가 수만큼 가산 (정본 チェインアタック基本値 * チェインアタック回数)",
        "범용 브레이크 무효 스킬도 면역 (SID_ブレイク無効·_効果 — 41 인물 LunaticSids 실재)",
        "성장률 100 초과: 확정 가산 + 잔여 1롤 (105% = +1 확정, 잔여 5%)",
        "격파 경험치 = calculator 공식 그대로 (동레벨 노멀 = 18), 레벨업은 성장률 롤",
        "페이즈 종료 → 다음 군, 자군 복귀 시 턴 증가, 시작 군의 행동/브레이크 해제",
        "대기 = 행동 완료",
        "인접 파트너의 支援効果만큼 명중·회피가 변한다",
        "복수 파트너는 합산한다(원문에 상한·배타 규정 없음 — 가정)",
        "2칸 이상 떨어진 파트너는 무효다(발동 거리 = 인접 1타일, 실측 2026-08-17)",
        "supports가 없으면 종전과 동일하다(무회귀)",
        "archetype은 파트너의 SupportCategory로 인덱싱한다(수혜자 것이 아니다)",
        "다른 세력 유닛은 파트너가 아니다(엄격 동일 Force — 동맹도 제외)",
        "reduce가 지원 보정을 태운다 — 같은 롤이 지원 유무로 명중/빗나감을 가른다",
        "표시 명중과 임계 사이의 굴림이 명중이 된다(선형 모델이면 빗나갔을 구간)",
        "명중은 [0,10000)·필살은 [0,100000)에서 뽑는다",
        "필살률 0이면 필살 롤을 아예 소비하지 않는다(게임도 percent<=0이면 난수 미소모)",
        "보유자가 걸면 보정이 붙고, 걸린 쪽이면 반격에도 붙지 않는다",
        "상한에 걸리면 확정 가산분도 막힌다(성장률 250이어도 캡까지만)",
        "잔여가 0이면 그 스탯은 난수를 소모하지 않는다",
        "획득이 2스탯 미만이면 재굴림하고 최선 시도를 채택한다",
        "2스탯 이상이면 재굴림하지 않는다(첫 시도 채택)",
        "성장 확률은 0.001% 해상도로 판정한다",
        "체인어택이 본공격보다 먼저다",
        "대미지가 0이면 브레이크되지 않는다(확정 대미지 1 이상이 조건)",
        "최대 레벨 유닛은 경험치를 아예 받지 않는다(AddExp 즉시 return)",
        "최대 레벨 도달 레벨업은 잔여 경험치를 0으로 강제한다",
        "최대 레벨 미지정이면 종전대로 굴린다(무회귀)",
        "누적기 초기값 = person.Grow — 성장률 60이면 첫 레벨업에 이미 120(= +1, 잔여 20)",
        "100 미만이면 오르지 않고 누적만 된다(성장률 40 → 80)",
        "이월 누적기가 있으면 그것이 초기값을 대체한다(재생·인계 복원 통로)",
        "성장률 250이면 한 레벨에 2 오른다(누적 500 → 255 클램프 → +2, 잔여 55)",
        "상한에 닿은 스탯은 누적조차 하지 않는다(게이트가 루프 진입 전 1회)",
        "난수를 한 톨도 쓰지 않는다(Random 모드와 소비 계약이 다르다)"
      ]
    },
    {
      "file": "packages/engine/tests/guard.test.ts",
      "cases": [
        "기공 스타일 만HP 유닛: 스탠스 진입 + 행동 완료, guard 이벤트, 난수 무소비",
        "SID_チェインガード許可 스킬 직접 보유로도 지정 가능(스타일 무관)",
        "거부 — 자격 없음·손상 HP·HP 1(만HP여도 2 미만)",
        "스탠스 수명 — 자기 군 페이즈 복귀 시 해제",
        "명중 시 대상 무피해·가드 trunc(HP*0.2) 손실 + guardBlock 이벤트, 필살 롤은 굴리지 않는다",
        "하한 없음 — 가드 현재 HP 4면 손실 0(무피해 방패)",
        "빗나가면 가드 무발동(스탠스는 유지)",
        "체인어택은 못 막는다 — chain 타격은 대상에 그대로, 본공격만 치환",
        "인게이지 기술은 못 막는다 — engageAttack 대미지는 대상에 그대로",
        "가드 경험치 — チェインガード経験計算: 노멀 레벨1·레벨차0 = 13, 공격측(적)은 무경험",
        "가드 경험치 감쇠 — 루나틱 레벨 20 가드가 레벨 1을 지키면 clamp 하한 1, 가드는 전투당 1회",
        "chainGuardFor — 인접 1·같은 군·생존·스탠스만 (UI 예보 공용)",
        "attack events의 guardBlock으로 가드 HP·경험이 복원된다",
        "한 전투에서 같은 가드가 두 번 막지 않는다(추격은 대상이 맞는다)",
        "가드가 성립하면 스탠스가 소모된다(다음 전투는 못 막는다)",
        "성립하지 않았으면 스탠스는 남는다(소모는 성립의 대가다)"
      ]
    },
    {
      "file": "packages/engine/tests/engage.test.ts",
      "cases": [
        "전투 1회 = 타격 수만큼 양측 충전(공격 1 · 방어 1), charge 이벤트 절대값",
        "추격이 붙으면 3충전 — 타격 3회(공격·반격·추격)",
        "반격이 없으면 1충전 — 사거리 밖 상대는 때리기만 한다",
        "인게이지 중인 유닛은 충전되지 않는다 · 만충도 그대로",
        "지팡이 사용도 술자 +1 (전투 계산기 경로 — 가정, 실측 대조 대상)",
        "발동 = 만충 필요·행동 소모 없음·turn 리셋 — 미만충은 던진다",
        "자기 페이즈 시작마다 turn +1, turnLimit 도달 시 해제 + count 0",
        "絆 11 이상(turnLimit 4)은 한 페이즈 더 지속된다",
        "브레이크 면역이 engagedSkills에만 있으면 인게이지 중에만 발동한다",
        "엠블렘 무기 인덱스(weapons.length + n)는 engaging일 때만 유효하고 장비 전환된다",
        "인게이지 해제 시 장비 중인 엠블렘 무기는 소지품 첫 무기로 복귀한다",
        "리워프형 기술은 착지 칸으로 순간이동한 뒤 친다 — 이동 코스트를 보지 않는다",
        "리워프 착지 칸은 기술 사거리 안이어야 하고 유닛이 없어야 한다",
        "攻撃回数 = 3타·반격 몰수(相手の手番回数 0)·명중 100 고정 — 흐름이 데이터에서 나온다",
        "ダメージ３０％ = 相手のダメージ 대입(자기참조 식·올림) — 10 → 3",
        "타격 슬롯별 강제 무기 — weapons[1] 위력이 두 번째 타에 실린다(IID_無し = null 슬롯은 현 장비)",
        "발동 게이트: 비인게이지·리워프형·技コスト 미달·금지 무기(WeaponProhibit 비트)는 던진다",
        "技コスト가 게이지를 차감하고 charge 이벤트 절대값으로 실린다",
        "관통형(オーバードライブ) = 일직선 적 연쇄 타격 + 뚫고 나간 첫 빈 칸 착지",
        "관통 불성립은 조용히 1타로 강하하지 않고 거부한다 — 대각·아군 차단·맵 밖",
        "절대 재생(events)이 기술 전투를 복원한다",
        "타일 위 대기 = count 만충 대입 + 타일 소멸 + crest 이벤트(절대값)",
        "인게이지 중·만충·엠블렘 미장착은 소비하지 않는다(타일 잔존)",
        "전투로 활성화가 끝나도 그 칸이면 소비된다 — 절대 재생(events)이 같은 국면을 복원한다",
        "인게이지 중에 engage를 다시 부르면 해제된다 — 게이지는 남는다",
        "해제도 행동을 소모하지 않는다 — 풀고 나서 이어서 둘 수 있다",
        "게이지가 비어도 해제는 된다 — 만충 게이트는 개시에만 걸린다"
      ]
    },
    {
      "file": "packages/engine/tests/staff.test.ts",
      "cases": [
        "회복량 = 위력 + floor(마력/2), 사용 횟수 1 감소, 난수 무소비",
        "회복량은 잃은 HP를 넘지 않는다",
        "경험치 = 杖経験計算 — 노멀 저레벨은 감쇠 0이라 RodExp 그대로",
        "경험치 감쇠 — 루나틱 레벨 20이 레벨 1을 회복하면 25-19-62 → clamp 하한 1",
        "적군(force 1) 지팡이는 경험치 없음",
        "불법 지팡이 사용은 던진다 — 적 대상·자기 자신·무손상·사거리 밖·소진·미배선 종류",
        "소진 지팡이는 잔여 0에서 던진다",
        "방해 지팡이로 아군을 겨누면 던진다 — 회복·방해·워프 분기의 대상 규칙(MP1-5에서 배선 확장)",
        "events가 있으면 reduce 없이 복원 — HP·경험치·사용 횟수까지"
      ]
    },
    {
      "file": "packages/engine/tests/efficacy.test.ts",
      "cases": [
        "아머킬러 vs 중장(Attrs 4) = 무기 위력만 ×3 · 비중장은 ×1",
        "대상의 특効無効(EfficacyIgnore 127)는 특효를 지운다",
        "무기 EquipSids는 장비 중에만 유효 스킬에 합류한다",
        "스냅숏이 effective를 명시하면 그 값이 우선한다(주입 계약 유지)"
      ]
    },
    {
      "file": "packages/engine/tests/probability.test.ts",
      "cases": [
        "50 이하는 리맵하지 않는다(하한 페널티 없는 비대칭 곡선)",
        "100은 정확히 100%다(곡선 예외)",
        "51~99는 sin 곡선으로 상향된다",
        "단조 증가하며 표시값 이상이다(보정은 항상 상향)",
        "최대 편차는 표시 78에서 +10.21%p다",
        "굴림이 임계 미만이면 명중이다",
        "표시 100은 어떤 굴림에도 명중한다(굴림 상한 9999)",
        "표시 0은 어떤 굴림에도 빗나간다",
        "명중 곡선을 쓰지 않는다 — 표시 그대로 선형이다",
        "해상도가 0.001%다",
        "0 이하는 난수를 보지 않고 실패한다"
      ]
    },
    {
      "file": "packages/engine/tests/random.test.ts",
      "cases": [
        "MT19937 상수 1812433253으로 4워드를 만들고 각각 +0/+1/+2/+3을 더한다",
        "시드가 다르면 상태가 다르다",
        "t = x^(x<<11) ^ ((t)>>>8) ^ w ^ (w>>>19), 반환은 31비트 마스크",
        "createRandom은 시딩 뒤 20회 공전한다(Random.Initialize)",
        "반환값은 항상 [0, 2^31) 이다(bit31 마스크)",
        "모듈로다 — 편향을 그대로 재현한다(비트 일치가 목표라 나눗셈까지 이식)",
        "n = 0이면 예외가 아니라 원값을 돌려준다(sdiv 0 = 0)",
        "어떤 상한으로 부르든 상태 전진은 정확히 1회다",
        "peek() == 다음 getValue()",
        "peek는 상태를 전진시키지 않는다",
        "n회 전진한다",
        "n < 1이면 전진하지 않는다",
        "getMinMax(min,max)는 max를 포함한다 (0x23751B0)",
        "getMaxMin은 인자 순서가 뒤바뀌어도 같은 범위다 (0x2375240)",
        "getF01은 [0,1)이고 해상도가 2^-24다 (0x23750F0)",
        "isProbability100은 percent <= 0에서 난수를 소비하지 않는다 (0x23754B0)",
        "isProbability100(100)은 항상 참이다(해상도 0.001%)",
        "getIndex는 빈 표·전부 0인 표에서 -1이고 난수를 안 쓴다 (0x2375520)",
        "getIndex는 가중치 0인 칸을 건너뛴다",
        "복원하면 같은 수열이 다시 나온다(되감아도 같은 결과)",
        "사이에 다른 소비가 끼면 결과가 달라진다(정본이 그렇다)",
        "복원은 4워드 전부를 되돌린다(한 워드만 되돌리면 수열이 어긋난다)",
        "next(bound)는 getValue(bound)와 같다(엔진 주입구 그대로 물린다)"
      ]
    },
    {
      "file": "packages/engine/tests/attackPriority.test.ts",
      "cases": [
        "Decoy = 4096 (SkillData.States, SID_囮)",
        "새 후보만 Decoy면 다른 전부가 열세여도 채택한다",
        "기존만 Decoy면 새 후보가 전부 우세여도 기각한다",
        "둘 다 Decoy면 통과해서 일반 사다리로 간다",
        "둘 다 Decoy가 아니면 게이트가 침묵한다(기존 거동 보존)",
        "체인 수가 적어도 Decoy가 이긴다(게이트가 체인보다 앞)",
        "체인 수가 많으면 스코어를 안 보고 채택한다(S6)",
        "체인 수가 적으면 즉시 기각한다(S3 조기 반환)",
        "S7은 battle 단일 필드 비교다(다필드 사전식이 아니다 — 정정 C3)",
        "S8 동점에서만 코인플립을 소비한다 — 0이면 새 후보",
        "Wall(1)과 Blew(2)는 서로 무승부다",
        "Hole(3)만 다른 밀치기보다 우월하다",
        "못 미는 쪽이라도 킬레이트 0.95 이상이면 이긴다(양방향 대칭)",
        "AttackHigh에서 격파확률 0.3 미만은 기각한다",
        "Decoy 대상은 그 기각을 면제받는다",
        "AttackHigh가 아니면 기각 자체가 없다"
      ]
    },
    {
      "file": "packages/engine/tests/enhance.test.ts",
      "cases": [
        "무기의 enhance가 전투 입력 스탯에 더해진다",
        "enhance가 없는 무기·맨손은 스탯을 안 건드린다",
        "원본 UnitState.stats는 변하지 않는다",
        "마방 강화가 마법 피해를 실제로 줄인다(예보 관통)",
        "속도 강화가 추격 성립을 바꾼다"
      ]
    },
    {
      "file": "packages/engine/tests/replay.test.ts",
      "cases": [
        "롤 캡처 = 소비 순서 그대로 (명중 → 레벨업은 STAT_KEYS 순 1롤씩)",
        "기록 → 직렬화 → 파싱 → 재생이 완전히 같은 국면을 낸다 (심장)",
        "events 적용 == rolls로 reduce 재계산 (재생 정본이 절대값이어도 등가)",
        "롤 없는 스텝이 롤을 소비하면 던진다 (move/wait/endPhase 무소비 계약)",
        "원본은 검증 통과, 변조된 events·rolls는 불일치로 잡는다",
        "모든 커서에서 stateAt == 순차 재생, 타임라인은 불변",
        "스냅숏은 페이즈 개시 국면이다",
        "주소 ↔ 커서 왕복, 범위 밖은 클램프",
        "attack.weapon 장비 전환을 events 경로에서도 복원한다",
        "재생 국면이 라이브 국면과 같다(phase·turn·활성화 플래그)",
        "재생 뒤 새 진영의 유닛이 실제로 행동할 수 있다(거부되지 않는다)"
      ]
    },
    {
      "file": "packages/engine/tests/ai.test.ts",
      "cases": [
        "KillScoreNormalize = (uint)(kill*100)",
        "ExpectationScoreNormalize — max 클램프·바닥 1·bit폭 포화",
        "突撃 Rush(0) 레이아웃",
        "慎重 Chariness(2) — dead에 임계치 없음, E와 R을 같은 폭으로 상쇄",
        "攻撃 Attack(1) — 가한 기대 데미지 x3 가중",
        "★격파확률 0.3 미만은 통째로 버려진다 — 세 레이아웃 공통",
        "연계수 ≫ 밀치기 ≫ 반격사거리 밖 ≫ 지형 ≫ 이동코스트",
        "Nearest 플래그면 지형·아웃레인지 항이 사라져 이동코스트가 지배한다",
        "★기대 대미지·격파확률은 위치 스코어에 들어가지 않는다 — 이동코스트만 다른 두 칸",
        "방어 x1 · 회피 /5 · 회복 /10 · +5, 0..15 클램프",
        "상한 15로 포화",
        "★비행 병종은 항상 0",
        "정상 밀림 = Blew(2)",
        "맵 밖으로 처박으면 Wall(1)",
        "★崩れた床으로 밀면 Hole(3) — Tid 문자열 하드코딩",
        "z 내림차순 · 각 z 안에서 x 오름차순 · 맨해튼 거리 게이트",
        "플레이 영역으로 사각 클램프",
        "factor%가 이동력에 곱해진다 — 칸 수가 아니다",
        "V_Default(-1)·V_Max(-2)는 factor 음수 → 맵 전역 100",
        "이동력은 0..99로 클램프한 뒤 곱한다",
        "가중 합성키 = 512*P + 256*enchant + 16 - clamp(removable,0,99)",
        "★하위 항이 상위 티어를 절대 역전하지 못한다 (256 > 99+16)",
        "☠AI_Priority < 100인 유닛은 Priority 페이즈에 아예 등록되지 않는다",
        "동점은 난수가 아니라 열거 순서로 갈린다 (안정 정렬)",
        "★플레이어 진영(force 0)은 dispos 값을 무시하고 항상 75/30",
        "적·동맹NPC는 dispos AI_HealRateA/B를 쓴다",
        "HP 비율은 정수 나눗셈(내림)이다",
        "(x1,z1),(x2,z2) → Rect{X,Z,W,H} 반개구간",
        "허용 = X <= x < X+W && Z <= z < Z+H — 원문 두 좌표를 양끝 포함",
        "빈 값·형식 불일치는 제약 없음(undefined)",
        "★AT_Default(0)는 필터가 전혀 없다",
        "AT_Person(4) = 인물 일치 · AT_ExcludePerson(5) = 불일치",
        "AT_ExcludePerson2(14) = 두 인물 모두 배제",
        "AT_ExcludeBand(6) = AI_BandNo 불일치 · AT_Force(9) = 진영 일치",
        "☠판정에 필요한 사영이 없는 옵코드는 undefined = 정직 결손 (AT_Job — Job 미사영)",
        "★진영 0 → 1 → 2 순, 진영 안에서는 배치 순 · 동맹 진영은 통째로 제외",
        "자군 입장에서는 적(1)만 나온다 — 우군은 동맹이라 제외",
        "★MV_Idle은 제자리 대기를 행동으로 확정하지 않는다 — 항상 None",
        "체인가드 자격이 없으면 GuardTo는 None — 루틴의 다음 후보로 넘어간다",
        "자격이 있으면 지킬 아군의 인접칸으로 이동 + 가드 — GetSidePosition 판독 배선",
        "지킬 아군이 하나도 없으면 None — 결손이 아니다",
        "인게이지 중이면 engageAttack으로 커밋 · 아니면 통상 attack",
        "dispos의 FLAG_ 접두사를 벗겨 Lua 변수명과 맞춘다",
        "접두사 없는 원문 이름도 그대로 찾는다(우선)",
        "★v1은 반경이 아니라 '그 적을 덮어야 하는 밴드원 수 + 1'이다",
        "★임계는 실제 밴드원 수로 클램프된다 — 밴드원이 없으면 사정권 판정만 남는다",
        "☠다른 밴드 번호는 커버 카운터에 가담하지 않는다",
        "EvenTurn(4)·OddTurn(5)는 턴 패리티 게이트가 가장 먼저다",
        "★ExcludeSelf(16)만 '내 사정권 안' 조건을 뗀다 — 밴드원이 덮으면 기동",
        "v1이 없으면 자기 좌표 기준 — 먼 적은 사정권 밖",
        "★v1이 pos(x,z)면 **그 좌표** 기준으로 사정권을 잡는다",
        "★None을 반환한다 — 근거: Torch 조사 지점(MapInspector.Kind.Torch=7) 미모델링",
        "★때릴 적이 있으면 횃불을 켜지 않는다 — 슬롯 순서(Mind→Attack)상 공격이 살아난다",
        "목표 좌표 쪽으로 이동하고 그 턴을 마친다",
        "좌표 인자가 없으면 정직 결손 — 조용히 대기시키지 않는다",
        "주인공 쪽으로 이동하고 그 턴을 마친다",
        "SID_主人公이 없는 자군은 대상이 아니다",
        "주인공이 죽었으면 None이다",
        "★CalcHealRodScore = damage + (max(heal,0)<<8) + (제자리<<16)",
        "★제자리 보너스는 플레이어 진영에서 식에서 아예 빠진다",
        "우선순위 = 제자리 ≫ 회복량 ≫ 부족 HP",
        "★pos(x,z)는 한 토큰이다 — 괄호 안 쉼표는 구분자가 아니다",
        "괄호 밖 쉼표는 정상 분리 · 빈 값은 빈 배열",
        "parsePos가 그 토큰을 좌표로 읽는다",
        "★다친 아군에게 이동 후 지팡이를 쓴다",
        "만피 아군만 있으면 None — 회복할 대상이 없다",
        "☠AskHealA/B 임계를 넘지 않은 아군은 대상이 아니다 (IsHealRodPermission 5단)",
        "회복 지팡이가 없으면 None (HasHealRod 게이트)",
        "★제자리에서 닿는 대상을 우선한다 (제자리 항이 최상위)",
        "★MV_Escape — 이탈 지점 쪽으로 이동한다",
        "★조사 지점이 없어도 **플레이 영역 테두리**가 이탈 지점이라 결손이 아니다",
        "★대상 인물이 걸린 이탈점은 **다른 유닛이 그 칸을 쓰지 못한다** (S015 반지 소지 적)",
        "★MI_Treasure — 상자 쪽으로 이동하되 개방은 결손으로 남는다",
        "상자가 없으면 결손",
        "★ChangeSeq는 **다른 슬롯**의 루틴을 갈아끼우고 Retry가 Cause부터 재시작한다",
        "☠갈아끼운 루틴 본문이 스냅숏에 없으면 정직 결손이 된다",
        "★이동범위 + 방해 지팡이 사거리 안의 적을 잡는다",
        "☠방해 지팡이가 없으면 사정권이 비어 항상 false",
        "회복 지팡이(rodType 2)는 방해 사정권을 만들지 않는다",
        "ExcludePerson(15)은 지정 인물을 제외한다",
        "★'보스'가 아니라 **주인공 스킬(SID_主人公) 보유**가 판별식이다",
        "☠보스 플래그와 무관하다 — boss여도 주인공 스킬이 없으면 대상 아님",
        "★플레이 영역 = 맵에서 바깥 1칸 테두리를 뺀 사각형 — 그 테두리가 이탈 지점이다",
        "☠바깥 한 칸이 통행 불가면 이탈 지점이 아니다",
        "조사 지점(escape)은 위치와 무관하게 이탈 지점이다",
        "★대상의 jid가 인자와 일치해야 한다",
        "☠jid가 사영되지 않은 유닛은 정직 결손 — 거짓으로 눌러 감추지 않는다",
        "★지정 PID 쪽으로 이동한다 — 진영을 가리지 않는다(EachUnit)",
        "대상이 없으면 아무것도 하지 않는다(None)",
        "☠인자가 없으면 정직 결손",
        "★이동범위 + 회복 지팡이 사거리 안에 **회복 자격 아군**이 있으면 기동",
        "☠회복 자격이 없는(멀쩡한) 아군은 세지 않는다",
        "☠회복 지팡이가 없으면 항상 false (HasHealRod 게이트)",
        "★자기 자신은 대상에서 제외된다",
        "★대상은 BreakdownEnemy poke = 파이프라인의 defendArea(방어 바닥)다",
        "MI_BreakDown은 **이번 턴에 닿는** 칸만 고른다 — 멀면 None",
        "★MV_BreakDown은 맵 전역 도달성으로 목표를 잡고 접근한다",
        "☠방어 바닥이 국면에 없으면 정직 결손",
        "★rank는 UseType 4분기다 — ☠이름이 아니라 수치로 판별",
        "★조립식 = P + ((100-거리)<<9) + (magicVal<<17) + (rank<<25)",
        "우선순위 = 아이템 등급 ≫ 대상 마력 ≫ 근접도 ≫ 위력",
        "★사정권 안 적에게 지팡이를 쓴다",
        "☠침묵은 마도서 계열을 가진 대상에게만 적합하다",
        "☠ドロー는 엔진이 효과를 거부하므로 정직 결손으로 올린다",
        "AttackHigh(5)·AttackLongRange(4) 회전에서는 실행되지 않는다"
      ]
    }
  ]
}
```

## Known gaps

```json
{
  "statusCount": {
    "anchored": 49,
    "implemented": 28,
    "absent": 61,
    "deferred": 11,
    "assumed": 19
  },
  "note": "☠status가 anchored가 아닌 항목은 '여기는 실기와 다를 수 있다'는 뜻이다",
  "entries": [
    {
      "id": "movement.range-terrain-cost",
      "label": {
        "en": "Movement range from terrain cost (255 = impassable)",
        "ko": "지형 코스트 이동 범위(255 = 진입 불가)"
      },
      "status": "anchored",
      "evidence": "정본 = 地形コスト(Prohibition 전수 반증, decisions 2026-08-16) · range.test.ts · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §3A): 진입 불가 = 코스트 255 단독(TerrainCostData.IsNoMove)·이동타입 열 순서 None/Foot/Horse/Fly/Dragon/Pad·파동 BFS·완화·예산 컷 전부 range.ts와 일치(40규칙 대조표 1~9행) · ☠잔여 결손 = TerrainCostData.GetCost(RVA 0x21E2A20)의 오버레이 가산층 `+ (비행·용 ? overlay.FlyCost : overlay.MoveCost)` 미배선(설치물 = movement.overlay 소관은 turn.map-gimmicks MapOverlap) · 코스트 무시 스킬 MoveCostFree(1<<34)도 미배선"
    },
    {
      "id": "movement.once-per-activation",
      "label": {
        "en": "One move per activation",
        "ko": "활성화당 이동 1회"
      },
      "status": "anchored",
      "evidence": "베타 실기 발견(2026-08-16) · battle.test.ts 활성화당 이동 1회"
    },
    {
      "id": "movement.canter-distance",
      "label": {
        "en": "Canter: N tiles after acting (skill Removable)",
        "ko": "재이동: 행동 후 N칸(skills.json Removable)"
      },
      "status": "anchored",
      "evidence": "공식 도움말 '행동 후 2칸/3칸' 실측 · ★IL2CPP 코드로 필드 정정(il2cpp/MOVE_TERRAIN.md §2-10): 정본 필드는 skill.Power가 아니라 **Removable(再移動力)** — Unit.GetMovePowerImpl(RVA 0x1A5B690)이 Status.Removing일 때 max(skill.Removable)을 이동력으로 반환한다(Power는 별개 필드 '強さ' — 값 2·3 우연 일치로 오독됐던 자리). ★배선 완료(2026-08-18, MP3 3-0): canterPower가 Removable 최댓값 소비(SID 접두 매칭 폐기)·SKILL_ROW_FIELDS 사영 편입 — battle.test.ts 재이동·Removable 정본 테스트"
    },
    {
      "id": "movement.canter-terrain-cost",
      "label": {
        "en": "Canter obeys terrain cost",
        "ko": "재이동에 지형 코스트 적용"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드로 가정 종결(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-10·§3A 26행): 재이동은 이동력 값만 교체할 뿐(GetMovePowerImpl RVA 0x1A5B690) 탐색 경로는 동일 루틴(MapDeployTemplate.Move → SearchDir RVA 0x2C28FC0)이라 지형 코스트·ZOC·MoveFirst가 전부 그대로 적용된다 — 엔진이 movementRange를 재사용하는 현행 구조와 정합(종전 '공식 텍스트 무지시 가정'을 코드로 대체) · 잔여 = MoveFirst 미배선분(movement.move-first)"
    },
    {
      "id": "movement.block-enemy",
      "label": {
        "en": "Cannot pass through non-allied units",
        "ko": "비동맹 진영 통과 불가"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 정본(il2cpp/MOVE_TERRAIN.md §3A 12행): 저지 기준 = **진영 동맹표** — SearchDir(RVA 0x2C29500)이 !MapSituation.IsAllide(myForce,targetForce)일 때만 차단(IsAllide RVA 0x1F48EC0). ★배선 완료(2026-08-18, MP3 3-0): 엔진 movePredicates(alliance 기본 [0,1,0])가 reduce·BoardIsland 공용 단일 정본(C4 중복 회수) — battle.test.ts 동맹 통과 테스트 · 잔여 = 스킬 MoveEnemyPass(1<<35) 해제 미배선"
    },
    {
      "id": "movement.pass-ally",
      "label": {
        "en": "Pass through allied forces, cannot stop on them",
        "ko": "동맹 진영 통과 가능·정지 불가"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 정본(il2cpp/MOVE_TERRAIN.md §3A 13행): 통과 허용 = MapSituation.IsAllide(RVA 0x1F48EC0) 동맹표 참 — 자군(0)·우군(2)은 통상 동일 진영이라 서로 통과. ★배선 완료(2026-08-18, MP3 3-0): movePredicates가 동맹 = 통과·정지 불가로 배선(종전 force 동일 비교의 우군 오차단 해소) — battle.test.ts"
    },
    {
      "id": "movement.block-third-force",
      "label": {
        "en": "Enemy and third force block each other",
        "ko": "적군↔우군 상호 차단"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드로 가정 종결(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §3A 14행): 차단 기준 = MapSituation.IsAllide(RVA 0x1F48EC0) 진영 인덱스 비교이고 Enemy(1)와 Ally(2)는 서로 비동맹이므로 상호 차단이 코드로 확정된다(종전 '공식 텍스트 전무·실기 반증만이 경로' 판정을 대체) · ★배선(2026-08-18, MP3 3-0): movePredicates 동맹표 소비 — ⚠챕터별 진영 테이블 변경 여지는 BattleMap.alliance 필드 주입으로 흡수(판독 = MapSituation 초기화 경로, il2cpp-reader 진행 중)"
    },
    {
      "id": "movement.pending-move",
      "label": {
        "en": "Move is provisional until an action commits it",
        "ko": "행동 확정 전 잠정 이동(자유 재배치·원점 취소)"
      },
      "status": "anchored",
      "evidence": "사용자 실기 대조(decisions 2026-08-16 이동 UX 정정) · ★IL2CPP 코드 정합 확인(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-14): 원점 보관 = MapMind.m_FirstX/m_FirstZ, 취소 = CommandStack.Push/Pop/Decide + Record.Cancel — 엔진의 moved 플래그·원점 취소와 동형"
    },
    {
      "id": "movement.structures",
      "label": {
        "en": "Structures (doors, walls) affect passability",
        "ko": "구조물(문·벽) 통행 반영"
      },
      "status": "implemented",
      "evidence": "M005 구조물 렌더 시점(§0 미룸) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-13): 통행 특례 로직은 **없다** — 구조물은 CostName/오버레이 코스트로 환원되고(Map.CanEnterTerrain RVA 0x1EECF90) 파괴 시 ChangeTid로 지형 자체가 교체돼 코스트가 바뀔 뿐 · ⇒ 구현 부담은 렌더·파괴 이벤트 쪽이고 이동 규칙 신설은 불요 · ★배선 완료(2026-08-18, MP3 3-2·3-3): GameState.structures(hp = Hp_난이도)·makeCostAt 코스트 치환(지붕 = 렌더 전용 제외)·visibleStructures 렌더(파괴·group 지붕 걷힘) — terrain.test.ts·boards.test.ts. 잔여 = 파괴 커맨드(actions.destroy, 3-4)"
    },
    {
      "id": "movement.multi-tile-unit",
      "label": {
        "en": "Multi-tile units (BmapSize)",
        "ko": "다칸 유닛(BmapSize)"
      },
      "status": "absent",
      "evidence": "BmapSize 2 = 異形竜류 29체·3 = E006 보스·5 = 솜브론 용형(gaps/H) · ★실기 등장 확인 = 17장 이형룡(m017 dispos 3배치, 화염 브레스 — 사용자 전언 2026-08-17 정합) · 점유·인접·사거리 판정 영향, 발현 = M017 변환 시 · ★IL2CPP 코드로 점유 규칙 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-5·§3A 20행): 점유 = 좌상 앵커 기준 BmapSize×BmapSize 정사각형(MapEnum.GetCell RVA 0x1DC0B70)이고 SearchDir이 점유 칸을 전수 검사한다 · 지형 회복/피해는 BmapSize 2 및 3 초과 유닛에서 제외"
    },
    {
      "id": "movement.warp",
      "label": {
        "en": "Warp and other staff/item movement",
        "ko": "지팡이·아이템 이동(워프 등)"
      },
      "status": "implemented",
      "evidence": "ワープ(UseType 5) 배선 완료(2026-08-17 MP1-5, staffWarp.test.ts — warp 액션·warp 이벤트 절대 재생·warpDestinations 엔진·UI 공용) · ★목적지 규칙 신규 디스어셈블(MapDeployTemplate.UnitWarp RVA 0x2C1F880): 반경 = ItemData.Distance(마력 의존 아님)·중심 = **워프되는 대상의 현재 좌표**·맨해튼·스킬 RangeTarget==Kind면 RangeAdd 가산(상한 255, ☠스냅숏 미탑재라 미배선) · 타일 유효 = Unit.CanWarp(RVA 0x1A2A0E0) = 영역 내 && (타대상 시 BmapSize<=1 && !Defect/Lockon) && !IsNoMove && !terrain.IsNotWarp(**terrain Flag bit17**) — 엔진은 비통행(코스트 255)·점유만 배선, ★IsNotWarp(Flag bit17) 배선 완료(2026-08-18, MP3 3-1 — TerrainCell.notWarp, terrain.test.ts, bit16 NotTarget과 구분) · ☠レスキュー(UseType 6)·リワープ(8)는 별도 경로(UnitRewarp 0x2C1FE40 계열) 미판독 — reduce가 정직 거부"
    },
    {
      "id": "movement.move-first",
      "label": {
        "en": "Departure-tile movement bonus (MoveFirst)",
        "ko": "출발 칸 이동력 보정(MoveFirst)"
      },
      "status": "implemented",
      "evidence": "★IL2CPP 코드 확정(il2cpp/MOVE_TERRAIN.md §2-10·§3A 11행): 탐색 시작 전 이동력 = clamp(movePower + 베이스지형.MoveFirst + 오버레이.MoveFirst, 0, 100), 비행·용 면제, 재이동 동일 루틴. ★배선(2026-08-18, MP3 3-1): 엔진 moveBudgetOn(예산≥1일 때만 보정)이 reduce·BoardIsland 공용 — terrain.test.ts 流砂·氷床·비행 면제 · 잔여 = 오버레이 층 MoveFirst(3-2에서 합산)"
    },
    {
      "id": "movement.zoc",
      "label": {
        "en": "Zone of control (skill-driven only)",
        "ko": "제어영역(ZOC — 스킬 전용)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-4·§3A 17~19행): ZOC는 지형이 아니라 **스킬 필드 ZocType**이 소유한다 — 1=CostMin(아군 대상, 해당 칸 코스트 1로 완화)·3=NotMove(적 대상, 진입 금지)의 2종만 데이터에 실재하고 2=CostMax는 코드에만 있고 사용 0건 · 소비 지점 = SearchDir 인접 검사 · 엔진 미배선(과대 이동)"
    },
    {
      "id": "actions.wait",
      "label": {
        "en": "Wait ends the unit's action",
        "ko": "대기 = 행동 완료"
      },
      "status": "implemented",
      "evidence": "battle.test.ts"
    },
    {
      "id": "actions.attack",
      "label": {
        "en": "Attack command and battle resolution",
        "ko": "공격 명령·전투 해결"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts(M002·M003 실기 예보 일치)"
    },
    {
      "id": "actions.staff",
      "label": {
        "en": "Staves (heal, warp, status)",
        "ko": "지팡이(회복·워프·상태)"
      },
      "status": "implemented",
      "evidence": "회복(RodType 2, 2026-08-18 MP0) + 방해(RodType 3: フリーズ·サイレス·コラプス — 명중식·GiveSids 상태 부여, staffInterfere.test.ts) + 워프(UseType 5, staffWarp.test.ts) 배선 완료(2026-08-17 MP1-5). 회복량 정본 = CalcRodHit RVA 0x2473E10 · 명중식 = combat.staff-hit · 상태 = combat.status-staff · 워프 = movement.warp · ☠잔여 = ドロー(UseType 27 — GiveSids 없음·효과 미판독)·レスキュー/リワープ(목적지 미판독)·전량 회복 축복 bit5·ItemHealScale 스킬 배율 적용점 미판독 — 전부 reduce가 정직 거부 · ☠빗나간 방해 지팡이 경험치 = 근거 부재(Status.ExpRodMiss 1048576 소비처 미검출) — 0 채택, 실측 반증 시 갱신 · 정식화 = Kind=7 41건(gaps/B §6-1)"
    },
    {
      "id": "actions.items",
      "label": {
        "en": "Item use (vulneraries etc.)",
        "ko": "아이템 사용(회복약 등)"
      },
      "status": "implemented",
      "evidence": "AddType 2 범위 회복 배선(2026-08-18, itemUse.test.ts — item 액션·자신+반경 아군·AddPower 고정·잃은 HP 상한·횟수 소모·절대 재생·경험 없음(calculator에 아이템 경험식 부재)) ☠잔여 정직 거부 = 7 인게이지 충전·18 상태해제·19 횃불·31 스킬부여 · 정식화 — Kind=10 중 사용형 53건: AddType 2 = 범위 회복(傷薬: 자신+주위 AddRange 2칸 아군 HP AddPower 15 — 공식 도움말 원문, gaps/N-patch §2-7) · 7 = 인게이지 카운트 증가(特効薬 +2 — 종전 '상태 경감 추정'을 원문이 정정) · 18 = 상태 해제(毒消し) · 19 = 횃불 효과 · 31 = AddSids 스킬 부여 49건(세부 후속) · 커맨드 = ItemMenuItem(MAP_COMMANDS §1-1)"
    },
    {
      "id": "actions.trade",
      "label": {
        "en": "Trade and convoy",
        "ko": "교환·수송대"
      },
      "status": "implemented",
      "evidence": "교환 배선(2026-08-18, trade.test.ts) — 1액션 = 1점 이동(행동 무소모 = 연속 액션이 다중 이동과 등가)·인접 1·장비 재계산·moved 소진·traded 창 플래그(인게이지 발동 봉쇄). 계약 = 실기 판별(2026-08-18 사용자: 교환 후 제자리 행동·전투 가능 / 인게이지 후 교환 가능 / 교환 후 인게이지 불가) + TradeMenuItem(MAP_COMMANDS §1-1) · ☠수송대 = 캠페인층(MP5) · 미배선 소지품 종류(소재 등 비사용형)는 교환 목록 밖"
    },
    {
      "id": "actions.interact",
      "label": {
        "en": "Chests, villages, doors",
        "ko": "상자·민가·문 상호작용"
      },
      "status": "deferred",
      "evidence": "Lua 이벤트 엔진(M004~, §0 미룸) — Tbox/Door/Visit 3함수 시그니처 정식화(gaps/E §2-3) · 커맨드 클래스·지형 게이트 확정 = Door/TreasureBox/VisitMenuItem + terrain.json Flag bit0=Door/bit1=Treasure/bit2=Visit(MAP_COMMANDS §1-3)"
    },
    {
      "id": "actions.talk",
      "label": {
        "en": "Talk command",
        "ko": "대화 커맨드"
      },
      "status": "deferred",
      "evidence": "TalkMenuItem·Label.Talk=38(MAP_COMMANDS §1-3) — 트리거 = 맵 이벤트/Lua 소관이라 interact와 함께 MP2 이월"
    },
    {
      "id": "actions.dance",
      "label": {
        "en": "Dance (grant another action)",
        "ko": "춤(재행동 부여)"
      },
      "status": "implemented",
      "evidence": "엔진 배선(2026-08-18, dance.test.ts) — dance 액션·refresh 이벤트(절대 재생 복원)·인접 1칸·행동 완료 대상만·acted/moved 리셋·踊り経験計算 원문(노멀 13·루나틱 clamp 1 정확값) · 자격 = canDance(SID_踊り/SID_特別な踊り — MAP_COMMANDS §1-4) · ☠UI 이월 = 무희 실재 맵 변환 시(MP3) · 원문 절차 gaps/E §1-7 + 실기 확인(2026-08-17)"
    },
    {
      "id": "actions.engage",
      "label": {
        "en": "Engage activation command",
        "ko": "인게이지 발동 명령"
      },
      "status": "implemented",
      "evidence": "상태 기계 배선(2026-08-18, engage.test.ts — 전부 코드 확정 il2cpp/EMBLEM_ENGAGE §3): 충전 = 전투 참가당 +1(양측·체인 제외·인게이지 중 제외) · 발동 = 만충·행동 무소모 · 소비 = 자기 페이즈 시작 +1, 도달 시 해제+게이지 0 · 絆11 = 4턴·絆20 = 상한 -1(성장표 Flag 파이프라인 배선) · 효과층 배선(2026-08-18 4b): engaging 중 스킬 세트 = EngagedSkills 교체(effectiveSkills)·엠블렘 무기 증설(effectiveWeapons — weapons 뒤 인덱스, 해제 시 장비 복귀). ⚠가정 1건 = 지팡이 사용도 술자 +1(실측 대조 대상) ☠잔여 = NotEngageAdd 지형·엠블렘 지팡이(リカバー류 — 공격 무기만 증설) · 세부기·기술은 별항(actions.engage-attack·engage-subcommands) · ☠발현 = 자군 반지 장착 데이터가 세이브 소유라 dispos에 없음(후반 맵 적측부터 자연 발현, 자군 = 캠페인층·편집기 god 의도) · ★수리(2026-08-18) = **Lua 장착 경로의 문장사 패시브 결손** — `UnitCreateGodUnit`이 게이지·무기·기술만 싣고 SynchroSkills/EngagedSkills를 통째로 빠뜨려 m002 2회전 뤼미에르가 迅走(이동+5)·移動＋１·守備＋３·再移動을 하나도 못 받았다(오류·경고 0의 조용한 결손). 배선 = `script.gods[gid].synchroSkills/engagedSkills` + UnitState.`synchroSkills`(엠블렘 클러스터 = 해제 시 함께 사라진다) + `effectiveSkills`가 비인게이지에서 합류 · dispos 경로도 같은 필드로 통일(사람 스킬에 섞지 않는다) · ★`UnitResetParam`도 함께 수리 = `Unit.ResetParam`(0x1A5DCC0)이 SetEngage(false)→ResetEngageCount(min(7,limit))를 부른다 — 종전엔 HP만 되돌려 m002 1회전 종료 재배치에서 인게이지가 살아남았다"
    },
    {
      "id": "actions.engage-attack",
      "label": {
        "en": "Engage attack (art) command",
        "ko": "인게이지 기술(공격기)"
      },
      "status": "assumed",
      "evidence": "배선(2026-08-17 4c, engage.test.ts) — engageAttack 액션: engaging 중·技コスト 게이지 차감(charge 절대값)·기술 스킬 세트(기술 행+SyncSids 전개) 전투 한정 주입·흐름 = 汎用設定 데이터 소유(攻撃回数·手番回数·相手の手番回数 — makeSkillModifier 질의, 기본 1)·명중 100/필살 0은 기존 파라미터 훅 경유·ダメージ% = 相手のダメージ 자기참조 대입(올림은 원문 식 소유)·슬롯별 강제 무기(EquipIids, IID_無し = 현 장비) · 선택 = 기본 + 스타일 분기(GetEngageAttack 0x2341640, emblemEngageArt) · ⚠가정 = WeaponProhibit 비트 해석((mask>>kind)&1 — 마르스 1021 = 검만 허용 정합) · 체인어택/추격/브레이크 미발동 · 실기 앵커 없음(실측 대조 대상) · ☠미배선 = 連動(EngageAttackLink — リュール)·暴走(Rampage) · ★관통형 배선(2026-08-18) = Target=Pierce(4, 시구르드 オーバードライブ 전수 5행) — 정본 `MapSkill.CalcPierce`(0x1F4EC90): 직교 인접 대상만 · 그 방향으로 적을 연쇄 타격 · 첫 빈 통행 가능 칸에 착지(setPos 절대값) · 불성립(대각·맵 밖·아군 차단·착지 불가)은 정직 거부(1타 강하 금지) · ⚠가정 = 통행 판정에 공격자 이동타입 사용(원문은 지형만) · AI도 같은 함수로 사전 판정(handlers.attackTo) · ☠미배선 = PierceMultiple(AI가 2명 이상 꿰는 칸을 선호하는 발판 가중, AI_ENGINE 표 13) · ☠**비계 1건** = `GID_M002_シグルド`의 `EngageAttack`이 god.xml에서 비어 있는데(AIEngageAttackType도 None) 사용자 실기 관측이 '2회전 뤼미에르가 오버드라이브를 쓴다'라 정규 `SID_シグルドエンゲージ技`를 코드 표(fe17.ts ENGAGE_ATTACK_SCAFFOLD)로 메웠다 — 제거 조건 = 실기 재관측으로 미사용 확인, 또는 변종이 정규 기술을 참조하는 경로 판독"
    },
    {
      "id": "actions.engage-subcommands",
      "label": {
        "en": "Engage sub-commands (rewarp/rod/charge/wait/summon)",
        "ko": "인게이지 세부기(리워프·로드·차지·대기·소환)"
      },
      "status": "absent",
      "evidence": "MAP_COMMANDS §1-2 세부기 6종 중 공격기(EngageAttackMenuItem)만 배선(actions.engage-attack) — 잔여 5종 = EngageRewarpMenuItem(세리카 리워프)·EngageRodMenuItem(미카야 지팡이기)·EngageChargeMenuItem(Flags.EngageCharge=4)·EngageWaitMenuItem(EngageWait=16)·EngageSummonMenuItem(EngageSummon=32) · 각각 워프·지팡이 시스템·소환(유닛 신설) 선행 — 발현 시 MP 선두 흡수"
    },
    {
      "id": "actions.destroy",
      "label": {
        "en": "Destroy terrain/structures",
        "ko": "파괴(구조물 부수기)"
      },
      "status": "anchored",
      "evidence": "클래스 3종 = Destroy/Breakdown/BreakdownEnemy(진영 고정 Force.Player/Enemy — MAP_COMMANDS §1-3) · 데이터 정본 실재 = terrain.json Destroyer(1=Player/2=Enemy)·Hp_N/H/L(난이도별 내구도) · 선행 = 구조물 레이어 렌더(MP3) · ★IL2CPP 신규 판독(2026-08-18, MP3_READINGS §3 — CalcDestroy 0x246AF20 호출 전수 스캔): 파괴 = 결정론적 공격력 차감 — 대미지 = min((int)clamp(공격력,0,999), 잔여HP)×ActionCount, 명중·필살·반격·난수 소비 전무, 방어 차감 없음, HP = 난이도별 Hp_N/H/L, Destroyer = 0 양군/1 자군/2 적군 · ★배선 완료(MP3 3-4): destroy 액션(destroyTargets 열거 = UI·reduce 공용)·destroy 이벤트 절대 재생·커맨드 바 버튼 — destroy.test.ts 3건(난수 소비 시 즉사 계약 포함) · 잔여 = 베이스 격자 파괴물(TID_水晶 1맵) 정직 거부·~~EventEntryDestroy 발화 접점~~(2026-08-18 배선 — 완파 사각 교차 destroyed 훅, events.test.ts)"
    },
    {
      "id": "actions.cannon",
      "label": {
        "en": "Cannon (fire from terrain)",
        "ko": "대포(포격)"
      },
      "status": "absent",
      "evidence": "CannonMenuItem(States: NotShell/NotTarget/NotBow/NotMagic — MAP_COMMANDS §1-1) · 정본 = terrain.json Flag bit3=BowCannon/bit4=MagicCannon/bit5=FireCannon + CannonShellsN/H/L · 포탄 명중식·원거리 감쇠 = gaps/N-patch §3-2"
    },
    {
      "id": "actions.torch",
      "label": {
        "en": "Torch (fog vision)",
        "ko": "횃불 켜기/끄기"
      },
      "status": "deferred",
      "evidence": "TorchOnMenuItem + terrain.json Command(TorchOn=1/Off=2)(MAP_COMMANDS §1-3) — 선행 = 안개/시야 시스템(미배선)"
    },
    {
      "id": "actions.guard",
      "label": {
        "en": "Chain guard assignment",
        "ko": "체인가드 지정"
      },
      "status": "implemented",
      "evidence": "배선(2026-08-18 MP1-6, guard.test.ts) — guard 액션: 행동 소모·스탠스 진입(guarding)·인게이지 무충전 · 자격 = 気功スタイル(styles.json이 SID_チェインガード許可 부여) 또는 스킬 직접 보유 · ★게이트 신규 판독 = GetGuardType(0x1A34F50) 디스어셈블: **만HP && HP≥2**(미달 = GuardType.NotEnoughHP=3), 차단 상태 비트 0x4D0(사영분 = 기절), DualGuard(2) 분기 = 스킬 Flag bit29(미배선 — combat.engage-guard와 동건) · 수명 = 자기 군 페이즈 복귀 시 해제(⚠춤 재행동 시 지속은 가정 — 실측 대조 대상) · 원 출처 = GuardMenuItem(MAP_COMMANDS §1-4) · 경험치 = combat.exp-chain-guard"
    },
    {
      "id": "actions.enchant",
      "label": {
        "en": "Enchant item/weapon",
        "ko": "인챈트(강화 부여)"
      },
      "status": "absent",
      "evidence": "EnchantItem/EnchantWeaponMenuItem + HasEnchantItem 0x1E4CCE0 + SID_エンチャント(MAP_COMMANDS §1-1) — 발현 = 해당 직업 스킬 보유 유닛 등장 맵"
    },
    {
      "id": "actions.command-skills",
      "label": {
        "en": "Skill-granted map commands",
        "ko": "스킬 파생 맵 커맨드(범용)"
      },
      "status": "absent",
      "evidence": "범용 래퍼 3종 = CommandSkill/OverlapSkill/SubMenuItem(ctor(SkillData) — MAP_COMMANDS §1-4) · 구체 사례 = 환영늑대 생성/해제(SID_幻影狼連携)·계약/소환(SID_契約*, 베로니카 추정)·강행돌파·탈출(의미 미확정 §4) · 어느 스킬이 맵 커맨드로 뜨는지 skill.xml 필터 후속 조사"
    },
    {
      "id": "actions.transporter",
      "label": {
        "en": "Transporter station",
        "ko": "수송정거장"
      },
      "status": "deferred",
      "evidence": "TransporterMenuItem(MAP_COMMANDS §1-1) — 부대 편성 변경 시설. 선행 = 캠페인층(MP5)·해당 시설 실재 맵"
    },
    {
      "id": "actions.god-change",
      "label": {
        "en": "God (emblem ring) change on map",
        "ko": "문장(반지) 변경 커맨드"
      },
      "status": "deferred",
      "evidence": "GodChangeMenuItem + MapSequenceGod(MAP_COMMANDS §1-2·§4 — 정확한 트리거 미확정) · 선행 = 엠블렘 시스템"
    },
    {
      "id": "combat.forecast-formulas",
      "label": {
        "en": "Forecast numbers from Calculator.xml DSL",
        "ko": "예보 수치 = calculator.xml DSL 직접 실행"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts(M002·M003 실기 일치 — 예보 '공격' = 전 타수 합) · 커버리지 52식 중 27 소비(gaps/A §5) · ★IL2CPP로 아키텍처 정합 확정(5.0.0, 2026-08-17, il2cpp/RATES_FORMULA.md §2·§3): 게임 자체가 **calculator.xml 데이터 주도 인터프리터**다 — CalculatorData.OnBuild(RVA 0x298D1B0)가 XML 52행을 ConditionGetterCommand로 등록하고 CalculatorManager.Calculate(RVA 0x298E560)가 float32 역폴란드 스택 머신으로 평가한다(산출식 하드코딩 0건, 식별자 전부 CalculatorCommand 파생 — 命中値=HitCommand RVA 0x1B484E0 등). 우리 엔진의 DSL 직접 실행 구조가 정본과 동형임이 코드로 확인됐다 · 내장 함수 전수 20종(rand/sin/cos/tan/abs/sqrt/log/exp/round/int/min/max/clamp/lerp/pow/strlen/cond/comp/bit/scale) 중 엔진 지원은 5종 = 미지 함수 강하로 죽는 식이 남아 있다(skills.condition-fallback) · ☠파서 우선순위 = 게임은 && 와 || 가 동순위 좌결합(RATES §5-4)"
    },
    {
      "id": "combat.true-hit",
      "label": {
        "en": "True hit model (displayed 50+ = sin hybrid)",
        "ko": "명중 실확률(표시 50 이상 = sin 하이브리드)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17) — 굴림은 1회다: App.BattleMath._IsProbabilityHit(RVA 0x1E8D0E0)가 Random.Game.GetValue(10000) 한 번을 GetHitRatio10000(RVA 0x1E8D200) 임계와 < 비교(2RN 아님). 임계 = 표시<51 또는 =100이면 ratio*100 선형, 51~99면 ratio*100 + sin(pi*(ratio-50)/50)*ratio*13.333333 절삭(상수 0x42480000=50.0·0x3C8EFA35=pi/180·0x42C80000=100.0·0x41555555=40/3, 전 연산 float32) · 하한 페널티 없는 비대칭 상향 곡선 = 최대 편차 표시 78에서 +10.21%p · 엔진 배선 = formula/probability.ts(RULE_VERSION fe17-3에서 선형 1RN 반증 정정) · 상세 = extracted/il2cpp/HIT_RANDOM.md"
    },
    {
      "id": "combat.crit-multiplier",
      "label": {
        "en": "Critical = 3x damage",
        "ko": "필살 = 데미지 3배"
      },
      "status": "anchored",
      "evidence": "공식 도움말 원문 kr '대미지 3배' = us 'triple damage'(system.msbt MID_H_INFO_Crit, gaps/N) · 3회차 간접 방증: patch2.msbt MSID_H_SenerioEngage_Dragon '필살이 2배'는 필살률 2배로 층위가 다름(gaps/N §4-2) · ★IL2CPP 코드 확정(2026-08-17): BattleCalculator.CalcAttackHit(RVA 0x24723A0) 0x024726E8 `add w9,w8,w8,lsl #1` + `csel`(Result.Critical 비트) = 정수 상수 3배, 테이블 아님 · 적용 순서 = SimplePower를 Clamp(0,999)한 뒤 3배(필살 데미지는 999 초과 가능, 상한 2997) · 필살 판정 자체는 sin 곡선을 쓰지 않는 선형(combat.crit-rng) · 미조사 = 체인/인게이지 등 타 경로의 별도 배수 유무(HIT_RANDOM.md §4)"
    },
    {
      "id": "combat.damage-truncation",
      "label": {
        "en": "Damage integerization points (truncate toward zero)",
        "ko": "대미지 정수화 지점(0 방향 절삭)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §3·RATES_FORMULA.md §3-7): 攻撃力·防御力·威力는 계산·클램프까지 **float32로 유지**되고 정수화는 소비 지점에서 fcvtzs(0 방향 절삭, floor 아님 — 하한 0 클램프 때문에 실질 동일)로 한 번 일어난다 · 지점 = 威力 확정 시 1회(CalcAttackHit RVA 0x24726E4) + ダメージ 대입마다(DamageCommand.SetImpl RVA 0x1B46AA0) + 표시(SetBattleInfoForBattle 0x1F06A44) ⇒ **표시값과 굴림값이 같은 정수**임이 코드로 확정 · 필살 3배는 이 절삭 **뒤**에 곱한다(trunc(x)*3 ≠ trunc(x*3)) · 엔진 배선 = formula/combat.ts damage = trunc(clamp(威力計算, 0, 999)) 후 battle.ts가 3배 · 미배선 = Timing 12 ダメージ 계열의 매 연산 절삭(훅 자체가 없음)"
    },
    {
      "id": "combat.skill-sort-key",
      "label": {
        "en": "Skill execution order (SortKey)",
        "ko": "스킬 실행 순서(SortKey 정렬)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §4·SEQUENCE_BREAK.md): 스킬 실행 순서 = HitSkill.SortKey(RVA 0x19B60F0)의 (Timing<<18) + (Order<<11) + 행인덱스 오름차순 · 순서가 결과를 바꾸는 곳은 순차·매회 절삭인 ダメージ/回復 계열뿐이고(威力 계열은 3레지스터 합성이라 순서 무관 — skills.act-values) 그래서 SID_チェインアタック威力軽減(Order=95) 같은 후단 보정의 자리가 이 키로 정해진다 · 엔진 미배선(Timing 11/12 훅 부재라 아직 발현 없음) · SkillData.Priority(+0x94)는 SortKey에 들어가지 않는다(용도 = skills.duplicate-priority)"
    },
    {
      "id": "combat.rng-source",
      "label": {
        "en": "RNG source (xorshift128, per-stream)",
        "ko": "난수원(xorshift128·스트림별)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-17) — App.Random 자체 구현: t=s1^(s1<<11); t^=t>>8; t^=s4^(s4>>19); GetValue(n)=(t&0x7FFFFFFF)%n(RVA 0x2375170). UnityEngine.Random 아님 · 스트림 7종(System/Game/Spot/Hub/HubItem/KillBonus/Combat) 중 전투 판정은 전부 Game(get_Game RVA 0x2374C70) · IsSave(type)=type!=0 → System 외 전 스트림이 세이브에 직렬화 = 로드 후에도 난수열 재현 · ☠모듈로 편향 존재(2^31%10000=3648) — 비트 단위 재현 시 나눗셈까지 이식 필요 · 엔진 현행 = 주입식 RandomSource.next(bound)로 추상화(실굴림 분포는 미이식)"
    },
    {
      "id": "combat.crit-rng",
      "label": {
        "en": "General probability check (linear, 0.001% step)",
        "ko": "일반 확률 판정(필살·발동 — 선형·0.001% 해상도)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-17) — BattleMath.RandomCheck100 → App.Random.IsProbability100(RVA 0x23754B0): percent*1000 > (xorshift&0x7FFFFFFF)%100000. 명중과 달리 sin 보정 없는 선형이고 해상도가 0.001%다 · percent<=0이면 난수를 소모하지 않는다(롤 소비 순서 계약에 직결) · 필살·격추·스킬 발동이 전부 이 경로 · 엔진 배선 = formula/probability.ts isProbability100, battle.ts가 next(100000)으로 소비"
    },
    {
      "id": "combat.forecast-determinism",
      "label": {
        "en": "Forecast/AI simulation is deterministic (RNG bypass)",
        "ko": "예보·AI 시뮬은 결정론(난수 우회)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-17) — BattleMath는 확률 판정을 델리게이트 슬롯(s_CurrentProbability100/Hit)으로 들고, PushSimulation/PopSimulation이 _IsProbabilityTrue(ratio>0)/_IsProbabilityFalse로 스왑한다(SetSimulation RVA 0x1E8D2E0, s_Simulationed 카운터로 중첩 관리) · 호출처 2곳 = BattleInfo.CalcParam(전투 예보)·BattleCalculator.CalcSimulation(AI 시뮬, PushRandomSeed/PopRandomSeed로 RNG 상태까지 저장·복원해 실난수열을 소모하지 않음) · 시사 = 예보는 '명중률 0 초과면 명중'인 결정론 경로 · 난이도·모드별 확률 분기는 없음(바인딩 후보 4종뿐)"
    },
    {
      "id": "combat.follow-up",
      "label": {
        "en": "Follow-up attack from calculator formula",
        "ko": "추격 판정 = calculator 공식"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts 예보 일치 · 追撃条件 원문 = 攻撃速度差 >= 5(gaps/A §2-2) · ★IL2CPP 실행부 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-8): CalcBattleTimesImpl(RVA 0x1E88840, 판정부 0x1E88B6C)이 CalculatorManager로 追撃条件을 평가해 手番回数 = (참 ? 2 : 1)로 대입하고 최종 min(그 값, 장비 잔여 내구)를 적용한다 — 임계 5는 코드 상수가 아니라 calculator.xml 소유(엔진 구조 정합) · ⚠단서 = 식이 읽는 攻撃速度는 BattleParam(ContinuousCommand)이라 0..999 클램프를 통과한 값이다(RATES §6) — 음수 공속이 0으로 잘리므로 초중량 무기에서 엔진과 갈린다(클램프 미배선분 = skills.act-values 잔여)"
    },
    {
      "id": "combat.followup-durability-cap",
      "label": {
        "en": "Follow-up capped by remaining weapon durability",
        "ko": "추격의 잔여 내구 상한"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-8·§3): CalcBattleTimesImpl 최종 단계가 min(追撃条件 ? 2 : 1, UnitItem.Endurance)를 취한다(RVA 0x1E88BBC) — **잔여 내구 1이면 공속차가 5 이상이어도 추격이 없다** · 엔진은 내구 개념이 없어 미발현(선행 = 무기 내구 모델)"
    },
    {
      "id": "combat.counter-range-gate",
      "label": {
        "en": "Counter-attack eligibility gates",
        "ko": "반격 가능 조건(사거리·상태·무기)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §3): CalcBattleTimesImpl(RVA 0x1E88840, 0x1E888E0~0x1E88AE0)이 手番回数를 0/1로 떨어뜨리는 게이트 전수 = UnitUtil.IsAttackRange 불충족 · Status.Rod(지팡이 행동) · BattleInfo.Flags.IgnoreRevenge · EngageCharge · 장비 무기 없음 · 엔진은 '사거리 + 브레이크 + 생존'만 본다(inWeaponRange) = 지팡이·인게이지 충전 등에서 과대 반격"
    },
    {
      "id": "combat.interrupt-order",
      "label": {
        "en": "Interrupt order (Break follow-up)",
        "ko": "割込み(가로채기) 오더 — 브레이크 시 추격"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-12·RATES_FORMULA.md §6): 유일 주체 = SID_ブレイク時追撃(SkillData Flag InterruptOrder, Timing=13 AttackEnd, Condition 攻撃結果(ブレイク)) — CalcInterruptOrder(RVA 0x24700B0)가 手番回数를 +1 한 뒤 CalcOrder 1회를 추가 실행한다(0x2470190) · 위력식은 통상과 동일 = SimplePowerParam.Calculate(0x19B7DC8)가 Status.Interrupting 게이트로 割込み威力計算을 고르는데 그 식이 威力計算과 같다 ⇒ gaps/A §7-4 '割込み 주체 불명' 해소, **결손은 수치가 아니라 순서 층뿐**(선행 = 오더 큐 재작성)"
    },
    {
      "id": "combat.chain-attack-accuracy",
      "label": {
        "en": "Chain attack accuracy: base 80, skills override via '='",
        "ko": "체인 어택 명중률 = 기본 80 고정, 스킬이 = 연산으로 덮어씀"
      },
      "status": "anchored",
      "evidence": "calculator.xml チェインアタック命中率計算=80 + skill.xml SID_チェインアタック命中率(90/100/30/10)% + patch2.msbt MSID_H_Charisma(us 'to 90%', kr은 수치 생략 — 모순 아님, gaps/N §3-1) · 상대에게 강제 30/10%는 Condition=相手の立場==援護 게이트 · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/RATES_FORMULA.md §6): SimpleHitParam.Calculate(RVA 0x19B7BA0)가 side.Status & ChainAttack(4)이면 **식 자체를 チェインアタック命中率計算으로 교체**한다(표준식에 가산하는 방식이 아니다). 필살도 SimpleCriticalParam.Calculate(RVA 0x19B7A20)가 チェインアタック必殺率計算(=0)으로 교체 = 체인어택은 필살이 나지 않는다"
    },
    {
      "id": "combat.chain-attack-damage-cut",
      "label": {
        "en": "Chain attack damage taken cut to 20%",
        "ko": "체인 어택 받는 대미지 = 20%로 감쇠"
      },
      "status": "anchored",
      "evidence": "skill.xml SID_チェインアタック威力軽減(＋) ActValues=0.2(ダメージ*0.2) — 텍스트(인연을 가르는 자)는 수치 생략, 데이터 전용 수치(gaps/N §3-1) · ★IL2CPP 적용 시점 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §3 19단계): Timing=12(HitAffect)·Order=95 = **필살 3배와 정수 절사가 끝난 ダメージ에 0.2를 곱하고 다시 절사**한다(威力 단계가 아니다) · ☠엔진은 Timing 11/12 훅 자체가 없어 미배선 — 배선 시 DamageCommand.SetImpl(RVA 0x1B46AA0)처럼 매 연산 절사·SortKey 순차여야 한다(combat.skill-sort-key)"
    },
    {
      "id": "combat.strike-order",
      "label": {
        "en": "Strike order: chain, attack, counter, follow-ups",
        "ko": "타격 순서: 체인→본공격→반격→추격→적추격"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 실행부 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-2~2-5): 전투 = 4단 중첩(Battle > Order > Action > Attack) — CalcNormalBattle(RVA 0x246B580)이 공격측/방어측 교대 오더 큐(0,1,0,1,… 8슬롯)를 만들고, CalcOrders(OrderList)(RVA 0x246BC30)가 각 슬롯에서 **CalcChainAttack을 CalcOrders(side)보다 먼저** 호출하며(0x246BD70), CalcOrders(BattleSide.Type)(RVA 0x246FA50)가 min(手番回数,4) 게이트로 실행 여부를 정한 뒤 CalcOrder→CalcAction(RVA 0x2470D60)→CalcAttack(RVA 0x2471060)이 行動回数·攻撃回数만큼 반복한다 · ⇒ **체인어택이 본공격보다 먼저**이고 종전 '본공격 뒤' 가정은 반증됐다(엔진 정정 완료 — battle.test.ts 체인 선행·난수 소비 순서 갱신) · 잔여 축약 = 측당 3중 카운터를 2단으로 접은 것(별건 = combat.turn-count·combat.strike-count·combat.order-flow-skills)"
    },
    {
      "id": "combat.strike-count",
      "label": {
        "en": "Multi-strike per engagement turn (attack count 2+)",
        "ko": "타격 횟수(攻撃回数 2 이상)"
      },
      "status": "absent",
      "evidence": "攻撃回数 = 1턴당 타격 수 · SID_助太刀/半身_竜族 = 2 · 엔게이지 기술 4~9(gaps/A §0-2) — 엔진은 1 고정 · ★IL2CPP 실체 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-5): 攻撃回数 = BattleDetail.AttackCount(BaseParams[2])이고 CalcAction(RVA 0x2470D60)이 1..AttackCount 회 CalcAttack을 반복한다(그 위 계층이 行動回数만큼 CalcAction 반복) · 훅 = AttackCountCommand·ActionCountCommand(skills.flow-hooks) = 어휘 결손이 아니라 전투 해결층 상태 결손"
    },
    {
      "id": "combat.turn-count",
      "label": {
        "en": "Engagement turn count model",
        "ko": "手番回数(교전 턴 수) 모델"
      },
      "status": "absent",
      "evidence": "手番回数 = 측당 교전 턴 수(0=반격 없음·2=추격) · SID_追撃不可 = min(手番回数,1)(gaps/A §0-2) — 엔진은 boolean followUp 축약 · 3회차 재확인: skill.xml SID_切り返し가 Condition=手番回数==1 게이트 하에 手番回数=2를 직접 대입 — 추격이 手番回数 스칼라 대입으로 구현됨을 실물로 확인(gaps/N §3-4, 제안 id combat.followup-representation 병합) · ★IL2CPP 실체 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-4·2-8): 手番回数 = BattleInfoSide.BattleTimes(+0xB0), 상한 4 — CalcOrders(side)(RVA 0x246FA50, 게이트 0x246FAEC)가 min(BattleTimes,4) <= TotalOrder로 실행을 끊는다. 추격 = 2 · 브레이크 = 0 · 割込み = +1 · 카운터 증가 지점은 SeparatorScope.Dispose(RVA 0x19B6E60)"
    },
    {
      "id": "combat.order-flow-skills",
      "label": {
        "en": "Order-altering flow skills (Vantage etc.)",
        "ko": "순서 변경 흐름 스킬(待ち伏せ 등)"
      },
      "status": "absent",
      "evidence": "SID_待ち伏せ(HP<=25%)·SID_攻め立て(総手番回数==0) = ActNames 없는 흐름 스킬 — 실행부 소유(gaps/A §0-2) · ★IL2CPP 기전 3종 전부 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-13): 待ち伏せ/攻め立て = SkillData.Flags.SwapOrder → CalcOrders가 다음 두 오더 슬롯을 스왑(0x246BD18) · スマッシュ = Flags.ForceLateOrder → CalcNormalBattle이 오더 큐를 1,1,1,1,0,0,0,0으로 구성(0x246B914, IsLateOrder RVA 0x246BA50) · SID_ブレイク時追撃 = Flags.InterruptOrder(별건 = combat.interrupt-order) · ⇒ 순서 변경은 전부 **오더 큐 재배치**이지 개별 타격 삽입이 아니다 = 엔진의 고정 5단 축약으로는 표현 불가(오더 큐 재작성 선행)"
    },
    {
      "id": "combat.advantage",
      "label": {
        "en": "Weapon triangle (sword>axe>lance, arts>bow/knife/tome)",
        "ko": "상성(검>도끼>창>검·체술>활/단검/마도서)"
      },
      "status": "anchored",
      "evidence": "相性補正 = 0;0;0(정본 전수, gaps/A §2-3) — 수치 보정 없음, 상성 효과는 브레이크뿐 · M2 정본(역방향 우위 없음) · ★IL2CPP 코드로 재확인(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §4·SEQUENCE_BREAK.md §3): BattleDetail의 BaseParams 20칸·BattleParams 12칸 전수에 상성 보정항이 **부재**하고, 상성의 유일한 소비처는 CanBreakable(RVA 0x1E89CB0)이 무기 kind 인덱스로 테이블을 뽑아 상대 kind 비트를 검사하는 브레이크 판정뿐이다 · ⚠엔진의 BEATS 하드코딩과 그 테이블(0x1C47C0 경유)의 전수 동치는 미대조"
    },
    {
      "id": "combat.advantage-skills",
      "label": {
        "en": "Advantage-conditional skills",
        "ko": "상성 조건 스킬(武器相性激化·相性激化)"
      },
      "status": "absent",
      "evidence": "combatEnv에 武器相性 변수 부재 = 전부 무발동(안전 강하) · ActNames 시점 해석 미확정(부호 반전 위험, gaps/A §7-1) — 실기 표본 선행"
    },
    {
      "id": "combat.break",
      "label": {
        "en": "Break: advantage + hit forfeits counters",
        "ko": "브레이크: 상성 유리+명중 = 반격 몰수"
      },
      "status": "implemented",
      "evidence": "battle.test.ts · ★IL2CPP 조건 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-6): CalcAttack(0x2471840~) 안에서 **매 타격마다** 평가 — 명중 + 확정 대미지 1 이상 + current.SideType==Offense + reverse.SideType==Defense + CanBreakable(RVA 0x1E89CC8, 상성표) + 미브레이크. 효과의 실체는 '반격 불가'가 아니라 SID_気絶(States.Stun) 부여 → CalcBattleTimesImpl이 手番回数 0을 반환하는 것(combat.break-recovery) · ☠엔진 미배선 2건 = (a) 브레이크 판정을 kind==='attack'으로 한정해 **추격 타격에서 성립하지 않는다**(코드는 몇 번째 手番인지 보지 않는다 — 본공격 빗나가고 추격이 명중해도 브레이크) (b) 페이즈 종료 해제가 nextForce 유닛에만 걸린다(3군 맵 과대) — 둘 다 SEQUENCE_BREAK §4 F2·F3"
    },
    {
      "id": "combat.break-immunity",
      "label": {
        "en": "Break immunity (armored style, null skill)",
        "ko": "브레이크 면역(중장 스타일·무효 스킬)"
      },
      "status": "implemented",
      "evidence": "battle.test.ts 면역 SID 4종(相性ブレイク無効·ブレイク無効·_効果·인챈트판) — LunaticSids 어댑터 미배선은 §0 등재(gaps/FIX_NOTES F2) · ★IL2CPP 정본 확정(5.0.0, 2026-08-17, il2cpp/SEQUENCE_BREAK.md §2-6): 면역의 정본은 SID 목록이 아니라 **BadIgnore 비트** — CanBreakable(RVA 0x1E89CC8)이 reverse.MaskSkill.BadIgnore & (Stun 1024 | Interact 2048)로 차단하고, skill.xml SID_ブレイク無効_効果=1024·SID_相性ブレイク無効=2048·SID_EN_技の薬_効果_ブレイク無効=1024가 그 비트를 세운다. 重装スタイル은 스타일 문자열이 아니라 **job.xml이 SID_相性ブレイク無効을 부여**하는 경로다 · 별도로 Status.NotStun이면 GetBreaked가 Result.Ignore · ⇒ 엔진의 'SID 4종 + 스타일 문자열' 근사는 같은 결과를 내지만 신규 데이터(루나틱·인챈트·부여 스킬)에서 갈린다"
    },
    {
      "id": "combat.break-recovery",
      "label": {
        "en": "Break recovery: after one defended combat, or own phase start",
        "ko": "브레이크 해제 = 피격 전투 1회 직후 또는 자기 군 페이즈 시작"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드로 종결(2026-08-17, il2cpp/SEQUENCE_BREAK §2-7): 브레이크의 실체 = SID_気絶(States.Stun) 부여이고 효과는 '반격 불가'가 아니라 **手番回数 = 0**(그 전투에서 오더를 못 받음) · 해제 = 두 경로 중 먼저 오는 쪽 — (A) 그 유닛이 참여한 다음 전투의 커밋 시점(BattleCalculator.CommitUnit 0x2477B70, 그 전투에서 다시 브레이크되지 않았을 때) (B) 페이즈 종료 시 무조건(MapSequence.TurnEnd → Unit.ResetPhaseEnd 0x1A19EF0, 데이터도 SID_気絶 Cycle=3=PhaseAfter) · ⇒ kr 원문 '한 번 전투를 하거나 다음 턴이 되기 전까지' = (A) or (B)로 정확히 대응하고 us 원문은 (A)만 적은 축약이었다(원문 불일치 해소) · 발동 조건 = 명중 + 확정 대미지 1 이상 + 공격 주체가 Offense이고 피격이 Defense(**반격·체인어택으로는 브레이크가 발생하지 않는다**) + CanBreakable(무기 상성 비트) + 미브레이크 · ☠면역의 정본은 SID 목록이 아니라 **BadIgnore 비트**(ブレイク無効_効果=1024/Stun · 相性ブレイク無効=2048/Interact, 重装スタイル 직업이 후자를 부여) — 엔진은 아직 SID 목록으로 근사한다 · 기존 근거: 사용자 실기 대조 2026-08-17(reference/screens break_recovery_1~3 — 피격 시 유지·직후 해제·적턴 시작 해제) · battle.test.ts breakRelease · kr 도움말 두 절 모두 확정(E §1-1 불일치 해소) · 3회차 patch0-3 전수 후에도 브레이크 자동 해제 타이밍 서술 0건 재확인 — 텍스트 축 경로 종결(gaps/N §4-2)"
    },
    {
      "id": "combat.chain-attack",
      "label": {
        "en": "Chain attack (backup style in range)",
        "ko": "체인어택(연계 스타일·사거리 내 협공)"
      },
      "status": "anchored",
      "evidence": "수치 = calculator · battle.test.ts · ★IL2CPP 코드로 가정 2건 종결(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §3·SEQUENCE_BREAK.md §2-10): 위력 = 통상 파이프라인을 타되 13단계 식만 max(相手のMaxHP*0.1, 1)로 바뀌고(SimplePowerParam.Calculate 0x19B7D88, Status.ChainAttack 분기) Clamp(0,999) 뒤 fcvtzs로 절사 = **floor 가정이 옳았다**(하한 0 클램프라 trunc=floor) · 순서 = 오더 큐 실행 직전 1회이고 전투당 1회(BattleInfo.Flags.ChainAttacked) — 엔진 정정 완료 · 명중 80 고정·필살 0 고정이라 필살 3배는 발생하지 않는다 · ⚠미확정 = 참가 자격의 정본(ForceChainAttack/JoinChainAttack 반영은 BattleInfo 구성 단계 소유) — 엔진은 '연계 스타일 + 자기 무기 사거리'로 근사"
    },
    {
      "id": "combat.chain-guard",
      "label": {
        "en": "Chain guard",
        "ko": "체인가드"
      },
      "status": "assumed",
      "evidence": "★수명 정정(2026-08-19 MP8 A1 §4, RULE_VERSION fe17-11) — **전투당 유닛 1회**이고 **성립하면 스탠스가 소모**된다. 종전에는 가드를 전투 시작에 한 번 구해 전 타격에 재사용했고(추격 있는 전투에서 대미지 과소·가드 HP 과대) 스탠스는 자기 활성화 복귀까지 남았다. 정본 = 성립 즉시 `Status.ChainGuarded`(0x2471740)를 새겨 다음 타격 후보에서 제외(0x246F578) + `CommitUnit`(0x2477FB8)이 `Unit.Status.ChainGuard(64)` 제거(DualGuard는 미소모). ☠**이미 있던 테스트가 옛 거동을 고정하고 있었다**(다타격 2회 블록을 기대값으로 박아 둠) — 정본으로 되돌렸다. 다른 가드가 이어받는 것은 허용(첫 후보 = ChainGuarded 없는 사이드). 배선(2026-08-18 MP1-6, guard.test.ts) — 치환 = 대상 대미지 0(브레이크 불발)·가드 trunc(현재 HP*0.2)·하한 없음·guardBlock 이벤트(절대 재생)·**가드가 서면 필살 롤 무소비**(CalcAttackHit 통째 스킵 = 난수 계약, CalcAttack 0x24716BC) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-9·SEQUENCE_BREAK.md §2-11): 대미지 = trunc(가드 유닛의 **전투 내 현재 HP**(BattleInfoSide.Hp +0x94) * 0.2)이고 **하한 1이 없다**(HP 4 이하면 0) · 산식 선택 = GetChainGuardDamage(RVA 0x24720C0)가 Unit.Status.ChainGuard(64) 분기에서 calculator의 チェインガードダメージ를 평가 · 발동 게이트 = CalcChainGuardSide(RVA 0x246F3C0) — 피격 측이 Defense 또는 ChainDefense1~4일 때만 · 공격 측이 체인어택이면 무효 · BattleInfo.Flags.EngageAttack(인게이지 기술)이면 무효(둘 다 엔진 반영) · ⚠가정 = 보호 범위 인접 1(공식 도움말 '隣接する味方' 앵커 — 열거 코드 CalcChain 미판독)·복수 가드 선두 선택 = 유닛 목록 순"
    },
    {
      "id": "combat.engage-guard",
      "label": {
        "en": "Engage guard",
        "ko": "엔게이지 가드"
      },
      "status": "absent",
      "evidence": "エンゲージガードダメージ = 0(가드 측 HP 손실 없음 — 체인가드 HP*0.2와 대비, gaps/A §0-2) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-9): 같은 함수 GetChainGuardDamage(RVA 0x24720C0, 분기 0x2472260)의 두 번째 분기 = Unit.Status.DualGuard(128)이고 값 0은 calculator.xml 식 그대로 = 가드 유닛도 무피해 확정"
    },
    {
      "id": "combat.engage-attack-damage-type",
      "label": {
        "en": "Engage-technique damage is a distinct type (separately mitigable)",
        "ko": "인게이지 기술 대미지 = 독립 유형(별도 감쇠 대상)"
      },
      "status": "assumed",
      "evidence": "patch3.msbt MSID_H_JobSkill_ShadowPrincessR '인게이지 기술로 공격받았을 때 받는 대미지-20%' — 텍스트 단서(gaps/N §4-1 #9) · ★IL2CPP 판별 비트 규명(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §6): 피격 측 Unit.Status.EngageAttacked(0x4000000) / 사용 측 EngageAttack(0x1000000) / BattleInfo.Flags.EngageAttack(4096) 3종이 실재해 스킬 조건이 인게이지 기술 여부를 읽을 수 있다 · 같은 플래그가 체인가드를 무효화한다(인게이지 기술은 가드 불가) · ⚠'독립 대미지 유형'인지 '조건부 감쇠'인지는 여전히 미확정 = 별도 감쇠 파이프라인은 발견되지 않았고 조건 게이트만 확인됐다"
    },
    {
      "id": "combat.smash",
      "label": {
        "en": "Smash weapons (knockback, no first strike)",
        "ko": "스매시 무기(밀치기·선공 불가)"
      },
      "status": "absent",
      "evidence": "정식화 — SID_スマッシュ 28건 ActNames(넉백100%·거리1)+SID_追撃不可 동시 부여(gaps/B §5) · 규칙 원문 4종(gaps/E §1-5) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-11·SEQUENCE_BREAK.md §3): '선공 불가'의 실체 = Flags.ForceLateOrder → CalcNormalBattle이 오더 큐를 1,1,1,1,0,0,0,0으로 재배치(0x246B914) = 방어측이 자기 手番을 전부 먼저 소화하는 것이지 공격 자체가 늦어지는 게 아니다 · 넉백 = BlowRatio/BlowDistance BaseParam이고 **damage >= 1일 때만** 판정(CalcAttackHit 0x24726F0 cmp/b.lt) — 0 대미지면 넉백 없음 · 대미지 산식에는 무영향"
    },
    {
      "id": "combat.weight-build-overflow",
      "label": {
        "en": "Weight-over-build damage bonus (physical, cap +5)",
        "ko": "무게 초과 대미지 = min(무기 무게-체격, 5), 물리 한정"
      },
      "status": "anchored",
      "evidence": "skill.xml SID_重撃 威力 += min(武器の重さ-体格,5), Condition=攻撃属性==物理属性 && 武器の重さ>体格 + patch1.msbt MSID_H_HeavyAttack(중격, kr/us 일치, gaps/N §3-4)"
    },
    {
      "id": "combat.effectiveness",
      "label": {
        "en": "Effectiveness (armored, cavalry, flying, dragon)",
        "ko": "특효(중장·기병·비병·용족 등)"
      },
      "status": "implemented",
      "evidence": "정식화 완결 — 판별 = Attrs 비트(job|person OR 합성, Efficacy 비트와 반례 0 — gaps/H) · 배수 = EfficacyValue 3(17/18행, 邪竜特効만 2 — gaps/I 정정) · 무기 위력에만 곱함(gaps/A) · 데이터 사영 완료, 배선만 결손 · 3회차 텍스트 경로 종결 권고: patch0-3 전수에서 특효는 攻撃結果(特効) 불리언으로만 등장(혜안 +5는 가산 보정, 배수 아님) — 배수 확정은 실행부/실측 전용(gaps/N §4-2) · ★IL2CPP 코드로 합성 규칙까지 종결(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-3·SKILL_ENGINE.md §4): 배수 = SkillArray.GetEfficacyValue(Unit)(RVA 0x24895A0) — 초기 1에서 매치마다 Mathf.Max(acc, skill.EfficacyValue)(0x24896FC)라 **중복 특효는 곱이 아니라 최댓값**이고 무매치 기본은 1 · 마스크 = (공격자.m_Efficacys & 대상.(Person.Attrs|Job.Attrs)) & ~대상.MaskSkill.m_EfficacyIgnores(0x24895F0 bics) · 저장처 = BattleDetail.WeaponEfficacy = m_BaseParams[10], IsEfficacy()(RVA 0x1E768C0) = >1 · 곱하는 자리 = calculator 攻撃力計算의 武器攻撃力 항에만(BattleDetail.CalcAttack RVA 0x1E74400) · ★배선 완료(2026-08-18): combatEnv efficacyOf — Efficacy ∩ (attrs ∖ 대상 EfficacyIgnore 합집합)·EfficacyValue 최댓값·무기 위력에만 적용, 원천 = 무기 EquipSids 사영(effectiveSkills 합류) + UnitState.attrs(person|job OR) — efficacy.test.ts 4건"
    },
    {
      "id": "combat.terrain-bonus",
      "label": {
        "en": "Terrain avoid/defense bonuses",
        "ko": "지형 회피·방어 보정"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts 예보 일치에 포함 — 스타일 변형(隠密 2배·魔法 무시)은 units.style-grant-skills 소관(코퍼스 케이스는 비해당 스타일) · 3회차 교차자료: patch0.msbt MSID_H_CamillaEngage(천구)가 '지형 효과를 받지 않게 된다'는 무효화 경로 보유(gaps/N §4-2) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-11·DAMAGE.md §2-4): 지형 보정은 **베이스 지형(+0x40)과 오버레이 지형(+0x48) 2층을 각각 합산**한다(BattleDetail.CalcDefense RVA 0x1E746C0 / CalcAvoid RVA 0x1E74900) — ★2층 배선 완료(2026-08-18, MP3 3-2): BattleMap.overlays + terrainBonusAt 2층 순회 합산(대체 아님) — terrain.test.ts 森+瘴気 가산 · 진영 비대칭항은 별건(combat.terrain-asymmetric)"
    },
    {
      "id": "combat.effectiveness-ignore",
      "label": {
        "en": "Effectiveness immunity/negation",
        "ko": "특효 무효(가호·배리어)"
      },
      "status": "absent",
      "evidence": "EfficacyIgnore 비트 — 神竜の加護 127(전 일반 특효)·バリア 32(邪竜만) · 보스 전용 특효 12비트는 무효 대상 아님(gaps/H) · ★IL2CPP로 적용 주체 정정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4·DAMAGE.md §4): 무효 비트는 **피격 대상 자신의** SkillArray 캐시에서 걸린다 — GetEfficacyValue(RVA 0x24895A0)가 target.MaskSkill.m_EfficacyIgnores(unit+0xF0 → +0x34)로 특효 마스크를 BIC 제거한다(공격자 측 판정이 아니다). SkillData.EfficacyIgnore(+0x1AC)가 그 비트의 소스 · ★배선(2026-08-18): efficacyOf가 대상 유효 스킬 EfficacyIgnore 합집합을 BIC — efficacy.test.ts 特効無効 케이스"
    },
    {
      "id": "combat.terrain-asymmetric",
      "label": {
        "en": "Force-asymmetric terrain modifiers",
        "ko": "자군/적군 비대칭 지형 보정(瘴気 등)"
      },
      "status": "implemented",
      "evidence": "TID_瘴気 등 PlayerDefense/EnemyDefense 별도 보정 실재 — 파이프라인 4필드 추출 완료, BattleMap.terrain 단일값 스키마(gaps/D §3) · ★IL2CPP 식 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-4·MOVE_TERRAIN.md §3): TerrainDefense = terrain.Defense + (force==Player ? PlayerDefense(+0x5E) : force==Enemy ? EnemyDefense(+0x5F) : 0), 회피도 동형이며 **우군(Ally) 이상은 가산 없음** — BattleDetail.CalcDefense(RVA 0x1E746C0, 분기 0x1E7470C~0x1E74764) · 오버레이 층도 같은 규칙으로 추가 합산 · ★배선(2026-08-18, MP3 3-1): TerrainCell 비대칭 4필드 + terrainBonusAt 단일 정본(toCombatant·staffHitRate 소비) — terrain.test.ts 瘴気 자군 −20/적군 +20/우군 0 · 잔여 = 오버레이 층 합산(3-2)"
    },
    {
      "id": "combat.support-bonus",
      "label": {
        "en": "Support (bond) bonuses (adjacent only)",
        "ko": "지원(인연) 보정 — 인접 1타일"
      },
      "status": "absent",
      "evidence": "☠☠**런타임 미배선 — 화면 수치에 지원 보정이 들어가지 않는다**(2026-08-19 전수 확인, MP8 A8). 종전 이 항목은 `anchored` + '배선 완료'였는데 **그것이 거짓이었다**: 배선된 것은 엔진 층뿐이고 앱은 입력을 하나도 안 준다. `supportOf`(battle.ts)의 입력 3개가 전부 부재 — (1) `supports.json`의 런타임 소비처가 **0곳**(소비처 = 파이프라인 생성 + 테스트 2곳뿐), `boardStore.ts`가 `createReducer(calculator)`로 supportEffects를 안 넘긴다 (2) `fe17.ts`가 `supportCategory`를 사영하지 않는다(파일 내 support 언급 0건) (3) 유닛별 絆 레벨(`u.supports`)의 챕터 기본값이 없다(선행 = 챕터별 絆 레벨 배선, gaps/O §10). ⇒ 세 게이트가 전부 열려야 값이 산다. ★엔진 층 자체는 구현·검증돼 있다(아래 판독은 유효) — 되살릴 때 다시 판독할 필요 없다. 이 항목이 `anchored`로 게시돼 있던 것이 **층별 테스트가 다 통과해도 사이가 끊기면 기능은 죽는다**의 실물 사례다. 이하 = 엔진 층 근거: battle.test.ts 5건 · 발동 거리 = 인접 1타일(사용자 실측 2026-08-17) · 수치 = supports.json(支援効果 6×4 — D §1-1 전사 오류 정정, FIX_NOTES_3 §2) · ★IL2CPP 코드로 가정 3건 전부 종결(2026-08-17, il2cpp/SUPPORT.md): 거리 = 맨해튼 1(SupportCalculator.Range=1 + MapFor.EachRange(near=1,far=1)의 |dx|+|dz| 게이트 — **대각 미발동 확정**) · archetype = **파트너**의 SupportCategory(UnitReliance.TryGetSupportData 0x1C5B150이 unitB의 PersonData+0x80만 인덱싱 — 수혜자설 기각, 현행 엔진 정합) · 복수 파트너 = 단순 합산·상한 없음(MaxShowUnits=4는 UI 표시 슬롯 전용) · 파트너 자격 = 엄격 동일 Force.Type(동맹 세력 제외 — IsAllide를 쓰지 않는다) · 평가 = 전투 정보 산출 시 양측 1회 고정(매 타격 재계산 아님), 좌표는 이동 후 전투 지점 · ☠Level 4 = **A+**이지 S가 아니다(RelianceData.Level None0/C1/B2/A3/APlus4 — 경험 승급은 A까지, A+는 엠블럼 링크 경로) · 회귀 방지 테스트 2건(archetype 소유자·타 세력 배제) · 예보 패널 표시는 §0 미룸 · 3회차 재확인: 표준 命中値計算·回避値計算에 支援命中·支援回避 항이 실재함을 포탄식(SID_弾丸命中) 대조로 재확인 — 발동 거리 조건은 여전히 텍스트·계산식 어디에도 부재(gaps/N §4-2)"
    },
    {
      "id": "combat.status-effects",
      "label": {
        "en": "Status effects (poison, freeze, ...)",
        "ko": "상태이상(독·동결 등)"
      },
      "status": "absent",
      "evidence": "정식화 — skill.xml BadState 비트(독3단·침묵·이동불가·약체화·기절), 부여 GiveSids·해제 RemoveSids(gaps/B·D) · 독 = 피격 대미지 증가 실기 확정: ★1스택 = +1(치료 전후 5→4, reference/screens poison_damage_1~2 정정판 — ActNames '相手の威力+1' 문자 그대로 정합) · 3회차 재해석으로 '데미지식 해석 모호' 해소(gaps/B §7 [3회차 2026-08-17]): Action=2 코호트 52행 전수가 피격측이고 그중 이름이 효과를 말하는 アイクエンゲージスキル_ダメージ50%減·確率被ダメ半減이 동일하게 '相手の威力*0.5' — 반전 표기 가설 기각 · ★승격(중첩 아닌 치환) = 원문 확정: scripts/g002_gimmick.txt 毒ガスによる状態異常を付与する()가 解除(하위)→装備(상위) 사슬을 그대로 구현하고 개발자 주석이 '1つ上の状態にする'·'上書きする' — 劇毒에서 포화(위 분기 없음) · 남는 결손은 미실측 = 猛毒 +3·劇毒 +5(1스택 실측 + 동일 필드 구조의 연역)·Power 필드 의미(3단 전부 5로 동일해 효과 크기와 무관)·단검 연타 승격의 구현 위치 = ★IL2CPP 코드 확정(2026-08-17, 실측 불요로 종결): SkillData.GroupAssign(RVA 0x248D0C0)이 skill 테이블을 행 순서대로 훑어 Priority 연속 오름차순 구간을 그룹으로 묶고 LowSkill(0x268)/HighSkill(0x270)로 잇는 **범용 승격 사슬 기구**가 실재하며, Unit.AddGiveSkill(0x1A5D430)이 재부여 시 한 단계 위로 치환하고 AddPrivateSkill(0x1A37990)이 하위 티어를 제거해 **공존 불가**다 — 즉 2회 명중 = 猛毒 +3 확정, 중첩(+2) 기각(statusPoison.test.ts의 예측과 일치) · 독 발동 지점도 확정 = Timing=10(HitBefore, CalcAttack이 타격마다 여는 단계)·Action=2(보유자가 맞는 타격만)·Stand=0(주도권 무관)이라 '맞는 매 타격의 威力 단계에 +N, 守備 차감 이전' · ☠猛毒 부여 경로 = XML GiveSids 0건·Lua 1건(g002 승격 사슬)뿐 · Life=0 무제한(해제 = デトックス/毒消し) · 蛇毒은 BadState=0 별계통(%HP DoT) · 사룡 전용 송곳니의 저주는 별도 정식화 완결(combat.status-fang-curse, 3회차 — gaps/N §3-3) · 위 전부 실행 검증 = engine/tests/statusPoison.test.ts(13) + 스크래치 verify_poison_lua.mjs · 독의 ActNames(相手の威力) 배선 부재로 absent 유지(선행 = skills.opponent-act) — ★상태 보관·지속·부여 골격은 2026-08-17 MP1-5로 실재한다(combat.status-staff: UnitState.statuses·status 이벤트·페이즈 에이징) = 독 배선의 선행 절반 해소"
    },
    {
      "id": "combat.status-staff",
      "label": {
        "en": "Staff statuses: freeze, silence, stun (apply/duration/gates)",
        "ko": "지팡이 상태이상 — 이동불가·침묵·기절(부여·지속·게이트)"
      },
      "status": "implemented",
      "evidence": "배선 완료(2026-08-17 MP1-5, staffInterfere.test.ts): 부여 = item GiveSids → skills.json 행(BadState·Life) 사영 → UnitState.statuses(+status 이벤트 절대 재생) · 재부여 = 치환(Unit.AddGiveSkill 0x1A5D430 — 중첩 기각, age 리셋) · 지속 = Cycle=3(PhaseAfter)이라 Life×3 페이즈 에이징(SkillArray.OnBuild 0x248AB64 PhaseCycle=3 — 3세력 1턴과 정합), 페이즈 종료마다 전 유닛 age+1 → 이동불가·침묵(Life 1)은 걸린 반대편 페이즈 정확히 1회 봉쇄 · 효과 게이트 = 침묵(32) 지팡이 봉인(Unit.IsSilence 0x1A393D0)·이동불가(256) moveBudget 0·기절(1024) 전 행동 거부 · ☠気絶 Life=0 = 무제한 해석(독 선례) — 실기 지속 대조 대상 · ☠해제 수단(デトックス·レスト·축복)·면역(BadIgnore 마스크)·수면(16)/매료(64)/혼란(128) 부여원 미배선"
    },
    {
      "id": "combat.status-fang-curse",
      "label": {
        "en": "Fang curse: max HP -5 per stack, 4 discrete tiers",
        "ko": "송곳니의 저주 — 최대 HP -5씩 4단(-5/-10/-15/-20)"
      },
      "status": "anchored",
      "evidence": "item.xml IID_牙 + skill.xml SID_牙呪 / SID_牙呪_発動(Condition=相手のMaxHP>5 && 相手の生存) / SID_牙呪_効果_最大HP_-5..-20(4단 이산 SID, EnhanceValue.Hp, BadState=512, Cycle=7/Life=1) + patch2.msbt MIID_H_Fang(kr '최대 -20' = 연속 누적 아닌 4티어 승격) — combat.status-effects §7 언급분의 정식화 완결(gaps/N §3-3)"
    },
    {
      "id": "combat.staff-hit",
      "label": {
        "en": "Offensive staff hit/avoid",
        "ko": "방해 지팡이 명중·회피"
      },
      "status": "anchored",
      "evidence": "배선 완료(2026-08-17 MP1-5, staffHitRate — staffInterfere.test.ts, 예보·reduce 공용): 妨害杖命中値 = 魔力+技+武器命中(item Hit) · 妨害杖回避値 = int((魔防*3+幸運)/2)+地形回避 — calculator.json 원문 소비, 각 0..999 클램프 후 차를 0..100 클램프·절삭 · ★IL2CPP 게이트 확정(RATES_FORMULA.md §6): HitParam.Calculate(0x19B7850)가 side.Status & InterferenceRod(1024)면 식 교체, AvoidParam.Calculate(0x19B73C0)는 **상대측** 게이트 · 지팡이 전용 명중률 식은 없다 — CalcRodAttack(RVA 0x24731E0 디스어셈블 재확인)이 RodType==3에서 SimpleHit 그대로 절삭 후 BattleMath.RandomCheckHit(sin 곡선 공용, 명중 롤 10000 1회) · ☠스킬 보정 레지스터(Add/Scale)는 미배선 가정 · 支援命中/回避 항은 원문 식에 없음(무배선이 정합)"
    },
    {
      "id": "combat.range-hit-falloff",
      "label": {
        "en": "Range-based hit falloff (-10 per tile from range 4)",
        "ko": "원거리 명중 감쇠(4칸부터 칸당 -10)"
      },
      "status": "assumed",
      "evidence": "SID_弾丸命中의 cond(戦闘距離>=4,(戦闘距離-3)*10,0) 항 — 유일 적용처 = weapons.cannon-hit-model(포탄), 다른 무기군에서 동일 항 미발견(gaps/N §4-1) · ★IL2CPP 대조(5.0.0, 2026-08-17, il2cpp/RATES_FORMULA.md §6): 코드에 포탄 전용 명중 함수는 **없고** SID_弾丸命中은 ActNames `命中値;` op `=;`로 HitCommand.SetImpl을 호출해 표준 技*2 식을 교체하는 평범한 스킬이다(ExecuteImpl RVA 0x248E470 Equal 분기) · 戦闘距離는 BattleDistanceCommand(RVA 0x1B45A00) 실재 · ⇒ **범용 거리 감쇠 룰은 코드에 없다** = 포탄 스킬 한정이라는 해석이 지지되나, 다른 무기의 동일 항 부재를 '전수'로 확인한 것은 아니라 assumed 유지"
    },
    {
      "id": "combat.hp-stock",
      "label": {
        "en": "Boss HP stocks (multi-phase revival)",
        "ko": "보스 HP 스톡(다단부활)"
      },
      "status": "absent",
      "evidence": "사영 복원 완료(hpStock·state1 — projection.test.ts, FIX_NOTES_2 P1) · 비영값은 미변환 챕터에만(m017·m025·g/e 계열) · ★IL2CPP 경로 확정(5.0.0, 2026-08-17, il2cpp/DAMAGE.md §2-10·§4): 소비는 전투 계산기가 아니라 **커밋 계층**이다 — TryAddDeadScene(RVA 0x2472D20)이 사망 시 Unit.CanRevive(RVA 0x1A4F860 = HpStockCount + ExtraHpStockCount != 0)를 묻고 Unit.Revive(RVA 0x1A4F8B0)가 부활시킨다 · 출처 = DisposData.HpStockCount(+0xB0) · HP 반영 자체는 CommitHp(RVA 0x1E88580) = clamp(Hp - (Damage - Heal), 0, MaxHp) — 회복이 같은 프레임에서 상계되고 MaxHp 상한도 있다(엔진은 상계·상한 모두 없음) · 부활 후 HP·상태 규칙은 여전히 미판독 · ★국면 사영 배선(2026-08-18, MP3 이벤트 5라운드): UnitState.hpStock + BoardUnitProp/projectUnit 사영 + 이벤트 네이티브(UnitGetHpStock·UnitGetHpStockMax·UnitSetHpStock)·hpStock 절대 이벤트·재생 — ☠**사영·이벤트만**이고 부활 거동은 여전히 미배선이다(부활 후 HP·상태 미판독이라 굴리면 픽션). UnitGetHpStockMax는 초기 원값을 국면이 안 들어 현재값으로 강하(⚠근사)"
    },
    {
      "id": "combat.scripted-modifiers",
      "label": {
        "en": "Script-injected combat modifiers",
        "ko": "스크립트 주입 전투 보정"
      },
      "status": "absent",
      "evidence": "Lua UnitCommandPrepare 명중 보정 주입(m000/m001) · BattleAfter 보스 AI 전환(m017)(gaps/M §3)"
    },
    {
      "id": "combat.kill-bonus",
      "label": {
        "en": "Kill bonus drops",
        "ko": "격파 보너스 드롭"
      },
      "status": "absent",
      "evidence": "killbonus.xml 격파/피격파 드롭 확률 테이블 — 파이프라인·엔진 소비 0, dispos Item.Drop과 별개 계층(gaps/L)"
    },
    {
      "id": "combat.exp",
      "label": {
        "en": "EXP from calculator formulas and tables",
        "ko": "경험치 = calculator 원문 공식+테이블"
      },
      "status": "assumed",
      "evidence": "체인 횟수 정정(battle.test.ts, gaps/FIX_NOTES F1) · SID_血統(혈통, DLC) = 取得経験*=1.2(gaps/N §4-2) · ★IL2CPP 코드로 1.2 미결 종결(5.0.0, 2026-08-17, il2cpp/EXP_CHAIN_ENGAGE.md §1·§5): params.xml 戦闘経験倍率는 **참조 0건의 사문**이고, 1.2의 실체는 스킬 Act(SID_師の導き効果·SID_血統의 取得経験*1.2)다 — 종전 '전역 룰일 수 있다'는 유보는 반증됐고 엔진이 배율을 안 거는 현행이 정합이다 · 반올림 = 절삭 2회(기본식 결과 fcvtzs — BattleUtil.GetBattleExp RVA 0x1E93FD0, 스킬 배율 적용 후 다시 fcvtzs — GainExpCommand.SetImpl RVA 0x1B47950)라 엔진의 Math.floor와 동치 · 외곽 Mathf.Clamp(0,100)는 XML clamp와 중복(무해) · ☠assumed 유지 사유 = **与戦闘経験累積数가 엔진에 하드코딩 0**이다. 실체 = UnitRecord.Kinds.MapBattleExpGiveCount(21), 맵 단위·피격자(적) 기준 누적이며 BattleCalculator.CalcExpCount(RVA 0x2474C60)가 Status.GiveExpBattle일 때 +1 — 루나틱 반복 전투 경험치가 현재 과대다 · 식 선택(撃破/戦闘)은 게임이 Status.ExpDestroy/ExpBattle로 고르고 없으면 0 = 다중 전투·체인 상황에서 갈릴 여지"
    },
    {
      "id": "combat.exp-table-clamp",
      "label": {
        "en": "EXP table out-of-domain = boundary clamp",
        "ko": "경험치 테이블 정의역 밖 = 경계 클램프"
      },
      "status": "assumed",
      "evidence": "정의역 = 레벨차 -39..+40 · 34/35 테이블은 양끝 상수 평탄 — 위험은 補助レベル差減衰値 마이너스 끝 선형 하나뿐(gaps/A §3)"
    },
    {
      "id": "combat.exp-staff",
      "label": {
        "en": "Staff EXP",
        "ko": "지팡이 경험치"
      },
      "status": "anchored",
      "evidence": "杖経験計算 = clamp(杖経験値+杖減衰値+杖補助レベル差減衰値,1,100)(gaps/A §0-2) · ★IL2CPP로 결손 해소·기존 서술 반증(5.0.0, 2026-08-17, il2cpp/EXP_CHAIN_ENGAGE.md §4·§5): '杖経験値는 덤프 미정의'는 **틀렸다** — 실체 = ItemData.RodExp(item.xml, 오프셋 +0x84)이고 소비 = UnitCalculator.RodExpCommand.GetImpl(RVA 0x1B4B9F0) · 값 분포 = 0/25/30/35/40/45 · 2026-08-18 엔진 배선(battle.ts staff 케이스, staff.test.ts — 노멀 25·루나틱 하한 clamp 1 정확값) · 반복 감쇠 없음(MapRodExpCount는 어느 식도 미참조)"
    },
    {
      "id": "combat.exp-dance",
      "label": {
        "en": "Dance EXP",
        "ko": "춤 경험치"
      },
      "status": "absent",
      "evidence": "踊り経験計算 = clamp(踊り基本値(레벨+내부레벨)+補助レベル差減衰値,1,100)(gaps/A §0-2)"
    },
    {
      "id": "combat.exp-chain-guard",
      "label": {
        "en": "Chain guard EXP",
        "ko": "체인가드 경험치"
      },
      "status": "implemented",
      "evidence": "배선(2026-08-18 MP1-6, guard.test.ts) — チェインガード経験計算 = clamp(ガード基本値+補助レベル差減衰値,1,100) 원문 평가·전투당 1회(다타격 무관)·상대 = 지킨 아군(GetGuardExp 0x1E94390의 m_Parent) · ★IL2CPP 정합 확인(5.0.0, 2026-08-17, il2cpp/EXP_CHAIN_ENGAGE.md §2): 지팡이·체인가드 경험도 전투 경험과 같은 CalculatorManager 평가·fcvtzs 절삭 경로를 탄다 — 식 이름만 갈릴 뿐 별도 파이프라인이 아니다 · ⚠경험 부여 순서(공격측 → 가드)는 사이드 순서 가정 — 레벨업 롤 소비 순서에 걸린다"
    },
    {
      "id": "combat.exp-summon",
      "label": {
        "en": "Summon EXP",
        "ko": "소환 경험치"
      },
      "status": "absent",
      "evidence": "召喚経験計算 = clamp(召喚基本値(레벨+내부레벨),1,100) — 레벨차 무관(gaps/A §0-2)"
    },
    {
      "id": "combat.exp-enchant",
      "label": {
        "en": "Enchant EXP",
        "ko": "인챈트 경험치"
      },
      "status": "absent",
      "evidence": "エンチャント経験計算 = clamp(エンチャント基本値(레벨+내부레벨),1,100)(gaps/A §0-2)"
    },
    {
      "id": "combat.exp-arena",
      "label": {
        "en": "Arena EXP branch",
        "ko": "투기장 경험치 분기"
      },
      "status": "absent",
      "evidence": "戦闘経験計算 3분기 중 투기장 2분기 미소비(闘技場中·クリア済み 하드코딩 0)(gaps/A §0-2)"
    },
    {
      "id": "combat.levelup-growth",
      "label": {
        "en": "Level-up growth (cap gate, retry up to 4)",
        "ko": "레벨업 성장 — 상한 게이트·최대 4시도 재굴림"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-17, il2cpp/STATS_GROWTH.md — App.Unit.LevelUp RVA 0x1A3A040 GrowMode.Random): 스탯별로 floor(grow/100) 확정 가산 + 잔여 grow%100 1롤이고, **증가 1회마다 상한(GetCapabilityLimit) 게이트**를 통과해야 반영된다(확정분도 캡을 못 뚫는다) · 성장률은 0..255 클램프(100 절사 아님) · **획득 스탯이 abort(2) 미만이면 최대 4시도까지 재굴림하고 최선 시도를 채택**(Unit.LevelUpRetryMax=4·GrowAbortCount=2, 난수는 시도 간 이어짐) — 0~1스탯 레벨업 확률이 크게 낮아지므로 육성 시뮬 분포에 직결 · 확률 판정 해상도 = 0.001%(percent*1000 > rand%100000), 잔여 0이면 난수 미소모 · 엔진 배선 = battle.ts rollGrowth + UnitState.cap(테스트 5건) · ★☠**상한 사영 배선(2026-08-18, MP5 5-0)**: 종전엔 엔진에 게이트가 있어도 `UnitState.cap`을 채우는 코드가 저장소에 없어 **런타임에서 게이트가 항상 통과**했다(BoardUnitProp에 필드 자체가 부재 — `fe17.ts statCap`은 초기 스탯 산출 입력으로만 쓰였다). 챕터가 늘 새 판이라 미발현이었고 캠페인 인계를 켜면 즉시 무한 성장이 된다. 배선 = `unitCap` → `BoardUnitProp.cap` → `projectUnit` → `UnitState.cap` · **자군 한정 사영**(경험치·레벨업이 자군 한정 = grantExp force 0 게이트, 전 유닛에 실으면 챕터 JSON 예산 §11을 넘긴다 — e006.ko 실측 52.6KB gz > 50KB) · 부수 정정 = `statCap`에 `Clamp(0,255)` 추가(GetCapabilityLimit 0x1A30B60 — person Limit은 -3까지 음수) · 앵커 = fe17.test.ts 뤼에르 cap 실값 · boardStore.test.ts 국면 사영 · ★**GrowMode.Fixed 배선(2026-08-18, MP5 5-1)** = 종전 '미배선'이 해소됐다. ☠**서비스 기본은 Fixed다**(사용자 지시 3 — 인게임도 메인 메뉴 `MainMenuSequence.GrowModeSelectMenuSequence`로 고르는 실재 모드라 이탈이 아니다). 코드 확정 알고리즘(STATS_GROWTH §2-3(c)) = `g!=0` → `if (현재 >= 상한) continue`(**게이트가 루프 진입 전 1회** — 캡에 닿은 스탯은 누적조차 없다) → `acc = Min(acc+g, 255)` → `while (acc > 99) { +1; acc -= 100 }` · ☠**누적기 초기값 = person.Grow**(`Unit.CreateImpl1` 0x1A08944가 9회 대입 — 0이 아니다. 첫 레벨업이 그만큼 빠르다) · 엔진 = `GameState.growMode`(부재 = fixed) 분기 + `UnitState.growthAcc`(부재 = growth가 초기값) + `levelUp` 이벤트 `acc` 절대값 스냅숏(재생·인계 복원 통로) · **난수 미소비**라 Random과 소비 계약이 다르다 ⇒ RULE_VERSION fe17-8 범프 + m002 기보 재생성(84스텝·verified·결손 0) · 앵커 = battle.test.ts 6건(초기값·미달 누적·이월 복원·255 클램프·캡 게이트·무소비) · Random 경로는 정본으로 보존(같은 게임의 다른 모드) · 미배선 = 성장률 변조 스킬(努力の才 *2·星玉の加護 +15)·무기 GrowRatio"
    },
    {
      "id": "combat.max-level",
      "label": {
        "en": "Max level stops EXP",
        "ko": "최대 레벨 = 경험치 정지"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정 + 배선(2026-08-18, MP5 5-0 — STATS_GROWTH.md §2-7 App.Unit.AddExp RVA 0x1A39D40): `if (level >= job.MaxLevel) return` → `e = exp + m_Exp; if (e >= 100) { level += 1; e %= 100 }` → `if (job.MaxLevel == level) e = 0`. 종전엔 `job.MaxLevel`을 읽는 코드가 저장소에 0건이라 20레벨을 넘겨도 계속 굴렸다(챕터가 늘 새 판이라 미발현 — 인계를 켜면 즉시 발현) · 배선 = `BoardUnitProp.maxLevel`(job.MaxLevel, 자군 한정) → `UnitState.maxLevel` → `grantExp` 정지·잔여 0 강제 · 재생 계약 = `levelUp` 이벤트에 잔여 경험치 **절대값** `exp` 추가(부재 = 구기보 → 종전대로 100 차감) · 실데이터 = MaxLevel 20이 65직·40이 46직(특수직) · 앵커 = battle.test.ts 3건 · 미배선 = `NormalizeExp`(0x1A39F60 가산량 선절삭 — 획득 경험이 100 이하라 현행 경로에서 결과 동치)"
    },
    {
      "id": "units.stat-derivation",
      "label": {
        "en": "Stat derivation model",
        "ko": "스탯 산출 모델(직업Base+Offset+성장)"
      },
      "status": "anchored",
      "evidence": "SerenesForest 36명×9스탯 전수 일치 · stats.test.ts"
    },
    {
      "id": "units.stat-derivation-edge",
      "label": {
        "en": "Stat cap/floor and AutoGrowOffset handling",
        "ko": "스탯 상한(job+person Limit)·하한 0·AutoGrowOffset"
      },
      "status": "assumed",
      "evidence": "상한 배선 완료 = job.Limit+person.Limit 클램프(fe17.test.ts 뤼에르 Lv99, gaps/D §5) — 하한 0·AutoGrowOffset은 PREDICT_M002 실기 대조 예정"
    },
    {
      "id": "units.internal-level-cap",
      "label": {
        "en": "Internal level cap on promotion",
        "ko": "내부 레벨 상한(전직 시)"
      },
      "status": "absent",
      "evidence": "内部レベル計算 = clamp(内部レベル+레벨-1, 0, 난이도별 50/40/30) — 엔진 미호출(gaps/A §0-2)"
    },
    {
      "id": "units.move-enhance",
      "label": {
        "en": "Move stat bonuses (EnhanceValue.Move)",
        "ko": "이동력 보정(EnhanceValue.Move)"
      },
      "status": "implemented",
      "evidence": "★IL2CPP 코드 정본(il2cpp/MOVE_TERRAIN.md §2-10·SKILL_ENGINE.md §4): 보유 스킬 19종(迅走 +5~7·天駆 +2~4 등) · GetMovePowerImpl(RVA 0x1A5B690)이 EnhanceValue[10]을 **직업 Limit 클램프 뒤에** 가산(= Limit 초과 가능) 최종 Clamp(0,99). ★배선 완료(2026-08-18, MP3 3-0): 엔진 moveBase(스냅숏 = Clamp(base,0,jobLimit+personLimit)) + movePower(유효 스킬 Enhance 런타임 가산·상한 99 — 인게이지 부여 스킬 반영)를 moveBudget이 소비 — battle.test.ts Limit 초과·상한 99 테스트 · 잔여 = Sight 슬롯은 여전히 미사영(시야 시스템 부재와 동건)"
    },
    {
      "id": "units.difficulty-skills",
      "label": {
        "en": "Per-difficulty skill sets (Normal/Hard/LunaticSids)",
        "ko": "난이도별 스킬(Normal/Hard/LunaticSids)"
      },
      "status": "absent",
      "evidence": "수집 자체 안 함 — 루나틱 23종/162인(gaps/G) · 브레이크 면역 41인물 실배선 포함(§0 등재) · ★IL2CPP 선택 규칙 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §3-1): 난이도 스킬은 합집합이 아니라 **배열 교체**다 — PersonData.get_MaskSkill(RVA 0x1F29ED0)이 AssetForce != Enemy(1)이면 CommonSkills(+0x178)를, 적이면 난이도로 NormalSkills(+0x180)/HardSkills(+0x188)/LunaticSkills(+0x190) 중 하나를 **통째로 고른다**(0x1F2A02C·0x1F2A0A8·0x1F2A078). 난이도 3배열은 CommonSkills를 씨앗으로 깐 상위집합이다 · ☠단순 합집합으로 배선하면 Normal에 Hard/Lunatic 스킬이 유출된다"
    },
    {
      "id": "units.style-grant-skills",
      "label": {
        "en": "Battle-style granted skills",
        "ko": "전투 스타일 부여 스킬(은밀·마법 등)"
      },
      "status": "absent",
      "evidence": "사영 복원 완료(styles.json 9행 — projection.test.ts) · 배선 보류 = 地形回避가 훅 미노출(평문 env)·실측 케이스 부재(프로브 실측 88=88, FIX_NOTES_2 P2 게이트) · ★IL2CPP 실체 확인(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-12·§3A 35·36행): 스타일 변형은 지형 로직이 아니라 **스킬**이다 — 은밀 = SID_地形回避有利時２倍(조건 地形回避>0), 마법 = SID_相手の地形回避有利時０(마도서 한정) ⇒ 地形回避를 스킬 훅으로 노출하는 것이 유일 선행이고 실측은 확인용"
    },
    {
      "id": "units.job-skills",
      "label": {
        "en": "Job skills (innate/learning/lunatic)",
        "ko": "병과 스킬(Skills·LearningSkill·LunaticSkill)"
      },
      "status": "absent",
      "evidence": "91건 미소비(踊り·鍵開け 포함, gaps/H) — 수집 요구는 gaps/I 병과 계열 49행 · ★IL2CPP 수집 경로 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): JobData.MaskSkill(+0x128)이 Skills/LearningSkill/LunaticSkill을 Categorys.Job(2)으로 담고(JobData.OnCompleted 0x20550AC·0x2055748) Unit.UpdateStateImpl(RVA 0x1A16D90)이 유효 집합에 합류시킨다 = 별도 규칙 없는 순수 수집 결손(skills.source-collection의 부분집합)"
    },
    {
      "id": "units.job-growth",
      "label": {
        "en": "Generic enemy growth from job",
        "ko": "일반 적 성장 소스(job.BaseGrow)"
      },
      "status": "absent",
      "evidence": "재현 불요 확정 — 적은 맵 내 레벨업 없음(사용자 확정 2026-08-17, 엔진도 자군만 경험치·레벨업) · job.BaseGrow는 데이터 참고용(gaps/H)"
    },
    {
      "id": "units.weapon-proficiency",
      "label": {
        "en": "Weapon aptitude and rank",
        "ko": "무기 적성·랭크(Aptitude)"
      },
      "status": "absent",
      "evidence": "Aptitude 비트 = 무기 컬럼 순서(교차 일치 2건) — equippedWeapon은 Kind·RangeO만 검사(gaps/H)"
    },
    {
      "id": "units.promotion",
      "label": {
        "en": "Class promotion tree",
        "ko": "전직 체계(HighJob/LowJob)"
      },
      "status": "absent",
      "evidence": "전직 트리 정식화(LowJob은 JID 아닌 MSBT 라벨, gaps/H) · 내부 레벨 상한은 units.internal-level-cap"
    },
    {
      "id": "units.skirmish-generation",
      "label": {
        "en": "Skirmish enemy generation",
        "ko": "조우전 적 생성(encount.xml)"
      },
      "status": "absent",
      "evidence": "★서비스 피쳐 제외(사용자 결정 2026-08-17) — 데이터 정식화만 보존(무기등급 17·직업풀 25·골드 18, gaps/K §6)"
    },
    {
      "id": "units.meal-buff",
      "label": {
        "en": "Meal stat buffs (Somniel cooking)",
        "ko": "식사 버프(요리 스탯 보정)"
      },
      "status": "absent",
      "evidence": "cook.xml 出来栄え/料理 Enhance 필드(Str~Mdef s8) — 출격 전 보정 기전, 장부 밖이었음(gaps/O)"
    },
    {
      "id": "units.difficulty-scaling",
      "label": {
        "en": "Per-difficulty levels and stats from dispos",
        "ko": "난이도별 레벨·스탯(dispos·Offset)"
      },
      "status": "anchored",
      "evidence": "VERIFY_M002 대조 일치 156·불일치 0 · 3회차 재확인: dispos LevelN/LevelH/LevelL은 140파일 10,951행 전수 동일값(난이도 분기 데이터 없음, gaps/O §10-1-4) — 실제 난이도별 스탯 스케일링은 Offset 경로 소관, 본 앵커의 근거가 LevelN/H/L이라면 오해 소지 있어 재확인 요망 · 후속 정정(2026-08-17): dispos LevelN 비영 행 140파일 전수 0(아군·적 공히) = dispos는 레벨 미소유 — 적 레벨 정본은 person.xml Level(M002 2~5·M010 12~15 스토리 정합, gaps/L 실측 후속 절). 신룡의 장은 별건 = units.divine-paralogue-level"
    },
    {
      "id": "units.divine-paralogue-level",
      "label": {
        "en": "Divine Paralogue enemy level scaling (runtime)",
        "ko": "신룡의 장(g001~g006) 적 레벨 런타임 스케일링"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드로 수식 확정(2026-08-17, il2cpp/ENEMY_LEVEL.md — 실측 불요로 종결): totalLevel = person.Level + MapSituation.AverageLevel - 1 (Unit.CreateDlcGodEnemy RVA 0x1A0CA80, 0x1A0CB00~34). 잡졸 PID_G000_幻影兵_*은 person.Level=1이라 **총레벨 = AverageLevel 그대로** · AverageLevel = Clamp(CalcEncountRank(N) + 난이도조정, 1, 99), 난이도조정 = Normal -5 / Hard -2 / Lunatic +1 · CalcEncountRank(N) = round(상위 N명 총레벨 합 / N) + 2, N = 그 맵 dispos의 플레이어 그룹 엔트리 수(출격 슬롯), 총레벨 = Level + InternalLevel(승급 = 내부레벨 +20), 반드레는 조건부 편입 · ⇒ 사용자 전언('플레이어 레벨 추종')이 정확했고 기준은 **출격 슬롯 수만큼의 상위 레벨 평균**이다 · 정적 데이터로 재현 불가했던 이유 = 스케일링이 실행부 소관(dispos 레벨 전수 0·Lua 조작 0건·HoldLevel=0)"
    },
    {
      "id": "units.chapter-preset-roster",
      "label": {
        "en": "Per-chapter preset party state (level, promotion, inventory, sync)",
        "ko": "챕터별 프리셋 파티 상태(레벨·승급·소지품·싱크로)"
      },
      "status": "assumed",
      "evidence": "chart.xml 加入 1510행(챕터 54 + QA 3) — dispos Force=0 1415행은 레벨 0·Jid/Gid/Sid 공란으로 아군 스탯 미소유, 교집합 60건 실값 일치 0셀, 전역 시그니처 대조 0/1510(gaps/O §10-1) · units.difficulty-scaling·units.promotion과 별개 소스(dispos·encount에 중복 0건) · ★1차 배선(2026-08-18 transform.py): 익명 출격 슬롯(dispos Force=0·Pid 공백)을 chart 명부 순서대로 채우고(레벨·소지품·GodId 포함), 고정 배치 자군의 결측 필드(레벨 0·빈 소지품·무엠블렘)만 chart로 보강한다(dispos 값 절대 우선) — m004 자군 1→7명 실발현이 계기 · ⚠가정 = 채움 순서 chart 원문 순 · 슬롯 정원 초과분(벤치) 미모델 · 선택 출격 = M4 편집기 몫 — 실기는 세이브 로스터가 채우는 자리라 '세이브 없는 기준 국면'의 근사다"
    },
    {
      "id": "units.equipped-weapon",
      "label": {
        "en": "Equipped weapon = first attack weapon in inventory",
        "ko": "장비 무기 = 소지품 첫 공격 무기"
      },
      "status": "assumed",
      "evidence": "가정(fe17.ts equippedWeapon) — 공식 텍스트에 장비 규칙 서술 없음(gaps/E §1-4), 실기 반증 시 갱신"
    },
    {
      "id": "skills.static-enhance",
      "label": {
        "en": "Static stat bonuses (EnhanceValue)",
        "ko": "정적 스탯 보정(EnhanceValue)"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts 기본능력 표시 일치(싱크로 칩 포함)"
    },
    {
      "id": "skills.act-values",
      "label": {
        "en": "Combat value modifiers (ActNames DSL)",
        "ko": "계산값 보정(ActNames DSL — 소수 유지·표시 내림)"
      },
      "status": "anchored",
      "evidence": "M003 간파 corpus.test.ts · ActNames 전수 52종 census — 자기측 훅 13종 305회 소비 / 상대측 90 / 원시 스탯 58 / 어휘 밖 20종 218회(gaps/I) · 별건 항목 = opponent-act·raw-stat-act·timing-filter · ★IL2CPP 합성 규칙 확정(2026-08-17, il2cpp/RATES_FORMULA §2-3·SKILL_ENGINE §5-1): 전투 파라미터 12훅은 base·add·scale **3레지스터**로 모았다가 `(base+add)*scale` 1회 합성이라 **스킬 순서 무관**이고(엔진은 순차 즉시 반영이라 `+5`와 `*1.3`의 순서로 값이 갈렸다 — 정정), `=`는 기저만 덮고 add·scale은 살아남는다 · 결과 클램프 = 값계 0..999 · 율계(命中率·必殺率) 0..100, 2단 클램프 실재(命中値·回避値 각각 0..999 후 차감, 결과 다시 0..100) · ☠원시 스탯(力·守備…)·追撃条件은 이 규칙 밖 = 즉시 반영·클램프 없음이 정본 · 배선 = skills.ts PARAM_LIMIT(테스트 5건) · 미배선 = 攻撃速度 음수 클램프(0 하한)를 calculator 층에 넣는 것"
    },
    {
      "id": "skills.timing-filter",
      "label": {
        "en": "Skill activation filters (Stand/Action/Timing/Order)",
        "ko": "스킬 발동 필터(Stand/Action/Timing/Order) 준수"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-17) — BattleInfoSide.IsEnableSkill이 네 필드를 전부 게이트로 소비한다. Stand(0x78, Stands: None0/Offence1/Defence2)는 m_SideType(BattleSide.Type: Offense0/Defense1)과 대조 = **전투 주도권**(0x1E8CDFC~0x1E8CE24, Stand!=None이면 상대 실재도 추가 확인, ChainOffense2~7은 Offence 판정에서 탈락) · Action(0x7c)은 CalcActiveSkill이 때리는 쪽에 1·맞는 쪽에 2를 넘겨 대조 = **이번 타격의 역할**(0x2469FC0~) · Timing은 파이프라인 단계 셀렉터(27종 열거, HitBefore=10은 CalcAttack이 타격마다 연다) · Order는 HitSkill.SortKey(0x19B60F0)의 정렬 키 · 평가 순서 = Flag → Timing → Action → Stand → Target → Condition/Cycle. ☠앞선 '실기로 Stand 게이트 기각' 판정은 **오독이었고 철회한다** — 그 실측(선공 예보 vs 피격 예보 적 명중 동일)은 같은 전투의 공격행·반격행이라 Stand가 양쪽 다 참이었다(M003 간파 코퍼스도 동일 구조). 엔진 배선 = skills.ts passesFilter + Combatant.initiator/striking, battle.ts가 전투 주도권 고정·타격 역할 반전으로 주입 · ☠사영 결손 정정(2026-08-17 4c): 웹 슬림 사영(fe17.ts slimSkill)이 Stand·Action·Power를 떨어뜨려 웹 경로에선 필터·재이동 거리가 무장전이었다(현행 변환 맵 전수 무발현 확인 = 잠복) — SKILL_ROW_FIELDS 편입으로 해소 · 미확정 = Timing=Always류가 이 게이트를 우회하는 별도 경로(SkillArray 비트마스크) 유무 · 상세 = extracted/il2cpp/STATUS_FILTER.md"
    },
    {
      "id": "skills.opponent-act",
      "label": {
        "en": "Opponent-side value modifiers",
        "ko": "상대측 계산값 보정(相手の~ ActName)"
      },
      "status": "absent",
      "evidence": "14종 — 자기 modify 훅에 영원히 미매칭(skills.ts makeSkillModifier가 ActNames 정확 일치 비교, gaps/G) · 시점 기준 방증 = 독 실측(보유자 관점 '상대' 위력 +1이 문자 그대로 적용, 2026-08-17) — gaps/A §7-1 부호 문제에 문자 그대로 해석 지지 1건 · 3회차 덤프 논증으로 보강(gaps/B §7 [3회차 2026-08-17]): Action=2 코호트 52행 전수가 피격측이고 개발자 명명이 효과를 말하는 アイクエンゲージスキル_ダメージ50%減(받는 대미지 50% 감소)이 '相手の威力*0.5'로 구현 → 相手の~ = 보유자가 받는 값, 반전 아님 · 보강: SID_祈り(Action=2) 조건식 'HP <= ダメージ'가 같은 문맥의 ダメージ = 보유자가 받는 대미지임을 증언 · 코호트 전수 검사는 engine/tests/statusPoison.test.ts가 실행으로 고정(어휘 밖 ActName 등장 시 레드) · 이 훅이 combat.status-effects(독) 배선의 선행 조건 · ★IL2CPP로 배선 방법까지 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §2-5·§4): 相手の는 특수 규칙이 아니라 **훅의 이중 등록**이다 — GameCalculator.AddCommandWithReverse<T>가 훅 121종 전부를 정방향/Reverse 두 벌로 등록하고 Reverse()(RVA 0x22791B0)가 m_Index=1·Header='相手の'만 세운다. Get/Set/Add/Scale(RVA 0x2278AD0·0x2278C20·0x2279010·0x2279160)이 그 인덱스로 obj1/obj2 대상만 스왑한다 ⇒ **부호 반전이 아님이 코드로 확정**(문자 그대로 해석 지지가 방증에서 확정으로) · 배선 = 접두 제거 + 대상측 전환 1줄, 선행 없음 · ★부분 배선(2026-08-17 4c): 인게이지 기술의 相手のダメージ 대입 경로만(makeSkillModifier 자기참조 오버레이 — 相手の~ 이름은 상대 env 쪽에 현재값을 노출) — 일반 전투의 훅 이중 등록은 여전히 미배선"
    },
    {
      "id": "skills.raw-stat-act",
      "label": {
        "en": "Raw-stat ActNames bypass hooks",
        "ko": "원시 스탯 ActName(힘·마력 등 직접 보정)"
      },
      "status": "absent",
      "evidence": "11종 — vars 즉시 반환 경로라 훅 미도달(gaps/G) · ★IL2CPP로 층 정정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): 훅은 실재하되(UnitCalculator의 Str/Magic/Tech/Quick/Luuk/Def/Mdef/Phys Command) **BattleParam 층이 아니다** — 원시 스탯은 BattleDetail.Capability(int)에 대한 즉시 read-modify-write(GameCalculatorCommand.Add/ScaleImpl 기본구현 RVA 0x2278840·0x2278900 = SetImpl(GetImpl ± * v))라 **순서 의존이고 3레지스터 누산기가 아니다** · ⇒ 배선 시 skills.act-values의 (base+add)*scale 규칙과 **분리 필수**(같은 규칙을 적용하면 반대로 틀린다)"
    },
    {
      "id": "skills.sync-sids",
      "label": {
        "en": "SyncSids/SyncConditions expansion",
        "ko": "SyncSids·SyncConditions 전개"
      },
      "status": "absent",
      "evidence": "28종 미전개 — 브레이크 면역 _効果 실배선도 이 층 소관(gaps/G · FIX_NOTES F2 파생) · ★IL2CPP 전개 규칙 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): SkillArray.Commit(Unit)(RVA 0x2485A10)이 전 엔티티에 AddSyncImpl(RVA 0x2485080, 사본 0x1A5E560)을 돌려 SyncSkills(+0x248)[i]와 m_SyncConditionCommands(+0x2C8)[i]를 **동일 인덱스로 대조**한다(IsSyncCondition RVA 0x248E750) · 전개된 스킬의 Category는 **원본 트리거 스킬의 Category를 상속** · Commit마다 재전개(캐시 아님)"
    },
    {
      "id": "skills.condition-fallback",
      "label": {
        "en": "Unknown condition identifiers fall back to not-applied",
        "ko": "미지 조건 식별자 = 미적용 강하"
      },
      "status": "assumed",
      "evidence": "미지 함수·식별자 모두 미적용 강하 통일(skills.test.ts — gaps/FIX_NOTES F5) · Condition 식별자 실측 165종(래치 파생 69 제외 실결손 12계열)·미지 함수 신규 2(comp·アイテム)(gaps/I) · 발동 필터 축은 별건 = skills.timing-filter · ★2026-08-17 IL2CPP 대조 후 **의도적 유지**(il2cpp/SKILL_ENGINE §5-2): 게임은 미지 식별자를 0으로 치환해 식을 계속 평가하고(CalculatorManager.GetValueImpl 0x298F760) Condition 부재는 참이다(0x248E2E0). 그러나 **게임에는 미지 식별자가 없다**(165종 전부 구현) — 그 0 치환은 '없는 변수'용 안전망이지 '어휘 결손'용이 아니다. 우리 결손에 0을 넣으면 `武器の種類 == 剣`이 `0==0`으로 참이 되어 **과대 발동**한다. 결손이 남아 있는 동안은 과소(미적용)가 안전하므로 현행 유지하고, 어휘를 채울 때마다 이 강하가 자연 소멸하게 둔다 · Condition 부재 = 참은 현행도 동일"
    },
    {
      "id": "skills.give-sids",
      "label": {
        "en": "Granted skills (GiveSids)",
        "ko": "스킬 부여 체계(GiveSids — 몰아붙이기 등)"
      },
      "status": "deferred",
      "evidence": "정식화 완료 — 186행·3단 구조(부여자→효과→発動済み 래치)·GiveTarget 0~4·Life/Cycle(gaps/C §1) · 구현은 부여층 선행(§0 미룸) · ★IL2CPP 경로·수명 전량 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): 경로 = MapSkill.TryAddGiveSkill(RVA 0x1F50A20, GiveTarget +0xB0 대조) → Unit.AddGiveSkill(RVA 0x1A5D430/0x1A5D4E0) → Unit.AddPrivateSkill(RVA 0x1A37990) → m_PrivateSkill(+0x100) · 수명 = UpdateAgingImpl(RVA 0x2487F60)이 해당 Cycle 도래마다 age+1 하고 Life > age+1이면 존속, 아니면 RebirthSkill(+0x250) 교체 또는 RemoveAt(0x24882A8) · Life는 Cycle이 PhaseBefore/PhaseAfter면 3배(OnBuild 0x248AB64, PhaseCycle=3) · ☠잔여 = GiveTarget 5값별 대상 선정 호출부"
    },
    {
      "id": "skills.aura-give",
      "label": {
        "en": "Aura grants from nearby units (Timing=20)",
        "ko": "주위 오라 부여(Timing=20 — 타 유닛이 주는 스킬)"
      },
      "status": "absent",
      "evidence": "주위 부여 25건(白の忠誠·神竜の結束 등) — unitSkillRows가 타 유닛 부여를 수집하지 않음(gaps/C §0) · ★IL2CPP 소스·주기 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): MapImageUnit.UpdateSupportSkill(RVA 0x20655B0)이 전 유닛의 m_ReceiveSkill(+0x108)·m_SupportedSkill(+0x110)을 **매 호출 전면 초기화 후 전량 재계산**한다(증분 갱신이 아니다 = 이동·사망마다 오라가 통째로 다시 계산된다) · 소스 = 부여자의 GiveSkills(+0x238), 엔트리 태그 0x80000000 = Categorys.Support(8)"
    },
    {
      "id": "skills.style-variant",
      "label": {
        "en": "Style-variant skill branches",
        "ko": "스타일 분기 스킬(병종별 변형)"
      },
      "status": "absent",
      "evidence": "CooperationSkill~DragonSkill 8필드 49건 — M003 실측 신속 = SID_カウンター_竜族(gaps/C §7-5) · ★IL2CPP 범위 확장(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §6·SKILL_ENGINE.md §2-8): 인게이지 기술도 같은 경로를 탄다 — GetEngageAttack(RVA 0x2341640)이 최종 단계에서 SkillData.m_StyleSkills[job.Style]로 치환(0x2341A6C) ⇒ 스타일 분기는 스킬·기술 공통 층 · ★기술 경로만 배선(2026-08-17 4c — emblemEngageArt가 StyleName→8필드 분기, fe17.test.ts 竜族 변형) ☠일반 스킬(EngagedSkills 내 カウンター 등 49건)의 스타일 분기는 여전히 미배선"
    },
    {
      "id": "skills.orphan-sids",
      "label": {
        "en": "Orphan SIDs (event-granted, no static source)",
        "ko": "고아 SID(정적 소스 없음 — 이벤트 부여 추정)"
      },
      "status": "absent",
      "evidence": "55행 — CommonSids·SynchroSkills·dispos·EquipSids 어느 소스에도 미참조(gaps/I) · ★IL2CPP 부분 해소(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): 상당수는 런타임 부여 카테고리 후보다 — Categorys.Battle(9)(BattleDetail.AddActiveSkill RVA 0x1E76B30 등 전투 중 부여) 또는 Private(10) · ⇒ '컷 콘텐츠'로 단정할 수 없다"
    },
    {
      "id": "skills.source-collection",
      "label": {
        "en": "Skill collection sources (12 categories)",
        "ko": "스킬 수집 소스(Categorys 12종)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §2-1·§3·§4): 게임의 수집 소스 = SkillData.Categorys 12종(Person/Job/Item/Equip/God/Ring/Hub/Support/Battle/Private/Inheritance/Command)이고 유효 집합은 Unit.m_MaskSkill(+0xF0) 하나로 합류하며 전투는 BattleInfoSide.SetUnitSkill(RVA 0x1E8A080)의 순수 복사다 · 현행 엔진 수집은 Person·God(싱크로)·Private(dispos) **3종뿐** ⇒ gaps/I의 진단 '결손 본체는 어휘가 아니라 수집'을 코드가 확증 · gaps/I §6-2가 제안한 skills.source-job/-item/-engage/-bondring/-terrain 5건은 이 한 기전의 부분집합이라 본 항목으로 통합한다"
    },
    {
      "id": "skills.duplicate-priority",
      "label": {
        "en": "Duplicate rejection and Priority override",
        "ko": "중복 배제·Priority 상하위 교체"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): SkillArray.AddImpl(RVA 0x2484780)이 동일 스킬 재추가를 거부하고(Cycle!=0이면 age만 갱신), 동일 Group + PrivateFlags.CanOverride면 SkillData.Priority(+0x94)를 비교해 **하위는 거부·상위는 교체**한다 · 엔트리 = uint 비트팩 index[0:12]/group[12:20]/age[20:28]/category[28:32], 상한 32 · Group은 GroupAssign(RVA 0x248D0C0)이 skill.xml 習得優先度 연속 구간으로 부여(100그룹·412스킬) — 독 3단 승격 사슬과 같은 기구(combat.status-effects) · 엔진은 중복·상하위 배제가 없어 동계열 중첩이 과대"
    },
    {
      "id": "skills.layer-exclusive",
      "label": {
        "en": "Layer exclusive slots (A/B/C/D)",
        "ko": "Layer 배타 슬롯(A/B/C/D)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §2-7·§4): SkillData.Layer(A1/B2/C4/D8)는 **배타 슬롯**이다 — BattleInfoSide.CalcActiveSkill(RVA 0x1E8C358)이 (detail.SkillLayers & skill.Layer) != 0이면 그 스킬을 건너뛰고, BattleDetail.AddActiveSkill(RVA 0x1E769C0)이 발동 시 SkillLayers |= Layer로 슬롯을 잠근다 · 같은 스킬의 재발동도 ActiveSkill 비트마스크가 차단(0x1E8C378) · 엔진 미구현 = 같은 레이어 스킬이 전부 겹쳐 발동(과대)"
    },
    {
      "id": "skills.flow-hooks",
      "label": {
        "en": "Combat-flow hooks (damage, counts, exp, ...)",
        "ko": "전투 흐름 훅(ダメージ·回数·取得経験 등)"
      },
      "status": "absent",
      "evidence": "★IL2CPP로 '어휘 밖' 판정 반증(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): gaps/I가 '훅 밖 ActName 20종'으로 분류한 것은 **전부 정식 훅**이다 — ダメージ=DamageCommand · 回復=HealCommand · 攻撃回数=AttackCountCommand · 行動回数=ActionCountCommand · 手番回数=BattleTimesCommand · 一時変数=TemporaryCommand · 取得経験=GainExpCommand · 拾得アイテム=PickupItemCommand · 吹き飛ばし率/距離=Blow* · エンゲージカウント=EngageCountCommand · スキル確率補正=SkillCorrectCommand · 神将スキル確率補正=GodSkillCorrectCommand · 武器の消費=WeaponExpendCommand · 攻撃結果=BattleSceneResult*(GameCalculator.AddCommandWithReverse<T> 121종 목록) · ⇒ 결손의 정체는 어휘가 아니라 **전투 해결층 상태**(회수·대미지 저장소·경험 파이프)다 · ☠追撃条件은 ActNames에 0회로 게임 어휘가 아니며 13번째 전투 파라미터 훅은 攻撃速度"
    },
    {
      "id": "skills.around-ops",
      "label": {
        "en": "Aura operations (AroundName/Operation/Value)",
        "ko": "오라 연산(AroundName·Operation·Value)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): AroundName/AroundOperation/AroundValue는 m_AroundFuncs(+0x298)로 컴파일돼 **ActNames와 동일한 ExecuteImpl 골격**으로 실행된다(ExecuteAround RVA 0x24905C0) = 오라 보정도 Add/Scale 누산기 규칙을 따른다 · 게이트 = AroundCenter(Self1 보유자·Target2 대상·Link3 unit[+0xD8] 파트너)·AroundTarget(Friend1/Enemy2는 MapSituation.IsAllide, Both3 무조건)·AroundCondition(IsArounCondition RVA 0x248E980) · ☠RangeI/RangeO(+0x1F0/+0x1F4) 소비 지점 미확정 · 부여형 오라는 별건(skills.aura-give)"
    },
    {
      "id": "skills.work-ops",
      "label": {
        "en": "Work-field operations",
        "ko": "Work 필드 연산(5종)"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): SkillData.CalcWork(RVA 0x2489350, 5-way 0x24893D8) 연산 5종 = `=WorkValue` · `WorkValue+v` · `v-WorkValue` · `WorkValue*v` · `v/WorkValue`, 동일 Work 스킬은 순차 체이닝(SkillArray.CalcWork RVA 0x24891D0) · 소비처 = ItemHealScale → MapItemHelper.GetHealPower(RVA 0x1DEDA00) · Job/TotalGrowChange → Unit.GetCapabilityGrow(RVA 0x1A2FF20) = 성장률 변조 스킬(努力の才 등)의 실제 경로"
    },
    {
      "id": "skills.weapon-level-merge",
      "label": {
        "en": "WeaponLevel merged by max per slot",
        "ko": "무기 레벨 보정 = 슬롯별 최댓값 병합"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): WeaponLevel은 가산이 아니라 **슬롯별 MAX 병합**이다 — SkillArray.UpdateImpl(RVA 0x24865C0) → WeaponLevels.Add(RVA 0x21C9CF0)가 10슬롯 각각에 Mathf.Max를 적용 ⇒ 杖使い·＋·＋＋ 중첩 불가(합산 배선은 과대)"
    },
    {
      "id": "skills.enhance-level",
      "label": {
        "en": "EnhanceLevel = summed gate (>=1)",
        "ko": "EnhanceLevel = 합산 1 이상 게이트"
      },
      "status": "absent",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4): EnhanceLevel(+0x208)은 개별 수치가 아니라 **전 스킬 합산이 1 이상인지의 게이트**다 — UnitEnhanceCalculator.AddImpl(RVA 0x1F788C0, 누적 0x1F7893C, 판정 0x1F79138 cmp w19,#1 b.lt)가 그 합으로 성장률 경로를 분기한다"
    },
    {
      "id": "skills.crit-unknown",
      "label": {
        "en": "Lueur +5 crit = Vander's aura (identified)",
        "ko": "뤼에르 필살 +5 = 반데르 白の忠誠 오라(규명 완료)"
      },
      "status": "absent",
      "evidence": "규명 = SID_白の忠誠(Timing=20, 인접 시 必殺値+5 — 엔게이지 무관, m002/m003 배치·예보 4중 검증, gaps/C §0) · 미구현 사유 = skills.aura-give"
    },
    {
      "id": "emblem.sync-stats",
      "label": {
        "en": "Sync stat bonuses via skills",
        "ko": "싱크로 스탯 보정(스킬 경유)"
      },
      "status": "anchored",
      "evidence": "corpus.test.ts 기본능력 표시 = 싱크로 칩 포함"
    },
    {
      "id": "emblem.sync-bond-level",
      "label": {
        "en": "Sync skills = union of bond levels 1..N (highest per series)",
        "ko": "싱크로 스킬 = 絆 1..N 합집합·동계열 최고 레벨"
      },
      "status": "anchored",
      "evidence": "絆3 실측 정합(fe17.test.ts 技+2·ブレイク時追撃 — gaps/C §4-3) · 레벨값은 편집기(M4) 소유(기본 = god Level) · ★IL2CPP로 규칙 확정(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §6): GodGrowthData.OnCompletedEnd(RVA 0x2332320)가 레벨별 누적 LevelData를 사전 생성하고 LevelData.Add(RVA 0x1CD7500)가 병합을 수행 · **동계열의 정본 = SkillData.Group(+0x90)** — GroupAssign(RVA 0x248D0C0)이 skill.xml 習得優先度 연속 구간으로 부여(100그룹·412스킬) · 대체 게이트 = PrivateFlags.CanOverride(Priority<=99), 승자 = Priority 큰 쪽 · Priority=0은 그룹이 없어 항상 합집합(SID_ブレイク時追撃) · ★배선 완료(2026-08-18 4b, fe17.ts): SID 정규식 근사 폐기 → GroupAssign 로드 시 재현(전수 100그룹·412스킬 일치)·LevelData.Add 병합 규칙 이식 · 인게이지 중 EngagedSkills 교체 + EngageSid 치환도 배선(emblemEngagedSids·엔진 effectiveSkills, fe17.test.ts 에이리크 腕輪 치환·대체)"
    },
    {
      "id": "emblem.chapter-bond-level",
      "label": {
        "en": "Per-chapter emblem bond level baseline",
        "ko": "챕터별 엠블렘 絆 레벨 기본값"
      },
      "status": "absent",
      "evidence": "chart.xml 神将 42행×12열 = 504셀 전수(비영 275셀·비영행 39, 상한 20, M011 전열 0 = 반지 상실 구간 정합) — gamedata 60개 XML 헤더 전수 파싱 결과 유일 소유(gaps/O §10-2) · emblem.sync-bond-level과 별개 기전 · ★IL2CPP 대조(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §12): ChartGodData 클래스와 필드 매핑은 실재하나(GetLevel RVA 0x1EA04A0·Gid2Level RVA 0x1EA05C0) **.text 전량 스캔에서 Load·GetLevel 호출자 0건**이고 GodUnit.SetLevel의 유일 호출자도 되돌리기 프리뷰다 — 게임이 이 시트로 絆 레벨을 세팅하는 경로는 미발견(BLR·리플렉션 미검증) · ⇒ 이 시트는 '게임 정본'이 아니라 **시뮬레이터가 채택할 수 있는 유일한 챕터별 데이터**로만 쓸 것"
    },
    {
      "id": "emblem.engage-activation",
      "label": {
        "en": "Engage activation, meter, duration",
        "ko": "인게이지 발동·카운트·지속"
      },
      "status": "implemented",
      "evidence": "실측 = 충전은 전투 참가당 +1(공격·피격 각 1, 대기 무충전) · 지속 표본 3(정규 반지 3턴·외전 클리어 4·DLC 팔찌 4) · 정수 증감 사례 = TikiEngageAtk+(+3)·JobSkill_ShadowLordR(+1)·MIID_HE_Medicine(+2)(gaps/C §2·N §2-2) · ★IL2CPP 코드로 전 항목 확정(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §3·EXP_CHAIN_ENGAGE.md §3): 초기값 = min(params エンゲージ初期値=7, limit)(Unit.ResetEngageCount RVA 0x1A1A740) · limit = max(0, god.EngageCount − 成長表 Flag SubEngageCountLimit − 스킬 Flag bit42)(RVA 0x1A57B90) · 발동 = count>=limit(CanEngageImpl RVA 0x1A26F70), 발동 시 차감이 아니라 해제 경로에서 0으로 소각(SetEngageImpl RVA 0x1A25D10) · **충전은 전투/지팡이 행동당 +1뿐이고 턴당 자연 증가는 원래 없다**(BattleCalculator.AddEngageCount RVA 0x2470740, 호출자 = CalcAction·CalcRodAttack 둘뿐 · 인게이지 중·체인 참가·지형 NotEngageAdd는 무충전) = 실측과 코드 일치, '턴당 증가량 미상'은 결손이 아니라 부재로 종결 · 지속 = params エンゲージ継続ターン(3) + (成長表 Flag AddEngageTurnLimit ? 1 : 0), 경과는 자기 페이즈 시작마다 +1(ResetPhaseBeginAfter RVA 0x1A19810) · ☠**종전 '마르스 인연10=3이 레벨 가설을 기각한다'는 판정을 철회한다** — 임계는 10이 아니라 **絆 11**(god.xml 成長表 Lv11 Flag=2 AddEngageTurnLimit, 絆 20에서 SubEngageCountLimit, リュール만 Lv20에서 AddEngageTurnLimit·EngageCount=9)이므로 인연 10에서 3턴인 것은 반증이 아니라 임계가 11이라는 증거였다 · ★상태 기계 배선 완료(2026-08-18 4a, actions.engage 참조 — engageStateFor가 limit·turnLimit·초기값 산출) ☠잔여 = 장착 스킬 Flag bit42(SubEngageCountLimit) 차감 미배선(skills 사영에 Flags 없음)"
    },
    {
      "id": "emblem.engage-kit",
      "label": {
        "en": "Engage weapons and engage skills",
        "ko": "엠블렘 무기·인게이지 기술"
      },
      "status": "deferred",
      "evidence": "구조 규명 — 成長表 레벨별 EngageSkills/EngageItems·神将 EngageAttack/LinkGid(gaps/C §3) · 스타일 분기 문장사 = ベレト·チキ 2종(gaps/F 정정) · ★엠블렘 무기 배선 완료(2026-08-18 4b): EngageItems 레벨 누적 → engaging 중 weapons 뒤 증설(인덱스 계약 유지)·해제 시 장비 복귀(engage.test.ts) — ☠엠블렘 지팡이(リカバー류)는 미배선(공격 무기만) · ☠잔여 = 인게이지 기술(戦技) 자체(4c) · ★IL2CPP 선택 규칙 확정(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §5·§6): 인게이지 기술 선택 우선순위 = 暴走(GodState.Rampage) > 連動(IsAround 링크 인접) > 기본(GodData +0xB0/+0xB8/+0xA8), 그 뒤 SkillData.m_StyleSkills[job.Style]로 스타일 분기(GetEngageAttack RVA 0x2341640) · 인게이지 중에는 데이터 소스가 GodData.MainData(+0x100)로 치환된다 · 카운트 소비(技コスト)는 전수 9행뿐(三級長 戦技 狂嵐3/無残1/落星1 × 스타일 3)"
    },
    {
      "id": "emblem.bond-ring",
      "label": {
        "en": "Bond rings (stats, S-rank skills)",
        "ko": "絆지환(스탯 보정·S랭크 스킬)"
      },
      "status": "absent",
      "evidence": "ring.xml 487행 정식화 — 정규 12문장사만 세트 보유(DLC 0건 덤프 확정) · S랭크 EquipSids 28행 전부 Rank=3(gaps/F) · ★IL2CPP 적용 경로 확정(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §12): RingData.Enhance(+0x58)가 Unit.CommitEnhance(RVA 0x1A1AAE0, 0x1A1B858~)에서 무기 강화와 **동일한 additive 누산 루프**로 최종 스탯에 합산된다 · Rank 분기 코드는 없다(랭크 차이 = 행별 Enhance 값 차이) · 착용 Gid 제한 코드도 없다(SetRing RVA 0x1A4E000) · 정화(Dirty)는 GetDirtyLevel(RVA 0x2343290)의 UI 0~3 변환뿐 = 스탯 무관 연출 · ☠S랭크 EquipSids 소비 지점은 여전히 미확정"
    },
    {
      "id": "emblem.inheritance",
      "label": {
        "en": "Skill inheritance (cost, availability)",
        "ko": "스킬 계승(비용·가능 여부)"
      },
      "status": "absent",
      "evidence": "skill.xml InheritanceCost/Sort 확인 · 사영 복원 완료(growth 255행 레벨별 보존 — projection.test.ts) · 수집·소비 = M4 편집기(요구 189행 중 183행이 ENH 정적 보정, gaps/I) · ★IL2CPP로 정본 정정(5.0.0, 2026-08-17, il2cpp/SKILL_ENGINE.md §4·EMBLEM_ENGAGE.md §12): god.xml InheritanceSkills는 **카탈로그일 뿐**이고 실보유 원장은 세이브(GodBond.m_InheritedSkills = GodInheritedSkills, HashSet<int>)다 ⇒ 시뮬에서는 **사용자 선택 입력**으로 모델링해야 한다(정적 데이터로 결정되지 않는다) · 해금 = 成長表 Flag UnlockSkillInheritance(=1) = 19문장사 전원 **Level 5** 행(CanInheritSkills RVA 0x2341360) — '리유르만 계승 불가'는 성장표 부재로 설명된다 · 비용 = SkillData.InheritanceCost(+0x230)를 Unit.m_SkillPoint(+0x1BE)에서 차감, 선행 계승 보유 시 체인 할인(ResetCost RVA 0x24A64A0) · 계승 결과의 배치처 = Unit.m_EquipSkillPool(+0x118) **장착 후보 풀**이며 m_EquipSkill(+0xF8) 자동 편입이 아니다(OnInherite RVA 0x24A6CE0, AddEquipSkill RVA 0x1A35F80) ⇒ 계승 스킬을 곧바로 '적용 대상'으로 취급하면 과대"
    },
    {
      "id": "emblem.doubles-multiplier",
      "label": {
        "en": "Doubles/afterimage stat multiplier",
        "ko": "잔상(분신) 능력 배율"
      },
      "status": "absent",
      "evidence": "残像能力倍率 = 1(params GameRule) — effect 残像コマンド와 명칭 일치, 소재 스킬 ID 미확정(gaps/J)"
    },
    {
      "id": "emblem.crest-tile",
      "label": {
        "en": "Emblem energy tile effect",
        "ko": "紋章氣(문장기) 효과"
      },
      "status": "assumed",
      "evidence": "★배선 완료(2026-08-18 4b, engage.test.ts) — 국면 crests 상태 + crest 이벤트(절대 재생 복원): 비인게이지·비만충일 때 count = limit **대입** + 타일 1회성 소멸, 보드·리플레이·/s/ 렌더도 잔존 목록(visibleObjects)을 따른다 · ⚠가정 = 발동 시점을 '그 칸에서 활성화 종료(대기 포함)'로 두었다(실측 대조 대상 — 코드 확정은 처리 내용뿐) · ★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/EMBLEM_ENGAGE.md §4·MOVE_TERRAIN.md §3): 판별 = TerrainData Flag bit15 EngageHeal(32768, TID_紋章氣) — IsEngageHeal(RVA 0x21E33C0) · 처리 = MapSequenceMind.EngageHeal(RVA 0x2681CC0)이 그 칸의 설치물(MapOverlap) 지형이 EngageHeal이고 비인게이지·비만충일 때 EngageCount = limit을 대입(가산 아님)하고 직후 MapOverlap.Remove ⇒ '회복량' 필드는 존재하지 않는다(덤프 부재값의 정체) · 자매 Flag NotEngageAdd(8192) = 그 칸 전투는 무충전(미배선 — 지형 스키마 확장 선행)"
    },
    {
      "id": "weapons.attack-kinds",
      "label": {
        "en": "Attack weapon kinds (staves excluded)",
        "ko": "공격 무기 판별(Kind 1~6·8·9, 지팡이 제외)"
      },
      "status": "anchored",
      "evidence": "전수 실측(decisions 2026-08-16) · 661건 재확인 반례 0(gaps/B §1)"
    },
    {
      "id": "weapons.range-union",
      "label": {
        "en": "Attack range = union of RangeI..RangeO",
        "ko": "사거리 = RangeI..RangeO 합집합"
      },
      "status": "anchored",
      "evidence": "전수 실측(decisions 2026-08-16) · 661건 재확인 반례 0(gaps/B §1)"
    },
    {
      "id": "weapons.magic-split",
      "label": {
        "en": "Magic damage detection (Kind 6 or flag)",
        "ko": "마법 데미지 판별(Kind 6 또는 Flag bit16)"
      },
      "status": "anchored",
      "evidence": "item.xml 661건 전수 — Kind=6/Flag bit16 상호배타·반례 0(gaps/B §2, 2026-08-17)"
    },
    {
      "id": "weapons.equip-enhance",
      "label": {
        "en": "Equipped item stat enhancement (Enhance.*)",
        "ko": "장비 아이템 능력치 강화(Enhance.*)"
      },
      "status": "anchored",
      "evidence": "★배선 완료(2026-08-19 MP8 A8, RULE_VERSION fe17-11) — **무기 35종**이 `items.json Enhance.*`를 든다(티르핑 마방+5 · 봉인의 검 수비/마방+5 · 빛의 검 행운+10 · 호신 체술 수비+5). 종전에는 이 열을 **도핑 아이템 전용으로 오해해 사영조차 없었고**, `m004`에 `GID_シグルド`가 실재하므로 **이미 발현 중인 결손**이었다(엠블렘 무기를 드는 순간 방어 수치가 실기와 갈린다). 정본 = `UnitEnhanceCalculator.Commit1st`(0x1F74B40)가 **0x1F74C44에서 장착 아이템의 `Enhance`(0xB0)를 직접 읽는다**(사슬 = `Unit.UpdateStateImpl` → `Unit.CommitEnhance` → `Commit1st`). 배선 = `fe17.ts enhanceBlock` 사영 → `BattleWeapon.enhance` → 엔진 `toCombatant` **한 곳**에서만 가산(☠`UnitState.stats`에 더하면 레벨업 상한 판정이 오염된다). 현행 데이터의 무기는 Def/Mdef/Luck/Quick/Str만 쓰고 Hp·Move는 0이나 계약은 맞춰 뒀다. 앵커 = enhance.test.ts 5건(스탯 가산·원본 불변·마방이 피해를 줄임·속도가 추격 임계를 넘김) + fe17.test.ts 사영 3건. ⚠미배선 = 로스터 화면의 표시 스탯(전투 입력에만 얹는다) · 신기 연성 시 `TryGetGodWeaponRefineResultEnhance`(0x2344BE0) 대체 경로"
    },
    {
      "id": "weapons.cannon-hit-model",
      "label": {
        "en": "Cannon (bullet) weapons: dedicated hit formula and range falloff",
        "ko": "포탄 무기 전용 명중식과 거리 감쇠"
      },
      "status": "absent",
      "evidence": "☠**런타임 미배선**(2026-08-19 전수 확인, MP8 A8) — 종전 `anchored`였으나 포대 지형의 `terrain.CannonSkill`·`CannonShells{N,H,L}`을 **읽는 코드가 없다**(엔진·앱 grep 0건). 포대 지형 9종이 스킬도 탄수도 주지 않으므로 이 명중식은 어떤 전투에도 적용되지 않는다. 선행 = 지형 스킬 부여층 + 포탄 무기 시뮬 수요(§0 미룸). 이하 = 판독 근거(유효): skill.xml SID_弾丸命中 = max(技+力+体格+int(幸運/2)+武器命中+支援命中 − cond(거리>=4,(거리-3)*10,0), 0) — 표준 命中値計算(技*2+...)을 대체 · SID_弾丸攻撃力 = ユニット攻撃力(技) 대체 · 텍스트 유도 = patch1~3 MIID_H_Bullet_*(상대가 멀수록 명중 감소, gaps/N §3-2) · A축 calculator 52식 전수에는 없던 skill.xml 전용 항"
    },
    {
      "id": "weapons.equip-sids",
      "label": {
        "en": "Weapon/item granted skills (EquipSids)",
        "ko": "무기·아이템 부여 스킬(EquipSids)"
      },
      "status": "absent",
      "evidence": "수집 결손 85행(items.json에 EquipSids 259행 이미 산출 — 배선만 없음, gaps/I 투자 2위)"
    },
    {
      "id": "weapons.add-effect-schema",
      "label": {
        "en": "Item add-effect schema (AddTarget x AddRange x AddType x AddPower x AddSids)",
        "ko": "아이템 부가효과 스키마(AddTarget×AddRange×AddType×AddPower×AddSids)"
      },
      "status": "anchored",
      "evidence": "item.xml IID_傷薬/特効薬/たいまつ/お弁当 4건 1:1 대조 + patch1.msbt MIID_HE_* 24건(§2-7) — AddType 정의역={0,2,7,18,19,31}, AddType=7=인게이지 카운트 증가·2=HP 회복·19=시야(횃불)·31=생존 보장, 0=AddSids 위임(인챈트)(gaps/N §3-5) · AddType=7+AddPower가 인게이지 카운트 정수 증감의 데이터측 정본"
    },
    {
      "id": "weapons.enchant-by-weapon-name",
      "label": {
        "en": "Enchant applies to all weapons sharing a name, lasts until map end",
        "ko": "인챈트 = 동명(同名) 무기 전체 적용, 맵 종료까지 지속"
      },
      "status": "anchored",
      "evidence": "patch1.msbt MIID_HE_Weapon{Atk,Hit,Avo,Crit,Def}/_Short + item.xml AddTarget=3/AddSids + skill.xml SID_EN_威力上昇(武器攻撃力+=5, Timing=3, Life=0) — 개별 인스턴스가 아닌 무기 이름 단위 강화(gaps/N §2-7, §3-5)"
    },
    {
      "id": "weapons.tonic-level-scaling",
      "label": {
        "en": "Tonic items scale stat gain by unit level",
        "ko": "토닉류 아이템 = 유닛 레벨에 비례한 스탯 상승"
      },
      "status": "absent",
      "evidence": "patch1.msbt MIID_HE_{Hp,Str,Tec,Spd,Mag}Tonic kr/us 일치('레벨에 따라 상승'/'relative to level') — 수치는 텍스트·item.xml AddPower 어디에도 없음, 실행부 또는 미확인 테이블 소관(gaps/N §4-1 #12)"
    },
    {
      "id": "weapons.forge-engrave",
      "label": {
        "en": "Forging and engraving bonuses",
        "ko": "연성·각인 보정"
      },
      "status": "absent",
      "evidence": "3계통 정식화 — 錬成 552행·進化 114행·エンゲージ武器強化 65종×3단계(gaps/B §3, F) · 각인(刻印) = god.xml 神将 시트 소유(22행 채움, gaps/F) · ★IL2CPP 주입 지점 확정(5.0.0, 2026-08-17, il2cpp/RATES_FORMULA.md §4-1·EMBLEM_ENGAGE.md §11·§12): 武器命中 = ItemData.Hit(+0x66) + 연성 RefineData(+0x32) + 각인(+0xF2) + GodWeaponRefineData.GetValueHit의 합(BattleDetail.CalcHit RVA 0x1E74810, 회피·필살도 CalcAvoid/CalcCritical에서 동형) · 각인은 전투 계산 단계 보정이 아니라 **무기 스탯 게터 안에서 무기 수치에 직접 가산**된다(UnitItem.GetPower RVA 0x1FAF600 등 6종, UnitItem.m_Engrave(+0x28)에 GodData 참조로 영구 기록 — 엠블렘 장착 상태와 무관, SetEngrave RVA 0x1FB0080) · 엠블렘 무기 강화 용량 = **그 엠블렘과 絆 10 이상인 아군 유닛 수**(RefineGodWeaponCommon.GetCapacity RVA 0x237FB00, params エンゲージ武器強化限界値絆レベル=10)이고 단계 수는 코드 상수가 아니라 데이터 · 결과 스탯 = Unit.CommitEnhance, 결과 스킬 = UnitItem.GetEquipSkills(RVA 0x1FAFBD0)"
    },
    {
      "id": "turn.phase-cycle",
      "label": {
        "en": "Phase cycle and turn increment",
        "ko": "페이즈 순환(생존 군만)·자군 복귀 시 턴 증가"
      },
      "status": "implemented",
      "evidence": "battle.test.ts · 배너 문자열 4군 순환 방증(gaps/E §1-9)"
    },
    {
      "id": "turn.activation-reset",
      "label": {
        "en": "Phase start resets acted/moved/broken",
        "ko": "페이즈 복귀 시 행동·이동·브레이크 리셋"
      },
      "status": "implemented",
      "evidence": "battle.test.ts"
    },
    {
      "id": "turn.terrain-heal",
      "label": {
        "en": "Terrain heal/damage at turn start",
        "ko": "지형 회복·피해(턴 시작)"
      },
      "status": "anchored",
      "evidence": "요새·회복바닥 등 Heal 비영 타일 다수 — endPhase에 회복 로직 부재(gaps/D §3) · ★IL2CPP 식 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §2-8): 턴 시작에 서 있는 칸의 terrain.Heal로 회복(ProcTerrainHeal.GetHeal RVA 0x1E3BB40), 대칭으로 지형 피해도 존재(ProcTerrainDamage.GetDamage RVA 0x1E3B970) · **비행(IsFly 또는 MoveFly)은 전면 면제**(Flag.FlyEnable 타일 한정이나 그 Flag 보유 타일이 0건) · BmapSize 2 및 3 초과 유닛도 제외 · ★IL2CPP 신규 판독(2026-08-18, MP3_READINGS §1·§2): 적용 = ProcTerrainDamage/Heal(0x1B6FB80) — 피해·회복 = 베이스+오버레이 Heal 합(합 0 = 스킵), canDie=false 상수라 **hp 하한 1(지형 사망 불가)**, 면제 = JobData.IsFly = Attrs bit3(☠moveType 아님 — 용 비면제)·BmapSize 2/>3 제외 · ★배선 완료(MP3 3-1): endPhase 자기 페이즈 시작 적용 + terrainHeal 이벤트 절대 재생 — terrain.test.ts 3건"
    },
    {
      "id": "turn.chapter-hold-level",
      "label": {
        "en": "Chapter hold level (Fell Xenologue)",
        "ko": "챕터 고정 레벨(사룡의 장 HoldLevel)"
      },
      "status": "absent",
      "evidence": "chapter.xml HoldLevel = E001~E006 고정 15~28(gaps/L §2-2) · 레벨 영향 실재 = 사용자 전언 정합 · e00x Lua에 레벨 조작 0건 = HoldLevel 단독 소관, 적용식(상하향 클램프)은 덤프에 없음 — E시리즈 변환 시 실측·배선 · 교차 보강(2026-08-17): E시리즈 적 레벨은 person.xml에 박제(E001 = 15/18/23, HoldLevel 15와 정합) — HoldLevel = 아군 클램프·적 = person 박제 분업 가설 지지(gaps/L 실측 후속 절)"
    },
    {
      "id": "turn.rewind",
      "label": {
        "en": "Time crystal rewind (limits, script gating)",
        "ko": "되감기(시간의 수정 — 한도·스크립트 통제)"
      },
      "status": "absent",
      "evidence": "한도 = Normal 무제한/Hard·Lunatic 10(params) · Lua MapHistory* 훅 9종 — 챕터·시점별 스크립트 통제(M4 언두 설계 참조, gaps/J·M)"
    },
    {
      "id": "turn.map-gimmicks",
      "label": {
        "en": "Map gimmicks (spread, hazards, collapse)",
        "ko": "맵 기믹(확산·위험타일·붕괴 등)"
      },
      "status": "absent",
      "evidence": "RNG 소비 3계열(미아즈마 확산·파괴 장애물·위험타일 텔레그래프) + 독가스·얼음·구역붕괴(gaps/M §4) · 안개 기믹은 원문 0건 · ★IL2CPP 구조 확정(5.0.0, 2026-08-17, il2cpp/MOVE_TERRAIN.md §3): 기믹의 그릇 = **MapOverlap**(SingletonClass, MaxCount=128) — Data{X,Z,Index,Hp,Life,Turn,Phase}를 들고 GetMoveCost/GetFlyCost/GetTerrain로 이동·전투 양쪽에 합류한다 ⇒ 지형 2층 합산(combat.terrain-bonus)·오버레이 이동 코스트(movement.range-terrain-cost)·문장기 타일 소멸(emblem.crest-tile)이 전부 이 한 층의 소비처다 · 난수 스트림은 combat.rng-source의 Game 스트림 공유 여부가 여전히 미판정 · ★정적 층 배선(2026-08-18, MP3 3-2): m_Overlaps 초기 상태 = BattleMap.overlays(전투·코스트·MoveFirst·heal 가산 소비) — 런타임 생성(MapOverlapSet)·Life 수명은 여전히 미배선"
    },
    {
      "id": "turn.victory-rout",
      "label": {
        "en": "Rout victory / player wipe defeat",
        "ko": "적 전멸 = 승리 · 자군 전멸 = 패배"
      },
      "status": "implemented",
      "evidence": "battle.test.ts"
    },
    {
      "id": "turn.victory-objectives",
      "label": {
        "en": "Chapter-specific objectives",
        "ko": "챕터 고유 승리 조건"
      },
      "status": "deferred",
      "evidence": "Lua 이벤트 엔진(M4 이후, §0 미룸) — 2계층 모델 확정: 표준 4함수+WinRule() 및 Die/Destroy→勝利/敗北 콜백 오버라이드 18건(gaps/E §2-2, M §5)"
    },
    {
      "id": "turn.reinforcements",
      "label": {
        "en": "Reinforcements (turn/condition spawns)",
        "ko": "증원(턴·조건 등장)"
      },
      "status": "deferred",
      "evidence": "Lua 이벤트 엔진(§0 미룸) — 증원 5패턴, Dispos() 단일 원시함수 363회 전량·반례 0(gaps/E §2-1, M §5)"
    },
    {
      "id": "turn.enemy-ai",
      "label": {
        "en": "Automatic enemy phase AI",
        "ko": "적턴 AI 자동 진행"
      },
      "status": "assumed",
      "evidence": "M5 — L1층(루틴 배정·인자 결선·개시 조건·타겟 지정)은 덤프 확정 · 지원 스코어 상수 3/2/1(gaps/J) · ★IL2CPP로 L2층까지 전량 판독 완료(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md): 종전 'L2 스코어링 = 실행파일 미판독'은 해소됐다 — 옵코드 사전 App.AIConst 95/95 · 인터프리터 AIThink.Processing(RVA 0x1925420)·ProcessingActive(RVA 0x193AAD0) · 평가함수 AIBattleSimulator.CalculateScore(RVA 0x1928570) 비트필드 3종 · 적턴 페이즈 13단 AIOrder..cctor(RVA 0x1936C70) · 난수 사용 지점까지 특정(동점 시 Random.System 코인플립) ⇒ **선행 결손 없음, 남은 것은 구현 공수뿐** · 조합 집계 재산출 = 상위 3 82.9% / 상위 4 84.1%(gaps/K의 83.3%은 AI_MindName 제외 4열 조합이라 미세 차이) · ★MP4 이식 완료(2026-08-18): engine `packages/engine/src/ai/` — `createAi(calc).next(state, aiRng, memory)`가 다음 행동 1건(이동+공격 등 액션 배열)을 돌려주는 순수 함수이고 실행은 호출측이 reduce로 한다(☠AI는 reduce를 부르지 않는다). 난수는 전투 RNG와 **별도 스트림**(Random.System)으로 주입 · 페이즈 13단·우선도식·Active 게이트·조건 OR·표적/위치 2중 스코어·밴드 전파·MoveLimit·회복 임계 전량 배선 · UI = BoardIsland '적턴 자동' 버튼(액션마다 dispatch → 기보에 그대로 기록, 결손만 남으면 정지·표시) · **실측** = m002·m003 헤드리스 적 페이즈가 결손 0으로 완주하고 잠든 적은 움직이지 않으며 먼 적은 매 턴 접근한다 · ☠**assumed 사유** = 행동 핸들러 커버리지가 부분이다(장부 ai.action-handlers의 잔여 결손 목록) · 위임(turn.delegate)은 별도 경로로 미배선 · ★MP4 2라운드(2026-08-18): 전 54챕터 헤드리스 재실측 **85.9% → 95.7%**(결손 유닛 848 → 257 / 6006), 본편 m* **86.6% → 95.3%**, 결손 0 챕터 **16 → 24/54**. m002 결손 0(액션 10)·m006 결손 0(액션 20)·m020 결손 5/54. 추가 배선 = AC_BandRange 계열 6종·AC_AttackRangeExcludePerson·RD_Heal·MI_Torch·MV_Position · ☠회귀 1건을 테스트가 잡았다 — `V_Default(-1)`은 factor 100(퍼센트)이고 `V_Max(-2)`만 맵 전역인데 둘을 섞으면 잠든 적이 1턴부터 전부 깨어난다(m003 게이트가 레드를 냄) · ★진행 감시 배선(2026-08-18): 소비 계약에 **무진행 감지**를 넣었다 — 결정을 넣었는데 국면이 그대로면 그 유닛을 `AiMemory.skipped`에 등재하고 이후 건너뛴다(결손 kind=engine으로 노출). endPhase 거부도 화면에 알린다. ☠없으면 같은 국면 → 같은 결정 → 1000루프 침묵이 된다. 헤드리스 하네스(aiChapter)도 같은 계약을 쓴다 · ★m001 실플레이 완주 실측(2026-08-18, 드라이버 5턴 승리 배너) — 이때의 정지는 AI가 아니라 이벤트 네이티브 `UnitSetHp` 미등록이 원인이었고(장부 events.engine), AI가 낸 액션이 reduce에 거부된 사례는 **전 54챕터 실측에서 0건**이다(하네스가 모든 AI 액션을 reduce에 통과시키는데 한 번도 던지지 않았다 = 합법성 표류 없음) · ★다턴 소크 실측(2026-08-18): 전 54챕터 × 최대 12페이즈를 돌려 **AI 액션 4654건**을 전부 reduce에 통과시켰고 **거부 0 · 무진행 루프 0 · endPhase 거부 0**이었다(합법성 표류 없음의 정면 증거). 상시 게이트로는 대표 4챕터(m001·m006·m020·s015) 축약본을 aiChapter.test.ts에 상주시킨다(전량 소크는 45초라 과하다) · ★2라운드 후반 재실측(2026-08-18): 전 54챕터 **96.9%**(결손 187/6006) · 본편 m* **97.1%** · 결손 0 챕터 **29/54** (2라운드 시작 시점 85.9%/16챕터에서 출발) · ★2라운드 최종 실측(2026-08-18): 전 54챕터 **97.7%**(결손 139/6006) · 본편 m* **98.1%** · 결손 0 챕터 **38/54** (2라운드 시작 85.9%/16챕터 → 97.7%/38챕터) · ★DeadHero 배선(2026-08-18): 주인공(SID_主人公) 사망 = 상시 즉시 패배(GameEndCheckUnitDead DeadHero=6 — 승리 변수보다 선행), m002 자율 플레이 오재현 실측이 발현 계기 — battle.test.ts · ★3라운드 실측(2026-08-18): 전 54챕터 **98.4%**(결손 95/6006) · 본편 m* **98.9%** · 결손 0 챕터 **41/54** · ★4라운드 실측(2026-08-18): 전 54챕터 **98.8%**(결손 71/6006) · 본편 m* **99.5%** · 결손 0 챕터 **45/54**"
    },
    {
      "id": "turn.delegate",
      "label": {
        "en": "Delegate (auto-battle)",
        "ko": "위임(자동진행)"
      },
      "status": "deferred",
      "evidence": "적턴 AI 모듈 공유(M5, gaps/K §9) · ★IL2CPP로 경로 분리 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §6): 위임은 적 AI와 **전투 시뮬·스코어 코어만 공유**하고 정책은 별개 하드코딩 체인이다(ProcessingEntrust RVA 0x1924F00, 위임 전용 페이즈 12단 aFuncEntrust) · 입력도 dispos AI가 아니라 MapSituation.m_Entrust(UnitEntrust.Type 6종, 세이브 직렬화) ⇒ dispos 파라미터로는 위임을 재현할 수 없다 · params.xml 自動プレイ* 12항목은 위임과 접점 0건(리테일 스텁)"
    },
    {
      "id": "ai.routine-vocabulary",
      "label": {
        "en": "AI routine opcode programs",
        "ko": "AI 루틴(옵코드 프로그램 141종)"
      },
      "status": "implemented",
      "evidence": "ai.xml 802행 = AC32·MI11·AT63·MV35, dispos 실사용 77종(gaps/K §2) · ★IL2CPP로 사전 확정 — 미지 0종(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §3): 옵코드 사전 = App.AIConst(dump.cs:566105)이고 실사용 95종 전부 이름·핸들러 RVA가 확정됐다(종전 '옵코드 사전은 실행파일 영역' 결손 해소) · 루틴의 실체 = **우선순위순 후보 행동 목록**이며 Active 열 = AIThink.Command{EveryTime=-1, NonActiive=-2, Active=0} · ☠gaps/K §2-3의 '정형 M41 프롤로그 → M71 → M74 에필로그' 해석은 **반증**됐다(41=HE_MiddleLow 회복 · 71/72/74=MI_Guard/GuardBattleScore/GuardNoMove) · 선행 = M5 구현 · ★사영(2026-08-18, MP4): tools/pipeline/transform.py build_ai → data/fe17/tables/ai.json(141루틴 원문 무손실). 아일랜드에는 **챕터가 쓰는 루틴만** BoardProps.aiRoutines로 한 번 싣는다(유닛 복사 금지 — 보드 JSON 예산 50KB gz 유지, 실측 최대 42.9KB). 옵코드 **해석**의 커버리지는 별도 항목 ai.action-handlers 참조"
    },
    {
      "id": "ai.data-projection",
      "label": {
        "en": "AI field projection completeness",
        "ko": "AI 필드 사영 완결성"
      },
      "status": "implemented",
      "evidence": "15필드 전수 사영 복원(존재 여부 기준 — 기본값 75/50 보존, projection.test.ts · FIX_NOTES_2 P4) · battleRate 타입 거짓 정정(문자열) · 소비는 M5 · ★IL2CPP로 필드 의미 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §8-5·§11-1): shared/index.ts의 주석 '비트 범례가 덤프에 없어 해석 금지'는 **반증**됐다 — 범례는 DisposData.AIFlags(dump.cs:592992)에 전량 있다(1 NotActivateByAttacked·2 Dummy·4 ZeroAttack·8 Heal·16 Break·32 Chain·64 EquipShortAfterLongRange·128 MoveBreak·256 EngageAttackOnce), 런타임 변환은 Unit.SetDisposAi(RVA 0x1A0C0E0) · Break/Chain 비트는 평가함수의 브레이크·연계 항 게이트라 M5에서 무시하면 표적 선정이 통째로 틀어진다"
    },
    {
      "id": "ai.move-limit",
      "label": {
        "en": "AI movement boxes (hard constraint)",
        "ko": "AI 이동 제한 박스(AI_MoveLimit)"
      },
      "status": "implemented",
      "evidence": "36건 — 이동을 물리적으로 자르는 하드 제약(m016·m021·m024·m025 포함, gaps/K) · ★IL2CPP 파싱·집행식 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §9-2): 원문 `(x1,z1),(x2,z2)` → Rect{X:x1, Z:z1, W:x2-x1+1, H:z2-z1+1}(Unit.SetDisposAi RVA 0x1A0C268), 허용 = X <= x < X+W && Z <= z < Z+H 반개구간이되 **자기 발밑 칸은 항상 예외 허용** · 집행 지점은 MapDeployTemplate.UnitAIMoveLimit(RVA 0x2C227C0) 단 1곳이 범위 밖을 코스트 0xff로 막는 방식 · 실데이터 형식은 Rect/None뿐 · ★배선(2026-08-18, MP4): engine ai/unit.ts parseMoveLimit·moveLimitAllows — 이동 코스트 이미지(moveImageOf)가 범위 밖 칸을 애초에 제외한다, ai.test.ts 4건"
    },
    {
      "id": "ai.band-activation",
      "label": {
        "en": "Band-linked AI activation",
        "ko": "밴드 연동 기동(AI_BandNo)"
      },
      "status": "implemented",
      "evidence": "328밴드 — 집단 각성 구조(gaps/K) · ★IL2CPP 전파식 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §8-4): UnitUtil.BandActivate(RVA 0x1C73E30)가 같은 AI_BandNo 전원을 Active=1로 세운다 · 게이트 BandActivation은 AI_BandNo!=0이면 자동 세팅(0x1A0C4C4) · ☠BandActivationMove/Attacked 비트는 **세우는 코드가 없어 정규 플레이에서 항상 0** · 개시 조건 AC_BandRange의 첫 인자는 반경이 아니라 **커버 인원 임계** · 거리 인자 단위는 칸이 아니라 **이동력 백분율(%)**(GetMovePower RVA 0x1943F70)이고 다행 조건은 AND가 아니라 **OR**(§8-1·8-2) · ★배선(2026-08-18, MP4): engine ai/unit.ts bandMembers — 기동한 유닛이 같은 AI_BandNo 전원을 Active=1로 전파(aiNextAction 내부). BandActivationMove/Attacked는 항상 0이므로 **구현하지 않는 것이 정확**하다 · ★MP4 2라운드 이식(2026-08-18): `AC_BandRange`(3)·EvenTurn(4)·OddTurn(5)·ExcludePerson(6)·ExcludeFriend(7)·ExcludeSelf(16) 전량 배선 — `IsEnemyInsideAttackAreaForAC`(0x1944330)를 AttackRange 계열과 **공용 판정**으로 이식했다. 판정 = (턴 패리티 게이트) → 같은 AI_BandNo·행동가능 아군의 사정권을 셀마다 +1 도색 → `bandThreshold = min(v1 - 1, 실제 밴드원 수)` → **적이 내 사정권 안이면서 그 칸의 커버 인원이 임계 이상**이면 true. ☠ExcludeSelf(16)만 '내 사정권 안' 조건을 떼고 임계 1 고정(자기 범위 미도색) · ★부수 정정 = `V_Default(-1)`는 factor **100(퍼센트)**이고 `V_Max(-2)`만 factor -1(맵 전역)이다 — 둘을 섞으면 잠든 적이 1턴부터 전부 깨어난다(m003 헤드리스 테스트가 실제로 이 회귀를 잡았다) · AC_AttackRange(1)의 v1 = **기준 좌표 override**(pos(x,z)), AC_AttackRangeExcludePerson(2)의 v1 = 제외 인물 — 둘 다 배선 · ai.test.ts 밴드 5건 + 좌표 override 2건"
    },
    {
      "id": "ai.sub-routine-swap",
      "label": {
        "en": "Conditional AI routine swap",
        "ko": "조건부 서브 AI 치환"
      },
      "status": "implemented",
      "evidence": "Code 6/7/4 치환 구조, 68유닛(gaps/K) · Lua BattleAfter 전환은 combat.scripted-modifiers · ★IL2CPP로 구조 확정 + 기존 해석 정정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §4-4·§11-3): AI_ChangeSeq(6)의 Mind 열 = **대상 슬롯 번호** · AI_ChangeValue(7) = 인자 결선 · ☠AI_Retry(4)는 '치환 블록 종료'가 아니라 **사고 전체 재시작**이다(Processing 0x1925534 while 루프 — 종전 해석 반증) · Code 2도 '인자 없는 조건'이 아니라 AI_ResultCause(RC_Attack/Talk/Arrive 3종) · ★이식(2026-08-18, MP4 2라운드): `AI_ChangeSeq`(6)는 `cmd.Mind`가 가리키는 **다른 슬롯**의 루틴명을 `StrValue0`으로 즉시 교체하고(ProcessingActive에 인라인 — UpdateFlag.Active만 세우므로 Update가 현재 스테이징된 Trans를 쓴다), `AI_Retry`(4)가 Cause부터 사고를 재시작한다. 치환분은 맵 전역 상태라 `AiMemory.sequences`(유닛→슬롯→루틴명)로 보관한다 · ☠`AI_ChangeValue`(7)는 `cmd.Mind == order`일 때만 동작하는데 실데이터(`AI_MV_TreasureToEscape`)는 Move 슬롯(3)에서 Mind=1을 쓰므로 **무동작이 판독대로의 정답**이다(인자 결선은 일어나지 않는다) · ★루틴 스냅숏을 **전이 수집**하도록 고쳤다 — ChangeSeq가 가리키는 루틴은 dispos 슬롯에 없어서, 안 실으면 치환 직후 '루틴 미탑재'로 죽는다(웹 chapterAiRoutines·헤드리스 하네스 양쪽) · ai.test.ts 2건"
    },
    {
      "id": "ai.opcode-interpreter",
      "label": {
        "en": "AI opcode interpreter (slot order, Active gates)",
        "ko": "AI 옵코드 인터프리터(슬롯 순서·Active 게이트)"
      },
      "status": "implemented",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §4·§7): 슬롯 실행 순서 = Cause → Mind → Attack → Move 고정 · Active 게이트 4종(AIThink.Command{EveryTime=-1, NonActiive=-2, Active=0} + 서브상태) · 변경은 Trans에 스테이징했다가 Update에서 반영 · AI_Retry는 Cause부터 재시작 · 적턴 페이즈 13단 테이블 = AIOrder..cctor(RVA 0x1936C70)이고 공격이 3단으로 도는 이유는 유닛이 아니라 **액션**이 걸러지기 때문 · AI_Priority 해석식 = 512*P + 256*enchant + 16 − clamp(removable,0,99), **P < 100이면 Priority 페이즈에서 제외** · ☠gaps/K의 'Trans=-128=무변화'는 코드에 없다(기각) · 선행 = turn.enemy-ai · ★이식(2026-08-18, MP4): engine ai/interpreter.ts processing/processingActive + ai/order.ts AI_PHASES 13단·aiPriorityKey·attackTierAllowed·slotGateOpen. 연속 중복 억제(직전 명령과 Code/Mind/v0/v1 전부 일치 시 스킵)·Trans 스테이징→Update 반영·Retry는 Cause부터 재시작까지 그대로. ai.test.ts 우선도 5건"
    },
    {
      "id": "ai.move-hero",
      "label": {
        "en": "MV_Hero (89): chase the protagonist",
        "ko": "MV_Hero(89) — 주인공 추격"
      },
      "status": "anchored",
      "evidence": "★배선(2026-08-19 MP8 A3, ai.test.ts 3건) — 종전에는 **옵코드 89 핸들러가 없어** 인터프리터가 결손으로 기록하고 폴백 사슬(`82 MV_AttackRange(V_Max)` → `81 MV_Idle`)로 내려갔다. 유닛은 움직이므로 **정지가 아니라 정확도 오차**였고 화면으로는 안 보였다(`m001`의 3유닛이 이 루틴). 정본 = `ActionMoveHero`(0x194F0A0): 대상은 `UnitPool.GetForce(Player).GetHeroUnit()` **1명 확정**이라 후보 열거·점수·코인플립이 **전부 없다**. 주인공 판별 = `PersonData.IsHero`(0x1F2A0B0) = CommonSkills에 `SID_主人公`(전 1523인물 중 `PID_リュール` 1건, AT_Hero가 쓰던 술어 재사용). 도색 = `BlockFree`(목적지가 주인공이 선 칸 자체라 점유를 보면 후보가 사라진다 — MV_Person과 같은 이유) · v0·v1은 본문에서 안 읽는다(사문). ⚠미사영 = `Unit.Status`의 `MoveNotAllow`/`Vision` 게이트(런타임 Status 사영 부재)·`CanUnlockDoor`→`DoorFree`(문 해제 판정 부재) — 둘 다 도달 가능성을 넓히는 방향이라 과대 재현은 아니다"
    },
    {
      "id": "ai.mind-village",
      "label": {
        "en": "MI_Village (62): head for villages (to destroy)",
        "ko": "MI_Village(62) — 민가로 향한다(파괴 목적)"
      },
      "status": "assumed",
      "evidence": "★이동만 배선(2026-08-19 MP8 A3) — ☠☠**이름 함정: '마을 방문'이 아니라 마을 파괴다.** 열거는 `MapFor.EachPoke(MapInspector.Kind.Visit = 8)`로 민가 지점을 훑지만 확정 커밋이 `MapMind.Type.DestroyVillage = 42`(0x194B35C)다 — 플레이어의 '방문'과 대상 지점만 공유하고 결과가 반대다. 정본 = `ActionMindVillage`(0x194B040): 점수는 `100 - 이동코스트` 하나뿐이고 ☠**동점 코인플립이 없다**(나중 후보가 이긴다). ★배선 함정 = 열거 좌표는 `interactions[].stand`다 — `x/y`는 파이프라인이 +1 시프트한 民家入口 타일이고(m004 (14,11)) 실제로 서는 칸은 `stand`(14,10) = dispos `pos(14,10)`와 일치한다. ☠**assumed 사유 2건** = (1) `PersonData.BmapSize > 1` 대형 유닛 제외 게이트가 미사영(과대 적용 방향) (2) **파괴 실행 자체가 엔진에 없다**(`destroy` 액션은 구조물 전용) ⇒ 적은 민가로 **가기만 하고 부수지 못한다**. 위치는 맞고 결과가 다르다 — 선행 = 민가 파괴 실행 배선"
    },
    {
      "id": "ai.attack-scoring",
      "label": {
        "en": "AI target scoring (bitfield lexicographic)",
        "ko": "AI 표적 평가(비트필드 사전식 비교)"
      },
      "status": "assumed",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-17, il2cpp/AI_ENGINE.md §5·§9-4): 표적 평가 = uint32 비트필드의 사전식 비교이고 **AI_BattleRate 3값(Rush/Attack/Chariness)이 비트 레이아웃을 통째로 바꾼다**(AIBattleSimulator.CalculateScore RVA 0x1928570) · 격파 확률이 최상위 비트 = 절대 우선 · 동점이면 Random.System 50% 코인플립(난수 주입 설계 직결 — combat.rng-source의 System 스트림) · 지형 스코어 가중치·가드 3분기(GuardTo RVA 0x194CF60)도 확정 · ☠params.xml AI 가드 3상수(0.3/0.5/0.4)와 CalculateScore의 즉치 0.3/0.5/0.7은 **무관**하다(후자는 하드코딩, GameParam 호출 없음) · 선행 = turn.enemy-ai · ★이식(2026-08-18, MP4): engine ai/score.ts battleScore(3레이아웃 정수 비트필드)·killProbability(명중 결과 재귀, MaxSceneTimes 4)·expectationScoreNormalize(바닥 1·bit폭 포화) + ai/attack.ts getAttackScore·betterAttack(파레토 5단 → 스코어 → 50% 코인플립). ai.test.ts 스코어 6건 · ☠**assumed 사유**: 명중 분포를 엔진 forecastSide로 근사한다(경감 Prevent·스킬 발동 Skill/SkillCritical·기습·연속공격은 엔진 미모델링 = 확률 0) · ★유인(Decoy) 하드 게이트 = **배선 완료**(2026-08-19 MP8 A1, ATTACK_PRIORITY.md §1 S1) — `betterAttack` 맨 앞 즉시 return + AttackHigh 저확률 기각 면제(rejectsLowKill) · ☠단 상태를 **거는 경로가 없다**(부여 = SID_囮指名, GiveSids 부여층 미배선)라 현행 데이터에서 미발현 · 탄 적합성(S2)·AI 커맨드 좌표(S5) 비교자 미모델링 — S5는 ai.json 141루틴에 Code=3/Mind=8이 **0건**이라 미발현 · ★S4 밀치기 비교자는 정본과 완전 일치하나 입력(BlowRatio)이 상수 0이라 **사문화**(선행 = skill ActName 추출) · 연계 기대 데미지(m_ChainAttackExpectation)는 0(인원수만 위치 스코어에 반영) · ★`AC_InterferenceRange` 자격 아이템이 **코드 확정**으로 승격(2026-08-18): 종전 '근사'로 남겼던 `RodType == 3`이 `GetRangeBit`(0x2C29C00) 판독으로 `Kind == Rod(7) && RodType == Interference(3)`임이 확인됐다 — 독립 판독 2건이 같은 결론에 도달(ai_engine_src/L_ac_interference.md + K_interference_escape.md)"
    },
    {
      "id": "ai.attack-position",
      "label": {
        "en": "AI attack-position scoring",
        "ko": "AI 공격 위치 평가(사전식 정수)"
      },
      "status": "assumed",
      "evidence": "★IL2CPP 코드 확정(5.0.0, 2026-08-18, il2cpp/AI_ENGINE.md §5-A): 표적 스코어와 **완전히 별개인 두 번째 스코어**가 '어느 칸에서 때릴지'를 고른다 — `((chainCnt<<2|blow)<<5 | outOfEnemyRange<<4 | terrain)<<8 + (100-moveCost)`(GetAttackPosition RVA 0x193CB30 클로저 b__1). ☠**기대 대미지·격파확률이 들어가지 않는다** · 후보 칸 열거 = 대상 중심 맨해튼 링(z 내림·x 오름, RangeEnumerator 0x24C5300) · 단일 칸 유닛은 목적지 탐색이 없다(목적지 = 공격 위치, GetMovePosition 0x193F3C0) · AI는 후보마다 유닛을 **실제로 옮겨** 지원을 재계산한 뒤 전투를 시뮬한다 · 동점 = AI.IsRandom 50% 코인플립 · 회복 지팡이만 층위가 뒤집혀 이동코스트 > 지형(GetHealRodPosition 0x1958120) · ★이식(2026-08-18, MP4): engine ai/position.ts attackPositionScore·terrainScoreAt·blowScoreAt·enumerateRing + ai/attack.ts getAttackPosition(지원 재계산은 toCombatant(units 교체본) 경유). ai.test.ts 위치·지형·밀치기·열거 10건 · ☠**assumed 사유**: 밀치기 가능 판정(BattleInfoSide.BlowRatio)이 엔진 미모델링이라 blow 항이 항상 0 · 대상 유효무기 판정 세부(장비 봉인·인그레이브 사거리·인챈트)는 원 판독도 부분이라 **장비 무기 사거리 마스크로 근사**(AI_ENGINE §13 #13) · GetAttackRange(0x193E700) 본체 미판독이라 mRange = 무기 rangeMin..rangeMax 마스크로 근사(§13 #14)"
    },
    {
      "id": "ai.action-handlers",
      "label": {
        "en": "AI action handler bodies",
        "ko": "AI 행동 핸들러 본문"
      },
      "status": "assumed",
      "evidence": "옵코드 **사전**은 95/95 확정이지만 핸들러 **본문**은 일부만 판독됐다(il2cpp/AI_ENGINE.md는 사전·인터프리터·스코어·순번을 다루고 핸들러 본문은 다루지 않는다). ☠미판독 = 지어내지 않고 정직 결손으로 노출한다 — aiNextAction이 그 유닛을 건너뛰고 사유를 AiDecision.deficits에 남기며, UI(적턴 자동)는 결손만 남으면 **정지하고 표시**한다(몰래 wait 강하 = 오재현이므로 금지) · 미판독 목록 = AttackTo(0x1945DB0 — 표적 열거 순서·옵코드별 표적 필터 AT_Hero/Person/ExcludePerson/Force·AttackFlag 합성) · ActionMoveAttackRange(0x194E0D0 — MV_WeakRange가 비자군 유닛의 83%) · ActionMoveIdle(0x194D890) · ActionMindGuard/GuardTo(0x194CF60 — params 임계 3개만 확정) · ActionHealMiddleLow/HealMindTo(0x1948A60/0x19489E0) · ActionRodHeal(0x19469F0) · Mind 계열(Treasure·Village·Torch·BreakDown) · 인게이지/커맨드 스킬 계열 전량 · ★MP4 신규 판독 + 이식(2026-08-18, il2cpp/ai_engine_src/H_handlers.md — 본 갈래가 직접 디스어셈블): `AttackTo`(0x1945DB0) = 표적 열거 `MapFor.EachEnemyUnit`(진영 0→1→2, 각 진영 배치 순, 조기 종료 없음) + 옵코드 필터 `IsAttackPermissionOnlyCommand`(0x193C830, 점프테이블 33바이트 실측) — ☠**AT_Default는 필터가 전혀 없고 `GetAttackScore`에 넘기는 AttackFlag는 항상 0**이다(`str wzr` 1곳, Break/Chain/Nearest 어느 비트도 안 붙는다 — 종전 '연계·브레이크 비트가 붙을 것'이라는 추정을 반증) · `ActionMoveAttackRange`(0x194E0D0) = isWeak(86·87)면 `GetAttackScore(ScoreExpectation)` 최대화, 그 외(82~85·109)는 `(도달 턴 수)*256 + 이미 노린 아군 수` 최소화 · `MoveTo`(0x1948E20) = A버퍼(이번 턴 코스트)·B버퍼(목표 거리장) 2장으로 `distB(1<<16) ≫ 지형(1<<12) ≫ costA(1<<5)` 가중 최대화 — **여러 턴 접근이 여기서 자연 발생** · `ActionMoveIdle`(0x194D890)은 ☠**제자리 대기를 행동으로 확정하지 않는다**(항상 None) · `GuardTo`(0x194CF60)는 제자리 방어가 아니라 **체인가드로 아군을 감싸는 행동**(MapMind.Type=Guard 35) · `HealMindTo`(0x19489E0) 진입 게이트는 AskHealB 하나뿐(Hc_Vulnerary는 그 안쪽 — D_fields §1-4 표기 정정) · ★☠**빈 dispos 토큰은 0이 아니라 -1(V_Default)**이다(`AIValue$$SetValue` 0x27B30B4 `mov w8,#0xffff; strh`) — AI_MV_WeakEnemy(moveVal 미지정 5403/5403건)의 factor는 0이 아니라 **200**(이동력 2배 반경) · `GetBoundaryIceTileMove`(0x1942B80) = 얼음 없는 맵에서 목표 칸 4·그 외 0(확정) · **이식 배선** = engine ai/handlers.ts(attackTo·moveAttackRange·moveTo·moveIdle·guardTo·healMindTo) — m002·m003 헤드리스 적턴 자동이 **결손 0**으로 완주(aiChapter.test.ts 4건, ai.test.ts 표적필터·열거순서 10건) · ☠**잔여 결손** = AT_Hero(PersonData.IsHero 미사영)·AT_Job(Job 미사영)·체인가드 자격 유닛의 가드 위치(`GetSidePosition` 0x195FC80 미판독)·회복 지형 경로(`Hc_Terrain` 출처 미판독)·Mind 계열(Treasure·Village·Torch·BreakDown)·지팡이/방해/인게이지/커맨드 스킬 계열 전량 · ★MP4 2라운드 신규 판독 + 이식(2026-08-18, ai_engine_src/I_handlers2.md + J_torch.md): `RD_Heal`(0x1946A00 RodHealTo) = 아군 전수(`EachAllyUnit`) x 회복 지팡이 슬롯 전수(UseType 2 && RodType 2)에서 `CalcHealRodScore` 최댓값 — ☠**식은 `damage + (max(heal,0)<<8) + (제자리<<16)`이고 `damage`는 '부수 대미지'가 아니라 **대상의 부족 HP**다(AI_ENGINE §5-5 이중 오류를 원본 명령 `add w8,w19,w0,lsl #8`로 정정) · 제자리 항은 플레이어 진영에서 식에서 제거 · 대상 자격 = `IsHealRodPermission`(0x19594E0) 5·6단 = 비플레이어는 `AskHealA|AskHealB`, 플레이어는 hp%<75 · 위치는 `GetHealRodPosition`(flag 0) = ☠**이동코스트 > 지형**(공격과 정반대) · `MI_Torch`(0x194CAF0) = ☠**인벤 횃불이 아니라 `MapFor.EachPoke(MapInspector.Kind.Torch=7)` 맵 조사 지점**이고, `IsAttackableEnemy` 참이면 None(때릴 적이 있으면 안 켠다) · 후보 없으면 None ⇒ 조사 지점·시야 미모델링인 FESim에서 **None이 코드상 정답**(근거 없는 대기 강하가 아니다 — m006 21→0, m020 50→5 결손) · `MV_Position`(0x194F5A0) = movePower 100 도달성 검사 후 `MoveTo(pos, MoveFlag.Door)` · ★부수 정정 = dispos CSV는 **괄호 안 쉼표를 구분자로 치지 않는다**(`AIValue$$SetValue` 0x27B2FF4/0x27B3008) — `pos(6,9)`가 쪼개져 MV_Position 90유닛이 결손이던 것을 해소 · **이식 배선** = engine ai/handlers.ts(rodHealTo·mindTorch·movePosition·calcHealRodScore) · ai.test.ts 회복 8건·횃불 2건·좌표 5건 · ☠**잔여 결손** = AC_InterferenceRange(14, 73유닛 — `IsEnemyInsideInterferenceArea` 0x19457C0 미판독) · MV_Escape(96, 49 — 이탈 판정 `IsEscapePosition` 0x195FDF0은 판독됐으나 엔진에 플레이영역 경계·Escape 인스펙터 미사영) · MI_Treasure(61, 39)·MV_Treasure(94, 13) — 상자(Tbox 인스펙터) 미사영 · EG_*(인게이지)·IR_*(방해 지팡이)·CS_*(커맨드 스킬) 계열 · MI_BreakDown(65)/MV_BreakDown(100) · AT_Hero(PersonData.IsHero 미사영)·AT_Job · 서브AI 치환(Code 6/7/4) · ★MP4 2라운드 후반(2026-08-18): `map.interactions` 국면 사영 신설(`BattleMap.interactions` — overlays 관례의 정적 사영, boardStore initGame·헤드리스 하네스 양쪽 배선)로 **이동 목적지 축**을 열었다 — `MV_Escape`(96)·`MI_Treasure`(61)/`MV_Treasure`(94)가 조사 지점을 소비한다. 이탈점에 걸린 인물(`pid`)은 그 유닛 전용이다(S015 반지 소지 적 — 실측 결손 0/76·액션 50) · ☠**실행은 여전히 결손**이다: 상자 개방(내용물 취득·상자 소멸)은 국면에 상자 상태가 없어 미배선이고, 그 결과 도달한 유닛이 제자리에서 고착한다(원기라면 열고 떠났을 것 — **알려진 오재현**) · 이탈 소멸은 `ActionMoveEscape`가 하지 않는다는 것까지만 확정(488명령 전수에 제거 호출 없음) · ☠`IsEscapePosition`의 **PlayArea 테두리 갈래는 미배선**(엔진에 PlayArea 사각형 사영이 없다 — 맵 경계와 다르다) — 조사 지점이 있는 챕터는 s015뿐이라 나머지 46유닛은 이 사유로 정직 결손 · ★`AC_InterferenceRange`(14)/`ExcludePerson`(15) 판독·이식(2026-08-18, ai_engine_src/L_ac_interference.md — 본 갈래 직접 판독): `IsEnemyInsideInterferenceArea`(0x19457C0)가 `UnitAIMoveXY(..., weaponFlag = InterferenceRod|IgnoreSilent)`로 **이동범위를 방해 지팡이 사거리로 확장**해 도색하고, 람다(0x294BAC0)가 `IsAttackPermission` → (15면 인물 제외) → 대상 셀 비트 테스트로 판정한다 ⇒ **「적이 (이동력 factor% 이동범위 + 방해 지팡이 사거리) 안인가」와 동치** · ☠방해 지팡이가 없으면 이미지가 비어 항상 false(별도 게이트 명령 없이 도색 단계에서 결정된다) · 근사 1건 = `InterferenceRod` 플래그의 아이템 선별식이 미판독이라 엔진 `StaffItem.rodType === 3`으로 대체 · 실측 73유닛 해소 · ★2라운드 최종 판독·이식(2026-08-18, ai_engine_src/K_interference_escape.md): (1) **`AT_Hero(3)`는 '보스'가 아니라 '주인공 지정'**이다 — `PersonData$$IsHero`(0x1F2A0B0)가 보는 정적 스킬이 `OnCompletedEnd`(0x248D3F8)에서 **`SID_主人公`**로 채워지고, 전 1523인물 중 `PID_リュール` 1건뿐이다. person.xml `CommonSids`가 이미 사영돼 있어 파이프라인 변경 없이 배선했다(Flag 비트가 아니다) · (2) **`MI_Escape(63)`/`MI_EscapeSlow(64)`**(`ActionMindEscape` 0x194B390) 배선 — 게이트는 대형 유닛뿐, `100 - costA` 최대(☠동점 코인플립 **없음** — 나중 후보가 이긴다), 커밋은 `MapMind.Type = Escape(19)`이고 MoveTo를 부르지 않는다 · (3) ★**`IsEscapePosition`의 테두리 갈래 배선** — `MapImage$$SetSize`(0x1DE2BA0)가 유일한 기입자이고 `PlayAreaX=Z=1 · X2=w-2 · Z2=h-2`를 **상수로** 박는다(호출자는 `MapTerrain$$UpdateMapImage`가 m_Width/m_Height만 넘긴다) ⇒ ☠**플레이 영역은 맵 사각형이 아니라 '맵에서 바깥 1칸 테두리를 뺀 사각형'**이다(종전 가설 반증). 실데이터 대조로 뒷받침 = 전 54챕터 6090유닛 중 6088이 그 안, 예외 2건은 (0,0) 대기 유닛 · ☠**이탈 실행은 여전히 결손**: `ProcEscape.OnDispose`(0x1E3A130)가 `SetStatus(PureHide|EscapeHere)`로 **은닉+표식**할 뿐 사망이 아니고 소지품은 유닛과 함께 사라지는데, 엔진에 은닉 상태가 없어 **도달한 적이 사라지지 않는다**(알려진 오재현). 관측 훅 `EventSequence.Poke(Kind.Escape)`는 **Lua 층**이라 S015의 '반지 소지 적 이탈 = 패배'도 그쪽 몫이다 · ⚠근사 = `MI_EscapeSlow`의 `GetMovePowerSlow` 산식이 미판독이라 `MI_Escape`와 동일 취급 · ☠**잔여 결손**(실측 유닛) = IR_Default(30) 24 · EG_Attack(50) 22 · MI/MV_BreakDown(65/100) 21+21 · MV_Person(90) 15 · CS_Yell(120) 15 · CS_Enchant(115) 12 · AC_HealRange(8) 8 · AT_Job(Job 미사영) · 상자 개방 실행 · ★3라운드(2026-08-18): `AT_Job(7)`/`AT_JobNearestPosition(8)` 배선 — 판정은 `t.m_Job(0x48) == v0.GetJob()`이라 `UnitState.jid` 사영을 신설했다(dispos jid → BoardUnitProp → projectUnit → 엔진, 헤드리스 하네스도 동형). ⚠dispos 실사용 0건이라 커버리지 변동은 없다(완결성 확보) · jid 미사영 유닛은 여전히 정직 결손(undefined) · ★3라운드 판독·이식(2026-08-18, ai_engine_src/M_rod_breakdown.md): (1) ☠**`MI/MV_BreakDown`은 이름과 달리 '구조물 파괴'가 아니다** — 대상은 오직 `MapFor.EachPoke(MapInspector.Kind.BreakdownEnemy = 12)` 좌표뿐이고 구조물 HP·종별·Destroyer는 선택에 전혀 관여하지 않는다. 파이프라인이 이 인스펙터를 `EventEntryBreakdownEnemy` → **`defendArea`**로 사영하고 있고 실측 타일이 `TID_防衛床`이다 ⇒ **적이 방어 지점으로 밀고 들어가는 이동 축**. MI는 실이동력·점유 검사·동점 코인플립 없음, MV는 movePower 100 + BlockFree·점유 검사 없음·동점 코인플립 + `MoveTo(MoveFlag.Break)` · (2) `MV_Person(90)` = `EachUnit`(전 진영)에서 PID 일치 유닛의 **선 칸 자체**로 `MoveTo(flag 0)`, 도색은 `BlockFree`(점유 무시 — 안 그러면 후보가 통째로 사라진다), 동점 코인플립 · (3) `AC_HealRange(8)` = `EachAllyUnit2` + `IsHealRodPermission` **+ 자기 제외**, 도색은 `weaponFlag = HealRod|IgnoreSilent`로 `AC_InterferenceRange`와 **완전 대칭**(같은 `m_RodImage` 버퍼) · ☠**잔여 결손**(실측) = `IR_Default(30)` 24 — 판독은 끝났으나 스코어의 최상위 항 `rank`(방해 아이템 등급 Draw/Stun/Silence/Freeze)의 **실제 UseType 수치가 미판독**이라 배선하면 아이템 선호가 뒤집힐 수 있어 보류 · `EG_Attack(50)` 22(골격만 판독 — 점수·도색·후보 람다 미판독) · `CS_Yell(120)` 15 / `CS_Enchant(115)` 12 — ☠**HP·위치·아이템 밖 상태(응원 버프·인챈트 14종)를 바꾸므로 엔진이 그 상태를 모델링하지 않는 한 정직 결손 확정** · `MV_Force(92)` 6 · `MV_Hero(89)` 5 · `EG_Overlap(58)` 3 · `CS_FullBullet(113)` 2 · ★4라운드(2026-08-18): `IR_*(30~35)` 방해 지팡이 배선 — `rank`는 ☠**이름이 아니라 `ItemData.UseType` 수치**로 판별한다(Draw 27→4 · Stun 29→3 · Silence 11→2 · Freeze 9→1 · 그 외 0, M_rod_breakdown §1-5-A). ☠`コラプス`(Collapse)의 UseType이 `Stun(29)`이라 이름 매핑은 반드시 틀린다 · 조립식 `P + ((100-맨해튼)<<9) + (magicVal<<17) + (rank<<25)` ⇒ **등급 ≫ 대상 마력 ≫ 근접도 ≫ 위력** · 부수 확정 = Silence는 대상 소지품에 `(Kind & ~1) == 6`(마도서 계열)이 없으면 부적합 · Draw는 거리 ≤ 3 부적합 · 게이트 = `m_Think`가 AttackLongRange(4)·AttackHigh(5)면 미실행 · ☠**엔진 경계 명시**: reduce는 `gives`가 빈 `ドロー`(UseType 27)를 정직 거부하므로 후보에서 빼고, 그것뿐이면 결손 · ⚠`IR_Frequency(36)`는 `prohibitRod` 국면 미모델이라 결손 · ★부수 수리 = 헤드리스 하네스가 지팡이 `gives`/`useType`을 사영하지 않아 **모든 방해 지팡이가 ドロー로 보이던 것**을 웹 `staffItemFor`와 같은 계약으로 맞췄다(측정 왜곡 제거 — 24유닛이 실제로는 프리즈·콜랩스·사일런스 소지)"
    },
    {
      "id": "events.engine",
      "label": {
        "en": "Event engine (full Lua runtime)",
        "ko": "이벤트 엔진(풀 Lua 실행)"
      },
      "status": "implemented",
      "evidence": "배선(2026-08-18 MP2, events.test.ts 11건) — 챕터 스크립트 원문(파이프라인 가공: 주석 제거·!= 정규화·유니코드 식별자 맹글링)을 fengari(순 JS Lua 5.3)로 실행 · 콜백 = 코루틴 완주(WaitTime 실 yield) · 연출 API = no-op 테이블(결정 2026-08-18) · 미등록 네이티브 = 정직 오류 · m002·m003 전 경로 미지 호출 0 실측 · setup = 기보 스텝 0(절대 이벤트로 열람 경로 복원 — fengari는 제작 경로 지연 청크만, /s/ 무반입) · 조사 정본 = extracted/lua/LUA_USAGE.md + il2cpp/LUA_BINDINGS.md · ★`UnitSetHp` 배선(2026-08-18, MP4 2라운드 긴급): 종전 '미등록 유지' 결손이었으나 사유였던 '절대 재생 계약 선행'은 **이미 충족돼 있었다**(heal 이벤트가 hpAfter 절대값을 싣고 replay가 그대로 대입). ☠미등록인 채로 두니 **m001 턴3 쌍자이탈이 endPhase를 통째로 거부**했고 화면·콘솔이 전부 침묵해 '적턴 AI 무한루프'로 오진됐다 — 미등록 네이티브 1건이 전혀 다른 층에서 발현한 사례다. 최대치 클램프 + heal 절대 이벤트로 배선하고 결손 목록에서 제거(events.test.ts 2건: 클램프·세션 무반입 재생). ⚠HP 0 대입 시 사망 처리는 근거가 없어 미배선(실사용은 m001·e006 모두 양수) · ★부수: boardStore.dispatch가 거부를 **조용히 삼키던 것**을 개발 콘솔 경고로 노출(같은 오진 재발 방지) · ★`UnitGetMPID` 배선(2026-08-18): 정본 실재(person.xml Name = MPID) — 호스트 mpid 훅으로 사영(SSG가 유닛에 굳힘), m022 부트 결손 해소·m026 오프닝 대사 루프 해소. 부재 = 정직 거부(nil이면 SubPrefix가 침묵 오류) · ★`UnitSetGodUnit(nil)`·`UnitGetGodUnit` 핸들 왕복 배선(2026-08-18): m026 오프닝의 엠블렘 외す→연출→되돌림 브래킷 — nil = 엠블렘 클러스터(engage·engagedSkills·engageWeapons·engageArt) 해제, 핸들 = 스냅숏 복구, 재생 계약 = godUnit patch null = 필드 삭제(replay.ts) · ☠교훈: 네이티브의 정직 거부는 luaL_error로만 — JS throw는 fengari 경계에서 오류 값이 깨져 원인이 nil로 둔갑한다(콜백 오류 표면화 테스트로 박제)"
    },
    {
      "id": "events.triggers",
      "label": {
        "en": "Event triggers (inspectors)",
        "ko": "이벤트 트리거(인스펙터 26종)"
      },
      "status": "assumed",
      "evidence": "EventEntry 26종 등록 전수 배선(인자 규약 = 인스펙터 기반 클래스 5+3종, 와일드카드 -1 = IsValue 0x1DE5690, 조건 3형·조건 문자열 = 1회성 발화 플래그 기계 SetCondition/IsCondition/Completed 그대로) · 발화 배선 = Turn/TurnAfter/TurnEnd(페이즈 훅 — MapSequence 순서 코드 확정)·Die·BattleBefore/Talk/After·Fixed(⚠행동 종료 폴링 근사)·Area(⚠이동 포함 근사) · ☠발화 이월 = Pickup/TargetSelect(선택은 기보 행동이 아님 — 발화하면 리플레이 어휘 밖 변이)·Tbox/Visit/Door/Destroy/Escape/Breakdown류(지형 커맨드 = MP3)·Revive(부활 시스템)·EngageBefore/After·UnitCommand류 — 등록·조건 잠금까지는 동작"
    },
    {
      "id": "events.dispos",
      "label": {
        "en": "Event spawn (Dispos) & initial placement",
        "ko": "이벤트 스폰(Dispos)·초기 배치"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-18, MP3 3-7) — 초기 배치 그룹은 `MapDispos.CreateFirst`(0x29C41B0)가 부르는 것 전부다: `CreatePlayerTeam(\"Player\")` → `CreateDisposTeam`(\"Enemy\" → \"Ally\" → \"Other\", 각각 그룹 조회 0x1EC080이 null이면 건너뜀) → `TryCreateTerrain(\"Terrain\")`. 그 외 **모든 그룹은 Lua `Dispos` 트리거로만** 나온다(등장 턴은 스크립트 소유). DLC 신룡의 장은 `CreateFirstDlcGod`(0x29C5900)이나 **그룹 이름 집합은 동일**하고 차이는 레벨 스케일링뿐. 게임 변수 `禁止_初期配置`가 0이 아니면 초기 배치 전체 생략(현행 스크립트 사용 0건). ☠**종전 규칙 반증** = '스크립트가 Dispos하는 그룹만 제외'라는 정규식 근사는 래퍼 호출(g004.lua:301)·이름 문자열 연결(g006.lua:512 `\"Reinforcement_turn\" .. turn`)을 못 잡아 e006 161·g004 556·g006 656유닛을 개시부터 놓았다. 배선 = boardStore INITIAL_GROUPS(테스트 2건). 난이도 게이트는 units.dispos-difficulty-flag가 소유 · ⚠잔여 편차 = 같은 그룹 재스폰 미재현(원기는 중복 허용 — id·visuals 계약, 현행 스크립트 무발현)"
    },
    {
      "id": "units.dispos-difficulty-flag",
      "label": {
        "en": "Dispos difficulty mask (Flag bits N/H/L)",
        "ko": "dispos 난이도 마스크(Flag N/H/L 비트)"
      },
      "status": "anchored",
      "evidence": "★IL2CPP 코드 확정(2026-08-18, MP3 3-7) — dispos `Flag` 하위 3비트가 배치 게이트다(Normal=1 / Hard=2 / Lunatic=4). 초기 배치 = `CreateDisposTeam` → `ActualDataList..ctor`(0x24C0E30) → `Filter`(0x24C0C90) → `DisposData.CanDispos`(0x1CFB490) → `IsDifficulty`(0x1CFB5B0) · 증원 스폰도 `ActualData.Calc` 경유로 **같은 게이트** · 독립 확증 = `DisposGetUnitX`(0x1ECE360)의 마스크 테이블 @0x4D6BF70 = {1,2,4}. ☠**종전 미배선** = 파이프라인이 flag를 싣고도 사영이 통째로 빠져 루나틱 기준 비자군 1,624유닛이 48챕터에서 유령 배치됐다(m023 28·m026 60·g006 281). 그 위에서 잰 AI 자동화율·기보가 오염된다. 배선 = `BoardUnitProp.flag` → `projectUnit` 게이트(초기 배치·spawnGroup 공용). **자군은 게이트 밖** = `CreatePlayerTeam` 별도 경로이고 실측상 자군 flag 정의행 중 루나틱 비트 결손 0건(원값 0 = 파이프라인 생략 441행이 출격 로스터 행) · ⚠미배선 = CanDispos의 나머지 두 게이트 `IsValid`·레벨범위(`LevelMin ≤ person.Level + AverageLevel - 1 ≤ LevelMax`) — 선행 = LevelMin/LevelMax 파이프라인 사영 + AverageLevel(캠페인층 MP5) · 상위 비트(Warp=8·Forced=4 등 `MapDispos.Flag`)도 미배선"
    },
    {
      "id": "events.variables",
      "label": {
        "en": "Game variables (GameVariable)",
        "ko": "게임 변수(GameVariable)"
      },
      "status": "assumed",
      "evidence": "GameState.variables 사영 — 단일 저장소(GameUserData.m_Variable 코드 확정)·variable 이벤트 절대 재생 · ⚠편차 = VariableSet이 미등록 키를 자동 등록한다(원기는 Set = 기존 갱신 전용·무시 — 그러나 勝利 등 엔진측 사전 등록 키가 실재해 그 층을 대신함) · 키 접두사 수명(S_/G_/무접두사)은 캠페인층(MP5) 소관"
    },
    {
      "id": "events.win-rules",
      "label": {
        "en": "Win/lose rules",
        "ko": "승패 규칙(챕터 고유)"
      },
      "status": "assumed",
      "evidence": "이원화 그대로(il2cpp/_wip_winrule) — (1) 엔진 내장: enemyLessThan(음수 = 전멸 판정 무효화 — GameEndCheck 분기 그대로)·destroyBoss(⚠보스 표지 = 유닛 boss 필드, dispos flag 비트 사영 미판독 = 데이터층 미배선)·limitTurn(⚠부호·판정 시점 가정) (2) 스크립트 직접 = 勝利/敗北 변수 감시(settleOutcome — m002 실측) · MID = 표시 텍스트(사상 없음·UX 과제)"
    },
    {
      "id": "events.ai-rewrite",
      "label": {
        "en": "Event AI rewrite (record only)",
        "ko": "이벤트 AI 재설정(기록만)"
      },
      "status": "deferred",
      "evidence": "AiSetSequence(코퍼스 369회 — 게임플레이 API 최다)·AiSetActive·AiSetRejectPower0Attack·AiClearMoveLimit = 유닛 aiScript에 원문 인자 기록 + ai 이벤트(결정 2026-08-18: 소비 = MP4 AI 실행기) · ⚠AiGetActive 질의는 false 강하(미소비 상태 — MP4에서 실상태로 교체)"
    }
  ]
}
```

## Items, shops, economy

☠**Not generated** — 선행 = items.json의 UseType·Enhance 사영과 chapternotes 상점 확장(MP8 A8 §5 산출 스키마). 파이프라인이 아직 안 싣는다

## Strategy rules

☠**Not generated** — 선행 = C 전략 엔진(packages/engine/src/strategy/). 코드가 없으므로 뽑을 것이 없다 — ☠산문으로 채우면 이중화다
