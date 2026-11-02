/* Puppenhaus (Ticket 27): vier Zimmer, drei Puppen und eine Spielzeugkatze. Sie zieht die Puppen mit Finger oder
   Maus von Zimmer zu Zimmer und macht in jedem Zimmer das Licht an und aus. Reines Spiel; wo alle stehen, bleibt
   gespeichert in S.puppenhaus = {puppen: {id: [x, y]}, licht: [4 × an/aus]}. Maße im Bild 1000 × 620. */
(function(root){
"use strict";
const RAEUME = [
  { id: "schlaf", name: "im Schlafzimmer", x0: 150, x1: 500, y0: 130, boden: 330, wand: "#fde7ef" },
  { id: "bad", name: "im Bad", x0: 500, x1: 850, y0: 130, boden: 330, wand: "#dff1fb" },
  { id: "kueche", name: "in der Küche", x0: 150, x1: 500, y0: 350, boden: 560, wand: "#fff1d6" },
  { id: "wohn", name: "im Wohnzimmer", x0: 500, x1: 850, y0: 350, boden: 560, wand: "#e9f6e1" }];
const PUPPEN = [
  { id: "lina", name: "Lina", start: [620, 560] }, { id: "ben", name: "Ben", start: [730, 560] },
  { id: "baby", name: "Baby Mo", start: [380, 330] }, { id: "miez", name: "Miez", start: [260, 560] }];
const RAND = 40;
const raum = (x, y) => RAEUME.findIndex(r => x > r.x0 && x < r.x1 && y > r.y0 - 20 && y < r.boden + 15);
function norm(st){
  const o = st && typeof st === "object" ? st : {}, p = o.puppen && typeof o.puppen === "object" ? o.puppen : {};
  const ok = v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && raum(...v) >= 0;
  return { puppen: Object.fromEntries(PUPPEN.map(d => [d.id, ok(p[d.id]) ? [p[d.id][0], p[d.id][1]] : [...d.start]])),
    licht: Array.isArray(o.licht) && o.licht.length === RAEUME.length && o.licht.every(b => typeof b === "boolean") ? [...o.licht] : RAEUME.map(() => true) };
}
// Fallen gelassen: im Zimmer steht sie auf dessen Boden, nie in einer Wand; außerhalb des Hauses bleibt sie, wo sie war.
function ziehen(st, id, x, y){
  const n = norm(st), i = raum(x, y); if(i < 0 || !n.puppen[id]) return n;
  const r = RAEUME[i]; n.puppen[id] = [Math.min(r.x1 - RAND, Math.max(r.x0 + RAND, x)), r.boden];
  return n;
}
const schalten = (st, i) => { const n = norm(st); if(i >= 0 && i < n.licht.length) n.licht[i] = !n.licht[i]; return n; };
const H = { RAEUME, PUPPEN, raum, norm, ziehen, schalten };
if(typeof module !== "undefined" && module.exports){ module.exports = H; return; }

// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("puppenhaus");
function sag(t){ el("phC").innerHTML = `<span class="who">${esc((S().katze || {}).name || "")}</span>${esc(t)}`; el("phC").hidden = false; root.WELT.sprich("katze", t); }
function stand(){ S().puppenhaus = norm(S().puppenhaus); return S().puppenhaus; }
function zu(){ box().hidden = true; }
const MOEBEL = {
  schlaf: `<rect x="190" y="270" width="150" height="40" rx="8" fill="#9b6ad8"/><rect x="190" y="250" width="20" height="80" fill="#c99b72"/><rect x="215" y="260" width="45" height="18" rx="8" fill="#fff"/><rect x="190" y="310" width="150" height="20" fill="#c99b72"/>`,
  bad: `<path d="M560,280 H720 V300 Q720,330 690,330 H590 Q560,330 560,300Z" fill="#fff" stroke="#9fc3dd" stroke-width="6"/><rect x="700" y="240" width="8" height="45" fill="#9aa7b4"/><rect x="760" y="250" width="50" height="80" rx="6" fill="#cfe8f7"/>`,
  kueche: `<rect x="180" y="470" width="110" height="90" fill="#e8e2d8"/><rect x="180" y="470" width="110" height="12" fill="#3b2f2a"/><circle cx="210" cy="476" r="9" fill="#555"/><circle cx="255" cy="476" r="9" fill="#555"/><rect x="330" y="500" width="120" height="12" fill="#e0b07a"/><rect x="340" y="512" width="10" height="48" fill="#c98f52"/><rect x="430" y="512" width="10" height="48" fill="#c98f52"/>`,
  wohn: `<rect x="540" y="490" width="170" height="50" rx="14" fill="#4f9fc9"/><rect x="540" y="465" width="170" height="35" rx="12" fill="#6fb3dc"/><rect x="540" y="540" width="170" height="20" fill="#3f88b3"/><rect x="740" y="420" width="70" height="50" rx="6" fill="#2b2140"/><rect x="770" y="470" width="10" height="90" fill="#8a6a4f"/>`
};
function puppeBild(id){
  if(id === "miez") return `<ellipse cx="0" cy="-22" rx="30" ry="20" fill="#b9a7d6"/><circle cx="24" cy="-44" r="17" fill="#b9a7d6"/><path d="M14,-56 L18,-72 L28,-58Z M30,-58 L38,-72 L40,-54Z" fill="#b9a7d6"/><circle cx="21" cy="-46" r="3" fill="#2b2140"/><circle cx="31" cy="-46" r="3" fill="#2b2140"/><path d="M-30,-24 Q-52,-40 -40,-62" stroke="#b9a7d6" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  const k = id === "baby" ? .45 : .72, kleid = { lina: "#e5607e", ben: "#4f9fc9", baby: "#f2c94c" }[id], haar = { lina: "#5a3a26", ben: "#2b2140", baby: "#c9955f" }[id];
  return `<g transform="scale(${k})"><rect x="-14" y="-40" width="10" height="40" rx="4" fill="#c98f6b"/><rect x="4" y="-40" width="10" height="40" rx="4" fill="#c98f6b"/>`
    + (id === "lina" ? `<path d="M-30,-40 L-16,-104 H16 L30,-40Z" fill="${kleid}"/>` : `<rect x="-24" y="-104" width="48" height="66" rx="14" fill="${kleid}"/>`)
    + `<circle cy="-130" r="30" fill="#d9a07f"/><path d="M-31,-134 Q-30,-166 0,-164 Q30,-166 31,-134 Q16,-150 -31,-134Z" fill="${haar}"/>`
    + (id === "lina" ? `<circle cx="-34" cy="-128" r="12" fill="${haar}"/><circle cx="34" cy="-128" r="12" fill="${haar}"/>` : "")
    + `<circle cx="-10" cy="-128" r="4" fill="#2b2140"/><circle cx="10" cy="-128" r="4" fill="#2b2140"/><path d="M-9,-114 Q0,-106 9,-114" stroke="#2b2140" stroke-width="3" fill="none"/></g>`;
}
function male(){
  const st = stand(), alleDunkel = st.licht.every(b => !b);
  let s = `<rect width="1000" height="620" fill="${alleDunkel ? "#2b2a6b" : "#e8f2fb"}" rx="20"/>${alleDunkel ? [[80, 80], [920, 120], [60, 400], [940, 460], [500, 600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff6c8"/>`).join("") : ""}`;
  s += `<path d="M120,132 L500,20 L880,132Z" fill="#9b6ad8"/><rect x="140" y="120" width="720" height="460" fill="#f6b3c6"/>`;
  RAEUME.forEach((r, i) => {
    s += `<rect x="${r.x0 + 10}" y="${r.y0}" width="${r.x1 - r.x0 - 20}" height="${r.boden - r.y0}" fill="${r.wand}"/>${MOEBEL[r.id]}`;
    s += `<rect x="${r.x0 + 10}" y="${r.boden}" width="${r.x1 - r.x0 - 20}" height="${i < 2 ? 20 : 12}" fill="#c99b72"/>`;
  });
  RAEUME.forEach((r, i) => { if(!st.licht[i]) s += `<rect x="${r.x0 + 10}" y="${r.y0}" width="${r.x1 - r.x0 - 20}" height="${r.boden - r.y0}" fill="#1d1a44" opacity=".6" pointer-events="none"/>`; });
  RAEUME.forEach((r, i) => { const x = (r.x0 + r.x1) / 2;
    s += `<g data-licht="${i}" style="cursor:pointer"><rect x="${x - 40}" y="${r.y0}" width="80" height="70" fill="transparent"/><line x1="${x}" y1="${r.y0}" x2="${x}" y2="${r.y0 + 28}" stroke="#4b3a6e" stroke-width="4"/>`
      + `<path d="M${x - 24},${r.y0 + 44} Q${x},${r.y0 + 18} ${x + 24},${r.y0 + 44}Z" fill="#9b6ad8"/><circle cx="${x}" cy="${r.y0 + 50}" r="11" fill="${st.licht[i] ? "#ffe680" : "#8d86a8"}"/>`
      + (st.licht[i] ? `<path d="M${x - 70},${r.boden} L${x - 22},${r.y0 + 50} H${x + 22} L${x + 70},${r.boden}Z" fill="#fff6b0" opacity=".25" pointer-events="none"/>` : "") + `</g>`; });
  s += PUPPEN.map(d => { const [x, y] = st.puppen[d.id]; return `<g data-puppe="${d.id}" transform="translate(${x} ${y})" style="cursor:grab;touch-action:none"><rect x="-45" y="-${d.id === "miez" ? 80 : 130}" width="90" height="${d.id === "miez" ? 80 : 130}" fill="transparent"/>${puppeBild(d.id)}</g>`; }).join("");
  el("phBild").innerHTML = s;
  el("phBild").querySelectorAll("[data-licht]").forEach(g => g.onclick = () => { const i = +g.dataset.licht; S().puppenhaus = schalten(stand(), i); ST.save(); male();
    const n = stand(); sag(n.licht.every(b => !b) ? "Psst, alle schlafen." : n.licht[i] ? `Licht an ${RAEUME[i].name}.` : `Licht aus ${RAEUME[i].name}.`); });
  el("phBild").querySelectorAll("[data-puppe]").forEach(g => {
    const id = g.dataset.puppe, svg = el("phBild"), pt = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    let zieht = false;
    g.onpointerdown = e => { zieht = true; try{ g.setPointerCapture(e.pointerId); }catch(_){} g.style.cursor = "grabbing"; e.preventDefault(); };
    g.onpointermove = e => { if(!zieht) return; const p = pt(e); g.setAttribute("transform", `translate(${p.x} ${p.y + 60})`); };
    g.onpointercancel = () => { if(zieht){ zieht = false; male(); } }; // abgebrochen: die Puppe bleibt, wo sie war
    g.onpointerup = e => { if(!zieht) return; zieht = false; const p = pt(e), vor = stand().puppen[id].join();
      S().puppenhaus = ziehen(stand(), id, p.x, p.y + 60); ST.save(); male();
      const d = PUPPEN.find(x => x.id === id), i = raum(...stand().puppen[id]);
      sag(stand().puppen[id].join() === vor ? `${d.name} bleibt lieber im Haus.` : `${d.name} ist jetzt ${RAEUME[i].name}.`); };
  });
}
function oeffnen(frei){
  root.SPIEL && root.SPIEL.schliessen(); box().hidden = false;
  el("phAus").onclick = () => { zu(); root.WELT.zeige(); };
  el("phS").innerHTML = `<h2 class="ui">Mein Puppenhaus</h2><div class="kochstelle"><svg id="phBild" viewBox="0 0 1000 620"></svg></div>${frei ? `<div class="werkzeug"><button class="btn klein hell" id="phLernen">Lieber eine Aufgabe</button></div>` : ""}`;
  if(frei) el("phLernen").onclick = () => { zu(); frei(); };
  male(); sag("Zieh die Puppen in ein Zimmer. Tipp auf eine Lampe, dann geht das Licht an oder aus.");
}
root.PUPPENHAUS = { ...H, oeffnen, zu, get offen(){ return !box().hidden; } };
})(this);
