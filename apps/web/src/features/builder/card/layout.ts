import { STAT_KEYS, type StatKey } from "@fesim/engine";
import { COMBAT_COL, PALETTES, STAT_EN, toneColor, type CombatKey, type ExportRow, type ShareTheme } from "../lib";

/**
 * 엔트리 카드(PNG) 레이아웃 — ☠순수 함수. canvas·DOM을 만지지 않고, 텍스트 폭은 주입된 measure로만 잰다.
 * ★배치 정본 = **웹 표의 잠금 블록**(BuilderIsland `entry-locked-block` + builder.css) —
 * 헤더 1줄 · (옵션)글로벌 성장률 1줄 · 엔트리마다 4줄[성장률 / 스탯 / 반지 / 전투력]이고,
 * 왼쪽은 [신분 열(초상+이름 가로, 맨 아래 클래스·In.lv)][슬롯 열][스탯 9열]로 선다(2026-09-07 개정).
 * ☠값을 다시 계산하지 않는다 — ExportRow의 문자열은 이미 표와 같은 포맷터를 지난 것이다(lib.ts).
 * ☠좌표·크기를 전부 정수로 내는 것이 규격이다 — 반픽셀에 걸린 1px 괘선은 2px 회색이 되고,
 *   디시가 리사이즈를 안 타도(840 < 850) 그 회색은 그대로 남는다.
 */

/* 팔레트·색조는 `../lib`가 소유한다 — ☠HTML 산출물과 같은 값을 읽어야 한 쪽만 낡지 않는다. */

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "Cascadia Mono", monospace';

/**
 * 폰트 토큰 → CSS font 축약형. ☠로케일 문자가 실릴 수 있는 토큰은 전부 14px 이상이다
 * (한글 13px 하한 / 14px 안전 — §2-1b 실측). 12px은 ASCII 전용 자리(스탯 열 헤더)뿐.
 */
export const FONTS = {
  title: `700 17px ${SANS}`,
  colHead: `500 12px ${MONO}`,
  name: `700 15px ${SANS}`,
  meta: `600 14px ${SANS}`,
  stat: `700 15px ${SANS}`,
  growth: `700 14px ${SANS}`,
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
  jobNone: string;
}

/**
 * 표 헤더 아래 글로벌 성장률 행 — 상단 컨트롤이 고른 **직업의 클래스 성장률**(표의 `job-row`).
 * ☠엔트리 사영(ExportRow)에는 이 값이 없다(엔트리마다 자기 직업을 든다) — 호출부가 넘겨야 그려진다.
 * ★비계 아님 = 미배선: `BuilderIsland.cardOpts()`가 `compares[0]`을 넘기면 즉시 산다
 * (2026-09-07 이 작업은 card/ 밖 수정이 금지돼 배선을 못 했다 — 넘겨주면 그 줄이 표와 같아진다).
 */
export interface CardGlobalRow {
  /** 선택 직업명. */
  job: string;
  /** 표시 내부 레벨(1기점) — 표의 `c.internal + 1`. */
  internal: number;
  /** 그 직업의 클래스 성장률(%) — 표와 같은 `diffGrow`. */
  growth: Partial<Record<StatKey, number>>;
}

export interface CardLayoutOptions {
  /** 산출 테마 — 기본 다크(빌더 기본 테마가 다크다). 내보내기 시점의 `data-theme`를 그대로 넘긴다. */
  theme?: ShareTheme;
  labels: CardLabels;
  /** 카드 제목(프리셋 이름 등) — 없으면 제목 줄이 서지 않는다. */
  title?: string;
  /** 신분 열 헤더 — 표의 corner-label과 같은 문구. */
  identityLabel?: string;
  /** 표 헤더 아래 글로벌 성장률 행 — 없으면 그 줄이 서지 않는다. */
  globalRow?: CardGlobalRow;
}

