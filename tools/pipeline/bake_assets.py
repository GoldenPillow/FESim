#!/usr/bin/env python3
"""Bake FE Engage map unit icons (index texture + palette) and face thumbnails into WebP + manifest."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import UnityPy
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
DEFAULT_ROMFS = Path.home() / "fesim_data" / "romfs"
DEFAULT_DATA = REPO / "data" / "fe17"
DEFAULT_DUMP = Path.home() / "fesim_data" / "extracted" / "m1_assets_png"

FORCE_PALETTE = {
    "p": ("800SoldierMB", "850SoldierFB"),
    "e": ("800SoldierMR", "850SoldierFR"),
}

# items.json Kind -> map icon weapon token (Kind >= 10 is not a weapon)
KIND_WEAPON = {
    1: "Sword", 2: "Lance", 3: "Ax", 4: "Bow", 5: "Knife",
    6: "MagicBook", 7: "Staff", 8: "Scroll", 9: "Special",
}


def load_sprites(bundle: Path) -> dict:
    env = UnityPy.load(str(bundle))
    return {o.read().m_Name: o for o in env.objects if o.type.name == "Sprite"}


def palette_table(obj) -> np.ndarray:
    """512x1 sprite = 256 palette entries duplicated 2x horizontally."""
    return np.array(obj.read().image.convert("RGBA"))[0][::2]


def render_icon(index_obj, palette: np.ndarray) -> Image.Image:
    idx = np.array(index_obj.read().image.convert("RGB"))[:, :, 0]
    return Image.fromarray(palette[idx].astype("uint8"), "RGBA")


def split_name(name: str):
    parts = name.split("_")
    return parts[0], "_".join(parts[1:-1]), parts[-1]


def write_webp(img: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="WEBP", lossless=True, quality=100, method=6)


def job_icon(job: dict, gender: int) -> str:
    male, female = job.get("UnitIconID_M") or "", job.get("UnitIconID_F") or ""
    primary, fallback = (male, female) if gender == 1 else (female, male)
    return primary or fallback


def equipped_weapon(iids, items: dict, available) -> tuple[str | None, str | None]:
    """첫 무기 아이템의 Kind -> 토큰. 해당 병과에 없는 토큰이면 건너뛴다."""
    for iid in iids:
        token = KIND_WEAPON.get(items.get(iid, {}).get("Kind", 0))
        if token and token in available:
            return token, iid
    return None, None


def chapter_units(chapter: dict, persons: dict, jobs: dict):
    seen = {}
    for group in chapter["groups"]:
        for unit in group["units"]:
            key = (unit["pid"], unit["jid"])
            if key in seen:
                continue
            person, job = persons.get(unit["pid"]), jobs.get(unit["jid"])
            if person is None or job is None:
                continue
            seen[key] = {
                "pid": unit["pid"],
                "jid": unit["jid"],
                "palette": person.get("UnitIconID") or "",
                "jobIcon": job_icon(job, person.get("Gender", 1)),
                "weapon": job.get("UnitIconWeaponID") or "NoWeapon",
                "iids": [i["iid"] for i in unit.get("items", [])],
                "gender": "m" if person.get("Gender", 1) == 1 else "f",
                "face": (person.get("Name") or "").removeprefix("MPID_"),
            }
    return list(seen.values())


def load_assets(romfs: Path) -> dict:
    """번들 로드는 챕터마다 반복할 이유가 없다 — 전수 베이크(--all)에서 54회 재파싱을 피한다."""
    unit_root = romfs / "ui_icon" / "unit"
    indexes = load_sprites(unit_root / "unitindexes.bundle")
    by_pair = {}
    for name in indexes:
        pal, icon, weapon = split_name(name)
        by_pair.setdefault((pal, icon), {})[weapon] = name
    return {
        "indexes": indexes,
        "palettes": {n: palette_table(o) for n, o in load_sprites(unit_root / "unitpallettes.bundle").items()},
        "faces": load_sprites(romfs / "ui_facethumb" / "facethumb.bundle"),
        "by_pair": by_pair,
    }


def bake(args, chapter_name: str, assets: dict) -> int:
    data = args.data
    chapter_path = data / "chapters" / f"{chapter_name.lower()}.json"
    if not chapter_path.is_file():
        print(f"chapter not found: {chapter_path}", file=sys.stderr)
        return 2

    chapter = json.loads(chapter_path.read_text(encoding="utf-8"))
    persons = json.loads((data / "tables" / "persons.json").read_text(encoding="utf-8"))
    jobs = json.loads((data / "tables" / "jobs.json").read_text(encoding="utf-8"))
    items = json.loads((data / "tables" / "items.json").read_text(encoding="utf-8"))

    indexes, palettes = assets["indexes"], assets["palettes"]
    faces, by_pair = assets["faces"], assets["by_pair"]

    icon_dir = data / "assets" / "mapicons"
    face_dir = data / "assets" / "faces"
    manifest_path = data / "assets" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    manifest.setdefault("mapicons", {}).setdefault("byPid", {})
    manifest["mapicons"].setdefault("byJid", {})
    manifest.setdefault("faces", {})
    chapters = [c for c in manifest.get("chapters", []) if c != chapter["cid"]] + [chapter["cid"]]
    missing = {k: v for k, v in manifest.get("missing", {}).items()
               if k.startswith("CID_") and k != chapter["cid"]}
    missing[chapter["cid"]] = {"mapicons": [], "faces": []}
    manifest.update({
        "game": "fe17",
        "chapters": sorted(chapters),
        "missing": dict(sorted(missing.items())),
    })
    manifest["mapicons"]["rule"] = (
        "sprite = <palette>_<jobIcon>_<weapon>; palette = persons.UnitIconID "
        "(E suffix = Engage form, NOT enemy); jobIcon = jobs.UnitIconID_M|_F by persons.Gender; "
        "weapon = jobs.UnitIconWeaponID or the unit's equipped weapon class. "
        "Named units carry their own palette and are not force-tinted; "
        "generic soldiers are force-tinted via palette (B=player, R=enemy, G=ally, Y=other, N=neutral)."
    )
    chapter_missing = manifest["missing"][chapter["cid"]]

    baked_icons = 0
    for unit in chapter_units(chapter, persons, jobs):
        variants = by_pair.get((unit["palette"], unit["jobIcon"]), {})
        if not variants:
            chapter_missing["mapicons"].append(f'{unit["pid"]}/{unit["jid"]}')
        token, iid = equipped_weapon(unit["iids"], items, variants)
        source = "equipped"
        if token is None:
            token, source = (unit["weapon"], "job") if unit["weapon"] in variants else (next(iter(sorted(variants)), None), "fallback")
        entry = {
            "palette": unit["palette"],
            "jobIcon": unit["jobIcon"],
            "defaultWeapon": token,
            "defaultWeaponSource": source,
            "equippedIid": iid,
            "forceTinted": False,
            "weapons": {},
        }
        for weapon, sprite in sorted(variants.items()):
            rel = f"assets/mapicons/{sprite}.webp"
            dest = data / "assets" / "mapicons" / f"{sprite}.webp"
            if not dest.is_file():
                write_webp(render_icon(indexes[sprite], palettes[unit["palette"]]), dest)
                baked_icons += 1
            entry["weapons"][weapon] = rel
        manifest["mapicons"]["byPid"][unit["pid"]] = entry

        jid_entry = manifest["mapicons"]["byJid"].setdefault(unit["jid"], {})
        for gender, slot in (("m", 0), ("f", 1)):
            icon = job_icon(jobs[unit["jid"]], 1 if gender == "m" else 2)
            slot_entry = jid_entry.setdefault(gender, {"jobIcon": icon, "forceTinted": True, "weapons": {}})
            for force, pal_pair in FORCE_PALETTE.items():
                pal = pal_pair[slot]
                for weapon, sprite in sorted(by_pair.get((pal, icon), {}).items()):
                    ident = f"{icon}_{weapon}_{force}"
                    dest = icon_dir / f"{ident}.webp"
                    if not dest.is_file():
                        write_webp(render_icon(indexes[sprite], palettes[pal]), dest)
                        baked_icons += 1
                    slot_entry["weapons"].setdefault(weapon, {})[force] = f"assets/mapicons/{ident}.webp"

        key = unit["face"]
        if key in faces:
            dest = face_dir / f"{key}.webp"
            if not dest.is_file():
                write_webp(faces[key].read().image.convert("RGBA"), dest)
            manifest["faces"][unit["pid"]] = f"assets/faces/{key}.webp"
        else:
            chapter_missing["faces"].append(f'{unit["pid"]}({key})')

    manifest["mapicons"]["byPid"] = dict(sorted(manifest["mapicons"]["byPid"].items()))
    manifest["mapicons"]["byJid"] = dict(sorted(manifest["mapicons"]["byJid"].items()))
    manifest["faces"] = dict(sorted(manifest["faces"].items()))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"{chapter['cid']} mapicons: {len(list(icon_dir.glob('*.webp')))} files ({baked_icons} new)")
    print(f"{chapter['cid']} faces: {len(list(face_dir.glob('*.webp')))} files")
    for kind, names in chapter_missing.items():
        if names:
            print(f"missing {kind}: {names}")
    return 0


def bake_gods(data: Path, faces: dict) -> int:
    """문장사(엠블렘) 초상 — 챕터가 아니라 gods.json 전수를 한 번에 굽는다.

    인물 얼굴은 pid 키인데 엠블렘은 인물이 아니라 GID다 — 같은 표에 못 넣어 godFaces를 따로 둔다.
    스프라이트 이름 = AsciiName 우선, 없으면 FaceIconName의 "Face_" 접두를 뗀 것.
    """
    gods_path = data / "tables" / "gods.json"
    if not gods_path.is_file():
        print(f"gods table not found: {gods_path}", file=sys.stderr)
        return 2
    gods = json.loads(gods_path.read_text(encoding="utf-8"))["gods"]
    face_dir = data / "assets" / "faces"
    manifest_path = data / "assets" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}

    resolved, missing, baked = {}, [], 0
    for gid, god in gods.items():
        for key in (god.get("AsciiName") or "", (god.get("FaceIconName") or "").removeprefix("Face_")):
            if key in faces:
                dest = face_dir / f"{key}.webp"
                if not dest.is_file():
                    write_webp(faces[key].read().image.convert("RGBA"), dest)
                    baked += 1
                resolved[gid] = f"assets/faces/{key}.webp"
                break
        else:
            missing.append(f'{gid}({god.get("AsciiName")})')

    manifest["godFaces"] = dict(sorted(resolved.items()))
    manifest["godFacesMissing"] = sorted(missing)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"gods: {len(resolved)}/{len(gods)} faces ({baked} new)")
    if missing:
        print(f"missing godFaces: {missing}")
    return 0


def bake_roster_faces(data: Path, faces: dict) -> None:
    """챕터 dispos에 등장하지 않는 플레이어블(사룡의 장 보상 합류 5인) 얼굴 보강.

    챕터 단위 베이크는 dispos 출현 유닛만 훑어 이들의 정본 pid가 영영 빠진다 —
    빌더 로스터(apps/web fe17.ts builderPropsFor의 명시 5인)와 같은 목록을 정본 pid로 직결 등재한다.
    (2026-08-31, 라팔 얼굴 결손이 발단 — 스프라이트 Rafale는 번들에 실재했다.)
    """
    persons = json.loads((data / "tables" / "persons.json").read_text(encoding="utf-8"))
    manifest_path = data / "assets" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    face_dir = data / "assets" / "faces"
    for pid in ("PID_エル", "PID_ラファール", "PID_セレスティア", "PID_グレゴリー", "PID_マデリーン"):
        person = persons.get(pid)
        if person is None:
            continue
        key = (person.get("Name") or "").removeprefix("MPID_")
        if key not in faces:
            print(f"roster face missing in bundle: {pid}({key})", file=sys.stderr)
            continue
        dest = face_dir / f"{key}.webp"
        if not dest.is_file():
            write_webp(faces[key].read().image.convert("RGBA"), dest)
        manifest.setdefault("faces", {})[pid] = f"assets/faces/{key}.webp"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chapter", default="M002")
    parser.add_argument("--all", action="store_true", help="chapterlist.json의 전 챕터 베이크")
    parser.add_argument("--romfs", type=Path, default=DEFAULT_ROMFS)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--dump-png", type=Path, nargs="?", const=DEFAULT_DUMP, default=None)
    args = parser.parse_args()

    chapters = [args.chapter]
    if args.all:
        listing = args.data / "tables" / "chapterlist.json"
        if not listing.is_file():
            print(f"chapterlist not found: {listing} (먼저 ./dev transform --tables)", file=sys.stderr)
            return 2
        # chapterlist cid = "CID_M002" 형식 — 챕터 파일명(m002.json)은 접두 없는 꼬리를 쓴다.
        chapters = [e["cid"].removeprefix("CID_") for e in json.loads(listing.read_text(encoding="utf-8"))]

    assets = load_assets(args.romfs)
    failed = bake_gods(args.data, assets["faces"])
    bake_roster_faces(args.data, assets["faces"])
    for chapter in chapters:
        failed += 1 if bake(args, chapter, assets) else 0

    if args.dump_png:
        args.dump_png.mkdir(parents=True, exist_ok=True)
        for src in sorted((args.data / "assets" / "mapicons").glob("*.webp")) + \
                sorted((args.data / "assets" / "faces").glob("*.webp")):
            Image.open(src).save(args.dump_png / f"{src.stem}.png")

    if args.all:
        print(f"== bake --all: {len(chapters) - failed}/{len(chapters)} chapters ==")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
