#!/usr/bin/env python3
"""추출본(~/fesim_data/extracted)을 저장소 data/fe17 가공 JSON으로 변환한다."""

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import msbt  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SRC = Path.home() / "fesim_data" / "extracted"
DEFAULT_OUT = REPO / "data" / "fe17"

NAME_FILES = ("person", "item", "skill", "job", "god", "gamedata", "patch0", "patch1", "patch2", "patch3")
LOCALES = {"en": "us/usen", "ja": "jp/jpja", "ko": "kr/krko"}
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


MOVE_TYPES = {"None": "none", "Foot": "foot", "Horse": "horse", "Fly": "fly", "Dragon": "dragon", "Pad": "pad"}


def terrain_costs(src: Path) -> dict:
    """地形コスト 시트 → {CostName: TerrainCost}. 255 = 진입 불가. 통행 판정의 정본."""
    _, rows = load_sheet(src / "gamedata" / "terrain.xml", index=1)
    return {row["Name"]: {key: row.get(col, 0) for col, key in MOVE_TYPES.items()}
            for row in rows if row.get("Name")}


def build_tables(src: Path, out: Path) -> None:
    costs = terrain_costs(src)
    _, terrain = load_sheet(src / "gamedata" / "terrain.xml")
    for row in terrain:
        cost = costs.get(row.get("CostName"))
        if cost:
            row["cost"] = cost
    write_json(out / "tables" / "terrain.json", keyed(terrain, "Tid"))
    _, jobs = load_sheet(src / "gamedata" / "job.xml")
    write_json(out / "tables" / "jobs.json", keyed(jobs, "Jid"))
    build_styles(src, out)
    _, persons = load_sheet(src / "gamedata" / "person.xml")
    write_json(out / "tables" / "persons.json", keyed(persons, "Pid"))
    _, items = load_sheet(src / "gamedata" / "item.xml")
    write_json(out / "tables" / "items.json", keyed(items, "Iid"))
    build_refine(src, out)
    build_shop(src, out)
    _, skills = load_sheet(src / "gamedata" / "skill.xml")
    write_json(out / "tables" / "skills.json", keyed(skills, "Sid"))
    build_gods(src, out)
    build_ai(src, out)
    build_supports(src, out)
    build_calculator(src, out)
    build_chapterlist(src, out)


def load_named_sheet(path: Path, name: str) -> tuple[dict, list[dict]]:
    """시트를 이름으로 찾는다 — item.xml처럼 시트가 많고 순서가 보증 안 되는 파일용."""
    root = ET.parse(path).getroot()
    for index, sheet in enumerate(root):
        if sheet.get("Name") == name:
            return load_sheet(path, index)
    raise SystemExit(f"{path.name}: no sheet named {name}")


def build_refine(src: Path, out: Path) -> None:
    """item.xml 錬成 시트 → 무기 강화(+1~+5) 누적 보정. 그룹 헤더 행(Rid) 뒤 단계 행들이 이어진다.
    키 = RID_ 접두 제거 접미사(IID_ 접미사와 동일 — 鉄の剣 등)."""
    _, rows = load_named_sheet(src / "gamedata" / "item.xml", "錬成")
    table: dict[str, list[dict]] = {}
    stages: list[dict] | None = None
    for row in rows:
        rid = row.get("Rid")
        if rid:
            key = (rid[0] if isinstance(rid, list) else rid).removeprefix("RID_")
            stages = table.setdefault(key, [])
        elif stages is not None:
            stages.append({dst: row.get(col, 0) for col, dst in
                           (("Power", "power"), ("Weight", "weight"), ("Hit", "hit"), ("Critical", "crit"))})
    write_json(out / "tables" / "refine.json", table)


def build_shop(src: Path, out: Path) -> None:
    """shop.xml 武器屋 시트 → 상점 판매 무기 iid(첫 등장 순). 빌더 정렬(상점 기본무기 우선)의 정본."""
    _, rows = load_named_sheet(src / "gamedata" / "shop.xml", "武器屋")
    seen: list[str] = []
    for row in rows:
        iid = row.get("Iid")
        if iid and iid not in seen:
            seen.append(iid)
    write_json(out / "tables" / "shop.json", {"weapons": seen})


