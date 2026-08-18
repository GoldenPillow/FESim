import type {
  BattleAction,
  BattleEvent,
  BattleWeapon,
  ConsumableItem,
  Difficulty,
  EngageArt,
  EngageState,
  StaffItem,
  StatusEffect,
  StrikeKind,
  SupportEffect,
  SupportLevel,
} from "@fesim/shared";
import type { AiSnapshot } from "./ai/types.js";
import type { Calculator } from "./formula/calculator.js";
import { combatEnv, forecastSide, type Combatant } from "./formula/combat.js";
import type { FormulaEnv } from "./formula/evaluate.js";
import { isHit, isProbability100 } from "./formula/probability.js";
import { movementRange, type MoveType } from "./range.js";
import { makeSkillModifier, type SkillRow } from "./skills.js";
import { STAT_KEYS, type StatBlock } from "./stats.js";

/**
 * 전투 해결·턴 진행 — 계약: (국면, 행동, 난수소스) → 국면. 순수·불변.
 * 난수 소비 순서(리플레이 재현 계약): 타격마다 명중 롤 → 명중 시에만 필살 롤,
 * 레벨업 시 STAT_KEYS 순서로 스탯당 1롤. 이 순서가 바뀌면 기록 재생이 깨진다.
 * 타격 순서 = 체인어택 → 본공격 → 반격 → 공격측 추격 → 방어측 추격 (체인이 먼저인 것은 코드 확정, il2cpp/SEQUENCE_BREAK).
 */
export interface RandomSource {
  /**
   * `[0, bound)` 정수 — 게임의 `Random.GetValue(bound)`에 대응한다.
   * 판정마다 해상도가 다르다(명중 10000 · 일반 확률 100000 · 성장 100)는 것이 인게임 사실이라
   * 상한을 호출부가 넘긴다. 기보에는 굴린 값이 그대로 박히므로 이 상한 규약이 곧 리플레이 계약이다.
   */
  next(bound: number): number;
}

export type { BattleWeapon } from "@fesim/shared";

export interface UnitState {
  id: string;
  name?: string;
  /** dispos Pid 원문 — 이벤트 스크립트가 유닛을 부르는 주소(동일 pid 복수 유닛 가능 — 환영병). */
  pid?: string;
  /** dispos Jid 원문 — 직업 지정 AI(`AT_Job`)의 판별 주소. 부재 = 미사영(판정 시 정직 결손). */
  jid?: string;
  /** 보스 표지(WinRuleDestroyBoss 판정 대상) — ⚠dispos flag 비트 의미 미판독, 사영은 데이터층 가정. */
  boss?: boolean;
  /** 이벤트의 AI 재설정 기록(AiSetSequence류 원문 인자 누적) — 소비 = MP4 AI 실행기. */
  aiScript?: (string | number | boolean)[][];
  /** UNIT_STATUS_* 비트(common.lua 96~104) — 이벤트가 세우고 지운다. 소비 = MP4(이동 금지·출격 로스터). */
  flags?: number;
  /**
   * HP 스톡(dispos HpStockCount +0xB0) — 다단 보스의 남은 부활 횟수.
   * ☠**사영·이벤트만**이다: 부활 거동(HP 0 → 스톡 소모 부활)은 미배선 — 소비 경로는 확정됐으나
   * (TryAddDeadScene 0x2472D20 → CanRevive 0x1A4F860 → Revive 0x1A4F8B0) 부활 후 HP·상태가 미판독이다.
   * 장부 combat.hp-stock. 0이면 필드 자체를 두지 않는다.
   */
  hpStock?: number;
  force: number;
  x: number;
  y: number;
  hp: number;
  /** stats.hp = 최대 HP. */
  stats: StatBlock;
  weapon?: BattleWeapon;
  /** 소지 공격 무기 목록 — attack.weapon 인덱스의 해석 대상. 부재 = 장비 무기 고정. */
  weapons?: BattleWeapon[];
  /** 소지 지팡이 목록 — staff.staff 인덱스의 해석 대상. 잔여 사용 횟수는 국면 상태다(사용마다 감소). */
  staves?: StaffItem[];
  /** 사용형 아이템 목록 — item.item 인덱스의 해석 대상. 잔여 횟수는 국면 상태다. */
  consumables?: ConsumableItem[];
  /** 장착 엠블렘(GID) — 보드 배지 표시와 godUnit 이벤트 교체의 주소. 게이지 수치는 engage가 소유. */
  gid?: string;
  /** 인게이지 게이지 — 엠블렘 장착 유닛만. limit·turnLimit 산출은 데이터층(스냅숏) 소관. */
  engage?: EngageState;
  skills?: SkillRow[];
  /**
   * 인게이지 중 스킬 세트(EngagedSkills 교체본 — 싱크로 ∪ 인게이지 스킬, EngageSid 치환 완료본).
   * engaging일 때 skills 대신 이 목록이 유효(GetSyncroSkills 0x2342530). 산출은 데이터층 소관.
   */
  engagedSkills?: SkillRow[];
  /** 엠블렘 무기(EngageItems) — engaging일 때 weapons 뒤에 증설. 인덱스 계약 = weapons.length + n. */
  engageWeapons?: BattleWeapon[];
  /** 인게이지 기술 스냅숏(스타일 분기 해소 후) — engageAttack 액션의 실행물. 산출은 데이터층 소관. */
  engageArt?: EngageArt;
  /** 레벨업 확률 성장률(%) — 없으면 레벨업 시 스탯 상승 없음. */
  growth?: StatBlock;
  /** 스탯 상한(job.Limit + person.Limit). 지정 시 성장이 여기서 막힌다 — 미지정이면 무제한. */
  cap?: StatBlock;
  /**
   * 고정 성장 누적기(m_GrowCapability) — 레벨업마다 성장률을 더해 100을 넘을 때마다 +1.
   * ☠미지정 = `growth`(person.Grow)가 초기값이다(Unit.CreateImpl1 0x1A08944) — 0이 아니다.
   * 재생·챕터 인계가 이 값을 복원해야 다음 레벨업이 맞는다.
   */
  growthAcc?: Partial<StatBlock>;
  level: number;
  /**
   * 최대 레벨(job.MaxLevel) — 도달 시 경험치 가산 정지(AddExp 0x1A39D40).
   * 미지정 = 정지 없음(사영 결손 시 종전 거동 유지).
   */
  maxLevel?: number;
  internalLevel?: number;
  exp: number;
  movePoints: number;
  moveType: MoveType;
  /** 직업 StyleName 원문 — 連携スタイル = 체인어택, 重装スタイル = 브레이크 면역. */
  style?: string;
  /** person.xml SupportCategory 원문(デフォルト·バランス·命中·必殺·回避·必殺回避) — 支援効果 표의 행 키. */
  supportCategory?: string;
  /**
   * 파트너 유닛 id → 현재 支援レベル. 랭크 진행은 덤프에 없다(진행 소유) — 여기가 주입 통로다.
   * 없으면 지원 보정 없음(무회귀).
   */
  supports?: Record<string, SupportLevel>;
  /**
   * dispos AI 사영 + 이 유닛이 쓰는 ai.xml 루틴 스냅숏 — 소비 = `aiNextAction`(적턴 AI 층).
   * reduce는 읽지 않는다(AI는 액션을 만들 뿐 룰이 아니다).
   */
  ai?: AiSnapshot;
  acted: boolean;
  dead: boolean;
  broken: boolean;
  /**
   * 이 창(행동 전/후 각각)에서 이미 이동했는가 — 부재 = false.
   * 행동(공격·대기)이 false로 리셋해 재이동(시구르드) 창을 열고, 페이즈 복귀 시에도 리셋.
   */
  moved?: boolean;
  /** 이 활성화에서 교환·수송대를 썼는가 — 인게이지 발동만 봉쇄(실기 판별 2026-08-18). 페이즈 복귀 시 리셋. */
  traded?: boolean;
  /**
   * 체인가드 스탠스(Unit.Status.ChainGuard 64) — 인접 아군이 받을 타격을 대신 받는다.
   * 수명 = 자기 군 페이즈 복귀까지(춤 재행동 시 지속은 가정 — 실측 대조 대상, 장부 actions.guard).
   */
  guarding?: boolean;
  /**
   * 걸린 상태이상(BadState 스킬) — 인게임 실체는 스킬 배열(m_PrivateSkill)이지만 엔진은
   * 소비 비트만 사영한다. 지속 = 페이즈 종료마다 age+1, life×3 도달 시 소멸(life 0 = 무제한).
   */
  statuses?: StatusEffect[];
  /**
   * 직업 Attrs bit3(Fly) — 지형 회복·피해 전면 면제 판정(JobData.IsFly 0x2055D30, MP3_READINGS §2).
   * ☠moveType으로 갈음 금지 — 용(邪竜류, MoveType 4)은 Fly 비트가 없어 면제 대상이 아니다.
   */
  flying?: boolean;
  /** 특효 피격 판정 마스크 — person.Attrs | job.Attrs(대상 측 소비 — combatEnv efficacyOf). */
  attrs?: number;
}

/** 엔진이 소비하는 BadState 비트(SkillData.States) — 침묵 32 · 이동불가 256 · 기절 1024. */
export const BAD_STATE = { silence: 32, freeze: 256, stun: 1024 } as const;

/** 상태 비트 보유 판정 — bit는 마스크 합성 가능(freeze | stun). UI·reduce 공용(중복 구현 금지). */
export function hasBadState(u: UnitState, bit: number): boolean {
  return u.statuses?.some((s) => (s.badState & bit) !== 0) === true;
}

/**
 * 유효 스킬 세트 — 인게이지 중엔 EngagedSkills 교체본(GetSyncroSkills 0x2342530 코드 확정).
 * ☠u.skills 직접 소비 금지 — 판정·예보·UI 전부 이 함수를 거쳐야 교체가 새지 않는다.
 */
export function effectiveSkills(u: UnitState): SkillRow[] | undefined {
  const base = u.engage?.engaging === true ? (u.engagedSkills ?? u.skills) : u.skills;
  // 무기 부여 스킬(EquipSids) — 장비 중에만 합류(특효·무기 스킬의 원천, 무장 해제 시 소멸).
  const granted = u.weapon?.sids;
  if (granted === undefined || granted.length === 0) return base;
  return [...(base ?? []), ...granted];
}

/**
 * 유효 무기 목록 — 인게이지 중엔 엠블렘 무기(EngageItems)를 weapons 뒤에 증설.
 * attack.weapon 인덱스의 해석 대상(기존 인덱스 불변 = 기보 계약 유지). UI 무기 목록도 이것만 소비한다.
 */
