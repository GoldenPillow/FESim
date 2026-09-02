import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STAT_KEYS, type SkillRow, type StatKey } from "@fesim/engine";
import {
  applyEmblemBonus,
  applyStatBonus,
  builderRow,
  builderRowGroups,
  canEquip,
  carriedEquip,
  combatOf,
  COMBAT_KEYS,
  effectiveWeaponRanks,
  inheritOptions,
  lockedDisplayRows,
  moveLock,
  nextSort,
  skillStatDelta,
  upgradeTargets,
  waitingRowGroups,
  weaponAt,
  type BuilderCell,
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

/** 내부 레벨 10~50 — 1단위 세분화(2026-09-01 사용자 지시, 기존 5단위 대체). 글로벌·카드 선택기 공용. */
const INTERNAL_LEVELS = Array.from({ length: 41 }, (_, i) => 10 + i);
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

/** 각인 원래 스펙 패널(세로) — 각인 옵션 호버 오버레이. 결합 실효치가 아니라 각인 자체 보정치를
    규격 6필드 전부(0·음수 포함) 표기한다(2026-09-01 사용자 지시). 색은 델타 규약(무게는 반전). */
const EngraveSpecPanel = ({
  engrave,
  labels,
}: {
  engrave: BuilderEngraveProp;
  labels: BuilderLabels;
}): React.JSX.Element => {
  const rows: [string, number, boolean][] = [
    [labels.might, engrave.power, false],
    [labels.combat.hit, engrave.hit, false],
    [labels.combat.crit, engrave.crit, false],
    [labels.weight, engrave.weight, true],
    [labels.combat.avoid, engrave.avoid, false],
    [labels.combat.ddg, engrave.dodge, false],
  ];
  return (
    <span className="flex w-max flex-col gap-[3px] text-[14px] leading-tight text-muted">
      <span className="flex items-center gap-1.5 pb-1">
        {engrave.icon !== undefined && (
          <img src={engrave.icon} alt="" className="h-5 w-5 object-contain" loading="lazy" />
        )}
        <span className="max-w-[9rem] truncate font-semibold text-ink">{engrave.name}</span>
      </span>
      {rows.map(([name, v, invert]) => (
        <span key={name} className="flex items-center justify-between gap-4">
          {name}
          <span
            className={`font-semibold ${v === 0 ? "text-ink" : (v > 0) !== invert ? "text-pgrow" : "text-danger"}`}
          >
            {v > 0 ? `+${v}` : v}
          </span>
        </span>
      ))}
    </span>
  );
};

/** 세로폰 판별 — builder.css의 세로 블록(max-width:767) − 가로폰 PC 복원 블록(max-height:520)과 동일 경계.
    ☠가로 모드는 PC와 같은 동작(2026-09-01 사용자 지시) — 폭 게이트만 보면 좁은 가로폰(≤767px)이
    세로폰 취급돼 CSS(PC 레이아웃·폴딩 숨김)와 어긋난다(탭이 숨은 폴딩을 열어 무반응 — 실사고). */
const isPortraitPhone = (): boolean =>
  window.matchMedia("(max-width: 767px)").matches && !window.matchMedia("(max-height: 520px)").matches;

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
  /** 각인 옵션 전용 — 있으면 호버 오버레이가 결합 스펙 대신 각인 원래 스펙을 그린다(2026-09-01). */
  engraveSpec?: BuilderEngraveProp;
  /** 그룹 헤더(문장사) — 선택 불가 라벨(2026-09-02 계승 스킬 목록). */
  header?: true;
  /** 그룹 아래 들여쓰기 항목. */
  indent?: true;
  /** 호버 시 우측 설명 오버레이(스킬 Help). */
  help?: string;
  /** 계승 SP 비용 — 우측에 숫자만(2026-09-02 사용자 지시). */
  cost?: number;
}