/* ── 규격 상수 — 폭 배분의 근거(2026-09-07 헤드리스 실측 · ko 로케일 · 실데이터 전수):
   · STAT_W 56 = 전투력 라벨 최장 "필살회피"/"必殺回避" 4글자 14px = 56.0px. 9열 = 504(콘텐츠의 62%).
     ☠더 줄이면 그 라벨이 옆 열을 침범한다. en("Ddg")은 더 짧아 이 값이 전 로케일 상한이다.
   · ID_W 190 = 카드 상자 184(좌 4 + 초상 106 + 간격 6 + 이름 62 + 우 6) + 열 숨구멍 6.
     ★이름 62의 근거 = **꺾임 무릎**: 60 미만이면 4글자 이름(60.0)까지 무너져 41명 중 30명만 한 줄인데,
     62면 38명이 한 줄이고 폭을 더 줘도 41명이 되기까지(76 = ID_W 204) 슬롯 열만 122→108로 깎인다.
     남은 5글자 이름 3명은 자르거나 꺾지 않고 **초상 아래 한 줄**로 내린다(아래 참조).
   · SLOT_W 122 = 나머지. 칩 글자칸 87 = 스킬·무기·문장사·각인 494개 중 420개(85%)가 한 줄.
     넘치면 **두 줄로 늘린다** — ☠글자는 안 줄인다(위험 축은 가로 하나뿐이고 세로는 공짜다).
   ☠웹은 스킬 열 147 + 장비 열 150을 따로 두지만 840에서는 둘을 합쳐야 14px이 산다(보고 참조). ── */
const WIDTH = 840;
const PAD = 12;
const CONTENT = WIDTH - PAD * 2;
const ID_W = 190;
const SLOT_W = 122;
const STAT_W = 56;
const SLOT_X = PAD + ID_W;
const STAT_X = SLOT_X + SLOT_W;
/** 신분 열 카드 상자 — 우측 6px은 슬롯 열과의 숨구멍. */
const ID_BOX = ID_W - 6;
/** 슬롯 칩 상자 — 우측 6px은 스탯 열과의 숨구멍. */
const SLOT_BOX = SLOT_W - 6;

const TITLE_H = 24;
const HEAD_H = 22;
const GLOBAL_H = 26;
const FACE_W = 106;
const FACE_H = 44;
const ICON = 18;
/** 무기군(적성) 아이콘 — 표의 .entry-kind 16px과 같다. */
const KIND = 16;
const CHIP_LINE = 17;
const CHIP_PAD = 4;
const CHIP_GAP = 3;
const ROW_PAD = 3;
const BLOCK_PAD = 4;
/** 블록 사이 틈 — 표의 `entry-locked-block::after { inset: 3px }`가 만드는 간격. */
const BLOCK_GAP = 3;

const ELLIPSIS = "…";

/** 슬롯 열 칩 — 표의 드롭다운 상자(h-7 · border-rule · bg-sunken)를 그대로 옮긴 것. */
interface Chip {
  text: string;
  icon?: string;
  /** 흰 실루엣 마스크 아이콘(무기군·특효)만 — 칠하지 않으면 흰 카드에서 사라진다. */
  tint?: string;
  fill: string;
  field: string;
  /** 마지막 줄 꼬리 — 무기 강화 +N(표의 골드 강화 칩). */
  suffix?: { text: string; fill: string };
}

/** 상자 없는 흐름 줄(적성·특효) — 표의 `.entry-apt`처럼 아이콘+글자를 가로로 흘린다. */
interface FlowPart {
  text: string;
  icon?: string;
  tint?: string;
  fill: string;
}

const icon = (src: string | undefined): { icon?: string } => (src !== undefined ? { icon: src } : {});

