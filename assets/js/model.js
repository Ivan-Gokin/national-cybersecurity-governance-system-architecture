/* The two pages that explain the model itself: the reference frameworks it rests on (and how they map onto each
 * other through the map's functions), and the data model (one schema, the derived facts, the rules that keep it whole).
 * Both are generated from data/graph.json, which carries the schema defined in scripts/mapdata.py. */
import { D, t, fmt, esc, L, many, vl, vd } from "./core.js";
import { mBadge, ext } from "./ui.js";
import { setTitle } from "./app.js";
import { sections, itemLabel, csfBadge } from "./capmap.js";

// ------------------------------------------------------------------ frameworks
export function renderFrameworks(app) {
  setTitle(t("nav_frameworks"));
  const usedBy = (fwId) => D.caps.filter((c) => c.spine.startsWith(fwId + ":") || many(c.also).some((i) => i.startsWith(fwId + ":")));
  const cards = D.frameworks.map((f) => {
    const items = (D.itemsBy[f.id] || []).filter((i) => !(D.itemsBy[f.id] || []).some((k) => k.parent === i.id)); // leaves
    const mapped = new Set(D.caps.flatMap((c) => [c.spine, ...many(c.also)]));
    const covered = items.filter((i) => mapped.has(i.id)).length;
    return `<section class="card fw-card fw-${esc(f.role)}"><p class="kicker">${esc(vl("fw_role", f.role))} · ${esc(L(f, "publisher"))}, ${esc(f.year)}</p>
      <h3>${f.url ? ext(f.url, L(f, "name")) : esc(L(f, "name"))}</h3><p>${esc(L(f, "description"))}</p>
      <p class="small muted">${esc(fmt(t("fwStats"), items.length, covered, usedBy(f.id).length))}</p></section>`;
  }).join("");
  // crosswalk: every NCAF objective (and the mandate groups outside it) against the other frameworks, through its functions
  const row = (g) => {
    const fs = g.caps;
    const csf = [...new Set(fs.map((c) => c.csf).filter(Boolean))];
    const otm = [...new Set(fs.flatMap((c) => many(c.also).filter((i) => i.startsWith("otm:"))))].sort((a, b) => (parseFloat(D.item[a].order) || 0) - (parseFloat(D.item[b].order) || 0));
    const o = D.objective[g.code];
    const mand = o ? many(o.mandates) : [g.code];
    return `<tr class="${fs.length ? "" : "row-blind"}"><th scope="row">${g.badge || `<a class="obj-num" href="${g.href}">${esc(g.code)}</a>`} ${esc(g.name)}</th>
      <td class="num">${fs.length || "—"}</td><td>${csf.map(csfBadge).join(" ")}</td>
      <td>${otm.length ? otm.map((i) => `<span class="code" title="${esc(L(D.item[i], "name"))}">${esc(D.item[i].code.replace("п. ", ""))}</span>`).join(" ") : (fs.length ? `<span class="badge b-gap">${esc(t("fwNoOtm"))}</span>` : "")}</td>
      <td>${mand.map(mBadge).join(" ")}</td></tr>`;
  };
  const body = sections().map((sec) => `<tr class="group"><th colspan="5">${esc(sec.title)} · ${esc(sec.name)}</th></tr>${sec.groups.map(row).join("")}`).join("");
  // what in the national model maps to nothing on the map
  const mapped = new Set(D.caps.flatMap((c) => many(c.also)));
  const otmLeaves = (D.itemsBy.otm || []).filter((i) => !(D.itemsBy.otm || []).some((k) => k.parent === i.id));
  const unmapped = otmLeaves.filter((i) => !mapped.has(i.id));
  app.innerHTML = `<article class="wide">
    <div class="results-head"><h1>${esc(t("nav_frameworks"))}</h1><p class="lead-sm">${esc(t("fwLead"))}</p></div>
    <div class="cards fw-cards">${cards}</div>
    <h2>${esc(t("fwCrossTitle"))}</h2><p class="lead-sm">${esc(t("fwCrossLead"))}</p>
    <div class="table-wrap"><table class="fwx"><thead><tr><th>${esc(t("fwColObjective"))}</th><th>${esc(t("fwColFunctions"))}</th><th>NIST CSF 2.0</th><th>${esc(t("fwColOtm"))}</th><th>${esc(t("fwColMandates"))}</th></tr></thead><tbody>${body}</tbody></table></div>
    <p class="hint">${esc(t("fwCrossHint"))}</p>
    <h2>${esc(t("fwOtmUnmapped"))}</h2><p class="lead-sm">${esc(t("fwOtmUnmappedLead"))}</p>
    ${unmapped.length ? `<ul class="plain otm-list">${unmapped.map((i) => `<li>${itemLabel(i)}</li>`).join("")}</ul>` : `<p class="muted">—</p>`}
  </article>`;
}

