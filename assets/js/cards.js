/* Level 2: cards. One page per element: a body (with the full profile of the institution it belongs to),
 * a class of entities (read as a personal card: what the system expects of you and where to turn), an act. */
import { CFG, D, S, t, fmt, esc, L, many, group, live, vl, KLIMBURG, ROLE_GROUP, GROUPS,
  name, rolesOf, linksOut, linksIn, root, family, isClass, mandatesOf, isMulti, objectivesOf, stepsOf, typesOf, groupsOf, checks } from "./core.js";
import { LINK_GLYPH, actorLink, actorHref, actRef, grcActHref, mBadge, confBadge, statusBadge, covBadge, gap, crumbs, repo, ext } from "./ui.js";
import { setTitle } from "./app.js";
import { capsSection } from "./capmap.js";
import { whySection } from "./why.js";

export function renderActorCard(app) {
  const a = D.actor[S.arg];
  if (!a && D.anyActor[S.arg]) { setTitle(name(S.arg)); app.innerHTML = `<p class="notice">${esc(t("notYet"))} <a href="${actorHref(S.arg)}?at=">${esc(t("atClear"))}</a></p>`; return; }
  if (!a) { setTitle(t("notFound")); app.innerHTML = `<p class="notice">${esc(t("notFound"))} <a href="#/actors">${esc(t("nav_actors"))}</a></p>`; return; }
  return isClass(a) ? classCard(app, a) : bodyCard(app, a);
}

const linkLi = (k, dir) => `<li><span class="lglyph lt-${esc(k.type)}" title="${esc(vl("link_type", k.type))}">${LINK_GLYPH[k.type] || "·"}</span>
  <span>${esc(vl("link_type", k.type))}: ${dir === "out" ? `${esc(t("arrowTo"))} ${actorLink(k.to)}` : `${esc(t("arrowFrom"))} ${actorLink(k.from)}`}${statusBadge(k.status)}
  <span class="block small muted">${actRef(k.act)}${L(k, "notes") ? ` · ${esc(L(k, "notes"))}` : ""}</span></span></li>`;
const propose = (id) => (repo() ? `<p class="propose"><a class="btn btn-line" href="${esc(repo())}/issues/new?template=actor.yml&actor=${encodeURIComponent(id)}" target="_blank" rel="noopener">${esc(t("proposeChange"))}</a></p>` : "");

