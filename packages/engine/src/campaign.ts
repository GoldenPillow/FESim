import type { SetupUnit } from "@fesim/shared";
import type { GameState } from "./battle.js";

/**
 * 캠페인층 — 챕터 기보의 사슬(런)을 잇는 순수 함수.
 * 규약: 룰은 컴포넌트 밖에 산다. 저장·UI는 여기서 나온 값을 나르기만 한다.
 */

/**
 * 챕터 종료 국면 → 다음 챕터의 setup 로스터(키 = pid).
 *
 * ☠현재 HP는 싣지 않는다 — 챕터 개시 만HP 회복이 인게임 문법이라 부재가 곧 정답이다.
 * 사망 자군은 `removed`로 적는다: 안 적으면 다음 챕터 dispos가 그 인물을 기본 스탯으로 되살린다.
 * pid 없는 유닛은 건너뛴다(인계 키가 없으면 다음 챕터에서 슬롯을 못 찾는다).
 */
export function carryover(state: GameState): Record<string, SetupUnit> {
  const roster: Record<string, SetupUnit> = {};
  for (const u of state.units) {
    if (u.force !== 0 || u.pid === undefined) continue;
    if (u.dead) {
      roster[u.pid] = { removed: true };
      continue;
    }
    const entry: SetupUnit = { level: u.level, exp: u.exp, stats: u.stats };
    if (u.internalLevel !== undefined) entry.internalLevel = u.internalLevel;
    if (u.jid !== undefined) entry.jid = u.jid;
    if (u.growthAcc !== undefined) entry.growthAcc = u.growthAcc;
    if (u.weapons !== undefined) entry.weapons = u.weapons;
    if (u.staves !== undefined) entry.staves = u.staves;
    if (u.consumables !== undefined) entry.consumables = u.consumables;
    if (u.skills !== undefined) entry.skills = u.skills;
    // ☠인게이지는 **그 판의 상태**다 — 발동·경과 턴·기공 잔량을 물고 가면 다음 챕터가 이미
    //   발동 중인 판으로 시작하고 그 유닛은 발동을 다시 못 켠다(엔진 거부). 챕터 시작 기본값과
    //   같은 자리로 되돌린다(engageStateFor: count = min(7, limit) · turn 0 · engaging false).
    //   엠블렘 자체(gid·무기·기술·싱크로 스킬)는 인계 대상이다 — 반지는 사람이 들고 다닌다.
    if (u.engage !== undefined) {
      entry.engage = { ...u.engage, count: Math.min(7, u.engage.limit), turn: 0, engaging: false };
    }
    if (u.gid !== undefined) entry.gid = u.gid;
    if (u.synchroSkills !== undefined) entry.synchroSkills = u.synchroSkills;
    if (u.engagedSkills !== undefined) entry.engagedSkills = u.engagedSkills;
    if (u.engageWeapons !== undefined) entry.engageWeapons = u.engageWeapons;
    if (u.engageArt !== undefined) entry.engageArt = u.engageArt;
    roster[u.pid] = entry;
  }
  return roster;
}
