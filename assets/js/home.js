/* Level 0: the house (one picture of the whole system) and the doors into it (viewpoints). */
import { D, S, t, fmt, esc, L, KLIMBURG, rolesOf, root, family, isClass, isUnit, mandatesOf, loadMd, checks } from "./core.js";
import { actorHref, mBadge, multiMark, covBadge, selectOf, plannedToggle, on, crumbs } from "./ui.js";
import { setTitle, setParam, VIEWPOINTS } from "./app.js";

// ------------------------------------------------------------------ the house
// roof: top leadership; beam: coordination across mandates; columns: Klimburg's five mandates and what lies outside them;
// foundation: the classes of entities the requirements are addressed to; side: international partners; below: empty slots
function chip(id, extra = "") {
  const a = D.actor[id];
  const planned = rolesOf(id).length && rolesOf(id).every((r) => r.status !== "in_force");
  const n = family(root(id)).reduce((s, m) => s + rolesOf(m).length, 0);
  const title = `${L(a, "name")}${isUnit(a) ? ` (${t("partOf")} ${L(D.actor[root(id)], "short")})` : ""}`;
  return `<a class="hchip${planned ? " is-planned" : ""}${isUnit(a) ? " is-unit" : ""}" data-family="${esc(root(id))}" href="${actorHref(id)}" title="${esc(title)}">${esc(L(a, "short"))}${multiMark(id)}${extra}${!isUnit(a) && n > 3 ? `<span class="hcount" title="${esc(fmt(t("rolesInFamily"), n))}">${n}</span>` : ""}</a>`;
}
export function house(opts = {}) {
  const inBody = D.actors.filter((a) => a.tier === "body" || a.tier === "coordination");
  const col = (m) => inBody.filter((a) => a.tier === "body" && rolesOf(a.id).some((r) => r.mandate === m)).sort((x, y) => D.order[x.id] - D.order[y.id]);
  const cols = [...KLIMBURG, "OUT"].map((m) => {
    const list = col(m);
    return `<section class="h-col h-col-${m}"><h3>${mBadge(m)} <span>${esc(L(D.mandate[m], "name"))}</span></h3>
      <div class="h-chips">${list.map((a) => chip(a.id)).join("") || `<span class="muted small">—</span>`}</div></section>`;
  }).join("");
  const roof = D.actors.filter((a) => a.tier === "leadership").map((a) => chip(a.id)).join("");
  const beam = D.actors.filter((a) => a.tier === "coordination").map((a) => chip(a.id)).join("");
  const found = D.actors.filter(isClass).map((a) => `<a class="hfound" href="${actorHref(a.id)}" data-family="${esc(a.id)}"><b>${esc(L(a, "short"))}</b><span>${esc(t("whatForYou"))}</span></a>`).join("");
  const intl = D.actors.filter((a) => a.tier === "international").map((a) => chip(a.id)).join("");
  const holes = D.types.filter((x) => x.coverage === "absent" || x.coverage === "unknown")
    .map((x) => `<a class="hhole cov-${esc(x.coverage)}" href="#/types?t=${esc(x.id)}" title="${esc(L(x, "basis"))}">${esc(L(x, "name"))}</a>`).join("");
  return `<figure class="house${opts.hl ? " has-hl" : ""}" id="house" data-hl="${esc(opts.hl || "")}">
    <div class="h-roof"><p class="h-label">${esc(t("hRoof"))}</p><div class="h-chips">${roof}</div></div>
    <div class="h-beam"><p class="h-label">${mBadge("XC")} ${esc(t("hBeam"))}</p><div class="h-chips">${beam}</div></div>
    <div class="h-cols">${cols}</div>
    <div class="h-found"><p class="h-label">${esc(t("hFound"))}</p><div class="h-founds">${found}</div></div>
    <aside class="h-intl"><p class="h-label">${esc(t("hIntl"))}</p><div class="h-chips">${intl}</div></aside>
    <div class="h-holes"><p class="h-label">${esc(t("hHoles"))}</p><div class="h-chips">${holes}</div></div>
    <figcaption class="hint">${esc(t("houseHint"))}</figcaption></figure>`;
}
// hover or focus a chip: light up every place the same institution appears
export function wireHouse() {
  const fig = document.getElementById("house");
  if (!fig) return;
  const mark = (fam) => {
    fig.classList.toggle("has-hl", !!fam);
    fig.querySelectorAll("[data-family]").forEach((el) => el.classList.toggle("hl", !!fam && el.dataset.family === fam));
  };
  const fixed = fig.dataset.hl;
  mark(fixed);
  fig.querySelectorAll("[data-family]").forEach((el) => {
    el.addEventListener("mouseenter", () => mark(el.dataset.family));
    el.addEventListener("focus", () => mark(el.dataset.family));
    el.addEventListener("mouseleave", () => mark(fixed));
    el.addEventListener("blur", () => mark(fixed));
  });
}

