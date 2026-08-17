#!/usr/bin/env python3
"""챕터별 노트(획득 아이템·해금·상점·특이사항) → data/fe17/tables/chapternotes.json.

소비 = 웹 챕터 화면의 "얻을 수 있는 것" 패널. 표시명은 넣지 않는다 — iid/pid/gid/mid만 담고
해석은 data/fe17/names/{en,ko}.json이 소유한다(단 names에 없는 MID는 원문 텍스트를 병기한다).
상자·민가·문·이탈 좌표는 챕터 JSON의 map.interactions가 이미 소유하므로 여기 중복 등재하지 않는다.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import msbt  # noqa: E402
from transform import (  # noqa: E402
    DEFAULT_OUT,
    DEFAULT_SRC,
    all_chapters,
    expand,
    load_sheet,
    script_closure,
    strip_lua_comments,
    write_json,
)

# dispos Flag(b16) 하위 3비트 = 난이도 마스크. 판정 근거 = m008의 `*_Normal` 그룹 전 행 Flag=1 ·
# `*_Lunatic1` 그룹 전 행 Flag=4, m005 보스 2행(19=0b10011 / 20=0b10100)이 N+H / L로 분리.
DIFFICULTY_BITS = {"n": 1, "h": 2, "l": 4}
SHOP_SHEETS = (("weapon", 0), ("item", 1), ("fleaMarket", 2))
EMPTY_IID = "IID_無し"

VISIT_RE = re.compile(r"EventEntryVisit\(\s*([^\s,)]+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)")
FUNCTION_RE = re.compile(r"^function\s+([^\s(]+)\s*\(", re.M)
ITEM_GAIN_RE = re.compile(r'ItemGain\w*\(\s*[^,]+?\s*,\s*"([^"]+)"\s*\)')
GOLD_GAIN_RE = re.compile(r"GoldGain\(\s*(\d+)")
GOD_CREATE_RE = re.compile(r'GodUnitCreate\(\s*"([^"]+)"')
GOD_ESCAPE_RE = re.compile(r'GodUnitSetEscape\(\s*"([^"]+)"\s*,\s*(\w+)')
UNIT_JOIN_RE = re.compile(r"UnitJoin\(([^)]*)\)")
QUOTED_RE = re.compile(r'"([^"]+)"')
LIMIT_TURN_RE = re.compile(r"WinRuleSetLimitTurn\(\s*(-?\d+)")
IF_RE = re.compile(r"^(if|elseif)\b(.*)$")
BLOCK_OPEN_RE = re.compile(r"\b(function|for|while)\b")


def function_bodies(text: str) -> dict:
    """`function 이름(` 단위로 소스를 잘라 {이름: 본문}. 다음 function 직전까지가 한 본문이다."""
    marks = [(m.start(), m.group(1)) for m in FUNCTION_RE.finditer(text)]
    return {
        name: text[start : (marks[i + 1][0] if i + 1 < len(marks) else len(text))]
        for i, (start, name) in enumerate(marks)
    }


def guarded_gains(body: str) -> list[dict]:
    """본문의 ItemGain을 감싸는 if/elseif/else 조건과 함께 뽑는다. 조건 밖이면 condition=None.

    Lua 블록을 줄 단위 스택으로 추적한다(if/for/while/function 열고 end 닫기). 조건식은 원문 그대로
    담는다 — 해석은 사람이 한다(no-fiction: 요약·번역하지 않는다).
    """
    stack: list[list] = []  # [kind, 조건원문|None, 지금까지 본 조건들]
    out, pending = [], ""
    for raw in body.split("\n"):
        line = raw.strip()
        if pending:
            line, pending = pending + " " + line, ""
        match = IF_RE.match(line)
        if match and "then" not in line:
            pending = line
            continue
        if match:
            condition = match.group(2).rsplit("then", 1)[0].strip()
            if match.group(1) == "if":
                stack.append(["if", condition, [condition]])
            elif stack and stack[-1][0] == "if":
                prior = " or ".join(stack[-1][2])
                stack[-1][2].append(condition)
                stack[-1][1] = f"not({prior}) and {condition}"
        elif line == "else" and stack and stack[-1][0] == "if":
            stack[-1][1] = "else: not(" + " or ".join(stack[-1][2]) + ")"
        elif line.startswith("end"):
            if stack:
                stack.pop()
        elif BLOCK_OPEN_RE.search(line) and (line.endswith("do") or line.startswith("function")):
            stack.append(["block", None, []])
        for iid in ITEM_GAIN_RE.findall(line):
            condition = next((f[1] for f in reversed(stack) if f[0] == "if"), None)
            out.append({"iid": iid, "condition": condition})
    return out


def chapter_scripts(src: Path, row: dict) -> tuple[str, str]:
    """(맵 스크립트 본문, 클리어 후 絆 스크립트 본문). 절 스크립트가 없으면 빈 문자열."""
    tail = row["Cid"][len("CID_") :]
    texts = script_closure(src, row)
    root = expand(row.get("ScriptBmap", "*"), tail).lower()
    bond_name = expand(row.get("ScriptKizuna", "") or "", tail).lower()
    bond_path = src / "scripts" / f"{bond_name}.txt" if bond_name else None
    bond = ""
    if bond_path is not None and bond_path.exists():
        bond = strip_lua_comments(bond_path.read_text(encoding="utf-8"))
    return texts[root], bond


def chart_rosters(src: Path) -> tuple[list[str], dict]:
    """chart.xml「加入」 = 챕터 선택 프리셋. (챕터 순서, {챕터키: {Pid}}). 챕터 행이 섹션 머리다."""
    _, rows = load_sheet(src / "gamedata" / "chart.xml", 0)
    order, roster, current = [], {}, None
    for row in rows:
        if "Chapter" in row:
            current = row["Chapter"]
            roster[current] = set()
            order.append(current)
        elif current and row.get("Pid"):
            roster[current].add(row["Pid"])
    return order, roster


def shop_sections(src: Path) -> dict:
    """{(가게, Condition): [{iid, stock}]}. Condition 행이 구간 머리이고 이후 행이 그 구간 품목이다."""
    out = {}
    for label, index in SHOP_SHEETS:
        _, rows = load_sheet(src / "gamedata" / "shop.xml", index)
        current = None
        for row in rows:
            if "Condition" in row:
                current = row["Condition"]
                out.setdefault((label, current), [])
            elif current and row.get("Iid") and row["Iid"] != EMPTY_IID:
                out[(label, current)].append({"iid": row["Iid"], "stock": row.get("Stock", -1)})
    return out


def tutorial_unlocks(src: Path, names: dict) -> dict:
    """{Cid: [{tutid, mid, text}]}. TUTID 행이 섹션 머리이고 다음 행이 Cid(발생 챕터)를 갖는다."""
    _, rows = load_sheet(src / "gamedata" / "tutorial.xml", 0)
    texts = {}
    for locale, rel in (("ko", "kr/krko"), ("en", "us/usen")):
        for stem in ("tutorial", "tutorial_p0", "tutorial_p1", "tutorial_p2", "tutorial_p3"):
            path = src / "message" / rel / f"{stem}.msbt"
            if path.exists():
                for label, text in msbt.parse(path).items():
                    texts.setdefault(label, {})[locale] = text
    out, current = {}, None
    for row in rows:
        if "TUTID" in row:
            current = row["TUTID"]
            continue
        if not (current and row.get("Cid")):
            continue
        mid = row.get("Title", "")
        entry = {"tutid": current, "mid": mid}
        if mid not in names and mid in texts:  # names가 못 푸는 MID만 원문 병기
            entry["text"] = texts[mid]
        out.setdefault(row["Cid"], []).append(entry)
        current = None
    return out


def dispos_notes(path: Path) -> tuple[dict, list]:
    """(난이도별 드랍, HP 스톡). Item{n}.Drop==1이 고정 드랍이고 Flag 하위 3비트가 난이도 마스크다."""
    drops = {key: [] for key in DIFFICULTY_BITS}
    stocks, seen = [], set()
    _, rows = load_sheet(path, 0)
    group = None
    for row in rows:
        if "Group" in row:
            group = row["Group"]
        pid = row.get("Pid")
        if not pid or group == "Terrain":
            continue
        flag = row.get("Flag", 0)
        keys = [k for k, bit in DIFFICULTY_BITS.items() if not (flag & 7) or flag & bit]
        for slot in range(1, 7):
            if row.get(f"Item{slot}.Drop") != 1:
                continue
            entry = {
                "iid": row.get(f"Item{slot}.Iid"),
                "pid": pid,
                "x": row.get("DisposX"),
                "y": row.get("DisposY"),
            }
            for key in keys:
                drops[key].append(entry)
        stock = row.get("HpStockCount", 0)
        if stock and "l" in keys and (pid, stock) not in seen:
            seen.add((pid, stock))
            stocks.append({"pid": pid, "count": stock})
    # 같은 (아이템, 유닛, 좌표)가 여러 행인 경우가 있다 — 연출용 중복 배치(m014 마론)와 같은 스폰 지점에
    # 겹쳐 둔 다수 유닛(신룡의 장 幻影兵)이 섞인다. 행을 접고 개수를 남겨 둘 다 읽을 수 있게 한다.
    for key, entries in drops.items():
        folded = {}
        for entry in entries:
            slot = folded.setdefault((entry["iid"], entry["pid"], entry["x"], entry["y"]), dict(entry))
            slot["count"] = slot.get("count", 0) + 1
        drops[key] = [{k: v for k, v in e.items() if k != "count" or v > 1} for e in folded.values()]
    return drops, stocks


def turn_limits(text: str) -> dict | None:
    """{n,h,l} 턴 제한. DifficultyGet 분기가 있으면 NORMAL 가지 값이 n, else 가지 값이 h·l이다."""
    limits = [abs(int(v)) for v in LIMIT_TURN_RE.findall(text)]
    if not limits:
        return None
    if len(limits) == 1:
        return {"n": limits[0], "h": limits[0], "l": limits[0]}
    head = text.split("WinRuleSetLimitTurn", 1)[0]
    if "DIFFICULTY_NORMAL" in head:  # if NORMAL then <첫 값> else <둘째 값>
        return {"n": limits[0], "h": limits[1], "l": limits[1]}
    return {"n": limits[0], "h": limits[-1], "l": limits[-1]}


def build_notes(src: Path, out: Path) -> None:
    names = json.loads((out / "names" / "ko.json").read_text(encoding="utf-8"))
    _, chapter_rows = load_sheet(src / "gamedata" / "chapter.xml")
    chapters = {row["Cid"]: row for row in chapter_rows if row.get("Cid")}
    order, roster = chart_rosters(src)
    playable = {pid for pids in roster.values() for pid in pids}
    shops = shop_sections(src)
    unlocks = tutorial_unlocks(src, names)

    cids = all_chapters(src)
    ordered = [c for c in order if f"CID_{c}" in cids] + [
        c[len("CID_") :] for c in cids if c[len("CID_") :] not in order
    ]
    recruited, notes = set(), {}
    for key in ordered:
        cid = f"CID_{key}"
        row = chapters[cid]
        note = {"cid": cid}

        dispos = src / "dispos" / f"{expand(row.get('Dispos', '*'), key).lower()}.xml"
        on_map = set()
        if dispos.exists():
            drops, stocks = dispos_notes(dispos)
            note["drops"] = drops
            _, rows = load_sheet(dispos, 0)
            on_map = {r["Pid"] for r in rows if r.get("Pid") in playable}
        else:
            drops, stocks = {k: [] for k in DIFFICULTY_BITS}, []
            note["drops"] = drops

        text, bond = chapter_scripts(src, row)
        bodies = function_bodies(text)
        visits = {m.group(1): (int(m.group(2)), int(m.group(3))) for m in VISIT_RE.finditer(text)}
        visit_rewards, traps, outside = [], [], text
        for name, (x, y) in visits.items():
            body = bodies.get(name, "")
            outside = outside.replace(body, "\n")  # 민가 보상은 visitRewards가 소유 — 이벤트에서 뺀다
            rewards = [{"x": x, "y": y, "iid": iid} for iid in ITEM_GAIN_RE.findall(body)]
            rewards += [{"x": x, "y": y, "gold": int(g)} for g in GOLD_GAIN_RE.findall(body)]
            if rewards:
                visit_rewards += rewards
            else:
                traps.append({"x": x, "y": y})
        note["visitRewards"] = visit_rewards

        events, conditional = [], []
        for source, where in ((outside, "map"), (bond, "bond")):
            for gain in guarded_gains(source):
                if gain["condition"] is None:
                    events.append({"iid": gain["iid"], "where": where})
                else:
                    conditional.append({"condition": gain["condition"], "iid": gain["iid"], "where": where})
        note["eventRewards"] = events

        note["unlocks"] = unlocks.get(cid, [])
        note["shopNew"] = {
            label: shops[(label, key)] for label, _ in SHOP_SHEETS if (label, key) in shops
        }
        note["rings"] = {
            "gain": GOD_CREATE_RE.findall(text) + GOD_CREATE_RE.findall(bond),
            "lose": [g for g, v in GOD_ESCAPE_RE.findall(text + bond) if v == "true"],
            "regain": [g for g, v in GOD_ESCAPE_RE.findall(text + bond) if v == "false"],
        }

        joined = {pid for pid in on_map if pid not in recruited and pid not in roster.get(key, set())}
        for match in UNIT_JOIN_RE.finditer(text + bond):
            joined.update(pid for pid in QUOTED_RE.findall(match.group(1)) if pid.startswith("PID_"))
        recruited |= joined | roster.get(key, set())
        note["joins"] = sorted(joined)

        specials = {}
        if traps:
            specials["trapVisits"] = traps
        limits = turn_limits(text)
        if limits:
            specials["turnLimit"] = limits
        if stocks:
            specials["bossStock"] = stocks
        gold = sum(int(g) for g in GOLD_GAIN_RE.findall(text) + GOLD_GAIN_RE.findall(bond))
        gold -= sum(r.get("gold", 0) for r in visit_rewards)
        if gold:
            specials["gold"] = gold
        if conditional:
            specials["conditionalRewards"] = conditional
        note["specials"] = specials
        notes[key.lower()] = note

    write_json(out / "tables" / "chapternotes.json", notes)
    print(f"== build_notes: {len(notes)} chapters ==")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    build_notes(args.src, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