def build_styles(src: Path, out: Path) -> None:
    """job.xml 戦闘スタイル 시트(9행) → 스타일별 부여 스킬 정본. jobs.StyleName이 이 표의 Style을 가리킨다."""
    _, rows = load_sheet(src / "gamedata" / "job.xml", index=1)
    write_json(out / "tables" / "styles.json", keyed(rows, "Style"))


CHAPTER_CATEGORIES = {"M": "main", "S": "paralogue", "G": "divine", "E": "fell"}
CHAPTER_RE = re.compile(r"CID_([MSGE])(\d{3})")


def all_chapters(src: Path) -> list[str]:
    """chapter.xml의 전 플레이 챕터 CID(본편 M·외전 S·신룡 G·사룡 E). 허브·투기장 등은 패턴 밖이라 빠진다."""
    _, rows = load_sheet(src / "gamedata" / "chapter.xml")
    return [row["Cid"] for row in rows if CHAPTER_RE.fullmatch(row.get("Cid", "") or "")]


def build_chapterlist(src: Path, out: Path) -> None:
    """chapter.xml → 챕터 선택기용 전 챕터 목록(본편 M·외전 S·신룡의 장 G·사룡의 장 E)."""
    _, rows = load_sheet(src / "gamedata" / "chapter.xml")
    entries = []
    for row in rows:
        m = CHAPTER_RE.fullmatch(row.get("Cid", "") or "")
        if not m:
            continue
        entry = {"cid": row["Cid"], "category": CHAPTER_CATEGORIES[m.group(1)]}
        if row.get("RecommendedLevel"):
            entry["recommendedLevel"] = row["RecommendedLevel"]
        # 챕터 연쇄(캠페인 인계의 순서 정본) — 본편은 NextChapter, 외전은 해금 조건 챕터가 자리를 정한다.
        if row.get("NextChapter"):
            entry["next"] = row["NextChapter"]
        if row.get("GmapSpotOpenCondition"):
            entry["unlock"] = row["GmapSpotOpenCondition"]
        entries.append(entry)
    order = {"main": 0, "paralogue": 1, "divine": 2, "fell": 3}
    entries.sort(key=lambda e: (order[e["category"]], e["cid"]))
    write_json(out / "tables" / "chapterlist.json", entries)


def build_gods(src: Path, out: Path) -> None:
    """god.xml → 엠블렘 정의 + 絆레벨 성장(싱크로/엔게이지 스킬·엔게이지 무기)."""
    path = src / "gamedata" / "god.xml"
    _, gods = load_sheet(path, index=0)
    _, growth_rows = load_sheet(path, index=1)
    growth, current = {}, None
    for row in growth_rows:
        if row.get("Ggid"):
            current = row["Ggid"]
            growth[current] = {}
        elif current and row.get("Level"):
            # Flag(비트) 의미 = 코드 확정(il2cpp/EMBLEM_ENGAGE §3-4): 1=계승 해금(Lv5) ·
            # 2=지속 턴 +1(Lv11, リュール만 Lv20) · 4=게이지 상한 -1(Lv20)
            # ☠스타일별 인게이지 무기 8열을 빼면 **조용히 사라진다**: 벨레트는 絆 1~9 구간의 무기가
            #   0개가 되고, 치키는 OnlyEngageWeapon이라 브레스가 빠지면 쓸 무기 자체가 없어진다.
            #   (2026-08-19 판독으로 발견 — 두 엠블렘만 쓰므로 현행 챕터에는 아직 발현하지 않는다.
            #    소비는 fe17.ts가 그 엠블렘을 다룰 때 잇는다. 장부 = emblem.style-engage-weapons)
            growth[current][str(row["Level"])] = {
                k: row[k]
                for k in (
                    "SynchroSkills", "EngageSkills", "EngageItems", "InheritanceSkills", "Flag",
                    "EngageCooperations", "EngageCoverts", "EngageDragons", "EngageFlys",
                    "EngageHeavys", "EngageHorses", "EngageMagics", "EngagePranas",
                )
                if row.get(k)
            }
    write_json(out / "tables" / "gods.json", {"gods": keyed(gods, "Gid"), "growth": growth})


