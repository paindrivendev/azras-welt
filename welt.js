/* Die Welt: ihr Zimmer, die Westpark-Karte, die sechs Orte, die Katzenwahl am ersten Tag und die Briefe der ersten Woche.
   Bildschirm per Adresse (#zimmer, #karte, #brief, #ort/post …). Alles Gesagte wird gesprochen und steht im Bild. */
(function(){
"use strict";
const B = window.BILD, W = window.WOCHE, ST = window.STATE, G = window.GEHEN, S = () => window.S;
const { hot, spr, poly, box, roof, floor, shadowed, ping, figur } = B;
const NB = Object.fromEntries(W.NACHBARN.map(n => [n.id, n]));
const AM = Object.fromEntries(W.NACHBARN.map(n => [n.ort, n]));
const pad = n => String(n).padStart(2, "0");
function today(){ const d = new Date(), echt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return window.TAG && window.S ? TAG.spielDatum(echt, S().spielTag) : echt; } // "Start next day" der Eltern
const vorname = n => n.name.split(" ")[0];
const money = c => (c / 100).toFixed(2).replace(".", ",") + " €";
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Was gerade zu sehen ist (wird nicht gespeichert). xy: wo Azra im Zimmer oder am Ort steht, kxy: auf der Karte, wenn sie
// frei herumläuft (sonst am Haus pos); links: sie schaut nach links.
const V = { screen: "zimmer", msg: null, cat: null, ort: null, schritt: null, pos: "zuhause", xy: [5.6, 6.4], wo: "zimmer", kxy: null, links: false };
const app = document.querySelector("#world");

// ---------- Stimme: nur die eingebaute Browser-Stimme, jede Figur mit eigener Tonhöhe und Geschwindigkeit ----------
const KATZE_STIMME = { pitch: 1.5, rate: 1.0 };
let voice = null;
function deVoice(){
  if(voice || !window.speechSynthesis) return voice;
  const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang));
  return voice = vs.find(v => /natural|online/i.test(v.name)) || vs[0] || null;
}
function sprich(who, text){
  if(!window.speechSynthesis || !document.querySelector("#eltern").hidden) return; // nie über den Eltern-Bereich
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), st = who === "katze" ? KATZE_STIMME : NB[who] ? NB[who].stimme : { pitch: 1, rate: 1 };
    u.lang = "de-DE"; u.pitch = st.pitch; u.rate = st.rate; const v = deVoice(); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch(e){}
}
let AC; function klimper(){ try{ AC = AC || new AudioContext(); const t = AC.currentTime; [1760, 2350].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, t + i * .07); g.gain.exponentialRampToValueAtTime(.001, t + i * .07 + .35); o.connect(g).connect(AC.destination); o.start(t + i * .07); o.stop(t + i * .07 + .4); }); }catch(e){} }
function say(who, text){ if(who === "katze" && SP() && SP().offen) return SP().katze(text); if(who === "katze") V.cat = text; else V.msg = { who, text }; sprich(who, text); render(); }

// ---------- Was heute los ist ----------
const tag = () => W.heute(S(), today());
const SP = () => window.SPIEL;
// Der Brief des Tages: in der ersten Woche stellt sich ein Nachbar vor, danach lädt der Plan ein (spiel.js).
function briefDaten(){
  const id = tag().brief;
  if(id) return { key: id, von: id, ort: NB[id].ort, zeilen: NB[id].brief };
  return SP() ? SP().brief() : null;
}
const briefWartet = () => { const b = briefDaten(); return b && !S().gelesen[b.key] ? b : null; };
function tipp(){
  if(SP() && SP().offen) return SP().tipp();
  if(V.screen === "ort"){
    if(V.schritt === "hallo") return `Tipp auf ${vorname(AM[V.ort])}.`;
    if(V.schritt === "job") return "Schau, was leuchtet.";
    return "Über die Karte kommst du überall hin.";
  }
  if(briefWartet()) return "Im Briefkasten liegt ein Brief für dich.";
  const t = tag(); if(t.brief) return `${vorname(NB[t.brief])} wartet ${NB[t.brief].wo} auf dich.`;
  const ng = naechsteGeschichte(), n = ng && AM[ng.g.schritte[ng.i].wo];
  if(ng && (!SP() || SP().nurSpielen || !SP().einladungen().length)) return ng.i === 0 ? `${vorname(NB[ng.g.von])} hat etwas erlebt. Schau doch mal ${NB[ng.g.von].wo} vorbei.` : `Weißt du noch? ${ng.g.titel}. Schau mal ${n.wo}.`;
  return (SP() && SP().tipp()) || "Schau dich ruhig um, ich bin bei dir.";
}

// ---------- Rahmen: Knopfleiste links, Geldbeutel, Sprechblasen ----------
function bub(x, y, w, who, text){ return text ? `<foreignObject x="${x}" y="${y}" width="${w}" height="320" style="pointer-events:none;overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="bub">${who ? `<span class="who">${esc(who)}</span>` : ""}${esc(text)}</div></foreignObject>` : ""; }
function rail(){
  const on = c => c === "#fff" ? "#8e5bd6" : "#fff";
  const b = (y, act, label, icon, aktiv, badge) => hot(act, `<circle cx="90" cy="${y}" r="50" fill="${aktiv ? "#8e5bd6" : "#fff"}" filter="url(#sh)"/>${icon(aktiv ? "#fff" : "#8e5bd6", y)}<text x="90" y="${y + 76}" text-anchor="middle" class="ui" font-size="21" fill="#5a4a78">${label}</text>${badge ? `<circle cx="126" cy="${y - 36}" r="${typeof badge === "number" ? 18 : 14}" fill="#e5607e"/>${typeof badge === "number" ? `<text x="126" y="${y - 29}" text-anchor="middle" class="ui" font-size="20" fill="#fff">${badge}</text>` : ""}` : ""}`);
  // Knöpfe von oben nach unten
  const knoepfe = [
    ["go:zimmer", "Zimmer", (c, y) => `<path d="M62,${y + 4} L90,${y - 24} L118,${y + 4} V${y + 30} H62Z" fill="${c}"/>`, V.screen === "zimmer"],
    ["go:karte", "Karte", (c, y) => `<path d="M60,${y - 22} L80,${y - 28} L100,${y - 20} L120,${y - 26} V${y + 24} L100,${y + 30} L80,${y + 22} L60,${y + 28}Z" fill="${c}"/><path d="M80,${y - 28} V${y + 22} M100,${y - 20} V${y + 30}" stroke="${on(c)}" stroke-width="3"/>`, V.screen === "karte"],
    ["spiele", "Spiele", (c, y) => `<rect x="58" y="${y - 18}" width="64" height="40" rx="18" fill="${c}"/><circle cx="76" cy="${y + 2}" r="5" fill="${on(c)}"/><path d="M100,${y - 4} v12 M94,${y + 2} h12" stroke="${on(c)}" stroke-width="4" stroke-linecap="round"/>`, false],
    ["brief", "Brief", (c, y) => `<rect x="60" y="${y - 20}" width="60" height="42" rx="6" fill="${c}"/><path d="M60,${y - 18} L90,${y + 4} L120,${y - 18}" stroke="${on(c)}" stroke-width="4" fill="none"/>`, V.screen === "brief", !!briefWartet()]
  ];
  return knoepfe.map((k, i) => b(150 + i * 130, ...k)).join("")
    + hot("hint", `<circle cx="90" cy="850" r="62" fill="#fff" filter="url(#sh)"/>${spr(figur(katzeArt()), 90, 898, .31)}<text x="90" y="940" text-anchor="middle" class="ui" font-size="22" fill="#5a4a78">${esc(S().katze.name)}</text>`);
}
const katzeArt = () => "katze:" + (S().katze ? S().katze.farbe : "lila");
function hud(){
  let s = `<g filter="url(#sh)"><rect x="1330" y="34" width="230" height="74" rx="37" fill="#fff"/></g><circle cx="1374" cy="71" r="22" fill="#e9c24a"/><text x="1374" y="79" text-anchor="middle" class="ui" font-size="20" fill="#7a5a10">€</text><text x="1530" y="83" text-anchor="end" class="ui" font-size="34" fill="#2b2140">${money(S().purse)}</text>`;
  if(V.nacht) return s + (V.cat ? bub(200, 800, 760, S().katze.name, V.cat) : "");
  const knopf = (y, act, text, farbe) => hot(act, `<rect x="1320" y="${y - 15}" width="250" height="96" fill="transparent"/><g filter="url(#sh)"><rect x="1330" y="${y}" width="230" height="66" rx="33" fill="${farbe}"/></g><text x="1445" y="${y + 43}" text-anchor="middle" class="ui" font-size="28" fill="#fff">${text}</text>`);
  if(SP() && SP().plan()){ let y = 128;
    // "Nur spielen" (Ticket 20): alles Lernen heute weg; "Doch lernen" holt zurück, was noch nicht fertig ist
    if(SP().nurSpielen){ if(SP().einladungen(true).length){ s += knopf(y, "lernen", "Doch lernen", "#4f9fc9"); y += 104; } }
    else if(SP().einladungen().length){ s += knopf(y, "nurSpielen", "Nur spielen", "#4f9fc9"); y += 104; }
    if(!SP().nurSpielen && !SP().einladungen().length) s += knopf(y, "neuerTag", "☀ Neuer Tag", "#8e5bd6"); // heute nichts mehr offen: Azra beginnt selbst den nächsten Tag
  }
  if(SP() && SP().offen) return s; // die Arbeitskarte zeigt ihre eigenen Sprechblasen
  const z = window.FREUNDE && FREUNDE.offenerZettel(); // Ticket 38: der Zettel der Besorgung, die Katze liest ihn vor
  if(z){ const w = z.length * 18 + 96; s += hot("zettel", `<g filter="url(#sh)"><rect x="${1570 - w}" y="864" width="${w}" height="100" rx="18" fill="#fffbe0"/></g><text x="${1594 - w}" y="926" class="lesen" font-size="34" fill="#3b2b52">📝 ${esc(z)}</text>`); }
  if(V.msg) s += bub(200, 30, 1100, NB[V.msg.who] ? NB[V.msg.who].name : "", V.msg.text);
  if(V.cat) s += bub(200, 800, 760, S().katze.name, V.cat);
  return s;
}
// Abends (ab 18 Uhr, Ticket 21) liegt warmes Abendlicht über allem; nachts im Zimmer ist es dunkel.
const abend = () => { const h = new Date().getHours(); return h >= 18 || h < 6; };
const abendLicht = () => V.nacht || !abend() ? "" : `<rect class="abend" width="1600" height="1000" fill="#3b2f7a" opacity=".16" pointer-events="none"/>`;
// Jahreszeit und Feste nach dem Spieldatum (Ticket 26): Farben der Karte und des Fensters, Schnee und Blätter.
const JZ = () => window.JAHR ? JAHR.jahreszeit(today()) : "sommer";
const FARBEN = { sommer: { gras: ["#9fd67f", "#aadd8b"], baum: ["#5fae5a", "#86cc72"], wasser: ["#7cc6ea", "#8ccff0"], huegel: "#8fd17a" },
  fruehling: { gras: ["#a8dc84", "#b6e396"], baum: ["#7cc96f", "#f6b3c6"], wasser: ["#7cc6ea", "#8ccff0"], huegel: "#9fdc85" },
  herbst: { gras: ["#b5cf7a", "#c2d98a"], baum: ["#e0904a", "#f2c94c"], wasser: ["#7cc6ea", "#8ccff0"], huegel: "#c9c06a" },
  winter: { gras: ["#eef3f7", "#e3ebf1"], baum: ["#dfe8ee", "#ffffff"], wasser: ["#bfe3f2", "#cfeaf6"], huegel: "#eef3f7" } };
