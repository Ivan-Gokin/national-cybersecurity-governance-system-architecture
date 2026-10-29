/* Level 1: views. Each is a projection of the same graph for one kind of question. */
import { D, S, t, fmt, esc, L, many, group, live, vl, vd, order, NIS2_EXCLUDED, KLIMBURG,
  name, rolesOf, root, family, isClass, mandatesOf, isMulti, groupsOf, GROUPS } from "./core.js";
import { LINK_GLYPH, actorLink, actorHref, actRef, mBadge, confBadge, statusBadge, multiMark, gap, select, selectOf,
  mandateItems, toggle, plannedToggle, on, ICON } from "./ui.js";
import { setTitle, setParam } from "./app.js";

const plannedWire = () => on("f-planned", "change", (e) => setParam("planned", e.target.checked ? "" : "0"));
const institutions = () => [...new Set(D.actors.filter((a) => !isClass(a) && a.tier !== "international").map((a) => root(a.id)))]
  .sort((a, b) => D.order[a] - D.order[b]);

// ------------------------------------------------------------------ structure: levels × categories (after interface's Cybersicherheitsarchitektur)
export function renderStructure(app) {
  setTitle(t("nav_structure"));
  const hl = S.p.get("hl") || "";
  const levels = order("level");
  const cats = [...order("category"), ""];
  const bodies = D.actors.filter((a) => !isClass(a) && a.tier !== "leadership");
  const cell = (lv, c) => bodies.filter((a) => a.level === lv && (c ? many(a.categories).includes(c) : !many(a.categories).length))
    .map((a) => `<a class="hchip${hl && root(a.id) === hl ? " hl" : ""}${rolesOf(a.id).length && rolesOf(a.id).every((r) => r.status !== "in_force") ? " is-planned" : ""}" data-family="${esc(root(a.id))}" href="${actorHref(a.id)}" title="${esc(L(a, "name"))}">${esc(L(a, "short"))}</a>`).join("");
  const grid = `<table class="struct${hl ? " has-hl" : ""}"><thead><tr><th class="corner">${esc(t("colLevel"))} \\ ${esc(t("fCategory"))}</th>${cats.map((c) => `<th scope="col">${esc(c ? vl("category", c) : t("noCategory"))}</th>`).join("")}</tr></thead>
    <tbody>${levels.map((lv) => `<tr><th scope="row">${esc(vl("level", lv))}</th>${cats.map((c) => `<td>${cell(lv, c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  // concentration: how many cells and role groups each institution occupies
  const conc = institutions().map((r) => {
    const fam = family(r);
    const cells = new Set(fam.flatMap((m) => many(D.actor[m].categories).map((c) => `${D.actor[m].level}|${c}`)));
    const g = Object.keys(groupsOf(fam)).filter((x) => x !== "entity");
    return { r, units: fam.length, cells: cells.size, groups: g, roles: fam.reduce((s, m) => s + rolesOf(m).length, 0) };
  }).filter((x) => x.roles).sort((a, b) => b.groups.length - a.groups.length || b.roles - a.roles);
  const concRows = conc.map((x) => `<tr${x.r === hl ? ' class="row-hl"' : ""}><th scope="row"><a href="#/structure?hl=${esc(x.r)}">${esc(name(x.r))}</a></th><td class="num">${x.units}</td><td class="num">${x.roles}</td><td class="num">${x.cells}</td>
    <td>${GROUPS.map((g) => `<span class="hat${x.groups.includes(g) ? " on" : ""}" title="${esc(t("grp_" + g))}">${esc(t("grp_" + g + "_s"))}</span>`).join("")}</td></tr>`).join("");
  // the selected institution's typed links, in and out
  let linksBox = "";
  if (hl && D.actor[hl]) {
    const fam = new Set(family(hl));
    const ks = D.links.filter(live).filter((k) => fam.has(k.from) || fam.has(k.to)).filter((k) => !(fam.has(k.from) && fam.has(k.to)));
    const byType = group(ks, "type");
    linksBox = `<h2>${esc(fmt(t("structLinks"), name(hl)))}</h2><ul class="plain legend">${order("link_type").filter((ty) => byType[ty]).map((ty) => `<li><span class="lglyph lt-${esc(ty)}">${LINK_GLYPH[ty]}</span><span><b>${esc(vl("link_type", ty))}</b>
      <span class="block">${byType[ty].map((k) => `${actorLink(k.from)} → ${actorLink(k.to)}`).join(" · ")}</span></span></li>`).join("")}</ul>`;
  }
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_structure"))}</h1><p class="lead-sm">${esc(t("structLead"))}</p>
      <div class="inline-tools">${selectOf("f-hl", t("hlInst"), institutions().map((id) => [id, name(id)]), hl, t("none"))}${plannedToggle()}</div></div>
    <div class="table-wrap">${grid}</div>
    <p class="hint">${esc(t("structHint"))}</p>
    ${linksBox}
    <h2>${esc(t("concTitle"))}</h2><p class="lead-sm">${esc(t("concLead"))}</p>
    <div class="table-wrap"><table class="conc"><thead><tr><th>${esc(t("colInst"))}</th><th>${esc(t("colUnits"))}</th><th>${esc(t("colRoles"))}</th><th>${esc(t("colCells"))}</th><th>${esc(t("colHats"))}</th></tr></thead><tbody>${concRows}</tbody></table></div>
    <p class="hint">${GROUPS.map((g) => `<span class="hat on">${esc(t("grp_" + g + "_s"))}</span> ${esc(t("grp_" + g))}`).join(" · ")}</p>
  </article>`;
  on("f-hl", "change", (e) => setParam("hl", e.target.value));
  plannedWire();
}

// ------------------------------------------------------------------ actors list
export function renderActors(app) {
  setTitle(t("nav_actors"));
  const f = Object.fromEntries(["q", "mandate", "level", "type", "category", "conf", "tier"].map((k) => [k, S.p.get(k) || ""]));
  const match = (a) => (!f.level || a.level === f.level) && (!f.type || a.type === f.type) && (!f.tier || a.tier === f.tier)
    && (!f.category || many(a.categories).includes(f.category)) && (!f.conf || a.confidence === f.conf)
    && (!f.mandate || mandatesOf(a.id).includes(f.mandate))
    && (!f.q || [a.short_uk, a.short_en, a.name_uk, a.name_en, a.notes_uk, a.notes_en].join(" ").toLowerCase().includes(f.q.toLowerCase()));
  const rows = D.actors.filter(match);
  const roleList = (id) => rolesOf(id).map((r) => `<li>${esc(vl("role", r.role))}${statusBadge(r.status)}</li>`).join("");
  const body = rows.map((a) => `<tr>
      <th scope="row"><a class="ent" href="${actorHref(a.id)}">${esc(L(a, "short"))}</a><span class="ent-name">${esc(L(a, "name"))}</span>${a.parent ? `<span class="ent-parent">${esc(t("partOf"))} ${actorLink(a.parent)}</span>` : ""}</th>
      <td>${mandatesOf(a.id).map(mBadge).join(" ") || '<span class="muted">—</span>'}${multiMark(a.id)}</td>
      <td><ul class="plain">${roleList(a.id) || `<li class="muted">${esc(t("noRole"))}</li>`}</ul></td>
      <td>${esc(vl("level", a.level))}<span class="block small muted">${esc(vl("actor_type", a.type))}</span></td>
      <td>${confBadge(a.confidence)}</td></tr>`).join("");
  app.innerHTML = `<div class="workspace">
    <details class="panel" open><summary>${esc(t("filters"))}</summary><div class="panel-body">
      <div class="find"><label class="search"><span class="sr-only">${esc(t("search"))}</span>${ICON.search}<input type="search" id="f-q" value="${esc(f.q)}" placeholder="${esc(t("searchActors"))}"></label>
      <button type="button" class="btn btn-quiet" id="f-reset">${esc(t("reset"))}</button></div>
      ${selectOf("f-mandate", t("fMandate"), mandateItems(), f.mandate)}${select("f-tier", t("fTier"), "tier", f.tier)}${select("f-level", t("fLevel"), "level", f.level)}${select("f-type", t("fType"), "actor_type", f.type)}
      ${select("f-category", t("fCategory"), "category", f.category)}${select("f-conf", t("fConf"), "confidence", f.conf)}
      ${plannedToggle()}
    </div></details>
    <section><div class="results-head"><h1>${esc(t("nav_actors"))}</h1><p class="summary">${esc(fmt(t("actorsCount"), rows.length, D.actors.length))}</p><p class="lead-sm muted">${esc(t("actorsLead"))}</p></div>
      <div class="table-wrap"><table class="actors"><thead><tr><th>${esc(t("colActor"))}</th><th>${esc(t("colMandates"))}</th><th>${esc(t("colRoles"))}</th><th>${esc(t("colLevel"))}</th><th>${esc(t("colConf"))}</th></tr></thead>
      <tbody>${body || `<tr><td colspan="5" class="empty">${esc(t("nothing"))}</td></tr>`}</tbody></table></div></section></div>`;
  let timer;
  on("f-q", "input", (e) => { clearTimeout(timer); timer = setTimeout(() => { setParam("q", e.target.value.trim()); const q = document.getElementById("f-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); });
  ["mandate", "tier", "level", "type", "category", "conf"].forEach((k) => on(`f-${k}`, "change", (e) => setParam(k, e.target.value)));
  on("f-reset", "click", () => { S.p = new URLSearchParams(); setParam("planned", ""); });
  plannedWire();
}

// ------------------------------------------------------------------ mandates matrix
export function renderMandates(app) {
  setTitle(t("nav_mandates"));
  const multi = S.p.get("multi") === "1";
  const cols = D.mandates;
  const rows = D.actors.filter((a) => rolesOf(a.id).length).filter((a) => !multi || isMulti(a.id));
  const cell = (a, m) => rolesOf(a.id).filter((r) => r.mandate === m.id)
    .map((r) => `<span class="rchip conf-edge-${esc(r.confidence)}" title="${esc(D.act[r.act] ? L(D.act[r.act], "short_ref") + (r.provision ? ", " + r.provision : "") : t("noBasis"))}">${esc(vl("role", r.role))}${r.status !== "in_force" ? "*" : ""}</span>`).join("");
  const head = cols.map((m) => `<th scope="col" class="mcol mcol-${esc(m.id)}"><span class="mcol-id">${mBadge(m.id)}</span><span class="mcol-name">${esc(L(m, "name"))}</span></th>`).join("");
  const body = rows.map((a) => `<tr${isMulti(a.id) ? ' class="is-multi"' : ""}><th scope="row">${actorLink(a.id)}${multiMark(a.id)}</th>
    ${cols.map((m) => `<td class="mcell mcell-${esc(m.id)}">${cell(a, m)}</td>`).join("")}</tr>`).join("");
  const counts = Object.fromEntries(cols.map((m) => [m.id, new Set(D.roles.filter((r) => r.mandate === m.id && live(r)).map((r) => r.actor)).size]));
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_mandates"))}</h1><p class="lead-sm">${esc(t("mandatesLead"))}</p>
      <div class="inline-tools">${toggle("f-multi", t("onlyMulti"), multi)}${plannedToggle()}</div></div>
    <div class="table-wrap"><table class="matrix"><thead><tr><th>${esc(t("colActor"))}</th>${head}</tr></thead><tbody>${body}</tbody>
      <tfoot><tr><th>${esc(t("actorsInMandate"))}</th>${cols.map((m) => `<td class="num">${counts[m.id]}</td>`).join("")}</tr></tfoot></table></div>
    <p class="hint">${esc(t("matrixHint"))}</p>
    <h2>${esc(t("mandatesWhat"))}</h2>
    <dl class="mandate-list">${cols.map((m) => `<div><dt>${mBadge(m.id)} ${esc(L(m, "name"))}</dt><dd>${esc(L(m, "description"))}<span class="block small muted">${esc(t("legalRegime"))}: ${esc(L(m, "regime"))}</span></dd></div>`).join("")}</dl>
  </article>`;
  on("f-multi", "change", (e) => setParam("multi", e.target.checked ? "1" : ""));
  plannedWire();
}

// ------------------------------------------------------------------ NCAF 2.0
export const boundary = (o) => many(o.mandates).filter((m) => m !== "OUT").length > 1 || many(o.mandates).includes("XC");
export function renderNcaf(app) {
  setTitle(t("nav_ncaf"));
  const plan = (o) => `<span class="badge plan-${esc(o.plan_2026)}">${esc(t("plan_" + o.plan_2026))}</span>`;
  const types = (o) => D.types.filter((x) => many(x.ncaf).includes(o.id));
  const tile = (o) => `<li class="obj${boundary(o) ? " obj-boundary" : ""}${!o.subjects ? " obj-empty" : ""}" id="obj-${esc(o.id)}">
      <p class="obj-top"><span class="obj-num">${esc(o.id)}</span>${many(o.mandates).map(mBadge).join(" ")}</p>
      <h3>${esc(L(o, "name"))}</h3>
      <p class="obj-subj">${many(o.subjects).map((id) => actorLink(id)).join(", ") || `<span class="muted">${esc(t("noSubject"))}</span>`}</p>
      ${types(o).filter((x) => x.coverage === "absent").map((x) => `<p class="obj-absent"><a href="#/types?t=${esc(x.id)}">${esc(fmt(t("objAbsent"), L(x, "name")))}</a></p>`).join("")}
      ${L(o, "notes") ? `<p class="obj-note">${esc(L(o, "notes"))}</p>` : ""}
      <p class="obj-foot">${boundary(o) ? `<span class="badge b-boundary">${esc(t("boundary"))}</span>` : ""}${plan(o)}</p></li>`;
  const cols = D.clusters.map((c) => `<section class="cluster"><h2><span class="kicker">${esc(t("cluster"))} ${esc(c.id)}</span>${esc(L(c, "name"))}</h2>
    <ol class="objs">${D.objectives.filter((o) => o.cluster === c.id).map(tile).join("")}</ol></section>`).join("");
  const rows = D.mandates.map((m) => {
    const cells = D.clusters.map((c) => D.objectives.filter((o) => o.cluster === c.id && many(o.mandates).includes(m.id)).map((o) => o.id));
    const objs = D.objectives.filter((o) => many(o.mandates).includes(m.id));
    // NIS2 (art. 2) leaves national security and defence to the member states, so the NCAF has no objective of its own for M1 or M3
    const edgeOnly = NIS2_EXCLUDED.includes(m.id) && objs.every((o) => many(o.mandates).filter((x) => x !== "OUT").length > 1);
    const note = !objs.length ? t("rowBlind") : edgeOnly ? t("rowEdge") : m.id === "OUT" ? t("rowOut") : "";
    return `<tr class="${!objs.length || edgeOnly ? "row-blind" : ""}${m.id === "OUT" ? " row-out" : ""}"><th scope="row">${mBadge(m.id)} ${esc(L(m, "name"))}${note ? `<span class="block small row-note">${esc(note)}</span>` : ""}</th>${cells.map((x) => `<td class="num">${x.map((n) => `<a href="#obj-${n}">${n}</a>`).join(" · ")}</td>`).join("")}</tr>`;
  }).join("");
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("ncafTitle"))}</h1><p class="lead-sm">${esc(t("ncafLead"))}</p></div>
    <div class="clusters">${cols}</div>
    <h2>${esc(t("overlapTitle"))}</h2><p class="lead-sm">${esc(t("overlapLead"))}</p>
    <div class="table-wrap"><table class="overlap"><thead><tr><th>${esc(t("colMandate"))}</th>${D.clusters.map((c) => `<th>${esc(t("cluster"))} ${esc(c.id)}<span class="block small">${esc(L(c, "name"))}</span></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint">${esc(t("overlapHint"))}</p>
  </article>`;
  app.querySelectorAll('a[href^="#obj-"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const el = document.getElementById(a.getAttribute("href").slice(1)); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }));
}

// ------------------------------------------------------------------ links: dependency matrix
export function renderLinks(app) {
  setTitle(t("nav_links"));
  const ltype = S.p.get("ltype") || "", lactor = S.p.get("lactor") || "";
  const shown = D.links.filter(live).filter((k) => (!ltype || k.type === ltype) && (!lactor || k.from === lactor || k.to === lactor));
  const ids = [...new Set(shown.flatMap((k) => [k.from, k.to]))].sort((a, b) => D.order[a] - D.order[b]);
  const at = {};
  shown.forEach((k) => ((at[`${k.from}|${k.to}`] = at[`${k.from}|${k.to}`] || []).push(k)));
  const dsm = `<table class="dsm"><thead><tr><th class="corner">${esc(t("dsmCorner"))}</th>${ids.map((id) => `<th scope="col" class="vert"><span>${esc(name(id))}</span></th>`).join("")}</tr></thead>
    <tbody>${ids.map((r) => `<tr><th scope="row">${actorLink(r)}</th>${ids.map((c) => {
      const ks = at[`${r}|${c}`] || [];
      return `<td class="${r === c ? "diag" : ""}${ks.length ? " has" : ""}">${ks.map((k) => `<span class="lglyph lt-${esc(k.type)}${k.status !== "in_force" ? " is-planned" : ""}" title="${esc(`${name(r)} → ${name(c)}: ${vl("link_type", k.type)}`)}">${LINK_GLYPH[k.type] || "·"}</span>`).join("")}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>`;
  const legend = order("link_type").map((ty) => `<li><span class="lglyph lt-${esc(ty)}">${LINK_GLYPH[ty] || "·"}</span><span><b>${esc(vl("link_type", ty))}</b>${vd("link_type", ty) ? `<span class="block muted">${esc(vd("link_type", ty))}</span>` : ""}</span></li>`).join("");
  const byType = group(shown, "type");
  const lists = order("link_type").filter((ty) => byType[ty]).map((ty) => `<tr class="group"><th colspan="4">${LINK_GLYPH[ty] || ""} ${esc(vl("link_type", ty))} (${byType[ty].length})</th></tr>${byType[ty].map((k) => `<tr>
      <th scope="row">${actorLink(k.from)} → ${actorLink(k.to)}${statusBadge(k.status)}</th><td>${actRef(k.act)}</td><td>${confBadge(k.confidence)}</td><td class="small">${esc(L(k, "notes"))}</td></tr>`).join("")}`).join("");
  const withLinks = [...new Set(D.links.flatMap((k) => [k.from, k.to]))].sort((a, b) => D.order[a] - D.order[b]).map((id) => [id, name(id)]);
  app.innerHTML = `<div class="workspace">
    <details class="panel" open><summary>${esc(t("filters"))}</summary><div class="panel-body">
      ${select("f-ltype", t("fLinkType"), "link_type", ltype)}${selectOf("f-lactor", t("fActor"), withLinks, lactor)}${plannedToggle()}
      <h2 class="panel-h">${esc(t("legend"))}</h2><ul class="plain legend">${legend}</ul>
    </div></details>
    <section><div class="results-head"><h1>${esc(t("nav_links"))}</h1><p class="summary">${esc(fmt(t("linksCount"), shown.length, ids.length))}</p><p class="lead-sm muted">${esc(t("linksLead"))}</p></div>
      <div class="table-wrap dsm-wrap">${dsm}</div><p class="hint">${esc(t("dsmHint"))}</p>
      <h2>${esc(t("linksAll"))}</h2>
      <div class="table-wrap"><table class="links"><thead><tr><th>${esc(t("colLink"))}</th><th>${esc(t("colBasis"))}</th><th>${esc(t("colConf"))}</th><th>${esc(t("colNotes"))}</th></tr></thead><tbody>${lists || `<tr><td colspan="4" class="empty">${esc(t("nothing"))}</td></tr>`}</tbody></table></div>
    </section></div>`;
  on("f-ltype", "change", (e) => setParam("ltype", e.target.value));
  on("f-lactor", "change", (e) => setParam("lactor", e.target.value));
  plannedWire();
}

// ------------------------------------------------------------------ incident flow (swimlanes)
export function renderFlow(app) {
  setTitle(t("nav_flow"));
  const stages = order("stage");
  const lanes = [...new Set(D.steps.map((s) => s.actor))];
  const grid = `<div class="lanes" id="lanes" style="--stages:${stages.length}">
    <div class="lane-corner"></div>${stages.map((s) => `<div class="lane-stage">${esc(vl("stage", s))}</div>`).join("")}
    ${lanes.map((a) => `<div class="lane-head">${actorLink(a)}<span class="block small muted">${mandatesOf(a).filter((m) => m !== "OUT").map(mBadge).join(" ")}</span></div>
      ${stages.map((s) => `<div class="lane-cell${D.actor[a] && D.actor[a].tier === "coordination" ? " lane-coord" : ""}">${D.steps.filter((x) => x.actor === a && x.stage === s).map((x) => `<div class="step${x.absent === "yes" ? " step-absent" : ""}" id="step-${esc(x.id)}">${esc(L(x, "activity"))}</div>`).join("")}</div>`).join("")}`).join("")}
    <svg class="lane-arrows" id="lane-arrows" aria-hidden="true"></svg></div>`;
  const items = D.handoffs.map((h, i) => {
    const ruled = !!h.rule_act;
    return `<li class="handoff${ruled ? " ruled" : ""}"><span class="h-num">${i + 1}</span><div>
      <p><b>${actorLink(D.step[h.from].actor)}</b> (${esc(L(D.step[h.from], "activity"))}) → <b>${actorLink(D.step[h.to].actor)}</b> (${esc(L(D.step[h.to], "activity"))})</p>
      <p class="small">${h.ncaf ? `<a class="badge" href="#/ncaf">${esc(t("ncafObj"))} ${esc(h.ncaf)}</a> ` : ""}${ruled ? `${esc(t("ruleBy"))} ${actRef(h.rule_act)}` : gap(t("noRule"))}</p>
      ${L(h, "notes") ? `<p class="muted small">${esc(L(h, "notes"))}</p>` : ""}</div></li>`;
  }).join("");
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("flowTitle"))}</h1><p class="lead-sm">${esc(t("flowLead"))}</p></div>
    <div class="table-wrap lanes-wrap">${grid}</div>
    <p class="hint">${esc(t("flowHint"))}</p>
    <h2>${esc(t("handoffsTitle"))}</h2><ol class="handoffs">${items}</ol>
  </article>`;
  drawArrows();
}
function drawArrows() {
  const box = document.getElementById("lanes"), svg = document.getElementById("lane-arrows");
  if (!box || !svg) return;
  const b = box.getBoundingClientRect();
  svg.setAttribute("width", b.width); svg.setAttribute("height", b.height);
  svg.setAttribute("viewBox", `0 0 ${b.width} ${b.height}`);
  const pos = (id) => { const el = document.getElementById("step-" + id); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }; };
  let out = `<defs><marker id="ah-gap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah-gap"/></marker><marker id="ah-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah-ok"/></marker></defs>`;
  D.handoffs.forEach((h, i) => {
    const a = pos(h.from), c = pos(h.to);
    if (!a || !c) return;
    let x1, y1, x2, y2, d;
    const same = Math.abs(a.x - c.x) < 8;
    const between = same && D.steps.some((st) => {
      if (st.id === h.from || st.id === h.to) return false;
      const q = pos(st.id);
      return q && Math.abs(q.x - a.x) < 8 && q.y > Math.min(a.y, c.y) && q.y < Math.max(a.y, c.y);
    });
    if (between) { // same stage with a box in the way: run down the right side of the column
      x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = c.x + c.w; y2 = c.y + c.h / 2;
      const gx = Math.max(x1, x2) + 7;
      d = `M${x1} ${y1}H${gx}V${y2}H${x2 + 2}`;
      x1 = gx; x2 = gx;
    } else if (same) {
      x1 = a.x + a.w / 2; y1 = c.y > a.y ? a.y + a.h : a.y; x2 = c.x + c.w / 2; y2 = c.y > a.y ? c.y : c.y + c.h;
      d = `M${x1} ${y1}L${x2} ${y2}`;
    } else {
      x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = c.x; y2 = c.y + c.h / 2;
      const mx = (x1 + x2) / 2;
      d = `M${x1} ${y1}H${mx}V${y2}H${x2 - 2}`;
    }
    const ok = !!h.rule_act;
    const lx = (x1 + x2) / 2 + (same && !between ? 14 : 0), ly = (y1 + y2) / 2;
    out += `<path d="${d}" class="${ok ? "ar-ok" : "ar-gap"}" marker-end="url(#${ok ? "ah-ok" : "ah-gap"})"/><g class="ar-num"><circle cx="${lx}" cy="${ly}" r="10" class="${ok ? "ah-ok" : "ah-gap"}"/><text x="${lx}" y="${ly + 4}">${i + 1}</text></g>`;
  });
  svg.innerHTML = out;
}
window.addEventListener("resize", () => { if (S.route === "flow") drawArrows(); });