/** 무기 후보 목록 — 각인은 현 슬롯 값 유지, 강화는 무기 소유라 0부터(선택 시 리셋과 동형). */
const weaponOptionsOf = (
  options: readonly BuilderWeaponProp[],
  job: BuilderJobProp | undefined,
  engrave: BuilderEngraveProp | undefined,
  labels: BuilderLabels,
  aptitude = 0,
): EquipOption[] => [
  { value: "", label: labels.itemNone },
  ...options.map((w) => ({
    value: w.iid,
    label: w.name,
    ...(w.icon !== undefined ? { icon: w.icon } : {}),
    ...(job !== undefined && !canEquip(job, w, aptitude) ? { disabled: true as const } : {}),
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
    engraveSpec: g,
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

/** 카드 개별 In.Lv 드롭다운 옵션 — 상단 글로벌 선택기와 같은 단계, "In.lv" 접두(2026-09-02 사용자 지시 —
    IN.LV 열을 SKILL 열로 넘기면서 카드가 내부 레벨 표기를 단독으로 맡는다). */
const INLV_OPTIONS: EquipOption[] = INTERNAL_LEVELS.map((n) => ({ value: String(n), label: `In.lv ${n}` }));

/** 모든 무기군 적성 비트(Sword 2 … Special 512) — 글로벌 슬롯 장비는 캐릭터 미정이라 최대 허용으로 두고,
    카드 단계(cardEquip)에서 캐릭터 고유 적성으로 재게이트한다. */
const APTITUDE_ALL = 0x3fe;

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
  tall = false,
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
  /** 긴 목록(계승 스킬 185행) — 목록 높이 1.5배(2026-09-02 사용자 지시: 고르기 쉽게). */
  tall?: boolean;
  /** 루트(포지셔닝 스팬) 추가 클래스 — flex 컨테이너 안에서 늘어나야 할 때(flex-1) 쓴다. */
  rootClass?: string;
}): React.JSX.Element {
  const [open, setOpenRaw] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLSpanElement | null>(null);
  const listBoxRef = useRef<HTMLSpanElement | null>(null);
  // 열림 직후: (1) 현재 장착 옵션을 목록 중앙 인근에 즉시 배치(2026-09-01 사용자 지시 — 긴 무기
  // 목록에서 현재값 주변을 바로 보게) (2) 화면 잘림 보정 자동 스크롤(부드럽게, 2026-09-01).
  useEffect(() => {
    if (!open) return;
    const box = listBoxRef.current;
    const sel = box?.querySelector('[aria-selected="true"]');
    if (box != null && sel instanceof HTMLElement) {
      const top = sel.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      box.scrollTop = top - box.clientHeight / 2 + sel.offsetHeight / 2;
    }
    if (listRef.current !== null) scrollDropdownIntoView(listRef.current);
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
  const hovered = options.find((o) => o.value === hover);
  const spec = hovered?.spec;
  const engraveSpec = hovered?.engraveSpec;
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
          <span ref={listBoxRef} className={`flex ${tall ? "max-h-[27rem]" : "max-h-72"} w-max flex-col overflow-y-auto rounded border border-rule bg-panel py-1 shadow-lg [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin]`}>
            {options.map((o) =>
              o.header === true ? (
                // 그룹 헤더(문장사) — 선택 불가 라벨(2026-09-02 계승 스킬 목록).
                <span
                  key={o.value}
                  role="presentation"
                  className="flex items-center gap-1.5 whitespace-nowrap px-2.5 pb-0.5 pt-1.5 text-[12px] font-semibold text-muted"
                >
                  {o.icon !== undefined && <img src={o.icon} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />}
                  {o.label}
                </span>
              ) : (
              // ☠disabled 속성 금지 — 비활성 버튼은 마우스 이벤트가 죽어 호버 스펙이 안 선다(aria만).
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled === true}
                className={`flex w-full items-center gap-1.5 whitespace-nowrap ${o.indent === true ? "pl-7 pr-2.5" : "px-2.5"} py-1 text-left text-[14px] font-semibold leading-tight ${o.disabled === true ? "cursor-default opacity-40" : "cursor-pointer hover:bg-sunken"} ${o.engage === true ? "text-engage" : "text-ink"} ${o.value === value ? "bg-sunken" : ""}`}
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
                <span className="min-w-0 flex-1">{o.label}</span>
                {/* 계승 SP 비용 — 숫자만(2026-09-02 사용자 지시). */}
                {o.cost !== undefined && <span className="pl-3 text-[12px] font-semibold text-muted">{o.cost}</span>}
              </button>
              ),
            )}
          </span>
          {/* 옵션 호버 스펙 — 목록 우측 오버레이(2026-08-31 사용자 지시). 각인 옵션은 원래 스펙(2026-09-01). */}
          {/* 스킬 옵션 호버 = 설명 오버레이(고유 스킬 팝업과 같은 서식, 2026-09-02). */}
          {hovered?.help !== undefined && spec === undefined && engraveSpec === undefined && (
            <span className="ml-1 block w-max max-w-[22rem] whitespace-pre-line rounded border border-rule bg-panel px-2.5 py-1.5 text-[13px] leading-snug text-muted shadow-lg">
              <span className="mb-[2px] block text-[14px] font-semibold text-ink">{hovered.label}</span>
              {hovered.help}
            </span>
          )}
          {(spec !== undefined || engraveSpec !== undefined) && (
            <span className="ml-1 rounded border border-rule bg-panel px-2.5 py-1.5 shadow-lg">
              {engraveSpec !== undefined ? (
                <EngraveSpecPanel engrave={engraveSpec} labels={labels} />
              ) : (
                <SpecPanel weapon={spec!.weapon} plus={spec!.plus} engrave={spec!.engrave} labels={labels} />
              )}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * 문장사 레벨 상세(내용부) — 絆 레벨별 획득 목록, 항목마다 설명을 처음부터 인라인 표시
 * (2026-09-01 사용자 지시: 오버레이라 폭이 길어도 괜찮다 — 호버 단계 제거, 무기 = 스펙 한 줄).
 * 무 스크롤 전체표시(같은 지시) — 잘림 보정은 여는 쪽 자동 스크롤이 담당한다.
 * bond 초과 레벨은 비활성 비주얼(흐림+무채색) = "아직 못 쓴다" 암시.
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
  const item = (
    key: string,
    name: string,
    cls: string,
    info: { help?: string; weapon?: BuilderWeaponProp },
    icon?: string,
  ): React.JSX.Element => (
    <span key={key} className="flex items-start gap-2">
      <span
        className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-rule bg-sunken px-1.5 py-[1px] text-[13px] font-semibold leading-tight ${cls}`}
      >
        {icon !== undefined && <img src={icon} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />}
        {name}
      </span>
      {info.weapon !== undefined ? (
        <SpecLine weapon={info.weapon} plus={0} labels={labels} />
      ) : (
        info.help !== undefined && (
          <span className="max-w-[30rem] whitespace-pre-line pt-[2px] text-[13px] leading-snug text-muted">
            {info.help}
          </span>
        )
      )}
    </span>
  );
  return (
    <span className="flex w-max flex-col rounded border border-rule bg-panel px-2.5 py-2 shadow-lg">
      <span className="pb-1 text-[14px] font-semibold text-ink">
        {emblem.name} — {labels.bond} {bond}
      </span>
      {emblem.levels.map((lv) => (
        <span
          key={lv.bond}
          className={`flex items-start gap-1.5 py-[3px] ${lv.bond > bond ? "opacity-35 grayscale" : ""}`}
        >
          <span className="w-10 shrink-0 pt-[2px] text-right text-[13px] font-semibold text-gold">Lv{lv.bond}</span>
          <span className="flex flex-col gap-1">
            {lv.synchro?.map((s) => item(`s-${s.sid}`, s.name, "text-ink", s))}
            {lv.engage?.map((s) => item(`e-${s.sid}`, s.name, "text-engage", s))}
            {lv.weapons?.map((w) => item(`w-${w.iid}`, w.name, "text-engage", w, w.icon))}
          </span>
        </span>
      ))}
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
  // 무 스크롤 전체표시라 상세가 길다 — 열림 직후 아래 끝까지 보이게 자동 스크롤(2026-09-01 사용자 지시).
  useEffect(() => {
    if (rootRef.current !== null) scrollDropdownIntoView(rootRef.current);
  }, []);
  return (
    <span
      ref={rootRef}
      className="absolute left-0 top-full z-50 mt-1 w-max"
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
        // 폭 102px = 강화 46 + 갭 6 + 각인 50 (전부 고정 폭 — 상태 무관 정합, 2026-09-02 양옆 4px 여유).
        className="flex h-7 w-[102px] cursor-pointer items-center justify-between gap-0.5 whitespace-nowrap rounded border border-rule bg-sunken pl-1 pr-[1ch] text-[11px] font-semibold tracking-tight text-pgrow"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {`${labels.bondLevel} ${bond}`}
        {CARET}
      </button>
      {open && (
        // ☠w-max 필수 — absolute 폭이 shrink-to-fit이라 가용폭(86px 트리거의 containing block)에 눌려
        //   리플로우 순간 min-content로 붕괴한다(옵션 "Lv 1"이 두 줄로 꺾임 — 2026-09-01 실사고).
        <span ref={listRef} className="absolute left-0 top-full z-50 mt-1 flex w-max items-start">
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
                  className={`cursor-pointer whitespace-nowrap px-3 py-1 text-left text-[14px] font-semibold leading-tight hover:bg-sunken ${n === bond ? "bg-sunken text-pgrow" : "text-ink"}`}
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
  /** 스펙 팝오버 — 카드 드롭다운 조작 중(행 포커스)에만 옆에 뜬다(2026-08-31 지시). */
  specOpen: boolean;
  weapons: readonly BuilderWeaponProp[];
  engraves: readonly BuilderEngraveProp[];
  labels: BuilderLabels;
  /** 캐릭터 고유 적성 비트마스크 — 무기 목록의 랭크 게이트(effectiveWeaponRanks) 입력. */
  aptitude: number;
  /** 스킬 열(skill-col) 셀 — 카드 옆 스킬 3칸의 3번째(계승 2)가 전투력 행에 산다(2026-09-02). */
  lead: React.ReactNode;
  /** 계승 스킬 행(엔진 평가용) — 전투 보정(命中値 + 10 등)은 combatOf가 combatEnv(skills)로 건다. */
  skills: readonly SkillRow[];
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
  specOpen,
  weapons,
  engraves,
  labels,
  aptitude,
  lead,
  skills,
  onEquip,
}: CombatCellsProps): React.JSX.Element {
  const bare = combatOf(row);
  const armed = equipped !== undefined ? combatOf(row, equipped) : bare;
  const c = skills.length > 0 ? combatOf(row, equipped, skills) : armed;
  const signed = (n: number): string => `${n > 0 ? "+" : ""}${fmtCombat(n)}`;
  /** 전투력 합산 오버레이(2026-09-02) — 무기·스킬 층이 있을 때만: 맨손 → 무기 ±N → 스킬 ±N. 호버 전용(CSS .cell-pop). */
  const combatPop = (key: (typeof COMBAT_KEYS)[number]): React.JSX.Element | null => {
    const w = armed[key] - bare[key];
    const s = c[key] - armed[key];
    if (Math.abs(w) < 1e-9 && Math.abs(s) < 1e-9) return null;
    return (
      <span className="cell-pop absolute left-0 top-full z-40 mt-0.5 w-max flex-col gap-[1px] rounded border border-rule bg-panel px-2 py-1 text-left text-[13px] font-semibold leading-tight shadow-md">
        <span className="text-ink">{`${labels.breakdownBase} ${fmtCombat(bare[key])}`}</span>
        {Math.abs(w) >= 1e-9 && <span className={w > 0 ? "text-pgrow" : "text-danger"}>{`${labels.breakdownWeapon} ${signed(w)}`}</span>}
        {Math.abs(s) >= 1e-9 && <span className={s > 0 ? "text-pgrow" : "text-danger"}>{`${labels.breakdownSkill} ${signed(s)}`}</span>}
      </span>
    );
  };
  const deltaCls = (key: (typeof COMBAT_KEYS)[number]): string =>
    c[key] > bare[key] + 1e-9 ? "text-pgrow" : c[key] < bare[key] - 1e-9 ? "text-danger" : "text-ink";
  /** 이 행의 드롭다운이 하나라도 열려 있나 — 열림 중엔 포커스 팝오버를 접는다(목록·호버 스펙과 겹침). */
  const [openDrop, setOpenDrop] = useState(false);
  const weapon = equipped?.weapon;
  const engrave = equipped?.engrave;
  const plus = equipped?.plus ?? 0;
  const options = job === undefined ? [] : weapons.filter((w) => job.weaponRanks[w.kind] !== undefined);

  /** 무기 선택 — 상단 드롭다운 스타일 박스(아이콘+이름+▾). 강화 단계는 우측 칩이 맡아 이름만 쓴다
      (2026-08-31 사용자 지시 — 폭도 잘리지 않게 넉넉히). */
  const weaponPicker = (justify: string): React.JSX.Element => (
    // 장비 슬롯은 상시 표시(2026-09-01 사용자 지시: 글로벌 무기 선택 시 대기 멤버 전원에 표시).
    <span className={`flex items-center ${justify}`}>
      <EquipDropdown
        ariaLabel={labels.item}
        rootClass="entry-slotw"
        value={weapon?.iid ?? ""}
        options={weaponOptionsOf(options, job, engrave, labels, aptitude)}
        disabled={job === undefined}
        onChange={(iid) => onEquip({ iid })}
        onOpenChange={setOpenDrop}
        labels={labels}
        triggerClass={`flex h-7 w-full items-center gap-1 whitespace-nowrap rounded border border-rule bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold leading-tight ${weapon?.engage === true ? "text-engage" : weapon !== undefined ? "text-ink" : "text-muted"}`}
        trigger={
          <>
            {weapon?.icon !== undefined && <img src={weapon.icon} alt="" className="h-5 w-5 shrink-0" loading="lazy" />}
            <span className="min-w-0 flex-1 truncate text-left">{weapon?.name ?? labels.itemNone}</span>
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
        // 고정 폭 46px — 각인 50px·갭 6px과 함께 인연 드롭다운 102px과 꼭 맞는다(2026-09-02 양옆 4px 여유).
        triggerClass={`inline-flex h-7 w-[46px] items-center justify-between gap-0.5 rounded border border-rule bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold ${plus > 0 ? "text-gold" : "text-muted"} ${weapon.refine === undefined ? "opacity-40" : ""}`}
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
        triggerClass={`inline-flex h-7 w-[50px] items-center justify-between gap-0.5 rounded border bg-sunken pl-1.5 pr-[1ch] ${engrave !== undefined ? "border-rule" : "border-dashed border-rule opacity-60"}`}
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
      {lead}
      <td className="inlv-col px-[3px] pb-[10px] pt-[3px] text-center align-top">
        {/* 개인 장비는 좌정렬(2026-08-31 사용자 지시). */}
        {(job !== undefined || weapon !== undefined) && weaponPicker("justify-start")}
      </td>
      {STAT_KEYS.map((key) => {
        // HP 하단 = 강화·각인 슬롯(빈 칸 활용, 2026-08-31 지시) · RES = 클래스 적성(무기군) 아이콘 ·
        // BLD = 실효 무기 무게(2026-08-31 배치 지시).
        if (key === "hp") {
          return (
            <td key={key} className="combat-grid stat-col min-w-[3.7rem] pl-[3px] pr-1 pb-[10px] pt-[3px] text-center align-top md:min-w-[5.5rem] md:pr-2">
              {weapon !== undefined && (
                <span className="relative flex items-center justify-start gap-1.5">
                  {plusChip()}
                  {engraveChip()}
                  {specPop}
                </span>
              )}
            </td>
          );
        }
        if (key === "res") {
          // 클래스 무기군 아이콘은 장비 열 스탯 행(적성 + 실효 랭크)으로 옮겼다(2026-09-02 사용자 지시) — 빈 칸 유지.
          return <td key={key} className="combat-grid stat-col px-1 pb-[10px] pt-[2px] md:px-2" />;
        }
        if (key === "bld") {
          const eff = equipped === undefined ? undefined : weaponAt(equipped.weapon, equipped.plus, equipped.engrave);
          return (
            <td key={key} className="combat-grid stat-col stat-col-last min-w-[3.7rem] px-1 pb-[10px] pt-[3px] text-center align-top md:min-w-[5.5rem] md:px-2">
              {eff !== undefined && (
                <>
                  <span className={`block text-[14px] font-semibold leading-5 text-ink opacity-70`}>
                    {labels.weight}
                  </span>
                  <span
                    className={`block text-[14px] font-bold leading-5 ${spdPenalty(row, equipped) ? "text-danger" : "text-ink"}`}
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
            className="combat-grid stat-col relative min-w-[3.7rem] px-1 pb-[10px] pt-[3px] text-center align-top md:min-w-[5.5rem] md:px-2"
          >
            {ck !== undefined && (
              <>
                <span className={`block text-[14px] font-semibold leading-5 text-ink opacity-70`}>
                  {labels.combat[ck]}
                </span>
                <span className={`block text-[14px] font-bold leading-5 ${deltaCls(ck)}`}>{fmtCombat(c[ck])}</span>
                {combatPop(ck)}
              </>
            )}
          </td>
        );
      })}
      <td colSpan={STAT_KEYS.length} className="combat-flow px-2 pb-[10px] pt-[2px] text-left">
        <span className={`relative flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[14px] font-bold leading-tight text-ink`}>
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
  /** 고유 스킬 설명 팝업이 열린 카드(호버·탭) — 열리면 카드 th z를 올린다(thRaised). */
  const [skillPop, setSkillPop] = useState<string | null>(null);
  /** 대기 카드 계승 스킬 2칸(2026-09-02) — 세션 상태(rings와 동형: 잠금 시 스냅샷 EntryLock.skills로 이관, 해제 시 복귀). */
  const [inherits, setInherits] = useState<Record<string, [string, string]>>({});
  useEffect(() => {
    if (skillPop === null) return;
    // 바깥 탭 = 닫기(터치 토글의 짝) — 캡처 단계여야 드롭다운 루트의 전파 차단에 안 막힌다.
    const onDoc = (e: PointerEvent): void => {
      if (!(e.target instanceof Element) || e.target.closest(".entry-skill") === null) setSkillPop(null);
    };
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, [skillPop]);
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
          // 계승 스킬도 반지와 같은 왕복(2026-09-02).
          ...(inherits[pid] !== undefined ? { skills: inherits[pid] } : {}),
        },
      ];
      if (ring !== undefined) setRings(({ [pid]: _moved, ...rest }) => rest);
      if (inherits[pid] !== undefined) setInherits(({ [pid]: _moved, ...rest }) => rest);
    } else {
      // 해제 = 스냅샷의 반지·계승 스킬을 세션 쪽으로 되돌린다(대기 카드에서 이어서 편집).
      const entry = locked.find((e) => e.pid === pid);
      if (entry?.gid !== undefined) {
        const back = { gid: entry.gid, bond: entry.bond ?? 20 };
        setRings((prev) => ({ ...prev, [pid]: back }));
      }
      const backSkills = entry?.skills;
      if (backSkills !== undefined) setInherits((prev) => ({ ...prev, [pid]: backSkills }));
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
  /** 전 캐릭터(체커 무관) 단면 — 고유 적성·고유 스킬은 표시 여부와 무관하게 pid로 찾는다. */
  const charPropByPid = useMemo(() => new Map(chars.map((c) => [c.pid, c])), [chars]);
  const aptitudeOf = (pid: string): number => charPropByPid.get(pid)?.aptitude ?? 0;

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
          weapon !== undefined && canEquip(job, weapon, APTITUDE_ALL)
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
    const shown = targetJobs.filter((j) => {
      if (j.uniquePid === undefined) return true;
      const c = byPid.get(j.uniquePid);
      if (c === undefined) return true;
      return (showSpoilers || c.spoiler !== true) && (showDlc || c.dlc !== true);
    });
    // 범용 선순위·전용직 후순위(2026-09-01 사용자 지시) — 각 구획 안은 인게임 Sort 순 유지.
    return [...shown.filter((j) => j.uniquePid === undefined), ...shown.filter((j) => j.uniquePid !== undefined)];
  }, [targetJobs, chars, showSpoilers, showDlc]);
  // 絆 보너스는 본스탯 행에 합산(보정 스탯 블루) — 정렬도 합산값 기준. 반지 행은 추가분(+N)만 표기
  // (2026-08-31 사용자 최종 확정). 소스 = 잠금 스냅샷 우선, 아니면 대기 세션 반지.
  /** 계승 스킬 사전(sid → 후보) — 전 문장사(체커 무관: 잠금 저장분이 숨은 문장사의 스킬일 수 있다). */
  const inheritBySid = useMemo(
    () => new Map(emblems.flatMap((e) => e.inherits.map((s) => [s.sid, s] as const))),
    [emblems],
  );
  /** 카드의 계승 슬롯 값 — 잠금 블록("lock") = 스냅샷 EntryLock.skills, 대기 카드("wait") = 세션 inherits.
      ☠유령 카드는 "wait"로 읽어야 한다 — 잠금 시 세션이 비워져 유령 = 스킬 없음(비교용 기본값, 2026-09-02). */
  type InheritScope = "lock" | "wait";
  const inheritSidsOf = (pid: string, scope: InheritScope): [string, string] =>
    (scope === "lock" ? locked.find((e) => e.pid === pid)?.skills : inherits[pid]) ?? ["", ""];
  /** 선택 sid → 엔진 평가용 행(목록 밖 sid는 미적용 — 선택 UI가 만들 수 없는 값). */
  const inheritRowsOf = (pid: string, scope: InheritScope): SkillRow[] =>
    inheritSidsOf(pid, scope).flatMap((sid) => {
      const s = inheritBySid.get(sid);
      return s === undefined ? [] : [s.row];
    });

  const groups = useMemo(() => {
    const base = builderRowGroups({ chars: visibleChars, joinJobs }, compares, extraSkills);
    // 카드 개별 클래스·In.Lv(2026-08-31) — 라인 0을 카드 값으로 재계산(글로벌 슬롯 대체).
    // ☠유령 카드(잠긴 캐릭터의 대기 사본)는 비교가 목적 — 카드 개별 값(클래스·반지·스킬·장비)을 전부 무시하고
    //   다른 캐릭터와 같은 기본값 + 글로벌 세팅만 받는다(2026-09-02 사용자 지시).
    const lockByPid = new Map(locked.map((e) => [e.pid, e]));
    const personalized = base.map((g) => {
      const pid = g[0]!.pid;
      const ov = cardClass[pid];
      if (ov === undefined || lockByPid.has(pid)) return g;
      const char = charByPid.get(pid);
      const joinJob = char === undefined ? undefined : joinJobs[char.joinJid];
      if (char === undefined || joinJob === undefined) return g;
      const job = ov.jid === undefined ? undefined : jobByJid.get(ov.jid);
      const target = job === undefined ? 0 : (ov.internal ?? internal) - 1;
      return [builderRow(char, joinJob, job, target, extraSkills), ...g.slice(1)];
    });
    const boosted = personalized.map((g) => {
      const pid = g[0]!.pid;
      // 세션 반지만(잠금 스냅샷의 반지는 유령 카드에 안 실린다 — 잠금 시 세션이 비워지므로 유령 = 반지 없음).
      const src = rings[pid];
      if (src === undefined) return g;
      // 인연 옵션 호버 중이면 그 레벨로 미리보기 — 합산·정렬·+N이 함께 움직인다.
      const bond = bondPreview !== null && bondPreview.pid === pid ? bondPreview.bond : src.bond;
      const delta = emblemByGid.get(src.gid)?.bonuses[bond - 1];
      return delta === undefined || Object.keys(delta).length === 0 ? g : g.map((r) => applyEmblemBonus(r, delta));
    });
    // 계승 스킬 정적 스탯(EnhanceValue) — 문장사 층 뒤에 얹는다(오버레이 순서 = 문장사 → 스킬).
    const skilled = boosted.map((g) => {
      const sd = skillStatDelta(inheritRowsOf(g[0]!.pid, "wait"));
      return Object.keys(sd).length === 0 ? g : g.map((r) => applyStatBonus(r, sd, "skill"));
    });
    return waitingRowGroups(skilled, locked, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleChars, joinJobs, compares, sort, extraSkills, locked, rings, emblemByGid, bondPreview, cardClass, charByPid, jobByJid, internal, inherits, inheritBySid]);
  // 잠금 스냅샷 표시행 — 현재 슬롯·정렬·성옥 체커와 무관하다(잠금 당시 값만 소비 = "고정"의 실체).
  // 스냅샷 반지의 絆 보너스도 본스탯 행에 합산(블루) — 반지 행은 추가분(+N)만(2026-08-31 최종).
  const lockedRows = useMemo(() => {
    const base = lockedDisplayRows({ chars: visibleChars, joinJobs }, targetJobs, locked, starsphere, weapons, visibleEngraves);
    return base.map((d) => {
      const entry = locked.find((e) => e.pid === d.row.pid);
      let row = d.row;
      if (entry?.gid !== undefined) {
        const bond =
          bondPreview !== null && bondPreview.pid === d.row.pid ? bondPreview.bond : (entry.bond ?? 20);
        const delta = emblemByGid.get(entry.gid)?.bonuses[bond - 1];
        if (delta !== undefined && Object.keys(delta).length > 0) row = applyEmblemBonus(row, delta);
      }
      const sd = skillStatDelta(inheritRowsOf(d.row.pid, "lock"));
      if (Object.keys(sd).length > 0) row = applyStatBonus(row, sd, "skill");
      return row === d.row ? d : { ...d, row };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleChars, joinJobs, targetJobs, locked, starsphere, weapons, visibleEngraves, emblemByGid, bondPreview, inherits, inheritBySid]);

  /** 합류 초기 무기 단면 — 글로벌 아이템 미선택 시 카드 기본값(2026-09-01 사용자 지시). */
  const joinEquipOf = (pid: string): EquippedWeapon | undefined => {
    const iid = charByPid.get(pid)?.joinIid;
    const weapon = iid === undefined ? undefined : weapons.find((w) => w.iid === iid);
    return weapon === undefined ? undefined : { weapon, plus: 0 };
  };

  /** 카드 표시 장비 — 개인 오버라이드가 있으면 그것(게이트 재검), 없으면 글로벌 슬롯 장비. */
  const cardEquip = (pid: string, li: number, ghost = false): EquippedWeapon | undefined => {
    // 유령 카드 = 개인 오버라이드·카드 클래스 무시(글로벌 슬롯 + 합류 기본 무기만, 2026-09-02).
    const o = ghost ? undefined : overrides[`${pid}:${li}`];
    // 게이트는 실효 직업 기준 — 카드 클래스 변경 후 부적합해진 장비는 미착용으로 강하(2026-08-31 되돌림).
    const job = (ghost ? compares[li] : cardCompareOf(pid, li))?.job;
    const gate = (eq: EquippedWeapon | undefined): EquippedWeapon | undefined =>
      eq === undefined || job === undefined || !canEquip(job, eq.weapon, aptitudeOf(pid)) ? undefined : eq;
    // 기본값 = 캐릭터별 합류 초기 무기 — 글로벌 아이템을 고르면 전원 교체(2026-09-01 사용자 확정).
    if (o === undefined) return gate(compares[li]?.equipped ?? joinEquipOf(pid));
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

  /** 계승 슬롯 변경(2026-09-02) — 잠금이면 스냅샷 즉시 저장(patchRing 규약), 대기면 세션. 두 칸 다 비면 필드째 걷는다. */
  const patchInherit = (pid: string, i: 0 | 1, sid: string, scope: InheritScope): void => {
    const setSlot = (cur: [string, string] | undefined): [string, string] => {
      const out: [string, string] = [cur?.[0] ?? "", cur?.[1] ?? ""];
      out[i] = sid;
      return out;
    };
    if (scope === "lock") {
      const next = locked.map((e) => {
        if (e.pid !== pid) return e;
        const { skills: _s, ...rest } = e;
        const cur = setSlot(e.skills);
        return cur[0] === "" && cur[1] === "" ? rest : { ...rest, skills: cur };
      });
      saveEntryLocks(next);
      setLocked(next);
      return;
    }
    setInherits((prev) => {
      const cur = setSlot(prev[pid]);
      if (cur[0] === "" && cur[1] === "") {
        const { [pid]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pid]: cur };
    });
  };

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
      if (weapon !== undefined && (job === undefined || !canEquip(job, weapon, aptitudeOf(pid)))) {
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
      // bottom 22px = 전투력 행(pt 3 + 라벨 2줄 40 + pb 10 = 53) 상단 정렬 무기 슬롯과 일치(2026-09-02: 칩 간격 6 통일,
      // 전투력 라벨은 아래로 여유 — 사용자: "답답해 보인다"). 슬롯 아래 빈 22px는 라벨 줄의 자리다.
      // 카드(entry-wrap)는 그 위 공간을 절대배치로 채운다(builder.css) — 포트레이트 여유.
      className="entry-classrow absolute inset-x-[6px] bottom-[22px] flex items-center gap-[6px]"
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
        triggerClass="flex h-7 w-full items-center justify-between gap-0.5 rounded border border-rule bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold leading-tight text-ink"
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
        // 폭 5.5rem = "In.lv 40 ▾" 최소(2026-09-02: 클래스 여유를 줄이고 In.lv를 왼쪽 포트레이트 아래로) — 직업 선택기(flex-1)가 나머지.
        triggerClass="entry-lv flex h-7 shrink-0 items-center justify-between gap-0.5 whitespace-nowrap rounded border border-rule bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold text-gold"
        trigger={
          <>
            {`In.lv ${internalDisplay}`}
            {CARET}
          </>
        }
      />
    </span>
  );

  /** 네임카드 윗줄 — 클래스 무기군 아이콘 + 실효 랭크(고유 적성 일치 = 블루, 2026-09-02 사용자 지시).
      직업 미선택이면 합류 직업의 무기군(표의 스탯도 합류 시점 값). 클래스에 없는 적성은 표시하지 않는다.
      아이콘은 흰 실루엣을 마스크로 써서 글자색(currentColor)을 입힌다(builder.css .entry-kind). */
  const aptitudeUi = (pid: string, job: BuilderJobProp | undefined): React.JSX.Element => {
    const c = charPropByPid.get(pid);
    const ranks = job?.weaponRanks ?? (c === undefined ? undefined : joinJobs[c.joinJid]?.weaponRanks) ?? {};
    return (
      <span className="entry-apt flex items-center gap-1.5" title={labels.aptitude}>
        {effectiveWeaponRanks(ranks, c?.aptitude ?? 0).map((r) =>
          kindIcons[r.kind] === undefined ? null : (
            <span
              key={r.kind}
              className={`flex items-center gap-[2px] text-[13px] font-bold leading-none ${r.innate ? "text-engage" : "text-ink"}`}
            >
              <span
                className="entry-kind"
                style={{ maskImage: `url(${kindIcons[r.kind]})`, WebkitMaskImage: `url(${kindIcons[r.kind]})` }}
              />
              {r.rank}
            </span>
          ),
        )}
      </span>
    );
  };

  /** 네임카드 아랫줄 — 고유 스킬 칩(아이콘 + 이름). 호버 = 설명 오버레이, 탭 = 토글(터치 — 호버가 없다).
      로스터 전원 고유 스킬은 1개(2026-09-02 데이터 확인)라 첫 항목만 그린다. */
  const personalSkillUi = (pid: string): React.JSX.Element => {
    const s = charPropByPid.get(pid)?.personalSkills[0];
    const open = skillPop === pid;
    return (
      <span
        className="entry-skill entry-slotw relative block"
        onMouseEnter={() => setSkillPop(pid)}
        onMouseLeave={() => setSkillPop((p) => (p === pid ? null : p))}
        onClick={(e) => {
          e.stopPropagation();
          setSkillPop((p) => (p === pid ? null : pid));
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span
          className={`flex h-7 w-full items-center gap-1 rounded border border-rule bg-sunken px-1.5 text-[14px] font-semibold leading-tight ${s === undefined ? "text-muted opacity-40" : "text-ink"}`}
          title={labels.personalSkill}
        >
          {s?.icon !== undefined && <img src={s.icon} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />}
          <span className="truncate">{s?.name ?? labels.skillNone}</span>
        </span>
        {open && s?.help !== undefined && (
          <span className="absolute left-0 top-full z-40 mt-1 block w-max max-w-[26rem] whitespace-pre-line rounded border border-rule bg-panel px-2.5 py-1.5 text-[13px] font-normal leading-snug text-muted shadow-md">
            <span className="mb-[2px] block text-[14px] font-semibold text-ink">{s.name}</span>
            {s.help}
          </span>
        )}
      </span>
    );
  };

  /** 스킬 열(skill-col, 2026-09-02 사용자 지시) — 카드 th 바로 옆 실제 표 셀 3칸: 스탯 행 = 고유, 반지 행 = 계승 1,
      전투력 행 = 계승 2. 표 행이라 우측 장비 열(적성·반지·무기)과 세로 줄이 구조적으로 맞는다. 셀 패딩은 같은 행의
      장비 열 셀과 동일. 세로폰은 열째 숨김(builder.css .skill-col — 헤더·본문 함께). */
  const skillCell = (pid: string, slot: 0 | 1 | 2, scope: InheritScope, extra = ""): React.JSX.Element => (
    // 스탯 행 상단 10px = 전투력 행 하단 10px과 대칭(2026-09-02 사용자 지시) — 같은 행의 스탯 셀도 같은 패딩.
    <td className={`skill-col pl-0 pr-[3px] ${slot === 0 ? "pb-[3px] pt-[10px] align-middle" : slot === 1 ? "pb-[3px] pt-[3px] align-middle" : "pb-[10px] pt-[3px] align-top"} ${extra}`}>
      {slot === 0 ? personalSkillUi(pid) : inheritSlotUi(pid, slot === 1 ? 0 : 1, scope)}
    </td>
  );

  /** 계승 스킬 2칸(위아래) — 고유 스킬 칩과 같은 규격(h-7·아이콘+이름), 카드 스킬 스택의 2·3번째.
      옵션 = 문장사 영입 순 그룹 목록(inheritOptions), 상태 = 잠금 스냅샷/세션(2026-09-02 실데이터 배선). */
  const inheritSlotUi = (pid: string, i: 0 | 1, scope: InheritScope): React.JSX.Element => {
    const sids = inheritSidsOf(pid, scope);
    const value = sids[i];
    const chosen = value === "" ? undefined : inheritBySid.get(value);
    const other = sids[i === 0 ? 1 : 0];
    return (
      <span className="entry-inherit block" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <EquipDropdown
          ariaLabel={`${labels.inherit} ${i + 1}`}
          value={value}
          // 목록 = 문장사 영입 순(visibleEmblems — 스포일러·DLC 체커 준수), 다른 칸의 sid는 비활성.
          options={inheritOptions(visibleEmblems, labels.skillNone, other === "" ? undefined : other)}
          onChange={(v) => patchInherit(pid, i, v, scope)}
          labels={labels}
          tall
          rootClass="entry-slotw"
          triggerClass={`flex h-7 w-full items-center justify-between gap-1 whitespace-nowrap rounded border bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold leading-tight ${chosen !== undefined ? "border-rule text-ink" : "border-dashed border-rule text-muted opacity-70"}`}
          trigger={
            <>
              {chosen?.icon !== undefined && <img src={chosen.icon} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />}
              <span className="min-w-0 flex-1 truncate text-left">{chosen?.name ?? labels.skillNone}</span>
              {CARET}
            </>
          }
        />
      </span>
    );
  };

  /** 스탯 셀 합산 오버레이(2026-09-02) — 층(parts)이 있을 때만: 기본 → 문장사 ±N → 스킬 ±N. 호버 전용(CSS .cell-pop).
      마지막 두 열(RES·BLD)은 표 밖으로 새지 않게 우측 앵커. */
  const fmtStat = (n: number): string => (Number.isInteger(Math.round(n * 100) / 100) ? String(Math.round(n)) : n.toFixed(1));
  const statPop = (cell: BuilderCell, key: StatKey): React.JSX.Element | null => {
    if (cell.parts === undefined || cell.parts.length === 0) return null;
    const base = cell.value - cell.parts.reduce((a, p) => a + p.value, 0);
    return (
      <span
        className={`cell-pop absolute top-full z-40 mt-0.5 w-max flex-col gap-[1px] rounded border border-rule bg-panel px-2 py-1 text-left text-[13px] font-semibold leading-tight shadow-md ${key === "res" || key === "bld" ? "right-0" : "left-0"}`}
      >
        <span className="text-ink">{`${labels.breakdownBase} ${fmtStat(base)}`}</span>
        {cell.parts.map((p, idx) => (
          <span key={idx} className={p.value > 0 ? "text-pgrow" : "text-danger"}>
            {`${p.source === "emblem" ? labels.breakdownEmblem : labels.breakdownSkill} ${p.value > 0 ? "+" : ""}${fmtStat(p.value)}`}
          </span>
        ))}
      </span>
    );
  };

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
    lead: React.ReactNode,
  ): React.JSX.Element => {
    const emblem = src === undefined ? undefined : emblemByGid.get(src.gid);
    const bond = src?.bond ?? 20;
    // 인연 옵션 호버 중이면 +N도 그 레벨로 미리보기(본스탯 합산과 동기).
    const effBond = bondPreview !== null && bondPreview.pid === pid ? bondPreview.bond : bond;
    const delta = emblem?.bonuses[effBond - 1];
    return (
      <tr key="ring">
        {lead}
        {/* 반지 행은 상단 정렬(2026-09-02) — hover:none(고스트 전투력 행 없음)에서 카드 th가 행을 늘려도
            반지·인연 밴드가 카드 고유 스킬 칩과 같은 높이에 남는다(PC는 행 높이 = 셀 높이라 동일). */}
        <td className="inlv-col px-[3px] pb-[3px] pt-[3px] text-left align-top">
          <span
            className="ring-cell flex justify-start"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <EquipDropdown
              ariaLabel={labels.ring}
              rootClass="entry-slotw"
              value={emblem?.gid ?? ""}
              options={ringOptionsOf(visibleEmblems, labels)}
              onChange={(gid) => onPatch({ gid })}
              labels={labels}
              // 무기 슬롯과 같은 박스 규격(2026-08-31: 크기 일치) — 빈 슬롯은 점선("비어 있음" 어휘).
              triggerClass={`flex h-7 w-full items-center gap-1 whitespace-nowrap rounded border bg-sunken pl-1.5 pr-[1ch] text-[14px] font-semibold leading-tight ${emblem !== undefined ? "border-rule text-engage" : "border-dashed border-rule text-muted opacity-70"}`}
              trigger={
                <>
                  {emblem?.icon !== undefined ? (
                    <img src={emblem.icon} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                  ) : ringPlaceholder !== undefined ? (
                    <img src={ringPlaceholder} alt="" className="h-5 w-5 shrink-0 object-contain opacity-40" loading="lazy" />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-left">{emblem?.name ?? labels.ringNone}</span>
                  {CARET}
                </>
              }
            />
          </span>
        </td>
        {STAT_KEYS.map((key) => {
          if (key === "hp") {
            return (
              <td key={key} className="stat-col pl-[3px] pr-1 pb-[3px] pt-[3px] text-left align-top md:pr-2">
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
  /** 직업 변경(2026-09-01 사용자 지시) — 같은 장비를 새 직업이 들 수 있으면 디폴트로 장착, 못 들면
      미장착. 비교 슬롯의 첫 선택(장비 없음)은 1번(메인) 슬롯 장비를 씨드로 쓴다. 내부 레벨은 승계.
      그 슬롯 라인의 카드 개인 장비는 폐기(옛 직업 기준의 분기가 새 직업에 남으면 안 된다). */
  const setSlotJob = (i: number, jid: string): void => {
    setSlots((s) =>
      s.map((v, idx) => {
        if (idx !== i) return v;
        const job = targetJobs.find((t) => t.jid === jid);
        const equip = carriedEquip(job, v.iid !== undefined ? v : s[0]!, weapons) ?? {};
        return { jid, ...(v.internal !== undefined ? { internal: v.internal } : {}), ...equip };
      }),
    );
    setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.endsWith(`:${i}`))));
  };
  /** 아이템 선택 — 비교 슬롯이 메인(1번)과 같은 무기를 고르면 강화·각인도 메인을 승계
      (동일 무기 = 업그레이드 동기, 2026-09-01 사용자 지시). 그 외 무기 변경 = 강화 리셋·각인 유지. */
  const setSlotItem = (i: number, iid: string): void =>
    setSlots((s) =>
      s.map((v, idx) => {
        if (idx !== i) return v;
        const { iid: _iid, plus: _plus, ...rest } = v;
        if (iid === "") return rest;
        const main = s[0]!;
        if (i > 0 && iid === main.iid) {
          const { engrave: _engrave, ...bare } = rest;
          return {
            ...bare,
            iid,
            ...(main.plus !== undefined ? { plus: main.plus } : {}),
            ...(main.engrave !== undefined ? { engrave: main.engrave } : {}),
          };
        }
        return { ...rest, iid };
      }),
    );
  /** 강화 변경 — 메인(1번)에서 바꾸면 같은 무기를 든 비교 슬롯에도 따라 적용(2026-09-01 사용자 지시). */
  const setSlotPlus = (i: number, plus: number): void =>
    setSlots((s) => {
      const t = upgradeTargets(s, i);
      return s.map((v, idx) => (t.has(idx) ? { ...v, plus } : v));
    });
  /** 글로벌 각인 선택(상단 컨트롤, 2026-08-31 사용자 설계) — "" = 무각인. 무기와 독립.
      메인(1번)에서 바꾸면 같은 무기를 든 비교 슬롯에도 따라 적용(2026-09-01 사용자 지시). */
  const setSlotEngrave = (i: number, gid: string): void =>
    setSlots((s) => {
      const t = upgradeTargets(s, i);
      return s.map((v, idx) => {
        if (!t.has(idx)) return v;
        const { engrave: _engrave, ...rest } = v;
        return gid === "" ? rest : { ...rest, engrave: gid };
      });
    });

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
            onChange={(v) => setSlotPlus(i, Number(v))}
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
        {/* pb는 1행 전용 — items-end(레전드 행)에서 박스 중앙 보정. 2행은 items-center라 넣으면 뜬다. */}
        {weapon !== undefined && (
          <span className={`flex items-center${i === 0 ? " pb-[6px]" : ""}`}>
            <SpecLine weapon={weapon} plus={plus} engrave={engrave} labels={labels} />
          </span>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 윗줄 = 미선택 안내(좌, 고정 높이) + 체커·Reset(우) — 아이템 선택기가 아랫줄 우측 공간을
          쓰도록 체커를 올렸다(2026-08-31). 항상 렌더 = 선택·Reset에도 표가 안 움직인다.
          ☠-mt-4는 설명문(<p>)의 mb-5를 파먹는 값 — 가로폰은 설명문이 숨어 타이틀을 덮으므로 mt-0(2026-09-01 실기). */}
      <div className="-mt-4 mb-3 flex shrink-0 flex-wrap items-end justify-between gap-x-5 gap-y-1 [@media(max-height:520px)]:mt-0">
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
          {/* short 라벨 + self-start — 레전드가 셀렉트보다 넓으면(flex-col 폭 기여) 2행(레전드 없음)과
              컬럼이 어긋난다. internalShort는 전 로케일에서 셀렉트보다 좁다(2026-09-01 세로 정렬 수정). */}
          <span className={legendClass}>{labels.internalShort}</span>
          <select className={`${selectClass} self-start`} value={internal} onChange={(e) => setInternal(Number(e.target.value))}>
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
          {/* gap-x-5 = 1행(메인 컨트롤)과 동일 간격 — 컬럼이 세로로 맞아떨어진다(2026-09-01 정렬 수정). */}
          {slots.slice(1).map((slot, i) => (
            <span key={i} className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
              <th className="skill-col sticky top-0 z-20 bg-panel p-0 shadow-[inset_0_-1px_0_var(--rule)]" scope="col" />
              <th className="inlv-col sticky top-0 z-20 bg-panel p-0 text-center align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                {/* 장비 열(적성·반지·무기) — 헤더 문구 없음(2026-09-02 사용자 지시: SKILL.EQUIP 제거). */}
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
                  <td style={{ top }} className="skill-col sticky z-20 bg-panel shadow-[inset_0_-1px_0_var(--rule)]" />
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
            const thRaised = emblemOpen === row.pid || foldPid === row.pid || classDrop === row.pid || skillPop === row.pid;
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
                className={`entry-th sticky left-0 px-[6px] py-[3px] text-left align-top font-normal ${thRaised ? "z-20" : "z-10"} ${sep}`}
              >
                <span className="entry-wrap flex items-center">
                  <span
                    className="entry-card"
                    // 세로폰: 포트레이트 탭 = 우측 폴딩 토글(반지 슬롯 전개, 2026-08-31 사용자 지시).
                    // 잠금 해제 탭은 스탯 영역이 맡는다(전파 차단으로 오발 방지).
                    onClick={(e) => {
                      const native = e.nativeEvent as PointerEvent;
                      if (native.pointerType === "touch" && isPortraitPhone()) {
                        e.stopPropagation();
                        setFoldPid((p) => (p === row.pid ? null : row.pid));
                      }
                    }}
                  >
                    {row.face !== undefined && (
                      <img src={row.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[6em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{row.name}</span>
                  </span>
                  {/* 해제 버튼은 호버 시 스탯 행 마지막 셀 우측 바 — 행·배경 클릭은 무반응(부주의 방지). */}
                </span>
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
                    <td className={`skill-col ${sep}`} />
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
                  {skillCell(row.pid, 0, "lock", showGrowth ? "" : sep)}
                  <td className={`inlv-col px-[3px] pb-[3px] pt-[10px] text-left align-middle ${showGrowth ? "" : sep}`}>{aptitudeUi(row.pid, job)}</td>
                  {STAT_KEYS.map((key) => {
                    const cell = row.cells[key];
                    const down = key === "spd" && spdPenalty(row, equipped);
                    // 絆 보너스 상승 = 블루 — SPD 무게 레드와 겹치면 상승 우선(2026-08-31 사용자 지시).
                    const tone = cell.buffed === true ? "text-pgrow" : down ? "text-danger" : cell.capped ? "text-cap" : "text-ink";
                    return (
                      <td
                        key={key}
                        className={`stat-col${key === "bld" ? " stat-col-last" : ""} relative min-w-[3.7rem] px-1 pb-[3px] pt-[10px] text-center font-bold md:min-w-[5.5rem] md:px-2 ${tone} ${showGrowth ? "" : sep}`}
                      >
                        {cell.text}
                        {statPop(cell, key)}
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
                {ringRow(row.pid, lockRing, (p) => patchRing(row.pid, p), skillCell(row.pid, 1, "lock"))}
                {/* 전투력 행 — 잠금은 상시 표시 + 카드 장비 변경(스냅샷 직접 갱신·즉시 저장, 2026-08-31). */}
                <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock} {...focusActs(row.pid, -1)}>
                  <CombatCells
                    row={row}
                    job={job}
                    equipped={equipped}
                    specOpen={focusRow !== null && focusRow.pid === row.pid && focusRow.li === -1}
                    weapons={weapons}
                    engraves={visibleEngraves}
                    labels={labels}
                    aptitude={aptitudeOf(row.pid)}
                    lead={skillCell(row.pid, 2, "lock")}
                    skills={inheritRowsOf(row.pid, "lock")}
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
            // 단일 라인 첫 행 = 상단 10px(스킬 열 고유 칩·전투력 행 하단과 대칭, 2026-09-02).
            const roomyTop = g.length > 1 ? roomy : "pb-[3px] pt-[10px]";
            const hovered = hoverRow !== null && hoverRow.pid === first.pid;
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
            // 유령 카드 = 반지 없음(비교용 기본값 — 잠금 스냅샷의 반지는 엔트리 블록만, 2026-09-02).
            const ringSrc = ghost ? undefined : rings[first.pid];
            /** 라인 li의 실효 비교 — 유령 카드는 카드 개별 클래스를 무시하고 글로벌 슬롯만. */
            const cmpOf = (li: number): BuilderCompare | undefined => (ghost ? compares[li] : cardCompareOf(first.pid, li));
            const wEmblem = ringSrc === undefined ? undefined : emblemByGid.get(ringSrc.gid);
            const thRaised =
              !ghost && (emblemOpen === first.pid || foldPid === first.pid || classDrop === first.pid || skillPop === first.pid);
            const nameTh = (
              <th
                scope="row"
                // 카드 th = [고유성장?]+스탯0+반지+전투력0 행까지 — 하단(무기 슬롯 밴드)에 클래스 행이
                // 절대배치로 앉아 무기·강화·각인과 하단 정렬된다(2026-09-01 정정). 이후 행은 필러 th.
                rowSpan={(showGrowth ? 1 : 0) + 3}
                className={`entry-th sticky left-0 px-[6px] py-[3px] text-left align-top font-normal ${thRaised ? "z-20" : "z-10"} ${sep}`}
              >
                <span className="entry-wrap flex items-center">
                  <span
                    className="entry-card"
                    // 세로폰: 포트레이트 탭 = 반지 슬롯 우측 폴딩 토글(유령 카드는 무반응, 2026-08-31).
                    onClick={(e) => {
                      const native = e.nativeEvent as PointerEvent;
                      if (!ghost && native.pointerType === "touch" && isPortraitPhone()) {
                        e.stopPropagation();
                        setFoldPid((p) => (p === first.pid ? null : first.pid));
                      }
                    }}
                  >
                    {first.face !== undefined && (
                      <img src={first.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[6em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{first.name}</span>
                  </span>
                  {/* 자물쇠 슬롯 폐기(2026-08-31 재설계) — 잠금 버튼은 행 호버 시 마지막 셀 우측 바로. */}
                </span>
                {/* 카드 개별 클래스·In.Lv(2026-08-31) — 포트레이트 아래, 포트레이트 폭 정합. */}
                {classRowUi(
                  first.pid,
                  !ghost && cardClass[first.pid] !== undefined ? (cardClass[first.pid]!.jid ?? "") : (compares[0]?.job.jid ?? ""),
                  cmpOf(0)?.job.name,
                  (ghost ? undefined : cardClass[first.pid]?.internal) ?? (compares[0] !== undefined ? compares[0].internal + 1 : internal),
                  (p) => patchCardClass(first.pid, p),
                )}
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
                    <td className={`skill-col ${sep}`} />
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
                  const eq = cardEquip(first.pid, li, ghost);
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
                      {li === 0 ? skillCell(first.pid, 0, "wait", showGrowth ? "" : sep) : <td className="skill-col" />}
                      <td className={`inlv-col px-[3px] ${li === 0 ? roomyTop : roomy} text-left align-middle ${li === 0 && !showGrowth ? sep : ""}`}>
                        {aptitudeUi(first.pid, cmpOf(li)?.job)}
                      </td>
                      {STAT_KEYS.map((key) => {
                        const cell = row.cells[key];
                        const down = key === "spd" && spdPenalty(row, eq);
                        // 絆 보너스 상승 = 블루 — 무게로 깎인 SPD 레드와 겹치면 상승이 우선(2026-08-31 사용자 지시).
                        const tone = cell.buffed === true ? "text-pgrow" : down ? "text-danger" : cell.capped ? "text-cap" : "text-ink";
                        return (
                          <td
                            key={key}
                            className={`stat-col${key === "bld" ? " stat-col-last" : ""} relative min-w-[3.7rem] px-1 ${li === 0 ? roomyTop : roomy} text-center font-bold md:min-w-[5.5rem] md:px-2 ${tone} ${row.ineligible ? "opacity-45" : ""} ${li === 0 && !showGrowth ? sep : ""}`}
                          >
                            {cell.text}
                            {statPop(cell, key)}
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
                  return [
                    line,
                    // 반지 행 — 첫 라인의 스탯과 무기 슬롯(전투력 행) 사이(2026-08-31 배치 확정).
                    ...(li === 0 ? [ringRow(first.pid, ringSrc, (p) => patchWaitRing(first.pid, p), skillCell(first.pid, 1, "wait"))] : []),
                    <tr
                      key={`combat-${li}`}
                      className={`combat-ghost${inert ? "" : " cursor-pointer hover:bg-sunken"}`}
                      {...rowActs(inert, li)}
                      {...(inert ? {} : focusActs(first.pid, li))}
                    >
                      <CombatCells
                        row={row}
                        job={cmpOf(li)?.job}
                        equipped={eq}
                        specOpen={focusRow !== null && focusRow.pid === first.pid && focusRow.li === li}
                        weapons={weapons}
                        engraves={visibleEngraves}
                        labels={labels}
                        aptitude={aptitudeOf(first.pid)}
                        lead={li === 0 ? skillCell(first.pid, 2, "wait") : <td className="skill-col" />}
                        skills={inheritRowsOf(first.pid, "wait")}
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
