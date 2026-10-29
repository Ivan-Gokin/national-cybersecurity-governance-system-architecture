/* Tools that work on the representation: the catalogue of expected body types, the automated checks, the list of
 * acts, search, and the method page. They read the same graph as the views and add nothing to it. */
import { D, S, t, fmt, esc, L, many, live, vl, vd, order, name, rolesOf, checks, loadMd } from "./core.js";
import { actorLink, actRef, actHref, covBadge, confBadge, gap, select, on, repo, ICON } from "./ui.js";
import { setTitle, setParam } from "./app.js";

const focusOn = (id) => { const el = document.getElementById(id); if (el) { el.classList.add("is-focus"); el.scrollIntoView({ block: "start" }); } };

// ------------------------------------------------------------------ expected body types
// What a national system of this kind is expected to have (NIS2, ENISA NCAF 2.0, practice of EU member states and
// FIRST/CVE programmes), and whether Ukraine has a body that does it. "Absent" is a finding, not a missing row.
export function renderTypes(app) {
  setTitle(t("nav_types"));
  const cov = S.p.get("cov") || "";
  const sel = S.p.get("t") || "";
  const covOrder = ["absent", "unknown", "partial", "planned", "present"];
  const counts = Object.fromEntries(covOrder.map((c) => [c, D.types.filter((x) => x.coverage === c).length]));
  const list = D.types.filter((x) => !cov || x.coverage === cov).sort((a, b) => covOrder.indexOf(a.coverage) - covOrder.indexOf(b.coverage));
  const tile = (x) => `<li class="card type-card cov-edge-${esc(x.coverage)}" id="type-${esc(x.id)}">
    <p class="obj-top">${covBadge(x.coverage)}${many(x.ncaf).map((n) => `<a class="badge" href="#/ncaf" title="${esc(D.objective[n] ? L(D.objective[n], "name") : "")}">NCAF ${esc(n)}</a>`).join(" ")}</p>
    <h3>${esc(L(x, "name"))}</h3>
    <p class="small"><b>${esc(t("typeBasis"))}:</b> ${esc(L(x, "basis"))}</p>
    <p>${many(x.actors).length ? `${esc(t("typeWho"))}: ${many(x.actors).map((id) => actorLink(id)).join(", ")}` : gap(x.coverage === "unknown" ? t("typeUnknown") : t("typeNobody"))}</p>
    ${L(x, "notes") ? `<p class="obj-note">${esc(L(x, "notes"))}</p>` : ""}
    <p class="obj-foot">${confBadge(x.confidence)}</p></li>`;
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_types"))}</h1><p class="lead-sm">${esc(t("typesLead"))}</p></div>
    <ul class="covbar">${covOrder.map((c) => `<li><a href="#/types${c === cov ? "" : "?cov=" + c}" class="cov-${esc(c)}${c === cov ? " on" : ""}"><b>${counts[c]}</b><span>${esc(vl("coverage", c))}</span></a></li>`).join("")}</ul>
    <ol class="plain type-grid">${list.map(tile).join("")}</ol>
    <p class="hint">${esc(t("typesHint"))}</p>
  </article>`;
  if (sel) focusOn(`type-${sel}`);
}

// ------------------------------------------------------------------ automated checks
const SEV = { gap: "b-gap", warn: "b-boundary", info: "" };
function itemHtml(i) {
  const parts = [];
  if (i.actor) parts.push(actorLink(i.actor));
  if (i.to) parts.push(`→ ${actorLink(i.to)}`);
  if (i.type) parts.push(`<a href="#/types?t=${esc(i.type)}">${esc(i.text)}</a> ${covBadge(i.coverage)}`);
  else if (i.objective) parts.push(`<a href="#/ncaf">${esc(i.objective)}</a> ${esc(i.text)}`);
  else if (i.act) parts.push(actRef(i.act));
  else if (i.text) parts.push(`<span class="${i.actor ? "muted" : ""}">${i.actor ? "· " : ""}${esc(i.text)}</span>`);
  return `<li>${parts.join(" ")}</li>`;
}
export function renderChecks(app) {
  setTitle(t("nav_checks"));
  const sel = S.p.get("c") || "";
  const all = checks();
  const sum = (sev) => all.filter((c) => c.severity === sev).reduce((s, c) => s + c.items.length, 0);
  app.innerHTML = `<article class="wide narrow">
    <div class="results-head"><h1>${esc(t("nav_checks"))}</h1><p class="lead-sm">${esc(t("checksLead"))}</p>
      <p class="summary">${esc(fmt(t("checksSum"), sum("gap"), sum("warn"), sum("info")))}</p></div>
    ${all.map((c) => `<details class="check card" id="chk-${esc(c.id)}"${c.id === sel || (!sel && c.severity === "gap" && c.items.length) ? " open" : ""}>
      <summary><span class="badge ${SEV[c.severity]}">${esc(t("sev_" + c.severity))}</span> <b>${esc(t("chk_" + c.id))}</b> <span class="muted">(${c.items.length})</span></summary>
      <p class="small muted">${esc(t("chk_" + c.id + "_d"))}</p>
      ${c.items.length ? `<ul class="plain check-items">${c.items.map(itemHtml).join("")}</ul>` : `<p class="small">${esc(t("checkClean"))}</p>`}
    </details>`).join("")}
    <p class="hint">${esc(t("checksHint"))}</p>
  </article>`;
  if (sel) focusOn(`chk-${sel}`);
}

// ------------------------------------------------------------------ acts
export function renderActs(app) {
  setTitle(t("nav_acts"));
  const ty = S.p.get("type") || "";
  const types = [...new Set(D.acts.map((a) => a.type))];
  const rows = D.acts.filter((a) => !ty || a.type === ty).sort((a, b) => +a.register_no - +b.register_no);
  const nRoles = (id) => (D.rolesByAct[id] || []).filter(live).length;
  const nLinks = (id) => (D.linksByAct[id] || []).filter(live).length;
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_acts"))}</h1><p class="lead-sm">${esc(fmt(t("actsLead"), (D.meta.register || {}).data_version || ""))}</p>
      <div class="inline-tools"><label class="field"><span>${esc(t("fActType"))}</span><select id="f-type"><option value="">${esc(t("all"))}</option>${types.map((x) => `<option value="${esc(x)}"${x === ty ? " selected" : ""}>${esc(L(D.acts.find((a) => a.type === x), "type") || x)}</option>`).join("")}</select></label></div></div>
    <div class="table-wrap"><table class="acts-t"><thead><tr><th>${esc(t("colAct"))}</th><th>${esc(t("colTitle"))}</th><th>${esc(t("colRoles"))}</th><th>${esc(t("colLinks"))}</th><th>${esc(t("colStatus"))}</th></tr></thead>
    <tbody>${rows.map((a) => `<tr><th scope="row"><a class="ent" href="${actHref(a.id)}">${esc(L(a, "short_ref"))}</a><span class="block small muted">${esc(L(a, "type"))}</span></th>
      <td>${esc(L(a, "title"))}</td><td class="num">${nRoles(a.id)}</td><td class="num">${nLinks(a.id)}</td>
      <td><span class="badge st-${esc(a.status)}">${esc(vl("status", a.status) || a.status)}</span>${a.last_verified ? "" : ` ${gap(t("notVerified"))}`}</td></tr>`).join("")}</tbody></table></div>
    <p class="hint">${esc(t("actsHint"))}</p>
  </article>`;
  on("f-type", "change", (e) => setParam("type", e.target.value));
}

