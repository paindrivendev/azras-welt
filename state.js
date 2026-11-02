/* Spielstand für Azras Welt: Gerät (localStorage) und Konto (claude.ai db), gleiches Muster wie tierschule/state-pension.js. */
(function(){
"use strict";
const KEY = "azras-welt";
const DEFAULTS = {
  version: 1,
  steps: {},                         // pro Lernschritt: siehe lernen.js; rung 0–4 = Wiederholung nach 2/4/8/16/32 Tagen, 5 = Pool
  classAt: { deutsch: 1, mathe: 1 }, // wo die Klasse gerade ist (Karibu-Kapitel, Welt-der-Zahl-Kapitel)
  carriedOver: false,                // Übernahme aus der Tierpension schon geschehen
  // Welt
  katze: null,                       // {farbe, name}, am ersten Tag von Azra gewählt
  met: {},                           // Nachbar → Datum, an dem sie ihn kennengelernt hat (woche.js)
  gelesen: {},                       // Brief von Nachbar → Datum, an dem sie ihn geöffnet hat
  purse: 0,                          // Cent im Geldbeutel
  // Tag (tag.js, spiel.js)
  played: [],                        // Tage, an denen sie gespielt hat (dreht die Extra-Zeit)
  heute: { date: "", fertig: [], gesagt: {}, verschoben: [], weg: [], naechste: {} }, // heutige fertige Zeiten; gesagt: Offline-Bitte heute schon gesagt; verschoben: "Alles später"; weg: Fach heute weggelassen; naechste: {zeit: [Schritte]} für "nächste Stunde"
  zuletzt: {},                       // Ort → Datum des letzten Blocks dort
  zeiten: { mathe: [], extra: [] },  // [{date, seconds}] pro Aufgabe, für die Blockgröße
  merkheft: {},                      // Schritt → Datum, an dem die Katze die Regel gezeigt hat
  ausgelassen: {},                   // übersprungene Schritte → Datum: für immer weg, bis die Eltern sie zurückholen (Ticket 18)
  spielTag: "",                      // "Nächster Tag" der Eltern: Datum, bis der echte Kalender es einholt (tag.js spielDatum)
  spiele: {},                        // Spiele zwischendurch (spiele.js): {labyrinth, woerter, aquarium}
  // Lese-Zeit (lesen.js): Stufe 1–5 (Eltern), Bücher mit Lesezeichen, Seitenzeiten, angetippte Wörter, eigene Bücher
  lesen: { stufe: 2, vonHand: false, buecher: {}, seiten: [], woerter: {}, eigenes: [] }
};
function fresh(){ return JSON.parse(JSON.stringify(DEFAULTS)); }
function load(){
  let j = null; try{ j = JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){}
  return norm(j);
}
function norm(j){
  const s = Object.assign(fresh(), j||{});
  for(const k of ["steps","classAt","met","gelesen","heute","zuletzt","zeiten","merkheft","spiele"]) if(!s[k]||typeof s[k]!=="object"||Array.isArray(s[k])) s[k] = fresh()[k];
  if(!Array.isArray(s.played)) s.played = [];
  if(!s.ausgelassen || typeof s.ausgelassen !== "object" || Array.isArray(s.ausgelassen)) s.ausgelassen = {};
  // früher "Später" (Ticket 12): was dort wartete, hat sie übersprungen, also ist es jetzt ausgelassen
  for(const x of Array.isArray(s.spaeter) ? s.spaeter : []) if(x && typeof x.id === "string" && !s.ausgelassen[x.id]) s.ausgelassen[x.id] = x.date || "earlier";
  delete s.spaeter;
  for(const k of ["mathe","extra"]) if(!Array.isArray(s.zeiten[k])) s.zeiten[k] = [];
  for(const [k, v] of [["fertig", []], ["gesagt", {}], ["verschoben", []], ["weg", []], ["naechste", {}]]) if(!s.heute[k] || typeof s.heute[k] !== "object" || Array.isArray(s.heute[k]) !== Array.isArray(v)) s.heute[k] = v;
  if(typeof s.spielTag !== "string") s.spielTag = "";
  if(!s.lesen || typeof s.lesen !== "object") s.lesen = fresh().lesen;
  s.lesen = { ...fresh().lesen, ...s.lesen };
  for(const k of ["buecher", "woerter"]) if(!s.lesen[k] || typeof s.lesen[k] !== "object" || Array.isArray(s.lesen[k])) s.lesen[k] = {};
  for(const k of ["seiten", "eigenes"]) if(!Array.isArray(s.lesen[k])) s.lesen[k] = [];
  return s;
}
window.S = load();
let t = null;
function save(){ window.S.savedAt = Date.now(); if(!saveLocal() && !acct) problem("geraet"); pushSoon(); }
function saveLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(window.S)); return true; }catch(e){ return false; } }
// Speichern ging nicht: "geraet" (kein Konto und Browser-Speicher gesperrt) oder "konto" (Konto nicht erreichbar).
function problem(p){ const f = window.STATE.onProblem; if(f) f(p); }
function saveSoon(){ clearTimeout(t); t = setTimeout(() => { t = null; save(); }, 800); }
function reset(){ replace(fresh()); save(); }
function replace(n){ for(const k of Object.keys(window.S)) delete window.S[k]; Object.assign(window.S, n); }
// Konto-Spielstand (claude.ai, privat pro Person): überlebt neue Browser und andere Geräte.
let acct = null, pension = null, noAccount = false; // noAccount: es gibt hier sicher kein Konto (kein claude.ai oder keine Person)
async function connect(){
  const C = window.claude; if(!C || !C.use){ noAccount = true; return null; }
  const [db, user] = await Promise.all([C.use("db"), C.use("user")]);
  const uid = db && user ? await user.id() : null;
  if(!uid){ noAccount = true; return null; }
  pension = db.doc(`data/users/${uid}/tierpension`);
  return db.doc(`data/users/${uid}/azras-welt`);
}
let started = false;
async function sync(){
  const ref = await connect(); if(!ref) return;
  const snap = await ref.get(), remote = snap.exists ? snap.data() : null;
  const newer = remote && (remote.savedAt||0) > (window.S.savedAt||0);
  if(newer && started) return; // Spiel läuft schon mit dem Gerät-Stand: Konto weder übernehmen noch überschreiben
  acct = ref;
  if(newer){ replace(norm(JSON.parse(JSON.stringify(remote)))); saveLocal(); }
  else if((window.S.savedAt||0) > (remote && remote.savedAt || 0)) pushSoon();
}
// Ein Schwall von Speicherungen wird eine Konto-Schreibung, spätestens 1,5 s nach der ersten; nie zwei gleichzeitig.
// Geht sie schief, kommt ein neuer Versuch nach 5, 10, 20 … höchstens 60 s.
let pt = null, busy = false, again = false, retry = 5000;
function pushIn(ms){ if(!acct || pt) return; pt = setTimeout(() => { pt = null; push(); }, ms); }
function pushSoon(){ pushIn(1500); }
async function push(){
  if(busy){ again = true; return; }
  busy = true;
  try{ await acct.set(JSON.parse(JSON.stringify(window.S))); retry = 5000; }
  catch(e){ problem("konto"); pushIn(retry); retry = Math.min(60000, retry * 2); }
  busy = false;
  if(again){ again = false; push(); }
}
// Wechselt sie in eine andere App oder schließt sie den Tab: sofort speichern, nicht erst nach den Wartezeiten.
function flushNow(){
  if(t){ clearTimeout(t); t = null; save(); }
  if(pt){ clearTimeout(pt); pt = null; push(); }
}
if(typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if(document.visibilityState === "hidden") flushNow(); });
if(window.addEventListener) window.addEventListener("pagehide", flushNow);
// Höchstens 10 s auf Konto und Übernahme warten, dann mit dem Gerät-Stand spielen.
let wait = null, late = false;
const deadline = new Promise(r => { wait = setTimeout(() => { late = true; r(); }, 10000); });
const ready = Promise.race([sync().catch(() => {}), deadline])
  .then(() => { started = true; if(!window.S.carriedOver) return Promise.race([carryOver().catch(() => {}), deadline]); })
  .then(() => { clearTimeout(wait); });
