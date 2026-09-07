import { STAT_KEYS } from "@fesim/engine";
import { COMBAT_COL, PALETTES, STAT_EN, toneColor, type CombatKey, type ExportRow, type SharePalette, type ShareTheme } from "../lib";

/**
 * 엔트리 카드(PNG) 레이아웃 — ☠순수 함수. canvas·DOM을 만지지 않고, 텍스트 폭은 주입된 measure로만 잰다.
 * 규격 정본 = design/builder_export.md §2-1b·§6-a(5): 폭 840 고정 · 신분 열 150 · 스탯 열 74x9 ·
 * 한글 14px 이상 · 숫자 12px 이상 · 1px 괘선.
 * ☠값을 다시 계산하지 않는다 — ExportRow의 문자열은 이미 표와 같은 포맷터를 지난 것이다(lib.ts).
 * ☠좌표·크기를 전부 정수로 내는 것이 규격이다 — 반픽셀에 걸린 1px 괘선은 2px 회색이 되고,
 *   디시가 리사이즈를 안 타도(840 < 850) 그 회색은 그대로 남는다.
 */

/* ── 고정 팔레트 — global.css `:root`의 **다크 테마 값**을 상수로 박제한다(빌더 기본 테마 = 다크, 2026-09-07 개정).
   ☠런타임 getComputedStyle 금지: 게시판 배경이 무엇일지 모르므로 카드는 테마를 안 따라가고,
   읽어 쓰면 같은 입력이 기기·테마마다 다른 그림이 되어 회귀 테스트가 성립하지 않는다. ── */
/* 팔레트·색조는 `../lib`가 소유한다 — ☠HTML 산출물과 같은 값을 읽어야 한 쪽만 낡지 않는다. */

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "Cascadia Mono", monospace';

/**
 * 폰트 토큰 → CSS font 축약형. ☠로케일 문자가 실릴 수 있는 토큰은 전부 14px 이상이다
 * (한글 13px 하한 / 14px 안전 — §2-1b 실측). 12px은 ASCII 전용 자리(스탯 헤더·성장률 %)뿐.
 */
export const FONTS = {
  title: `700 17px ${SANS}`,
  colHead: `500 12px ${MONO}`,
  name: `700 15px ${SANS}`,
  meta: `400 14px ${SANS}`,
  stat: `700 15px ${SANS}`,
  growth: `400 12px ${SANS}`,
  label: `600 14px ${SANS}`,
  value: `700 14px ${SANS}`,
  chip: `600 14px ${SANS}`,
} as const;

export type FontToken = keyof typeof FONTS;

export type Measure = (text: string, font: FontToken) => number;