const farben = () => FARBEN[JZ()];
const flocken = () => [...Array(36)].map((_, i) => `<circle cx="${(i * 197) % 1600}" cy="${(i * 131) % 1000}" r="${4 + i % 3 * 2}" fill="#fff" opacity=".85"/>`).join("");
const blaetter = () => [...Array(12)].map((_, i) => `<ellipse cx="${(i * 233) % 1600}" cy="${(i * 157) % 900}" rx="12" ry="7" fill="${["#e0904a", "#c9672f", "#f2c94c"][i % 3]}" transform="rotate(${i * 37} ${(i * 233) % 1600} ${(i * 157) % 900})"/>`).join("");
const draussenWetter = () => `<g pointer-events="none">${JZ() === "winter" ? flocken() : JZ() === "herbst" ? blaetter() : ""}</g>`;
const FEST_SAG = { martin: "Heute ist Sankt Martin! Am Abend leuchten überall Laternen.", nikolaus: "Heute ist Nikolaus! Schau mal, an der Tür steht ein Stiefel.",
  weihnachten: "Frohe Weihnachten, Azra!", fasching: "Es ist Fasching! Als was würdest du dich verkleiden?", ostern: "Frohe Ostern! Der Osterhase war da." };
function festSag(f){
  if(f.id === "advent") return f.kerzen === 1 ? "Es ist Advent. Am Kranz brennt schon eine Kerze." : `Es ist Advent. Am Kranz brennen schon ${f.kerzen} Kerzen.`;
  if(f.id === "silvester") return today().endsWith("12-31") ? "Heute ist Silvester! Heute Nacht gibt es ein Feuerwerk." : "Frohes neues Jahr, Azra!";
  return FEST_SAG[f.id];
}
// Schmuck in ihrem Zimmer zum Fest
function festSchmuck(P){
  const f = window.JAHR && JAHR.fest(today()); if(!f) return "";
  if(f.id === "martin"){ const [x, y] = P(4.2, 0, 3.7); return `<path d="M${x},${y - 60} V${y - 30}" stroke="#5a4a78" stroke-width="3"/><circle cx="${x}" cy="${y}" r="44" fill="#f2c94c" opacity=".35"/><ellipse cx="${x}" cy="${y}" rx="26" ry="30" fill="#f08a5d"/><path d="M${x - 10},${y - 6} l10,-14 l10,14 l-10,14Z" fill="#fff6c8"/>`; }
  if(f.id === "advent" || f.id === "nikolaus" && f.kerzen){ const [x, y] = P(9, 5.1, 1.65); return `<ellipse cx="${x}" cy="${y}" rx="46" ry="18" fill="#4e9a4a"/>` + [-30, -10, 10, 30].map((dx, i) => `<rect x="${x + dx - 5}" y="${y - 34 + Math.abs(dx) / 3}" width="10" height="28" fill="#e5453f"/>${i < f.kerzen ? `<path d="M${x + dx},${y - 50 + Math.abs(dx) / 3} q-6,8 0,14 q6,-6 0,-14Z" fill="#f2c94c"/>` : ""}`).join("")
    + (f.id === "nikolaus" ? stiefel(P) : ""); }
  if(f.id === "nikolaus") return stiefel(P);
  if(f.id === "weihnachten"){ const [x, y] = P(1.6, 9.3); return `<rect x="${x - 8}" y="${y - 26}" width="16" height="26" fill="#8a5a3c"/>` + [0, 1, 2].map(i => `<path d="M${x - 64 + i * 14},${y - 24 - i * 42} L${x},${y - 92 - i * 42} L${x + 64 - i * 14},${y - 24 - i * 42}Z" fill="#3f8f4a"/>`).join("")
    + [[-30, -50, "#e5453f"], [24, -60, "#f2c94c"], [-10, -100, "#4f9fc9"], [16, -126, "#e5453f"]].map(([dx, dy, c]) => `<circle cx="${x + dx}" cy="${y + dy}" r="7" fill="${c}"/>`).join("") + `<path d="M${x},${y - 196} l6,12 l13,1 l-10,8 l4,13 l-13,-7 l-11,7 l3,-13 l-10,-8 l13,-1Z" fill="#f2c94c"/>`; }
  if(f.id === "fasching" || f.id === "silvester") return [...Array(30)].map((_, i) => { const [x, y] = P(1 + (i * 37) % 85 / 10, 1 + (i * 53) % 85 / 10); return `<rect x="${x}" y="${y}" width="9" height="5" fill="${["#e5607e", "#f2c94c", "#4f9fc9", "#6fbf8e", "#9b6fd0"][i % 5]}" transform="rotate(${i * 41} ${x} ${y})"/>`; }).join("");
  if(f.id === "ostern"){ const [x, y] = P(3.4, 7.6); return `<ellipse cx="${x}" cy="${y - 10}" rx="42" ry="18" fill="#c98f52"/>` + [["#e5607e", -20], ["#f2c94c", 0], ["#4f9fc9", 20]].map(([c, dx]) => `<ellipse cx="${x + dx}" cy="${y - 24}" rx="11" ry="15" fill="${c}"/>`).join(""); }
  return "";
}
function stiefel(P){ const [x, y] = P(.9, 9.6); return `<path d="M${x - 14},${y - 50} h24 v34 h22 q8,0 8,10 v6 h-54Z" fill="#e5453f"/><rect x="${x - 16}" y="${y - 56}" width="28" height="10" rx="4" fill="#fff"/><circle cx="${x - 4}" cy="${y - 62}" r="7" fill="#f2c94c"/>`; }
const svg = inner => `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid meet">${B.defs()}${inner}${abendLicht()}${rail()}${hud()}</svg>`;
const hit = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="transparent"/>`;

// ---------- Ihr Zimmer ----------
const ZIMMER = {
  regal: "Hier stehen deine Bücher.", tagebuch: "Das ist dein Tagebuch.", basteln: "Am Basteltisch machst du Sachen aus Papier.", puppen: "Hier wohnen deine Puppen.",
  tisch: "Auf dem Schreibtisch liegt dein Merkheft.", uhr: "Das ist deine Uhr.",
  fenster: "Von hier siehst du Lottes Balkon."
};
const PZ = B.isoP([820, 330], 45);
function zimmer(){
  const P = PZ; let s = `<ellipse cx="820" cy="600" rx="560" ry="230" fill="#d8ccf5" opacity=".5"/>`;
  s += poly(P, [[0, 0, 0], [0, 10, 0], [0, 10, 5.5], [0, 0, 5.5]], "#d4bff0") + poly(P, [[0, 0, 0], [10, 0, 0], [10, 0, 5.5], [0, 0, 5.5]], "#e7dafb");
  s += poly(P, [[0, 0, 5.5], [0, 10, 5.5], [-.3, 10, 5.5], [-.3, -.3, 5.5], [10, -.3, 5.5], [10, 0, 5.5]], "#f6f0ff");
  s += poly(P, [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], "#f2d6b0");
  for(let i = 1; i < 10; i++) s += `<line x1="${P(i, 0)[0]}" y1="${P(i, 0)[1]}" x2="${P(i, 10)[0]}" y2="${P(i, 10)[1]}" stroke="#e3c193" stroke-width="2"/>`;
  s += poly(P, [[0, 10, 0], [10, 10, 0], [10, 10, -.5], [0, 10, -.5]], "#c99b72") + poly(P, [[10, 0, 0], [10, 10, 0], [10, 10, -.5], [10, 0, -.5]], "#b0835c");
  s += `<polygon points="${[...Array(24)].map((_, i) => P(5.4 + 2.3 * Math.cos(i / 24 * 6.283), 5.6 + 2.3 * Math.sin(i / 24 * 6.283)).join(",")).join(" ")}" fill="#c9a5ef"/>`;
  const dinge = window.EINRICHTEN ? EINRICHTEN.norm(S().zimmer).dinge.filter(d => d.wo) : [], flach = d => EINRICHTEN.ding(d.art).flach;
  s += dinge.filter(flach).map(d => EINRICHTEN.bild(P, d)).join(""); // Teppich liegt unter allem
  s += hot("sag:fenster", poly(P, [[3, 0, 2.1], [6.4, 0, 2.1], [6.4, 0, 4.7], [3, 0, 4.7]], "#ffffff") + poly(P, [[3.2, 0, 2.3], [6.2, 0, 2.3], [6.2, 0, 4.5], [3.2, 0, 4.5]], "url(#sky)") + poly(P, [[3.2, 0, 2.3], [6.2, 0, 2.3], [6.2, 0, 3.0], [4.8, 0, 3.4], [3.2, 0, 2.9]], farben().huegel) + poly(P, [[4.65, 0, 2.3], [4.75, 0, 2.3], [4.75, 0, 4.5], [4.65, 0, 4.5]], "#fff")
    + poly(P, [[2.6, 0, 1.6], [3.1, 0, 1.6], [3.1, 0, 4.9], [2.6, 0, 4.9]], "#9b6ad8") + poly(P, [[6.3, 0, 1.6], [6.8, 0, 1.6], [6.8, 0, 4.9], [6.3, 0, 4.9]], "#9b6ad8"));
  // Blumentöpfe auf der Fensterbank (Ticket 26)
  if(window.JAHR) s += hot("garten", hit(...P(4.7, .2, 2.4), 60) + JAHR.norm(S().garten).toepfe.map((t, i) => { const [x, y] = P(3.7 + i * 1.05, .2, 2.12); return `<g transform="translate(${x} ${y}) scale(.36)">${JAHR.pflanzeBild(t)}</g>`; }).join(""));
  // Ihre Bilder (Ticket 27): zwei über dem Bücherregal, eins über der Küchentür
  if(window.MALEN) MALEN.norm(S().bilder).forEach((b, i) => { const [l, r, z0, z1] = [[2.6, 1.25, 4.35, 5.25], [4.05, 2.7, 4.35, 5.25], [1.2, 2.6, 3.95, 4.85]][i], links = i < 2;
    const ecke = links ? (y, z) => P(0, y, z) : (x, z) => P(x, 0, z), [ox, oy] = ecke(l, z1), [ax, ay] = ecke(r, z1), [bx, by] = ecke(l, z0);
    s += poly(P, links ? [[0, l + .08, z1 + .08], [0, r - .08, z1 + .08], [0, r - .08, z0 - .08], [0, l + .08, z0 - .08]] : [[l - .08, 0, z1 + .08], [r + .08, 0, z1 + .08], [r + .08, 0, z0 - .08], [l - .08, 0, z0 - .08]], "#a7744c")
      + `<image class="wandbild" href="${b.url}" width="1" height="1" preserveAspectRatio="none" transform="matrix(${ax - ox} ${ay - oy} ${bx - ox} ${by - oy} ${ox} ${oy})"/>`; });
  // Uhr über dem Puppenhaus
  const [ux, uy] = P(8.1, 0, 4.5);
  s += hot("sag:uhr", hit(ux, uy, 50) + `<circle cx="${ux}" cy="${uy}" r="30" fill="#fff" stroke="#9b6ad8" stroke-width="6"/><path d="M${ux},${uy} V${uy - 20} M${ux},${uy} H${ux + 14}" stroke="#4b3566" stroke-width="5" stroke-linecap="round"/>`);
  // Tür zur Karte
  s += hot("go:karte", hit(...P(0, 8.5, 1.9), 60) + poly(P, [[0, 7.7, 0], [0, 9.3, 0], [0, 9.3, 3.8], [0, 7.7, 3.8]], "#b98a62") + poly(P, [[0, 7.85, .15], [0, 9.15, .15], [0, 9.15, 3.65], [0, 7.85, 3.65]], "#c99b72") + `<circle cx="${P(0, 9, 1.8)[0]}" cy="${P(0, 9, 1.8)[1]}" r="6" fill="#f2c94c"/>`);
  // Tür zur Küche (Ticket 22)
  s += hot("go:kueche", hit(...P(1.9, 0, 1.8), 56) + poly(P, [[1.1, 0, 0], [2.7, 0, 0], [2.7, 0, 3.8], [1.1, 0, 3.8]], "#b98a62") + poly(P, [[1.25, 0, .15], [2.55, 0, .15], [2.55, 0, 3.65], [1.25, 0, 3.65]], "#e3c08f")
    + poly(P, [[1.5, 0, 2.4], [2.3, 0, 2.4], [2.3, 0, 3.2], [1.5, 0, 3.2]], "#fff6ec") + `<circle cx="${P(1.4, 0, 1.8)[0]}" cy="${P(1.4, 0, 1.8)[1]}" r="6" fill="#f2c94c"/>`);
  // Bücherregal
  const R = B.rng(3), cols = ["#e5607e", "#4f9fc9", "#f2c94c", "#6fbf8e", "#9b6fd0", "#f08a5d"]; let bk = "";
  [0.25, 1.25, 2.25, 3.25].forEach(z => { for(let i = 0; i < 8; i++){ const y0 = 1.15 + i * .34, h = .55 + R() * .3; bk += poly(P, [[1.02, y0, z], [1.02, y0 + .28, z], [1.02, y0 + .28, z + h], [1.02, y0, z + h]], cols[Math.floor(R() * 6)]); } });
  s += hot("sag:regal", box(P, 0, 1, 0, 1, 3, 4.2, "#a7744c") + bk);
  // Bett mit ihrer Katze
  s += hot("sag:bett", box(P, 0, 4.6, 0, .25, 2.7, 1.8, "#c99b72") + box(P, 0, 4.6, 0, 2.5, 2.7, .65, "#c99b72") + box(P, .1, 4.7, .65, 2.3, 2.5, .3, "#ffffff") + box(P, .2, 4.85, .95, .6, 2.2, .25, "#f3eafc") + box(P, .9, 4.65, .95, 1.65, 2.6, .12, "#9b6ad8"));
  // Spielzeugkiste (Ticket 24): kaufen, hinstellen, wegräumen
  s += hot("kiste", hit(...P(8.75, 8.75, .5), 50) + box(P, 8.3, 8.3, 0, .9, .9, .8, "#e5a04f") + box(P, 8.25, 8.25, .8, 1, 1, .14, "#f08a5d") + poly(P, [[9.21, 8.5, .35], [9.21, 9, .35], [9.21, 9, .5], [9.21, 8.5, .5]], "#fff6ec"));
  s += dinge.filter(d => !flach(d)).sort((a, b) => (a.wo === "wand" ? -1 : a.wo[0] + a.wo[1]) - (b.wo === "wand" ? -1 : b.wo[0] + b.wo[1])).map(d => EINRICHTEN.bild(P, d)).join("");
  const korb = dinge.find(d => d.art === "korb" && Array.isArray(d.wo)); // mit Katzenkorb schläft die Katze tagsüber darin
  s += V.nacht ? schlafKopf(...P(.55, 5.95, 1.15)) + shadowed(P, 2.3, 5.3, 1.07, figur(katzeArt()), .22) : hot("katze", korb ? hit(...P(korb.wo[0], korb.wo[1], .8), 50) + shadowed(P, korb.wo[0], korb.wo[1], .1, figur(katzeArt()), .26) : hit(...P(1.5, 5.9, 2.2), 50) + shadowed(P, 1.5, 5.9, 1.07, figur(katzeArt()), .3));
  // Tagebuch am Fußende
  s += hot("sag:tagebuch", hit(...P(.75, 6.9, 1.1), 50) + box(P, .45, 6.6, .95, .6, .5, .1, "#e5607e") + box(P, .5, 6.65, 1.05, .5, .4, .02, "#ffffff"));
  // Basteltisch unter dem Fenster
  s += hot("sag:basteln", box(P, 3.2, .5, 0, .2, .2, 1.6, "#c08a58") + box(P, 5.8, .5, 0, .2, .2, 1.6, "#c08a58") + box(P, 3.2, 1.6, 0, .2, .2, 1.6, "#c08a58") + box(P, 5.8, 1.6, 0, .2, .2, 1.6, "#c08a58") + box(P, 3, .3, 1.6, 3.2, 1.7, .18, "#e7c08f")
    + poly(P, [[3.4, .6, 1.79], [4.4, .5, 1.79], [4.5, 1.3, 1.79], [3.5, 1.4, 1.79]], "#ffd6e0") + poly(P, [[4.6, .9, 1.79], [5.4, .8, 1.79], [5.5, 1.6, 1.79], [4.7, 1.7, 1.79]], "#cfe8ff") + box(P, 5.5, .5, 1.78, .4, .4, .6, "#4f9fc9") + box(P, 3.8, 1.3, 1.78, .5, .4, .5, "#f2c94c"));
  // Puppenhaus
  s += hot("sag:puppen", box(P, 7, .2, 0, 2.2, 1.4, 2.4, "#f6b3c6") + roof(P, 6.9, .1, 2.4, 2.4, 1.6, 1.1, "#9b6ad8")
    + [[7.2, .5], [8.2, .5], [7.2, 1.5], [8.2, 1.5]].map(([x, z]) => poly(P, [[x, 1.61, z], [x + .75, 1.61, z], [x + .75, 1.61, z + .75], [x, 1.61, z + .75]], "#fde7ef")).join(""));
  // Schreibtisch mit Merkheft
  s += hot("sag:tisch", box(P, 7.4, 4, 0, .15, .15, 1.5, "#a7744c") + box(P, 9.2, 4, 0, .15, .15, 1.5, "#a7744c") + box(P, 7.4, 5.3, 0, .15, .15, 1.5, "#a7744c") + box(P, 9.2, 5.3, 0, .15, .15, 1.5, "#a7744c")
    + box(P, 7.3, 3.9, 1.5, 2.2, 1.6, .15, "#d2a477") + box(P, 7.9, 4.3, 1.65, .9, .7, .12, "#e5607e") + box(P, 7.95, 4.35, 1.77, .8, .6, .02, "#ffffff"));
  if(briefWartet()) s += hot("brief", hit(...P(2, 8.45, 0), 50) + poly(P, [[1.5, 8, .02], [2.6, 8, .02], [2.6, 8.9, .02], [1.5, 8.9, .02]], "#ffffff") + poly(P, [[1.5, 8, .03], [2.05, 8.45, .03], [1.5, 8.9, .03]], "#ece4f7")) + ping(P, 2, 8.4, .8);
  s += festSchmuck(P);
  if(V.nacht) return svg(s + nachtBild(P));
  s += azraFigur(P, .5);
  s += `<text x="820" y="870" text-anchor="middle" class="ui" font-size="30" fill="#5a4a78">Dein Zimmer</text>`;
  return svg(s);
}

// Schlafenszeit (Ticket 21): sie liegt im Bett, die Katze am Fußende, am Fenster Mond und Sterne.
const schlafKopf = (x, y) => `<g transform="translate(${x} ${y}) scale(.3)"><circle r="64" fill="#3b2720"/><circle cx="-72" cy="18" r="28" fill="#3b2720"/><circle cx="72" cy="18" r="28" fill="#3b2720"/><ellipse cy="8" rx="54" ry="56" fill="#d9a47f"/><path d="M-57,0 Q-52,-64 0,-60 Q52,-64 57,0 Q30,-30 0,-22 Q-30,-30 -57,0Z" fill="#3b2720"/><path d="M-28,10 Q-20,18 -12,10 M12,10 Q20,18 28,10" stroke="#2a1d18" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="-36" cy="28" rx="11" ry="6" fill="#e9837b" opacity=".45"/><ellipse cx="36" cy="28" rx="11" ry="6" fill="#e9837b" opacity=".45"/></g>`;
function nachtBild(P){
  const sterne = [[3.6, 2.8], [4.2, 4.1], [4.5, 3.3], [5.1, 2.6], [5.9, 3.6], [3.5, 3.9]].map(([x, z], i) => { const [sx, sy] = P(x, 0, z); return `<circle cx="${sx}" cy="${sy}" r="${3 + i % 3}" fill="#fff6c8"/>`; }).join("");
  const [mx, my] = P(5.4, 0, 4), [zx, zy] = P(.55, 5.95, 1.6);
  return `<g id="nacht" pointer-events="none"><rect width="1600" height="1000" fill="#1d1b4a" opacity=".5"/>${poly(P, [[3.2, 0, 2.3], [6.2, 0, 2.3], [6.2, 0, 4.5], [3.2, 0, 4.5]], "#24245e")}${sterne}
    <circle cx="${mx}" cy="${my}" r="26" fill="#fff6c8"/><circle cx="${mx + 12}" cy="${my - 8}" r="22" fill="#24245e"/>
    <text x="${zx + 30}" y="${zy - 10}" class="ui schlaf" font-size="30" fill="#fff">z</text><text x="${zx + 52}" y="${zy - 40}" class="ui schlaf" font-size="40" fill="#fff">Z</text></g>`
    + hot("aufwachen", `<rect x="1260" y="854" width="310" height="100" fill="transparent"/><g filter="url(#sh)"><rect x="1270" y="860" width="290" height="84" rx="42" fill="#f2c94c"/></g><text x="1415" y="915" text-anchor="middle" class="ui" font-size="34" fill="#5a3d00">☀ Aufwachen</text>`);
}

// ---------- Der Brief des Tages ----------
function briefKarte(){
  const b = briefDaten(), n = b && NB[b.von];
  if(!n) return "";
  return `<rect width="1600" height="1000" fill="#2b2140" opacity=".3" class="hot" data-act="go:zimmer"/><g filter="url(#sh)"><rect x="450" y="150" width="700" height="680" rx="40" fill="#fff"/></g>
  <rect x="450" y="150" width="700" height="90" rx="40" fill="#8e5bd6"/><rect x="450" y="200" width="700" height="40" fill="#8e5bd6"/><text x="800" y="212" text-anchor="middle" class="ui" font-size="36" fill="#fff">Brief von ${vorname(n)}</text>
  ${b.zeilen.map((l, i) => `<text x="510" y="${320 + i * 78}" font-size="40" class="lesen" fill="#2b2140">${l}</text>`).join("")}${spr(figur(n.art), 1050, 720, n.art === "heron" ? .32 : .4)}
  ${hot("go:karte", `<rect x="500" y="710" width="340" height="100" fill="transparent"/><rect x="510" y="720" width="320" height="80" rx="40" fill="#8e5bd6"/><text x="670" y="773" text-anchor="middle" class="ui" font-size="32" fill="#fff">Zur Karte</text>`)}`;
}

// ---------- Die Westpark-Karte ----------
const PM = B.isoP([800, 120], 46);
const HAUS = {
  zuhause: { x: 10.4, y: 1.4, w: 2.3, d: 2, h: 3.2, c: "#cdb0f0", r: "#8e5bd6", st: [11.5, 5.2], lab: [11.5, 2.4, 4.8] },
  garten: { x: 12.3, y: 4.3, w: 1.5, d: 1.5, h: 1.1, c: "#d7ecc4", st: [12.6, 6.5], lab: [13.6, 3.4, 2.4] },
  post: { x: 6, y: 2, w: 2, d: 1.6, h: 2, c: "#f5d36b", r: "#e0904a", st: [7, 5.4], lab: [7, 2.8, 3.4] },
  schule: { x: 1, y: 1, w: 3.4, d: 2.4, h: 2.6, c: "#e39c7a", r: "#a65a45", st: [2.7, 5.4], lab: [2.7, 2.2, 3.6] },
  laden: { x: 10.5, y: 8.2, w: 2, d: 1.8, h: 1.8, c: "#fff6ec", r: "#e2556d", st: [9.6, 7.4], lab: [11.6, 9.2, 3.2] },
  cafe: { x: 7.4, y: 9.8, w: 1.8, d: 1.8, h: 1.7, c: "#fdf8ee", r: "#3e9c9a", st: [8.4, 8.9], lab: [8.4, 10.8, 3.0] },
  see: { st: [3.4, 5.6], lab: [2.2, 11.6, .2] },
  huegel: { st: [6.8, 12.2], lab: [6.6, 13.6, 0] }
};
const ORT_NAME = { zuhause: "Zuhause", schule: "Schule", ...Object.fromEntries(W.NACHBARN.map(n => [n.ort, n.ortName])), cafe: "Café" }; // auf der Karte kurz
const NB_AUF_KARTE = { post: [8.4, 2.7, .22], laden: [12.9, 7.6, .22], cafe: [9.7, 11.9, .22], garten: [13.4, 6.4, .15], see: [3.4, 7.4, .26], huegel: [5.6, 12.8, .2] };
function karte(){
  const P = PM, offen = tag().offen, brief = briefDaten(), fb = farben(), ng = naechsteGeschichte(); let s = "";
  const water = (x, y) => (x + .5 - 4.5) ** 2 + (y + .5 - 9) ** 2 < 8;
  s += poly(P, [[0, 14, 0], [14, 14, 0], [14, 14, -.9], [0, 14, -.9]], "#b98a5e") + poly(P, [[14, 0, 0], [14, 14, 0], [14, 14, -.9], [14, 0, -.9]], "#9c7048");
  let see = "";
  for(let x = 0; x < 14; x++) for(let y = 0; y < 14; y++){
    const w = water(x, y), path = !w && (y === 6 || x === 9), z = w ? -.12 : 0;
    const t = poly(P, [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]], w ? fb.wasser[(x + y) % 2] : path ? "#f3e2bf" : fb.gras[(x + y) % 2], 'stroke="rgba(255,255,255,.18)" stroke-width="1"');
    if(w) see += t; else s += t;
  }
  s += hot("ort:see", see);
  const items = [], add = (d, svgText) => items.push({ d, svgText });
  for(const [id, b] of Object.entries(HAUS)){
    if(!b.w) continue;
    let h = box(P, b.x, b.y, 0, b.w, b.d, b.h, b.c);
    if(b.r) h += roof(P, b.x - .1, b.y - .1, b.h, b.w + .2, b.d + .2, .9, b.r) + poly(P, [[b.x + b.w * .4, b.y + b.d + .01, 0], [b.x + b.w * .6, b.y + b.d + .01, 0], [b.x + b.w * .6, b.y + b.d + .01, .8], [b.x + b.w * .4, b.y + b.d + .01, .8]], "#8a5a3c");
    if(b.r) for(let k = 0; k < 2; k++) h += poly(P, [[b.x + b.w + .01, b.y + .3 + k * b.d / 2, b.h * .45], [b.x + b.w + .01, b.y + .3 + k * b.d / 2 + .4, b.h * .45], [b.x + b.w + .01, b.y + .3 + k * b.d / 2 + .4, b.h * .45 + .5], [b.x + b.w + .01, b.y + .3 + k * b.d / 2, b.h * .45 + .5]], "#fff6d8");
    if(id === "garten") h += [[12.6, 4.7], [13.1, 5.2], [13.5, 4.6]].map(([x, y], i) => { const [fx, fy] = P(x, y, b.h); return `<circle cx="${fx}" cy="${fy - 8}" r="12" fill="${["#e5607e", "#f2c94c", "#9b6fd0"][i]}"/>`; }).join("");
    if(id === "laden") h += poly(P, [[b.x, b.y + b.d, 1.2], [b.x + b.w, b.y + b.d, 1.2], [b.x + b.w, b.y + b.d + .5, .9], [b.x, b.y + b.d + .5, .9]], "#e2556d");
    add(b.x + b.y + b.w / 2 + b.d / 2, hot(`ort:${id}`, hit(...P(b.x + b.w / 2, b.y + b.d / 2, b.h / 2), 48) + h));
  }
  [[.8, 5], [1.5, 12.5], [3, 13.2], [8, 13], [12.6, 12.6], [13.2, 9.5], [5, 4.6], [13.2, .8], [.5, 8.6], [10.6, 12.9], [2.5, 4.4], [12.8, 7], [4.8, .6]].forEach(([x, y]) => { const [sx, sy] = P(x, y, 0);
    add(x + y, `<rect x="${sx - 5}" y="${sy - 30}" width="10" height="30" fill="#8a6a4f"/><circle cx="${sx}" cy="${sy - 52}" r="30" fill="${fb.baum[0]}"/><circle cx="${sx - 9}" cy="${sy - 62}" r="14" fill="${fb.baum[1]}"/>`); });
  const [hx, hy] = P(5.6, 12.8, 0);
  add(18.3, hot("ort:huegel", hit(hx, hy - 30, 56) + `<path d="M${hx - 70},${hy} Q${hx},${hy - 80} ${hx + 70},${hy}Z" fill="#b08a62"/><ellipse cx="${hx}" cy="${hy - 14}" rx="18" ry="8" fill="#5a4030"/>`));
  for(const n of W.NACHBARN) if(offen.includes(n.ort)){ const [x, y, k] = NB_AUF_KARTE[n.ort]; const [fx, fy] = P(x, y, 0); add(x + y + .1, hot(`ort:${n.ort}`, hit(fx, fy - 40, 48) + shadowed(P, x, y, 0, figur(n.art), k))); }
  // Ticket 38: ihr Marktstand unter der Post
  { const [mx, my] = P(8, 4.4, 0); add(12.4, hot("markt", hit(mx, my - 40, 50) + box(P, 7.6, 4.1, 0, .8, .5, .55, "#f6e7c8")
      + [0, 1, 2, 3].map(i => poly(P, [[7.55 + i * .21, 4.05, 1], [7.76 + i * .21, 4.05, 1], [7.76 + i * .21, 4.65, .8], [7.55 + i * .21, 4.65, .8]], i % 2 ? "#fff" : "#e5607e")).join("")
      + `<g filter="url(#sh)"><rect x="${mx - 44}" y="${my - 128}" width="88" height="34" rx="17" fill="#fff"/></g><text x="${mx}" y="${my - 104}" text-anchor="middle" class="ui" font-size="22" fill="#5a4a78">Markt</text>`)); }
  const st = kartenPlatz(), [tx, ty] = P(...st);
  add(st[0] + st[1] + .5, `<g id="tok" transform="translate(${tx} ${ty})" pointer-events="none"><ellipse rx="26" ry="9" fill="#2b2140" opacity=".18"/><g id="tokK" transform="scale(${V.links ? -.25 : .25} .25)">${figur("azra")}</g></g>`);
  items.sort((a, b) => a.d - b.d).forEach(i => s += i.svgText);
  for(const [id, b] of Object.entries(HAUS)){
    const [sx, sy] = P(...b.lab), t = ORT_NAME[id], w = t.length * 13 + 44, auf = id === "zuhause" || id === "schule" || offen.includes(id);
    s += hot(`ort:${id}`, `<rect x="${sx - Math.max(w + 12, 100) / 2}" y="${sy - 30}" width="${Math.max(w + 12, 100)}" height="98" fill="transparent"/><g filter="url(#sh)"><rect x="${sx - w / 2}" y="${sy - 24}" width="${w}" height="44" rx="22" fill="${auf ? "#fff" : "#f1edf6"}"/></g><text x="${sx}" y="${sy + 7}" text-anchor="middle" class="ui" font-size="22" fill="${auf ? "#4b3a6e" : "#a99cc0"}">${t}</text>`);
    if(brief && brief.ort === id && S().gelesen[brief.key]) s += `<g class="ping" pointer-events="none"><circle cx="${sx}" cy="${sy - 50}" r="16" fill="#fff" stroke="#8e5bd6" stroke-width="6"/></g>`;
    if(ng && ng.g.schritte[ng.i].wo === id) s += ausruf(sx + w / 2 + 8, sy - 26);
    if(window.FREUNDE && AM[id] && S().met[AM[id].id]) s += FREUNDE.herzBild(AM[id].id, sx, sy + 40, .6); // Ticket 38
  }
  s += draussenWetter();
  s += `<text x="800" y="900" text-anchor="middle" class="ui" font-size="28" fill="#5a4a78">Tipp auf einen Ort, Azra läuft hin.</text>`;
  return svg(s);
}
// ---------- Gehen (Ticket 19): tippen auf den Boden oder Pfeiltasten; nie durch Möbel, Häuser oder Wasser ----------
const kartenPlatz = () => V.kxy || HAUS[V.pos || "zuhause"].st;
const KARTE_BODEN = { w: 14, h: 14, sperren: Object.values(HAUS).filter(b => b.w).map(b => [b.x - .1, b.y - .1, b.x + b.w + .1, b.y + b.d + .1]),
  gesperrt: (x, y) => (Math.floor(x) + .5 - 4.5) ** 2 + (Math.floor(y) + .5 - 9) ** 2 < 8 };
