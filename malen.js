/* Malen am Basteltisch (Ticket 27, Eltern: "her room play some stuff"). Reines Spiel: sie malt mit Finger oder Maus,
   ein fertiges Bild hängt an der Wand ihres Zimmers. Gespeichert als kleines JPEG in S.bilder = [{url, date}], das
   neueste zuerst, höchstens drei (mehr Platz ist an der Wand nicht). */
(function(root){
"use strict";
const MAX = 3, ECHT = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const norm = b => (Array.isArray(b) ? b : []).filter(x => x && typeof x === "object" && typeof x.url === "string" && ECHT.test(x.url) && typeof x.date === "string")
  .map(x => ({ url: x.url, date: x.date })).slice(0, MAX);
const aufhaengen = (b, url, date) => typeof url === "string" && ECHT.test(url) ? [{ url, date }, ...norm(b)].slice(0, MAX) : norm(b);
const M = { MAX, norm, aufhaengen };
if(typeof module !== "undefined" && module.exports){ module.exports = M; return; }

// ---------- Im Browser: Leinwand, Farben, Aufhängen ----------
const ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("malen");
const FARBEN = ["#2b2140", "#e5453f", "#f08a5d", "#f2c94c", "#6dbb63", "#4f9fc9", "#9b6fd0", "#e5607e", "#8a5a3c"];
let farbe = FARBEN[1], dicke = 14, gemalt = false;
function sag(t){ el("maC").innerHTML = `<span class="who">${esc((S().katze || {}).name || "")}</span>${esc(t)}`; el("maC").hidden = false; root.WELT.sprich("katze", t); }
function zu(){ box().hidden = true; }
function knoepfe(){
  el("maS").querySelectorAll("[data-farbe]").forEach(b => b.classList.toggle("an", b.dataset.farbe === farbe));
  el("maS").querySelectorAll("[data-dicke]").forEach(b => b.classList.toggle("an", +b.dataset.dicke === dicke));
}
function oeffnen(frei){
  root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; gemalt = false;
  el("maAus").onclick = () => { zu(); root.WELT.zeige(); };
  el("maS").innerHTML = `<h2 class="ui">Malen</h2><div class="leinwand"><canvas id="maBild" width="800" height="520"></canvas></div>
    <div class="farben">${FARBEN.map(f => `<button class="farbe" data-farbe="${f}" style="background:${f}" aria-label="Farbe"></button>`).join("")}
      <button class="farbe gummi" data-farbe="#ffffff" aria-label="Radiergummi">⌫</button></div>
    <div class="werkzeug">${[6, 14, 30].map(d => `<button class="dicke" data-dicke="${d}" aria-label="Pinsel"><span class="punkt" style="width:${d}px;height:${d}px"></span></button>`).join("")}
      <button class="btn klein hell" id="maNeu">Neues Blatt</button><button class="btn klein" id="maHin">Aufhängen</button>
      ${frei ? `<button class="btn klein hell" id="maLernen">Lieber eine Aufgabe</button>` : ""}</div>`;
  const c = el("maBild"), g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.lineCap = g.lineJoin = "round";
  let last = null;
  const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  const strich = p => { g.strokeStyle = farbe; g.lineWidth = dicke; g.beginPath(); g.moveTo(...(last || p)); g.lineTo(...p); g.stroke(); last = p; gemalt = true; };
  c.onpointerdown = e => { try{ c.setPointerCapture(e.pointerId); }catch(_){} last = null; strich(pt(e)); };
  c.onpointermove = e => { if(last) strich(pt(e)); };
  c.onpointerup = c.onpointercancel = () => { last = null; };
  el("maS").querySelectorAll("[data-farbe]").forEach(b => b.onclick = () => { farbe = b.dataset.farbe; knoepfe(); });
  el("maS").querySelectorAll("[data-dicke]").forEach(b => b.onclick = () => { dicke = +b.dataset.dicke; knoepfe(); });
  el("maNeu").onclick = () => { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); gemalt = false; sag("Ein neues Blatt. Was malst du?"); };
  el("maHin").onclick = () => {
    if(!gemalt) return sag("Male erst etwas, dann hänge ich es auf.");
    const k = document.createElement("canvas"); k.width = 240; k.height = 156; k.getContext("2d").drawImage(c, 0, 0, k.width, k.height);
    S().bilder = aufhaengen(S().bilder, k.toDataURL("image/jpeg", .7), root.WELT.today()); ST.save();
    root.AUFGABEN && root.AUFGABEN.KLANG && root.AUFGABEN.KLANG.chime();
    zu(); root.WELT.katzeSagt("Wie schön! Dein Bild hängt jetzt an der Wand.");
  };
  if(frei) el("maLernen").onclick = () => { zu(); frei(); };
  knoepfe(); sag("Mal, was du magst. Wenn du fertig bist, hänge ich es an die Wand.");
}
root.MALEN = { ...M, oeffnen, zu, get offen(){ return !box().hidden; } };
})(this);
