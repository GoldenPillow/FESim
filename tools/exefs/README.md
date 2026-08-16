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

## 3) 함수 본문 판독 — `nso_disasm.py` (Ghidra 불요)

`dump.cs`는 시그니처+RVA까지("어디에 있나"). 실제 식은 본문을 읽어야 한다. 대상 함수가 대개
수십 명령이라 **47MB 바이너리 전량 분석(Ghidra+JDK 400MB) 없이 표적 디스어셈블로 충분**하다.

```bash
# 1회: 파이썬 환경(저장소 밖 — 립 도구 계열과 같은 곳)
python3 -m venv ~/fesim_data/venv && ~/fesim_data/venv/bin/pip install lz4 capstone

# 판독
cd tools/exefs   # 또는 저장소 루트
~/fesim_data/venv/bin/python tools/exefs/nso_disasm.py 0x1e8d420 --count 60   # RVA로
~/fesim_data/venv/bin/python tools/exefs/nso_disasm.py RandomCheckHit          # 이름으로(후보 목록)
```

NSO0의 `.text`는 LZ4 블록 압축(flags 0x3f)이라 스크립트가 디컴프레스한 뒤 `RVA - memoff`로
잘라 aarch64 디스어셈블한다. `BL`/`B` 분기처는 `script.json`으로 IL2CPP 심볼명을 주석에 붙인다
(간접 호출 `BLR`은 이름이 안 붙으므로 vtable 오프셋을 dump.cs로 역추적해야 한다).

우선 대상·판독 결과 매핑 = `design/verification.md §2-7`, 판독 보고서 = `~/fesim_data/extracted/il2cpp/`.
