import type { BattleAction, BattleEvent } from "@fesim/shared";
import { settleOutcome, type GameState, type RandomSource } from "../battle.js";
import type { Reduce } from "../replay.js";
import { createEventSession, type EventHost, type EventSession, type HookResult } from "./session.js";

/**
 * 이벤트 구동 리듀서 — 전투 리듀서(순수) 앞뒤에 Lua 이벤트 발화를 얹는다.
 * ☠이 모듈은 fengari(65KB gzip)를 당긴다 — 열람(/s/) 경로에서 임포트 금지(성능 게이트).
 * 열람 재생은 기록된 절대 이벤트로 복원한다(replay.applyStep의 endPhase 오버레이).
 */
export function createEventedReducer(base: Reduce, session: EventSession): Reduce {
  const settle = (r: HookResult): GameState =>
    // 이벤트 콜백도 유닛을 죽이고 변수(勝利/敗北)를 세운다 — 같은 승패 판정을 통과시킨다.
    settleOutcome({ ...r.state, events: r.state.events });

  return function reduce(state: GameState, action: BattleAction, rng: RandomSource): GameState {
    if (action.type === "setup") {
      // 챕터 초기화 = 기보 스텝 0 — Startup(등록)·MapOpening(초기 스폰)·1턴 개시 발화가 이벤트로 실린다.
      return settle(session.setup(state));
    }
    if (action.type === "endPhase") {
      // TurnEnd(현 페이즈) → 전환 → Turn·TurnAfter(새 페이즈) — MapSequence 발화 순서(LUA_BINDINGS §7).
      const pre = settle(session.turnEnd(state));
      if (pre.outcome !== undefined && state.outcome === undefined) return pre;
      const mid = base(pre, action, rng);
      const post = settle(session.turnBegin(mid));
      return { ...post, events: [...pre.events, ...mid.events, ...post.events] };
    }

    let collected: BattleEvent[] = [];
    let cur = state;
    const isBattle = action.type === "attack" || action.type === "engageAttack";
    if (isBattle) {
      const r = session.battle(cur, ["battleBefore", "battleTalk"], action.unit, action.target);
      cur = settle(r);
      collected = [...collected, ...r.events];
      if (cur.outcome !== undefined && state.outcome === undefined) return { ...cur, events: collected };
    }

    const next = base(cur, action, rng);
    collected = [...collected, ...next.events];
    let after: GameState = { ...next, events: collected };

    // 사망 발화(Die) — 이벤트 스크립트의 격파 트리거(예: m002 루미엘 1차 격파 → 국면 전환 플래그).
    const deaths = next.events.filter((e): e is Extract<BattleEvent, { type: "death" }> => e.type === "death");
    if (deaths.length > 0) {
      const r = session.died(after, deaths.map((e) => e.unit));
      after = settle({ ...r, state: { ...r.state, events: [...collected, ...r.events] } });
      collected = after.events;
    }
    if (isBattle && after.outcome === undefined) {
      const r = session.battle(after, ["battleAfter"], action.unit, action.target);
      after = settle({ ...r, state: { ...r.state, events: [...collected, ...r.events] } });
      collected = after.events;
    }
    // 행동 주체의 종료 폴링(Fixed)·영역 진입(Area) — 유닛 행동에만. 행동 미소모(이동·교환·발동)는 Area만.
    if (after.outcome === undefined && "unit" in action) {
      const terminal = !["move", "engage", "trade"].includes(action.type);
      const r = session.acted(after, action.unit, terminal);
      after = settle({ ...r, state: { ...r.state, events: [...collected, ...r.events] } });
    }
    return after;
  };
}

export { createEventSession } from "./session.js";
export type { EventHost, EventSession, HookResult } from "./session.js";
