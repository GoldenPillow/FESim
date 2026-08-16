#!/usr/bin/env python3
"""NSO(압축 exefs main) 표적 디스어셈블러 — IL2CPP 심볼 주석 포함.

왜: dump.cs는 함수 시그니처와 RVA까지만 준다("어디에 있나"). 실제 식(명중 난수 모델 등)은
본문을 읽어야 한다. Ghidra 전량 분석은 47MB 바이너리에 과하므로, 대상 함수만 잘라 aarch64로
디스어셈블하고 BL 분기처를 script.json 심볼로 되짚는다.

사용:
    nso_disasm.py <RVA-hex|메서드명 일부> [--count N] [--nso PATH] [--script PATH]

예:
    nso_disasm.py 0x24722D0            # BattleCalculator$$RandomCheckHit
    nso_disasm.py RandomCheckHit       # 이름으로 찾기(여러 개면 목록만 출력)
"""

import argparse
import json
import re
import struct
import sys
from pathlib import Path

import lz4.block
from capstone import CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN, Cs

DEFAULT_NSO = Path.home() / "fesim_data/exefs/main"
DEFAULT_SCRIPT = Path.home() / "fesim_data/il2cpp_out/script.json"


def load_segments(nso_path):
    """NSO0의 text/rodata/data를 디컴프레스해 [(memoff, blob)] 반환(VA 순)."""
    raw = nso_path.read_bytes()
    flags = struct.unpack_from("<I", raw, 0xC)[0]
    segs = []
    for i in range(3):
        file_off, mem_off, dec_size = struct.unpack_from("<III", raw, 0x10 + i * 0x10)
        comp_size = struct.unpack_from("<I", raw, 0x60 + i * 4)[0]
        chunk = raw[file_off : file_off + comp_size]
        blob = lz4.block.decompress(chunk, uncompressed_size=dec_size) if flags & (1 << i) else chunk[:dec_size]
        segs.append((mem_off, blob))
    return segs


def load_text(nso_path):
    mem_off, blob = load_segments(nso_path)[0]
    return blob, mem_off


def read_va(segs, va, length):
    """VA에서 length 바이트. 상수(계수·테이블) 판독용 — .rodata/.data 포함."""
    for mem_off, blob in segs:
        if mem_off <= va < mem_off + len(blob):
            off = va - mem_off
            return blob[off : off + length]
    return None


def load_symbols(script_path):
    """{VA: name} — BL 분기처 이름 되짚기용."""
    data = json.loads(script_path.read_text())
    return {m["Address"]: m["Name"] for m in data["ScriptMethod"]}


def disasm(blob, mem_off, rva, count, symbols):
    md = Cs(CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN)
    start = rva - mem_off
    code = blob[start : start + count * 4]
    for ins in md.disasm(code, rva):
        note = ""
        if ins.mnemonic in ("bl", "b"):
            target = int(ins.op_str.lstrip("#"), 16) if ins.op_str.startswith("#") else None
            if target is not None and target in symbols:
                note = f"   ; {symbols[target]}"
        print(f"  {ins.address:#010x}  {ins.mnemonic:<8} {ins.op_str}{note}")
        if ins.mnemonic == "ret":
            break


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target", help="RVA(0x…) 또는 메서드명 일부")
    ap.add_argument("--count", type=int, default=80, help="최대 명령 수(기본 80)")
    ap.add_argument("--read", type=int, default=0, metavar="LEN",
                    help="디스어셈블 대신 그 VA에서 LEN바이트를 상수로 해석(계수·테이블 판독)")
    ap.add_argument("--nso", type=Path, default=DEFAULT_NSO)
    ap.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    args = ap.parse_args()

    if args.read:
        va = int(args.target, 16)
        data = read_va(load_segments(args.nso), va, args.read)
        if data is None:
            sys.exit(f"VA {va:#x}가 어느 세그먼트에도 없다")
        print(f"{va:#x}  hex={data.hex()}")
        for off in range(0, len(data) - 3, 4):
            u32, = struct.unpack_from("<I", data, off)
            i32, = struct.unpack_from("<i", data, off)
            f32, = struct.unpack_from("<f", data, off)
            print(f"  +{off:<4} u32={u32:<12} i32={i32:<12} f32={f32:g}")
        for off in range(0, len(data) - 7, 8):
            f64, = struct.unpack_from("<d", data, off)
            print(f"  +{off:<4} f64={f64:g}")
        return

    symbols = load_symbols(args.script)

    if re.fullmatch(r"0x[0-9a-fA-F]+", args.target):
        targets = [(int(args.target, 16), symbols.get(int(args.target, 16), "?"))]
    else:
        hits = sorted((a, n) for a, n in symbols.items() if args.target.lower() in n.lower())
        if not hits:
            sys.exit(f"이름 매칭 없음: {args.target}")
        if len(hits) > 1:
            for a, n in hits:
                print(f"{a:#010x}  {n}")
            sys.exit(0)
        targets = hits

    blob, mem_off = load_text(args.nso)
    for rva, name in targets:
        print(f"\n=== {name}  RVA={rva:#x} ===")
        disasm(blob, mem_off, rva, args.count, symbols)


if __name__ == "__main__":
    main()