const ZIMMER_BODEN = { w: 10, h: 10, sperren: [[0, 1, 1.1, 4.1], [0, 4.5, 2.7, 7.4], [2.9, .2, 6.3, 2], [6.9, .1, 9.3, 1.7], [7.2, 3.8, 9.6, 5.6], [8.2, 8.2, 9.3, 9.3]] };
// mit allem, was sie selbst hingestellt hat (Ticket 24)
const zimmerBoden = () => window.EINRICHTEN ? EINRICHTEN.boden(ZIMMER_BODEN, S().zimmer) : ZIMMER_BODEN;
const TUER = (x, y) => x < .8 && y > 7.7 && y < 9.3;            // Tür ihres Zimmers zur Karte
const KUECHENTUER = (x, y) => y < .8 && x > 1.1 && x < 2.7;      // Tür zur Küche
const AUSGANG = (x, y) => x > 5 && x < 6.4 && y > 7.2;          // "Zur Karte" an jedem Ort
// Wo sie steht, wenn sie etwas antippt (das Ding selbst ist gesperrt, sie geht daneben)
const AN = { zimmer: { regal: [1.4, 2.6], bett: [2.4, 6], katze: [2.4, 6], tagebuch: [1.4, 7.6], basteln: [4.6, 2.4], fenster: [4.6, 2.4], puppen: [8, 2], uhr: [8, 2], tisch: [8.4, 6], kiste: [7.9, 7.9], garten: [4.6, 2.4] } };
AN.kueche = { kochen: [1.6, 2.7] };
// mit Katzenkorb geht sie zum Korb, wenn sie die Katze antippt
const korbPlatz = () => { const k = window.EINRICHTEN && EINRICHTEN.norm(S().zimmer).dinge.find(d => d.art === "korb" && Array.isArray(d.wo)); return k ? { katze: [k.wo[0] + .8, k.wo[1] + .8] } : {}; };
let weg = 0, abendGesagt = "", festGesagt = ""; // jeder Bildschirmwechsel beendet einen laufenden Weg
let geht = false;
// Der Boden des jetzigen Bildschirms; null, wenn gerade nicht gelaufen wird (Arbeitskarte offen, Katzenwahl).
function kontext(){
  if(SP() && SP().offen || V.nacht) return null;
  if(V.screen === "zimmer" || V.screen === "brief") return { boden: zimmerBoden(), o: [820, 330], u: 45, el: "azra", k: .5, xy: () => V.xy, set: v => V.xy = v,
    ende: ([x, y]) => { if(TUER(x, y)) ACT.go("karte"); if(KUECHENTUER(x, y)) ACT.go("kueche"); } };
  if(V.screen === "kueche") return { boden: KUECHE_BODEN, o: [840, 300], u: 52, el: "azra", k: .45, xy: () => V.xy, set: v => V.xy = v,
    ende: ([x, y]) => { if(AUSGANG(x, y)) ACT.go("zimmer"); } };
  if(V.screen === "ort" && ORTE[V.ort]) return { boden: ORTE[V.ort].boden, o: [840, 300], u: 52, el: "azra", k: .45, xy: () => V.xy, set: v => V.xy = v,
    ende: ([x, y]) => { if(AUSGANG(x, y)) ACT.go("karte"); } };
  if(V.screen === "karte") return { boden: KARTE_BODEN, o: [800, 120], u: 46, el: "tok", k: .25, xy: kartenPlatz, set: v => V.kxy = v,
    ende: ([x, y]) => { const id = Object.keys(HAUS).find(h => Math.hypot(HAUS[h].st[0] - x, HAUS[h].st[1] - y) < .6); if(id){ V.pos = id; ACT.ort(id); } } };
  return null;
}
// Sie läuft Feld für Feld zum Ziel; dann fertig() oder, ohne fertig, was dort ist (Tür, Ausgang, Haus).
function geh(nach, fertig){
  const k = kontext(), mein = ++weg; if(!k){ if(fertig) fertig(); return; }
  const pfad = G.weg(k.boden, k.xy(), nach), schritt = Math.min(110, 1800 / Math.max(1, pfad.length)), P = B.isoP(k.o, k.u);
  if(!pfad.length){ geht = false; return fertig ? fertig() : k.ende(k.xy()); }
  let i = 0, von = k.xy(), t0 = performance.now(); geht = true;
  (function step(){
    if(mein !== weg) return;
    const a = (performance.now() - t0) / schritt, z = pfad[i], f = Math.min(1, a), xy = [von[0] + (z[0] - von[0]) * f, von[1] + (z[1] - von[1]) * f];
    const [sx, sy] = P(...xy), [zx] = P(...z), [vx] = P(...von); if(Math.abs(zx - vx) > .5) V.links = zx < vx;
    k.set(xy);
    const el = document.getElementById(k.el), inner = document.getElementById(k.el + "K");
    if(el) el.setAttribute("transform", `translate(${sx} ${sy - Math.abs(Math.sin(a * Math.PI)) * 6})`);
    if(inner) inner.setAttribute("transform", `scale(${V.links ? -k.k : k.k} ${k.k})`);
    if(f < 1) return void setTimeout(step, 16);
    k.set(z); von = z; t0 = performance.now();
    if(++i < pfad.length) return void setTimeout(step, 16);
    geht = false; if(el) el.setAttribute("transform", `translate(${sx} ${sy})`);
    fertig ? fertig() : k.ende(z);
  })();
}
function azraFigur(P, k){ const [x, y] = P(...V.xy);
  return `<g id="azra" transform="translate(${x} ${y})" pointer-events="none"><ellipse rx="${98 * k}" ry="${31 * k}" fill="#2b2140" opacity=".14"/><g id="azraK" transform="scale(${V.links ? -k : k} ${k})">${figur("azra")}</g></g>`; }
