/**
 * 전투 어휘 — 엔진이 아니라 shared가 소유한다: .eph 기보 스키마가 행동·이벤트를 담으므로
 * 여기 두지 않으면 shared → engine 역방향 의존이 생긴다(의존은 단방향으로 유지).
 * 엔진(packages/engine)은 이 타입들을 재수출하므로 소비자 import 경로는 바뀌지 않는다.
 */
export interface StatBlock {
  hp: number;
  str: number;
  mag: number;
  dex: number;
  spd: number;
  lck: number;
  def: number;
  res: number;
  bld: number;
}

export const STAT_KEYS = ["hp", "str", "mag", "dex", "spd", "lck", "def", "res", "bld"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type Difficulty = "n" | "h" | "l";

/**
 * 타격 종별 = **오더 인덱스의 라벨**이다(手番回数 오더 큐 — CalcNormalBattle 0x246B580의 8슬롯 교대).
 * 공격측 오더 0·1 = attack·followUp · 방어측 오더 0·1 = counter·counterFollowUp ·
 * ☠오더 2 이상(신속·割込み·相性激化가 겹칠 때)은 extra·counterExtra — 이름을 늘리지 않고 여기서 멈춘다.
 * 옛 5이름과의 사상이 오더 0·1에서 그대로라 手番回数 <= 2인 판의 기보는 이름이 안 바뀐다(호환 불변식).
 */
export type StrikeKind =
  | "attack"
  | "counter"
  | "followUp"
  | "counterFollowUp"
  | "extra"
  | "counterExtra"
  | "chain";

/** 전투 계산용 무기 수치 — 원 소유는 engine/formula/combat이었으나 setup 스냅숏이 담게 되며 이사. */
export interface CombatantWeapon {
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid?: number;
  dodge?: number;
  magic?: boolean;
  /** items.json Kind — 조건식 `武器の種類` 어휘의 원천(1 剣 … 9 特殊). 전투 스냅숏은 항상 채운다. */
  kind?: number;
  /**
   * 특효 배율(武器特効) — 평시 1. ☠발동 시 값은 2가 아니라 **3**이다(`SID_邪竜特効`만 2).
   * 정본(BattleDetail.CalcAttack 0x1E744E8~): 공격자 스킬의 `Efficacy` 마스크 ∩ (대상 person|job `Attrs`)
   * ∖ 대상 `EfficacyIgnore`가 비지 않으면, 걸린 스킬들의 `EfficacyValue` **최댓값**(합산 아님).
   * 곱해지는 곳은 `攻撃力計算 = ユニット攻撃力 + 武器攻撃力 * 武器特効` 한 곳뿐 — **무기 위력에만** 곱한다.
   * 판정 배선은 아직 없다(선행 = Attrs·Efficacy 마스크를 유닛 데이터에 싣기) — 지금은 주입값을 그대로 쓴다.
   */
  effective?: number;
}

export interface BattleWeapon extends CombatantWeapon {
  /** items.json Iid — 이벤트(UnitSetItemEquip·UnitPutOffItem)가 아이템을 부르는 주소. 스냅숏 옵셔널. */
  iid?: string;
  rangeMin: number;
  rangeMax: number;
  /** items.json Kind — 상성 판정의 입력. */
  kind: number;
  /** 무기 부여 스킬(EquipSids 행 사영) — 장비 중에만 유효 스킬에 합류(특효 스킬의 원천). */
  sids?: SkillRow[];
  /**
   * 엠블렘(인게이지) 무기 표식 — items.json `Flag`의 Engage 비트(128).
   * 정본 = `ItemData.Flags.Engage = 128`을 `UnitItem.GetFontColor`(0x1F95D70)가 검사해
   * 목록 글자색을 시안으로 가른다. 판정이 아니라 **표시**의 입력이다(부재 = 일반 무기).
   */
  engage?: boolean;
  /**
   * items.json `Enhance.*` — **장비 중 스탯 강화**(무기 35종이 든다: 티르핑 마방+5 등).
   * ☠도핑 아이템 전용이 아니다. 정본 = `UnitEnhanceCalculator.Commit1st`(0x1F74B40)가
   * 0x1F74C44에서 장착 아이템의 `Enhance`(0xB0)를 직접 읽는다.
   * 소비는 `toCombatant` 한 곳 — `UnitState.stats`에 더하면 레벨업 상한 판정이 오염된다.
   */
  enhance?: Partial<StatBlock>;
  name?: string;
}

/** skills.json 행 원형 — setup 스냅숏(장착 스킬 diff)이 행 그대로를 싣는다. */
export interface SkillRow {
  Sid: string;
  Timing?: number;
  /**
   * 부여 스킬의 수명 축(SkillData.Cycle +0xA0) — **0(None)이면 전투 로컬**이다.
   * 정본 AddGiveScene(0x246E0C0)이 0에서만 BattleInfoSide.m_MaskSkill(전투 사본)에 직접 넣고,
   * 0이 아니면 씬에만 적어 뒀다가 CommitSkill(0x2478070)이 전투 후 유닛에 영속화한다.
   */
  Cycle?: number;
  /** 실행 순서 키의 최상위 필드(HitSkill.SortKey = (Order << 18) + (Action << 10) + Index). 음수 있음(SID_切り返し = -10). */
  Order?: number;
  /** 발동 필터 — 이 전투를 건 쪽에서만(1) / 걸린 쪽에서만(2) / 무관(0). */
  Stand?: number;
  /** 발동 필터 — 이번 타격에서 때리는 쪽만(1) / 맞는 쪽만(2) / 무관(0). */
  Action?: number;
  Condition?: string;
  ActNames?: string[];
  ActOperations?: string[];
  ActValues?: string[];
  GiveSids?: string[];
  /**
   * GiveSids를 실행 가능한 행으로 해소한 것 — 정본 `SkillData.GiveSkills`(+0x238)도 이미 해소된 목록이다.
   * ☠엔진에는 스킬 표가 없다(행은 유닛이 들고 다닌다) — 사영이 여기 넣어 주지 않으면 부여층이
   *   SID 문자열만 받고 아무것도 못 붙인다(조용한 실패). 사영 = apps/web/src/lib/fe17.ts slimSkill.
   */
  Gives?: readonly SkillRow[];
  /** 부여 대상 — 0 상대 · 1 자기 · 2 체인 · 3 주변 · 4 댄스. 전투 디스패처는 0·1·2만 처리한다(0x246A520). */
  GiveTarget?: number;
  /** 強さ — 스킬 종별 범용 수치. ☠재이동 거리 아님(그건 Removable — 값 2·3이 우연히 일치했을 뿐). */
  Power?: number;
  /** 再移動力 — 행동 후 재이동 칸수. 정본 = Unit.GetMovePowerImpl(0x1A5B690)의 max(Removable). */
  Removable?: number;
  Target?: number;
  RangeI?: number;
  RangeO?: number;
  /** 특효 대상 마스크(Attrs 비트) — 대상 person|job Attrs와 교집합이 비지 않으면 발동. */
  Efficacy?: number;
  /** 특효 배율 — 걸린 스킬 최댓값(특효 3·邪竜特効 2). */
  EfficacyValue?: number;
  /** 특효 무시 마스크 — 대상 보유 스킬 합집합이 공격자 Efficacy를 지운다(特効無効 127·バリア 32). */
  EfficacyIgnore?: number;
  [key: string]: unknown;
}

/**
 * 지팡이가 거는 상태 스킬 스냅숏 — skills.json 행(BadState·Life)의 전투 소비분.
 * 지속의 정본 = Cycle=3(PhaseAfter) → Life×3 페이즈 에이징(SkillArray.OnBuild 0x248AB64 — il2cpp/SKILL_ENGINE §2-9).
 */
export interface StatusGive {
  sid: string;
  /** skills.json BadState 비트(States enum) — 32 침묵 · 256 이동불가 · 1024 기절. */
  badState: number;
  /** skills.json Life — 0 = 무제한(독 선례 — 해제 수단만이 지운다). */
  life: number;
  name?: string;
}

/** 유닛에 걸린 상태 — age = 페이즈 종료 에이징 카운터(life×3 도달 시 소멸). */
export interface StatusEffect extends StatusGive {
  age: number;
}

/**
 * 지팡이 소지 항목 — items.json Kind=7의 전투 소비분 스냅숏.
 * power는 연성·각인·신기연성 합산 후 값(CalcRodHit 0x2473E10이 이 순서로 합성 — il2cpp/EXP_CHAIN_ENGAGE §7).
 */
export interface StaffItem {
  /** items.json Iid — 이벤트가 아이템을 부르는 주소. 스냅숏 옵셔널. */
  iid?: string;
  power: number;
  rangeMin: number;
  rangeMax: number;
  /** 잔여 사용 횟수(items.json Endurance 출발) — 사용마다 1 감소, 0이면 사용 불가. */
  uses: number;
  /** items.json RodType — 2 회복 · 3 방해(명중식 대상) · 0 기타(워프 등 UseType로 세분). */
  rodType: number;
  /** items.json UseType — 배선 판별자: 5 = 워프. 그 외 RodType 0은 reduce가 정직하게 거부한다. */
  useType?: number;
  /** items.json Hit — 방해 지팡이 명중식의 武器命中 입력. */
  hit?: number;
  /** items.json Distance — 워프 목적지 반경(대상 좌표 중심 맨해튼 — UnitWarp 0x2C1F880 판독). */
  distance?: number;
  /** items.json GiveSids → 상태 스킬 행 사영 — 방해 지팡이 명중 시 대상에 부여. */
  gives?: StatusGive[];
  /** items.json RodExp — 杖経験計算의 杖経験値 입력. */
  rodExp: number;
  name?: string;
}

/**
 * 사용형 아이템(Kind=10, AddTarget != 0) 소지 항목 — 傷薬류의 전투 소비분 스냅숏.
 * ☠목록엔 사용형 전부를 싣는다(미배선 포함) — 필터를 넓힐 때 item 인덱스 계약이 흔들리면 기보가 깨진다.
 */
export interface ConsumableItem {
  /** items.json Iid — 이벤트가 아이템을 부르는 주소. 스냅숏 옵셔널. */
  iid?: string;
  /** items.json AddType — 2 = 범위 회복(배선 범위). 그 외는 reduce가 정직하게 거부한다. */
  addType: number;
  /** items.json AddPower — 회복량 등 효과 수치(고정값 — 능력치 무관). */
  power: number;
  /** items.json AddRange — 자신 중심 효과 반경(맨해튼). */
  range: number;
  /** 잔여 사용 횟수(items.json Endurance 출발) — 사용마다 1 감소. */
  uses: number;
  name?: string;
}

/**
 * 인게이지 게이지 상태 — 정본 = il2cpp/EMBLEM_ENGAGE §3(전부 코드 확정).
 * limit·turnLimit 산출은 데이터층 소관: limit = god.EngageCount - 성장표 Flag4(絆20) - 스킬 Flag bit42,
 * turnLimit = 3 + 성장표 Flag2(絆11, リュール만 20). 초기 count = min(7, limit).
 */
export interface EngageState {
  count: number;
  limit: number;
  /** 인게이지 지속 페이즈 수(자기 페이즈 시작마다 1 소비). */
  turnLimit: number;
  /** 인게이지 경과 턴 — engaging일 때만 의미. */
  turn: number;
  engaging: boolean;
}

/**
 * 인게이지 기술(EngageAttack) 스냅숏 — god.EngageAttack → 스타일 분기 해소 후의 실행물.
 * 산출은 데이터층 소관(基本 경로만 — 連動·暴走 선택은 미배선). 실행 문법은 엔진 engageAttack이 소유.
 */
export interface EngageArt {
  sid: string;
  name?: string;
  /** 기술 행 + SyncSids 1단 전개 — engageAttack 전투에서만 공격측 스킬에 합류한다. */
  skills: SkillRow[];
  /** 타격 슬롯별 강제 무기(EquipIids 사영) — null = 그 타격은 현 장비(IID_無し). 부재 슬롯 = 현 장비. */
  weapons?: (BattleWeapon | null)[];
  /** 기술 행 RangeI/O — 부재 시 엔진이 강제 무기·현 장비 사거리로 강하한다. */
  rangeMin?: number;
  rangeMax?: number;
  /** 技コスト — 발동 시 게이지 차감(전수 9행 三級長 戦技만 0 초과). */
  cost: number;
  /**
   * 기술 행 Rewarp — 0 초과면 **리워프형**(세리카 ワープライナ류): 착지 칸을 지정해 순간이동한 뒤 친다.
   * 판별 = `AIThink.IsEngageRewarp`(0x1954560) = `Rewarp >= 1 && Sid != SID_セリカエンゲージ技_闇_M020`.
   * 착지 후보 = `MapDeployTemplate.UnitRewarp`(0x2C1FE40) — 기술 사거리로 적을 칠 수 있는 칸 전부,
   * 게이트는 지형 `IsNotTarget`만(이동 코스트 무관). 액션의 `x`/`y`가 그 칸이다.
   */
  rewarp?: number;
  /**
   * 기술 행 Target = `SkillData.Targets.Pierce`(4) — **관통형**(시구르드 オーバードライブ 전용, 전수 5행 = 스타일 변종).
   * 정본 = `MapSkill.CalcPierce`(0x1F4EC90): 대상은 **직교 인접**(dx²+dz²==1)이어야 하고, 그 방향으로
   * 한 칸씩 나아가며 (a) 적 유닛이면 타격 후 계속 · (b) 빈 칸이면 `Map.CanEnterTerrain` 통과 시 **착지**하고 종료 ·
   * (c) 아군·플레이영역 밖·통행 불가면 **기술 불성립**. 사거리(RangeI/O 1)는 첫 대상까지의 거리다.
   */
  pierce?: true;
  /** 기술 행 WeaponProhibit — 비트 kind 금지 마스크(가정: (mask >> kind) & 1 = 금지. 마르스 1021 = 검만 허용 정합). */
  weaponProhibit?: number;
}

export type BattleEvent =
  | { type: "strike"; attacker: string; defender: string; kind: StrikeKind; hit: boolean; crit: boolean; damage: number; hpAfter: number }
  | { type: "heal"; unit: string; target: string; amount: number; hpAfter: number }
  /** 자기 페이즈 시작 지형 회복(+)/피해(−) — hpAfter 절대값. ☠사망 불가(하한 1 — ProcTerrainDamage canDie=false). */
  | { type: "terrainHeal"; unit: string; amount: number; hpAfter: number }
  /** 구조물 파괴 타격 — structure = 국면 structures 인덱스, hpAfter = 잔여(0 = 소멸·통행 개방·지붕 걷힘). */
  | { type: "destroy"; unit: string; structure: number; tid: string; hpAfter: number }
  /** 방해 지팡이 명중 → 상태 부여 — 절대 재생이 이 행을 그대로 대상에 싣는다(age 0). */
  | { type: "status"; unit: string; target: string; sid: string; badState: number; life: number; name?: string }
  /** 방해 지팡이 빗나감 — 상태 무부여(사용 횟수·행동 소모는 액션 복원이 소유). */
  | { type: "staffMiss"; unit: string; target: string }
  /** 워프 — 대상 좌표 절대값(절대 재생이 그대로 적용). */
  | { type: "warp"; unit: string; target: string; x: number; y: number }
  /** 재행동 부여(춤) — 대상의 행동·이동 창이 새로 열린다. */
  | { type: "refresh"; unit: string }
  /** 체인가드 지정 — unit이 스탠스에 들어간다(해제는 자기 페이즈 복귀가 소유 — 이벤트 없음). */
  | { type: "guard"; unit: string }
  /** 체인가드 치환 — unit(가드)이 target 대신 damage를 받았다. hpAfter = 가드 잔여(절대 재생용). */
  | { type: "guardBlock"; unit: string; target: string; damage: number; hpAfter: number }
  /** 인게이지 게이지 변화 — count = 변화 후 절대값(절대 재생이 이 값을 그대로 쓴다). */
  | { type: "charge"; unit: string; count: number }
  | { type: "engage"; unit: string }
  | { type: "disengage"; unit: string }
  /** 紋章氣 소비 — count = 대입 후 절대값(= limit), (x, y) 타일은 1회성 소멸(절대 재생이 그대로 적용). */
  | { type: "crest"; unit: string; x: number; y: number; count: number }
  | { type: "break"; unit: string }
  | { type: "breakRelease"; unit: string }
  | { type: "death"; unit: string }
  /** 이벤트 스폰(Dispos) — 유닛 전체 스냅숏을 실어 절대 재생이 세션 없이 복원한다. */
  | { type: "spawn"; unit: Record<string, unknown> }
  /** 이벤트 제거(UnitDelete) — 사망과 구별되는 퇴장(판정상은 동일하게 비존재). */
  | { type: "despawn"; unit: string }
  /** 세력 전환(UnitTransfer·UnitJoin) — force = 전환 후 절대값. */
  | { type: "transfer"; unit: string; force: number }
  /**
   * 장비 전환(UnitSetItemEquip) — index = effectiveWeapons(weapons ++ 인게이지 중 engageWeapons) 인덱스로
   * attack.weapon과 **같은 공간**이다(기보 계약 재사용). index 부재 = 장비 해제.
   */
  | { type: "equip"; unit: string; index?: number }
  /** HP 스톡 대입(UnitSetHpStock) — stock = 대입 후 절대값(0 = 스톡 소진). 부활 거동은 미배선. */
  | { type: "hpStock"; unit: string; stock: number }
  /** 아이템 지급(ItemGain) — 채널 + 스냅숏 전문(putOff의 역). 표를 안 든 열람 경로가 이 행만으로 복원한다. */
  | { type: "gain"; unit: string; kind: "weapon" | "staff" | "consumable"; item: Record<string, unknown> }
  /** 소지품 회수(UnitPutOffItem) — 제거 직전 목록의 절대 인덱스. 장비 중이던 무기면 해제까지. */
  | { type: "putOff"; unit: string; kind: "weapon" | "staff" | "consumable"; index: number }
  /**
   * 런타임 지형 교체(TerrainSet·TerrainSetOne) — 좌표 1칸의 **절대 스냅숏**(셀·코스트·표시까지).
   * 데이터 표를 안 든 열람 경로가 이 행만으로 효과·렌더를 복원한다. 같은 칸 재교체는 덮어쓴다.
   */
  | { type: "terrainSet"; x: number; y: number; tid: string; cell: Record<string, unknown>; cost?: Record<string, number>; display?: { color?: string; name?: string } }
  /** 이벤트 좌표 이동(UnitSetPos) — 절대 좌표. */
  | { type: "setPos"; unit: string; x: number; y: number }
  /** 게임 변수(GameVariable) 변경 — 발화 플래그 잠금 포함, value = 변경 후 절대값. */
  | { type: "variable"; key: string; value: number | string }
  /** 승패 규칙 파라미터 변경(WinRuleSet*) — 절대값 병합. */
  | { type: "winRule"; enemyLessThan?: number; destroyBoss?: boolean; limitTurn?: number }
  /** 유닛 스킬 부여/해제(PrivateSkill) — row 실림 = 부여(절대 재생용), 없음 = 해제. */
  | { type: "privateSkill"; unit: string; sid: string; row?: Record<string, unknown> }
  /** 엠블렘 유닛화(UnitSetGodUnit) — patch = 데이터층이 산출한 유닛 필드 패치(절대 재생용). */
  | { type: "godUnit"; unit: string; gid: string; patch?: Record<string, unknown> }
  /** AI 재설정(AiSetSequence류) — 기록만(소비 = MP4 AI 실행기). params = 원문 인자. */
  | { type: "ai"; unit: string; params: (string | number | boolean)[] }
  /** 紋章氣 타일 생성(MapOverlapSetOne) — crest(소비)와 대칭. */
  | { type: "crestAdd"; x: number; y: number }
  /** 민가 방문 완료 — 그 민가는 닫힌다(재방문 불가). 절대 재생이 이 행으로 소진 상태를 복원한다. */
  | { type: "visited"; x: number; y: number }
  /** 유닛 파라미터 초기화(UnitResetParam) — HP 절대값 복원 + 상태·브레이크 해제(⚠범위는 가정). */
  | { type: "reset"; unit: string; hpAfter: number }
  /**
   * 유닛 플래그 변경(UnitSetStatus·UnitClearStatus) — flags = 변경 후 **절대값**.
   * ☠상태이상(badState)이 아니라 UNIT_STATUS_* 비트다(FIXED 1·MOVE_NOT_ALLOW 2·NEVER_SORTIE 8·
   * DONT_POS_CHANGE 16·DEFECT 0x40000000 — common.lua 96~104). 소비 = MP4(이동 금지·출격 로스터).
   */
  | { type: "unitFlags"; unit: string; flags: number }
  | { type: "exp"; unit: string; amount: number; total: number }
  /**
   * 레벨업 — level·gains는 절대값. `exp`는 레벨업 직후의 잔여 경험치 절대값으로,
   * 최대 레벨 도달 시 0 강제(AddExp 0x1A39D40)를 재생이 복원하는 통로다.
   * 부재 = 구기보 — 재생은 종전대로 100을 차감한다.
   */
  | {
      type: "levelUp";
      unit: string;
      level: number;
      gains: Partial<StatBlock>;
      exp?: number;
      /** 고정 성장 누적기 스냅숏(절대값) — GrowMode.Fixed에서만 실린다. 부재 = Random 모드·구기보. */
      acc?: Partial<StatBlock>;
    }
  | { type: "phase"; phase: number; turn: number }
  | { type: "outcome"; outcome: "victory" | "defeat" };

export type BattleAction =
  /**
   * 챕터 이벤트 초기화(Startup·MapOpening·1턴 개시 발화) — 스크립트 있는 챕터의 기보 첫 스텝.
   * 이벤트 리듀서가 소유(전투 리듀서에선 무변화) — 스폰·변수 절대 이벤트가 실려 열람 경로가 복원한다.
   */
  | { type: "setup" }
  | { type: "move"; unit: string; x: number; y: number }
  /** weapon = 유닛 weapons 목록 인덱스 — 지정 시 그 무기로 장비 전환 후 판정(부재 = 현 장비). 기보 재현 계약의 일부. */
  | { type: "attack"; unit: string; target: string; weapon?: number }
  /**
   * staff = 유닛 staves 목록 인덱스(부재 = 0). 회복·워프 대상 = 같은 군, 방해 대상 = 적군.
   * x·y = 워프 목적지(워프 지팡이만) — 대상 좌표 중심 Distance 반경 안이어야 한다.
   */
  | { type: "staff"; unit: string; target: string; staff?: number; x?: number; y?: number }
  /** item = 유닛 consumables 목록 인덱스(부재 = 0). 대상 지정 없음 — 효과 범위는 아이템이 소유(자신 중심). */
  | { type: "item"; unit: string; item?: number }
  /** 춤(재행동 부여) — 대상 = 행동 완료한 인접 아군. 시전 자격 = SID_踊り 계열 보유(엔진 canDance). */
  | { type: "dance"; unit: string; target: string }
  /** 체인가드 지정 — 행동을 소모하고 스탠스 진입. 자격 = 엔진 canChainGuard(만HP·기공 스타일). */
  | { type: "guard"; unit: string }
  /** 인게이지 발동 — 만충 필요, 행동 소모 없음(발동 후 이동·공격 가능). ☠교환 후에는 불가(실기 판별). */
  | { type: "engage"; unit: string }
  /** 인게이지 기술(공격기) — engaging 중에만. 기술 스냅숏(engageArt)이 흐름·무기·비용을 소유한다. */
  /**
   * 인게이지 기술 — `x`/`y`는 **리워프형(세리카 ワープライナ류)의 착지 칸**이다.
   * 통상 기술은 좌표를 싣지 않는다(기존 기보 계약 불변). 착지 규칙 = `MapDeployTemplate.UnitRewarp`.
   */
  | { type: "engageAttack"; unit: string; target: string; x?: number; y?: number }
  /**
   * 교환 — 인접 아군과 소지품 1점 이동(행동 무소모라 연속 액션 = 인게임 다중 이동).
   * kind·index = 주는 쪽 목록 채널·인덱스, back = 상대 → 자신 방향. 이동 창 소진 + 인게이지 발동 봉쇄.
   */
  | { type: "trade"; unit: string; target: string; kind: "weapon" | "staff" | "consumable"; index: number; back?: boolean }
  /** 파괴 — 인접 구조물(x·y가 덮인 칸)에 공격력 결정 차감. ☠난수 무소비(명중·필살·반격 없음 — MP3_READINGS §3). */
  | { type: "destroy"; unit: string; x: number; y: number }
  /**
   * 민가 방문 — 그 칸에 선 유닛이 `EventEntryVisit` 좌표에서 방문을 확정한다(행동 소모).
   * ☠보상 지급은 **스크립트가 소유**한다(ItemGain 등) — 엔진은 발화 접점만 만든다.
   */
  | { type: "visit"; unit: string }
  | { type: "wait"; unit: string }
  | { type: "endPhase" };

/**
 * AI 결정 근거 — "왜 저 적이 나를 안 쳤나"에 답하는 최소 집합(F2 §6-2: 누가·무슨 규칙으로·
 * 후보 중 왜 이것·왜 저것은 아닌지). ☠소비는 표시층이 한다 — 엔진은 값을 내주기만 한다.
 * shared가 소유하는 이유는 `BattleAction`과 같다: 표시층이 엔진 내부 타입을 import하지 않게 한다.
 */
export interface AiTargetCandidate {
  target: string;
  /** 표적 선택 키(§5-1 uint32 비트필드) — 레이아웃이 다르면 값끼리 비교해도 뜻이 없다. */
  battle: number;
  kill: number;
  dead: number;
  expectation: number;
  /** 이 표적을 칠 때 서는 칸. */
  x: number;
  y: number;
}

/** 후보가 조용히 사라진 자리 — 어느 게이트가 걸렀는가. */
export type AiRejectGate =
  /** 표적 필터(AT_*)에 안 맞음. */
  | "targetFilter"
  /** 도달 가능한 공격 발판이 없음. */
  | "noPosition"
  /** `RejectPower0Attack` — 대미지도 명중도 0. */
  | "power0"
  /** AttackHigh(5) 회전의 격파확률 0.3 미만 기각. */
  | "lowKill";

export interface AiRejection {
  target: string;
  gate: AiRejectGate;
}

export interface AiReasoning {
  /** 결정이 나온 페이즈 스텝 이름(`AIOrder` 13단). */
  step: string;
  /** 그 스텝의 `AIThink.m_Think`. */
  think: number;
  /** 쓰인 `AI_BattleRate` 레이아웃(0 突撃 · 1 攻撃 · 2 慎重). */
  battleRate: number;
  /** dispos 값이 아니라 `IsClever()` 강제로 慎重이 된 것인가. */
  battleRateForced: boolean;
  /** 채택한 표적(공격이 아니면 부재). */
  chosen?: string;
  /** 후보 상위 N(battle 내림차순). ☠전량이 아니다 — 유닛이 많은 판에서 폭발한다. */
  candidates: AiTargetCandidate[];
  rejected: AiRejection[];
}
