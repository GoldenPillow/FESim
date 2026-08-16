import type { Locale } from "./i18n";

/**
 * 국면 = 챕터별 명시 설정(범용 규칙 추측 금지). 정식 트리거(격파 이벤트)는 M2 엔진 몫.
 * 항목이 없는 챕터는 단일 국면 — 전 유닛을 한 번에 그리고 컨트롤을 숨긴다.
 */
export interface PhaseDef {
  id: string;
  label: Record<Locale, string>;
  groups: string[];
}

const BY_MAP: Record<string, PhaseDef[]> = {
  m002: [
    {
      id: "1",
      label: { en: "Turn 1", ko: "1회전" },
      groups: ["Player", "Enemy", "EnemyIllusion"],
    },
    {
      id: "2",
      label: { en: "After Lumera falls", ko: "뤼미에르 격파 후" },
      groups: ["Player", "Enemy2", "EnemyIllusion2_1", "EnemyIllusion2_2", "EnemyIllusion2_3"],
    },
  ],
};

export const phasesFor = (mapId: string): PhaseDef[] => BY_MAP[mapId] ?? [];

/** 한 국면에만 속하면 그 국면 id, 여러 국면(또는 국면 없음)이면 undefined = 항상 표시. */
export const phaseOfGroup = (mapId: string, group: string): string | undefined => {
  const ids = phasesFor(mapId)
    .filter((p) => p.groups.includes(group))
    .map((p) => p.id);
  return ids.length === 1 ? ids[0] : undefined;
};
