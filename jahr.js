/* Garten und Jahreszeiten (Ticket 26, Rückmeldung der Eltern: "Garden and seasons"). Drei Blumentöpfe auf ihrer
   Fensterbank: säen, gießen, an jedem gegossenen Tag wächst die Blume eine Stufe; ohne Wasser wartet sie nur, sie welkt
   nie. Die Welt zeigt die Jahreszeit und die Feste nach dem Spieldatum. Spielstand in S.garten = {toepfe: [3 × {art,
   tage: [gegossene Tage]} | null]}. */
(function(root){
"use strict";
const SAMEN = { sonnenblume: "Sonnenblume", tulpe: "Tulpe", kresse: "Kresse" };
const BLUETE = 4;
const tag = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
function jahreszeit(d){ const m = +d.slice(5, 7); return m >= 3 && m <= 5 ? "fruehling" : m >= 6 && m <= 8 ? "sommer" : m >= 9 && m <= 11 ? "herbst" : "winter"; }
// Ostersonntag (gregorianisch, Anonymer Algorithmus)
function ostern(y){
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mon = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  return `${y}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
// Erster Advent: der Sonntag vom 27. November bis 3. Dezember.
function ersterAdvent(y){ const d = new Date(Date.UTC(y, 10, 27)); while(d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
const FESTE = { martin: "Sankt Martin", nikolaus: "Nikolaus", advent: "Advent", weihnachten: "Weihnachten", silvester: "Silvester", fasching: "Fasching", ostern: "Ostern" };
function fest(d){
  const y = +d.slice(0, 4), md = d.slice(5), o = ostern(y), a = ersterAdvent(y), f = id => ({ id, name: FESTE[id] });
  if(md === "11-11") return f("martin");
  if(md === "12-06") return { ...f("nikolaus"), kerzen: d >= a ? 1 + Math.floor((Date.parse(d) - Date.parse(a)) / 6048e5) : 0 };
  if(md >= "12-24" && md <= "12-26") return f("weihnachten");
  if(md === "12-31" || md === "01-01") return f("silvester");
  if(d >= a && md <= "12-23") return { ...f("advent"), kerzen: Math.min(4, 1 + Math.floor((Date.parse(d) - Date.parse(a)) / 6048e5)) };
  if(d >= tag(o, -52) && d <= tag(o, -47)) return f("fasching"); // Unsinniger Donnerstag bis Faschingsdienstag
  if(d >= tag(o, -2) && d <= tag(o, 1)) return f("ostern");
  return null;
}
// ---------- Blumentöpfe ----------
function norm(g){
  const t = g && Array.isArray(g.toepfe) ? g.toepfe : [];
  return { toepfe: [0, 1, 2].map(i => { const p = t[i]; return p && typeof p === "object" && SAMEN[p.art] ? { art: p.art, tage: (Array.isArray(p.tage) ? p.tage : []).filter(x => typeof x === "string") } : null; }) };
}
const stufe = p => p ? Math.min(BLUETE, new Set(p.tage).size) : 0;
const gegossen = (p, d) => !!p && p.tage.includes(d);
function pflanzen(g, i, art, d){ const n = norm(g); if(!SAMEN[art] || n.toepfe[i] !== null || i < 0 || i > 2) return null; n.toepfe[i] = { art, tage: [d] }; return n; }
function giessen(g, i, d){ const n = norm(g), p = n.toepfe[i]; if(p && !p.tage.includes(d)) p.tage.push(d); return n; }
function ausgraben(g, i){ const n = norm(g); n.toepfe[i] = null; return n; }
const J = { SAMEN, BLUETE, FESTE, jahreszeit, ostern, fest, norm, stufe, gegossen, pflanzen, giessen, ausgraben };
if(typeof module !== "undefined" && module.exports){ module.exports = J; return; }

// ---------- Bilder ----------
// Eine Pflanze im Topf um (0,0) (Topfrand), Stufe 0–4, etwa 120 hoch.
function pflanzeBild(p){
  const st = stufe(p), art = p && p.art; let s = "";
  if(st >= 1) s += `<path d="M0,0 V${-14 - st * 16}" stroke="#4e9a4a" stroke-width="${art === "kresse" ? 0 : 5}"/>`;
  if(art === "kresse" && st >= 1) s += [...Array(st * 4)].map((_, i) => `<path d="M${-30 + (i * 17) % 60},0 v${-8 - st * 5 - (i % 3) * 3}" stroke="#4e9a4a" stroke-width="3"/><ellipse cx="${-30 + (i * 17) % 60}" cy="${-10 - st * 5 - (i % 3) * 3}" rx="5" ry="3" fill="#6dbb63"/>`).join("");
  else {
    if(st >= 1) s += `<ellipse cx="-9" cy="${-10 - st * 6}" rx="10" ry="5" fill="#6dbb63" transform="rotate(-25 -9 ${-10 - st * 6})"/><ellipse cx="9" cy="${-12 - st * 6}" rx="10" ry="5" fill="#6dbb63" transform="rotate(25 9 ${-12 - st * 6})"/>`;
    if(st === 3) s += `<ellipse cy="${-70}" rx="9" ry="13" fill="${art === "tulpe" ? "#e5607e" : "#9fd67f"}"/>`;
    if(st >= BLUETE && art === "sonnenblume") s += [...Array(12)].map((_, i) => `<ellipse cx="0" cy="-104" rx="7" ry="18" fill="#f6d64a" transform="rotate(${i * 30} 0 -84)"/>`).join("") + `<circle cy="-84" r="14" fill="#8a5a3c"/>`;
    if(st >= BLUETE && art === "tulpe") s += `<path d="M-16,-92 Q-18,-62 0,-60 Q18,-62 16,-92 L8,-80 L0,-94 L-8,-80Z" fill="#e5453f"/>`;
  }
  return s + `<path d="M-40,0 H40 L32,46 H-32Z" fill="#c97a3e"/><rect x="-44" y="-6" width="88" height="12" rx="4" fill="#d98d50"/><ellipse cy="-2" rx="36" ry="5" fill="#6b4a2e"/>`;
}
// ---------- Im Browser: die Blumentöpfe auf ihrer Fensterbank ----------
const ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("beet");
const heute = () => root.WELT.today();
function sag(t){ el("beC").innerHTML = `<span class="who">${esc((S().katze || {}).name || "")}</span>${esc(t)}`; el("beC").hidden = false; root.WELT.sprich("katze", t); }
function stand(){ S().garten = norm(S().garten); return S().garten; }
function zu(){ box().hidden = true; }
function oeffnen(nachricht, giesst){
  root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; el("beAus").onclick = () => { zu(); root.WELT.zeige(); };
  const g = stand(), d = heute();
  el("beS").innerHTML = `<h2 class="ui">Meine Blumen</h2><div class="kochstelle"><svg viewBox="0 0 1000 420"><rect x="40" y="330" width="920" height="40" rx="12" fill="#e0c49a"/>
    ${g.toepfe.map((p, i) => `<g transform="translate(${200 + i * 300} 290) scale(1.5)">${pflanzeBild(p)}</g>${giesst === i ? `<g transform="translate(${260 + i * 300} 80) rotate(30)"><path d="M-40,-20 H30 V40 H-40Z" fill="#4f9fc9"/><path d="M30,-6 L80,-30" stroke="#4f9fc9" stroke-width="12"/>${[0, 1, 2].map(k => `<circle class="tropfen" style="animation-delay:${k * .2}s" cx="${86 + k * 6}" cy="${-20 + k * 14}" r="6" fill="#7cc6ea"/>`).join("")}</g>` : ""}`).join("")}</svg></div>
    <div class="toepfe">${g.toepfe.map((p, i) => `<div class="topf">${!p ? Object.entries(SAMEN).map(([a, n]) => `<button class="btn klein" data-saat="${i}:${a}">${n}</button>`).join("")
      : stufe(p) >= BLUETE ? `<span class="titel">${SAMEN[p.art]}</span><button class="btn klein hell" data-raus="${i}">Neu pflanzen</button>`
      : gegossen(p, d) ? `<span class="titel">${SAMEN[p.art]}</span><span class="hinweis">Heute gegossen</span>` : `<span class="titel">${SAMEN[p.art]}</span><button class="btn klein" data-giess="${i}">Gießen</button>`}</div>`).join("")}</div>`;
  el("beS").querySelectorAll("[data-saat]").forEach(b => b.onclick = () => { const [i, a] = b.dataset.saat.split(":"); const n = pflanzen(stand(), +i, a, heute()); if(!n) return;
    S().garten = n; ST.save(); oeffnen(`Eine ${SAMEN[a]}! Ich habe sie schon gegossen. Morgen wächst sie weiter.`); });
  el("beS").querySelectorAll("[data-giess]").forEach(b => b.onclick = () => { const i = +b.dataset.giess; S().garten = giessen(stand(), i, heute()); ST.save();
    root.AUFGABEN && root.AUFGABEN.KLANG && root.AUFGABEN.KLANG.chime(); oeffnen(stufe(stand().toepfe[i]) >= BLUETE ? "Schau, sie blüht!" : "Danke! Jetzt wächst sie ein Stück.", i); });
  el("beS").querySelectorAll("[data-raus]").forEach(b => b.onclick = () => { S().garten = ausgraben(stand(), +b.dataset.raus); ST.save(); oeffnen("Der Topf ist frei. Was pflanzen wir?"); });
  const leer = g.toepfe.some(p => !p), durstig = g.toepfe.some(p => p && stufe(p) < BLUETE && !gegossen(p, d));
  sag(nachricht || (durstig ? "Deine Blumen haben Durst." : leer ? "Was möchtest du pflanzen?" : "Deine Blumen sehen schön aus."));
}
root.JAHR = { ...J, pflanzeBild, oeffnen, zu, get offen(){ return !box().hidden; } };
})(this);