// Wo sie auf einem Bildschirm anfängt: im Zimmer an der Tür, wenn sie von draußen kommt; am Ort an ihrem Platz.
function platz(wo){
  if(wo === V.wo) return;
  const vorher = V.wo; V.wo = wo;
  if(wo === "zimmer") V.xy = vorher === "karte" ? [1.25, 8.25] : vorher === "kueche" ? [1.9, 1.25] : [5.6, 6.4];
  else if(wo === "kueche") V.xy = [6.6, 5.8];
  else if(wo.startsWith("ort/")) V.xy = ORTE[wo.slice(4)].azra || [5.6, 3.4];
  else if(wo === "karte") V.kxy = null;
}

// ---------- Die sechs Orte: Diorama mit Nachbar, und in der ersten Woche ein kleiner Job ----------
const PO = B.isoP([840, 300], 52);
function innen(P, wand, boden){ return poly(P, [[0, 0, 0], [0, 8, 0], [0, 8, 4.5], [0, 0, 4.5]], wand[0]) + poly(P, [[0, 0, 0], [8, 0, 0], [8, 0, 4.5], [0, 0, 4.5]], wand[1]) + sockel(P) + floor(P, 8, 8, boden[0], boden[1]); }
function draussen(P, gras){ return `<rect width="1600" height="1000" fill="url(#sky)" opacity=".55"/>` + sockel(P) + floor(P, 8, 8, gras[0], gras[1]); }
function sockel(P){ return poly(P, [[0, 8, 0], [8, 8, 0], [8, 8, -.4], [0, 8, -.4]], "#c99b72") + poly(P, [[8, 0, 0], [8, 8, 0], [8, 8, -.4], [8, 0, -.4]], "#b0835c"); }
const fenster = P => poly(P, [[3.6, 0, 1.5], [7.2, 0, 1.5], [7.2, 0, 3.8], [3.6, 0, 3.8]], "#fff") + poly(P, [[3.8, 0, 1.7], [7, 0, 1.7], [7, 0, 3.6], [3.8, 0, 3.6]], "url(#sky)");
const ORTE = {
  post: { szene: P => innen(P, ["#f7e3a6", "#fbedc2"], ["#efe2c8", "#e3d3b4"]) + fenster(P)
      + box(P, 0, 1, 2.4, .5, 3.6, .12, "#a7744c") + [0, 1, 2].map(i => box(P, .05, 1.3 + i * 1.1, 2.52, .4, .8, .5, ["#c9955f", "#e0904a", "#f2c94c"][i])).join("")
      + box(P, 2.2, 1, 0, 1.1, 4.4, 1.5, "#e0904a") + box(P, 2.1, .9, 1.5, 1.3, 4.6, .14, "#f5d36b"),
    ding: P => box(P, 5.2, 5.6, 0, .9, .9, .7, "#c9955f") + poly(P, [[5.2, 6.05, .71], [6.1, 6.05, .71], [6.1, 6.15, .71], [5.2, 6.15, .71]], "#f2c94c"), wo: [5.6, 6, .7] },
  laden: { szene: P => innen(P, ["#f6d2d9", "#fbe3e8"], ["#f3ece2", "#e8ddcf"])
      + box(P, 0, .5, 0, .8, 6.5, 3.2, "#c98f5e") + [.6, 1.4, 2.2].map(z => [...Array(6)].map((_, i) => box(P, .1, .8 + i * 1, z, .6, .6, .5, ["#e5607e", "#f2c94c", "#6fbf8e", "#4f9fc9", "#f08a5d", "#9b6fd0"][(i + z * 5 | 0) % 6])).join("")).join("")
      + box(P, 2.6, 1, 0, 3.2, 1, 1.4, "#e2556d") + box(P, 2.5, .9, 1.4, 3.4, 1.2, .14, "#fff6ec") + box(P, 6, 4.8, 0, 1.1, 1.1, .6, "#c98f5e"),
    ding: P => [[4.8, 6, 0], [5.15, 6.2, 0], [4.95, 6.45, 0], [5.05, 6.15, .3]].map(([x, y, z]) => { const [cx, cy] = P(x, y, z); return `<circle cx="${cx}" cy="${cy - 16}" r="20" fill="#e2453f"/><circle cx="${cx - 6}" cy="${cy - 23}" r="6" fill="#f7a39e"/>`; }).join(""), wo: [5, 6.2, .6] },
  cafe: { szene: P => innen(P, ["#bfe3d8", "#d6efe7"], ["#f5efe4", "#e6dccb"]) + fenster(P)
      + box(P, 0, 1.2, 2.6, .4, 3.6, .12, "#a7744c") + [0, 1, 2, 3].map(i => box(P, .05, 1.5 + i * .85, 2.72, .3, .35, .35, ["#ffffff", "#e5607e", "#4f9fc9", "#f2c94c"][i])).join("")
      + box(P, 2.2, 1, 0, 1.1, 4.4, 1.6, "#c98f5e") + box(P, 2.1, .9, 1.6, 1.3, 4.6, .14, "#ead3b2") + box(P, 2.35, 1.3, 1.74, .7, .8, .9, "#5c6670")
      + box(P, 5.7, 5.7, 0, .15, .15, 1.2, "#8a5a3c") + box(P, 5.1, 5.1, 1.2, 1.3, 1.3, .1, "#fdf8ee"),
    ding: P => { const [cx, cy] = P(3, 5.2, 1.74); return `<rect x="${cx - 22}" y="${cy - 40}" width="44" height="40" rx="8" fill="#fff"/><path d="M${cx + 22},${cy - 30} q18,0 18,12 q0,12 -18,12" stroke="#fff" stroke-width="7" fill="none"/><ellipse cx="${cx}" cy="${cy - 40}" rx="22" ry="7" fill="#8a5a3c"/>`; }, wo: [3, 5.2, 1.8] },
  garten: { szene: P => draussen(P, ["#d9b48a", "#cfa77c"]) + [...Array(8)].map((_, i) => box(P, i, 7.9, 0, .1, .1, 1.3, "#ffffff")).join("") + box(P, 0, 7.9, 1.3, 8, .1, .1, "#ffffff")
      + [[1, 1, "#e5607e"], [3, .6, "#f2c94c"], [5.6, .8, "#9b6fd0"], [.8, 3.5, "#6fbf8e"]].map(([x, y, c]) => { const [fx, fy] = P(x + .4, y + .4, 1); return box(P, x, y, 0, .8, .8, .8, "#c97a3e") + `<circle cx="${fx}" cy="${fy - 20}" r="24" fill="${c}"/><circle cx="${fx}" cy="${fy - 20}" r="9" fill="#fff6d8"/>`; }).join(""),
    ding: P => box(P, 5.2, 5.4, 0, .8, .6, .7, "#4f9fc9") + poly(P, [[6, 5.6, .5], [6.9, 5.6, 1.1], [6.9, 5.75, 1.15], [6, 5.75, .6]], "#3f88b3"), wo: [5.6, 5.7, .7] },
  huegel: { szene: P => draussen(P, ["#9fd67f", "#aadd8b"]) + (() => { const [hx, hy] = P(2.5, 2.5, 0); return `<path d="M${hx - 260},${hy + 40} Q${hx},${hy - 220} ${hx + 260},${hy + 40}Z" fill="#b08a62"/><ellipse cx="${hx}" cy="${hy - 30}" rx="50" ry="20" fill="#5a4030"/>`; })()
      + [[7, 1], [1, 6.5], [7.2, 6.8]].map(([x, y]) => { const [sx, sy] = P(x, y, 0); return `<rect x="${sx - 8}" y="${sy - 50}" width="16" height="50" fill="#8a6a4f"/><circle cx="${sx}" cy="${sy - 86}" r="46" fill="#5fae5a"/>`; }).join(""),
    ding: P => box(P, 5, 5.2, .5, 1.8, .7, .12, "#c98f5e") + box(P, 5, 5.85, .62, 1.8, .1, .5, "#c98f5e") + box(P, 5.1, 5.3, 0, .1, .1, .5, "#8a5a3c") + box(P, 6.6, 5.3, 0, .1, .1, .5, "#8a5a3c"), wo: [5.9, 5.5, .8] },
  see: { szene: P => draussen(P, ["#9fd67f", "#aadd8b"]) + [...Array(8)].map((_, x) => [...Array(4)].map((_, y) => poly(P, [[x, y, -.1], [x + 1, y, -.1], [x + 1, y + 1, -.1], [x, y + 1, -.1]], (x + y) % 2 ? "#7cc6ea" : "#8ccff0")).join("")).join("")
      + [[1, 4.2], [2.2, 4.4], [6.5, 4.1]].map(([x, y]) => { const [sx, sy] = P(x, y, 0); return `<path d="M${sx},${sy} v-60 M${sx + 8},${sy} v-46 M${sx - 8},${sy} v-40" stroke="#6f9e58" stroke-width="6" stroke-linecap="round"/><ellipse cx="${sx}" cy="${sy - 64}" rx="5" ry="14" fill="#8a5a3c"/>`; }).join(""),
    azra: [6.6, 5.2], ding: P => box(P, 5.2, 5.6, 0, .7, .7, .7, "#9aa7b4") + poly(P, [[5.2, 5.6, .7], [5.9, 5.6, .7], [5.9, 6.3, .7], [5.2, 6.3, .7]], "#7cc6ea"), wo: [5.55, 5.95, .7] }
};
// Wo am Ort niemand läuft (Ticket 19): der Nachbar, sein Ding und die großen Möbel der Szene.
const ORT_SPERREN = { post: [[2.1, .9, 3.4, 5.5]], laden: [[0, .5, .9, 7], [2.5, .9, 5.9, 2.1], [6, 4.8, 7.1, 5.9]], cafe: [[2.1, .9, 3.4, 5.5], [5.1, 5.1, 6.4, 6.4]],
  garten: [[1, 1, 1.8, 1.8], [3, .6, 3.8, 1.4], [5.6, .8, 6.4, 1.6], [.8, 3.5, 1.6, 4.3]], huegel: [[.4, .4, 4.6, 4.4], [6.6, .6, 7.4, 1.4], [.6, 6.1, 1.4, 6.9], [6.8, 6.4, 7.6, 7.2], [5, 5.2, 6.8, 5.9]], see: [[0, 0, 8, 4.3]] };
