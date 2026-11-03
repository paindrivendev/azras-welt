/* Freunde (Ticket 38, Eltern: "more interactions with the map, with the cat, with the others … keep her in the game").
   Jeder Nachbar hat Herzen: Besuche, Stunden an seinem Ort, Besorgungen und Einkäufe an ihrem Marktstand füllen sie;
   volle Herzen bringen ein Geschenk (Möbel für ihr Zimmer oder ein Rezept). Besorgungen: ein Nachbar schreibt ihr einen
   Zettel, sie bezahlt die Sachen bei Hilde mit ihrem Geld und bekommt es beim Abgeben zurück, dazu 20 ct. Marktstand:
   Nachbarn kaufen eine Postkarte von ihrem Bild oder ihr Gericht von heute, sie gibt das Wechselgeld heraus.
   Nie Geld weg für Fehler, nie blockiert es das Lernen.
   Spielstand in S.freunde = {punkte: {nachbar: n}, tage: {"besuch:nachbar" | "hilfe:nachbar" | "essen:nachbar": Datum}, geschenke: {nachbar: n},
   wartet: [Nachbarn mit vollen Herzen], auftrag: {von, ware, n, date, gekauft} | null, angeboten: Datum,
   markt: {date, kunden: [Nachbarn, die heute gekauft haben]}}. */
