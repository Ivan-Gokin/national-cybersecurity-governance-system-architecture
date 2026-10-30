/* National cybersecurity governance system architecture: shell and router.
 * Static site, no tracking. Reads data/graph.json once and draws every view from it in the browser.
 * Routes: #/<view>[/<id>][?params]. The representation (house, structure, cards) and the tools that work on it
 * (checks, expected types, search) are separate modules over the same query layer in core.js. */
import { CFG, D, S, t, fmt, esc, store, loadGraph, setDate, derive } from "./core.js";
import { ICON, repo } from "./ui.js";
import * as home from "./home.js";
import * as views from "./views.js";
import * as cards from "./cards.js";
import * as analysis from "./analysis.js";
import * as capmap from "./capmap.js";
import * as model from "./model.js";
import * as why from "./why.js";

const app = document.getElementById("app");
const ROUTES = {
  home: home.renderHome, vp: home.renderViewpoint, house: home.renderHouse,
  structure: views.renderStructure, actors: views.renderActors, mandates: views.renderMandates,
  ncaf: views.renderNcaf, links: views.renderLinks, flow: views.renderFlow,
  actor: cards.renderActorCard, act: cards.renderActCard,
  types: analysis.renderTypes, checks: analysis.renderChecks, acts: analysis.renderActs,
  search: analysis.renderSearch, method: analysis.renderMethod,
  functions: capmap.renderFunctions, cap: capmap.renderCapCard, time: capmap.renderTime,
  frameworks: model.renderFrameworks, model: model.renderModel, why: why.renderWhy,
};
// Navigation: viewpoints are ways in (who is asking), views are the projections themselves
export const VIEW_MENU = [
  ["menuMap", ["house", "structure", "functions", "actors"]],
  ["menuPowers", ["mandates", "links", "flow"]],
  ["menuAnalysis", ["types", "checks", "why", "ncaf", "time"]],
  ["menuLaw", ["acts"]],
  ["menuModel", ["frameworks", "model"]],
];
export const VIEWPOINTS = ["org", "body", "law", "analysis", "crisis", "partner"];

// ------------------------------------------------------------------ routing
function readHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, query] = h.split("?");
  const [route, ...rest] = (path || "").split("/");
  S.p = new URLSearchParams(query || "");
  // old prototype links: #/actors?id=x
  if (route === "actors" && S.p.get("id")) { history.replaceState(null, "", `#/actor/${encodeURIComponent(S.p.get("id"))}`); return readHash(); }
  S.route = ROUTES[route] ? route : "home";
  S.arg = decodeURIComponent(rest.join("/") || "");
  S.planned = S.p.get("planned") !== "0";
  // a date chosen on the time view stays in force across views until it is cleared
  if (S.p.has("at")) { const at = /^\d{4}-\d{2}-\d{2}$/.test(S.p.get("at")) ? S.p.get("at") : ""; if (at !== S.at && D.raw) setDate(at); else S.at = at; }
}
// change one query parameter of the current view without adding a history entry
export function setParam(key, value, rerender = true) {
  if (value === "" || value == null || value === false) S.p.delete(key); else S.p.set(key, value === true ? "1" : value);
  const q = S.p.toString();
  history.replaceState(null, "", `#/${S.route}${S.arg ? "/" + encodeURIComponent(S.arg) : ""}${q ? "?" + q : ""}`);
  if (key === "planned") S.planned = value !== "0";
  if (rerender) renderView();
}

// ------------------------------------------------------------------ theme
const DARK = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const themeNow = () => document.documentElement.getAttribute("data-theme") || (DARK && DARK.matches ? "dark" : "light");
function themeButton() {
  const box = document.getElementById("theme");
  if (!box) return;
  const now = themeNow();
  box.dataset.current = now;
  box.querySelectorAll("button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.set === now));
    b.onclick = () => { document.documentElement.setAttribute("data-theme", b.dataset.set); store.set("uca-theme", b.dataset.set); themeButton(); };
  });
}
if (DARK && DARK.addEventListener) DARK.addEventListener("change", themeButton);

