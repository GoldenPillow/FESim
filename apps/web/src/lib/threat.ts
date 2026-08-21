import {
  allianceOf,
  effectiveSkills,
  effectiveWeapons,
  threatTiles,
  type GameState,
  type SkillRow,
  type Tile,
  type UnitState,
} from "@fesim/engine";
import { gridCol, gridRow, tileKey } from "./grid";

/**
 * 위협 표시층 — ★재현층이다(우리 판단이 아니라 인게임 정본을 옮긴다).
 *
 * 정본 = `~/fesim_data/extracted/fidelity_axes/F3_threat_arc.md`(실행파일 판독 + 반증 검증).
 *  - 붉은 포물선 = `MapPanelTarget.CommitForAttack`(0x2358380) — *"지금 이 자군이 선 칸을 칠 수 있는 적"*을
 *    적마다 한 줄씩. 방향은 **적 → 나**.
 *  - 「위험 범위」 타일 = `MapPanelDanger`(개별) · `MapPanelDangerAll`(ZL 전체) — 적의 이동 + 사거리.
 *  - 붉은 ! = `MapInfoGaugeSubLocatorRoot.MakeBalloonList`(0x207F050)의 풍선 슬롯.
 *
 * ☠**재현과 치트의 경계**(F3 §7): 여기 있는 것은 전부 *"누가 나를 **칠 수 있는가**"*(도달 가능성)다.
 * *"그 적이 **누구를** 칠 것인가"*(선택 예지 = MP8 §4-4 치트)는 이 모듈이 만들지 않는다 —
 * 같은 곡선 문법을 쓰면 두 선을 못 가르므로 재현 아크는 **실선**, 예지선은 **점선 + 우선권 배지**로 갈린다.
 */

/** `GetMovePower`의 factor 백분율 — 100 = 자기 이동력 그대로(cause.ts movePowerOf). */
const FULL_MOVE = 100;

/** 아크 색 분기 — `SetMeshForGeneralAttack`(0x2358B00)의 csel 사슬 = **특효 > 필살 > 기본**. */
export type ArcTone = "efficacy" | "crit" | "base" | "engage";

export interface ThreatArc {
  /** 적 유닛 id — React key이자 "누구의 선인가". */
  id: string;
  /** 시작 = 적의 **현재 칸**(`MapArrow.AddMesh(start = 적)`). */
  from: Tile;
  /** 끝 = 표적 자군의 칸. */
  to: Tile;
  tone: ArcTone;
}

/**
 * 적별 사정권 색인 — 커서가 움직일 때마다 다시 계산하지 않기 위한 한 판의 스냅숏.
 *
 * ☠**무효화 키는 국면 하나**다(MP8 §5-2 사용자 결정 = 자군 행동 확정마다 갱신).
 * 커서 이동은 이 색인을 **읽기만** 한다 — 안 그러면 호버 한 칸마다 적 N명 BFS가 돌아 INP를 때린다.
 * 실측(2026-08-21, vitest/node): 전 챕터 최악 g001 적 190명 8.7ms · 본편 최대 m017 적 47명 5.9ms ·
 * 통상 본편(적 30~45명) 0.3~2.1ms. 국면당 1회.
 * ☠**열람 게이트 대상이 아니다** — 열람 경로 정의는 `design/fesim_plan.md`가 공유 링크 → 첫 화면 →
 * 스테핑(`/s/`)으로 못박았고, 이 색인이 사는 맵 보드 페이지는 **제작 경로**다(예산 관대).
 *
 * ⚠사정권 자체의 **과대평가 1건**(엔진 `attackAreaFrom` 소관 — 여기서 고치지 않는다): 소지 무기 전체의
 * `min(rangeMin)..max(rangeMax)`를 한 구간으로 칠하므로 검(1-1) + 장궁(3-10)을 함께 든 적은
 * 어느 무기로도 못 닿는 2칸까지 위험으로 칠해진다(무기별 합집합이 아니다). 장부 = `ai.attack-position`.
 */
export interface ThreatIndex {
  /** 적 id → 사정권 칸 키(`tileKey`) 집합. */
  reach: Map<string, Set<string>>;
  /** 전 적군 사정권 합집합 — ZR 전체 위험 범위의 면. */
  all: Tile[];
}

