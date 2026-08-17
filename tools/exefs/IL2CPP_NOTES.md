# IL2CPP aarch64 판독 지침 (FE 인게이지 5.0.0)

`nso_disasm.py` 출력을 읽을 때 매번 다시 알아내지 않도록, 이 빌드에서 확인된 패턴만 모은다.
☠추정은 "추정"이라 적었다. 확인되지 않은 관례를 사실로 쓰지 말 것.

## 0. 작업 흐름

1. `grep -n "메서드명" ~/fesim_data/il2cpp_out/dump.cs` → 바로 윗줄 `// RVA: 0x...` 확보
   (클래스 전체를 보려면 `awk '/^public class X /{f=1} f&&/^\}/{exit} f'`)
2. `~/fesim_data/venv/bin/python tools/exefs/nso_disasm.py 0xRVA --count 120`
3. `BL` 분기처는 심볼이 자동 주석된다. ☠`BLR`(가상·간접)·델리게이트는 안 붙으므로 아래 4·5로 역추적.
4. 상수·테이블은 `nso_disasm.py 0xVA --read 32` (.text/.rodata/.data 전부 접근, f32/f64/i32 동시 해석)

## 1. 호출 규약

- 인스턴스 메서드: `x0 = this`, 인자 `x1, x2, …`, **마지막 인자 = `MethodInfo*`**(자주 `xzr` 또는 상수 로드).
- static 메서드: `x0`부터 첫 인자. 반환 `x0`(부동소수 `s0/d0`).
- `MethodInfo*`가 끼므로 **dump.cs 시그니처의 인자 수 + 1**이 실제 레지스터 사용 수다.

## 2. 무시해도 되는 프롤로그 (클래스 초기화)

```
adrp x21, #<page> ; ldrb w8,[x21,#off] ; tbnz w8,#0, <skip>
adrp x0,  #<page> ; ldr  x0,[x0,#off]  ; bl #0x492060
mov  w8, #1       ; strb w8,[x21,#off]
```
`0x492060` = 관리 심볼이 아닌 **런타임 클래스 초기화 헬퍼**(il2cpp class-init). 한 함수에 여러 번 나온다
(참조하는 클래스 수만큼). `0x492180`은 cctor 실행 계열 헬퍼(`[x0+0x133]` 비트1 + `[x0+0xe0]` 검사와 함께 등장).
**로직과 무관하니 건너뛰고 읽어라.**

## 3. 필드 접근

`ldr w8, [x20, #0x18]` 류의 오프셋은 dump.cs의 필드 주석과 1:1 대조된다:
```
private BattleInfo m_BattleInfo; // 0x18
```
객체 헤더는 `klass`(0x0)·`monitor`(0x8)이므로 **관리 필드는 0x10부터** 시작한다.

## 4. 가상 호출

```
ldr x8, [x20]            ; x8 = klass
ldp x9, x2, [x8, #0x188] ; x9 = 함수 포인터, x2 = MethodInfo*
blr x9
```
klass의 vtable 영역에서 슬롯을 꺼낸다. 슬롯 오프셋만으로는 이름이 안 나오므로,
**선언 클래스의 virtual 메서드 순서**(dump.cs의 클래스 정의 순)로 역추적하거나,
호출 직전에 로드되는 객체의 타입을 필드 체인으로 확정한 뒤 후보를 좁혀라.

## 5. 델리게이트 (★이 게임의 핵심 패턴)

`System.Delegate` 레이아웃(이 빌드 실측):
```
method_ptr    // 0x10   ← 실제 대상 함수 주소
invoke_impl   // 0x18
m_target      // 0x20
method        // 0x28
```
`Xxx$$Invoke`로 분기하면 **대상이 코드에 고정돼 있지 않다**는 뜻이다. 실제 바인딩은
`= new Xxx(…)` 하는 지점(초기화·Setup·set_ 프로퍼티)을 찾아 거기서 `adrp/add`로 실리는
**함수 주소를 읽어야** 확정된다. 예: `App.BattleMath.RandomCheckHit`은
`App.BattleMath.Probability$$Invoke`(0x19bb120)로 tail-call한다 — 명중 판정이 교체 가능하다는 뜻.

## 6. 상수·리터럴

- 정수 즉치: `mov w8, #N` / `movk`. 큰 값은 `mov`+`movk` 조합.
- 부동소수: `fmov s0, #1.5` 같은 즉치이거나 **PC 상대 로드**(`ldr s0, #0x...`)다.
  후자는 `--read`로 그 VA를 읽어라. ☠f32/f64를 혼동하지 말 것(둘 다 출력된다).
- 문자열: `~/fesim_data/il2cpp_out/stringliteral.json`.
- enum·const: dump.cs에 `public const Foo Bar = 3;`로 그대로 있다.

## 7. 배열·리스트

Il2CppArray는 헤더 뒤 **0x20부터 요소**가 시작한다(`ldr … [xN, #0x20]` + 인덱스 스케일).
`List<T>`는 내부 배열 `_items`(0x10)·`_size`(0x18) — dump.cs에서 확인 가능.

## 8. 함정

- 같은 이름의 메서드가 여러 클래스에 있다(`RandomCheckHit`은 `BattleMath`·`BattleCalculator` 둘 다).
  **반드시 클래스까지 확인**하라 — 심볼은 `App.클래스$$메서드` 형식이다.
- 오버로드는 시그니처로 구분한다(dump.cs가 인자 타입을 보여준다).
- 인라인된 함수는 `BL`이 없다. 호출이 안 보인다고 "그 로직이 없다"고 결론내지 말 것.
- 제네릭 메서드는 인스턴스화마다 별도 주소를 가진다.