def build_ai(src: Path, out: Path) -> None:
    """ai.xml コマンド 시트 → {루틴명: [명령행]}. 원문 무손실(Active/Code/Mind/StrValue0/1/Trans 그대로).

    Group 열이 채워진 행이 루틴 머리이고, 뒤따르는 Group="" 행들이 그 루틴의 명령 목록이다
    (`App.AIData` 1행 = 1명령 — il2cpp/AI_ENGINE §2-1). 소비는 엔진 AI 층이 하되
    챕터 유닛이 실제로 쓰는 루틴만 골라 스냅숏으로 넘긴다.
    """
    _, rows = load_sheet(src / "gamedata" / "ai.xml")
    routines: dict[str, list[dict]] = {}
    current: list[dict] | None = None
    for row in rows:
        name = row.get("Group")
        if name:
            current = routines.setdefault(name, [])
            continue
        if current is None:
            continue
        current.append({k: row[k] for k in ("Active", "Code", "Mind", "StrValue0", "StrValue1", "Trans")
                        if k in row})
    write_json(out / "tables" / "ai.json", routines)


def build_supports(src: Path, out: Path) -> None:
    """reliance.xml 3시트 → 지원(絆) 정본. 支援効果가 전투 보정의 유일한 수치 출처다.

    支援関係 시트는 열 이름(予約N)이 DLC 캐릭터 추가 시 갱신되지 않았다 — 열 j는 이름이 아니라
    j번째 행의 Pid를 가리킨다(앞 36명 이름 일치로 확인). 하삼각만 채워진 원문 그대로 사영한다.
    """
    path = src / "gamedata" / "reliance.xml"
    _, pair_rows = load_sheet(path, index=0)
    _, exp_rows = load_sheet(path, index=1)
    _, effect_rows = load_sheet(path, index=2)

    order = [row.get("Pid") for row in pair_rows]
    pairs = {}
    for row in pair_rows:
        entry = {other: row[f"ExpType{j}"] for j, other in enumerate(order)
                 if other and row.get(f"ExpType{j}")}
        if entry:
            pairs[row["Pid"]] = entry

    effects, current = {}, None
    for row in effect_rows:
        if row.get("Name"):
            current = row["Name"]
            effects[current] = {}
        elif current and row.get("Level"):
            effects[current][str(row["Level"])] = {k: row.get(k, 0) for k in ("Hit", "Critical", "Avoid", "Secure")}

    write_json(out / "tables" / "supports.json",
               {"effects": effects, "expPatterns": exp_rows, "pairs": pairs})


def build_calculator(src: Path, out: Path) -> None:
    """calculator.xml → 전투 공식 DSL(공통 시트) + 경험치 룩업 테이블. 평가는 엔진 몫 — 여기선 원문 보존."""
    _, formulas = load_sheet(src / "gamedata" / "calculator.xml", index=0)
    entries = {}
    for row in formulas:
        conditions = row.get("Condition", [])
        functions = row.get("Function", [])
        if len(functions) != len(conditions) + 1:
            raise SystemExit(f"calculator {row['Name']}: 분기 수 불일치 {len(conditions)}+1 != {len(functions)}")
        entries[row["Name"]] = {"conditions": conditions, "functions": functions}

    base = -39
    idents = [f"M{-n:02d}" if n < 0 else ("N00" if n == 0 else f"P{n:02d}") for n in range(base, 41)]
    _, table_rows = load_sheet(src / "gamedata" / "calculator.xml", index=1)
    tables = {row["Name"]: {"base": base, "values": [row.get(i, 0) for i in idents]} for row in table_rows}

    write_json(out / "tables" / "calculator.json", {"formulas": entries, "tables": tables})


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


OBJECT_GROUP = "Terrain"


def dispos_object(row: dict, terrain: dict) -> dict:
    """dispos Terrain 그룹 행 → MapObject. AI/Level/Item 필드는 유닛 서식 재사용 더미라 버린다."""
    pid = row["Pid"]
    obj = {"pid": pid, "x": row.get("DisposX", 0), "y": row.get("DisposY", 0)}
    tid = "TID_" + pid[len("PID_"):] if pid.startswith("PID_") else None
    if tid in terrain:
        obj["tid"] = tid
    if row.get("Flag"):
        obj["flag"] = row["Flag"]
    return obj


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
    # 다단 부활(HP 스톡)과 동반 관측되는 State1은 원문에 범례가 없다 — 해석하지 않고 원값만 보존한다(-1 = 미사용).
    if row.get("HpStockCount"):
        unit["hpStock"] = row["HpStockCount"]
    if row.get("State1", -1) != -1:
        unit["state1"] = row["State1"]
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
    # HealRate 기본값은 0이 아니라 75/50이고 AI_Flag 0도 "플래그 없음"이라는 정보다 — 존재 여부로 사영한다.
    for key, field in (("AI_HealRateA", "healRateA"), ("AI_HealRateB", "healRateB"),
                       ("AI_MoveLimit", "moveLimit"), ("AI_Flag", "flag")):
        if key in row:
            unit["ai"][field] = row[key]
    return unit


