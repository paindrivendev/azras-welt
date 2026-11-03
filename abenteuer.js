/* Karten-Abenteuer (Ticket 40, Eltern: "Map adventures").
   Schatzsuche: ihre Katze versteckt einen Schatz auf der Karte und schreibt kurze Hinweise (links, rechts, neben, hinter,
   Namen der Orte); je schneller sie liest, desto länger die Hinweise. Sie liest, tippt auf den Boden, Azra gräbt dort.
   Postrunde mit Emil: Briefe mit Hausnummern (bis 100) in die richtige Hausnummer bringen, eine freundliche Sonnenuhr läuft mit.
   Tiersuche: Tiere der echten Jahreszeit verstecken sich auf der Karte; jedes gefundene wird ein Sticker mit einem Satz zum Lesen.
   Nie Geld weg, nie verloren, nie blockiert es das Lernen.
   Spielstand in S.abenteuer = {schatz: {spot, date, fehl} | null, schaetze: n, bezahlt: {date, n}, post: Datum der bezahlten Runde,
   tiere: {tier: Datum}}. */
(function(root){
"use strict";
const node = typeof module !== "undefined" && module.exports;
const J = node ? require("./jahr.js") : root.JAHR;

// ---------- Schatzsuche ----------
// Verstecke auf offenem Boden der Karte (x, y wie in welt.js); links/rechts/hinter so, wie sie es auf dem Bildschirm sieht.
// hinweise[stufe]: 1, 2 oder 3 kurze Sätze
// Bei einem Baum liegt das Versteck knapp hinter dem Stamm, damit auch ein Tipp auf die Krone trifft.
const VERSTECKE = [
  { id: "cafe-laden", xy: [10.2, 10.6], hinweise: [["Zwischen Café und Laden."],
    ["Geh zum Café.", "Der Schatz ist rechts daneben."],
    ["Im Café gibt es Kuchen.", "Rechts daneben ist Hildes Laden.", "Dazwischen liegt der Schatz."]] },
  { id: "see", xy: [.2, 8.3], hinweise: [["Beim Baum oben links am See."],
    ["Geh zum See.", "Er liegt beim Baum oben links."],
    ["Im Wasser ist der Schatz nicht.", "Geh oben links am See vorbei.", "Unter dem Baum dort ist er."]] },
  { id: "wegende", xy: [9.8, 13.5], hinweise: [["Ganz unten am Ende vom Weg."],
    ["Geh den Weg am Café vorbei.", "Am Ende vom Weg ist der Schatz."],
    ["Der Weg führt am Café vorbei.", "Folge ihm bis ganz nach unten.", "Dort am Ende liegt der Schatz."]] },
  { id: "huegel", xy: [4.2, 13.5], hinweise: [["Links neben Milas Hügel."],
    ["Geh zu Milas Hügel.", "Der Schatz ist links daneben."],
    ["Mila wohnt in einem Hügel.", "Geh hin, aber nicht hinein.", "Links daneben liegt der Schatz."]] },
  { id: "laden-baum", xy: [12.9, 9.2], hinweise: [["Beim Baum rechts vor dem Laden."],
    ["Geh zu Hildes Laden.", "Er liegt beim Baum rechts davor."],
    ["Bei Hilde kaufst du ein.", "Rechts vor dem Laden ist ein Baum.", "Darunter liegt der Schatz."]] },
  { id: "schule-post", xy: [5, 2.8], hinweise: [["Zwischen Schule und Post."],
    ["Geh zur Post.", "Der Schatz ist links daneben."],
    ["In der Schule lernen Kinder.", "Rechts daneben ist die Post.", "Dazwischen liegt der Schatz."]] },
  { id: "haus-weg", xy: [9.1, 2.6], hinweise: [["Auf dem Weg links von deinem Haus."],
    ["Geh zu deinem Haus.", "Links daneben auf dem Weg ist er."],
    ["Du wohnst im lila Haus.", "Links davon ist ein Weg.", "Dort liegt der Schatz."]] }
];
const SPOT = Object.fromEntries(VERSTECKE.map(v => [v.id, v]));
const SCHATZ_LOHN = 20, SCHATZ_MAX = 3, NAH = 1.4;
// Wie lang die Hinweise sind: nach ihrem Lesetempo (Wörter pro Minute); ohne Messung die kürzesten
const hinweisStufe = wpm => !(wpm >= 60) ? 0 : wpm < 80 ? 1 : 2;
const hinweis = (a, stufe) => a.schatz ? SPOT[a.schatz.spot].hinweise[stufe] : null;

function norm(a){
  a = a && typeof a === "object" ? a : {};
  const s = a.schatz, schatz = s && SPOT[s.spot] && typeof s.date === "string" ? { spot: s.spot, date: s.date, fehl: Math.max(0, Math.floor(+s.fehl) || 0) } : null;
  const b = a.bezahlt || {}, bezahlt = typeof b.date === "string" ? { date: b.date, n: Math.min(SCHATZ_MAX, Math.max(0, Math.floor(+b.n) || 0)) } : { date: "", n: 0 };
  const tiere = Object.fromEntries(Object.entries(a.tiere || {}).filter(([id, d]) => TIER[id] && typeof d === "string"));
  return { schatz, letzter: SPOT[a.letzter] ? a.letzter : "", schaetze: Math.max(0, Math.floor(+a.schaetze) || 0), bezahlt, post: typeof a.post === "string" ? a.post : "", tiere };
}
// Die Katze versteckt einen neuen Schatz, nie da, wo der letzte lag oder sie gerade einen gefunden hat
function verstecken(a, date, rng){
  const frei = VERSTECKE.filter(v => v.id !== (a.schatz ? a.schatz.spot : a.letzter));
  return { ...a, schatz: { spot: frei[Math.floor(rng() * frei.length) % frei.length].id, date, fehl: 0 } };
}
// Sie gräbt bei xy: nah genug am Versteck ist er gefunden (bis 3 Schätze am Tag mit Geld); sonst zählt nur, wie oft sie gesucht hat
function graben(a, xy, date){
  if(!a.schatz) return { a, gefunden: false, lohn: 0 };
  const v = SPOT[a.schatz.spot];
  if(Math.hypot(v.xy[0] - xy[0], v.xy[1] - xy[1]) > NAH) return { a: { ...a, schatz: { ...a.schatz, fehl: a.schatz.fehl + 1 } }, gefunden: false, lohn: 0 };
  const heute = a.bezahlt.date === date ? a.bezahlt.n : 0, lohn = heute < SCHATZ_MAX ? SCHATZ_LOHN : 0;
  return { a: { ...a, schatz: null, letzter: v.id, schaetze: a.schaetze + 1, bezahlt: { date, n: Math.min(SCHATZ_MAX, heute + 1) } }, gefunden: true, lohn };
}

// ---------- Postrunde ----------
// Eine Straße: oben 6 ungerade, unten 6 gerade Hausnummern nebeneinander; 5 Briefe für Häuser darin.
// Stufe 0: bis 20, Stufe 1: bis 50, Stufe 2: über 40 bis 100
const BRIEF_LOHN = 5;
function strasse(rng, stufe){
  const [von, bis] = [[1, 9], [11, 39], [41, 89]][Math.max(0, Math.min(2, stufe))];
  const start = Math.min(bis, von + 2 * Math.floor(rng() * ((bis - von) / 2 + 1)));
  const oben = [...Array(6)].map((_, i) => start + 2 * i), unten = oben.map(n => n + 1);
  const alle = [...oben, ...unten];
  for(let i = alle.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)) % (i + 1); [alle[i], alle[j]] = [alle[j], alle[i]]; }
  return { oben, unten, briefe: alle.slice(0, 5) };
}
// Eine Runde am Tag bringt Geld, je Brief 5 ct; danach darf sie weiter austragen
function postLohn(a, n, date){
  if(a.post === date) return { a, lohn: 0 };
  return { a: { ...a, post: date }, lohn: n * BRIEF_LOHN };
}

