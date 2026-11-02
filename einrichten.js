/* Zimmer einrichten (Ticket 24, Rückmeldung der Eltern: "Decorate her room"). In ihrer Spielzeugkiste kauft Azra
   Dinge mit ihrem Geld und stellt sie in ihr Zimmer: auf den Boden, wo sie hintippt, oder an ihren Platz an der Wand.
   Wegräumen legt sie zurück in die Kiste; nichts geht verloren. Spielstand in S.zimmer = {dinge: [{uid, art, wo}]},
   wo = null (in der Kiste), "wand" oder [x, y] auf dem Boden. */
(function(root){
"use strict";
// ---------- Regeln (rein, getestet) ----------
const KATALOG = [
  { id: "pflanze", name: "Topfpflanze", preis: 150 }, { id: "sitzsack", name: "Sitzsack", preis: 250 },
  { id: "teppich", name: "Sternteppich", preis: 200, flach: true }, { id: "lampe", name: "Stehlampe", preis: 150 },
  { id: "korb", name: "Katzenkorb", preis: 200 }, { id: "einhorn", name: "Kuschel-Einhorn", preis: 200 },
  { id: "poster", name: "Pferde-Poster", preis: 100, wand: "bett" }, { id: "lichterkette", name: "Lichterkette", preis: 150, wand: "fenster" },
  { id: "wimpel", name: "Wimpelkette", preis: 100, wand: "tuer" }
];
const ding = id => KATALOG.find(d => d.id === id) || null;
const F = .5, mitte = v => (Math.floor(v / F) + .5) * F;
function norm(z){
  const o = z && typeof z === "object" && Array.isArray(z.dinge) ? z.dinge : [];
  return { dinge: o.filter(d => d && typeof d === "object" && typeof d.uid === "string" && ding(d.art))
    .map(d => ({ uid: d.uid, art: d.art, wo: d.wo === "wand" && ding(d.art).wand ? "wand" : Array.isArray(d.wo) && d.wo.length === 2 && d.wo.every(Number.isFinite) && !ding(d.art).wand ? d.wo : null })) };
}
function kaufen(z, purse, id){
  const d = ding(id); if(!d || purse < d.preis) return null;
  const n = norm(z), nr = Math.max(0, ...n.dinge.map(x => +x.uid.slice(1) || 0)) + 1;
  return { zimmer: { dinge: [...n.dinge, { uid: "d" + nr, art: id, wo: null }] }, purse: purse - d.preis };
}
// Der Boden mit allem, was im Weg steht (ein Teppich liegt flach, über ihn läuft sie).
function boden(basis, z, ohne){
  const steht = norm(z).dinge.filter(d => Array.isArray(d.wo) && d.uid !== ohne && !ding(d.art).flach);
  return { ...basis, sperren: [...basis.sperren, ...steht.map(({ wo: [x, y] }) => [x - .35, y - .35, x + .35, y + .35])] };
}
// Hinstellen: an die Wand (wenn der Platz frei ist) oder auf den freien Boden, wo sie hingetippt hat; sonst null.
function stellen(z, basis, uid, wo){
  const n = norm(z), d = n.dinge.find(x => x.uid === uid); if(!d) return null;
  const k = ding(d.art), mit = w => ({ dinge: n.dinge.map(x => x.uid === uid ? { ...x, wo: w } : x) });
  if(k.wand) return n.dinge.some(x => x.uid !== uid && x.wo === "wand" && ding(x.art).wand === k.wand) ? null : mit("wand");
  if(!Array.isArray(wo)) return null;
  const p = [mitte(wo[0]), mitte(wo[1])], b = boden(basis, n, uid);
  const frei = p[0] > 0 && p[1] > 0 && p[0] < b.w && p[1] < b.h && !b.sperren.some(([a, c, e, f]) => p[0] > a && p[0] < e && p[1] > c && p[1] < f);
  if(!frei || n.dinge.some(x => x.uid !== uid && Array.isArray(x.wo) && Math.hypot(x.wo[0] - p[0], x.wo[1] - p[1]) < .7)) return null;
  return mit(p);
}
function wegraeumen(z, uid){ const n = norm(z); return { dinge: n.dinge.map(x => x.uid === uid ? { ...x, wo: null } : x) }; }
// Ein Geschenk der Nachbarn (Ticket 25): wie gekauft, nur ohne Geld; es liegt in der Kiste.
function schenken(z, id){ const d = ding(id); return d ? kaufen(z, d.preis, id).zimmer : norm(z); }
const E = { KATALOG, ding, norm, kaufen, schenken, boden, stellen, wegraeumen };
if(typeof module !== "undefined" && module.exports){ module.exports = E; return; }

// ---------- Bilder (im Zimmer, P wie in welt.js) ----------
const B = root.BILD;
function bild(P, d){
  const { box, poly, figur, spr } = B;
  if(d.wo === "wand"){
    if(d.art === "poster") return poly(P, [[0, 5.1, 2.4], [0, 6.7, 2.4], [0, 6.7, 4.1], [0, 5.1, 4.1]], "#fff6ec") + poly(P, [[0, 5.25, 2.55], [0, 6.55, 2.55], [0, 6.55, 3.95], [0, 5.25, 3.95]], "#bfe3d8")
      + (() => { const [x, y] = P(0, 5.9, 3.1); return `<path d="M${x - 26},${y + 10} q10,-30 34,-26 l8,-14 l4,16 q10,8 4,24 l-8,0 l-2,-12 l-24,2 l-2,12 l-8,0Z" fill="#a5723f"/>`; })();
    if(d.art === "lichterkette") return [...Array(9)].map((_, i) => { const [x, y] = P(3.2 + i * .37, 0, 4.75 - Math.sin(i / 8 * Math.PI) * .25); return `<circle cx="${x}" cy="${y}" r="7" fill="${["#f2c94c", "#e5607e", "#4f9fc9", "#6fbf8e"][i % 4]}"/>`; }).join("")
      + (() => { const a = P(3.2, 0, 4.75), b = P(6.2, 0, 4.75); return `<path d="M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 + 16} ${b[0]},${b[1]}" stroke="#5a4a78" stroke-width="2" fill="none"/>`; })();
    if(d.art === "wimpel") return [...Array(5)].map((_, i) => { const [x, y] = P(0, 7.8 + i * .32, 4.5), [x2, y2] = P(0, 8.1 + i * .32, 4.5); return `<path d="M${x},${y} L${x2},${y2} L${(x + x2) / 2},${(y + y2) / 2 + 26}Z" fill="${["#e5607e", "#f2c94c", "#4f9fc9", "#6fbf8e", "#9b6fd0"][i]}"/>`; }).join("");
    return "";
  }
  const [x, y] = d.wo, [sx, sy] = P(x, y);
  if(d.art === "pflanze") return box(P, x - .25, y - .25, 0, .5, .5, .5, "#c97a3e") + `<circle cx="${sx}" cy="${sy - 50}" r="26" fill="#5fae5a"/><circle cx="${sx - 18}" cy="${sy - 34}" r="18" fill="#6dbb63"/><circle cx="${sx + 18}" cy="${sy - 36}" r="18" fill="#4e9a4a"/>`;
  if(d.art === "sitzsack") return `<ellipse cx="${sx}" cy="${sy - 14}" rx="40" ry="24" fill="#e5607e"/><ellipse cx="${sx - 6}" cy="${sy - 26}" rx="26" ry="14" fill="#f08aa3"/>`;
  if(d.art === "teppich") return `<polygon points="${[...Array(10)].map((_, i) => { const r = i % 2 ? .45 : 1, a = i / 10 * 6.283; return P(x + Math.cos(a) * r, y + Math.sin(a) * r).join(","); }).join(" ")}" fill="#f2c94c" opacity=".85"/>`;
  if(d.art === "lampe") return `<rect x="${sx - 3}" y="${sy - 110}" width="6" height="110" fill="#5a4a78"/><ellipse cx="${sx}" cy="${sy}" rx="18" ry="6" fill="#5a4a78"/><path d="M${sx - 26},${sy - 100} L${sx - 14},${sy - 136} H${sx + 14} L${sx + 26},${sy - 100}Z" fill="#fde7ef"/>`;
  if(d.art === "korb") return `<ellipse cx="${sx}" cy="${sy - 8}" rx="40" ry="18" fill="#c98f52"/><ellipse cx="${sx}" cy="${sy - 14}" rx="32" ry="12" fill="#f3eafc"/>`;
  if(d.art === "einhorn") return spr(`<ellipse cy="-30" rx="40" ry="30" fill="#fff"/><circle cx="30" cy="-66" r="22" fill="#fff"/><path d="M36,-86 l6,-26 l4,26Z" fill="#f2c94c"/><path d="M14,-80 q-10,10 -6,30" stroke="#c4a6ec" stroke-width="10" fill="none"/><circle cx="36" cy="-68" r="3" fill="#2a1d18"/>`, sx, sy, .9);
  return "";
}

// ---------- Im Browser: die Spielzeugkiste ----------
const ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), kiste = () => el("kiste");
const geld = c => (c / 100).toFixed(2).replace(".", ",") + " €";
const katze = () => (S().katze || {}).name || "";
let wartet = null; // uid, das sie gerade hinstellen will (nächstes Tippen auf den Boden)
function stand(){ S().zimmer = norm(S().zimmer); return S().zimmer; }
function sag(t){ el("kiC").innerHTML = `<span class="who">${esc(katze())}</span>${esc(t)}`; el("kiC").hidden = false; root.WELT.sprich("katze", t); }
function zu(){ kiste().hidden = true; }
// Bilder für die Kiste (eigene kleine Bilder, gut zu erkennen)
const ICON = {
  pflanze: `<path d="M-22,10 H22 L16,46 H-16Z" fill="#c97a3e"/><circle cy="-14" r="26" fill="#5fae5a"/><circle cx="-20" cy="0" r="16" fill="#6dbb63"/><circle cx="20" cy="-2" r="16" fill="#4e9a4a"/>`,
  sitzsack: `<ellipse cy="20" rx="44" ry="26" fill="#e5607e"/><ellipse cx="-6" cy="6" rx="28" ry="16" fill="#f08aa3"/>`,
  teppich: `<polygon points="${[...Array(10)].map((_, i) => { const r = i % 2 ? 20 : 46, a = i / 10 * 6.283 - 1.571; return (Math.cos(a) * r).toFixed(1) + "," + (Math.sin(a) * r).toFixed(1); }).join(" ")}" fill="#f2c94c"/>`,
  lampe: `<path d="M-24,-20 L-14,-48 H14 L24,-20Z" fill="#f6b3c6"/><rect x="-3" y="-20" width="6" height="62" fill="#5a4a78"/><ellipse cy="44" rx="20" ry="6" fill="#5a4a78"/>`,
  korb: `<ellipse cy="16" rx="44" ry="22" fill="#c98f52"/><ellipse cy="8" rx="34" ry="12" fill="#f3eafc"/>`,
  einhorn: `<ellipse cx="-6" cy="16" rx="34" ry="24" fill="#fff" stroke="#c4a6ec" stroke-width="3"/><circle cx="22" cy="-14" r="18" fill="#fff" stroke="#c4a6ec" stroke-width="3"/><path d="M26,-30 l6,-22 l4,22Z" fill="#f2c94c"/><path d="M8,-24 q-12,10 -8,30" stroke="#e5607e" stroke-width="8" fill="none"/><circle cx="28" cy="-16" r="3" fill="#2a1d18"/>`,
  poster: `<rect x="-36" y="-44" width="72" height="88" rx="4" fill="#fff6ec" stroke="#c98f52" stroke-width="4"/><rect x="-28" y="-36" width="56" height="72" fill="#bfe3d8"/><path d="M-20,20 q6,-24 26,-20 l6,-12 l4,14 q8,6 4,18 l-6,0 l-2,-10 l-18,2 l-2,10 l-6,0Z" fill="#a5723f"/>`,
  lichterkette: `<path d="M-46,-10 Q0,22 46,-10" stroke="#5a4a78" stroke-width="3" fill="none"/>${[-36, -18, 0, 18, 36].map((x, i) => `<circle cx="${x}" cy="${-10 + 32 * (1 - (x / 46) ** 2) * .5 + 8}" r="8" fill="${["#f2c94c", "#e5607e", "#4f9fc9", "#6fbf8e", "#f2c94c"][i]}"/>`).join("")}`,
  wimpel: `<path d="M-46,-20 Q0,-4 46,-20" stroke="#5a4a78" stroke-width="3" fill="none"/>${[-36, -12, 12, 36].map((x, i) => `<path d="M${x - 10},${-16 + Math.abs(x) / 8} h20 l-10,30Z" fill="${["#e5607e", "#f2c94c", "#4f9fc9", "#6fbf8e"][i]}"/>`).join("")}`
};
const miniBild = id => `<svg viewBox="-55 -55 110 110">${ICON[id]}</svg>`;
function oeffnen(nachricht){
  wartet = null; root.SPIEL && root.SPIEL.schliessen(); kiste().hidden = false; el("kiAus").onclick = () => { zu(); root.WELT.zeige(); };
  const z = stand();
  el("kiS").innerHTML = `<h2 class="ui">Meine Kiste</h2>${z.dinge.length ? `<div class="regalwaren">${z.dinge.map(d => `<div class="ware"><span class="bild">${miniBild(d.art)}</span><span class="titel">${esc(ding(d.art).name)}</span>
      ${d.wo ? `<button class="btn klein" data-weg="${d.uid}">Wegräumen</button>` : `<button class="btn klein" data-hin="${d.uid}">Hinstellen</button>`}</div>`).join("")}</div>` : `<p class="leer">Noch leer.</p>`}
    <h2 class="ui">Kaufen</h2><p class="geldbeutel">Im Geldbeutel: <b>${geld(S().purse)}</b></p><div class="regalwaren">${KATALOG.map(d => `<button class="ware" data-ding="${d.id}"${S().purse < d.preis ? " disabled" : ""}>
      <span class="bild">${miniBild(d.id)}</span><span class="titel">${esc(d.name)}</span><span class="preis">${geld(d.preis)}</span></button>`).join("")}</div>`;
  el("kiS").querySelectorAll("[data-ding]").forEach(b => b.onclick = () => { const r = kaufen(stand(), S().purse, b.dataset.ding); if(!r) return;
    S().zimmer = r.zimmer; S().purse = r.purse; ST.save(); root.WELT.klimper(); oeffnen(`${ding(b.dataset.ding).name}! Das liegt jetzt in deiner Kiste.`); });
  el("kiS").querySelectorAll("[data-weg]").forEach(b => b.onclick = () => { S().zimmer = wegraeumen(stand(), b.dataset.weg); ST.save(); oeffnen("Zurück in die Kiste."); });
  el("kiS").querySelectorAll("[data-hin]").forEach(b => b.onclick = () => hin(b.dataset.hin));
  sag(nachricht || "Was möchtest du in dein Zimmer stellen?");
}
function hin(uid){
  const d = stand().dinge.find(x => x.uid === uid);
  if(ding(d.art).wand){ const n = stellen(stand(), root.WELT.ZIMMER_BODEN, uid, null);
    if(!n) return sag("Da hängt schon etwas. Räum es erst weg.");
    S().zimmer = n; ST.save(); zu(); root.WELT.zeige(); return root.WELT.katzeSagt("Schön sieht das aus!"); }
  wartet = uid; zu(); root.WELT.zeige(); root.WELT.katzeSagt("Tipp auf den Boden, wo es stehen soll.");
}
// Ein Tippen auf den Boden, während sie etwas hinstellen will: true, wenn es das Hinstellen war.
function boden_(xy, basis){
  if(!wartet) return false;
  const n = stellen(stand(), basis, wartet, xy);
  if(!n){ root.WELT.katzeSagt("Da ist kein Platz. Tipp woanders hin."); return true; }
  wartet = null; S().zimmer = n; ST.save(); root.WELT.klimper(); root.WELT.katzeSagt("Schön sieht das aus!"); return true;
}
root.EINRICHTEN = { ...E, bild, oeffnen, zu, tippBoden: boden_, abbrechen: () => { wartet = null; }, get offen(){ return !kiste().hidden; }, get wartet(){ return wartet; } };
})(this);