def chart_presets(src: Path) -> dict:
    """chart.xml 加入 시트(0번) → 챕터별 기본 출격 명부(순서 보존).
    Chapter 값이 있는 행 = 챕터 구분자, 이후 Pid 행들이 그 챕터 개시 시점의 자군 로스터다
    (레벨·소지품·엠블렘 포함 — 세이브 없이 여는 시뮬의 캠페인층 근사 정본)."""
    _, rows = load_sheet(src / "gamedata" / "chart.xml", 0)
    presets, current = {}, None
    for row in rows:
        if row.get("Chapter"):
            current = row["Chapter"]
            presets[current] = []
        elif current is not None and row.get("Pid"):
            presets[current].append(row)
    return presets


def preset_unit(slot: dict, chart_row: dict, persons: dict) -> dict:
    """익명 출격 슬롯(dispos Force=0·Pid 공백) + chart 명부 행 → 유닛. 좌표는 슬롯이, 신원은 chart가 소유한다."""
    row = {
        "Pid": chart_row["Pid"],
        "Force": 0,
        "DisposX": slot.get("DisposX", 0),
        "DisposY": slot.get("DisposY", 0),
        "Direction": slot.get("Direction", 0),
    }
    for key in ("Jid", "LevelN", "LevelH", "LevelL"):
        if chart_row.get(key):
            row[key] = chart_row[key]
    for i in range(1, 6):
        iid = chart_row.get(f"Item{i}.Iid")
        if iid:
            row[f"Item{i}.Iid"] = iid
    if chart_row.get("GodId"):
        row["Gid"] = chart_row["GodId"]
    return dispos_unit(row, persons)


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
    structures = [{"x": L["X"], "y": L["Y"], "w": L["W"], "h": L["H"], "tid": L["Attr"], "group": L["Group"]}
                  for L in grid["m_Layers"]]
    overlays = [{"x": O["X"], "y": O["Y"], "tid": O["Attr"]} for O in grid["m_Overlaps"]]

    _, terrain_rows = load_sheet(src / "gamedata" / "terrain.xml")
    tids = keyed(terrain_rows, "Tid")
    _, persons = load_sheet(src / "gamedata" / "person.xml")
    persons = keyed(persons, "Pid")
    dispos_name = expand(row.get("Dispos", "*"), tail).lower()
    groups, objects, current = [], [], None
    slots, placed = [], set()  # 익명 Force=0 행 = 출격 슬롯(실기는 세이브 로스터가 채운다)
    for unit_row in load_sheet(src / "dispos" / f"{dispos_name}.xml")[1]:
        if unit_row.get("Group"):
            current = unit_row["Group"]
            if current != OBJECT_GROUP:
                groups.append({"name": current, "units": []})
        if not unit_row.get("Pid") or current is None:
            if current is not None and current != OBJECT_GROUP and not unit_row.get("Pid") \
                    and unit_row.get("Force") == 0 and "DisposX" in unit_row:
                slots.append((len(groups) - 1, unit_row))
            continue
        placed.add(unit_row["Pid"])
        if current == OBJECT_GROUP:
            objects.append(dispos_object(unit_row, tids))
        else:
            groups[-1]["units"].append(dispos_unit(unit_row, persons))

    # 기본 출격 채움 — chart.xml 명부 순서대로 슬롯 정원까지(초과분 = 벤치, 선택 출격은 M4 편집기 몫).
    # dispos에 이미 놓인 인물(고정 배치)은 건너뛴다. dispos 원문 행은 절대 수정하지 않는다.
    chart_rows = {row["Pid"]: row for row in chart_presets(src).get(tail, [])}
    fill = [row for row in chart_rows.values() if row["Pid"] not in placed]
    for (gi, slot), chart_row in zip(slots, fill):
        groups[gi]["units"].append(preset_unit(slot, chart_row, persons))

    # 고정 배치 자군의 결측 보강 — dispos가 **비워 둔 필드만** chart로 채운다(dispos 값이 있으면 절대 우선).
    # 세이브 소유 필드(레벨 0·빈 소지품·무엠블렘)가 그대로 새면 자군이 맨손 Lv1로 렌더된다(m003~ 실발현).
    for group in groups:
        for unit in group["units"]:
            chart_row = chart_rows.get(unit["pid"])
            if chart_row is None or unit["force"] != 0:
                continue
            if all(v == 0 for v in unit["level"].values()):
                unit["level"] = {"n": chart_row.get("LevelN", 0), "h": chart_row.get("LevelH", 0),
                                 "l": chart_row.get("LevelL", 0)}
            if not unit["items"]:
                unit["items"] = [{"iid": chart_row[f"Item{i}.Iid"], "drop": False}
                                 for i in range(1, 6) if chart_row.get(f"Item{i}.Iid")]
            if "gid" not in unit and chart_row.get("GodId"):
                unit["gid"] = chart_row["GodId"]

    interactions = extract_interactions(script_closure(src, row))

    chapter_map = {"width": width, "height": height, "terrain": terrain}
    for key, value in (("structures", structures), ("overlays", overlays),
                       ("objects", objects), ("interactions", interactions)):
        if value:
            chapter_map[key] = value

    data = {"game": "fe17", "cid": cid, "map": chapter_map, "groups": groups}
    if row.get("RecommendedLevel"):
        data["recommendedLevel"] = row["RecommendedLevel"]
    write_json(out / "chapters" / f"{tail.lower()}.json", data)