export function effectiveWeapons(u: UnitState): BattleWeapon[] | undefined {
  if (u.engage?.engaging === true && u.engageWeapons !== undefined && u.engageWeapons.length > 0) {
    return [...(u.weapons ?? []), ...u.engageWeapons];
  }
  return u.weapons;
}

/**
 * 장비 후보 목록 — weapons ++ engageWeapons(인게이지 여부 무관).
 * ☠effectiveWeapons(전투용)와 다르다: 장비 전환은 인게이지 **전에도** 일어난다(m014·m020의 MapOpening이
 * 비인게이지 보스에게 엠블렘 무기를 물린다 — 실측). equip 이벤트의 인덱스 공간이 이것이라 인게이지
 * 상태가 바뀌어도 기록 인덱스가 흔들리지 않는다.
 */
export function equipCandidates(u: UnitState): BattleWeapon[] {
  return [...(u.weapons ?? []), ...(u.engageWeapons ?? [])];
}

/**
 * 재이동(시구르드 싱크로) 이동 칸수 — 행동 후에만 유효, 없으면 undefined.
 * 거리 정본 = skills.json Removable(再移動力) — Unit.GetMovePowerImpl(0x1A5B690)이 보유 스킬을
 * 순회해 max(Removable)를 취한다(SID 접두 매칭 아님). ☠Power(強さ)는 별개 필드 — 값 2·3이 우연히
 * 일치해 오독됐던 자리(MOVE_TERRAIN.md FIX-4). 재이동은 이동력 대체일 뿐 경로 규칙(지형 코스트) 동일.
 */