// ------------------------------------------------------------------ body card
// The test it must pass: a body that is regulator, controller, response team and service provider at once shows
// all of these hats on one screen, with the legal basis of each and the conflicts between them.
function bodyCard(app, a) {
  setTitle(L(a, "short"));
  const r = root(a.id);
  const fam = family(r);
  const chain = []; for (let c = a.parent; c; c = D.actor[c] && D.actor[c].parent) chain.unshift(c);
  const kids = D.children[a.id] || [];
  const roles = rolesOf(a.id);
  const out = linksOut(a.id), inn = linksIn(a.id);
  // role profile of the whole institution, by group; the roles of this page's actor are marked
  const prof = groupsOf(fam);
  const profile = `<div class="hats">${GROUPS.map((g) => {
    const rs = prof[g] || [];
    return `<section class="hat-tile${rs.length ? " on" : ""}"><h3><span class="hat on">${esc(t("grp_" + g + "_s"))}</span> ${esc(t("grp_" + g))}</h3>
      ${rs.length ? `<ul class="plain">${rs.map((x) => `<li class="${x.actor === a.id ? "is-here" : ""}">${esc(vl("role", x.role))}${statusBadge(x.status)}
        <span class="block small muted">${x.actor !== r ? `${actorLink(x.actor)} · ` : ""}${actRef(x.act, x.provision)}</span></li>`).join("")}</ul>` : `<p class="muted small">—</p>`}</section>`;
  }).join("")}</div>`;
  const nGroups = Object.keys(prof).filter((g) => g !== "entity").length;
  const famTypes = [...new Map(fam.flatMap((m) => typesOf(m).map((x) => [x.id, x]))).values()];
  const flags = checks().filter((c) => ["sod", "watchers"].includes(c.id)).flatMap((c) => c.items.filter((i) => fam.includes(i.actor)).map((i) => ({ c: c.id, text: i.text || t("noOversightIn") })));
  const roleRows = roles.map((x) => `<tr><th scope="row">${esc(vl("role", x.role))}${statusBadge(x.status)}<span class="block small muted">${esc(t("grp_" + (ROLE_GROUP[x.role] || "other")))}</span></th><td>${mBadge(x.mandate)}</td>
    <td>${actRef(x.act, x.provision)}</td><td>${esc(vl("regime", x.regime))}</td><td>${confBadge(x.confidence, x.last_verified)}</td><td class="small">${esc(L(x, "notes"))}</td></tr>`).join("");
  const objs = objectivesOf(a.id), steps = stepsOf(a.id);
  app.innerHTML = `<article class="actor-page">
    ${crumbs(["#/actors", t("nav_actors")], ...chain.map((c) => [actorHref(c), name(c)]), ["", L(a, "short")])}
    <header class="actor-head"><p class="kicker">${esc(vl("actor_type", a.type))} · ${esc(vl("level", a.level))}</p>
      <h1>${esc(L(a, "name"))}</h1>
      <p class="actor-meta">${mandatesOf(a.id).map(mBadge).join(" ")}${isMulti(a.id) ? ` <span class="multi">${esc(t("multiLong"))}</span>` : ""} ${confBadge(a.confidence, a.last_verified)}</p>
      ${kids.length ? `<p>${esc(t("units"))}: ${kids.map((k) => actorLink(k.id)).join(", ")}</p>` : ""}
      ${many(a.categories).length ? `<p class="small muted">${esc(t("categories"))}: ${many(a.categories).map((c) => esc(vl("category", c))).join(" · ")}</p>` : ""}
      ${L(a, "notes") ? `<p class="actor-note">${esc(L(a, "notes"))}</p>` : ""}
      <p class="card-go"><a class="btn btn-line" href="#/house?hl=${esc(r)}">${esc(t("seeOnHouse"))}</a><a class="btn btn-line" href="#/structure?hl=${esc(r)}">${esc(t("seeOnStructure"))}</a><a class="btn btn-line" href="#/links?lactor=${esc(a.id)}">${esc(t("seeLinks"))}</a></p>
    </header>
    ${fam.length > 1 || nGroups > 1 ? `<h2>${esc(fmt(r === a.id ? t("profileTitle") : t("profileOf"), name(r)))}</h2>
      <p class="lead-sm">${esc(fmt(t("profileLead"), nGroups, fam.length, fam.reduce((s, m) => s + rolesOf(m).length, 0)))}</p>${profile}` : ""}
    ${flags.length ? `<div class="flags">${flags.map((f) => `<p class="notice flag-${esc(f.c)}"><b>${esc(t("chk_" + f.c))}.</b> ${esc(f.text)}</p>`).join("")}</div>` : ""}
    ${whySection("actor", fam)}
    ${famTypes.length ? `<h2>${esc(t("typesFilled"))}</h2><p class="lead-sm">${esc(t("typesFilledLead"))}</p>
      <ul class="plain type-list">${famTypes.map((x) => `<li><a href="#/types?t=${esc(x.id)}">${esc(L(x, "name"))}</a> ${covBadge(x.coverage)} <span class="small muted">${many(x.actors).filter((m) => fam.includes(m)).map((m) => esc(name(m))).join(", ")}</span></li>`).join("")}</ul>` : ""}
    ${capsSection(r)}
    <h2>${esc(fam.length > 1 ? fmt(t("rolesOfThis"), L(a, "short")) : t("rolesTitle"))}</h2>
    ${roleRows ? `<div class="table-wrap"><table class="roles"><thead><tr><th>${esc(t("colRole"))}</th><th>${esc(t("colMandate"))}</th><th>${esc(t("colBasis"))}</th><th>${esc(t("colRegime"))}</th><th>${esc(t("colConf"))}</th><th>${esc(t("colNotes"))}</th></tr></thead><tbody>${roleRows}</tbody></table></div>` : `<p class="muted">${esc(t("noRoleUnit"))}</p>`}
    <div class="cards cards-2 link-cards">
      <section class="card"><h3>${esc(t("linksOut"))}</h3>${out.length ? `<ul class="links-list">${out.map((k) => linkLi(k, "out")).join("")}</ul>` : `<p class="muted">—</p>`}</section>
      <section class="card"><h3>${esc(t("linksIn"))}</h3>${inn.length ? `<ul class="links-list">${inn.map((k) => linkLi(k, "in")).join("")}</ul>` : `<p class="muted">—</p>`}</section>
    </div>
    ${objs.length ? `<h2>${esc(t("ncafOwner"))}</h2><ul class="plain obj-list">${objs.map((o) => `<li><a href="#/ncaf" class="obj-num">${esc(o.id)}</a> ${esc(L(o, "name"))}</li>`).join("")}</ul>` : ""}
    ${steps.length ? `<h2>${esc(t("inFlow"))}</h2><ul class="plain">${steps.map((s) => `<li><a href="#/flow">${esc(vl("stage", s.stage))}</a>: ${esc(L(s, "activity"))}${s.absent === "yes" ? ` ${gap(t("absentStep"))}` : ""}</li>`).join("")}</ul>` : ""}
    ${propose(a.id)}
  </article>`;
}