def strip_lua_comments(source: str) -> str:
    """주석 제거 + 공백 정리 + `!=` → `~=` 정규화 — 립 원문 재배포를 피하는 가공 최소선(의미 보존).

    원본 런타임(MoonSharp)은 C풍 `!=`를 허용하지만 표준 Lua(fengari)는 문법 오류다 — 전 코퍼스에서
    비표준 문법은 이것 하나뿐(227건 실측). 문자열('…', "…", [[…]]) 안은 건드리지 않는다(상태 기계 스캔).
    """
    out: list[str] = []
    i, n = 0, len(source)
    while i < n:
        c = source[i]
        if c in "'\"":
            out.append(c)
            i += 1
            while i < n:
                out.append(source[i])
                if source[i] == "\\" and i + 1 < n:
                    out.append(source[i + 1])
                    i += 2
                    continue
                if source[i] == c:
                    i += 1
                    break
                i += 1
            continue
        if c == "[":
            j = i + 1
            while j < n and source[j] == "=":
                j += 1
            if j < n and source[j] == "[":  # 긴 괄호 문자열
                close = "]" + "=" * (j - i - 1) + "]"
                end = source.find(close, j + 1)
                end = n if end < 0 else end + len(close)
                out.append(source[i:end])
                i = end
                continue
        if c == "-" and i + 1 < n and source[i + 1] == "-":
            j = i + 2
            if j < n and source[j] == "[":
                k = j + 1
                while k < n and source[k] == "=":
                    k += 1
                if k < n and source[k] == "[":  # 블록 주석
                    close = "]" + "=" * (k - j - 1) + "]"
                    end = source.find(close, k + 1)
                    i = n if end < 0 else end + len(close)
                    continue
            end = source.find("\n", i)  # 줄 주석
            i = n if end < 0 else end
            continue
        if c == "!" and i + 1 < n and source[i + 1] == "=":
            out.append("~=")
            i += 2
            continue
        # 식별자 토큰 — MoonSharp는 유니코드 식별자(イベント登録 등)를 허용하지만 표준 Lua는 거부한다.
        # 비ASCII 포함 토큰은 코드포인트 헥스로 결정적 맹글링(파일 간 일관 — 챕터가 common의 함수를 부른다).
        # ☠문자열 키("勝利" 등)는 문자열 분기가 이미 소유하므로 여기 오지 않는다(원문 유지).
        if c.isalpha() or c == "_" or ord(c) >= 0x80:
            j = i
            while j < n and (source[j].isalnum() or source[j] == "_" or ord(source[j]) >= 0x80):
                j += 1
            token = source[i:j]
            if any(ord(ch) >= 0x80 for ch in token):
                token = "_u" + "_".join(f"{ord(ch):x}" if ord(ch) >= 0x80 else ch for ch in token)
            out.append(token)
            i = j
            continue
        out.append(c)
        i += 1
    lines = [line.rstrip() for line in "".join(out).split("\n")]
    cleaned: list[str] = []
    for line in lines:
        if line == "" and (not cleaned or cleaned[-1] == ""):
            continue
        cleaned.append(line)
    return "\n".join(_normalize_returns(cleaned)).strip() + "\n"


