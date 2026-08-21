import type { EventHost } from "@fesim/engine/events";
import type { SkillRow } from "@fesim/shared";
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
        godUnit: (unit, gid) => {
          const god = script.gods[gid];
          if (god === undefined) return undefined;
          // 기술 = 받는 유닛의 스타일로 고른다(m004 세리카→세리누 ワープライナ).
          // gid를 함께 실어야 배지가 교체를 따라간다(해제 = patch null → 필드 삭제).
          // ☠문장사 패시브(싱크로·인게이지 스킬)는 **반드시 함께 실린다** — 종전엔 게이지·무기·기술만
          //   실어서 Lua로 붙인 엠블렘의 패시브가 통째로 죽어 있었다(m002 2회전 뤼미에르가 迅走 이동+5를
          //   못 받아 거리를 못 좁혔다 — 사용자 관측 2026-08-18). 오류도 경고도 없는 조용한 결손이었다.
          const engageArt = god.arts?.[unit.style ?? ""] ?? god.arts?.[""];
          // 패시브도 스타일로 갈린다(GetStyleSkill) — 迅走 본체는 이동 +5, SID_迅走_竜族은 +6이다.
          // 사영은 받을 유닛을 몰라 치환표만 싣는다(fe17.ts script.gods.styles) — 고르는 것은 여기다.
          const swap = god.styles?.[unit.style ?? ""];
          const styled = (rows?: SkillRow[]): SkillRow[] | undefined =>
            rows === undefined || swap === undefined ? rows : rows.map((r) => swap[r.Sid] ?? r);
          const synchroSkills = styled(god.synchroSkills);
          const engagedSkills = styled(god.engagedSkills);
          return {
            gid,
            engage: { ...god.engage },
            ...(synchroSkills !== undefined ? { synchroSkills } : {}),
            // engagedSkills는 **교체본**이다(effectiveSkills가 skills 대신 이것만 본다) — 사람 스킬을
            // 함께 담지 않으면 발동하는 순간 고유 스킬이 사라진다. Sid로 중복만 걷는다.
            ...(engagedSkills !== undefined
              ? {
                  engagedSkills: [...(unit.skills ?? []), ...engagedSkills].filter(
                    (row, i, all) => all.findIndex((r) => r.Sid === row.Sid) === i,
                  ),
                }
              : {}),
            ...(god.engageWeapons !== undefined ? { engageWeapons: god.engageWeapons } : {}),
            ...(engageArt !== undefined ? { engageArt } : {}),
          };
        },
      };
      const session = mod.createEventSession({ sources, chapter: script.chapter, host });
      return mod.createEventedReducer(baseReduce, session);
    },
  };
}
