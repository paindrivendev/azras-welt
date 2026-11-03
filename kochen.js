/* Küche (Ticket 22, Rückmeldung der Eltern: "it needs a kitchen … should not focus only learning"). Azra kocht mit ihrer
   Katze nach Rezeptkarten; was fehlt, kauft sie bei Hilde im Laden mit ihrem Geld. Spiel, keine Aufgabe: nichts geht
   schief, nichts verbrennt, nichts verdirbt; am Ende isst die Katze oder ein Nachbar mit ihr.
   Spielstand in S.kueche = {vorrat: {zutat: Anzahl}, gekocht: {rezept: wie oft}, tisch: {rezept, date} | null,
   rezepte: [Rezepte, die ihr Nachbarn geschenkt haben (Ticket 38)]}. */
(function(root){
"use strict";
// ---------- Regeln (rein, getestet) ----------
// Preise in Cent; eine Anzahl ist ein Stück (ein Ei, eine Tüte Mehl).
const ZUTATEN = {
  mehl: { name: "Mehl", preis: 40 }, milch: { name: "Milch", preis: 50 }, ei: { name: "Ei", preis: 20 }, zucker: { name: "Zucker", preis: 30 },
  butter: { name: "Butter", preis: 50 }, brot: { name: "Brot", preis: 60 }, kaese: { name: "Käse", preis: 70 }, tomate: { name: "Tomate", preis: 30 },
  apfel: { name: "Apfel", preis: 30 }, banane: { name: "Banane", preis: 30 }, erdbeere: { name: "Erdbeeren", preis: 60 }, kakao: { name: "Kakao", preis: 60 }
};
// Schritte: rein (in die Schüssel, den Topf …), schneiden, ruehren, streichen, belegen, warm (Herd oder Ofen), servieren.
const REZEPTE = [
  { id: "pfannkuchen", akk: "die Pfannkuchen", name: "Pfannkuchen", zutaten: { mehl: 1, milch: 1, ei: 2 }, schritte: [
    { art: "rein", in: "schuessel", sag: "Alles in die Schüssel!" }, { art: "ruehren", in: "schuessel", sag: "Jetzt rühren, rund und rund." },
    { art: "warm", in: "pfanne", sag: "Ab in die Pfanne! Dreh den Herd an." }, { art: "servieren", sag: "Fertig! Bring sie auf den Teller." }] },
  { id: "obstsalat", akk: "den Obstsalat", name: "Obstsalat", zutaten: { apfel: 1, banane: 1, erdbeere: 1 }, schritte: [
    { art: "schneiden", sag: "Wir schneiden das Obst klein. Tipp drauf!" }, { art: "rein", in: "schuessel", sag: "Alles in die Schüssel!" },
    { art: "ruehren", in: "schuessel", sag: "Vorsichtig umrühren." }, { art: "servieren", sag: "Lecker! Ab auf den Tisch." }] },
  { id: "pizza", akk: "die Pizza", name: "Pizza", zutaten: { mehl: 1, tomate: 1, kaese: 1 }, schritte: [
    { art: "rein", in: "schuessel", nur: ["mehl"], sag: "Das Mehl in die Schüssel, für den Teig." }, { art: "ruehren", in: "schuessel", sag: "Kneten, kneten, kneten!" },
    { art: "belegen", auf: "teig", nur: ["tomate", "kaese"], sag: "Jetzt kommt der Belag drauf." }, { art: "warm", in: "ofen", sag: "Ab in den Ofen!" },
    { art: "servieren", sag: "Die Pizza ist fertig!" }] },
  { id: "kakao", akk: "den Kakao", name: "Kakao", zutaten: { milch: 1, kakao: 1 }, schritte: [
    { art: "rein", in: "topf", sag: "Milch und Kakao in den Topf." }, { art: "ruehren", in: "topf", sag: "Rühren, damit nichts klumpt." },
    { art: "warm", in: "topf", sag: "Schön warm machen." }, { art: "servieren", sag: "Vorsicht, heiß! In die Tasse damit." }] },
  { id: "butterbrot", akk: "das Butterbrot", name: "Butterbrot", zutaten: { brot: 1, butter: 1, kaese: 1 }, schritte: [
    { art: "belegen", auf: "brett", nur: ["brot"], sag: "Leg das Brot aufs Brett." }, { art: "streichen", sag: "Jetzt die Butter drauf streichen." },
    { art: "belegen", auf: "brot", nur: ["kaese"], sag: "Und eine Scheibe Käse." }, { art: "servieren", sag: "Fertig ist das Butterbrot!" }] },
  // Geschenke der Nachbarn (Ticket 38): erst in der Küche, wenn sie sie bekommen hat
  { id: "waffeln", akk: "die Waffeln", name: "Waffeln", geschenk: true, zutaten: { mehl: 1, milch: 1, ei: 1, zucker: 1 }, schritte: [
    { art: "rein", in: "schuessel", sag: "Alles in die Schüssel, wie bei Otto!" }, { art: "ruehren", in: "schuessel", sag: "Rühren, bis der Teig glatt ist." },
    { art: "warm", in: "pfanne", sag: "Jetzt in die heiße Pfanne. Dreh den Herd an." }, { art: "servieren", sag: "Fertig sind die Waffeln!" }] },
  { id: "bananenmilch", akk: "die Bananenmilch", name: "Bananenmilch", geschenk: true, zutaten: { milch: 1, banane: 1 }, schritte: [
    { art: "rein", in: "schuessel", sag: "Milch und Banane in die Schüssel." }, { art: "ruehren", in: "schuessel", sag: "Jetzt kräftig mixen, rund und rund." },
    { art: "servieren", sag: "Fertig! Ab ins Glas damit." }] }
];
const rezept = id => REZEPTE.find(r => r.id === id) || null;
// Am ersten Tag ist genug da für Pfannkuchen und ein Butterbrot.
const START = { mehl: 2, milch: 2, ei: 4, zucker: 1, butter: 1, brot: 2, kaese: 1, apfel: 1, banane: 1 };
const anzahl = n => Number.isInteger(n) && n > 0;
function norm(k){
  const o = k && typeof k === "object" && !Array.isArray(k) ? k : null;
  if(!o) return { vorrat: { ...START }, gekocht: {}, tisch: null, rezepte: [] };
  const vorrat = {}, gekocht = {};
  for(const [z, n] of Object.entries(o.vorrat && typeof o.vorrat === "object" ? o.vorrat : {})) if(ZUTATEN[z] && anzahl(n)) vorrat[z] = n;
  for(const [r, n] of Object.entries(o.gekocht && typeof o.gekocht === "object" ? o.gekocht : {})) if(rezept(r) && anzahl(n)) gekocht[r] = n;
  const t = o.tisch, tisch = t && typeof t === "object" && rezept(t.rezept) && typeof t.date === "string" ? { rezept: t.rezept, date: t.date } : null;
  const rezepte = (Array.isArray(o.rezepte) ? o.rezepte : []).filter((r, i, a) => rezept(r) && rezept(r).geschenk && a.indexOf(r) === i);
  return { vorrat, gekocht, tisch, rezepte };
}
// Was in der Küche steht: alle Rezepte außer den Geschenken, die sie noch nicht hat
const sichtbar = k => REZEPTE.filter(r => !r.geschenk || (k.rezepte || []).includes(r.id));
function fehlt(r, vorrat){ const f = {}; for(const [z, n] of Object.entries(r.zutaten)) if((vorrat[z] || 0) < n) f[z] = n - (vorrat[z] || 0); return f; }
function kochen(r, vorrat){
  if(Object.keys(fehlt(r, vorrat)).length) return null;
  const v = { ...vorrat }; for(const [z, n] of Object.entries(r.zutaten)) v[z] = (v[z] || 0) - n; return v;
}
function kaufen(vorrat, purse, z){
  if(!ZUTATEN[z] || purse < ZUTATEN[z].preis) return null;
  return { vorrat: { ...vorrat, [z]: (vorrat[z] || 0) + 1 }, purse: purse - ZUTATEN[z].preis };
}
function fertig(k, r, date){ const v = kochen(r, k.vorrat); if(!v) return k; return { ...k, vorrat: v, gekocht: { ...k.gekocht, [r.id]: (k.gekocht[r.id] || 0) + 1 }, tisch: { rezept: r.id, date } }; }
const K = { ZUTATEN, REZEPTE, START, rezept, norm, sichtbar, fehlt, kochen, kaufen, fertig };
if(typeof module !== "undefined" && module.exports){ module.exports = K; return; }

// ---------- Bilder ----------
// Zutaten um (0,0), etwa 100 × 100
const ZB = {
  mehl: `<path d="M-30,42 L-34,-18 Q-32,-40 -14,-38 L14,-38 Q32,-40 34,-18 L30,42Z" fill="#f6efe0" stroke="#cbb791" stroke-width="4"/><path d="M0,-14 V24 M0,-6 l-9,-8 M0,-6 l9,-8 M0,6 l-9,-8 M0,6 l9,-8" stroke="#d7a948" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  milch: `<path d="M-24,-26 L0,-46 L24,-26 V44 H-24Z" fill="#fff" stroke="#9fc3dd" stroke-width="4"/><rect x="-24" y="0" width="48" height="22" fill="#6fb0e0"/><circle cx="0" cy="-20" r="7" fill="#6fb0e0"/>`,
  ei: `<ellipse cy="4" rx="28" ry="36" fill="#f7e6cc" stroke="#d9bf98" stroke-width="4"/>`,
  zucker: `<rect x="-28" y="-34" width="56" height="74" rx="8" fill="#fde3ec" stroke="#e7a3bb" stroke-width="4"/><rect x="-12" y="-6" width="12" height="12" fill="#fff"/><rect x="2" y="4" width="12" height="12" fill="#fff"/>`,
  butter: `<path d="M-40,-4 L-10,-22 L40,-4 L10,14Z" fill="#fbe58a"/><path d="M-40,-4 L10,14 V34 L-40,16Z" fill="#f2cf4f"/><path d="M10,14 L40,-4 V16 L10,34Z" fill="#e2bb33"/>`,
  brot: `<path d="M-42,30 Q-46,-30 0,-34 Q46,-30 42,30Z" fill="#c98f52" stroke="#a8713a" stroke-width="4"/><path d="M-20,-14 l10,10 M0,-18 l10,10 M20,-14 l8,8" stroke="#a8713a" stroke-width="4" stroke-linecap="round"/>`,
  kaese: `<path d="M-40,26 L40,26 L40,-6 L-40,-26Z" fill="#f6cf4a" stroke="#d9ab22" stroke-width="4"/><circle cx="-14" cy="6" r="6" fill="#d9ab22"/><circle cx="14" cy="12" r="4" fill="#d9ab22"/><circle cx="22" cy="-2" r="5" fill="#d9ab22"/>`,
  tomate: `<circle cy="6" r="34" fill="#e2453f"/><path d="M0,-26 l6,-12 l4,12 l12,-2 l-10,8 l-12,-2 l-12,2 l-10,-8 l12,2 l4,-12Z" fill="#4e9a4a"/><circle cx="-12" cy="-4" r="7" fill="#f7a39e"/>`,
  apfel: `<circle cx="-12" cy="8" r="28" fill="#e5503f"/><circle cx="12" cy="8" r="28" fill="#e5503f"/><path d="M0,-18 q2,-14 8,-20" stroke="#7a4f33" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="-30" rx="12" ry="6" fill="#5fae5a" transform="rotate(-25 14 -30)"/>`,
  banane: `<path d="M-40,-24 Q-30,34 38,22 Q8,22 -24,-30Z" fill="#f6d64a" stroke="#d9b323" stroke-width="4" stroke-linejoin="round"/><path d="M-40,-24 l-4,-8" stroke="#7a4f33" stroke-width="5" stroke-linecap="round"/>`,
  erdbeere: `<path d="M0,40 Q-36,10 -30,-14 Q-16,-30 0,-20 Q16,-30 30,-14 Q36,10 0,40Z" fill="#e2453f"/><path d="M-18,-22 L0,-34 L18,-22 L0,-16Z" fill="#4e9a4a"/>${[[-12, -2], [8, -4], [-4, 12], [14, 12], [0, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#fff3b0"/>`).join("")}`,
  kakao: `<rect x="-28" y="-30" width="56" height="70" rx="6" fill="#8a5a3c"/><rect x="-32" y="-40" width="64" height="14" rx="5" fill="#6e472c"/><path d="M-16,6 Q0,-12 16,6 Q0,24 -16,6Z" fill="#f2c94c"/>`
};
const zutatBild = (z, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${ZB[z]}</g>`;
// Gerichte auf dem Teller um (0,0), etwa 200 × 140
const TELLER = `<ellipse cy="20" rx="96" ry="40" fill="#fff" stroke="#ddd3ec" stroke-width="5"/><ellipse cy="18" rx="62" ry="24" fill="#f4eefb"/>`;
const GB = {
  pfannkuchen: TELLER + [0, 1, 2].map(i => `<ellipse cy="${10 - i * 12}" rx="58" ry="20" fill="${["#d99a4a", "#e2a957", "#ebb865"][i]}" stroke="#c4823a" stroke-width="3"/>`).join("") + `<path d="M-20,-18 q10,10 0,22" stroke="#f2c94c" stroke-width="7" fill="none"/>`,
  obstsalat: `<path d="M-80,-8 Q-76,52 0,54 Q76,52 80,-8Z" fill="#cfe8ff" stroke="#9fc3dd" stroke-width="4"/><ellipse cy="-8" rx="80" ry="22" fill="#fff6ec"/>` + [[-40, -10, "#e5503f"], [-14, -16, "#f6d64a"], [12, -8, "#e2453f"], [36, -14, "#f6d64a"], [-28, -2, "#f6d64a"], [24, -2, "#e5503f"], [0, -2, "#e2453f"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}"/>`).join(""),
  pizza: TELLER + `<ellipse cy="10" rx="78" ry="30" fill="#e7b46a"/><ellipse cy="10" rx="66" ry="24" fill="#e2453f"/>` + [[-30, 6], [0, 0], [26, 10], [-8, 20], [40, 0]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="7" fill="#f6cf4a"/>`).join(""),
  kakao: `<ellipse cy="40" rx="70" ry="20" fill="#fff" stroke="#ddd3ec" stroke-width="5"/><path d="M-44,-30 H44 L36,38 Q0,48 -36,38Z" fill="#9b6ad8"/><ellipse cy="-30" rx="44" ry="12" fill="#7a4a2e"/><path d="M44,-14 q30,0 26,22 q-4,16 -30,14" stroke="#9b6ad8" stroke-width="10" fill="none"/><path d="M-12,-50 q-8,-12 0,-24 M10,-50 q-8,-12 0,-24" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
  butterbrot: TELLER + `<path d="M-58,24 Q-64,-26 -30,-30 Q0,-44 30,-30 Q64,-26 58,24Z" fill="#c98f52"/><path d="M-50,18 Q-54,-20 -26,-22 Q0,-34 26,-22 Q54,-20 50,18Z" fill="#fbe58a"/><path d="M-40,14 L40,14 L34,-14 L-36,-18Z" fill="#f6cf4a"/><circle cx="-10" cy="0" r="5" fill="#d9ab22"/><circle cx="16" cy="4" r="4" fill="#d9ab22"/>`
};
GB.waffeln = TELLER + [[-34, -2], [30, 4]].map(([x, y]) => `<g transform="translate(${x} ${y}) rotate(-8)"><rect x="-38" y="-30" width="76" height="56" rx="10" fill="#e2a957" stroke="#c4823a" stroke-width="3"/>`
  + [-19, 0, 19].map(v => `<path d="M${v},-26 V22 M-34,${v * .7} H34" stroke="#c4823a" stroke-width="3"/>`).join("") + `</g>`).join("") + `<circle cx="-10" cy="-30" r="9" fill="#e2453f"/>`;
GB.bananenmilch = `<ellipse cy="46" rx="56" ry="14" fill="#fff" stroke="#ddd3ec" stroke-width="5"/><path d="M-34,-56 H34 L26,44 H-26Z" fill="#fff6c8" stroke="#ddd3ec" stroke-width="5"/>`
  + `<path d="M-30,-30 H30 L26,40 H-26Z" fill="#fbe58a"/><path d="M10,-80 L18,-20" stroke="#e5607e" stroke-width="7" stroke-linecap="round"/><path d="M-40,-62 Q-30,-84 -6,-70 Q-24,-60 -40,-62Z" fill="#f6d64a" stroke="#d9b323" stroke-width="3"/>`;
const gerichtBild = (id, x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${GB[id]}</g>`;

// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S, W = root.WOCHE;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("kochen");
const geld = c => (c / 100).toFixed(2).replace(".", ",") + " €";
const katze = () => (S().katze || {}).name || "";
let lauf = null; // laufendes Kochen: {stop()}
function k(){ S().kueche = norm(S().kueche); return S().kueche; }
function sag(t, wer){ const n = wer && W.NACHBARN.find(x => x.id === wer);
  el("koC").innerHTML = `<span class="who">${esc(n ? n.name : katze())}</span>${esc(t)}`; el("koC").hidden = false; root.WELT.sprich(n ? n.id : "katze", t); }
function seite(html){ el("koS").innerHTML = html; }
function stopp(){ if(lauf){ lauf.stop(); lauf = null; } }
function schliessen(){ stopp(); box().hidden = true; root.WELT.zeige(); }
function auf(){ stopp(); root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; el("koAus").textContent = "Zurück"; el("koAus").onclick = schliessen; }
const zutatenListe = r => { const v = k().vorrat;
  return Object.entries(r.zutaten).map(([z, n]) => { const da = (v[z] || 0) >= n;
    return `<span class="zutat${da ? "" : " fehlt"}"><svg viewBox="-50 -50 100 100">${ZB[z]}</svg>${n > 1 ? n + " " : ""}${esc(ZUTATEN[z].name)}${da ? " ✓" : ""}</span>`; }).join(""); };
// Rezeptkarten: was gebraucht wird und was schon da ist
function oeffnen(){
  auf();
  seite(`<h2 class="ui">Was kochen wir?</h2><div class="rezepte">${sichtbar(k()).map(r => `<button class="rezept" data-rezept="${r.id}">
    <svg viewBox="-110 -80 220 150">${GB[r.id]}</svg><span class="titel">${esc(r.name)}</span><span class="zutaten">${zutatenListe(r)}</span></button>`).join("")}</div>`);
  el("koS").querySelectorAll("[data-rezept]").forEach(b => b.onclick = () => waehlen(rezept(b.dataset.rezept)));
  sag("Was wollen wir heute kochen?");
}
function waehlen(r){
  const f = Object.keys(fehlt(r, k().vorrat));
  if(!f.length) return start(r);
  const namen = f.map(z => ZUTATEN[z].name), liste = namen.length > 1 ? namen.slice(0, -1).join(", ") + " und " + namen.at(-1) : namen[0];
  const hilde = !!S().met.hilde;
  sag(hilde ? `Für ${r.name} fehlt uns noch ${liste}. Das gibt es bei Hilde im Laden.` : `Für ${r.name} fehlt uns noch ${liste}. Bald kannst du bei Hilde einkaufen.`);
  if(hilde){ el("koS").insertAdjacentHTML("beforeend", `<div class="aufgabe-fuss"><button class="btn" id="koHilde">Zu Hilde in den Laden</button></div>`);
    el("koHilde").onclick = () => { schliessen(); root.WELT.zuHilde(); }; }
}

// ---------- Kochen: ein Schritt nach dem anderen auf der Arbeitsplatte ----------
const ORT = { schuessel: [500, 250], topf: [500, 250], pfanne: [500, 250], ofen: [500, 230], teig: [500, 260], brett: [500, 270], brot: [500, 270] };
function geraet(was, inhalt, fortschritt){
  const [x, y] = ORT[was] || ORT.schuessel;
  if(was === "schuessel") return `<g transform="translate(${x} ${y})"><path d="M-130,-20 Q-126,96 0,100 Q126,96 130,-20Z" fill="#9fc3dd"/><ellipse cy="-20" rx="130" ry="36" fill="#cfe8ff"/><ellipse cy="-18" rx="112" ry="26" fill="${fortschritt > 0 ? "#f3e2bf" : "#e3f1ff"}"/>${inhalt}</g>`;
  if(was === "topf") return `<g transform="translate(${x} ${y})"><rect x="-120" y="-30" width="240" height="120" rx="20" fill="#9aa7b4"/><ellipse cy="-30" rx="120" ry="30" fill="#c4ccd4"/><ellipse cy="-28" rx="104" ry="22" fill="${fortschritt > 0 ? "#7a4a2e" : "#eef2f6"}"/><rect x="120" y="-24" width="70" height="16" rx="8" fill="#5c6670"/>${inhalt}</g>`;
  if(was === "pfanne") return `<g transform="translate(${x} ${y})"><ellipse cy="10" rx="140" ry="50" fill="#3e4650"/><ellipse cy="2" rx="124" ry="40" fill="#59626d"/><rect x="138" y="-4" width="120" height="20" rx="10" fill="#8a5a3c"/>${inhalt}</g>`;
  if(was === "ofen") return `<g transform="translate(${x} ${y})"><rect x="-170" y="-120" width="340" height="260" rx="24" fill="#e8e2d8"/><rect x="-140" y="-80" width="280" height="190" rx="16" fill="#3b2f2a"/><rect x="-140" y="-80" width="280" height="190" rx="16" fill="#f08a5d" opacity="${fortschritt * .5}"/>${inhalt}<rect x="-100" y="-110" width="200" height="16" rx="8" fill="#9aa7b4"/></g>`;
  if(was === "teig") return `<g transform="translate(${x} ${y})"><ellipse cy="10" rx="150" ry="56" fill="#e8d3a8"/><ellipse rx="130" ry="46" fill="#f3e2bf"/>${inhalt}</g>`;
  return `<g transform="translate(${x} ${y})"><rect x="-170" y="-40" width="340" height="120" rx="20" fill="#c98f52"/><rect x="-160" y="-50" width="320" height="110" rx="18" fill="#e0b07a"/>${inhalt}</g>`; // brett, brot
}
function start(r){
  auf(); el("koAus").textContent = "Aufhören"; el("koAus").onclick = oeffnen;
  const zutaten = Object.entries(r.zutaten).flatMap(([z, n]) => Array(n).fill(z));
  const st = { i: 0, drin: [], geschnitten: {}, fortschritt: 0, an: false, auf: [] }; // auf: was auf Teig/Brett/Brot liegt
  let aus = false, timer = null, wartet = false;
  // gleich zum nächsten Schritt, genau einmal (weiteres Tippen in der Pause ändert nichts)
  const bald = () => { if(wartet) return; wartet = true; setTimeout(() => { wartet = false; weiter(); }, 550); };
  lauf = { stop(){ aus = true; clearTimeout(timer); } };
  const schritt = () => r.schritte[st.i];
  const weiter = () => { if(aus || st.i >= r.schritte.length) return; st.i++; st.fortschritt = 0; st.an = false; if(st.i < r.schritte.length){ sag(schritt().sag); male(); } };
  const offen = () => { const s = schritt(), nur = s.nur || zutaten.filter((z, i, a) => a.indexOf(z) === i);
    const alle = zutaten.filter(z => nur.includes(z)); const weg = [...st.drin, ...st.auf]; const rest = [...alle];
    for(const z of weg){ const i = rest.indexOf(z); if(i >= 0) rest.splice(i, 1); } return rest; };
  function male(){
    const s = schritt(); let buehne = "", tablett = "";
    if(s.art === "schneiden"){
      const stuecke = Object.keys(r.zutaten);
      buehne = geraet("brett", stuecke.map((z, i) => { const n = st.geschnitten[z] || 0, x = (i - (stuecke.length - 1) / 2) * 110;
        if(n >= 3) return [0, 1, 2].map(j => zutatBild(z, x - 26 + j * 26, 4, .45)).join(""); // klein geschnitten
        return `<g class="hot" data-tipp="${z}">${zutatBild(z, x, 4, .9 - n * .1)}<rect x="${x - 55}" y="-50" width="110" height="110" fill="transparent"/></g>`; }).join(""), 0);
    } else if(s.art === "rein" || s.art === "belegen"){
      const was = s.in || s.auf, drauf = s.art === "rein" ? st.drin : st.auf;
      const inhalt = drauf.filter(z => !(was === "brot" && z === "brot")).map((z, i) => zutatBild(z, (i - (drauf.length - 1) / 2) * 46, s.art === "rein" ? -26 : -10, s.art === "rein" ? .5 : .8)).join("");
      buehne = geraet(was === "brot" ? "brett" : was, (was === "brot" ? zutatBild("brot", 0, 0, 1.4) + `<ellipse cy="-4" rx="40" ry="16" fill="#fbe58a"/>` : "") + inhalt, st.drin.length ? 1 : 0);
      tablett = offen().map((z, i) => `<g class="hot zieh" data-zutat="${z}" transform="translate(${170 + i * 130} 480)"><circle r="58" fill="#fff" stroke="#e4d8f4" stroke-width="4"/>${zutatBild(z, 0, 0, .8)}</g>`).join("");
    } else if(s.art === "ruehren" || s.art === "streichen"){
      const was = s.art === "streichen" ? "brett" : s.in;
      const inhalt = s.art === "streichen" ? zutatBild("brot", 0, 0, 1.4) + `<ellipse cy="-4" rx="${10 + st.fortschritt * 34}" ry="${4 + st.fortschritt * 14}" fill="#fbe58a"/>` : `<path d="M${-40 + st.fortschritt * 10},-30 q40,-30 80,0" stroke="#fff" stroke-width="6" fill="none" opacity=".6"/>`;
      buehne = `<g class="hot" data-ruehr="1">${geraet(was, inhalt, 1)}<rect x="300" y="160" width="400" height="220" fill="transparent"/></g>` + `<g transform="translate(${was === "brett" ? 640 : 610} ${was === "brett" ? 200 : 170}) rotate(${st.fortschritt * 720})">${s.art === "streichen" ? `<rect x="-6" y="-70" width="12" height="80" rx="5" fill="#c4ccd4"/><rect x="-8" y="10" width="16" height="50" rx="6" fill="#8a5a3c"/>` : `<rect x="-6" y="-80" width="12" height="130" rx="6" fill="#c98f52"/>`}</g>`;
    } else if(s.art === "warm"){
      const inhalt = s.in === "pfanne" ? `<ellipse rx="${70}" ry="24" fill="${st.fortschritt >= 1 ? "#d99a4a" : "#f3e2bf"}"/>` : s.in === "ofen" ? `<ellipse cy="40" rx="100" ry="34" fill="#e7b46a"/><ellipse cy="40" rx="86" ry="26" fill="#e2453f"/><ellipse cx="-20" cy="36" rx="20" ry="9" fill="#f6cf4a"/><ellipse cx="24" cy="44" rx="20" ry="9" fill="#f6cf4a"/>` : "";
      const flamme = st.an && s.in !== "ofen" ? [-60, 0, 60].map(x => `<path d="M${500 + x},372 q-14,-24 0,-44 q14,20 0,44Z" fill="#4f9fc9" class="flamme"/>`).join("") : "";
      buehne = flamme + geraet(s.in, inhalt, st.fortschritt) + (st.an ? `<g opacity="${st.fortschritt}">${[-40, 0, 40].map(x => `<path d="M${500 + x},150 q-12,-20 0,-40 q12,-20 0,-40" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`).join("")}</g>`
        : hot2("drehen", `<circle cx="800" cy="440" r="56" fill="#fff" stroke="#e4d8f4" stroke-width="4"/><circle cx="800" cy="440" r="34" fill="#5c6670"/><rect x="794" y="408" width="12" height="30" rx="5" fill="#fff"/>`));
    } else { // servieren
      buehne = hot2("servieren", gerichtBild(r.id, 500, 260, 1.6) + `<rect x="300" y="130" width="400" height="260" fill="transparent"/>`);
    }
    const ring = ["ruehren", "streichen", "warm"].includes(s.art) ? `<circle cx="160" cy="120" r="46" fill="none" stroke="#efe6fb" stroke-width="16"/><circle cx="160" cy="120" r="46" fill="none" stroke="#8e5bd6" stroke-width="16" stroke-dasharray="${(st.fortschritt * 289).toFixed(0)} 289" transform="rotate(-90 160 120)"/>` : "";
    seite(`<div class="kochstelle"><svg id="koBuehne" viewBox="0 0 1000 560"><rect x="20" y="340" width="960" height="210" rx="30" fill="#f3e6d2"/>${buehne}${ring}${tablett}
      ${root.BILD.spr(root.BILD.figur("katze:" + ((S().katze || {}).farbe || "lila")), 900, 330, .3)}</svg></div>`);
    verbinden();
  }
  const hot2 = (act, inner) => `<g class="hot" data-ko="${act}">${inner}</g>`;
  const mehr = d => { if(wartet) return; st.fortschritt = Math.min(1, st.fortschritt + d); if(st.fortschritt >= 1){ root.AUFGABEN && root.AUFGABEN.KLANG && root.AUFGABEN.KLANG.chime(); bald(); } male(); };
  const hinein = z => { const s = schritt(); (s.art === "rein" ? st.drin : st.auf).push(z); male(); if(!offen().length) bald(); };
  function verbinden(){
    const svg = el("koBuehne"), s = schritt();
    svg.querySelectorAll("[data-tipp]").forEach(g => g.onclick = () => { const z = g.dataset.tipp; st.geschnitten[z] = Math.min(3, (st.geschnitten[z] || 0) + 1); male();
      if(Object.keys(r.zutaten).every(x => st.geschnitten[x] >= 3)) bald(); });
    // Zutaten: antippen oder in die Schüssel ziehen
    svg.querySelectorAll("[data-zutat]").forEach(g => g.onpointerdown = e => {
      e.preventDefault(); const pt = p => { const m = svg.getScreenCTM().inverse(); return new DOMPoint(p.clientX, p.clientY).matrixTransform(m); };
      const a = pt(e), basis = g.getAttribute("transform"); let weit = 0;
      const mv = ev => { const b = pt(ev); weit = Math.max(weit, Math.hypot(b.x - a.x, b.y - a.y)); g.setAttribute("transform", `${basis} translate(${b.x - a.x} ${b.y - a.y})`); };
      const up = ev => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); const b = pt(ev);
        if(weit < 12 || Math.hypot(b.x - 500, b.y - 260) < 190) hinein(g.dataset.zutat); else g.setAttribute("transform", basis); };
      addEventListener("pointermove", mv); addEventListener("pointerup", up); });
    const r_ = svg.querySelector("[data-ruehr]");
    if(r_){ let letzt = null; r_.onclick = () => mehr(.12);
      r_.onpointermove = e => { if(e.buttons !== 1 && e.pointerType === "mouse") return; const p = [e.clientX, e.clientY]; if(letzt) mehr(Math.min(.04, Math.hypot(p[0] - letzt[0], p[1] - letzt[1]) / 2500)); letzt = p; };
      r_.onpointerleave = () => { letzt = null; }; }
    const d = svg.querySelector('[data-ko="drehen"]');
    if(d) d.onclick = () => { st.an = true; male(); const t0 = performance.now(); const lauf_ = () => { if(aus) return; st.fortschritt = Math.min(1, (performance.now() - t0) / 3000);
      if(st.fortschritt >= 1){ return mehr(0); } male(); timer = setTimeout(lauf_, 120); }; timer = setTimeout(lauf_, 120); };
    const sv = svg.querySelector('[data-ko="servieren"]');
    if(sv) sv.onclick = () => essen(r);
  }
  sag(schritt().sag); male();
}
// Wer isst mit? Die Katze ist immer da, dazu die Nachbarn, die sie kennt.
function essen(r){
  const kk = k(), n = fertig(kk, r, root.WELT.today()); S().kueche = n; ST.save(); stopp();
  const gaeste = W.NACHBARN.filter(x => S().met[x.id]);
  seite(`<h2 class="ui">Wer isst mit dir?</h2><div class="gaeste"><button class="gast" data-gast="katze"><svg viewBox="-150 -330 300 340">${root.BILD.figur("katze:" + ((S().katze || {}).farbe || "lila"))}</svg><span>${esc(katze())}</span></button>
    ${gaeste.map(x => `<button class="gast" data-gast="${x.id}"><svg viewBox="-180 -330 360 340">${root.BILD.figur(x.art)}</svg><span>${esc(x.name.split(" ")[0])}</span></button>`).join("")}</div>`);
  sag("Das riecht gut! Wer isst mit dir?");
  el("koS").querySelectorAll("[data-gast]").forEach(b => b.onclick = () => {
    const g = b.dataset.gast, x = W.NACHBARN.find(y => y.id === g);
    seite(`<div class="kochstelle"><svg viewBox="0 0 1000 560"><rect x="160" y="300" width="680" height="40" rx="16" fill="#e0b07a"/><rect x="190" y="340" width="20" height="180" fill="#c98f52"/><rect x="790" y="340" width="20" height="180" fill="#c98f52"/>
      ${gerichtBild(r.id, 380, 270, .9)}${gerichtBild(r.id, 620, 270, .9)}${root.BILD.spr(root.BILD.figur("azra"), 230, 420, .42)}${root.BILD.spr(root.BILD.figur(x ? x.art : "katze:" + ((S().katze || {}).farbe || "lila")), 790, 420, x && x.art === "heron" ? .32 : .4, true)}</svg></div>
      <div class="aufgabe-fuss"><button class="btn" id="koFertig">Fertig</button></div>`);
    sag(x ? `Lecker! Danke für ${r.akk}, Azra.` : "Das schmeckt! Du kochst toll.", x ? x.id : null);
    root.WELT.klimper(); if(x && root.FREUNDE) root.FREUNDE.mitgegessen(x.id); // Ticket 38: geteiltes Essen füllt die Herzen
    el("koFertig").onclick = schliessen;
  });
}

// ---------- Hildes Laden: Zutaten kaufen ----------
function laden(gekauft){
  auf();
  const v = k().vorrat;
  seite(`<h2 class="ui">Einkaufen bei Hilde</h2><p class="geldbeutel">Im Geldbeutel: <b>${geld(S().purse)}</b></p><div class="regalwaren">${Object.entries(ZUTATEN).map(([z, x]) =>
    `<button class="ware" data-kauf="${z}"${S().purse < x.preis ? " disabled" : ""}><svg viewBox="-50 -50 100 100">${ZB[z]}</svg><span class="titel">${esc(x.name)}</span><span class="preis">${geld(x.preis)}</span>${v[z] ? `<span class="hast">Zuhause: ${v[z]}</span>` : ""}</button>`).join("")}</div>`);
  el("koS").querySelectorAll("[data-kauf]").forEach(b => b.onclick = () => {
    const kk = k(), n = kaufen(kk.vorrat, S().purse, b.dataset.kauf); if(!n) return;
    kk.vorrat = n.vorrat; S().purse = n.purse; ST.save(); root.WELT.klimper(); laden(b.dataset.kauf);
  });
  sag(gekauft ? `${ZUTATEN[gekauft].name}, gern! Danke, Azra.` : "Was darf es sein?", "hilde");
  if(root.FREUNDE) root.FREUNDE.imLaden(el("koS"), t => { lauf = null; laden(); sag(t, "hilde"); }, c => { lauf = c; }); // Besorgung (Ticket 38)
}
root.KOCHEN = { ...K, oeffnen, laden, schliessen, gerichtBild, get offen(){ return !box().hidden; }, get lauf(){ return lauf; } };
})(this);
