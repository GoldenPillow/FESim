import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STAT_KEYS, type StatKey } from "@fesim/engine";
import {
  applyEmblemBonus,
  builderRow,
  builderRowGroups,
  canEquip,
  combatOf,
  COMBAT_KEYS,
  lockedDisplayRows,
  moveLock,
  nextSort,
  waitingRowGroups,
  weaponAt,
  type BuilderCompare,
  type BuilderRow,
  type BuilderSort,
  type EquippedWeapon,
} from "./lib";
import type {
  BuilderEmblemProp,
  BuilderEngraveProp,
  BuilderJobProp,
  BuilderProps,
  BuilderWeaponProp,
} from "../../lib/fe17";
import {
  loadEntryLocks,
  loadShowDlc,
  loadShowGrowth,
  loadShowSpoilers,
  loadStarsphere,
  saveEntryLocks,
  saveShowDlc,
  saveShowGrowth,
  saveShowSpoilers,
  saveStarsphere,
  type EntryLock,
} from "../../lib/guestSave";
import type { BuilderLabels } from "../../lib/i18n";

/**
 * 엔트리 빌더 — "상급직 xN x 전 캐릭터" 비교표(design/avg_stats_builder.md §4).
 * 입력 테이블은 빌드 타임(builderPropsFor)이 직렬화해 주고, 직업 x 내부 레벨 조합은 곱집합이라
 * 여기서 계산한다. 계산은 features/builder/lib(→ 엔진 growthPath)가 소유하고 이 파일은 표시만 한다.
 * 멀티클래스 비교(2026-08-31): 슬롯(직업+내부 레벨)마다 헤더 성장률 행 1줄 + 캐릭터마다 본문 라인 1줄 —
 * 두 줄의 순서 동치는 builderRowGroups 테스트가 지킨다. 고유 성장 체커는 블록 첫 줄에 개인 성장률(블루).
 * 잠금(2026-08-31): 스탯 행 클릭 = 잠금 당시 (직업, 레벨, 성옥) 스냅샷으로 최상단 고정(행 전체
 * 인게이지 블루 테두리 + 잠그는 순간 충격파 1회) + 비교표 제외. 해제 = 대기 목록 복귀.
 * 호버·잠금 행 아래에는 전투력 행(맨손 기준, 정본 self-only 식 — lib.combatOf)이 선다.
 * 전용직 불가(ineligible) 행은 호버·클릭 무반응 — 해당 캐릭터만 반응한다.
 */

const INTERNAL_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
/** 비교 상한(기본 1 + 추가 3) — 캐릭터당 라인이 이 배수로 늘므로 가독 한계에서 자른다. */
const MAX_JOBS = 4;

/** 비교 슬롯 상태 — [0] = 기본 선택기. internal 미지정 = 1번(메인 내부 레벨) 추종(2026-08-31 사용자 지시).
    iid = 장착 무기(빈 문자열 = 맨손), plus = 강화 단계(0 = 노강화), engrave = 각인(GID).
    직업이 바뀌면 무기·각인은 초기화된다(슬롯 재구성). */
interface BuilderSlot {
  jid: string;
  internal?: number;
  iid?: string;
  plus?: number;
  engrave?: string;
}

export interface BuilderIslandProps extends BuilderProps {
  labels: BuilderLabels;
}

const STAT_EN: Record<StatKey, string> = {
  hp: "HP", str: "STR", mag: "MAG", dex: "DEX", spd: "SPD", lck: "LCK", def: "DEF", res: "RES", bld: "BLD",
};

/** 전투력 → 스탯 열 배정(그리드 정렬용 — 의미는 캡션이 말한다). HP 열은 비움, RES·BLD 열 = 무기군 아이콘. */
const COMBAT_COL: Partial<Record<StatKey, (typeof COMBAT_KEYS)[number]>> = {
  str: "patk", mag: "matk", dex: "hit", spd: "avoid", lck: "crit", def: "ddg",
};

/** 전투력 표시 — 스탯과 같은 소수 1자리(☠toFixed 단독 금지 규약과 같은 이유로 반올림을 먼저 정수화). */
const fmtCombat = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/** 무게 페널티(실효 무게 > 체격) — SPD 스탯 숫자까지 레드(2026-08-31 지시). 공속은 미표시라 여기서 경고. */
const spdPenalty = (row: BuilderRow, equipped: EquippedWeapon | undefined): boolean =>
  equipped !== undefined &&
  weaponAt(equipped.weapon, equipped.plus, equipped.engrave).weight >
    row.cells.bld.value + (equipped.weapon.enhance?.bld ?? 0);

/** 스펙 델타색 — 무강화·무각인 원본 대비, 상승 블루·하락 레드(무게는 반대: 증가가 악화다, 2026-08-31). */
const specCls = (v: number, b: number, invert = false): string =>
  v === b ? "text-ink" : (v > b) !== invert ? "text-pgrow" : "text-danger";

/** 스펙 6항목 — ★전 항목 고정 표시(0·음수 포함) — 정렬이 일정해야 비교가 된다(2026-08-31 사용자 지시). */
const specRows = (
  weapon: BuilderWeaponProp,
  plus: number,
  engrave: BuilderEngraveProp | undefined,
  labels: BuilderLabels,
): [string, number, number, boolean][] => {
  const eff = weaponAt(weapon, plus, engrave);
  const base = weaponAt(weapon, 0);
  return [
    [labels.might, eff.might, base.might, false],
    [labels.combat.hit, eff.hit, base.hit, false],
    [labels.combat.crit, eff.crit, base.crit, false],
    [labels.weight, eff.weight, base.weight, true],
    [labels.combat.avoid, eff.avoid, base.avoid, false],
    [labels.combat.ddg, eff.dodge, base.dodge, false],
  ];
};

