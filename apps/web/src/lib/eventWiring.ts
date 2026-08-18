import type { EventHost } from "@fesim/engine/events";
import type { BoardProps } from "./fe17";
import { baseReduce, projectUnit, type EventWiring } from "./boardStore";

/**
 * 이벤트 배선 조립 — ☠**별도 모듈인 것이 요점**이다.
 * boardStore에 두면 열람(/s/) 청크가 이 코드를 함께 물고 간다(트리셰이킹 미적용 실측, 2026-08-18).
 * 제작 경로(BoardIsland)와 기보 생성 도구(tools/replay)만 임포트한다 — 둘이 **같은 배선**을 써야
 * 도구가 만든 기보와 브라우저 재생이 어긋나지 않는다.
 */
/** 이벤트 모듈은 **타입만** 참조한다 — 값 임포트가 되는 순간 fengari가 번들에 실린다. */
type EventsModule = typeof import("@fesim/engine/events");

export function eventWiringFor(
  props: BoardProps,
  mod: EventsModule,
  commonSources?: Record<string, string>,
): EventWiring | undefined {
  const script = props.script;
  if (script === undefined) return undefined;
  const sources = { ...commonSources, ...script.sources };
  return {
    create(difficulty) {
      const host: EventHost = {
        spawnGroup: (group, state) =>
          props.units.flatMap((u, i) => {
            if (u.group !== group) return [];
            // ☠id 계약(u{i} = visuals 조회 키)상 같은 그룹 재스폰은 미재현 — 원기는 중복 허용(장부 events.dispos).
            if (state.units.some((placed) => placed.id === `u${i}`)) return [];
            const unit = projectUnit(props, i, difficulty);
            return unit === undefined ? [] : [unit];
          }),
        skillRow: (sid) => script.skills[sid],
        // 인물 이름 ID — person.xml Name 사영(SSG가 유닛에 굳힘). 부재 = 엔진이 정직 거부한다.
        mpid: (pid) => props.units.find((u) => u.pid === pid)?.mpid,
        // IID → 채널·스냅숏 — SSG가 굳힌 script.items만 안다(클라이언트엔 items 표가 없다).
        gainItem: (iid) => script.items?.[iid] as never,
        // TID → 지형 1칸 — SSG가 굳힌 script.terrains만 안다(클라이언트엔 terrain 표가 없다).
        terrainCell: (tid) => {
          const row = script.terrains?.[tid];
          if (row === undefined) return undefined;
          return {
            cell: row.cell,
            ...(row.cost !== undefined ? { cost: row.cost } : {}),
            display: { color: row.color, name: row.name },
          };
        },
        godUnit: (_unit, gid) => {
          const god = script.gods[gid];
          if (god === undefined) return undefined;
          // 기술(engageArt)·인게이지 스킬 세트는 미배선(발현 시 흡수) — 게이지·엠블렘 무기까지 사영.
          return { engage: { ...god.engage }, ...(god.engageWeapons !== undefined ? { engageWeapons: god.engageWeapons } : {}) };
        },
      };
      const session = mod.createEventSession({ sources, chapter: script.chapter, host });
      return mod.createEventedReducer(baseReduce, session);
    },
  };
}
