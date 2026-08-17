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

export type StrikeKind = "attack" | "counter" | "followUp" | "counterFollowUp" | "chain";

/** 전투 계산용 무기 수치 — 원 소유는 engine/formula/combat이었으나 setup 스냅숏이 담게 되며 이사. */
export interface CombatantWeapon {
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid?: number;
  dodge?: number;
  magic?: boolean;
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
  rangeMin: number;
  rangeMax: number;
  /** items.json Kind — 상성 판정의 입력. */
  kind: number;
  /** 무기 부여 스킬(EquipSids 행 사영) — 장비 중에만 유효 스킬에 합류(특효 스킬의 원천). */
  sids?: SkillRow[];
  name?: string;
}

/** skills.json 행 원형 — setup 스냅숏(장착 스킬 diff)이 행 그대로를 싣는다. */
export interface SkillRow {
  Sid: string;
  Timing?: number;
  /** 발동 필터 — 이 전투를 건 쪽에서만(1) / 걸린 쪽에서만(2) / 무관(0). */
  Stand?: number;
  /** 발동 필터 — 이번 타격에서 때리는 쪽만(1) / 맞는 쪽만(2) / 무관(0). */
  Action?: number;
  Condition?: string;
  ActNames?: string[];
  ActOperations?: string[];
  ActValues?: string[];
  GiveSids?: string[];
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
  /** 기술 행 Rewarp — 0 초과면 리워프형(세리카). 엔진이 미배선 정직 거부하는 판별자. */
  rewarp?: number;
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
  /** 유닛 파라미터 초기화(UnitResetParam) — HP 절대값 복원 + 상태·브레이크 해제(⚠범위는 가정). */
  | { type: "reset"; unit: string; hpAfter: number }
  /**
   * 유닛 플래그 변경(UnitSetStatus·UnitClearStatus) — flags = 변경 후 **절대값**.
   * ☠상태이상(badState)이 아니라 UNIT_STATUS_* 비트다(FIXED 1·MOVE_NOT_ALLOW 2·NEVER_SORTIE 8·
   * DONT_POS_CHANGE 16·DEFECT 0x40000000 — common.lua 96~104). 소비 = MP4(이동 금지·출격 로스터).
   */
  | { type: "unitFlags"; unit: string; flags: number }
  | { type: "exp"; unit: string; amount: number; total: number }
  | { type: "levelUp"; unit: string; level: number; gains: Partial<StatBlock> }
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
  | { type: "engageAttack"; unit: string; target: string }
  /**
   * 교환 — 인접 아군과 소지품 1점 이동(행동 무소모라 연속 액션 = 인게임 다중 이동).
   * kind·index = 주는 쪽 목록 채널·인덱스, back = 상대 → 자신 방향. 이동 창 소진 + 인게이지 발동 봉쇄.
   */
  | { type: "trade"; unit: string; target: string; kind: "weapon" | "staff" | "consumable"; index: number; back?: boolean }
  /** 파괴 — 인접 구조물(x·y가 덮인 칸)에 공격력 결정 차감. ☠난수 무소비(명중·필살·반격 없음 — MP3_READINGS §3). */
  | { type: "destroy"; unit: string; x: number; y: number }
  | { type: "wait"; unit: string }
  | { type: "endPhase" };