// ---------- Tiersuche ----------
// Je Jahreszeit 8 Tiere; see: am Ufer statt bei einem Baum. Ein Satz zum Lesen, wahr und kurz.
const TIERE = {
  herbst: [
    { id: "eichhoernchen", e: "🐿️", name: "Eichhörnchen", fakt: "Das Eichhörnchen versteckt Nüsse für den Winter in der Erde." },
    { id: "igel", e: "🦔", name: "Igel", fakt: "Der Igel schläft im Winter in einem Haufen aus Laub." },
    { id: "spinne", e: "🕷️", name: "Spinne", fakt: "Im Herbst glitzern Spinnennetze am Morgen voller Tau." },
    { id: "eule", e: "🦉", name: "Eule", fakt: "Die Eule jagt nachts und sieht im Dunkeln sehr gut." },
    { id: "feldmaus", e: "🐭", name: "Feldmaus", fakt: "Die Feldmaus sammelt Körner und wohnt unter der Erde." },
    { id: "dachs", e: "🦡", name: "Dachs", fakt: "Der Dachs gräbt sich einen Bau mit vielen Gängen." },
    { id: "wildschwein", e: "🐗", name: "Wildschwein", fakt: "Wildschweine wühlen mit der Schnauze nach Eicheln." },
    { id: "hirsch", e: "🦌", name: "Hirsch", fakt: "Im Herbst rufen die Hirsche ganz laut im Wald." }],
  winter: [
    { id: "rotkehlchen", e: "🐦", name: "Rotkehlchen", fakt: "Das Rotkehlchen hat eine orange Brust und singt auch im Winter." },
    { id: "meise", e: "🐦", name: "Meise", fakt: "Meisen freuen sich im Winter über Körner im Futterhaus." },
    { id: "fuchs", e: "🦊", name: "Fuchs", fakt: "Der Fuchs hört sogar Mäuse, die unter dem Schnee laufen." },
    { id: "reh", e: "🦌", name: "Reh", fakt: "Rehe suchen im Winter unter dem Schnee nach Gras." },
    { id: "hase", e: "🐇", name: "Hase", fakt: "Der Hase hat im Winter ein dickes, warmes Fell." },
    { id: "spatz", e: "🐦", name: "Spatz", fakt: "Bei Kälte plustert sich der Spatz auf wie ein kleiner Ball." },
    { id: "stockente", e: "🦆", name: "Stockente", see: true, fakt: "Enten haben warme Federn und schwimmen auch im Winter." },
    { id: "fledermaus", e: "🦇", name: "Fledermaus", fakt: "Die Fledermaus schläft im Winter kopfüber in einer Höhle." }],
  fruehling: [
    { id: "marienkaefer", e: "🐞", name: "Marienkäfer", fakt: "Der Marienkäfer frisst viele kleine Blattläuse." },
    { id: "frosch", e: "🐸", name: "Frosch", see: true, fakt: "Im Frühling legen Frösche ihren Laich ins Wasser." },
    { id: "zitronenfalter", e: "🦋", name: "Zitronenfalter", fakt: "Der Zitronenfalter ist einer der ersten Schmetterlinge im Jahr." },
    { id: "biene", e: "🐝", name: "Biene", fakt: "Die Biene sammelt Nektar und macht daraus Honig." },
    { id: "amsel", e: "🐦", name: "Amsel", fakt: "Die Amsel singt im Frühling schon ganz früh am Morgen." },
    { id: "raupe", e: "🐛", name: "Raupe", fakt: "Aus der Raupe wird später ein Schmetterling." },
    { id: "junghase", e: "🐇", name: "Junger Hase", fakt: "Junge Hasen kommen mit Fell und offenen Augen zur Welt." },
    { id: "ameise", e: "🐜", name: "Ameise", fakt: "Ameisen tragen Dinge, die viel schwerer sind als sie selbst." }],
  sommer: [
    { id: "entenkueken", e: "🦆", name: "Entenküken", see: true, fakt: "Entenküken können gleich nach dem Schlüpfen schwimmen." },
    { id: "schnecke", e: "🐌", name: "Schnecke", fakt: "Die Schnecke trägt ihr Haus immer auf dem Rücken." },
    { id: "grille", e: "🦗", name: "Grille", fakt: "Die Grille zirpt, indem sie ihre Flügel aneinanderreibt." },
    { id: "schwalbe", e: "🐦", name: "Schwalbe", fakt: "Schwalben fangen Mücken mitten im Flug." },
    { id: "eidechse", e: "🦎", name: "Eidechse", fakt: "Die Eidechse wärmt sich gern in der Sonne." },
    { id: "schmetterling", e: "🦋", name: "Schmetterling", fakt: "Der Schmetterling schmeckt mit seinen Füßen." },
    { id: "hummel", e: "🐝", name: "Hummel", fakt: "Die Hummel fliegt auch, wenn es draußen noch kühl ist." },
    { id: "schwan", e: "🦢", name: "Schwan", see: true, fakt: "Junge Schwäne sind grau und ganz flauschig." }]
};
const TIER = Object.fromEntries(Object.values(TIERE).flat().map(t => [t.id, t]));
// Verstecke für Tiere: bei Bäumen und am Ufer (offener Boden, nicht bei den Schatz-Verstecken)
// (nicht unter einem Ort, einem Nachbarn, einem Schild oder dem Hinweis oben links)
const TIER_PLAETZE = [[5.5, 5], [12.2, 12.4], [13.4, 11.4], [4.2, 5], [6.5, 4.6]];
const UFER = [[.6, 7.4], [6.4, 6.7]];
const TIERE_TAG = 3;
const saison = date => J.jahreszeit(date);
// Zufall, der an einem Tag immer gleich ausfällt
function tagZufall(date){ let h = 2166136261; for(const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ h >>> 15, 1 | h); h ^= h + Math.imul(h ^ h >>> 7, 61 | h); return ((h ^ h >>> 14) >>> 0) / 4294967296; }; }
const mischen = (xs, rng) => { xs = [...xs]; for(let i = xs.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };
// Die Tiere von heute: bis 3, den ganzen Tag dieselben; gefundene verstecken sich nicht mehr
function tiereHeute(a, date){
  const rng = tagZufall(date), wahl = mischen(TIERE[saison(date)].filter(t => !a.tiere[t.id] || a.tiere[t.id] === date), rng).slice(0, TIERE_TAG);
  const land = mischen(TIER_PLAETZE, rng), ufer = mischen(UFER, rng);
  return wahl.map(t => ({ tier: t, platz: t.see ? ufer.shift() : land.shift() })).filter(x => !a.tiere[x.tier.id]);
}
const finden = (a, id, date) => TIER[id] ? { ...a, tiere: { ...a.tiere, [id]: a.tiere[id] || date } } : a;

const AB = { VERSTECKE, NAH, SCHATZ_LOHN, BRIEF_LOHN, TIERE, TIER_PLAETZE, UFER, hinweisStufe, hinweis, norm, verstecken, graben, strasse, postLohn, saison, tiereHeute, finden };
if(node){ module.exports = AB; return; }

// ---------- Im Browser ----------
const ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("abenteuer");
const D = () => root.WELT.today();
const katze = () => (S().katze || {}).name || "";
function stand(){ S().abenteuer = norm(S().abenteuer); return S().abenteuer; }
function setze(a){ S().abenteuer = a; ST.save(); }
const sagK = t => root.WELT.katzeSagt(t);
// Ihr Lesetempo der letzten Tage (Bücher, Ticket 07); ohne Messung die kürzesten Hinweise
function stufe(){ const L = root.LESEN, t = L && S().lesen && Array.isArray(S().lesen.seiten) ? L.tempo(S().lesen.seiten).slice(-3) : [];
  return hinweisStufe(t.length ? t.reduce((s, x) => s + x.wpm, 0) / t.length : null); }

// Auf der Karte: sucht sie gerade? Glitzer nach vielen Versuchen, die Truhe kurz nach dem Fund
let sucht = false, truhe = null;
function schatz(){
  let a = stand(); if(!a.schatz){ a = verstecken(a, D(), Math.random); setze(a); }
  sucht = true; sagK("Lies meinen Hinweis und tipp dorthin, wo der Schatz liegt.");
}
function aufhoeren(){ sucht = false; root.WELT.zeige(); }
// Azra ist auf offenem Boden stehen geblieben und gräbt
function graben_(xy){
  if(!sucht) return;
  const r = graben(stand(), xy, D()); setze(r.a);
  if(r.gefunden){ sucht = false; truhe = xy; setTimeout(() => { truhe = null; root.WELT.zeige(); }, 3500);
    if(r.lohn){ S().purse += r.lohn; ST.save(); root.WELT.klimper(); }
    return sagK(r.lohn ? `Du hast den Schatz gefunden, darin sind ${r.lohn} Cent für dich!` : "Du hast den Schatz gefunden, du bist eine echte Schatzsucherin!"); }
  const f = r.a.schatz.fehl, h = hinweis(r.a, stufe()).join(" ");
  if(f === 1) return sagK("Lies den Hinweis noch einmal, hier ist der Schatz nicht.");
  if(f < 4) return sagK(h); // die Katze liest den Hinweis vor
  sagK("Schau, dort glitzert etwas!");
}
// Bild für die Karte: Glitzer, Truhe und die Tiere von heute; add(tiefe, svg) wie in welt.js
function aufKarte(P, add, hot, hit){
  const a = stand();
  if(sucht && a.schatz && a.schatz.fehl >= 4){ const v = SPOT[a.schatz.spot], [x, y] = P(...v.xy);
    add(v.xy[0] + v.xy[1], `<g class="ping glitzer" pointer-events="none"><text x="${x}" y="${y}" text-anchor="middle" font-size="44">✨</text></g>`); }
  if(truhe){ const [x, y] = P(...truhe);
    add(truhe[0] + truhe[1] + .6, `<g class="truhe" pointer-events="none"><rect x="${x - 30}" y="${y - 40}" width="60" height="36" rx="6" fill="#b5793f" stroke="#7a4f24" stroke-width="4"/><path d="M${x - 30},${y - 40} Q${x},${y - 66} ${x + 30},${y - 40}Z" fill="#d39a5a" stroke="#7a4f24" stroke-width="4"/><circle cx="${x}" cy="${y - 26}" r="7" fill="#f2c94c"/></g>`); }
  for(const { tier, platz } of tiereHeute(a, D())){ const [x, y] = P(...platz);
    add(platz[0] + platz[1] + .2, hot(`tier:${tier.id}`, hit(x, y - 22, 48) + `<text x="${x}" y="${y}" text-anchor="middle" font-size="42">${tier.e}</text>`)); }
}
// Der Hinweis der Katze oben links (nur während der Suche)
function karteOben(hot){
  const a = stand(); if(!sucht || !a.schatz) return "";
  // schmal genug, dass kein Versteck, kein Tier und kein Ortsschild darunter liegt (Sätze bis 34 Zeichen)
  const z = hinweis(a, stufe()), w = 570, h = 66 + z.length * 44;
  return `<g class="hinweis"><g filter="url(#sh)"><rect x="210" y="24" width="${w}" height="${h}" rx="22" fill="#fffbe0"/></g>`
    + `<text x="236" y="58" class="ui" font-size="24" fill="#8a6a4f">🗺 Hinweis von ${esc(katze())}</text>`
    + z.map((l, i) => `<text x="236" y="${102 + i * 44}" class="lesen" font-size="32" fill="#3b2b52">${esc(l)}</text>`).join("") + "</g>"
    + hot("schatzAus", `<rect x="${210 + w - 104}" y="20" width="104" height="104" fill="transparent"/><circle cx="${210 + w - 44}" cy="62" r="26" fill="#f1e6c0"/><text x="${210 + w - 44}" y="72" text-anchor="middle" class="ui" font-size="30" fill="#8a6a4f">✕</text>`);
}
const tierZahl = () => tiereHeute(stand(), D()).length;
const tierPlatz = id => { const t = tiereHeute(stand(), D()).find(x => x.tier.id === id); return t && t.platz; };

// ---------- Überblendung: Sticker und Postrunde ----------
let uhr = null;
function zu(){ if(uhr){ clearInterval(uhr); uhr = null; } box().hidden = true; root.WELT.zeige(); }
function oeffnen(html){ root.SPIEL && root.SPIEL.schliessen(); box().hidden = false; el("abAus").onclick = zu; el("abS").innerHTML = html; el("abC").hidden = true; }
const emil = () => (root.WOCHE.NACHBARN.find(n => n.id === "emil") || {}).name || "Emil";
function sag(t, wer){ el("abC").innerHTML = `<span class="who">${esc(wer === "emil" ? emil() : katze())}</span>${esc(t)}`; el("abC").hidden = false; root.WELT.sprich(wer || "katze", t); }
// Ein Tier gefunden: es wird ein Sticker, sie liest den Satz (🔊 liest vor)
function tier(id){
  const t = TIER[id]; if(!t) return;
  setze(finden(stand(), id, D()));
  oeffnen(`<h2 class="ui">Neuer Sticker!</h2><div class="sticker"><span class="tier">${t.e}</span><b class="ui">${esc(t.name)}</b>
    <p class="lesen">${esc(t.fakt)}</p><button class="btn" id="abVor">🔊 Vorlesen</button></div>`);
  el("abVor").onclick = () => root.WELT.sprich("katze", t.fakt);
  sag("Lies, was auf deinem neuen Sticker steht.");
}
// Postrunde: Emil gibt 5 Briefe; sie tippt das Haus mit der Nummer. Die Sonne wandert, aber niemand verliert.
const SONNE = 100;
function postStufe(){ const k = (S().classAt || {}).mathe || 1; return k <= 2 ? 0 : k <= 4 ? 1 : 2; }
function postrunde(){
  const r = strasse(Math.random, postStufe()); let i = 0, t0 = Date.now(), weg = [];
  const haus = n => `<button class="haus${weg.includes(n) ? " da" : ""}" data-haus="${n}"><span class="dach"></span><span class="nr">${n}</span>${weg.includes(n) ? '<span class="post">✉</span>' : ""}</button>`;
  const bild = () => {
    el("abS").innerHTML = `<h2 class="ui">Postrunde mit Emil</h2><div class="himmel"><span id="abSonne">☀️</span></div>`
      + (i < r.briefe.length ? `<div class="brief-jetzt ui">✉ Brief für Nummer <b>${r.briefe[i]}</b></div>` : `<div class="brief-jetzt ui">Alle Briefe sind da!</div>`)
      + `<div class="strasse"><div class="reihe">${r.oben.map(haus).join("")}</div><div class="fahrbahn"></div><div class="reihe">${r.unten.map(haus).join("")}</div></div>`
      + (i < r.briefe.length ? "" : `<div class="aufgabe-fuss"><button class="btn" id="abNoch">Noch eine Runde</button></div>`);
    sonne();
    el("abS").querySelectorAll("[data-haus]").forEach(b => b.onclick = () => tippe(+b.dataset.haus));
    if(el("abNoch")) el("abNoch").onclick = postrunde;
  };
  const sonne = () => { const s = el("abSonne"); if(!s) return; const f = Math.min(1, (Date.now() - t0) / 1000 / SONNE);
    s.style.left = `calc(${(f * 100).toFixed(1)}% - ${f * 60}px)`; };
  function tippe(n){
    if(i >= r.briefe.length) return;
    const ziel = r.briefe[i];
    if(n !== ziel){
      const tipp = n % 2 !== ziel % 2 ? (ziel % 2 ? "wohnt oben bei den ungeraden Nummern" : "wohnt unten bei den geraden Nummern") : ziel > n ? "kommt danach" : "kommt davor";
      return sag(`Das ist Nummer ${n}, die ${ziel} ${tipp}.`, "emil"); }
    weg.push(n); i++;
    if(i < r.briefe.length){ bild(); return sag(["Danke!", "Angekommen!", "Super, weiter so!", "Der ist da!"][i % 4], "emil"); }
    clearInterval(uhr); uhr = null;
    const p = postLohn(stand(), r.briefe.length, D()); setze(p.a);
    if(p.lohn){ S().purse += p.lohn; ST.save(); root.WELT.klimper(); }
    bild(); sag(p.lohn ? `Alle Briefe sind da, hier sind ${p.lohn} Cent für dich!` : "Alle Briefe sind da, danke für deine Hilfe!", "emil");
  }
  oeffnen(""); if(uhr) clearInterval(uhr); uhr = setInterval(sonne, 1000);
  bild(); sag("Oben wohnen die ungeraden Nummern, unten die geraden.", "emil");
}

root.ABENTEUER = { ...AB, stand, schatz, aufhoeren, graben: graben_, aufKarte, karteOben, tierZahl, tierPlatz, tier, postrunde, zu,
  get sucht(){ return sucht; }, get offen(){ return !box().hidden; } };
})(this);
