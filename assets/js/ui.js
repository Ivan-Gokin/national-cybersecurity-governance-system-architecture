/* Small shared parts: links, badges, form controls, icons. Every view builds its HTML from these. */
import { CFG, D, S, t, esc, L, vl, vd, name, isMulti, order } from "./core.js";

export const ICON = {
  sun: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>`,
  moon: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 21V4m0 0h11l-2 4 2 4H5"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  brand: `<svg class="brand-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="bm-frame" fill-rule="evenodd" d="M67.44 6.36L96.52 43.29L79.07 86.93L32.56 93.64L3.48 56.71L20.93 13.07ZM65.96 10.07L92.56 43.86L76.6 83.79L34.04 89.93L7.44 56.14L23.4 16.21Z"/><g class="bm-links" fill="none" stroke-width="3.2"><path d="M50 50L50 24M50 50L74.7 42M50 50L65.3 71M50 50L34.7 71M50 50L25.3 42"/></g><g class="bm-arms"><circle cx="50" cy="24" r="6.5"/><circle cx="74.7" cy="42" r="6.5"/><circle cx="65.3" cy="71" r="6.5"/><circle cx="34.7" cy="71" r="6.5"/><circle cx="25.3" cy="42" r="6.5"/></g><path class="bm-core" d="M50 41.5L58.5 56L41.5 56Z"/></svg>`,
};
// Link types as glyphs; read "from → to"
export const LINK_GLYPH = { subordination: "↑", membership: "◇", oversight: "◉", reporting: "→", approval: "✓", info_exchange: "⇄", support: "+", help: "?", sanction: "!", guidance: "↓" };

export const repo = () => (CFG.repoUrl || "").replace(/\/$/, "");
export const actorHref = (id) => `#/actor/${encodeURIComponent(id)}`;
export const actorLink = (id, cls = "") => { const a = D.actor[id] || (D.anyActor || {})[id];
  return a ? `<a${cls ? ` class="${cls}"` : ""} href="${actorHref(id)}" title="${esc(L(a, "name"))}">${esc(name(id))}</a>` : esc(id); };
export const actHref = (id) => `#/act/${encodeURIComponent(id)}`;

// An act cited by its register id: the label opens the act card on this site; the register and the official text are a click further
export function actRef(actId, provision) {
  const a = D.act[actId];
  if (!a) return actId ? esc(actId) : `<span class="badge b-gap">${esc(t("noBasis"))}</span>`;
  const label = esc(L(a, "short_ref") + (provision ? `, ${provision}` : ""));
  const st = a.status && a.status !== "in_force" ? ` <span class="badge st-${esc(a.status)}">${esc(vl("status", a.status) || a.status)}</span>` : "";
  return `<a class="act-ref" href="${actHref(a.id)}" title="${esc(L(a, "title"))}">${label}</a>${st}`;
}
export const grcActHref = (id) => (CFG.grcUrl ? `${CFG.grcUrl}#/sources?act=${encodeURIComponent(id)}` : "");

export const mBadge = (m) => (D.mandate[m] ? `<span class="mb mb-${esc(m)}" title="${esc(L(D.mandate[m], "name"))}">${esc(m === "OUT" ? t("outShort") : m)}</span>` : "");
const dmy = (d) => (d ? d.split("-").reverse().join(".") : "");
export const confBadge = (c, checked) => (c ? `<span class="badge conf conf-${esc(c)}" title="${esc(vd("confidence", c) + (checked ? ` · ${t("checkedOn")} ${dmy(checked)}` : ""))}">${esc(vl("confidence", c))}${checked ? ` · ${esc(dmy(checked))}` : ""}</span>` : "");
export const statusBadge = (st) => (st && st !== "in_force" ? ` <span class="badge st-${esc(st)}">${esc(vl("status", st))}</span>` : "");
export const covBadge = (c) => `<span class="badge cov cov-${esc(c)}" title="${esc(vd("coverage", c))}">${esc(vl("coverage", c))}</span>`;
export const multiMark = (id) => (isMulti(id) ? ` <span class="multi" title="${esc(t("multiHint"))}">${esc(t("multiShort"))}</span>` : "");
export const gap = (text) => `<span class="badge b-gap">${esc(text)}</span>`;

export const select = (id, label, kind, value, all) => `<label class="field"><span>${esc(label)}</span><select id="${id}">
  <option value="">${esc(all || t("all"))}</option>${order(kind).map((v) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(vl(kind, v))}</option>`).join("")}</select></label>`;
export const selectOf = (id, label, items, value, all) => `<label class="field"><span>${esc(label)}</span><select id="${id}">
  <option value="">${esc(all || t("all"))}</option>${items.map(([v, txt]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
export const mandateItems = () => D.mandates.map((m) => [m.id, `${m.id === "OUT" ? "" : m.id + " · "}${L(m, "name")}`]);
export const toggle = (id, label, on) => `<label class="toggle"><input type="checkbox" id="${id}"${on ? " checked" : ""}><span>${esc(label)}</span></label>`;
export const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
export const empty = (k) => `<p class="muted">${esc(t(k))}</p>`;
export const ext = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
export const crumbs = (...items) => `<p class="crumbs">${items.map(([href, label]) => (href ? `<a href="${href}">${esc(label)}</a>` : esc(label))).join(" / ")}</p>`;
// the planned/draft switch, shared by every view that can hide what does not exist yet
export const plannedToggle = () => toggle("f-planned", t("showPlanned"), S.planned);
