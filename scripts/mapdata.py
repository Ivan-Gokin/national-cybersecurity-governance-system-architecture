"""Read the map's tables and the pinned register copy, check them, and compile one graph.

Used by scripts/validate.py (CI check) and scripts/build.py (the site's data/graph.json).
Only the Python standard library.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
REGISTER = ROOT / "vendor" / "register"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9._\-]*$")

COLUMNS = {
    "vocab.csv": ["vocab", "id", "label_uk", "label_en", "description_uk", "description_en"],
    "mandates.csv": ["id", "order", "name_uk", "name_en", "regime_uk", "regime_en", "description_uk", "description_en"],
    "actors.csv": ["id", "short_uk", "short_en", "name_uk", "name_en", "type", "level", "parent", "tier", "categories",
                   "grc_sectors", "confidence", "notes_uk", "notes_en", "last_verified"],
    "roles.csv": ["id", "actor", "role", "mandate", "act", "provision", "regime", "status", "confidence", "notes_uk", "notes_en"],
    "links.csv": ["id", "from", "to", "type", "act", "status", "confidence", "notes_uk", "notes_en"],
    "ncaf_clusters.csv": ["id", "name_uk", "name_en"],
    "ncaf_objectives.csv": ["id", "cluster", "name_uk", "name_en", "mandates", "subjects", "plan_2026", "notes_uk", "notes_en"],
    "flow_steps.csv": ["id", "stage", "actor", "activity_uk", "activity_en", "absent"],
    "flow_handoffs.csv": ["id", "from", "to", "ncaf", "rule_act", "notes_uk", "notes_en"],
    "expected_types.csv": ["id", "name_uk", "name_en", "basis_uk", "basis_en", "ncaf", "coverage", "actors", "confidence",
                           "notes_uk", "notes_en"],
}
PLAN_VALUES = {"unknown", "covered", "partial", "none", "na"}
# fields of a register row the site needs; everything else stays in the register
ACT_FIELDS = ["id", "register_no", "eli", "type", "number", "adopted", "short_ref_uk", "short_ref_en", "title_uk", "title_en",
              "description_uk", "description_en", "status", "role", "url", "last_verified"]


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return rows, reader.fieldnames or []


def many(v):
    return [x for x in (v or "").split(";") if x]


def load():
    """All tables, each row tagged with where it came from; plus errors found while reading."""
    errors = []
    t = {}
    for name, cols in COLUMNS.items():
        path = DATA / name
        if not path.exists():
            errors.append(f"{name}: file is missing")
            t[name] = []
            continue
        rows, fields = read(path)
        missing = [c for c in cols if c not in fields]
        if missing:
            errors.append(f"{name}: missing columns {', '.join(missing)}")
        for i, r in enumerate(rows, 2):
            r["_where"] = f"{name}:{i}"
        t[name] = rows
    t["meta"] = json.loads((DATA / "meta.json").read_text(encoding="utf-8"))
    lock_path = REGISTER / "lock.json"
    if not lock_path.exists():
        errors.append("vendor/register/lock.json is missing: run scripts/sync_register.py")
        t["register"], t["register_types"], t["register_relations"], t["register_sectors"], t["lock"] = [], [], [], [], {}
    else:
        t["lock"] = json.loads(lock_path.read_text(encoding="utf-8"))
        t["register"] = read(REGISTER / "sources.csv")[0]
        t["register_types"] = read(REGISTER / "source_types.csv")[0]
        t["register_relations"] = read(REGISTER / "source_relations.csv")[0]
        t["register_sectors"] = read(REGISTER / "sectors.csv")[0]
    return t, errors


def check(t):
    """Errors break the build; warnings are things to look at."""
    errors, warnings = [], []
    V = {}
    for r in t["vocab.csv"]:
        V.setdefault(r["vocab"], set()).add(r["id"])
    acts = {r["id"]: r for r in t["register"]}
    M = {r["id"] for r in t["mandates.csv"]}

    def unique(name, pattern=ID_RE):
        seen = set()
        for r in t[name]:
            rid = r.get("id", "")
            if pattern and not pattern.match(rid):
                errors.append(f"{r['_where']}: malformed id '{rid}'")
            if rid in seen:
                errors.append(f"{r['_where']}: duplicate id '{rid}'")
            seen.add(rid)
        return seen

    def need(r, col, allowed, label, blank_ok=False):
        v = r.get(col, "")
        if blank_ok and v == "":
            return
        if v not in allowed:
            errors.append(f"{r['_where']}: {col} '{v}' is not a known {label}")

    def need_many(r, col, allowed, label):
        for v in many(r.get(col)):
            if v not in allowed:
                errors.append(f"{r['_where']}: {col} '{v}' is not a known {label}")

    def need_act(r, col):
        a = r.get(col, "")
        if not a:
            return
        if a not in acts:
            errors.append(f"{r['_where']}: act '{a}' is not in the register copy (vendor/register); add it to the GRC foundation or re-sync")
        elif acts[a]["status"] == "repealed" and r.get("status", "in_force") == "in_force":
            warnings.append(f"{r['_where']}: cites '{a}', which the register marks as repealed")

    X = unique("actors.csv")
    unique("roles.csv")
    unique("links.csv", None)
    ST = unique("flow_steps.csv")
    unique("flow_handoffs.csv")
    unique("mandates.csv", re.compile(r"^[A-Z0-9]+$"))
    CL = {r["id"] for r in t["ncaf_clusters.csv"]}
    OB = {r["id"] for r in t["ncaf_objectives.csv"]}

    for r in t["actors.csv"]:
        need(r, "type", V.get("actor_type", set()), "actor type")
        need(r, "level", V.get("level", set()), "level")
        need(r, "tier", V.get("tier", set()), "tier")
        need(r, "parent", X, "actor", blank_ok=True)
        need_many(r, "categories", V.get("category", set()), "category")
        need_many(r, "grc_sectors", {s["id"] for s in t["register_sectors"]}, "GRC foundation sector")
        need(r, "confidence", V.get("confidence", set()), "confidence")
        if r["parent"] == r["id"]:
            errors.append(f"{r['_where']}: an actor cannot be its own parent")
    for r in t["roles.csv"]:
        need(r, "actor", X, "actor")
        need(r, "role", V.get("role", set()), "role")
        need(r, "mandate", M, "mandate")
        need(r, "regime", V.get("regime", set()), "regime")
        need(r, "status", V.get("status", set()), "status")
        need(r, "confidence", V.get("confidence", set()), "confidence")
        need_act(r, "act")
        if not r["act"]:
            warnings.append(f"{r['_where']}: role {r['id']} has no legal basis")
        if r["id"] != f"{r['actor']}.{r['role']}":
            errors.append(f"{r['_where']}: id must be '<actor>.<role>', got '{r['id']}'")
    for r in t["links.csv"]:
        need(r, "from", X, "actor")
        need(r, "to", X, "actor")
        need(r, "type", V.get("link_type", set()), "link type")
        need(r, "status", V.get("status", set()), "status")
        need(r, "confidence", V.get("confidence", set()), "confidence")
        need_act(r, "act")
        if r["from"] == r["to"]:
            errors.append(f"{r['_where']}: a link must join two different actors")
        if r["id"] != f"{r['from']}>{r['to']}:{r['type']}":
            errors.append(f"{r['_where']}: id must be '<from>><to>:<type>', got '{r['id']}'")
    for r in t["ncaf_objectives.csv"]:
        need(r, "cluster", CL, "cluster")
        need_many(r, "mandates", M, "mandate")
        need_many(r, "subjects", X, "actor")
        need(r, "plan_2026", PLAN_VALUES, "plan status")
    if len(t["ncaf_objectives.csv"]) != 20:
        errors.append(f"ncaf_objectives.csv: NCAF 2.0 has 20 objectives, found {len(t['ncaf_objectives.csv'])}")
    for r in t["flow_steps.csv"]:
        need(r, "stage", V.get("stage", set()), "stage")
        need(r, "actor", X, "actor")
        need(r, "absent", {"yes", ""}, "yes/blank")
    for r in t["flow_handoffs.csv"]:
        need(r, "from", ST, "flow step")
        need(r, "to", ST, "flow step")
        need(r, "ncaf", OB, "NCAF objective", blank_ok=True)
        need_act(r, "rule_act")

    unique("expected_types.csv")
    for r in t["expected_types.csv"]:
        need(r, "coverage", V.get("coverage", set()), "coverage")
        need_many(r, "actors", X, "actor")
        need(r, "ncaf", OB, "NCAF objective", blank_ok=True)
        need(r, "confidence", V.get("confidence", set()), "confidence")
        if r["coverage"] in ("present", "partial", "planned") and not r["actors"]:
            errors.append(f"{r['_where']}: coverage '{r['coverage']}' needs at least one actor")
    # a family of bodies (a body and its units) must not loop
    parent = {r["id"]: r["parent"] for r in t["actors.csv"]}
    for a in parent:
        seen, cur = set(), a
        while parent.get(cur):
            if cur in seen:
                errors.append(f"actors.csv: parent chain of '{a}' loops")
                break
            seen.add(cur)
            cur = parent[cur]

    used = ({r["actor"] for r in t["roles.csv"]} | {r["from"] for r in t["links.csv"]} | {r["to"] for r in t["links.csv"]}
            | {r["actor"] for r in t["flow_steps.csv"]})
    for r in t["actors.csv"]:
        if r["id"] not in used:
            warnings.append(f"{r['_where']}: actor {r['id']} has no role, link or flow step")
    unchecked = sum(1 for n in ("actors.csv", "roles.csv", "links.csv") for r in t[n] if r.get("confidence") != "high")
    if unchecked:
        warnings.append(f"{unchecked} rows in actors, roles and links are not yet checked against the act (confidence other than 'high')")
    cited = {r["act"] for r in t["roles.csv"] + t["links.csv"] if r["act"]} | {r["rule_act"] for r in t["flow_handoffs.csv"] if r["rule_act"]}
    unverified = sorted(a for a in cited if a in acts and not acts[a]["last_verified"])
    if unverified:
        warnings.append(f"{len(unverified)} cited acts have no last_verified date in the register")
    for k in ("version", "date"):
        if not t["meta"].get(k):
            errors.append(f"meta.json: '{k}' is missing")
    return errors, warnings


def strip(rows):
    return [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]


def graph(t):
    """One JSON document with everything the site shows: the map's tables plus the cited acts from the register."""
    cited = ({r["act"] for r in t["roles.csv"] + t["links.csv"] if r["act"]}
             | {r["rule_act"] for r in t["flow_handoffs.csv"] if r["rule_act"]})
    types = {r["id"]: r for r in t["register_types"]}
    acts = []
    for r in t["register"]:
        if r["id"] in cited:
            a = {k: r.get(k, "") for k in ACT_FIELDS}
            ty = types.get(r["type"], {})
            a["type_uk"], a["type_en"] = ty.get("label_uk", ""), ty.get("label_en", "")
            acts.append(a)
    acts.sort(key=lambda a: int(a["register_no"] or 0))
    relations = [{k: r[k] for k in ("source_id", "relation", "related_id")} for r in t["register_relations"]
                 if r["source_id"] in cited and r["related_id"] in cited]
    vocab = {}
    for r in t["vocab.csv"]:
        vocab.setdefault(r["vocab"], []).append({k: r[k] for k in ("id", "label_uk", "label_en", "description_uk", "description_en")})
    lock = t["lock"]
    return {
        "meta": {**t["meta"], "register": {"repo": lock.get("repo", ""), "commit": lock.get("commit", ""),
                                           "data_version": lock.get("data_version", "")}},
        "vocab": vocab,
        "mandates": strip(sorted(t["mandates.csv"], key=lambda r: int(r["order"]))),
        "actors": strip(t["actors.csv"]),
        "roles": strip(t["roles.csv"]),
        "links": strip(t["links.csv"]),
        "acts": acts,
        "act_relations": relations,
        "ncaf_clusters": strip(t["ncaf_clusters.csv"]),
        "ncaf_objectives": strip(t["ncaf_objectives.csv"]),
        "flow_steps": strip(t["flow_steps.csv"]),
        "flow_handoffs": strip(t["flow_handoffs.csv"]),
        "expected_types": strip(t["expected_types.csv"]),
        "grc_sectors": [{k: r[k] for k in ("id", "label_uk", "label_en")} for r in t["register_sectors"]
                        if r["id"] in {x for a in t["actors.csv"] for x in many(a["grc_sectors"])}],
    }
