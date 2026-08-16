# tools/exefs — exefs(`main`) 추출 + IL2CPP 심볼 복원

정적 덤프(romfs) 밖 = 실행파일 소관으로 확정된 기전(명중 난수·필살 배수·경험 배율 적용점·
독 티어 승격·신룡의 장 레벨 스케일링·Stand/Action 범례 등)을 **코드로 검수**하기 위한 부트스트랩.

☠산출물(`main`·`dump.cs`·`Assembly-CSharp.dll` 등)은 립 파생이라 **저장소 밖 `~/fesim_data/`에만** 둔다.
이 디렉터리는 **추출기 소스와 절차만** 소유한다(원본·키·산출 바이너리 커밋 금지).

## 무엇을 하나

`Program.cs` = LibHac(0.19.0, NuGet) 참조 최소 추출기. NSP를 열어 내부 티켓(.tik)에서 타이틀 키를
임포트하고, Program NCA의 exefs(Code 섹션)를 통째로 뽑는다. eShop NSP는 외부 title.keys에 키가
없으므로 티켓 임포트가 필수다(그게 없으면 `MissingKeyException: Missing NCA title key`).

## 선행 (모두 실측 환경 = 사용자 소유, 1회성)

- `.NET SDK/런타임 8+` — 없으면 `curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 8.0 --install-dir ~/.dotnet`
- `prod.keys` — `~/.switch/prod.keys` (Suyu/Citron 키 폴더에서 복사)
- 대상 NSP — **업데이트본(패치 반영)**을 써야 romfs(데이터마인 정본)와 버전이 맞는다.
  현 환경: `Fire Emblem Engage [0100A6301214E800][USA][v327680].nsp` = 5.0.0
- `global-metadata.dat` — 에뮬레이터가 뽑은 romfs 안 `Data/Managed/Metadata/`.
  ☠`main`과 **같은 버전**이라야 오프셋이 맞는다(둘 다 5.0.0).

## 실행

```bash
export DOTNET_ROOT=~/.dotnet PATH=$PATH:~/.dotnet

# 1) exefs 추출 (main + main.npdm + sdk/subsdk/rtld)
cd tools/exefs
dotnet run -c Release -- \
  "<UPDATE.nsp>" ~/.switch/prod.keys ~/.switch/title.keys ~/fesim_data/exefs

# 2) IL2CPP 심볼 복원 (Il2CppDumper net7, 롤포워드로 net8 구동)
#    산출: dump.cs(전 클래스·메서드+RVA) · script.json(Ghidra/IDA 리네임) · il2cpp.h · DummyDll/
DOTNET_ROLL_FORWARD=Major printf '\n' | \
  dotnet <Il2CppDumper>/Il2CppDumper.dll \
    ~/fesim_data/exefs/main \
    "<romfs>/Data/Managed/Metadata/global-metadata.dat" \
    ~/fesim_data/il2cpp_out
```

## 다음 단계 (함수 본문 = 실제 로직)

`dump.cs`는 시그니처+오프셋만. 본문(1RN/2RN 여부 등)은 `main`을 Ghidra에 로드 →
`script.json`으로 RVA에 심볼 부여 → 대상 함수 디컴파일. 우선 대상 함수(BattleCalculator):
`RandomCheckHit(int ratio)` · `CalcAttackHit(out int critical)` · `CalcExp` · `GetChainGuardDamage` ·
`GetExpendCount` · `CalcRodHit`. 정본 절차·매핑 = `design/verification.md §2-7`.
