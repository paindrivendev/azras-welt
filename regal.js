/* Das Bücherregal in ihrem Zimmer: Lese-Zeit (PLAN.md "Reading", Ticket 07). Sie sucht ein Buch aus (oder ihr eigenes
   Papierbuch), an Blitzwort-Tagen kommen zuerst 3–5 Wörter aus dem Buch, dann liest sie Seite für Seite; ein Wort
   antippen liest es vor (die Eltern sehen die Liste). Nach ~10 Minuten legt die Katze das Lesezeichen an ein
   Seitenende; nach dem ersten Lesen eines Buchs kommen 1–3 Aufgaben. Buchtexte werden nie vorgelesen. */
(function(root){
"use strict";
const R = root.LESEN, L = root.LERNEN, A = root.AUFGABEN, ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("buch");
const D = () => root.WELT.today(), katze = () => (S().katze || {}).name || "";
const sprich = t => root.WELT.sprich("katze", t);
// Ohne die Schritte, die sie übersprungen hat (Ticket 18).
const lernbar = () => root.TAG.lernbar(root.SKILLS || [], S().ausgelassen);
let lauf = null, uhr = null;
function sag(t){ el("buchC").innerHTML = `<span class="who">${esc(katze())}</span>${esc(t)}`; el("buchC").hidden = false; sprich(t); }
function heuteFertig(){ const h = S().heute; if(h.date === D() && !h.fertig.includes("lesen")) h.fertig.push("lesen"); }
// Heute gelesene Sekunden (über alle Bücher): das Lesezeichen kommt nach ~10 Minuten, nicht pro Buch.
function lesezeit(plus){ const h = S().heute; if(h.date !== D()) return 0; h.lesezeit = (h.lesezeit || 0) + (plus || 0); return h.lesezeit; }
function seite(html){ el("buchS").innerHTML = html; }
function knopf(text, fn){ const alt = el("buchGo"); if(alt) alt.closest(".aufgabe-fuss").remove(); el("buchS").insertAdjacentHTML("beforeend", `<div class="aufgabe-fuss"><button class="btn weiter" id="buchGo">${esc(text)}</button></div>`); el("buchGo").onclick = fn; }
function schliessen(){ if(lauf){ lauf.stop(); lauf = null; } clearTimeout(uhr); el("buchAus").hidden = true; box().hidden = true; }
const stufe = () => R.stufe(S().lesen, S().classAt.deutsch);
// ---------- Regal ----------
function oeffnen(){
  if(!root.BUECHER) return false;
  clearTimeout(uhr); if(lauf){ lauf.stop(); lauf = null; } el("buchAus").hidden = true;
  root.SPIEL && root.SPIEL.schliessen();
  box().hidden = false; el("buchC").hidden = true;
  const liste = R.regal(root.BUECHER, S().lesen, stufe());
  seite(`<h2 class="ui">Dein Bücherregal</h2><div class="regal">${liste.map(b => `<button class="buchkarte" data-buch="${b.id}"><span class="umschlag">${umschlag(b)}</span><span class="titel">${esc(R.text(b.titel, katze()))}</span>${(S().lesen.buecher[b.id] || {}).seite ? `<span class="zeichen" aria-label="Lesezeichen">🔖</span>` : ""}</button>`).join("")}
    <button class="buchkarte eigen" data-buch="eigen"><span class="umschlag"><span class="emoji">📖</span></span><span class="titel">Mein eigenes Buch</span></button></div>`);
  el("buchS").querySelectorAll("[data-buch]").forEach(b => b.onclick = () => b.dataset.buch === "eigen" ? eigenes() : waehlen(root.BUECHER.find(x => x.id === b.dataset.buch)));
  knopf("Zurück", schliessen);
  sag("Such dir ein Buch aus.");
  return true;
}
// Bild auf dem Umschlag und auf der linken Seite: Originalbild (offene Bücher), gezeichnete Szene (Westpark), sonst Emoji
const bildVon = p => p.abb ? `<img src="${esc(p.abb)}" alt="" draggable="false">` : p.szene && root.WELT.buchSzene ? root.WELT.buchSzene(p.szene) : `<span class="emoji">${esc(p.bild || "📘")}</span>`;
const umschlag = b => b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy" draggable="false">` : bildVon(R.seiten(b)[0]);
// ---------- Aufgaben im Buch (Blitzwörter vorher, Fragen danach) ----------
function aufgaben(liste, fertig){
  let i = 0, cur = null; const erg = { n: 0, alone: 0 }, weg = new Set(); // weg: übersprungene Schritte, ihre übrigen Aufgaben fallen aus
  seite(""); el("buchS").insertAdjacentHTML("beforeend", `<div id="buchA"></div>`);
  lauf = A.spielen(el("buchA"), { naechste: () => { while(liste[i] && weg.has(liste[i].schritt)) i++; return (cur = liste[i++]) ? { art: cur.art, item: cur.item } : null; },
    sag: (w, t) => sag(t), sprich, stumm: () => root.speechSynthesis && speechSynthesis.cancel(),
    ergebnis: r => { const s = S();
      // übersprungen: eine Frage zum Buch zählt nicht; gehört sie zu einem Schritt, ist der für immer weg (Ticket 18)
      if(r.skip){ if(cur.schritt){ if(!s.ausgelassen[cur.schritt]) s.ausgelassen[cur.schritt] = D(); weg.add(cur.schritt); ST.save(); } return; }
      erg.n++; if(r.alone) erg.alone++;
      if(cur.schritt){ if(!s.steps[cur.schritt]) s.steps[cur.schritt] = L.start(D()); s.steps[cur.schritt] = L.answer(s.steps[cur.schritt], D(), r.alone); }
      if(!s.played.includes(D())) s.played.push(D()); ST.save(); },
    fertig: () => { lauf = null; fertig(erg); } });
}
function waehlen(buch){
  // jeden Tag vor dem ersten Buch (Ticket 36); zählt nur, solange der Blitz-Schritt geübt wird oder fällig ist
  const s = S(), w = R.aufwaermen(s.steps, root.INHALT || { steps: {} }, lernbar(), D(), (r, d) => root.TAG.stufe(r, "ueben", d), root.SKILLS || []);
  if(s.heute.blitz !== D() && (buch.blitz || []).length){
    s.heute.blitz = D(); ST.save(); sag("Zuerst lesen wir ein paar Blitzwörter.");
    return aufgaben(R.blitz(buch, w.schritt, w.stufe), () => lesen(buch));
  }
  lesen(buch);
}
// ---------- Lesen ----------
function lesen(buch){
  const s = S(), lb = s.lesen.buecher[buch.id] = s.lesen.buecher[buch.id] || { seite: 0, fertig: 0, stufe: buch.stufe, aufgaben: { n: 0, alone: 0 } };
  // Quer zwei Seiten nebeneinander, hochkant eine; jede Seite: großes Bild, der Text darunter (Rückmeldung der Eltern:
  // die Seiten sollen voll sein wie in einem echten Buch). i = erste sichtbare Seite.
  const proBlick = () => innerWidth > innerHeight ? 2 : 1, sichtbar = () => P.slice(i, i + proBlick());
  const P = R.seiten(buch); let i = Math.min(lb.seite || 0, P.length - 1), t0 = 0; i -= i % proBlick();
  // Zeit der sichtbaren Seiten buchen (auch beim Zurückblättern: sie hat sie gelesen)
  const buchen = () => { const w = sichtbar().reduce((n, p) => n + p.woerter, 0), sek = R.seitenZeit((Date.now() - t0) / 1000);
    if(w){ s.lesen.seiten.push({ date: D(), buch: buch.id, woerter: w, sekunden: sek }); if(s.lesen.seiten.length > 2000) s.lesen.seiten.splice(0, s.lesen.seiten.length - 2000); }
    if(!s.played.includes(D())) s.played.push(D()); return lesezeit(sek); };
  el("buchC").hidden = true;
  // Aufhören: Lesezeichen an dieser Seite, Lese-Zeit zählt heute als erledigt (Rückmeldung der Eltern, Ticket 10)
  el("buchAus").hidden = false; el("buchAus").onclick = () => { if(!lauf) buchen(); lb.seite = i; heuteFertig(); ST.save(); schliessen(); };
  // Ein aufgeschlagenes Buch (Ticket 11): Umblättern über Ecke/Rand oder wischen; ein Wort antippen liest es vor.
  let richtung = "";
  const zurueck = () => { if(i > 0){ buchen(); i = Math.max(0, i - proBlick()); ST.save(); richtung = "dreht-zurueck"; zeige(); } };
  // erst in Wörter teilen, dann jedes Stück einzeln maskieren (Sonderzeichen im Katzennamen bleiben Text)
  const woerter = p => R.text(p.text, katze()).split(/([A-Za-zÄÖÜäöüß]+)/).map((t, k) => k % 2 ? `<span class="wort">${esc(t)}</span>` : esc(t)).join("");
  const blatt = (p, k, seite) => !p ? `<div class="blatt ${seite} leer"></div>` : p.lizenz
    ? `<div class="blatt ${seite} lizenz"><div class="bildflaeche klein">${umschlag(buch)}</div><div class="textflaeche"><p class="kapitel ui">Wer hat das Buch gemacht?</p>
        <p class="text">${esc(p.text)}<br><span class="klein">${esc(p.url)}<br>${esc(p.quelle)}</span></p></div><span class="nr">${k + 1}</span></div>`
    : `<div class="blatt ${seite}${p.woerter > 45 ? " lang" : p.woerter > 25 ? " mittel" : ""}"><div class="bildflaeche">${bildVon(p)}</div>
        <div class="textflaeche">${k === 0 ? `<p class="buchtitel ui">${esc(R.text(buch.titel, katze()))}</p>` : ""}${p.kapitel ? `<p class="kapitel ui">${esc(p.kapitel)}</p>` : ""}<p class="text">${woerter(p)}</p></div>
        <span class="nr">${k + 1}</span></div>`;
  const zeige = () => {
    const zwei = proBlick() === 2;
    seite(`<div class="buchoffen ${zwei ? "" : "einzeln"} ${richtung}">${blatt(P[i], i, zwei ? "links" : "einzeln")}${zwei ? blatt(P[i + 1], i + 1, "rechts") : ""}
      <button class="ecke links" id="zurueck" aria-label="Zurück"${i === 0 ? " hidden" : ""}></button><button class="ecke rechts" id="vor" aria-label="Weiter"></button></div>`);
    richtung = "";
    el("buchS").querySelectorAll(".wort").forEach(w => w.onclick = () => { const t = w.textContent; sprich(t); const W = S().lesen.woerter; W[t] = (W[t] || 0) + 1; ST.save(); });
    el("zurueck").onclick = zurueck; el("vor").onclick = blaettern;
    // wischen: nach links = weiter, nach rechts = zurück
    const b = el("buchS").querySelector(".buchoffen"); let x0 = null;
    b.addEventListener("pointerdown", e => { x0 = e.clientX; });
    b.addEventListener("pointerup", e => { if(x0 === null) return; const dx = e.clientX - x0; x0 = null; if(dx < -70) blaettern(); else if(dx > 70) zurueck(); });
    t0 = Date.now();
  };
  const blaettern = () => {
    const was = R.umblaettern({ sekunden: buchen(), seite: Math.min(i + proBlick(), P.length) - 1, anzahl: P.length });
    if(was === "weiter"){ i += proBlick(); lb.seite = i; ST.save(); richtung = "dreht-vor"; return zeige(); }
    if(was === "lesezeichen"){ lb.seite = i + proBlick(); heuteFertig(); ST.save(); el("buchAus").hidden = true; seite(`<div class="buchseite"><div class="bild">🔖</div></div>`); sag("Hier lege ich dein Lesezeichen hin."); return knopf("Fertig", schliessen); }
    ende();
  };
  // Buch zu Ende: erst die Fragen (nur beim ersten Lesen), dann zählt es als gelesen. Wer mittendrin geht, bleibt auf
  // der letzten Seite und bekommt die Fragen beim nächsten Mal. Lese-Zeit ist erst nach ~10 Minuten heute geschafft.
  const ende = () => {
    const t = R.nachDemBuch(buch, { ersteLesung: !lb.fertig, steps: s.steps, inhalt: root.INHALT || { steps: {} }, skills: lernbar(), today: D() });
    const schluss = erg => {
      el("buchAus").hidden = true; lb.fertig++; lb.seite = 0; lb.stufe = buch.stufe; if(erg) lb.aufgaben = { n: lb.aufgaben.n + erg.n, alone: lb.aufgaben.alone + erg.alone };
      s.lesen.stufe = R.aufsteigen(s.lesen, s.classAt.deutsch); const fertig = R.genug(lesezeit()); if(fertig) heuteFertig(); ST.save();
      seite(`<div class="buchseite"><div class="bild">📚</div></div>`); sag("Das war ein schönes Buch.");
      if(fertig) knopf("Fertig", schliessen); else knopf("Noch ein Buch", oeffnen); };
    if(!t.length) return schluss(null);
    sag("Ich habe noch eine Frage zum Buch.");
    aufgaben(t, schluss);
  };
  zeige();
}
// Ihr eigenes Papierbuch: das Spiel setzt nur das Lesezeichen nach ~10 Minuten; zählt als Lese-Zeit.
function eigenes(){
  seite(`<div class="buchseite"><div class="bild">📖</div></div>`);
  sag("Lies in deinem Buch, ich sage dir, wann das Lesezeichen hineinkommt.");
  clearTimeout(uhr);
  uhr = setTimeout(() => { const s = S(); s.lesen.eigenes.push(D()); if(!s.played.includes(D())) s.played.push(D()); heuteFertig(); ST.save();
    sag("Jetzt kannst du dein Lesezeichen hineinlegen."); knopf("Fertig", schliessen); }, R.LESEZEIT * 1000);
  knopf("Zurück", oeffnen);
}
root.REGAL = { oeffnen, schliessen, get offen(){ return !box().hidden; }, get lauf(){ return lauf; } };
})(this);