/** 무기 스펙 한 줄(가로) — 상단 컨트롤·카드 포커스 팝오버가 소비. */
const SpecLine = ({
  weapon,
  plus,
  engrave,
  labels,
}: {
  weapon: BuilderWeaponProp;
  plus: number;
  engrave?: BuilderEngraveProp | undefined;
  labels: BuilderLabels;
}): React.JSX.Element => (
  <span className="flex flex-wrap items-center gap-x-2.5 text-[14px] leading-tight text-muted">
    <span className="rounded border border-rule px-1.5 text-[14px]">{weapon.rank}</span>
    {specRows(weapon, plus, engrave, labels).map(([name, v, b, invert]) => (
      <span key={name} className="whitespace-nowrap">
        {name} <span className={`font-semibold ${specCls(v, b, invert)}`}>{v}</span>
      </span>
    ))}
    {/* 특효 — 라벨 + 대상(아이콘·분류)만(2026-08-31 사용자 지시로 상세 설명 제거). */}
    {weapon.efficacies?.map((e) => (
      <span key={e.kind} className="flex items-center gap-1 whitespace-nowrap">
        {labels.efficacy}
        {e.icon !== undefined && <img src={e.icon} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
        <span className="font-semibold text-gold">{labels.efficacyNames[e.kind] ?? e.kind}</span>
      </span>
    ))}
    {/* 장비 중 스탯 강화(Enhance) — 조용히 스탯을 바꾸는 무기 35종을 드러낸다(상승 블루·하락 레드). */}
    {weapon.enhance !== undefined &&
      (Object.entries(weapon.enhance) as [StatKey, number][]).map(([key, v]) => (
        <span key={key} className="whitespace-nowrap">
          {labels.stats[key]}{" "}
          <span className={`font-semibold ${v > 0 ? "text-pgrow" : "text-danger"}`}>
            {v > 0 ? `+${v}` : v}
          </span>
        </span>
      ))}
  </span>
);

/** 후보 스펙 패널(세로) — 드롭다운 옵션 호버 오버레이. 라벨 좌·수치 우 고정 정렬. */
const SpecPanel = ({
  weapon,
  plus,
  engrave,
  labels,
}: {
  weapon: BuilderWeaponProp;
  plus: number;
  engrave?: BuilderEngraveProp | undefined;
  labels: BuilderLabels;
}): React.JSX.Element => (
  <span className="flex w-max flex-col gap-[3px] text-[14px] leading-tight text-muted">
    <span className="flex items-center gap-1.5 pb-1">
      <span className="rounded border border-rule px-1.5 text-ink">{weapon.rank}</span>
      <span className="max-w-[9rem] truncate font-semibold text-ink">{weapon.name}</span>
    </span>
    {specRows(weapon, plus, engrave, labels).map(([name, v, b, invert]) => (
      <span key={name} className="flex items-center justify-between gap-4">
        {name}
        <span className={`font-semibold ${specCls(v, b, invert)}`}>{v}</span>
      </span>
    ))}
    {/* 특효 — 라벨 + 대상(아이콘·분류)만, 상세 설명 없음(2026-08-31 사용자 지시로 캡션 제거). */}
    {weapon.efficacies?.map((e) => (
      <span key={e.kind} className="flex items-center justify-between gap-4">
        {labels.efficacy}
        <span className="flex items-center gap-1 font-semibold text-gold">
          {e.icon !== undefined && <img src={e.icon} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
          {labels.efficacyNames[e.kind] ?? e.kind}
        </span>
      </span>
    ))}
    {weapon.enhance !== undefined &&
      (Object.entries(weapon.enhance) as [StatKey, number][]).map(([key, v]) => (
        <span key={key} className="flex items-center justify-between gap-4">
          {labels.stats[key]}
          <span className={`font-semibold ${v > 0 ? "text-pgrow" : "text-danger"}`}>{v > 0 ? `+${v}` : v}</span>
        </span>
      ))}
  </span>
);

/** 드롭다운 표지 화살표 — 카드·상단 슬롯 공용, "여기는 드롭다운"이 보이게(2026-08-31 사용자 지시). */
const CARET = (
  <span aria-hidden="true" className="text-[12px] leading-none text-muted">
    ▾
  </span>
);

/** 드롭다운 옵션 — spec이 있으면 호버 즉시 우측에 스펙 오버레이가 선다(2026-08-31 사용자 지시). */
interface EquipOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  engage?: boolean;
  spec?: { weapon: BuilderWeaponProp; plus: number; engrave?: BuilderEngraveProp | undefined };
}

/** 무기 후보 목록 — 각인은 현 슬롯 값 유지, 강화는 무기 소유라 0부터(선택 시 리셋과 동형). */
const weaponOptionsOf = (
  options: readonly BuilderWeaponProp[],
  job: BuilderJobProp | undefined,
  engrave: BuilderEngraveProp | undefined,
  labels: BuilderLabels,
): EquipOption[] => [
  { value: "", label: labels.itemNone },
  ...options.map((w) => ({
    value: w.iid,
    label: w.name,
    ...(w.icon !== undefined ? { icon: w.icon } : {}),
    ...(job !== undefined && !canEquip(job, w) ? { disabled: true as const } : {}),
    ...(w.engage === true ? { engage: true as const } : {}),
    spec: { weapon: w, plus: 0, engrave },
  })),
];

const plusOptionsOf = (
  weapon: BuilderWeaponProp,
  engrave: BuilderEngraveProp | undefined,
  labels: BuilderLabels,
): EquipOption[] => [
  { value: "0", label: labels.refineNone, spec: { weapon, plus: 0, engrave } },
  ...(weapon.refine ?? []).map((_stage, si) => ({
    value: String(si + 1),
    label: `+${si + 1}`,
    spec: { weapon, plus: si + 1, engrave },
  })),
];

const engraveOptionsOf = (
  weapon: BuilderWeaponProp,
  plus: number,
  engraves: readonly BuilderEngraveProp[],
  labels: BuilderLabels,
): EquipOption[] => [
  { value: "", label: labels.engraveNone, spec: { weapon, plus } },
  ...engraves.map((g) => ({
    value: g.gid,
    label: g.name,
    ...(g.icon !== undefined ? { icon: g.icon } : {}),
    spec: { weapon, plus, engrave: g },
  })),
];

/** 반지 후보 — 좌 아이콘·우 문장사 이름(2026-08-31 사용자 지시). */
const ringOptionsOf = (emblems: readonly BuilderEmblemProp[], labels: BuilderLabels): EquipOption[] => [
  { value: "", label: labels.ringNone },
  ...emblems.map((e) => ({ value: e.gid, label: e.name, ...(e.icon !== undefined ? { icon: e.icon } : {}) })),
];

/** 絆 레벨 1~20 — 오름차순(2026-08-31 사용자 변경). 반지 선택 시 기본값은 여전히 20. */
const BOND_OPTIONS: EquipOption[] = Array.from({ length: 20 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

/** 카드 개별 In.Lv 드롭다운 옵션 — 상단 글로벌 선택기와 같은 단계, "Lv." 접두(2026-09-01 사용자 지시). */
const INLV_OPTIONS: EquipOption[] = INTERNAL_LEVELS.map((n) => ({ value: String(n), label: `Lv. ${n}` }));

/**
 * 드롭다운 자동 스크롤(2026-09-01 사용자 지시) — 목록이 화면·스크롤박스 아래로 잘리면
 * **잘린 만큼만** 부드럽게 내린다(세로 한정 — 우측 스펙 패널 때문에 가로로 튀면 안 된다).
 * 목록은 트리거와 같은 스크롤 콘텐츠 안이라 스크롤해도 정렬이 유지된다.
 */
const scrollDropdownIntoView = (el: HTMLElement): void => {
  const r = el.getBoundingClientRect();
  let node: HTMLElement | null = el.parentElement;
  while (node !== null) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) {
      const over = r.bottom - node.getBoundingClientRect().bottom + 8;
      if (over > 0) node.scrollBy({ top: over, behavior: "smooth" });
    }
    node = node.parentElement;
  }
  const overWin = r.bottom - window.innerHeight + 8;
  if (overWin > 0) window.scrollBy({ top: overWin, behavior: "smooth" });
};

/**
 * 장비 커스텀 드롭다운 — 네이티브 셀렉트 팝업은 옵션 호버 감지·옆 오버레이가 불가능해 목록을 직접
 * 그린다(2026-08-31 사용자 지시: 옵션 호버 즉시 우측 상세 스펙). 트리거 = 상단 셀렉트풍 박스 + ▾.
 * 선택 즉시 닫고 트리거로 포커스 복귀 — 포커스가 끊기면 대기 행의 전투력 행이 접힌다(focusRow 규약).
 */
function EquipDropdown({
  ariaLabel,
  value,
  options,
  disabled = false,
  onChange,
  onOpenChange,
  labels,
  trigger,
  triggerClass,
  rootClass,
}: {
  ariaLabel: string;
  value: string;
  options: readonly EquipOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  /** 열림 상태 통지 — 호출측이 겹치는 보조 표시(포커스 팝오버)를 접는 데 쓴다. */
  onOpenChange?: (open: boolean) => void;
  labels: BuilderLabels;
  trigger: React.ReactNode;
  triggerClass: string;
  /** 루트(포지셔닝 스팬) 추가 클래스 — flex 컨테이너 안에서 늘어나야 할 때(flex-1) 쓴다. */
  rootClass?: string;
}): React.JSX.Element {
  const [open, setOpenRaw] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLSpanElement | null>(null);
  // 열림 직후 잘림 보정 자동 스크롤(부드럽게) — 2026-09-01 사용자 지시.
  useEffect(() => {
    if (open && listRef.current !== null) scrollDropdownIntoView(listRef.current);
  }, [open]);
  const setOpen = (next: boolean): void => {
    setOpenRaw(next);
    onOpenChange?.(next);
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) {
        setOpenRaw(false);
        onOpenChange?.(false);
      }
    };
    // ☠캡처 단계 필수 — 드롭다운 루트마다 pointerdown 전파를 끊으므로(행 잠금 오발 방지)
    //   버블 리스너는 다른 드롭다운 위 클릭을 못 본다 = 기존 목록이 안 닫힌다(실사고 2026-08-31).
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
    // onOpenChange는 렌더마다 새 함수라 의존성에 넣지 않는다(열림 동안 재구독 방지 — open만 본다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const spec = options.find((o) => o.value === hover)?.spec;
  return (
    <span
      ref={rootRef}
      className={`relative inline-flex${rootClass !== undefined ? ` ${rootClass}` : ""}`}
      // ☠행 클릭(잠금 토글)·블록 드래그로 새면 안 된다 — 드롭다운 전체에서 전파를 끊는다.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          btnRef.current?.focus();
        }
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${triggerClass}${disabled ? "" : " cursor-pointer"}`}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <span ref={listRef} className="absolute left-0 top-full z-50 mt-1 flex items-start" role="listbox" aria-label={ariaLabel}>
          <span className="flex max-h-72 w-max flex-col overflow-y-auto rounded border border-rule bg-panel py-1 shadow-lg [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin]">
            {options.map((o) => (
              // ☠disabled 속성 금지 — 비활성 버튼은 마우스 이벤트가 죽어 호버 스펙이 안 선다(aria만).
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled === true}
                className={`flex w-full items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-left text-[14px] font-semibold leading-tight ${o.disabled === true ? "cursor-default opacity-40" : "cursor-pointer hover:bg-sunken"} ${o.engage === true ? "text-engage" : "text-ink"} ${o.value === value ? "bg-sunken" : ""}`}
                onMouseEnter={() => setHover(o.value)}
                onMouseLeave={() => setHover((h) => (h === o.value ? null : h))}
                onClick={() => {
                  if (o.disabled === true) return;
                  onChange(o.value);
                  setOpen(false);
                  btnRef.current?.focus();
                }}
              >
                {/* 각인 심볼은 비정방형 — contain으로 비율 보존(정방형 아이템 아이콘엔 무해). */}
                {o.icon !== undefined && <img src={o.icon} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />}
                {o.label}
              </button>
            ))}
          </span>
          {/* 옵션 호버 스펙 — 목록 우측 오버레이(2026-08-31 사용자 지시). */}
          {spec !== undefined && (
            <span className="ml-1 rounded border border-rule bg-panel px-2.5 py-1.5 shadow-lg">
              <SpecPanel weapon={spec.weapon} plus={spec.plus} engrave={spec.engrave} labels={labels} />
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * 문장사 레벨 상세(내용부) — 絆 레벨별 획득 목록 + 항목 호버 = 우측 상세(스킬 = 정본 설명문,
 * 무기 = 스펙 패널). bond 초과 레벨은 비활성 비주얼(흐림+무채색) = "아직 못 쓴다" 암시.
 * 인연 드롭다운 오버레이(데스크톱)와 폴딩 팝업(세로폰)이 공유한다.
 */
function EmblemDetail({
  emblem,
  bond,
  labels,
}: {
  emblem: BuilderEmblemProp;
  bond: number;
  labels: BuilderLabels;
}): React.JSX.Element {
  const [hover, setHover] = useState<{ name: string; help?: string; weapon?: BuilderWeaponProp } | null>(null);
  const chip = (
    key: string,
    name: string,
    cls: string,
    detail: { name: string; help?: string; weapon?: BuilderWeaponProp },
    icon?: string,
  ): React.JSX.Element => (
    <span
      key={key}
      className={`flex cursor-default items-center gap-1 whitespace-nowrap rounded border border-rule bg-sunken px-1.5 py-[1px] text-[13px] font-semibold leading-tight ${cls}`}
      onMouseEnter={() => setHover(detail)}
      onMouseLeave={() => setHover((h) => (h?.name === detail.name ? null : h))}
    >
      {icon !== undefined && <img src={icon} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />}
      {name}
    </span>
  );
  return (
    <span className="flex items-start">
      <span className="flex max-h-96 w-max flex-col overflow-y-auto rounded border border-rule bg-panel px-2.5 py-2 shadow-lg [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin]">
        <span className="pb-1 text-[14px] font-semibold text-ink">
          {emblem.name} — {labels.bond} {bond}
        </span>
        {emblem.levels.map((lv) => (
          <span
            key={lv.bond}
            className={`flex items-start gap-1.5 py-[3px] ${lv.bond > bond ? "opacity-35 grayscale" : ""}`}
          >
            <span className="w-10 shrink-0 pt-[2px] text-right text-[13px] font-semibold text-gold">Lv{lv.bond}</span>
            <span className="flex max-w-[24rem] flex-wrap gap-1">
              {lv.synchro?.map((s) =>
                chip(`s-${s.sid}`, s.name, "text-ink", { name: s.name, ...(s.help !== undefined ? { help: s.help } : {}) }),
              )}
              {lv.engage?.map((s) =>
                chip(`e-${s.sid}`, s.name, "text-engage", { name: s.name, ...(s.help !== undefined ? { help: s.help } : {}) }),
              )}
              {lv.weapons?.map((w) =>
                chip(
                  `w-${w.iid}`,
                  w.name,
                  "text-engage",
                  { name: w.name, ...(w.help !== undefined ? { help: w.help } : {}), ...(w.weapon !== undefined ? { weapon: w.weapon } : {}) },
                  w.icon,
                ),
              )}
            </span>
          </span>
        ))}
      </span>
      {/* 항목 호버 상세 — 목록 우측 오버레이(무기 = 스펙 패널, 스킬 = 정본 설명문). */}
      {hover !== null && (
        <span className="ml-1 max-w-[18rem] rounded border border-rule bg-panel px-2.5 py-1.5 shadow-lg">
          {hover.weapon !== undefined ? (
            <SpecPanel weapon={hover.weapon} plus={0} labels={labels} />
          ) : (
            <span className="flex flex-col gap-1 text-[13px] leading-snug text-muted">
              <span className="font-semibold text-ink">{hover.name}</span>
              {hover.help !== undefined && <span className="whitespace-pre-line">{hover.help}</span>}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/** 문장사 상세 팝업(세로폰 폴딩 전용) — 바깥클릭 캡처로 닫는다(드롭다운 교훈 공유). */
function EmblemPanel({
  emblem,
  bond,
  labels,
  onClose,
}: {
  emblem: BuilderEmblemProp;
  bond: number;
  labels: BuilderLabels;
  onClose: () => void;
}): React.JSX.Element {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const onDoc = (e: PointerEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
    // onClose는 렌더마다 새 함수 — 열림 동안 재구독 방지(EquipDropdown과 같은 이유).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={rootRef}
      className="absolute left-0 top-full z-50 mt-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <EmblemDetail emblem={emblem} bond={bond} labels={labels} />
    </span>
  );
}

/**
 * 인연 레벨 드롭다운(데스크톱 반지 행) — 폭 = 하단 강화+각인 칩 합산 78px 고정(마진 포함, 실측
 * 2026-08-31 사용자 지시). 열면 우측에 문장사 상세(EmblemDetail)가 서고, 옵션(Lv) 호버 =
 * 그 레벨 기준 활성/비활성 미리보기 + 본스탯·+N 라이브 연동(onPreview) — 떠나면 원복.
 */
function BondDropdown({
  emblem,
  bond,
  labels,
  onChange,
  onPreview,
}: {
  emblem: BuilderEmblemProp;
  bond: number;
  labels: BuilderLabels;
  onChange: (bond: number) => void;
  onPreview: (bond: number | null) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLSpanElement | null>(null);
  // 열림 직후 잘림 보정 자동 스크롤(부드럽게) — 상세 패널 포함 높이 기준.
  useEffect(() => {
    if (open && listRef.current !== null) scrollDropdownIntoView(listRef.current);
  }, [open]);
  const close = (): void => {
    setOpen(false);
    setHover(null);
    onPreview(null);
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) close();
    };
    // ☠캡처 단계 필수 — 드롭다운 루트가 pointerdown 전파를 끊는다(EquipDropdown 교훈 공유).
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
    // close는 렌더마다 새 함수 — 열림 동안 재구독 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
          btnRef.current?.focus();
        }
      }}
    >
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.bond}
        // 폭 86px = 강화 38 + 갭 6 + 각인 42 (전부 고정 폭 — 상태 무관 정합, 2026-08-31 재실측).
        className="flex h-7 w-[86px] cursor-pointer items-center justify-center gap-0.5 whitespace-nowrap rounded border border-rule bg-sunken px-0.5 text-[11px] font-semibold tracking-tight text-pgrow"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {`${labels.bondLevel} ${bond}`}
        {CARET}
      </button>
      {open && (
        <span ref={listRef} className="absolute left-0 top-full z-50 mt-1 flex items-start">
          <span
            role="listbox"
            aria-label={labels.bond}
            className="flex max-h-72 w-max flex-col overflow-y-auto rounded border border-rule bg-panel py-1 shadow-lg [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin]"
            onMouseLeave={() => {
              setHover(null);
              onPreview(null);
            }}
          >
            {BOND_OPTIONS.map((o) => {
              const n = Number(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={n === bond}
                  className={`cursor-pointer px-3 py-1 text-left text-[14px] font-semibold leading-tight hover:bg-sunken ${n === bond ? "bg-sunken text-pgrow" : "text-ink"}`}
                  onMouseEnter={() => {
                    setHover(n);
                    onPreview(n);
                  }}
                  onClick={() => {
                    onChange(n);
                    close();
                    btnRef.current?.focus();
                  }}
                >
                  {`Lv ${n}`}
                </button>
              );
            })}
          </span>
          {/* 문장사 상세 — 호버 레벨 기준(레벨 부족 = 흐림), 호버 없으면 현재 레벨. */}
          <span className="ml-1">
            <EmblemDetail emblem={emblem} bond={hover ?? bond} labels={labels} />
          </span>
        </span>
      )}
    </span>
  );
}

interface CombatCellsProps {
  row: BuilderRow;
  job: BuilderJobProp | undefined;
  equipped: EquippedWeapon | undefined;
  /** 공란 모드 — 자리(높이·폭)는 그대로 두고 내용만 숨긴다(호버 시 표가 안 움직이는 것이 목적). */
  ghost: boolean;
  /** 스펙 팝오버 — 카드 드롭다운 조작 중(행 포커스)에만 옆에 뜬다(2026-08-31 지시). */
  specOpen: boolean;
  weapons: readonly BuilderWeaponProp[];
  engraves: readonly BuilderEngraveProp[];
  kindIcons: Record<number, string>;
  labels: BuilderLabels;
  /** 카드 장비 변경 — iid/plus/engrave 부분 갱신("" = 해제). undefined 필드는 불변. */
  onEquip: (patch: { iid?: string; plus?: number; engrave?: string }) => void;
}

/**
 * 전투력 행의 셀 묶음 — 잠금·대기 공용(2026-08-31 배치 지시). 아이템 = IN.LV 하단(드롭다운으로 변경 가능),
 * HP 하단 공란 = 강화(+N)·각인 슬롯(카드 장비 변경, 2026-08-31 지시), 전투력 = 스탯쪽 그리드 정렬
 * (물공→STR … 필살회피→DEF), RES+BLD 병합 칸 = 클래스 무기군 흰 아이콘 · 실효 무기 무게.
 * 무기 합산 델타: 상승 = 블루(pgrow) · 하락 = 레드(danger) — 무게의 악영향은 회피 하락으로 나타난다.
 * 칩은 닫힘 = 간략(+N·각인 아이콘), 조작 중 = 스펙 팝오버가 옆에(레이아웃 불변 — 표가 안 움직인다).
 * 세로 모바일 = 흐름 배치(combat-flow) — 표시는 builder.css 미디어가 가른다.
 */
function CombatCells({
  row,
  job,
  equipped,
  ghost,
  specOpen,
  weapons,
  engraves,
  kindIcons,
  labels,
  onEquip,
}: CombatCellsProps): React.JSX.Element {
  const bare = combatOf(row);
  const c = equipped !== undefined ? combatOf(row, equipped) : bare;
  const deltaCls = (key: (typeof COMBAT_KEYS)[number]): string =>
    c[key] > bare[key] + 1e-9 ? "text-pgrow" : c[key] < bare[key] - 1e-9 ? "text-danger" : "text-ink";
  const kinds =
    job === undefined
      ? []
      : Object.keys(job.weaponRanks)
          .map(Number)
          .sort((a, b) => a - b);
  const hide = ghost ? " invisible" : "";
  /** 이 행의 드롭다운이 하나라도 열려 있나 — 열림 중엔 포커스 팝오버를 접는다(목록·호버 스펙과 겹침). */
  const [openDrop, setOpenDrop] = useState(false);
  const weapon = equipped?.weapon;
  const engrave = equipped?.engrave;
  const plus = equipped?.plus ?? 0;
  const options = job === undefined ? [] : weapons.filter((w) => job.weaponRanks[w.kind] !== undefined);

  /** 무기 선택 — 상단 드롭다운 스타일 박스(아이콘+이름+▾). 강화 단계는 우측 칩이 맡아 이름만 쓴다
      (2026-08-31 사용자 지시 — 폭도 잘리지 않게 넉넉히). */
  const weaponPicker = (justify: string): React.JSX.Element => (
    <span className={`flex items-center ${justify}${hide}`}>
      <EquipDropdown
        ariaLabel={labels.item}
        value={weapon?.iid ?? ""}
        options={weaponOptionsOf(options, job, engrave, labels)}
        disabled={job === undefined}
        onChange={(iid) => onEquip({ iid })}
        onOpenChange={setOpenDrop}
        labels={labels}
        triggerClass={`flex h-7 items-center gap-1 whitespace-nowrap rounded border border-rule bg-sunken px-1.5 text-[14px] font-semibold leading-tight ${weapon?.engage === true ? "text-engage" : weapon !== undefined ? "text-ink" : "text-muted"}`}
        trigger={
          <>
            {weapon?.icon !== undefined && <img src={weapon.icon} alt="" className="h-5 w-5 shrink-0" loading="lazy" />}
            <span className="max-w-[10rem] truncate">{weapon?.name ?? labels.itemNone}</span>
            {CARET}
          </>
        }
      />
    </span>
  );

  /** 강화 칩 — 닫힘 = +N만(노강화 = +0 흐림, 강화 불가 무기는 반투명 비활성). 문자 = 컨트롤 14px 통일. */
  const plusChip = (): React.JSX.Element | null =>
    weapon === undefined ? null : (
      <EquipDropdown
        ariaLabel={labels.refineNone}
        value={String(plus)}
        options={plusOptionsOf(weapon, engrave, labels)}
        disabled={weapon.refine === undefined}
        onChange={(v) => onEquip({ plus: Number(v) })}
        onOpenChange={setOpenDrop}
        labels={labels}
        // 고정 폭 38px — 각인 42px·갭 6px과 함께 인연 드롭다운 86px과 꼭 맞는다(2026-08-31 폭 정합).
        triggerClass={`inline-flex h-7 w-[38px] items-center justify-center gap-0.5 rounded border border-rule bg-sunken px-0 text-[14px] font-semibold ${plus > 0 ? "text-gold" : "text-muted"} ${weapon.refine === undefined ? "opacity-40" : ""}`}
        trigger={
          <>
            {`+${plus}`}
            {CARET}
          </>
        }
      />
    );

  /** 각인 칩 — 닫힘 = 엠블렘 아이콘만(무각인 = 점선 빈 칸, 아이콘 없는 엠블렘 = 이름 폴백). */
  const engraveChip = (): React.JSX.Element | null =>
    weapon === undefined ? null : (
      <EquipDropdown
        ariaLabel={engrave?.name ?? labels.engrave}
        value={engrave?.gid ?? ""}
        options={engraveOptionsOf(weapon, plus, engraves, labels)}
        onChange={(gid) => onEquip({ engrave: gid })}
        onOpenChange={setOpenDrop}
        labels={labels}
        // 고정 폭 42px — 강화 칩과 함께 인연 드롭다운 폭 정합의 반쪽(2026-08-31).
        triggerClass={`inline-flex h-7 w-[42px] items-center justify-center gap-0.5 rounded border bg-sunken px-0 ${engrave !== undefined ? "border-rule" : "border-dashed border-rule opacity-60"}`}
        trigger={
          <>
            {engrave?.icon !== undefined ? (
              <img src={engrave.icon} alt="" className="h-6 w-6 object-contain" loading="lazy" />
            ) : engrave !== undefined ? (
              <span className="max-w-[5rem] truncate text-[14px] font-semibold text-ink">{engrave.name}</span>
            ) : (
              <span className="w-4" aria-hidden="true" />
            )}
            {CARET}
          </>
        }
      />
    );

  const specPop =
    specOpen && weapon !== undefined && !openDrop ? (
      <span className="absolute left-0 top-full z-40 mt-1 flex w-max max-w-[26rem] rounded border border-rule bg-panel px-2 py-1 shadow-md">
        <SpecLine weapon={weapon} plus={plus} engrave={engrave} labels={labels} />
      </span>
    ) : null;

  return (
    <>
      <td className="inlv-col px-1 pb-[10px] pt-[2px] text-center align-middle">
        {/* 개인 장비는 좌정렬(2026-08-31 사용자 지시). */}
        {(job !== undefined || weapon !== undefined) && weaponPicker("justify-start")}
      </td>
      {STAT_KEYS.map((key) => {
        // HP 하단 = 강화·각인 슬롯(빈 칸 활용, 2026-08-31 지시) · RES = 클래스 적성(무기군) 아이콘 ·
        // BLD = 실효 무기 무게(2026-08-31 배치 지시).
        if (key === "hp") {
          return (
            <td key={key} className="combat-grid stat-col min-w-[3.7rem] px-1 pb-[10px] pt-[2px] text-center align-middle md:min-w-[5.5rem] md:px-2">
              {weapon !== undefined && (
                <span className={`relative flex items-center justify-start gap-1.5${hide}`}>
                  {plusChip()}
                  {engraveChip()}
                  {specPop}
                </span>
              )}
            </td>
          );
        }
        if (key === "res") {
          return (
            <td key={key} className="combat-grid stat-col px-1 pb-[10px] pt-[2px] text-left align-middle md:px-2">
              <span className={`flex items-center justify-start gap-1${hide}`}>
                {kinds.map((k) =>
                  kindIcons[k] !== undefined ? (
                    <img key={k} src={kindIcons[k]} alt="" className="h-4 w-4" loading="lazy" />
                  ) : null,
                )}
              </span>
            </td>
          );
        }
        if (key === "bld") {
          const eff = equipped === undefined ? undefined : weaponAt(equipped.weapon, equipped.plus, equipped.engrave);
          return (
            <td key={key} className="combat-grid stat-col stat-col-last min-w-[3.7rem] px-1 pb-[10px] pt-[2px] text-center align-top md:min-w-[5.5rem] md:px-2">
              {eff !== undefined && (
                <>
                  <span className={`block text-[14px] font-semibold leading-5 text-ink opacity-70${hide}`}>
                    {labels.weight}
                  </span>
                  <span
                    className={`block text-[14px] font-bold leading-5 ${spdPenalty(row, equipped) ? "text-danger" : "text-ink"}${hide}`}
                  >
                    {eff.weight}
                  </span>
                </>
              )}
            </td>
          );
        }
        const ck = COMBAT_COL[key];
        return (
          <td
            key={key}
            className="combat-grid stat-col min-w-[3.7rem] px-1 pb-[10px] pt-[2px] text-center align-top md:min-w-[5.5rem] md:px-2"
          >
            {ck !== undefined && (
              <>
                <span className={`block text-[14px] font-semibold leading-5 text-ink opacity-70${hide}`}>
                  {labels.combat[ck]}
                </span>
                <span className={`block text-[14px] font-bold leading-5 ${deltaCls(ck)}${hide}`}>{fmtCombat(c[ck])}</span>
              </>
            )}
          </td>
        );
      })}
      <td colSpan={STAT_KEYS.length} className="combat-flow px-2 pb-[10px] pt-[2px] text-left">
        <span className={`relative flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[14px] font-bold leading-tight text-ink${hide}`}>
          {(job !== undefined || weapon !== undefined) && weaponPicker("justify-start")}
          {plusChip()}
          {engraveChip()}
          {COMBAT_KEYS.map((key) => (
            <span key={key} className="whitespace-nowrap">
              <span className="font-semibold opacity-70">{labels.combat[key]}</span>{" "}
              <span className={deltaCls(key)}>{fmtCombat(c[key])}</span>
            </span>
          ))}
          {equipped !== undefined && (
            <span className="whitespace-nowrap">
              <span className="font-semibold opacity-70">{labels.weight}</span>{" "}
              <span className={spdPenalty(row, equipped) ? "text-danger" : ""}>
                {weaponAt(equipped.weapon, equipped.plus, equipped.engrave).weight}
              </span>
            </span>
          )}
          {specPop}
        </span>
      </td>
    </>
  );
}

/**
 * 반지 슬롯(반지 행 공용) — 반지 드롭다운 + 絆 드롭다운(블루 "Lv N", 선택 시 기본 20) + 문장사 이름
 * (클릭 = 레벨 상세 팝업)을 가로 한 줄로. 반지 행(블루 최종스탯 행)의 이름 칸에 앉아 세로 정렬된다
 * (2026-08-31 사용자 지시). 대기·엔트리 구분 없이 편집 — 값의 소유만 다르다(대기 = 세션, 엔트리 = 스냅샷).
 * ☠행 잠금·블록 드래그로 새면 안 된다 — 루트에서 전파 차단.
 */
function RingSlot({
  emblem,
  bond,
  emblems,
  ringPlaceholder,
  labels,
  panelOpen,
  onPatch,
  onPanelToggle,
}: {
  emblem?: BuilderEmblemProp | undefined;
  bond: number;
  emblems: readonly BuilderEmblemProp[];
  ringPlaceholder?: string | undefined;
  labels: BuilderLabels;
  panelOpen: boolean;
  onPatch: (patch: { gid?: string; bond?: number }) => void;
  onPanelToggle: () => void;
}): React.JSX.Element {
  return (
    <span
      className="entry-ring flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <EquipDropdown
        ariaLabel={labels.ring}
        value={emblem?.gid ?? ""}
        options={ringOptionsOf(emblems, labels)}
        onChange={(gid) => onPatch({ gid })}
        labels={labels}
        // 빈 슬롯 = 점선(각인 칩과 같은 "비어 있음" 어휘) — 장착되면 실선으로 조여진다.
        triggerClass={`flex h-7 shrink-0 items-center gap-0.5 rounded border bg-sunken px-1 ${emblem !== undefined ? "border-rule" : "border-dashed border-rule opacity-60"}`}
        trigger={
          <>
            {emblem?.icon !== undefined ? (
              <img src={emblem.icon} alt="" className="h-6 w-6 object-contain" loading="lazy" />
            ) : ringPlaceholder !== undefined ? (
              <img src={ringPlaceholder} alt="" className="h-6 w-6 object-contain opacity-40" loading="lazy" />
            ) : (
              <span className="text-[13px] text-muted">{labels.ring}</span>
            )}
            {CARET}
          </>
        }
      />
      {emblem !== undefined && (
        <EquipDropdown
          ariaLabel={labels.bond}
          value={String(bond)}
          options={BOND_OPTIONS}
          onChange={(v) => onPatch({ bond: Number(v) })}
          labels={labels}
          // 인연 레벨 = 블루 "Lv N" 표기(2026-08-31 사용자 지시) — 반지 행(블루)과 같은 톤.
          triggerClass="inline-flex h-7 shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded border border-rule bg-sunken px-1 text-[14px] font-semibold text-pgrow"
          trigger={
            <>
              {`Lv ${bond}`}
              {CARET}
            </>
          }
        />
      )}
      <span className="relative flex min-w-0">
        {emblem !== undefined ? (
          <button
            type="button"
            className="max-w-[7em] cursor-pointer truncate px-0.5 text-[13px] font-semibold leading-tight text-engage hover:underline"
            onClick={onPanelToggle}
          >
            {emblem.name}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {panelOpen && emblem !== undefined && (
          <EmblemPanel emblem={emblem} bond={bond} labels={labels} onClose={onPanelToggle} />
        )}
      </span>
    </span>
  );
}

export default function BuilderIsland({
  chars,
  joinJobs,
  targetJobs,
  starsphere,
  weapons,
  engraves,
  emblems,
  ringPlaceholder,
  kindIcons,
  labels,
}: BuilderIslandProps) {
  const [slots, setSlots] = useState<BuilderSlot[]>([{ jid: "" }]);
  const [internal, setInternal] = useState(40);
  const [sort, setSort] = useState<BuilderSort | undefined>(undefined);
  // 체커는 전부 localStorage 저장(2026-08-31 사용자 지시) — SSG HTML은 기본값(전부 off)으로 굽고
  // 저장값은 하이드레이션 뒤에 읽는다(SSR 불일치 방지).
  const [star, setStar] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [showDlc, setShowDlc] = useState(false);
  // 잠금도 브라우저 저장 — 온오프 순간이 저장 시점(2026-08-31 사용자 지시).
  const [locked, setLocked] = useState<EntryLock[]>([]);
  const [hoverRow, setHoverRow] = useState<{ pid: string; li: number } | null>(null);
  /** 카드 드롭다운 조작 중인 행 — 커서가 떠나도 전투력 행·팝오버를 유지한다(li = -1은 잠금 블록). */
  const [focusRow, setFocusRow] = useState<{ pid: string; li: number } | null>(null);
  /** 카드 개인 장비(2026-08-31 사용자 설계: 상단 = 글로벌 · 카드 = 개인) — 키 = `${pid}:${li}`.
      카드를 만지는 순간 글로벌에서 분기(카피 온 라이트) — 이후 글로벌 변경은 그 카드에 안 닿는다.
      세션 한정(저장 안 함) — 영속 개인 장비는 잠금 스냅샷이 소유한다. */
  const [overrides, setOverrides] = useState<Record<string, { iid?: string; plus?: number; engrave?: string }>>({});
  /** 잠그는 순간의 1회 충격파 — ☠잠금 상태 클래스에 묶으면 저장 복원·재정렬 때마다 다시 터진다. */
  const [pulsePid, setPulsePid] = useState<string | null>(null);
  /** 대기 카드 반지(2026-08-31: 엔트리 구분 없이 편집) — 세션 상태(개인 장비 overrides와 동형).
      잠금 순간 스냅샷으로 이관되고 해제 시 되돌아온다(잠금 중 정본 = EntryLock.gid/bond). */
  const [rings, setRings] = useState<Record<string, { gid: string; bond: number }>>({});
  /** 카드 개별 클래스·내부 레벨(2026-08-31: 포트레이트 아래 드롭다운) — 라인 0(메인 슬롯)을 대체.
      세션 상태. jid 없음 = 직업 미선택(합류 상태) · internal 미지정 = 글로벌 추종. */
  const [cardClass, setCardClass] = useState<Record<string, { jid?: string; internal?: number }>>({});
  /** 문장사 레벨 상세 팝업이 열린 카드 pid(세로폰 폴딩 전용 — 데스크톱은 인연 드롭다운이 상세를 겸한다). */
  const [emblemOpen, setEmblemOpen] = useState<string | null>(null);
  /** 인연 옵션 호버 미리보기 — 본스탯 합산·+N이 이 레벨로 라이브 연동(2026-08-31 사용자 지시). */
  const [bondPreview, setBondPreview] = useState<{ pid: string; bond: number } | null>(null);
  /** 세로폰 폴딩 — 포트레이트 탭으로 반지 슬롯을 우측 전개한 pid(2026-08-31 사용자 지시). */
  const [foldPid, setFoldPid] = useState<string | null>(null);
  /** 클래스·In.Lv 드롭다운이 열린 카드 pid — 열린 동안 그 카드 th의 z를 올린다
      (☠안 올리면 목록이 다음 카드의 sticky th(z-10, DOM 후순위)에 덮여 클릭 불능 — 실사고 2026-09-01). */
  const [classDrop, setClassDrop] = useState<string | null>(null);
  useEffect(() => {
    setStar(loadStarsphere());
    setShowGrowth(loadShowGrowth());
    setShowSpoilers(loadShowSpoilers());
    setShowDlc(loadShowDlc());
    setLocked(loadEntryLocks());
  }, []);

  /** 잠금 = 클릭한 라인의 (직업, 레벨, 무기·강화·각인 = 카드 표시 그대로) + 현재 성옥 체커를 스냅샷으로 박제.
      개인 오버라이드가 없으면 글로벌 장비가 그대로 장착된다(2026-08-31 사용자 설계). 해제 = 폐기. */
  const toggleLock = (pid: string, li: number): void => {
    const on = !locked.some((e) => e.pid === pid);
    // 토글 직전 자리 스냅샷 — 커밋 후 FLIP(위로 이동 + 밀림)이 이 값으로 비행 경로를 계산한다.
    snapshotFlip();
    let next: EntryLock[];
    if (on) {
      // 고유 성장 라인(li = -1)에서 잠그면 메인 슬롯 기준. 직업 미선택이면 합류 상태 잠금.
      // 라인 0은 카드 개별 클래스(cardClass)가 글로벌을 대체한다(2026-08-31).
      const c = cardCompareOf(pid, li >= 0 ? li : 0);
      const eq = cardEquip(pid, li >= 0 ? li : 0);
      // 대기 반지는 스냅샷으로 이관(2026-08-31: 구분 없는 편집의 왕복) — 세션 쪽은 걷는다.
      const ring = rings[pid];
      next = [
        ...locked,
        {
          pid,
          internal: c?.internal ?? 0,
          ...(c !== undefined ? { jid: c.job.jid } : {}),
          ...(star ? { star: true } : {}),
          ...(eq !== undefined
            ? {
                iid: eq.weapon.iid,
                plus: eq.plus,
                ...(eq.engrave !== undefined ? { engrave: eq.engrave.gid } : {}),
              }
            : {}),
          ...(ring !== undefined ? { gid: ring.gid, bond: ring.bond } : {}),
        },
      ];
      if (ring !== undefined) setRings(({ [pid]: _moved, ...rest }) => rest);
    } else {
      // 해제 = 스냅샷의 반지를 세션 쪽으로 되돌린다(대기 카드에서 이어서 편집).
      const entry = locked.find((e) => e.pid === pid);
      if (entry?.gid !== undefined) {
        const back = { gid: entry.gid, bond: entry.bond ?? 20 };
        setRings((prev) => ({ ...prev, [pid]: back }));
      }
      next = locked.filter((e) => e.pid !== pid);
    }
    saveEntryLocks(next);
    setLocked(next);
    // 충격파는 즉시가 아니라 **도착 후** — FLIP 완료 콜백이 pendingPulse를 회수해 터뜨린다(2026-08-31 지시).
    pendingPulse.current = on ? pid : null;
    setPulsePid(null);
    // 행이 상단으로 이동하면 옛 자리의 mouseleave가 안 온다 — 호버 흔적을 지운다.
    setHoverRow(null);
  };

  /** 잠금 카드의 장비 변경 — 스냅샷의 무기·강화·각인만 갱신(저장 시점 = 변경 순간, 온오프 규약과 동일).
      무기 변경 = 강화 리셋(강화표는 무기 소유) · 각인 유지(각인 보정은 무기 무관 동일). */
  const patchLock = (pid: string, patch: { iid?: string; plus?: number; engrave?: string }): void => {
    const next = locked.map((e) => {
      if (e.pid !== pid) return e;
      let out: EntryLock = { ...e };
      if (patch.iid !== undefined) {
        const { iid: _iid, plus: _plus, ...rest } = out;
        out = patch.iid === "" ? rest : { ...rest, iid: patch.iid };
      }
      if (patch.plus !== undefined) out = { ...out, plus: patch.plus };
      if (patch.engrave !== undefined) {
        const { engrave: _engrave, ...rest } = out;
        out = patch.engrave === "" ? rest : { ...rest, engrave: patch.engrave };
      }
      return out;
    });
    saveEntryLocks(next);
    setLocked(next);
  };

  /* ── 잠금 블록 드래그 재정렬(2026-08-31) — 마우스 전용(터치는 탭 = 토글·스크롤 유지).
     끌리는 블록은 반투명으로 목표 자리를 미리 보이고, 나머지는 자리 양보 애니메이션(builder.css).
     놓는 순간 순서 확정 + 저장(온오프와 같은 저장 시점 규약). */
  const lockedRefs = useRef(new Map<string, HTMLTableSectionElement>());
  /** 대기 블록 참조 — 잠금 FLIP(이동 애니메이션)의 출발·밀림 계산용. */
  const waitingRefs = useRef(new Map<string, HTMLTableSectionElement>());
  /** 잠금 토글 직전 각 블록의 화면 top(키 = "lock:"|"wait:" + pid) — 커밋 후 FLIP이 소비. */
  const flipRects = useRef<Map<string, number> | null>(null);
  /** 도착 대기 중인 충격파 pid — 카드가 목적지에 안착한 뒤에 터진다(2026-08-31 사용자 지시). */
  const pendingPulse = useRef<string | null>(null);
  const snapshotFlip = (): void => {
    const rects = new Map<string, number>();
    for (const [pid, el] of lockedRefs.current) rects.set(`lock:${pid}`, el.getBoundingClientRect().top);
    for (const [pid, el] of waitingRefs.current) rects.set(`wait:${pid}`, el.getBoundingClientRect().top);
    flipRects.current = rects;
  };

  // 잠금 FLIP — 새 잠금 블록은 옛 대기 카드 자리에서 날아오르고(z 상승), 밀려나는 블록들은 제자리 이동.
  useLayoutEffect(() => {
    const rects = flipRects.current;
    if (rects === null) return;
    flipRects.current = null;
    const fly = (el: HTMLTableSectionElement, delta: number): Animation =>
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }], {
        duration: 380,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    // 잠금 목적지 포커스(2026-09-01 사용자 지시) — 하단에서 잠그면 화면이 새 잠금 블록으로
    // 부드럽게 따라간다(고정 헤더 높이만큼 여유). FLIP은 콘텐츠 좌표라 스크롤과 겹쳐도 안 어긋난다.
    const focusLocked = (el: HTMLElement): void => {
      const headerH = row1H + compares.length * jobRowH + 8;
      const r = el.getBoundingClientRect();
      let node: HTMLElement | null = el.parentElement;
      while (node !== null) {
        const cs = getComputedStyle(node);
        if (/(auto|scroll)/.test(cs.overflowY)) {
          const over = node.getBoundingClientRect().top + headerH - r.top;
          if (over > 0) node.scrollBy({ top: -over, behavior: "smooth" });
        }
        node = node.parentElement;
      }
      const overWin = headerH - r.top;
      if (overWin > 0) window.scrollBy({ top: -overWin, behavior: "smooth" });
    };
    for (const [pid, el] of lockedRefs.current) {
      // 새로 잠긴 블록의 출발점 = 그 캐릭터의 옛 대기 카드 자리(잠금 이력 블록은 자기 옛 자리).
      const old = rects.get(`lock:${pid}`) ?? rects.get(`wait:${pid}`);
      const delta = old === undefined ? 0 : old - el.getBoundingClientRect().top;
      if (pendingPulse.current === pid) focusLocked(el);
      if (Math.abs(delta) > 1) {
        const anim = fly(el, delta);
        // 비행 중엔 다른 sticky th(z-10)에 안 가리게 z 상승 — 도착 후 원복.
        el.style.zIndex = "30";
        const firePulse = pendingPulse.current === pid;
        if (firePulse) pendingPulse.current = null;
        anim.onfinish = () => {
          el.style.zIndex = "";
          if (firePulse) setPulsePid(pid);
        };
      } else if (pendingPulse.current === pid) {
        pendingPulse.current = null;
        setPulsePid(pid);
      }
    }
    for (const [pid, el] of waitingRefs.current) {
      const old = rects.get(`wait:${pid}`);
      const delta = old === undefined ? 0 : old - el.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) fly(el, delta);
    }
  }, [locked]);

  /** 잠금 블록 호버 — 열린 자물쇠(해제 버튼)를 이 블록에만 띄운다. */
  const [lockHover, setLockHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    pid: string;
    from: number;
    to: number;
    dy: number;
    heights: number[];
    active: boolean;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const beginDrag = (e: React.PointerEvent, pid: string, index: number): void => {
    if (e.pointerType !== "mouse" || e.button !== 0 || locked.length < 2) return;
    e.preventDefault(); // 드래그 중 텍스트 선택 방지.
    const heights = locked.map((l) => lockedRefs.current.get(l.pid)?.getBoundingClientRect().height ?? 0);
    const startY = e.clientY;
    const onMove = (ev: PointerEvent): void => {
      const dy = ev.clientY - startY;
      const active = Math.abs(dy) > 4 || (dragRef.current?.active ?? false);
      if (!active) return;
      // 목표 슬롯 = 이웃 블록 높이의 절반을 넘을 때마다 한 칸씩 걷는다(블록 높이 비균일 대응).
      let to = index;
      let rest = dy;
      while (rest > 0 && to < heights.length - 1 && rest > heights[to + 1]! / 2) {
        rest -= heights[to + 1]!;
        to += 1;
      }
      while (rest < 0 && to > 0 && -rest > heights[to - 1]! / 2) {
        rest += heights[to - 1]!;
        to -= 1;
      }
      setDrag({ pid, from: index, to, dy, heights, active: true });
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const cur = dragRef.current;
      setDrag(null);
      if (cur !== null && cur.active && cur.to !== cur.from) {
        const next = moveLock(locked, cur.from, cur.to);
        saveEntryLocks(next);
        setLocked(next);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /** 드래그 중 각 잠금 블록의 시각 이동 — 끌리는 블록은 포인터 추종, 사이 블록은 자리 양보. */
  const dragStyle = (gi: number): React.CSSProperties | undefined => {
    if (drag === null || !drag.active) return undefined;
    const h = drag.heights[drag.from] ?? 0;
    if (gi === drag.from) return { transform: `translateY(${drag.dy}px)` };
    if (drag.from < gi && gi <= drag.to) return { transform: `translateY(${-h}px)` };
    if (drag.to <= gi && gi < drag.from) return { transform: `translateY(${h}px)` };
    return { transform: "translateY(0)" };
  };

  /** Reset = 잠금 전체 해제 + 직업 미선택 디폴트(2026-08-31 사용자 확정) — 체커 저장값은 유지. */
  const reset = (): void => {
    saveEntryLocks([]);
    setLocked([]);
    setPulsePid(null);
    setSlots([{ jid: "" }]);
    setOverrides({});
    setInternal(40);
    setSort(undefined);
  };

  // 각인 후보도 체커를 지난다(2026-08-31: 스포일러 = 불꽃의 문장 · DLC 체커 = DLC 각인 연동).
  const visibleEngraves = useMemo(
    () => engraves.filter((g) => (showSpoilers || g.spoiler !== true) && (showDlc || g.dlc !== true)),
    [engraves, showSpoilers, showDlc],
  );
  // 문장사(반지) 후보도 같은 축 — 체커에 숨은 gid의 장착분은 조용히 미장착 강하(각인 게이트와 동형).
  const visibleEmblems = useMemo(
    () => emblems.filter((e) => (showSpoilers || e.spoiler !== true) && (showDlc || e.dlc !== true)),
    [emblems, showSpoilers, showDlc],
  );
  const emblemByGid = useMemo(() => new Map(visibleEmblems.map((e) => [e.gid, e])), [visibleEmblems]);
  const jobByJid = useMemo(() => new Map(targetJobs.map((j) => [j.jid, j])), [targetJobs]);

  /** 라인 li의 실효 (직업, 내부 레벨) — 라인 0은 카드 개별 편집(cardClass)이 글로벌 슬롯을 대체한다. */
  const cardCompareOf = (pid: string, li: number): BuilderCompare | undefined => {
    if (li !== 0) return compares[li];
    const ov = cardClass[pid];
    if (ov === undefined) return compares[0];
    const job = ov.jid === undefined ? undefined : jobByJid.get(ov.jid);
    if (job === undefined) return undefined; // 직업 미선택 = 합류 상태(장비 게이트도 직업 없음).
    return { job, internal: (ov.internal ?? internal) - 1 };
  };

  const compares: (BuilderCompare & { slot: number })[] = useMemo(
    () =>
      slots.flatMap((s, i) => {
        const job = targetJobs.find((t) => t.jid === s.jid);
        if (job === undefined) return [];
        // 표기는 1기점(사용자 결정 2026-08-31) — 계산·정본은 0기점이라 여기서만 ±1 변환한다.
        const level = i === 0 ? internal : (s.internal ?? internal);
        // 장착 무기 — 직업 변경 뒤 남은 부적합 iid는 조용히 맨손 강하(장착 게이트가 정본).
        const weapon = weapons.find((w) => w.iid === s.iid);
        // 각인 — 체커에 숨은 gid는 무각인 강하(visibleEngraves가 게이트).
        const engrave = visibleEngraves.find((g) => g.gid === s.engrave);
        const equipped =
          weapon !== undefined && canEquip(job, weapon)
            ? { equipped: { weapon, plus: s.plus ?? 0, ...(engrave !== undefined ? { engrave } : {}) } }
            : {};
        // slot = 원본 슬롯 인덱스 — 카드 개인 장비의 분기 기준(빈 jid 슬롯은 라인을 안 만들어 li와 어긋난다).
        return [{ job, internal: level - 1, slot: i, ...equipped }];
      }),
    [slots, internal, targetJobs, weapons, visibleEngraves],
  );

  // 헤더 1행(스탯명)·성장률 행의 실측 높이 — 성장률 행 i의 sticky top = row1H + i x jobRowH.
  // ☠같은 top을 주면 행들이 같은 자리에 포개져 마지막 직업만 보인다(실측 결함). 미디어별 패딩이 달라 CSS 상수로 못 박는다.
  const headRowRef = useRef<HTMLTableRowElement | null>(null);
  const jobRowRef = useRef<HTMLTableRowElement | null>(null);
  const [row1H, setRow1H] = useState(0);
  const [jobRowH, setJobRowH] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      setRow1H(headRowRef.current?.getBoundingClientRect().height ?? 0);
      setJobRowH(jobRowRef.current?.getBoundingClientRect().height ?? 0);
    });
    if (headRowRef.current !== null) ro.observe(headRowRef.current);
    if (jobRowRef.current !== null) ro.observe(jobRowRef.current);
    setRow1H(headRowRef.current?.getBoundingClientRect().height ?? 0);
    setJobRowH(jobRowRef.current?.getBoundingClientRect().height ?? 0);
    return () => ro.disconnect();
  }, [compares.length]);
  const extraSkills = star && starsphere !== undefined ? [starsphere] : undefined;
  // 스포일러(모브·베일)와 DLC 사룡의 장은 별도 체커(2026-08-31 사용자 재지정 — 분리).
  const visibleChars = useMemo(
    () => chars.filter((c) => (showSpoilers || c.spoiler !== true) && (showDlc || c.dlc !== true)),
    [chars, showSpoilers, showDlc],
  );
  const charByPid = useMemo(() => new Map(visibleChars.map((c) => [c.pid, c])), [visibleChars]);
  /** 체커를 지난 목표 직업(UI 목록 전용 — 해석·스냅샷 조회는 전체 표를 쓴다). 전용직은 가능자(uniquePid)가
      숨김이면 함께 숨긴다 — ☠전용직 이름이 숨김 캐릭터의 존재를 누설한다(스포일러 실사고 2026-09-01). */
  const visibleTargetJobs = useMemo(() => {
    const byPid = new Map(chars.map((c) => [c.pid, c]));
    return targetJobs.filter((j) => {
      if (j.uniquePid === undefined) return true;
      const c = byPid.get(j.uniquePid);
      if (c === undefined) return true;
      return (showSpoilers || c.spoiler !== true) && (showDlc || c.dlc !== true);
    });
  }, [targetJobs, chars, showSpoilers, showDlc]);
  // 絆 보너스는 본스탯 행에 합산(보정 스탯 블루) — 정렬도 합산값 기준. 반지 행은 추가분(+N)만 표기
  // (2026-08-31 사용자 최종 확정). 소스 = 잠금 스냅샷 우선, 아니면 대기 세션 반지.
  const groups = useMemo(() => {
    const base = builderRowGroups({ chars: visibleChars, joinJobs }, compares, extraSkills);
    // 카드 개별 클래스·In.Lv(2026-08-31) — 라인 0을 카드 값으로 재계산(글로벌 슬롯 대체).
    const personalized = base.map((g) => {
      const pid = g[0]!.pid;
      const ov = cardClass[pid];
      if (ov === undefined) return g;
      const char = charByPid.get(pid);
      const joinJob = char === undefined ? undefined : joinJobs[char.joinJid];
      if (char === undefined || joinJob === undefined) return g;
      const job = ov.jid === undefined ? undefined : jobByJid.get(ov.jid);
      const target = job === undefined ? 0 : (ov.internal ?? internal) - 1;
      return [builderRow(char, joinJob, job, target, extraSkills), ...g.slice(1)];
    });
    const lockByPid = new Map(locked.map((e) => [e.pid, e]));
    const boosted = personalized.map((g) => {
      const pid = g[0]!.pid;
      const entry = lockByPid.get(pid);
      const src = entry?.gid !== undefined ? { gid: entry.gid, bond: entry.bond ?? 20 } : rings[pid];
      if (src === undefined) return g;
      // 인연 옵션 호버 중이면 그 레벨로 미리보기 — 합산·정렬·+N이 함께 움직인다.
      const bond = bondPreview !== null && bondPreview.pid === pid ? bondPreview.bond : src.bond;
      const delta = emblemByGid.get(src.gid)?.bonuses[bond - 1];
      return delta === undefined || Object.keys(delta).length === 0 ? g : g.map((r) => applyEmblemBonus(r, delta));
    });
    return waitingRowGroups(boosted, locked, sort);
  }, [visibleChars, joinJobs, compares, sort, extraSkills, locked, rings, emblemByGid, bondPreview, cardClass, charByPid, jobByJid, internal]);
  // 잠금 스냅샷 표시행 — 현재 슬롯·정렬·성옥 체커와 무관하다(잠금 당시 값만 소비 = "고정"의 실체).
  // 스냅샷 반지의 絆 보너스도 본스탯 행에 합산(블루) — 반지 행은 추가분(+N)만(2026-08-31 최종).
  const lockedRows = useMemo(() => {
    const base = lockedDisplayRows({ chars: visibleChars, joinJobs }, targetJobs, locked, starsphere, weapons, visibleEngraves);
    return base.map((d) => {
      const entry = locked.find((e) => e.pid === d.row.pid);
      if (entry?.gid === undefined) return d;
      const bond =
        bondPreview !== null && bondPreview.pid === d.row.pid ? bondPreview.bond : (entry.bond ?? 20);
      const delta = emblemByGid.get(entry.gid)?.bonuses[bond - 1];
      return delta === undefined || Object.keys(delta).length === 0 ? d : { ...d, row: applyEmblemBonus(d.row, delta) };
    });
  }, [visibleChars, joinJobs, targetJobs, locked, starsphere, weapons, visibleEngraves, emblemByGid, bondPreview]);

  /** 카드 표시 장비 — 개인 오버라이드가 있으면 그것(게이트 재검), 없으면 글로벌 슬롯 장비. */
  const cardEquip = (pid: string, li: number): EquippedWeapon | undefined => {
    const o = overrides[`${pid}:${li}`];
    // 게이트는 실효 직업 기준 — 카드 클래스 변경 후 부적합해진 장비는 미착용으로 강하(2026-08-31 되돌림).
    const job = cardCompareOf(pid, li)?.job;
    const gate = (eq: EquippedWeapon | undefined): EquippedWeapon | undefined =>
      eq === undefined || job === undefined || !canEquip(job, eq.weapon) ? undefined : eq;
    if (o === undefined) return gate(compares[li]?.equipped);
    const weapon = o.iid === undefined ? undefined : weapons.find((w) => w.iid === o.iid);
    if (weapon === undefined) return undefined;
    const engrave = o.engrave === undefined ? undefined : visibleEngraves.find((g) => g.gid === o.engrave);
    return gate({ weapon, plus: o.plus ?? 0, ...(engrave !== undefined ? { engrave } : {}) });
  };

  /** 카드 개인 장비 변경 — 첫 터치에 글로벌 스냅샷으로 분기 후 부분 갱신("" = 해제).
      무기 변경 = 강화 리셋(강화표는 무기 소유) · 각인 유지(각인 보정은 무기 무관 동일). */
  const applyCard = (pid: string, li: number, patch: { iid?: string; plus?: number; engrave?: string }): void => {
    const key = `${pid}:${li}`;
    setOverrides((prev) => {
      const cur =
        prev[key] ??
        (() => {
          const e = compares[li]?.equipped;
          return e === undefined
            ? {}
            : {
                iid: e.weapon.iid,
                plus: e.plus,
                ...(e.engrave !== undefined ? { engrave: e.engrave.gid } : {}),
              };
        })();
      const iid = patch.iid !== undefined ? (patch.iid === "" ? undefined : patch.iid) : cur.iid;
      const plus = patch.iid !== undefined ? 0 : (patch.plus ?? cur.plus);
      const engrave = patch.engrave !== undefined ? (patch.engrave === "" ? undefined : patch.engrave) : cur.engrave;
      return {
        ...prev,
        [key]: {
          ...(iid !== undefined ? { iid } : {}),
          ...(plus !== undefined ? { plus } : {}),
          ...(engrave !== undefined ? { engrave } : {}),
        },
      };
    });
  };
  /** 잠금 카드의 반지·絆 변경 — 스냅샷 직접 갱신·즉시 저장(patchLock과 동형 규약).
      "" = 해제(絆도 걷는다). 새 반지 선택 시 기본 絆 20(2026-08-31 사용자 지시). */
  const patchRing = (pid: string, patch: { gid?: string; bond?: number }): void => {
    const next = locked.map((e) => {
      if (e.pid !== pid) return e;
      let out: EntryLock = { ...e };
      if (patch.gid !== undefined) {
        const { gid: _gid, bond: _bond, ...rest } = out;
        out = patch.gid === "" ? rest : { ...rest, gid: patch.gid, bond: e.gid === patch.gid ? (e.bond ?? 20) : 20 };
      }
      if (patch.bond !== undefined) out = { ...out, bond: patch.bond };
      return out;
    });
    saveEntryLocks(next);
    setLocked(next);
  };

  /** 대기 카드 반지 변경(2026-08-31: 구분 없는 편집) — patchRing과 같은 규약, 저장만 세션. */
  const patchWaitRing = (pid: string, patch: { gid?: string; bond?: number }): void =>
    setRings((prev) => {
      const cur = prev[pid];
      if (patch.gid !== undefined) {
        if (patch.gid === "") {
          const { [pid]: _drop, ...rest } = prev;
          return rest;
        }
        return { ...prev, [pid]: { gid: patch.gid, bond: cur?.gid === patch.gid ? cur.bond : 20 } };
      }
      if (patch.bond !== undefined && cur !== undefined) return { ...prev, [pid]: { ...cur, bond: patch.bond } };
      return prev;
    });

  /** 카드 클래스·In.Lv 변경(대기) — 첫 터치에 글로벌 슬롯 0을 스냅샷으로 분기(개인 장비와 같은 규약).
      부적합해진 장비는 cardEquip 게이트가 미착용으로 강하한다(표시 = 미착용). */
  const patchCardClass = (pid: string, patch: { jid?: string; internal?: number }): void =>
    setCardClass((prev) => {
      const cur =
        prev[pid] ??
        (compares[0] !== undefined ? { jid: compares[0].job.jid, internal: compares[0].internal + 1 } : {});
      const jid = patch.jid !== undefined ? (patch.jid === "" ? undefined : patch.jid) : cur.jid;
      const nextInternal = patch.internal ?? cur.internal;
      return {
        ...prev,
        [pid]: { ...(jid !== undefined ? { jid } : {}), ...(nextInternal !== undefined ? { internal: nextInternal } : {}) },
      };
    });

  /** 잠금 카드 클래스·In.Lv 변경 — 스냅샷 직접 갱신·즉시 저장. 새 직업이 못 드는 무기는
      명시적으로 미착용 복귀(강화·각인 동반 제거 — 2026-08-31 "되돌린다"). */
  const patchLockClass = (pid: string, patch: { jid?: string; internal?: number }): void => {
    const next = locked.map((e) => {
      if (e.pid !== pid) return e;
      let out: EntryLock = { ...e };
      if (patch.jid !== undefined) {
        const { jid: _j, ...rest } = out;
        // 미선택(내부 0) 잠금에서 클래스를 고르면 글로벌 In.Lv를 기본으로(대기 카드와 같은 추종).
        out = patch.jid === "" ? { ...rest, internal: 0 } : { ...rest, jid: patch.jid, internal: out.internal || internal - 1 };
      }
      if (patch.internal !== undefined) out = { ...out, internal: patch.internal - 1 };
      const job = out.jid === undefined ? undefined : jobByJid.get(out.jid);
      const weapon = out.iid === undefined ? undefined : weapons.find((w) => w.iid === out.iid);
      if (weapon !== undefined && (job === undefined || !canEquip(job, weapon))) {
        const { iid: _i, plus: _p, engrave: _g, ...bare } = out;
        out = bare;
      }
      return out;
    });
    saveEntryLocks(next);
    setLocked(next);
  };

  // 고유 성장 라인의 데이터 — 행(BuilderRow)은 계산 결과만 들므로 pid로 원본 개인 성장률을 찾는다.
  const growthByPid = useMemo(() => new Map(chars.map((c) => [c.pid, c.personGrowth])), [chars]);

  /** 클래스 드롭다운 옵션 — 미선택 + 전 목표 직업. 전용직(uniquePid)은 가능자 외 회색 비활성
      (2026-09-01 사용자 지시: 댄서 = 세아다스 외 사용 불가 — 클릭 무반응, disabled 옵션 규약). */
  const classOptionsFor = (pid: string): EquipOption[] => [
    { value: "", label: labels.jobNone },
    ...visibleTargetJobs.map((j) => ({
      value: j.jid,
      label: j.name,
      ...(j.uniquePid !== undefined && j.uniquePid !== pid ? { disabled: true as const } : {}),
    })),
  ];

  /** 카드 클래스·In.Lv 드롭다운 행 — 카드(이름 포함) 열 전체 폭에 [클래스 flex-1(긴 직업명 여유)]
      [In.Lv 38px]. 카드 th 하단 절대배치 = 우측 반지 행 드롭다운들과 같은 밴드·h-7·하단 정렬
      (2026-08-31 사용자 지시: 폰트 14px 통일). */
  const classRowUi = (
    pid: string,
    jidValue: string,
    jobName: string | undefined,
    internalDisplay: number,
    onPatch: (patch: { jid?: string; internal?: number }) => void,
  ): React.JSX.Element => (
    <span
      // bottom 16px = 전투력 행 무기 슬롯과 하단 일치 실측 보정(2026-09-01: 정렬 기준 = 무기).
      className="entry-classrow absolute inset-x-2 bottom-[16px] flex items-center gap-[6px]"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <EquipDropdown
        ariaLabel={labels.job}
        value={jidValue}
        options={classOptionsFor(pid)}
        onChange={(jid) => onPatch({ jid })}
        onOpenChange={(o) => setClassDrop(o ? pid : null)}
        labels={labels}
        rootClass="min-w-0 flex-1"
        triggerClass="flex h-7 w-full items-center justify-between gap-0.5 rounded border border-rule bg-sunken px-1.5 text-[14px] font-semibold leading-tight text-ink"
        trigger={
          <>
            <span className="truncate">{jobName ?? labels.jobNone}</span>
            {CARET}
          </>
        }
      />
      <EquipDropdown
        ariaLabel={labels.internal}
        value={String(internalDisplay)}
        options={INLV_OPTIONS}
        onChange={(v) => onPatch({ internal: Number(v) })}
        onOpenChange={(o) => setClassDrop(o ? pid : null)}
        labels={labels}
        // "Lv." 접두만큼 넓히고(60px) 직업 선택기(flex-1)가 그만큼 줄어든다(2026-09-01 사용자 지시).
        triggerClass="flex h-7 w-[60px] shrink-0 items-center justify-center gap-0.5 whitespace-nowrap rounded border border-rule bg-sunken px-0 text-[14px] font-semibold text-gold"
        trigger={
          <>
            {`Lv. ${internalDisplay}`}
            {CARET}
          </>
        }
      />
    </span>
  );

  /** 잠금 스냅샷의 반지 단면 — 유령 카드·잠금 블록의 반지 행이 공유하는 소스. */
  const lockRingOf = (pid: string): { gid: string; bond: number } | undefined => {
    const entry = locked.find((e) => e.pid === pid);
    return entry?.gid !== undefined ? { gid: entry.gid, bond: entry.bond ?? 20 } : undefined;
  };

  /**
   * 반지 행 — 무기 슬롯(전투력 행) **바로 위**(2026-08-31 배치 확정): IN.LV 열 = 반지 드롭다운
   * (무기 슬롯과 같은 박스: 아이콘+이름+▾), HP 열 = "인연레벨 Lv N"(하단 강화+각인 칩 폭대),
   * 나머지 스탯 열 = 추가분(+N) 블루 주석(위 합산 숫자에 붙는 세로 리듬).
   * 문장사 이름 클릭(팝업)·세로폰 폴딩은 카드(th)가 소유한다. th 없음 — 카드 th의 rowSpan이 덮는다.
   */
  const ringRow = (
    pid: string,
    src: { gid: string; bond: number } | undefined,
    onPatch: (patch: { gid?: string; bond?: number }) => void,
  ): React.JSX.Element => {
    const emblem = src === undefined ? undefined : emblemByGid.get(src.gid);
    const bond = src?.bond ?? 20;
    // 인연 옵션 호버 중이면 +N도 그 레벨로 미리보기(본스탯 합산과 동기).
    const effBond = bondPreview !== null && bondPreview.pid === pid ? bondPreview.bond : bond;
    const delta = emblem?.bonuses[effBond - 1];
    return (
      <tr key="ring">
        <td className="inlv-col px-1 pb-[2px] pt-[2px] text-left align-middle">
          <span
            className="ring-cell flex justify-start"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <EquipDropdown
              ariaLabel={labels.ring}
              value={emblem?.gid ?? ""}
              options={ringOptionsOf(visibleEmblems, labels)}
              onChange={(gid) => onPatch({ gid })}
              labels={labels}
              // 무기 슬롯과 같은 박스 규격(2026-08-31: 크기 일치) — 빈 슬롯은 점선("비어 있음" 어휘).
              triggerClass={`flex h-7 items-center gap-1 whitespace-nowrap rounded border bg-sunken px-1.5 text-[14px] font-semibold leading-tight ${emblem !== undefined ? "border-rule text-engage" : "border-dashed border-rule text-muted opacity-70"}`}
              trigger={
                <>
                  {emblem?.icon !== undefined ? (
                    <img src={emblem.icon} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                  ) : ringPlaceholder !== undefined ? (
                    <img src={ringPlaceholder} alt="" className="h-5 w-5 shrink-0 object-contain opacity-40" loading="lazy" />
                  ) : null}
                  <span className="max-w-[7rem] truncate">{emblem?.name ?? labels.ringNone}</span>
                  {CARET}
                </>
              }
            />
          </span>
        </td>
        {STAT_KEYS.map((key) => {
          if (key === "hp") {
            return (
              <td key={key} className="stat-col px-1 pb-[2px] pt-[2px] text-left align-middle md:px-2">
                {emblem !== undefined && (
                  <span
                    className="ring-cell flex justify-start"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {/* 인연 드롭다운 = 문장사 상세 겸용(2026-08-31) — 옵션 호버 = 레벨 미리보기. */}
                    <BondDropdown
                      emblem={emblem}
                      bond={bond}
                      labels={labels}
                      onChange={(n) => onPatch({ bond: n })}
                      onPreview={(n) => setBondPreview(n === null ? null : { pid, bond: n })}
                    />
                  </span>
                )}
              </td>
            );
          }
          const d = delta?.[key];
          return (
            <td
              key={key}
              className={`stat-col${key === "bld" ? " stat-col-last" : ""} px-1 pb-[4px] pt-0 text-center align-top text-[13px] font-bold text-pgrow md:px-2`}
            >
              {d !== undefined ? (d > 0 ? `+${d}` : String(d)) : ""}
            </td>
          );
        })}
      </tr>
    );
  };

  // 첫 클릭은 내림차순 — 스탯 표에서 먼저 보고 싶은 것은 상위값이다. 3클릭째 = 합류순 복귀.
  const toggle = (key: StatKey): void => setSort((s) => nextSort(s, key));

  /** 카드 드롭다운 포커스 추적 — 조작 중에는 커서가 떠나도 전투력 행·팝오버가 유지된다.
      onBlur는 행 안 이동(무기→강화 셀렉트)이면 무시(relatedTarget 포함 검사) — 깜빡임 방지. */
  const focusActs = (pid: string, li: number) => ({
    onFocus: () => setFocusRow({ pid, li }),
    onBlur: (e: React.FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusRow(null);
    },
  });

  const patchSlot = (i: number, patch: Partial<BuilderSlot>): void =>
    setSlots((s) => s.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  /** 직업 변경 = 무기·각인 초기화(장착 게이트가 직업 소유) — 내부 레벨만 승계한다.
      그 슬롯 라인의 카드 개인 장비도 폐기(옛 직업 기준의 분기가 새 직업에 남으면 안 된다). */
  const setSlotJob = (i: number, jid: string): void => {
    setSlots((s) =>
      s.map((v, idx) => (idx === i ? { jid, ...(v.internal !== undefined ? { internal: v.internal } : {}) } : v)),
    );
    setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.endsWith(`:${i}`))));
  };
  const setSlotItem = (i: number, iid: string): void =>
    setSlots((s) =>
      s.map((v, idx) => {
        if (idx !== i) return v;
        const { iid: _iid, plus: _plus, ...rest } = v;
        return iid === "" ? rest : { ...rest, iid };
      }),
    );
  /** 글로벌 각인 선택(상단 컨트롤, 2026-08-31 사용자 설계) — "" = 무각인. 무기와 독립. */
  const setSlotEngrave = (i: number, gid: string): void =>
    setSlots((s) =>
      s.map((v, idx) => {
        if (idx !== i) return v;
        const { engrave: _engrave, ...rest } = v;
        return gid === "" ? rest : { ...rest, engrave: gid };
      }),
    );

  const selectClass =
    "rounded border border-rule bg-sunken px-2 py-1 text-[14px] text-ink focus:outline-none focus-visible:outline-2";
  const legendClass = "text-[14px] font-medium text-muted";
  // 컨트롤 영역 문자들은 전부 14px 통일(2026-08-31 사용자 지시 — 통일감).
  const checkerClass = "flex items-center gap-1.5 pb-1.5 text-[14px] text-ink";

  // 동명 전용직 구분(사룡의 아이 x3: 베일·엘·라파르) — 목록에서만 가능자 이름을 덧단다.
  const jobNameDups = useMemo(() => {
    const count = new Map<string, number>();
    for (const j of targetJobs) count.set(j.name, (count.get(j.name) ?? 0) + 1);
    return new Set([...count].filter(([, n]) => n > 1).map(([name]) => name));
  }, [targetJobs]);
  const jobLabel = (j: BuilderJobProp): string =>
    jobNameDups.has(j.name) && j.uniquePid !== undefined
      ? `${j.name}(${chars.find((c) => c.pid === j.uniquePid)?.name ?? ""})`
      : j.name;

  const jobSelect = (i: number): React.JSX.Element => (
    <select className={selectClass} value={slots[i]?.jid ?? ""} onChange={(e) => setSlotJob(i, e.target.value)}>
      <option value="">{labels.jobNone}</option>
      {visibleTargetJobs.map((j) => (
        <option key={j.jid} value={j.jid}>
          {jobLabel(j)}
        </option>
      ))}
    </select>
  );

  /** 아이템 + 강화 + 각인 선택기(슬롯별 = 글로벌 장비, 2026-08-31 사용자 설계) —
      강화·각인·스펙은 아이템이 정해진 뒤에만 선다(2026-08-31). 카드와 같은 커스텀 드롭다운
      (옵션 호버 = 우측 스펙 오버레이) — 셀렉트풍 트리거로 기존 외형을 유지한다. */
  const dropTriggerClass = "flex items-center gap-1 rounded border border-rule bg-sunken px-2 py-1 text-[14px]";
  const itemControls = (i: number): React.JSX.Element => {
    const slot = slots[i];
    const job = targetJobs.find((t) => t.jid === slot?.jid);
    // 클래스 무기군만 표시, 랭크 밖은 회색 비활성(2026-08-31) — 게이트 정본 = canEquip.
    const options = job === undefined ? [] : weapons.filter((w) => job.weaponRanks[w.kind] !== undefined);
    const weapon = job === undefined ? undefined : options.find((w) => w.iid === slot?.iid && canEquip(job, w));
    const plus = slot?.plus ?? 0;
    const engrave = visibleEngraves.find((g) => g.gid === slot?.engrave);
    return (
      <>
        <span className="flex flex-col gap-1">
          {i === 0 && <span className={legendClass}>{labels.item}</span>}
          <span className="flex items-center gap-1">
            {/* 선택 무기 아이콘 — 트리거 밖 고정 폭(선택 전에도 자리 유지 = 줄이 안 움직인다). */}
            <span className="flex h-[30px] w-5 shrink-0 items-center justify-center">
              {weapon?.icon !== undefined && <img src={weapon.icon} alt="" className="h-5 w-5" />}
            </span>
            <EquipDropdown
              ariaLabel={labels.item}
              value={weapon?.iid ?? ""}
              options={weaponOptionsOf(options, job, engrave, labels)}
              disabled={job === undefined}
              onChange={(iid) => setSlotItem(i, iid)}
              labels={labels}
              triggerClass={`${dropTriggerClass} ${weapon !== undefined ? "text-ink" : "text-muted"}${job === undefined ? " opacity-50" : ""}`}
              trigger={
                <>
                  <span className="max-w-[10rem] truncate">{weapon?.name ?? labels.itemNone}</span>
                  {CARET}
                </>
              }
            />
          </span>
        </span>
        {weapon !== undefined && (
          <EquipDropdown
            ariaLabel={labels.refineNone}
            value={String(plus)}
            options={plusOptionsOf(weapon, engrave, labels)}
            disabled={weapon.refine === undefined}
            onChange={(v) => patchSlot(i, { plus: Number(v) })}
            labels={labels}
            triggerClass={`${dropTriggerClass} text-ink${weapon.refine === undefined ? " opacity-50" : ""}`}
            trigger={
              <>
                {plus > 0 ? `+${plus}` : labels.refineNone}
                {CARET}
              </>
            }
          />
        )}
        {weapon !== undefined && (
          <EquipDropdown
            ariaLabel={labels.engrave}
            value={engrave?.gid ?? ""}
            options={engraveOptionsOf(weapon, plus, visibleEngraves, labels)}
            onChange={(gid) => setSlotEngrave(i, gid)}
            labels={labels}
            triggerClass={`${dropTriggerClass} text-ink`}
            trigger={
              <>
                <span className="max-w-[8rem] truncate">{engrave?.name ?? labels.engraveNone}</span>
                {CARET}
              </>
            }
          />
        )}
        {weapon !== undefined && (
          <span className="flex items-center pb-[6px]">
            <SpecLine weapon={weapon} plus={plus} engrave={engrave} labels={labels} />
          </span>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 윗줄 = 미선택 안내(좌, 고정 높이) + 체커·Reset(우) — 아이템 선택기가 아랫줄 우측 공간을
          쓰도록 체커를 올렸다(2026-08-31). 항상 렌더 = 선택·Reset에도 표가 안 움직인다. */}
      <div className="-mt-4 mb-3 flex shrink-0 flex-wrap items-end justify-between gap-x-5 gap-y-1">
        <p className="h-5 text-[14px] leading-5 text-muted [@media(max-height:520px)]:hidden">
          {compares.length === 0 ? labels.joinedNote : ""}
        </p>
        <span className="ml-auto flex flex-wrap items-end gap-x-5 gap-y-2">
          {starsphere !== undefined && (
            <label className={checkerClass}>
              <input
                type="checkbox"
                checked={star}
                onChange={(e) => {
                  setStar(e.target.checked);
                  saveStarsphere(e.target.checked);
                }}
                className="h-3.5 w-3.5 accent-[var(--gold)]"
              />
              {labels.starsphere}
            </label>
          )}
          <label className={checkerClass}>
            <input
              type="checkbox"
              checked={showGrowth}
              onChange={(e) => {
                setShowGrowth(e.target.checked);
                saveShowGrowth(e.target.checked);
              }}
              className="h-3.5 w-3.5 accent-[var(--pgrow)]"
            />
            {labels.personalGrowth}
          </label>
          <label className={checkerClass}>
            <input
              type="checkbox"
              checked={showSpoilers}
              onChange={(e) => {
                setShowSpoilers(e.target.checked);
                saveShowSpoilers(e.target.checked);
              }}
              className="h-3.5 w-3.5 accent-[var(--gold)]"
            />
            {labels.showSpoilers}
          </label>
          {/* DLC 체커(스포일러와 분리, 2026-08-31) — 컨테이너가 flex-wrap이라 많으면 자동 두 줄. */}
          <label className={checkerClass}>
            <input
              type="checkbox"
              checked={showDlc}
              onChange={(e) => {
                setShowDlc(e.target.checked);
                saveShowDlc(e.target.checked);
              }}
              className="h-3.5 w-3.5 accent-[var(--gold)]"
            />
            {labels.showDlc}
          </label>
          <button
            type="button"
            onClick={reset}
            className="mb-0.5 rounded border border-rule px-2.5 py-[3px] text-[14px] text-muted hover:bg-sunken hover:text-ink"
          >
            {labels.reset}
          </button>
        </span>
      </div>
      <div className="mb-4 flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className={legendClass}>{labels.job}</span>
          {jobSelect(0)}
        </label>

        <label className="flex flex-col gap-1">
          <span className={legendClass}>{labels.internal}</span>
          <select className={selectClass} value={internal} onChange={(e) => setInternal(Number(e.target.value))}>
            {INTERNAL_LEVELS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {itemControls(0)}

        <button
          type="button"
          onClick={() => setSlots((s) => [...s, { jid: "" }])}
          disabled={slots.length >= MAX_JOBS}
          className="rounded px-3 py-[5px] text-[14px] font-bold text-gold hover:bg-sunken disabled:opacity-40"
        >
          {`+ ${labels.addCompare}`}
        </button>
      </div>

      {slots.length > 1 && (
        <div className="-mt-2 mb-4 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          {slots.slice(1).map((slot, i) => (
            <span key={i} className="flex flex-wrap items-center gap-1.5">
              {jobSelect(i + 1)}
              {/* 슬롯 내부 레벨 — 값 미지정이면 1번(메인) 추종, 고르면 그 슬롯만 고정(2026-08-31). */}
              <select
                className={selectClass}
                value={slot.internal ?? internal}
                onChange={(e) => patchSlot(i + 1, { internal: Number(e.target.value) })}
              >
                {INTERNAL_LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {itemControls(i + 1)}
              <button
                type="button"
                aria-label={labels.removeCompare}
                title={labels.removeCompare}
                onClick={() => {
                  // 슬롯 제거 = 인덱스가 밀린다 — 카드 개인 장비(키에 슬롯 인덱스)는 전부 폐기.
                  setSlots((s) => s.filter((_v, idx) => idx !== i + 1));
                  setOverrides({});
                }}
                className="rounded px-1.5 py-0.5 text-[15px] text-muted hover:bg-sunken hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="builder-scroll min-h-0 flex-1 w-fit max-w-full overflow-auto rounded border border-rule bg-panel [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-rule [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted">
        {/* ☠border-collapse 금지 — collapse 모델에서는 sticky 헤더 셀의 배경 페인트가 스크롤에 뒤처져
            본문 글자가 헤더를 뚫고 비친다(가로폰 실측, Chromium). 구분선은 셀이 소유한다. */}
        <table className="builder-table border-separate [border-spacing:0] text-[14px] md:text-[17px]">
          {/* 모노 폰트는 1행(스탯명)만 — 성장률 행은 본문과 같은 서체(2026-08-31 사용자 지시). */}
          <thead>
            <tr ref={headRowRef} className="[font-family:'JetBrains_Mono',ui-monospace,monospace]">
              <th className="sticky left-0 top-0 z-30 bg-panel px-3 py-1 text-left align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                <span className="corner-label block px-1 text-muted md:px-2">Character</span>
              </th>
              <th className="inlv-col sticky top-0 z-20 bg-panel p-0 text-center align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                <span className="flex items-center justify-center px-1 py-2 text-gold md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1" title={labels.internalShort}>
                  IN.LV
                </span>
              </th>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className={`stat-col${key === "bld" ? " stat-col-last" : ""} sticky top-0 z-20 min-w-[3.7rem] bg-panel p-0 align-middle md:min-w-[5.5rem] font-normal shadow-[inset_0_-1px_0_var(--rule)]`}
                  aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex w-full items-center justify-center rounded px-1 py-2 hover:bg-sunken md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1"
                  >
                    <span className={sort?.key === key ? "text-gold" : "text-ink"} title={labels.stats[key]}>
                      {STAT_EN[key]}
                      {sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
            {compares.map((c, ci) => {
              const top = row1H + ci * jobRowH;
              return (
                // 성장률 행 — 본문 각 캐릭터의 ci번째 라인과 같은 슬롯(builderRowGroups의 순서 동치).
                <tr key={`${c.job.jid}-${ci}`} className="job-row" ref={ci === 0 ? jobRowRef : undefined}>
                  <th scope="row" style={{ top }} className="sticky left-0 z-30 bg-panel px-3 py-[9px] text-left font-normal shadow-[inset_0_-1px_0_var(--rule)]">
                    <span className="job-name block truncate px-1 text-[15px] font-semibold text-ink md:px-2 md:text-[17px]">{c.job.name}</span>
                  </th>
                  <td style={{ top }} className="inlv-col sticky z-20 bg-panel text-center text-gold shadow-[inset_0_-1px_0_var(--rule)]">
                    {c.internal + 1}
                  </td>
                  {STAT_KEYS.map((key) => (
                    <td key={key} style={{ top }} className={`stat-col${key === "bld" ? " stat-col-last" : ""} sticky z-20 bg-panel px-1 py-[9px] text-center shadow-[inset_0_-1px_0_var(--rule)]`}>
                      <span className="grow-note font-bold text-gold" title={labels.growth}>
                        {`${c.job.diffGrow[key]}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </thead>
          {/* ── 잠금 블록 — 스냅샷 1행 + 전투력 행. 블록 전체 인게이지 블루 테두리(builder.css ::after).
              자물쇠 아이콘은 잠금 후 사라진다(테두리가 상태 표지) — 슬롯은 공백으로 남아 표가 안 움직인다. ── */}
          {lockedRows.map(({ row, job, equipped }, gi) => {
            const sep = gi > 0 ? "border-t border-rule" : "";
            const isPulse = pulsePid === row.pid;
            const lockRing = lockRingOf(row.pid);
            const lockEntry = locked.find((e) => e.pid === row.pid);
            const lockEmblem = lockRing === undefined ? undefined : emblemByGid.get(lockRing.gid);
            const thRaised = emblemOpen === row.pid || foldPid === row.pid || classDrop === row.pid;
            // ☠행·배경 클릭으로는 안 풀린다(부주의 방지, 2026-08-31) — 마우스 해제 = 호버 자물쇠 버튼만.
            // 터치(세로폰)는 자물쇠 슬롯이 숨어 있어 탭 = 해제를 유지한다.
            const touchUnlock = (e: React.MouseEvent): void => {
              const native = e.nativeEvent as PointerEvent;
              if (native.pointerType === "touch") toggleLock(row.pid, -1);
            };
            const dragCls =
              drag !== null && drag.active ? (drag.from === gi ? " entry-dragging" : " entry-drag-shift") : "";
            // 카드 th = 블록 전체([고유성장?]+스탯+반지+전투력) — 하단(무기 슬롯 밴드)에 클래스 행 절대배치.
            const lockTh = (
              <th
                scope="row"
                rowSpan={3 + (showGrowth ? 1 : 0)}
                className={`sticky left-0 bg-panel px-2 py-[3px] text-left align-middle font-normal ${thRaised ? "z-20" : "z-10"} ${sep}`}
              >
                <span className="entry-wrap flex items-center">
                  <span
                    className="entry-card"
                    // 세로폰: 포트레이트 탭 = 우측 폴딩 토글(반지 슬롯 전개, 2026-08-31 사용자 지시).
                    // 잠금 해제 탭은 스탯 영역이 맡는다(전파 차단으로 오발 방지).
                    onClick={(e) => {
                      const native = e.nativeEvent as PointerEvent;
                      if (native.pointerType === "touch" && window.matchMedia("(max-width: 767px)").matches) {
                        e.stopPropagation();
                        setFoldPid((p) => (p === row.pid ? null : row.pid));
                      }
                    }}
                  >
                    {row.face !== undefined && (
                      <img src={row.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[5em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{row.name}</span>
                  </span>
                  {/* 해제 버튼은 호버 시 스탯 행 마지막 셀 우측 바 — 행·배경 클릭은 무반응(부주의 방지). */}
                </span>
                {/* 절대배치 클래스 행의 자리 확보용 여백(카드 아래 밴드). */}
                <span className="block h-[32px]" aria-hidden="true" />
                {/* 스냅샷 클래스·In.Lv 드롭다운(2026-08-31 개별 편집) — 변경 = 즉시 저장·부적합 무기 미착용 복귀. */}
                {classRowUi(
                  row.pid,
                  lockEntry?.jid ?? "",
                  job?.name,
                  (lockEntry?.internal ?? 0) + 1,
                  (p) => patchLockClass(row.pid, p),
                )}
                {/* 세로폰 폴딩 클러스터 — 데스크톱은 반지 행이 대신하므로 상시 숨김(builder.css). */}
                <RingSlot
                  emblem={lockEmblem}
                  bond={lockRing?.bond ?? 20}
                  emblems={visibleEmblems}
                  ringPlaceholder={ringPlaceholder}
                  labels={labels}
                  panelOpen={emblemOpen === row.pid}
                  onPatch={(p) => patchRing(row.pid, p)}
                  onPanelToggle={() => setEmblemOpen((p) => (p === row.pid ? null : row.pid))}
                />
              </th>
            );
            return (
              <tbody
                key={`lock-${row.pid}`}
                ref={(el) => {
                  if (el !== null) lockedRefs.current.set(row.pid, el);
                  else lockedRefs.current.delete(row.pid);
                }}
                style={dragStyle(gi)}
                onPointerDown={(e) => beginDrag(e, row.pid, gi)}
                onMouseEnter={() => setLockHover(row.pid)}
                onMouseLeave={() => setLockHover(null)}
                className={`group entry-locked-block${isPulse ? " entry-lock-pulse" : ""}${foldPid === row.pid ? " entry-fold-open" : ""}${dragCls}`}
                onAnimationEnd={isPulse ? () => setPulsePid(null) : undefined}
              >
                {/* 고유 성장 라인 — 정보 제공이라 엔트리 블록도 반응(2026-09-01 사용자 지시). 블록 첫 줄. */}
                {showGrowth && (
                  <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock}>
                    {lockTh}
                    <td className={`inlv-col px-2 py-1 ${sep}`} />
                    {STAT_KEYS.map((key) => (
                      <td
                        key={key}
                        title={labels.personalGrowth}
                        className={`stat-col${key === "bld" ? " stat-col-last" : ""} min-w-[3.7rem] px-1 py-1 text-center font-bold text-gold md:min-w-[5.5rem] md:px-2 ${sep}`}
                      >
                        {`${growthByPid.get(row.pid)?.[key] ?? 0}%`}
                      </td>
                    ))}
                  </tr>
                )}
                <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock}>
                  {!showGrowth && lockTh}
                  <td className={`inlv-col px-2 py-1 text-center text-gold ${row.projected ? "" : "opacity-55"} ${showGrowth ? "" : sep}`}>
                    {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                  </td>
                  {STAT_KEYS.map((key) => {
                    const cell = row.cells[key];
                    const down = key === "spd" && spdPenalty(row, equipped);
                    // 絆 보너스 상승 = 블루 — SPD 무게 레드와 겹치면 상승 우선(2026-08-31 사용자 지시).
                    const tone = cell.buffed === true ? "text-pgrow" : down ? "text-danger" : cell.capped ? "text-cap" : "text-ink";
                    return (
                      <td
                        key={key}
                        className={`stat-col${key === "bld" ? " stat-col-last" : ""} relative min-w-[3.7rem] px-1 py-1 text-center font-bold md:min-w-[5.5rem] md:px-2 ${tone} ${showGrowth ? "" : sep}`}
                      >
                        {cell.text}
                        {/* 해제 바(2026-08-31 재설계) — 블록 호버 시 스탯 행 우측(레드), 클릭 = 대기 복귀. */}
                        {key === "bld" && lockHover === row.pid && (
                          <button
                            type="button"
                            aria-label={labels.unlock}
                            title={labels.unlock}
                            className="entry-lockbar entry-lockbar-off"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(row.pid, -1);
                            }}
                          >
                            <span className="text-[13px] font-bold tracking-tighter text-white">{">>"}</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {/* 반지 행 — 무기 슬롯 바로 위(2026-08-31 배치 확정). 스냅샷 반지 소스, 즉시 저장. */}
                {ringRow(row.pid, lockRing, (p) => patchRing(row.pid, p))}
                {/* 전투력 행 — 잠금은 상시 표시 + 카드 장비 변경(스냅샷 직접 갱신·즉시 저장, 2026-08-31). */}
                <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock} {...focusActs(row.pid, -1)}>
                  <CombatCells
                    row={row}
                    job={job}
                    equipped={equipped}
                    ghost={false}
                    specOpen={focusRow !== null && focusRow.pid === row.pid && focusRow.li === -1}
                    weapons={weapons}
                    engraves={visibleEngraves}
                    kindIcons={kindIcons}
                    labels={labels}
                    onEquip={(p) => patchLock(row.pid, p)}
                  />
                </tr>
              </tbody>
            );
          })}
          {groups.map(({ rows: g, ghost }, gi) => {
            const first = g[0]!;
            // 캐릭터 사이 구분선 = 각 묶음 첫 라인 셀의 border-t(맨 첫 묶음 제외 — 잠금 블록 포함 계산).
            const sep = lockedRows.length + gi > 0 ? "border-t border-rule" : "";
            // 멀티 모드는 라인마다 단일 모드 행 높이만큼 여백(2026-08-31 사용자 지시 — 답답함 방지,
            // 포트레이트 1장 + 스탯 라인 x직업 수). 세로·가로폰은 builder.css !important가 압축을 유지한다.
            const roomy = g.length > 1 ? "py-[15px]" : "py-1";
            const hovered = hoverRow !== null && hoverRow.pid === first.pid;
            const focused = focusRow !== null && focusRow.pid === first.pid;
            // 활성 라인(호버 우선, 카드 드롭다운 조작 중 포함) — 클래스명·SPD 페널티 표기의 기준.
            const activeLi =
              hovered && hoverRow.li >= 0 ? hoverRow.li : focused && focusRow.li >= 0 ? focusRow.li : undefined;
            /** 전투력 행 공개 — 라인 호버 또는 그 라인의 카드 드롭다운 조작 중. 자리는 상시(공란). */
            const revealed = (li: number): boolean =>
              (hovered && hoverRow.li === li) || (focused && focusRow.li === li);
            // 유령 카드(엔트리 잠금분의 비교용 사본)만 무반응 — 전용직 불가 행도 참전(잠금)은 제한 없음
            // (2026-08-31 사용자 지시 — 합류 상태 값으로 잠긴다).
            const groupInert = ghost;
            /** 행 단위 호버·클릭 반응 — 전용직 불가(ineligible) 행은 차단: 해당 캐릭터만 반응(2026-08-31). */
            const rowActs = (inert: boolean, li: number) =>
              inert
                ? {}
                : {
                    onMouseEnter: () => setHoverRow({ pid: first.pid, li }),
                    onMouseLeave: () => setHoverRow(null),
                    onClick: () => toggleLock(first.pid, li),
                  };
            const ringSrc = ghost ? lockRingOf(first.pid) : rings[first.pid];
            const wEmblem = ringSrc === undefined ? undefined : emblemByGid.get(ringSrc.gid);
            const thRaised = !ghost && (emblemOpen === first.pid || foldPid === first.pid || classDrop === first.pid);
            const nameTh = (
              <th
                scope="row"
                // 카드 th = [고유성장?]+스탯0+반지+전투력0 행까지 — 하단(무기 슬롯 밴드)에 클래스 행이
                // 절대배치로 앉아 무기·강화·각인과 하단 정렬된다(2026-09-01 정정). 이후 행은 필러 th.
                rowSpan={(showGrowth ? 1 : 0) + 3}
                className={`sticky left-0 bg-panel px-2 py-[3px] text-left align-middle font-normal ${thRaised ? "z-20" : "z-10"} ${sep}`}
              >
                <span className="entry-wrap flex items-center">
                  <span
                    className="entry-card"
                    // 세로폰: 포트레이트 탭 = 반지 슬롯 우측 폴딩 토글(유령 카드는 무반응, 2026-08-31).
                    onClick={(e) => {
                      const native = e.nativeEvent as PointerEvent;
                      if (!ghost && native.pointerType === "touch" && window.matchMedia("(max-width: 767px)").matches) {
                        e.stopPropagation();
                        setFoldPid((p) => (p === first.pid ? null : first.pid));
                      }
                    }}
                  >
                    {first.face !== undefined && (
                      <img src={first.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[5em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{first.name}</span>
                  </span>
                  {/* 자물쇠 슬롯 폐기(2026-08-31 재설계) — 잠금 버튼은 행 호버 시 마지막 셀 우측 바로. */}
                </span>
                {/* 카드 개별 클래스·In.Lv(2026-08-31) — 포트레이트 아래, 포트레이트 폭 정합. */}
                {classRowUi(
                  first.pid,
                  cardClass[first.pid] !== undefined ? (cardClass[first.pid]!.jid ?? "") : (compares[0]?.job.jid ?? ""),
                  cardCompareOf(first.pid, 0)?.job.name,
                  cardClass[first.pid]?.internal ?? (compares[0] !== undefined ? compares[0].internal + 1 : internal),
                  (p) => patchCardClass(first.pid, p),
                )}
                {/* 호버 클래스명 라인(jobslot)은 폐기 — 카드 하단 밴드를 클래스 드롭다운이 차지한다
                    (2026-08-31: 클래스 개별 편집이 표시를 겸한다). 절대배치 클래스 행의 자리 확보용 여백. */}
                <span className="block h-[32px]" aria-hidden="true" />
                {/* 세로폰 폴딩 클러스터 — 데스크톱은 반지 행이 대신하므로 상시 숨김(builder.css).
                    카드 하단 문장사 이름은 삭제(2026-08-31 지시 — 상세는 인연 드롭다운이 겸한다). */}
                <RingSlot
                  emblem={wEmblem}
                  bond={ringSrc?.bond ?? 20}
                  emblems={visibleEmblems}
                  ringPlaceholder={ringPlaceholder}
                  labels={labels}
                  panelOpen={!ghost && emblemOpen === first.pid}
                  onPatch={(p) => patchWaitRing(first.pid, p)}
                  onPanelToggle={() => setEmblemOpen((p) => (p === first.pid ? null : first.pid))}
                />
              </th>
            );
            return (
              <tbody
                key={first.pid}
                ref={(el) => {
                  if (el !== null) waitingRefs.current.set(first.pid, el);
                  else waitingRefs.current.delete(first.pid);
                }}
                className={`group${ghost ? " entry-ghost" : ""}${!ghost && foldPid === first.pid ? " entry-fold-open" : ""}`}
              >
                {showGrowth && (
                  // 고유 성장 라인 — 블록 첫 줄(기존 행은 한 칸씩 아래로), 개인 성장률을 블루로(2026-08-31 사용자 지시).
                  <tr className={groupInert ? "" : "cursor-pointer hover:bg-sunken"} {...rowActs(groupInert, -1)}>
                    {nameTh}
                    <td className={`inlv-col px-2 ${roomy} ${sep}`} />
                    {STAT_KEYS.map((key) => (
                      <td
                        key={key}
                        title={labels.personalGrowth}
                        className={`stat-col${key === "bld" ? " stat-col-last" : ""} relative min-w-[3.7rem] px-1 ${roomy} text-center font-bold text-gold md:min-w-[5.5rem] md:px-2 ${sep}`}
                      >
                        {`${growthByPid.get(first.pid)?.[key] ?? 0}%`}
                        {key === "bld" && !groupInert && hovered && hoverRow.li === -1 && (
                          <button
                            type="button"
                            aria-label={labels.lock}
                            title={labels.lock}
                            className="entry-lockbar"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(first.pid, -1);
                            }}
                          >
                            <span className="text-[13px] font-bold tracking-tighter text-white">{"<<"}</span>
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                {g.flatMap((row, li) => {
                  const eq = cardEquip(first.pid, li);
                  // 참전 제한 없음(2026-08-31) — 전용직 불가 행도 호버·잠금 가능(표시는 계속 흐림).
                  const inert = ghost;
                  const line = (
                    <tr
                      key={li}
                      className={inert ? "" : "cursor-pointer hover:bg-sunken"}
                      {...rowActs(inert, li)}
                      {...(row.ineligible ? { title: labels.unavailable } : {})}
                    >
                      {li === 0 && !showGrowth && nameTh}
                      {/* 필러 th — 카드 th가 전투력0 행까지만 덮으므로 남은 라인의 이름 열을 잇는다. */}
                      {li === 1 && (
                        <th scope="row" rowSpan={g.length * 2 - 2} aria-hidden="true" className="sticky left-0 z-10 bg-panel" />
                      )}
                      <td className={`inlv-col px-2 ${roomy} text-center text-gold ${row.projected ? "" : "opacity-55"} ${li === 0 && !showGrowth ? sep : ""}`}>
                        {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                      </td>
                      {STAT_KEYS.map((key) => {
                        const cell = row.cells[key];
                        const down = key === "spd" && li === activeLi && spdPenalty(row, eq);
                        // 絆 보너스 상승 = 블루 — 무게로 깎인 SPD 레드와 겹치면 상승이 우선(2026-08-31 사용자 지시).
                        const tone = cell.buffed === true ? "text-pgrow" : down ? "text-danger" : cell.capped ? "text-cap" : "text-ink";
                        return (
                          <td
                            key={key}
                            className={`stat-col${key === "bld" ? " stat-col-last" : ""} relative min-w-[3.7rem] px-1 ${roomy} text-center font-bold md:min-w-[5.5rem] md:px-2 ${tone} ${row.ineligible ? "opacity-45" : ""} ${li === 0 && !showGrowth ? sep : ""}`}
                          >
                            {cell.text}
                            {/* 잠금 바(2026-08-31 재설계) — 호버 라인 마지막 셀 우측, 셀 크기·위치 불변. */}
                            {key === "bld" && !inert && hovered && hoverRow.li === li && (
                              <button
                                type="button"
                                aria-label={labels.lock}
                                title={labels.lock}
                                className="entry-lockbar"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLock(first.pid, li);
                                }}
                              >
                                <span className="text-[13px] font-bold tracking-tighter text-white">{"<<"}</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                  // 전투력 행 상시 자리(2026-08-31 지시: 처음부터 크기 확보, 공란 — 표가 안 움직인다).
                  // 내용은 호버·드롭다운 조작 중에만 공개. ☠호버 없는 기기(터치)는 공개 수단이 없어
                  // CSS(@media hover:none)가 combat-ghost 행을 통째로 걷는다 — 잠금 블록 전투력 행은 남는다.
                  const open = !row.ineligible && revealed(li);
                  return [
                    line,
                    // 반지 행 — 첫 라인의 스탯과 무기 슬롯(전투력 행) 사이(2026-08-31 배치 확정).
                    ...(li === 0 ? [ringRow(first.pid, ringSrc, (p) => patchWaitRing(first.pid, p))] : []),
                    <tr
                      key={`combat-${li}`}
                      className={`combat-ghost${inert ? "" : " cursor-pointer hover:bg-sunken"}`}
                      {...rowActs(inert, li)}
                      {...(inert ? {} : focusActs(first.pid, li))}
                    >
                      <CombatCells
                        row={row}
                        job={cardCompareOf(first.pid, li)?.job}
                        equipped={eq}
                        ghost={!open}
                        specOpen={focusRow !== null && focusRow.pid === first.pid && focusRow.li === li}
                        weapons={weapons}
                        engraves={visibleEngraves}
                        kindIcons={kindIcons}
                        labels={labels}
                        onEquip={(p) => applyCard(first.pid, li, p)}
                      />
                    </tr>,
                  ];
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
