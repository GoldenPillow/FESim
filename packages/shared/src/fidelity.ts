/**
 * 기전 장부(Fidelity Ledger) — 인게임 기전 전수 열거와 건별 재현 상태의 정본.
 * ☠산문 이중화 금지: UI 배지·문서·QA 우선순위가 전부 이 테이블을 소비한다(design/verification.md §2-1).
 * 운용 규약: 신규 기전 구현 = 이 장부 갱신 필수 · 결함 발견 = 해당 기전 강등 + 앵커(evidence) 추가.
 */

export type FidelityStatus =
  | "anchored" // 실기·정본 데이터 앵커 有 (테스트·코퍼스·공식 도움말·전수 실측)
  | "implemented" // 구현됨, 실기 앵커 미확보
  | "assumed" // 구현됐으나 해석·세부가 가정 — 실기 반증 시 갱신
  | "absent" // 미구현(정직 표기 대상)
  | "deferred"; // 미룸 — 선행 조건과 함께 §0에 등재

export interface FidelityEntry {
  /** "movement.once-per-activation" 형식 — 첫 세그먼트가 카테고리다. */
  id: string;
  label: { en: string; ko: string };
  status: FidelityStatus;
  /** 근거·앵커 포인터(테스트명·코퍼스 케이스·도움말 키·결정 기록). */
  evidence?: string;
}

export interface FidelityCategory {
  id: string;
  label: { en: string; ko: string };
}

export const FIDELITY_CATEGORIES: readonly FidelityCategory[] = [
  { id: "movement", label: { en: "Movement", ko: "이동" } },
  { id: "actions", label: { en: "Actions", ko: "행동" } },
  { id: "combat", label: { en: "Combat", ko: "전투" } },
  { id: "units", label: { en: "Units & Stats", ko: "유닛·스탯" } },
  { id: "skills", label: { en: "Skills", ko: "스킬" } },
  { id: "emblem", label: { en: "Emblems & Engage", ko: "엠블렘·인게이지" } },
  { id: "weapons", label: { en: "Weapons & Items", ko: "무기·아이템" } },
  { id: "turn", label: { en: "Turn Structure", ko: "턴 구조" } },
];