export type PaintOp =
  | { op: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { op: "text"; x: number; y: number; text: string; font: FontToken; fill: string }
  /** 박스 안 contain 배치(☠확대 금지). tint = 흰 실루엣 마스크 아이콘의 칠할 색(무기군·특효). */
  | { op: "icon"; x: number; y: number; w: number; h: number; src: string; tint?: string };

/** 칸을 넘친 텍스트 — ☠말없이 자르지 않는다는 규약의 산출물(rules/seams.md "못 찾으면 드러내라"). */
export interface OverflowNote {
  /** 넘친 칸의 주인. 빈 문자열 = 카드 공통(제목·헤더·규격). */
  pid: string;
  field: string;
  /** 자르기 전 원문. */
  text: string;
  width: number;
  max: number;
}

export interface CardLayout {
  width: number;
  height: number;
  ops: PaintOp[];
  overflow: OverflowNote[];
}

/** 카드가 쓰는 라벨 — BuilderLabels가 그대로 들어맞는다(구조적 부분집합, 표와 같은 문자열). */
export interface CardLabels {
  combat: Record<CombatKey, string>;
  might: string;
  weight: string;
  internalShort: string;
  jobNone: string;
  unavailable: string;
}

export interface CardLayoutOptions {
  /** 산출 테마 — 기본 다크(빌더 기본 테마가 다크다). 내보내기 시점의 `data-theme`를 그대로 넘긴다. */
  theme?: ShareTheme;
  labels: CardLabels;
  /** 카드 제목(프리셋 이름 등) — 없으면 제목 줄이 서지 않는다. */
  title?: string;
  /** 신분 열 헤더 — 표의 corner-label과 같은 문구. */
  identityLabel?: string;
}

/* ── 규격 상수 — ☠재설계 금지(§6-a(5)). 신분 열 150은 en 클래스명 125.7px가 정했다. ── */
const WIDTH = 840;
const PAD = 12;
const CONTENT = WIDTH - PAD * 2;
const ID_W = 150;
const STAT_W = 74;
const STAT_X = PAD + ID_W;
/** 신분 열 텍스트 상자 — 우측 6px은 스탯 열과의 숨구멍. */
const ID_BOX = ID_W - 6;
const TITLE_H = 24;
const HEAD_H = 22;
const FACE_W = 106;
const FACE_H = 44;
const LINE_H = 19;
const STAT_H = 22;
const GROWTH_H = 17;
const COMBAT_H = 38;
const CHIP_H = 26;
const CHIP_GAP = 14;
const ICON = 24;

const ELLIPSIS = "…";

interface Chip {
  text: string;
  icon?: string;
  /** 흰 실루엣 마스크 아이콘(무기군·특효)만 — 칠하지 않으면 흰 카드에서 사라진다. */
  tint?: string;
  fill: string;
  field: string;
}

const icon = (src: string | undefined): { icon?: string } => (src !== undefined ? { icon: src } : {});

/** 장비·스킬 띠 — 표의 칩들과 같은 순서(무기 → 각인 → 반지 → 계승 → 고유 → 적성 → 특효). */
function chipsOf(row: ExportRow, C: SharePalette): Chip[] {
  const out: Chip[] = [];
  if (row.weapon !== undefined) {
    const plus = row.weapon.plus > 0 ? ` +${row.weapon.plus}` : "";
    out.push({ text: `${row.weapon.name}${plus}`, ...icon(row.weapon.icon), fill: C.ink, field: "weapon" });
  }
  if (row.engrave !== undefined) out.push({ text: row.engrave.name, ...icon(row.engrave.icon), fill: C.ink, field: "engrave" });
  if (row.ring !== undefined) {
    out.push({ text: `${row.ring.name} Lv ${row.ring.bond}`, ...icon(row.ring.icon), fill: C.engage, field: "ring" });
  }
  for (const s of row.inherits) out.push({ text: s.name, ...icon(s.icon), fill: C.ink, field: "inherit" });
  if (row.ownSkill !== undefined) out.push({ text: row.ownSkill.name, ...icon(row.ownSkill.icon), fill: C.ink, field: "ownSkill" });
  for (const r of row.ranks) {
    // 무기군 아이콘은 흰 실루엣(builder.css .entry-kind가 currentColor로 칠한다) — 고유 적성은 블루.
    const fill = r.innate ? C.engage : C.muted;
    out.push({ text: r.rank, ...icon(r.icon), tint: fill, fill, field: "rank" });
  }
  for (const e of row.efficacies) out.push({ text: e.name, ...icon(e.icon), tint: C.muted, fill: C.muted, field: "efficacy" });
  return out;
}


/**
 * 카드 한 장의 배치 — 헤더 1줄 + 엔트리마다 [신분 열 | 스탯·전투력 | 장비 띠] 블록.
 * 12엔트리는 세로로 늘려 담는다(§6-a(5): 위험 축은 가로 하나뿐이라 세로는 공짜다).
 */
export function layoutCard(rows: readonly ExportRow[], opts: CardLayoutOptions, measure: Measure): CardLayout {
  // ★테마 반영(2026-09-07 사용자 지시) — 내보내는 시점의 테마를 따라간다. 기본은 빌더 기본 테마(다크).
  const C = PALETTES[opts.theme ?? "dark"];
  const ops: PaintOp[] = [];
  const overflow: OverflowNote[] = [];
  const L = opts.labels;

  const text = (x: number, base: number, s: string, font: FontToken, fill: string): void => {
    ops.push({ op: "text", x: Math.round(x), y: Math.round(base), text: s, font, fill });
  };
  /** 칸에 맞춰 자르고 **반드시 보고**한다 — 보고 없는 자르기가 조용한 결손이다. */
  const fit = (s: string, font: FontToken, max: number, pid: string, field: string): string => {
    const w = measure(s, font);
    if (w <= max) return s;
    overflow.push({ pid, field, text: s, width: Math.ceil(w), max });
    let cut = s;
    while (cut.length > 1 && measure(cut + ELLIPSIS, font) > max) cut = cut.slice(0, -1);
    return cut + ELLIPSIS;
  };
  const centerX = (s: string, font: FontToken, colX: number): number =>
    colX + Math.round((STAT_W - measure(s, font)) / 2);

  // ☠열 수가 늘면 840 전제가 조용히 깨진다 — 잘린 그림 대신 보고로 드러낸다.
  const need = ID_W + STAT_W * STAT_KEYS.length;
  if (need !== CONTENT) overflow.push({ pid: "", field: "columns", text: String(STAT_KEYS.length), width: need, max: CONTENT });

  let y = PAD;
  if (opts.title !== undefined && opts.title !== "") {
    text(PAD, y + 17, fit(opts.title, "title", CONTENT, "", "title"), "title", C.ink);
    y += TITLE_H;
  }

  ops.push({ op: "rect", x: PAD, y, w: CONTENT, h: HEAD_H, fill: C.sunken });
  text(PAD + 6, y + 15, fit(opts.identityLabel ?? "Character", "label", ID_BOX, "", "identityLabel"), "label", C.muted);
  STAT_KEYS.forEach((key, i) => {
    const label = STAT_EN[key];
    text(centerX(label, "colHead", STAT_X + i * STAT_W), y + 15, label, "colHead", C.muted);
  });
  y += HEAD_H;
  ops.push({ op: "rect", x: PAD, y, w: CONTENT, h: 1, fill: C.rule });
  y += 1;

  for (const row of rows) {
    const top = y;
    const dim = row.ineligible;

    /* 신분 열 — 초상 · [이름 + In.lv] · 직업(전용직 밖이면 표식 줄이 하나 더). */
    let idy = top + 4;
    if (row.face !== undefined) {
      ops.push({ op: "icon", x: PAD, y: idy, w: FACE_W, h: FACE_H, src: row.face });
      idy += FACE_H + 3;
    }
    const inlv = `${L.internalShort} ${row.internal}`;
    const inlvW = Math.ceil(measure(inlv, "meta"));
    const nameBase = idy + 16;
    text(PAD, nameBase, fit(row.name, "name", ID_BOX - inlvW - 8, row.pid, "name"), "name", dim ? C.muted : C.ink);
    text(PAD + ID_BOX - inlvW, nameBase, inlv, "meta", C.muted);
    const jobBase = nameBase + LINE_H;
    const job = row.job ?? L.jobNone;
    text(PAD, jobBase, fit(job, "meta", ID_BOX, row.pid, "job"), "meta", row.job === undefined ? C.muted : C.ink);
    let idBottom = jobBase + 5;
    if (dim) {
      text(PAD, jobBase + LINE_H, fit(L.unavailable, "meta", ID_BOX, row.pid, "unavailable"), "meta", C.danger);
      idBottom = jobBase + LINE_H + 5;
    }

    /* 스탯 값 행 — 열 순서는 STAT_KEYS(표와 같은 축). */
    const statTop = top + 4;
    const statBase = statTop + 17;
    const hasGrowth = row.stats.some((s) => s.growth !== undefined);
    row.stats.forEach((s, i) => {
      const colX = STAT_X + i * STAT_W;
      // ☠숫자는 자르지 않는다 — "12…"는 거짓말이다. 넘치면 그대로 그리고 보고만 한다.
      const w = measure(s.text, "stat");
      if (w > STAT_W - 6) overflow.push({ pid: row.pid, field: `stat:${s.key}`, text: s.text, width: Math.ceil(w), max: STAT_W - 6 });
      text(colX + Math.round((STAT_W - w) / 2), statBase, s.text, "stat", toneColor(C, s.tone));
      if (s.growth !== undefined) {
        const g = `${s.growth}%`;
        // 고유 성장률 — 표(BuilderIsland text-gold)와 같은 색. pgrow(블루)는 tone "buffed" 전용이다.
        text(centerX(g, "growth", colX), statBase + 15, g, "growth", C.gold);
      }
    });

    /* 전투력 행 — 표(CombatCells)와 같은 열 배정: HP=위력 · RES=빈칸 · BLD=무게 · 나머지 COMBAT_COL. */
    const combatTop = statTop + STAT_H + (hasGrowth ? GROWTH_H : 0) + 2;
    const spdDown = row.stats.some((s) => s.key === "spd" && s.tone === "down");
    STAT_KEYS.forEach((key, i) => {
      const ck = COMBAT_COL[key];
      const pair =
        key === "hp"
          ? row.might === undefined
            ? undefined
            : { label: L.might, value: row.might, fill: C.ink }
          : key === "bld"
            ? row.weight === undefined
              ? undefined
              : { label: L.weight, value: row.weight, fill: spdDown ? C.danger : C.ink }
            : ck === undefined
              ? undefined
              : { label: L.combat[ck], value: row.combat[ck], fill: C.ink };
      if (pair === undefined) return;
      const colX = STAT_X + i * STAT_W;
      text(centerX(pair.label, "label", colX), combatTop + 14, pair.label, "label", C.muted);
      text(centerX(pair.value, "value", colX), combatTop + 32, pair.value, "value", pair.fill);
    });

    /* 장비·스킬 띠 — 신분 열 아래까지 콘텐츠 폭 전체를 쓰고 넘치면 줄바꿈(세로는 공짜다). */
    let cy = Math.max(idBottom, combatTop + COMBAT_H);
    const chips = chipsOf(row, C);
    if (chips.length > 0) {
      cy += 2;
      let cx = PAD;
      for (const chip of chips) {
        const lead = chip.icon !== undefined ? ICON + 4 : 0;
        const label = fit(chip.text, "chip", CONTENT - lead, row.pid, `chip:${chip.field}`);
        const w = lead + Math.ceil(measure(label, "chip"));
        if (cx > PAD && cx + w > PAD + CONTENT) {
          cx = PAD;
          cy += CHIP_H;
        }
        if (chip.icon !== undefined) {
          ops.push({ op: "icon", x: cx, y: cy + 1, w: ICON, h: ICON, src: chip.icon, ...(chip.tint !== undefined ? { tint: chip.tint } : {}) });
        }
        text(cx + lead, cy + 18, label, "chip", chip.fill);
        cx += w + CHIP_GAP;
      }
      cy += CHIP_H;
    }
    y = cy + 4;
    ops.push({ op: "rect", x: PAD, y, w: CONTENT, h: 1, fill: C.rule });
    y += 1;
  }

  const height = y + PAD;
  // 바탕과 테두리는 높이가 정해진 뒤에야 그릴 수 있다 — 맨 앞에 꽂아 순서(바탕 → 내용)를 지킨다.
  ops.unshift(
    { op: "rect", x: 0, y: 0, w: WIDTH, h: height, fill: C.panel },
    { op: "rect", x: 0, y: 0, w: WIDTH, h: 1, fill: C.rule },
    { op: "rect", x: 0, y: height - 1, w: WIDTH, h: 1, fill: C.rule },
    { op: "rect", x: 0, y: 0, w: 1, h: height, fill: C.rule },
    { op: "rect", x: WIDTH - 1, y: 0, w: 1, h: height, fill: C.rule },
  );
  return { width: WIDTH, height, ops, overflow };
}
