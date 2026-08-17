#!/usr/bin/env python3
"""전 챕터 변환 산출물 게이트 — 기대값 대조 + 파스/격자 스모크.

기대값은 문서가 아니라 **원본**(~/fesim_data/extracted의 terrains/dispos/chapter.xml)을 직접 집계해 확정했다
(2026-08-18 실측). 여기 박아 두는 이유는 게이트가 파이프라인 코드와 독립이어야 회귀를 잡기 때문이다 —
transform.py가 같은 원본을 다시 읽어 만든 값끼리 비교하면 어떤 결함도 통과한다.
"""

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_DATA = REPO / "data" / "fe17"

CHAPTER_COUNT = 54  # chapter.xml의 CID_[MSGE]\d{3} 전수 (본편 27 · 외전 15 · 신룡 6 · 사룡 6)

# terrains/*.json m_Layers 보유 맵 (사각형 구조물 레이어)
EXPECT_STRUCTURES = {"m005": 2, "m008": 2, "m010": 1, "m013": 13, "m014": 2, "m015": 18,
                     "m025": 2, "s002": 2, "s005": 4, "s008": 2, "s014": 1}
# terrains/*.json m_Overlaps 보유 맵 (1칸 지속 오버레이)
EXPECT_OVERLAYS = {"e004": 3, "e005": 28, "g001": 58, "m011": 11,
                   "m015": 61, "m017": 75, "m019": 100, "m024": 98}
# dispos Terrain 그룹 = 전부 PID_紋章氣 (287건 / 48맵, 다른 Pid 0건)
EXPECT_OBJECT_TOTAL = 287
EXPECT_OBJECT_MAPS = 48
# Lua 상호작용 — 각 좌표를 terrains 원본과 대조해 검증한 값(transform.extract_interactions 주석 참조).
# door 2건은 살아 있는 호출만 센 것이다(m015의 瘴気の配置 5건은 --[[ ]] 블록 주석 안 = 죽은 코드).
EXPECT_INTERACTIONS = {
    "chest": (42, 15), "destroy": (40, 8), "visit": (10, 5),
    "escape": (9, 3), "defendArea": (6, 2), "door": (2, 2),
}


def load_chapters(data: Path) -> dict:
    return {p.stem: json.loads(p.read_text(encoding="utf-8"))
            for p in sorted((data / "chapters").glob("*.json"))}


def check_counts(label: str, expect: dict, actual: dict, present: set, partial: bool) -> list[str]:
    fails = []
    for name, count in sorted(expect.items()):
        if name not in present:
            if not partial:
                fails.append(f"{label}: {name} 챕터 JSON 없음")
            continue
        got = actual.get(name, 0)
        if got != count:
            fails.append(f"{label}: {name} 기대 {count} != 실제 {got}")
    for name in sorted(set(actual) - set(expect)):
        fails.append(f"{label}: {name}에 예상 밖 항목 {actual[name]}건")
    return fails


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--partial", action="store_true",
                        help="부분 변환 상태 허용 — 존재하는 챕터만 검사하고 진척도만 리포트")
    args = parser.parse_args()

    chapters = load_chapters(args.data)
    present = set(chapters)
    fails: list[str] = []
    print(f"chapters: {len(chapters)}/{CHAPTER_COUNT} 변환됨")
    if len(chapters) != CHAPTER_COUNT and not args.partial:
        fails.append(f"chapters: 기대 {CHAPTER_COUNT} != 실제 {len(chapters)}")

    structures, overlays, objects, kinds = {}, {}, {}, {}
    for name, data in sorted(chapters.items()):
        chapter_map = data.get("map") or {}
        width, height = chapter_map.get("width"), chapter_map.get("height")
        terrain = chapter_map.get("terrain") or []
        if len(terrain) != height or any(len(row) != width for row in terrain):
            fails.append(f"terrain: {name} 격자 {len(terrain)}행 != height {height} 또는 폭 불일치 (width {width})")
        if not data.get("cid", "").startswith("CID_"):
            fails.append(f"cid: {name} 누락/형식 오류 ({data.get('cid')!r})")
        for key, sink in (("structures", structures), ("overlays", overlays), ("objects", objects)):
            if chapter_map.get(key):
                sink[name] = len(chapter_map[key])
        for entry in chapter_map.get("interactions") or []:
            count, maps = kinds.get(entry["kind"], (0, set()))
            kinds[entry["kind"]] = (count + 1, maps | {name})

    fails += check_counts("structures", EXPECT_STRUCTURES, structures, present, args.partial)
    fails += check_counts("overlays", EXPECT_OVERLAYS, overlays, present, args.partial)
    print(f"structures: {len(structures)}맵 · overlays: {len(overlays)}맵 · "
          f"objects: {sum(objects.values())}건/{len(objects)}맵")

    if args.partial:
        print("interactions: " + " · ".join(
            f"{kind} {kinds.get(kind, (0, set()))[0]}건/{len(kinds.get(kind, (0, set()))[1])}맵"
            for kind in sorted(EXPECT_INTERACTIONS)))
    else:
        if sum(objects.values()) != EXPECT_OBJECT_TOTAL or len(objects) != EXPECT_OBJECT_MAPS:
            fails.append(f"objects: 기대 {EXPECT_OBJECT_TOTAL}건/{EXPECT_OBJECT_MAPS}맵 != "
                         f"실제 {sum(objects.values())}건/{len(objects)}맵")
        for kind, (count, map_count) in sorted(EXPECT_INTERACTIONS.items()):
            got_count, got_maps = kinds.get(kind, (0, set()))
            if (got_count, len(got_maps)) != (count, map_count):
                fails.append(f"interactions {kind}: 기대 {count}건/{map_count}맵 != "
                             f"실제 {got_count}건/{len(got_maps)}맵")
        for kind in sorted(set(kinds) - set(EXPECT_INTERACTIONS)):
            fails.append(f"interactions: 미정의 kind {kind}")

    for message in fails:
        print(f"  ! {message}")
    if fails:
        print(f"== verify-all: FAIL ({len(fails)}건) ==")
        return 1
    scope = "부분" if args.partial else "전수"
    print(f"== verify-all: GREEN ({scope}, {len(chapters)}챕터) ==")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
