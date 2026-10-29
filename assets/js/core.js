/* Core: state, helpers, the graph and the query layer.
 * The site reads one document, data/graph.json, built by scripts/build.py from the CSV tables and the pinned copy of
 * the GRC foundation register. Views never read tables directly: they ask the functions below, and so do the
 * automated checks and the organisation card. That keeps the tools apart from the representation. */
import { I18N } from "./i18n.js";

export const CFG = window.UCA_CONFIG || {};
export const KLIMBURG = ["M1", "M2", "M3", "M4", "M5"];
export const NIS2_EXCLUDED = ["M1", "M3"]; // defence and national security sit outside NIS2, and so outside the NCAF

// Role types grouped into the "hats" an institution can wear; used by the role profile and the segregation checks
export const ROLE_GROUP = {
  policy: "policy",
  regulator: "regulation", standards: "regulation", info_protection: "regulation",
  assessment: "control", oversight: "control",
  national_csirt: "operations", sectoral_csirt: "operations", active_protection: "operations", crisis: "operations",
  investigator: "operations", prosecutor: "operations", counterintelligence: "operations", intelligence: "operations", military_ops: "operations",
  service_provider: "services",
  coordinator: "coordination", diplomacy: "coordination",
  education: "other", research: "other", awareness: "other", digital_identity: "other", data_protection: "other",
  entity: "entity",
};
export const GROUPS = ["policy", "regulation", "control", "operations", "services", "coordination", "other"];

export const S = { lang: "uk", route: "home", arg: "", p: new URLSearchParams(), planned: true, at: "" };
export const D = {};

// ------------------------------------------------------------------ helpers
export const t = (k) => (I18N[S.lang] && I18N[S.lang][k] !== undefined ? I18N[S.lang][k] : I18N.uk[k] !== undefined ? I18N.uk[k] : k);
export const fmt = (s, ...a) => String(s).replace(/\{(\d)\}/g, (_, i) => a[+i]);
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const L = (row, base) => (row ? row[`${base}_${S.lang}`] || row[`${base}_uk`] || row[`${base}_en`] || "" : "");
export const many = (v) => String(v || "").split(";").filter(Boolean);
export const group = (rows, key) => rows.reduce((m, r) => ((m[r[key]] = m[r[key]] || []).push(r), m), {});
export const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
};
export const live = (r) => S.planned || r.status === "in_force";
export const vl = (kind, id) => L((D.vocab[kind] || {})[id], "label") || id;
export const vd = (kind, id) => L((D.vocab[kind] || {})[id], "description");
export const order = (kind) => D.vocabOrder[kind] || [];

async function loadMd(name) {
  const key = `${name}.${S.lang}`;
  if (loadMd.cache[key] !== undefined) return loadMd.cache[key];
  let text = "";
  for (const lang of [S.lang, "uk"]) {
    const res = await fetch(`content/${name}.${lang}.md`, { cache: "no-cache" }).catch(() => null);
    if (res && res.ok) { text = await res.text(); break; }
  }
  // tables from Markdown scroll sideways on narrow screens, like every other table on the site
  loadMd.cache[key] = text ? window.marked.parse(text).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>") : "";
  return loadMd.cache[key];
}
loadMd.cache = {};
export { loadMd };