export const FIDELITY: readonly FidelityEntry[] = [
  // ── 이동 ──
  {
    id: "movement.range-terrain-cost",
    label: { en: "Movement range from terrain cost (255 = impassable)", ko: "지형 코스트 이동 범위(255 = 진입 불가)" },
    status: "anchored",
    evidence: "정본 = 地形コスト(Prohibition 전수 반증, decisions 2026-08-16) · range.test.ts",
  },
  {
    id: "movement.once-per-activation",
    label: { en: "One move per activation", ko: "활성화당 이동 1회" },
    status: "anchored",
    evidence: "베타 실기 발견(2026-08-16) · battle.test.ts 활성화당 이동 1회",
  },
  {
    id: "movement.canter-distance",
    label: { en: "Canter: N tiles after acting (skill Power)", ko: "재이동: 행동 후 N칸(skills.json Power)" },
    status: "anchored",
    evidence: "공식 도움말 '행동 후 2칸/3칸' 실측 = Power · battle.test.ts 재이동",
  },
  {
    id: "movement.canter-terrain-cost",
    label: { en: "Canter obeys terrain cost", ko: "재이동에 지형 코스트 적용" },
    status: "assumed",
    evidence: "가정 — 실기 반증 시 갱신(battle.ts canterPower)",
  },
  {
    id: "movement.block-enemy",
    label: { en: "Cannot pass through enemy units", ko: "타군 통과 불가" },
    status: "implemented",
    evidence: "range.ts blocked",
  },
  {
    id: "movement.pass-ally",
    label: { en: "Pass through allies, cannot stop on them", ko: "같은 군 통과 가능·정지 불가" },
    status: "implemented",
    evidence: "range.ts occupied",
  },
  {
    id: "movement.block-third-force",
    label: { en: "Enemy and third force block each other", ko: "적군↔우군 상호 차단" },
    status: "assumed",
    evidence: "가정(decisions 2026-08-16 이동 차단 규칙) — 실기 반증 시 갱신",
  },
  {
    id: "movement.pending-move",
    label: { en: "Move is provisional until an action commits it", ko: "행동 확정 전 잠정 이동(자유 재배치·원점 취소)" },
    status: "anchored",
    evidence: "사용자 실기 대조(decisions 2026-08-16 이동 UX 정정)",
  },
  {
    id: "movement.structures",
    label: { en: "Structures (doors, walls) affect passability", ko: "구조물(문·벽) 통행 반영" },
    status: "deferred",
    evidence: "M005 구조물 렌더 시점(§0 미룸)",
  },
  {
    id: "movement.warp",
    label: { en: "Warp and other staff/item movement", ko: "지팡이·아이템 이동(워프 등)" },
    status: "absent",
  },

  // ── 행동 ──
  {
    id: "actions.wait",
    label: { en: "Wait ends the unit's action", ko: "대기 = 행동 완료" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "actions.attack",
    label: { en: "Attack command and battle resolution", ko: "공격 명령·전투 해결" },
    status: "anchored",
    evidence: "corpus.test.ts(M002·M003 실기 예보 일치)",
  },
  {
    id: "actions.staff",
    label: { en: "Staves (heal, warp, status)", ko: "지팡이(회복·워프·상태)" },
    status: "absent",
  },
  {
    id: "actions.items",
    label: { en: "Item use (vulneraries etc.)", ko: "아이템 사용(회복약 등)" },
    status: "absent",
  },
  {
    id: "actions.trade",
    label: { en: "Trade and convoy", ko: "교환·수송대" },
    status: "absent",
  },
  {
    id: "actions.interact",
    label: { en: "Chests, villages, doors", ko: "상자·민가·문 상호작용" },
    status: "deferred",
    evidence: "Lua 이벤트 엔진(M004~, §0 미룸)",
  },
  {
    id: "actions.dance",
    label: { en: "Dance (grant another action)", ko: "춤(재행동 부여)" },
    status: "absent",
  },
  {
    id: "actions.engage",
    label: { en: "Engage activation command", ko: "인게이지 발동 명령" },
    status: "deferred",
    evidence: "엠블렘 시스템 설계 선행(§0 미룸)",
  },

  // ── 전투 ──
  {
    id: "combat.forecast-formulas",
    label: { en: "Forecast numbers from Calculator.xml DSL", ko: "예보 수치 = calculator.xml DSL 직접 실행" },
    status: "anchored",
    evidence: "corpus.test.ts(M002·M003 실기 일치 — 예보 '공격' = 전 타수 합)",
  },
  {
    id: "combat.true-hit",
    label: { en: "True hit model (displayed 50+ = sin hybrid)", ko: "명중 실확률(표시 50 이상 = sin 하이브리드)" },
    status: "assumed",
    evidence: "현행 = 표시값 1RN 근사 · sin 하이브리드는 미룸(§0 M2 이월, 선행 = 공식 확보)",
  },
  {
    id: "combat.crit-multiplier",
    label: { en: "Critical = 3x damage", ko: "필살 = 데미지 3배" },
    status: "implemented",
    evidence: "FE 문법 — 실기 앵커 미확보",
  },
  {
    id: "combat.follow-up",
    label: { en: "Follow-up attack from calculator formula", ko: "추격 판정 = calculator 공식" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치(신속 추가타 50% 포함)",
  },
  {
    id: "combat.strike-order",
    label: { en: "Strike order: attack, chain, counter, follow-ups", ko: "타격 순서: 본공격→체인→반격→추격→적추격" },
    status: "assumed",
    evidence: "체인 위치는 가정(battle.ts) — 실기 반증 시 갱신",
  },
  {
    id: "combat.advantage",
    label: { en: "Weapon triangle (sword>axe>lance, arts>bow/knife/tome)", ko: "상성(검>도끼>창>검·체술>활/단검/마도서)" },
    status: "implemented",
    evidence: "M2 정본(역방향 우위 없음) — decisions 2026-08-16",
  },
  {
    id: "combat.break",
    label: { en: "Break: advantage + hit forfeits counters", ko: "브레이크: 상성 유리+명중 = 반격 몰수" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "combat.break-immunity",
    label: { en: "Break immunity (armored style, null skill)", ko: "브레이크 면역(중장 스타일·무효 스킬)" },
    status: "implemented",
    evidence: "battle.test.ts 중장 면역",
  },
  {
    id: "combat.break-recovery",
    label: { en: "Break recovery timing (own phase start)", ko: "브레이크 해제 = 자기 군 페이즈 복귀 시" },
    status: "assumed",
    evidence: "타이밍 실측 미확보 — 미러 플레이 대조 대상",
  },
  {
    id: "combat.chain-attack",
    label: { en: "Chain attack (backup style in range)", ko: "체인어택(연계 스타일·사거리 내 협공)" },
    status: "implemented",
    evidence: "수치 = calculator · battle.test.ts",
  },
  {
    id: "combat.chain-guard",
    label: { en: "Chain guard", ko: "체인가드" },
    status: "absent",
  },
  {
    id: "combat.smash",
    label: { en: "Smash weapons (knockback, no first strike)", ko: "스매시 무기(밀치기·선공 불가)" },
    status: "absent",
  },
  {
    id: "combat.effectiveness",
    label: { en: "Effectiveness (armored, cavalry, flying, dragon)", ko: "특효(중장·기병·비병·용족 등)" },
    status: "absent",
  },
  {
    id: "combat.terrain-bonus",
    label: { en: "Terrain avoid/defense bonuses", ko: "지형 회피·방어 보정" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치에 포함",
  },
  {
    id: "combat.support-bonus",
    label: { en: "Support (bond) bonuses", ko: "지원(絆) 보정" },
    status: "absent",
    evidence: "Reliance 데이터는 추출됨 — 엔진 미반영",
  },
  {
    id: "combat.status-effects",
    label: { en: "Status effects (poison, freeze, ...)", ko: "상태이상(독·동결 등)" },
    status: "absent",
  },
  {
    id: "combat.exp",
    label: { en: "EXP from calculator formulas and tables", ko: "경험치 = calculator 원문 공식+테이블" },
    status: "anchored",
    evidence: "battle.test.ts 격파 경험치(테이블 유래)",
  },
  {
    id: "combat.exp-table-clamp",
    label: { en: "EXP table out-of-domain = boundary clamp", ko: "경험치 테이블 정의역 밖 = 경계 클램프" },
    status: "assumed",
    evidence: "가정(decisions 2026-08-16) — 실측 반증 시 갱신",
  },
  {
    id: "combat.levelup-growth",
    label: { en: "Level-up: one growth roll per stat", ko: "레벨업 = 스탯별 성장률 1롤" },
    status: "assumed",
    evidence: "FE 문법 가정 — 실측·성장률 100 초과 처리 미확보",
  },

  // ── 유닛·스탯 ──
  {
    id: "units.stat-derivation",
    label: { en: "Stat derivation model", ko: "스탯 산출 모델(직업Base+Offset+성장)" },
    status: "anchored",
    evidence: "SerenesForest 36명×9스탯 전수 일치 · stats.test.ts",
  },
  {
    id: "units.stat-derivation-edge",
    label: { en: "Stat floor 0 and AutoGrowOffset handling", ko: "스탯 하한 0·AutoGrowOffset 가산" },
    status: "assumed",
    evidence: "가정 2건 — PREDICT_M002_STATS 예측표로 실기 대조 예정",
  },
  {
    id: "units.difficulty-scaling",
    label: { en: "Per-difficulty levels and stats from dispos", ko: "난이도별 레벨·스탯(dispos·Offset)" },
    status: "anchored",
    evidence: "VERIFY_M002 대조 일치 156·불일치 0",
  },
  {
    id: "units.equipped-weapon",
    label: { en: "Equipped weapon = first attack weapon in inventory", ko: "장비 무기 = 소지품 첫 공격 무기" },
    status: "assumed",
    evidence: "가정(fe17.ts equippedWeapon) — 실기 반증 시 갱신",
  },

  // ── 스킬 ──
  {
    id: "skills.static-enhance",
    label: { en: "Static stat bonuses (EnhanceValue)", ko: "정적 스탯 보정(EnhanceValue)" },
    status: "anchored",
    evidence: "corpus.test.ts 기본능력 표시 일치(싱크로 칩 포함)",
  },
  {
    id: "skills.act-values",
    label: { en: "Combat value modifiers (ActNames DSL)", ko: "계산값 보정(ActNames DSL — 소수 유지·표시 내림)" },
    status: "anchored",
    evidence: "M003 간파 corpus.test.ts",
  },
  {
    id: "skills.condition-fallback",
    label: { en: "Unsupported skill conditions safely skip", ko: "평가 불가 조건 = 미적용 안전 강하" },
    status: "implemented",
    evidence: "지원 범위 = skills.test.ts 정본",
  },
  {
    id: "skills.give-sids",
    label: { en: "Granted skills (GiveSids)", ko: "스킬 부여 체계(GiveSids — 몰아붙이기 등)" },
    status: "deferred",
    evidence: "§0 미룸(M2 이월)",
  },
  {
    id: "skills.crit-unknown",
    label: { en: "Unexplained +5 crit (Lueur case)", ko: "뤼에르 필살 +5 소스 미규명" },
    status: "absent",
    evidence: "엔게이지 중 추정 — 미러 플레이 추적 대상",
  },

  // ── 엠블렘·인게이지 ──
  {
    id: "emblem.sync-stats",
    label: { en: "Sync stat bonuses via skills", ko: "싱크로 스탯 보정(스킬 경유)" },
    status: "anchored",
    evidence: "corpus.test.ts 기본능력 표시 = 싱크로 칩 포함",
  },
  {
    id: "emblem.sync-bond-level",
    label: { en: "Bond level fixed at 1 when equipped", ko: "장착 = 絆 레벨 1 싱크로 고정" },
    status: "assumed",
    evidence: "가정(fe17.ts emblemSyncSids) — 절차 진행별 絆 레벨은 미반영",
  },
  {
    id: "emblem.engage-activation",
    label: { en: "Engage activation, meter, duration", ko: "인게이지 발동·카운트·지속" },
    status: "deferred",
    evidence: "엠블렘 시스템 설계 선행(§0 미룸)",
  },
  {
    id: "emblem.engage-kit",
    label: { en: "Engage weapons and engage skills", ko: "엠블렘 무기·인게이지 기술" },
    status: "deferred",
    evidence: "§0 미룸(M2 이월)",
  },
  {
    id: "emblem.crest-tile",
    label: { en: "Emblem energy tile effect", ko: "紋章氣(문장기) 효과" },
    status: "absent",
    evidence: "렌더만 구현(M1.5) — 카운트 회복 효과 미구현",
  },

  // ── 무기·아이템 ──
  {
    id: "weapons.attack-kinds",
    label: { en: "Attack weapon kinds (staves excluded)", ko: "공격 무기 판별(Kind 1~6·8·9, 지팡이 제외)" },
    status: "anchored",
    evidence: "전수 실측(decisions 2026-08-16)",
  },
  {
    id: "weapons.range-union",
    label: { en: "Attack range = union of RangeI..RangeO", ko: "사거리 = RangeI..RangeO 합집합" },
    status: "anchored",
    evidence: "전수 실측(decisions 2026-08-16)",
  },
  {
    id: "weapons.magic-split",
    label: { en: "Magic damage detection (Kind 6 or flag)", ko: "마법 데미지 판별(Kind 6 또는 Flag bit16)" },
    status: "assumed",
    evidence: "光の弓·火のブレス 실측 포함 가정(fe17.ts MAGIC_FLAG) — 코퍼스 검증 대상",
  },
  {
    id: "weapons.forge-engrave",
    label: { en: "Forging and engraving bonuses", ko: "연성·각인 보정" },
    status: "absent",
  },

  // ── 턴 구조 ──
  {
    id: "turn.phase-cycle",
    label: { en: "Phase cycle and turn increment", ko: "페이즈 순환(생존 군만)·자군 복귀 시 턴 증가" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "turn.activation-reset",
    label: { en: "Phase start resets acted/moved/broken", ko: "페이즈 복귀 시 행동·이동·브레이크 리셋" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "turn.victory-rout",
    label: { en: "Rout victory / player wipe defeat", ko: "적 전멸 = 승리 · 자군 전멸 = 패배" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "turn.victory-objectives",
    label: { en: "Chapter-specific objectives", ko: "챕터 고유 승리 조건" },
    status: "deferred",
    evidence: "Lua 이벤트 엔진(M4 이후, §0 미룸)",
  },
  {
    id: "turn.reinforcements",
    label: { en: "Reinforcements (turn/condition spawns)", ko: "증원(턴·조건 등장)" },
    status: "deferred",
    evidence: "Lua 이벤트 엔진(§0 미룸)",
  },
  {
    id: "turn.enemy-ai",
    label: { en: "Automatic enemy phase AI", ko: "적턴 AI 자동 진행" },
    status: "deferred",
    evidence: "M5 — AI 파라미터 정본·평가함수 실측 보정(§10-4)",
  },
  {
    id: "turn.delegate",
    label: { en: "Delegate (auto-battle)", ko: "위임(자동진행)" },
    status: "deferred",
    evidence: "적턴 AI 모듈 공유(M5)",
  },
];

export const fidelityCategoryOf = (entry: FidelityEntry): string => entry.id.split(".")[0];

export function fidelitySummary(
  entries: readonly FidelityEntry[] = FIDELITY,
): Record<FidelityStatus, number> {
  const out: Record<FidelityStatus, number> = {
    anchored: 0,
    implemented: 0,
    assumed: 0,
    absent: 0,
    deferred: 0,
  };
  for (const e of entries) out[e.status] += 1;
  return out;
}
