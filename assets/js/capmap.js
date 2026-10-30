/* The functional view (a capability map whose spine is ENISA NCAF 2.0, with Klimburg's mandates where the NCAF is
 * blind and NIST CSF 2.0 and the national OTM as crosswalks) and the time axis. Both read the same graph: a function is
 * performed by actors through their roles and acts, and every row of the map can be read as it stood on a date. */
import { D, S, t, fmt, esc, L, many, vl, vd, name, root, family, isClass, rolesOf, realsOf, leadsOf, capFlags, capsOfFamily,
  existsAt, day, setDate } from "./core.js";
import { actorLink, actorHref, actRef, mBadge, confBadge, statusBadge, covBadge, gap, selectOf, plannedToggle, on, crumbs } from "./ui.js";
import { setTitle, setParam, fmtDate } from "./app.js";
import { whySection, driverEvents } from "./why.js";

const capHref = (id) => `#/cap/${encodeURIComponent(id)}`;
export const csfBadge = (c) => (c && D.item[`csf2:${c}`] ? `<span class="csf csf-${esc(c)}" title="NIST CSF 2.0: ${esc(L(D.item[`csf2:${c}`], "name"))}">${esc(c)}</span>` : "");
const institutionsWithCaps = () => [...new Set(D.real.map((x) => root(x.actor)))].sort((a, b) => D.order[a] - D.order[b]);
const planned = (x) => x.role && D.role[x.role] && D.role[x.role].status !== "in_force";