// ------------------------------------------------------------------ the graph
export async function loadGraph() {
  const res = await fetch("data/graph.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`graph.json: HTTP ${res.status}`);
  const g = await res.json();
  const by = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
  D.meta = g.meta;
  D.vocab = {}; D.vocabOrder = {};
  Object.entries(g.vocab).forEach(([kind, rows]) => { D.vocab[kind] = by(rows); D.vocabOrder[kind] = rows.map((r) => r.id); });
  D.mandates = g.mandates; D.mandate = by(g.mandates);
  D.raw = { actors: g.actors, roles: g.roles, links: g.links, realizations: g.realizations || [] };
  D.order = Object.fromEntries(g.actors.map((a, i) => [a.id, i]));
  D.anyActor = by(g.actors); // every actor, whatever date the map is read at
  D.acts = g.acts; D.act = by(g.acts); D.actRelations = g.act_relations;
  D.schema = g.schema; D.derived = g.derived; D.views = g.views;
  // reference frameworks: NCAF 2.0 is the spine; its clusters and objectives keep the short ids the views use ("5")
  D.frameworks = g.frameworks; D.fw = by(g.frameworks);
  D.items = g.framework_items; D.item = by(g.framework_items); D.itemsBy = group(g.framework_items, "framework");
  const ord = (a, b) => (parseFloat(a.order) || 0) - (parseFloat(b.order) || 0);
  D.clusters = (D.itemsBy.ncaf2 || []).filter((i) => !i.parent).sort(ord).map((i) => ({ ...i, id: i.code.replace(/^C/, ""), item: i.id }));
  D.objectives = (D.itemsBy.ncaf2 || []).filter((i) => i.parent).sort(ord)
    .map((i) => ({ ...i, id: i.code, item: i.id, cluster: D.item[i.parent].code.replace(/^C/, ""), subjects: "", mandates: "" }));
  D.objective = by(D.objectives);
  D.caps = g.capabilities || []; D.cap = by(D.caps);
  D.caps.forEach((c) => {
    c.objective = c.spine.startsWith("ncaf2:") ? c.spine.slice(6) : "";
    c.csf = (many(c.also).find((x) => x.startsWith("csf2:")) || "").slice(5);
  });
  D.capsBySpine = group(D.caps, "spine");
  D.steps = g.flow_steps; D.step = by(g.flow_steps);
  D.handoffs = g.flow_handoffs; D.handoffs.forEach((h) => (h.ncaf = h.objective ? h.objective.split(":")[1] : ""));
  D.types = g.expected_types; D.grcSectors = by(g.grc_sectors || []);
  D.types.forEach((x) => (x.ncaf = x.capability && D.cap[x.capability] ? D.cap[x.capability].objective : ""));
  D.refs = by(g.refs || []);
  D.questions = g.questions || [];
  index();
}

// ------------------------------------------------------------------ the time axis
// The map can be read as it stood on a date (S.at). Rows carry valid_from / valid_to; a blank valid_from means "before
// 2014 or not established", so such rows are always shown. Drafts and entities not yet set up never existed in the past.
export const day = (d) => (!d ? "" : d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d);
export const existsAt = (r, at) => !at || ((!r.valid_from || day(r.valid_from) <= at) && (!r.valid_to || day(r.valid_to) > at)
  && !(r.status && r.status !== "in_force"));
export function setDate(at) { S.at = at || ""; index(); }
// rebuild every index from the rows that exist on S.at; views and checks only ever read these
function index() {
  const at = S.at;
  const actors = D.raw.actors.filter((a) => existsAt(a, at));
  const ok = new Set(actors.map((a) => a.id));
  const roles = D.raw.roles.filter((r) => ok.has(r.actor) && existsAt(r, at));
  const links = D.raw.links.filter((k) => ok.has(k.from) && ok.has(k.to) && existsAt(k, at));
  const roleIds = new Set(roles.map((r) => r.id));
  const by = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
  D.actors = actors; D.actor = by(actors);
  D.children = group(actors.filter((a) => a.parent), "parent");
  D.roles = roles; D.role = by(roles); D.rolesBy = group(roles, "actor"); D.rolesByAct = group(roles.filter((r) => r.act), "act");
  D.links = links; D.linksOut = group(links, "from"); D.linksIn = group(links, "to"); D.linksByAct = group(links.filter((k) => k.act), "act");
  D.real = D.raw.realizations.filter((x) => ok.has(x.actor) && (!x.role || roleIds.has(x.role)));
  D.realByCap = group(D.real, "capability");
  derive();
}
// Derived facts (see DERIVED in scripts/mapdata.py): who answers for an NCAF objective and which mandates it lies in
// follow from who performs its functions and through which roles. They are recomputed for every snapshot.
export function derive() {
  const mo = (m) => +((D.mandate[m] || {}).order || 99);
  D.objectives.forEach((o) => {
    const reals = (D.capsBySpine[o.item] || []).flatMap((c) => realsOf(c.id));
    o.functions = (D.capsBySpine[o.item] || []).length;
    o.subjects = [...new Set(reals.filter((x) => x.part === "lead" && !isClass(D.actor[x.actor])).map((x) => x.actor))].join(";");
    o.mandates = [...new Set(reals.filter((x) => x.role).map((x) => D.role[x.role].mandate))].sort((a, b) => mo(a) - mo(b)).join(";");
  });
}
// ------------------------------------------------------------------ queries
export const name = (id) => { const a = D.actor[id] || D.anyActor[id]; return a ? L(a, "short") : id; };
export const rolesOf = (id) => (D.rolesBy[id] || []).filter(live);
export const linksOut = (id) => (D.linksOut[id] || []).filter(live);
export const linksIn = (id) => (D.linksIn[id] || []).filter(live);
// An institution is a body with its own units (structural units and response teams inside it). A ministry under the
// Cabinet or the General Staff under the Ministry of Defence is a separate body: "parent" there means subordination.
export const isUnit = (a) => !!(a && a.parent && ["unit", "csirt"].includes(a.type));
export function root(id) { let cur = id; while (isUnit(D.actor[cur])) cur = D.actor[cur].parent; return cur; }
export function family(id) { // the body first, then its units
  const out = [id];
  (D.children[id] || []).filter(isUnit).forEach((c) => out.push(...family(c.id)));
  return out;
}
export const mandatesOf = (id) => [...new Set(rolesOf(id).map((r) => r.mandate))].sort((a, b) => +D.mandate[a].order - +D.mandate[b].order);
export const isMulti = (id) => mandatesOf(id).filter((m) => KLIMBURG.includes(m)).length > 1;
export const objectivesOf = (id) => D.objectives.filter((o) => many(o.subjects).includes(id));
export const stepsOf = (id) => D.steps.filter((s) => s.actor === id);
export const typesOf = (id) => D.types.filter((x) => many(x.actors).includes(id));
export const isClass = (a) => a && a.tier === "entity";
// capability map: who performs a function, and in what part; a realization counts only while its role is shown
export const realsOf = (capId) => (D.realByCap[capId] || []).filter((x) => !x.role || live(D.role[x.role]));
export const leadsOf = (capId) => realsOf(capId).filter((x) => x.part === "lead");
export function capFlags(capId) {
  const leads = leadsOf(capId);
  const inForce = leads.filter((x) => !x.role || D.role[x.role].status === "in_force");
  const insts = new Set(inForce.filter((x) => !isClass(D.actor[x.actor])).map((x) => root(x.actor)));
  const absent = D.types.filter((x) => x.capability === capId && x.coverage === "absent");
  return { noLead: !inForce.length, plannedOnly: !inForce.length && leads.length > 0, multi: insts.size > 1, absent };
}
export const capsOfFamily = (rootId) => D.real.filter((x) => root(x.actor) === rootId && (!x.role || live(D.role[x.role])));
export function groupsOf(ids) { // role groups held across a set of actors: {group: [roles]}
  const out = {};
  ids.forEach((id) => rolesOf(id).forEach((r) => { const g = ROLE_GROUP[r.role] || "other"; (out[g] = out[g] || []).push(r); }));
  return out;
}

// ------------------------------------------------------------------ automated checks (a tool, not part of the model)
export function checks() {
  const out = [];
  const add = (id, severity, items) => out.push({ id, severity, items });
  // roles without a legal basis
  add("noBasis", "gap", D.roles.filter((r) => live(r) && !r.act).map((r) => ({ actor: r.actor, text: vl("role", r.role) })));
  // supervisors nobody supervises
  const sup = [...new Set(D.links.filter((k) => k.type === "oversight" && live(k)).map((k) => k.from))];
  add("watchers", "gap", sup.filter((id) => !family(root(id)).some((m) => linksIn(m).some((k) => k.type === "oversight"))).map((id) => ({ actor: id })));
  // segregation of duties inside one institution
  const roots = [...new Set(D.actors.filter((a) => !isClass(a) && a.tier !== "international").map((a) => root(a.id)))];
  const sod = [];
  roots.forEach((r) => {
    const g = groupsOf(family(r));
    if ((g.regulation || []).length && (g.services || []).length) sod.push({ actor: r, text: t("sodRegServ") });
    if ((g.control || []).length && (g.services || []).length) sod.push({ actor: r, text: t("sodCtrlServ") });
    if ((g.policy || []).length && (g.regulation || []).length && (g.control || []).length) sod.push({ actor: r, text: t("sodPolRegCtrl") });
  });
  add("sod", "gap", sod);
  // concentration: institutions wearing many hats
  add("hats", "info", roots.map((r) => ({ actor: r, n: Object.keys(groupsOf(family(r))).filter((g) => g !== "entity").length, roles: family(r).reduce((s, m) => s + rolesOf(m).length, 0) }))
    .filter((x) => x.n >= 3).sort((a, b) => b.n - a.n || b.roles - a.roles).map((x) => ({ actor: x.actor, text: fmt(t("hatsItem"), x.n, x.roles) })));
  // several mandates at once
  add("multi", "info", D.actors.filter((a) => isMulti(a.id)).map((a) => ({ actor: a.id, text: mandatesOf(a.id).filter((m) => KLIMBURG.includes(m)).join(" + ") })));
  // body types the system lacks
  add("absent", "gap", D.types.filter((x) => x.coverage === "absent" || x.coverage === "unknown").map((x) => ({ type: x.id, text: L(x, "name"), coverage: x.coverage })));
  // NCAF objectives with no subject, and on a mandate boundary
  add("noOwner", "gap", D.objectives.filter((o) => o.functions && !o.subjects).map((o) => ({ objective: o.id, text: L(o, "name") })));
  add("objNoFunction", "info", D.objectives.filter((o) => !o.functions).map((o) => ({ objective: o.id, text: L(o, "name") })));
  add("boundary", "warn", D.objectives.filter((o) => many(o.mandates).filter((m) => m !== "OUT").length > 1 || many(o.mandates).includes("XC")).map((o) => ({ objective: o.id, text: L(o, "name") })));
  // handovers between mandates with no rule
  add("handoffs", "gap", D.handoffs.filter((h) => !h.rule_act).map((h) => ({ actor: D.step[h.from].actor, to: D.step[h.to].actor, text: L(h, "notes") })));
  // levels with no body holding a role
  add("levels", "gap", order("level").filter((lv) => lv !== "international").filter((lv) => !D.actors.some((a) => a.level === lv && !isClass(a) && rolesOf(a.id).some((r) => r.status === "in_force")))
    .map((lv) => ({ text: vl("level", lv) })));
  // duties with no deadline or channel in the model yet
  add("deadlines", "warn", D.links.filter((k) => live(k) && k.type === "reporting" && isClass(D.actor[k.from])).map((k) => ({ actor: k.from, to: k.to, text: t("noDeadline") })));
  // capability map: functions nobody leads, functions several institutions lead, performers without a legal basis
  const leaves = D.caps.filter((c) => c.parent);
  add("capNoLead", "gap", leaves.filter((c) => capFlags(c.id).noLead).map((c) => ({ cap: c.id, text: L(c, "name") })));
  add("capMulti", "warn", leaves.filter((c) => capFlags(c.id).multi).map((c) => ({ cap: c.id, text: `${L(c, "name")}: ${[...new Set(leadsOf(c.id).map((x) => name(root(x.actor))))].join(", ")}` })));
  add("capNoBasis", "info", D.real.filter((x) => !x.role).map((x) => ({ actor: x.actor, cap: x.capability, text: L(D.cap[x.capability], "name") })));
  // acts cited but not checked in the register
  add("unverified", "info", D.acts.filter((a) => !a.last_verified).map((a) => ({ act: a.id })));
  return out;
}
