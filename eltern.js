/* Eltern-Bereich von Azras Welt (Englisch, PLAN.md "Parent area"): Klassen-Kapitel, Offline-Schritte abhaken,
   "allein gelöst" pro Schritt. Erreichbar über langes Drücken auf das Zahnrad oben links. Azra sieht nie Zahlen.
   Reiner Teil oben (node-Tests), Bildschirm unten. */
(function(root){
"use strict";
const L = typeof module !== "undefined" && module.exports ? require("./lernen.js") : root.LERNEN;
const BUCH = { deutsch: { name: "Karibu", max: 12 }, mathe: { name: "Welt der Zahl", max: 15 } };
const FAECHER = ["mathe", "deutsch", "hsu"];
// Klassen-Kapitel setzen; neue Schritte richten sich ab dem nächsten Plan danach (tag.js → chooseNew).
function setChapter(S, fach, ch){
  if(!BUCH[fach]) throw new Error("no chapter for " + fach);
  S.classAt = { ...S.classAt, [fach]: Math.max(1, Math.min(BUCH[fach].max, Math.round(+ch) || 1)) };
}
// Offline-Schritt heute erledigt (Eltern haken ab); an 2 verschiedenen Tagen = gemeistert.
function tick(S, id, today){ S.steps = { ...S.steps, [id]: L.offlineTick(S.steps[id], today) }; }
function status(r){
  if(r.mastered) return `mastered ${r.masteredOn}` + (r.rung >= L.POOL ? " · in the review pool" : r.due ? ` · next check ${r.due}` : "");
  if(r.marks && r.marks.length) return "ticked on " + r.marks.join(", ");
  return { try: "trying (first 2 items)", teach: "her cat is showing it" }[r.stage] || "practising";
}
// Englischer Name aus dem Schritt-Inhalt (Ticket 06), sonst der Lehrplan-Titel aus skills.js (Deutsch).
const titel = (s, inhalt) => (inhalt && inhalt.steps[s.id] && inhalt.steps[s.id].en) || s.parentTitle;
const order = (a, b) => FAECHER.indexOf(a.subject) - FAECHER.indexOf(b.subject) || a.order - b.order;
// Jeder angefangene Schritt mit seinen Tagen: Aufgaben und wie viele davon allein gelöst.
function record(skills, steps, inhalt){
  return skills.filter(s => steps[s.id]).sort(order).map(s => { const r = steps[s.id];
    return { id: s.id, subject: s.subject, chapter: s.chapter, title: titel(s, inhalt), status: status(r), mastered: !!r.mastered,
      days: Object.entries(r.days || {}).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, n: d.n, alone: d.alone })) }; });
}
// Offline-Schritte aus den Schritt-Inhalten (Ticket 06: {offline: true}) zum Abhaken.
function offline(skills, steps, inhalt, today){
  return skills.filter(s => inhalt.steps[s.id] && inhalt.steps[s.id].offline).sort(order).map(s => { const r = steps[s.id] || {};
    return { id: s.id, subject: s.subject, chapter: s.chapter, title: titel(s, inhalt), marks: r.marks || [], heute: (r.marks || []).includes(today), mastered: !!r.mastered }; });
}
// Was Azra übersprungen hat (Ticket 18), das Älteste zuerst; Schritte, die es im Lehrplan nicht mehr gibt, fallen weg.
function ausgelassen(skills, aus, inhalt){
  return skills.filter(s => aus[s.id]).sort(order).map(s => ({ id: s.id, subject: s.subject, chapter: s.chapter, title: titel(s, inhalt), date: aus[s.id] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
const E = { BUCH, setChapter, tick, status, record, offline, ausgelassen };
if(typeof module !== "undefined" && module.exports){ module.exports = E; return; }

// ---------- Bildschirm ----------
const ST = root.STATE, $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const SUBJ = { mathe: "Maths", deutsch: "Deutsch", hsu: "HSU" };
const panel = $("#eltern"), gear = $("#gear");
let note = "";
// Was die Auswahl zeigt, ist auch das, was "Save" speichert (ein Kapitel als Text oder außerhalb des Buchs wird eingepasst).
const kapitel = (S, f) => Math.max(1, Math.min(BUCH[f].max, Math.round(+S.classAt[f]) || 1));
function render(){
  const S = root.S, skills = root.SKILLS || [], today = root.WELT.today(), inhalt = root.INHALT || { steps: {} };
  const rec = record(skills, S.steps, inhalt), off = offline(skills, S.steps, inhalt, today);
  let h = `<header><h1>Parent area</h1><button class="eb" data-e="zu">Back to the game</button></header>
  <p class="muted">Azra never sees these numbers. "Alone" = right on the first try, before any hint.</p>${note ? `<p class="ok" role="status">${esc(note)}</p>` : ""}${heuteTeil(skills, inhalt)}${ausTeil(skills, inhalt)}${sicherungTeil()}
  <h2>Class chapters</h2><div class="erow">${["deutsch", "mathe"].map(f => `<label>${BUCH[f].name} (${SUBJ[f]})
    <select id="k-${f}">${Array.from({ length: BUCH[f].max }, (_, i) => `<option${kapitel(S, f) === i + 1 ? " selected" : ""}>${i + 1}</option>`).join("")}</select></label>`).join("")}
    <button class="eb" data-e="kapitel">Save</button></div>
  <p class="muted">New steps never go past these chapters. HSU follows the school month by itself.</p>
  <h2>Offline steps</h2>`;
  h += off.length ? `<table><tr><th>Step</th><th>Ticked</th><th></th></tr>${off.map(r => `<tr><td>${esc(r.title)}<br><span class="muted">${SUBJ[r.subject]} · chapter ${r.chapter}</span></td>
    <td>${r.mastered ? "mastered" : r.marks.length ? esc(r.marks.join(", ")) : "–"}</td><td>${r.mastered ? "" : `<button class="eb" data-e="tick:${r.id}"${r.heute ? " disabled" : ""}>${r.heute ? "Ticked today" : "Done today"}</button>`}</td></tr>`).join("")}</table>
    <p class="muted">Tick on two separate days and the step counts as mastered.</p>`
    : `<p class="muted">No offline steps yet. They come with the step content.</p>`;
  h += lesenTeil(S);
  h += `<h2>Record</h2>`;
  if(!rec.length) h += `<p class="muted">Nothing started yet.</p>`;
  for(const f of FAECHER){ const rows = rec.filter(r => r.subject === f); if(!rows.length) continue;
    h += `<details open><summary>${SUBJ[f]}: ${rows.length} started, ${rows.filter(r => r.mastered).length} mastered</summary><table><tr><th>Ch.</th><th>Step</th><th>Status</th><th>Days (alone / items)</th></tr>`
      + rows.map(r => `<tr><td>${r.chapter}</td><td>${esc(r.title)}</td><td>${esc(r.status)}</td><td>${r.days.map(d => `${d.date}: ${d.alone} / ${d.n}`).join("<br>") || "–"}</td></tr>`).join("")
      + `</table></details>`; }
  panel.innerHTML = `<div class="ewrap">${h}</div>`;
}
// Heute: pro Fach weglassen oder gleich die nächste Stunde; der nächste Tag auf Knopfdruck (Rückmeldung der Eltern).
function heuteTeil(skills, inhalt){
  const P = root.SPIEL, p = P && P.plan(); if(!p) return "";
  const h = root.S.heute, step = id => { const s = skills.find(k => k.id === id); return s ? titel(s, inhalt) : ""; };
  const zeilen = ["mathe", "extra"].filter(k => !p[k].leer || h.weg.includes(k)).map(k => { const b = p[k], f = P.FACH[b.fach];
    const stand = h.fertig.includes(k) ? "done" : h.weg.includes(k) ? "skipped today" : h.spielen === true ? "not today (just playing)" : h.verschoben.includes(k) ? "put off until later" : "open";
    return `<tr><td>${esc(SUBJ[b.fach])}<br><span class="muted">${esc(b.neu ? "new: " + step(b.neu) : "practice")}</span></td><td>${stand}</td>
      <td><button class="eb" data-e="weg:${k}"${h.fertig.includes(k) || h.weg.includes(k) ? " disabled" : ""}>Skip ${esc(f ? f.name : SUBJ[b.fach])} today</button>
      <button class="eb" data-e="neu:${k}">Next lesson now</button></td></tr>`; }).join("");
  const spielt = P.nurSpielen ? `<p><b>Azra chose "Nur spielen" (just play) today.</b> Nothing invites her to learn until tomorrow, unless she taps "Doch lernen".</p>
    <div class="erow"><button class="eb" data-e="lernen">Bring learning back today</button></div>` : "";
  return `<h2>Today (${esc(root.WELT.today())})</h2>${spielt}${zeilen ? `<table><tr><th>Subject</th><th>Status</th><th></th></tr>${zeilen}</table>` : `<p class="muted">Nothing planned for today.</p>`}
  <p class="muted">Skip: no German (or maths) today, no coins; tomorrow it goes on where it stopped. Next lesson: today's steps of that subject wait, the following lesson comes now. Azra has the same two buttons in each section.</p>
  <div class="erow"><button class="eb" data-e="tag">Start next day</button></div>
  <p class="muted">Starts tomorrow's plan now (new letter, new sections). When the real calendar reaches that day it simply goes on from there.</p>`;
}
// Übersprungen (Ticket 18): kommt nie von selbst wieder; die Eltern sehen es und holen es zurück, wenn es gerichtet ist.
function ausTeil(skills, inhalt){
  const rows = ausgelassen(skills, root.S.ausgelassen, inhalt);
  return `<h2>Skipped by Azra</h2>${rows.length ? `<table><tr><th>Step</th><th>Skipped on</th><th></th></tr>${rows.map(r => `<tr><td>${esc(r.title)}<br><span class="muted">${SUBJ[r.subject]} · chapter ${r.chapter}</span></td>
    <td>${esc(r.date || "–")}</td><td><button class="eb" data-e="zurueck:${r.id}">Bring back</button></td></tr>`).join("")}</table>` : `<p class="muted">Nothing skipped.</p>`}
  <p class="muted">When Azra presses "überspringen", that whole step (all its exercises) is gone for good, and steps that needed it no longer wait for it. Bring back puts it into her plan again.</p>`;
}
// Lese-Zeit: Stufe, Tempo, angetippte Wörter, Bücher mit Lizenz (Ticket 07).
// Sicherung (Ticket 29): nur ohne claude.ai-Konto (GitHub, Tablet), denn dort lebt der Spielstand nur im Browser.
function sicherungTeil(){
  if(root.claude) return "";
  return `<h2>Backup</h2><p class="muted">On this tablet her progress lives only in Chrome. If Chrome's site data is cleared, it is gone. Save a backup now and then (it goes to Downloads); restore it here or on a new tablet.</p>
  <div class="erow"><button class="eb" data-e="sichern">Save a backup</button><button class="eb" data-e="laden">Restore from a backup</button><input type="file" id="k-datei" accept=".json,application/json" hidden></div>`;
}
function lesenTeil(S){
  const R = root.LESEN, B = root.BUECHER; if(!R || !B) return "";
  const l = S.lesen, st = R.stufe(l, S.classAt.deutsch), tempo = R.tempo(l.seiten).slice(-10);
  const woerter = Object.entries(l.woerter).sort((a, b) => b[1] - a[1]).slice(0, 30);
  return `<h2>Reading</h2><div class="erow"><label>Reading level (1–5)<select id="k-lesen">${[1, 2, 3, 4, 5].map(n => `<option${st === n ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <button class="eb" data-e="lesestufe">Save</button></div>
  <p class="muted">Now level ${st}. Without your choice it is capped by the Karibu chapter (1–2 → 2, 3–4 → 3, 5–6 → 4, 7+ → 5) and goes up after 3 books read with the questions mostly alone. Setting it here overrides the cap.</p>
  <p><b>Speed (words per minute, aloud or silent):</b> ${tempo.length ? tempo.map(t => `${t.date}: ${t.wpm}`).join(" · ") : "no pages yet"}</p>
  <p><b>Words she tapped to hear:</b> ${woerter.length ? woerter.map(([w, n]) => `${esc(w)}${n > 1 ? ` (${n})` : ""}`).join(", ") : "none yet"}</p>
  <p><b>Her own paper book:</b> ${l.eigenes.length ? esc(l.eigenes.join(", ")) : "not yet"}</p>
  <details><summary>Books on the shelf (${B.length})</summary><table><tr><th>Lv.</th><th>Book</th><th>Read</th><th>Licence</th></tr>${B.map(b => { const r = l.buecher[b.id] || {};
    return `<tr><td>${b.stufe}</td><td>${esc(b.titel)}<br><span class="muted">${esc(b.en || "")}</span></td><td>${r.fertig ? r.fertig + "×" : r.seite ? "bookmark" : "–"}</td>
      <td>${b.lizenz ? `<a href="${esc(b.lizenz.url)}" target="_blank" rel="noopener">${esc(b.lizenz.name)}</a> · <a href="${esc(b.lizenz.quelle)}" target="_blank" rel="noopener">source</a><br><span class="muted">${esc(b.lizenz.text)}</span>` : "Westpark book (written for the game)"}</td></tr>`; }).join("")}</table></details>`;
}
const ACT = {
  lesestufe(){ root.S.lesen.stufe = +$("#k-lesen").value; root.S.lesen.vonHand = true; ST.save(); note = "Saved. Reading level set by hand."; render(); },
  zu(){ panel.hidden = true; note = ""; if(root.SPIEL && !root.SPIEL.offen) root.WELT.zeige(); },
  weg(k){ const P = root.SPIEL; if(P.zeit === k) P.schliessen(); P.heuteNicht(k); note = "Skipped for today."; render(); },
  neu(k){ const P = root.SPIEL; if(P.zeit === k) P.schliessen(); note = P.naechsteStunde(k) ? "The next lesson is ready. Azra finds it in today's letter or by tapping her cat." : "There is no other lesson for this subject today, so it is skipped for today."; render(); },
  lernen(){ root.SPIEL.spielen(false); note = "Learning is back for today."; render(); },
  tag(){ root.SPIEL.neuerTag(); note = "A new day has started."; render(); },
  zurueck(id){ delete root.S.ausgelassen[id]; ST.save(); note = "Brought back. It is in her plan again."; render(); },
  kapitel(){ for(const f of ["deutsch", "mathe"]) setChapter(root.S, f, $("#k-" + f).value); ST.save(); note = "Saved. New steps follow these chapters."; render(); },
  sichern(){ const d = root.WELT.today(), a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ST.sicherung(d)], { type: "application/json" })); a.download = `azras-welt-${d}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); note = `Backup saved as azras-welt-${d}.json (in Downloads).`; render(); },
  laden(){ const i = $("#k-datei"); i.onchange = () => { const f = i.files[0]; if(!f) return;
    f.text().then(t => { note = ST.wiederherstellen(t) ? "Restored. Her progress from the backup is back." : "That file is not an Azras Welt backup. Nothing changed."; render(); }); }; i.click(); },
  tick(id){ tick(root.S, id, root.WELT.today()); ST.save(); render(); }
};
panel.addEventListener("click", e => { const el = e.target.closest("[data-e]"); if(!el || el.disabled) return; const [a, arg] = el.dataset.e.split(":"); ACT[a](arg); });
function open(){ if(root.speechSynthesis) speechSynthesis.cancel(); note = ""; render(); panel.hidden = false; }
// Langes Drücken (1,2 s) öffnet; kurzes Tippen tut nichts, damit Azra nicht hineinstolpert.
let pressT = null;
gear.addEventListener("pointerdown", e => { if(!e.isPrimary || e.button > 0) return; clearTimeout(pressT); pressT = setTimeout(() => { pressT = null; open(); }, 1200); });
const endPress = () => { clearTimeout(pressT); pressT = null; };
// Mit der Maus: 3 schnelle Klicks öffnen auch (Rückmeldung der Eltern); ein einzelner tut nichts.
let klicks = [];
gear.addEventListener("click", () => { const t = Date.now(); klicks = [...klicks.filter(k => t - k < 900), t]; if(klicks.length >= 3){ klicks = []; open(); } });
["pointerup", "pointerleave", "pointercancel"].forEach(ev => gear.addEventListener(ev, endPress));
gear.addEventListener("contextmenu", e => e.preventDefault());
root.ELTERN = { ...E, open, render };
})(this);