/**
 * 적으로 볼 유닛 — 표적(자군)과 **비동맹**이고 살아 있고 행동이 남은 유닛.
 *
 * ☠`acted` 제외는 아크 정본이다(`CommitForAttack`의 `CanActWithoutEngageCharge` —
 * 안 빼면 이미 움직인 적까지 선이 남아 *"아직 위험하다"*는 거짓 신호가 된다).
 * ★ZR 면(`MapImageDanger`)이 같은 규칙인지는 **미판독**이라 아크 규칙을 그대로 빌려 쓴다 — **비계**.
 * 제거 조건 = `MapPanelDangerAll.SetMode`(0x1E04DB0)/`MapImageDanger`(dump.cs:689861) 판독.
 *
 * ☠☠**결손(2026-08-22 실측) — 자군 페이즈에도 차이가 난다.** 위 괄호에 적혀 있던 *"자군 페이즈에는 적이
 * 전부 미행동"*은 **거짓**이다: `acted`는 `endPhase`에서 **다음 페이즈 진영만** 리셋되므로
 * (`packages/engine/src/battle.ts` endPhase), 자군 페이즈의 적은 *직전 적 페이즈에 움직였다는 이유로*
 * `acted === true`를 그대로 들고 있다. ⇒ **턴 2부터 위험 범위에서 통째로 빠진다**
 * (실측 m001 턴2 적 3기 · m003 턴2 적 6기 이상). 화면은 "안전"이라고 말하는데 그 적들은 다음 적 페이즈에 움직인다.
 * 기보 정책(`tools/replay/policy.mjs`)은 `acted`를 안 보므로 **여기서 다시 층이 갈린다**.
 * ★고치지 않은 이유 = 정본 미판독(플래그가 페이즈 단위인지 턴 단위인지)이고, 고치면 아크 규칙까지 뒤집혀
 * `threat.test.ts`의 *"행동을 마친 적은 아크에서 빠진다"*와 정면 충돌한다 — 사용자 판단이 필요한 갈림길이다.
 * 제거 조건 = `Unit.CanAct` 플래그의 리셋 시점 판독(또는 실기 관측: 턴 2 자군 페이즈에 ZR을 눌러
 * 직전 페이즈에 움직인 적이 칠해지는가).
 */
const activeFoes = (game: GameState, force: number): UnitState[] => {
  const mine = allianceOf(game.map, force);
  return game.units.filter((u) => !u.dead && !u.acted && allianceOf(game.map, u.force) !== mine);
};

export function threatIndex(game: GameState, force: number): ThreatIndex {
  const reach = new Map<string, Set<string>>();
  const union = new Map<string, Tile>();
  for (const foe of activeFoes(game, force)) {
    const tiles = threatTiles(game, foe, FULL_MOVE);
    const keys = new Set<string>();
    for (const t of tiles) {
      const k = tileKey(t.x, t.y);
      keys.add(k);
      if (!union.has(k)) union.set(k, { x: t.x, y: t.y });
    }
    reach.set(foe.id, keys);
  }
  return { reach, all: [...union.values()] };
}

/** 소지 무기 전수 — 인게이지 중이면 엠블렘 무기까지(`effectiveWeapons`). 장비만 보는 것이 아니다. */
const heldWeapons = (u: UnitState) => effectiveWeapons(u) ?? (u.weapon !== undefined ? [u.weapon] : []);

/**
 * `UnitItemList.HasEfficacyWeapon(unit, target, canUseCheck)`(dump.cs:742765) 대응.
 *
 * ☠**장비 한정이 아니라 소지품 전수**다(F3 검증 A-8) — 엔진 `efficacyOf`는 장비 무기만 보므로
 * 그대로 쓰면 *예비 무기로만 특효를 든 적*의 아크 색이 정본과 달라진다.
 * 마스크 규칙 자체는 엔진과 같다: 공격자 `Efficacy` ∩ (대상 `attrs` ∖ 대상 `EfficacyIgnore`).
 */
