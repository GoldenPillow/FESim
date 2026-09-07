import { STAT_KEYS } from "@fesim/engine";
import { COMBAT_COL, type CombatKey, type ExportRow, type ExportStat, type ExportTone } from "./lib";

/**
 * 게시판 붙여넣기용 HTML 생성기 — ☠**순수 문자열 함수**다(DOM·브라우저 API 금지).
 *
 * 입력은 `ExportRow` 하나뿐이고 ☠**값을 다시 계산하지 않는다** — 소수 1자리·캡 정수·무게 감산은
 * `entryExportRows`가 이미 지난 상태다. 여기가 소유하는 것은 **마크업 제약**뿐이다.
 *
 * 제약의 근거 = design/builder_export.md §2-1(디시 실측) — 재조사 대상이 아니다:
 * (1) 모든 서식은 **인라인 style**. `<style>` 블록은 에디터가 등록 전에 지우는데 ☠태그만 벗기고
 *     CSS 텍스트는 본문에 글자로 남는다(조용한 실패가 아니라 시끄러운 실패)
 * (2) ☠`h1`~`h3` · `hr` · `pre` 금지 — 모바일 렌더에서 태그째 소실. 제목·구분선은 `div`가 맡는다
 * (3) ☠모바일 생존 속성 = `style · width · border · height · color · href · src · alt · target` 뿐.
 *     `title · bgcolor · cellspacing · cellpadding · face`는 모바일에서 사라진다
 * (4) ★`colspan`/`rowspan`도 그 목록에 없다 — 죽으면 열이 한 칸씩 밀려 **스탯 열이 틀어진 채
 *     그럴듯하게** 렌더된다(조용한 실패) ⇒ span 없는 판이 **정본**이고(`spanFree` 기본 true)
 *     span 판은 옵션으로만 남는다
 * (5) 본문 상한 65,535자 · 안전선 55,000 — `shareHtmlBudget`이 잰다
 * (6) ★상속되는 서식(font·color·text-align)은 `table`/`tr`로 올린다 — 셀마다 인라인을 달면
 *     같은 화면이 2.4배가 된다(상속 안 되는 border·background만 셀에 남긴다)
 */

/** 열 폭 배분 — 900px에서 이름 168 + 84 + 81x8 = 900(디시 PC 본문 컨테이너와 정확히 일치). */
const NAME_RATIO = 0.187;

/* 색 — 게시판은 흰 배경 고정이라 라이트 테마 값을 문자열로 박는다(CSS 변수는 붙여넣는 쪽에 없다).
   중립색은 짧은 4자 hex로 아끼고, 의미색(絆 상승·무게 하락·캡 도달)만 앱과 같은 값을 쓴다. */
const INK = "#222";
const MUTED = "#777";
const RULE = "#ddd";
const HEAD_BG = "#ededed";
const BAND_BG = "#f8f8f8";

/** 셀 색조 — 표의 판정을 그대로 옮긴다(ink는 상속색이라 인라인을 안 단다). */
const TONE: Record<ExportTone, string> = {
  ink: INK,
  buffed: "#1f5fd0",
  down: "#c62f35",
  cap: "#1e9e50",
};

/** 값이 없는 칸(맨손 위력·무게·특효). */
const DASH = "—";

/** 아이콘 URL 화이트리스트 — ASCII 파일명 자산(faces·items·engraves·rings)만 통과한다. */
const ASCII_PATH = /^[A-Za-z0-9._~/-]+$/;

/**
 * 산출물이 쓰는 라벨 — `BuilderLabels`의 구조적 부분집합이라 호출부가 `labels`를 그대로 넘긴다.
 * ☠여기에 새 키를 늘리지 마라. 늘리는 순간 i18n 3로케일을 따라 늘려야 하고, 표와 산출물의
 * 문구가 갈릴 자리가 하나 더 생긴다.
 */
export interface ShareLabels {
  /** 전투력 6종 캡션(물공·마공·명중·회피·필살·필살회피). */
  combat: Record<CombatKey, string>;
  might: string;
  weight: string;
  efficacy: string;
  /** 장비 줄 캡션 — 무기·각인·반지·계승·고유. */
  item: string;
  engrave: string;
  ring: string;
  inherit: string;
  personalSkill: string;
}

