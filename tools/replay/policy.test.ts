/**
 * 기보 정책의 위협 계산 단위 테스트 — ☠여기서 잡는 결함은 **정책이 못 보는 대미지**다.
 *
 * 정책은 "예상 피격 후 HP > 0"이면 그 칸에 선다(잔여 1까지 허용). 그래서 위협 합계에서 빠진 몫은
 * 그대로 사망이 되는데, 기보는 되읽으면 정상이고(기록대로 죽은 것이다) 결손 목록에도 안 잡힌다 —
 * 실행 결과만 보면 "운이 나빴다"로 지나간다. 층 사이를 묶는 테스트가 아니면 영원히 안 보인다.
 */
import { describe, expect, it } from "vitest";
import { incoming, threatZones } from "./policy.mjs";

type Unit = { id: string; force: number; x: number; y: number; hp: number; stats: { hp: number } };

const unit = (id: string, force: number, x: number, y: number, hp = 20): Unit => ({
  id,
  force,
  x,
  y,
  hp,
  stats: { hp },
});

/** 위협 구역 = 그 적이 닿는 칸 집합. 여기서는 대상 칸 하나만 넣어 계산 경로를 연다. */
const zoneAt = (foe: Unit, width: number, at: { x: number; y: number }) => ({
  foe,
  tiles: new Set([at.y * width + at.x]),
});

describe("incoming — 그 칸에 서면 적 페이즈에 얼마를 맞는가", () => {
  const width = 8;
  const at = { x: 3, y: 3 };
  const me = unit("me", 0, 0, 0, 17);
  const foe = unit("foe", 1, 3, 2);
  const backup = unit("backup", 1, 4, 3);
  const game = { map: { width, height: 8 }, units: [me, foe, backup] };
  const calculator = {} as never;

  /** 오더 목록에는 체인어택이 없다 — 리듀서가 별도로 굴린다(engine formula/combat.ts battlePlan). */
  const engineBase = {
    toCombatant: (u: Unit) => u,
    battlePlan: () => ({ orders: [{ side: 0, damage: 10, critRate: 0 }] }),
    chainNumbers: () => ({ damage: 4, hitRate: 80, critRate: 0 }),
  };

  it("체인어택 참가자가 없으면 오더 합계 그대로", () => {
    const engine = { ...engineBase, chainAttackers: () => [] };
    expect(incoming(engine, calculator, game, me, at, [zoneAt(foe, width, at)]).total).toBe(10);
  });

  it("연계 스타일 적이 사거리 안이면 체인 대미지를 합계에 넣는다", () => {
    // 왜 위험한가: 체인 4를 못 보면 HP 17로 오더 10만 계산해 "7 남는다"로 들어가는데,
    // 실제로는 10+4를 맞고 3만 남는다. 적이 둘이면 그 차이가 곧 사망이다
    // (실측 m003 시드 13·7: 뤼에르가 오더 합계로는 살아남을 칸에서 체인 4에 죽었다).
    const engine = { ...engineBase, chainAttackers: () => [backup] };
    expect(incoming(engine, calculator, game, me, at, [zoneAt(foe, width, at)]).total).toBe(14);
  });

  it("체인 참가자 열거는 **그 적을 공격자로** 묻는다(자기편 연계를 세면 위협이 뒤집힌다)", () => {
    const seen: { attacker: string; defender: string }[] = [];
    const engine = {
      ...engineBase,
      chainAttackers: (attacker: Unit, defender: Unit) => {
        seen.push({ attacker: attacker.id, defender: defender.id });
        return [];
      },
    };
    incoming(engine, calculator, game, me, at, [zoneAt(foe, width, at)]);
    expect(seen).toEqual([{ attacker: "foe", defender: "me" }]);
  });
});

/**
 * 위험지대 위임 — ☠**층이 둘로 갈렸던 자리**다. 정책이 자기 구현을 들고 있고 UI 「위험 범위」가
 * 엔진 `threatTiles`를 쓰면, 같은 국면에서 화면과 기보가 서로 다른 위험을 본다(어느 쪽도 틀렸다고 말해 주지 않는다).
 *
 * 실제로 갈려 있던 값 = **행동을 마친 적**. 종전 구현은 `moveBudgetOn`이 undefined(행동 완료)면 발밑 한 칸만
 * 돌려줬는데, `acted`는 다음 페이즈 진영만 리셋되므로 자군 페이즈의 적은 직전 적 페이즈에 움직였다는
 * 이유만으로 전부 부동 취급됐다(실측 m003 턴2: 386칸 → 819칸). 그래서 여기서는 **누구를 부르는가**를 박제한다.
 */
describe("threatZones — 엔진 threatTiles 위임(정본 1개)", () => {
  const game = { map: { width: 8, height: 8 }, units: [] };
  const foe = { id: "foe", force: 1, x: 2, y: 2, acted: true, moveType: "foot" };

  it("★엔진 threatTiles를 factor 100으로 부른다 — 자기 구현으로 되돌아가지 않는다", () => {
    const seen: unknown[] = [];
    const engine = {
      threatTiles: (_g: unknown, u: { id: string }, factor: number) => {
        seen.push([u.id, factor]);
        return [{ x: 1, y: 1 }, { x: 3, y: 4 }];
      },
      // 종전 경로로 되돌아가면 여기서 터진다(조용한 재구현 방지).
      moveBudgetOn: () => { throw new Error("자기 구현 금지 — threatTiles에 위임한다"); },
      attackRange: () => { throw new Error("자기 구현 금지 — threatTiles에 위임한다"); },
    };
    const zones = threatZones(engine, game, [foe]);
    expect(seen).toEqual([["foe", 100]]);
    expect([...zones[0]!.tiles].sort((a, b) => a - b)).toEqual([1 * 8 + 1, 4 * 8 + 3]);
  });

  it("행동을 마친 적도 위험으로 센다 — `acted`는 여기서 안 본다", () => {
    const engine = { threatTiles: () => [{ x: 5, y: 5 }] };
    expect(threatZones(engine, game, [foe])[0]!.tiles.size).toBe(1);
  });
});
