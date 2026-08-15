#!/usr/bin/env python3
"""추출본(~/fesim_data/extracted)을 저장소 data/fe17 가공 JSON으로 변환한다."""

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import msbt  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SRC = Path.home() / "fesim_data" / "extracted"
DEFAULT_OUT = REPO / "data" / "fe17"

NAME_FILES = ("person", "item", "skill", "job", "god", "gamedata")
LOCALES = {"en": "us/usen", "ko": "kr/krko"}
INT_TYPES = {"s8", "u8", "s16", "u16", "s32", "u32", "int", "b8", "b16", "b32", "flag"}
FLOAT_TYPES = {"f32", "float"}


def load_sheet(path: Path, index: int = 0) -> tuple[dict, list[dict]]:
    """(Ident->Type, 행 목록). 값은 Type으로 캐스팅하고, 빈 값은 키 자체를 생략한다."""
    sheet = ET.parse(path).getroot()[index]
    types = {p.get("Ident"): p.get("Type") for p in sheet.find("Header")}
    rows = []
    for node in sheet.find("Data").findall("Param"):
        row = {}
        for key, raw in node.attrib.items():
            if raw == "":
                continue
            kind = types.get(key, "string")
            if kind.endswith("[]"):
                row[key] = [v for v in raw.split(";") if v]
            elif kind in INT_TYPES:
                row[key] = int(raw)
            elif kind in FLOAT_TYPES:
                row[key] = float(raw)
            else:
                row[key] = raw
        rows.append(row)
    return types, rows


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(REPO) if REPO in path.parents else path} ({path.stat().st_size:,}B)")


def keyed(rows: list[dict], key: str) -> dict:
    return {row[key]: row for row in rows if row.get(key)}


def build_tables(src: Path, out: Path) -> None:
    _, terrain = load_sheet(src / "gamedata" / "terrain.xml")
    write_json(out / "tables" / "terrain.json", keyed(terrain, "Tid"))
    _, jobs = load_sheet(src / "gamedata" / "job.xml")
    write_json(out / "tables" / "jobs.json", keyed(jobs, "Jid"))
    _, persons = load_sheet(src / "gamedata" / "person.xml")
    write_json(out / "tables" / "persons.json", keyed(persons, "Pid"))


def build_names(src: Path, out: Path) -> None:
    for locale, rel in LOCALES.items():
        merged, owner, collisions = {}, {}, []
        for stem in NAME_FILES:
            path = src / "message" / rel / f"{stem}.msbt"
            if not path.exists():
                print(f"  skip (absent): {rel}/{stem}.msbt")
                continue
            for label, text in msbt.parse(path).items():
                if label in merged and merged[label] != text:
                    collisions.append((label, owner[label], stem))
                merged[label] = text
                owner[label] = stem
        if collisions:
            print(f"  ! {locale} label collisions: {len(collisions)} e.g. {collisions[:3]}")
        write_json(out / "names" / f"{locale}.json", merged)


def expand(value: str, tail: str) -> str:
    return value.replace("*", tail)


def dispos_unit(row: dict, persons: dict) -> dict:
    pid = row["Pid"]
    items = []
    for i in range(1, 7):
        iid = row.get(f"Item{i}.Iid")
        if iid:
            items.append({"iid": iid, "drop": bool(row.get(f"Item{i}.Drop", 0))})
    unit = {
        "pid": pid,
        "jid": row.get("Jid") or persons.get(pid, {}).get("Jid", ""),
        "force": row.get("Force", 0),
        "x": row.get("DisposX", 0),
        "y": row.get("DisposY", 0),
        "direction": row.get("Direction", 0),
        "level": {"n": row.get("LevelN", 0), "h": row.get("LevelH", 0), "l": row.get("LevelL", 0)},
        "items": items,
        "sids": [row["Sid"]] if row.get("Sid") else [],
        "ai": {},
    }
    for key, field in (("Gid", "gid"), ("Bid", "bid"), ("Flag", "flag")):
        if row.get(key):
            unit[field] = row[key]
    if row.get("AppearX") or row.get("AppearY"):
        unit["appear"] = {"x": row.get("AppearX", 0), "y": row.get("AppearY", 0)}
    ai_map = {
        "AI_ActionName": "action", "AI_ActionVal": "actionVal",
        "AI_MindName": "mind", "AI_MindVal": "mindVal",
        "AI_AttackName": "attack", "AI_AttackVal": "attackVal",
        "AI_MoveName": "move", "AI_MoveVal": "moveVal",
        "AI_BattleRate": "battleRate", "AI_Priority": "priority", "AI_BandNo": "bandNo",
    }
    for key, field in ai_map.items():
        if row.get(key):
            unit["ai"][field] = row[key]
    return unit


def build_chapter(src: Path, out: Path, chapter: str) -> None:
    cid = chapter if chapter.startswith("CID_") else f"CID_{chapter}"
    tail = cid[len("CID_"):]
    _, chapters = load_sheet(src / "gamedata" / "chapter.xml")
    row = next((r for r in chapters if r.get("Cid") == cid), None)
    if row is None:
        raise SystemExit(f"no such chapter: {cid}")

    terrain_name = expand(row.get("Terrain", "MapTerrain_*"), tail)
    grid = json.loads((src / "terrains" / f"{terrain_name.lower()}.json").read_text(encoding="utf-8"))
    width, height = grid["m_Width"], grid["m_Height"]
    cells = grid["m_Terrains"]
    terrain = [[cells[y * 32 + x] for x in range(width)] for y in range(height)]

    _, persons = load_sheet(src / "gamedata" / "person.xml")
    persons = keyed(persons, "Pid")
    dispos_name = expand(row.get("Dispos", "*"), tail).lower()
    groups, current = [], None
    for unit_row in load_sheet(src / "dispos" / f"{dispos_name}.xml")[1]:
        if unit_row.get("Group"):
            current = {"name": unit_row["Group"], "units": []}
            groups.append(current)
        if unit_row.get("Pid") and current is not None:
            current["units"].append(dispos_unit(unit_row, persons))

    data = {
        "game": "fe17",
        "cid": cid,
        "map": {"width": width, "height": height, "terrain": terrain},
        "groups": groups,
    }
    if row.get("RecommendedLevel"):
        data["recommendedLevel"] = row["RecommendedLevel"]
    write_json(out / "chapters" / f"{tail.lower()}.json", data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--chapter", action="append", help="예: M002")
    parser.add_argument("--tables", action="store_true")
    parser.add_argument("--names", action="store_true")
    args = parser.parse_args()

    everything = not (args.chapter or args.tables or args.names)
    if args.tables or everything:
        build_tables(args.src, args.out)
    if args.names or everything:
        build_names(args.src, args.out)
    for chapter in args.chapter or (["M002"] if everything else []):
        build_chapter(args.src, args.out, chapter)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