// ------------------------------------------------------------------ class card: the personal card
// Read from the point of view of someone working in an organisation of this class: what do I report and to whom,
// who checks me, who sends me requirements, where do I get help. An empty section is shown as a gap, not hidden.
function classCard(app, a) {
  setTitle(L(a, "name"));
  const out = linksOut(a.id), inn = linksIn(a.id);
  const sec = (key, list, dir, emptyKey) => `<section class="pc-sec" id="pc-${key}"><h2>${esc(t("pc_" + key))}</h2><p class="lead-sm muted">${esc(t("pc_" + key + "_lead"))}</p>
    ${list.length ? `<ul class="plain pc-list">${list.map((k) => {
      const other = dir === "out" ? k.to : k.from;
      return `<li class="card pc-item"><p class="pc-who">${actorLink(other, "ent")}${statusBadge(k.status)}</p>
        <p class="small">${esc(L(D.actor[other], "name"))}</p>
        ${L(k, "notes") ? `<p>${esc(L(k, "notes"))}</p>` : ""}
        <p class="small">${esc(t("colBasis"))}: ${actRef(k.act)}</p>
        ${key === "reporting" ? `<p class="small">${gap(t("noDeadline"))}</p>` : ""}</li>`;
    }).join("")}</ul>` : `<p>${gap(t(emptyKey || "pcEmpty"))}</p>`}</section>`;
  const by = (list, ty) => list.filter((k) => k.type === ty);
  const sectors = many(a.grc_sectors);
  const grc = CFG.grcUrl && sectors.length ? `${CFG.grcUrl}#/craft?step=2&s=${sectors.map(encodeURIComponent).join(",")}` : "";
  const ex = [...by(out, "info_exchange"), ...by(inn, "info_exchange")];
  const absent = D.types.filter((x) => x.coverage === "absent");
  const roles = rolesOf(a.id);
  app.innerHTML = `<article class="actor-page pcard">
    ${crumbs(["#/vp/org", t("vp_org")], ["", L(a, "short")])}
    <header class="actor-head"><p class="kicker">${esc(t("pcKicker"))}</p><h1>${esc(L(a, "name"))}</h1>
      <p class="lead-sm">${esc(t("pcLead"))}</p>
      ${L(a, "notes") ? `<p class="actor-note">${esc(L(a, "notes"))}</p>` : ""}
      ${roles.length ? `<p class="small">${esc(t("pcBasis"))} ${roles.map((x) => actRef(x.act, x.provision)).join(", ")}</p>` : ""}
      <nav class="pc-toc" aria-label="${esc(t("pcToc"))}">${["reporting", "approval", "oversight", "guidance", "sanction", "help", "exchange"].map((k) => `<a href="#pc-${k}" data-jump="pc-${k}">${esc(t("pc_" + k))}</a>`).join("")}</nav>
    </header>
    ${sec("reporting", by(out, "reporting"), "out", "pcNoReporting")}
    ${sec("approval", by(out, "approval"), "out")}
    ${sec("oversight", by(inn, "oversight"), "in")}
    ${sec("guidance", by(inn, "guidance"), "in")}
    ${sec("sanction", by(inn, "sanction"), "in", "pcNoSanction")}
    ${sec("help", by(out, "help"), "out", "pcNoHelp")}
    <section class="pc-sec" id="pc-exchange"><h2>${esc(t("pc_exchange"))}</h2><p class="lead-sm muted">${esc(t("pc_exchange_lead"))}</p>
      ${ex.length ? `<ul class="plain">${ex.map((k) => `<li>${actorLink(k.from === a.id ? k.to : k.from)} · ${actRef(k.act)}</li>`).join("")}</ul>` : `<p>${gap(t("pcNoExchange"))}</p>`}</section>
    ${grc ? `<a class="grc-strip" href="${esc(grc)}" target="_blank" rel="noopener"><span class="grc-label">${esc(t("grcName"))}</span><span>${esc(t("pcGrc"))} (${esc(sectors.map((s) => (D.grcSectors[s] ? L(D.grcSectors[s], "label") : s)).join(" · "))})</span><span class="grc-go" aria-hidden="true">→</span></a>` : ""}
    <h2>${esc(t("pcMissing"))}</h2><p class="lead-sm">${esc(t("pcMissingLead"))}</p>
    <ul class="plain type-list">${absent.map((x) => `<li><a href="#/types?t=${esc(x.id)}">${esc(L(x, "name"))}</a> ${covBadge(x.coverage)}</li>`).join("")}</ul>
    ${propose(a.id)}
  </article>`;
  app.querySelectorAll("[data-jump]").forEach((l) => l.addEventListener("click", (e) => { e.preventDefault(); const el = document.getElementById(l.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth" }); }));
}

// ------------------------------------------------------------------ act card
export function renderActCard(app) {
  const a = D.act[S.arg];
  if (!a) { setTitle(t("notFound")); app.innerHTML = `<p class="notice">${esc(t("notFound"))} <a href="#/acts">${esc(t("nav_acts"))}</a></p>`; return; }
  setTitle(L(a, "short_ref"));
  const roles = (D.rolesByAct[a.id] || []).filter(live);
  const links = (D.linksByAct[a.id] || []).filter(live);
  const hand = D.handoffs.filter((h) => h.rule_act === a.id);
  const rel = D.actRelations.filter((x) => x.source_id === a.id || x.related_id === a.id);
  const relName = (id) => (D.act[id] ? `<a href="#/act/${esc(id)}">${esc(L(D.act[id], "short_ref"))}</a>` : `<code>${esc(id)}</code>`);
  const grc = grcActHref(a.id);
  app.innerHTML = `<article class="actor-page">
    ${crumbs(["#/acts", t("nav_acts")], ["", L(a, "short_ref")])}
    <header class="actor-head"><p class="kicker">${esc(L(a, "type") || a.type)}${a.adopted ? ` · ${esc(a.adopted)}` : ""}${a.number ? ` · № ${esc(a.number)}` : ""}</p>
      <h1>${esc(L(a, "title"))}</h1>
      <p class="actor-meta"><span class="badge st-${esc(a.status)}">${esc(vl("status", a.status) || a.status)}</span>${a.role === "context" ? ` <span class="badge" title="${esc(t("ctxActHint"))}">${esc(t("ctxAct"))}</span>` : ""}${a.last_verified ? "" : ` ${gap(t("notVerified"))}`}</p>
      ${L(a, "description") ? `<p class="actor-note">${esc(L(a, "description"))}</p>` : ""}
      <p class="card-go">${grc ? `<a class="btn btn-line" href="${esc(grc)}" target="_blank" rel="noopener">${esc(t("openInGrc"))}</a>` : ""}${a.url ? `<a class="btn btn-line" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(t("officialText"))}</a>` : ""}</p>
      <p class="small muted">${esc(fmt(t("fromRegister"), a.id, (D.meta.register || {}).data_version || ""))}</p>
    </header>
    <h2>${esc(fmt(t("actRoles"), roles.length))}</h2>
    ${roles.length ? `<div class="table-wrap"><table class="roles"><thead><tr><th>${esc(t("colActor"))}</th><th>${esc(t("colRole"))}</th><th>${esc(t("colMandate"))}</th><th>${esc(t("colProvision"))}</th></tr></thead><tbody>
      ${roles.map((x) => `<tr><th scope="row">${actorLink(x.actor)}</th><td>${esc(vl("role", x.role))}${statusBadge(x.status)}</td><td>${mBadge(x.mandate)}</td><td>${esc(x.provision || "—")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">—</p>`}
    <h2>${esc(fmt(t("actLinks"), links.length))}</h2>
    ${links.length ? `<ul class="plain legend">${links.map((k) => `<li><span class="lglyph lt-${esc(k.type)}">${LINK_GLYPH[k.type] || "·"}</span><span>${actorLink(k.from)} → ${actorLink(k.to)}: ${esc(vl("link_type", k.type))}${L(k, "notes") ? `<span class="block small muted">${esc(L(k, "notes"))}</span>` : ""}</span></li>`).join("")}</ul>` : `<p class="muted">—</p>`}
    ${hand.length ? `<h2>${esc(t("actHandoffs"))}</h2><ul class="plain">${hand.map((h) => `<li>${actorLink(D.step[h.from].actor)} → ${actorLink(D.step[h.to].actor)}</li>`).join("")}</ul>` : ""}
    ${whySection("act", a.id)}
    ${rel.length ? `<h2>${esc(t("actRelations"))}</h2><ul class="plain">${rel.map((x) => `<li>${relName(x.source_id)} <span class="muted">${esc(t("rel_" + x.relation) !== "rel_" + x.relation ? t("rel_" + x.relation) : x.relation)}</span> ${relName(x.related_id)}</li>`).join("")}</ul>` : ""}
  </article>`;
}