RETURN_RE = re.compile(r"^(\s*)return\b(.*)$")
_TERMINATORS = ("end", "else", "elseif", "until")


def _block_delta(line: str) -> list[str]:
    """줄 하나가 여는 블록 종류를 순서대로 — 닫힘은 "-"로 표기(근사 스캔, 주석·문자열은 이미 제거됨)."""
    ops: list[str] = []
    for m in re.finditer(r"\b(function|if|for|while|do|end|repeat|until)\b", line):
        tok = m.group(1)
        if tok == "function":
            ops.append("function")
        elif tok == "if":
            ops.append("if")
        elif tok in ("for", "while"):
            ops.append(tok)
        elif tok == "do":
            # for/while이 이미 열어 뒀으면 그 do는 같은 블록이다 — 중복으로 세지 않는다.
            if ops and ops[-1] in ("for", "while"):
                continue
            ops.append("do")
        elif tok == "repeat":
            ops.append("repeat")
        elif tok in ("end", "until"):
            ops.append("-")
    return ops


def _normalize_returns(lines: list[str]) -> list[str]:
    """MoonSharp 확장 — `return`이 블록의 마지막 문장이 아니어도 된다(표준 Lua는 문법 오류).

    두 가지를 한다.
    1. 모든 `return x` → `do return x end` — 어느 위치에서든 합법이면서 의미가 같다.
    2. ★`return` 뒤에 문장이 **더 오는** 자리에서는 그 블록을 닫는 `end`를 보충한다.
       근거 = 원문이 실제로 `end` 하나가 모자란다(g001 토큰 실측: 열림 60 · `end` 59). MoonSharp은
       `return`을 만나면 그 블록을 닫으므로 원문이 성립하고, 표준 Lua는 `<eof>`에서 거부한다.
       ☠**여는 블록이 `if`가 아니면 중단한다** — 함수 본문 한가운데의 return을 닫으면 뒤 함수들이
       통째로 중첩돼 전역 정의가 사라진다. 추측으로 메우지 않는다(전 코퍼스 해당 2곳, 둘 다 `if`).
    """
    stack: list[str] = []
    out: list[str] = []
    for i, line in enumerate(lines):
        m = RETURN_RE.match(line)
        if m is None:
            for op in _block_delta(line):
                if op == "-":
                    if stack:
                        stack.pop()
                else:
                    stack.append(op)
            out.append(line)
            continue
        indent, rest = m.group(1), m.group(2).strip()
        out.append(f"{indent}do return{' ' + rest if rest else ''} end")
        nxt = next((lines[j].strip() for j in range(i + 1, len(lines)) if lines[j].strip()), "")
        if nxt == "" or nxt.startswith(_TERMINATORS):
            continue
        if not stack or stack[-1] != "if":
            raise ValueError(
                f"return 뒤 문장이 있는데 여는 블록이 if가 아니다(줄 {i + 1}, 스택 {stack[-3:]}) — 수동 판독 필요"
            )
        stack.pop()
        out.append(f"{indent}end")
    return out


INCLUDE_RE = re.compile(r'Include\(\s*"([^"]+)"\s*\)')


def script_closure(src: Path, row: dict) -> dict:
    """챕터 스크립트 + Include 전이 폐포 → {이름: 주석 제거본}. 루트 먼저, 나머지는 이름순(결정적)."""
    tail = row["Cid"][len("CID_"):]
    pending, texts = [expand(row.get("ScriptBmap", "*"), tail).lower()], {}
    while pending:
        current = pending.pop(0)
        if current in texts:
            continue
        path = src / "scripts" / f"{current}.txt"
        if not path.exists():
            raise SystemExit(f"no such script: {path}")
        texts[current] = strip_lua_comments(path.read_text(encoding="utf-8"))
        pending.extend(sorted(m.lower() for m in INCLUDE_RE.findall(texts[current])))
    return texts


