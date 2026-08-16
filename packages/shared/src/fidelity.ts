/**
 * 기전 장부(Fidelity Ledger) — 인게임 기전 전수 열거와 건별 재현 상태의 정본.
 * ☠산문 이중화 금지: UI 배지·문서·QA 우선순위가 전부 이 테이블을 소비한다(design/verification.md §2-1).
 * 운용 규약: 신규 기전 구현 = 이 장부 갱신 필수 · 결함 발견 = 해당 기전 강등 + 앵커(evidence) 추가.
 * 덤프 정식화 앵커 "gaps/X §n" = ~/fesim_data/extracted/fidelity_gaps/ 축별 보고서(롤업 = REPORT_FIDELITY_GAPS.md).
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
    evidence: "가정(battle.ts canterPower) — 공식 텍스트에 재이동 지형 서술 없음(gaps/E §1-2), 실기 반증 시 갱신",
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
    evidence: "가정(decisions 2026-08-16) — 공식 텍스트에 서술 전무(gaps/E §1-3), 실기 반증만이 경로",
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
    evidence: "지형측 워프 금지 Flag 비트 범례 미특정 — groundattribute는 배제 확정(발소리 매핑뿐, gaps/J) · 잔여 후보 = terrain.xml Flag/Prohibition",
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
    evidence: "정식화 — Kind=7 41건 전수 UseType×Power×Range×GiveSids(gaps/B §6-1) · 명중식 = combat.staff-hit",
  },
  {
    id: "actions.items",
    label: { en: "Item use (vulneraries etc.)", ko: "아이템 사용(회복약 등)" },
    status: "absent",
    evidence: "정식화 부분 — Kind=10 168건 AddType×AddPower×AddSids(gaps/B §6-2) · AddType=31(스킬부여 49건) 세부 후속",
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
    evidence: "Lua 이벤트 엔진(M004~, §0 미룸) — Tbox/Door/Visit 3함수 시그니처 정식화(gaps/E §2-3)",
  },
  {
    id: "actions.dance",
    label: { en: "Dance (grant another action)", ko: "춤(재행동 부여)" },
    status: "absent",
    evidence: "원문 절차 확보 — 행동완료 아군 인접·미행동 리셋(gaps/E §1-7) · 경험치 = combat.exp-dance",
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
    evidence: "corpus.test.ts(M002·M003 실기 일치 — 예보 '공격' = 전 타수 합) · 커버리지 52식 중 27 소비(gaps/A §5)",
  },
  {
    id: "combat.true-hit",
    label: { en: "True hit model (displayed 50+ = sin hybrid)", ko: "명중 실확률(표시 50 이상 = sin 하이브리드)" },
    status: "assumed",
    evidence: "현행 = 표시값 1RN 근사 · calculator에 난수 모델 없음(命中率計算 = 命中値-回避値, gaps/A §2-2) — 실행파일 영역, 실측만이 경로(§0 M2 이월)",
  },
  {
    id: "combat.crit-multiplier",
    label: { en: "Critical = 3x damage", ko: "필살 = 데미지 3배" },
    status: "assumed",
    evidence: "calculator 52식 전수에 필살 배수 없음(威力計算 = max(攻撃力-防御力,0), gaps/A §6-4) — 3배는 실행파일 영역 가정",
  },
  {
    id: "combat.follow-up",
    label: { en: "Follow-up attack from calculator formula", ko: "추격 판정 = calculator 공식" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치 · 追撃条件 원문 = 攻撃速度差 >= 5(gaps/A §2-2)",
  },
  {
    id: "combat.strike-order",
    label: { en: "Strike order: attack, chain, counter, follow-ups", ko: "타격 순서: 본공격→체인→반격→추격→적추격" },
    status: "assumed",
    evidence: "실행부 모델 = 측당 (手番回数,攻撃回数,行動回数) 3중 카운터(gaps/A §0-1) — 엔진은 2단 축약, 체인 위치는 가정",
  },
  {
    id: "combat.strike-count",
    label: { en: "Multi-strike per engagement turn (attack count 2+)", ko: "타격 횟수(攻撃回数 2 이상)" },
    status: "absent",
    evidence: "攻撃回数 = 1턴당 타격 수 · SID_助太刀/半身_竜族 = 2 · 엔게이지 기술 4~9(gaps/A §0-2) — 엔진은 1 고정",
  },
  {
    id: "combat.turn-count",
    label: { en: "Engagement turn count model", ko: "手番回数(교전 턴 수) 모델" },
    status: "absent",
    evidence: "手番回数 = 측당 교전 턴 수(0=반격 없음·2=추격) · SID_追撃不可 = min(手番回数,1)(gaps/A §0-2) — 엔진은 boolean followUp 축약",
  },
  {
    id: "combat.order-flow-skills",
    label: { en: "Order-altering flow skills (Vantage etc.)", ko: "순서 변경 흐름 스킬(待ち伏せ 등)" },
    status: "absent",
    evidence: "SID_待ち伏せ(HP<=25%)·SID_攻め立て(総手番回数==0) = ActNames 없는 흐름 스킬 — 실행부 소유(gaps/A §0-2)",
  },
  {
    id: "combat.advantage",
    label: { en: "Weapon triangle (sword>axe>lance, arts>bow/knife/tome)", ko: "상성(검>도끼>창>검·체술>활/단검/마도서)" },
    status: "anchored",
    evidence: "相性補正 = 0;0;0(정본 전수, gaps/A §2-3) — 수치 보정 없음, 상성 효과는 브레이크뿐 · M2 정본(역방향 우위 없음)",
  },
  {
    id: "combat.advantage-skills",
    label: { en: "Advantage-conditional skills", ko: "상성 조건 스킬(武器相性激化·相性激化)" },
    status: "absent",
    evidence: "combatEnv에 武器相性 변수 부재 = 전부 무발동(안전 강하) · ActNames 시점 해석 미확정(부호 반전 위험, gaps/A §7-1) — 실기 표본 선행",
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
    evidence: "battle.test.ts 면역 SID 4종(相性ブレイク無効·ブレイク無効·_効果·인챈트판) — LunaticSids 어댑터 미배선은 §0 등재(gaps/FIX_NOTES F2)",
  },
  {
    id: "combat.break-recovery",
    label: { en: "Break recovery timing (own phase start)", ko: "브레이크 해제 = 자기 군 페이즈 복귀 시" },
    status: "assumed",
    evidence: "실측 미확보 — kr 도움말 '다음 턴' vs us '다음 전투' 원문 불일치(gaps/E §1-1), 미러 플레이 대조 대상",
  },
  {
    id: "combat.chain-attack",
    label: { en: "Chain attack (backup style in range)", ko: "체인어택(연계 스타일·사거리 내 협공)" },
    status: "implemented",
    evidence: "수치 = calculator · battle.test.ts · 위력 절삭(floor)은 가정(원문 무지시, gaps/A §6-7)",
  },
  {
    id: "combat.chain-guard",
    label: { en: "Chain guard", ko: "체인가드" },
    status: "absent",
    evidence: "정식화 — 데미지 = 자기 HP*0.2 · 경험 = clamp(基本値+레벨차감쇠,1,100) · 게이트 SID_チェインガード許可(gaps/A §2-4, E §1-6)",
  },
  {
    id: "combat.engage-guard",
    label: { en: "Engage guard", ko: "엔게이지 가드" },
    status: "absent",
    evidence: "エンゲージガードダメージ = 0(가드 측 HP 손실 없음 — 체인가드 HP*0.2와 대비, gaps/A §0-2)",
  },
  {
    id: "combat.smash",
    label: { en: "Smash weapons (knockback, no first strike)", ko: "스매시 무기(밀치기·선공 불가)" },
    status: "absent",
    evidence: "정식화 — SID_スマッシュ 28건 ActNames(넉백100%·거리1)+SID_追撃不可 동시 부여(gaps/B §5) · 규칙 원문 4종(gaps/E §1-5)",
  },
  {
    id: "combat.effectiveness",
    label: { en: "Effectiveness (armored, cavalry, flying, dragon)", ko: "특효(중장·기병·비병·용족 등)" },
    status: "absent",
    evidence: "정식화 — skill.xml Efficacy 비트 5종·EfficacyValue = 3배(무기 위력에만 곱함, gaps/A §0-1·B §4) — 유닛 카테고리 판별 필드 후속",
  },
  {
    id: "combat.terrain-bonus",
    label: { en: "Terrain avoid/defense bonuses", ko: "지형 회피·방어 보정" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치에 포함",
  },
  {
    id: "combat.terrain-asymmetric",
    label: { en: "Force-asymmetric terrain modifiers", ko: "자군/적군 비대칭 지형 보정(瘴気 등)" },
    status: "absent",
    evidence: "TID_瘴気 등 PlayerDefense/EnemyDefense 별도 보정 실재 — 파이프라인 4필드 추출 완료, BattleMap.terrain 단일값 스키마(gaps/D §3)",
  },
  {
    id: "combat.support-bonus",
    label: { en: "Support (bond) bonuses", ko: "지원(絆) 보정" },
    status: "absent",
    evidence: "정식화 — reliance.xml 支援効果 6archetype×4단×4보정 + person.SupportCategory · combat.ts 슬롯 실재·미배선 · 발동 거리만 원문 없음(gaps/D §1)",
  },
  {
    id: "combat.status-effects",
    label: { en: "Status effects (poison, freeze, ...)", ko: "상태이상(독·동결 등)" },
    status: "absent",
    evidence: "정식화 — skill.xml BadState 비트(독3단·침묵·이동불가·약체화·기절), 부여 GiveSids·해제 RemoveSids · 독 데미지식 해석 모호(gaps/B §7, D §2)",
  },
  {
    id: "combat.staff-hit",
    label: { en: "Offensive staff hit/avoid", ko: "방해 지팡이 명중·회피" },
    status: "absent",
    evidence: "妨害杖命中値 = 魔力+技+武器命中 · 妨害杖回避値 = int((魔防*3+幸運)/2)+地形回避(gaps/A §2-5)",
  },
  {
    id: "combat.hp-stock",
    label: { en: "Boss HP stocks (multi-phase revival)", ko: "보스 HP 스톡(다단부활)" },
    status: "absent",
    evidence: "dispos HpStockCount 0~5(343건 — 신룡의장 6보스·M017 등) 스키마·파이프라인 사영 탈락 · Lua ReviveBefore/After 훅 실재(gaps/L·M) · State1 = 부활 상태전환 추정(범례 없음)",
  },
  {
    id: "combat.scripted-modifiers",
    label: { en: "Script-injected combat modifiers", ko: "스크립트 주입 전투 보정" },
    status: "absent",
    evidence: "Lua UnitCommandPrepare 명중 보정 주입(m000/m001) · BattleAfter 보스 AI 전환(m017)(gaps/M §3)",
  },
  {
    id: "combat.kill-bonus",
    label: { en: "Kill bonus drops", ko: "격파 보너스 드롭" },
    status: "absent",
    evidence: "killbonus.xml 격파/피격파 드롭 확률 테이블 — 파이프라인·엔진 소비 0, dispos Item.Drop과 별개 계층(gaps/L)",
  },
  {
    id: "combat.exp",
    label: { en: "EXP from calculator formulas and tables", ko: "경험치 = calculator 원문 공식+테이블" },
    status: "assumed",
    evidence: "체인 횟수 정정(battle.test.ts, gaps/FIX_NOTES F1) — 잔여 미반영 = 戦闘経験倍率 1.2(적용 위치 실행파일)·루나틱 반복 감쇠 누적(gaps/A §6-2·3)",
  },
  {
    id: "combat.exp-table-clamp",
    label: { en: "EXP table out-of-domain = boundary clamp", ko: "경험치 테이블 정의역 밖 = 경계 클램프" },
    status: "assumed",
    evidence: "정의역 = 레벨차 -39..+40 · 34/35 테이블은 양끝 상수 평탄 — 위험은 補助レベル差減衰値 마이너스 끝 선형 하나뿐(gaps/A §3)",
  },
  {
    id: "combat.exp-staff",
    label: { en: "Staff EXP", ko: "지팡이 경험치" },
    status: "absent",
    evidence: "杖経験計算 = clamp(杖経験値+杖減衰値+杖補助レベル差減衰値,1,100) — ★杖経験値는 덤프 미정의(gaps/A §0-2)",
  },
  {
    id: "combat.exp-dance",
    label: { en: "Dance EXP", ko: "춤 경험치" },
    status: "absent",
    evidence: "踊り経験計算 = clamp(踊り基本値(레벨+내부레벨)+補助レベル差減衰値,1,100)(gaps/A §0-2)",
  },
  {
    id: "combat.exp-chain-guard",
    label: { en: "Chain guard EXP", ko: "체인가드 경험치" },
    status: "absent",
    evidence: "チェインガード経験計算 = clamp(ガード基本値+補助レベル差減衰値,1,100)(gaps/A §0-2)",
  },
  {
    id: "combat.exp-summon",
    label: { en: "Summon EXP", ko: "소환 경험치" },
    status: "absent",
    evidence: "召喚経験計算 = clamp(召喚基本値(레벨+내부레벨),1,100) — 레벨차 무관(gaps/A §0-2)",
  },
  {
    id: "combat.exp-enchant",
    label: { en: "Enchant EXP", ko: "인챈트 경험치" },
    status: "absent",
    evidence: "エンチャント経験計算 = clamp(エンチャント基本値(레벨+내부레벨),1,100)(gaps/A §0-2)",
  },
  {
    id: "combat.exp-arena",
    label: { en: "Arena EXP branch", ko: "투기장 경험치 분기" },
    status: "absent",
    evidence: "戦闘経験計算 3분기 중 투기장 2분기 미소비(闘技場中·クリア済み 하드코딩 0)(gaps/A §0-2)",
  },
  {
    id: "combat.levelup-growth",
    label: { en: "Level-up: one growth roll per stat", ko: "레벨업 = 스탯별 성장률 1롤" },
    status: "assumed",
    evidence: "100 초과 = floor(grow/100) 확정 가산+잔여 1롤(battle.test.ts, 실측 최대 105 — gaps/D §4) · 1롤 모델 자체는 FE 문법 가정",
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
    label: { en: "Stat cap/floor and AutoGrowOffset handling", ko: "스탯 상한(job+person Limit)·하한 0·AutoGrowOffset" },
    status: "assumed",
    evidence: "상한 배선 완료 = job.Limit+person.Limit 클램프(fe17.test.ts 뤼에르 Lv99, gaps/D §5) — 하한 0·AutoGrowOffset은 PREDICT_M002 실기 대조 예정",
  },
  {
    id: "units.internal-level-cap",
    label: { en: "Internal level cap on promotion", ko: "내부 레벨 상한(전직 시)" },
    status: "absent",
    evidence: "内部レベル計算 = clamp(内部レベル+레벨-1, 0, 난이도별 50/40/30) — 엔진 미호출(gaps/A §0-2)",
  },
  {
    id: "units.move-enhance",
    label: { en: "Move stat bonuses (EnhanceValue.Move)", ko: "이동력 보정(EnhanceValue.Move)" },
    status: "absent",
    evidence: "6종 — ENHANCE_FIELDS에 move 부재(gaps/G)",
  },
  {
    id: "units.difficulty-skills",
    label: { en: "Per-difficulty skill sets (Normal/Hard/LunaticSids)", ko: "난이도별 스킬(Normal/Hard/LunaticSids)" },
    status: "absent",
    evidence: "수집 자체 안 함 — 루나틱 23종/162인(gaps/G) · 브레이크 면역 41인물 실배선 포함(§0 등재)",
  },
  {
    id: "units.meal-buff",
    label: { en: "Meal stat buffs (Somniel cooking)", ko: "식사 버프(요리 스탯 보정)" },
    status: "absent",
    evidence: "cook.xml 出来栄え/料理 Enhance 필드(Str~Mdef s8) — 출격 전 보정 기전, 장부 밖이었음(gaps/O)",
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
    evidence: "가정(fe17.ts equippedWeapon) — 공식 텍스트에 장비 규칙 서술 없음(gaps/E §1-4), 실기 반증 시 갱신",
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
    evidence: "M003 간파 corpus.test.ts · 적용 범위 = 자기 측 calculator 값 이름 훅만(相手の~·원시 스탯·발동 필터는 별건 항목, gaps/G)",
  },
  {
    id: "skills.timing-filter",
    label: { en: "Skill activation filters (Stand/Action/Timing/Order)", ko: "스킬 발동 필터(Stand/Action/Timing/Order) 준수" },
    status: "absent",
    evidence: "미준수 — 8종이 필터 무시 항상 적용(과대 방향: 月の腕輪 4종 Stand=1·血讐＋ Action=1 포함, gaps/G) · 필터 의미 범례 덤프에 없음 = 실기 표본 선행(§0 등재)",
  },
  {
    id: "skills.opponent-act",
    label: { en: "Opponent-side value modifiers", ko: "상대측 계산값 보정(相手の~ ActName)" },
    status: "absent",
    evidence: "14종 — 자기 modify 훅에 영원히 미매칭(gaps/G) · 부호 해석은 gaps/A §7-1과 동건",
  },
  {
    id: "skills.raw-stat-act",
    label: { en: "Raw-stat ActNames bypass hooks", ko: "원시 스탯 ActName(힘·마력 등 직접 보정)" },
    status: "absent",
    evidence: "11종 — vars 즉시 반환 경로라 훅 미도달(gaps/G)",
  },
  {
    id: "skills.sync-sids",
    label: { en: "SyncSids/SyncConditions expansion", ko: "SyncSids·SyncConditions 전개" },
    status: "absent",
    evidence: "28종 미전개 — 브레이크 면역 _効果 실배선도 이 층 소관(gaps/G · FIX_NOTES F2 파생)",
  },
  {
    id: "skills.condition-fallback",
    label: { en: "Unsupported skill conditions safely skip", ko: "평가 불가 조건 = 미적용 안전 강하" },
    status: "implemented",
    evidence: "미지 함수·식별자 모두 미적용 강하 통일(skills.test.ts, 열거 상수 예외 포함 — gaps/FIX_NOTES F5) · 조건 어휘 전수 = gaps/C §6 · 발동 필터 축은 별건 = skills.timing-filter",
  },
  {
    id: "skills.give-sids",
    label: { en: "Granted skills (GiveSids)", ko: "스킬 부여 체계(GiveSids — 몰아붙이기 등)" },
    status: "deferred",
    evidence: "정식화 완료 — 186행·3단 구조(부여자→효과→発動済み 래치)·GiveTarget 0~4·Life/Cycle(gaps/C §1) · 구현은 부여층 선행(§0 미룸)",
  },
  {
    id: "skills.aura-give",
    label: { en: "Aura grants from nearby units (Timing=20)", ko: "주위 오라 부여(Timing=20 — 타 유닛이 주는 스킬)" },
    status: "absent",
    evidence: "주위 부여 25건(白の忠誠·神竜の結束 등) — unitSkillRows가 타 유닛 부여를 수집하지 않음(gaps/C §0)",
  },
  {
    id: "skills.style-variant",
    label: { en: "Style-variant skill branches", ko: "스타일 분기 스킬(병종별 변형)" },
    status: "absent",
    evidence: "CooperationSkill~DragonSkill 8필드 49건 — M003 실측 신속 = SID_カウンター_竜族(gaps/C §7-5)",
  },
  {
    id: "skills.crit-unknown",
    label: { en: "Lueur +5 crit = Vander's aura (identified)", ko: "뤼에르 필살 +5 = 반데르 白の忠誠 오라(규명 완료)" },
    status: "absent",
    evidence: "규명 = SID_白の忠誠(Timing=20, 인접 시 必殺値+5 — 엔게이지 무관, m002/m003 배치·예보 4중 검증, gaps/C §0) · 미구현 사유 = skills.aura-give",
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
    label: { en: "Sync skills = union of bond levels 1..N (highest per series)", ko: "싱크로 스킬 = 絆 1..N 합집합·동계열 최고 레벨" },
    status: "assumed",
    evidence: "絆3 실측 정합(fe17.test.ts 技+2·ブレイク時追撃 — gaps/C §4-3) · 동계열 판별 = SID 명명 규칙 가정 · 레벨값은 편집기(M4) 소유(기본 = god Level)",
  },
  {
    id: "emblem.engage-activation",
    label: { en: "Engage activation, meter, duration", ko: "인게이지 발동·카운트·지속" },
    status: "deferred",
    evidence: "정본 수치 확보 — 지속 3턴·증가 常時·한계 god.EngageCount(정규 7·ルフレ 9)(gaps/C §2) · 턴당 범용 증가량은 덤프에 없음 · 설계 선행(§0 미룸)",
  },
  {
    id: "emblem.engage-kit",
    label: { en: "Engage weapons and engage skills", ko: "엠블렘 무기·인게이지 기술" },
    status: "deferred",
    evidence: "구조 규명 — 成長表 레벨별 EngageSkills/EngageItems·神将 EngageAttack/LinkGid(gaps/C §3) · 스타일 분기 문장사 = ベレト·チキ 2종(相手판은 GrowTable 공유 — gaps/F 정정) · §0 미룸(M2 이월)",
  },
  {
    id: "emblem.bond-ring",
    label: { en: "Bond rings (stats, S-rank skills)", ko: "絆지환(스탯 보정·S랭크 스킬)" },
    status: "absent",
    evidence: "ring.xml 487행 정식화 — 정규 12문장사만 세트 보유(DLC 0건 덤프 확정) · S랭크 EquipSids 28행 전부 Rank=3(gaps/F)",
  },
  {
    id: "emblem.inheritance",
    label: { en: "Skill inheritance (cost, availability)", ko: "스킬 계승(비용·가능 여부)" },
    status: "absent",
    evidence: "skill.xml InheritanceCost/Sort 필드 확인 · 리유르만 계승 불가(InheritanceSkills 21행 공란, gaps/F)",
  },
  {
    id: "emblem.doubles-multiplier",
    label: { en: "Doubles/afterimage stat multiplier", ko: "잔상(분신) 능력 배율" },
    status: "absent",
    evidence: "残像能力倍率 = 1(params GameRule) — effect 残像コマンド와 명칭 일치, 소재 스킬 ID 미확정(gaps/J)",
  },
  {
    id: "emblem.crest-tile",
    label: { en: "Emblem energy tile effect", ko: "紋章氣(문장기) 효과" },
    status: "absent",
    evidence: "렌더만 구현(M1.5) — PutEffect=エンゲージカウント回復マス(Heal=0), 회복량 수치는 덤프에 없음 = 실측만이 경로(gaps/C §5)",
  },

  // ── 무기·아이템 ──
  {
    id: "weapons.attack-kinds",
    label: { en: "Attack weapon kinds (staves excluded)", ko: "공격 무기 판별(Kind 1~6·8·9, 지팡이 제외)" },
    status: "anchored",
    evidence: "전수 실측(decisions 2026-08-16) · 661건 재확인 반례 0(gaps/B §1)",
  },
  {
    id: "weapons.range-union",
    label: { en: "Attack range = union of RangeI..RangeO", ko: "사거리 = RangeI..RangeO 합집합" },
    status: "anchored",
    evidence: "전수 실측(decisions 2026-08-16) · 661건 재확인 반례 0(gaps/B §1)",
  },
  {
    id: "weapons.magic-split",
    label: { en: "Magic damage detection (Kind 6 or flag)", ko: "마법 데미지 판별(Kind 6 또는 Flag bit16)" },
    status: "anchored",
    evidence: "item.xml 661건 전수 — Kind=6/Flag bit16 상호배타·반례 0(gaps/B §2, 2026-08-17)",
  },
  {
    id: "weapons.forge-engrave",
    label: { en: "Forging and engraving bonuses", ko: "연성·각인 보정" },
    status: "absent",
    evidence: "3계통 정식화 — 錬成 552행·進化 114행·エンゲージ武器強化 65종×3단계(gaps/B §3, F) · 각인(刻印) = god.xml 神将 시트 소유(22행 채움, gaps/F)",
  },

  // ── 턴 구조 ──
  {
    id: "turn.phase-cycle",
    label: { en: "Phase cycle and turn increment", ko: "페이즈 순환(생존 군만)·자군 복귀 시 턴 증가" },
    status: "implemented",
    evidence: "battle.test.ts · 배너 문자열 4군 순환 방증(gaps/E §1-9)",
  },
  {
    id: "turn.activation-reset",
    label: { en: "Phase start resets acted/moved/broken", ko: "페이즈 복귀 시 행동·이동·브레이크 리셋" },
    status: "implemented",
    evidence: "battle.test.ts",
  },
  {
    id: "turn.terrain-heal",
    label: { en: "Healing tiles at phase boundary", ko: "회복 타일(요새 등) 페이즈 회복" },
    status: "absent",
    evidence: "요새·회복바닥 등 Heal 비영 타일 다수 — endPhase에 회복 로직 부재(gaps/D §3)",
  },
  {
    id: "turn.chapter-hold-level",
    label: { en: "Chapter hold level (Fell Xenologue)", ko: "챕터 고정 레벨(사룡의 장 HoldLevel)" },
    status: "absent",
    evidence: "chapter.xml HoldLevel = E001~E006 고정 15~28 — E시리즈 미변환이라 무발현(gaps/L)",
  },
  {
    id: "turn.rewind",
    label: { en: "Time crystal rewind (limits, script gating)", ko: "되감기(시간의 수정 — 한도·스크립트 통제)" },
    status: "absent",
    evidence: "한도 = Normal 무제한/Hard·Lunatic 10(params) · Lua MapHistory* 훅 9종 — 챕터·시점별 스크립트 통제(M4 언두 설계 참조, gaps/J·M)",
  },
  {
    id: "turn.map-gimmicks",
    label: { en: "Map gimmicks (spread, hazards, collapse)", ko: "맵 기믹(확산·위험타일·붕괴 등)" },
    status: "absent",
    evidence: "RNG 소비 3계열(미아즈마 확산·파괴 장애물·위험타일 텔레그래프) + 독가스·얼음·구역붕괴 — 전투 RNG 스트림 공유 여부 실측 필요(gaps/M §4) · 안개 기믹은 원문 0건",
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
    evidence: "Lua 이벤트 엔진(M4 이후, §0 미룸) — 2계층 모델 확정: 표준 4함수+WinRule() 및 Die/Destroy→勝利/敗北 콜백 오버라이드 18건(gaps/E §2-2, M §5)",
  },
  {
    id: "turn.reinforcements",
    label: { en: "Reinforcements (turn/condition spawns)", ko: "증원(턴·조건 등장)" },
    status: "deferred",
    evidence: "Lua 이벤트 엔진(§0 미룸) — 증원 5패턴, Dispos() 단일 원시함수 363회 전량·반례 0(gaps/E §2-1, M §5)",
  },
  {
    id: "turn.enemy-ai",
    label: { en: "Automatic enemy phase AI", ko: "적턴 AI 자동 진행" },
    status: "deferred",
    evidence: "M5 — AI 파라미터 정본·평가함수 실측 보정(§10-4) · dispos AI 10필드 파이프라인 사영 완료(소비처만 없음, gaps/L) · 지원 선택 스코어 상수 支援値加算 3/2/1(gaps/J)",
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
