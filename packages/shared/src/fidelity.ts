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
  { id: "ai", label: { en: "Enemy AI Data", ko: "적 AI 데이터" } },
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
    id: "movement.multi-tile-unit",
    label: { en: "Multi-tile units (BmapSize)", ko: "다칸 유닛(BmapSize)" },
    status: "absent",
    evidence: "BmapSize 2 = 異形竜류 29체·3 = E006 보스·5 = 솜브론 용형(gaps/H) · ★실기 등장 확인 = 17장 이형룡(m017 dispos 3배치, 화염 브레스 — 사용자 전언 2026-08-17 정합) · 점유·인접·사거리 판정 영향, 발현 = M017 변환 시",
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
    evidence: "원문 절차 확보(gaps/E §1-7) + 실기 확인 = 커맨드로 인접 아군 재행동(사용자 2026-08-17) · 경험치 = combat.exp-dance",
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
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(5.0.0, 2026-08-17) — 굴림은 1회다: App.BattleMath._IsProbabilityHit(RVA 0x1E8D0E0)가 Random.Game.GetValue(10000) 한 번을 GetHitRatio10000(RVA 0x1E8D200) 임계와 < 비교(2RN 아님). 임계 = 표시<51 또는 =100이면 ratio*100 선형, 51~99면 ratio*100 + sin(pi*(ratio-50)/50)*ratio*13.333333 절삭(상수 0x42480000=50.0·0x3C8EFA35=pi/180·0x42C80000=100.0·0x41555555=40/3, 전 연산 float32) · 하한 페널티 없는 비대칭 상향 곡선 = 최대 편차 표시 78에서 +10.21%p · 엔진 배선 = formula/probability.ts(RULE_VERSION fe17-3에서 선형 1RN 반증 정정) · 상세 = extracted/il2cpp/HIT_RANDOM.md",
  },
  {
    id: "combat.crit-multiplier",
    label: { en: "Critical = 3x damage", ko: "필살 = 데미지 3배" },
    status: "anchored",
    evidence: "공식 도움말 원문 kr '대미지 3배' = us 'triple damage'(system.msbt MID_H_INFO_Crit, gaps/N) · 3회차 간접 방증: patch2.msbt MSID_H_SenerioEngage_Dragon '필살이 2배'는 필살률 2배로 층위가 다름(gaps/N §4-2) · ★IL2CPP 코드 확정(2026-08-17): BattleCalculator.CalcAttackHit(RVA 0x24723A0) 0x024726E8 `add w9,w8,w8,lsl #1` + `csel`(Result.Critical 비트) = 정수 상수 3배, 테이블 아님 · 적용 순서 = SimplePower를 Clamp(0,999)한 뒤 3배(필살 데미지는 999 초과 가능, 상한 2997) · 필살 판정 자체는 sin 곡선을 쓰지 않는 선형(combat.crit-rng) · 미조사 = 체인/인게이지 등 타 경로의 별도 배수 유무(HIT_RANDOM.md §4)",
  },
  {
    id: "combat.rng-source",
    label: { en: "RNG source (xorshift128, per-stream)", ko: "난수원(xorshift128·스트림별)" },
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(2026-08-17) — App.Random 자체 구현: t=s1^(s1<<11); t^=t>>8; t^=s4^(s4>>19); GetValue(n)=(t&0x7FFFFFFF)%n(RVA 0x2375170). UnityEngine.Random 아님 · 스트림 7종(System/Game/Spot/Hub/HubItem/KillBonus/Combat) 중 전투 판정은 전부 Game(get_Game RVA 0x2374C70) · IsSave(type)=type!=0 → System 외 전 스트림이 세이브에 직렬화 = 로드 후에도 난수열 재현 · ☠모듈로 편향 존재(2^31%10000=3648) — 비트 단위 재현 시 나눗셈까지 이식 필요 · 엔진 현행 = 주입식 RandomSource.next(bound)로 추상화(실굴림 분포는 미이식)",
  },
  {
    id: "combat.crit-rng",
    label: { en: "General probability check (linear, 0.001% step)", ko: "일반 확률 판정(필살·발동 — 선형·0.001% 해상도)" },
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(2026-08-17) — BattleMath.RandomCheck100 → App.Random.IsProbability100(RVA 0x23754B0): percent*1000 > (xorshift&0x7FFFFFFF)%100000. 명중과 달리 sin 보정 없는 선형이고 해상도가 0.001%다 · percent<=0이면 난수를 소모하지 않는다(롤 소비 순서 계약에 직결) · 필살·격추·스킬 발동이 전부 이 경로 · 엔진 배선 = formula/probability.ts isProbability100, battle.ts가 next(100000)으로 소비",
  },
  {
    id: "combat.forecast-determinism",
    label: { en: "Forecast/AI simulation is deterministic (RNG bypass)", ko: "예보·AI 시뮬은 결정론(난수 우회)" },
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(2026-08-17) — BattleMath는 확률 판정을 델리게이트 슬롯(s_CurrentProbability100/Hit)으로 들고, PushSimulation/PopSimulation이 _IsProbabilityTrue(ratio>0)/_IsProbabilityFalse로 스왑한다(SetSimulation RVA 0x1E8D2E0, s_Simulationed 카운터로 중첩 관리) · 호출처 2곳 = BattleInfo.CalcParam(전투 예보)·BattleCalculator.CalcSimulation(AI 시뮬, PushRandomSeed/PopRandomSeed로 RNG 상태까지 저장·복원해 실난수열을 소모하지 않음) · 시사 = 예보는 '명중률 0 초과면 명중'인 결정론 경로 · 난이도·모드별 확률 분기는 없음(바인딩 후보 4종뿐)",
  },
  {
    id: "combat.follow-up",
    label: { en: "Follow-up attack from calculator formula", ko: "추격 판정 = calculator 공식" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치 · 追撃条件 원문 = 攻撃速度差 >= 5(gaps/A §2-2)",
  },
  {
    id: "combat.chain-attack-accuracy",
    label: { en: "Chain attack accuracy: base 80, skills override via '='", ko: "체인 어택 명중률 = 기본 80 고정, 스킬이 = 연산으로 덮어씀" },
    status: "anchored",
    evidence: "calculator.xml チェインアタック命中率計算=80 + skill.xml SID_チェインアタック命中率(90/100/30/10)% + patch2.msbt MSID_H_Charisma(us 'to 90%', kr은 수치 생략 — 모순 아님, gaps/N §3-1) · 상대에게 강제 30/10%는 Condition=相手の立場==援護 게이트",
  },
  {
    id: "combat.chain-attack-damage-cut",
    label: { en: "Chain attack damage taken cut to 20%", ko: "체인 어택 받는 대미지 = 20%로 감쇠" },
    status: "anchored",
    evidence: "skill.xml SID_チェインアタック威力軽減(＋) ActValues=0.2(ダメージ*0.2) — 텍스트(인연을 가르는 자)는 수치 생략, 데이터 전용 수치(gaps/N §3-1)",
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
    evidence: "手番回数 = 측당 교전 턴 수(0=반격 없음·2=추격) · SID_追撃不可 = min(手番回数,1)(gaps/A §0-2) — 엔진은 boolean followUp 축약 · 3회차 재확인: skill.xml SID_切り返し가 Condition=手番回数==1 게이트 하에 手番回数=2를 직접 대입 — 추격이 手番回数 스칼라 대입으로 구현됨을 실물로 확인(gaps/N §3-4, 제안 id combat.followup-representation 병합)",
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
    label: { en: "Break recovery: after one defended combat, or own phase start", ko: "브레이크 해제 = 피격 전투 1회 직후 또는 자기 군 페이즈 시작" },
    status: "anchored",
    evidence: "★IL2CPP 코드로 종결(2026-08-17, il2cpp/SEQUENCE_BREAK §2-7): 브레이크의 실체 = SID_気絶(States.Stun) 부여이고 효과는 '반격 불가'가 아니라 **手番回数 = 0**(그 전투에서 오더를 못 받음) · 해제 = 두 경로 중 먼저 오는 쪽 — (A) 그 유닛이 참여한 다음 전투의 커밋 시점(BattleCalculator.CommitUnit 0x2477B70, 그 전투에서 다시 브레이크되지 않았을 때) (B) 페이즈 종료 시 무조건(MapSequence.TurnEnd → Unit.ResetPhaseEnd 0x1A19EF0, 데이터도 SID_気絶 Cycle=3=PhaseAfter) · ⇒ kr 원문 '한 번 전투를 하거나 다음 턴이 되기 전까지' = (A) or (B)로 정확히 대응하고 us 원문은 (A)만 적은 축약이었다(원문 불일치 해소) · 발동 조건 = 명중 + 확정 대미지 1 이상 + 공격 주체가 Offense이고 피격이 Defense(**반격·체인어택으로는 브레이크가 발생하지 않는다**) + CanBreakable(무기 상성 비트) + 미브레이크 · ☠면역의 정본은 SID 목록이 아니라 **BadIgnore 비트**(ブレイク無効_効果=1024/Stun · 相性ブレイク無効=2048/Interact, 重装スタイル 직업이 후자를 부여) — 엔진은 아직 SID 목록으로 근사한다 · 기존 근거: 사용자 실기 대조 2026-08-17(reference/screens break_recovery_1~3 — 피격 시 유지·직후 해제·적턴 시작 해제) · battle.test.ts breakRelease · kr 도움말 두 절 모두 확정(E §1-1 불일치 해소) · 3회차 patch0-3 전수 후에도 브레이크 자동 해제 타이밍 서술 0건 재확인 — 텍스트 축 경로 종결(gaps/N §4-2)",
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
    id: "combat.engage-attack-damage-type",
    label: { en: "Engage-technique damage is a distinct type (separately mitigable)", ko: "인게이지 기술 대미지 = 독립 유형(별도 감쇠 대상)" },
    status: "assumed",
    evidence: "patch3.msbt MSID_H_JobSkill_ShadowPrincessR '인게이지 기술로 공격받았을 때 받는 대미지-20%' — 데이터 교차 대조 미실시, 텍스트 단서만(gaps/N §4-1 #9)",
  },
  {
    id: "combat.smash",
    label: { en: "Smash weapons (knockback, no first strike)", ko: "스매시 무기(밀치기·선공 불가)" },
    status: "absent",
    evidence: "정식화 — SID_スマッシュ 28건 ActNames(넉백100%·거리1)+SID_追撃不可 동시 부여(gaps/B §5) · 규칙 원문 4종(gaps/E §1-5)",
  },
  {
    id: "combat.weight-build-overflow",
    label: { en: "Weight-over-build damage bonus (physical, cap +5)", ko: "무게 초과 대미지 = min(무기 무게-체격, 5), 물리 한정" },
    status: "anchored",
    evidence: "skill.xml SID_重撃 威力 += min(武器の重さ-体格,5), Condition=攻撃属性==物理属性 && 武器の重さ>体格 + patch1.msbt MSID_H_HeavyAttack(중격, kr/us 일치, gaps/N §3-4)",
  },
  {
    id: "combat.effectiveness",
    label: { en: "Effectiveness (armored, cavalry, flying, dragon)", ko: "특효(중장·기병·비병·용족 등)" },
    status: "absent",
    evidence: "정식화 완결 — 판별 = Attrs 비트(job|person OR 합성, Efficacy 비트와 반례 0 — gaps/H) · 배수 = EfficacyValue 3(17/18행, 邪竜特効만 2 — gaps/I 정정) · 무기 위력에만 곱함(gaps/A) · 데이터 사영 완료, 배선만 결손 · 3회차 텍스트 경로 종결 권고: patch0-3 전수에서 특효는 攻撃結果(特効) 불리언으로만 등장(혜안 +5는 가산 보정, 배수 아님) — 배수 확정은 실행부/실측 전용(gaps/N §4-2)",
  },
  {
    id: "combat.terrain-bonus",
    label: { en: "Terrain avoid/defense bonuses", ko: "지형 회피·방어 보정" },
    status: "anchored",
    evidence: "corpus.test.ts 예보 일치에 포함 — 스타일 변형(隠密 2배·魔法 무시)은 units.style-grant-skills 소관(코퍼스 케이스는 비해당 스타일) · 3회차 교차자료: patch0.msbt MSID_H_CamillaEngage(천구)가 '지형 효과를 받지 않게 된다'는 무효화 경로 보유 — 지형 보정이 온/오프 가능한 별도 레이어임을 확인(gaps/N §4-2)",
  },
  {
    id: "combat.effectiveness-ignore",
    label: { en: "Effectiveness immunity/negation", ko: "특효 무효(가호·배리어)" },
    status: "absent",
    evidence: "EfficacyIgnore 비트 — 神竜の加護 127(전 일반 특효)·バリア 32(邪竜만) · 보스 전용 특효 12비트는 무효 대상 아님(gaps/H)",
  },
  {
    id: "combat.terrain-asymmetric",
    label: { en: "Force-asymmetric terrain modifiers", ko: "자군/적군 비대칭 지형 보정(瘴気 등)" },
    status: "absent",
    evidence: "TID_瘴気 등 PlayerDefense/EnemyDefense 별도 보정 실재 — 파이프라인 4필드 추출 완료, BattleMap.terrain 단일값 스키마(gaps/D §3)",
  },
  {
    id: "combat.support-bonus",
    label: { en: "Support (bond) bonuses (adjacent only)", ko: "지원(인연) 보정 — 인접 1타일" },
    status: "anchored",
    evidence: "배선 완료(battle.test.ts 5건) · 발동 거리 = 인접 1타일(사용자 실측 2026-08-17) · 수치 = supports.json(支援効果 6×4 — D §1-1 전사 오류 정정, FIX_NOTES_3 §2) · ★IL2CPP 코드로 가정 3건 전부 종결(2026-08-17, il2cpp/SUPPORT.md): 거리 = 맨해튼 1(SupportCalculator.Range=1 + MapFor.EachRange(near=1,far=1)의 |dx|+|dz| 게이트 — **대각 미발동 확정**) · archetype = **파트너**의 SupportCategory(UnitReliance.TryGetSupportData 0x1C5B150이 unitB의 PersonData+0x80만 인덱싱 — 수혜자설 기각, 현행 엔진 정합) · 복수 파트너 = 단순 합산·상한 없음(MaxShowUnits=4는 UI 표시 슬롯 전용) · 파트너 자격 = 엄격 동일 Force.Type(동맹 세력 제외 — IsAllide를 쓰지 않는다) · 평가 = 전투 정보 산출 시 양측 1회 고정(매 타격 재계산 아님), 좌표는 이동 후 전투 지점 · ☠Level 4 = **A+**이지 S가 아니다(RelianceData.Level None0/C1/B2/A3/APlus4 — 경험 승급은 A까지, A+는 엠블럼 링크 경로) · 회귀 방지 테스트 2건(archetype 소유자·타 세력 배제) · 예보 패널 표시는 §0 미룸 · 3회차 재확인: 표준 命中値計算·回避値計算에 支援命中·支援回避 항이 실재함을 포탄식(SID_弾丸命中) 대조로 재확인 — 발동 거리 조건은 여전히 텍스트·계산식 어디에도 부재(gaps/N §4-2)",
  },
  {
    id: "combat.status-effects",
    label: { en: "Status effects (poison, freeze, ...)", ko: "상태이상(독·동결 등)" },
    status: "absent",
    evidence: "정식화 — skill.xml BadState 비트(독3단·침묵·이동불가·약체화·기절), 부여 GiveSids·해제 RemoveSids(gaps/B·D) · 독 = 피격 대미지 증가 실기 확정: ★1스택 = +1(치료 전후 5→4, reference/screens poison_damage_1~2 정정판 — ActNames '相手の威力+1' 문자 그대로 정합) · 3회차 재해석으로 '데미지식 해석 모호' 해소(gaps/B §7 [3회차 2026-08-17]): Action=2 코호트 52행 전수가 피격측이고 그중 이름이 효과를 말하는 アイクエンゲージスキル_ダメージ50%減·確率被ダメ半減이 동일하게 '相手の威力*0.5' — 반전 표기 가설 기각 · ★승격(중첩 아닌 치환) = 원문 확정: scripts/g002_gimmick.txt 毒ガスによる状態異常を付与する()가 解除(하위)→装備(상위) 사슬을 그대로 구현하고 개발자 주석이 '1つ上の状態にする'·'上書きする' — 劇毒에서 포화(위 분기 없음) · 남는 결손은 미실측 = 猛毒 +3·劇毒 +5(1스택 실측 + 동일 필드 구조의 연역)·Power 필드 의미(3단 전부 5로 동일해 효과 크기와 무관)·단검 연타 승격의 구현 위치 = ★IL2CPP 코드 확정(2026-08-17, 실측 불요로 종결): SkillData.GroupAssign(RVA 0x248D0C0)이 skill 테이블을 행 순서대로 훑어 Priority 연속 오름차순 구간을 그룹으로 묶고 LowSkill(0x268)/HighSkill(0x270)로 잇는 **범용 승격 사슬 기구**가 실재하며, Unit.AddGiveSkill(0x1A5D430)이 재부여 시 한 단계 위로 치환하고 AddPrivateSkill(0x1A37990)이 하위 티어를 제거해 **공존 불가**다 — 즉 2회 명중 = 猛毒 +3 확정, 중첩(+2) 기각(statusPoison.test.ts의 예측과 일치) · 독 발동 지점도 확정 = Timing=10(HitBefore, CalcAttack이 타격마다 여는 단계)·Action=2(보유자가 맞는 타격만)·Stand=0(주도권 무관)이라 '맞는 매 타격의 威力 단계에 +N, 守備 차감 이전' · ☠猛毒 부여 경로 = XML GiveSids 0건·Lua 1건(g002 승격 사슬)뿐 · Life=0 무제한(해제 = デトックス/毒消し) · 蛇毒은 BadState=0 별계통(%HP DoT) · 사룡 전용 송곳니의 저주는 별도 정식화 완결(combat.status-fang-curse, 3회차 — gaps/N §3-3) · 위 전부 실행 검증 = engine/tests/statusPoison.test.ts(13) + 스크래치 verify_poison_lua.mjs · status는 배선 부재로 absent 유지(선행 = skills.opponent-act)",
  },
  {
    id: "combat.status-fang-curse",
    label: { en: "Fang curse: max HP -5 per stack, 4 discrete tiers", ko: "송곳니의 저주 — 최대 HP -5씩 4단(-5/-10/-15/-20)" },
    status: "anchored",
    evidence: "item.xml IID_牙 + skill.xml SID_牙呪 / SID_牙呪_発動(Condition=相手のMaxHP>5 && 相手の生存) / SID_牙呪_効果_最大HP_-5..-20(4단 이산 SID, EnhanceValue.Hp, BadState=512, Cycle=7/Life=1) + patch2.msbt MIID_H_Fang(kr '최대 -20' = 연속 누적 아닌 4티어 승격) — combat.status-effects §7 언급분의 정식화 완결(gaps/N §3-3)",
  },
  {
    id: "combat.staff-hit",
    label: { en: "Offensive staff hit/avoid", ko: "방해 지팡이 명중·회피" },
    status: "absent",
    evidence: "妨害杖命中値 = 魔力+技+武器命中 · 妨害杖回避値 = int((魔防*3+幸運)/2)+地形回避(gaps/A §2-5)",
  },
  {
    id: "combat.range-hit-falloff",
    label: { en: "Range-based hit falloff (-10 per tile from range 4)", ko: "원거리 명중 감쇠(4칸부터 칸당 -10)" },
    status: "assumed",
    evidence: "SID_弾丸命中의 cond(戦闘距離>=4,(戦闘距離-3)*10,0) 항 — 현재 확인된 유일 적용처 = weapons.cannon-hit-model(포탄) · 범용 룰인지 포탄 한정인지 미판정, 다른 무기군에서 동일 항 미발견(gaps/N §4-1)",
  },
  {
    id: "combat.hp-stock",
    label: { en: "Boss HP stocks (multi-phase revival)", ko: "보스 HP 스톡(다단부활)" },
    status: "absent",
    evidence: "사영 복원 완료(hpStock·state1 — projection.test.ts, FIX_NOTES_2 P1) · 부활 거동은 미구현(부활 후 HP·상태 규칙 덤프에 없음) · 비영값은 미변환 챕터에만(m017·m025·g/e 계열)",
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
    evidence: "체인 횟수 정정(battle.test.ts, gaps/FIX_NOTES F1) — 잔여 = 戦闘経験倍率 1.2(실체 후보 = 스승의 인도 120% 스킬, 전역 룰 아닐 가능성 — gaps/N)·루나틱 반복 감쇠 누적(gaps/A §6-2·3) · 3회차 두 번째 실물 확인: SID_血統(혈통, DLC) = 取得経験*=1.2 — 독립 소재에서 동일 배율 재확인(방증 1건→2건), 적용 위치·반올림은 여전히 미상(gaps/N §4-2)",
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
    label: { en: "Level-up growth (cap gate, retry up to 4)", ko: "레벨업 성장 — 상한 게이트·최대 4시도 재굴림" },
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(2026-08-17, il2cpp/STATS_GROWTH.md — App.Unit.LevelUp RVA 0x1A3A040 GrowMode.Random): 스탯별로 floor(grow/100) 확정 가산 + 잔여 grow%100 1롤이고, **증가 1회마다 상한(GetCapabilityLimit) 게이트**를 통과해야 반영된다(확정분도 캡을 못 뚫는다) · 성장률은 0..255 클램프(100 절사 아님) · **획득 스탯이 abort(2) 미만이면 최대 4시도까지 재굴림하고 최선 시도를 채택**(Unit.LevelUpRetryMax=4·GrowAbortCount=2, 난수는 시도 간 이어짐) — 0~1스탯 레벨업 확률이 크게 낮아지므로 육성 시뮬 분포에 직결 · 확률 판정 해상도 = 0.001%(percent*1000 > rand%100000), 잔여 0이면 난수 미소모 · 엔진 배선 = battle.ts rollGrowth + UnitState.cap(테스트 5건) · 미배선 = GrowMode.Fixed(고정 성장 모드)·성장률 변조 스킬(努力の才 *2·星玉の加護 +15)·무기 GrowRatio",
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
    id: "units.style-grant-skills",
    label: { en: "Battle-style granted skills", ko: "전투 스타일 부여 스킬(은밀·마법 등)" },
    status: "absent",
    evidence: "사영 복원 완료(styles.json 9행 — projection.test.ts) · 배선 보류 = 地形回避가 훅 미노출(평문 env)·실측 케이스 부재(프로브 실측 88=88, FIX_NOTES_2 P2 게이트) · 해제 조건 = 훅 노출 + 은밀/마법 실측",
  },
  {
    id: "units.job-skills",
    label: { en: "Job skills (innate/learning/lunatic)", ko: "병과 스킬(Skills·LearningSkill·LunaticSkill)" },
    status: "absent",
    evidence: "91건 미소비(踊り·鍵開け 포함, gaps/H) — 수집 요구는 gaps/I 병과 계열 49행",
  },
  {
    id: "units.job-growth",
    label: { en: "Generic enemy growth from job", ko: "일반 적 성장 소스(job.BaseGrow)" },
    status: "absent",
    evidence: "재현 불요 확정 — 적은 맵 내 레벨업 없음(사용자 확정 2026-08-17, 엔진도 자군만 경험치·레벨업) · job.BaseGrow는 데이터 참고용(gaps/H)",
  },
  {
    id: "units.weapon-proficiency",
    label: { en: "Weapon aptitude and rank", ko: "무기 적성·랭크(Aptitude)" },
    status: "absent",
    evidence: "Aptitude 비트 = 무기 컬럼 순서(교차 일치 2건) — equippedWeapon은 Kind·RangeO만 검사(gaps/H)",
  },
  {
    id: "units.promotion",
    label: { en: "Class promotion tree", ko: "전직 체계(HighJob/LowJob)" },
    status: "absent",
    evidence: "전직 트리 정식화(LowJob은 JID 아닌 MSBT 라벨, gaps/H) · 내부 레벨 상한은 units.internal-level-cap",
  },
  {
    id: "units.skirmish-generation",
    label: { en: "Skirmish enemy generation", ko: "조우전 적 생성(encount.xml)" },
    status: "absent",
    evidence: "★서비스 피쳐 제외(사용자 결정 2026-08-17) — 데이터 정식화만 보존(무기등급 17·직업풀 25·골드 18, gaps/K §6)",
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
    evidence: "VERIFY_M002 대조 일치 156·불일치 0 · 3회차 재확인: dispos LevelN/LevelH/LevelL은 140파일 10,951행 전수 동일값(난이도 분기 데이터 없음, gaps/O §10-1-4) — 실제 난이도별 스탯 스케일링은 Offset 경로 소관, 본 앵커의 근거가 LevelN/H/L이라면 오해 소지 있어 재확인 요망 · 후속 정정(2026-08-17): dispos LevelN 비영 행 140파일 전수 0(아군·적 공히) = dispos는 레벨 미소유 — 적 레벨 정본은 person.xml Level(M002 2~5·M010 12~15 스토리 정합, gaps/L 실측 후속 절). 신룡의 장은 별건 = units.divine-paralogue-level",
  },
  {
    id: "units.divine-paralogue-level",
    label: { en: "Divine Paralogue enemy level scaling (runtime)", ko: "신룡의 장(g001~g006) 적 레벨 런타임 스케일링" },
    status: "anchored",
    evidence: "★IL2CPP 코드로 수식 확정(2026-08-17, il2cpp/ENEMY_LEVEL.md — 실측 불요로 종결): totalLevel = person.Level + MapSituation.AverageLevel - 1 (Unit.CreateDlcGodEnemy RVA 0x1A0CA80, 0x1A0CB00~34). 잡졸 PID_G000_幻影兵_*은 person.Level=1이라 **총레벨 = AverageLevel 그대로** · AverageLevel = Clamp(CalcEncountRank(N) + 난이도조정, 1, 99), 난이도조정 = Normal -5 / Hard -2 / Lunatic +1 · CalcEncountRank(N) = round(상위 N명 총레벨 합 / N) + 2, N = 그 맵 dispos의 플레이어 그룹 엔트리 수(출격 슬롯), 총레벨 = Level + InternalLevel(승급 = 내부레벨 +20), 반드레는 조건부 편입 · ⇒ 사용자 전언('플레이어 레벨 추종')이 정확했고 기준은 **출격 슬롯 수만큼의 상위 레벨 평균**이다 · 정적 데이터로 재현 불가했던 이유 = 스케일링이 실행부 소관(dispos 레벨 전수 0·Lua 조작 0건·HoldLevel=0)",
  },
  {
    id: "units.chapter-preset-roster",
    label: { en: "Per-chapter preset party state (level, promotion, inventory, sync)", ko: "챕터별 프리셋 파티 상태(레벨·승급·소지품·싱크로)" },
    status: "absent",
    evidence: "chart.xml 加入 1510행(챕터 54 + QA 3) — dispos Force=0 1415행은 레벨 0·Jid/Gid/Sid 공란으로 아군 스탯 미소유, 교집합 60건 실값 일치 0셀, 전역 시그니처 대조 0/1510(gaps/O §10-1) · units.difficulty-scaling·units.promotion과 별개 소스(dispos·encount에 중복 0건)",
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
    evidence: "M003 간파 corpus.test.ts · ActNames 전수 52종 census — 자기측 훅 13종 305회 소비 / 상대측 90 / 원시 스탯 58 / 어휘 밖 20종 218회(gaps/I) · 별건 항목 = opponent-act·raw-stat-act·timing-filter · ★IL2CPP 합성 규칙 확정(2026-08-17, il2cpp/RATES_FORMULA §2-3·SKILL_ENGINE §5-1): 전투 파라미터 12훅은 base·add·scale **3레지스터**로 모았다가 `(base+add)*scale` 1회 합성이라 **스킬 순서 무관**이고(엔진은 순차 즉시 반영이라 `+5`와 `*1.3`의 순서로 값이 갈렸다 — 정정), `=`는 기저만 덮고 add·scale은 살아남는다 · 결과 클램프 = 값계 0..999 · 율계(命中率·必殺率) 0..100, 2단 클램프 실재(命中値·回避値 각각 0..999 후 차감, 결과 다시 0..100) · ☠원시 스탯(力·守備…)·追撃条件은 이 규칙 밖 = 즉시 반영·클램프 없음이 정본 · 배선 = skills.ts PARAM_LIMIT(테스트 5건) · 미배선 = 攻撃速度 음수 클램프(0 하한)를 calculator 층에 넣는 것",
  },
  {
    id: "skills.timing-filter",
    label: { en: "Skill activation filters (Stand/Action/Timing/Order)", ko: "스킬 발동 필터(Stand/Action/Timing/Order) 준수" },
    status: "anchored",
    evidence: "★IL2CPP 코드 확정(2026-08-17) — BattleInfoSide.IsEnableSkill이 네 필드를 전부 게이트로 소비한다. Stand(0x78, Stands: None0/Offence1/Defence2)는 m_SideType(BattleSide.Type: Offense0/Defense1)과 대조 = **전투 주도권**(0x1E8CDFC~0x1E8CE24, Stand!=None이면 상대 실재도 추가 확인, ChainOffense2~7은 Offence 판정에서 탈락) · Action(0x7c)은 CalcActiveSkill이 때리는 쪽에 1·맞는 쪽에 2를 넘겨 대조 = **이번 타격의 역할**(0x2469FC0~) · Timing은 파이프라인 단계 셀렉터(27종 열거, HitBefore=10은 CalcAttack이 타격마다 연다) · Order는 HitSkill.SortKey(0x19B60F0)의 정렬 키 · 평가 순서 = Flag → Timing → Action → Stand → Target → Condition/Cycle. ☠앞선 '실기로 Stand 게이트 기각' 판정은 **오독이었고 철회한다** — 그 실측(선공 예보 vs 피격 예보 적 명중 동일)은 같은 전투의 공격행·반격행이라 Stand가 양쪽 다 참이었다(M003 간파 코퍼스도 동일 구조). 엔진 배선 = skills.ts passesFilter + Combatant.initiator/striking, battle.ts가 전투 주도권 고정·타격 역할 반전으로 주입 · 미확정 = Timing=Always류가 이 게이트를 우회하는 별도 경로(SkillArray 비트마스크) 유무 · 상세 = extracted/il2cpp/STATUS_FILTER.md",
  },
  {
    id: "skills.opponent-act",
    label: { en: "Opponent-side value modifiers", ko: "상대측 계산값 보정(相手の~ ActName)" },
    status: "absent",
    evidence: "14종 — 자기 modify 훅에 영원히 미매칭(skills.ts makeSkillModifier가 ActNames 정확 일치 비교, gaps/G) · 시점 기준 방증 = 독 실측(보유자 관점 '상대' 위력 +1이 문자 그대로 적용, 2026-08-17) — gaps/A §7-1 부호 문제에 문자 그대로 해석 지지 1건 · 3회차 덤프 논증으로 보강(gaps/B §7 [3회차 2026-08-17]): Action=2 코호트 52행 전수가 피격측이고 개발자 명명이 효과를 말하는 アイクエンゲージスキル_ダメージ50%減(받는 대미지 50% 감소)이 '相手の威力*0.5'로 구현 → 相手の~ = 보유자가 받는 값, 반전 아님 · 보강: SID_祈り(Action=2) 조건식 'HP <= ダメージ'가 같은 문맥의 ダメージ = 보유자가 받는 대미지임을 증언 · 코호트 전수 검사는 engine/tests/statusPoison.test.ts가 실행으로 고정(어휘 밖 ActName 등장 시 레드) · 이 훅이 combat.status-effects(독) 배선의 선행 조건",
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
    label: { en: "Unknown condition identifiers fall back to not-applied", ko: "미지 조건 식별자 = 미적용 강하" },
    status: "assumed",
    evidence: "미지 함수·식별자 모두 미적용 강하 통일(skills.test.ts — gaps/FIX_NOTES F5) · Condition 식별자 실측 165종(래치 파생 69 제외 실결손 12계열)·미지 함수 신규 2(comp·アイテム)(gaps/I) · 발동 필터 축은 별건 = skills.timing-filter · ★2026-08-17 IL2CPP 대조 후 **의도적 유지**(il2cpp/SKILL_ENGINE §5-2): 게임은 미지 식별자를 0으로 치환해 식을 계속 평가하고(CalculatorManager.GetValueImpl 0x298F760) Condition 부재는 참이다(0x248E2E0). 그러나 **게임에는 미지 식별자가 없다**(165종 전부 구현) — 그 0 치환은 '없는 변수'용 안전망이지 '어휘 결손'용이 아니다. 우리 결손에 0을 넣으면 `武器の種類 == 剣`이 `0==0`으로 참이 되어 **과대 발동**한다. 결손이 남아 있는 동안은 과소(미적용)가 안전하므로 현행 유지하고, 어휘를 채울 때마다 이 강하가 자연 소멸하게 둔다 · Condition 부재 = 참은 현행도 동일",
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
    id: "skills.orphan-sids",
    label: { en: "Orphan SIDs (event-granted, no static source)", ko: "고아 SID(정적 소스 없음 — 이벤트 부여 추정)" },
    status: "absent",
    evidence: "55행 — CommonSids·SynchroSkills·dispos·EquipSids 어느 소스에도 미참조(gaps/I)",
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
    id: "emblem.chapter-bond-level",
    label: { en: "Per-chapter emblem bond level baseline", ko: "챕터별 엠블렘 絆 레벨 기본값" },
    status: "absent",
    evidence: "chart.xml 神将 42행×12열 = 504셀 전수(비영 275셀·비영행 39, 상한 20, M011 전열 0 = 반지 상실 구간 정합) — gamedata 60개 XML 헤더 전수 파싱 결과 유일 소유(gaps/O §10-2) · emblem.sync-bond-level(싱크로 스킬 합집합 규칙)과 별개 기전 — 챕터 선택 시 絆 레벨 기본값 소스로 소비",
  },
  {
    id: "emblem.engage-activation",
    label: { en: "Engage activation, meter, duration", ko: "인게이지 발동·카운트·지속" },
    status: "deferred",
    evidence: "지속(실측 표본 3) = 정규 반지 3턴, 외전 클리어 시 4(마르스 인연10=3이 레벨 가설 기각) · DLC 팔찌 = 4(클로에&디미트리 12 — 조건 미상, 저인연 표본 필요) · 연장 필드 덤프 전무(継続ターン=3뿐) · 한계 EngageCount(7/ルフレ 9)(gaps/C §2) · ★충전 = 전투 참가당 +1(공격·피격 각 1, 대기 무충전 — 실측, 常時 해석 반증) · 3회차 재확인: 지속 턴은 1턴 단위로 소비되는 자원(전투 기술 소비 1·3 실례 — patch0.msbt ClassPresidentsEngage_*_CMD) · 정수 증감 사례 = TikiEngageAtk+(카운트+3)·JobSkill_ShadowLordR(카운트+1, patch3.msbt)·MIID_HE_Medicine(카운트+2, patch1.msbt) — 턴당 자연 증가량은 여전히 텍스트 축에 부재(gaps/N §2-2, §4-1 #8 병합) · 설계 선행(§0 미룸)",
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
    evidence: "skill.xml InheritanceCost/Sort 확인 · 리유르만 계승 불가(gaps/F) · 사영 복원 완료(growth 255행 레벨별 보존 — projection.test.ts) · 수집·소비 = M4 편집기(요구 189행 중 183행이 ENH 정적 보정, gaps/I)",
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
    evidence: "렌더만 구현(M1.5) — 효과 확정 = 대기 시 인게이지 카운트 풀충전(사용자 실측 2026-08-17, 덤프 부재값 종결 — gaps/C §5) · 발동 구현은 인게이지 시스템 선행",
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
    id: "weapons.cannon-hit-model",
    label: { en: "Cannon (bullet) weapons: dedicated hit formula and range falloff", ko: "포탄 무기 전용 명중식과 거리 감쇠" },
    status: "anchored",
    evidence: "skill.xml SID_弾丸命中 = max(技+力+体格+int(幸運/2)+武器命中+支援命中 − cond(거리>=4,(거리-3)*10,0), 0) — 표준 命中値計算(技*2+...)을 대체 · SID_弾丸攻撃力 = ユニット攻撃力(技) 대체 · 텍스트 유도 = patch1~3 MIID_H_Bullet_*(상대가 멀수록 명중 감소, gaps/N §3-2) · A축 calculator 52식 전수에는 없던 skill.xml 전용 항",
  },
  {
    id: "weapons.equip-sids",
    label: { en: "Weapon/item granted skills (EquipSids)", ko: "무기·아이템 부여 스킬(EquipSids)" },
    status: "absent",
    evidence: "수집 결손 85행(items.json에 EquipSids 259행 이미 산출 — 배선만 없음, gaps/I 투자 2위)",
  },
  {
    id: "weapons.add-effect-schema",
    label: { en: "Item add-effect schema (AddTarget x AddRange x AddType x AddPower x AddSids)", ko: "아이템 부가효과 스키마(AddTarget×AddRange×AddType×AddPower×AddSids)" },
    status: "anchored",
    evidence: "item.xml IID_傷薬/特効薬/たいまつ/お弁当 4건 1:1 대조 + patch1.msbt MIID_HE_* 24건(§2-7) — AddType 정의역={0,2,7,18,19,31}, AddType=7=인게이지 카운트 증가·2=HP 회복·19=시야(횃불)·31=생존 보장, 0=AddSids 위임(인챈트)(gaps/N §3-5) · AddType=7+AddPower가 인게이지 카운트 정수 증감의 데이터측 정본",
  },
  {
    id: "weapons.enchant-by-weapon-name",
    label: { en: "Enchant applies to all weapons sharing a name, lasts until map end", ko: "인챈트 = 동명(同名) 무기 전체 적용, 맵 종료까지 지속" },
    status: "anchored",
    evidence: "patch1.msbt MIID_HE_Weapon{Atk,Hit,Avo,Crit,Def}/_Short + item.xml AddTarget=3/AddSids + skill.xml SID_EN_威力上昇(武器攻撃力+=5, Timing=3, Life=0) — 개별 인스턴스가 아닌 무기 이름 단위 강화(gaps/N §2-7, §3-5)",
  },
  {
    id: "weapons.tonic-level-scaling",
    label: { en: "Tonic items scale stat gain by unit level", ko: "토닉류 아이템 = 유닛 레벨에 비례한 스탯 상승" },
    status: "absent",
    evidence: "patch1.msbt MIID_HE_{Hp,Str,Tec,Spd,Mag}Tonic kr/us 일치('레벨에 따라 상승'/'relative to level') — 수치는 텍스트·item.xml AddPower 어디에도 없음, 실행부 또는 미확인 테이블 소관(gaps/N §4-1 #12)",
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
    evidence: "chapter.xml HoldLevel = E001~E006 고정 15~28(gaps/L §2-2) · 레벨 영향 실재 = 사용자 전언 정합 · e00x Lua에 레벨 조작 0건 = HoldLevel 단독 소관, 적용식(상하향 클램프)은 덤프에 없음 — E시리즈 변환 시 실측·배선 · 교차 보강(2026-08-17): E시리즈 적 레벨은 person.xml에 박제(E001 = 15/18/23, HoldLevel 15와 정합) — HoldLevel = 아군 클램프·적 = person 박제 분업 가설 지지(gaps/L 실측 후속 절)",
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
    evidence: "M5 — L1층(루틴 배정·인자 결선·개시 조건·타겟 지정)은 덤프 확정, L2 스코어링 = 실행파일(AI 가드 상수 3종은 params 실재) · 상위 4조합 = 83.3%(gaps/K) · 지원 스코어 상수 3/2/1(gaps/J)",
  },
  {
    id: "turn.delegate",
    label: { en: "Delegate (auto-battle)", ko: "위임(자동진행)" },
    status: "deferred",
    evidence: "적턴 AI 모듈 공유(M5) — 표적 우선 = 상위 4조합 83.3%(gaps/K §9)",
  },

  // ── 적 AI 데이터 ──
  {
    id: "ai.routine-vocabulary",
    label: { en: "AI routine opcode programs", ko: "AI 루틴(옵코드 프로그램 141종)" },
    status: "deferred",
    evidence: "ai.xml 802행 = AC32·MI11·AT63·MV35, dispos 실사용 77종 — 옵코드 사전은 실행파일 영역(gaps/K §2) · 선행 = M5",
  },
  {
    id: "ai.data-projection",
    label: { en: "AI field projection completeness", ko: "AI 필드 사영 완결성" },
    status: "implemented",
    evidence: "15필드 전수 사영 복원(존재 여부 기준 — 기본값 75/50 보존, projection.test.ts · FIX_NOTES_2 P4) · battleRate 타입 거짓 정정(문자열) · 소비는 M5",
  },
  {
    id: "ai.move-limit",
    label: { en: "AI movement boxes (hard constraint)", ko: "AI 이동 제한 박스(AI_MoveLimit)" },
    status: "absent",
    evidence: "36건 — 이동을 물리적으로 자르는 하드 제약(m016·m021·m024·m025 포함, gaps/K)",
  },
  {
    id: "ai.band-activation",
    label: { en: "Band-linked AI activation", ko: "밴드 연동 기동(AI_BandNo)" },
    status: "absent",
    evidence: "328밴드 — 집단 각성 구조(gaps/K)",
  },
  {
    id: "ai.sub-routine-swap",
    label: { en: "Conditional AI routine swap", ko: "조건부 서브 AI 치환" },
    status: "absent",
    evidence: "Code 6/7/4 치환 구조, 68유닛(gaps/K) · Lua BattleAfter 전환은 combat.scripted-modifiers",
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