// ------------------------------------------------------------------ the capability map
// The tree follows the frameworks, not our own grouping: NCAF 2.0 cluster -> objective -> function. Functions the
// NCAF cannot see (defence, intelligence, attribution, special communications) sit under Klimburg's mandates.
export function sections() {
  const out = D.clusters.map((c) => ({
    key: c.item, title: `${t("cluster")} ${c.id}`, name: L(c, "name"),
    groups: D.objectives.filter((o) => o.cluster === c.id).map((o) => ({ key: o.item, code: o.id, name: L(o, "name"), href: `#/ncaf?o=${o.id}`, caps: D.capsBySpine[o.item] || [] })),
  }));
  const outside = D.mandates.filter((m) => D.capsBySpine[`klimburg:${m.id}`])
    .map((m) => ({ key: `klimburg:${m.id}`, code: m.id, badge: mBadge(m.id), name: L(m, "name"), href: "#/mandates", caps: D.capsBySpine[`klimburg:${m.id}`] }));
  out.push({ key: "klimburg", title: t("capOutsideKicker"), name: t("capOutside"), about: t("capOutsideLead"), groups: outside });
  return out;
}
function tile(c, hl) {
  const f = capFlags(c.id);
  const rs = realsOf(c.id);
  const chip = (x) => `<a class="hchip${planned(x) ? " is-planned" : ""}${hl && root(x.actor) === hl ? " hl" : ""}" href="${actorHref(x.actor)}" title="${esc(L(D.actor[x.actor], "name"))}">${esc(name(x.actor))}</a>`;
  const leads = rs.filter((x) => x.part === "lead"), contribs = rs.filter((x) => x.part === "contrib");
  const mine = hl ? rs.filter((x) => root(x.actor) === hl) : [];
  const hlCls = hl ? (mine.some((x) => x.part === "lead") ? " hl-lead" : mine.length ? " hl-contrib" : " hl-none") : "";
  return `<li class="cap${f.noLead ? " cap-gap" : ""}${f.multi ? " cap-multi" : ""}${hlCls}">
    <p class="cap-top">${csfBadge(c.csf)}${f.noLead ? gap(t(f.plannedOnly ? "capPlannedOnly" : "capNoLead")) : ""}${f.multi ? ` <span class="badge b-boundary">${esc(t("capMulti"))}</span>` : ""}</p>
    <h3><a href="${capHref(c.id)}">${esc(L(c, "name"))}</a></h3>
    ${leads.length ? `<p class="cap-who"><span class="cap-k">${esc(t("capLeads"))}</span>${leads.map(chip).join("")}</p>` : ""}
    ${contribs.length ? `<p class="cap-who cap-contrib"><span class="cap-k">${esc(t("capContrib"))}</span>${contribs.map(chip).join("")}</p>` : ""}
    ${f.absent.map((x) => `<p class="obj-absent"><a href="#/types?t=${esc(x.id)}">${esc(fmt(t("objAbsent"), L(x, "name")))}</a></p>`).join("")}
  </li>`;
}
const groupHead = (g) => `<h3 class="cap-obj">${g.badge || `<span class="obj-num">${esc(g.code)}</span>`} <a href="${g.href}">${esc(g.name)}</a></h3>`;
function matrix(hl) {
  const insts = institutionsWithCaps();
  const cnt = (r) => D.real.filter((x) => root(x.actor) === r).length;
  insts.sort((a, b) => cnt(b) - cnt(a) || D.order[a] - D.order[b]);
  const cell = (c, r) => {
    const xs = realsOf(c.id).filter((x) => root(x.actor) === r);
    if (!xs.length) return "<td></td>";
    const lead = xs.some((x) => x.part === "lead");
    return `<td class="mx ${lead ? "mx-lead" : "mx-contrib"}${xs.every(planned) ? " is-planned" : ""}" title="${esc(`${name(r)} · ${L(c, "name")}: ${xs.map((x) => `${name(x.actor)} — ${vl("part", x.part)}`).join("; ")}`)}">${lead ? "●" : "○"}</td>`;
  };
  const n = insts.length + 1;
  return `<div class="table-wrap dsm-wrap"><table class="dsm capmx"><thead><tr><th class="corner">${esc(t("capCorner"))}</th>${insts.map((r) => `<th scope="col" class="vert${r === hl ? " col-hl" : ""}"><span>${esc(name(r))}</span></th>`).join("")}</tr></thead>
    <tbody>${sections().map((sec) => `<tr class="group"><th colspan="${n}">${esc(sec.title)} · ${esc(sec.name)}</th></tr>
      ${sec.groups.map((g) => `<tr class="subgroup"><th colspan="${n}">${g.badge || `<span class="obj-num">${esc(g.code)}</span>`} ${esc(g.name)}${g.caps.length ? "" : ` <span class="muted small">— ${esc(t("noFunction"))}</span>`}</th></tr>
        ${g.caps.map((c) => `<tr class="${capFlags(c.id).noLead ? "row-gap" : ""}"><th scope="row"><a href="${capHref(c.id)}">${esc(L(c, "name"))}</a></th>${insts.map((r) => cell(c, r)).join("")}</tr>`).join("")}`).join("")}`).join("")}</tbody></table></div>
    <p class="hint">${esc(t("capMatrixHint"))}</p>`;
}
export function renderFunctions(app) {
  setTitle(t("nav_functions"));
  const hl = S.p.get("hl") || "";
  const mode = S.p.get("m") === "matrix" ? "matrix" : "map";
  const leaves = D.caps;
  const nNo = leaves.filter((c) => capFlags(c.id).noLead).length, nMulti = leaves.filter((c) => capFlags(c.id).multi).length;
  let summary = "";
  if (hl && D.actor[hl]) {
    const mine = capsOfFamily(hl);
    const lead = new Set(mine.filter((x) => x.part === "lead").map((x) => x.capability));
    const part = new Set(mine.filter((x) => x.part === "contrib" && !lead.has(x.capability)).map((x) => x.capability));
    summary = `<p class="notice cap-summary">${esc(fmt(t("capHlSummary"), name(hl), lead.size, part.size, leaves.length))}</p>`;
  }
  const map = sections().map((sec) => `<section class="cap-group"><h2><span class="kicker">${esc(sec.title)}</span> ${esc(sec.name)}${sec.about ? `<span class="cap-desc">${esc(sec.about)}</span>` : ""}</h2>
    ${sec.groups.map((g) => `<div class="cap-sub">${groupHead(g)}${g.caps.length ? `<ol class="caps">${g.caps.map((c) => tile(c, hl)).join("")}</ol>` : `<p class="muted small">${esc(t("noFunctionLong"))}</p>`}</div>`).join("")}</section>`).join("");
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_functions"))}</h1><p class="lead-sm">${esc(t("capLead"))}</p>
      <p class="summary">${esc(fmt(t("capCount"), leaves.length, nNo, nMulti))}</p>
      <div class="inline-tools">${selectOf("f-hl", t("hlInst"), institutionsWithCaps().map((id) => [id, name(id)]), hl, t("none"))}
        <div class="seg" role="group" aria-label="${esc(t("capMode"))}"><a href="#/functions${hl ? "?hl=" + esc(hl) : ""}" class="btn${mode === "map" ? " btn-primary" : ""}">${esc(t("capModeMap"))}</a><a href="#/functions?m=matrix${hl ? "&hl=" + esc(hl) : ""}" class="btn${mode === "matrix" ? " btn-primary" : ""}">${esc(t("capModeMatrix"))}</a></div>
        ${plannedToggle()}</div></div>
    ${summary}
    ${mode === "matrix" ? matrix(hl) : `<div class="cap-map${hl ? " has-hl" : ""}">${map}</div>`}
    <p class="hint">${esc(t("capHint"))}</p>
  </article>`;
  on("f-hl", "change", (e) => setParam("hl", e.target.value));
  on("f-planned", "change", (e) => setParam("planned", e.target.checked ? "" : "0"));
}

// ------------------------------------------------------------------ capability card
// crosswalk: the framework items a function maps to, framework by framework
export function crosswalk(c) {
  const by = {};
  many(c.also).forEach((i) => { const it = D.item[i]; if (it) (by[it.framework] = by[it.framework] || []).push(it); });
  return D.frameworks.filter((f) => by[f.id]).map((f) => ({ fw: f, items: by[f.id] }));
}
export const itemLabel = (it) => (it.framework === "ncaf2" && it.parent ? `<a class="obj-num" href="#/ncaf?o=${esc(it.code)}">${esc(it.code)}</a> ${esc(L(it, "name"))}`
  : it.framework === "csf2" ? `${csfBadge(it.code)} ${esc(L(it, "name"))}` : it.framework === "klimburg" ? `${mBadge(it.code)} ${esc(L(it, "name"))}`
  : `<span class="code">${esc(it.code)}</span> ${esc(L(it, "name"))}`);
export function renderCapCard(app) {
  const c = D.cap[S.arg];
  if (!c) { setTitle(t("notFound")); app.innerHTML = `<p class="notice">${esc(t("notFound"))} <a href="#/functions">${esc(t("nav_functions"))}</a></p>`; return; }
  setTitle(L(c, "name"));
  const sp = D.item[c.spine];
  const cl = sp.framework === "ncaf2" ? D.item[sp.parent] : null;
  const refs = many(c.refs).map((r) => D.refs[r]).filter(Boolean).map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(L(r, "title"))}</a> <span class="small muted">${esc(L(r, "publisher"))} · ${esc(L(r, "notes"))}</span></li>`).join("");
  const otmAct = D.act["ua-cmu-1426-2021"];
  const cw = crosswalk(c);
  const sources = `<h2>${esc(t("capWhere"))}</h2>
    <h3>${esc(t("capSpine"))}: ${esc(L(D.fw[sp.framework], "name"))}</h3>
    <p>${cl ? `<span class="small muted">${esc(t("cluster"))} ${esc(cl.code.replace(/^C/, ""))} · ${esc(L(cl, "name"))}</span><br>` : ""}${itemLabel(sp)}</p>
    ${sp.framework === "klimburg" ? `<p class="small muted">${esc(t("capOutsideLead"))}</p>` : ""}
    ${cw.length ? `<h3>${esc(t("capCrosswalk"))}</h3>${cw.map(({ fw, items }) => `<p class="cw-fw"><b>${esc(L(fw, "name"))}</b></p><ul class="plain otm-list">${items.map((it) => `<li>${itemLabel(it)}</li>`).join("")}</ul>
      ${fw.id === "otm" ? `<p class="small muted">${otmAct ? actRef(otmAct.id) : ""} ${esc(t("capOtmNote"))}</p>` : ""}`).join("")}` : ""}
    ${!cw.some((x) => x.fw.id === "otm") ? `<p class="small muted">${esc(t("capNoOtm"))}</p>` : ""}
    ${refs ? `<h3>${esc(t("capRefs"))}</h3><ul class="plain">${refs}</ul>` : ""}`;
  const f = capFlags(c.id);
  const rs = realsOf(c.id).sort((a, b) => (a.part === b.part ? 0 : a.part === "lead" ? -1 : 1));
  const rows = rs.map((x) => {
    const r = x.role ? D.role[x.role] : null;
    return `<tr><th scope="row">${actorLink(x.actor, "ent")}${root(x.actor) !== x.actor ? `<span class="ent-parent">${esc(t("partOf"))} ${actorLink(root(x.actor))}</span>` : ""}</th>
      <td><span class="badge part-${esc(x.part)}">${esc(vl("part", x.part))}</span></td>
      <td>${r ? `${esc(vl("role", r.role))}${statusBadge(r.status)} ${mBadge(r.mandate)}<span class="block small muted">${actRef(r.act, r.provision)}</span>` : gap(t("capNoRole"))}</td>
      <td>${x.act ? actRef(x.act, x.provision) : "—"}</td><td>${confBadge(x.confidence, x.last_verified)}</td><td class="small">${esc(L(x, "notes"))}</td></tr>`;
  }).join("");
  const types = D.types.filter((x) => x.capability === c.id);
  const sib = (D.capsBySpine[c.spine] || []).filter((k) => k.id !== c.id);
  const spHref = sp.framework === "ncaf2" ? `#/ncaf?o=${sp.code}` : "#/mandates";
  app.innerHTML = `<article class="actor-page">
    ${crumbs(["#/functions", t("nav_functions")], [spHref, `${sp.framework === "ncaf2" ? "NCAF " + sp.code : sp.code} · ${L(sp, "name")}`], ["", L(c, "name")])}
    <header class="actor-head"><p class="kicker">${esc(t("capKicker"))} ${csfBadge(c.csf)}</p><h1>${esc(L(c, "name"))}</h1>
      <p class="lead-sm">${esc(L(c, "description"))}</p>
      <p class="actor-meta">${f.noLead ? gap(t(f.plannedOnly ? "capPlannedOnly" : "capNoLead")) : ""}${f.multi ? ` <span class="badge b-boundary">${esc(t("capMulti"))}</span>` : ""}</p>
      ${L(c, "notes") ? `<p class="actor-note">${esc(L(c, "notes"))}</p>` : ""}</header>
    <h2>${esc(t("capWho"))}</h2>
    ${rows ? `<div class="table-wrap"><table class="roles"><thead><tr><th>${esc(t("colActor"))}</th><th>${esc(t("colPart"))}</th><th>${esc(t("colRoleBasis"))}</th><th>${esc(t("colInstrument"))}</th><th>${esc(t("colConf"))}</th><th>${esc(t("colNotes"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">${esc(t("capRoleVsAct"))}</p>` : `<p>${gap(t("capNobody"))}</p>`}
    ${f.multi ? `<p class="notice">${esc(t("capMultiLead"))}</p>` : ""}
    ${whySection("capability", c.id, {
      basis: (() => { const acts = [...new Set(rs.flatMap((x) => [x.act, x.role && D.role[x.role] ? D.role[x.role].act : ""]).filter(Boolean))];
        return acts.length ? `<ul class="plain small">${acts.map((a) => `<li>${actRef(a)}</li>`).join("")}</ul>` : `<p class="small">${gap(t("noBasis"))}</p>`; })(),
      goal: `<p>${itemLabel(sp)}</p>` })}
    ${types.length ? `<h2>${esc(t("capTypes"))}</h2><ul class="plain type-list">${types.map((x) => `<li><a href="#/types?t=${esc(x.id)}">${esc(L(x, "name"))}</a> ${covBadge(x.coverage)} <span class="small muted">${esc(L(x, "basis"))}</span></li>`).join("")}</ul>` : ""}
    ${sources}
    ${sib.length ? `<h2>${esc(fmt(t("capSiblings"), L(sp, "name")))}</h2>
    <p class="vp-other">${sib.map((k) => `<a class="btn btn-line" href="${capHref(k.id)}">${esc(L(k, "name"))}</a>`).join("")}</p>` : ""}
  </article>`;
}
// the functions an institution performs, for the body card
export function capsSection(r) {
  const mine = capsOfFamily(r);
  if (!mine.length) return "";
  const byCap = {};
  mine.forEach((x) => (byCap[x.capability] = byCap[x.capability] || []).push(x));
  const ids = Object.keys(byCap).sort((a, b) => D.caps.indexOf(D.cap[a]) - D.caps.indexOf(D.cap[b]));
  const lead = ids.filter((id) => byCap[id].some((x) => x.part === "lead")).length;
  return `<h2>${esc(t("capOfBody"))}</h2><p class="lead-sm">${esc(fmt(t("capOfBodyLead"), lead, ids.length - lead))} <a href="#/functions?hl=${esc(r)}">${esc(t("capSeeMap"))}</a></p>
    <ul class="plain cap-list">${ids.map((id) => { const c = D.cap[id]; const xs = byCap[id]; const isLead = xs.some((x) => x.part === "lead");
      const sp = D.item[c.spine];
      return `<li><span class="obj-tag">${sp.framework === "ncaf2" ? `NCAF ${esc(sp.code)}` : mBadge(sp.code)}</span> <a href="${capHref(id)}">${esc(L(c, "name"))}</a> <span class="badge part-${isLead ? "lead" : "contrib"}">${esc(vl("part", isLead ? "lead" : "contrib"))}</span>${xs.some((x) => x.actor !== r) ? ` <span class="small muted">${esc([...new Set(xs.map((x) => name(x.actor)))].join(", "))}</span>` : ""}</li>`; }).join("")}</ul>`;
}

// ------------------------------------------------------------------ the time axis
const YEARS = (() => { const now = new Date().getFullYear(); const ys = []; for (let y = 2014; y <= now; y++) ys.push(y); return ys; })();
const endOf = (y) => `${y}-12-31`;
function countAt(at) {
  const actors = D.raw.actors.filter((a) => existsAt(a, at) && !isClass(a));
  const ok = new Set(D.raw.actors.filter((a) => existsAt(a, at)).map((a) => a.id));
  return {
    actors: actors.length,
    roles: D.raw.roles.filter((r) => ok.has(r.actor) && existsAt(r, at)).length,
    links: D.raw.links.filter((k) => ok.has(k.from) && ok.has(k.to) && existsAt(k, at)).length,
  };
}
function events() {
  const ev = [];
  const any = D.raw;
  any.actors.forEach((a) => { if (a.valid_from) ev.push({ d: day(a.valid_from), kind: "actor", html: actorLink(a.id), text: t("evActor") }); if (a.valid_to) ev.push({ d: day(a.valid_to), kind: "end", html: actorLink(a.id), text: t("evActorEnd") }); });
  any.roles.forEach((r) => { if (r.valid_from) ev.push({ d: day(r.valid_from), kind: "role", html: `${actorLink(r.actor)}: ${esc(vl("role", r.role))}`, text: t("evRole") }); if (r.valid_to) ev.push({ d: day(r.valid_to), kind: "end", html: `${actorLink(r.actor)}: ${esc(vl("role", r.role))}`, text: t("evRoleEnd") }); });
  any.links.forEach((k) => { if (k.valid_from) ev.push({ d: day(k.valid_from), kind: "link", html: `${actorLink(k.from)} → ${actorLink(k.to)}: ${esc(vl("link_type", k.type))}`, text: t("evLink") }); });
  D.acts.filter((a) => a.adopted).forEach((a) => ev.push({ d: a.adopted, kind: "act", html: actRef(a.id), text: t("evAct") }));
  driverEvents().forEach((e) => ev.push(e));
  return ev.sort((a, b) => a.d.localeCompare(b.d));
}
export function renderTime(app) {
  setTitle(t("nav_time"));
  const from = +(S.p.get("from") || 2017), to = +(S.p.get("to") || YEARS[YEARS.length - 1]);
  const now = YEARS[YEARS.length - 1];
  const today = new Date().toISOString().slice(0, 10); // "now" still hides drafts and entities not yet set up
  const counts = YEARS.map((y) => ({ y, ...countAt(y === now ? today : endOf(y)) }));
  const max = Math.max(...counts.map((c) => c.roles + c.links), 1);
  const bars = counts.map((c) => `<li><a href="#/time?at=${c.y === now ? "" : endOf(c.y)}" class="${(S.at ? S.at.slice(0, 4) : String(now)) === String(c.y) ? "on" : ""}"><span class="ty">${c.y}</span>
    <span class="tbar"><i class="tb-roles" style="width:${(c.roles / max) * 100}%"></i><i class="tb-links" style="width:${(c.links / max) * 100}%"></i></span>
    <span class="tn">${c.actors} · ${c.roles} · ${c.links}</span></a></li>`).join("");
  // what changed between two years
  const a = from === now ? today : endOf(from), b = to === now ? today : endOf(to);
  const diff = (rows, keyFn) => rows.filter((r) => existsAt(r, b) && !existsAt(r, a)).map(keyFn);
  const gone = (rows, keyFn) => rows.filter((r) => existsAt(r, a) && !existsAt(r, b)).map(keyFn);
  const added = [
    ...diff(D.raw.actors, (x) => `<li>${esc(t("evActor"))}: ${actorLink(x.id)}</li>`),
    ...diff(D.raw.roles, (x) => `<li>${esc(t("evRole"))}: ${actorLink(x.actor)} — ${esc(vl("role", x.role))}</li>`),
    ...diff(D.raw.links, (x) => `<li>${esc(t("evLink"))}: ${actorLink(x.from)} → ${actorLink(x.to)} (${esc(vl("link_type", x.type))})</li>`),
  ];
  const removed = [...gone(D.raw.actors, (x) => `<li>${actorLink(x.id)}</li>`), ...gone(D.raw.roles, (x) => `<li>${actorLink(x.actor)} — ${esc(vl("role", x.role))}</li>`)];
  const yearOpts = (id, v) => `<label class="field"><span>${esc(t(id === "f-from" ? "timeFrom" : "timeTo"))}</span><select id="${id}">${YEARS.map((y) => `<option value="${y}"${y === v ? " selected" : ""}>${y}${y === now ? ` (${esc(t("today"))})` : ""}</option>`).join("")}</select></label>`;
  const evs = events().filter((e) => e.d >= "2014");
  const byYear = {};
  evs.forEach((e) => (byYear[e.d.slice(0, 4)] = byYear[e.d.slice(0, 4)] || []).push(e));
  const undated = D.raw.roles.filter((r) => !r.valid_from && r.status === "in_force").length;
  app.innerHTML = `<article class="wide narrow">
    <div class="results-head"><h1>${esc(t("nav_time"))}</h1><p class="lead-sm">${esc(t("timeLead"))}</p></div>
    <h2>${esc(t("timeSnap"))}</h2><p class="lead-sm muted">${esc(t("timeSnapLead"))}</p>
    <ul class="tbars">${bars}</ul>
    <p class="hint"><i class="tkey tb-roles"></i> ${esc(t("timeRoles"))} <i class="tkey tb-links"></i> ${esc(t("timeLinks"))} · ${esc(t("timeNums"))}</p>
    <h2>${esc(t("timeDiff"))}</h2>
    <div class="inline-tools">${yearOpts("f-from", from)}${yearOpts("f-to", to)}</div>
    <div class="cards cards-2"><section class="card"><h3>${esc(fmt(t("timeAdded"), added.length))}</h3>${added.length ? `<ul class="plain small">${added.join("")}</ul>` : `<p class="muted">—</p>`}</section>
      <section class="card"><h3>${esc(fmt(t("timeRemoved"), removed.length))}</h3>${removed.length ? `<ul class="plain small">${removed.join("")}</ul>` : `<p class="muted">${esc(t("timeNoRemoved"))}</p>`}</section></div>
    <h2>${esc(t("timeEvents"))}</h2>
    <ol class="plain timeline">${Object.keys(byYear).map((y) => `<li><h3>${y}</h3><ul class="plain">${byYear[y].map((e) => `<li class="ev ev-${e.kind}"><span class="ev-d">${esc(e.d.length > 7 ? fmtDate(e.d) : e.d)}</span> <span class="ev-k">${esc(e.text)}</span> ${e.html}</li>`).join("")}</ul></li>`).join("")}</ol>
    <p class="hint">${esc(fmt(t("timeHint"), undated))}</p>
  </article>`;
  on("f-from", "change", (e) => setParam("from", e.target.value));
  on("f-to", "change", (e) => setParam("to", e.target.value));
}
