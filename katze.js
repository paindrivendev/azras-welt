/* Katze pflegen (Ticket 23, Rückmeldung der Eltern: "Care for her cat"). In ihrem Zimmer tippt Azra auf die Katze:
   füttern, bürsten, mit der Feder spielen. Die Katze freut sich, schnurrt und zeigt Herzchen. Sie ist nie traurig,
   hungrig oder krank zur Strafe; sie sagt höchstens freundlich, was sie heute gern hätte.
   Spielstand in S.katzePflege = {futter, buerste, spielen: letztes Datum, mal: {art: wie oft}}.
   Ticket 42: Kunststücke (sie liest eine Wortkarte, die Katze macht es) und Verstecken (die Katze ruft, wo sie ist).
   Spielstand in S.katzeKunst = {karte: wie oft geklappt}. */
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
// Kunststücke: jede Stufe hat längere Karten; die nächste Stufe ist frei, wenn jede Karte der Stufe zweimal geklappt hat.
// zug = die Bewegungen der Katze nacheinander
const ZUEGE = ["sitz", "platz", "spring", "hoch", "dreh", "roll", "pfote", "maennchen", "verbeug", "links", "kreis"];
const KUNST = [
  [["sitz", "Sitz!", ["sitz"]], ["spring", "Spring!", ["spring"]], ["dreh", "Dreh dich!", ["dreh"]], ["platz", "Platz!", ["platz"]]],
  [["pfote", "Gib Pfote!", ["pfote"]], ["roll", "Roll dich herum!", ["roll"]], ["maennchen", "Mach mal Männchen!", ["maennchen"]], ["hoch", "Spring ganz hoch!", ["hoch"]]],
  [["zweimal", "Dreh dich zweimal im Kreis!", ["dreh", "dreh"]], ["sitzpfote", "Setz dich und gib mir die Pfote!", ["sitz", "pfote"]], ["hinroll", "Leg dich hin und roll dich!", ["platz", "roll"]],
    ["linksspring", "Lauf nach links und spring!", ["links", "spring"]]],
  [["kreissitz", "Lauf einmal im Kreis und setz dich hin!", ["kreis", "sitz"]], ["dreimal", "Spring dreimal hintereinander in die Luft!", ["spring", "spring", "spring"]],
    ["verbeugen", "Mach Männchen und verbeug dich danach ganz tief!", ["maennchen", "verbeug"]], ["tanz", "Dreh dich, spring hoch und leg dich dann hin!", ["dreh", "hoch", "platz"]]]
].map(st => st.map(([id, text, zug]) => ({ id, text, zug })));
const KARTE = Object.fromEntries(KUNST.flat().map(c => [c.id, c]));
function kunstNorm(k){
  const o = k && typeof k === "object" && !Array.isArray(k) ? k : {}, n = {};
  for(const id of Object.keys(KARTE)) if(Number.isInteger(o[id]) && o[id] > 0) n[id] = o[id];
  return n;
}
function kunstGemacht(k, id){ if(!KARTE[id]) throw new Error("kein Kunststück: " + id); const n = kunstNorm(k); n[id] = (n[id] || 0) + 1; return n; }
function kunstStufe(k){ const n = kunstNorm(k); let s = 1; while(s < KUNST.length && KUNST[s - 1].every(c => (n[c.id] || 0) >= 2)) s++; return s; }
const kunstKarten = k => KUNST[kunstStufe(k) - 1];
// Verstecken: dasselbe Möbel mit verschiedenen Präpositionen, darum muss sie genau lesen oder hören
const VERSTECKE = [["unterBett", "unter dem Bett"], ["aufBett", "auf dem Bett"], ["unterTisch", "unter dem Tisch"], ["aufTisch", "auf dem Tisch"],
  ["imSchrank", "im Schrank"], ["aufSchrank", "auf dem Schrank"], ["vorhang", "hinter dem Vorhang"], ["inKiste", "in der Kiste"], ["nebenKiste", "neben der Kiste"]].map(([id, wo]) => ({ id, wo }));