export interface ShareHtmlOptions {
  title: string;
  /** 기본 900 = 디시 PC 본문 컨테이너(`div.write_div`) 폭. */
  width?: number;
  /** 아이콘 `<img>` 포함 여부(기본 false = 텍스트 전용 — 외부 주소 종속 0). */
  icons?: boolean;
  /** `icons: true`일 때 필수 — ☠상대경로는 게시판에서 죽는다(우리 도메인이 아니다). */
  origin?: string;
  /** ☠기본 true = span 미사용. false는 span 판(모바일 화이트리스트 밖 — 보험용 옵션). */
  spanFree?: boolean;
  /** 스탯 열 헤더(STAT_EN) — 표 헤더와 같은 표기를 쓴다. */
  statLabels: Record<string, string>;
  labels: ShareLabels;
}

export interface ShareBudget {
  chars: number;
  bytes: number;
  overSafe: boolean;
  overHard: boolean;
}

/**
 * ☠`&`를 **먼저** 치환한다 — 뒤로 미루면 방금 만든 `&lt;`가 `&amp;lt;`로 이중 이스케이프된다.
 * 입력은 항상 원문 텍스트라는 계약이다(숫자 문자열도 예외 없이 통과시킨다).
 * 실측 = ko 이름표에 `<` `>` 42종 · en에 `'` 292종 · `"` 20종 · `&` 3종.
 */
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 속성 자리 — 본문 이스케이프에 `"`를 더한다(안 하면 속성이 조기 종료돼 뒷부분이 통째로 사라진다). */
const escAttr = (s: string): string => esc(s).replace(/"/g, "&quot;");

/**
 * 아이콘 절대 URL — 통과 못 하면 undefined(아이콘 없이 텍스트만 남는다).
 * ☠ASCII 파일명 자산만 통과시킨다: skills·efficacy·weapontypes는 파일명이 일본어라
 * URL 인코딩에서 1자가 9자로 부풀어 65,535 예산을 혼자 태운다.
 */
const iconUrl = (path: string | undefined, opts: ShareHtmlOptions): string | undefined => {
  if (opts.icons !== true || path === undefined) return undefined;
  const origin = opts.origin;
  if (origin === undefined || origin === "") return undefined;
  if (!ASCII_PATH.test(path)) return undefined;
  return `${origin.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
};

const img = (url: string, w: number, h: number): string =>
  `<img src="${escAttr(url)}" width="${w}" height="${h}" alt="">`;

/** 스탯 셀 — 상속색(ink)이면 인라인을 안 단다. 고유 성장률은 체커가 켜졌을 때만 둘째 줄. */
const statCell = (s: ExportStat): string => {
  const growth = s.growth === undefined ? "" : `<br><span style="color:${MUTED};font-weight:normal">${s.growth}%</span>`;
  const body = `${esc(s.text)}${growth}`;
  const color = TONE[s.tone];
  return color === INK ? `<td>${body}</td>` : `<td style="color:${color}">${body}</td>`;
};

/** 캡션 + 값 한 칸(전투력 행·장비 행 공용). */
const captionCell = (caption: string, value: string, icon?: string): string =>
  `<td>${esc(caption)}<br>${icon === undefined ? "" : `${img(icon, 18, 18)} `}<b style="color:${INK}">${esc(value)}</b></td>`;

interface EquipItem {
  caption: string;
  value: string;
  icon?: string | undefined;
}

/** 장비 줄의 항목 — ☠적성(ranks)은 싣지 않는다: 무기군 **이름 문자열이 ExportRow에 없고**(kind는 숫자)
    아이콘은 weapontypes라 ASCII 자산 화이트리스트 밖이다. 숫자만 찍으면 읽는 쪽이 뜻을 모른다. */
const equipItems = (row: ExportRow, opts: ShareHtmlOptions): EquipItem[] => {
  const L = opts.labels;
  const out: EquipItem[] = [];
  if (row.weapon !== undefined) {
    out.push({
      caption: L.item,
      value: row.weapon.plus > 0 ? `${row.weapon.name} +${row.weapon.plus}` : row.weapon.name,
      icon: iconUrl(row.weapon.icon, opts),
    });
  }
  if (row.engrave !== undefined) {
    out.push({ caption: L.engrave, value: row.engrave.name, icon: iconUrl(row.engrave.icon, opts) });
  }
  if (row.ring !== undefined) {
    out.push({ caption: L.ring, value: `${row.ring.name} Lv${row.ring.bond}`, icon: iconUrl(row.ring.icon, opts) });
  }
  // 계승·고유 스킬은 아이콘을 안 붙인다(skills 자산은 파일명이 일본어 — 위 iconUrl 주석).
  for (const s of row.inherits) out.push({ caption: L.inherit, value: s.name });
  if (row.ownSkill !== undefined) out.push({ caption: L.personalSkill, value: row.ownSkill.name });
  return out;
};

/** 전투력 행의 9칸 — 스탯 열에 정렬한다(HP 열 = 위력 · RES 열 = 특효 · BLD 열 = 무게, 나머지는 COMBAT_COL). */
const combatCells = (row: ExportRow, opts: ShareHtmlOptions): string => {
  const L = opts.labels;
  return STAT_KEYS.map((key) => {
    if (key === "hp") return captionCell(L.might, row.might ?? DASH);
    if (key === "res") {
      const names = row.efficacies.map((e) => e.name).join(" ");
      return captionCell(L.efficacy, names === "" ? DASH : names);
    }
    if (key === "bld") return captionCell(L.weight, row.weight ?? DASH);
    const ck = COMBAT_COL[key];
    return ck === undefined ? "<td></td>" : captionCell(L.combat[ck], row.combat[ck]);
  }).join("");
};

/** 신분 줄 — 직업 미선택이면 In.Lv만. ☠전용직 대상 밖은 괄호로 감싼다(표의 "합류 상태" 표기 규약과 같다). */
const jobLine = (row: ExportRow): string => {
  const lv = `In.Lv ${row.internal}`;
  if (row.job === undefined) return lv;
  const job = row.ineligible ? `(${row.job})` : row.job;
  return `${esc(job)}<br>${lv}`;
};

const faceImg = (row: ExportRow, opts: ShareHtmlOptions): string => {
  const url = iconUrl(row.face, opts);
  return url === undefined ? "" : `${img(url, 106, 44)}<br>`;
};

const nameHtml = (row: ExportRow): string => `<b style="font-size:15px">${esc(row.name)}</b>`;

/** span 없는 판(정본) — 엔트리 1인 = 3줄, 세 줄 모두 10칸을 그대로 채운다. */
const spanFreeEntry = (row: ExportRow, opts: ShareHtmlOptions): string => {
  const equips = equipItems(row, opts);
  const pad = STAT_KEYS.length - equips.length;
  return (
    `<tr height="30" style="font-weight:bold">` +
    `<td style="text-align:left;padding:5px 4px 0 8px;vertical-align:top">${faceImg(row, opts)}${nameHtml(row)}</td>` +
    row.stats.map(statCell).join("") +
    `</tr>` +
    `<tr height="34" style="color:${MUTED};background:${BAND_BG}">` +
    // background는 상속되지 않는다 — 이름 칸만 흰 바탕으로 되돌려 띠가 신분 열을 덮지 않게 한다.
    `<td style="text-align:left;padding-left:8px;background:#fff">${jobLine(row)}</td>` +
    combatCells(row, opts) +
    `</tr>` +
    // 구분선은 tr에 건다(border-collapse 모델) — 셀마다 달면 엔트리당 10벌이 된다.
    `<tr height="30" style="color:${MUTED};border-bottom:1px solid ${RULE}"><td></td>` +
    equips.map((e) => captionCell(e.caption, e.value, e.icon)).join("") +
    "<td></td>".repeat(pad > 0 ? pad : 0) +
    `</tr>`
  );
};

/** span 판(옵션) — ☠모바일에서 span이 죽으면 열이 밀린다. 판정이 끝나기 전에는 정본으로 쓰지 않는다. */
const spanEntry = (row: ExportRow, opts: ShareHtmlOptions): string => {
  const flow = equipItems(row, opts)
    .map((e) => `${esc(e.caption)} ${e.icon === undefined ? "" : `${img(e.icon, 18, 18)} `}<b style="color:${INK}">${esc(e.value)}</b>`)
    .join(" · ");
  return (
    `<tr height="30" style="font-weight:bold">` +
    `<td rowspan="3" style="text-align:left;padding:5px 4px 7px 8px;vertical-align:top;border-bottom:1px solid ${RULE}">` +
    `${faceImg(row, opts)}${nameHtml(row)}<br><span style="color:${MUTED};font-weight:normal">${jobLine(row)}</span></td>` +
    row.stats.map(statCell).join("") +
    `</tr>` +
    `<tr height="34" style="color:${MUTED};background:${BAND_BG}">${combatCells(row, opts)}</tr>` +
    `<tr><td colspan="${STAT_KEYS.length}" style="text-align:left;padding:2px 8px 8px;color:${MUTED};border-bottom:1px solid ${RULE}">${flow}</td></tr>`
  );
};

/**
 * 엔트리 표 → 게시판에 그대로 붙여넣는 HTML 조각(문서 골격 없음 — 본문에 들어가는 것이 전부다).
 * 열 순서는 `STAT_KEYS` 그대로이고, 값은 `ExportRow`의 문자열을 손대지 않고 옮긴다.
 */
export function renderShareHtml(rows: readonly ExportRow[], opts: ShareHtmlOptions): string {
  const width = opts.width ?? 900;
  const spanFree = opts.spanFree !== false;
  const nameW = Math.round(width * NAME_RATIO);
  const statW = Math.floor((width - nameW) / STAT_KEYS.length);
  // 나머지 픽셀은 첫 스탯 열이 흡수한다 — 합이 width와 어긋나면 table-layout:fixed가 열을 재배분한다.
  const firstW = width - nameW - statW * (STAT_KEYS.length - 1);

  // 열 폭은 첫 행에만 건다(table-layout:fixed와 짝) — 아래 행에 반복하면 예산만 먹는다.
  const head =
    `<tr height="26" style="background:${HEAD_BG};font-weight:bold">` +
    `<td width="${nameW}" style="text-align:left;padding-left:8px">Character</td>` +
    STAT_KEYS.map((key, i) => `<td width="${i === 0 ? firstW : statW}">${esc(opts.statLabels[key] ?? key)}</td>`).join("") +
    `</tr>`;

  const body = rows.map((row) => (spanFree ? spanFreeEntry(row, opts) : spanEntry(row, opts))).join("");

  const site = opts.origin === undefined || opts.origin === "" ? undefined : opts.origin.replace(/\/+$/, "");
  const foot =
    site === undefined
      ? ""
      : `<div style="color:${MUTED};padding:8px 0 2px"><a href="${escAttr(site)}" target="_blank">${esc(site.replace(/^https?:\/\//, ""))}</a></div>`;

  // ☠제목은 h1~h3가 아니라 div다(모바일에서 헤딩은 태그째 사라진다).
  return (
    `<div style="width:${width}px;font:13px/1.5 'Malgun Gothic',sans-serif;color:${INK}">` +
    `<div style="font-size:17px;font-weight:bold;padding:2px 0 4px">${esc(opts.title)}</div>` +
    `<table style="width:${width}px;table-layout:fixed;border-collapse:collapse;font:13px/1.5 'Malgun Gothic',sans-serif;color:${INK};text-align:center"><tbody>` +
    head +
    body +
    `</tbody></table>` +
    foot +
    `</div>`
  );
}

/** UTF-8 바이트 수 — ☠TextEncoder를 안 쓴다(런타임 전역에 기대지 않는 순수 계산). */
const utf8Bytes = (s: string): number => {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
};

const SAFE = 55_000;
const HARD = 65_535;

/**
 * 예산 — 디시 본문 상한 65,535, 안전선 55,000.
 * ☠상한의 단위(바이트냐 글자냐)는 아직 실측이 없다(design/builder_export.md §6-1) ⇒
 * **둘 중 큰 쪽**으로 판정한다. 낙관적으로 잡으면 글이 등록 단계에서 잘려 나간다.
 */
export function shareHtmlBudget(html: string): ShareBudget {
  const chars = html.length;
  const bytes = utf8Bytes(html);
  const worst = chars > bytes ? chars : bytes;
  return { chars, bytes, overSafe: worst > SAFE, overHard: worst > HARD };
}
