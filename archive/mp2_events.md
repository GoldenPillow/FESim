---
status: done
target: packages/engine/src/events/ + tools/pipeline(스크립트 사영) + apps/web(phases.ts 대체)
---

# MP2 — 이벤트 엔진 (Lua 소비) 설계

작성일: 2026-08-18 · 상태: **승인됨 — 구현중** (§미결 4건 전건 결정 2026-08-18: 풀 Lua 실행기 · 전 API 1차 배선 · AiSetSequence 기록만 · 연출 no-op)

## 0. 구현 체크리스트

- [ ] 2-0 Lua 실행기 선정 실증 — wasmoon vs fengari: reduce는 동기 함수라 **동기 호출 가능**이 선정 기준(스파이크 테스트로 판정). 번들 영향 실측 병기
- [ ] 2-1 파이프라인: 스크립트 사영 — mXXX.txt(+Include Common 해석)를 챕터 데이터로 동봉, 전 챕터 목록·용량 확인
- [ ] 2-2 엔진 이벤트 코어 — LuaSession(스크립트 로드·Startup 실행·인스펙터 등록 수집), GameState.variables·winRule 신설, 조건 3형(bool/string/function)·1회성 플래그 기계·와일드카드 -1 (TDD)
- [ ] 2-3 게임플레이 프리미티브 전수 배선 — Dispos(자동 배치 규칙 포함)·UnitJoin/Transfer/Die/Delete·UnitCreateGodUnit·Variable*·WinRule* 3종+勝利/敗北·ItemGain·AiSetSequence(기록만)·상태질의(UnitGetX/Z·Difficulty·ForceUnit 순회 등) — 연출 API는 no-op 테이블(LUA_USAGE §4)
- [ ] 2-4 발화 훅 — Turn/TurnAfter/TurnEnd(endPhase)·Die/BattleAfter/BattleBefore/BattleTalk(attack)·Pickup(선택)·Fixed·Area(이동)·나머지 트리거는 등록만 하고 발화 지점 소유자(MP3 지형 커맨드 등)에 이월 표기 (TDD)
- [ ] 2-5 리플레이 편입 — 이벤트 결과의 BattleEvent 사영(스폰·전이·변수 절대 재생), 세션 재구축 결정성(스냅숏 점프), RULE_VERSION bump
- [ ] 2-6 웹 배선 — phases.ts 삭제·초기 배치 = Dispos 없는 그룹 규칙·m002 2회전 전이 헤드리스 실측·m003 필렌 증원+가입 실측
- [ ] 2-7 장부 갱신 — events.* 카테고리 등재(구현/기록만/이월 구분)

## 1. 목표와 완료 판정

게임 룰대로 이벤트(증원·가입·세력 전환·승리조건·다국면)를 재현해 **수기 국면 프리셋(apps/web/src/lib/phases.ts)을 삭제**한다.
완료 판정 = m002가 프리셋 없이 이벤트 구동으로 1회전 → 2회전 전이를 재현하고, m003 2턴 필렌 증원+가입이 돈다.

## 2. 조사 정본 (상세는 보고서가 소유 — 여기 복제 금지)

- 사용측 전수: `~/fesim_data/extracted/lua/LUA_USAGE.md` — 166 스크립트, EventEntry 22종 1,283회,
  조건 동적성 판정(53% 플래그 전용 / 47% 상태질의 / 8% 루프), m002·m003 인벤토리, 승리조건 이원화.
- 바인딩측 판독: `~/fesim_data/extracted/il2cpp/LUA_BINDINGS.md` — MoonSharp·바인딩 289개,
  인스펙터 31종 인자 규약(와일드카드 -1), 조건 문자열 = 1회성 발화 플래그(자동 Entry/Completed),
  변수 저장소 = GameVariable 단일(키 접두사 = 수명), Dispos 스폰 경로(중복 방지 없음), 승패 판정 C# 3함수, 발화 시점.

## 3. 확정 가능한 골격 (양 보고서 합치 — 아키텍처 미결과 무관하게 성립)

1. **이벤트 등록 = 선언 스키마**: EventEntry 22종의 인자 시그니처는 고정(인스펙터 기반 클래스 5+3종이 소유).
   엔진 이벤트 서브시스템은 인스펙터 모델을 그대로 사영한다: kind + 필터(-1 = 와일드카드) + 조건 + 콜백.
2. **변수 저장소**: GameState에 `variables: Record<string, number|string>` 신설 — 세이브 소유·키 접두사 수명은
   캠페인층(MP5) 소관, 맵 세션은 무접두사 키만. 조건 문자열 = 1회성 발화 플래그(등록 시 0, 발화 후 1) 기계 그대로.
3. **발화 시점**: Turn(페이즈 개시 리셋 직후) / TurnAfter(개시 효과 적용 후) / TurnEnd(페이즈 종료) —
   reduce의 endPhase 처리에 훅. 유닛 행동 트리거(Die·Pickup·BattleAfter·Visit 등)는 해당 액션 커밋 지점에 훅.
4. **승리조건 이원화**: (a) 엔진 내장 3종(DestroyBoss·EnemyNumberLessThanOrEqualTo·LimitTurn) = GameState 필드로
   파라미터화 (b) 스크립트 직접 판정 = 전역 변수 勝利/敗北 감시 — 콜백 실행 결과로 자연 처리. MID = 표시 텍스트.
