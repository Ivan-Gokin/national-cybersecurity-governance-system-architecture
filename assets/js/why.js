/* "Why": three answers kept apart. The basis (the act that grants a power) is on every card already; this module adds
 * the drivers (what pushed or pushes things: threats, events, the EU, donors, institutional history, others' practice)
 * and the goal (the NCAF objective a function serves). Drivers follow ArchiMate's motivation layer; their mechanisms
 * are typed after DiMaggio and Powell (coercive, mimetic, normative), Kingdon (pressure of events), resource
 * dependence and path dependence. */
import { D, S, t, fmt, esc, L, many, vl, vd, order, name, capFlags } from "./core.js";
import { actorLink, actRef, confBadge, covBadge, mBadge, ext, on } from "./ui.js";
import { setTitle, setParam, fmtDate } from "./app.js";

export const driverHref = (id) => `#/why?d=${encodeURIComponent(id)}`;
const dateLabel = (d) => (!d ? "" : d.length === 10 ? fmtDate(d) : d);
export function targetLink(type, id) {
  if (type === "capability" && D.cap[id]) return `<a href="#/cap/${esc(id)}">${esc(L(D.cap[id], "name"))}</a>`;
  if (type === "actor") return actorLink(id);
  if (type === "act") return actRef(id);
  if (type === "type") { const x = D.types.find((y) => y.id === id); return x ? `<a href="#/types?t=${esc(id)}">${esc(L(x, "name"))}</a> ${covBadge(x.coverage)}` : esc(id); }
  if (type === "driver" && D.driver[id]) return `<a href="${driverHref(id)}">${esc(L(D.driver[id], "name"))}</a>`;
  if (type === "role") { const r = D.raw.roles.find((x) => x.id === id); return r ? `${actorLink(r.actor)}: ${esc(vl("role", r.role))}` : esc(id); }
  return esc(id);
}
const evidence = (x) => [x.ref && D.refs[x.ref] ? ext(D.refs[x.ref].url, L(D.refs[x.ref], "title")) : "", x.act ? actRef(x.act) : ""].filter(Boolean).join(" · ");
const kindBadge = (k) => `<span class="badge dk dk-${esc(k)}" title="${esc(vd("driver_kind", k))}">${esc(vl("driver_kind", k))}</span>`;
const mechBadge = (m) => `<span class="badge mech" title="${esc(vd("mechanism", m))}">${esc(vl("mechanism", m))}</span>`;
const effectBadge = (e) => `<span class="badge eff eff-${esc(e)}" title="${esc(vd("effect", e))}">${esc(vl("effect", e))}</span>`;

// the drivers acting on one element, for its card
export function driversOn(type, ids) {
  const set = new Set([].concat(ids));
  return D.influences.filter((x) => x.target_type === type && set.has(x.target));
}
export function whySection(type, ids, opts = {}) {
  const infl = driversOn(type, ids);
  const goal = opts.goal || "";
  if (!infl.length && !goal && !opts.basis) return "";
  const li = (x) => { const d = D.driver[x.driver];
    return `<li class="why-item"><p class="why-head">${kindBadge(d.kind)} <a href="${driverHref(d.id)}"><b>${esc(L(d, "name"))}</b></a>${d.date ? ` <span class="small muted">${esc(dateLabel(d.date))}</span>` : ""} ${effectBadge(x.effect)}${x.target !== (Array.isArray(ids) ? ids[0] : ids) && type === "actor" ? ` <span class="small muted">→ ${targetLink(type, x.target)}</span>` : ""}</p>
      ${L(x, "notes") ? `<p class="small">${esc(L(x, "notes"))}</p>` : ""}<p class="small muted">${mechBadge(d.mechanism)} ${evidence(x)} ${confBadge(x.confidence)}</p></li>`; };
  return `<section class="why-box"><h2>${esc(t("whyTitle"))}</h2>
    <div class="why-facets">
      ${opts.basis ? `<div class="why-facet"><h3>${esc(vl("why_facet", "basis"))}</h3><p class="small muted">${esc(vd("why_facet", "basis"))}</p>${opts.basis}</div>` : ""}
      <div class="why-facet why-drivers"><h3>${esc(vl("why_facet", "driver"))}</h3><p class="small muted">${esc(vd("why_facet", "driver"))}</p>
        ${infl.length ? `<ul class="plain">${infl.map(li).join("")}</ul>` : `<p class="muted small">${esc(t("whyNoDrivers"))}</p>`}</div>
      ${goal ? `<div class="why-facet"><h3>${esc(vl("why_facet", "goal"))}</h3><p class="small muted">${esc(vd("why_facet", "goal"))}</p>${goal}</div>` : ""}
    </div></section>`;
}

