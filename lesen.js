/* Lese-Zeit von Azras Welt: reine Funktionen ohne DOM. Regeln: PLAN.md "Reading", Ticket 07.
   Ein Buch (buecher.js): {id, titel, stufe 1–5, quelle "westpark" | "offen" | "nacherzaehlt", kapitel: [{titel, seiten: [{text, bild}]}],
   lizenz (offene und nacherzählte Bücher), aufgaben: [{art, item}] nach dem Buch, blitz: [{art: "blitzwort", item}]}.
   Im Spielstand S.lesen: {stufe, vonHand, buecher: {id: {seite, fertig, stufe, aufgaben: {n, alone}}}, seiten: [{date,
   buch, woerter, sekunden}], woerter: {wort: n} (angetippt), eigenes: [daten]}. */
(function(root){
"use strict";
const L = typeof module !== "undefined" && module.exports ? require("./lernen.js") : root.LERNEN;
const LESEZEIT = 600, SEITE_MAX = 180;
const zaehle = t => (String(t).match(/[A-Za-zÄÖÜäöüß{}]+/g) || []).length;
// Gezeichnete Szene einer Westpark-Seite aus ihren Emoji (Ticket 11): der Ort der Welt, Nachbarn, Azra und ihre Katze
// als Figuren, Wetter als Licht, der Rest als Dinge. Ohne Ort: der Ort der Seite davor, sonst das Zuhause der ersten Figur.
const FIGUREN = { "🦦": "otter", "🐹": "hamster", "🐿": "squirrel", "🐭": "mole", "🐌": "snail", "🐦": "heron", "🐈": "katze", "👧": "azra" };
const ORTE = { "🏪": "laden", "☕": "cafe", "✉": "post", "📮": "post", "📦": "post", "⛰": "huegel", "🌊": "see", "🐟": "see", "🐠": "see", "🦆": "see",
  "🌳": "park", "🏞": "park", "🌿": "park", "🛏": "zimmer", "📚": "zimmer" };
const ZUHAUSE = { squirrel: "post", hamster: "laden", otter: "cafe", snail: "garten", mole: "huegel", heron: "see", katze: "zimmer", azra: "zimmer" };
const WETTER = { "❄": "schnee", "🥶": "schnee", "🌙": "abend", "🌑": "abend", "💡": "abend", "🌇": "abend", "🍂": "herbst", "🌬": "herbst", "💨": "herbst" };
const OHNE = /^[😀-🙏🤗-🤷🫠-🫨👀-👐💪💭👥🧍❓✋✊👉🦵]/u; // Gesichter, Hände, Fragezeichen: keine Dinge im Bild
function szene(bild, vorher){
  const teile = [...new Intl.Segmenter().segment(String(bild))].map(x => x.segment).filter(t => t.trim());
  const key = t => t.replace(/\uFE0F/g, ""), wer = [], dinge = []; let ort = null, wetter = null;
  for(const t of teile){ const k = key(t);
    if(FIGUREN[k]){ if(!wer.includes(FIGUREN[k]) && wer.length < 3) wer.push(FIGUREN[k]); continue; }
    if(WETTER[k]){ wetter = wetter || WETTER[k]; continue; }
    if(ORTE[k] && !ort){ ort = ORTE[k]; if(!["🐟", "🐠", "🦆", "✉", "📦"].includes(k)) continue; }
    if(!OHNE.test(t) && dinge.length < 3) dinge.push(t); }
  return { ort: ort || vorher || (wer.length ? ZUHAUSE[wer[0]] : "park"), wer, dinge, wetter };
}
// Alle Seiten eines Buchs der Reihe nach; die erste Seite eines Kapitels trägt seinen Titel; offene Bücher enden mit
// der Seite "Wer hat das Buch gemacht" (Lizenz), nacherzählte mit dem Dank an das Original. Eine Seite mit Bild (abb)
// zeigt es; jede andere bekommt eine Szene aus ihren Emoji, nur offene Bücher nicht (sie haben immer ihr Originalbild).
function seiten(buch){
  const out = []; let ort = null;
  for(const k of buch.kapitel) k.seiten.forEach((s, i) => {
    const p = { kapitel: i === 0 ? k.titel : null, text: s.text, bild: s.bild, woerter: zaehle(s.text) };
    if(s.abb) p.abb = s.abb; else if(buch.quelle !== "offen"){ p.szene = szene(s.bild, ort); ort = p.szene.ort; }
    out.push(p); });
  if(buch.lizenz) out.push({ lizenz: true, text: buch.lizenz.text, url: buch.lizenz.url, quelle: buch.lizenz.quelle, kapitel: null, woerter: 0, bild: "" });
  return out;
}
const text = (t, katze) => String(t).replaceAll("{katze}", katze || "Katze");
// Beim Umblättern: nach etwa 10 Minuten legt die Katze das Lesezeichen an das Seitenende; die letzte Seite beendet das Buch.
function umblaettern({ sekunden, seite, anzahl }){ return seite >= anzahl - 1 ? "ende" : sekunden >= LESEZEIT ? "lesezeichen" : "weiter"; }
// Lese-Zeit ist geschafft nach etwa 10 Minuten Lesen heute (ein kurzes Buch allein reicht nicht).
const genug = sekunden => sekunden >= LESEZEIT;
// Eine Seite zählt höchstens 3 Minuten (eine Pause dehnt die Lesezeit nicht).
const seitenZeit = s => Math.max(0, Math.min(SEITE_MAX, Math.round(s)));
// Lese-Schritte wohnen im Bücherregal; der Blitzwort-Schritt hat sein eigenes Aufwärmen.
const leseSchritte = (skills, inhalt) => skills.filter(s => inhalt.steps[s.id] && inhalt.steps[s.id].home === "regal" && !inhalt.steps[s.id].offline)
  .sort((a, b) => a.order - b.order);
const imUeben = r => r && !r.mastered && ["try", "teach", "practice"].includes(r.stage);
const faellig = (r, today) => r && r.mastered && r.rung < L.POOL && r.due && r.due <= today;
function aktuell(steps, inhalt, skills, today){
  const ids = leseSchritte(skills, inhalt).map(s => s.id).filter(id => !(inhalt.steps[id].arten || []).every(a => a === "blitzwort"));
  // nur ein Schritt, den sie schon übt (nicht in der Probe, nicht während die Katze zeigt), oder ein fälliger
  return ids.find(id => steps[id] && !steps[id].mastered && steps[id].stage === "practice") || ids.find(id => faellig(steps[id], today)) || null;
}
// Nach dem ersten Lesen 1–3 Aufgaben mit dem aktuellen Lese-Schritt: Aufgaben des Buchs in seiner Art; hat das Buch
// keine, eine Aufgabe des Schritts selbst und eine Frage zum Buch. Ohne Lese-Schritt zwei Fragen zum Buch. Nach dem
// Wiederlesen nichts. schritt = welchem Schritt das Ergebnis zählt (null = keinem).
function nachDemBuch(buch, { ersteLesung, steps, inhalt, skills, today }){
  if(!ersteLesung) return [];
  const id = aktuell(steps, inhalt, skills, today), fragen = buch.aufgaben || [];
  if(!id) return fragen.slice(0, 2).map(a => ({ ...a, schritt: null }));
  const passend = fragen.filter(a => (inhalt.steps[id].arten || []).includes(a.art)).slice(0, 3);
  if(passend.length) return passend.map(a => ({ ...a, schritt: id }));
  const eigen = inhalt.steps[id].aufgabe ? [{ ...inhalt.steps[id].aufgabe(Math.random, 1), schritt: id }] : [];
  return [...eigen, ...fragen.slice(0, 1).map(a => ({ ...a, schritt: null }))];
}
// Der Blitzwort-Schritt, wenn er heute geübt wird oder fällig ist, sonst null. Blitzsätze (saetze) nie: das Buch hat nur Wörter.
function blitzSchritt(steps, inhalt, skills, today){
  const s = leseSchritte(skills, inhalt).find(s => (inhalt.steps[s.id].arten || []).includes("blitzwort") && !inhalt.steps[s.id].saetze && (imUeben(steps[s.id]) || faellig(steps[s.id], today)));
  return s ? s.id : null;
}
// Blitzzeit je Stufe 0–2, wie bei d_lesen_blitz (inhalt.js)
const BLITZ_MS = [1500, 1000, 700];
const blitz = (buch, schritt, stufe = 0) => (buch.blitz || []).slice(0, 5).map(a => ({ ...a, item: { ...a.item, ms: BLITZ_MS[stufe] }, schritt }));
// Stufe: Start von den Eltern (sonst 2), gedeckelt durch das Karibu-Kapitel, außer die Eltern haben sie von Hand gesetzt.
const deckel = ch => ch <= 2 ? 2 : ch <= 4 ? 3 : ch <= 6 ? 4 : 5;
const stufe = (lesen, karibu) => { const s = lesen.stufe || 2; return lesen.vonHand ? s : Math.min(s, deckel(karibu)); };
// Nach 3 erstmals gelesenen Büchern ihrer Stufe mit den Aufgaben danach meist allein gelöst (≥ 70 %) die nächste Stufe.
function aufsteigen(lesen, karibu){
  const s = lesen.stufe || 2, cap = lesen.vonHand ? 5 : deckel(karibu);
  const gut = Object.values(lesen.buecher || {}).filter(b => b.fertig >= 1 && b.stufe === s && b.aufgaben && b.aufgaben.n && b.aufgaben.alone / b.aufgaben.n >= 0.7).length;
  return gut >= 3 ? Math.min(5, Math.max(s, Math.min(s + 1, cap))) : s;
}
// Das Regal: Bücher bis zu ihrer Stufe; ein angefangenes Buch vorn, dann die Lieblinge (am öftesten gelesen), dann neue.
function regal(buecher, lesen, st){
  const b = lesen.buecher || {}, r = id => b[id] || { fertig: 0, seite: 0 };
  const rang = x => r(x.id).seite > 0 ? 0 : r(x.id).fertig > 0 ? 1 : 2;
  return buecher.filter(x => x.stufe <= st).map((x, i) => ({ x, i }))
    .sort((p, q) => rang(p.x) - rang(q.x) || r(q.x.id).fertig - r(p.x.id).fertig || p.i - q.i).map(p => p.x);
}
// Ihr Lesetempo für die Eltern: Wörter pro Minute je Tag (Seiten ohne Wörter zählen nicht).
function tempo(seitenZeiten){
  const tage = {};
  for(const s of seitenZeiten) if(s.woerter > 0 && s.sekunden > 0){ const t = tage[s.date] = tage[s.date] || { w: 0, s: 0 }; t.w += s.woerter; t.s += s.sekunden; }
  return Object.keys(tage).sort().map(date => ({ date, wpm: Math.round(tage[date].w / tage[date].s * 60) }));
}
const R = { LESEZEIT, genug, szene, seiten, text, umblaettern, seitenZeit, nachDemBuch, blitzSchritt, blitz, deckel, stufe, aufsteigen, regal, tempo };
if(typeof module !== "undefined" && module.exports) module.exports = R; else root.LESEN = R;
})(this);