for(const [id, o] of Object.entries(ORTE)) o.boden = { w: 8, h: 8, sperren: [[2.1, 5.1, 3.1, 6.1], [o.wo[0] - .5, o.wo[1] - .5, o.wo[0] + .5, o.wo[1] + .5], ...ORT_SPERREN[id]] };
// ---------- Küche (Ticket 22): Kühlschrank, Herd, Kochbuch, Tisch; kochen mit der Katze ----------
const KUECHE_BODEN = { w: 8, h: 8, sperren: [[0, 0, 1.1, 6.8], [4.2, 3.6, 6.4, 5.6], [2.6, 2.4, 3.6, 3.4]] };
function kueche(){
  const P = PO, K = window.KOCHEN; let s = innen(P, ["#fbe7c6", "#fdf0d8"], ["#e9eef2", "#dfe6ec"]) + fenster(P);
  s += box(P, 0, .2, 0, 1, 1.4, 3.4, "#f4f6f8") + poly(P, [[1.01, .4, 1.6], [1.01, 1.4, 1.6], [1.01, 1.4, 1.7], [1.01, .4, 1.7]], "#c4ccd4"); // Kühlschrank
  s += box(P, 0, 1.7, 0, 1, 3.4, 1.5, "#c98f5e") + box(P, -.05, 1.65, 1.5, 1.1, 3.5, .12, "#f3e6d2") + box(P, .2, 3.6, 1.62, .6, .9, .1, "#9fc3dd"); // Arbeitsplatte mit Spüle
  s += box(P, 0, 5.2, 0, 1, 1.5, 1.5, "#e8e2d8") + poly(P, [[1.01, 5.4, .3], [1.01, 6.5, .3], [1.01, 6.5, 1.1], [1.01, 5.4, 1.1]], "#3b2f2a") // Herd mit Ofen
    + [[.5, 5.6], [.5, 6.3]].map(([x, y]) => { const [cx, cy] = P(x, y, 1.51); return `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="9" fill="#3e4650"/>`; }).join("");
  s += box(P, 2.4, 0, 2.6, 3, .4, .12, "#a7744c") + [0, 1, 2, 3].map(i => box(P, 2.6 + i * .7, .05, 2.72, .4, .3, .5, ["#f2c94c", "#e5607e", "#6fbf8e", "#f08a5d"][i])).join(""); // Regal mit Gläsern
  s += box(P, 4.4, 3.8, 1.3, 1.8, 1.6, .12, "#e0b07a") + [[4.5, 3.9], [6, 3.9], [4.5, 5.2], [6, 5.2]].map(([x, y]) => box(P, x, y, 0, .12, .12, 1.3, "#c98f52")).join(""); // Tisch
  const t = S().kueche && S().kueche.tisch;
  if(K && t && t.date === today()){ const [gx, gy] = P(5.3, 4.6, 1.42); s += K.gerichtBild(t.rezept, gx, gy, .45); }
  s += hot("kochen", hit(...P(.5, 2.7, 1.9), 50) + box(P, .25, 2.3, 1.62, .55, .75, .12, "#e5607e") + box(P, .3, 2.35, 1.74, .45, .65, .03, "#fff")); // Kochbuch
  s += hot("kochen", hit(...P(3.1, 2.9, 1.3), 50) + shadowed(P, 3.1, 2.9, 0, figur(katzeArt()), .32));
  s += ausgangBild(P, "Zum Zimmer", "go:zimmer") + azraFigur(P, .45);
  s += `<text x="840" y="900" text-anchor="middle" class="ui" font-size="30" fill="#5a4a78">Küche</text>`;
  return svg(s);
}
// Der Weg hinaus: eine Matte mit Schild "Zur Karte"; wer auf die Matte läuft oder das Schild antippt, geht zur Karte.
function ausgangBild(P, text = "Zur Karte", act = "go:karte"){ const [px, py] = P(6.3, 7.9), w = text.length * 13 + 40;
  return poly(P, [[5.1, 7.25, .01], [6.3, 7.25, .01], [6.3, 7.95, .01], [5.1, 7.95, .01]], "#d9b88f")
    + hot(act, `<rect x="${px - 5}" y="${py - 110}" width="10" height="110" fill="#8a5a3c"/><g filter="url(#sh)"><rect x="${px - w / 2}" y="${py - 156}" width="${w}" height="60" rx="16" fill="#fff"/></g><text x="${px}" y="${py - 116}" text-anchor="middle" class="ui" font-size="26" fill="#4b3a6e">${text}</text>`); }