# EventEntry* 는 Lua에 정의가 없는 엔진 네이티브 API다(common*.txt 전수 확인) — 인자 시그니처가 고정적이라
# 정규식 추출이 성립한다. Area(영역 트리거)는 상호작용 지점이 아니라 스크립트 이벤트라 제외한다.
INTERACTION_KINDS = {
    "Tbox": "chest", "Visit": "visit", "Door": "door",
    "Escape": "escape", "BreakdownEnemy": "defendArea", "Destroy": "destroy",
}
INTERACTION_CALL_RE = re.compile(r"EventEntry(%s)\s*\(" % "|".join(INTERACTION_KINDS))
PID_ASSIGN_RE = re.compile(r'(\w+)\s*=\s*"(PID_[^"]+)"')
INT_ARG_RE = re.compile(r"-?\d+")
# g006만 좌표를 테이블 상수(g_CrystalPos[i][j])로 넘긴다 — 리터럴 중첩 테이블이라 정적 해석이 가능하다.
TABLE_ASSIGN_RE = re.compile(r"(\w+)\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}")
ROW_RE = re.compile(r"\{\s*(-?\d+)\s*,\s*(-?\d+)\s*\}")
SUBSCRIPT_RE = re.compile(r"(\w+)\[(\d+)\]\[(\d+)\]")


def coord_tables(texts: dict) -> dict:
    """`NAME = { {x, z}, … }` 형태의 좌표 테이블 상수 → {NAME: [[x, z], …]}."""
    tables = {}
    for text in texts.values():
        for name, body in TABLE_ASSIGN_RE.findall(text):
            rows = [[int(a), int(b)] for a, b in ROW_RE.findall(body)]
            if rows and not re.sub(r"\{[^{}]*\}|[\s,]", "", body):
                tables[name] = rows
    return tables


def resolve_int(arg: str, tables: dict):
    if INT_ARG_RE.fullmatch(arg):
        return int(arg)
    m = SUBSCRIPT_RE.fullmatch(arg)
    if m and m.group(1) in tables:
        rows = tables[m.group(1)]
        i, j = int(m.group(2)) - 1, int(m.group(3)) - 1  # Lua 인덱스는 1-based
        if 0 <= i < len(rows) and 0 <= j < len(rows[i]):
            return rows[i][j]
    return None


