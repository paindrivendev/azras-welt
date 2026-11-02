/* Katze pflegen (Ticket 23, Rückmeldung der Eltern: "Care for her cat"). In ihrem Zimmer tippt Azra auf die Katze:
   füttern, bürsten, mit der Feder spielen. Die Katze freut sich, schnurrt und zeigt Herzchen. Sie ist nie traurig,
   hungrig oder krank zur Strafe; sie sagt höchstens freundlich, was sie heute gern hätte.
   Spielstand in S.katzePflege = {futter, buerste, spielen: letztes Datum, mal: {art: wie oft}}. */
(function(root){
"use strict";
// ---------- Regeln (rein, getestet) ----------
const ARTEN = ["futter", "buerste", "spielen"];
function norm(p){
  const o = p && typeof p === "object" && !Array.isArray(p) ? p : {}, n = { mal: {} };
  for(const a of ARTEN){ n[a] = typeof o[a] === "string" ? o[a] : ""; const m = o.mal && o.mal[a]; if(Number.isInteger(m) && m > 0) n.mal[a] = m; }
  return n;
}
function gemacht(p, art, date){ if(!ARTEN.includes(art)) throw new Error("keine Pflege: " + art); const n = norm(p); n[art] = date; n.mal[art] = (n.mal[art] || 0) + 1; return n; }
const wunsch = (p, date) => ARTEN.find(a => norm(p)[a] !== date) || null;
const K = { ARTEN, norm, gemacht, wunsch };
if(typeof module !== "undefined" && module.exports){ module.exports = K; return; }
// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S, B = root.BILD;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("pflege");
const name = () => (S().katze || {}).name || "", farbe = () => (S().katze || {}).farbe || "lila";
const heute = () => root.WELT.today();
const BITTE = { futter: "Miau! Ich hätte gern etwas zu fressen.", buerste: "Bürstest du mich ein bisschen?", spielen: "Spielst du mit mir? Ich mag die Feder so gern!" };
const DANKE = { futter: "Mmh, lecker! Danke, Azra.", buerste: "Schnurr! Mein Fell glänzt jetzt.", spielen: "Das war lustig! Noch einmal?" };
let aus = null; // laufende Animation beenden
function sag(t){ el("pfC").innerHTML = `<span class="who">${esc(name())}</span>${esc(t)}`; el("pfC").hidden = false; root.WELT.sprich("katze", t); }
function stand(){ S().katzePflege = norm(S().katzePflege); return S().katzePflege; }
function fertig(art){ S().katzePflege = gemacht(stand(), art, heute()); ST.save(); root.AUFGABEN && root.AUFGABEN.KLANG && root.AUFGABEN.KLANG.chime(); sag(DANKE[art]); }
function stopp(){ if(aus){ aus(); aus = null; } }
function zu(){ stopp(); box().hidden = true; }
function schliessen(){ zu(); root.WELT.zeige(); }
const herz = (x, y, i = 0) => `<path class="herz" style="animation-delay:${i * .15}s" d="M${x},${y + 14} c-24,-16 -24,-38 -8,-40 c6,0 8,4 8,8 c0,-4 2,-8 8,-8 c16,2 16,24 -8,40Z" fill="#e5607e"/>`;
// Die Bühne: ihre Katze groß in der Mitte, unten die drei Sachen zum Pflegen.
function oeffnen(){
  stopp(); root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; el("pfAus").onclick = schliessen;
  const p = stand(), w = wunsch(p, heute());
  male({ x: 500, modus: null, herzen: 0 });
  sag(w ? BITTE[w] : "Ich hab dich lieb, Azra.");
}
function male(z){
  const k = B.spr(B.figur("katze:" + farbe()), z.x, 470 - (z.hoch || 0), .95, z.links);
  const glanz = z.glanz ? [...Array(Math.round(z.glanz * 8))].map((_, i) => `<path d="M${430 + (i * 37) % 150},${230 + (i * 53) % 200} l6,-14 l6,14 l14,6 l-14,6 l-6,14 l-6,-14 l-14,-6Z" fill="#fff6c8"/>`).join("") : "";
  const napf = `<g transform="translate(240 500)"><ellipse rx="90" ry="26" fill="#9b6ad8"/><ellipse cy="-8" rx="76" ry="18" fill="${z.voll ? "#a5723f" : "#e7dafb"}"/>${z.voll ? [...Array(9)].map((_, i) => `<circle cx="${-50 + i * 12}" cy="${-12 - (i % 3) * 4}" r="7" fill="#8a5a3c"/>`).join("") : ""}</g>`;
  const sack = z.modus === "futter" && !z.voll ? `<g class="hot" id="pfSack" transform="translate(130 370)"><path d="M-44,90 L-50,-20 Q-40,-60 0,-56 Q40,-60 50,-20 L44,90Z" fill="#f2c94c"/><path d="M-20,10 q20,-24 40,0 q-20,24 -40,0Z" fill="#e5607e"/><text y="70" text-anchor="middle" class="ui" font-size="22" fill="#7a5a10">Futter</text></g>` : "";
  const feder = z.modus === "spielen" ? `<g transform="translate(${z.fx || 780} ${z.fy || 220}) rotate(-30)" pointer-events="none"><path d="M0,0 q30,-60 10,-120 q-30,50 -10,120Z" fill="#4f9fc9"/><path d="M0,0 L-6,40" stroke="#8a5a3c" stroke-width="5"/></g>` : "";
  const buerste = z.modus === "buerste" ? `<g transform="translate(${z.bx || 760} ${z.by || 300}) rotate(-20)" pointer-events="none"><rect x="-50" y="-16" width="100" height="32" rx="12" fill="#c98f52"/><rect x="-46" y="14" width="92" height="20" rx="4" fill="#5c4033"/><rect x="40" y="-8" width="80" height="16" rx="8" fill="#c98f52"/></g>` : "";
  const ring = z.modus === "buerste" ? `<circle cx="120" cy="110" r="46" fill="none" stroke="#efe6fb" stroke-width="16"/><circle cx="120" cy="110" r="46" fill="none" stroke="#8e5bd6" stroke-width="16" stroke-dasharray="${((z.glanz || 0) * 289).toFixed(0)} 289" transform="rotate(-90 120 110)"/>` : "";
  el("pfS").innerHTML = `<div class="kochstelle"><svg id="pfBuehne" viewBox="0 0 1000 560"><rect x="20" y="420" width="960" height="130" rx="30" fill="#e7dafb"/>${napf}${sack}
    <g class="hot" id="pfKatze">${k}<rect x="${z.x - 170}" y="150" width="340" height="330" fill="transparent"/></g>${glanz}${buerste}${feder}${ring}${[...Array(z.herzen || 0)].map((_, i) => herz(z.x - 60 + i * 40, 150 - i * 12, i)).join("")}</svg></div>
    <div class="aufgabe-fuss pflege">${[["futter", "Füttern"], ["buerste", "Bürsten"], ["spielen", "Spielen"]].map(([a, t]) => `<button class="btn${z.modus === a ? " an" : ""}" data-pflege="${a}">${t}</button>`).join("")}</div>`;
  verbinden(z);
}
function verbinden(z){
  const svg = el("pfBuehne"), pt = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  el("pfS").querySelectorAll("[data-pflege]").forEach(b => b.onclick = () => { stopp(); const m = b.dataset.pflege;
    male({ x: 500, modus: m, herzen: 0, glanz: 0, fang: 0 }); sag(m === "futter" ? "Tipp auf den Futtersack." : m === "buerste" ? "Fahr mit der Bürste über mein Fell." : "Tipp irgendwo hin, ich fange die Feder!"); });
  // Streicheln: schnurren und ein Herz
  el("pfKatze").onclick = e => {
    if(z.modus === "buerste") return buersten(z, .12);
    if(z.modus === "spielen") return fangen(z, pt(e));
    male({ ...z, herzen: Math.min(5, (z.herzen || 0) + 1) }); sag("Schnurr, schnurr.");
  };
  const sack = el("pfSack");
  if(sack) sack.onclick = () => { // der Napf wird voll, die Katze läuft hin und frisst
    const z2 = { ...z, voll: true }; male(z2); const t0 = performance.now(); let lauf = true; aus = () => { lauf = false; };
    (function schritt(){ if(!lauf) return; const k = Math.min(1, (performance.now() - t0) / 900); const z3 = { ...z2, x: 500 - 200 * k, links: true, hoch: k >= 1 ? Math.abs(Math.sin(performance.now() / 120)) * 10 : 0 };
      male(z3); if(performance.now() - t0 < 2200) return void setTimeout(schritt, 60);
      aus = null; male({ ...z3, hoch: 0, herzen: 3, voll: false, modus: null }); fertig("futter"); })();
  };
  if(z.modus === "buerste") svg.onpointermove = e => { const p = pt(e); z.bx = p.x; z.by = p.y; if(Math.abs(p.x - z.x) < 170 && p.y > 150 && p.y < 480) buersten(z, .012); else male(z); };
  if(z.modus === "spielen") svg.onclick = e => { if(e.target.closest("#pfKatze, [data-pflege]")) return; fangen(z, pt(e)); };
}
function buersten(z, d){
  if(z.fertig) return; z.glanz = Math.min(1, (z.glanz || 0) + d);
  if(z.glanz >= 1){ z.fertig = true; male({ x: z.x, modus: null, herzen: 4, glanz: 1 }); return fertig("buerste"); }
  male(z);
}
// Feder: die Katze springt hin; nach vier Fängen ist sie glücklich.
function fangen(z, p){
  if(z.fertig) return; stopp();
  const von = z.x, nach = Math.max(200, Math.min(820, p.x)), t0 = performance.now(); let lauf = true; aus = () => { lauf = false; };
  z.fx = p.x; z.fy = Math.min(380, p.y);
  (function schritt(){ if(!lauf) return; const k = Math.min(1, (performance.now() - t0) / 500);
    male({ ...z, x: von + (nach - von) * k, links: nach < von, hoch: Math.sin(k * Math.PI) * 120 });
    if(k < 1) return void setTimeout(schritt, 30);
    aus = null; z.x = nach; z.fang = (z.fang || 0) + 1; root.WELT.klimper();
    if(z.fang >= 4){ z.fertig = true; male({ x: z.x, modus: null, herzen: 4 }); return fertig("spielen"); }
    male(z); })();
}
root.KATZE = { ...K, oeffnen, schliessen, zu, get offen(){ return !box().hidden; } };
})(this);
