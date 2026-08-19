import type { BoardProps } from "../lib/fe17";
import type { CommandId } from "../lib/commands";

/**
 * 유닛 커맨드 메뉴 — 인게임 우측 세로 메뉴의 재현(2026-08-19 사용자 지시).
 * ☠표시 전용이다: 어떤 커맨드가 서는지(`availableCommands`)와 실행은 BoardIsland가 소유한다.
 * 여기서 게이트를 다시 판정하면 룰이 두 벌로 갈라진다.
 *
 * 실기 대응 = `MapUnitCommandMenu`. 항목 순서는 lib/commands.ts의 COMMAND_ORDER가 정본이고,
 * 한 번에 보이는 행 수 10은 실기 `SetShowRowNum(10)` 실측이다(넘치면 스크롤).
 */
export interface CommandMenuProps {
  commands: readonly CommandId[];
  labels: BoardProps["labels"]["commands"];
  /** 인게이지 기술 항목의 라벨 — 실기는 기술명을 그대로 쓴다(부재 시 i18n 폴백). */
  artName?: string;
  /** 지금 고른 커맨드(대상 지정 중) — 시안 강조. */
  active?: CommandId;
  /** 호버·포커스 중인 항목 — 설명문은 이 항목 옆에 붙는다(실기 커서 문법). */
  hovered?: CommandId;
  onPick: (id: CommandId) => void;
  onHover: (id: CommandId | undefined) => void;
}

export default function CommandMenu(p: CommandMenuProps) {
  if (p.commands.length === 0) return null;
  const cursor = p.hovered ?? p.active;
  return (
    <nav className="cmd-menu" aria-label={p.labels.attack.label}>
      <ul onMouseLeave={() => p.onHover(undefined)}>
        {p.commands.map((id) => {
          const entry = p.labels[id];
          const label = id === "engageArt" ? (p.artName ?? entry.label) : entry.label;
          const on = cursor === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={[on && "on", p.active === id && "picked"].filter(Boolean).join(" ") || undefined}
                onMouseEnter={() => p.onHover(id)}
                onFocus={() => p.onHover(id)}
                onClick={() => p.onPick(id)}
              >
                <span className="cmd-label">{label}</span>
                {on && entry.help !== undefined && <span className="cmd-help">{entry.help}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