(function(root){
"use strict";
const node = typeof module !== "undefined" && module.exports;
const K = node ? require("./kochen.js") : root.KOCHEN, E = node ? require("./einrichten.js") : root.EINRICHTEN, W = node ? require("./woche.js") : root.WOCHE;
// ---------- Regeln (rein, getestet) ----------
const JE_HERZ = 2, HERZEN = 5, RUNDE = JE_HERZ * HERZEN, LOHN = 20, MARKT_MAX = 3;
// Geschenke bei vollen Herzen, der Reihe nach
const GESCHENKE = { emil: [{ zimmer: "sitzsack" }, { zimmer: "teppich" }], hilde: [{ zimmer: "korb" }, { rezept: "bananenmilch" }],
  otto: [{ rezept: "waffeln" }, { zimmer: "sitzsack" }], lotte: [{ zimmer: "pflanze" }, { zimmer: "teppich" }],
  mila: [{ zimmer: "einhorn" }, { zimmer: "lampe" }], fridolin: [{ zimmer: "lichterkette" }, { zimmer: "korb" }] };
const AKK = { sitzsack: "einen Sitzsack", teppich: "einen Sternteppich", korb: "einen Katzenkorb", pflanze: "eine Topfpflanze", einhorn: "ein Kuschel-Einhorn",
  lampe: "eine Stehlampe", lichterkette: "eine Lichterkette" };
// Was die Nachbarn bei Hilde brauchen; Hilde selbst verkauft
const WUENSCHE = { emil: ["apfel", "banane"], otto: ["ei", "milch"], lotte: ["tomate", "apfel"], mila: ["banane", "apfel"], fridolin: ["brot", "apfel"] };
const WAREN = { apfel: ["Apfel", "Äpfel"], banane: ["Banane", "Bananen"], ei: ["Ei", "Eier"], milch: ["Flasche Milch", "Flaschen Milch"], tomate: ["Tomate", "Tomaten"], brot: ["Brot", "Brote"] };
// Marktstand: was ein Nachbar verlangt (Akkusativ) und was es kostet
const PORTION = { pfannkuchen: "einen Pfannkuchen", obstsalat: "eine Schale Obstsalat", pizza: "ein Stück Pizza", kakao: "eine Tasse Kakao",
  butterbrot: "ein Butterbrot", waffeln: "eine Waffel", bananenmilch: "ein Glas Bananenmilch" };
const PREISE = { karte: [35, 40, 45, 55, 60, 65, 70, 85], gericht: [45, 50, 65, 75, 80, 95] };
const NB = W.NACHBARN.map(n => n.id), vorname = id => W.NACHBARN.find(n => n.id === id).name.split(" ")[0];
const eins = (rng, xs) => xs[Math.floor(rng() * xs.length)];
const obj = o => o && typeof o === "object" && !Array.isArray(o) ? o : {};
const datum = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const ganz = n => Number.isInteger(n) && n > 0;

function norm(f){
  const o = obj(f), punkte = {}, tage = {}, geschenke = {};
  for(const [nb, n] of Object.entries(obj(o.punkte))) if(NB.includes(nb) && ganz(n)) punkte[nb] = n;
  for(const [k, d] of Object.entries(obj(o.tage))) if(/^(besuch|hilfe|essen):/.test(k) && NB.includes(k.split(":")[1]) && datum(d)) tage[k] = d;
  for(const [nb, n] of Object.entries(obj(o.geschenke))) if(NB.includes(nb) && ganz(n)) geschenke[nb] = Math.min(n, GESCHENKE[nb].length);
  const wartet = (Array.isArray(o.wartet) ? o.wartet : []).filter((nb, i, xs) => NB.includes(nb)
    && xs.slice(0, i + 1).filter(x => x === nb).length <= GESCHENKE[nb].length - (geschenke[nb] || 0)); // nie mehr, als es Geschenke gibt
  const a = obj(o.auftrag), auftrag = WUENSCHE[a.von] && WUENSCHE[a.von].includes(a.ware) && [2, 3].includes(a.n) && datum(a.date)
    ? { von: a.von, ware: a.ware, n: a.n, date: a.date, gekauft: a.gekauft === true } : null;
  const m = obj(o.markt), markt = { date: datum(m.date) ? m.date : "", kunden: (Array.isArray(m.kunden) ? m.kunden : []).filter(nb => NB.includes(nb)) };
  return { punkte, tage, geschenke, wartet, auftrag, angeboten: datum(o.angeboten) ? o.angeboten : "", markt };
}
// Volle Herzen der laufenden Runde (0–5); voll, solange ein Geschenk wartet oder alle Geschenke da sind
function herzen(f, nb){ const p = f.punkte[nb] || 0;
  if(f.wartet.includes(nb) || p >= RUNDE * GESCHENKE[nb].length) return HERZEN;
  return Math.floor(p % RUNDE / JE_HERZ); }
function dazu(f, nb, n){
  const alt = f.punkte[nb] || 0, neu = alt + n, wartet = [...f.wartet];
  for(let r = Math.floor(alt / RUNDE); r < Math.floor(neu / RUNDE); r++) if(r < GESCHENKE[nb].length) wartet.push(nb);
  return { ...f, punkte: { ...f.punkte, [nb]: neu }, wartet };
}
const einmal = (f, k, nb, date) => f.tage[`${k}:${nb}`] === date ? f : dazu({ ...f, tage: { ...f.tage, [`${k}:${nb}`]: date } }, nb, 1);
const besuch = (f, nb, date) => einmal(f, "besuch", nb, date);
const geholfen = (f, nb, date) => einmal(f, "hilfe", nb, date);
const gegessen = (f, nb, date) => einmal(f, "essen", nb, date); // sie teilt ihr Essen: ein Geschenk
// Ein wartendes Geschenk abholen: {f, geschenk} oder null
function abholen(f, nb){
  const i = f.wartet.indexOf(nb); if(i < 0) return null;
  const g = f.geschenke[nb] || 0;
  return { f: { ...f, wartet: f.wartet.filter((_, j) => j !== i), geschenke: { ...f.geschenke, [nb]: g + 1 } }, geschenk: GESCHENKE[nb][g] };
}
const kosten = a => a.n * K.ZUTATEN[a.ware].preis;
// Eine Besorgung anbieten: nur wenn keine offen ist, heute noch keine angeboten wurde und sie sie bezahlen kann
function anbieten(f, nb, date, purse, rng){
  if(f.auftrag || f.angeboten === date || !WUENSCHE[nb]) return null;
  const auftrag = { von: nb, ware: eins(rng, WUENSCHE[nb]), n: eins(rng, [2, 3]), date, gekauft: false };
  if(kosten(auftrag) > purse) return null;
  return { f: { ...f, auftrag, angeboten: date }, auftrag };
}
// Ein Zettel, den sie nicht bezahlt hat, verfällt am nächsten Tag; gekaufte Sachen warten im Korb, bis sie sie bringt
const verfallen = (f, date) => f.auftrag && !f.auftrag.gekauft && f.auftrag.date !== date ? { ...f, auftrag: null } : f;
const zettel = a => `Für ${vorname(a.von)}: ${a.n} ${WAREN[a.ware][a.n === 1 ? 0 : 1]}`;
// Bei Hilde bezahlt: die Sachen kommen in ihren Korb (nicht in die Küche); {f, purse} oder null
function einkaufen(f, purse){
  const a = f.auftrag; if(!a || a.gekauft || purse < kosten(a)) return null;
  return { f: { ...f, auftrag: { ...a, gekauft: true } }, purse: purse - kosten(a) };
}
// Beim Nachbarn abgeben: Geld zurück und 20 ct, zwei Punkte
function abgeben(f, nb){
  const a = f.auftrag; if(!a || a.von !== nb || !a.gekauft) return null;
  return { f: dazu({ ...f, auftrag: null }, nb, 2), lohn: kosten(a) + LOHN };
}
// Was es am Stand gibt: Postkarten, wenn ein Bild hängt; das Gericht von heute
function waren(bilder, tisch, date){
  const w = [];
  if(Array.isArray(bilder) && bilder.length) w.push({ id: "karte", name: "Postkarte", akk: "eine Postkarte von deinem Bild", preise: PREISE.karte });
  if(tisch && tisch.date === date && K.rezept(tisch.rezept)) w.push({ id: tisch.rezept, name: K.rezept(tisch.rezept).name, akk: PORTION[tisch.rezept], preise: PREISE.gericht });
  return w;
}
// Wer kommt an den Stand? Ein Nachbar, den sie kennt und der heute noch nichts gekauft hat; höchstens 3 am Tag
function kunde(f, date, kennt, ws, rng){
  const heute = f.markt.date === date ? f.markt.kunden : [], offen = kennt.filter(nb => NB.includes(nb) && !heute.includes(nb));
  if(!ws.length || heute.length >= MARKT_MAX || !offen.length) return null;
  const nb = eins(rng, offen), ware = eins(rng, ws);
  return { nb, ware, p: eins(rng, ware.preise) };
}
function verkauft(f, date, nb){
  const heute = f.markt.date === date ? f.markt.kunden : [];
  return dazu({ ...f, markt: { date, kunden: [...heute, nb] } }, nb, 1);
}
const F = { GESCHENKE, AKK, WUENSCHE, WAREN, HERZEN, norm, herzen, dazu, besuch, geholfen, gegessen, abholen, kosten, anbieten, verfallen, zettel, einkaufen, abgeben, waren, kunde, verkauft };
if(node){ module.exports = F; return; }

// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S, A = root.AUFGABEN;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("markt");
const D = () => root.WELT.today();
const geld = c => root.INHALT ? root.INHALT.betrag(c) : (c / 100).toFixed(2).replace(".", ",") + " €";
const katze = () => (S().katze || {}).name || "";
function stand(){ S().freunde = verfallen(norm(S().freunde), D()); return S().freunde; }
function setze(f){ S().freunde = f; ST.save(); }
// Herzen als kleine Zeile (SVG), für den Ort und die Karte
function herzBild(nb, x, y, gross = 1){
  const n = herzen(stand(), nb), w = 30 * gross;
  return `<g class="herzen" data-nb="${nb}" data-n="${n}" pointer-events="none">${[...Array(HERZEN)].map((_, i) => { const cx = x + (i - 2) * w, s = gross * .9;
    return `<path transform="translate(${cx} ${y}) scale(${s})" d="M0,10 C-22,-6 -12,-22 0,-12 C12,-22 22,-6 0,10Z" fill="${i < n ? "#e5607e" : "#fff"}" stroke="#e5607e" stroke-width="3"/>`; }).join("")}</g>`;
}
// Geschenk übergeben: {zimmer} kommt in die Kiste, {rezept} in die Küche; Satz des Nachbarn
function geschenkGeben(nb){
  const r = abholen(stand(), nb); if(!r) return null;
  const g = r.geschenk; S().freunde = r.f;
  if(g.zimmer){ S().zimmer = E.schenken(S().zimmer, g.zimmer); ST.save(); return `Du bist eine echte Freundin, Azra! Ich schenke dir ${AKK[g.zimmer]}. Das Geschenk liegt in deiner Kiste.`; }
  const k = K.norm(S().kueche); S().kueche = { ...k, rezepte: [...k.rezepte, g.rezept] }; ST.save();
  return `Du bist eine echte Freundin, Azra! Ich schenke dir mein Rezept für ${K.rezept(g.rezept).name}. Du findest es in deiner Küche.`;
}
// Sie kommt an den Ort eines Nachbarn: Besuch zählt; ein Geschenk oder die Besorgung geht vor. Gibt den Satz des Nachbarn oder null.
function ankommen(nb){
  setze(besuch(stand(), nb, D()));
  const a = stand().auftrag;
  if(a && a.von === nb && a.gekauft){ const r = abgeben(stand(), nb);
    S().freunde = r.f; S().purse += r.lohn; ST.save(); root.WELT.klimper();
    const g = geschenkGeben(nb);
    return `Danke, Azra! Genau ${a.n} ${WAREN[a.ware][1]}. Hier ist dein Geld zurück und 20 Cent für dich.` + (g ? " " + g : ""); }
  return geschenkGeben(nb);
}
// Nach einer Stunde an seinem Ort
function geholfenAm(ort){ const n = W.NACHBARN.find(x => x.ort === ort); if(n){ setze(geholfen(stand(), n.id, D())); } }
const mitgegessen = nb => setze(gegessen(stand(), nb, D()));
// Nichts anderes los: der Nachbar bittet um eine Besorgung (nur wenn sie Hilde schon kennt)
function bitte(nb){
  if(!S().met.hilde) return null;
  const r = anbieten(stand(), nb, D(), S().purse, Math.random); if(!r) return null;
  setze(r.f); return "Kannst du mir etwas aus Hildes Laden holen? Ich habe es dir auf einen Zettel geschrieben.";
}
const offenerZettel = () => { const a = stand().auftrag; return a ? zettel(a) : null; };
// In Hildes Laden: der Zettel oben, bezahlen mit Münzen (überspringen geht auch, dann bezahlt sie einfach)
// merk(ctl): die Küche hält das Bezahlspiel, damit "Zurück" es beendet
function imLaden(seite, zurueck, merk){
  const a = stand().auftrag; if(!a || a.gekauft) return;
  const preis = kosten(a), kann = S().purse >= preis;
  seite.insertAdjacentHTML("afterbegin", `<div class="zettel"><span>📝 ${esc(zettel(a))}</span><button class="btn" id="frZettel"${kann ? "" : " disabled"}>Bezahlen: ${esc(geld(preis))}</button>${kann ? "" : "<span>Dafür reicht dein Geld gerade nicht.</span>"}</div>`);
  el("frZettel").onclick = () => {
    seite.innerHTML = `<div id="frA"></div>`;
    merk(A.spielen(el("frA"), { art: "bezahlen", items: [{ p: preis, thing: zettel(a), bitte: `${zettel(a)}. Das macht ${geld(preis)}. Leg das Geld auf die Theke.` }],
      sag: (w, t) => t && kochSag(t, w), sprich: t => root.WELT.sprich("hilde", t), ergebnis: () => {},
      fertig: () => { const r = einkaufen(stand(), S().purse);
        if(!r) return zurueck("Dafür reicht dein Geld gerade nicht.");
        S().freunde = r.f; S().purse = r.purse; ST.save(); root.WELT.klimper();
        zurueck(`Danke, Azra! Die Sachen sind in deinem Korb. Bring sie zu ${vorname(a.von)}.`); } }));
  };
}
const kochSag = (t, w) => { const c = el("koC"), wer = w === "c" ? "katze" : "hilde";
  c.innerHTML = `<span class="who">${esc(wer === "katze" ? katze() : "Hilde Hamster")}</span>${esc(t)}`; c.hidden = false; root.WELT.sprich(wer, t); };

// ---------- Marktstand ----------
function sag(t, wer){ const n = wer && W.NACHBARN.find(x => x.id === wer);
  el("mkC").innerHTML = `<span class="who">${esc(n ? n.name : katze())}</span>${esc(t)}`; el("mkC").hidden = false; root.WELT.sprich(n ? n.id : "katze", t); }
let lauf = null;
function schliessen(){ if(lauf){ lauf.stop(); lauf = null; } box().hidden = true; root.WELT.zeige(); }
function markt(){
  root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; el("mkAus").onclick = schliessen;
  const ws = waren(S().bilder, K.norm(S().kueche).tisch, D()), kennt = W.NACHBARN.filter(n => S().met[n.id]).map(n => n.id);
  const bilder = ws.map(w => w.id === "karte" ? `<div class="ware"><img src="${S().bilder[0].url}" alt=""><span class="titel">Postkarten</span></div>`
    : `<div class="ware"><svg viewBox="-110 -80 220 150">${root.KOCHEN.gerichtBild(w.id, 0, 0)}</svg><span class="titel">${esc(w.name)}</span></div>`).join("");
  el("mkS").innerHTML = `<h2 class="ui">Dein Marktstand</h2><div class="regalwaren">${bilder}</div><div class="aufgabe-fuss"><button class="btn" id="mkKunde"${ws.length ? "" : " hidden"}>Wer kommt vorbei?</button></div><div id="mkA"></div>`;
  if(!ws.length) return sag("Mal ein Bild am Basteltisch oder koch etwas, dann kannst du es hier verkaufen.");
  sag("Was wir heute verkaufen, liegt schon auf dem Stand.");
  el("mkKunde").onclick = () => {
    const k = kunde(stand(), D(), kennt, ws, Math.random);
    if(!k) return sag("Heute kommt niemand mehr vorbei. Morgen wieder!");
    el("mkKunde").hidden = true;
    const bitte = `Hallo Azra! Ich möchte ${k.ware.akk}. Das kostet ${k.p} ct. Ich gebe dir 1 €. Bekomme ich Geld zurück?`;
    lauf = A.spielen(el("mkA"), { art: "wechselgeld", items: [{ p: k.p, thing: k.ware.name, bitte }],
      sag: (w, t) => t && sag(t, w === "c" ? null : k.nb), sprich: t => root.WELT.sprich(k.nb, t), ergebnis: () => {},
      fertig: () => { lauf = null; setze(verkauft(stand(), D(), k.nb)); S().purse += k.p; ST.save(); root.WELT.klimper();
        el("mkA").innerHTML = ""; el("mkKunde").hidden = false; sag(`Danke, Azra! Das war ein schöner Einkauf.`, k.nb); } });
  };
}
root.FREUNDE = { ...F, stand, herzBild, ankommen, geholfenAm, mitgegessen, bitte, offenerZettel, imLaden, markt, schliessen, get offen(){ return !box().hidden; } };
})(this);
