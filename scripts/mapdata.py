"""Read the map's tables and the pinned register copy, check them, and compile one graph.

One schema (SCHEMA below) describes every table: its key, its columns and what each reference column points to.
The checks, the build and the site's "Data model" page are all driven by it, so a table, a reference or a derived fact
is defined in exactly one place. Used by scripts/validate.py (CI check) and scripts/build.py (the site's data/graph.json).
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
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
# fields of a register row the site needs; everything else stays in the register
ACT_FIELDS = ["id", "register_no", "eli", "type", "number", "adopted", "short_ref_uk", "short_ref_en", "title_uk", "title_en",
              "description_uk", "description_en", "status", "role", "url", "last_verified"]

# ------------------------------------------------------------------ the schema
# layer: "frameworks" (reference frameworks, read as given), "model" (the map itself), "support" (vocabularies, sources).
# refs: column -> (target, many, blank_ok). Targets are entity names, "vocab:<kind>", "act" (the register) or "sector"
# (the GRC foundation's sectors). "item:<framework>" restricts a reference to one framework.
SCHEMA = {
    "framework": {"file": "frameworks.csv", "layer": "frameworks", "key": "id",
                  "cols": ["id", "name_uk", "name_en", "short_uk", "short_en", "publisher_uk", "publisher_en", "year", "url", "role",
                           "description_uk", "description_en"],
                  "refs": {"role": ("vocab:fw_role", False, False)},
                  "uk": "Рамка", "en": "Framework",
                  "about_uk": "Визнана рамка, на яку спирається карта: NCAF 2.0 — хребет, мандати Клімбурґа, NIST CSF і ОТМ — відповідності.",
                  "about_en": "A recognised framework the map rests on: NCAF 2.0 is the spine; Klimburg's mandates, NIST CSF and the OTM are crosswalks."},
    "item": {"file": "framework_items.csv", "layer": "frameworks", "key": "id",
             "cols": ["id", "framework", "parent", "code", "order", "name_uk", "name_en", "description_uk", "description_en", "notes_uk", "notes_en"],
             "refs": {"framework": ("framework", False, False), "parent": ("item", False, True)},
             "uk": "Елемент рамки", "en": "Framework item",
             "about_uk": "Кластер чи ціль NCAF, функція CSF, положення ОТМ. Мандати Клімбурґа додаються з mandates.csv.",
             "about_en": "An NCAF cluster or objective, a CSF function, a provision of the OTM. Klimburg's mandates are added from mandates.csv."},
    "mandate": {"file": "mandates.csv", "layer": "frameworks", "key": "id",
                "cols": ["id", "order", "name_uk", "name_en", "regime_uk", "regime_en", "description_uk", "description_en"], "refs": {},
                "uk": "Мандат", "en": "Mandate",
                "about_uk": "П'ять мандатів Клімбурґа і дві службові колонки: тип державної влади, якою діє роль.",
                "about_en": "Klimburg's five mandates plus two service columns: the type of state authority a role acts under."},
    "actor": {"file": "actors.csv", "layer": "model", "key": "id",
              "cols": ["id", "short_uk", "short_en", "name_uk", "name_en", "type", "level", "parent", "tier", "categories", "grc_sectors",
                       "confidence", "notes_uk", "notes_en", "last_verified", "valid_from", "valid_to"],
              "refs": {"type": ("vocab:actor_type", False, False), "level": ("vocab:level", False, False), "tier": ("vocab:tier", False, False),
                       "parent": ("actor", False, True), "categories": ("vocab:category", True, True), "grc_sectors": ("sector", True, True),
                       "confidence": ("vocab:confidence", False, False)},
              "uk": "Суб'єкт", "en": "Actor",
              "about_uk": "Орган, підрозділ, команда реагування, майданчик, клас організацій або міжнародний партнер.",
              "about_en": "A body, unit, response team, platform, class of organisations or international partner."},
    "role": {"file": "roles.csv", "layer": "model", "key": "id",
             "cols": ["id", "actor", "role", "mandate", "act", "provision", "regime", "status", "confidence", "notes_uk", "notes_en", "valid_from", "valid_to"],
             "refs": {"actor": ("actor", False, False), "role": ("vocab:role", False, False), "mandate": ("mandate", False, False),
                      "act": ("act", False, True), "regime": ("vocab:regime", False, False), "status": ("vocab:status", False, False),
                      "confidence": ("vocab:confidence", False, False)},
              "uk": "Роль", "en": "Role",
             "about_uk": "Повноваження суб'єкта: що він може робити, якою владою (мандат) і на якій правовій підставі.",
             "about_en": "An actor's power: what it may do, under which authority (mandate) and on which legal basis."},
    "link": {"file": "links.csv", "layer": "model", "key": "id",
             "cols": ["id", "from", "to", "type", "act", "status", "confidence", "notes_uk", "notes_en", "valid_from", "valid_to"],
             "refs": {"from": ("actor", False, False), "to": ("actor", False, False), "type": ("vocab:link_type", False, False),
                      "act": ("act", False, True), "status": ("vocab:status", False, False), "confidence": ("vocab:confidence", False, False)},
             "uk": "Зв'язок", "en": "Link",
             "about_uk": "Типізоване відношення між двома суб'єктами з правовою підставою: підпорядкування, нагляд, звітність тощо.",
             "about_en": "A typed relation between two actors with a legal basis: subordination, oversight, reporting and so on."},
    "capability": {"file": "capabilities.csv", "layer": "model", "key": "id",
                   "cols": ["id", "spine", "name_uk", "name_en", "description_uk", "description_en", "also", "refs", "notes_uk", "notes_en"],
                   "refs": {"spine": ("item", False, False), "also": ("item", True, True), "refs": ("ref", True, True)},
                   "uk": "Функція", "en": "Function",
                   "about_uk": "Що система має вміти. Належить одній цілі NCAF 2.0 (або мандату, де NCAF сліпий) і відповідає елементам інших рамок.",
                   "about_en": "What the system must be able to do. Belongs to one NCAF 2.0 objective (or a mandate where the NCAF is blind) and maps to items of other frameworks."},
    "realization": {"file": "realizations.csv", "layer": "model", "key": "id",
                    "cols": ["id", "capability", "actor", "part", "role", "act", "provision", "confidence", "notes_uk", "notes_en"],
                    "refs": {"capability": ("capability", False, False), "actor": ("actor", False, False), "part": ("vocab:part", False, False),
                             "role": ("role", False, True), "act": ("act", False, True), "confidence": ("vocab:confidence", False, False)},
                    "uk": "Виконання функції", "en": "Performance of a function",
                    "about_uk": "Хто виконує функцію, у якій частині, через яку роль (владу) і за яким актом (інструментом).",
                    "about_en": "Who performs a function, in what part, through which role (authority) and under which act (instrument)."},
    "type": {"file": "expected_types.csv", "layer": "model", "key": "id",
             "cols": ["id", "name_uk", "name_en", "basis_uk", "basis_en", "capability", "coverage", "actors", "confidence", "notes_uk", "notes_en"],
             "refs": {"capability": ("capability", False, True), "coverage": ("vocab:coverage", False, False), "actors": ("actor", True, True),
                      "confidence": ("vocab:confidence", False, False)},
             "uk": "Типовий орган", "en": "Expected institution type",
             "about_uk": "Тип органу, який очікують у національній системі, і чи є він в Україні. Ціль NCAF виводиться з функції.",
             "about_en": "A type of body a national system is expected to have, and whether Ukraine has one. Its NCAF objective follows from its function."},
    "step": {"file": "flow_steps.csv", "layer": "model", "key": "id",
             "cols": ["id", "stage", "actor", "capability", "activity_uk", "activity_en", "absent"],
             "refs": {"stage": ("vocab:stage", False, False), "actor": ("actor", False, False), "capability": ("capability", False, False)},
             "uk": "Крок процесу", "en": "Process step",
             "about_uk": "Крок шляху інциденту: хто на якій стадії виконує яку функцію.",
             "about_en": "A step on the incident path: who performs which function at which stage."},
    "handoff": {"file": "flow_handoffs.csv", "layer": "model", "key": "id",
                "cols": ["id", "from", "to", "objective", "rule_act", "notes_uk", "notes_en"],
                "refs": {"from": ("step", False, False), "to": ("step", False, False), "objective": ("item:ncaf2", False, True),
                         "rule_act": ("act", False, True)},
                "uk": "Передача", "en": "Handover",
                "about_uk": "Передача справи між кроками різних суб'єктів і правило, що її врегульовує.",
                "about_en": "A case passing between steps of different actors, and the rule that governs it."},
    "question": {"file": "questions.csv", "layer": "frameworks", "key": "id",
                 "cols": ["id", "zachman", "level", "viewpoints", "frameworks", "entities", "href", "status", "question_uk", "question_en",
                          "answer_uk", "answer_en"],
                 "refs": {"zachman": ("vocab:zachman", False, False), "level": ("vocab:zlevel", False, False),
                          "viewpoints": ("vocab:viewpoint", True, False), "frameworks": ("framework", True, True),
                          "entities": ("entity", True, False), "status": ("vocab:qstatus", False, False)},
                 "uk": "Питання", "en": "Question",
                 "about_uk": "Що карта має розповісти: питання за Захманом (що, як, де, хто, коли, чому) на рівні системи, установи й організації, рамка, що дає основу відповіді, і вигляд, де її видно.",
                 "about_en": "What the map must tell: Zachman's questions (what, how, where, who, when, why) at the level of the system, an institution and an organisation, the framework that grounds the answer and the view that shows it."},
    "ref": {"file": "refs.csv", "layer": "support", "key": "id",
            "cols": ["id", "title_uk", "title_en", "publisher_uk", "publisher_en", "url", "notes_uk", "notes_en"], "refs": {},
            "uk": "Вторинне джерело", "en": "Secondary source",
            "about_uk": "Пояснення, коментарі і звіти, на які спирається карта, крім актів.",
            "about_en": "Explainers, commentaries and reports the map relies on, other than acts."},
    "vocab": {"file": "vocab.csv", "layer": "support", "key": None,
              "cols": ["vocab", "id", "label_uk", "label_en", "description_uk", "description_en"], "refs": {},
              "uk": "Довідник", "en": "Vocabulary",
              "about_uk": "Допустимі значення: рівні, типи, ролі, типи зв'язків, статуси, рівні достовірності.",
              "about_en": "Allowed values: levels, types, roles, link types, statuses, confidence levels."},
}
# Facts the site computes from the tables instead of storing them twice
DERIVED = [
    ("objective_subjects", "Хто відповідає за ціль NCAF", "Who is responsible for an NCAF objective",
     "відповідальні за функції цієї цілі (realization.part = lead)", "those leading the objective's functions (realization.part = lead)"),
    ("objective_mandates", "У яких мандатах лежить ціль NCAF", "Which mandates an NCAF objective lies in",
     "мандати ролей, через які виконуються функції цілі", "the mandates of the roles through which the objective's functions are performed"),
    ("institution", "Установа", "Institution", "орган разом з підрозділами й командами реагування (actor.parent, тип unit або csirt)",
     "a body with its units and response teams (actor.parent, type unit or csirt)"),
    ("hats", "Групи функцій установи", "An institution's function groups", "ролі всіх одиниць установи, згруповані за типом",
     "the roles of all the institution's units, grouped by type"),
    ("type_ncaf", "Ціль NCAF типового органу", "An expected type's NCAF objective", "ціль функції, яку виконував би орган",
     "the objective of the function the body would perform"),
    ("snapshot", "Стан на дату", "State as of a date", "рядки, чинні на дату (valid_from, valid_to, status)",
     "rows in force on the date (valid_from, valid_to, status)"),
    ("checks", "Перевірки", "Checks", "прогалини, конфлікти функцій, концентрація — з тих самих таблиць",
     "gaps, conflicting functions, concentration — from the same tables"),
]
# which views read which entities (for the data model page)
VIEWS = {
    "house": ["actor", "role", "mandate", "type"], "structure": ["actor", "role", "link"],
    "functions": ["capability", "realization", "item", "actor", "role"], "actors": ["actor", "role"], "mandates": ["actor", "role", "mandate"],
    "links": ["link", "actor"], "flow": ["step", "handoff", "capability", "actor"], "types": ["type", "capability", "actor"],
    "checks": ["actor", "role", "link", "capability", "realization", "type", "handoff"],
    "ncaf": ["item", "capability", "realization", "role", "type"], "time": ["actor", "role", "link"],
    "acts": ["act", "role", "link", "realization", "handoff"], "frameworks": ["framework", "item", "capability", "realization", "question"],
    "method": ["question", "framework"], "vp": ["question"],
}


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return rows, reader.fieldnames or []


def many(v):
    return [x for x in (v or "").split(";") if x]


def load():
    """All tables (keyed by entity name), each row tagged with where it came from; plus errors found while reading."""
    errors = []
    t = {}
    for ent, spec in SCHEMA.items():
        path = DATA / spec["file"]
        if not path.exists():
            errors.append(f"{spec['file']}: file is missing")
            t[ent] = []
            continue
        rows, fields = read(path)
        missing = [c for c in spec["cols"] if c not in fields]
        extra = [c for c in fields if c not in spec["cols"]]
        if missing:
            errors.append(f"{spec['file']}: missing columns {', '.join(missing)}")
        if extra:
            errors.append(f"{spec['file']}: columns not in the schema: {', '.join(extra)}")
        for i, r in enumerate(rows, 2):
            r["_where"] = f"{spec['file']}:{i}"
        t[ent] = rows
    # Klimburg's mandates are framework items too; they are kept once, in mandates.csv
    t["item"] = t["item"] + [{"id": f"klimburg:{m['id']}", "framework": "klimburg", "parent": "", "code": m["id"], "order": m["order"],
                              "name_uk": m["name_uk"], "name_en": m["name_en"], "description_uk": m["description_uk"],
                              "description_en": m["description_en"], "notes_uk": "", "notes_en": "", "_where": "mandates.csv"}
                             for m in t["mandate"]]
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
    for r in t["vocab"]:
        V.setdefault(r["vocab"], set()).add(r["id"])
    acts = {r["id"]: r for r in t["register"]}
    keys = {}
    for ent, spec in SCHEMA.items():
        if not spec["key"]:
            continue
        seen = set()
        for r in t[ent]:
            rid = r.get("id", "")
            if ent == "item":
                ok = re.match(r"^[a-z0-9]+:[A-Za-z0-9.]+$", rid)
            elif ent == "mandate":
                ok = re.match(r"^[A-Z0-9]+$", rid)
            elif ent in ("link", "realization"):  # composite ids, checked below
                ok = bool(rid)
            else:
                ok = ID_RE.match(rid)
            if not ok:
                errors.append(f"{r['_where']}: malformed id '{rid}'")
            if rid in seen:
                errors.append(f"{r['_where']}: duplicate id '{rid}'")
            seen.add(rid)
        keys[ent] = seen
    items = {r["id"]: r for r in t["item"]}

    def target_set(target):
        if target.startswith("vocab:"):
            return V.get(target[6:], set())
        if target == "sector":
            return {s["id"] for s in t["register_sectors"]}
        if target == "entity":
            return set(SCHEMA) | {"act"}
        if target.startswith("item:"):
            return {i for i, r in items.items() if r["framework"] == target[5:]}
        return keys.get(target, set())

    # every reference column, from the schema
    for ent, spec in SCHEMA.items():
        for r in t[ent]:
            if r.get("_where") == "mandates.csv" and ent == "item":
                continue
            for col, (target, is_many, blank_ok) in spec["refs"].items():
                vals = many(r.get(col)) if is_many else [r.get(col, "")]
                if not vals or vals == [""]:
                    if not blank_ok:
                        errors.append(f"{r['_where']}: {col} is empty")
                    continue
                if target == "act":
                    for a in vals:
                        if a not in acts:
                            errors.append(f"{r['_where']}: act '{a}' is not in the register copy (vendor/register); add it to the GRC foundation or re-sync")
                        elif acts[a]["status"] == "repealed" and r.get("status", "in_force") == "in_force":
                            warnings.append(f"{r['_where']}: cites '{a}', which the register marks as repealed")
                    continue
                allowed = target_set(target)
                for v in vals:
                    if v not in allowed:
                        errors.append(f"{r['_where']}: {col} '{v}' is not a known {target}")

    # ids that encode their parts
    for r in t["role"]:
        if r["id"] != f"{r['actor']}.{r['role']}":
            errors.append(f"{r['_where']}: id must be '<actor>.<role>', got '{r['id']}'")
    for r in t["link"]:
        if r["from"] == r["to"]:
            errors.append(f"{r['_where']}: a link must join two different actors")
        if r["id"] != f"{r['from']}>{r['to']}:{r['type']}":
            errors.append(f"{r['_where']}: id must be '<from>><to>:<type>', got '{r['id']}'")
    for r in t["realization"]:
        if r["id"] != f"{r['capability']}>{r['actor']}":
            errors.append(f"{r['_where']}: id must be '<capability>><actor>', got '{r['id']}'")
    for r in t["actor"]:
        if r["parent"] == r["id"]:
            errors.append(f"{r['_where']}: an actor cannot be its own parent")
    for r in t["question"]:
        if not r["href"].startswith("#/"):
            errors.append(f"{r['_where']}: href must be a link inside the site ('#/...')")
    for r in t["step"]:
        if r["absent"] not in ("yes", ""):
            errors.append(f"{r['_where']}: absent must be 'yes' or blank")

    # frameworks: item ids carry their framework; the NCAF has 20 objectives in four clusters
    for r in t["item"]:
        if r.get("_where") != "mandates.csv" and not r["id"].startswith(r["framework"] + ":"):
            errors.append(f"{r['_where']}: id '{r['id']}' must start with '{r['framework']}:'")
    objectives = {i for i, r in items.items() if r["framework"] == "ncaf2" and r["parent"]}
    if len(objectives) != 20:
        errors.append(f"framework_items.csv: NCAF 2.0 has 20 objectives, found {len(objectives)}")

    # the time axis
    for ent in ("actor", "role", "link"):
        for r in t[ent]:
            for col in ("valid_from", "valid_to"):
                if r.get(col) and not DATE_RE.match(r[col]):
                    errors.append(f"{r['_where']}: {col} '{r[col]}' is not a date (YYYY, YYYY-MM or YYYY-MM-DD)")
            if r.get("valid_from") and r.get("valid_to") and r["valid_to"] < r["valid_from"]:
                errors.append(f"{r['_where']}: valid_to is before valid_from")

    # the capability map: the spine is an NCAF objective, or a Klimburg mandate where the NCAF is blind
    for r in t["capability"]:
        sp = items.get(r["spine"], {})
        if sp and not ((sp["framework"] == "ncaf2" and sp["parent"]) or sp["framework"] == "klimburg"):
            errors.append(f"{r['_where']}: spine '{r['spine']}' must be an NCAF 2.0 objective or a Klimburg mandate")
        if r["spine"] in many(r["also"]):
            errors.append(f"{r['_where']}: '{r['spine']}' is the spine; do not repeat it in 'also'")
    roles = {r["id"]: r for r in t["role"]}
    performers = {}
    for r in t["realization"]:
        performers.setdefault(r["capability"], set()).add(r["actor"])
        if r["role"] in roles and roles[r["role"]]["actor"] != r["actor"]:
            errors.append(f"{r['_where']}: role '{r['role']}' belongs to '{roles[r['role']]['actor']}', not '{r['actor']}'")
        if not r["role"] and not r["act"]:
            warnings.append(f"{r['_where']}: {r['actor']} performs {r['capability']} with neither a role nor an act")
    for c in sorted(keys["capability"] - set(performers)):
        warnings.append(f"capabilities.csv: nobody performs '{c}'")
    spined = {r["spine"] for r in t["capability"]}
    for o in sorted(objectives - spined, key=lambda x: int(x.split(":")[1])):
        warnings.append(f"framework_items.csv: NCAF objective {o} has no function of its own")

    # consistency between views: the same fact must not be told two ways
    for r in t["type"]:
        if r["capability"] and r["coverage"] in ("present", "partial", "planned"):
            for a in many(r["actors"]):
                if a not in performers.get(r["capability"], set()):
                    errors.append(f"{r['_where']}: {a} is named for this type but does not perform '{r['capability']}' in realizations.csv")
        if r["coverage"] in ("present", "partial", "planned") and not r["actors"]:
            errors.append(f"{r['_where']}: coverage '{r['coverage']}' needs at least one actor")
    for r in t["step"]:
        if r["capability"] and r["actor"] not in performers.get(r["capability"], set()):
            errors.append(f"{r['_where']}: {r['actor']} acts on the incident path as '{r['capability']}' but does not perform it in realizations.csv")

    # a family of bodies (a body and its units) must not loop
    parent = {r["id"]: r["parent"] for r in t["actor"]}
    for a in parent:
        seen, cur = set(), a
        while parent.get(cur):
            if cur in seen:
                errors.append(f"actors.csv: parent chain of '{a}' loops")
                break
            seen.add(cur)
            cur = parent[cur]
    used = ({r["actor"] for r in t["role"]} | {r["from"] for r in t["link"]} | {r["to"] for r in t["link"]}
            | {r["actor"] for r in t["step"]} | {r["actor"] for r in t["realization"]})
    for r in t["actor"]:
        if r["id"] not in used:
            warnings.append(f"{r['_where']}: actor {r['id']} has no role, link, function or flow step")
    unchecked = sum(1 for n in ("actor", "role", "link", "realization") for r in t[n] if r.get("confidence") != "high")
    if unchecked:
        warnings.append(f"{unchecked} rows in actors, roles, links and realizations are not yet checked against the act (confidence other than 'high')")
    unverified = sorted(a for a in cited(t) if a in acts and not acts[a]["last_verified"])
    if unverified:
        warnings.append(f"{len(unverified)} cited acts have no last_verified date in the register")
    for k in ("version", "date"):
        if not t["meta"].get(k):
            errors.append(f"meta.json: '{k}' is missing")
    return errors, warnings


def cited(t):
    return ({r["act"] for n in ("role", "link", "realization") for r in t[n] if r["act"]}
            | {r["rule_act"] for r in t["handoff"] if r["rule_act"]})


def strip(rows):
    return [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]


def graph(t):
    """One JSON document with everything the site shows: the map's tables, the frameworks, the cited acts from the
    register, and the schema itself (for the data model page)."""
    c = cited(t) | {"ua-cmu-1426-2021"}
    types = {r["id"]: r for r in t["register_types"]}
    acts = []
    for r in t["register"]:
        if r["id"] in c:
            a = {k: r.get(k, "") for k in ACT_FIELDS}
            ty = types.get(r["type"], {})
            a["type_uk"], a["type_en"] = ty.get("label_uk", ""), ty.get("label_en", "")
            acts.append(a)
    acts.sort(key=lambda a: int(a["register_no"] or 0))
    relations = [{k: r[k] for k in ("source_id", "relation", "related_id")} for r in t["register_relations"]
                 if r["source_id"] in c and r["related_id"] in c]
    vocab = {}
    for r in t["vocab"]:
        vocab.setdefault(r["vocab"], []).append({k: r[k] for k in ("id", "label_uk", "label_en", "description_uk", "description_en")})
    lock = t["lock"]
    schema = {ent: {"file": s["file"], "layer": s["layer"], "name_uk": s["uk"], "name_en": s["en"], "about_uk": s["about_uk"], "about_en": s["about_en"],
                    "refs": {col: tgt for col, (tgt, _, _) in s["refs"].items() if not tgt.startswith("vocab:") and tgt != "entity"}, "rows": len(t[ent])}
              for ent, s in SCHEMA.items()}
    schema["act"] = {"file": "vendor/register/sources.csv", "layer": "support", "name_uk": "Акт (реєстр GRC-фундаменту)", "name_en": "Act (GRC foundation register)",
                     "about_uk": "Правова підстава. Окремої таблиці немає: акти беруться з закріпленої копії реєстру.",
                     "about_en": "A legal basis. No table of its own: acts come from the pinned copy of the register.", "refs": {}, "rows": len(acts)}
    return {
        "meta": {**t["meta"], "register": {"repo": lock.get("repo", ""), "commit": lock.get("commit", ""), "data_version": lock.get("data_version", "")}},
        "schema": schema,
        "derived": [dict(zip(["id", "name_uk", "name_en", "how_uk", "how_en"], d)) for d in DERIVED],
        "views": VIEWS,
        "vocab": vocab,
        "frameworks": strip(t["framework"]),
        "framework_items": strip(t["item"]),
        "mandates": strip(sorted(t["mandate"], key=lambda r: int(r["order"]))),
        "actors": strip(t["actor"]),
        "roles": strip(t["role"]),
        "links": strip(t["link"]),
        "acts": acts,
        "act_relations": relations,
        "flow_steps": strip(t["step"]),
        "flow_handoffs": strip(t["handoff"]),
        "expected_types": strip(t["type"]),
        "capabilities": strip(t["capability"]),
        "realizations": strip(t["realization"]),
        "refs": strip(t["ref"]),
        "questions": strip(t["question"]),
        "grc_sectors": [{k: r[k] for k in ("id", "label_uk", "label_en")} for r in t["register_sectors"]
                        if r["id"] in {x for a in t["actor"] for x in many(a["grc_sectors"])}],
    }