5. **스폰(Dispos)**: 챕터 JSON groups는 초기 배치가 아니다 — 스크립트에 Dispos가 없는 그룹만 자동 배치,
   나머지는 이벤트가 소환. UnitTransfer/UnitJoin이 force를 동적으로 바꾼다. 중복 스폰 방지 없음(원기 그대로).
6. **연출 API = no-op**: Talk/Movie/Fade/Camera/Tutorial 류(상위 30종 목록 = LUA_USAGE §4). 로그 여부는 §미결-4.
7. **리플레이**: 이벤트 발화는 결정적(난수 없음, 국면 상태만 입력) — 검증(verify)은 재계산으로 성립.
   스폰·전이는 절대 재생용 이벤트(BattleEvent)로도 실린다(기존 charge/crest 문법과 동일).

## 4. §미결 — 전건 결정됨 (2026-08-18, 이력 보존)

### 미결-1. 조건·콜백의 실행 방식 (아키텍처 본 갈림길)

- 배경: 이벤트 등록부는 테이블화 자명하나, 조건 함수 166개의 47%가 엔진 상태질의(좌표·난이도·엠블럼·전군 순회),
  콜백 본문도 임의 명령 시퀀스(m002 一回戦終了 = 잔적 정리+재배치+소환+엠블럼 부여)다.
- 선택지:
  - A) **Lua 서브셋 인터프리터 자체 구현**(의존성 0, 파서·평가기 = 기존 calculator DSL과 같은 구조).
    스크립트 원문(또는 파이프라인이 뽑은 AST JSON)을 데이터로 소비, 게임플레이 프리미티브만 배선·연출은 no-op.
  - B) 파이프라인이 선언 테이블 + 조건 DSL로 변환(고차 술어 any/all 포함). 루프·복잡 케이스는 챕터별 수기 이식.
  - C) 풀 Lua 실행기 내장(wasmoon/fengari 등 외부 의존).
- ★결정 = **C) 풀 Lua 실행기**(2026-08-18 사용자). 커버리지 최우선 — 서브셋 자체 구현의 문법 결손 위험을
  외부 의존 1개와 맞바꾼다. 라이브러리 선정(wasmoon vs fengari)은 동기 호출 가능 여부 실증으로(체크리스트 2-0).
  제작 경로 전용 로드(열람 /s/ 경로 번들에 미포함)로 성능 게이트 무저촉을 유지한다.
- 안 정하면: 이벤트 서브시스템 전체가 착수 불가(조건·콜백 표현이 스키마의 중심).

### 미결-2. 1차 범위 (배선 순서)

- 배경: API 표면이 넓다(게임플레이 API 수십 종). 발현하지 않는 배선은 임계 경로 낭비.
- 선택지:
  - A) **m002·m003 발현분 우선**: EventEntryTurn/TurnAfter/TurnEnd/Die/Fixed/BattleAfter + Dispos·UnitJoin·
    UnitTransfer·UnitDie/Delete·UnitCreateGodUnit·VariableEntry/Set/Get·WinRule 3종+勝利/敗北 —
    나머지 API는 만나면 정직 거부(장부 등재). 완료 판정 = §1.
  - B) 22종 트리거 + 게임플레이 API 전수 1차 배선(발현 없는 것 포함).
- ★결정 = **B) 전 API 1차 배선**(2026-08-18 사용자). 바인딩 표면(22종 트리거 등록 + 게임플레이 API)을
  지금 전부 세운다. 단 발화 지점이 미실재 시스템(MP3 지형 커맨드·안개 등)에 속하는 트리거는 등록·기록까지만 하고
  발화는 소유 시스템에 이월 표기 — 완료 판정(§1)은 m002·m003 실측 그대로.

### 미결-3. AiSetSequence 축 (369회 — 게임플레이 API 최다 빈도)

- 배경: 이벤트 콜백의 최다 효과가 적 AI 실시간 재설정. 그러나 적턴 AI 실행 자체가 MP4다.
- 선택지: A) **파라미터를 유닛 상태에 기록만**(스키마 보존, 소비는 MP4) B) MP2에서 실행까지 C) 무시.
- ★결정 = **A) 파라미터 기록만**(2026-08-18 사용자). 소비는 MP4 AI 실행기가 이어받는다.

### 미결-4. 연출 이벤트의 표면 처리

- 배경: BattleTalk·Pickup(튜토리얼)·Talk 등은 판정 무관이지만 인게임 체험의 일부다.
- 선택지: A) **완전 no-op**(로그 없음) B) 전투 로그에 1줄 표기(대사 발생 지점 표시) C) MSBT 텍스트까지 표시.
- ★결정 = **A) 완전 no-op**(2026-08-18 사용자). 대사 재현은 별도 UX 과제로 발현 시 흡수.

## 5. 결정 반영 구현 노트

- 실행기 = 풀 Lua(2-0에서 선정). ☠reduce는 동기·순수 — Lua 세션은 리듀서 밖(이벤트 레이어)이 소유하고,
  지속 상태는 전부 GameState.variables(+발화 플래그)로 사영한다. 콜백이 VariableSet 밖에 남기는 Lua 전역은
  재구축 결정성의 위험 표면 — 세션 재구축 = 초기 국면에서 스텝 재실행으로 통일(기존 스냅숏 문법과 동형).
- 연출 no-op·AiSetSequence 기록은 프리미티브 테이블이 소유(스크립트 원문 무수정).