def call_args(text: str, paren: int) -> tuple[list[str], int]:
    """`(`부터 짝 맞는 `)`까지를 최상위 콤마로 쪼갠다. 문자열·중첩 괄호/대괄호 안의 콤마는 무시."""
    depth, start, args, quote, i = 0, paren + 1, [], None, paren
    while i < len(text):
        c = text[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "'\"":
            quote = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                args.append(text[start:i])
                return [a.strip() for a in args], i
        elif c == "," and depth == 1:
            args.append(text[start:i])
            start = i + 1
        i += 1
    return [], len(text)


def extract_interactions(texts: dict) -> list[dict]:
    """챕터 Lua 폐포 → MapInteraction 목록.

    ★좌표 규약은 API마다 다르다 — 전수 실측(scripts 166개 x terrains 원본 대조)으로 확정했다:
      chest    Tbox 42/42가 좌표 칸 자체가 TID_宝箱(g001 2건은 TID_宝箱_氷結界) → ☠오프셋 금지
      visit    Visit 10/10이 (x, y+1)에서 TID_民家入口 (m004·m013·m016·m019·s001) → tile = (x, y+1),
               원본(문 앞에 서는 통행 가능 칸)은 stand에 보존
      door     Door 7건은 사각 범위이며 m010 (8,14)-(10,14)가 m_Layers{X:8,Y:14,W:3,H:1}과 일치 → 그대로
      escape   Escape 9건 전부 통행 가능 칸(유닛이 서는 이탈 지점) → 그대로
      defendArea BreakdownEnemy 6건 그대로(s011 (12,23) = TID_防衛床로 직접 확인)
      destroy  Destroy는 가변 인자 — 좌표 2개 = 점(s006 19건 전부 TID_水晶), 4의 배수 = 사각 범위 여러 개
               (m004/m013/m016/s001의 민가는 [트리거 칸][건물 범위] 2쌍) → 범위마다 한 항목
    좌표가 리터럴이 아닌 호출(g006의 g_CrystalPos[i][j])은 정적 추출 불가라 건너뛰고 경고만 남긴다.
    """
    pids = {name: pid for text in texts.values() for name, pid in PID_ASSIGN_RE.findall(text)}
    tables = coord_tables(texts)
    out = []
    for name, text in texts.items():
        for m in INTERACTION_CALL_RE.finditer(text):
            api = m.group(1)
            args, _ = call_args(text, m.end() - 1)
            nums, rest = [], []
            for arg in args[1:]:
                value = None if rest else resolve_int(arg, tables)
                if value is None:
                    rest.append(arg)
                else:
                    nums.append(value)
            strings = [a[1:-1] for a in rest if len(a) > 1 and a[0] == a[-1] == '"']
            kind = INTERACTION_KINDS[api]
            rects: list[tuple] = []
            if api == "Destroy":
                if len(nums) == 2:
                    rects = [(nums[0], nums[1], None, None)]
                elif nums and len(nums) % 4 == 0:
                    rects = [tuple(nums[i:i + 4]) for i in range(0, len(nums), 4)]
            elif api == "Door" and len(nums) >= 4:
                rects = [(nums[0], nums[1], nums[2], nums[3])]
            elif len(nums) >= 2:
                rects = [(nums[0], nums[1], None, None)]
            if not rects:
                print(f"  ! interactions: {name} EventEntry{api} 좌표가 리터럴이 아님 — 건너뜀 ({args[1:]})")
                continue
            for x, y, x2, y2 in rects:
                entry = {"kind": kind, "x": x, "y": y + 1 if kind == "visit" else y}
                if x2 is not None and (x2, y2) != (x, y):
                    entry["x2"], entry["y2"] = x2, y2
                if kind == "chest":
                    iid = next((s for s in strings if s.startswith("IID_")), None)
                    if iid:
                        entry["iid"] = iid
                if kind == "escape":
                    pid = next((s for s in strings if s.startswith("PID_")), None)
                    pid = pid or next((pids[a] for a in rest if a in pids), None)
                    if pid:
                        entry["pid"] = pid
                if kind == "visit":
                    entry["stand"] = {"x": x, "y": y}
                out.append(entry)
    return out


def build_scripts(src: Path, out: Path, chapter: str) -> None:
    """챕터 이벤트 스크립트(+Include 의존 전이 폐포)를 가공해 동봉한다. 소비 = 엔진 이벤트 레이어."""
    cid = chapter if chapter.startswith("CID_") else f"CID_{chapter}"
    _, chapters = load_sheet(src / "gamedata" / "chapter.xml")
    row = next((r for r in chapters if r.get("Cid") == cid), None)
    if row is None:
        raise SystemExit(f"no such chapter: {cid}")
    for name, text in script_closure(src, row).items():
        dest = out / "scripts" / f"{name}.lua"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8")
        print(f"wrote {dest.relative_to(REPO) if REPO in dest.parents else dest} ({dest.stat().st_size:,}B)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--chapter", action="append", help="예: M002")
    parser.add_argument("--all", action="store_true", help="플레이 챕터 전수(M/S/G/E) 변환")
    parser.add_argument("--tables", action="store_true")
    parser.add_argument("--names", action="store_true")
    args = parser.parse_args()

    everything = not (args.chapter or args.all or args.tables or args.names)
    if args.tables or everything:
        build_tables(args.src, args.out)
    if args.names or everything:
        build_names(args.src, args.out)
    chapters = list(args.chapter or ([] if (args.all or not everything) else ["M002"]))
    if args.all:
        named = {c if c.startswith("CID_") else f"CID_{c}" for c in chapters}
        chapters += [c for c in all_chapters(args.src) if c not in named]
    for chapter in chapters:
        build_chapter(args.src, args.out, chapter)
        build_scripts(args.src, args.out, chapter)
    if args.all:
        print(f"== transform --all: {len(chapters)} chapters ==")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
