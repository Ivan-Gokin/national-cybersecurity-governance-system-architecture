#!/usr/bin/env python3
"""Build the site into _site/ for GitHub Pages. CI runs it on every push to main and publishes the result.

What it adds to the files kept in the repository (nothing generated is stored in git):
  data/graph.json               the map's tables and the acts they cite, in one document the site reads
  data/cybersecurity-governance-data.zip   the CSV tables, the register lock and the licence, in one download

Usage:  python3 scripts/build.py            # then: python3 -m http.server 8000 -d _site
"""
import json
import shutil
import sys
import zipfile

import mapdata

ROOT = mapdata.ROOT
OUT = ROOT / "_site"
COPY = ["index.html", "404.html", "assets", "content", "data", "LICENSE"]


def main():
    t, errors = mapdata.load()
    if not errors:
        errors, _ = mapdata.check(t)
    if errors:
        print("\n".join("ERROR: " + e for e in errors))
        sys.exit("build stopped: run scripts/validate.py")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in COPY:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, OUT / name)
        elif src.exists():
            shutil.copy2(src, OUT / name)
    (OUT / ".nojekyll").write_text("")
    g = mapdata.graph(t)
    (OUT / "data" / "graph.json").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    with zipfile.ZipFile(OUT / "data" / "cybersecurity-governance-data.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted((ROOT / "data").iterdir()):
            if f.suffix in (".csv", ".json"):
                z.write(f, f.name)
        z.write(ROOT / "vendor" / "register" / "lock.json", "register-lock.json")
        z.write(ROOT / "LICENSE", "LICENSE")
    print(f"built {OUT}: {len(g['actors'])} actors, {len(g['roles'])} roles, {len(g['links'])} links, {len(g['acts'])} acts")


if __name__ == "__main__":
    main()
