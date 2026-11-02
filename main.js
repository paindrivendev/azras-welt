/* Start von Azras Welt: wartet auf den Spielstand, meldet Speicher-Probleme. Danach übernimmt welt.js. */
(function(){
"use strict";
const $ = s => document.querySelector(s), ST = window.STATE;
ST.ready.then(() => { $("#startBtn").textContent = "Los geht's!"; $("#startBtn").disabled = false; });
// Der Knopf ist auch das erste Tippen, das der Browser für die Stimme braucht.
$("#startBtn").onclick = () => { $("#app").hidden = true; window.WELT.start(); };
const told = new Set();
ST.onProblem = p => { if(told.has(p)) return; told.add(p);
  $("#note").textContent = p==="konto" ? "Der Spielstand konnte gerade nicht ins Konto gespeichert werden. Ich versuche es weiter." : "Der Spielstand kann auf diesem Gerät nicht gespeichert werden. Bitte einem Erwachsenen Bescheid sagen.";
  $("#note").hidden = false; };
})();
