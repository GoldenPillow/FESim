/**
 * 위치 평가함수 — "어디서 때릴 것인가 / 어디로 갈 것인가"(AI_ENGINE §5-A).
 *
 * ☠**표적 스코어(§5-1)와 섞지 말 것.** 이 스코어에는 **기대 대미지·격파확률이 들어가지 않는다**.
 * 사전식 우선순위 = 연계 인원수 ≫ 밀치기 결과 ≫ 대상 반격 사거리 밖 ≫ 지형 ≫ 이동코스트 낮음.
 * 정본 = `AIThink$$GetAttackPosition`(0x193CB30) + 클로저 람다 `b__0`/`b__1`.
 */
import type { BattleMap, StructureState, TerrainPatch, UnitState } from "../battle.js";
import { overlayAt, structureAt, terrainPatchAt } from "../battle.js";

/** 0 방향 절사 정수 나눗셈(C# `int / int`). */
const idiv = (a: number, b: number): number => Math.trunc(a / b);

/**
 * `AIThink$$GetTerrainScore`(0x19422B0) — 0..15.
 * ★비행 병종은 함수 초입에서 **항상 0**. 진영 비대칭항은 우군(2+)에 가산되지 않는다.
 * ☠**사이드항은 오버레이 층에만** 더한다 — 베이스 셀은 `[0x5c]`/`[0x5d]`(Defense·Avoid)만 읽고
 * force 분기가 아예 없다(0x1942440/44 대 0x1942588~). 전투용 `terrainBonusAt`은 **다른 함수**의
 * 사영이라 층 규칙이 다르다 — 같아 보인다고 합치지 말 것.
 */
export function terrainScoreAt(
  map: BattleMap,
  u: UnitState,
  x: number,
  y: number,
  patches?: readonly TerrainPatch[],
): number {
  if (u.moveType === "fly" || u.moveType === "dragon" || u.flying === true) return 0;
  const base = terrainPatchAt(patches, x, y)?.cell ?? map.terrain?.[y]?.[x];
  const over = overlayAt(map, x, y)?.cell;
  const side =
    u.force === 0
      ? { avoid: over?.playerAvoid ?? 0, def: over?.playerDef ?? 0 }
      : u.force === 1
        ? { avoid: over?.enemyAvoid ?? 0, def: over?.enemyDef ?? 0 }
        : { avoid: 0, def: 0 };
  const def = (base?.def ?? 0) + (over?.def ?? 0) + side.def;
  const avoid = (base?.avoid ?? 0) + (over?.avoid ?? 0) + side.avoid;
  const heal = (base?.heal ?? 0) + (over?.heal ?? 0);
  const score = def + idiv(avoid, 5) + idiv(heal, 10) + 5;
  return Math.min(Math.max(score, 0), 15);
}

/** `AIThink.BlowScore` — 값이 클수록 우수. */
export const BLOW_SCORE = { none: 0, wall: 1, blew: 2, hole: 3 } as const;

/** 崩れた床 = 밀어 떨어뜨리면 즉사하는 칸. ☠Flag 비트가 아니라 **Tid 문자열 하드코딩**이다(0x195FF70). */
export const TID_HOLE = "TID_崩れた床";

/**
 * `AIThink$$GetBlowScore`(0x195FF70) — 대상이 밀려날 칸을 판정한다.
 * `(attackX, attackY)` = 공격 실행 위치, `(targetX, targetY)` = 대상 좌표 인자.
 */
export function blowScoreAt(
  map: BattleMap,
  structures: readonly StructureState[] | undefined,
  target: UnitState,
  attackX: number,
  attackY: number,
  targetX: number,
  targetY: number,
  patches?: readonly TerrainPatch[],
): number {
  const bx = targetX - attackX + target.x;
  const by = targetY - attackY + target.y;
  if (bx >= 0 && by >= 0 && bx < map.width && by < map.height) {
    const tid = terrainPatchAt(patches, bx, by)?.tid ?? map.terrain?.[by]?.[bx]?.tid;
    if (tid === TID_HOLE) return BLOW_SCORE.hole;
    // `Map.CanEnterTerrain(target, bx, bz)` = 대상의 이동타입으로 진입 가능한가(코스트 255 = 불가).
    const s = structureAt(structures, bx, by);
    const base =
      s?.costs?.[target.moveType] ??
      terrainPatchAt(patches, bx, by)?.cost?.[target.moveType] ??
      map.costs[target.moveType]?.[by]?.[bx] ??
      255;
    return base >= 255 ? BLOW_SCORE.wall : BLOW_SCORE.blew;
  }
  return BLOW_SCORE.wall;
}

export interface PositionScoreInput {
  /** 연계공격 가능 인원수 — `AttackFlag.ChainAttackCount`가 꺼져 있으면 0. */
  chainCount: number;
  /** `BlowScore` 0..3 — 밀 수 없으면(BlowRatio 0) 0. */
  blow: number;
  /** 대상의 반격 사거리 밖인가(대상 무기 사거리 마스크에 이 거리가 없으면 true). */
  outOfTargetRange: boolean;
  /** `GetTerrainScore` 0..15. */
  terrain: number;
  /** 이동 코스트 0..99(`AIDeploy.MoveImage` 조회값). */
  move: number;
  /** `AttackFlag.Nearest` — 켜지면 지형·아웃레인지 항이 사라진다. */
  nearest?: boolean;
}

