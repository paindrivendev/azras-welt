/* Der Lern-Tag in der Welt: Einladungen (Brief des Tages, Katze), eine Zeit an ihrem Ort mit der Arbeitskarte rechts,
   das Zeigen der Katze mit Merkheft, freies Spiel danach und die Offline-Bitten. Regeln: PLAN.md "A day",
   "Learning a step"; Plan: tag.js; Aufgaben: aufgaben.js/arten.js; Inhalt der Schritte: inhalt.js (Ticket 06).
   Ohne inhalt.js gibt es keine Zeiten, die Welt bleibt wie in der ersten Woche. */
(function(root){
"use strict";
const T = root.TAG, L = root.LERNEN, A = root.AUFGABEN, W = root.WOCHE, S = () => root.S, ST = root.STATE;
const NB = Object.fromEntries(W.NACHBARN.map(n => [n.id, n])), AM = Object.fromEntries(W.NACHBARN.map(n => [n.ort, n]));
const RAUM = ["regal", "basteln", "puppen", "tagebuch"]; // Orte in ihrem Zimmer
const RAUM_RUF = { regal: "Am Bücherregal wartet etwas auf dich.", basteln: "Am Basteltisch wartet etwas auf dich.", puppen: "Im Puppenhaus wartet etwas auf dich.", tagebuch: "Dein Tagebuch wartet auf dich." };
const vorname = n => n.name.split(" ")[0];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const D = () => root.WELT.today();
const da = () => !!(root.INHALT && root.SKILLS && T);
function heute(){ const s = S(); if(s.heute.date !== D()) s.heute = { date: D(), fertig: [], gesagt: {}, verschoben: [], weg: [], naechste: {} }; return s.heute; }
const vorbei = () => T.vorbei(heute());
// "Heute nur spielen" (Ticket 20): bis "Doch lernen" oder bis morgen lädt nichts mehr zum Lernen ein.
const nurSpielen = () => heute().spielen === true;
function spielen(an){ const h = heute(); if(an) h.spielen = true; else delete h.spielen; if(an) schliessen(); ST.save(); }
// Die Schritte, die sie lernen kann: ohne die übersprungenen (Ticket 18).
const lernbar = () => T.lernbar(root.SKILLS || [], S().ausgelassen);
// Offen zum Lernen: die Orte der Nachbarn, die sie schon kennt, und ihr Zimmer.
const offen = () => [...W.NACHBARN.filter(n => S().met[n.id]).map(n => n.ort), ...RAUM];
// Der heutige Plan: einmal festgelegt (Ort und neuer Schritt jeder Zeit), damit Brief und Ort den Tag über bleiben.
function plan(){
  if(!da()) return null; const h = heute(), s = S();
  h.plan = h.plan || {};
  const p = T.planen(lernbar(), s.steps, root.INHALT, { classAt: s.classAt, today: D(), played: s.played, offen: offen(), zuletzt: s.zuletzt, zeiten: s.zeiten, fest: h.plan, naechste: h.naechste });
  for(const k of ["mathe", "extra"]) if(!p[k].leer && !h.plan[k]){ h.plan[k] = { ort: p[k].ort, neu: p[k].neu }; ST.save(); }
  return p;
}
// Eine weggelegte Zeit ("Alles später") erst, wenn am Ort keine andere mehr offen ist.
// vorzug: nach "Nächste …-Stunde" beginnt am Ort diese Zeit zuerst (bis eine Zeit startet).
let vorzug = null;
function vorziehen(kind){ vorzug = kind; }
const offeneZeit = (p, ort) => [p.mathe, p.extra].filter(b => !b.leer && (!ort || b.ort === ort) && !vorbei().includes(b.kind))
  .sort((a, b) => (b.kind === vorzug) - (a.kind === vorzug) || heute().verschoben.includes(a.kind) - heute().verschoben.includes(b.kind))[0];
// Lese-Zeit nur, wenn es Bücher gibt (regal.js, buecher.js).
// ohneSpielen: was offen wäre, wenn sie nicht nur spielte (für "Doch lernen").
function einladungen(ohneSpielen){ const p = plan(), h = heute();
  return p ? T.einladungen(p, T.vorbei(ohneSpielen ? { ...h, spielen: false } : h), Object.keys(AM), h.verschoben).filter(e => e.kind !== "lesen" || root.BUECHER) : []; }
function brief(){
  const e = einladungen().find(e => e.von === "brief"), n = e && AM[e.ort];
  if(!n) return null;
  return { key: "tag:" + D(), von: n.id, ort: e.ort, zeilen: ["Liebe Azra,", "kannst du mir heute helfen?", "Ich warte auf dich.", n.brief[n.brief.length - 1]] };
}
// Offline-Schritte, die gerade dran sind (Klasse ist so weit, noch nicht geschafft), für einen Nachbarn oder die Katze.
function offlineFuer(von){
  if(!da()) return null; const s = S();
  const k = root.SKILLS.filter(sk => { const c = root.INHALT.steps[sk.id], r = s.steps[sk.id];
    return c && c.offline && c.von === von && L.place(sk, s.classAt, D()) <= 0 && !(r && r.mastered) && !(r && (r.marks || []).includes(D())) && !heute().gesagt[sk.id]; })
    .sort((a, b) => L.place(a, s.classAt, D()) - L.place(b, s.classAt, D()) || a.order - b.order)[0];
  return k ? { id: k.id, bitte: root.INHALT.steps[k.id].bitte } : null;
}
function gesagt(id){ heute().gesagt[id] = true; ST.save(); }
// Was die Katze sagt, wenn Azra auf sie tippt (außer Briefen der ersten Woche).
function tipp(){
  if(!da()) return null;
  if(karte.offen) return karte.lauf && !karte.lauf.G.locked && !karte.lauf.state.tries ? "Probier es erst einmal, dann helfe ich dir." : "Ich bin bei dir.";
  const e = einladungen()[0];
  if(e){ const n = AM[e.ort];
    if(e.kind === "lesen") return "Magst du ein Buch aus deinem Regal lesen?";
    if(!n) return RAUM_RUF[e.ort] || null;
    return e.von === "brief" ? `${vorname(n)} wartet ${n.wo} auf dich.` : `Geh doch mal zu ${vorname(n)}, da gibt es etwas zu tun.`; }
  if(nurSpielen()) return "Heute spielen wir nur. Wenn du doch lernen magst, tipp auf „Doch lernen“.";
  const o = offlineFuer("katze"); if(o){ gesagt(o.id); return o.bitte; }
  return "Für heute ist alles erledigt, du kannst noch frei spielen.";
}
// Am Ort: eine geplante Zeit, sonst freies Spiel, sonst eine Offline-Bitte des Nachbarn.
function amOrt(ort){
  const p = plan(); if(!p) return null;
  const b = offeneZeit(p, ort);
  if(b) return { start: () => laufen(b) };
  if(nurSpielen()) return null;
  const n = AM[ort], o = n && offlineFuer(n.id);
  if(o) return { offline: o.bitte, gesagt: () => gesagt(o.id) };
  if(offeneZeit(p)) return null; // freies Spiel erst nach dem Plan
  const f = T.frei(lernbar(), S().steps, root.INHALT, ort, D(), S().zeiten);
  if(!f.leer) return { frei: () => laufen(f) };
  return null;
}

// Ein Fach heute weglassen (nicht erledigt, kein Geld; morgen geht es weiter) oder gleich seine nächste Stunde:
// die Schritte dieser Zeit liegen heute beiseite, die Zeit wird neu geplant (Rückmeldung der Eltern).
const FACH = { mathe: { name: "Mathe", kein: "keine Mathe" }, deutsch: { name: "Deutsch", kein: "kein Deutsch" }, hsu: { name: "HSU", kein: "kein HSU" } };
// Der nächste Tag gleich jetzt (Azra, wenn heute nichts mehr offen ist, oder die Eltern): bis der Kalender ihn einholt.
function neuerTag(){ schliessen(); S().spielTag = L.addDays(D(), 1); ST.save(); }
function heuteNicht(kind){ const h = heute(); if(!h.weg.includes(kind)) h.weg.push(kind); h.verschoben = h.verschoben.filter(k => k !== kind); ST.save(); }
function naechsteStunde(kind){
  const h = heute(), b = plan() && plan()[kind]; if(!b) return null;
  h.naechste[kind] = [...new Set([...(h.naechste[kind] || []), b.neu, ...b.ueben, ...b.wiederholen].filter(Boolean))];
  delete h.plan[kind]; for(const k of ["verschoben", "weg", "fertig"]) h[k] = h[k].filter(x => x !== kind); ST.save();
  const n = plan()[kind]; if(n.leer){ heuteNicht(kind); return null; }
  return n;
}

// ---------- Arbeitskarte ----------
const karte = { offen: false, lauf: null, wer: null, still: 0, zeit: null }; // zeit: mathe, extra oder frei, solange sie läuft
const el = id => document.getElementById(id);
function sag(wer, text){
  if(wer === "c" && Date.now() < karte.still) return; // "Oh, das kannst du ja schon!" bleibt kurz stehen
  const n = NB[karte.wer], katze = S().katze ? S().katze.name : "";
  if(wer === "c" || !n){ el("wkC").innerHTML = `<span class="who">${esc(katze)}</span>${esc(text)}`; el("wkC").hidden = false; }
  if(wer !== "c"){ el("wkN").innerHTML = `<span class="who">${esc(n ? n.name : katze)}</span>${esc(text)}`; el("wkN").hidden = false; if(!n) el("wkC").hidden = true; }
  root.WELT.sprich(wer === "c" || !n ? "katze" : n.id, text);
}
function oeffnen(ort){
  karte.offen = true; karte.ort = ort; karte.wer = AM[ort] ? AM[ort].id : null;
  el("werk").hidden = false; el("wkN").hidden = true; el("wkC").hidden = true; el("wkAus").hidden = true; fachKnoepfe(null); el("wkBuehne").innerHTML = "";
  root.WELT.zeige();
}
function schliessen(){
  if(karte.lauf){ karte.lauf.stop(); karte.lauf = null; }
  if(!karte.offen) return;
  karte.offen = false; karte.zeit = null; el("werk").hidden = true;
}
// "Heute kein Deutsch" und "Nächste Deutsch-Stunde" während einer Zeit (b: der Block; null: aus).
function fachKnoepfe(b){
  const f = b && b.kind !== "frei" && FACH[b.fach];
  el("wkWeg").hidden = el("wkNeu").hidden = !f; if(!f) return;
  el("wkWeg").textContent = `Heute ${f.kein} ✕`; el("wkNeu").textContent = `Nächste ${f.name}-Stunde ⏭`;
  el("wkWeg").onclick = () => { schliessen(); heuteNicht(b.kind); root.WELT.naechstes(b.kind); };
  el("wkNeu").onclick = () => {
    if(naechsteStunde(b.kind)){ schliessen(); return root.WELT.zurZeit(b.kind); }
    // keine andere Stunde: die Katze sagt es auf der Karte, "Weiter" geht zum Nächsten
    if(karte.lauf){ karte.lauf.stop(); karte.lauf = null; } el("wkAus").hidden = true; fachKnoepfe(null); el("wkBuehne").innerHTML = "";
    sag("c", `Heute gibt es keine andere ${f.name}-Stunde.`); knopf("Weiter", () => { schliessen(); root.WELT.naechstes(b.kind); }); };
}
// Ein Knopf unten auf der Karte (Zeigen, Merkheft, Danke).
function knopf(text, fn){ el("wkBuehne").insertAdjacentHTML("beforeend", `<div class="aufgabe-fuss"><button class="btn weiter" id="wkGo">${esc(text)}</button></div>`); el("wkGo").onclick = fn; }

// ---------- Eine Zeit ----------
function laufen(zeit){
  if(karte.lauf){ karte.lauf.stop(); karte.lauf = null; } // nie zwei Stunden gleichzeitig (Review)
  let b = zeit; oeffnen(b.ort); karte.zeit = b.kind; vorzug = null;
  const done = []; let warten = null, zusammen = null;
  const aufgabe = (id, rolle) => {
    const s = S(); if(!s.steps[id]) s.steps[id] = L.start(D());
    const a = root.INHALT.steps[id].aufgabe(Math.random, T.stufe(s.steps[id], rolle, D()));
    return { art: a.art, item: a.item, id, rolle, zusammen: rolle === "zusammen" };
  };
  const naechste = () => {
    if(zusammen){ const id = zusammen; zusammen = null; return aufgabe(id, "zusammen"); }
    const x = T.naechste(b, S().steps, done);
    if(!x || x.rolle === "zeigen"){ warten = x; return null; }
    return aufgabe(x.id, x.rolle);
  };
  let aktuell = null;
  // "Alles später": die ganze Zeit wartet bis zum Ende des Tages, gleich geht es mit dem Nächsten weiter (Rückmeldung der Eltern)
  el("wkAus").textContent = "Alles später ⏭"; el("wkAus").hidden = false; el("wkAus").onclick = () => verschieben(); fachKnoepfe(b);
  const segment = () => {
    let erst = naechste(); if(!erst) return weiter();
    const quelle = () => { if(erst){ const e = erst; erst = null; aktuell = e; return e; } const n = naechste(); if(n) aktuell = n; return n; };
    karte.lauf = A.spielen(el("wkBuehne"), { naechste: quelle, sag, sprich: t => root.WELT.sprich(karte.wer || "katze", t), stumm: () => root.speechSynthesis && speechSynthesis.cancel(),
      easeOff: () => { b = { ...b, n: Math.min(b.n, done.length) }; }, // nach 3 nicht allein: die Zeit wird kürzer (noch höchstens 2 leichte)
      ergebnis: r => { const s = S(), c = aktuell, d = D();
        // übersprungen: der ganze Schritt ist für immer weg, bis die Eltern ihn zurückholen; die Zeit geht mit einem anderen weiter
        if(r.skip){ if(!s.ausgelassen[c.id]) s.ausgelassen[c.id] = d; ST.save(); done.push({ id: c.id, alone: false, rolle: c.rolle, skip: true }); return; }
        if(r.zusammen) return;
        const x = T.buchen(s.steps[c.id], d, r.alone, c.art); s.steps[c.id] = x.r; done.push({ id: c.id, alone: r.alone, rolle: c.rolle });
        if(x.schon){ sag("c", "Oh, das kannst du ja schon!"); karte.still = Date.now() + 2500; }
        if(x.lernen) sag("c", "Das lernen wir noch.");
        if(!s.played.includes(d)) s.played.push(d);
        if(b.kind !== "frei"){ const z = s.zeiten[b.kind]; z.push({ date: d, seconds: Math.round(r.ms / 1000) }); if(z.length > 300) z.splice(0, z.length - 300); }
        ST.save(); },
      fertig: () => { karte.lauf = null; weiter(); } });
  };
  const weiter = () => {
    if(warten && warten.rolle === "zeigen"){ const id = warten.id; warten = null; return zeigen(id, () => { zusammen = id; segment(); }); }
    ende();
  };
  // Weggelegt: zählt heute nicht als erledigt, kein Geld; die Zeit kommt am Ende des Tages wieder.
  const verschieben = () => {
    if(karte.lauf){ karte.lauf.stop(); karte.lauf = null; }
    const v = heute().verschoben; if(b.kind !== "frei" && !v.includes(b.kind)) v.push(b.kind);
    ST.save(); schliessen(); root.WELT.naechstes(b.kind);
  };
  const ende = () => {
    if(done.length && done.every(r => r.skip)) return verschieben(); // alles übersprungen: wie "Alles später"
    const s = S(); el("wkAus").hidden = true; fachKnoepfe(null);
    if(b.kind !== "frei" && !heute().fertig.includes(b.kind)){ heute().fertig.push(b.kind); s.zuletzt[b.ort] = D(); s.purse += 50; }
    ST.save(); el("wkBuehne").innerHTML = ""; el("wkC").hidden = true;
    sag("n", b.kind === "frei" ? "Danke, Azra, das war schön!" : "Danke, Azra, du hast mir sehr geholfen!"); root.WELT.klimper();
    knopf("Fertig", () => { schliessen(); root.WELT.zeige(); });
  };
  segment();
}
// Die Katze zeigt: höchstens 5 Sätze, einer nach dem anderen; dann kommt die Regel ins Merkheft.
function zeigen(id, fertig){
  const c = root.INHALT.steps[id], saetze = c.zeigen || []; let i = 0;
  const schritt = () => {
    el("wkBuehne").innerHTML = `<div class="aufgabe zeigen"><p class="satz">${esc(saetze[i])}</p></div>`; sag("c", saetze[i]);
    knopf("Weiter", () => { if(++i < saetze.length) return schritt(); merk(); });
  };
  const merk = () => {
    const s = S(); s.steps[id] = L.taught(s.steps[id]); s.merkheft[id] = s.merkheft[id] || D(); ST.save();
    el("wkBuehne").innerHTML = `<div class="aufgabe zeigen"><p class="merk">${esc(c.merkheft)}</p></div>`; sag("c", "Das kommt in dein Merkheft.");
    knopf("Weiter", fertig);
  };
  if(saetze.length) schritt(); else merk();
}
// Ihr Merkheft auf dem Schreibtisch: jede gezeigte Regel, zum Antippen vorgelesen.
function merkheft(){
  const s = S(), ids = Object.keys(s.merkheft).filter(id => root.INHALT && root.INHALT.steps[id]).sort((a, b) => s.merkheft[a].localeCompare(s.merkheft[b]));
  if(!ids.length) return false;
  oeffnen("zimmer");
  el("wkBuehne").innerHTML = `<div class="aufgabe zeigen"><h2 class="ui">Mein Merkheft</h2>${ids.map(id => `<button class="merk zeile" data-merk="${id}">${esc(root.INHALT.steps[id].merkheft)}</button>`).join("")}</div>`;
  el("wkBuehne").querySelectorAll("[data-merk]").forEach(b => b.onclick = () => root.WELT.sprich("katze", root.INHALT.steps[b.dataset.merk].merkheft));
  knopf("Fertig", schliessen);
  return true;
}
root.SPIEL = { plan, einladungen, neuerTag, spielen, get nurSpielen(){ return da() && nurSpielen(); }, heuteNicht, naechsteStunde, vorziehen, FACH, brief, tipp, amOrt, merkheft, schliessen, get offen(){ return karte.offen; }, get lauf(){ return karte.lauf; }, get zeit(){ return karte.zeit; }, katze: t => sag("c", t), RAUM };
})(this);
