/* Lernregeln für Azras Welt: reine Funktionen ohne DOM, Daten als "JJJJ-MM-TT". Regeln: PLAN.md "A day" und "Learning a step".
   Ein Schritt im Spielstand (S.steps[id]): {stage, days:{datum:{n, alone}}, mastered, masteredOn, rung, due, missRow, seen}
   stage: "try" (zwei Probe-Aufgaben), "teach" (Katze zeigt), "practice", "review" (gemeistert). rung 0–4 = nächste
   Wiederholung nach 2/4/8/16/32 Tagen, POOL = danach ohne festen Termin. */
(function(root){
"use strict";
const POOL = 5;
function addDays(d, n){ const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function gap(rung){ return 2 ** (rung + 1); }
function onRung(r, rung, today){ return { ...r, rung, due: rung >= POOL ? "" : addDays(today, gap(rung)) }; }
// Gemeistert: kommt nach 2 Tagen das erste Mal wieder.
function master(r, today){ return onRung({ ...r, stage: "review", mastered: true, masteredOn: today, missRow: 0 }, 0, today); }
// Versteckte Wiederholung: gelöst → eine Stufe höher; verpasst → eine Stufe zurück; zweimal nacheinander → zurück ins Üben.
function review(r, today, alone){
  if(alone) return onRung({ ...r, missRow: 0, seen: today }, Math.min(POOL, r.rung + 1), today);
  if((r.missRow || 0) + 1 >= 2) return { ...r, stage: "practice", mastered: false, days: {}, marks: [], missRow: 0, rung: 0, due: "", seen: today };
  return onRung({ ...r, missRow: (r.missRow || 0) + 1, seen: today }, Math.max(0, r.rung - 1), today);
}
// Neuer Schritt: zwei Probe-Aufgaben als normale Bitte. Beide allein gelöst → gleich üben; erster Fehler → Katze zeigt.
function start(today){ return { stage: "try", days: {}, tries: 0, started: today }; }
function taught(r){ return { ...r, stage: "practice" }; }
// Ein Tag zählt, wenn mindestens 5 Aufgaben da sind und davon mindestens 80 % allein gelöst.
function goodDay(d){ return d.n >= 5 && d.alone / d.n >= 0.8; }
// Eine Aufgabe ist fertig; alone = beim ersten Versuch richtig, vor jedem Tipp.
// Gemeistert: nur die erste Aufgabe an einem fälligen Tag (oder aus dem Pool) zählt als Wiederholung.
// Während die Katze zeigt (teach), zählt nichts.
function answer(r, today, alone){
  if(r.mastered) return r.seen !== today && (r.rung >= POOL || (r.due && r.due <= today)) ? review(r, today, alone) : r;
  if(r.stage === "teach") return r;
  if(r.stage === "try"){
    const tries = r.tries || 0;
    if(!alone) return { ...r, stage: "teach" };
    return tries + 1 >= 2 ? { ...r, stage: "practice" } : { ...r, tries: tries + 1 };
  }
  const d = r.days[today] || { n: 0, alone: 0 };
  const n = { ...r, days: { ...r.days, [today]: { n: d.n + 1, alone: d.alone + (alone ? 1 : 0) } } };
  return Object.values(n.days).filter(goodDay).length >= 2 ? master(n, today) : n;
}
// Wo die Klasse ist: Mathe/Deutsch nach dem Kapitel der Eltern, HSU nach dem Schulmonat (9 … 12, 1 … 7).
function schoolMonth(m){ return m >= 9 ? m - 9 : m + 3; }
function place(sk, classAt, today){
  return sk.subject === "hsu" ? schoolMonth(sk.chapter) - schoolMonth(+today.slice(5, 7)) : sk.chapter - classAt[sk.subject];
}
// Der nächste neue Schritt eines Fachs oder null. Höchstens 1 neuer pro Block und Tag, höchstens 3 im Üben;
// nie über das Klassen-Kapitel hinaus; aktuelles Kapitel zuerst, ein Platz bleibt für das Älteste von früher;
// fehlt eine Voraussetzung, kommt sie zuerst; ist sie noch im Üben, wartet der Schritt. offer(s) (optional): nur solche
// Schritte dürfen neu anfangen; kann eine fehlende Voraussetzung nicht angeboten werden, wartet der Schritt.
function chooseNew(skills, steps, { subject, classAt, today, newToday, offer = () => true }){
  if(newToday >= 1) return null;
  const byId = Object.fromEntries(skills.map(s => [s.id, s]));
  const mine = skills.filter(s => s.subject === subject && place(s, classAt, today) <= 0);
  const inPractice = skills.filter(s => s.subject === subject && steps[s.id] && !steps[s.id].mastered && steps[s.id].stage !== "offline");
  if(inPractice.length >= 3) return null;
  // Erst die fehlende Voraussetzung (rekursiv), sonst der Schritt selbst; null, wenn eine noch geübt wird.
  function resolve(s, seen = new Set()){
    if(seen.has(s.id)) return null; seen.add(s.id);
    for(const id of s.pre || []){
      const p = byId[id], r = steps[id];
      if(!p || (r && r.mastered)) continue;
      if(r) return null;
      if(place(p, classAt, today) > 0 || !offer(p)) return null;
      return resolve(p, seen);
    }
    return s.id;
  }
  const fresh = list => list.filter(s => !steps[s.id] && offer(s));
  const firstOf = list => { for(const s of list){ const id = resolve(s); if(id) return id; } return null; };
  const current = fresh(mine.filter(s => place(s, classAt, today) === 0)).sort((a, b) => a.order - b.order);
  const backlog = fresh(mine.filter(s => place(s, classAt, today) < 0))
    .sort((a, b) => place(a, classAt, today) - place(b, classAt, today) || a.order - b.order);
  const currentInPractice = inPractice.filter(s => place(s, classAt, today) === 0).length;
  const fromBacklog = backlog.length && (currentInPractice >= 2 || !current.length) ? firstOf(backlog) : null;
  return fromBacklog || firstOf(current) || firstOf(backlog);
}
// Wiederholungen für einen Block: höchstens 3 fällige, die ältesten zuerst; sind es weniger als 2, kommen Schritte
// aus dem Pool dazu (am längsten nicht gesehen zuerst).
function dueReviews(steps, ids, today){
  const mastered = ids.filter(id => steps[id] && steps[id].mastered);
  const due = mastered.filter(id => steps[id].rung < POOL && steps[id].due <= today)
    .sort((a, b) => steps[a].due < steps[b].due ? -1 : steps[a].due > steps[b].due ? 1 : 0).slice(0, 3);
  const pool = mastered.filter(id => steps[id].rung >= POOL)
    .sort((a, b) => (steps[a].seen || "").localeCompare(steps[b].seen || ""));
  return due.concat(pool.slice(0, Math.max(0, 2 - due.length)));
}
// "Sitzt" (Eltern): jeder noch nicht gemeisterte Schritt des Kapitels kommt auf die 2-Tage-Stufe.
function sitzt(skills, steps, { subject, chapter, today }){
  const out = { ...steps };
  for(const s of skills) if(s.subject === subject && s.chapter === chapter && !(steps[s.id] && steps[s.id].mastered))
    out[s.id] = master({ days: {}, ...steps[s.id], via: "sitzt" }, today);
  return out;
}
// Gemeistert, sobald es an `need` verschiedenen Tagen passiert ist.
// stage: "offline" (Eltern haken ab, nie eine Aufgabe im Spiel) oder "practice" (Nachspuren im Spiel).
function onDays(r, today, need, stage){
  const marks = Array.from(new Set([...(r && r.marks || []), today]));
  const n = { stage, days: {}, ...r, marks };
  return marks.length >= need && !n.mastered ? master(n, today) : n;
}
function offlineTick(r, today){ return onDays(r, today, 2, "offline"); }   // Eltern haken ab: an 2 Tagen
function traced(r, today){ return onDays(r, today, 3, "practice"); }        // Schreibschrift nachgespurt: an 3 Tagen, nie "falsch"
// Aufgaben pro Block: Start 8 (Mathe-Zeit) und 5 (Extra-Zeit); dann so viele, wie in ~10 bzw. ~7,5 Minuten passen,
// nach dem Median ihrer Zeit pro Aufgabe an den letzten 5 Spieltagen, immer 5–12.
const BLOCK = { math: { start: 8, seconds: 600 }, extra: { start: 5, seconds: 450 } };
function blockSize(kind, times){
  const dates = Array.from(new Set(times.map(t => t.date))).sort().slice(-5);
  const xs = times.filter(t => dates.includes(t.date)).map(t => t.seconds).sort((a, b) => a - b);
  if(!xs.length) return BLOCK[kind].start;
  const m = xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
  return Math.max(5, Math.min(12, Math.round(BLOCK[kind].seconds / m)));
}
const L = { POOL, addDays, place, master, review, start, taught, answer, chooseNew, dueReviews, sitzt, offlineTick, traced, blockSize };
if(typeof module !== "undefined" && module.exports) module.exports = L; else root.LERNEN = L;
})(this);