// ------------------------------------------------------------------ search
export function renderSearch(app) {
  const q = (S.p.get("q") || "").trim();
  setTitle(q ? `${t("search")}: ${q}` : t("search"));
  const has = (...v) => v.join(" ").toLowerCase().includes(q.toLowerCase());
  const res = !q ? null : {
    actors: D.actors.filter((a) => has(a.short_uk, a.short_en, a.name_uk, a.name_en, a.notes_uk, a.notes_en) || rolesOf(a.id).some((r) => has(vl("role", r.role)))),
    types: D.types.filter((x) => has(x.name_uk, x.name_en, x.basis_uk, x.basis_en, x.notes_uk, x.notes_en)),
    acts: D.acts.filter((a) => has(a.short_ref_uk, a.short_ref_en, a.title_uk, a.title_en, a.number, a.id)),
    objectives: D.objectives.filter((o) => has(o.name_uk, o.name_en, o.notes_uk, o.notes_en)),
  };
  const block = (k, list, fn) => (list.length ? `<h2>${esc(t("res_" + k))} <span class="muted">(${list.length})</span></h2><ul class="plain results">${list.map(fn).join("")}</ul>` : "");
  const total = res ? Object.values(res).reduce((s, l) => s + l.length, 0) : 0;
  app.innerHTML = `<article class="wide narrow">
    <div class="results-head"><h1>${esc(t("search"))}</h1>
      <form id="sform" class="find" role="search"><label class="search"><span class="sr-only">${esc(t("search"))}</span>${ICON.search}<input type="search" id="sq" value="${esc(q)}" placeholder="${esc(t("searchAll"))}"></label><button class="btn" type="submit">${esc(t("search"))}</button></form>
      ${q ? `<p class="summary">${esc(fmt(t("searchCount"), total, q))}</p>` : `<p class="lead-sm muted">${esc(t("searchLead"))}</p>`}</div>
    ${res ? block("actors", res.actors, (a) => `<li>${actorLink(a.id, "ent")} <span class="small muted">${esc(L(a, "name"))}</span></li>`)
      + block("types", res.types, (x) => `<li><a href="#/types?t=${esc(x.id)}">${esc(L(x, "name"))}</a> ${covBadge(x.coverage)}</li>`)
      + block("acts", res.acts, (a) => `<li>${actRef(a.id)} <span class="small muted">${esc(L(a, "title"))}</span></li>`)
      + block("objectives", res.objectives, (o) => `<li><a href="#/ncaf">${esc(o.id)}</a> ${esc(L(o, "name"))}</li>`) : ""}
    ${q && !total ? `<p class="empty">${esc(t("nothing"))}</p>` : ""}
  </article>`;
  on("sform", "submit", (e) => { e.preventDefault(); setParam("q", document.getElementById("sq").value.trim()); });
}