// ------------------------------------------------------------------ the drivers page
export function renderWhy(app) {
  setTitle(t("nav_why"));
  const sel = S.p.get("d") || "";
  const kinds = order("driver_kind").filter((k) => D.drivers.some((d) => d.kind === k));
  const card = (d) => {
    const out = D.influences.filter((x) => x.driver === d.id);
    const into = D.influences.filter((x) => x.target_type === "driver" && x.target === d.id);
    return `<li class="card drv${d.id === sel ? " is-focus" : ""}" id="drv-${esc(d.id)}">
      <p class="obj-top">${kindBadge(d.kind)}${mechBadge(d.mechanism)}${d.date ? `<span class="small muted">${esc(dateLabel(d.date))}</span>` : ""}</p>
      <h3>${esc(L(d, "name"))}</h3><p>${esc(L(d, "description"))}</p>
      ${into.length ? `<p class="small">${esc(t("whyCausedBy"))} ${into.map((x) => `<a href="${driverHref(x.driver)}">${esc(L(D.driver[x.driver], "name"))}</a>`).join(", ")}</p>` : ""}
      <ul class="plain drv-out">${out.map((x) => `<li>${effectBadge(x.effect)} ${targetLink(x.target_type, x.target)}${L(x, "notes") ? `<span class="block small muted">${esc(L(x, "notes"))}</span>` : ""}<span class="block small muted">${evidence(x)} ${confBadge(x.confidence)}</span></li>`).join("")}</ul>
      <p class="small muted">${esc(t("whyEvidence"))}: ${evidence(d)} ${confBadge(d.confidence)}</p></li>`;
  };
  const mechs = order("mechanism").map((m) => `<li><b>${esc(vl("mechanism", m))}</b> — ${esc(vd("mechanism", m))}</li>`).join("");
  app.innerHTML = `<article class="wide narrow">
    <div class="results-head"><h1>${esc(t("nav_why"))}</h1><p class="lead-sm">${esc(t("whyLead"))}</p></div>
    <div class="cards why-three">${order("why_facet").map((f) => `<section class="card"><h3>${esc(vl("why_facet", f))}</h3><p>${esc(vd("why_facet", f))}</p><p class="small muted">${esc(t("whyFacet_" + f))}</p></section>`).join("")}</div>
    <p class="notice">${esc(t("whyExamples"))}</p>
    ${kinds.map((k) => `<h2>${esc(vl("driver_kind", k))}</h2><p class="small muted">${esc(vd("driver_kind", k))}</p><ol class="plain drv-grid">${D.drivers.filter((d) => d.kind === k).map(card).join("")}</ol>`).join("")}
    <h2>${esc(t("whyMechTitle"))}</h2><p class="lead-sm">${esc(t("whyMechLead"))}</p><ul>${mechs}</ul>
  </article>`;
  if (sel) { const el = document.getElementById(`drv-${sel}`); if (el) el.scrollIntoView({ block: "center" }); }
}

// dated drivers for the timeline
export const driverEvents = () => D.drivers.filter((d) => d.date).map((d) => ({ d: d.date.length === 4 ? `${d.date}-01-01` : d.date.length === 7 ? `${d.date}-01` : d.date,
  kind: "driver", html: `<a href="${driverHref(d.id)}">${esc(L(d, "name"))}</a>`, text: vl("driver_kind", d.kind) }));
