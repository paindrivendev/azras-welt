/* Spiele zwischendurch (Ticket 13, Rückmeldung der Eltern: "echte Spiele, die ihr Spaß machen"). Ideen und Gründe:
   .scratch/azras-welt-build/research-spiele.md. Alle drei ohne Verlieren, ohne Zeitdruck, nichts stirbt:
   - Labyrinth: sie führt ihre Katze mit dem Finger zu einem Nachbarn; jedes gelöste Labyrinth wird etwas größer.
   - Wortblume: ein Bild, das Wort darunter mit Lücken; jeder gefundene Buchstabe lässt die Blume wachsen.
   - Aquarium: Füttern kostet nichts; neue Fische und Pflanzen kauft sie mit ihrem Geld.
   - Memory: Paare finden (Ticket 15), ab dem 3. Spiel abwechselnd Bild und Wort.
   Zählt nicht als Üben. Spielstand in S.spiele = {labyrinth, memory, woerter: gelöst, aquarium: {fische, pflanzen, deko, geputzt}}. */
(function(root){
"use strict";
// ---------- Regeln (rein, getestet) ----------
const N = 1, O = 2, S_ = 4, W = 8; // offene Seiten einer Zelle
// Ein perfektes Labyrinth (genau ein Weg zwischen zwei Zellen), Tiefensuche mit Rücksprung.
function labyrinth(w, h, rand){
  const zellen = new Array(w * h).fill(0), besucht = new Array(w * h).fill(false), stapel = [0]; besucht[0] = true;
  while(stapel.length){
    const c = stapel.at(-1), x = c % w, y = Math.floor(c / w);
    const nb = [[0, -1, N, S_], [1, 0, O, W], [0, 1, S_, N], [-1, 0, W, O]]
      .map(([dx, dy, a, b]) => [x + dx, y + dy, a, b]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && !besucht[ny * w + nx]);
    if(!nb.length){ stapel.pop(); continue; }
    const [nx, ny, a, b] = nb[Math.floor(rand() * nb.length)], n = ny * w + nx;
    zellen[c] |= a; zellen[n] |= b; besucht[n] = true; stapel.push(n);
  }
  return { w, h, zellen };
}
function offen(m, a, b){
  const { w } = m, d = b - a;
  if(d === 1 && b % w !== 0) return !!(m.zellen[a] & O);
  if(d === -1 && a % w !== 0) return !!(m.zellen[a] & W);
  if(d === w) return !!(m.zellen[a] & S_);
  if(d === -w) return !!(m.zellen[a] & N);
  return false;
}
// Tor (Labyrinth ab dem 3.): die Wand zwischen a und b ist zu, bis sie den Schlüssel hat.
const zu = (tor, a, b) => !!tor && (tor.a === a && tor.b === b || tor.a === b && tor.b === a);
function weg(m, von, ziel, tor){
  const vor = new Map([[von, -1]]), q = [von];
  while(q.length){ const c = q.shift(); if(c === ziel) break;
    for(const n of [c - m.w, c + 1, c + m.w, c - 1]) if(n >= 0 && n < m.zellen.length && !vor.has(n) && offen(m, c, n) && !zu(tor, c, n)){ vor.set(n, c); q.push(n); } }
  if(!vor.has(ziel)) return null;
  const p = []; for(let c = ziel; c !== -1; c = vor.get(c)) p.unshift(c); return p;
}
const sackgasse = (m, c) => [N, O, S_, W].filter(b => m.zellen[c] & b).length === 1;
const mische = (a, rand) => { a = [...a]; for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Was im Labyrinth liegt: 3 Sterne in Sackgassen (weit auseinander), ab dem 3. Labyrinth ein Tor auf dem Weg zum Nachbarn
// und sein Schlüssel in einer Sackgasse davor, abseits des Wegs. Das Tor möglichst in der Mitte des Wegs; hängt dort
// noch keine Sackgasse am Weg, rückt es weiter zum Nachbarn hin (davor liegt dann mehr Labyrinth).
function aufbau(m, n, rand){
  const ziel = m.w * m.h - 1, haupt = weg(m, 0, ziel), aufWeg = new Set(haupt), mitte = haupt.length / 2;
  let tor = null;
  if(n >= 2){
    const ks = mische([...Array(haupt.length - 2)].map((_, i) => i + 1), rand).sort((a, b) => Math.abs(a - mitte) - Math.abs(b - mitte));
    for(const k of ks){
      const t = { a: haupt[k], b: haupt[k + 1] };
      const vor = m.zellen.map((_, c) => c).filter(c => !aufWeg.has(c) && sackgasse(m, c) && weg(m, 0, c, t));
      if(vor.length){ tor = { ...t, schluessel: vor[Math.floor(rand() * vor.length)] }; break; }
    }
  }
  const frei = mische(m.zellen.map((_, c) => c).filter(c => c !== 0 && c !== ziel && sackgasse(m, c) && !(tor && c === tor.schluessel)), rand);
  const abstand = (a, b) => Math.abs(a % m.w - b % m.w) + Math.abs(Math.floor(a / m.w) - Math.floor(b / m.w)), weit = (m.w + m.h) / 4;
  const sterne = [];
  for(const c of frei) if(sterne.length < 3 && sterne.every(s => abstand(s, c) >= weit)) sterne.push(c);
  for(const c of frei) if(sterne.length < 3 && !sterne.includes(c)) sterne.push(c);
  return { ziel, sterne, tor };
}
const anfang = () => ({ pos: 0, spur: [0], sterne: [], schluessel: false });
// Ein Schritt in eine Nachbarzelle durch eine offene Seite; zurück auf die vorige Zelle nimmt die Spur zurück.
// Mit lv: ein Stern oder der Schlüssel wird aufgehoben, das Tor lässt sie nur mit Schlüssel durch.
function schritt(m, z, ziel, lv){
  if(!offen(m, z.pos, ziel)) return z;
  if(lv && !z.schluessel && zu(lv.tor, z.pos, ziel)) return z;
  const spur = z.spur.at(-2) === ziel ? z.spur.slice(0, -1) : [...z.spur, ziel], n = { ...z, pos: ziel, spur };
  if(lv){ if(lv.sterne.includes(ziel) && !z.sterne.includes(ziel)) n.sterne = [...z.sterne, ziel];
    if(lv.tor && ziel === lv.tor.schluessel) n.schluessel = true; }
  return n;
}
const geschafft = (z, lv) => z.pos === lv.ziel && lv.sterne.every(s => z.sterne.includes(s));
// Wohin der Tipp zeigt: das Nächste, das sie noch braucht und erreichen kann (Schlüssel oder Stern), sonst der Nachbar.
function naechstes(m, z, lv){
  const tor = z.schluessel ? null : lv.tor;
  const ziele = [...lv.sterne.filter(s => !z.sterne.includes(s)), ...(tor ? [tor.schluessel] : [])]
    .map(c => [c, weg(m, z.pos, c, tor)]).filter(([, p]) => p).sort((a, b) => a[1].length - b[1].length);
  return ziele.length ? ziele[0][0] : lv.ziel;
}
const GROESSEN = [[7, 5], [8, 6], [9, 6], [10, 7], [11, 8], [12, 8], [13, 9], [14, 10], [16, 11]];
const groesse = n => GROESSEN[Math.min(n, GROESSEN.length - 1)];
// Wortblume: Groß-/Kleinschreibung egal, ß bleibt ß
const gross = b => b === "ß" ? "ß" : b.toUpperCase();
function raten(s, b){
  const B = gross(b), drin = [...s.wort].some(c => gross(c) === B);
  const t = drin ? { ...s, gefunden: s.gefunden.includes(B) ? s.gefunden : [...s.gefunden, B] } : { ...s, falsch: s.falsch.includes(B) ? s.falsch : [...s.falsch, B] };
  return { s: t, treffer: drin, fertig: [...t.wort].every(c => t.gefunden.includes(gross(c))) };
}
const anzeige = s => [...s.wort].map(c => s.gefunden.includes(gross(c)) ? c : "_").join("");
function verraten(s, rand){
  if(s.falsch.length < 3) return null;
  const fehlt = [...new Set([...s.wort].map(gross))].filter(b => !s.gefunden.includes(b));
  return fehlt.length ? fehlt[Math.floor(rand() * fehlt.length)] : null;
}
// Wörter der 2. Klasse in drei Stufen (Rückmeldung der Eltern, Ticket 14/15): 6–7 Buchstaben (nur fürs Memory), 8–9, ab 10.
// Stufe 2 und 3 mit einem Rätsel der Katze; das Bild ist in der Wortblume versteckt und nur ein Tipp.
const WOERTER = [
  [["Schule", "🏫"], ["Kirsche", "🍒"], ["Pinsel", "🖌️"], ["Brille", "👓"], ["Schere", "✂️"], ["Tasche", "👜"], ["Spinne", "🕷️"], ["Frosch", "🐸"],
   ["Hamster", "🐹"], ["Papagei", "🦜"], ["Pinguin", "🐧"], ["Giraffe", "🦒"], ["Elefant", "🐘"], ["Delfin", "🐬"], ["Drache", "🐉"], ["Rakete", "🚀"],
   ["Fahrrad", "🚲"], ["Zitrone", "🍋"], ["Kürbis", "🎃"], ["Brezel", "🥨"], ["Ananas", "🍍"], ["Gitarre", "🎸"], ["Schnee", "❄️"], ["Traktor", "🚜"],
   ["Einhorn", "🦄"], ["Schwein", "🐷"], ["Karotte", "🥕"], ["Banane", "🍌"], ["Tomate", "🍅"], ["Laterne", "🏮"], ["Kuchen", "🍰"], ["Mantel", "🧥"],
   ["Stiefel", "👢"], ["Fußball", "⚽"], ["Polizei", "🚓"], ["Telefon", "☎️"], ["Lineal", "📏"], ["Kompass", "🧭"], ["Magnet", "🧲"], ["Melone", "🍈"],
   ["Vulkan", "🌋"], ["Känguru", "🦘"], ["Leopard", "🐆"], ["Nashorn", "🦏"]],
  [["Schlange", "🐍", "Ein langes Tier ohne Beine. Es zischt."], ["Krokodil", "🐊", "Ein grünes Tier mit vielen spitzen Zähnen. Es lebt im Fluss."],
   ["Geschenk", "🎁", "Das bekommst du zum Geburtstag. Es ist eingepackt."], ["Erdbeere", "🍓", "Eine rote Frucht mit kleinen Kernen außen."],
   ["Kartoffel", "🥔", "Sie wächst in der Erde. Daraus macht man Pommes."], ["Rucksack", "🎒", "Du trägst ihn auf dem Rücken zur Schule."],
   ["Bleistift", "✏️", "Damit schreibst du in der Schule. Man kann ihn spitzen."], ["Flugzeug", "✈️", "Es fliegt hoch am Himmel und bringt Leute in den Urlaub."],
   ["Kaninchen", "🐰", "Ein Tier mit langen Ohren. Es frisst gern Möhren."], ["Trompete", "🎺", "Ein Instrument aus Gold. Man bläst hinein, und es ist laut."],
   ["Gespenst", "👻", "Es sagt Huuu und ist ganz weiß."], ["Zauberer", "🧙", "Er hat einen spitzen Hut und einen Zauberstab."],
   ["Handschuh", "🧤", "Im Winter ziehst du ihn an, damit die Finger warm bleiben."], ["Feuerwehr", "🚒", "Sie kommt mit Blaulicht und Sirene und löscht Brände."],
   ["Computer", "💻", "Er hat einen Bildschirm und eine Tastatur."], ["Schnecke", "🐌", "Sie ist sehr langsam und trägt ihr Haus auf dem Rücken."],
   ["Walfisch", "🐳", "Das größte Tier im Meer."], ["Gewitter", "⛈️", "Es blitzt und donnert."],
   ["Regenwurm", "🪱", "Er wohnt in der Erde und kommt heraus, wenn es nass ist."], ["Feuerwerk", "🎆", "An Silvester knallt es bunt am Himmel."],
   ["Flamingo", "🦩", "Ein rosa Vogel. Er steht oft auf einem Bein."], ["Waschbär", "🦝", "Ein Tier mit einer schwarzen Maske um die Augen."],
   ["Teddybär", "🧸", "Ein weiches Kuscheltier mit runden Ohren."], ["Weltkugel", "🌍", "Darauf siehst du alle Länder und Meere. Man kann sie drehen."],
   ["Schwester", "👧", "Ein Mädchen, das dieselben Eltern hat wie du."], ["Freundin", "👭", "Ein Mädchen, mit dem du am liebsten spielst."],
   ["Turnschuh", "👟", "Den ziehst du im Sportunterricht an."], ["Fernseher", "📺", "Darauf schaust du am Abend einen Film."],
   ["Bäckerei", "🥐", "Dort kaufst du Brot, Semmeln und Brezen."], ["Zahnarzt", "🦷", "Er schaut in deinen Mund und sagt, ob alles gesund ist."],
   ["Spielzeug", "🪀", "Damit spielst du in deinem Zimmer."], ["Hausschuh", "🥿", "Den ziehst du drinnen an die Füße, damit sie warm bleiben."]],
  [["Schildkröte", "🐢", "Ein Tier mit einem harten Panzer. Es ist sehr langsam."], ["Tannenbaum", "🎄", "Er ist immer grün und hat Nadeln statt Blätter."],
   ["Tintenfisch", "🐙", "Ein Meerestier mit acht Armen."], ["Pfannkuchen", "🥞", "Man backt ihn in der Pfanne und isst ihn mit Marmelade."],
   ["Weintraube", "🍇", "Viele kleine runde Früchte hängen zusammen."], ["Prinzessin", "👸", "Sie wohnt in einem Schloss und trägt eine Krone."],
   ["Dinosaurier", "🦕", "Ein riesiges Tier, das vor sehr langer Zeit gelebt hat."], ["Schmetterling", "🦋", "Er hat bunte Flügel und war vorher eine Raupe."],
   ["Eichhörnchen", "🐿️", "Ein rotbraunes Tier mit buschigem Schwanz. Es sammelt Nüsse."], ["Fledermaus", "🦇", "Sie fliegt in der Nacht und schläft kopfüber."],
   ["Hubschrauber", "🚁", "Er fliegt mit einem großen Propeller auf dem Dach."], ["Krankenwagen", "🚑", "Er fährt mit Blaulicht zum Krankenhaus."],
   ["Regenbogen", "🌈", "Er ist bunt und kommt nach dem Regen, wenn die Sonne scheint."], ["Regenschirm", "☂️", "Du hältst ihn über den Kopf, damit du nicht nass wirst."],
   ["Schneemann", "⛄", "Er steht im Winter im Garten und hat eine Karotte als Nase."], ["Sonnenblume", "🌻", "Eine große gelbe Blume. Sie dreht sich zum Licht."],
   ["Geburtstag", "🎂", "An diesem Tag wirst du ein Jahr älter."], ["Marienkäfer", "🐞", "Ein kleiner roter Käfer mit schwarzen Punkten."],
   ["Zahnbürste", "🪥", "Damit putzt du dir morgens und abends den Mund sauber."], ["Luftballon", "🎈", "Du bläst ihn auf. Wenn er platzt, knallt es."],
   ["Wassermelone", "🍉", "Eine große Frucht, außen grün und innen rot."], ["Fallschirm", "🪂", "Damit springt man aus dem Flugzeug und schwebt nach unten."],
   ["Ritterburg", "🏰", "Dort wohnen Ritter. Sie hat Türme und eine dicke Mauer."], ["Kaffeetasse", "☕", "Daraus trinken Erwachsene am Morgen etwas Heißes."],
   ["Pausenbrot", "🥪", "Das isst du in der Schule, wenn es klingelt."], ["Briefkasten", "📮", "Er ist gelb. Dort wirfst du einen Brief ein."],
   ["Klassenzimmer", "🏫", "Hier sitzt du in der Schule mit deiner Lehrerin."], ["Wohnzimmer", "🛋️", "Hier steht das Sofa, und die Familie sitzt zusammen."],
   ["Winterjacke", "🧥", "Die ziehst du an, wenn es draußen schneit."], ["Kindergarten", "🧒", "Da warst du, bevor du in die Schule gekommen bist."],
   ["Mittagessen", "🍽️", "Das isst du in der Mitte des Tages."], ["Hausaufgabe", "📝", "Die machst du nach der Schule am Schreibtisch."],
   ["Weihnachten", "🎅", "Das Fest im Dezember mit Christbaum und Geschenken."], ["Bilderbuch", "📚", "Ein Buch mit vielen bunten Bildern und wenig Text."]]];
// Die ersten 8 Wörter aus Stufe 2, dann Stufe 2 und 3, ab 20 gelösten meist Stufe 3. → [wort, bild, rätsel]
function wortWahl(geloest, rand){
  const [, b, c] = WOERTER, pool = geloest < 8 ? b : geloest < 20 ? [...b, ...c] : [...c, ...c, ...b];
  return pool[Math.floor(rand() * pool.length)];
}
// Memory (Rückmeldung der Eltern: "she also likes memory games a lot"): Paare finden, ohne Verlieren. Bild-Paare, ab dem
// 3. Spiel abwechselnd Bild und Wort (ein Bild, ein Wort der Wortblume Stufe 1). Von 8 bis 15 Paaren.
const MEMO_BILDER = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🦉", "🦄", "🐝", "🐞", "🦋", "🐢", "🐙", "🐬", "🦒", "🦓", "🦔"];
const MEMO_GROESSEN = [8, 12, 16, 20];
function memoryKarten(paare, rand, modus){
  if(modus === "wort") return mische(mische(WOERTER[0], rand).slice(0, paare).flatMap(([w, b]) => [{ paar: w, seite: "bild", zeigt: b }, { paar: w, seite: "wort", zeigt: w }]), rand);
  return mische(mische(MEMO_BILDER, rand).slice(0, paare).flatMap(b => [{ paar: b, seite: "bild", zeigt: b }, { paar: b, seite: "bild", zeigt: b }]), rand);
}
// spieler: 1 (allein) oder 2 (zu zweit, z. B. mit Mama oder Papa); dran: wer gerade umdreht; paare: gefundene pro Person
const memoryStart = (karten, spieler = 1) => ({ karten, offen: [], gefunden: [], spieler, dran: 0, paare: [0, 0] });
// Eine Karte umdrehen. Zwei gleiche bleiben offen (gefunden, wer dran ist, darf weiter), zwei verschiedene liegen offen,
// bis zudecken(); dann ist zu zweit die andere Person dran.
function aufdecken(s, i){
  const k = s.karten[i], nichts = { s, paar: false, fertig: false };
  if(!k || s.offen.length >= 2 || s.offen.includes(i) || s.gefunden.includes(k.paar)) return nichts;
  const offen = [...s.offen, i];
  if(offen.length < 2) return { s: { ...s, offen }, paar: false, fertig: false };
  if(s.karten[offen[0]].paar !== k.paar) return { s: { ...s, offen }, paar: false, fertig: false };
  const gefunden = [...s.gefunden, k.paar];
  const paare = s.paare.map((n, p) => p === s.dran ? n + 1 : n);
  return { s: { ...s, offen: [], gefunden, paare }, paar: true, fertig: gefunden.length * 2 === s.karten.length };
}
const zudecken = s => ({ ...s, offen: [], dran: s.offen.length === 2 ? (s.dran + 1) % s.spieler : s.dran });
// Aquarium (Ticket 14): Fische wachsen, wenn sie an verschiedenen Tagen Futter bekommen, haben nach einem Tag ohne Futter
// Hunger (sterben nie), Algen wachsen am Glas, bis sie es putzt. Daten: Datum "JJJJ-MM-TT".
const ARTEN = { goldfisch: { preis: 100, farbe: "#f08a5d", name: "Goldfisch" }, guppy: { preis: 100, farbe: "#9b6fd0", name: "Guppy" },
  clownfisch: { preis: 150, farbe: "#f07a2d", name: "Clownfisch" }, kugelfisch: { preis: 200, farbe: "#f2c94c", name: "Kugelfisch" },
  seepferdchen: { preis: 250, farbe: "#e5607e", name: "Seepferdchen" }, schnecke: { preis: 80, farbe: "#c98f5e", name: "Schnecke" },
  krebs: { preis: 150, farbe: "#d9534f", name: "Krebs" } };
const DEKO = { muscheln: { preis: 50, name: "Muscheln" }, steine: { preis: 50, name: "Steine" }, schatztruhe: { preis: 150, name: "Schatztruhe" },
  taucher: { preis: 150, name: "Taucher" }, burg: { preis: 200, name: "Burg" } };
const MAX_FISCHE = 10, MAX_PFLANZEN = 6, PREIS = { pflanze: 50, ...Object.fromEntries(Object.entries(ARTEN).map(([k, v]) => [k, v.preis])) };
const tage = (von, bis) => Math.round((Date.parse(bis) - Date.parse(von)) / 864e5);
const neuerFisch = (art, heute, farbe) => ({ art, farbe: farbe || ARTEN[art].farbe, name: "", tage: [], gefuettert: heute });
const aquariumStart = heute => ({ fische: [neuerFisch("goldfisch", heute), neuerFisch("guppy", heute, "#4f9fc9")], pflanzen: 2, deko: [], geputzt: heute });
function aquariumNorm(aq, heute){
  if(!aq || typeof aq !== "object" || !Array.isArray(aq.fische)) return aquariumStart(heute);
  const fische = aq.fische.map(f => { const art = ARTEN[f.art] ? f.art : "goldfisch";
    return { art, farbe: f.farbe || ARTEN[art].farbe, name: typeof f.name === "string" ? f.name : "", tage: Array.isArray(f.tage) ? f.tage : [], gefuettert: f.gefuettert || heute }; });
  return { fische, pflanzen: typeof aq.pflanzen === "number" ? aq.pflanzen : 2, deko: Array.isArray(aq.deko) ? aq.deko.filter(d => DEKO[d]) : [], geputzt: aq.geputzt || heute };
}
const hunger = (f, heute) => Math.max(0, Math.min(2, tage(f.gefuettert, heute)));
// nur: ein Fisch (der eben einen Krümel gefressen hat), sonst alle
const fuettern = (aq, heute, nur) => ({ ...aq, fische: aq.fische.map((f, k) => nur !== undefined && k !== nur ? f : { ...f, gefuettert: heute, tage: f.tage.includes(heute) ? f.tage : [...f.tage, heute].slice(-6) }) });
const fischGroesse = f => 1 + Math.min(2, Math.floor(f.tage.length / 3));
const schmutz = (aq, heute) => Math.max(0, Math.min(3, tage(aq.geputzt, heute)));
const putzen = (aq, heute) => ({ ...aq, geputzt: heute });
const benennen = (aq, i, name) => ({ ...aq, fische: aq.fische.map((f, k) => k === i ? { ...f, name: String(name).trim().slice(0, 12) } : f) });
// was: "fisch" (wahl = Art), "pflanze" oder "deko" (wahl = Deko, jede nur einmal)
function kaufen(aq, purse, was, wahl, heute){
  const preis = was === "fisch" ? ARTEN[wahl] && ARTEN[wahl].preis : was === "pflanze" ? PREIS.pflanze : DEKO[wahl] && DEKO[wahl].preis;
  if(!preis || purse < preis) return null;
  if(was === "fisch" && aq.fische.length >= MAX_FISCHE) return null;
  if(was === "pflanze" && aq.pflanzen >= MAX_PFLANZEN) return null;
  if(was === "deko" && aq.deko.includes(wahl)) return null;
  const neu = was === "fisch" ? { ...aq, fische: [...aq.fische, neuerFisch(wahl, heute)] } : was === "pflanze" ? { ...aq, pflanzen: aq.pflanzen + 1 } : { ...aq, deko: [...aq.deko, wahl] };
  return { aq: neu, purse: purse - preis };
}
const SP = { labyrinth, offen, weg, aufbau, anfang, schritt, geschafft, naechstes, groesse, raten, anzeige, verraten, wortWahl, WOERTER,
  MEMO_GROESSEN, memoryKarten, memoryStart, aufdecken, zudecken,
  ARTEN, DEKO, aquariumStart, aquariumNorm, hunger, fuettern, fischGroesse, schmutz, putzen, benennen, kaufen, MAX_FISCHE, MAX_PFLANZEN, PREIS };
if(typeof module !== "undefined" && module.exports){ module.exports = SP; return; }

// ---------- Im Browser ----------
const B = root.BILD, ST = root.STATE, S = () => root.S;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const el = id => document.getElementById(id), box = () => el("spiele");
const katze = () => (S().katze || {}).name || "";
const sprich = t => root.WELT.sprich("katze", t);
let lauf = null; // {stop()}
function sag(t){ el("spC").innerHTML = `<span class="who">${esc(katze())}</span>${esc(t)}`; el("spC").hidden = false; sprich(t); }
function stand(){ const s = S(); s.spiele = s.spiele || {}; s.spiele.labyrinth = s.spiele.labyrinth || 0; s.spiele.woerter = s.spiele.woerter || 0; s.spiele.memory = s.spiele.memory || 0;
  s.spiele.aquarium = aquariumNorm(s.spiele.aquarium, root.WELT.today()); return s.spiele; }
function seite(html){ el("spS").innerHTML = html; }
function stopp(){ if(lauf){ lauf.stop(); lauf = null; } }
function schliessen(){ stopp(); box().hidden = true; root.WELT.zeige(); }
function oeffnen(){
  stopp(); root.SPIEL && root.SPIEL.schliessen(); root.REGAL && root.REGAL.schliessen();
  box().hidden = false; stand();
  seite(`<h2 class="ui">Spiele</h2><div class="spielwahl">
    <button class="spielkarte" data-spiel="labyrinth"><span class="bild">${miniLabyrinth()}</span><span class="titel">Labyrinth</span></button>
    <button class="spielkarte" data-spiel="memory"><span class="bild">${miniMemory()}</span><span class="titel">Memory</span></button>
    <button class="spielkarte" data-spiel="wortblume"><span class="bild">${blume(5, 8)}</span><span class="titel">Wortblume</span></button>
    <button class="spielkarte" data-spiel="aquarium"><span class="bild"><svg viewBox="0 0 200 140"><rect width="200" height="140" rx="14" fill="#8ccff0"/>${fisch(70, 60, "#f08a5d", 1)}${fisch(130, 92, "#4f9fc9", -1)}</svg></span><span class="titel">Aquarium</span></button></div>`);
  el("spS").querySelectorAll("[data-spiel]").forEach(b => b.onclick = () => ({ labyrinth: labyrinthSpiel, memory: memorySpiel, wortblume: wortblume, aquarium })[b.dataset.spiel]());
  el("spAus").textContent = "Zurück"; el("spAus").onclick = schliessen;
  sag("Was möchtest du spielen?");
}
const zurueckZurWahl = () => { el("spAus").textContent = "Andere Spiele"; el("spAus").onclick = oeffnen; };

// ---------- Labyrinth ----------
const THEMEN = { post: ["#fbedc2", "#c9955f"], laden: ["#fbe3e8", "#c2405a"], cafe: ["#e2f3ec", "#8a5a3c"], garten: ["#e8f5dc", "#4e9a4a"], huegel: ["#f1e6d2", "#7d5a40"], see: ["#e3f4ff", "#3f88b3"] };
function miniLabyrinth(){ return `<svg viewBox="0 0 200 140"><rect width="200" height="140" rx="14" fill="#e8f5dc"/><path d="M20,20 H180 V120 H20 Z M60,20 V80 M100,60 V120 M140,20 V90 M60,80 H100" stroke="#4e9a4a" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="40" cy="40" r="12" fill="#c4a6ec"/>${stern(120, 40, 12)}<circle cx="160" cy="105" r="12" fill="#f2c94c"/></svg>`; }
const stern = (x, y, r) => `<path d="${[...Array(10)].map((_, k) => { const a = k * Math.PI / 5 - Math.PI / 2, q = k % 2 ? r * .45 : r; return (k ? "L" : "M") + (x + Math.cos(a) * q).toFixed(1) + "," + (y + Math.sin(a) * q).toFixed(1); }).join("")}Z" fill="#f2c94c" stroke="#c9955f" stroke-width="3" stroke-linejoin="round"/>`;
const schluesselBild = (x, y) => `<g transform="translate(${x} ${y})"><circle cx="-14" cy="0" r="13" fill="none" stroke="#d4a017" stroke-width="8"/><path d="M-1,0 H26 M16,0 V12 M24,0 V9" stroke="#d4a017" stroke-width="8" stroke-linecap="round"/></g>`;
function labyrinthSpiel(){
  stopp(); zurueckZurWahl();
  const st = stand(), NB = root.WOCHE.NACHBARN, n = NB[st.labyrinth % NB.length], [gw, gh] = groesse(st.labyrinth);
  const [w, h] = innerWidth > innerHeight ? [gw, gh] : [gh, gw];
  const m = labyrinth(w, h, Math.random), lv = aufbau(m, st.labyrinth, Math.random), ziel = lv.ziel, [hell, wand] = THEMEN[n.ort] || THEMEN.garten, U = 100;
  let z = anfang(), fertig = false, tippT = null, zuletzt = "";
  const mitte = c => [(c % w) * U + U / 2, Math.floor(c / w) * U + U / 2];
  const farbe = S().katze ? S().katze.farbe : "lila", vorname = n.name.split(" ")[0];
  const waende = () => { let d = `M0,0 H${w * U} V${h * U} H0 Z`;
    m.zellen.forEach((c, i) => { const x = (i % w) * U, y = Math.floor(i / w) * U;
      if(!(c & O) && i % w !== w - 1) d += ` M${x + U},${y} V${y + U}`; if(!(c & S_) && i < w * (h - 1)) d += ` M${x},${y + U} H${x + U}`; });
    return d; };
  const W0 = waende();
  // Das Tor: ein Gitter auf der Grenze zwischen den beiden Zellen
  const torBild = () => { if(!lv.tor || z.schluessel) return ""; const a = Math.min(lv.tor.a, lv.tor.b), x = (a % w) * U, y = Math.floor(a / w) * U;
    const quer = Math.abs(lv.tor.a - lv.tor.b) === 1, [x1, y1, x2, y2] = quer ? [x + U, y + 8, x + U, y + U - 8] : [x + 8, y + U, x + U - 8, y + U];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a5a3c" stroke-width="22" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d4a017" stroke-width="8" stroke-dasharray="6 10"/>`; };
  const male = (tipp = []) => {
    const spur = z.spur.map(mitte).map(p => p.join(",")).join(" "), [kx, ky] = mitte(z.pos), [zx, zy] = mitte(ziel);
    const k = n.art === "heron" ? .2 : n.art === "snail" ? .22 : .25;
    el("labS").innerHTML = `<rect x="-20" y="-20" width="${w * U + 40}" height="${h * U + 40}" rx="24" fill="${hell}"/>
      <polyline points="${spur}" fill="none" stroke="#c4a6ec" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
      ${tipp.map(c => { const [x, y] = mitte(c); return `<circle cx="${x}" cy="${y}" r="16" fill="#f2c94c" class="tipp"/>`; }).join("")}
      <path d="${W0}" stroke="${wand}" stroke-width="12" fill="none" stroke-linecap="round"/>${torBild()}
      ${lv.sterne.filter(s => !z.sterne.includes(s)).map(s => { const [x, y] = mitte(s); return stern(x, y, 30); }).join("")}
      ${lv.tor && !z.schluessel ? schluesselBild(...mitte(lv.tor.schluessel)) : ""}
      ${B.spr(B.figur(n.art), zx, zy + U * .4, k, n.art !== "heron" && n.art !== "snail")}
      ${B.spr(B.figur("katze:" + farbe), kx, ky + U * .4, .25)}`;
  };
  seite(`<div class="labyrinth"><svg id="labS" viewBox="-30 -30 ${w * U + 60} ${h * U + 60}" preserveAspectRatio="xMidYMid meet"></svg></div>
    <div class="aufgabe-fuss"><button class="btn ghost" id="labTipp">Tipp</button></div>`);
  male();
  sag(lv.tor ? `Sammle die drei Sterne und bring mich zu ${vorname}! Das Tor geht nur mit dem Schlüssel auf.` : `Sammle die drei Sterne und bring mich dann zu ${vorname}! Zieh mich mit dem Finger.`);
  const einmal = t => { if(t !== zuletzt){ zuletzt = t; sag(t); } };
  const geh = c => { if(fertig) return; const neu = schritt(m, z, c, lv);
    if(neu === z){ if(lv.tor && !z.schluessel && offen(m, z.pos, c) && (lv.tor.a === z.pos && lv.tor.b === c || lv.tor.b === z.pos && lv.tor.a === c)) einmal("Das Tor ist zu. Such den Schlüssel!"); return; }
    const vorher = z; z = neu; male();
    if(z.sterne.length > vorher.sterne.length){ root.AUFGABEN.KLANG.pop(); einmal(z.sterne.length === lv.sterne.length ? `Alle Sterne! Jetzt zu ${vorname}.` : "Ein Stern!"); }
    if(z.schluessel && !vorher.schluessel){ root.AUFGABEN.KLANG.chime(); einmal("Der Schlüssel! Jetzt geht das Tor auf."); }
    if(z.pos !== ziel) return;
    if(!geschafft(z, lv)) return einmal("Hol zuerst alle Sterne!");
    fertig = true; st.labyrinth++; ST.save(); root.AUFGABEN.KLANG.chime();
    sag(`Geschafft! Danke, Azra! ${vorname} freut sich.`);
    el("spS").querySelector(".aufgabe-fuss").innerHTML = `<button class="btn" id="labNeu">Noch ein Labyrinth</button>`; el("labNeu").onclick = labyrinthSpiel; };
  // Finger: die Zelle unter dem Finger, wenn sie neben der Katze liegt; so läuft sie Zelle für Zelle mit
  const svg = el("labS"); let zieht = false;
  const zelle = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.floor(q.x / U), y = Math.floor(q.y / U); return x >= 0 && y >= 0 && x < w && y < h ? y * w + x : -1; };
  svg.addEventListener("pointerdown", e => { zieht = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); const c = zelle(e); if(c >= 0) geh(c); });
  svg.addEventListener("pointermove", e => { if(!zieht) return; const c = zelle(e); if(c >= 0 && c !== z.pos) geh(c); });
  svg.addEventListener("pointerup", () => { zieht = false; });
  const taste = e => { const d = { ArrowUp: -w, ArrowDown: w, ArrowLeft: -1, ArrowRight: 1 }[e.key]; if(d){ e.preventDefault(); geh(z.pos + d); } };
  addEventListener("keydown", taste);
  // Tipp: ein Stück Weg zum Nächsten, das sie braucht
  el("labTipp").onclick = () => { const p = weg(m, z.pos, naechstes(m, z, lv), z.schluessel ? null : lv.tor); clearTimeout(tippT); male(p.slice(1, 6)); sag("Folge den gelben Punkten.");
    tippT = setTimeout(() => male(), 3000); };
  lauf = { stop(){ removeEventListener("keydown", taste); clearTimeout(tippT); }, geh, get z(){ return z; }, get fertig(){ return fertig; }, m, lv, ziel };
}

// ---------- Memory ----------
const RUECKEN = `<svg viewBox="0 0 100 100" class="ruecken"><rect width="100" height="100" rx="14" fill="#8e5bd6"/><g fill="#c4a6ec"><ellipse cx="50" cy="60" rx="16" ry="13"/><circle cx="30" cy="40" r="7"/><circle cx="43" cy="30" r="7"/><circle cx="57" cy="30" r="7"/><circle cx="70" cy="40" r="7"/></g></svg>`;
function miniMemory(){ return `<svg viewBox="0 0 200 140"><rect width="200" height="140" rx="14" fill="#f3ecfb"/>${[0, 1, 2, 3].map(i => `<rect x="${18 + i * 44}" y="22" width="36" height="44" rx="6" fill="${i === 1 ? "#fff" : "#8e5bd6"}"/>`).join("")}${[0, 1, 2, 3].map(i => `<rect x="${18 + i * 44}" y="76" width="36" height="44" rx="6" fill="${i === 2 ? "#fff" : "#8e5bd6"}"/>`).join("")}<text x="80" y="54" font-size="24" text-anchor="middle">🐸</text><text x="124" y="108" font-size="24" text-anchor="middle">🐸</text></svg>`; }
// Erst wählen (allein oder zu zweit, mit wem, wie groß, Bilder oder Bild und Wort), dann spielen. Die Wahl bleibt.
const MITSPIELER = ["Mama", "Papa", "Oma", "Opa"], GROESSE_NAME = { 8: "Klein", 12: "Mittel", 16: "Groß", 20: "Riesig" };
function memorySpiel(){
  stopp(); zurueckZurWahl();
  const st = stand(), w = st.memoryWahl = { spieler: 1, wer: "Mama", groesse: 8, karten: "bild", ...(st.memoryWahl || {}) };
  const reihe = (titel, feld, werte, name) => `<div class="mem-reihe"><span class="ui">${titel}</span>${werte.map(v => `<button class="btn ghost${w[feld] === v ? " an" : ""}" data-feld="${feld}" data-wert="${v}">${esc(name ? name(v) : v)}</button>`).join("")}</div>`;
  const zeig = () => {
    seite(`<div class="mem-wahl">${reihe("Wer spielt?", "spieler", [1, 2], v => v === 1 ? "Ich allein" : "Wir zu zweit")}
      ${w.spieler === 2 ? reihe("Mit wem?", "wer", MITSPIELER) : ""}
      ${reihe("Wie groß?", "groesse", MEMO_GROESSEN, v => `${GROESSE_NAME[v]} · ${v * 2} Karten`)}
      ${reihe("Karten", "karten", ["bild", "wort"], v => v === "bild" ? "Bild und Bild" : "Bild und Wort")}</div>
      <div class="aufgabe-fuss"><button class="btn" id="memLos">Los!</button></div>`);
    el("spS").querySelectorAll("[data-feld]").forEach(b => b.onclick = () => { const f = b.dataset.feld; w[f] = f === "spieler" || f === "groesse" ? +b.dataset.wert : b.dataset.wert; ST.save(); zeig(); });
    el("memLos").onclick = () => memoryRunde(st, w);
  };
  zeig(); sag("Wie wollt ihr Memory spielen?");
  lauf = { stop(){}, los: () => memoryRunde(st, w), wahl: w };
}
function memoryRunde(st, w){
  stopp();
  let s = memoryStart(memoryKarten(w.groesse, Math.random, w.karten), w.spieler), fertig = false, zuT = null;
  const namen = ["Azra", w.wer], zu2 = w.spieler === 2;
  // gleich volle Reihen: die Spaltenzahl, die n teilt und am nächsten am Seitenverhältnis liegt
  const n = s.karten.length, ziel = Math.sqrt(innerWidth > innerHeight ? n * 1.7 : n / 1.6);
  const spalten = [...Array(n)].map((_, i) => i + 1).filter(d => n % d === 0).sort((a, b) => Math.abs(a - ziel) - Math.abs(b - ziel))[0], zeilen = n / spalten;
  const leiste = () => { if(!zu2) return; el("memLeiste").innerHTML = namen.map((nm, p) => `<div class="mem-spieler${s.dran === p ? " dran" : ""}"><span class="name">${esc(nm)}</span><span class="stapel">${"<i></i>".repeat(s.paare[p])}</span></div>`).join(""); };
  const male = () => { el("memS").querySelectorAll("[data-i]").forEach(b => { const i = +b.dataset.i, k = s.karten[i];
    b.classList.toggle("auf", s.offen.includes(i) || s.gefunden.includes(k.paar)); b.classList.toggle("gefunden", s.gefunden.includes(k.paar)); }); leiste(); };
  seite(`${zu2 ? `<div class="mem-leiste" id="memLeiste"></div>` : ""}<div class="memory${zu2 ? " zu2" : ""}" id="memS" style="--spalten:${spalten};--zeilen:${zeilen}">${s.karten.map((k, i) => `<button class="mem-karte${k.seite === "wort" ? " wort" : ""}" data-i="${i}" aria-label="Karte"><span class="vorne">${esc(k.zeigt)}</span><span class="hinten">${RUECKEN}</span></button>`).join("")}</div>
    <div class="aufgabe-fuss" id="memFuss"></div>`);
  leiste();
  sag(zu2 ? `Azra fängt an. Wer ein Paar findet, darf noch einmal.` : w.karten === "wort" ? "Finde zu jedem Bild das passende Wort!" : "Finde die Paare! Tipp zwei Karten an.");
  const ende = () => { fertig = true; st.memory++; ST.save(); root.AUFGABEN.KLANG.chime();
    const [a, b] = s.paare;
    sag(!zu2 ? "Alle Paare gefunden! Super!" : a > b ? `Alle Paare gefunden! Azra hat die meisten. Toll gespielt!` : a < b ? `Alle Paare gefunden! ${w.wer} hat die meisten. Noch eine Runde?` : "Alle Paare gefunden! Gleich viele. Toll gespielt, ihr beide!");
    el("memFuss").innerHTML = `<button class="btn" id="memNeu">Noch ein Memory</button><button class="btn ghost" id="memWahl">Anders spielen</button>`;
    el("memNeu").onclick = () => memoryRunde(st, w); el("memWahl").onclick = memorySpiel; };
  el("memS").querySelectorAll("[data-i]").forEach(b => b.onclick = () => {
    if(fertig) return; const r = aufdecken(s, +b.dataset.i); if(r.s === s) return; s = r.s; male(); root.AUFGABEN.KLANG.paper();
    if(r.paar){ root.AUFGABEN.KLANG.pop(); if(zu2 && !r.fertig) sag(`Ein Paar! ${namen[s.dran]} darf noch einmal.`); }
    else if(s.offen.length === 2){ zuT = setTimeout(() => { s = zudecken(s); male(); if(zu2) sag(`Jetzt ist ${namen[s.dran]} dran.`); }, 1300); }
    if(r.fertig) ende();
  });
  lauf = { stop(){ clearTimeout(zuT); }, get s(){ return s; }, get fertig(){ return fertig; }, aufdecken: i => el("memS").querySelector(`[data-i="${i}"]`).click(), modus: w.karten };
}

// ---------- Wortblume ----------
const ABC = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"];
function blume(blaetter, max){
  const b = [...Array(Math.min(blaetter, max))].map((_, i) => { const a = i / max * 6.283 - 1.57; return `<ellipse cx="${100 + Math.cos(a) * 30}" cy="${62 + Math.sin(a) * 30}" rx="20" ry="13" transform="rotate(${a * 57.3} ${100 + Math.cos(a) * 30} ${62 + Math.sin(a) * 30})" fill="#e5607e"/>`; }).join("");
  return `<svg viewBox="0 0 200 140"><path d="M100,70 C98,100 104,115 100,138" stroke="#4e9a4a" stroke-width="7" fill="none"/><ellipse cx="82" cy="112" rx="16" ry="7" fill="#5fae5a" transform="rotate(-25 82 112)"/>${b}<circle cx="100" cy="62" r="16" fill="#f2c94c"/></svg>`;
}
let letztesWort = "";
function wortblume(){
  stopp(); zurueckZurWahl();
  const st = stand(); let wahl = wortWahl(st.woerter, Math.random);
  for(let k = 0; k < 5 && wahl[0] === letztesWort; k++) wahl = wortWahl(st.woerter, Math.random);
  const [wort, bild, raetsel] = wahl; letztesWort = wort;
  let s = { wort, gefunden: [], falsch: [] }, fertig = false;
  const anzahl = new Set([...wort].map(gross)).size;
  const male = () => {
    el("wbBlume").innerHTML = blume(Math.round(s.gefunden.length / anzahl * 8), 8);
    el("wbWort").innerHTML = [...wort].map(c => `<span class="lucke">${s.gefunden.includes(gross(c)) ? esc(c) : ""}</span>`).join("");
    el("wbTasten").querySelectorAll("[data-b]").forEach(t => { const b = t.dataset.b; t.disabled = s.gefunden.includes(b) || s.falsch.includes(b); t.classList.toggle("drin", s.gefunden.includes(b)); });
  };
  seite(`<div class="wortblume"><div class="wb-oben"><div class="wb-bild" id="wbBild">❓</div><div id="wbBlume" class="wb-blume"></div></div>
    <div id="wbWort" class="wb-wort${[...wort].length > 9 ? " lang" : ""}"></div><div id="wbTasten" class="wb-tasten">${ABC.map(b => `<button class="taste" data-b="${b}">${b}</button>`).join("")}</div></div>
    <div class="aufgabe-fuss" id="wbFuss"><button class="btn ghost" id="wbTipp">Bild zeigen</button><button class="btn ghost" id="wbNochmal">Rätsel noch mal</button></div>`);
  // Das Rätsel der Katze; das Bild ist versteckt und nur ein Tipp (Rückmeldung der Eltern: sonst zu leicht)
  const bildZeigen = () => { el("wbBild").textContent = bild; const k = el("wbTipp"); if(k) k.remove(); };
  male(); sag(`Rätsel: ${raetsel}`);
  el("wbTipp").onclick = () => { bildZeigen(); sag("Hier ist das Bild dazu."); };
  el("wbNochmal").onclick = () => sag(`Rätsel: ${raetsel}`);
  el("wbTasten").querySelectorAll("[data-b]").forEach(t => t.onclick = () => {
    if(fertig) return; const r = raten(s, t.dataset.b); s = r.s; male();
    if(r.treffer) root.AUFGABEN.KLANG.pop(); else { root.AUFGABEN.KLANG.plop(); const v = verraten(s, Math.random);
      if(v && s.falsch.length % 3 === 0){ s = raten(s, v).s; male(); sag(`Ich verrate dir einen Buchstaben: ${v}.`); } }
    if([...wort].every(c => s.gefunden.includes(gross(c)))){ fertig = true; st.woerter++; ST.save(); root.AUFGABEN.KLANG.chime();
      bildZeigen(); sag(`Super! Das Wort heißt ${wort}.`); el("wbFuss").innerHTML = `<button class="btn" id="wbNeu">Noch ein Wort</button>`; el("wbNeu").onclick = wortblume; }
  });
  lauf = { stop(){}, get s(){ return s; }, wort, raetsel };
}

// ---------- Aquarium ----------
function fisch(x, y, farbe, dir, k = 1){
  return `<g transform="translate(${x} ${y}) scale(${dir * k} ${k})"><path d="M-30,0 C-20,-20 18,-22 30,0 C18,22 -20,20 -30,0Z" fill="${farbe}" stroke="#2b2140" stroke-opacity=".15" stroke-width="2"/>
    <path d="M-28,0 L-48,-16 L-44,0 L-48,16Z" fill="${farbe}"/><path d="M-4,-17 Q4,-28 14,-16" fill="${farbe}"/><circle cx="16" cy="-4" r="5" fill="#fff"/><circle cx="17" cy="-4" r="2.6" fill="#2b2140"/></g>`;
}
const auge = (x, y) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/><circle cx="${x + 1}" cy="${y}" r="2.6" fill="#2b2140"/>`;
// Jede Art gezeichnet um (0,0), Blick nach rechts; dir dreht sie um
function tier(art, x, y, farbe, dir, k = 1){
  const g = inner => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(dir * k).toFixed(2)} ${k.toFixed(2)})">${inner}</g>`;
  switch(art){
    case "guppy": return g(`<path d="M-14,0 L-50,-26 Q-40,0 -50,26Z" fill="${farbe}" opacity=".85"/><ellipse cx="4" cy="0" rx="22" ry="12" fill="#cfe7f5"/>${auge(16, -3)}`);
    case "clownfisch": return g(`<path d="M-30,0 C-20,-20 18,-22 30,0 C18,22 -20,20 -30,0Z" fill="${farbe}"/><path d="M-28,0 L-46,-14 L-42,0 L-46,14Z" fill="${farbe}"/><path d="M-12,-17 Q-6,0 -12,17 M8,-19 Q14,0 8,19" stroke="#fff" stroke-width="7" fill="none"/>${auge(18, -4)}`);
    case "kugelfisch": return g(`${[...Array(12)].map((_, i) => { const a = i / 12 * 6.283; return `<path d="M${Math.cos(a) * 24},${Math.sin(a) * 24} L${Math.cos(a) * 34},${Math.sin(a) * 34}" stroke="#c9955f" stroke-width="4"/>`; }).join("")}<circle r="26" fill="${farbe}"/><path d="M-24,0 L-40,-12 L-40,12Z" fill="${farbe}"/>${auge(12, -6)}<path d="M20,6 Q24,9 20,12" stroke="#2b2140" stroke-width="2" fill="none"/>`);
    case "seepferdchen": return g(`<path d="M0,-36 C14,-36 16,-22 6,-16 C18,-6 16,14 2,22 C-6,28 -4,40 6,38" stroke="${farbe}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M8,-34 L24,-30" stroke="${farbe}" stroke-width="7" stroke-linecap="round"/><path d="M-6,-10 Q-16,-4 -6,4" stroke="${farbe}" stroke-width="5" fill="none" opacity=".7"/>${auge(6, -32)}`);
    case "schnecke": return g(`<path d="M-30,10 H26 Q34,10 32,2 L26,-4" stroke="#e0b58a" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-10" r="20" fill="${farbe}"/><path d="M-6,-10 m-12,0 a12,12 0 1,1 12,12 a7,7 0 1,1 -7,-7" stroke="#8a5a3c" stroke-width="3" fill="none"/><path d="M28,-4 L32,-18 M24,-4 L24,-16" stroke="#e0b58a" stroke-width="3"/>${auge(31, -19)}`);
    case "krebs": return g(`<ellipse cx="0" cy="0" rx="26" ry="16" fill="${farbe}"/><path d="M-20,8 L-30,20 M-8,12 L-12,24 M8,12 L12,24 M20,8 L30,20" stroke="${farbe}" stroke-width="5" stroke-linecap="round"/><path d="M18,-8 Q34,-26 40,-12 M-18,-8 Q-34,-26 -40,-12" stroke="${farbe}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="40" cy="-14" r="8" fill="${farbe}"/><circle cx="-40" cy="-14" r="8" fill="${farbe}"/><path d="M6,-14 V-24 M-6,-14 V-24" stroke="#2b2140" stroke-width="3"/><circle cx="6" cy="-25" r="4" fill="#2b2140"/><circle cx="-6" cy="-25" r="4" fill="#2b2140"/>`);
    default: return g(`<path d="M-30,0 C-20,-20 18,-22 30,0 C18,22 -20,20 -30,0Z" fill="${farbe}" stroke="#2b2140" stroke-opacity=".15" stroke-width="2"/><path d="M-28,0 L-48,-16 L-44,0 L-48,16Z" fill="${farbe}"/><path d="M-4,-17 Q4,-28 14,-16" fill="${farbe}"/>${auge(16, -4)}`);
  }
}
const AM_BODEN = { schnecke: true, krebs: true };
function dekoBild(d, BH, offen){
  const y = BH - 70;
  switch(d){
    case "muscheln": return `<g transform="translate(330 ${y})"><path d="M-40,0 Q-40,-36 -10,-36 Q20,-36 20,0Z" fill="#f6c3c9"/><path d="M-30,0 L-14,-34 M-10,0 L-10,-36 M10,0 L-4,-34" stroke="#e5909b" stroke-width="3"/><path d="M30,2 Q44,-24 62,2Z" fill="#fff0d9"/></g>`;
    case "steine": return `<g transform="translate(560 ${y})"><ellipse cx="0" cy="-10" rx="46" ry="26" fill="#9a9aa8"/><ellipse cx="54" cy="-6" rx="30" ry="18" fill="#7d7d8c"/><ellipse cx="-40" cy="-2" rx="22" ry="12" fill="#b4b4c0"/></g>`;
    case "schatztruhe": return `<g transform="translate(1040 ${y})"><rect x="-56" y="-50" width="112" height="56" rx="8" fill="#8a5a3c"/><path d="M-56,-50 Q0,${offen ? -120 : -86} 56,-50Z" fill="#a8743f" ${offen ? 'transform="rotate(-18 -56 -50)"' : ""}/><rect x="-8" y="-42" width="16" height="18" rx="3" fill="#d4a017"/>${offen ? '<circle cx="-20" cy="-58" r="10" fill="#f2c94c"/><circle cx="6" cy="-62" r="10" fill="#f2c94c"/>' : ""}</g>`;
    case "taucher": return `<g transform="translate(1260 ${y})"><rect x="-20" y="-70" width="40" height="60" rx="14" fill="#f2c94c"/><circle cx="0" cy="-88" r="26" fill="#c9955f"/><circle cx="0" cy="-88" r="15" fill="#9fdcf5" stroke="#8a5a3c" stroke-width="4"/><rect x="-24" y="-12" width="18" height="14" fill="#555"/><rect x="6" y="-12" width="18" height="14" fill="#555"/></g>`;
    case "burg": return `<g transform="translate(790 ${y})"><rect x="-70" y="-120" width="140" height="122" fill="#d8c6a8"/><rect x="-90" y="-160" width="40" height="162" fill="#cbb594"/><rect x="50" y="-160" width="40" height="162" fill="#cbb594"/>${[-90, -70, 50, 70].map(x => `<rect x="${x}" y="-176" width="16" height="18" fill="#cbb594"/>`).join("")}<path d="M-24,2 V-50 Q0,-74 24,-50 V2Z" fill="#5a4a78"/><rect x="-78" y="-130" width="16" height="22" rx="8" fill="#5a4a78"/><rect x="62" y="-130" width="16" height="22" rx="8" fill="#5a4a78"/></g>`;
  }
  return "";
}
const geld = ct => ct % 100 === 0 ? `${ct / 100} €` : ct > 100 ? `${Math.floor(ct / 100)},${String(ct % 100).padStart(2, "0")} €` : `${ct} ct`;
// Algenflecken am Glas: feste Stellen, damit sie beim Neuöffnen dort bleiben
const ALGEN = [...Array(15)].map((_, i) => ({ x: 120 + (i * 523) % 1360, y: 90 + (i * 271) % 640, r: 40 + (i * 37) % 50 }));
function aquarium(){
  stopp(); zurueckZurWahl();
  const st = stand(), BW = 1600, BH = 900, heute = root.WELT.today();
  st.aquarium = aquariumNorm(st.aquarium, heute);
  let futter = [], raf = 0, t0 = performance.now(), modus = "futter", gewaehlt = -1, algen = ALGEN.slice(0, schmutz(st.aquarium, heute) * 5), truhe = 0;
  // Schwimm-Positionen nur hier, nicht im Spielstand
  const schwimm = [], fische = () => st.aquarium.fische.map((f, i) => schwimm[i] || (schwimm[i] = AM_BODEN[f.art]
    ? { x: 250 + (i * 337) % 1100, y: BH - 95, vx: (i % 2 ? .5 : -.5), vy: 0, satt: 0 }
    : { x: 200 + (i * 337) % 1200, y: 200 + (i * 151) % 450, vx: (i % 2 ? 1 : -1) * (1 + i % 3 * .4), vy: 0, satt: 0 }));
  const pflanzen = () => [...Array(st.aquarium.pflanzen)].map((_, i) => { const x = 120 + i * 260 + (i % 2) * 60, hgt = 220 + (i * 53) % 140;
    return `<path d="M${x},${BH - 60} C${x - 40},${BH - 60 - hgt / 2} ${x + 40},${BH - 60 - hgt * .7} ${x},${BH - 60 - hgt}" stroke="#4e9a4a" stroke-width="18" fill="none" stroke-linecap="round" class="pflanze"/>
      <path d="M${x + 20},${BH - 60} C${x + 60},${BH - 90 - hgt / 3} ${x - 10},${BH - 100 - hgt / 2} ${x + 30},${BH - 80 - hgt * .6}" stroke="#6fbf8e" stroke-width="14" fill="none" stroke-linecap="round"/>`; }).join("");
  const deko = () => st.aquarium.deko.map(d => dekoBild(d, BH, d === "schatztruhe" && truhe > 0)).join("");
  const fuss = () => {
    const f = st.aquarium.fische[gewaehlt];
    el("aqFuss").innerHTML = f ? `<button class="btn ghost" id="aqName">Namen geben ✏️</button><button class="btn ghost" id="aqWeg">Fertig</button>`
      : `<button class="btn ghost${modus === "putzen" ? " an" : ""}" id="aqPutzen">Putzen 🧽</button><button class="btn ghost" id="aqLaden">Laden 🛒</button>`;
    if(f){ el("aqName").onclick = () => namen(gewaehlt); el("aqWeg").onclick = () => { gewaehlt = -1; fuss(); }; return; }
    el("aqPutzen").onclick = () => { if(!algen.length){ modus = "futter"; fuss(); return sag("Das Glas ist noch sauber."); }
      modus = modus === "putzen" ? "futter" : "putzen"; fuss(); if(modus === "putzen") sag("Wisch die grünen Flecken mit dem Finger weg."); };
    el("aqLaden").onclick = laden;
  };
  seite(`<div class="aquarium"><svg id="aqS" viewBox="0 0 ${BW} ${BH}" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="wasser" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fdcf5"/><stop offset="1" stop-color="#4f9fc9"/></linearGradient></defs>
      <rect width="${BW}" height="${BH}" fill="url(#wasser)"/><path d="M0,${BH - 70} Q400,${BH - 110} 800,${BH - 75} T${BW},${BH - 80} V${BH} H0Z" fill="#e9d9b8"/>
      <g id="aqPfl">${pflanzen()}</g><g id="aqDeko">${deko()}</g><g id="aqBlasen"></g><g id="aqFutter"></g><g id="aqFische"></g><g id="aqAlgen"></g><g id="aqSchwamm"></g></svg>
      <div id="aqPanel" class="aq-panel" hidden></div></div>
    <div class="aufgabe-fuss laden" id="aqFuss"></div>`);
  fuss();
  const malAlgen = () => { el("aqAlgen").innerHTML = algen.map(a => `<circle cx="${a.x}" cy="${a.y}" r="${a.r}" fill="#5f9e4a" opacity=".45"/>`).join(""); };
  malAlgen();
  const svg = el("aqS");
  const punkt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const wischen = q => { const vor = algen.length; algen = algen.filter(a => Math.hypot(a.x - q.x, a.y - q.y) > a.r + 60);
    el("aqSchwamm").innerHTML = `<rect x="${q.x - 45}" y="${q.y - 30}" width="90" height="60" rx="14" fill="#f2c94c" stroke="#c9955f" stroke-width="4"/>`;
    if(algen.length === vor) return; malAlgen(); root.AUFGABEN.KLANG.pop();
    if(!algen.length){ st.aquarium = putzen(st.aquarium, heute); ST.save(); modus = "futter"; el("aqSchwamm").innerHTML = ""; fuss(); root.AUFGABEN.KLANG.chime(); sag("Blitzsauber! Danke, Azra!"); } };
  let wischt = false;
  svg.addEventListener("pointerdown", e => { const q = punkt(e);
    if(modus === "putzen"){ wischt = true; svg.setPointerCapture && svg.setPointerCapture(e.pointerId); return wischen(q); }
    const F = fische(), i = F.findIndex((f, k) => Math.hypot(f.x - q.x, f.y - q.y) < 60 * (0.8 + fischGroesse(st.aquarium.fische[k]) * .3));
    if(i >= 0){ gewaehlt = i; fuss(); const f = st.aquarium.fische[i]; root.AUFGABEN.KLANG.paper();
      return sag(f.name ? `Das ist ${f.name}.` : `Das ist dein ${ARTEN[f.art].name}. Er hat noch keinen Namen.`); }
    for(let k = 0; k < 4; k++) futter.push({ x: q.x + (k - 1.5) * 18, y: Math.min(q.y, BH - 120) - k * 10 }); root.AUFGABEN.KLANG.paper(); });
  svg.addEventListener("pointermove", e => { if(wischt && modus === "putzen") wischen(punkt(e)); });
  svg.addEventListener("pointerup", () => { wischt = false; el("aqSchwamm").innerHTML = ""; });
  // Laden: Fische, Pflanzen, Deko; was zu teuer ist, ist blass
  function laden(){
    const aq = st.aquarium, p = S().purse, karte = (was, wahl, bild, name, preis, da) => `<button class="aq-ware${p < preis || da ? " blass" : ""}" data-was="${was}" data-wahl="${wahl}"><svg viewBox="-60 -60 120 120">${bild}</svg><span>${name}</span><span class="preis">${da ? "hast du" : geld(preis)}</span></button>`;
    el("aqPanel").innerHTML = `<div class="aq-waren">${Object.entries(ARTEN).map(([k, a]) => karte("fisch", k, tier(k, 0, 0, a.farbe, 1, 1), a.name, a.preis, false)).join("")}
      ${karte("pflanze", "", `<path d="M0,50 C-20,10 20,-10 0,-50" stroke="#4e9a4a" stroke-width="12" fill="none" stroke-linecap="round"/>`, "Pflanze", PREIS.pflanze, false)}
      ${Object.entries(DEKO).map(([k, d]) => karte("deko", k, `<g transform="translate(0 40) scale(.45)">${dekoBild(k, 70, false).replace(/translate\(\d+ /, "translate(0 ")}</g>`, d.name, d.preis, aq.deko.includes(k))).join("")}</div>
      <div class="aufgabe-fuss"><button class="btn" id="aqZu">Zurück zu den Fischen</button></div>`;
    el("aqPanel").hidden = false; sag(`Du hast ${geld(p)}. Was möchtest du kaufen?`);
    el("aqZu").onclick = () => { el("aqPanel").hidden = true; };
    el("aqPanel").querySelectorAll("[data-was]").forEach(b => b.onclick = () => {
      const was = b.dataset.was, wahl = b.dataset.wahl, r = kaufen(st.aquarium, S().purse, was, wahl, heute);
      if(!r) return sag(was === "deko" && st.aquarium.deko.includes(wahl) ? "Das hast du schon." : was === "fisch" && st.aquarium.fische.length >= MAX_FISCHE || was === "pflanze" && st.aquarium.pflanzen >= MAX_PFLANZEN ? "Das Aquarium ist schon voll." : "Dafür reicht dein Geld noch nicht.");
      st.aquarium = r.aq; S().purse = r.purse; ST.save(); root.AUFGABEN.KLANG.clink(); el("aqPfl").innerHTML = pflanzen(); el("aqDeko").innerHTML = deko(); root.WELT.zeige();
      el("aqPanel").hidden = true;
      sag(was === "fisch" ? `Ein neuer ${ARTEN[wahl].name}! Tipp ihn an und gib ihm einen Namen.` : was === "pflanze" ? "Eine neue Pflanze für deine Fische." : `Schön! ${DEKO[wahl].name} im Aquarium.`);
    });
  }
  // Namen geben: mit den Buchstaben-Tasten (wie bei der Wortblume), höchstens 12 Buchstaben
  function namen(i){
    let name = st.aquarium.fische[i].name;
    const zeig = () => { el("aqNameText").textContent = name || " "; };
    el("aqPanel").innerHTML = `<div class="aq-name"><div class="wb-wort"><span id="aqNameText" class="name-text"></span></div>
      <div class="wb-tasten">${ABC.map(b => `<button class="taste" data-b="${b}">${b}</button>`).join("")}<button class="taste" data-b="⌫" aria-label="Löschen">⌫</button></div></div>
      <div class="aufgabe-fuss"><button class="btn" id="aqNameOk">Fertig</button></div>`;
    el("aqPanel").hidden = false; zeig(); sag("Wie soll er heißen? Tipp die Buchstaben.");
    el("aqPanel").querySelectorAll("[data-b]").forEach(t => t.onclick = () => { const b = t.dataset.b;
      if(b === "⌫") name = name.slice(0, -1); else if(name.length < 12) name += name ? (b === "ß" ? b : b.toLowerCase()) : b;
      root.AUFGABEN.KLANG.pop(); zeig(); });
    el("aqNameOk").onclick = () => { st.aquarium = benennen(st.aquarium, i, name); ST.save(); el("aqPanel").hidden = true; gewaehlt = -1; fuss();
      const n = st.aquarium.fische[i].name; if(n) sag(`Hallo, ${n}!`); };
  }
  // Fische schwimmen; gibt es Futter, schwimmt jeder zum nächsten Krümel und frisst ihn. Hungrige sind langsamer.
  const tick = now => {
    const dt = Math.min(50, now - t0) / 16; t0 = now;
    futter.forEach(f => { if(f.y < BH - 90) f.y += 1.2 * dt; });
    const F = fische(), aq = st.aquarium;
    F.forEach((f, i) => {
      const art = aq.fische[i].art, boden = AM_BODEN[art], hung = hunger(aq.fische[i], heute);
      const ziel = futter.reduce((b, k) => !b || Math.hypot(k.x - f.x, k.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? k : b, null);
      const erreichbar = ziel && (!boden || ziel.y > BH - 140);
      if(erreichbar){ const dx = ziel.x - f.x, dy = boden ? 0 : ziel.y - f.y, d = Math.hypot(dx, dy) || 1; f.vx += dx / d * .25 * dt; f.vy += dy / d * .25 * dt;
        if(Math.hypot(ziel.x - f.x, ziel.y - f.y) < (boden ? 50 : 30)){ futter.splice(futter.indexOf(ziel), 1); f.satt = 40;
          if(hung > 0 || !aq.fische[i].tage.includes(heute)){ st.aquarium = fuettern(st.aquarium, heute, i); ST.save(); } } }
      else if(boden){ f.vy = 0; if(Math.abs(f.vx) < .3) f.vx += (f.vx < 0 ? -.03 : .03) * dt; }
      else { f.vy += (Math.sin(now / 900 + i) * .02 - f.vy * .02) * dt; if(Math.abs(f.vx) < .8) f.vx += (f.vx < 0 ? -.05 : .05) * dt; }
      const sp = Math.hypot(f.vx, f.vy), max = (erreichbar ? 6 : boden ? .8 : art === "seepferdchen" ? 1 : 2.2) * (hung > 0 && !erreichbar ? .5 : 1);
      if(sp > max){ f.vx *= max / sp; f.vy *= max / sp; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if(f.x < 70 || f.x > BW - 70){ f.vx *= -1; f.x = Math.max(70, Math.min(BW - 70, f.x)); }
      if(boden) f.y = BH - 95;
      else if(f.y < 80 || f.y > BH - 150){ f.vy *= -1; f.y = Math.max(80, Math.min(BH - 150, f.y)); }
      if(f.satt > 0) f.satt -= dt;
    });
    el("aqFutter").innerHTML = futter.map(k => `<circle cx="${k.x}" cy="${k.y}" r="7" fill="#c98f5e"/>`).join("");
    el("aqFische").innerHTML = st.aquarium.fische.map((f, i) => { const g = .8 + fischGroesse(f) * .35, k = F[i].satt > 0 ? g * (1.05 + F[i].satt / 400) : g;
      return tier(f.art, F[i].x, F[i].y, f.farbe, F[i].vx < 0 ? -1 : 1, k)
        + (hunger(f, heute) > 0 ? `<g transform="translate(${F[i].x + 30} ${F[i].y - 60 * g})"><circle r="22" fill="#fff" opacity=".85"/><circle r="7" fill="#c98f5e"/></g>` : "")
        + (f.name && (i === gewaehlt || st.aquarium.fische.length <= 6) ? `<text x="${F[i].x}" y="${F[i].y + 52 * g}" text-anchor="middle" class="ui" font-size="30" fill="#fff" stroke="#2b2140" stroke-width="5" paint-order="stroke">${esc(f.name)}</text>` : "")
        + (i === gewaehlt ? `<circle cx="${F[i].x}" cy="${F[i].y}" r="${62 * g}" fill="none" stroke="#f2c94c" stroke-width="6" stroke-dasharray="14 10"/>` : ""); }).join("");
    el("aqBlasen").innerHTML = [0, 1, 2].map(k => { const y = BH - ((now / 12 + k * 300) % BH); return `<circle cx="${1450 + Math.sin(now / 400 + k) * 10}" cy="${y}" r="${8 + k * 3}" fill="#fff" opacity=".5"/>`; }).join("");
    // die Schatztruhe geht ab und zu auf
    if(st.aquarium.deko.includes("schatztruhe")){ const auf = Math.floor(now / 4000) % 3 === 0 ? 1 : 0; if(auf !== truhe){ truhe = auf; el("aqDeko").innerHTML = deko(); } }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const hungrig = st.aquarium.fische.some(f => hunger(f, heute) > 0);
  sag(hungrig ? "Deine Fische haben Hunger! Tipp ins Wasser." : algen.length ? "Das Glas ist schmutzig. Mit Putzen kannst du es sauber machen." : "Tipp ins Wasser, dann bekommen deine Fische Futter.");
  lauf = { stop(){ cancelAnimationFrame(raf); }, get futter(){ return futter; }, get algen(){ return algen; }, laden, namen, wischen };
}
root.SPIELE = { regeln: SP, oeffnen, schliessen, get offen(){ return !box().hidden; }, get lauf(){ return lauf; }, labyrinthSpiel, memorySpiel, wortblume, aquarium };
})(this);
