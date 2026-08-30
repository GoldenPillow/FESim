#!/usr/bin/env python3
"""Extract FE Engage romfs bundles into plain files (XML / JSON / Lua / MSBT).

Output stays outside the repo by default: rip-derived originals must not be committed.
"""

import argparse
import json
import sys
from pathlib import Path

import UnityPy

DEFAULT_SRC = Path.home() / "fesim_data" / "romfs"
DEFAULT_OUT = Path.home() / "fesim_data" / "extracted"


def text_bytes(text_asset) -> bytes:
    script = text_asset.m_Script
    if isinstance(script, str):
        return script.encode("utf-8", "surrogateescape")
    return bytes(script)


def first_object(bundle: Path, type_name: str):
    env = UnityPy.load(str(bundle))
    for obj in env.objects:
        if obj.type.name == type_name:
            return obj
    return None


def dump_text(bundle: Path, dest: Path) -> bool:
    obj = first_object(bundle, "TextAsset")
    if obj is None:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(text_bytes(obj.read()))
    return True


def dump_typetree(bundle: Path, dest: Path) -> bool:
    obj = first_object(bundle, "MonoBehaviour")
    if obj is None:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(obj.read_typetree(), ensure_ascii=False, indent=1), encoding="utf-8")
    return True


def strip_suffixes(name: str, *suffixes: str) -> str:
    for suffix in suffixes:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def run_group(label: str, jobs, dumper) -> dict:
    ok, failed = 0, []
    for bundle, dest in jobs:
        try:
            if dumper(bundle, dest):
                ok += 1
            else:
                failed.append((bundle.name, "no matching object"))
        except Exception as exc:  # noqa: BLE001 - report and continue
            failed.append((bundle.name, repr(exc)))
    print(f"{label}: {ok} ok, {len(failed)} failed")
    for name, why in failed:
        print(f"  ! {name}: {why}")
    return {"ok": ok, "failed": failed}


def gamedata_jobs(src: Path, out: Path):
    root = src / "fe_assets_gamedata"
    for bundle in sorted(root.glob("*.xml.bundle")):
        yield bundle, out / "gamedata" / (strip_suffixes(bundle.name, ".xml.bundle") + ".xml")


def dispos_jobs(src: Path, out: Path):
    for bundle in sorted((src / "fe_assets_gamedata" / "dispos").glob("*.xml.bundle")):
        yield bundle, out / "dispos" / (strip_suffixes(bundle.name, ".xml.bundle") + ".xml")


def terrains_jobs(src: Path, out: Path):
    for bundle in sorted((src / "fe_assets_gamedata" / "terrains").glob("*.bundle")):
        yield bundle, out / "terrains" / (strip_suffixes(bundle.name, ".bundle") + ".json")


def scripts_jobs(src: Path, out: Path):
    for bundle in sorted((src / "fe_assets_scripts").glob("*.txt.bundle")):
        yield bundle, out / "scripts" / (strip_suffixes(bundle.name, ".txt.bundle") + ".txt")


def message_jobs(src: Path, out: Path, regions=("us", "kr", "jp")):
    for region in regions:
        region_dir = src / "fe_assets_message" / region
        for bundle in sorted(region_dir.rglob("*.bundle")):
            rel = bundle.relative_to(region_dir).parent
            name = strip_suffixes(bundle.name, ".bytes.bundle", ".bundle") + ".msbt"
            yield bundle, out / "message" / region / rel / name


GROUPS = {
    "gamedata": (gamedata_jobs, dump_text),
    "dispos": (dispos_jobs, dump_text),
    "terrains": (terrains_jobs, dump_typetree),
    "scripts": (scripts_jobs, dump_text),
    "message": (message_jobs, dump_text),
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC, help="romfs root")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output root")
    parser.add_argument("--only", choices=sorted(GROUPS), action="append", help="limit to a group")
    args = parser.parse_args()

    if not args.src.is_dir():
        print(f"src not found: {args.src}", file=sys.stderr)
        return 2

    selected = args.only or sorted(GROUPS)
    failures = 0
    for label in selected:
        jobs_fn, dumper = GROUPS[label]
        result = run_group(label, jobs_fn(args.src, args.out), dumper)
        failures += len(result["failed"])
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