export function hasEfficacyWeaponAgainst(foe: UnitState, target: UnitState): boolean {
  const attrs = target.attrs ?? 0;
  if (attrs === 0) return false;
  let ignore = 0;
  for (const s of effectiveSkills(target) ?? []) if (typeof s.EfficacyIgnore === "number") ignore |= s.EfficacyIgnore;
  const live = attrs & ~ignore;
  if (live === 0) return false;
  const rows: SkillRow[] = [...(effectiveSkills(foe) ?? [])];
  for (const w of heldWeapons(foe)) if (w.sids !== undefined) rows.push(...w.sids);
  return rows.some(
    (s) => typeof s.Efficacy === "number" && typeof s.EfficacyValue === "number" && (s.Efficacy & live) !== 0,
  );
}

/** `UnitItemList.HasCriticalWeapon(unit, canUseCheck)`(dump.cs:742762) — 소지 무기 중 필살이 붙은 것. */
export const hasCriticalWeapon = (foe: UnitState): boolean => heldWeapons(foe).some((w) => (w.crit ?? 0) > 0);

/**
 * 위협 아크 목록 — `CommitForAttack(unit, x, z)`(0x2358380)의 3분류를 그대로 옮긴 것.
 *
 * 표적은 **선택(또는 자유 커서가 가리킨) 자군 유닛**이고 기준 칸은 **그 유닛이 실제로 선 칸**이다
 * (우리는 전통 FE식 Indirect 조작만 있으므로 잠정 이동 칸이 아니라 출발 칸이 정합 — F3 §2 (2)).
 *
 * ★적 집합은 **색인이 소유한다**(여기서 다시 거르지 않는다) — 두 곳에서 각자 거르면 규칙이 갈려
 * "선은 사라졌는데 분홍은 남는" 식으로 조용히 어긋난다. 색인은 표적과 **같은 진영 기준**이어야 한다.
 *
 * ☠빠진 분기 2종(정직 결손, 색만 다르다):
 *  - 거너(`JobData.IsGunner`) — 우리 유닛 데이터에 직업 플래그 사영이 없다.
 *  - `PersonData.Flags.SimpleUI`(64) 인물은 아크를 아예 안 그린다(F3 검증 A-3) — 그 플래그가 미사영이다.
 */
export function threatArcs(game: GameState, index: ThreatIndex, target: UnitState | undefined): ThreatArc[] {
  if (target === undefined) return [];
  // `CommitForAttack` 앞머리 게이트 — 자군/우군만 표적이 된다(적을 표적으로 부르면 아무것도 안 그린다).
  if (allianceOf(game.map, target.force) !== allianceOf(game.map, 0)) return [];
  const arcs: ThreatArc[] = [];
  const byId = new Map(game.units.map((u) => [u.id, u]));
  for (const [id, reach] of index.reach) {
    const foe = byId.get(id);
    if (foe === undefined) continue;
    // ★인게이지 분기는 **도달 비트맵을 안 본다**(F3 §3-2) — 사거리 밖에서도 그려진다.
    //   ☠비계: `Unit.CanEngageTarget`의 본문은 미판독이라 *"인게이지 중"*으로 근사했다.
    //   제거 조건 = `Unit.CanEngageTarget` 판독. 근사를 빼면 인게이지 위협이 통째로 사라진다(조용한 결손).
    const engaging = foe.engage?.engaging === true;
    if (!engaging && !reach.has(tileKey(target.x, target.y))) continue;
    const tone: ArcTone =
      engaging ? "engage"
      : hasEfficacyWeaponAgainst(foe, target) ? "efficacy"
      : hasCriticalWeapon(foe) ? "crit"
      : "base";
    arcs.push({ id: foe.id, from: { x: foe.x, y: foe.y }, to: { x: target.x, y: target.y }, tone });
  }
  return arcs;
}

/**
 * 붉은 ! 배지가 붙는 적 — `MakeBalloonList`(0x207F050)는 **도달 판정을 안 본다**(F3 §5 · 검증 B (10)):
 * 못 닿는 적에게도 붙는다. 조건은 무기 성질뿐이고 대상은 **선택된 자군**이다.
 *
 * ☠비계 — F3 §5는 붉은 "!"의 정체를 **미확정**으로 남겼다(후보 3종). 여기서는 1순위 후보
 * `BalloonDisadvantageEfficacy`(38, *"이 적은 너에게 특효를 들었다"*)의 조건만 옮긴다.
 * 2순위 `BalloonCritical`(39)까지 함께 띄우면 **다른 아이콘 둘을 같은 그림으로 합치는 것**이 된다.
 * 제거 조건 = F3 §5 판별 절차 (A) UI 아틀라스 대조 또는 (B) dispos 무기 대조.
 */
