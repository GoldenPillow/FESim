import type { BoardProps } from "../lib/fe17";

/**
 * 소지품 화면 — 인게임 `MapItemMenu.ItemMenu`의 재현(사용자 스크린샷 2).
 * ☠표시 전용이다: 목록 구성과 "사용 시 능력" 계산은 BoardIsland가 엔진 공식으로 산출해 넘긴다.
 *
 * 실기 실측 = 목록 5칸 고정(`SetShowRowNum(5)`) · 커서 초기 위치는 현재 장비
 * (`ItemMenu.GetMenuItemIndexEquipped` 0x217FD00) · 엠블렘 무기는 시안
 * (`ItemData.Flags.Engage`=128 → `UnitItem.GetFontColor` 0x1F95D70).
 * 색은 코드에 없어(GameColor가 Unity 자산) 실기 스크린샷 픽셀에서 뽑았다.
 */
export interface ItemRow {
  key: string;
  name: string;
  /** 엠블렘(인게이지) 무기 — 시안으로 갈린다. */
  engage?: boolean;
  /** 소모품 잔여 — 무기는 내구도가 없다(FE Engage 설계). */
  uses?: number;
  /** 지금 쓸 수 없는 항목(사거리 밖·대상 없음·침묵 등) — 회색. */
  dim?: boolean;
  /** 사용형만 실행된다. 무기·지팡이는 정보 표시 전용(장비 변경 액션이 엔진에 없다). */
  onUse?: () => void;
}

/** 사용 시 능력 한 줄 — now = 그 항목을 들었을 때의 값, diff = 현 장비 대비. */
export interface StatDelta {
  label: string;
  now: number;
  diff: number;
}

export interface ItemPanelProps {
  rows: readonly ItemRow[];
  /** 커서가 놓인 항목(호버·선택) — 능력표는 이 항목 기준이다. */
  cursor?: string;
  stats?: readonly StatDelta[];
  /** 사거리 표기(예: "1" 또는 "1-2"). */
  reach?: string;
  labels: BoardProps["labels"];
  onCursor: (key: string | undefined) => void;
}

export default function ItemPanel(p: ItemPanelProps) {
  return (
    <div className="item-panel" role="group" aria-label={p.labels.commands.item.label}>
      <ul className="ip-list" onMouseLeave={() => p.onCursor(undefined)}>
        {p.rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              className={[r.key === p.cursor && "on", r.engage === true && "engage", r.dim === true && "dim"]
                .filter(Boolean)
                .join(" ") || undefined}
              onMouseEnter={() => p.onCursor(r.key)}
              onFocus={() => p.onCursor(r.key)}
              onClick={() => r.onUse?.()}
            >
              <span className="ip-name">{r.name}</span>
              {r.uses !== undefined && <span className="ip-uses">{r.uses}</span>}
            </button>
          </li>
        ))}
      </ul>

      {p.stats !== undefined && p.stats.length > 0 && (
        <dl className="ip-stats">
          {p.stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>
                {s.now}
                {s.diff !== 0 && <em className={s.diff > 0 ? "up" : "down"}>{s.diff > 0 ? "▲" : "▼"}</em>}
              </dd>
            </div>
          ))}
          {p.reach !== undefined && (
            <div>
              <dt>{p.labels.itemStats.rng}</dt>
              <dd>{p.reach}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