function versteck(rng, vorher){ const frei = VERSTECKE.filter(v => v.id !== vorher); return frei[Math.floor(rng() * frei.length)]; }
const hinweis = v => `Ich bin ${v.wo}.`;
const K = { ARTEN, norm, gemacht, wunsch, ZUEGE, KUNST, kunstNorm, kunstGemacht, kunstStufe, kunstKarten, VERSTECKE, versteck, hinweis };
if(typeof module !== "undefined" && module.exports){ module.exports = K; return; }
// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S, B = root.BILD;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("pflege");
const name = () => (S().katze || {}).name || "", farbe = () => (S().katze || {}).farbe || "lila";
const heute = () => root.WELT.today();
const BITTE = { futter: "Miau! Ich hätte gern etwas zu fressen.", buerste: "Bürstest du mich ein bisschen?", spielen: "Spielst du mit mir? Ich mag die Feder so gern!" };
const DANKE = { futter: "Lecker! Danke, Azra.", buerste: "Schnurr! Mein Fell glänzt jetzt.", spielen: "Das war lustig! Noch einmal?" };
const KNOEPFE = [["futter", "Füttern"], ["buerste", "Bürsten"], ["spielen", "Spielen"], ["kunst", "Kunststücke"], ["verstecken", "Verstecken"]];
const GEKONNT = ["Geschafft!", "Das kann ich!", "Gut so?", "Noch eine Karte?"];
let aus = null; // laufende Animation beenden
function sag(t){ el("pfC").innerHTML = `<span class="who">${esc(name())}</span>${esc(t)}`; el("pfC").hidden = false; root.WELT.sprich("katze", t); }
function stand(){ S().katzePflege = norm(S().katzePflege); return S().katzePflege; }
function fertig(art){ S().katzePflege = gemacht(stand(), art, heute()); ST.save(); root.AUFGABEN && root.AUFGABEN.KLANG && root.AUFGABEN.KLANG.chime(); sag(DANKE[art]); }
function stopp(){ if(aus){ aus(); aus = null; } }
function spaeter(ms, f){ const id = setTimeout(() => { aus = null; f(); }, ms); aus = () => clearTimeout(id); }
const fuss = z => `<div class="aufgabe-fuss pflege">${KNOEPFE.map(([a, t]) => `<button class="btn${z.modus === a ? " an" : ""}" data-pflege="${a}">${t}</button>`).join("")}</div>`;
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
function buehne(z){
  const fy = 470 - (z.hoch || 0), sy = z.sy || 1;
  const k = `<g transform="rotate(${z.dreh || 0} ${z.x} ${fy - 150}) translate(${z.x} ${fy}) scale(1 ${sy}) translate(${-z.x} ${-fy})">${B.spr(B.figur("katze:" + farbe()), z.x, fy, .95, z.links)}</g>`;
  const glanz = z.glanz ? [...Array(Math.round(z.glanz * 8))].map((_, i) => `<path d="M${430 + (i * 37) % 150},${230 + (i * 53) % 200} l6,-14 l6,14 l14,6 l-14,6 l-6,14 l-6,-14 l-14,-6Z" fill="#fff6c8"/>`).join("") : "";
  const napf = `<g transform="translate(240 500)"><ellipse rx="90" ry="26" fill="#9b6ad8"/><ellipse cy="-8" rx="76" ry="18" fill="${z.voll ? "#a5723f" : "#e7dafb"}"/>${z.voll ? [...Array(9)].map((_, i) => `<circle cx="${-50 + i * 12}" cy="${-12 - (i % 3) * 4}" r="7" fill="#8a5a3c"/>`).join("") : ""}</g>`;
  const sack = z.modus === "futter" && !z.voll ? `<g class="hot" id="pfSack" transform="translate(130 370)"><path d="M-44,90 L-50,-20 Q-40,-60 0,-56 Q40,-60 50,-20 L44,90Z" fill="#f2c94c"/><path d="M-20,10 q20,-24 40,0 q-20,24 -40,0Z" fill="#e5607e"/><text y="70" text-anchor="middle" class="ui" font-size="22" fill="#7a5a10">Futter</text></g>` : "";
  const feder = z.modus === "spielen" ? `<g transform="translate(${z.fx || 780} ${z.fy || 220}) rotate(-30)" pointer-events="none"><path d="M0,0 q30,-60 10,-120 q-30,50 -10,120Z" fill="#4f9fc9"/><path d="M0,0 L-6,40" stroke="#8a5a3c" stroke-width="5"/></g>` : "";
  const buerste = z.modus === "buerste" ? `<g transform="translate(${z.bx || 760} ${z.by || 300}) rotate(-20)" pointer-events="none"><rect x="-50" y="-16" width="100" height="32" rx="12" fill="#c98f52"/><rect x="-46" y="14" width="92" height="20" rx="4" fill="#5c4033"/><rect x="40" y="-8" width="80" height="16" rx="8" fill="#c98f52"/></g>` : "";
  const ring = z.modus === "buerste" ? `<circle cx="120" cy="110" r="46" fill="none" stroke="#efe6fb" stroke-width="16"/><circle cx="120" cy="110" r="46" fill="none" stroke="#8e5bd6" stroke-width="16" stroke-dasharray="${((z.glanz || 0) * 289).toFixed(0)} 289" transform="rotate(-90 120 110)"/>` : "";
  return `<rect x="20" y="420" width="960" height="130" rx="30" fill="#e7dafb"/>${napf}${sack}
    <g class="hot" id="pfKatze">${k}<rect x="${z.x - 170}" y="150" width="340" height="330" fill="transparent"/></g>${glanz}${buerste}${feder}${ring}${[...Array(z.herzen || 0)].map((_, i) => herz(z.x - 60 + i * 40, 150 - i * 12, i)).join("")}`;
}
function male(z){
  if(z.modus === "verstecken") return maleZimmer(z);
  const svg = `<div class="kochstelle"><svg id="pfBuehne" viewBox="0 0 1000 560">${buehne(z)}</svg></div>`;
  el("pfS").innerHTML = z.modus === "kunst"
    ? `<div class="kunst-buehne">${svg}<div class="wortkarten">${kunstKarten(S().katzeKunst).map(c => `<button class="wortkarte" data-kunst="${c.id}">${esc(c.text)}</button>`).join("")}</div></div>${fuss(z)}`
    : svg + fuss(z);
  verbinden(z);
}
function waehle(m){
  stopp(); if(m === "verstecken") return verstecken();
  if(m === "kunst") S().katzeKunst = kunstNorm(S().katzeKunst);
  male({ x: 500, modus: m, herzen: 0, glanz: 0, fang: 0 });
  sag(m === "futter" ? "Tipp auf den Futtersack." : m === "buerste" ? "Fahr mit der Bürste über mein Fell." : m === "kunst" ? "Lies eine Karte und tipp darauf. Dann mache ich es!" : "Tipp irgendwo hin, ich fange die Feder!");
}
const fussVerbinden = () => el("pfS").querySelectorAll("[data-pflege]").forEach(b => b.onclick = () => waehle(b.dataset.pflege));
function verbinden(z){
  const svg = el("pfBuehne"), pt = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  fussVerbinden();
  el("pfS").querySelectorAll("[data-kunst]").forEach(b => b.onclick = () => vormachen(b.dataset.kunst));
  // Streicheln: schnurren und ein Herz
  el("pfKatze").onclick = e => {
    if(z.modus === "kunst") return;
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
// ---------- Kunststücke (Ticket 42): sie liest die Karte selbst; die Katze sagt sie nicht vor, sie macht sie nur ----------
// Haltung der Katze bei t von 0 bis 1 für jede Bewegung
const HALTUNG = {
  sitz: t => ({ sy: 1 - .18 * Math.sin(t * Math.PI) }), platz: t => ({ sy: 1 - .38 * Math.sin(t * Math.PI) }),
  spring: t => ({ hoch: 140 * Math.sin(t * Math.PI) }), hoch: t => ({ hoch: 160 * Math.sin(t * Math.PI) }),
  dreh: t => ({ links: Math.floor(t * 4) % 2 === 1, hoch: 12 * Math.abs(Math.sin(t * 4 * Math.PI)) }),
  roll: t => ({ dreh: 360 * t, sy: .8 }), pfote: t => ({ dreh: -14 * Math.sin(t * Math.PI), sy: .85 }),
  maennchen: t => ({ sy: 1 + .2 * Math.sin(t * Math.PI), hoch: 24 * Math.sin(t * Math.PI) }), verbeug: t => ({ dreh: 22 * Math.sin(t * Math.PI), sy: 1 - .1 * Math.sin(t * Math.PI) }),
  links: t => ({ x: 500 - 240 * Math.sin(t * Math.PI), links: t < .5 }), kreis: t => ({ x: 500 + 220 * Math.sin(2 * Math.PI * t), links: Math.cos(2 * Math.PI * t) < 0, hoch: 10 * Math.abs(Math.sin(6 * Math.PI * t)) })
};
let neueKarten = false;
function vormachen(id){
  stopp(); const vorher = kunstStufe(S().katzeKunst);
  S().katzeKunst = kunstGemacht(S().katzeKunst, id); ST.save(); if(kunstStufe(S().katzeKunst) > vorher) neueKarten = true;
  const zug = KARTE[id].zug, dauer = 900 * zug.length, t0 = performance.now(); let lauf = true; aus = () => { lauf = false; };
  el("pfC").hidden = true;
  (function schritt(){ if(!lauf) return; const u = Math.min(1, (performance.now() - t0) / dauer), i = Math.min(zug.length - 1, Math.floor(u * zug.length));
    const b = el("pfBuehne"); if(b) b.innerHTML = buehne({ x: 500, modus: "kunst", ...HALTUNG[zug[i]](u * zug.length - i) });
    if(u < 1) return void setTimeout(schritt, 30);
    aus = null; root.WELT.klimper();
    if(neueKarten){ neueKarten = false; male({ x: 500, modus: "kunst", herzen: 3 }); return sag("Die kann ich jetzt alle! Hier sind neue, schwerere Karten."); }
    male({ x: 500, modus: "kunst", herzen: 1 }); sag(GEKONNT[Math.floor(Math.random() * GEKONNT.length)]); })();
}
// ---------- Verstecken (Ticket 42): ein Zimmer mit Bett, Tisch, Fenster, Kiste und Schrank ----------
// Tippflächen und wo die Katze dann sitzt (x, Boden-y, Größe)
const PLATZ = { unterBett: [[60, 352, 290, 92], 200, 446, .3], aufBett: [[60, 190, 290, 162], 230, 312, .38], unterTisch: [[390, 340, 170, 112], 475, 450, .32],
  aufTisch: [[380, 228, 190, 112], 475, 322, .34], imSchrank: [[830, 110, 140, 340], 900, 440, .34], aufSchrank: [[822, 18, 156, 86], 900, 104, .3],
  vorhang: [[392, 30, 190, 182], 452, 206, .3], inKiste: [[600, 372, 110, 80], 655, 418, .3], nebenKiste: [[712, 300, 104, 152], 762, 450, .32] };
function maleZimmer(z){
  const fl = (r, c) => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="10" fill="${c}"/>`;
  // Schichten: was die Katze verdeckt, wird nach ihr gemalt (Vorhang, Kistenwand), der Schrank steht dann offen
  const p = z.zeigen && PLATZ[z.wo.id], wo = p ? z.wo.id : "", katze = p ? B.spr(B.figur("katze:" + farbe()), p[1], p[2], p[3]) : "", da = w => wo === w ? katze : "";
  const herzen = p ? [...Array(z.herzen || 0)].map((_, i) => herz(p[1] - 30 + i * 30, p[2] - 120 - i * 10, i)).join("") : "";
  const schrank = wo === "imSchrank" ? `${fl([830, 104, 140, 346], "#5c4033")}${katze}${fl([798, 104, 32, 346], "#a5723f")}${fl([970, 104, 28, 346], "#a5723f")}`
    : `${fl([830, 104, 140, 346], "#a5723f")}<path d="M900,112 V444" stroke="#8a5a3c" stroke-width="5"/><circle cx="888" cy="280" r="7" fill="#f2c94c"/><circle cx="912" cy="280" r="7" fill="#f2c94c"/>`;
  const zimmer = `<rect x="20" y="10" width="960" height="420" rx="30" fill="#fbf4e4"/><rect x="20" y="420" width="960" height="130" rx="30" fill="#e7dafb"/>
    ${fl([412, 48, 150, 150], "#bfe3f7")}<path d="M487,48 V198 M412,123 H562" stroke="#fff" stroke-width="8"/>${da("vorhang")}
    <path d="M396,36 H578" stroke="#8a5a3c" stroke-width="10" stroke-linecap="round"/><path d="M400,40 q30,90 -4,172 h70 q-24,-80 -10,-172Z" fill="#e5607e"/><path d="M574,40 q-30,90 4,172 h-70 q24,-80 10,-172Z" fill="#e5607e"/>
    ${fl([46, 230, 26, 216], "#a5723f")}${fl([60, 298, 290, 54], "#9b6ad8")}${fl([92, 270, 90, 36], "#fff")}${fl([180, 292, 170, 30], "#c6a4ef")}${fl([68, 350, 18, 96], "#a5723f")}${fl([328, 350, 18, 96], "#a5723f")}
    <rect x="86" y="352" width="242" height="92" fill="#3b2b52" opacity=".12"/>
    ${fl([380, 322, 190, 20], "#c98f52")}${fl([396, 340, 14, 112], "#a5723f")}${fl([540, 340, 14, 112], "#a5723f")}
    ${da("inKiste")}${fl([600, 382, 110, 70], "#f2c94c")}<path d="M600,400 H710" stroke="#c9a12f" stroke-width="6"/>${schrank}
    ${["vorhang", "inKiste", "imSchrank"].includes(wo) ? "" : katze}${herzen}`;
  const flaechen = VERSTECKE.map(v => { const [x, y, w, h] = PLATZ[v.id][0]; return `<rect class="hot" data-versteck="${v.id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`; }).join("");
  el("pfS").innerHTML = `<div class="kochstelle"><svg id="pfBuehne" viewBox="0 0 1000 560">${zimmer}${flaechen}</svg></div>${fuss(z)}`;
  fussVerbinden();
  el("pfS").querySelectorAll("[data-versteck]").forEach(r => r.onclick = () => suchen(z, r.dataset.versteck));
}
// Drei Runden; falsch getippt heißt nur: sie sagt noch einmal, wo sie ist
function verstecken(){ stopp(); const z = { modus: "verstecken", wo: versteck(Math.random, null), gefunden: 0 }; maleZimmer(z); sag(`Ich habe mich versteckt. ${hinweis(z.wo)}`); }
function suchen(z, id){
  if(z.zeigen){ if(z.gefunden >= 3 && !aus) verstecken(); return; }
  if(id !== z.wo.id) return sag(`Da bin ich nicht. ${hinweis(z.wo)}`);
  z.zeigen = true; z.gefunden++; z.herzen = 2; maleZimmer(z); root.WELT.klimper();
  if(z.gefunden >= 3) return fertig("spielen");
  sag("Gefunden! Mach die Augen zu, ich verstecke mich wieder.");
  spaeter(3600, () => { z.wo = versteck(Math.random, z.wo.id); z.zeigen = false; z.herzen = 0; maleZimmer(z); sag(hinweis(z.wo)); });
}
root.KATZE = { ...K, oeffnen, schliessen, zu, get offen(){ return !box().hidden; } };
})(this);