// Bild einer Westpark-Buchseite (Ticket 11): ein Ort der Welt (auch ihr Zimmer oder der Park), bis zu 3 Figuren, Dinge
// als große Emoji, Licht nach Wetter (Schnee, Abend, Herbst). sz kommt aus LESEN.szene.
const BUCHORTE = {
  zimmer: P => innen(P, ["#d4bff0", "#e7dafb"], ["#f2d6b0", "#ecc99c"]) + fenster(P) + box(P, 0, 5, 0, 2.4, 2.8, .9, "#9b6ad8") + box(P, .1, 5.1, .9, 2.2, 2.6, .3, "#fff6ec") + box(P, 6.6, 0, 0, 1.2, .6, 3.4, "#c98f5e")
    + [0, 1, 2].map(i => box(P, 6.7, .05, .5 + i * 1.05, 1, .45, .7, ["#e5607e", "#4f9fc9", "#f2c94c"][i])).join(""),
  park: P => draussen(P, ["#9fd67f", "#aadd8b"]) + [[1.2, 1.4], [6.4, 1], [1, 6.2], [6.8, 6.6], [3.6, .6]].map(([x, y]) => { const [sx, sy] = P(x, y, 0);
    return `<rect x="${sx - 9}" y="${sy - 56}" width="18" height="56" fill="#8a6a4f"/><circle cx="${sx}" cy="${sy - 96}" r="52" fill="#5fae5a"/><circle cx="${sx - 26}" cy="${sy - 78}" r="30" fill="#6dbb63"/>`; }).join("")
    + (() => { const [a, b] = P(2.5, 7.6, 0), [c, d] = P(7.6, 2.5, 0); return `<path d="M${a},${b} Q840,640 ${c},${d}" stroke="#e9d9b8" stroke-width="46" fill="none" stroke-linecap="round"/>`; })()
};
const WETTER = {
  schnee: () => `<rect width="1600" height="1000" fill="#fff" opacity=".35"/>` + [...Array(40)].map((_, i) => `<circle cx="${(i * 197) % 1600}" cy="${(i * 131) % 1000}" r="${6 + i % 4 * 2}" fill="#fff"/>`).join(""),
  abend: () => `<rect width="1600" height="1000" fill="#2b2a6b" opacity=".38"/><circle cx="1320" cy="150" r="54" fill="#fff6c8"/><circle cx="1342" cy="136" r="48" fill="#5a5799" opacity=".9"/>`,
  herbst: () => [...Array(16)].map((_, i) => `<ellipse cx="${(i * 233) % 1600}" cy="${(i * 157) % 900}" rx="16" ry="9" fill="${["#e0904a", "#c9672f", "#f2c94c"][i % 3]}" transform="rotate(${i * 37} ${(i * 233) % 1600} ${(i * 157) % 900})"/>`).join("")
};
function buchSzene(sz){
  const P = PO, farbe = S().katze ? S().katze.farbe : "lila";
  let s = (ORTE[sz.ort] ? ORTE[sz.ort].szene : BUCHORTE[sz.ort] || BUCHORTE.park)(P);
  const PLATZ = [[2.8, 5.8], [5.2, 4.4], [4.6, 6.8]], DING = [[6.2, 2.2], [1.6, 3.2], [3.9, 2]];
  sz.dinge.forEach((d, i) => { const [x, y] = P(...DING[i], 0); s += `<text x="${x}" y="${y}" font-size="120" text-anchor="middle">${esc(d)}</text>`; });
  sz.wer.forEach((w, i) => { const art = w === "katze" ? "katze:" + farbe : w, k = art === "heron" ? .42 : art === "snail" ? .45 : w === "azra" ? .45 : .5;
    s += shadowed(P, ...PLATZ[i], 0, figur(art), k, i === 1); });
  if(sz.wetter) s += WETTER[sz.wetter]();
  return `<svg class="szene" viewBox="160 60 1360 900" preserveAspectRatio="xMidYMid meet">${B.defs()}${s}</svg>`;
}
// ---------- Geschichten der Nachbarn (Ticket 25): ohne Aufgabe, eine nach der anderen ----------
const GE = () => window.GESCHICHTEN;
const gerichtHeute = () => { const t = S().kueche && S().kueche.tisch; return !!(t && t.date === today()); };
const geschichte = ort => GE() ? GE().hier(S().geschichten, S().met, today(), ort, gerichtHeute()) : null;
const naechsteGeschichte = () => GE() ? GE().aktuell(S().geschichten, S().met, today()) : null;
const FUND = [4.1, 6.9], BAHN = [2.6, 3.4], START_X = 2.2, ZIEL_X = 6.3, RUNDEN = 6;
const ausruf = (sx, sy) => `<g class="ping" pointer-events="none"><circle cx="${sx}" cy="${sy}" r="22" fill="#f2c94c" stroke="#fff" stroke-width="5"/><text x="${sx}" y="${sy + 11}" text-anchor="middle" class="ui" font-size="32" font-weight="700" fill="#4b3a6e">!</text></g>`;
function fundBild(P, ding){
  const [x, y] = P(...FUND, 0);
  const b = { paket: box(P, FUND[0] - .3, FUND[1] - .3, 0, .6, .6, .45, "#c9955f") + poly(P, [[FUND[0] - .05, FUND[1] - .3, .46], [FUND[0] + .05, FUND[1] - .3, .46], [FUND[0] + .05, FUND[1] + .3, .46], [FUND[0] - .05, FUND[1] + .3, .46]], "#f2e3c2"),
    brille: `<g transform="translate(${x} ${y - 12})" fill="none" stroke="#2b2140" stroke-width="5"><circle cx="-18" r="14" fill="#cfe8f7"/><circle cx="18" r="14" fill="#cfe8f7"/><path d="M-4 -2 Q0 -8 4 -2M-32 -4 L-44 -10M32 -4 L44 -10"/></g>`,
    feder: `<g transform="translate(${x} ${y - 14}) rotate(-30)"><path d="M0 -34 C18 -18 14 16 0 30 C-14 16 -18 -18 0 -34Z" fill="#9fb8d6"/><path d="M0 -30 V40" stroke="#5a6f8c" stroke-width="3"/></g>`,
    schluessel: `<g transform="translate(${x} ${y - 10})" fill="#e3b53c" stroke="#a87d16" stroke-width="3"><circle cx="-16" r="12" fill="none" stroke-width="7"/><path d="M-4 0 H30 M18 0 V10 M26 0 V8" stroke-width="6" fill="none"/></g>` }[ding];
  return hot("fund", hit(x, y - 20, 56) + b) + ping(P, FUND[0], FUND[1], 1.4);
}
// Schneckenrennen auf Lottes Balkon: jedes Antippen feuert Lotte an, die andere Schnecke ist immer etwas langsamer.
function rennBild(P){
  const v = V.rennen, schritt = (ZIEL_X - START_X) / RUNDEN, wo = (y, n) => [START_X + n * schritt, y];
  let s = BAHN.map(y => poly(P, [[START_X - .4, y - .32, .01], [ZIEL_X + .5, y - .32, .01], [ZIEL_X + .5, y + .32, .01], [START_X - .4, y + .32, .01]], "#d8bf8f", 'stroke="#fff" stroke-width="3"')).join("");
  s += [0, 1, 2, 3, 4, 5, 6, 7].map(i => poly(P, [[ZIEL_X + .3, BAHN[0] - .32 + i * .2, .02], [ZIEL_X + .5, BAHN[0] - .32 + i * .2, .02], [ZIEL_X + .5, BAHN[0] - .12 + i * .2, .02], [ZIEL_X + .3, BAHN[0] - .12 + i * .2, .02]], i % 2 ? "#fff" : "#2b2140")).join("");
  s += `<g style="filter:hue-rotate(150deg)">${shadowed(P, ...wo(BAHN[1], Math.min(v * .7, RUNDEN - 1)), 0, figur("snail"), .34)}</g>`;
  const [lx, ly] = P(...wo(BAHN[0], v), 0);
  return s + hot("anfeuern", hit(lx, ly - 30, 60) + shadowed(P, ...wo(BAHN[0], v), 0, figur("snail"), .4));
}
// Ein Schritt der Geschichte ist getan; am Ende gibt es das Geschenk für ihre Kiste.
function geschichteWeiter(h){
  S().geschichten = GE().weiter(S().geschichten, h.g.id, today());
  if(h.i === h.g.schritte.length - 1 && window.EINRICHTEN){ S().zimmer = EINRICHTEN.schenken(S().zimmer, h.g.geschenk); V.cat = "Das Geschenk liegt jetzt in deiner Kiste."; klimper(); }
  ST.save();
}
function erzaehlen(h){
  const n = AM[V.ort];
  if(h.s.art === "reden"){ geschichteWeiter(h); return say(n.id, h.s.sag); }
  if(h.s.art === "rennen"){ V.rennen = 0; return say(n.id, "Auf die Plätze, fertig, los! Tipp auf mich, dann krieche ich schneller!"); }
  if(h.wartet) return say(n.id, h.s.warte);
  if(h.s.gericht) S().kueche.tisch = null; // das Gericht hat sie Otto gebracht
  geschichteWeiter(h); say(n.id, h.s.sag);
}
function ort(){
  const P = PO, o = ORTE[V.ort], n = AM[V.ort]; let s = o.szene(P);
  const h = V.schritt === "da" && geschichte(V.ort);
  if(V.rennen != null) s += rennBild(P);
  else if(V.schritt !== "zu"){
    const k = n.art === "heron" ? .42 : n.art === "snail" ? .45 : .5;
    const nb = shadowed(P, 2.6, 5.6, 0, figur(n.art), k, n.art !== "heron" && n.art !== "snail");
    s += SP() && SP().offen ? nb : hot("weiter", hit(...P(2.6, 5.6, 1.4), 55) + nb); // während der Stunde ist sie nicht antippbar
    if(h && h.s.art !== "finden" && !h.wartet) s += ausruf(...P(2.6, 5.6, n.art === "heron" ? 3.6 : 2.6));
  }
  if(h && h.s.art === "finden") s += fundBild(P, h.s.ding);
  if(V.schritt === "job" || V.schritt === "hallo") s += hot("ding", hit(...P(...o.wo), 80) + o.ding(P)) + (V.schritt === "job" ? ping(P, o.wo[0], o.wo[1], o.wo[2] + 1.2) : "");
  if(V.ort === "laden" && S().met.hilde) s += hot("einkaufen", hit(...P(.4, 3.5, 1.6), 70) + `<g class="ping" pointer-events="none"><circle cx="${P(.4, 3.6, 3.6)[0]}" cy="${P(.4, 3.6, 3.6)[1]}" r="16" fill="#fff" stroke="#8e5bd6" stroke-width="6"/></g>`);
  s += ausgangBild(P) + azraFigur(P, .45);
  if(["garten", "huegel", "see"].includes(V.ort)) s += draussenWetter();
  s += `<text x="840" y="900" text-anchor="middle" class="ui" font-size="30" fill="#5a4a78">${n.ortName}</text>`;
  if(window.FREUNDE && S().met[n.id]) s += FREUNDE.herzBild(n.id, 840, 945); // Ticket 38
  // Mit offener Arbeitskarte wird das Diorama quer klein und rückt nach links (PLAN: kleines Diorama links, Karte
  // rechts); hochkant liegt die Karte darunter
  if(SP() && SP().offen && innerWidth > innerHeight) s = `<g transform="translate(-100 170) scale(.6)">${s}</g>`;
  return svg(s);
}
function ankommen(id){
  V.screen = "ort"; V.ort = id; V.pos = id; V.msg = null; V.cat = null; V.rennen = null;
  const n = AM[id];
  if(!tag().offen.includes(id)){ V.schritt = "zu"; return say("katze", "Wer hier wohnt, lernst du bald kennen."); }
  if(!S().met[n.id]){ V.schritt = "hallo"; return say(n.id, n.hallo); }
  V.schritt = "da";
  const sp = SP() && SP().amOrt(id);
  if(sp && sp.start){ V.msg = null; return sp.start(); } // die Stunde geht vor; Herzen und Geschenk beim nächsten Besuch
  // Ticket 38: ein Besuch füllt die Herzen; ein Geschenk oder die abgegebene Besorgung kommt vor der Geschichte
  const fr = window.FREUNDE && FREUNDE.ankommen(n.id);
  if(fr) return say(n.id, fr);
  const h = geschichte(id);
  if(h && h.s.art === "finden") return say("katze", "Schau mal, da liegt etwas!");
  if(h && h.s.art === "rennen") return say(AM[id].id, "Bist du bereit fürs Rennen? Tipp auf mich!");
  if(h) return erzaehlen(h);
  if(sp && sp.offline){ sp.gesagt(); return say(n.id, sp.offline); }
  say(n.id, sp && sp.frei ? "Tipp auf mich, wenn du mir noch helfen magst." : (window.FREUNDE && FREUNDE.bitte(n.id)) || "Schön, dass du da bist, Azra.");
}