export function alertTiles(game: GameState, target: UnitState | undefined): Tile[] {
  if (target === undefined) return [];
  const mine = allianceOf(game.map, target.force);
  return game.units
    .filter(
      (u) => !u.dead && allianceOf(game.map, u.force) !== mine && hasEfficacyWeaponAgainst(u, target),
    )
    .map((u) => ({ x: u.x, y: u.y }));
}

/**
 * 아치 높이 계수 — 법칙은 정본이다(`MapArrow.CalcArrowArchHeight` 0x1EFEF30 = **거리 정비례**).
 * ☠**비계**: 계수 `m_ArchHeightOffset`은 Unity 프리팹 직렬화 값이라 실행파일에 없다(F3 §3-4·§6).
 * 제거 조건 = 실기 스크린샷에서 (아크 정점 높이 / 두 유닛 거리)를 역산(F3 §10).
 */
export const ARC_HEIGHT_K = 0.55;

/**
 * 위협 아크 경로(2차 베지어) — 화면 좌표(타일 단위) 입력. 정점은 현 두 배 규칙상 `K*거리/2`만큼 솟는다.
 * 화면 위 = y 감소(FLIP_Y는 `gridRow`가 이미 흡수했다).
 */
export const arcPath = (x1: number, y1: number, x2: number, y2: number): string => {
  const lift = ARC_HEIGHT_K * Math.hypot(x2 - x1, y2 - y1);
  return `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}`;
};

const mergeRuns = (values: number[]): [number, number][] => {
  const sorted = [...values].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const v of sorted) {
    const last = runs[runs.length - 1];
    if (last !== undefined && last[1] === v) last[1] = v + 1;
    else runs.push([v, v + 1]);
  }
  return runs;
};

/**
 * 영역의 **바깥 둘레**만 잇는 SVG path(타일 단위 좌표).
 *
 * ☠칸마다 격자를 긋지 않는다 — 인게임은 연결된 영역의 둘레에만 선을 넣는다
 * (F5 §3 (D): 파랑 면 내부를 130px 세로로 잘라도 주기적 스파이크가 없다 = 내부 타일 구분선 부재).
 * ★같은 줄에서 연속한 변은 **한 선분으로 합친다**: 안 합치면 대시가 변마다 처음부터 다시 시작해
 * 실측 주기(대시 3px / 간격 4.5px)가 칸 경계마다 깨진다.
 */
export function regionOutline(tiles: readonly Tile[], width: number, height: number): string {
  const cells = new Set<string>();
  for (const t of tiles) cells.add(`${gridCol(width, t.x) - 1},${gridRow(height, t.y) - 1}`);
  const has = (c: number, r: number): boolean => cells.has(`${c},${r}`);
  // 가로 변은 y 경계선별로, 세로 변은 x 경계선별로 모아 런을 합친다.
  const horizontal = new Map<number, number[]>();
  const vertical = new Map<number, number[]>();
  const push = (m: Map<number, number[]>, k: number, v: number) => {
    const list = m.get(k);
    if (list === undefined) m.set(k, [v]);
    else list.push(v);
  };
  for (const key of cells) {
    const [c, r] = key.split(",").map(Number);
    if (!has(c, r - 1)) push(horizontal, r, c);
    if (!has(c, r + 1)) push(horizontal, r + 1, c);
    if (!has(c - 1, r)) push(vertical, c, r);
    if (!has(c + 1, r)) push(vertical, c + 1, r);
  }
  const out: string[] = [];
  for (const [y, cols] of [...horizontal].sort((a, b) => a[0] - b[0]))
    for (const [from, to] of mergeRuns(cols)) out.push(`M${from} ${y}H${to}`);
  for (const [x, rows] of [...vertical].sort((a, b) => a[0] - b[0]))
    for (const [from, to] of mergeRuns(rows)) out.push(`M${x} ${from}V${to}`);
  return out.join("");
}