// ------------------------------------------------------------------ method and data
export async function renderMethod(app) {
  setTitle(t("nav_method"));
  const r = repo();
  const files = [["actors.csv", D.actors], ["roles.csv", D.roles], ["links.csv", D.links], ["expected_types.csv", D.types], ["mandates.csv", D.mandates],
    ["ncaf_objectives.csv", D.objectives], ["ncaf_clusters.csv", D.clusters], ["flow_steps.csv", D.steps], ["flow_handoffs.csv", D.handoffs]];
  const vocabTable = (kind) => `<div class="table-wrap"><table class="vocab"><tbody>${order(kind).map((id) => `<tr><th scope="row"><code>${esc(id)}</code></th><td>${esc(vl(kind, id))}</td><td class="small muted">${esc(vd(kind, id))}</td></tr>`).join("")}</tbody></table></div>`;
  const conf = {};
  [D.actors, D.roles, D.links].forEach((rows) => rows.forEach((x) => (conf[x.confidence] = (conf[x.confidence] || 0) + 1)));
  const reg = D.meta.register || {};
  app.innerHTML = `<article class="prose readable method">
    <div id="method-md"><p class="loading">…</p></div>
    <h2 id="data">${esc(t("dataTitle"))}</h2>
    <p>${esc(t("dataLead"))}</p>
    <div class="table-wrap"><table class="files-t"><thead><tr><th>${esc(t("colFile"))}</th><th>${esc(t("colRows"))}</th></tr></thead><tbody>${files.map(([f, rows]) => `<tr><th scope="row"><a href="data/${f}" download>${esc(f)}</a></th><td class="num">${rows.length}</td></tr>`).join("")}
      <tr><th scope="row"><a href="data/graph.json" download>graph.json</a></th><td class="small">${esc(t("graphFile"))}</td></tr></tbody></table></div>
    <p><a class="btn btn-line" href="data/cybersecurity-governance-data.zip" download>${esc(t("zipAll"))}</a></p>
    <p class="small">${esc(fmt(t("registerPinned"), reg.repo || "", (reg.commit || "").slice(0, 7), reg.data_version || ""))}</p>
    <p class="small">${esc(t("confState"))} ${Object.entries(conf).map(([c, n]) => `${confBadge(c)} ${n}`).join(" ")}</p>
    <h3>${esc(t("vocabLinks"))}</h3>${vocabTable("link_type")}
    <h3>${esc(t("vocabRoles"))}</h3>${vocabTable("role")}
    <h3>${esc(t("vocabCoverage"))}</h3>${vocabTable("coverage")}
    <h3>${esc(t("vocabConf"))}</h3>${vocabTable("confidence")}
    ${r ? `<h2>${esc(t("contributeTitle"))}</h2><p>${esc(t("contributeLead"))}</p>
      <p class="home-cta"><a class="btn" href="${esc(r)}/issues/new?template=actor.yml" target="_blank" rel="noopener">${esc(t("issueActor"))}</a><a class="btn" href="${esc(r)}/issues/new?template=link.yml" target="_blank" rel="noopener">${esc(t("issueLink"))}</a><a class="btn" href="${esc(r)}" target="_blank" rel="noopener">GitHub</a></p>` : ""}
  </article>`;
  const html = await loadMd("method");
  const box = document.getElementById("method-md");
  if (box) box.innerHTML = html;
}