// Einmal: gemeisterte Schritte und Klassen-Kapitel aus der Tierpension übernehmen. Ist das Konto da, aber nicht
// erreichbar, wartet sie bis zum nächsten Start; dann kommt nur dazu, was fehlt, und kein Kapitel geht zurück.
async function carryOver(){
  if(!acct && !noAccount) return;
  let onDevice = null; try{ onDevice = JSON.parse(localStorage.getItem("tierpension-v1")||"null"); }catch(e){}
  const snap = acct && pension ? await pension.get() : null;
  if(late) return;
  const inAccount = snap && snap.exists ? snap.data() : null;
  const old = (onDevice && onDevice.savedAt||0) > (inAccount && inAccount.savedAt||0) ? onDevice : inAccount || onDevice;
  if(old){
    for(const [id, r] of Object.entries(old.sk||{})) if(r && r.mastered && !window.S.steps[id])
      window.S.steps[id] = { mastered: true, masteredOn: r.masteredOn, rung: Math.min(4, Math.max(0, (r.box||0) - 1)), due: r.due };
    for(const subj of ["deutsch", "mathe"]){
      const c = old.classAt && old.classAt[subj];
      if(typeof c === "number" && c > window.S.classAt[subj]) window.S.classAt[subj] = c;
    }
  }
  window.S.carriedOver = true;
  save();
}
// Sicherung als Datei (Ticket 29): auf GitHub lebt der Spielstand nur im Tablet. Eine fremde oder kaputte Datei
// ändert nichts; eine gute wird repariert übernommen und gleich gespeichert.
function sicherung(date){ return JSON.stringify({ app: KEY, date, spielstand: window.S }); }
function wiederherstellen(text){
  let j = null; try{ j = JSON.parse(text); }catch(e){ return false; }
  if(!j || j.app !== KEY || !j.spielstand || typeof j.spielstand !== "object" || Array.isArray(j.spielstand)) return false;
  replace(norm(j.spielstand)); save(); return true;
}
window.STATE = { save, saveSoon, reset, ready, KEY, sicherung, wiederherstellen };
})();