// ---------- Katzenwahl am ersten Tag ----------
function katzeWahl(){
  const farben = Object.entries(B.KATZEN);
  app.innerHTML = `<section class="pick"><svg class="pickcat" viewBox="-190 -340 380 360">${figur("katze:" + V.farbe)}</svg>
    <h1>Deine Katze</h1><div class="farben">${farben.map(([id, k]) => `<button class="farbe${id === V.farbe ? " on" : ""}" data-act="farbe:${id}" aria-label="${k.name}" style="background:${k.c}"></button>`).join("")}</div>
    <label class="name">Wie heißt sie?<input id="katzeName" maxlength="14" autocomplete="off" value="${esc(V.katzeName || "")}"></label>
    <button class="fertig" data-act="katzeFertig"${(V.katzeName || "").trim() ? "" : " disabled"}>Fertig</button>
    ${V.cat ? `<p class="bub katzebub">${esc(V.cat)}</p>` : ""}</section>`;
  const inp = app.querySelector("#katzeName");
  inp.oninput = () => { V.katzeName = inp.value; app.querySelector(".fertig").disabled = !inp.value.trim(); };
}

// ---------- Zeichnen und Tippen ----------
function render(){
  if(V.screen === "katze") return katzeWahl();
  app.innerHTML = V.screen === "karte" ? karte() : V.screen === "ort" ? ort() : V.screen === "kueche" ? kueche() : zimmer().replace("</svg>", (V.screen === "brief" ? briefKarte() : "") + "</svg>");
}
// Zu einem Bildschirm gehen, danach (optional) etwas dort tun.
function gehe(z, dann){
  if(location.hash === "#" + z){ route(); if(dann) dann(); return; }
  if(dann) addEventListener("hashchange", () => dann(), { once: true });
  location.hash = z;
}
// Nach "Alles später": gleich weiter zum Nächsten, was heute dran ist, nie zur eben weggelegten Zeit.
function naechstes(ohne){
  const e = SP() && SP().einladungen().find(x => x.kind !== ohne);
  if(!e) return gehe("zimmer", () => say("katze", "Gut, das machen wir später."));
  hin(e);
}
// Zu einer Zeit von heute gehen (nach "Nächste Stunde"); dort beginnt sie.
function zurZeit(kind){ const e = SP() && SP().einladungen().find(x => x.kind === kind); if(!e) return naechstes(kind); SP().vorziehen(kind); hin(e); }
function hin(e){
  if(e.kind === "lesen") return gehe("zimmer", () => window.REGAL && REGAL.oeffnen());
  if(SP().RAUM.includes(e.ort)) return gehe("zimmer", () => ACT.sag(e.ort));
  gehe("ort/" + e.ort);
}
const ACT = {
  go(z){ if(location.hash === "#" + z) route(); else location.hash = z; },
  sag(k){
    const sp = SP() && SP().RAUM.includes(k) && SP().amOrt(k);
    if(sp && sp.start) return sp.start();
    if(k === "regal" && window.REGAL && REGAL.oeffnen()) return;
    // Ticket 27: am Basteltisch malen, im Puppenhaus spielen; eine freie Aufgabe gibt es dort auf Wunsch
    if(k === "basteln" && window.MALEN) return MALEN.oeffnen(sp && sp.frei);
    if(k === "puppen" && window.PUPPENHAUS) return PUPPENHAUS.oeffnen(sp && sp.frei);
    if(sp && sp.frei) return sp.frei();
    if(k === "tisch" && SP() && SP().merkheft()) return;
    if(k === "bett") return ACT.schlafen();
    say("katze", ZIMMER[k]);
  },
  hint(){ say("katze", tipp()); },
  nurSpielen(){ SP().spielen(true); say("katze", "Gut, heute spielen wir nur. Morgen geht es weiter."); },
  lernen(){ SP().spielen(false); say("katze", tipp()); },
  schlafen(){ if(SP()) SP().schliessen(); V.nacht = true; V.msg = null; say("katze", "Gute Nacht, Azra. Schlaf schön!"); },
  // nur nach einem fertigen Tag beginnt der nächste; sonst wäre der echte Morgen schon verbraucht (Review)
  aufwachen(){ V.nacht = false; if(SP() && SP().plan() && !SP().einladungen(true).length) SP().neuerTag(); say("katze", "Guten Morgen! " + (tipp() || "")); },
  neuerTag(){ SP().neuerTag(); say("katze", "Guten Morgen! Ein neuer Tag beginnt. " + (tipp() || "")); },
  spiele(){ if(window.SPIELE) SPIELE.oeffnen(); },
  kochen(){ if(window.KOCHEN) KOCHEN.oeffnen(); },
  kiste(){ if(window.EINRICHTEN) EINRICHTEN.oeffnen(); },
  garten(){ if(window.JAHR && JAHR.oeffnen) JAHR.oeffnen(); },
  katze(){ if(window.KATZE && KATZE.oeffnen) KATZE.oeffnen(); else ACT.hint(); },
  einkaufen(){ if(window.KOCHEN) KOCHEN.laden(); },
  markt(){ if(!window.FREUNDE) return; if(V.screen !== "karte") return FREUNDE.markt(); geh([8.2, 5.2], () => FREUNDE.markt()); },
  zettel(){ const z = window.FREUNDE && FREUNDE.offenerZettel(); if(z) say("katze", `Auf dem Zettel steht: ${z}.`); },
  brief(){
    if(!briefDaten()) return say("katze", "Heute ist kein neuer Brief da.");
    ACT.go("brief");
  },
  ort(id){
    if(V.screen !== "karte") return ACT.go(id === "zuhause" ? "zimmer" : "ort/" + id);
    geh(HAUS[id].st, () => { V.pos = id;
      if(id === "zuhause") return ACT.go("zimmer");
      if(id === "schule") return say("katze", "Von der Schule kommst du jeden Tag nach Hause.");
      ACT.go("ort/" + id); });
  },
  weiter(){ if(SP() && SP().offen) return; const n = AM[V.ort]; if(V.schritt === "hallo"){ V.schritt = "job"; say(n.id, n.job); return; } if(V.schritt === "job" || V.schritt === "zu") return;
    const h = geschichte(V.ort); if(h && h.s.art !== "finden") return erzaehlen(h);
    const sp = SP() && SP().amOrt(V.ort); if(sp && (sp.start || sp.frei)) return (sp.start || sp.frei)();
    say(n.id, (window.FREUNDE && FREUNDE.bitte(n.id)) || "Schön, dass du da bist, Azra."); },
  ding(){
    const n = AM[V.ort]; if(V.schritt === "hallo") return ACT.weiter();
    if(V.schritt !== "job") return;
    S().met[n.id] = today(); S().purse += 50; ST.save();
    V.schritt = "danke"; klimper(); say(n.id, n.danke);
  },
  fund(){ const h = geschichte(V.ort); if(!h || h.s.art !== "finden") return; geschichteWeiter(h); klimper(); say("katze", h.s.sag); },
  anfeuern(){ const h = geschichte(V.ort), n = AM[V.ort]; if(!h || h.s.art !== "rennen" || V.rennen == null) return;
    if(++V.rennen < RUNDEN) return say(n.id, ["Schneller!", "Ich gebe alles!", "Weiter so, Azra!", "Gleich sind wir da!", "Noch ein bisschen!"][V.rennen - 1]);
    V.rennen = null; geschichteWeiter(h); say(n.id, h.s.sag); },
  farbe(f){ V.farbe = f; V.cat = "Und wie heiße ich?"; sprich("katze", V.cat); katzeWahl(); },
  katzeFertig(){
    const name = (V.katzeName || "").trim(); if(!name) return;
    S().katze = { farbe: V.farbe, name }; ST.save();
    history.replaceState(null, "", "#zimmer"); V.screen = "zimmer"; V.pos = "zuhause";
    say("katze", `Ich bin ${name}, und ich bleibe bei dir.`);
  }
};
app.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"), k = kontext();
  if(!el){ // auf den Boden getippt: sie läuft hin
    const svg = e.target.closest && e.target.closest("#world svg"); if(!k || !svg) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()), xy = G.vonBild(k.o, k.u, p.x, p.y);
    if(V.screen === "zimmer" && window.EINRICHTEN && EINRICHTEN.tippBoden(xy, ZIMMER_BODEN)) return render(); // sie stellt gerade etwas hin
    return geh(xy);
  }
  const [a, arg] = el.dataset.act.split(":");
  // ein Ding im Zimmer oder am Ort: sie geht hin, während es schon passiert
  const an = k && V.screen !== "karte" && (V.screen === "ort" ? { weiter: [2.6, 5.6], ding: ORTE[V.ort].wo, fund: FUND } : V.screen === "kueche" ? AN.kueche : { ...AN.zimmer, ...korbPlatz() })[a === "sag" ? arg : a];
  if(an) geh(an, () => {});
  if(ACT[a]) ACT[a](arg);
});
// Pfeiltasten: ein Schritt; gedrückt halten läuft weiter.
addEventListener("keydown", e => {
  const d = G.pfeil(e.key), k = d && !app.hidden && ["#eltern", "#buch", "#spiele", "#kochen", "#pflege", "#kiste", "#beet", "#malen", "#puppenhaus", "#markt"].every(s => document.querySelector(s).hidden) && kontext();
  if(!k || /input|select|textarea/i.test(document.activeElement && document.activeElement.tagName)) return;
  e.preventDefault(); if(geht) return;
  const [x, y] = k.xy(), n = [x + d[0], y + d[1]];
  if(G.frei(k.boden, ...n) && !(V.screen === "karte" && Math.hypot(n[0] - x, n[1] - y) < .1)) geh(n);
});
function route(){
  const h = location.hash.slice(1) || "zimmer";
  V.msg = null; V.cat = null; V.nacht = false; weg++; geht = false;
  if(window.EINRICHTEN) EINRICHTEN.abbrechen();
  if(SP()) SP().schliessen();
  if(window.REGAL) REGAL.schliessen();
  if(window.KATZE && KATZE.offen) KATZE.zu();
  if(window.EINRICHTEN && EINRICHTEN.offen) EINRICHTEN.zu();
  if(window.JAHR && JAHR.offen) JAHR.zu();
  if(window.MALEN && MALEN.offen) MALEN.zu();
  if(window.PUPPENHAUS && PUPPENHAUS.offen) PUPPENHAUS.zu();
  if(window.KOCHEN && KOCHEN.offen){ KOCHEN.lauf && KOCHEN.lauf.stop(); document.getElementById("kochen").hidden = true; }
  if(window.SPIELE && SPIELE.offen){ SPIELE.lauf && SPIELE.lauf.stop(); document.getElementById("spiele").hidden = true; }
  if(window.speechSynthesis) speechSynthesis.cancel();
  if(!S().katze){ V.screen = "katze"; V.farbe = V.farbe || "lila"; V.cat = "Hallo Azra! Welche Farbe habe ich?"; sprich("katze", V.cat); return render(); }
  if(h.startsWith("ort/") && ORTE[h.slice(4)]){ platz(h); return ankommen(h.slice(4)); }
  V.screen = ["zimmer", "karte", "brief", "kueche"].includes(h) ? h : "zimmer";
  platz(V.screen === "brief" ? "zimmer" : V.screen);
  if(V.screen === "brief"){
    const b = briefDaten();
    if(!b){ V.screen = "zimmer"; return render(); }
    if(!S().gelesen[b.key]){ S().gelesen[b.key] = today(); ST.save(); }
    sprich(b.von, b.zeilen.join(" "));
  }
  if(V.screen === "zimmer" || V.screen === "brief") V.pos = "zuhause";
  render();
  // abends einmal am Tag: die Katze erinnert ans Bett
  const f = window.JAHR && JAHR.fest(today());
  if(V.screen === "zimmer" && f && festGesagt !== today()){ festGesagt = today(); say("katze", festSag(f)); }
  else if(V.screen === "zimmer" && abend() && abendGesagt !== today()){ abendGesagt = today(); say("katze", "Es ist schon Abend. Wenn du müde bist, geh in dein Bett."); }
}
// wo(), boden() und punkt(x, y) für die Bildschirm-Prüfungen: wo sie steht und wo ein Bodenpunkt auf dem Bildschirm liegt.
function punkt(x, y, imBild){ const k = kontext(), [sx, sy] = B.isoP(k.o, k.u)(x, y); if(imBild) return [sx, sy];
  const m = document.querySelector("#world svg").getScreenCTM(); return [m.a * sx + m.c * sy + m.e, m.b * sx + m.d * sy + m.f]; }
// Aus der Küche zu Hilde: dort gleich das Einkaufen.
const zuHilde = () => gehe("ort/laden", () => window.KOCHEN && KOCHEN.laden());
window.WELT = { today, sprich, klimper, buchSzene, naechstes, zurZeit, zuHilde, zeige: render, ZIMMER_BODEN, katzeSagt: t => say("katze", t), wo: () => ({ screen: V.screen, xy: V.screen === "karte" ? kartenPlatz() : V.xy }), boden: () => kontext().boden, punkt, start(){ app.hidden = false; document.querySelector("#gear").hidden = false; window.addEventListener("hashchange", route); route(); } };
})();
