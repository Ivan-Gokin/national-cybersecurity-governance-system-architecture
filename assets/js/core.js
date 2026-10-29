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

export const S = { lang: "uk", route: "home", arg: "", p: new URLSearchParams(), planned: true };
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
  D.actors = g.actors; D.actor = by(g.actors);
  D.order = Object.fromEntries(g.actors.map((a, i) => [a.id, i]));
  D.children = group(g.actors.filter((a) => a.parent), "parent");
  D.roles = g.roles; D.rolesBy = group(g.roles, "actor"); D.rolesByAct = group(g.roles.filter((r) => r.act), "act");
  D.links = g.links; D.linksOut = group(g.links, "from"); D.linksIn = group(g.links, "to"); D.linksByAct = group(g.links.filter((k) => k.act), "act");
  D.acts = g.acts; D.act = by(g.acts); D.actRelations = g.act_relations;
  D.clusters = g.ncaf_clusters; D.objectives = g.ncaf_objectives.sort((a, b) => +a.id - +b.id); D.objective = by(g.ncaf_objectives);
  D.steps = g.flow_steps; D.step = by(g.flow_steps); D.handoffs = g.flow_handoffs;
  D.types = g.expected_types; D.grcSectors = by(g.grc_sectors || []);
}

// ------------------------------------------------------------------ queries
export const name = (id) => (D.actor[id] ? L(D.actor[id], "short") : id);
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
  add("noOwner", "gap", D.objectives.filter((o) => !o.subjects && o.plan_2026 !== "na").map((o) => ({ objective: o.id, text: L(o, "name") })));
  add("boundary", "warn", D.objectives.filter((o) => many(o.mandates).filter((m) => m !== "OUT").length > 1 || many(o.mandates).includes("XC")).map((o) => ({ objective: o.id, text: L(o, "name") })));
  // handovers between mandates with no rule
  add("handoffs", "gap", D.handoffs.filter((h) => !h.rule_act).map((h) => ({ actor: D.step[h.from].actor, to: D.step[h.to].actor, text: L(h, "notes") })));
  // levels with no body holding a role
  add("levels", "gap", order("level").filter((lv) => lv !== "international").filter((lv) => !D.actors.some((a) => a.level === lv && !isClass(a) && rolesOf(a.id).some((r) => r.status === "in_force")))
    .map((lv) => ({ text: vl("level", lv) })));
  // duties with no deadline or channel in the model yet
  add("deadlines", "warn", D.links.filter((k) => live(k) && k.type === "reporting" && isClass(D.actor[k.from])).map((k) => ({ actor: k.from, to: k.to, text: t("noDeadline") })));
  // acts cited but not checked in the register
  add("unverified", "info", D.acts.filter((a) => !a.last_verified).map((a) => ({ act: a.id })));
  return out;
}
