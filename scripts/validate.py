#!/usr/bin/env python3
"""Validate the map's data in data/ against itself and against the pinned register copy in vendor/register/.

Errors (exit code 1): missing columns, duplicate or malformed IDs, references to actors, acts or steps that do not
exist, values outside the vocabularies in data/vocab.csv.
Warnings (exit code 0): rows a maintainer should look at, e.g. rows not yet checked against the act.

Usage:  python3 scripts/validate.py            # validate
        python3 scripts/validate.py --stats    # also print counts
"""
import sys
from collections import Counter

import mapdata


def main():
    t, errors = mapdata.load()
    e2, warnings = mapdata.check(t) if not errors else ([], [])
    errors += e2
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    if "--stats" in sys.argv and not errors:
        lock = t["lock"]
        print(f"\nregister {lock.get('repo')}@{lock.get('commit', '')[:7]}, data version {lock.get('data_version')}")
        print(f"{len(t['actor'])} actors, {len(t['role'])} roles, {len(t['link'])} links, {len(t['capability'])} functions, "
              f"{len(t['realization'])} performances, {len(mapdata.cited(t))} acts cited")
        print("frameworks:", dict(Counter(r["framework"] for r in t["item"])))
        print("functions by spine framework:", dict(Counter(r["spine"].split(":")[0] for r in t["capability"])))
        print("roles by mandate:", dict(sorted(Counter(r["mandate"] for r in t["role"]).items())))
        print("links by type:", dict(sorted(Counter(r["type"] for r in t["link"]).items())))
        print("confidence:", dict(Counter(r["confidence"] for n in ("actor", "role", "link", "realization") for r in t[n])))
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
