#!/usr/bin/env python3
"""Copy the register of acts from the GRC foundation at a fixed commit into vendor/register/.

The map keeps no list of acts of its own: roles and links cite acts by their register id (`ua-law-2163-viii`), and
the build reads titles, status, dates and links from this copy. The copy is committed, so every change of the
register version shows up as a reviewable diff and the map can always be rebuilt as it was.

Usage:  python3 scripts/sync_register.py                 # refresh the copy at the ref in vendor/register/lock.json
        python3 scripts/sync_register.py --ref main      # move to the current main (or any branch, tag or commit)
"""
import argparse
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "vendor" / "register"
LOCK = DEST / "lock.json"
FILES = ["sources.csv", "source_types.csv", "source_relations.csv", "sectors.csv", "meta.json"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ncgsa-register-sync"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", help="branch, tag or commit of the GRC foundation to pin")
    args = ap.parse_args()
    lock = json.loads(LOCK.read_text(encoding="utf-8")) if LOCK.exists() else {"repo": "Ivan-Gokin/grc-foundation-ua"}
    ref = args.ref or lock.get("commit") or "main"
    # resolve a branch or tag to the commit it points at, so the lock always names an exact state
    info = json.loads(fetch(f"https://api.github.com/repos/{lock['repo']}/commits/{ref}"))
    commit = info["sha"]
    DEST.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        (DEST / name).write_bytes(fetch(f"https://raw.githubusercontent.com/{lock['repo']}/{commit}/data/{name}"))
    meta = json.loads((DEST / "meta.json").read_text(encoding="utf-8"))
    lock.update(commit=commit, ref=ref, data_version=meta.get("version", ""), committed=info["commit"]["committer"]["date"])
    LOCK.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"register {lock['repo']}@{commit[:7]} ({ref}), data version {lock['data_version']}")


if __name__ == "__main__":
    main()