// ------------------------------------------------------------------ data model
// fixed positions for the entity diagram (viewBox 1000 x 560)
const POS = {
  framework: [40, 30], item: [300, 30], mandate: [560, 30],
  type: [40, 175], capability: [300, 175], realization: [560, 175], link: [800, 175],
  step: [40, 320], ref: [300, 320], actor: [560, 320], role: [800, 320],
  handoff: [40, 465], vocab: [300, 465], act: [800, 465],
};
const W = 170, H = 50;
function diagram() {
  const sc = D.schema;
  const box = (e) => { const [x, y] = POS[e]; return { x, y, cx: x + W / 2, cy: y + H / 2 }; };
  const edge = (a, b) => { // from the side of box a facing b to the side of box b facing a
    const A = box(a), B = box(b);
    const dx = B.cx - A.cx, dy = B.cy - A.cy;
    const clip = (P, ddx, ddy) => { const tx = ddx ? (W / 2) / Math.abs(ddx) : Infinity, ty = ddy ? (H / 2) / Math.abs(ddy) : Infinity; const k = Math.min(tx, ty); return [P.cx + ddx * k, P.cy + ddy * k]; };
    const [x1, y1] = clip(A, dx, dy), [x2, y2] = clip(B, -dx, -dy);
    return { x1, y1, x2, y2 };
  };
  let lines = "";
  Object.entries(sc).forEach(([e, s]) => Object.entries(s.refs).forEach(([col, tgt]) => {
    const to = tgt.startsWith("item") ? "item" : tgt === "sector" ? null : tgt;
    if (!to || to === e || !POS[e] || !POS[to]) return;
    const { x1, y1, x2, y2 } = edge(e, to);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="er-line er-${esc(s.layer)}" marker-end="url(#er-ah)"><title>${esc(`${s.file}: ${col} → ${tgt}`)}</title></line>`;
  }));
  const boxes = Object.keys(POS).filter((e) => sc[e]).map((e) => {
    const [x, y] = POS[e];
    return `<a href="#ent-${esc(e)}"><g class="er-box er-${esc(sc[e].layer)}"><rect x="${x}" y="${y}" width="${W}" height="${H}"/><text x="${x + W / 2}" y="${y + 22}" class="er-name">${esc(L(sc[e], "name"))}</text><text x="${x + W / 2}" y="${y + 39}" class="er-file">${esc(sc[e].file.split("/").pop())} · ${sc[e].rows}</text></g></a>`;
  }).join("");
  return `<svg class="er" viewBox="0 0 1010 535" role="img" aria-label="${esc(t("modelDiagram"))}"><defs><marker id="er-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="er-ah"/></marker></defs>${lines}${boxes}</svg>`;
}
export function renderModel(app) {
  setTitle(t("nav_model"));
  const sc = D.schema;
  const viewsOf = (e) => Object.entries(D.views).filter(([, es]) => es.includes(e)).map(([v]) => `<a href="#/${esc(v)}">${esc(t("nav_" + v))}</a>`).join(", ");
  const order = ["framework", "item", "mandate", "actor", "role", "link", "capability", "realization", "type", "step", "handoff", "act", "ref", "vocab"];
  const rows = order.filter((e) => sc[e]).map((e) => {
    const s = sc[e];
    const refs = Object.entries(s.refs).map(([col, tgt]) => `<code>${esc(col)}</code> → ${esc(tgt.startsWith("item") ? L(sc.item, "name") : sc[tgt] ? L(sc[tgt], "name") : tgt === "sector" ? t("modelSector") : tgt)}`).join("<br>");
    return `<tr id="ent-${esc(e)}"><th scope="row">${esc(L(s, "name"))}<span class="block small muted"><code>${esc(s.file)}</code></span></th><td><span class="badge layer-${esc(s.layer)}">${esc(t("layer_" + s.layer))}</span></td>
      <td class="small">${esc(L(s, "about"))}</td><td class="small">${refs || "—"}</td><td class="num">${s.rows}</td><td class="small">${viewsOf(e) || "—"}</td></tr>`;
  }).join("");
  const derived = D.derived.map((d) => `<tr><th scope="row">${esc(L(d, "name"))}</th><td class="small">${esc(L(d, "how"))}</td></tr>`).join("");
  app.innerHTML = `<article class="wide narrow">
    <div class="results-head"><h1>${esc(t("nav_model"))}</h1><p class="lead-sm">${esc(t("modelLead"))}</p></div>
    <div class="table-wrap er-wrap">${diagram()}</div>
    <p class="hint"><span class="badge layer-frameworks">${esc(t("layer_frameworks"))}</span> <span class="badge layer-model">${esc(t("layer_model"))}</span> <span class="badge layer-support">${esc(t("layer_support"))}</span> ${esc(t("modelDiagramHint"))}</p>
    <h2>${esc(t("modelEntities"))}</h2>
    <div class="table-wrap"><table class="model-t"><thead><tr><th>${esc(t("modelColEntity"))}</th><th>${esc(t("modelColLayer"))}</th><th>${esc(t("modelColAbout"))}</th><th>${esc(t("modelColRefs"))}</th><th>${esc(t("colRows"))}</th><th>${esc(t("modelColViews"))}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h2>${esc(t("modelDerived"))}</h2><p class="lead-sm">${esc(t("modelDerivedLead"))}</p>
    <div class="table-wrap"><table class="model-d"><tbody>${derived}</tbody></table></div>
    <h2>${esc(t("modelRules"))}</h2>
    <ul class="model-rules">${t("modelRulesList").split("|").map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
  </article>`;
}