/**
 * 카드 한 장의 배치 — 헤더 1줄 + (옵션)글로벌 성장률 1줄 + 엔트리마다 4줄 블록.
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
  const rect = (x: number, y: number, w: number, h: number, fill: string): void => {
    ops.push({ op: "rect", x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), fill });
  };
  /** 1px 테두리 — ☠fillRect 네 장이다(strokeRect는 반픽셀에 걸려 2px 회색이 된다). */
  const frame = (x: number, y: number, w: number, h: number, line: string): void => {
    rect(x, y, w, 1, line);
    rect(x, y + h - 1, w, 1, line);
    rect(x, y, 1, h, line);
    rect(x + w - 1, y, 1, h, line);
  };
  /** 표의 드롭다운 상자 — 배경 sunken + 1px 테두리. */
  const slotBox = (x: number, y: number, w: number, h: number): void => {
    rect(x, y, w, h, C.sunken);
    frame(x, y, w, h, C.rule);
  };

  /** 줄바꿈 — 낱말 우선, 한 낱말이 칸보다 길면 글자 단위(한글은 어디서든 꺾인다). */
  const wrapLines = (s: string, font: FontToken, max: number): string[] => {
    const lines: string[] = [];
    let cur = "";
    for (const word of s.split(" ")) {
      const joined = cur === "" ? word : `${cur} ${word}`;
      if (measure(joined, font) <= max) {
        cur = joined;
        continue;
      }
      if (cur !== "") {
        lines.push(cur);
        cur = "";
      }
      if (measure(word, font) <= max) {
        cur = word;
        continue;
      }
      let piece = "";
      for (const ch of word) {
        if (piece !== "" && measure(piece + ch, font) > max) {
          lines.push(piece);
          piece = ch;
        } else piece += ch;
      }
      cur = piece;
    }
    if (cur !== "") lines.push(cur);
    return lines.length > 0 ? lines : [""];
  };

  /**
   * 칸에 맞춰 줄을 나누고, 줄 수 상한을 넘기면 자르고 **반드시 보고**한다 —
   * 보고 없는 자르기가 조용한 결손이다. ★줄바꿈 자체는 손실이 아니라 보고하지 않는다(세로는 공짜다).
   */
  const wrapFit = (s: string, font: FontToken, max: number, maxLines: number, pid: string, field: string): string[] => {
    const all = wrapLines(s, font, max);
    if (all.length <= maxLines) return all;
    overflow.push({ pid, field, text: s, width: Math.ceil(measure(s, font)), max });
    const kept = all.slice(0, maxLines);
    let last = kept[maxLines - 1] ?? "";
    while (last.length > 1 && measure(last + ELLIPSIS, font) > max) last = last.slice(0, -1);
    kept[maxLines - 1] = last + ELLIPSIS;
    return kept;
  };
  const fit = (s: string, font: FontToken, max: number, pid: string, field: string): string =>
    wrapFit(s, font, max, 1, pid, field)[0] ?? "";

  const centerX = (s: string, font: FontToken, colX: number): number =>
    colX + Math.round((STAT_W - measure(s, font)) / 2);
  /** 스탯 열 한 칸에 가운데 정렬 — ☠숫자는 자르지 않는다("12…"는 거짓말이다). 넘치면 보고만 한다. */
  const statText = (colX: number, base: number, s: string, font: FontToken, fill: string, pid: string, field: string, max = STAT_W): void => {
    const w = measure(s, font);
    if (w > max) overflow.push({ pid, field, text: s, width: Math.ceil(w), max });
    text(colX + Math.round((STAT_W - w) / 2), base, s, font, fill);
  };

  /** 슬롯 칩 한 장 — 상자 + 아이콘 + (두 줄까지) 글자 + 꼬리(+N). 그린 높이를 돌려준다. */
  const drawChip = (x: number, y: number, chip: Chip, pid: string): number => {
    const lead = chip.icon !== undefined ? ICON + 3 : 0;
    const inner = SLOT_BOX - CHIP_PAD * 2 - lead;
    const lines = wrapFit(chip.text, "chip", inner, 2, pid, `chip:${chip.field}`);
    let tail: { x: number; y: number } | undefined;
    if (chip.suffix !== undefined) {
      const lastIdx = lines.length - 1;
      const lastW = measure(lines[lastIdx] ?? "", "chip");
      const tailW = measure(chip.suffix.text, "chip");
      if (lastW + 4 + tailW <= inner) tail = { x: lastW + 4, y: lastIdx };
      else tail = { x: 0, y: lines.length };
    }
    const rowCount = Math.max(lines.length, tail === undefined ? 0 : tail.y + 1);
    const h = rowCount * CHIP_LINE + CHIP_PAD * 2;
    slotBox(x, y, SLOT_BOX, h);
    if (chip.icon !== undefined) {
      ops.push({
        op: "icon",
        x: Math.round(x + CHIP_PAD),
        y: Math.round(y + Math.round((h - ICON) / 2)),
        w: ICON,
        h: ICON,
        src: chip.icon,
        ...(chip.tint !== undefined ? { tint: chip.tint } : {}),
      });
    }
    const tx = x + CHIP_PAD + lead;
    lines.forEach((line, i) => {
      text(tx, y + CHIP_PAD + 13 + i * CHIP_LINE, line, "chip", chip.fill);
    });
    if (chip.suffix !== undefined && tail !== undefined) {
      text(tx + tail.x, y + CHIP_PAD + 13 + tail.y * CHIP_LINE, chip.suffix.text, "chip", chip.suffix.fill);
    }
    return h;
  };

  /** 상자 없는 흐름 줄 — 아이콘+글자를 가로로 흘리고 칸을 넘치면 줄을 바꾼다(표의 적성 칸과 같은 모양). */
  const drawFlow = (x: number, y: number, parts: readonly FlowPart[]): number => {
    let cx = x;
    let cy = y;
    let lines = 1;
    for (const part of parts) {
      const lead = part.icon !== undefined ? KIND + 3 : 0;
      const w = lead + Math.ceil(measure(part.text, "chip"));
      if (cx > x && cx + w > x + SLOT_BOX) {
        cx = x;
        cy += CHIP_LINE;
        lines += 1;
      }
      if (part.icon !== undefined) {
        ops.push({
          op: "icon",
          x: Math.round(cx),
          y: Math.round(cy + 1),
          w: KIND,
          h: KIND,
          src: part.icon,
          ...(part.tint !== undefined ? { tint: part.tint } : {}),
        });
      }
      text(cx + lead, cy + 13, part.text, "chip", part.fill);
      cx += w + 8;
    }
    return lines * CHIP_LINE;
  };

  // ☠열 수가 늘면 840 전제가 조용히 깨진다 — 잘린 그림 대신 보고로 드러낸다.
  const need = ID_W + SLOT_W + STAT_W * STAT_KEYS.length;
  if (need !== CONTENT) overflow.push({ pid: "", field: "columns", text: String(STAT_KEYS.length), width: need, max: CONTENT });

  let y = PAD;
  if (opts.title !== undefined && opts.title !== "") {
    text(PAD, y + 17, fit(opts.title, "title", CONTENT, "", "title"), "title", C.ink);
    y += TITLE_H;
  }

  /* 헤더 — 표의 thead 1행(신분 열 corner-label + 스탯 영문 라벨). 슬롯 열 머리는 표와 같이 비운다. */
  rect(PAD, y, CONTENT, HEAD_H, C.sunken);
  text(PAD + 6, y + 15, fit(opts.identityLabel ?? "Character", "label", ID_BOX, "", "identityLabel"), "label", C.muted);
  STAT_KEYS.forEach((key, i) => {
    const label = STAT_EN[key];
    text(centerX(label, "colHead", STAT_X + i * STAT_W), y + 15, label, "colHead", C.muted);
  });
  y += HEAD_H;
  rect(PAD, y, CONTENT, 1, C.rule);
  y += 1;

  /* 글로벌 성장률 행 — 표의 job-row: [선택 직업명][In.lv][클래스 성장률 %(골드)]. */
  const g = opts.globalRow;
  if (g !== undefined) {
    text(PAD + 6, y + 18, fit(g.job, "meta", ID_BOX - 12, "", "globalJob"), "meta", C.ink);
    const inlv = `In.lv ${g.internal}`;
    text(SLOT_X + Math.round((SLOT_W - measure(inlv, "meta")) / 2), y + 18, inlv, "meta", C.gold);
    STAT_KEYS.forEach((key, i) => {
      const v = g.growth[key];
      if (v === undefined) return;
      statText(STAT_X + i * STAT_W, y + 18, `${v}%`, "growth", C.gold, "", `globalGrowth:${key}`);
    });
    y += GLOBAL_H;
    rect(PAD, y, CONTENT, 1, C.rule);
    y += 1;
  }

  for (const row of rows) {
    const top = y;
    let ry = top + BLOCK_PAD;

    /* ── 1행 = 고유 성장률(골드) — ★표와 같이 **스탯 행 위**에 선다(2026-09-07 개정). ── */
    {
      const body = ry;
      let h = 0;
      row.stats.forEach((s, i) => {
        if (s.growth === undefined) return;
        h = 20;
        statText(STAT_X + i * STAT_W, body + 15, `${s.growth}%`, "growth", C.gold, row.pid, `growth:${s.key}`);
      });
      if (h > 0) ry = body + h + ROW_PAD;
    }

    /* ── 2행 = 스탯 · 슬롯[개인 고유 / 직업 고유 / 적성] ── */
    {
      const body = ry;
      let slotH = 0;
      if (row.ownSkill !== undefined) {
        slotH += drawChip(SLOT_X, body, { text: row.ownSkill.name, ...icon(row.ownSkill.icon), fill: C.ink, field: "ownSkill" }, row.pid);
      }
      // 직업 고유(兵種) 스킬 — 표의 밴드1 장비 열과 같은 자리(2026-09-08). 기본직은 없어 건너뛴다.
      if (row.jobSkill !== undefined) {
        if (slotH > 0) slotH += CHIP_GAP;
        slotH += drawChip(SLOT_X, body + slotH, { text: row.jobSkill.name, ...icon(row.jobSkill.icon), fill: C.ink, field: "jobSkill" }, row.pid);
      }
      if (row.ranks.length > 0) {
        if (slotH > 0) slotH += CHIP_GAP;
        // 고유 적성 = 인게이지 블루, 그 외 = 본문색(표의 .entry-apt와 같은 판정).
        slotH += drawFlow(
          SLOT_X,
          body + slotH,
          row.ranks.map((r) => {
            const fill = r.innate ? C.engage : C.ink;
            return { text: r.rank, ...icon(r.icon), tint: fill, fill };
          }),
        );
      }
      row.stats.forEach((s, i) => {
        statText(STAT_X + i * STAT_W, body + 17, s.text, "stat", toneColor(C, s.tone), row.pid, `stat:${s.key}`, STAT_W - 4);
      });
      ry = body + Math.max(slotH, 22) + ROW_PAD;
    }

    /* ── 3행 = 반지 · 슬롯[계승 1 / 반지] — HP 열 = 인연 Lv(표의 BondDropdown 자리). ── */
    {
      const body = ry;
      let slotH = 0;
      const inh0 = row.inherits[0];
      if (inh0 !== undefined) {
        slotH += drawChip(SLOT_X, body, { text: inh0.name, ...icon(inh0.icon), fill: C.ink, field: "inherit0" }, row.pid);
      }
      if (row.ring !== undefined) {
        if (slotH > 0) slotH += CHIP_GAP;
        slotH += drawChip(SLOT_X, body + slotH, { text: row.ring.name, ...icon(row.ring.icon), fill: C.engage, field: "ring" }, row.pid);
      }
      let statH = 0;
      if (row.ring !== undefined) {
        statH = 20;
        statText(STAT_X, body + 15, `Lv ${row.ring.bond}`, "value", C.pgrow, row.pid, "bond");
      }
      if (slotH > 0 || statH > 0) ry = body + Math.max(slotH, statH) + ROW_PAD;
    }

    /* ── 4행 = 전투력 · 슬롯[계승 2 / 무기+강화 / 각인 / 특효] ── */
    {
      const body = ry;
      let slotH = 0;
      const push = (chip: Chip): void => {
        if (slotH > 0) slotH += CHIP_GAP;
        slotH += drawChip(SLOT_X, body + slotH, chip, row.pid);
      };
      const inh1 = row.inherits[1];
      if (inh1 !== undefined) push({ text: inh1.name, ...icon(inh1.icon), fill: C.ink, field: "inherit1" });
      if (row.weapon !== undefined) {
        push({
          text: row.weapon.name,
          ...icon(row.weapon.icon),
          fill: C.ink,
          field: "weapon",
          // 강화는 표에서 골드 칩이다 — 이름 뒤 꼬리로 같은 색을 유지한다.
          ...(row.weapon.plus > 0 ? { suffix: { text: `+${row.weapon.plus}`, fill: C.gold } } : {}),
        });
      }
      if (row.engrave !== undefined) push({ text: row.engrave.name, ...icon(row.engrave.icon), fill: C.ink, field: "engrave" });
      if (row.efficacies.length > 0) {
        if (slotH > 0) slotH += CHIP_GAP;
        slotH += drawFlow(
          SLOT_X,
          body + slotH,
          row.efficacies.map((e) => ({ text: e.name, ...icon(e.icon), tint: C.muted, fill: C.muted })),
        );
      }

      /* 전투력 열 배정 = 표(CombatCells)와 같다: STR~DEF = COMBAT_COL · RES = 빈칸 · BLD = 무게.
         HP 열은 표에서 강화·각인 드롭다운 자리인데(빈 칸 활용) 카드엔 그 조작이 없어 위력이 앉는다. */
      const spdDown = row.stats.some((s) => s.key === "spd" && s.tone === "down");
      let statH = 0;
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
                : { label: L.combat[ck], value: row.combat[ck].text, fill: toneColor(C, row.combat[ck].tone) };
        if (pair === undefined) return;
        statH = 38;
        const colX = STAT_X + i * STAT_W;
        statText(colX, body + 14, pair.label, "label", C.muted, row.pid, `combatLabel:${key}`);
        statText(colX, body + 32, pair.value, "value", pair.fill, row.pid, `combat:${key}`, STAT_W - 4);
      });
      if (slotH > 0 || statH > 0) ry = body + Math.max(slotH, statH) + ROW_PAD;
    }

    /* ── 신분 열 — ★표와 같이 [초상][이름]이 **가로**로 한 상자에 들고(세로 중앙),
       클래스·In.lv는 그 칸 **맨 아래 줄**에 따로 선다(2026-09-07 개정). ── */
    // 클래스 행 = [직업 flex][In.lv] — 표의 classRowUi와 같은 두 상자. "In.lv"는 표가 쓰는 고정 표기다.
    const inlv = `In.lv ${row.internal}`;
    const inlvW = Math.ceil(measure(inlv, "meta")) + 12;
    const jobW = ID_BOX - 6 - inlvW;
    const job = row.job ?? L.jobNone;
    // 최장 직업명("브레이브 히어로" 102.9)은 한 줄 칸(95)을 넘는다 — 표는 자르지만 카드는 줄을 늘린다.
    const jobLines = wrapFit(job, "meta", jobW - 12, 2, row.pid, "job");
    const classH = jobLines.length * CHIP_LINE + CHIP_PAD * 2;
    const idNeed = top + BLOCK_PAD + FACE_H + 8 + 6 + classH;
    const bottom = Math.max(ry, idNeed) + BLOCK_PAD;
    const classY = bottom - BLOCK_PAD - classH;
    const cardY = top + BLOCK_PAD;
    const cardH = classY - 6 - cardY;
    slotBox(PAD, cardY, ID_BOX, cardH);

    /* 이름 — 초상 오른쪽 한 줄이 기본(표와 같다). ★안 들어가면 **초상 아래 한 줄**로 내린다:
       자르면 이름이 사라지고 꺾으면 두 글자가 홀로 남는데, 카드 상자 안은 어차피 비어 있다. */
    const sideX = row.face === undefined ? PAD + 6 : PAD + 4 + FACE_W + 6;
    const sideMax = PAD + ID_BOX - 6 - sideX;
    const beside = measure(row.name, "name") <= sideMax;
    if (row.face !== undefined) {
      const stackH = beside ? FACE_H : FACE_H + 4 + 18;
      const faceY = cardY + Math.round((cardH - stackH) / 2);
      ops.push({ op: "icon", x: PAD + 4, y: faceY, w: FACE_W, h: FACE_H, src: row.face });
      if (beside) text(sideX, faceY + Math.round(FACE_H / 2) + 5, row.name, "name", C.ink);
      else text(PAD + 6, faceY + FACE_H + 4 + 14, fit(row.name, "name", ID_BOX - 12, row.pid, "name"), "name", C.ink);
    } else {
      text(sideX, cardY + Math.round(cardH / 2) + 5, fit(row.name, "name", sideMax, row.pid, "name"), "name", C.ink);
    }

    slotBox(PAD, classY, jobW, classH);
    jobLines.forEach((line, i) => {
      text(PAD + 6, classY + CHIP_PAD + 13 + i * CHIP_LINE, line, "meta", row.job === undefined ? C.muted : C.ink);
    });
    slotBox(PAD + ID_BOX - inlvW, classY, inlvW, classH);
    text(PAD + ID_BOX - inlvW + 6, classY + CHIP_PAD + 13, inlv, "meta", C.gold);

    // 엔트리 블록 테두리 = 인게이지 블루(표의 entry-locked-block::after). ☠표의 잠금 블록엔
    // "이 직업으로 갈 수 없음" 같은 붉은 줄이 없다 — row.ineligible은 표와 같이 그리지 않는다.
    frame(PAD, top, CONTENT, bottom - top, C.engage);
    y = bottom + BLOCK_GAP;
  }

  const height = (rows.length > 0 ? y - BLOCK_GAP : y) + PAD;
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
