#!/usr/bin/env python3
"""M002 산출 JSON을 커뮤니티 대조군(Triangle Attack 파싱본)과 대조하고 리포트를 쓴다."""

import argparse
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_DATA = REPO / "data" / "fe17"
DEFAULT_EXTRACTED = Path.home() / "fesim_data" / "extracted"
DEFAULT_REFERENCE = Path.home() / "fesim_data" / "reference" / "m002_reference.md"
DEFAULT_REPORT = DEFAULT_EXTRACTED / "VERIFY_M002.md"

STAT_LABELS = [("HP", "Hp"), ("힘", "Str"), ("마방", "Mdef"), ("마", "Magic"), ("기", "Tech"),
               ("속", "Quick"), ("수", "Def"), ("행", "Luck"), ("체격", "Phys"), ("이동", "Move")]
STAT_RE = re.compile("(" + "|".join(k for k, _ in STAT_LABELS) + r")(-?\d+)")
DIFFS = [("Normal", "N", "n"), ("Hard", "H", "h"), ("Maddening", "L", "l")]

# 영문 라벨이 없는 내부 스킬 ↔ 대조군 슬러그. skill.xml의 ActNames/ActOperations/ActValues에서 판별했다.
INTERNAL_SID_SLUGS = {
    "SID_必殺０": "never_crit",            # 必殺率 = 0
    "SID_相手の必殺０": "nullify_crit",     # 相手の必殺率 = 0
    "SID_命中回避－１０": "hit_avo_-10",    # 命中値/回避値 -10
    "SID_命中回避－２０": "hit_avo_-20",    # 命中値/回避値 -20
    "SID_王族": "royal",                   # 효과 없는 태그 스킬, 대조군이 royal로 표기
}
# 대조군이 아예 표기하지 않는 내부 플래그 스킬(장비 허가·주인공 태그 등).
IGNORED_SIDS = {"SID_主人公", "SID_リベラシオン装備可能", "SID_ヴィレグランツ装備可能",
                "SID_死亡会話存在敵", "SID_不死身"}