// ------------------------------------------------------------------ shell
const VIEW_OF = { actor: "actors", act: "acts", vp: "", cap: "functions" };
function renderShell() {
  document.documentElement.lang = S.lang;
  const cur = VIEW_OF[S.route] !== undefined ? VIEW_OF[S.route] : S.route;
  const a = (href, label, current) => `<a href="${href}"${current ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
  const vpOpen = S.route === "vp";
  const viewOpen = VIEW_MENU.some(([, ids]) => ids.includes(cur));
  const vpMenu = `<details class="nav-menu"><summary${vpOpen ? ' aria-current="page"' : ""}>${esc(t("navViewpoints"))}</summary><div class="menu"><ul>
    ${VIEWPOINTS.map((v) => `<li>${a(`#/vp/${v}`, t(`vp_${v}`), vpOpen && S.arg === v)}</li>`).join("")}</ul></div></details>`;
  const viewMenu = `<details class="nav-menu"><summary${viewOpen ? ' aria-current="page"' : ""}>${esc(t("navViews"))}</summary><div class="menu">
    ${VIEW_MENU.map(([g, ids]) => `<p class="menu-group">${esc(t(g))}</p><ul>${ids.map((v) => `<li>${a(`#/${v}`, t(`nav_${v}`), cur === v)}</li>`).join("")}</ul>`).join("")}</div></details>`;
  document.getElementById("header").innerHTML = `
    <div class="brand">${ICON.brand}<div class="brand-text"><a href="#/home" class="brand-name"${S.route === "home" ? ' aria-current="page"' : ""}>${esc(t("siteName"))}<span class="flag-ua" role="img" aria-label="${esc(t("flagUa"))}"></span></a></div></div>
    <nav class="nav" aria-label="${esc(t("siteName"))}">${a("#/home", t("navHome"), S.route === "home")}${vpMenu}${viewMenu}${a("#/method", t("nav_method"), S.route === "method")}</nav>
    <div class="header-tools">
      <form class="hsearch search" role="search" id="hsearch"><label class="sr-only" for="hq">${esc(t("search"))}</label>${ICON.search}<input type="search" id="hq" placeholder="${esc(t("searchAll"))}" value="${S.route === "search" ? esc(S.p.get("q") || "") : ""}"></form>
      <div class="theme-switch" id="theme" role="group" aria-label="${esc(t("themeGroup"))}"><button type="button" data-set="light" aria-label="${esc(t("themeLight"))}" title="${esc(t("themeLight"))}">${ICON.sun}</button><button type="button" data-set="dark" aria-label="${esc(t("themeDark"))}" title="${esc(t("themeDark"))}">${ICON.moon}</button></div>
      <button class="lang" type="button" id="lang" aria-label="${esc(t("langSwitchLabel"))}">${esc(t("langSwitch"))}</button></div>`;
  document.getElementById("lang").onclick = () => { S.lang = S.lang === "uk" ? "en" : "uk"; store.set("uca-lang", S.lang); render(); };
  document.getElementById("hsearch").onsubmit = (e) => { e.preventDefault(); const q = document.getElementById("hq").value.trim(); location.hash = `#/search${q ? "?q=" + encodeURIComponent(q) : ""}`; };
  // close an open menu when another opens or a link inside it is followed
  document.querySelectorAll(".nav-menu").forEach((d) => {
    d.addEventListener("toggle", () => { if (d.open) document.querySelectorAll(".nav-menu").forEach((o) => { if (o !== d) o.open = false; }); });
    d.querySelectorAll("a").forEach((l) => l.addEventListener("click", () => (d.open = false)));
  });
  themeButton();
  const ab = document.getElementById("atbar");
  if (ab) {
    ab.hidden = !S.at;
    ab.innerHTML = S.at ? `${esc(fmt(t("atBanner"), fmtDate(S.at)))} <a href="#" id="at-clear">${esc(t("atClear"))}</a> · <a href="#/time">${esc(t("nav_time"))}</a>` : "";
    const c = document.getElementById("at-clear");
    if (c) c.onclick = (e) => { e.preventDefault(); setDate(""); S.p.delete("at"); setParam("at", ""); renderShell(); };
  }
  const pv = document.getElementById("preview");
  if (pv) { pv.hidden = !CFG.preview; pv.textContent = CFG.preview ? t("previewBanner") : ""; }
  const r = repo();
  const meta = D.meta ? fmt(t("dataVersion"), D.meta.version, D.meta.date) : "";
  const reg = D.meta && D.meta.register ? fmt(t("registerVersion"), D.meta.register.data_version, (D.meta.register.commit || "").slice(0, 7)) : "";
  document.getElementById("footer").innerHTML = `<p>${esc(t("footer"))} ${esc(meta)} ${esc(reg)}</p>
    <p class="footer-links"><a href="#/method">${esc(t("nav_method"))}</a>${r ? `<a id="report" href="${esc(r)}/issues/new?template=report.yml" target="_blank" rel="noopener">${ICON.flag} ${esc(t("footerReport"))}</a>` : ""}${CFG.grcUrl ? `<a href="${esc(CFG.grcUrl)}" target="_blank" rel="noopener">${esc(t("grcName"))}</a>` : ""}${r ? `<a href="${esc(r)}" target="_blank" rel="noopener">GitHub</a>` : ""}</p>`;
  const rep = document.getElementById("report");
  if (rep) rep.addEventListener("click", () => { rep.href = `${r}/issues/new?template=report.yml&page=${encodeURIComponent(location.href)}`; });
}
export const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString(S.lang === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
export function setTitle(page) { document.title = page ? `${page} — ${t("siteName")}` : `${t("siteName")}: ${t("siteSub")}`; }

let focusNext = false;
function renderView() {
  derive(); // derived facts follow the "drafts" switch and the date
  ROUTES[S.route](app);
  if (focusNext) {
    focusNext = false;
    const h = app.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }
}
function render() { renderShell(); renderView(); }

async function start() {
  const saved = store.get("uca-lang");
  S.lang = saved === "uk" || saved === "en" ? saved : (CFG.defaultLang || "uk");
  readHash();
  const at0 = S.at; S.at = "";
  try { await loadGraph(); } catch (e) {
    app.innerHTML = `<p class="notice">${esc(t("loadError"))} ${esc(e.message)}</p>`;
    return;
  }
  if (at0) setDate(at0);
  render();
  window.addEventListener("hashchange", () => { readHash(); focusNext = true; render(); window.scrollTo(0, 0); });
}
start();