/**
 * 위치 스코어(§5-A-3). `score = (hi << 8) + (100 - move)`.
 * ☠`Nearest`면 `hi = chainCount + blow`뿐이라 **최소 이동코스트가 지배**한다.
 */
export function attackPositionScore(input: PositionScoreInput): number {
  let hi: number;
  if (input.nearest === true) {
    hi = input.chainCount + input.blow;
  } else {
    hi = ((input.chainCount << 2) | input.blow) << 5;
    if (input.outOfTargetRange) hi |= 1 << 4;
    hi |= input.terrain;
  }
  return (hi << 8) + (100 - input.move);
}

/**
 * 회복 지팡이 위치 스코어(§5-A-8, `GetHealRodPosition` 0x1958120).
 * ☠공격 위치와 **층위가 정반대**다 — 힐러는 좋은 지형보다 덜 움직이는 것을 우선한다.
 */
export function healRodPositionScore(move: number, terrain: number, nearest = false): number {
  return nearest ? 100 - move : ((100 - move) << 4) + terrain;
}

/**
 * `MapFor.EachRange` 열거 순서(`MapEnum.RangeEnumerator.MoveNext` 0x24C5300).
 * ★**z(y) 내림차순 · 각 행에서 x 오름차순**, 거리 = 맨해튼, 사각 클램프 후 near..far 게이트.
 * 동점 코인플립이 "뒤 후보가 이길 확률 1/2"이므로 이 순서가 결과에 직접 영향을 준다.
 */
export function enumerateRing(
  px: number,
  py: number,
  near: number,
  far: number,
  width: number,
  height: number,
): { x: number; y: number; d: number }[] {
  const xMin = Math.max(px - far, 0);
  const xMax = Math.min(px + far, width - 1);
  const yMin = Math.max(py - far, 0);
  const yMax = Math.min(py + far, height - 1);
  const out: { x: number; y: number; d: number }[] = [];
  for (let y = yMax; y >= yMin; y--) {
    for (let x = xMin; x <= xMax; x++) {
      const d = Math.abs(x - px) + Math.abs(y - py);
      if (d < near || d > far) continue;
      out.push({ x, y, d });
    }
  }
  return out;
}

/**
 * `AIThink$$GetSidePosition`(0x195FC80) + 람다 `<GetSidePosition>b__0`(0x28EBD10) — **코드 확정**.
 *
 * 대상 좌표의 **거리 1 인접칸**(`MapFor.EachRange(x, z, 1, 1, …)`)만 훑어 최선 1칸을 고른다.
 * 후보 게이트(순서 그대로) =
 *  (1) `(sbyte)AIDeploy.MoveImage[x|z<<5] < 0` → 도달 불가 기각
 *  (2) `MapImage.MoveImage[x|z<<5] != 0` → 이미 유닛이 선 칸 기각
 *  (3) `AIThink.IsMoveOver(actor, x, z)`(0x1940710) = `AI 겹침이동 마커 && actor.X==x && actor.Z==z`
 *      → ☠위임(Entrust) 겹침 이동 전용 마커이고 그 트랙이 미모델이라 **항상 false**다(근거 없는 통과가 아니다).
 * 점수 = `(100 - 이동코스트) << 4 + GetTerrainScore` — `getMovePositionScore`의 비-nearest 식과 **같은 식**이다.
 * 채택 = `score >= best`이고 동점이면 `AI.IsRandom()` 50% 코인플립(뒤 후보가 이길 확률 1/2).
 *
 * 호출처 4곳 = `GuardTo` · `EntrustGuardTo` · `DanceTo` · `ActionMindTalk` — 전부 "누구 **옆에** 설 것인가".
 */
export function sidePosition(
  targetX: number,
  targetY: number,
  opts: {
    width: number;
    height: number;
    /** 도달 가능 칸 → 이동 코스트(`AIDeploy.MoveImage` 대응 — `moveImageOf`). */
    image: ReadonlyMap<number, number>;
    /** 이미 유닛이 선 칸(자신 제외) — `MapImage.MoveImage != 0`. */
    occupied: ReadonlySet<number>;
    /** 지형 점수 산출(호출측이 map·patches를 묶어 넘긴다). */
    terrainScore: (x: number, y: number) => number;
    /** 동점 코인플립 — `AI.IsRandom()`. */
    isRandom: () => boolean;
  },
): { x: number; y: number } | undefined {
  let best = 0;
  let pick: { x: number; y: number } | undefined;
  for (const c of enumerateRing(targetX, targetY, 1, 1, opts.width, opts.height)) {
    const k = c.y * opts.width + c.x;
    const cost = opts.image.get(k);
    if (cost === undefined) continue;
    if (opts.occupied.has(k)) continue;
    const score = ((100 - cost) << 4) + opts.terrainScore(c.x, c.y);
    if (score < best) continue;
    if (score === best && opts.isRandom()) continue;
    best = score;
    pick = { x: c.x, y: c.y };
  }
  return pick;
}

/** 사거리 비트마스크 — `mRange`/`eRange`(비트 n = 거리 n 공격 가능). */
export function rangeMask(rangeMin: number, rangeMax: number): number {
  let mask = 0;
  for (let r = rangeMin; r <= rangeMax && r < 31; r++) mask |= 1 << r;
  return mask;
}
