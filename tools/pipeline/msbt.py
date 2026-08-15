"""MSBT (MsgStdBn) 파서 — 라벨→평문 텍스트. 제어 태그는 제거한다(태그 보존은 후속 과제)."""

import struct
from pathlib import Path

MAGIC = b"MsgStdBn"
TAG_START = "\u000e"
TAG_END = "\u000f"


def _sections(buf: bytes) -> dict:
    count = struct.unpack_from("<H", buf, 0x0E)[0]
    out, pos = {}, 0x20
    for _ in range(count):
        tag = buf[pos : pos + 4]
        size = struct.unpack_from("<I", buf, pos + 4)[0]
        out.setdefault(tag, (pos + 16, size))
        pos += 16 + size
        pos = (pos + 15) // 16 * 16
    return out


def _labels(buf: bytes, start: int) -> dict:
    count = struct.unpack_from("<I", buf, start)[0]
    out = {}
    for i in range(count):
        n, offset = struct.unpack_from("<II", buf, start + 4 + i * 8)
        pos = start + offset
        for _ in range(n):
            length = buf[pos]
            name = buf[pos + 1 : pos + 1 + length].decode("ascii", "replace")
            out[struct.unpack_from("<I", buf, pos + 1 + length)[0]] = name
            pos += 1 + length + 4
    return out


def strip_tags(text: str) -> str:
    """\\x0E<group:u16><type:u16><size:u16><payload> 제어 태그와 \\x0F 종료 태그를 제거."""
    out, i = [], 0
    while i < len(text):
        ch = text[i]
        if ch == TAG_START:
            if i + 3 >= len(text):
                break
            size = ord(text[i + 3])
            i += 4 + (size + 1) // 2
        elif ch == TAG_END:
            i += 3
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def parse(path) -> dict:
    buf = Path(path).read_bytes()
    if buf[:8] != MAGIC:
        raise ValueError(f"not MSBT: {path}")
    encoding = "utf-16-le" if buf[8:10] == b"\xff\xfe" else "utf-16-be"
    secs = _sections(buf)
    if b"LBL1" not in secs or b"TXT2" not in secs:
        raise ValueError(f"missing LBL1/TXT2: {path}")

    labels = _labels(buf, secs[b"LBL1"][0])
    start, size = secs[b"TXT2"]
    count = struct.unpack_from("<I", buf, start)[0]
    offsets = [struct.unpack_from("<I", buf, start + 4 + i * 4)[0] for i in range(count)]
    offsets.append(size)

    out = {}
    for i in range(count):
        raw = buf[start + offsets[i] : start + offsets[i + 1]]
        text = raw.decode(encoding, "replace").rstrip("\x00")
        out[labels.get(i, f"__unlabeled_{i}")] = strip_tags(text)
    return out