def slug(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip().lower().replace(" ", "_")


def parse_stats(cell: str) -> dict:
    return {ident: int(v) for label, v in STAT_RE.findall(cell)
            for key, ident in STAT_LABELS if key == label}


def parse_reference(path: Path) -> list[dict]:
    """3-1/3-2 유닛 표를 파싱. '좌동' = 같은 행 왼쪽 칸, '상동' = 같은 열 위 행."""
    rows, header, prev, group = [], None, None, None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("### 3-1"):
            group, header = "Initial", None
        elif line.startswith("### 3-2"):
            group, header = "Phase 2", None
        elif line.startswith("## ") and not line.startswith("## 3"):
            group = None
        if group is None or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if header is None:
            header = cells
            prev = None
            continue
        if set("".join(cells)) <= set("-: "):
            continue
        row = {"group": group}
        for i, key in enumerate(header):
            value = cells[i] if i < len(cells) else ""
            if value == "상동" and prev:
                value = prev[key]
            elif value == "좌동" and i:
                value = row[header[i - 1]]
            row[key] = value
        rows.append(row)
        prev = row
    return rows


def label_map(xml_path: Path, key: str) -> dict:
    sheet = ET.parse(xml_path).getroot()[0]
    return {p.get(key): p.get("Name") for p in sheet.find("Data").findall("Param") if p.get(key)}


def check(results: list, section: str, item: str, expected, got, note: str = "", partial=None) -> None:
    if expected is None or got is None:
        verdict = "판정불가"
    elif expected == got:
        verdict = "일치"
    elif partial and partial(expected, got):
        verdict = "부분일치"
    else:
        verdict = "불일치"
    results.append({"section": section, "item": item, "expected": expected, "got": got,
                    "verdict": verdict, "note": note})


def suffixed(expected, got) -> bool:
    """대조군이 동명 클래스를 구분하려고 접미사를 붙인 경우(paladin → paladin_axe)."""
    return isinstance(expected, str) and isinstance(got, str) and got and expected.startswith(got + "_")


def ref_skill_sets(cell: str) -> dict:
    """'never_crit (+Normal한정: hit_avo_-10 / Maddening한정: unbreakable)' → 난이도별 집합."""
    text = cell.split("—")[0]
    conditional, spans = {}, []
    for m in re.finditer(r"(Normal|Hard|Maddening)\s*(?:한정)?\s*:\s*([a-z0-9_\-, ]+)", text):
        conditional.setdefault(m.group(1), []).extend(re.findall(r"[a-z][a-z0-9_\-]*", m.group(2)))
        spans.append(m.span())
    for start, end in reversed(spans):
        text = text[:start] + text[end:]
    base = re.findall(r"[a-z][a-z0-9_\-]*", text)
    return {name: set(base) | set(conditional.get(name, [])) for name, _, _ in DIFFS}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", type=Path, default=DEFAULT_DATA)
    ap.add_argument("--extracted", type=Path, default=DEFAULT_EXTRACTED)
    ap.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE)
    ap.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = ap.parse_args()

    chapter = json.loads((args.data / "chapters" / "m002.json").read_text(encoding="utf-8"))
    terrain_tbl = json.loads((args.data / "tables" / "terrain.json").read_text(encoding="utf-8"))
    jobs = json.loads((args.data / "tables" / "jobs.json").read_text(encoding="utf-8"))
    persons = json.loads((args.data / "tables" / "persons.json").read_text(encoding="utf-8"))
    names = json.loads((args.data / "names" / "en.json").read_text(encoding="utf-8"))
    item_labels = label_map(args.extracted / "gamedata" / "item.xml", "Iid")
    skill_labels = label_map(args.extracted / "gamedata" / "skill.xml", "Sid")
    reference = parse_reference(args.reference)

    en = lambda label: names.get(label or "")
    results, mappings = [], []

    # --- 맵 ---
    ref_w, ref_h = 11, 14
    check(results, "맵", "width (대조군+2 = 테두리 크롭 보정)", ref_w + 2, chapter["map"]["width"])
    check(results, "맵", "height (대조군+2)", ref_h + 2, chapter["map"]["height"])
    grid = chapter["map"]["terrain"]
    inner = {grid[y][x] for y in range(1, 1 + ref_h) for x in range(1, 1 + ref_w)}
    ref_tids = {"TID_平地", "TID_道", "TID_植込", "TID_階段", "TID_茂み", "TID_石像"}
    check(results, "맵", "크롭 내부 11x14 등장 TID 집합", sorted(ref_tids), sorted(inner))
    check(results, "맵", "크롭으로 사라지는 TID", ["TID_進入不可"],
          sorted({t for row in grid for t in row} - inner))

    # --- 지형 스탯 ---
    for tid, avoid, passable in [("TID_平地", 0, "normal"), ("TID_道", 0, "normal"),
                                 ("TID_植込", 0, "flying"), ("TID_階段", 0, "normal"),
                                 ("TID_茂み", 30, "avoid"), ("TID_石像", None, "impassable")]:
        row = terrain_tbl.get(tid, {})
        proh = row.get("Prohibition", 0)
        got = {0: "normal", 1: "impassable", 2: "flying"}.get(proh, f"Prohibition={proh}")
        want = "avoid" if passable == "avoid" else passable
        if passable == "avoid":
            got = "avoid" if row.get("Avoid") else got
        check(results, "지형", f"{tid} 통행", want, got, f"Prohibition={proh}")
        if avoid is not None:
            check(results, "지형", f"{tid} 회피", avoid, row.get("Avoid", 0))

    # --- 유닛 ---
    ours = [(g["name"], u) for g in chapter["groups"] for u in g["units"]]
    by_pos = {(u["x"], u["y"]): (gname, u) for gname, u in ours}
    check(results, "유닛", "유닛 수", len(reference), len(ours))

    for ref in reference:
        rx, ry = (int(v) for v in re.findall(r"-?\d+", ref["좌표"]))
        tag = f'{ref["이름"]}/{ref["클래스"]} ({rx},{ry})'
        found = by_pos.get((rx, ry))
        check(results, "유닛", f"{tag} 좌표", (rx, ry),
              (found[1]["x"], found[1]["y"]) if found else None,
              "대조군 1-index·11x14 크롭 = 우리 0-index·13x16 전체맵 (−1+1 상쇄)"
              if found else "같은 좌표의 유닛 없음")
        if not found:
            continue
        gname, unit = found
        person = persons.get(unit["pid"], {})
        job = jobs.get(unit["jid"], {})

        check(results, "유닛", f"{tag} 이름", slug(ref["이름"]), slug(en(person.get("Name")) or ""))
        check(results, "유닛", f"{tag} 클래스", ref["클래스"], slug(en(job.get("Name")) or ""),
              f'{unit["jid"]} → {job.get("Name")} → {en(job.get("Name"))}', partial=suffixed)
        mappings.append(("클래스", unit["jid"], job.get("Name"), en(job.get("Name")), ref["클래스"]))

        level = person.get("Level", 0)
        check(results, "유닛", f"{tag} Lv", int(ref["Lv"]), level,
              "dispos LevelN/H/L=0 → person.xml Level 사용")

        ref_items = [slug(v) for v in re.split(r",\s*", ref["무기"]) if v and v != "-"]
        ref_items += [slug(v) for v in re.split(r",\s*", ref.get("소지품", "")) if v and v != "-"]
        our_items = []
        for entry in unit["items"]:
            label = item_labels.get(entry["iid"])
            our_items.append(slug(en(label) or entry["iid"]))
            mappings.append(("아이템", entry["iid"], label, en(label), our_items[-1]))
        check(results, "유닛", f"{tag} 아이템", ref_items, our_items)

        ref_skills = ref_skill_sets(ref["스킬"])
        for name, suffix, key in DIFFS:
            sids = list(person.get("CommonSids") or []) + list(unit["sids"])
            sids += list(person.get({"N": "NormalSids", "H": "HardSids", "L": "LunaticSids"}[suffix]) or [])
            ours_slugs, ignored = [], []
            for sid in sids:
                label = skill_labels.get(sid)
                text = en(label)
                if sid in IGNORED_SIDS:
                    ignored.append(sid)
                    mappings.append(("스킬", sid, label, text, "(대조군 미표기)"))
                    continue
                ours_slugs.append(slug(text) if text else INTERNAL_SID_SLUGS.get(sid, f"?{sid}"))
                mappings.append(("스킬", sid, label, text, ours_slugs[-1]))
            check(results, "스킬", f"{tag} {name}", sorted(ref_skills[name]), sorted(set(ours_slugs)),
                  f'대조군 미표기 취급: {", ".join(ignored) or "없음"}')

        for name, suffix, key in DIFFS:
            ref_stats = parse_stats(ref[f"스탯({name})"])
            if not ref_stats:
                continue
            got = {ident: job.get(f"Base.{ident}", 0) + person.get(f"Offset{suffix}.{ident}", 0)
                   for _, ident in STAT_LABELS}
            check(results, "스탯", f"{tag} {name}", ref_stats, {k: got[k] for k in ref_stats})

    # --- 리포트 ---
    tally = {"일치": 0, "부분일치": 0, "불일치": 0, "판정불가": 0}
    for r in results:
        tally[r["verdict"]] += 1
    lines = ["# M002 검증 리포트 — 산출 JSON vs 커뮤니티 대조군", "",
             f"대조군 = `{args.reference}` (Triangle Attack `__NEXT_DATA__` 파싱본)",
             f"산출 = `data/fe17/chapters/m002.json` + `tables/*.json` + `names/en.json`", "",
             f"**일치 {tally['일치']} · 부분일치 {tally['부분일치']} · 불일치 {tally['불일치']} "
             f"· 판정불가 {tally['판정불가']}**", ""]
    for section in ["맵", "지형", "유닛", "스킬", "스탯"]:
        rows = [r for r in results if r["section"] == section]
        if not rows:
            continue
        ok = sum(1 for r in rows if r["verdict"] == "일치")
        lines += [f"## {section} — 일치 {ok}/{len(rows)}", "",
                  "| 항목 | 대조군 | 우리 | 판정 | 비고 |", "|---|---|---|---|---|"]
        for r in rows:
            if r["verdict"] == "일치" and section == "스탯":
                lines.append(f'| {r["item"]} | (동일) | (동일) | 일치 | |')
                continue
            lines.append(f'| {r["item"]} | `{r["expected"]}` | `{r["got"]}` | '
                         f'{r["verdict"]} | {r["note"]} |')
        lines.append("")

    lines += ["## ID 매핑 (대조군 영문 슬러그 ↔ 우리 ID)", "",
              "| 종류 | 우리 ID | MSBT 라벨 | 영문명(en.json) | 대조군 슬러그 |", "|---|---|---|---|---|"]
    for kind, ident, label, text, ref_slug in sorted(set(mappings)):
        lines.append(f"| {kind} | `{ident}` | `{label or '(없음)'}` | {text or '(없음)'} | "
                     f"{ref_slug or '-'} |")
    lines.append("")

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {args.report}")
    print(f"일치 {tally['일치']} · 부분일치 {tally['부분일치']} · 불일치 {tally['불일치']} "
          f"· 판정불가 {tally['판정불가']}")
    for r in results:
        if r["verdict"] != "일치":
            print(f"  [{r['verdict']}] {r['section']} {r['item']}: ref={r['expected']} ours={r['got']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