// ------------------------------------------------------------------ home
export async function renderHome(app) {
  setTitle("");
  const n = (v, k) => `<li><b>${v}</b><span>${esc(t(k))}</span></li>`;
  const multi = D.actors.filter((a) => mandatesOf(a.id).filter((m) => KLIMBURG.includes(m)).length > 1).length;
  const absent = D.types.filter((x) => x.coverage === "absent").length;
  const gaps = checks().filter((c) => c.severity === "gap").reduce((s, c) => s + c.items.length, 0);
  const door = (v) => `<a class="card door" href="#/vp/${v}"><span class="kicker">${esc(t(`vp_${v}_who`))}</span><h3>${esc(t(`vp_${v}`))}</h3><p>${esc(t(`vp_${v}_q`))}</p></a>`;
  app.innerHTML = `<article class="home home-wide">
    <section class="home-hero"><p class="kicker hero-kicker">${esc(t("heroKicker"))}</p><h1>${esc(t("heroTitle"))}</h1><p>${esc(t("heroLead"))}</p></section>
    <ul class="stats">${n(D.actors.length, "statActors")}${n(D.roles.length, "statRoles")}${n(D.links.length, "statLinks")}${n(D.acts.length, "statActs")}${n(multi, "statMulti")}${n(absent, "statAbsent")}</ul>
    <h2>${esc(t("houseTitle"))}</h2><p>${esc(t("houseLead"))}</p>
    ${house()}
    <p class="home-cta"><a class="btn" href="#/house">${esc(t("houseOpen"))}</a><a class="btn" href="#/checks">${esc(fmt(t("gapsGo"), gaps))}</a></p>
    <h2>${esc(t("doorsTitle"))}</h2><p>${esc(t("doorsLead"))}</p>
    <div class="cards doors">${VIEWPOINTS.map(door).join("")}</div>
    <div class="prose home-md" id="home-md"></div>
  </article>`;
  wireHouse();
  const html = await loadMd("home");
  const box = document.getElementById("home-md");
  if (box) box.innerHTML = html;
}

// ------------------------------------------------------------------ the house as a view of its own
export function renderHouse(app) {
  setTitle(t("nav_house"));
  const hl = S.p.get("hl") || "";
  const insts = [...new Set(D.actors.filter((a) => !isClass(a)).map((a) => root(a.id)))].filter((r) => D.actor[r].tier !== "international")
    .sort((a, b) => D.order[a] - D.order[b]).map((id) => [id, L(D.actor[id], "short")]);
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_house"))}</h1><p class="lead-sm">${esc(t("houseLead"))}</p>
      <div class="inline-tools">${selectOf("f-hl", t("hlInst"), insts, hl, t("none"))}${plannedToggle()}</div></div>
    ${house({ hl })}
    <h2>${esc(t("houseReadTitle"))}</h2>
    <dl class="mandate-list">${["hRoof", "hBeam", "hCols", "hFound", "hIntl", "hHoles"].map((k) => `<div><dt>${esc(t(k))}</dt><dd>${esc(t(k + "D"))}</dd></div>`).join("")}</dl>
  </article>`;
  wireHouse();
  on("f-hl", "change", (e) => setParam("hl", e.target.value));
  on("f-planned", "change", (e) => setParam("planned", e.target.checked ? "" : "0"));
}

// ------------------------------------------------------------------ viewpoints
// A viewpoint (ISO/IEC 42010) names who is asking, what they care about, and which views answer their questions.
const VP = {
  org: { qs: [["vpOrgQ1", "#/actor/orgs"], ["vpOrgQ2", "#/actor/ci-operators"], ["vpOrgQ3", "#/actor/state-bodies"], ["vpOrgQ4", "#/actor/citizens"], ["vpOrgQ5", "#/flow"]], classes: true },
  body: { qs: [["vpBodyQ1", "#/actors"], ["vpBodyQ2", "#/actor/ssscip"], ["vpBodyQ3", "#/links"], ["vpBodyQ4", "#/checks?c=watchers"], ["vpBodyQ5", "#/structure"]] },
  law: { qs: [["vpLawQ1", "#/acts"], ["vpLawQ2", "#/mandates"], ["vpLawQ3", "#/checks?c=noBasis"], ["vpLawQ4", "#/checks?c=unverified"]] },
  analysis: { qs: [["vpAnQ1", "#/types"], ["vpAnQ2", "#/checks?c=sod"], ["vpAnQ3", "#/structure?hl=ssscip"], ["vpAnQ4", "#/ncaf"], ["vpAnQ5", "#/checks"]] },
  crisis: { qs: [["vpCrQ1", "#/flow"], ["vpCrQ2", "#/checks?c=handoffs"], ["vpCrQ3", "#/types?t=crisis-authority"], ["vpCrQ4", "#/actor/nccc"]] },
  partner: { qs: [["vpPaQ1", "#/types"], ["vpPaQ2", "#/ncaf"], ["vpPaQ3", "#/mandates"], ["vpPaQ4", "#/actor/tallinn"]] },
};
export function renderViewpoint(app) {
  const id = VP[S.arg] ? S.arg : "org";
  const vp = VP[id];
  setTitle(t(`vp_${id}`));
  const classes = vp.classes ? `<div class="cards doors">${D.actors.filter(isClass).map((a) => `<a class="card door" href="${actorHref(a.id)}"><span class="kicker">${esc(t("iAmFrom"))}</span><h3>${esc(L(a, "name"))}</h3><p>${esc(t("classDoor"))}</p></a>`).join("")}</div>` : "";
  app.innerHTML = `<article class="actor-page">
    ${crumbs(["#/home", t("navHome")], ["", t("navViewpoints")])}
    <header class="actor-head"><p class="kicker">${esc(t(`vp_${id}_who`))}</p><h1>${esc(t(`vp_${id}`))}</h1><p class="lead-sm">${esc(t(`vp_${id}_lead`))}</p></header>
    ${classes}
    <h2>${esc(t("vpQuestions"))}</h2>
    <ul class="plain vp-qs">${vp.qs.map(([k, href]) => `<li><a class="card vp-q" href="${href}"><span>${esc(t(k))}</span><span class="vp-go" aria-hidden="true">→</span></a></li>`).join("")}</ul>
    <h2>${esc(t("vpOther"))}</h2>
    <p class="vp-other">${VIEWPOINTS.filter((v) => v !== id).map((v) => `<a class="btn btn-line" href="#/vp/${v}">${esc(t(`vp_${v}`))}</a>`).join("")}</p>
  </article>`;
}