export function canterPower(u: UnitState): number | undefined {
  let best: number | undefined;
  for (const s of effectiveSkills(u) ?? []) {
    if (typeof s.Removable === "number" && s.Removable > 0 && (best === undefined || s.Removable > best)) {
      best = s.Removable;
    }
  }
  return best;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 이동력 스냅숏(베이스 단계) = Clamp(base, 0, Clamp(jobLimit+personLimit, 0, 255)).
 * ★Enhance(EnhanceValue.Move)는 이 클램프 '뒤'에 movePower가 가산한다 — Limit 초과 가능
 * (GetMovePowerImpl 0x1A5B690 순서). 파이프라인/웹의 movePoints 산출이 이 함수를 소비한다.
 */
export function moveBase(base: number, jobLimit: number, personLimit: number): number {
  return clamp(base, 0, clamp(jobLimit + personLimit, 0, 255));
}

/**
 * 유효 이동력 = Clamp(movePoints + Σ EnhanceValue.Move(유효 스킬), 0, 99).
 * 인게이지 부여 스킬(迅走 등 19종)이 effectiveSkills 경유로 실시간 반영된다.
 * NotMove/Freeze 0 처리는 moveBudget이 소유(상태 게이트 단일 지점).
 */
export function movePower(u: UnitState): number {
  let enhance = 0;
  for (const s of effectiveSkills(u) ?? []) {
    const v = s["EnhanceValue.Move"];
    if (typeof v === "number") enhance += v;
  }
  return clamp(clamp(u.movePoints + enhance, 0, 255), 0, 99);
}

/**
 * 이 창에서 남은 이동 예산 — 행동 전 = 이동력(이동 후 0 = 제자리 행동만) ·
 * 행동 후 = 재이동 Power 1회 · 불가 = undefined. ☠UI 중복 구현 금지 — reduce와 UI가 이 함수만 소비한다
 * (중복이 2026-08-16 베타 이동 결함의 원인 — design/verification.md C4).
 */
export function moveBudget(u: UnitState): number | undefined {
  // 이동불가(フリーズ)·기절(コラプス) 상태는 이동 예산 0 — 재이동도 막힌다(SID_移動不可 명칭 그대로).
  if (hasBadState(u, BAD_STATE.freeze | BAD_STATE.stun)) return u.acted ? undefined : 0;
  if (!u.acted) return u.moved === true ? 0 : movePower(u);
  if (u.moved === true) return undefined;
  return canterPower(u);
}

/**
 * 지형 셀 소비 스키마 — terrain.json 행의 전투·이동 소비분(0/false는 생략 가능).
 * 비대칭 항(Player·Enemy 계열)은 우군(2+)에 가산되지 않는다(CalcDefense/CalcAvoid 0x1E746C0/0x1E74900).
 */
export interface TerrainCell {
  /** 지형 TID(terrain.xml Tid) — 이벤트 질의(TerrainGet) 정본. 부재 = 미배선(질의 시 정직 오류). */
  tid?: string;
  /** 코스트 종별(terrain.xml CostName, 예 COST_空 = 비행 전용) — TerrainGetMoveCost 사영. */
  costName?: string;
  avoid: number;
  def: number;
  playerAvoid?: number;
  playerDef?: number;
  enemyAvoid?: number;
  enemyDef?: number;
  /** 자기 페이즈 시작 회복(+)/피해(−) — terrain.json Heal. 비행 면제(FIX-10). */
  heal?: number;
  /** 출발 칸 이동력 보정 — terrain.json MoveFirst(流砂 −3·氷床 +2). 비행·용 면제. */
  moveFirst?: number;
  /** 워프 착지 금지 — terrain.json Flag bit17(NotTarget bit16과 별개). */
  notWarp?: boolean;
}

/**
 * 1칸 지속 오버레이(m_Overlaps 사영) — 밑의 베이스 지형에 **가산**된다(대체 아님, FIX-2).
 * moveCost/flyCost = terrain.json MoveCost/FlyCost(이동 코스트 가산분 — 오버레이 자체 地形コスト는 미사용).
 */
export interface OverlaySpot {
  x: number;
  y: number;
  /** 오버레이 TID — 이벤트 질의(MapOverlapGet)가 문자열 비교로 소비한다. */
  tid?: string;
  cell: TerrainCell;
  moveCost?: number;
  flyCost?: number;
}

/**
 * 구조물 상태(m_Layers 사영) — 살아있으면(hp>0) 자기 TID 코스트가 베이스를 치환한다(통행 특례 없음, §2-13).
 * roof(TID_屋根)는 렌더 전용 — 통행·전투에 관여하지 않고 같은 group의 문 개방 시 걷힌다.
 */
export interface StructureState {
  x: number;
  y: number;
  w: number;
  h: number;
  tid: string;
  group: number;
  /** Hp_{난이도} 초기값 — 0 이하 = 파괴됨(통행 개방). 파괴 불가 구조물은 큰 값 유지. */
  hp: number;
  roof?: boolean;
  /** 구조물 TID의 이동 코스트(치환용) — 부재 시 베이스 코스트 유지. */
  costs?: Partial<Record<MoveType, number>>;
  /** terrain.json Destroyer — 0 양군 · 1 자군만 · 2 적군만(BreakdownMenuItem GetForce 판독). */
  destroyer?: number;
  name?: string;
}

/**
 * 런타임 지형 교체 1칸(TerrainSet·TerrainSetOne 사영) — 베이스 격자를 **변이하지 않고** 덮는다.
 * 격자를 그대로 두는 이유: 패치 리스트는 직렬화·절대 재생(terrainSet 이벤트)에 그대로 실린다.
 * 우선순위 = 살아있는 비지붕 구조물 > 패치 > 베이스(구조물은 m_Layers 별도 층 — §2-13).
 */
export interface TerrainPatch {
  x: number;
  y: number;
  tid: string;
  cell: TerrainCell;
  /** 이동타입별 진입 코스트(terrain.json 地形コスト) — 부재 = 베이스 코스트 유지. */
  cost?: Partial<Record<MoveType, number>>;
  /** 렌더 표시(색·이름) — 데이터층이 굳혀 넘긴다(엔진은 소비하지 않는다). */
  display?: { color?: string; name?: string };
}

/** 해당 칸의 지형 패치 — 나중 것이 이긴다(같은 칸 재교체는 덮어쓴다). */
export function terrainPatchAt(
  patches: readonly TerrainPatch[] | undefined,
  x: number,
  y: number,
): TerrainPatch | undefined {
  return patches?.find((p) => p.x === x && p.y === y);
}

/**
 * 맵 조사 지점 1건(`MapInspector` 사영, 정적 — overlays 관례).
 * ☠**AI 전용 입력이 아니다** — 원기에서 상자·이탈점·민가는 전부 같은 `MapInspector.Kind` 열거다
 * (Tbox=5 · Door=6 · Torch=7 · Visit=8 · Escape=9). AI의 `MI_Treasure`·`MV_Escape`가 이것을 소비한다.
 * ⚠**표시·목적지 축만** — 상자 개방·이탈 소멸 같은 **실행**은 이 층이 아니다(장부 ai.action-handlers).
 */
export interface MapInteraction {
  kind: "chest" | "visit" | "door" | "escape" | "defendArea" | "destroy";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  /** 상자 내용물(chest) — 개방 실행이 미배선이라 현재는 소비처가 없다. */
  iid?: string;
  /** 이탈점에 걸린 대상 인물(escape) — S015의 반지 소지 적처럼 특정 유닛 전용 이탈점이 있다. */
  pid?: string;
}

export interface BattleMap {
  width: number;
  height: number;
  costs: Partial<Record<MoveType, number[][]>>;
  terrain?: TerrainCell[][];
  /** 조사 지점(상자·이탈점 등) — 정적 사영. AI 이동 목적지의 입력. */
  interactions?: MapInteraction[];
  /** 지속 오버레이 초기 상태(정적) — 런타임 MapOverlapSet 생성은 이월(장부 turn.map-gimmicks). */
  overlays?: OverlaySpot[];
  /**
   * 진영 동맹표 — force 인덱스 → 진영 번호(MapSituation.IsAllide 0x1F48EC0 사영).
   * 기본 [0,1,0]: 자군(0)↔우군(2) 같은 진영 = 상호 통과 가능, 적(1)은 양쪽과 차단.
   */
  alliance?: number[];
}

/** 해당 칸의 오버레이 — 데이터상 칸당 최대 1(OverlapTerrain 슬롯 단수). */
export function overlayAt(map: BattleMap, x: number, y: number): OverlaySpot | undefined {
  return map.overlays?.find((o) => o.x === x && o.y === y);
}

/** 해당 칸을 덮는 살아있는 비지붕 구조물 — 통행·파괴 판정용(지붕은 렌더 전용이라 제외). */
export function structureAt(
  structures: readonly StructureState[] | undefined,
  x: number,
  y: number,
): StructureState | undefined {
  return structures?.find(
    (s) => !s.roof && s.hp > 0 && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h,
  );
}

/**
 * 파괴 가능 인접 대상 열거 — (x, y)에 선 force 유닛이 부술 수 있는 구조물의 인접 칸.
 * UI 버튼과 reduce 합법성이 이것 하나를 소비한다(☠중복 구현 금지 — C4).
 * Destroyer 필터 = 0 양군 · 1 자군만 · 2 적군만 · 지붕·파괴 불가(hp 0)는 대상 아님.
 */
export function destroyTargets(
  structures: readonly StructureState[] | undefined,
  x: number,
  y: number,
  force: number,
): { x: number; y: number; structure: number }[] {
  const out: { x: number; y: number; structure: number }[] = [];
  (structures ?? []).forEach((s, i) => {
    if (s.roof === true || s.hp <= 0) return;
    if (s.destroyer === 1 && force !== 0) return;
    if (s.destroyer === 2 && force !== 1) return;
    const gapX = Math.max(s.x - x, 0, x - (s.x + s.w - 1));
    const gapY = Math.max(s.y - y, 0, y - (s.y + s.h - 1));
    if (gapX + gapY !== 1) return;
    out.push({
      x: Math.min(Math.max(x, s.x), s.x + s.w - 1),
      y: Math.min(Math.max(y, s.y), s.y + s.h - 1),
      structure: i,
    });
  });
  return out;
}

/**
 * 합성 이동 코스트 — (구조물 TID 코스트 ?? 베이스) + 오버레이 가산(비행·용 = FlyCost·그 외 = MoveCost),
 * 255 클램프. reduce·UI가 이 함수만 소비한다(☠중복 구현 금지). MOVE_TERRAIN.md FIX-7·§2-13.
 */
export function makeCostAt(
  map: BattleMap,
  structures: readonly StructureState[] | undefined,
  moveType: MoveType,
  patches?: readonly TerrainPatch[],
): (x: number, y: number) => number {
  const grid = map.costs[moveType];
  const flying = moveType === "fly" || moveType === "dragon";
  return (x, y) => {
    const s = structureAt(structures, x, y);
    const base = s?.costs?.[moveType] ?? terrainPatchAt(patches, x, y)?.cost?.[moveType] ?? grid?.[y]?.[x] ?? 255;
    const o = overlayAt(map, x, y);
    const add = o === undefined ? 0 : (flying ? o.flyCost ?? 0 : o.moveCost ?? 0);
    return Math.min(base + add, 255);
  };
}

/**
 * 지형 전투 보정 — 진영 비대칭 합산의 단일 정본(예보·전투·지팡이 명중이 전부 이것만 소비).
 * force 0 → +Player항 · 1 → +Enemy항 · 2 이상 → 무가산 (CalcDefense/CalcAvoid 동형).
 */
export function terrainBonusAt(
  map: BattleMap,
  x: number,
  y: number,
  force: number,
  patches?: readonly TerrainPatch[],
): { avoid: number; def: number } {
  let avoid = 0;
  let def = 0;
  // 2층 순회(베이스 + 오버레이) — CalcDefense가 Terrain(0x40)·OverlapTerrain(0x48) 슬롯을 각각 더한다(FIX-2).
  // 베이스 자리는 런타임 교체가 있으면 패치 셀이 대신한다(교체 = 지형 자체가 바뀐 것).
  for (const t of [terrainPatchAt(patches, x, y)?.cell ?? map.terrain?.[y]?.[x], overlayAt(map, x, y)?.cell]) {
    if (t === undefined) continue;
    const side = force === 0
      ? { avoid: t.playerAvoid ?? 0, def: t.playerDef ?? 0 }
      : force === 1
        ? { avoid: t.enemyAvoid ?? 0, def: t.enemyDef ?? 0 }
        : { avoid: 0, def: 0 };
    avoid += t.avoid + side.avoid;
    def += t.def + side.def;
  }
  return { avoid, def };
}

/**
 * 출발 칸 MoveFirst를 반영한 실이동 예산 — reduce·UI 공용(☠중복 구현 금지).
 * 정본 = GetMovePowerImpl 경로: 예산 ≥ 1일 때만 clamp(예산 + moveFirst, 0, 100), 비행·용 면제.
 * 재이동도 동일 루틴이라 자동 적용된다(MOVE_TERRAIN.md FIX-6).
 */
export function moveBudgetOn(
  map: BattleMap,
  u: UnitState,
  patches?: readonly TerrainPatch[],
): number | undefined {
  const budget = moveBudget(u);
  if (budget === undefined || budget < 1) return budget;
  if (u.moveType === "fly" || u.moveType === "dragon") return budget;
  const first =
    ((terrainPatchAt(patches, u.x, u.y)?.cell ?? map.terrain?.[u.y]?.[u.x])?.moveFirst ?? 0) +
    (overlayAt(map, u.x, u.y)?.cell.moveFirst ?? 0);
  return clamp(budget + first, 0, 100);
}

const DEFAULT_ALLIANCE = [0, 1, 0] as const;

/** force → 진영 번호. 표에 없는 force는 자기 자신(독립 진영)으로 본다. */
export function allianceOf(map: BattleMap, force: number): number {
  return map.alliance?.[force] ?? DEFAULT_ALLIANCE[force] ?? force;
}

/**
 * 이동 통과·정지 술어 — reduce와 UI(BoardIsland)가 공용하는 단일 정본(☠중복 구현 금지 — C4 표류 방지).
 * blocked = 비동맹 유닛 칸(진입 불가) · occupied = 동맹 유닛 칸(통과 가능·정지 불가).
 */
export function movePredicates(
  map: BattleMap,
  units: readonly UnitState[],
  u: UnitState,
): { blocked: (x: number, y: number) => boolean; occupied: (x: number, y: number) => boolean } {
  const mine = allianceOf(map, u.force);
  const byTile = new Map<number, UnitState>();
  for (const v of units) if (!v.dead) byTile.set(v.y * map.width + v.x, v);
  return {
    blocked: (x, y) => {
      const o = byTile.get(y * map.width + x);
      return o !== undefined && allianceOf(map, o.force) !== mine;
    },
    occupied: (x, y) => {
      const o = byTile.get(y * map.width + x);
      return o !== undefined && o.id !== u.id && allianceOf(map, o.force) === mine;
    },
  };
}

export type { BattleAction, BattleEvent, Difficulty, StrikeKind } from "@fesim/shared";

/**
 * 승패 규칙 파라미터 — Lua WinRuleSet*의 사영(MapSituation 필드, il2cpp/_wip_winrule).
 * 미지정 = 기본값: 적 전멸 승리(enemyLessThan 0 상당) · 자군 전멸 패배.
 */
export interface WinRule {
  /** 적 잔존 수 <= N 승리. **음수 = 판정 무효화**(m002가 -1로 전멸 승리를 끈다). */
  enemyLessThan?: number;
  /** 보스(unit.boss) 전멸 승리 스위치. */
  destroyBoss?: boolean;
  /** ⚠가정: 양수 = N턴 완료 생존 승리 · 음수 = |N|턴 내 미클리어 패배(판정 시점 = 턴 랩). */
  limitTurn?: number;
}

export interface GameState {
  turn: number;
  /** 현재 페이즈의 군 (0 자군 · 1 적군 · 2 우군). */
  phase: number;
  difficulty?: Difficulty;
  /**
   * 성장 모드(GrowMode) — 인게임도 메인 메뉴에서 고른다(Random=0 · Fixed=1).
   * 부재 = "fixed"(서비스 기본, 사용자 지시). ☠난수 소비가 모드마다 다르므로 기보 계약의 일부다.
   */
  growMode?: "random" | "fixed";
  map: BattleMap;
  units: UnitState[];
  /** 게임 변수(GameVariable 사영) — 이벤트 발화 플래그·勝利/敗北 포함. 쓰기는 이벤트 레이어만. */
  variables?: Record<string, number | string>;
  /** 승패 규칙 파라미터(WinRuleSet* 사영) — reduce의 승패 판정이 소비한다. */
  winRule?: WinRule;
  /** 남은 紋章氣 타일 — 소비 시 제거(1회성 소멸, MapOverlap.Remove). 부재 = 타일 없음. */
  crests?: { x: number; y: number }[];
  /** 구조물 상태(m_Layers 사영) — hp = Hp_{난이도} 초기값, 파괴 = hp 0(통행 개방·지붕 걷힘). */
  structures?: StructureState[];
  /** 런타임 지형 교체(TerrainSet·TerrainSetOne) — 베이스 격자를 덮는 패치 리스트. */
  terrainPatches?: TerrainPatch[];
  outcome?: "victory" | "defeat";
  /** 직전 행동의 이벤트(휘발) — 리플레이 정본은 행동 로그다. */
  events: BattleEvent[];
}

export type Advantage = 1 | 0 | -1;

/** 상성 정본: 검(1)>도끼(3)>창(2)>검 · 체술(8)>활(4)/단검(5)/마도서(6), 역방향 없음. */
const BEATS: Record<number, number[]> = { 1: [3], 3: [2], 2: [1], 8: [4, 5, 6] };

export function weaponAdvantage(aKind: number, bKind: number): Advantage {
  if (BEATS[aKind]?.includes(bKind)) return 1;
  if (BEATS[bKind]?.includes(aKind)) return -1;
  return 0;
}

const DIFFICULTY_SYMBOL: Record<Difficulty, string> = { n: "ノーマル", h: "ハード", l: "ルナティック" };

/**
 * 브레이크 면역 SID. 相性 한정판 외에 汎用 SID_ブレイク無効(41 인물 LunaticSids)과
 * 그 부여 효과 SID_ブレイク無効_効果(熟練者·ヘクトルエンゲージ技가 SyncSids로 부여)가 별개로 실재한다.
 */
const BREAK_IMMUNE_SIDS = new Set([
  "SID_相性ブレイク無効",
  "SID_ブレイク無効",
  "SID_ブレイク無効_効果",
  "SID_EN_技の薬_効果_ブレイク無効",
]);

const manhattan = (a: UnitState, b: UnitState) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * 브레이크 가능 판정(명중·대미지 조건 제외) — 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 * 코드 확정 조건: 상성 유리 + 대상 무장 + 미브레이크, 중장 스타일·브레이크무효 SID 면역.
 */
export function canBreak(from: UnitState, to: UnitState): boolean {
  if (from.weapon === undefined || to.weapon === undefined || to.broken) return false;
  if (weaponAdvantage(from.weapon.kind, to.weapon.kind) !== 1) return false;
  if (to.style === "重装スタイル") return false;
  return effectiveSkills(to)?.some((s) => BREAK_IMMUNE_SIDS.has(s.Sid)) !== true;
}

const inWeaponRange = (u: UnitState, distance: number): boolean =>
  u.weapon !== undefined && distance >= u.weapon.rangeMin && distance <= u.weapon.rangeMax;

/**
 * 체인어택 참가자 — 공격측 군의 연계 스타일 유닛 중 대상이 자기 무기 사거리 안인 유닛.
 * reduce와 AI 평가(`UnitUtil$$CanChainAttack` 대응)가 이것 하나를 공유한다(☠중복 구현 금지).
 */
export function chainAttackers(
  attacker: UnitState,
  defender: UnitState,
  units: readonly UnitState[],
): UnitState[] {
  return units.filter(
    (u) =>
      !u.dead &&
      u.force === attacker.force &&
      u.id !== attacker.id &&
      u.style === "連携スタイル" &&
      inWeaponRange(u, manhattan(u, defender)),
  );
}

/** 한 레벨에 이만큼도 못 올리면 다시 굴린다 — Unit.GrowAbortCount. */
const GROW_ABORT = 2;
/** 재굴림 포함 최대 시도 수 — Unit.LevelUpRetryMax. */
const GROW_ATTEMPTS = 4;

/**
 * 레벨업 성장 롤 — 정본 = App.Unit.LevelUp(RVA 0x1A3A040) GrowMode.Random 경로.
 *
 * 게임은 "획득 스탯이 abort 미만이면 최대 4시도까지 다시 굴리고 최선 시도를 채택"한다.
 * 난수는 시도 사이에 이어지므로(같은 Random 인스턴스) 소비 개수가 결과에 따라 달라진다 —
 * 기보 재생이 이 소비 순서에 걸려 있으니 시도 구조를 그대로 옮긴다.
 * 증가 1회마다 상한을 다시 확인하는 것도 원본 그대로다(확정 가산분도 캡을 못 뚫는다).
 */
function rollGrowth(unit: UnitState, rng: RandomSource): Partial<StatBlock> {
  let best: Partial<StatBlock> = {};
  let bestCount = 0;
  for (let attempt = 0; attempt < GROW_ATTEMPTS; attempt++) {
    const gains: Partial<StatBlock> = {};
    let count = 0;
    for (const key of STAT_KEYS) {
      // 성장률 상한은 255다 — 100 절사가 아니다(person.Grow 실측 최대 105).
      let grow = Math.min(Math.max(unit.growth?.[key] ?? 0, 0), 255);
      if (grow === 0) continue;
      const cap = unit.cap?.[key];
      const room = (): boolean => cap === undefined || unit.stats[key] + (gains[key] ?? 0) < cap;
      const grant = (): void => {
        if (!room()) return;
        gains[key] = (gains[key] ?? 0) + 1;
        count += 1;
      };
      while (grow > 99) {
        grow -= 100;
        grant();
      }
      // 잔여가 0이면 게임도 난수를 보지 않는다(IsProbability100이 percent<=0에서 즉시 false).
      if (grow > 0 && isProbability100(grow, rng.next(100000))) grant();
    }
    if (count > bestCount) {
      best = gains;
      bestCount = count;
    }
    if (bestCount >= GROW_ABORT) break;
  }
  return best;
}

/**
 * 고정 성장(GrowMode.Fixed) — 정본 = App.Unit.LevelUp(RVA 0x1A3A040) Fixed 분기.
 *
 * 난수를 쓰지 않는다. 스탯별 누적기에 성장률을 더하고 100을 넘을 때마다 +1을 준다.
 * ☠Random 분기와 다른 두 가지: (1) 누적기 초기값이 person.Grow다(0이 아니다),
 * (2) 상한 게이트가 루프 진입 전 1회라 캡에 닿은 스탯은 **누적조차 하지 않는다**.
 */
function fixedGrowth(unit: UnitState): { gains: Partial<StatBlock>; acc: Partial<StatBlock> } {
  const gains: Partial<StatBlock> = {};
  const acc: Partial<StatBlock> = { ...(unit.growthAcc ?? unit.growth ?? {}) };
  for (const key of STAT_KEYS) {
    const grow = Math.min(Math.max(unit.growth?.[key] ?? 0, 0), 255);
    if (grow === 0) continue;
    const cap = unit.cap?.[key];
    if (cap !== undefined && unit.stats[key] >= cap) continue;
    let carry = Math.min((acc[key] ?? 0) + grow, 255);
    while (carry > 99) {
      carry -= 100;
      gains[key] = (gains[key] ?? 0) + 1;
    }
    acc[key] = carry;
  }
  return { gains, acc };
}

/**
 * 지팡이 회복량 = 위력 + floor(마력/2), 잃은 HP 상한 — CalcRodHit 0x2473E10 판독(il2cpp/EXP_CHAIN_ENGAGE §7).
 * 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 */
export function staffHealAmount(healer: UnitState, target: UnitState, staff: StaffItem): number {
  const missing = Math.max(target.stats.hp - target.hp, 0);
  return Math.min(staff.power + Math.floor(healer.stats.mag / 2), missing);
}

/**
 * 방해 지팡이 명중률 — 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 * 정본: HitParam.Calculate(0x19B7850)가 InterferenceRod 상태에서 妨害杖命中値計算으로,
 * AvoidParam.Calculate(0x19B73C0)가 상대측 게이트로 妨害杖回避値計算으로 식을 교체하고,
 * 명중률 자체는 통상 命中率計算 경로 = 각각 0..999 클램프 후 차, 0..100 클램프·절삭
 * (CalcRodAttack 0x24731E0 디스어셈블 — 지팡이 전용 명중률 식은 실재하지 않는다).
 * 支援命中·支援回避 항은 원문 식에 없다. 스킬 보정 레지스터는 미배선(가정 — 발현 시 흡수).
 */
export function staffHitRate(
  calc: Calculator,
  caster: UnitState,
  target: UnitState,
  staff: StaffItem,
  map: BattleMap,
  patches?: readonly TerrainPatch[],
): number {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const casterEnv = combatEnv({
    stats: { ...caster.stats, maxHp: caster.stats.hp, hp: caster.hp },
    weapon: { might: 0, hit: staff.hit ?? 0, crit: 0, weight: 0 },
  });
  const targetEnv = combatEnv({
    stats: { ...target.stats, maxHp: target.stats.hp, hp: target.hp },
    terrain: terrainBonusAt(map, target.x, target.y, target.force, patches),
  });
  const hit = clamp(calc.eval("妨害杖命中値計算", casterEnv) as number, 0, 999);
  const avoid = clamp(calc.eval("妨害杖回避値計算", targetEnv) as number, 0, 999);
  return Math.trunc(clamp(hit - avoid, 0, 100));
}

/**
 * 워프 목적지 열거 — UI 오버레이와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 * 정본 = MapDeployTemplate.UnitWarp(0x2C1F880) 디스어셈블: 중심 = **워프되는 대상의 현재 좌표**,
 * 반경 = ItemData.Distance(마력 의존 아님), 맨해튼, 유효 = Unit.CanWarp(비통행·점유·NotWarp 타일 제외).
 * ☠스킬 RangeAdd 확장은 미배선(장부 movement.warp).
 */
export function warpDestinations(
  target: UnitState,
  staff: StaffItem,
  map: BattleMap,
  units: readonly UnitState[],
  structures?: readonly StructureState[],
  patches?: readonly TerrainPatch[],
): { x: number; y: number }[] {
  const radius = staff.distance ?? 0;
  const out: { x: number; y: number }[] = [];
  if (map.costs[target.moveType] === undefined) return out;
  const costAt = makeCostAt(map, structures, target.moveType, patches);
  for (let y = Math.max(target.y - radius, 0); y <= Math.min(target.y + radius, map.height - 1); y++) {
    for (let x = Math.max(target.x - radius, 0); x <= Math.min(target.x + radius, map.width - 1); x++) {
      if (Math.abs(x - target.x) + Math.abs(y - target.y) > radius) continue;
      if (costAt(x, y) >= 255) continue;
      if ((terrainPatchAt(patches, x, y)?.cell ?? map.terrain?.[y]?.[x])?.notWarp === true
        || overlayAt(map, x, y)?.cell.notWarp === true) continue;
      if (units.some((u) => !u.dead && u.id !== target.id && u.x === x && u.y === y)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/** 춤(재행동) 시전 자격 — 무희 직업 스킬 SID_踊り/SID_特別な踊り(MAP_COMMANDS §1-4). UI 공용. */
export function canDance(u: UnitState): boolean {
  return effectiveSkills(u)?.some((s) => s.Sid === "SID_踊り" || s.Sid === "SID_特別な踊り") === true;
}

/** 체인가드 자격 스킬 — 원천 = 気功スタイル(styles.json이 SID_チェインガード許可 부여). 스킬 직접 보유도 인정. */
export function hasChainGuardSkill(u: UnitState): boolean {
  return u.style === "気功スタイル" || effectiveSkills(u)?.some((s) => s.Sid === "SID_チェインガード許可") === true;
}

/**
 * 체인가드 지정 가능 — GetGuardType(0x1A34F50) 디스어셈블 확정: 스킬 게이트 + **만HP && HP 2 이상**
 * (미달 = GuardType.NotEnoughHP). 차단 상태 비트 0x4D0 중 엔진 사영분은 기절뿐이다. UI 버튼과 reduce 공용.
 */
export function canChainGuard(u: UnitState): boolean {
  if (!hasChainGuardSkill(u) || hasBadState(u, BAD_STATE.stun)) return false;
  return u.hp === u.stats.hp && u.hp >= 2;
}

/**
 * 이 유닛을 지키는 체인가드 — 스탠스 중·같은 군·생존(BattleInfo.CanChainGuard 0x1E7ACA0 게이트).
 * ⚠인접 1 = 공식 도움말 원문("隣接する味方") 앵커 — 열거 코드(CalcChain)는 미판독. 복수 가드 시
 * 선두 선택은 유닛 목록 순 가정. 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 */
export function chainGuardFor(target: UnitState, units: readonly UnitState[]): UnitState | undefined {
  return units.find(
    (g) => !g.dead && g.guarding === true && g.id !== target.id && g.force === target.force && manhattan(g, target) === 1,
  );
}

/**
 * 아이템 범위 회복 대상 — 자신 포함, 같은 군, 반경(맨해튼) 내, 손상 유닛만.
 * 傷薬 = "자신과 주위 2칸 아군 회복"(공식 도움말 원문). 예보 UI와 reduce가 같은 판정을 쓴다(중복 구현 금지).
 */
export function itemTargets(
  user: UnitState,
  units: readonly UnitState[],
  item: ConsumableItem,
): UnitState[] {
  return units.filter(
    (u) => !u.dead && u.force === user.force && manhattan(u, user) <= item.range && u.hp < u.stats.hp,
  );
}

/** supports.json effects — [SupportCategory][支援レベル]. 수치의 정본은 이 표뿐이다(엔진 박제 금지). */
export type SupportEffects = Record<string, Record<string, SupportEffect>>;

/**
 * 인접 아군 지원(絆) 보정 — 表 = reliance.xml 支援効果(archetype × Level 1~4 = C/B/A/A+).
 * 아래 넷은 전부 실행파일 코드로 확정됐다(il2cpp/SUPPORT.md) — 더는 가정이 아니다:
 *  - 거리 = 맨해튼 1. SupportCalculator.Range=1 + MapFor.EachRange(near=1,far=1)의 |dx|+|dz| 게이트라 대각은 미발동.
 *  - archetype = 파트너의 SupportCategory. TryGetSupportData가 파트너 쪽만 인덱싱한다(수혜자 아님).
 *  - 복수 파트너 = 단순 합산, 상한 없음(MaxShowUnits=4는 UI 표시 슬롯일 뿐 보정과 무관).
 *  - 파트너 자격 = 엄격 동일 세력. ☠동맹(우군)까지 넓히는 것은 반증된 변경이다.
 */
function supportOf(
  u: UnitState,
  units: readonly UnitState[],
  effects: SupportEffects | undefined,
): Combatant["support"] {
  if (effects === undefined || u.supports === undefined) return undefined;
  const total = { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  let found = false;
  for (const partner of units) {
    // id 비교 — 예보는 잠정 위치의 사본을 넘기므로 참조 동일성을 믿을 수 없다.
    if (partner.id === u.id || partner.dead || partner.force !== u.force) continue;
    const level = u.supports[partner.id];
    if (level === undefined || manhattan(u, partner) !== 1) continue;
    const row = effects[partner.supportCategory ?? ""]?.[String(level)];
    if (row === undefined) continue;
    total.hit += row.Hit;
    total.avoid += row.Avoid;
    total.crit += row.Critical;
    total.dodge += row.Secure;
    found = true;
  }
  return found ? total : undefined;
}

/** 유닛 스냅숏 → 전투 계산 입력. 예보 UI와 reduce가 같은 사상을 써야 한다(중복 구현 금지). */
export function toCombatant(
  u: UnitState,
  map: BattleMap,
  units: readonly UnitState[] = [],
  supportEffects?: SupportEffects,
  patches?: readonly TerrainPatch[],
): Combatant {
  return {
    stats: { ...u.stats, maxHp: u.stats.hp, hp: u.hp },
    weapon: u.weapon,
    terrain: terrainBonusAt(map, u.x, u.y, u.force, patches),
    skills: effectiveSkills(u),
    support: supportOf(u, units, supportEffects),
    ...(u.attrs !== undefined ? { attrs: u.attrs } : {}),
  };
}

export function createReducer(calc: Calculator, supportEffects?: SupportEffects) {
  function expEnv(
    self: UnitState,
    foe: UnitState,
    chainCount: number,
    difficulty: Difficulty,
    extra?: Record<string, number>,
  ): FormulaEnv {
    const varsOf = (u: UnitState): Record<string, number | string> => ({
      レベル: u.level,
      内部レベル: u.internalLevel ?? 0,
      与戦闘経験累積数: 0,
      MaxHP: u.stats.hp,
      難易度: DIFFICULTY_SYMBOL[difficulty],
      闘技場中: 0,
      クリア済み: 0,
      チェインアタック回数: chainCount,
    });
    const selfVars = { ...varsOf(self), ...extra };
    const foeVars = varsOf(foe);
    const foeEnv: FormulaEnv = { lookup: (n) => foeVars[n] };
    return { lookup: (n) => selfVars[n], opponent: () => foeEnv };
  }

  /**
   * 인게이지 충전 — 전투 1회 참가당 +1(상한 클램프). 코드 확정(AddEngageCount 0x2470740):
   * 인게이지 중·체인 참가는 충전 없음, 턴당 자연 증가는 기전 자체가 없다. 사망자는 무의미라 생략.
   * ☠NotEngageAdd 지형(8192) 게이트는 미배선 — BattleMap.terrain 스키마 확장 선행(§0 미룸과 동건).
   */
  function chargeEngage(u: UnitState, events: BattleEvent[]): void {
    const g = u.engage;
    if (g === undefined || g.engaging || u.dead || g.count >= g.limit) return;
    u.engage = { ...g, count: Math.min(g.count + 1, g.limit) };
    events.push({ type: "charge", unit: u.id, count: u.engage.count });
  }

  /** 경험치 가산 + 100 단위 레벨업(성장 롤 소비) — 전투·지팡이가 같은 경로를 쓴다(중복 구현 금지). */
  function grantExp(
    u: UnitState,
    gained: number,
    events: BattleEvent[],
    rng: RandomSource,
    growMode: "random" | "fixed",
  ): void {
    if (gained <= 0) return;
    // 최대 레벨은 AddExp(0x1A39D40) 첫 줄에서 통째로 return한다 — 경험치도 이벤트도 없다.
    if (u.maxLevel !== undefined && u.level >= u.maxLevel) return;
    u.exp += gained;
    events.push({ type: "exp", unit: u.id, amount: gained, total: u.exp });
    while (u.exp >= 100) {
      u.exp -= 100;
      u.level += 1;
      let gains: Partial<StatBlock>;
      if (growMode === "fixed") {
        const fixed = fixedGrowth(u);
        gains = fixed.gains;
        u.growthAcc = fixed.acc;
      } else {
        gains = rollGrowth(u, rng);
      }
      const stats = { ...u.stats };
      for (const key of STAT_KEYS) {
        const gain = gains[key];
        if (gain !== undefined) stats[key] += gain;
      }
      u.stats = stats;
      if (gains.hp !== undefined) u.hp += gains.hp; // 최대 HP 상승분은 현재 HP에도
      // 최대 레벨 도달 시 잔여 경험치는 0 강제(AddExp 셋째 줄) — 다음 레벨로 이월하지 않는다.
      if (u.maxLevel !== undefined && u.level >= u.maxLevel) u.exp = 0;
      events.push({
        type: "levelUp", unit: u.id, level: u.level, gains, exp: u.exp,
        ...(u.growthAcc !== undefined ? { acc: u.growthAcc } : {}),
      });
      if (u.maxLevel !== undefined && u.level >= u.maxLevel) break;
    }
  }

  return function reduce(state: GameState, action: BattleAction, rng: RandomSource): GameState {
    const growMode = state.growMode ?? "fixed";
    const events: BattleEvent[] = [];
    const units = state.units.map((u) => ({ ...u }));
    const byId = new Map(units.map((u) => [u.id, u]));
    const require = (id: string): UnitState => {
      const u = byId.get(id);
      if (u === undefined || u.dead) throw new Error(`유닛 없음/사망: ${id}`);
      return u;
    };
    const assertActable = (u: UnitState): void => {
      if (u.force !== state.phase) throw new Error(`페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다`);
      if (hasBadState(u, BAD_STATE.stun)) throw new Error(`기절 상태: ${u.id}는 행동할 수 없다`);
      if (u.acted) throw new Error(`행동 완료 유닛: ${u.id}`);
    };
    let crests = state.crests;
    let structures: StructureState[] | undefined;
    /**
     * 紋章氣 소비 — MapSequenceMind.EngageHeal(0x2681CC0) 코드 확정: 비인게이지·비만충일 때
     * count = limit **대입** + 타일 1회성 소멸(MapOverlap.Remove). '회복량' 수치는 존재하지 않는다.
     * 발동 시점 = 그 칸에서 활성화 종료(대기 포함) — 가정(실측 대조 대상, 장부 emblem.crest-tile).
     */
    const consumeCrest = (u: UnitState): void => {
      const g = u.engage;
      if (crests === undefined || g === undefined || g.engaging || u.dead || g.count >= g.limit) return;
      if (!crests.some((c) => c.x === u.x && c.y === u.y)) return;
      crests = crests.filter((c) => !(c.x === u.x && c.y === u.y));
      u.engage = { ...g, count: g.limit };
      events.push({ type: "crest", unit: u.id, x: u.x, y: u.y, count: g.limit });
    };

    switch (action.type) {
      case "move": {
        const u = require(action.unit);
        if (u.force !== state.phase) throw new Error(`페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다`);
        if (u.moved === true) throw new Error(`재이동 불가: ${u.id}는 이 창에서 이미 이동했다`);
        const budget = moveBudgetOn(state.map, u, state.terrainPatches);
        if (budget === undefined) throw new Error(`행동 완료 유닛: ${u.id}`);
        if (state.map.costs[u.moveType] === undefined) throw new Error(`이동타입 코스트 없음: ${u.moveType}`);
        const reachable = movementRange({
          width: state.map.width,
          height: state.map.height,
          movePoints: budget,
          start: { x: u.x, y: u.y },
          costAt: makeCostAt(state.map, state.structures, u.moveType, state.terrainPatches),
          ...movePredicates(state.map, units, u),
        });
        if (!reachable.some((t) => t.x === action.x && t.y === action.y)) {
          throw new Error(`불법 이동: (${action.x}, ${action.y})는 이동 범위 밖`);
        }
        u.x = action.x;
        u.y = action.y;
        u.moved = true;
        break;
      }

      case "destroy": {
        // ★파괴 = 전투가 아니라 결정론적 공격력 차감(MP3_READINGS §3 — CalcDestroy 판독):
        // 명중 롤·필살·반격·난수 소비 전무. 대미지 = min((int)clamp(공격력, 0, 999), 잔여 HP) × 타격 횟수.
        const u = require(action.unit);
        assertActable(u);
        const legal = destroyTargets(state.structures, u.x, u.y, u.force).find(
          (t) => t.x === action.x && t.y === action.y,
        );
        if (legal === undefined) throw new Error(`파괴 대상 없음: (${action.x}, ${action.y})`);
        const idx = legal.structure;
        const target = state.structures![idx];
        const self = { ...toCombatant(u, state.map, units, supportEffects, state.terrainPatches), initiator: true, striking: true };
        const env = combatEnv(self);
        const atk = Math.trunc(Math.min(Math.max(calc.eval("攻撃力計算", env) as number, 0), 999));
        const flow = makeSkillModifier(effectiveSkills(u) ?? [], env, { initiator: true, striking: true });
        const strikes = Math.max(Math.trunc(flow("攻撃回数", 1)), 1);
        let hp = target.hp;
        for (let i = 0; i < strikes && hp > 0; i++) {
          hp -= Math.min(atk, hp);
          events.push({ type: "destroy", unit: u.id, structure: idx, tid: target.tid, hpAfter: hp });
        }
        structures = (structures ?? state.structures ?? []).map((s, i) => (i === idx ? { ...s, hp } : s));
        u.acted = true;
        u.moved = false; // 행동 = 재이동(시구르드) 창을 연다(커맨드 공통 문법)
        consumeCrest(u);
        break;
      }

      case "wait": {
        const u = require(action.unit);
        assertActable(u);
        u.acted = true;
        u.moved = false; // 행동이 재이동(시구르드) 창을 연다
        consumeCrest(u);
        break;
      }

      case "attack": {
        const attacker = require(action.unit);
        const defender = require(action.target);
        assertActable(attacker);
        if (attacker.force === defender.force) throw new Error("같은 군은 공격할 수 없다");
        if (action.weapon !== undefined) {
          // 인게이지 중엔 엠블렘 무기가 목록 뒤에 증설된다 — 기존 인덱스는 불변(기보 계약).
          const chosen = effectiveWeapons(attacker)?.[action.weapon];
          if (chosen === undefined) throw new Error(`불법 무기 인덱스: ${action.weapon}`);
          attacker.weapon = chosen; // 무기 선택 = 장비 전환(인게임 문법) — 이후 피격 반격도 이 무기
        }
        const distance = manhattan(attacker, defender);
        if (!inWeaponRange(attacker, distance)) throw new Error("사거리 밖 공격");

        // 스킬 발동 필터: 전투를 건 쪽(Stand)은 전투 내내 고정이고, 때리는 쪽(Action)은 타격마다 뒤집힌다.
        const attackerC = { ...toCombatant(attacker, state.map, units, supportEffects, state.terrainPatches), initiator: true };
        const defenderC = { ...toCombatant(defender, state.map, units, supportEffects, state.terrainPatches), initiator: false };
        const striking = (c: Combatant, value: boolean): Combatant => ({ ...c, striking: value });
        const atkF = forecastSide(calc, striking(attackerC, true), striking(defenderC, false));
        const defF = forecastSide(calc, striking(defenderC, true), striking(attackerC, false));

        // 체인가드: 대상을 지키는 스탠스 유닛 — 본공격·추격만 치환(체인어택은 무효 — CalcChainGuardSide).
        const guard = chainGuardFor(defender, units);
        let guardBlocks = 0;

        // 체인어택: 공격측 군의 연계 스타일 유닛 중 대상이 자기 무기 사거리 안인 유닛.
        const chainUnits = chainAttackers(attacker, defender, units);

        const strike = (
          from: UnitState,
          to: UnitState,
          kind: StrikeKind,
          numbers: { damage: number; hitRate: number; critRate: number },
        ): void => {
          if (from.dead || to.dead) return;
          const hit = isHit(numbers.hitRate, rng.next(10000));
          if (hit && to === defender && kind !== "chain" && guard !== undefined) {
            // 체인가드 치환 — 가드가 서면 CalcAttackHit(대미지·필살 롤)를 통째로 건너뛴다(CalcAttack 0x24716BC).
            // 대상 대미지 0(브레이크도 없음), 가드 = trunc(자기 현재 HP*0.2)·하한 없음(GetChainGuardDamage 0x24720C0).
            const gd = Math.trunc(
              calc.eval("チェインガードダメージ", combatEnv({ stats: { ...guard.stats, maxHp: guard.stats.hp, hp: guard.hp } })) as number,
            );
            guard.hp = Math.max(guard.hp - gd, 0);
            guardBlocks += 1;
            events.push({ type: "strike", attacker: from.id, defender: to.id, kind, hit: true, crit: false, damage: 0, hpAfter: to.hp });
            events.push({ type: "guardBlock", unit: guard.id, target: to.id, damage: gd, hpAfter: guard.hp });
            return;
          }
          // 명중 시에만 필살 롤 — 롤 소비 순서는 리플레이 계약.
          const crit = hit && numbers.critRate > 0 ? isProbability100(numbers.critRate, rng.next(100000)) : false;
          const damage = hit ? numbers.damage * (crit ? 3 : 1) : 0;
          to.hp = Math.max(to.hp - damage, 0);
          events.push({ type: "strike", attacker: from.id, defender: to.id, kind, hit, crit, damage, hpAfter: to.hp });
          // 브레이크 조건(코드 확정) = 명중 + 확정 대미지 1 이상 + 개시측(반격·체인으로는 발생하지 않는다).
          if (hit && damage >= 1 && kind === "attack" && from === attacker && canBreak(from, to)) {
            to.broken = true;
            events.push({ type: "break", unit: to.id });
          }
          if (to.hp === 0 && !to.dead) {
            to.dead = true;
            events.push({ type: "death", unit: to.id });
          }
        };

        // 브레이크 해제 = (A) 그 유닛이 참여한 다음 전투의 커밋 시점 또는 (B) 페이즈 종료, 먼저 오는 쪽
        // (코드 확정: CommitUnit 0x2477B70 · ResetPhaseEnd 0x1A19EF0, SID_気絶 Cycle=3=PhaseAfter).
        // kr 원문 "한 번 전투를 하거나 다음 턴이 되기 전까지"가 정확히 이 둘이다 — 아래가 (A)에 해당한다.
        const defenderEnteredBroken = defender.broken;
        const chainNumbers = (backup: UnitState) => {
          const env = combatEnv(toCombatant(backup, state.map, units, supportEffects, state.terrainPatches), defenderC);
          return {
            damage: Math.floor(calc.eval("チェインアタック威力計算", env) as number),
            hitRate: calc.eval("チェインアタック命中率計算", env) as number,
            critRate: calc.eval("チェインアタック必殺率計算", env) as number,
          };
        };
        // 체인어택은 공격측 첫 오더 슬롯 직전 = 본공격보다 먼저다(코드 확정 — 종전 '본공격 뒤'는 가정이었다).
        for (const backup of chainUnits) strike(backup, defender, "chain", chainNumbers(backup));
        strike(attacker, defender, "attack", atkF);
        const canCounter = () =>
          !defender.dead && !defender.broken && inWeaponRange(defender, distance);
        if (canCounter()) strike(defender, attacker, "counter", defF);
        if (atkF.followUp) strike(attacker, defender, "followUp", atkF);
        if (defF.followUp && canCounter()) strike(defender, attacker, "counterFollowUp", defF);
        if (defenderEnteredBroken && !defender.dead) {
          defender.broken = false;
          events.push({ type: "breakRelease", unit: defender.id });
        }

        // 인게이지 충전 = 공격·피격 양측 각 +1 (체인 참가자는 제외 — Status 4|8 필터 코드 확정).
        chargeEngage(attacker, events);
        chargeEngage(defender, events);

        attacker.acted = true;
        attacker.moved = false; // 행동이 재이동(시구르드) 창을 연다
        consumeCrest(attacker);

        // 경험치: 자군만(적/우군 성장은 재현 대상 아님 — 인게임 문법).
        if (attacker.force === 0 && !attacker.dead) {
          const difficulty = state.difficulty ?? "n";
          const formula = defender.dead ? "撃破経験計算" : "戦闘経験計算";
          const chainCount = events.filter((e) => e.type === "strike" && e.kind === "chain").length;
          const gained = Math.floor(
            calc.eval(formula, expEnv(attacker, defender, chainCount, difficulty)) as number,
          );
          grantExp(attacker, gained, events, rng, growMode);
        }
        // 가드 경험치 — チェインガード経験計算(상대 = 지킨 아군 = m_Parent, GetGuardExp 0x1E94390).
        // 다타격을 받아도 전투당 1회. 공격측 경험 뒤 = 사이드 순서(Offense 0 < ChainDefense 26+) 가정.
        if (guardBlocks > 0 && guard !== undefined && guard.force === 0 && !guard.dead) {
          const difficulty = state.difficulty ?? "n";
          const gained = Math.floor(
            calc.eval("チェインガード経験計算", expEnv(guard, defender, 0, difficulty)) as number,
          );
          grantExp(guard, gained, events, rng, growMode);
        }
        break;
      }

      case "staff": {
        const caster = require(action.unit);
        const target = require(action.target);
        assertActable(caster);
        if (caster === target) throw new Error("자기 자신은 지팡이 대상이 아니다");
        const idx = action.staff ?? 0;
        const staff = caster.staves?.[idx];
        if (staff === undefined) throw new Error(`불법 지팡이 인덱스: ${idx}`);
        if (staff.uses < 1) throw new Error("지팡이 사용 횟수 소진");
        // 침묵(サイレス) = 지팡이 봉인 — Unit.IsSilence(0x1A393D0) 게이트.
        if (hasBadState(caster, BAD_STATE.silence)) throw new Error("침묵 상태 — 지팡이 사용 불가");
        const distance = manhattan(caster, target);
        if (distance < staff.rangeMin || distance > staff.rangeMax) throw new Error("사거리 밖 지팡이");
        /** 술자 공통 마무리 — 횟수 소모·충전(가정: 전투 계산기 경로라 +1)·행동 완료·紋章氣. */
        const finish = (): void => {
          caster.staves = caster.staves?.map((s, i) => (i === idx ? { ...s, uses: s.uses - 1 } : s));
          chargeEngage(caster, events);
          caster.acted = true;
          caster.moved = false; // 행동이 재이동(시구르드) 창을 연다
          consumeCrest(caster);
        };
        /** 杖経験計算 = clamp(杖経験値 + 자기 레벨 감쇠 + 레벨차 감쇠, 1, 100) — 杖経験値 = item RodExp. */
        const grantRodExp = (): void => {
          if (caster.force !== 0) return;
          const difficulty = state.difficulty ?? "n";
          const gained = Math.floor(
            calc.eval("杖経験計算", expEnv(caster, target, 0, difficulty, { 杖経験値: staff.rodExp })) as number,
          );
          grantExp(caster, gained, events, rng, growMode);
        };

        if (staff.rodType === 2) {
          if (caster.force !== target.force) throw new Error("지팡이 회복은 같은 군만 대상이다");
          if (target.stats.hp - target.hp < 1) throw new Error("회복 대상 아님(무손상)");
          // 위력의 연성·각인 합산은 스냅숏(power) 소관. 전량 회복 축복(bit5)·ItemHealScale 스킬 훅은 미배선.
          const amount = staffHealAmount(caster, target, staff);
          target.hp += amount;
          events.push({ type: "heal", unit: caster.id, target: target.id, amount, hpAfter: target.hp });
          finish();
          grantRodExp();
        } else if (staff.rodType === 3) {
          if (caster.force === target.force) throw new Error("방해 지팡이는 적만 대상이다");
          const gives = staff.gives ?? [];
          // ドロー(UseType 27) — GiveSids 없음·코드 경로 미판독. 과대 재현보다 정직한 거부.
          if (gives.length === 0) throw new Error("미배선 방해 지팡이(효과 미판독)");
          const rate = staffHitRate(calc, caster, target, staff, state.map);
          // 명중 롤 1회(RandomCheckHit — sin 곡선 공용) = 리플레이 계약. 빗나가도 횟수는 소모된다.
          if (isHit(rate, rng.next(10000))) {
            for (const g of gives) {
              // 재부여 = 중첩이 아니라 치환(Unit.AddGiveSkill 0x1A5D430 — 하위 제거 후 삽입, age 리셋).
              target.statuses = [...(target.statuses ?? []).filter((s) => s.sid !== g.sid), { ...g, age: 0 }];
              events.push({
                type: "status", unit: caster.id, target: target.id, sid: g.sid, badState: g.badState, life: g.life,
                ...(g.name !== undefined ? { name: g.name } : {}),
              });
            }
            finish();
            grantRodExp();
          } else {
            events.push({ type: "staffMiss", unit: caster.id, target: target.id });
            finish();
            // ☠명중 실패 경험치 = 근거 부재(Status.ExpRodMiss 소비처 미판독) — 0 채택, 실측 반증 시 갱신.
          }
        } else if (staff.useType === 5) {
          if (caster.force !== target.force) throw new Error("워프는 같은 군만 대상이다");
          if (action.x === undefined || action.y === undefined) throw new Error("워프 목적지 없음");
          // 목적지 = 대상 좌표 중심 맨해튼 Distance 반경(UnitWarp 0x2C1F880) — 열거는 warpDestinations 공용.
          const legal = warpDestinations(target, staff, state.map, units, state.structures, state.terrainPatches);
          if (!legal.some((t) => t.x === action.x && t.y === action.y)) {
            throw new Error(`불법 워프 목적지: (${action.x}, ${action.y})`);
          }
          target.x = action.x;
          target.y = action.y;
          events.push({ type: "warp", unit: caster.id, target: target.id, x: action.x, y: action.y });
          finish();
          grantRodExp();
        } else {
          // ☠레스큐(UseType 6)·리워프(8)는 목적지 규칙 미판독(UnitRewarp 별도 경로) — 정직 거부.
          throw new Error("미배선 지팡이 종류(회복·방해·워프만 배선)");
        }
        break;
      }

      case "item": {
        const user = require(action.unit);
        assertActable(user);
        const idx = action.item ?? 0;
        const item = user.consumables?.[idx];
        if (item === undefined) throw new Error(`불법 아이템 인덱스: ${idx}`);
        // ☠범위 회복(AddType 2)만 배선 — 인게이지 충전·상태 해제·스킬 부여는 선행 시스템별 후속(정직 거부).
        if (item.addType !== 2) throw new Error("미배선 아이템 종류(범위 회복만 배선)");
        if (item.uses < 1) throw new Error("아이템 소진");
        const targets = itemTargets(user, units, item);
        if (targets.length === 0) throw new Error("사용 대상 없음(범위 내 무손상)");
        // 회복량 = AddPower 고정(능력치 무관 — 지팡이의 마력 반감 가산과 다른 규칙), 잃은 HP 상한.
        for (const t of targets) {
          const amount = Math.min(item.power, t.stats.hp - t.hp);
          t.hp += amount;
          events.push({ type: "heal", unit: user.id, target: t.id, amount, hpAfter: t.hp });
        }
        user.consumables = user.consumables?.map((c, i) => (i === idx ? { ...c, uses: c.uses - 1 } : c));
        user.acted = true;
        user.moved = false; // 행동이 재이동(시구르드) 창을 연다
        consumeCrest(user);
        // 경험치 없음 — calculator에 아이템 경험식이 없다(杖·踊り·チェインガード만 존재).
        break;
      }

      case "dance": {
        const dancer = require(action.unit);
        const target = require(action.target);
        assertActable(dancer);
        if (!canDance(dancer)) throw new Error("춤 스킬 없음");
        if (dancer.force !== target.force) throw new Error("춤은 같은 군만 대상이다");
        if (dancer === target) throw new Error("자기 자신은 춤 대상이 아니다");
        // 인접 1칸·행동 완료 대상 — 실기 확인(2026-08-17 decisions) + 게임 메뉴가 대상 필터를 이렇게 건다.
        if (manhattan(dancer, target) !== 1) throw new Error("춤은 인접 1칸만");
        if (!target.acted) throw new Error("행동 완료 유닛만 재행동 대상이다");
        target.acted = false;
        target.moved = false; // 이동 창까지 새로 연다 — 안 풀면 이동 없는 반쪽 재행동
        events.push({ type: "refresh", unit: target.id });
        dancer.acted = true;
        dancer.moved = false;
        consumeCrest(dancer);
        if (dancer.force === 0) {
          const difficulty = state.difficulty ?? "n";
          // 踊り経験計算 = clamp(踊り基本値(자기 레벨) + 補助レベル差減衰値(레벨차), 1, 100).
          const gained = Math.floor(
            calc.eval("踊り経験計算", expEnv(dancer, target, 0, difficulty)) as number,
          );
          grantExp(dancer, gained, events, rng, growMode);
        }
        break;
      }

      case "guard": {
        const u = require(action.unit);
        assertActable(u);
        if (!hasChainGuardSkill(u)) throw new Error("체인가드 자격 없음(気功 스타일)");
        // 만HP && HP≥2 게이트 — 미달이 인게임 GuardType.NotEnoughHP(GetGuardType 0x1A34F50 판독).
        if (!canChainGuard(u)) throw new Error("체인가드 불가 — HP가 가득해야 한다");
        u.guarding = true;
        events.push({ type: "guard", unit: u.id });
        u.acted = true;
        u.moved = false; // 행동이 재이동(시구르드) 창을 연다
        consumeCrest(u);
        // 인게이지 충전 없음 — AddEngageCount는 전투·지팡이 행동만(지정 자체는 전투가 아니다).
        break;
      }

      case "trade": {
        const actor = require(action.unit);
        const partner = require(action.target);
        assertActable(actor);
        if (actor.force !== partner.force) throw new Error("교환은 같은 군만 대상이다");
        if (actor === partner) throw new Error("자기 자신과는 교환할 수 없다");
        if (manhattan(actor, partner) !== 1) throw new Error("교환은 인접 1칸만");
        const [giver, receiver] = action.back === true ? [partner, actor] : [actor, partner];
        const channel = action.kind === "weapon" ? "weapons" : action.kind === "staff" ? "staves" : "consumables";
        const list = giver[channel];
        const item = list?.[action.index];
        if (item === undefined) throw new Error(`불법 교환 인덱스: ${action.kind}[${action.index}]`);
        (giver as Record<typeof channel, unknown[]>)[channel] = list!.filter((_, i) => i !== action.index);
        (receiver as Record<typeof channel, unknown[]>)[channel] = [...(receiver[channel] ?? []), item];
        if (action.kind === "weapon") {
          // 장비 무기가 옮겨가면 주는 쪽은 남은 목록[0] 재장비(없으면 비무장), 비무장 수령자는 첫 무기 장비.
          if (giver.weapon === item) giver.weapon = giver.weapons?.[0];
          if (receiver.weapon === undefined) receiver.weapon = receiver.weapons?.[0];
        }
        // 실기 판별(2026-08-18): 행동 유지·이동 창 소진·인게이지 발동 봉쇄. 상대 창 상태는 불변.
        actor.moved = true;
        actor.traded = true;
        break;
      }

      case "engage": {
        const u = require(action.unit);
        if (u.force !== state.phase) throw new Error(`페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다`);
        if (hasBadState(u, BAD_STATE.stun)) throw new Error(`기절 상태: ${u.id}는 행동할 수 없다`);
        if (u.acted) throw new Error(`행동 완료 유닛: ${u.id}`);
        const g = u.engage;
        if (g === undefined) throw new Error("엠블렘 미장착");
        if (g.engaging) throw new Error("이미 인게이지 중");
        // 발동 조건 = 만충(CanEngageImpl 0x1A26F70). 행동은 소모하지 않는다 — 발동 후 이동·공격 가능.
        if (u.traded === true) throw new Error("교환 후에는 인게이지 발동 불가");
        if (g.limit < 1 || g.count < g.limit) throw new Error("게이지 미만충");
        u.engage = { ...g, engaging: true, turn: 0 };
        events.push({ type: "engage", unit: u.id });
        break;
      }

      case "engageAttack": {
        const attacker = require(action.unit);
        const defender = require(action.target);
        assertActable(attacker);
        if (attacker.force === defender.force) throw new Error("같은 군은 공격할 수 없다");
        const art = attacker.engageArt;
        const g = attacker.engage;
        if (art === undefined || g === undefined) throw new Error("인게이지 기술 없음");
        if (!g.engaging) throw new Error("인게이지 중에만 기술을 쓸 수 있다");
        // ☠리워프형(세리카 Rewarp>0)·무기 없는 시전은 미배선 결손인 채 정직하게 거부한다(과대 재현 금지).
        if ((art.rewarp ?? 0) > 0) throw new Error("미배선 인게이지 기술(리워프형)");
        // WeaponProhibit = kind 비트 금지 마스크 — 가정((mask>>kind)&1, 마르스 1021 = 검만 허용 정합).
        const own = attacker.weapon;
        if (own !== undefined && art.weaponProhibit !== undefined && ((art.weaponProhibit >> own.kind) & 1) === 1) {
          throw new Error("현 장비로는 쓸 수 없는 인게이지 기술");
        }
        if (g.count < art.cost) throw new Error("게이지 부족(技コスト)");
        const strikeWeapon = (i: number): BattleWeapon | undefined => art.weapons?.[i] ?? own ?? undefined;
        const firstWeapon = strikeWeapon(0);
        if (firstWeapon === undefined) throw new Error("무기 없는 유닛은 기술을 쓸 수 없다");
        const distance = manhattan(attacker, defender);
        const rangeMin = art.rangeMin ?? firstWeapon.rangeMin;
        const rangeMax = art.rangeMax ?? firstWeapon.rangeMax;
        if (distance < rangeMin || distance > rangeMax) throw new Error("사거리 밖 기술");

        // 기술 스킬 세트(기술 행 + SyncSids 전개)는 이 전투 한정으로 공격측에 합류한다 — 국면 스킬은 불변.
        const artSkills = [...(effectiveSkills(attacker) ?? []), ...art.skills];
        const attackerC = {
          ...toCombatant(attacker, state.map, units, supportEffects, state.terrainPatches),
          skills: artSkills,
          initiator: true,
          striking: true,
        };
        const defenderC = {
          ...toCombatant(defender, state.map, units, supportEffects, state.terrainPatches),
          initiator: false,
          striking: false,
        };
        // 흐름 변수는 汎用設定(SyncSids)이 데이터로 소유한다: 攻撃回数·手番回数·相手の手番回数.
        // 기본값 1은 통상 전투의 문법 — 汎用設定이 없으면 1타·반격 허용으로 강하한다.
        const flowEnv = combatEnv({ ...attackerC, skills: undefined }, defenderC);
        const flow = makeSkillModifier(artSkills, flowEnv, { initiator: true, striking: true });
        const strikesPerTurn = Math.max(Math.trunc(flow("攻撃回数", 1)), 0);
        const turns = Math.max(Math.trunc(flow("手番回数", 1)), 0);
        const foeTurns = Math.max(Math.trunc(flow("相手の手番回数", 1)), 0);

        const strike = (
          from: UnitState,
          to: UnitState,
          numbers: { damage: number; hitRate: number; critRate: number },
        ): void => {
          if (from.dead || to.dead) return;
          const hit = isHit(numbers.hitRate, rng.next(10000));
          const crit = hit && numbers.critRate > 0 ? isProbability100(numbers.critRate, rng.next(100000)) : false;
          const damage = hit ? numbers.damage * (crit ? 3 : 1) : 0;
          to.hp = Math.max(to.hp - damage, 0);
          events.push({ type: "strike", attacker: from.id, defender: to.id, kind: from === attacker ? "attack" : "counter", hit, crit, damage, hpAfter: to.hp });
          if (to.hp === 0 && !to.dead) {
            to.dead = true;
            events.push({ type: "death", unit: to.id });
          }
        };

        // ⚠단순화(가정): 체인어택·추격·브레이크는 기술 전투에서 미발동으로 둔다 — 汎用設定이 회수를
        // 고정하는 문법과 정합하나 실기 앵커는 없다(실측 대조 대상, 장부 actions.engage-attack).
        for (let turn = 0; turn < turns && !defender.dead; turn++) {
          for (let i = 0; i < strikesPerTurn && !defender.dead; i++) {
            const weapon = strikeWeapon(i);
            const numbers = forecastSide(calc, { ...attackerC, weapon }, defenderC);
            // 대미지 감쇠(ダメージ３０％류) = 공격측 스킬의 相手のダメージ 대입 — 원문 식이 올림을 소유한다.
            const damage = Math.trunc(flow("相手のダメージ", numbers.damage));
            strike(attacker, defender, { ...numbers, damage });
          }
        }
        if (foeTurns > 0 && !defender.dead && !defender.broken && inWeaponRange(defender, distance)) {
          const defF = forecastSide(calc, { ...defenderC, striking: true }, { ...attackerC, striking: false });
          for (let i = 0; i < foeTurns && !attacker.dead; i++) strike(defender, attacker, defF);
        }

        // 게이지 차감(技コスト — 대부분 0) — charge 이벤트 절대값으로 기보에 실린다.
        if (art.cost > 0) {
          attacker.engage = { ...g, count: g.count - art.cost };
          events.push({ type: "charge", unit: attacker.id, count: attacker.engage.count });
        }
        // 충전: 공격측은 인게이지 중이라 항상 무충전, 피격측은 통상 규칙.
        chargeEngage(defender, events);
        attacker.acted = true;
        attacker.moved = false; // 행동이 재이동(시구르드) 창을 연다
        consumeCrest(attacker);
        if (attacker.force === 0 && !attacker.dead) {
          const difficulty = state.difficulty ?? "n";
          const formula = defender.dead ? "撃破経験計算" : "戦闘経験計算";
          const gained = Math.floor(
            calc.eval(formula, expEnv(attacker, defender, 0, difficulty)) as number,
          );
          grantExp(attacker, gained, events, rng, growMode);
        }
        break;
      }

      case "endPhase": {
        const forces = [...new Set(units.filter((u) => !u.dead).map((u) => u.force))].sort();
        if (forces.length > 0) {
          const idx = forces.indexOf(state.phase);
          const nextForce = forces[(idx + 1) % forces.length] ?? forces[0];
          const wrapped = forces.indexOf(nextForce) <= idx || idx < 0;
          const phaseEvents: BattleEvent[] = [{ type: "phase", phase: nextForce, turn: state.turn }];
          const next: GameState = {
            ...state,
            phase: nextForce,
            turn: wrapped && nextForce === forces[0] ? state.turn + 1 : state.turn,
            units: units.map((u) => {
              // 상태 에이징 — Cycle=PhaseAfter: 페이즈 종료마다 전 유닛 age+1, life×3 도달 시 소멸
              // (OnBuild 0x248AB64가 PhaseCycle=3으로 Life를 3배 — 3세력 1턴 = 3페이즈와 정합).
              // life 0 = 무제한(독 선례 — 気絶의 실기 지속은 대조 대상, 장부 combat.status-effects).
              let aged = u;
              if (u.statuses !== undefined && !u.dead) {
                const kept = u.statuses
                  .map((s) => ({ ...s, age: s.age + 1 }))
                  .filter((s) => s.life === 0 || s.age < s.life * 3);
                aged = { ...u, statuses: kept };
                if (kept.length === 0) delete aged.statuses;
              }
              if (aged.force !== nextForce) return aged;
              const fresh: UnitState = { ...aged, acted: false, broken: false, moved: false };
              delete fresh.traded; // 새 활성화 — 교환 창 제약 해제
              delete fresh.guarding; // 체인가드 스탠스 해제 — 수명 = 자기 활성화 복귀까지
              // 인게이지 소비 = 자기 페이즈 시작마다 1턴, 도달 시 해제 + 게이지 0 (ResetPhaseBeginAfter 코드 확정).
              const g = fresh.engage;
              if (g?.engaging === true && !fresh.dead) {
                const turn = g.turn + 1;
                if (turn >= g.turnLimit) {
                  fresh.engage = { ...g, engaging: false, turn: 0, count: 0 };
                  // 엠블렘 무기는 인게이지와 함께 사라진다 — 장비 중이었으면 소지품 첫 무기로 복귀.
                  if (fresh.weapon !== undefined && fresh.engageWeapons?.includes(fresh.weapon) === true) {
                    fresh.weapon = fresh.weapons?.[0];
                  }
                  phaseEvents.push({ type: "disengage", unit: u.id });
                } else {
                  fresh.engage = { ...g, turn };
                }
              }
              // 지형 회복·피해(자기 페이즈 시작) — 베이스+오버레이 Heal 합, 합 0 = 스킵(ProcTerrainDamage).
              // ☠사망 불가: canDie=false 상수 경로라 하한 1(max) · 회복은 잃은 HP 상한. 비행(Attrs Fly) 전면 면제.
              if (!fresh.dead && fresh.flying !== true) {
                const net =
                  ((terrainPatchAt(state.terrainPatches, fresh.x, fresh.y)?.cell
                    ?? state.map.terrain?.[fresh.y]?.[fresh.x])?.heal ?? 0) +
                  (overlayAt(state.map, fresh.x, fresh.y)?.cell.heal ?? 0);
                if (net !== 0) {
                  const after = net > 0 ? Math.min(fresh.hp + net, fresh.stats.hp) : Math.max(fresh.hp + net, 1);
                  if (after !== fresh.hp) {
                    phaseEvents.push({ type: "terrainHeal", unit: fresh.id, amount: after - fresh.hp, hpAfter: after });
                    fresh.hp = after;
                  }
                }
              }
              return fresh;
            }),
            events: phaseEvents,
          };
          const wrapped2 = next.turn > state.turn;
          return settleOutcome(next, wrapped2 ? state.turn : undefined);
        }
        break;
      }
    }

    return settleOutcome({ ...state, units, ...(crests === undefined ? {} : { crests }), ...(structures === undefined ? {} : { structures }), events });
  };
}

/**
 * 승패 판정 — 기본(적 전멸/자군 전멸) + winRule 파라미터(WinRuleSet* 사영) + 勝利/敗北 변수(스크립트 직접 판정).
 * 이벤트 레이어(변수 변경)도 같은 판정을 써야 한다(중복 구현 금지). completedTurn = 턴 랩 시 방금 끝난 턴 번호.
 */
export function settleOutcome(state: GameState, completedTurn?: number): GameState {
  if (state.outcome !== undefined) return state;
  const rule = state.winRule;
  const enemies = state.units.filter((u) => u.force === 1);
  const aliveEnemies = enemies.filter((u) => !u.dead).length;
  const bosses = enemies.filter((u) => u.boss === true);
  // enemyLessThan 음수 = 잔존 수 판정 통째 무효화 — GameEndCheck 0x1F4A900 분기 그대로.
  const routDisabled = rule?.enemyLessThan !== undefined && rule.enemyLessThan < 0;
  let outcome: GameState["outcome"];
  // 주인공(SID_主人公) 사망 = 상시 패배 — 파라미터 없는 즉시 판정이라 승리 변수보다 앞선다
  // (MapSituation.GameEndCheckUnitDead DeadHero=6, 사망 처리 시점 — _wip_winrule §1.2·§1.5.
  //  실측: m002 자율 플레이에서 뤼에르 사망 후 '승리'까지 진행된 오재현이 이 결손의 발현이었다).
  if (state.units.some((u) => u.dead && u.skills?.some((s) => s.Sid === "SID_主人公") === true)) {
    outcome = "defeat";
  } else if (state.variables?.["勝利"] === 1) outcome = "victory";
  else if (state.variables?.["敗北"] === 1) outcome = "defeat";
  else if (!routDisabled && enemies.length > 0 && aliveEnemies <= Math.max(rule?.enemyLessThan ?? 0, 0)) {
    outcome = "victory";
  } else if (rule?.destroyBoss === true && bosses.length > 0 && bosses.every((u) => u.dead)) {
    outcome = "victory";
  } else if (!state.units.some((u) => u.force === 0 && !u.dead) && state.units.some((u) => u.force === 0)) {
    outcome = "defeat";
  } else if (completedTurn !== undefined && rule?.limitTurn !== undefined && rule.limitTurn !== 0) {
    // ⚠가정: 판정 시점 = 턴 랩(제한턴은 MapSituation.TurnEnd 소관 — 랩 세부 미판독).
    if (completedTurn >= Math.abs(rule.limitTurn)) outcome = rule.limitTurn > 0 ? "victory" : "defeat";
  }
  if (outcome === undefined) return state;
  return { ...state, outcome, events: [...state.events, { type: "outcome", outcome }] };
}
