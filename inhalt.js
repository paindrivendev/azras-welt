/* Lerninhalt von Azras Welt, erste Lieferung (Ticket 18): die 74 freigegebenen Schritte aus
   tierschule/prototype-schritte-batch1.html mit Ort, Nachbar, Aufgabenarten, Bitte, Aufgaben-Generator, Zeigen der Katze und
   Merkheft-Satz. Kein DOM. Regeln: PLAN.md "Learning a step", "Mistakes and praise" (nie "falsch"), "Voice" (ein Satz pro Zeile).

   INHALT.steps[id] = { home, von, arten, en, bitte, offline?, aufgabe(rng, stufe) → {art, item}, zeigen: [≤5 Sätze], merkheft,
     ersatzFuer? }
   aufgabe nimmt nur rng() aus [0, 1) (gleicher rng-Verlauf = gleiche Aufgabe); stufe 0, 1, 2 = leichter → schwerer im Schritt.
   Die Aufgaben haben genau die Felder, die arten.js liest (siehe dort beispiel); jede bringt ihre bitte mit.
   ersatzFuer: die freigegebene Art passt mit arten.js noch nicht (Körbe von sortieren und das Bild von beschriften sind fest);
   bis dahin übt der Schritt mit der nächstbesten freigegebenen Art.
   INHALT.orte[ort] = die Arten der Schritte, die dort zu Hause sind (dort kann auch anderes in diesem Stil geübt werden). */
(function(root){
"use strict";

// ---------- Zufall: nur über rng ----------
const zz = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const eins = (rng, xs) => xs[Math.floor(rng() * xs.length)];
const misch = (rng, xs) => { const a = [...xs]; for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ziehe = (rng, xs, n) => misch(rng, xs).slice(0, n);
const je = (s, a, b, c) => [a, b, c][s];
const bis = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const ja = (rng, p = .5) => rng() < p;

// ---------- Wörter ----------
// Silben "Blu-me" → {w: "Blume", syl: ["Blu", "me"], b: [3]}
const silb = h => { const syl = h.split("-"), b = []; let n = 0; syl.slice(0, -1).forEach(x => b.push(n += x.length)); return { w: syl.join(""), syl, b }; };
const vorlesen = h => h.split("-").join(" – ");
// Piloten: Einheiten einer Silbe (au, ei, eu, äu als eine Einheit), genau ein Pilot pro Silbe
const DOPPEL = /^(au|ei|eu|äu|ai)$/i, PILOT = /^(au|ei|eu|äu|ai|[aeiouäöü])$/i;
function einheiten(h){
  const u = [], s = [], p = [];
  for(const syl of h.split("-")){ let n = 0, i = 0, k = 0;
    while(i < syl.length){ const t = DOPPEL.test(syl.slice(i, i + 2)) ? syl.slice(i, i + 2) : syl[i]; if(PILOT.test(t)){ p.push(u.length); k++; } u.push(t); n++; i += t.length; }
    if(k !== 1) throw new Error("Silbe ohne genau einen Piloten: " + h);
    s.push(n); }
  return { u, s, p };
}
const EIN = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const ZEHN = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
function zahlwort(n){
  if(n === 100) return "hundert";
  if(n < 20) return EIN[n];
  const z = ZEHN[Math.floor(n / 10)], e = n % 10; return e ? (e === 1 ? "ein" : EIN[e]) + "und" + z : z;
}
const preis = c => c === 100 ? "1 €" : c + " ct";
const FARBE = { rot: "rot", blau: "blau", gruen: "grün", gelb: "gelb" };
// Wortschatz mit Bild: [Wort, Silben, Bild, Artikel]
const WORTE = [["Hund", "Hund", "🐶", "der"], ["Haus", "Haus", "🏠", "das"], ["Maus", "Maus", "🐭", "die"], ["Baum", "Baum", "🌳", "der"],
  ["Ball", "Ball", "⚽", "der"], ["Buch", "Buch", "📖", "das"], ["Sonne", "Son-ne", "☀️", "die"], ["Mond", "Mond", "🌙", "der"],
  ["Fisch", "Fisch", "🐟", "der"], ["Igel", "I-gel", "🦔", "der"], ["Ente", "En-te", "🦆", "die"], ["Auto", "Au-to", "🚗", "das"],
  ["Apfel", "Ap-fel", "🍎", "der"], ["Blume", "Blu-me", "🌸", "die"], ["Kuchen", "Ku-chen", "🍰", "der"], ["Brot", "Brot", "🍞", "das"],
  ["Schuh", "Schuh", "👟", "der"], ["Hut", "Hut", "🎩", "der"], ["Uhr", "Uhr", "⏰", "die"], ["Stern", "Stern", "⭐", "der"],
  ["Herz", "Herz", "❤️", "das"], ["Vogel", "Vo-gel", "🐦", "der"], ["Schnecke", "Schne-cke", "🐌", "die"], ["Katze", "Kat-ze", "🐱", "die"],
  ["Biene", "Bie-ne", "🐝", "die"], ["Rose", "Ro-se", "🌹", "die"], ["Hose", "Ho-se", "👖", "die"], ["Kerze", "Ker-ze", "🕯️", "die"],
  ["Zug", "Zug", "🚂", "der"], ["Bus", "Bus", "🚌", "der"], ["Pilz", "Pilz", "🍄", "der"], ["Kuh", "Kuh", "🐮", "die"],
  ["Schaf", "Schaf", "🐑", "das"], ["Kirsche", "Kir-sche", "🍒", "die"], ["Birne", "Bir-ne", "🍐", "die"], ["Banane", "Ba-na-ne", "🍌", "die"],
  ["Glocke", "Glo-cke", "🔔", "die"], ["Brief", "Brief", "✉️", "der"], ["Tasse", "Tas-se", "☕", "die"], ["Eis", "Eis", "🍦", "das"],
  ["Affe", "Af-fe", "🐒", "der"], ["Tiger", "Ti-ger", "🐯", "der"], ["Löwe", "Lö-we", "🦁", "der"], ["Zebra", "Ze-bra", "🦓", "das"],
  ["Nase", "Na-se", "👃", "die"], ["Hand", "Hand", "✋", "die"], ["Regen", "Re-gen", "🌧️", "der"], ["Wolke", "Wol-ke", "☁️", "die"],
  ["Drachen", "Dra-chen", "🪁", "der"], ["Tomate", "To-ma-te", "🍅", "die"], ["Frosch", "Frosch", "🐸", "der"], ["Dose", "Do-se", "🥫", "die"]];
const einE = w => (w[3] === "die" ? "eine " : "ein ") + w[0];
const aehnlich = (a, b) => a[0][0] === b[0][0] || a[0].slice(-2) === b[0].slice(-2);

// ---------- Spuren (aus tierschule/schrift.js, Vereinfachte Ausgangsschrift, in 0–100 gesetzt) ----------
const SPUR = {
  "i": "M37.5,40 L37.8,81.2 L41,87.8 L46.8,90 L50,88.4 L52.8,82.8 L62.5,40 M37.5,21 L38.1,19.3",
  "u": "M25,40 L25.4,81.2 L26.7,84.7 L29.1,87.6 L32.4,89.4 L36.1,90 L40.9,89 L44,86.9 L47,82.9 L49.2,77.1 L50,72.1 L50,40.4 L50,77.9 L51,84 L52.9,87.2 L56,89.4 L59.6,90 L62.7,88.1 L66.8,77.6 L75,40",
  "ü": "M25,40 L25.4,81.2 L26.7,84.7 L29.1,87.6 L32.4,89.4 L36.1,90 L40.9,89 L44,86.9 L47,82.9 L49.2,77.1 L50,72.1 L50,40.4 L50,77.9 L51,84 L52.9,87.2 L56,89.4 L59.6,90 L62.7,88.1 L66.8,77.6 L75,40 M27,22 L27.6,20.3 M48,22 L48.6,20.3",
  "e": "M31,42 L53.2,57.8 L55.5,53.4 L55.2,47.2 L52.9,42.8 L49.9,40.7 L45,39.8 L40,40.3 L33.6,44 L30.4,52 L29.5,67 L31.9,79.2 L35,84.6 L37.7,87.2 L42.1,89.5 L47.1,90 L54,87.4 L59.1,80.4 L63.7,67.4 L70.5,40",
  "l": "M37.3,49 L49.2,28.7 L52.7,20.1 L52.9,12 L51.3,9.4 L47.6,8 L44,9.7 L42.2,16.5 L42.2,80.1 L43.1,85.1 L45.4,88.5 L49.1,90 L52,89.1 L53.7,86.6 L56,79.8 L62.7,49",
  "t": "M43.3,40 L43.6,81.7 L46.3,87.3 L51.8,90 L55.2,88.9 L58.7,82.3 L68.3,40 M31.8,40 L56.8,40",
  "n": "M25,40 L25,90 L25.4,60 L28.1,50.4 L32.6,43 L36.8,40.3 L40.5,40.1 L44.1,41.3 L47.6,44.8 L49.9,53.1 L50.7,83.1 L54,88.2 L59.9,90 L62.9,87.9 L65.5,82.2 L75,40",
  "m": "M12.5,40 L12.5,90 L12.9,60 L17.2,47 L22.1,41.4 L25.5,40.1 L30.4,40.7 L33.5,42.8 L36.6,48.2 L37.5,54.4 L37.5,89.4 L37.6,61.9 L41.4,48.7 L44.7,43.5 L48.7,40.5 L53.6,40.2 L58.1,42.4 L60.9,46.4 L62.4,52.5 L62.5,78.7 L63.4,83.6 L67,88.6 L71.7,90 L75,88.4 L77.8,82.8 L87.5,40",
  "r": "M34.5,40 L34.5,90 L34.5,60 L36.6,52.8 L39.4,47.2 L43.5,42.6 L49.2,40.1 L65.5,42",
  "h": "M27,49 L38.5,29.6 L42.4,20.1 L42.6,12 L41,9.4 L37.3,8 L33.7,9.7 L32,16.5 L32,89.7 L32,67.1 L34.7,57.2 L39.2,50.5 L43,49 L47,49.7 L51.1,54.1 L52.4,59.1 L52.9,83.6 L55.2,88.1 L59.9,90 L62.6,88.8 L64.9,84.3 L73,49",
  "k": "M29.1,49 L41,28.7 L44.5,20.1 L44.7,12 L43.1,9.4 L39.4,8 L35.8,9.7 L34,16.5 L34,89.7 L34,70.2 L34.8,67.2 L39.7,57.1 L42.8,53 L45.9,50.3 L49.7,49 L52.6,50 L54.1,52.5 L54.2,55.6 L52.2,60.3 L45.1,66 L36.3,68.6 L43.7,70.9 L47.7,74.1 L50.1,78.6 L51.5,85.6 L54,88.8 L57.8,90 L60.5,88.8 L63.8,81.3 L70.9,49",
  "b": "M31.1,49 L42.6,29.6 L46.5,20.1 L46.7,12 L45.1,9.4 L41.4,8 L37.8,9.7 L36.1,16.5 L36.1,82.1 L37.6,85.9 L41.6,89.1 L48.6,89.7 L53.5,86.1 L57.1,78.8 L58.6,69.7 L57.4,58.5 L53.8,52.4 L51.3,50.6 L47.8,49.8 L68.9,49",
  "p": "M29.8,8 L29.8,92 L29.8,24.8 L32.6,15.8 L38,9.5 L40.9,8.3 L45.1,8.1 L50.7,10.8 L55.1,17.9 L56.7,27.2 L55.6,37.6 L53.6,42.4 L50.4,46.6 L45,49.7 L38.7,49.7 L35.7,48.8 L30.8,45.1 L40.7,47.4 L48.1,47.7 L56.2,45.7 L60.5,42.7 L64.8,35.7 L70.2,8",
  "a": "M50.7,48 L47,43 L41.5,40.3 L34.1,40.7 L28.9,44.2 L24.8,50.4 L22.3,58.8 L21.8,68.8 L23,76.2 L27.5,85 L33.5,89.3 L40.9,89.6 L44.3,88 L48,84.7 L51.6,78.1 L53.2,72.1 L53.2,40.4 L53.6,81.6 L54.8,85.2 L57.1,88.1 L60.4,89.7 L64.1,89.7 L66.7,87 L69.4,80 L78.2,40",
  "d": "M50.6,55.4 L47.6,51.3 L43,49.1 L37.9,49.1 L34.2,50.9 L31.3,53.9 L28.5,59.3 L26.7,70.5 L27.5,77.6 L29.2,82.5 L32.1,86.7 L36.4,89.4 L41.5,89.9 L45.3,88.4 L47.7,86.4 L50.9,81.2 L52.7,75.3 L52.7,8 L52.7,81.1 L53.5,85.1 L55.8,88.4 L59.6,90 L62.5,89.2 L64.2,86.6 L67,77.8 L73.3,48.8",
  "g": "M53.8,14.7 L50.7,10.5 L47,8.5 L42.9,8 L38.8,9 L35.5,11.5 L32.5,15.8 L29.5,26.9 L30.2,37.4 L31.9,42.3 L34.9,46.6 L41.3,49.9 L44.5,49.9 L48.4,48.4 L53.2,42.9 L55.9,35 L55.9,8.3 L55.9,80.8 L54,87.8 L49,91.5 L43.8,91.8 L41.2,90.2 L39.7,87.4 L39.8,83.2 L44.2,73.8 L60.4,46.8 L64.3,34.8 L70.6,8",
  "q": "M53.4,14.8 L51,11.3 L46.5,8.5 L41.3,8.1 L36.4,10.2 L33.4,13.2 L30.5,18.9 L29,25.1 L28.9,34.7 L31.7,43.8 L35.9,48.6 L42.9,50.6 L47,49.5 L49.6,47.7 L53.3,42.5 L55.5,35.4 L55.5,8.3 L55.5,81.9 L57.4,90.1 L59.9,92 L62,91.7 L63.6,90.4 L65,86.4 L64.6,75.8 L61.4,64.5 L56.5,53.9 L59.5,48.3 L64.3,35.3 L71.3,8",
  "o": "M53,45 L50.3,42.4 L45.8,40.4 L40.8,40.1 L37.2,41.3 L31.2,47.4 L27.6,58 L27.2,70.5 L28.4,76.6 L30.8,82.4 L36.9,88.5 L41.7,89.9 L45.4,89.8 L51,87.1 L54.2,83.3 L56.8,77.6 L58.5,66.5 L57.9,56.6 L55.3,48.2 L51.4,43.5 L46.5,41.4 L73,40",
  "c": "M56.5,48 L53.7,43.9 L49.6,41.1 L44.7,40 L39.8,40.7 L35.6,43.3 L31.7,48.2 L27.9,60 L28.2,73.7 L29.5,78.5 L32.4,84 L36,87.6 L39.3,89.3 L44.2,90 L50.2,88.6 L55.2,84.8 L59.3,78.6 L66.4,59.9 L72.5,40",
  "ä": "M50.7,48 L47,43 L41.5,40.3 L34.1,40.7 L28.9,44.2 L24.8,50.4 L22.3,58.8 L21.8,68.8 L23,76.2 L27.5,85 L33.5,89.3 L40.9,89.6 L44.3,88 L48,84.7 L51.6,78.1 L53.2,72.1 L53.2,40.4 L53.6,81.6 L54.8,85.2 L57.1,88.1 L60.4,89.7 L64.1,89.7 L66.7,87 L69.4,80 L78.2,40 M31.7,22 L32.3,20.3 M45.7,22 L46.3,20.3",
  "ö": "M53,45 L50.3,42.4 L45.8,40.4 L40.8,40.1 L37.2,41.3 L31.2,47.4 L27.6,58 L27.2,70.5 L28.4,76.6 L30.8,82.4 L36.9,88.5 L41.7,89.9 L45.4,89.8 L51,87.1 L54.2,83.3 L56.8,77.6 L58.5,66.5 L57.9,56.6 L55.3,48.2 L51.4,43.5 L46.5,41.4 L73,40 M36,22 L36.6,20.3 M50,22 L50.6,20.3",
  "s": "M32,40 L42.1,45 L50.4,52.5 L55.4,61.1 L57,69.6 L55.5,79.5 L53.2,83.9 L49.7,87.5 L42.8,90 L37.8,89.4 L34.6,87.5 L33.5,85.3 L34.8,83.6 L44.2,86.8 L52.9,88.1 L68,86",
  "f": "M40.1,36.3 L49.3,20.4 L51.2,12.9 L49.8,9 L47.2,8 L44.7,9.2 L43.5,13.9 L43.5,86 L44.1,89.5 L46.4,92 L48.4,91.4 L49.4,89.6 L49.6,84 L47.9,75.6 L43.9,64.3 L49.2,60.1 L53.2,54.3 L57.5,44.6 L59.9,36.3",
  "j": "M47.4,22.4 L47.4,83.3 L45.2,89.8 L40.6,92 L38.1,91.5 L36.4,89.6 L36.5,83.6 L53.3,56.2 L64.1,22.4 M47.4,9.2 L47.8,8",
  "z": "M31.1,8 L50.4,8 L36.6,29 L44.1,30.3 L50.5,34.2 L53.8,39.7 L54.7,45 L53.9,56.7 L49.6,73.4 L42.2,87.6 L39.3,90.7 L36.3,92 L33.5,90.9 L32.9,88.8 L34.7,82.7 L38.7,76.3 L53.9,56.9 L59.8,46.7 L68.9,8",
  "v": "M28,40 L29.4,61.2 L32.6,77.1 L36.6,86.3 L39.1,89 L41.4,89.9 L46.1,88.7 L49.5,85 L52.2,79.4 L54.5,71 L56.4,54.8 L56.4,43.6 L54.6,40.4 L51.2,40.9 L50.5,43.2 L61,40.7 L72,40",
  "w": "M17,40 L17.4,81.2 L18.7,84.7 L21.1,87.6 L24.4,89.4 L28.1,90 L32.9,89 L36,86.9 L39,82.9 L41.2,77.1 L42,72.1 L42,40.4 L42.2,80.4 L43.9,85 L46.4,87.8 L49.7,89.5 L53.4,90 L56.9,88.6 L60.1,84.8 L63.1,78 L65.2,69.5 L67.4,43.4 L65.4,40.3 L62.1,41 L61.5,43.4 L72.2,40.7 L83,40",
  "x": "M27.5,40 L32.3,41.2 L37.3,46.7 L40,53.7 L45,74.3 L48.2,82.4 L51.8,87.5 L57.4,90 L61.5,87.5 L65.3,79.7 L69.1,63.9 L72.5,40 M55.5,41 L31.5,89",
  "y": "M32.8,8 L33.1,42.6 L36.3,48 L42.1,50 L45.2,49.5 L48.8,47.4 L53.1,39.1 L53.8,35 L53.8,8.3 L53.6,82.9 L52.4,86.9 L50.5,89.4 L46.9,91.5 L43.9,92 L40.8,91.3 L38.7,89 L38.3,82.8 L43.1,72.3 L57.9,46.9 L67.2,8",
  "ß": "M29.1,49 L29.1,90 L29.1,24.4 L30.6,16.4 L33.7,11.1 L37.1,8.8 L43.1,8.1 L47.9,9.9 L51,13.8 L52,20.9 L50.6,26.8 L47.2,31.9 L40.1,36.8 L45.7,39.2 L51.3,45.1 L54.8,53.6 L56.1,62.7 L55.1,74.9 L53.1,80.7 L50.3,85 L47.4,87.9 L42.7,89.9 L38.6,89.7 L34.9,88 L42.9,88.4 L49,87.5 L57.4,83.8 L61.3,80.5 L66.3,72.8 L70.9,49",
  "A": "M24.5,90 L41.8,8 L57.1,82.5 L59.2,87.2 L62.4,89.7 L64.4,90 L66.3,89.2 L68.5,85.8 L72.4,71.9 L75.5,48.9 M32.7,55 L52.5,55",
  "B": "M34.4,8 L34.4,90 M34.4,8 L42.6,8.4 L51.6,10.5 L56.8,13.8 L59.8,17.8 L61.3,22.7 L61.3,28.9 L59.9,33.8 L56.4,38.8 L47.6,43.8 L34.4,45.7 L48.6,47.5 L57.8,52 L63.6,59.1 L65.6,68 L65,74.1 L63.6,77.9 L58.3,84.1 L48,88.6 L34.4,90",
  "C": "M68.5,20.3 L64,13.4 L58.3,9.2 L53.3,8 L49.2,8.2 L40.9,11.9 L36.2,17.3 L31.4,28.6 L29.3,41.7 L29.1,52 L30,62.2 L33.5,75 L38.2,82.9 L42.7,87.1 L49.3,89.8 L54.4,89.9 L58.4,88.9 L64.6,85.3 L70.9,77.7",
  "D": "M32.4,8 L32.4,90 M32.4,8 L45.5,10.1 L52.7,13.8 L58.1,18.6 L64.7,30.1 L67.6,46.2 L66,63.5 L62.4,73.1 L58.4,79 L53.1,83.9 L46.9,87.3 L39,89.5 L32.4,90",
  "E": "M63.9,17 L57.5,10.5 L49.8,8 L42.8,9.2 L39.3,11.4 L36.1,15.3 L34.5,19.1 L33.6,25.2 L34.2,31.3 L35.6,35.1 L37.8,38.6 L42.4,42.6 L52.9,46.5 L42.8,49.6 L35.6,55.2 L31.2,63.2 L30.4,71.4 L32.2,78.2 L35.7,83.3 L42.3,88.1 L48.2,89.8 L56.3,89.3 L61.9,86.8 L66.4,82.6 L69.7,77.7",
  "F": "M34.4,8 L34.4,90 M34.4,8 L65.6,8 M34.4,46.9 L57.4,46.9",
  "G": "M69.1,20.3 L66,15 L61.6,10.7 L56,8.3 L51.9,8 L46.9,8.9 L41.5,11.9 L34.8,20.9 L30.6,35.6 L29.7,52 L31.6,67.2 L36.5,79.6 L42.5,86.5 L49.9,89.8 L55,89.8 L59,88.7 L62.5,86.6 L65.9,82.8 L68.3,78.3 L70.1,71.3 L70.3,52.9 L54.3,52.3",
  "H": "M34.4,8 L34.4,90 M65.6,8 L65.6,90 M34.4,46.9 L65.6,46.9",
  "I": "M50,8 L50,90",
  "J": "M61.9,8 L61.9,72.6 L60.4,81.6 L58,86.1 L54.9,88.8 L51,90 L47.9,89.8 L45,88.9 L41.8,86.3 L39.6,82.9 L38.1,77.7",
  "K": "M33.6,8 L33.6,90 M64.8,8 L34.6,50.7 L66.4,90",
  "L": "M35.2,8 L35.2,90 L64.8,90",
  "M": "M29.5,90 L31.5,8 L50,61.2 L68.4,8.1 L70.5,90",
  "N": "M34,90 L34,8 L66,89.9 L66,8",
  "O": "M50.4,8 L50.4,8",
  "P": "M34.4,8 L34.4,90 M34.4,8 L48.7,9.5 L57.2,12.9 L60.4,15.4 L64,20.4 L65.6,28.4 L63.6,37.3 L61.3,40.7 L57.3,44 L47.9,47.7 L34.4,49",
  "Q": "M50,8 L50,8 M54,73 L72.2,92",
  "R": "M33.6,8 L33.6,90 M33.6,8 L43.8,8.7 L54.6,11.9 L59.6,15.4 L63.9,22.3 L64.8,28.4 L64.2,33.5 L62.3,38.2 L59,42.1 L54.7,45 L49,47.2 L33.8,49 L66.4,90",
  "S": "M67.6,18.7 L64.3,13.5 L59.4,9.9 L54.5,8.3 L46.4,8.5 L41.7,10.5 L38.1,14.1 L35.8,18.7 L34.8,25.8 L36,30.7 L39.6,35.7 L57,50 L64.9,59.3 L67.6,68.1 L66.8,76.2 L64.9,81 L61.8,85 L56.7,88.5 L50.8,90 L45.7,89.7 L40.9,88 L37.5,85.6 L32.4,77.7",
  "T": "M50,8 L50,90 M28.7,8 L71.3,8",
  "U": "M25.2,8 L25.2,72.6 L26.8,80.6 L30.9,86.4 L35.3,88.9 L39.3,89.9 L46.4,89.4 L52.7,86 L56.6,80.1 L58,73.1 L58,8.5 L58,80.3 L58.9,85.3 L61.3,88.6 L64.1,89.8 L66.1,90 L68.4,88.1 L74.8,49",
  "V": "M31.1,8 L50,89.9 L68.9,8",
  "W": "M22.9,8 L36.1,90 L49.9,24.8 L63.6,89.8 L77.1,8",
  "X": "M32.6,8 L67.4,90 M67.4,8 L32.6,90",
  "Y": "M31.1,8 L50,49 M68.9,8 L50,49 L50,90",
  "Z": "M31.3,8 L66.2,8 L31.4,90 L68.7,90",
  "ch": "M32.4,55.6 L27.6,50.3 L21.7,49 L15.2,51.7 L11.1,57.6 L8.9,65.4 L8.7,73.6 L10.2,80.6 L12.6,85.1 L16.4,88.6 L22.3,90 L27.2,88.8 L32,85 L36.7,75.9 L45.9,48.1 L57.4,28.7 L60.9,20.1 L61.5,14 L60.7,11.1 L58.7,8.8 L54.7,8.1 L51.7,10.6 L50.4,16.5 L50.4,89.7 L50.6,66.1 L53.1,57.2 L56.9,51.2 L60.4,49.2 L63.5,49.1 L67.2,50.9 L69.6,54.1 L70.9,60.1 L71.3,83.6 L73.7,88.1 L78.3,90 L81,88.8 L83.4,84.3 L91.4,49",
  "sch": "M8,62.4 L13,64.7 L17.7,68.7 L21.5,76 L21.8,80.1 L20.1,86.1 L17.2,89 L13.3,90 L9.5,88.6 L8.8,87.4 L9.6,86.4 L18.8,88.9 L27.9,87.8 L52.2,66.8 L49.6,63.6 L44.3,62.4 L40.7,64.2 L37.6,68.8 L36.2,75.5 L36.7,81.7 L39.3,87.3 L43.4,89.8 L48.8,89.2 L51.5,87.1 L53.7,83.7 L60.9,62.8 L70.8,44.9 L71.6,37.5 L70.5,35.7 L68,34.7 L65.6,35.9 L64.4,39.8 L64.4,89.8 L64.5,73.9 L66.2,67.9 L69.3,63.4 L73.9,62.6 L77,65.2 L78.2,69.9 L78.3,85 L79.6,88.2 L83.2,90 L85,89.2 L86.8,85.5 L92,62.4",
  "ck": "M34.4,55.6 L29.7,50.3 L23.8,49 L18.9,50.5 L13.6,56.6 L11.5,62.4 L10.6,70.5 L11.4,77.7 L14.1,84.3 L18.4,88.6 L23.3,90 L29.3,88.8 L34,85 L39.1,74.9 L47.5,49 L59,29.6 L62.9,20.1 L63.6,15.1 L62.7,11.1 L60.7,8.8 L56.8,8.1 L53.7,10.6 L52.5,16.5 L52.5,89.7 L52.5,70.2 L53.6,66.3 L60.6,53.8 L64.3,50.3 L68.1,49 L71,50 L72.6,52.5 L72.4,56.6 L70.6,60.3 L63.5,66 L54.7,68.6 L62.1,70.9 L66.1,74.1 L68.2,77.6 L69.9,85.6 L72.4,88.8 L76.3,90 L79,88.8 L82.5,80.3 L89.4,49",
  "st": "M10.8,40 L18.7,43.6 L27.5,50.6 L32,56.6 L35.2,64.7 L35.6,73.4 L33.2,81.8 L28.5,87.5 L21.5,90 L14.3,88.3 L12.3,85.3 L13.6,83.6 L25.4,87.4 L31.6,88.1 L46.8,86 L64.3,40 L64.3,9.2 L64.3,79.2 L65.3,84.1 L67.3,87.3 L70.3,89.4 L74,90 L76.2,88.9 L78.3,85.8 L81.9,73.9 L89.3,40 M52.8,40 L77.8,40",
  "sp": "M8.4,8 L15.1,11 L21,15.4 L25.7,21 L28.7,27.7 L29.4,35 L27.3,43.1 L23.3,47.9 L17.5,50 L13.3,49.5 L10.6,47.9 L9.7,46 L10.8,44.6 L19.7,47.6 L26,48.4 L38.7,46.6 L51.3,8 L51.3,92 L51.3,24.8 L53.6,16.8 L56.3,12.3 L59.4,9.5 L65.5,8 L72.1,10.8 L76.5,17.9 L78.1,27.2 L76.7,38.6 L71.8,46.6 L66.4,49.7 L60.1,49.7 L57.1,48.8 L52.2,45.1 L62.2,47.4 L71.6,47.5 L77.6,45.7 L82.7,42 L85.6,37.7 L86.5,34.6 L91.6,8",
  "ei": "M18.5,42 L40.7,57.8 L43,53.4 L42.7,47.2 L40.4,42.8 L37.4,40.7 L32.5,39.8 L27.5,40.3 L21.1,44 L17.9,52 L17,67 L19.4,79.2 L22.5,84.6 L25.2,87.2 L29.6,89.5 L34.6,90 L41.5,87.4 L46.6,80.4 L51.2,67.4 L58,40 L58.3,81.2 L61.5,87.8 L67.3,90 L70.5,88.4 L73.3,82.8 L83,40 M58,21 L58.6,19.3",
  "au": "M30.9,56.9 L27.2,52.3 L20.6,50.6 L15.1,52.6 L11.3,57 L8.6,64.4 L8.2,75.2 L10.8,83.7 L14.7,88.1 L19.2,89.9 L23.1,89.7 L26.6,87.9 L30.3,83.3 L32.8,75.9 L32.8,50.9 L33.1,83.4 L34.6,87 L36.7,89.1 L39.5,90 L42.2,89.2 L45.6,82.1 L52.6,50.6 L53.1,84 L55.8,88.1 L59.3,89.8 L64.2,89.6 L66.8,88.2 L69.9,84.4 L72.2,76.9 L72.3,50.9 L72.4,82.4 L74.6,87.8 L77,89.5 L79.9,90 L82.3,88.5 L85,82.2 L92,50.6",
  "schleife": "M11.9,49 L23.8,28.7 L27.5,19.1 L27.1,11.1 L25.1,8.8 L22.1,8 L19.3,8.9 L18,10.6 L16.8,16.5 L16.8,81.1 L18.1,86.1 L20.8,89 L25.7,89.7 L28.3,86.6 L31.3,76.8 L37.3,49 L49.2,28.7 L52.7,20.1 L53.3,14 L52,10.2 L48.6,8.1 L44.7,8.9 L43.1,11.5 L42.2,16.5 L42.2,80.1 L43.1,85.1 L45.4,88.5 L50.2,90 L52,89.1 L53.7,86.6 L56,79.8 L62.7,49 L77.2,23.1 L78.7,16.1 L77.9,11.1 L76.7,9.4 L74,8.1 L70.1,8.9 L68.2,12.5 L67.6,17.6 L67.6,80.1 L68.9,86.1 L70.8,88.5 L74.6,90 L77.4,89.1 L79.1,86.6 L81.9,77.8 L88.1,49",
  "girlande": "M8,45 C8,95 29,95 29,45 C29,95 50,95 50,45 C50,95 71,95 71,45 C71,95 92,95 92,45",
  "arkade": "M8,90 C8,40 29,40 29,90 C29,40 50,40 50,90 C50,40 71,40 71,90 C71,40 92,40 92,90",
  "welle": "M6,65 C17,35 28,35 39,65 C50,95 61,95 72,65 C83,35 94,35 94,50"
};

// ---------- Schritte ----------
const STEPS = {};
function schritt(id, home, von, arten, en, bitte, rest){
  const c = { home, von, arten, en, bitte, ...rest };
  if(rest.gen){ const gen = rest.gen; delete c.gen; c.aufgabe = (rng, stufe) => gen(rng, Math.max(0, Math.min(2, Math.floor(+stufe || 0)))); }
  STEPS[id] = c;
}

// ==================== MATHE ====================
function hinweis20(n){ const f = Math.floor(n / 5) * 5, d = n - f;
  if(d === 0) return n === 10 ? "Genau in der Mitte, beim langen Strich der 10." : `Genau beim langen Strich der ${n}.`;
  return [null, `Ein Strich nach der ${f}.`, `Zwei Striche nach der ${f}.`, `Zwei Striche vor der ${f + 5}.`, `Ein Strich vor der ${f + 5}.`][d]; }
schritt("m_zr20_orient", "post", "emil", ["zahlenstrahl"], "Numbers to 20: count, order, compare, neighbours",
  "Hier ist ein Brief für Nummer 15. Zieh das Haus an die richtige Stelle der kurzen Straße.", {
  gen(rng, s){ const n = eins(rng, je(s, [5, 10, 15, 4, 6, 9, 11, 14, 16], bis(1, 19), bis(1, 19).filter(x => x % 5)));
    return { art: "zahlenstrahl", item: { n, bis: 20, h: hinweis20(n), bitte: `Hier ist ein Brief für Nummer ${n}. Zieh das Haus an die richtige Stelle der kurzen Straße.` } }; },
  zeigen: ["Schau, die kurze Straße geht von 0 bis 20.", "In der Mitte wohnt die Nummer 10.", "Die langen Striche sind die 5, die 10 und die 15.",
    "Für die 13 gehe ich von der 10 noch drei Striche weiter."],
  merkheft: "Auf der Straße bis 20 helfen mir die 5, die 10 und die 15 beim Suchen." });

// Plus und Minus bis 20: Stufe 0 ohne Zehnerübergang, 1 und 2 mit
function plus20(rng, s){
  if(s === 0){ const a = eins(rng, [2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15]); return a < 10 ? [a, zz(rng, 2, 10 - a)] : [a, zz(rng, 2, 10 - a % 10 - 1)]; }
  if(s === 1){ const a = zz(rng, 6, 9); return [a, zz(rng, 11 - a, Math.min(9, 14 - a))]; }
  const a = zz(rng, 5, 9); return [a, zz(rng, Math.max(3, 12 - a), 9)];
}
function minus20(rng, s){
  if(s === 0){ const a = zz(rng, 12, 19); return [a, zz(rng, 2, a % 10)]; }
  if(s === 1){ const a = zz(rng, 11, 14); return [a, zz(rng, a % 10 + 1, Math.min(9, a - 2))]; }
  const a = zz(rng, 11, 18); return [a, zz(rng, a % 10 + 1, 9)];
}
const LADEN = ["einen Sticker", "einen Radiergummi", "einen Bleistift", "einen Spitzer", "einen Lolli", "eine Murmel", "ein Haargummi", "eine Brezel", "einen Apfel", "eine Banane"];
schritt("m_zr20_plus", "laden", "hilde", ["rechenstrich"], "Plus to 20 across ten, in steps",
  "Du kaufst einen Sticker für 8 ct und einen Radiergummi für 5 ct. Wie viel kostet das zusammen? Spring erst bis zur 10.", {
  gen(rng, s){ const [a, b] = plus20(rng, s), [x, y] = ziehe(rng, LADEN, 2), ueber = a < 10 && a + b > 10;
    return { art: "rechenstrich", item: { a, b, bitte: `Du kaufst ${x} für ${a} ct und ${y} für ${b} ct. Wie viel kostet das zusammen? ${ueber ? "Spring erst bis zur 10." : "Spring am Rechenstrich."}` } }; },
  zeigen: ["Wir rechnen 8 + 5.", "Bis zur 10 fehlen der 8 noch 2.", "Also springe ich erst 2 bis zur 10.", "Von den 5 sind dann noch 3 übrig.", "10 und 3 sind 13."],
  merkheft: "Beim Plusrechnen über die 10 springe ich erst bis zur 10 und dann den Rest." });

const OBST = ["Äpfel", "Birnen", "Bananen", "Gurken", "Brezeln", "Tomaten", "Zitronen", "Eier"];
schritt("m_zr20_minus", "laden", "hilde", ["rechenstrich"], "Minus to 20 across ten",
  "Ich hatte 13 Äpfel. 5 habe ich verkauft. Wie viele sind noch da? Spring rückwärts, erst bis zur 10.", {
  gen(rng, s){ const [a, b] = minus20(rng, s), ueber = b > a % 10;
    return { art: "rechenstrich", item: { a, b, minus: true, bitte: `Ich hatte ${a} ${eins(rng, OBST)}. ${b} habe ich verkauft. Wie viele sind noch da? ${ueber ? "Spring rückwärts, erst bis zur 10." : "Spring rückwärts."}` } }; },
  zeigen: ["Wir rechnen 13 − 5.", "Von 13 bis zur 10 sind es 3.", "Also springe ich erst 3 zurück bis zur 10.", "Von den 5 sind dann noch 2 übrig.", "10 − 2 sind 8."],
  merkheft: "Beim Minusrechnen über die 10 springe ich erst zurück bis zur 10 und dann den Rest." });

schritt("m_zr20_verdoppeln", "garten", "lotte", ["punktefeld", "verteilen"], "Doubling and halving to 20",
  "Ich pflanze 7 Tulpen in eine Reihe und noch einmal 7 in die zweite Reihe. Wie viele Tulpen sind das?", {
  gen(rng, s){
    if(ja(rng)){ const c = eins(rng, je(s, [2, 3, 4, 5], [4, 5, 6, 7, 8], [6, 7, 8])), b = eins(rng, ["Tulpen", "Krokusse", "Narzissen"]);
      return { art: "punktefeld", item: { r: 2, c, bitte: `Ich pflanze ${c} ${b} in eine Reihe und noch einmal ${c} in die zweite Reihe. Wie viele ${b} sind das?` } }; }
    const n = 2 * eins(rng, je(s, [2, 3, 4, 5], [4, 5, 6, 7, 8], [6, 7, 8, 9, 10]));
    return { art: "verteilen", item: { n, cats: ["Lilo", "Tom"], bitte: `Lilo und Tom besuchen meinen Garten. Teil die ${n} Fische gerecht auf, dann bekommt jede Katze die Hälfte.` } }; },
  zeigen: ["Verdoppeln heißt: dieselbe Zahl noch einmal dazu.", "7 Tulpen und noch einmal 7 Tulpen sind 14 Tulpen.",
    "Halbieren heißt: in zwei gleich große Teile teilen.", "Die Hälfte von 14 ist 7, denn 7 und 7 sind 14."],
  merkheft: "Verdoppeln heißt zweimal dieselbe Zahl, halbieren heißt in zwei gleiche Teile teilen." });

schritt("m_zr20_nachbar", "laden", "hilde", ["paare"], "Use an easy double for a harder sum (6 + 7 = 6 + 6 + 1)",
  "Auf meinen Preisschildern stehen schwere und leichte Aufgaben. Leg immer zwei zusammen, die gleich viel ergeben.", {
  gen(rng, s){ const as = ziehe(rng, je(s, [2, 3, 4, 5, 6], [3, 4, 5, 6, 7, 8], [3, 4, 5, 6, 7, 8, 9]), je(s, 3, 4, 4)), l = [], r = [];
    for(const a of as){ l.push(s > 0 && ja(rng) ? `${a + 1} + ${a}` : `${a} + ${a + 1}`); r.push(s === 2 && ja(rng) ? `${a + 1} + ${a + 1} − 1` : `${a} + ${a} + 1`); }
    return { art: "paare", item: { k: "schwere und leichte Aufgabe", l, r, rn: null, h1: "Rechne die schwere Aufgabe mit einer Verdopplung, die du schon kennst.",
      bitte: "Auf meinen Preisschildern stehen schwere und leichte Aufgaben. Leg immer zwei zusammen, die gleich viel ergeben." } }; },
  zeigen: ["6 + 7 sieht schwer aus.", "Aber 6 + 6 kenne ich, das sind 12.", "7 ist nur 1 mehr als 6.", "Also ist 6 + 7 eins mehr als 12, das sind 13."],
  merkheft: "Bei Nachbarzahlen nehme ich die Verdopplung und rechne 1 dazu." });

schritt("m_zr20_umkehr", "garten", "lotte", ["zahlenmauer"], "A sum and its reverse (2 + 7 = 9 → 9 − 7 = 2)",
  "Meine kleine Mauer hat oben eine 9. Unten links steht 7. Welcher Stein fehlt?", {
  gen(rng, s){ let x, y;
    if(s === 0){ x = zz(rng, 1, 8); y = zz(rng, 1, 10 - x); }
    else if(s === 1){ if(ja(rng)){ x = zz(rng, 11, 17); y = zz(rng, 1, 9 - x % 10); } else { y = zz(rng, 11, 17); x = zz(rng, 1, 9 - y % 10); } }
    else { x = zz(rng, 3, 9); y = zz(rng, Math.max(2, 11 - x), 9); }
    const t = x + y, hide = eins(rng, s === 0 ? ["t0", "b1"] : ["b0", "b1"]);
    const bitte = hide === "t0" ? `Meine kleine Mauer hat unten ${x} und ${y}. Welcher Stein fehlt oben?`
      : hide === "b1" ? `Meine kleine Mauer hat oben eine ${t}. Unten links steht ${x}. Welcher Stein fehlt?` : `Meine kleine Mauer hat oben eine ${t}. Unten rechts steht ${y}. Welcher Stein fehlt?`;
    return { art: "zahlenmauer", item: { b: [x, y], hide: [hide], bitte } }; },
  zeigen: ["Oben steht 9, unten links steht 7.", "Die zwei unteren Steine zusammen ergeben den oberen.", "Ich frage mich: 7 und wie viel sind 9?",
    "Ich rechne rückwärts: 9 − 7 = 2.", "Zur Probe rechne ich 2 + 7 = 9, die Mauer steht."],
  merkheft: "Zu jeder Plusaufgabe gibt es eine Minusaufgabe, die rückwärts rechnet." });

// Sachaufgaben im Café: Zahlen bis 20 (Stufe 0 ohne Zehnerübergang)
const SACH = {
  minus: [
    (a, b) => ({ t: `Im Café sitzen ${a} Gäste. ${b} gehen nach Hause. Wie viele Gäste sind noch da?`, k: [`${a} Gäste`, `${b} gehen`, "noch da"], unit: "Gäste",
      bad: { 1: `Mit ${a} + ${b} wären nach dem Gehen mehr Gäste da als vorher.`, 2: `Bei ${b} + ${b} kommen die ${a} Gäste gar nicht vor.` }, op3: `Es waren ${a} Gäste, und ${b} gehen weg.`,
      gegenprobe: x => `Ich mache die Probe: ${x} + ${b} = ${x + b}. Es waren aber ${a} Gäste.` }),
    (a, b) => ({ t: `Otto hat ${a} Brezeln. Er verkauft ${b} Brezeln. Wie viele Brezeln hat er noch?`, k: [`${a} Brezeln`, `verkauft ${b}`, "noch"], unit: "Brezeln",
      bad: { 1: `Mit ${a} + ${b} hätte Otto nach dem Verkaufen mehr Brezeln als vorher.`, 2: `Bei ${b} + ${b} kommen Ottos ${a} Brezeln gar nicht vor.` }, op3: `Otto hatte ${a} und gibt ${b} weg.`,
      gegenprobe: x => `Ich mache die Probe: ${x} + ${b} = ${x + b}. Ich hatte aber ${a} Brezeln.` }),
    (a, b) => ({ t: `Auf dem Tisch stehen ${a} Becher. Otto räumt ${b} Becher ab. Wie viele Becher stehen noch auf dem Tisch?`, k: [`${a} Becher`, `räumt ${b} Becher ab`, "noch"], unit: "Becher",
      bad: { 1: `Mit ${a} + ${b} wären nach dem Abräumen mehr Becher da als vorher.`, 2: `Bei ${b} + ${b} kommen die ${a} Becher gar nicht vor.` }, op3: `Es standen ${a} Becher da, und ${b} kommen weg.`,
      gegenprobe: x => `Ich mache die Probe: ${x} + ${b} = ${x + b}. Es waren aber ${a} Becher.` })],
  plus: [
    (a, b) => ({ t: `Otto backt ${a} Waffeln. Dann backt er noch ${b} Waffeln. Wie viele Waffeln sind es jetzt?`, k: [`${a} Waffeln`, `noch ${b} Waffeln`, "jetzt"], unit: "Waffeln",
      bad: { 1: `Mit ${a} − ${b} wären es nach dem Backen weniger Waffeln als vorher.`, 2: `Bei ${b} + ${b} fehlen die ersten ${a} Waffeln.` }, op3: `Otto hat ${a} Waffeln und backt ${b} dazu.`,
      gegenprobe: x => x < a ? `Mit ${x} Waffeln wären es weniger als vorher.` : `Ich mache die Probe: ${x} − ${b} = ${x - b}. Es waren aber ${a} Waffeln.` }),
    (a, b) => ({ t: `Am großen Tisch sitzen ${a} Kinder. ${b} Kinder kommen dazu. Wie viele Kinder sitzen jetzt am Tisch?`, k: [`${a} Kinder`, "kommen dazu", "jetzt"], unit: "Kinder",
      bad: { 1: `Mit ${a} − ${b} wären es weniger Kinder, obwohl welche dazukommen.`, 2: `Bei ${b} + ${b} fehlen die ${a} Kinder, die schon da sitzen.` }, op3: `Es sitzen schon ${a} Kinder da, und ${b} kommen dazu.`,
      gegenprobe: x => x < a ? `Mit ${x} Kindern wären es weniger als vorher.` : `Ich mache die Probe: ${x} − ${b} = ${x - b}. Es waren aber ${a} Kinder.` }),
    (a, b) => ({ t: `Otto hat ${a} Äpfel im Korb. Er pflückt noch ${b} Äpfel dazu. Wie viele Äpfel sind jetzt im Korb?`, k: [`${a} Äpfel`, `noch ${b} Äpfel`, "jetzt"], unit: "Äpfel",
      bad: { 1: `Mit ${a} − ${b} wären nach dem Pflücken weniger Äpfel im Korb als vorher.`, 2: `Bei ${b} + ${b} fehlen die ${a} Äpfel, die schon im Korb sind.` }, op3: `Im Korb sind ${a} Äpfel, und ${b} kommen dazu.`,
      gegenprobe: x => x < a ? `Mit ${x} Äpfeln wären es weniger als vorher.` : `Ich mache die Probe: ${x} − ${b} = ${x - b}. Es waren aber ${a} Äpfel.` })] };
function sachZahlen(rng, s, plus){
  for(;;){ let a, b;
    if(s === 0){ if(plus){ a = zz(rng, 11, 16); b = zz(rng, 2, 9 - a % 10); } else { a = zz(rng, 12, 19); b = zz(rng, 2, a % 10); } }
    else [a, b] = plus ? plus20(rng, s) : minus20(rng, s);
    if(a !== b && 2 * b !== (plus ? a + b : a - b)) return [a, b]; }
}
schritt("m_sach_fla", "cafe", "otto", ["sachaufgabe"], "Word problems: question – calculation – answer",
  "Im Café sitzen 12 Gäste. 5 gehen nach Hause. Wie viele Gäste sind noch da?", {
  gen(rng, s){ const plus = ja(rng), [a, b] = sachZahlen(rng, s, plus), it = eins(rng, SACH[plus ? "plus" : "minus"])(a, b), res = plus ? a + b : a - b;
    let r1, s2, s3;
    if(plus && a < 10){ r1 = "Rechne in Schritten: erst bis zur 10, dann weiter."; s2 = `${a} + ${10 - a} = 10`; s3 = `Jetzt noch 10 + ${b - (10 - a)}.`; }
    else if(plus){ r1 = "Rechne erst die Einer zusammen."; s2 = `${a % 10} + ${b} = ${a % 10 + b}`; s3 = `Jetzt noch 10 + ${a % 10 + b}.`; }
    else if(b > a % 10){ r1 = "Rechne in Schritten: erst zurück bis zur 10, dann weiter."; s2 = `${a} − ${a - 10} = 10`; s3 = `Jetzt noch 10 − ${b - (a - 10)}.`; }
    else { r1 = "Rechne erst mit den Einern."; s2 = `${a % 10} − ${b} = ${a % 10 - b}`; s3 = `Jetzt noch 10 + ${a % 10 - b}.`; }
    const ops = plus ? [`${a} + ${b}`, `${a} − ${b}`, `${b} + ${b}`] : [`${a} − ${b}`, `${a} + ${b}`, `${b} + ${b}`];
    return { art: "sachaufgabe", item: { ...it, ops, res, r1, s2, s3, bitte: it.t } }; },
  zeigen: ["Erst lese ich die ganze Geschichte.", "Dann suche ich die Frage am Ende.", "Ich überlege: Werden es mehr oder weniger?",
    "Dann rechne ich und sage die Antwort mit dem Wort dazu."],
  merkheft: "Bei einer Sachaufgabe gilt: Frage, Rechnung, Antwort." });

// Lage und Wege auf dem Karten-Gitter (lesenmalen {karte})
const SCHUPPEN = [["🧺", "Korb", "m"], ["🪣", "Eimer", "m"], ["🔦", "Taschenlampe", "f"], ["👒", "Hut", "m"], ["🎒", "Rucksack", "m"], ["🕯️", "Kerze", "f"],
  ["⏰", "Uhr", "f"], ["☂️", "Schirm", "m"], ["🥕", "Karotte", "f"], ["🏮", "Laterne", "f"], ["📕", "Buch", "n"], ["🧸", "Teddy", "m"]];
const FUELL = ["🌰", "🍎", "🐛", "🌻", "🔨", "🎈", "🍓", "🥔", "🧤", "🪴"];
const meinDat = d => (d[2] === "f" ? "meiner " : "meinem ") + d[1];
const k2 = (x, y) => `${x},${y}`;
schritt("m_raum_lage", "huegel", "mila", ["lesenmalen"], "Positions (left, right, between, on top) and views",
  "Mal das rot an, was links neben meiner Schaufel liegt.", {
  gen(rng, s){ const w = 5, h = 3, rel = eins(rng, je(s, ["links", "rechts"], ["links", "rechts", "über", "unter"], ["links", "rechts", "über", "unter", "zwischen", "zwischen"]));
    const [A, B] = ziehe(rng, SCHUPPEN, 2), dinge = {}; let tx, ty, satz;
    const f = s === 0 ? "rot" : eins(rng, ["rot", "blau", "gruen", "gelb"]);
    if(rel === "zwischen"){ tx = zz(rng, 1, w - 2); ty = zz(rng, 0, h - 1); dinge[k2(tx - 1, ty)] = A[0]; dinge[k2(tx + 1, ty)] = B[0]; satz = `zwischen ${meinDat(A)} und ${meinDat(B)}`; }
    else { const ax = rel === "links" ? zz(rng, 1, w - 1) : rel === "rechts" ? zz(rng, 0, w - 2) : zz(rng, 0, w - 1);
      const ay = rel === "über" ? zz(rng, 1, h - 1) : rel === "unter" ? zz(rng, 0, h - 2) : zz(rng, 0, h - 1);
      dinge[k2(ax, ay)] = A[0]; tx = ax + (rel === "links" ? -1 : rel === "rechts" ? 1 : 0); ty = ay + (rel === "über" ? -1 : rel === "unter" ? 1 : 0);
      satz = `${rel === "links" || rel === "rechts" ? rel + " neben" : rel} ${meinDat(A)}`; }
    const fuell = misch(rng, FUELL); dinge[k2(tx, ty)] = fuell.pop();
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(!dinge[k2(x, y)] && ja(rng, .45)) dinge[k2(x, y)] = fuell.pop();
    const text = `Mal das ${FARBE[f]} an, was ${satz} liegt.`;
    return { art: "lesenmalen", item: { karte: { w, h, start: [-1, -1], dinge }, s: text, goal: { [k2(tx, ty)]: f }, keep: [],
      k: [satz.split(" mein")[0], FARBE[f]], bitte: text } }; },
  zeigen: ["Daumen und Zeigefinger der linken Hand machen ein L.", "Links neben dem Korb ist das Feld auf der L-Seite.",
    "Über heißt oben drüber, unter heißt unten drunter.", "Zwischen heißt: in der Mitte von zwei Dingen."],
  merkheft: "Links, rechts, über, unter und zwischen sagen mir, wo etwas liegt." });

const RICHTUNG = { rechts: [1, 0], links: [-1, 0], oben: [0, -1], unten: [0, 1] };
const felder = n => n === 1 ? "1 Feld" : n + " Felder";
schritt("m_raum_wege", "huegel", "mila", ["lesenmalen"], "Follow and describe ways on a plan",
  "Geh 2 Felder nach rechts und 1 Feld nach oben. Mal das Feld an, auf dem du dann stehst.", {
  gen(rng, s){ const w = 6, h = 4, schritte = s + 1;
    for(;;){ let x = zz(rng, 0, w - 1), y = zz(rng, 0, h - 1); const start = [x, y], teile = [];
      let ok = true;
      for(let i = 0; i < schritte; i++){ const dirs = i % 2 === 0 ? ["rechts", "links"] : ["oben", "unten"], d = eins(rng, dirs), [dx, dy] = RICHTUNG[d];
        const max = dx > 0 ? w - 1 - x : dx < 0 ? x : dy > 0 ? h - 1 - y : y; if(max < 1){ ok = false; break; }
        const n = zz(rng, 1, Math.min(3, max)); x += dx * n; y += dy * n; teile.push(`${felder(n)} nach ${d}`); }
      if(!ok || (x === start[0] && y === start[1])) continue;
      const dinge = {}, fuell = misch(rng, ["🏠", "🌳", "🌷", "⛲", "🦆", "🌻"]);
      for(let i = 0; i < 3; i++){ const k = k2(zz(rng, 0, w - 1), zz(rng, 0, h - 1)); if(k !== k2(...start)) dinge[k] = fuell.pop(); }
      const f = s === 2 ? eins(rng, ["blau", "gruen"]) : "*", weg = teile.length > 1 ? teile.slice(0, -1).join(", ") + " und " + teile[teile.length - 1] : teile[0];
      const text = `Geh ${weg}. Mal das Feld ${f === "*" ? "" : FARBE[f] + " "}an, auf dem du dann stehst.`;
      return { art: "lesenmalen", item: { karte: { w, h, start, dinge }, s: text, goal: { [k2(x, y)]: f }, keep: [], k: f === "*" ? teile : [...teile, FARBE[f]], bitte: text } }; } },
  zeigen: ["Ich fange immer bei dem Kind auf der Karte an.", "Ich zähle die Felder mit dem Finger, eins nach dem anderen.",
    "Erst gehe ich nach rechts oder links, dann nach oben oder unten.", "Wo ich stehen bleibe, male ich das Feld an."],
  merkheft: "Bei einem Weg zähle ich Feld für Feld und gehe genau in die Richtung." });

schritt("m_zr100_buendeln", "post", "emil", ["zehner"], "Numbers to 100: bundle tens and ones, estimate",
  "Ich brauche 43 Briefmarken. Gibst du mir volle Zehnerstreifen und einzelne Marken?", {
  gen(rng, s){ const n = je(s, zz(rng, 12, 39), zz(rng, 21, 69), zz(rng, 41, 99));
    return { art: "zehner", item: { n, bitte: `Ich brauche ${n} Briefmarken. Gibst du mir volle Zehnerstreifen und einzelne Marken?` } }; },
  zeigen: ["43 Marken sind viele, deshalb bündle ich.", "Immer 10 Marken sind ein Zehnerstreifen.", "43 hat 4 Zehner, also nehme ich 4 Streifen.", "Dazu kommen 3 einzelne Marken."],
  merkheft: "Ich bündle immer 10 zu einem Zehner, der Rest sind Einer." });

schritt("m_zr100_stellenwert", "post", "emil", ["ergaenzen"], "Place value: tens and ones, number words",
  "Auf dem Paket steht: vierundsiebzig. Tipp die Hausnummer mit Ziffern.", {
  gen(rng, s){ const n = eins(rng, je(s, [...bis(13, 19), 20, 30, 40, 50, 60, 70, 80, 90, ...bis(21, 39)], bis(21, 99).filter(x => x % 10), bis(21, 99).filter(x => x % 10 && x % 11)));
    const wort = zahlwort(n); return { art: "ergaenzen", item: { wort, res: n, bitte: `Auf dem Paket steht: ${wort}. Tipp die Hausnummer mit Ziffern.` } }; },
  zeigen: ["Hör genau auf das Zahlwort vierundsiebzig.", "Zuerst hörst du vier, das sind die Einer.", "Dann hörst du siebzig, das sind 7 Zehner.", "Ich schreibe aber zuerst die Zehner: 74."],
  merkheft: "Beim Zahlwort höre ich die Einer zuerst, ich schreibe aber die Zehner zuerst." });

const KAUF = ["Der Stift", "Das Heft", "Die Schere", "Der Kleber", "Das Lineal", "Der Radiergummi", "Die Brotdose", "Das Malbuch"];
schritt("m_zr100_zerlegen", "laden", "hilde", ["ergaenzen"], "Split numbers to 100 (56 = 40 + ▢)",
  "Der Stift kostet 56 ct. Du hast schon 40 ct hingelegt. Wie viel fehlt noch?", {
  gen(rng, s){ let t, a;
    if(s === 0){ t = eins(rng, bis(21, 99).filter(x => x % 10)); a = t - t % 10; }
    else if(s === 1){ t = eins(rng, bis(31, 99).filter(x => x % 10)); a = 10 * zz(rng, 1, Math.floor(t / 10) - 1); }
    else { t = 100; a = ja(rng) ? 10 * zz(rng, 1, 9) : eins(rng, bis(21, 89).filter(x => x % 10)); }
    const thing = eins(rng, KAUF);
    return { art: "ergaenzen", item: { a, t, thing, bitte: `${thing} kostet ${preis(t)}. Du hast schon ${a} ct hingelegt. Wie viel fehlt noch?` } }; },
  zeigen: ["Der Stift kostet 56 ct, ich habe schon 40 ct.", "56 sind 50 und 6.", "Von 40 bis 50 fehlen 10.", "Dazu kommen noch die 6, also fehlen 16 ct."],
  merkheft: "Ich zerlege die Zahl in Zehner und Einer und rechne, was noch fehlt." });

const NACHBAR = [[1, "gleich rechts neben"], [-1, "gleich links neben"], [10, "direkt unter"], [-10, "direkt über"]];
schritt("m_zr100_hundertertafel", "post", "emil", ["hundert"], "Find your way on the hundred square",
  "Dieser Brief ist für Nummer 57. Tipp auf das Haus.", {
  gen(rng, s){
    if(s === 2 && ja(rng, .6)){ for(;;){ const m = zz(rng, 12, 89), [d, wo] = eins(rng, NACHBAR), n = m + d;
      if(n < 1 || n > 100 || (d === 1 && m % 10 === 0) || (d === -1 && m % 10 === 1)) continue;
      return { art: "hundert", item: { n, bitte: `Dieser Brief ist für das Haus ${wo} Nummer ${m}. Tipp auf das Haus.` } }; } }
    const n = s === 0 ? (ja(rng, .3) ? zz(rng, 1, 10) : 10 * zz(rng, 1, 9) + zz(rng, 1, 3)) : zz(rng, 11, 99);
    return { art: "hundert", item: { n, bitte: `Dieser Brief ist für Nummer ${n}. Tipp auf das Haus.` } }; },
  zeigen: ["In jeder Reihe der Tafel stehen zehn Häuser.", "Die 57 wohnt in der Reihe, die mit 51 anfängt.", "Von 51 zähle ich weiter: 52, 53, 54, 55, 56, 57.",
    "Unter einer Zahl wohnt immer die Zahl, die 10 größer ist."],
  merkheft: "Auf der Hundertertafel ist rechts eins mehr und unten zehn mehr." });

function hinweis100(n){ const f = Math.floor(n / 10) * 10, e = n % 10;
  if(e === 0) return `Es ist der lange Strich der ${n}.`;
  const zw = `Zwischen ${f} und ${f + 10}`;
  return e === 5 ? `${zw}, genau in der Mitte.` : e < 3 ? `${zw}, ganz nah bei ${f}.` : e < 5 ? `${zw}, kurz vor der Mitte.` : e < 8 ? `${zw}, kurz nach der Mitte.` : `${zw}, ganz nah bei ${f + 10}.`; }
schritt("m_zr100_zahlenstrahl", "post", "emil", ["zahlenstrahl"], "Number line to 100, neighbouring tens",
  "Ein Brief für Nummer 75! Zieh das Haus an die richtige Stelle der langen Straße.", {
  gen(rng, s){ const n = eins(rng, je(s, bis(1, 19).map(x => 5 * x), bis(3, 97), bis(3, 97).filter(x => x % 5)));
    return { art: "zahlenstrahl", item: { n, h: hinweis100(n), bitte: `Ein Brief für Nummer ${n}! Zieh das Haus an die richtige Stelle der langen Straße.` } }; },
  zeigen: ["Die lange Straße geht von 0 bis 100.", "In der Mitte wohnt die 50.", "Die langen Striche sind die Zehner.", "75 liegt zwischen 70 und 80, genau in der Mitte."],
  merkheft: "Am Zahlenstrahl suche ich zuerst den Zehner und dann die Einer." });

schritt("m_zr100_vergleichen", "post", "emil", ["reihenfolge"], "Compare and order numbers to 100",
  "Ich trage die Briefe der Reihe nach aus. Leg sie von der kleinsten zur größten Hausnummer.", {
  gen(rng, s){ const ns = new Set();
    if(s === 0) for(const t of ziehe(rng, bis(1, 9), 4)) ns.add(10 * t + zz(rng, 0, 9));
    else if(s === 1){ const [t1, t2, t3] = ziehe(rng, bis(1, 9), 3); const [e1, e2] = ziehe(rng, bis(0, 9), 2); [10 * t1 + e1, 10 * t1 + e2, 10 * t2 + zz(rng, 0, 9), 10 * t3 + zz(rng, 0, 9)].forEach(n => ns.add(n)); }
    else { const [a, b] = ziehe(rng, bis(1, 9), 2); ns.add(10 * a + b); ns.add(10 * b + a); while(ns.size < 4) ns.add(10 * eins(rng, [a, b]) + zz(rng, 0, 9)); }
    const c = [...ns].sort((x, y) => x - y).map(n => ["✉️", `Nr. ${n}`]);
    return { art: "reihenfolge", item: { q: "Ich trage die Briefe der Reihe nach aus.", c, bitte: "Ich trage die Briefe der Reihe nach aus. Leg sie von der kleinsten zur größten Hausnummer." } }; },
  zeigen: ["Ich vergleiche zuerst die Zehner.", "Bei 34 und 71 hat die 71 mehr Zehner, also ist sie größer.", "Sind die Zehner gleich, schaue ich auf die Einer.", "Bei 34 und 38 ist die 38 größer."],
  merkheft: "Ich vergleiche zuerst die Zehner und dann die Einer." });

const SCHRITTWORT = { 2: "Zweierschritten", 5: "Fünferschritten", 10: "Zehnerschritten" };
schritt("m_zr100_zaehlen", "post", "emil", ["stimmt", "hundert"], "Count in steps, number patterns, even and odd",
  "Auf der einen Straßenseite wohnen die geraden Nummern, auf der anderen die ungeraden. Sortierst du die Briefe?", {
  ersatzFuer: "sortieren",
  gen(rng, s){
    if(ja(rng)){ const n = je(s, zz(rng, 2, 20), zz(rng, 21, 99), zz(rng, 21, 99)), sagt = ja(rng), ist = n % 2 === 0, wort = g => g ? "gerade" : "ungerade";
      return { art: "stimmt", item: { s: `Nummer ${n} wohnt auf der Seite mit den ${sagt ? "geraden" : "ungeraden"} Nummern.`, a: sagt === ist,
        f: sagt === ist ? `Doch: ${n} ist ${wort(ist)}, also wohnt Nummer ${n} dort.` : `${n} ist ${wort(ist)}, also wohnt Nummer ${n} auf der anderen Seite.`,
        bitte: "Auf der einen Straßenseite wohnen die geraden Nummern, auf der anderen die ungeraden. Stimmt das?" } }; }
    const step = eins(rng, je(s, [10], [5, 2, 10], [10, 5, 2])), rueck = s === 2 && ja(rng, .6);
    for(;;){ const x0 = zz(rng, 1, 100), seq = [0, 1, 2, 3].map(i => x0 + (rueck ? -1 : 1) * i * step);
      if(seq.some(v => v < 1 || v > 100)) continue;
      return { art: "hundert", item: { n: seq[3], bitte: `Ich gehe in ${SCHRITTWORT[step]}${rueck ? " rückwärts" : ""}: ${seq.slice(0, 3).join(", ")}. Tipp auf das nächste Haus.` } }; } },
  zeigen: ["Gerade Zahlen enden mit 0, 2, 4, 6 oder 8.", "Ungerade Zahlen enden mit 1, 3, 5, 7 oder 9.", "Beim Schritte-Zählen springe ich immer gleich weit.",
    "In Fünferschritten heißt es 35, 40, 45, 50."],
  merkheft: "Die Einerstelle sagt mir, ob eine Zahl gerade oder ungerade ist." });

const VORRAT = ["Äpfel", "Eier", "Nüsse", "Birnen", "Kastanien"];
schritt("m_zr100_zehner", "laden", "hilde", ["rechenstrich"], "Add and subtract whole tens; double to 100",
  "Ich hatte 30 Äpfel und bekomme 40 dazu. Wie viele sind es jetzt? Spring in Zehnern.", {
  gen(rng, s){ const N = eins(rng, VORRAT); let a, b, minus = false, doppelt = false;
    if(s === 0){ a = 10 * zz(rng, 1, 8); b = 10 * zz(rng, 1, 10 - a / 10); }
    else if(s === 1 && ja(rng)){ minus = true; a = 10 * zz(rng, 3, 10); b = 10 * zz(rng, 1, a / 10 - 1); }
    else if(s === 1){ a = eins(rng, bis(11, 59).filter(x => x % 10)); b = 10 * zz(rng, 1, Math.floor((99 - a) / 10)); }
    else if(ja(rng)){ doppelt = true; a = b = 10 * zz(rng, 1, 4) + zz(rng, 1, 4); }
    else { minus = true; a = eins(rng, bis(41, 99).filter(x => x % 10)); b = 10 * zz(rng, 1, Math.floor(a / 10) - 1); }
    const bitte = minus ? `Ich hatte ${a} ${N} und verkaufe ${b}. Wie viele sind noch da? Spring in Zehnern rückwärts.`
      : doppelt ? `Ich hatte ${a} ${N} und bekomme noch einmal ${a} dazu. Wie viele sind es jetzt? Spring erst in Zehnern.`
      : `Ich hatte ${a} ${N} und bekomme ${b} dazu. Wie viele sind es jetzt? Spring in Zehnern.`;
    return { art: "rechenstrich", item: minus ? { a, b, minus, bitte } : { a, b, bitte } }; },
  zeigen: ["3 + 4 = 7, das weißt du schon.", "30 + 40 ist genauso, nur mit Zehnern.", "3 Zehner und 4 Zehner sind 7 Zehner.", "Also ist 30 + 40 = 70."],
  merkheft: "Mit Zehnern rechne ich wie mit Einern, nur heißen sie Zehner." });

// Formen: Name, Zeichen, Eigenschaft, Dinge aus dem Alltag
const FORMEN = [["Dreieck", ["▲", "△", "◢", "◣", "▼"], "3 Ecken", "Ein Dreieck hat 3 Ecken.", ["⚠️ das Warndreieck", "⛺ das Zeltdach"]],
  ["Quadrat", ["■", "□"], "4 gleich lange Seiten", "Ein Quadrat hat 4 gleich lange Seiten.", ["🎲 die Seite vom Würfel", "🏁 ein Feld vom Schachbrett"]],
  ["Rechteck", ["▬", "▭", "▮", "▯"], "2 lange und 2 kurze Seiten", "Ein Rechteck hat 2 lange und 2 kurze Seiten.", ["🚪 die Tür", "✉️ der Briefumschlag"]],
  ["Kreis", ["●", "○", "⬤"], "keine Ecke", "Ein Kreis hat keine Ecke.", ["🍽️ der Teller", "🪙 die Münze"]]];
schritt("m_geo_flaechen", "basteln", "katze", ["paare"], "Flat shapes: triangle, circle, rectangle, square",
  "Mila braucht Papierformen für ihr Fest. Sortierst du sie: Dreiecke, Vierecke, Kreise?", {
  ersatzFuer: "sortieren",
  gen(rng, s){ const F = misch(rng, FORMEN);
    if(s === 0) return { art: "paare", item: { k: "Form und Name", l: F.map(f => f[0]), r: F.map(f => eins(rng, f[1])), rn: F.map(f => `Das ist ein ${f[0]}.`),
      h1: "Zähl die Ecken der Form.", bitte: "Mila braucht Papierformen für ihr Fest. Leg jede Form zu ihrem Namen." } };
    if(s === 1) return { art: "paare", item: { k: "Form und Beschreibung", l: F.map(f => f[2]), r: F.map(f => eins(rng, f[1])), rn: F.map(f => `Diese Form hat ${f[2]}.`),
      h1: "Zähl die Ecken und schau, wie lang die Seiten sind.", bitte: "Mila braucht Papierformen für ihr Fest. Leg jede Form zu ihrer Beschreibung." } };
    return { art: "paare", item: { k: "Ding und Form", l: F.map(f => eins(rng, f[4])), r: F.map(f => f[0]), rn: F.map(f => f[3]),
      h1: "Stell dir das Ding vor und zähl seine Ecken.", bitte: "Mila sucht Formen bei sich zu Hause. Leg jedes Ding zu seiner Form." } }; },
  zeigen: ["Ein Dreieck hat 3 Ecken und 3 Seiten.", "Ein Viereck hat 4 Ecken und 4 Seiten.", "Beim Quadrat sind alle 4 Seiten gleich lang.", "Ein Kreis hat keine einzige Ecke."],
  merkheft: "Ein Dreieck hat 3 Ecken, ein Viereck 4 und ein Kreis keine." });

const HAELFTEN = [["▌", "▐"], ["▀", "▄"], ["◢", "◤"], ["◣", "◥"]], VIERTEL = [["▘", "▟"], ["▝", "▙"], ["▖", "▜"], ["▗", "▛"]];
schritt("m_geo_legen", "basteln", "katze", ["paare"], "Lay, split and draw shapes",
  "Welche zwei Teile ergeben zusammen ein Quadrat? Leg die Paare zusammen.", {
  gen(rng, s){ const P = misch(rng, je(s, HAELFTEN, [...ziehe(rng, HAELFTEN, 3), eins(rng, VIERTEL)], [...ziehe(rng, HAELFTEN, 1), ...ziehe(rng, VIERTEL, 3)]));
    return { art: "paare", item: { k: "zwei Teile, ein Quadrat", l: P.map(p => p[0]), r: P.map(p => p[1]), rn: P.map(() => "Mit diesem Teil wird es kein ganzes Quadrat."),
      h1: "Schau, welches Teil genau die leere Stelle füllt.", bitte: "Welche zwei Teile ergeben zusammen ein Quadrat? Leg die Paare zusammen." } }; },
  zeigen: ["Ein Quadrat kann man in zwei Teile schneiden.", "Schneide ich schräg, bekomme ich zwei Dreiecke.", "Schneide ich gerade, bekomme ich zwei Rechtecke.", "Die Teile passen genau wieder zusammen."],
  merkheft: "Zwei passende Teile füllen sich genau zu einem Quadrat." });

// Symmetrie: Schmetterling auf einem 8 × 6 Gitter, Faltlinie in der Mitte
function figurSVG(cells){ let s = `<svg viewBox="-0.2 -0.2 8.4 6.4" width="252" height="192" style="display:block;margin:0 auto 10px">`;
  for(let r = 0; r < 6; r++) for(let c = 0; c < 8; c++) s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${cells.has(r * 8 + c) ? "#b48be6" : "#f6f0fc"}" stroke="#fff" stroke-width=".06"/>`;
  return s + `<line x1="4" y1="-0.2" x2="4" y2="6.2" stroke="#8e5bd6" stroke-width=".09" stroke-dasharray=".3 .2"/></svg>`; }
const SYM_JA = ["A", "H", "M", "O", "T", "U", "V", "W", "X", "Y"], SYM_NEIN = ["F", "G", "J", "L", "N", "P", "R", "S", "Z"];
schritt("m_geo_symmetrie", "basteln", "katze", ["stimmt"], "Recognise mirror symmetry",
  "Ich habe Schmetterlinge ausgeschnitten. Stimmt das: Dieser ist auf beiden Seiten gleich?", {
  gen(rng, s){ const a = ja(rng);
    if(s === 2 && ja(rng)){ const L = eins(rng, a ? SYM_JA : SYM_NEIN);
      return { art: "stimmt", item: { s: `<span style="display:block;font-size:110px;line-height:1.1">${L}</span>Wenn ich das ${L} in der Mitte falte, liegen beide Seiten aufeinander.`, a,
        f: a ? `Doch: Das ${L} ist links und rechts gleich.` : `Beim ${L} sind die linke und die rechte Seite verschieden.`,
        bitte: "Ich habe Buchstaben ausgeschnitten. Stimmt das: Dieser ist auf beiden Seiten gleich?" } }; }
    const len = [zz(rng, 2, 4), zz(rng, 3, 4), zz(rng, 1, 3), zz(rng, 1, 3), zz(rng, 2, 4), zz(rng, 1, 3)], links = len.map(n => n), rechts = len.map(n => n);
    if(!a){ const rows = ziehe(rng, bis(0, 5), s === 0 ? 2 : 1); for(const r of rows) rechts[r] = rechts[r] > 2 ? rechts[r] - 2 + (s === 0 ? 0 : 1) : rechts[r] + (s === 0 ? 2 : 1); }
    const cells = new Set(); links.forEach((n, r) => { for(let c = 4 - n; c < 4; c++) cells.add(r * 8 + c); }); rechts.forEach((n, r) => { for(let c = 4; c < 4 + n; c++) cells.add(r * 8 + c); });
    return { art: "stimmt", item: { s: figurSVG(cells) + "Dieser Schmetterling ist auf beiden Seiten gleich.", a,
      f: a ? "Doch: Beim Falten liegen beide Seiten genau aufeinander." : "Beim Falten liegen nicht alle Kästchen aufeinander.",
      bitte: "Ich habe Schmetterlinge ausgeschnitten. Stimmt das: Dieser ist auf beiden Seiten gleich?" } }; },
  zeigen: ["Ich falte das Papier in der Mitte.", "Liegen beide Seiten genau aufeinander, ist die Figur symmetrisch.", "Dann ist jede Seite das Spiegelbild der anderen.",
    "Fehlt auf einer Seite ein Kästchen, passt es nicht."],
  merkheft: "Eine Figur ist symmetrisch, wenn beide Hälften beim Falten genau aufeinanderliegen." });

// Halbe Figuren (Zeilen 0–5, Spalten 0–3 links der Faltlinie)
const HALB = { baum: ["vom Baum", [[3], [2, 3], [1, 2, 3], [2, 3], [3], [3]]], kerze: ["von der Kerze", [[3], [3], [2, 3], [2, 3], [2, 3], [1, 2, 3]]],
  rakete: ["von der Rakete", [[3], [2, 3], [2, 3], [2, 3], [1, 2, 3], [1, 3]]], haus: ["vom Haus", [[3], [2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2]]],
  herz: ["vom Herzen", [[1, 2], [0, 1, 2, 3], [0, 1, 2, 3], [1, 2, 3], [2, 3], [3]]], laterne: ["von der Laterne", [[3], [1, 2, 3], [1, 3], [1, 3], [1, 2, 3], []]],
  schmetterling: ["vom Schmetterling", [[0, 1], [0, 1, 2], [1, 2, 3], [1, 2, 3], [0, 1, 2], [0, 1]]], krone: ["von der Krone", [[0, 2], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3], [], []]] };
schritt("m_geo_symm_ergaenzen", "basteln", "katze", ["spiegeln"], "Complete a symmetric shape",
  "Das Papier wird an der Linie gefaltet. Mal die andere Hälfte vom Haus an.", {
  gen(rng, s){ let name, p;
    if(s === 2 && ja(rng)){ name = "vom Muster"; const set = new Set(); while(set.size < zz(rng, 8, 11)) set.add(zz(rng, 0, 5) * 4 + zz(rng, 0, 3)); p = [...set].sort((x, y) => x - y).map(k => [Math.floor(k / 4), k % 4]); }
    else { const [n, rows] = HALB[eins(rng, je(s, ["baum", "kerze", "rakete"], ["haus", "herz", "laterne"], ["schmetterling", "krone", "herz", "haus"]))]; name = n; p = rows.flatMap((cs, r) => cs.map(c => [r, c])); }
    return { art: "spiegeln", item: { p, bitte: `Das Papier wird an der Linie gefaltet. Mal die andere Hälfte ${name} an.` } }; },
  zeigen: ["Die Linie in der Mitte ist die Faltlinie.", "Ein Kästchen direkt an der Linie hat seinen Zwilling direkt auf der anderen Seite.",
    "Ist es zwei Kästchen weg, ist der Zwilling auch zwei Kästchen weg.", "So male ich Reihe für Reihe."],
  merkheft: "Beim Spiegeln ist jedes Kästchen auf beiden Seiten gleich weit von der Faltlinie weg." });

// ==================== DEUTSCH ====================
const NACHRICHTEN = [
  [{ von: "Otto", msg: ["Hallo Azra!", "Gestern hatte ich Geburtstag und alle Gäste haben für mich gesungen."], q: "Was haben die Gäste gemacht?", o: [["🎵", "gesungen"], ["💃", "getanzt"], ["🏊", "geschwommen"]] },
   { von: "Mila", msg: ["Hallo Azra!", "Ich habe heute einen neuen Gang bis unter den großen Baum gegraben."], q: "Wohin führt Milas neuer Gang?", o: [["🌳", "unter den großen Baum"], ["🏠", "in ein Haus"], ["🌊", "zum See"]] },
   { von: "Hilde", msg: ["Hallo Azra!", "Heute habe ich im Laden frische Erdbeeren verkauft."], q: "Was hat Hilde verkauft?", o: [["🍓", "Erdbeeren"], ["🍌", "Bananen"], ["🥕", "Karotten"]] }],
  [{ von: "Lotte", msg: ["Hallo Azra!", "Heute war ich bei meiner Oma.", "Wir haben zusammen einen Kuchen gebacken."], s: 2, q: "Was hat Lotte mit ihrer Oma gemacht?", o: [["🎂", "einen Kuchen gebacken"], ["⚽", "Fußball gespielt"], ["📺", "ferngesehen"]] },
   { von: "Fridolin", msg: ["Hallo Azra!", "Ich war heute früh am See.", "Dort habe ich eine Ente mit fünf Küken gesehen."], s: 2, q: "Was hat Fridolin am See gesehen?", o: [["🦆", "eine Ente mit Küken"], ["🐟", "einen großen Fisch"], ["🐸", "einen Frosch"]] },
   { von: "Hilde", msg: ["Hallo Azra!", "Mein Fahrrad ist kaputt.", "Darum gehe ich jetzt zu Fuß zum Laden."], s: 2, q: "Wie kommt Hilde jetzt zum Laden?", o: [["🚶", "zu Fuß"], ["🚌", "mit dem Bus"], ["🛴", "mit dem Roller"]] }],
  [{ von: "Emil", msg: ["Hallo Azra!", "Heute kam ein großes Paket.", "Es war für Otto im Café.", "Darin waren neue Tassen."], s: 3, q: "Was war in dem Paket?", o: [["☕", "neue Tassen"], ["🧸", "ein Teddy"], ["📚", "Bücher"]] },
   { von: "Lotte", msg: ["Hallo Azra!", "Gestern hat es den ganzen Tag geregnet.", "Heute scheint die Sonne.", "Meine Tulpenzwiebeln sind schon in der Erde."], s: 3, q: "Was ist schon in der Erde?", o: [["🌷", "die Tulpenzwiebeln"], ["🥔", "die Kartoffeln"], ["🌰", "die Nüsse"]] },
   { von: "Otto", msg: ["Hallo Azra!", "Am Samstag mache ich ein Fest im Café.", "Es fängt um drei Uhr an.", "Bring bitte gute Laune mit."], s: 2, q: "Wann fängt das Fest an?", o: [["🕒", "um drei Uhr"], ["🕗", "um acht Uhr"], ["🕛", "um zwölf Uhr"]] }]];
schritt("d_gespraechsregeln", "tagebuch", "katze", ["hoeren"], "Talking rules: telling and listening",
  "Erzähl Mama beim Abendessen, was du heute erlebt hast. Und dann hörst du ihr gut zu.", {
  offline: true,
  gen(rng, s){ const m = eins(rng, NACHRICHTEN[s]);
    return { art: "hoeren", item: { msg: [...m.msg], s: m.s ?? 1, q: m.q, o: m.o.map(x => [...x]), bitte: `Hör gut zu, was ${m.von} dir erzählt.` } }; },
  zeigen: ["Wer erzählt, spricht laut und deutlich.", "Wer zuhört, schaut die Person an.", "Ich lasse andere ausreden.", "Danach darf ich fragen oder selbst erzählen."],
  merkheft: "Ich schaue die Person an, die spricht, und lasse sie ausreden." });

// Spuren: Schwünge und Buchstaben der Vereinfachten Ausgangsschrift
const SCHWUNG = [["girlande", "Girlanden-Muster", "Wir machen Schwünge. Fahr die Girlande mit dem Finger nach."], ["arkade", "Arkaden-Muster", "Wir machen Schwünge. Fahr die Arkaden mit dem Finger nach."],
  ["welle", "Wellen-Muster", "Wir machen Schwünge. Fahr die Welle mit dem Finger nach."], ["schleife", "Schleifen-Muster", "Wir machen Schwünge. Fahr die Schleifen mit dem Finger nach."]];
schritt("d_va_haltung", "tagebuch", "katze", ["spuren"], "Pencil grip, loosening up, swing patterns",
  "Wir machen Schwünge. Fahr die Girlande mit dem Finger nach.", {
  gen(rng, s){ const [k, l, bitte] = eins(rng, je(s, SCHWUNG.slice(0, 2), SCHWUNG.slice(0, 3), SCHWUNG)); return { art: "spuren", item: { l, d: SPUR[k], bitte } }; },
  zeigen: ["Setz dich gerade hin, die Füße stehen auf dem Boden.", "Halte den Stift locker mit drei Fingern.", "Schwünge fährst du ohne abzusetzen.", "Fang immer am lila Punkt an."],
  merkheft: "Ich halte den Stift locker und schreibe in Schwüngen." });
const buchstabe = (l, bitte) => ({ art: "spuren", item: { l, d: SPUR[l], bitte: bitte || `Fahr das ${l} mit dem Finger nach. Fang am Punkt an.` } });
function spurSchritt(id, en, bitte, gruppe, zeigen, merkheft){
  schritt(id, "tagebuch", "katze", ["spuren"], en, bitte, { gen: rng => buchstabe(eins(rng, gruppe)), zeigen, merkheft }); }
spurSchritt("d_va_gruppe1", "Handwriting: i, u, ü, e, l, t", "Fahr das t mit dem Finger nach. Fang am Punkt an.", ["i", "u", "ü", "e", "l", "t"],
  ["Schau, der lila Punkt zeigt, wo du anfängst.", "Diese Buchstaben fangen oben am Mittelband an.", "Fahr langsam auf der hellen Spur.", "Punkte und Striche kommen zum Schluss."],
  "Ich fange jeden Buchstaben am Punkt an und fahre langsam auf der Spur.");
spurSchritt("d_va_gruppe2", "Handwriting: n, m, r, h, k, b, p", "Fahr das h mit dem Finger nach. Fang am Punkt an.", ["n", "m", "r", "h", "k", "b", "p"],
  ["n, m, r und h haben einen Bogen wie eine Brücke.", "Der lila Punkt zeigt, wo du anfängst.", "Fahr erst hinunter und dann im Bogen weiter.", "Langsam ist genau richtig."],
  "Bei n, m, r und h fahre ich erst hinunter und dann im Bogen weiter.");
spurSchritt("d_va_gruppe3", "Handwriting: a, d, g, q, o, c, ä, ö", "Fahr das a mit dem Finger nach. Fang am Punkt an.", ["a", "d", "g", "q", "o", "c", "ä", "ö"],
  ["a, d, g, o und c sind runde Buchstaben.", "Sie fangen oben rechts an und laufen nach links herum.", "Vor einem runden Buchstaben hebst du den Stift kurz hoch.", "Das nennt man Luftsprung."],
  "Runde Buchstaben fange ich oben rechts an und fahre nach links herum.");
spurSchritt("d_va_gruppe4", "Handwriting: s, f, j, z, v, w, x, y, ß", "Fahr das f mit dem Finger nach. Fang am Punkt an.", ["s", "f", "j", "z", "v", "w", "x", "y", "ß"],
  ["Heute kommen s, f, j, z, v, w, x, y und ß.", "Manche haben eine Schlaufe unter der Linie.", "Der lila Punkt zeigt, wo du anfängst.", "Fahr ruhig und ohne Eile."],
  "Ich fange am Punkt an und fahre die Schlaufen ruhig nach.");
const GROSS = { A: "Azra", B: "Ball", C: "Clown", D: "Dach", E: "Emil", F: "Fridolin", G: "Garten", H: "Hilde", I: "Igel", J: "Jacke", K: "Katze", L: "Lotte", M: "Mila",
  N: "Nase", O: "Oma", P: "Post", Q: "Qualle", R: "Regen", S: "Sonne", T: "Tiger", U: "Uhr", V: "Vogel", W: "Wolke", X: "Xylofon", Z: "Zebra" };
const gross = L => buchstabe(L, GROSS[L] ? `Fahr das ${L} von ${GROSS[L]} mit dem Finger nach.` : `Fahr das große ${L} mit dem Finger nach.`);
schritt("d_va_gross1", "tagebuch", "katze", ["spuren"], "Capital letters A to M", "Fahr das A von Azra mit dem Finger nach.", {
  gen: rng => gross(eins(rng, "ABCDEFGHIJKLM".split(""))),
  zeigen: ["Großbuchstaben reichen bis ganz nach oben.", "Namen und Nomen fangen mit einem Großbuchstaben an.", "Das A von Azra fängt unten an.", "Fang immer am lila Punkt an."],
  merkheft: "Namen und Nomen fangen mit einem Großbuchstaben an." });
schritt("d_va_gross2", "tagebuch", "katze", ["spuren"], "Capital letters N to Z", "Fahr das O von Oma mit dem Finger nach.", {
  gen: rng => gross(eins(rng, "NOPQRSTUVWXYZ".split(""))),
  zeigen: ["Heute kommen die Großbuchstaben von N bis Z.", "Das O von Oma ist rund wie ein Ei.", "Manche Großbuchstaben haben mehr als einen Strich.", "Fang immer am lila Punkt an."],
  merkheft: "Bei Großbuchstaben mit mehreren Strichen fange ich immer am Punkt an." });
const VERB = { ch: "Fahr das ch mit dem Finger nach, ohne abzusetzen.", sch: "Fahr das sch mit dem Finger nach, ohne abzusetzen.", ck: "Fahr das ck mit dem Finger nach, ohne abzusetzen.",
  sp: "Fahr das sp mit dem Finger nach, ohne abzusetzen.", au: "Fahr das au mit dem Finger nach, ohne abzusetzen.",
  st: "Fahr das st mit dem Finger nach, den Querstrich machst du zum Schluss.", ei: "Fahr das ei mit dem Finger nach, den Punkt machst du zum Schluss." };
schritt("d_va_verbindungen", "tagebuch", "katze", ["spuren"], "Joined letters ch, sch, ck, st, sp, ei, au", "Fahr das sch mit dem Finger nach, ohne abzusetzen.", {
  gen(rng){ const j = eins(rng, Object.keys(VERB)); return buchstabe(j, VERB[j]); },
  zeigen: ["Manche Buchstaben gehören eng zusammen, wie sch.", "Ich verbinde sie zu einem Schwung.", "Dabei hebe ich den Finger nicht hoch.", "Punkte und Querstriche kommen zum Schluss."],
  merkheft: "Buchstabenverbindungen wie sch, ch und ei schreibe ich in einem Schwung." });

const SCHWING = [["Blu-me", "Ta-sche", "Pa-ket", "Kar-te", "Mar-ke", "Ma-ma", "Ro-se", "Kat-ze", "Son-ne", "Na-se", "Ta-fel", "Ho-se", "Re-gen", "Lam-pe"],
  ["Te-le-fon", "Ba-na-ne", "To-ma-te", "Brief-mar-ke", "Post-kar-te", "Pa-pa-gei", "Ge-schen-ke", "Pa-ke-te", "Ka-me-ra", "Ra-ke-te"],
  ["Scho-ko-la-de", "Ge-burts-tag", "Mar-me-la-de", "Fern-se-her", "Schmet-ter-ling", "Hub-schrau-ber", "Re-gen-schirm", "Kro-ko-dil", "Ka-ru-sell", "E-le-fant"]];
const silbenItem = (h, bitte) => { const x = silb(h); return { art: "silben", item: { w: x.w, b: x.b, bitte } }; };
schritt("d_silben_schwingen", "post", "emil", ["silben"], "Swing syllables (speak in syllables)",
  "Auf den Paketen stehen lange Wörter. Setz die Silbenbögen, dann kann ich sie lesen.", {
  gen: (rng, s) => silbenItem(eins(rng, SCHWING[s]), "Auf den Paketen stehen lange Wörter. Setz die Silbenbögen, dann kann ich sie lesen."),
  zeigen: ["Sprich das Wort langsam: Blu – me.", "Bei jeder Silbe schwingt dein Arm einen Bogen.", "Blu – me hat zwei Bögen, also zwei Silben.", "Den Strich setzt du dort, wo ein Bogen aufhört."],
  merkheft: "Ich schwinge ein Wort und höre, wie viele Silben es hat." });
const BUCHWORTE = [["Kin-der", "Gar-ten", "Wol-ke", "Fens-ter", "Ha-se", "Tan-te", "Bril-le", "Hun-de", "Mut-ter", "Win-ter"],
  ["Ge-mü-se", "To-ma-te", "Ka-ka-o", "Pi-ra-ten", "Kas-ta-ni-e", "Li-mo-na-de", "Fe-ri-en", "Kar-tof-fel", "Ge-spens-ter", "Fahr-rä-der"],
  ["Scho-ko-la-de", "Re-gen-bo-gen", "Ma-ri-en-kä-fer", "Lö-wen-zahn", "Spiel-platz", "Ge-burts-tags-tor-te", "Sonn-tags-ku-chen", "Pfann-ku-chen", "Ei-chen-blät-ter", "West-park"]];
schritt("d_lesen_silben", "regal", "katze", ["silben"], "Read syllable by syllable with arcs",
  "Lies diese Wörter aus deinem Buch Silbe für Silbe und setz die Bögen.", {
  gen: (rng, s) => silbenItem(eins(rng, BUCHWORTE[s]), "Lies diese Wörter aus deinem Buch Silbe für Silbe und setz die Bögen."),
  zeigen: ["Lange Wörter lese ich in Stücken.", "Jedes Stück ist eine Silbe: To – ma – te.", "Erst lese ich jede Silbe, dann sage ich das ganze Wort.", "To – ma – te heißt Tomate."],
  merkheft: "Lange Wörter lese ich Silbe für Silbe und setze sie dann zusammen." });

const NAMEN = [["Tom", "Ben", "E-mil", "Mi-la", "Ot-to", "O-ma", "O-pa", "Le-na", "Paul", "Max"],
  ["Lot-te", "Hil-de", "Az-ra", "Pau-la", "Ti-mo", "Ni-na", "Lu-kas", "Ma-ma", "Pa-pa", "Hei-di"],
  ["Fri-do-lin", "Va-len-tin", "Jo-han-na", "Me-li-na", "An-ni-ka", "Kon-stan-tin", "Ma-thil-da", "Ro-sa-li-e", "Ben-ja-min", "Ra-fa-el"]];
schritt("d_piloten", "post", "emil", ["piloten"], "Mark the Piloten (the vowel at the core of each syllable)",
  "Mal auf den Namensschildern die Piloten gelb an.", {
  gen(rng, s){ const x = einheiten(eins(rng, NAMEN[s])); return { art: "piloten", item: { u: x.u, s: x.s, p: x.p, bitte: "Mal auf den Namensschildern die Piloten gelb an." } }; },
  zeigen: ["In jeder Silbe sitzt ein Pilot.", "Piloten sind a, e, i, o, u, ä, ö, ü und au, ei, eu.", "Lot – te hat zwei Silben und zwei Piloten: o und e.", "Ohne Pilot kann eine Silbe nicht fliegen."],
  merkheft: "Jede Silbe hat genau einen Piloten." });

schritt("d_ich_text", "see", "fridolin", [], "Write an 'I' text about herself",
  "Ich möchte dich besser kennenlernen. Schreibst du mir auf Papier, wer du bist?", {
  offline: true,
  zeigen: ["Ein Ich-Text erzählt, wer du bist.", "Schreib, wie du heißt und wie alt du bist.", "Schreib, was du gern machst.", "Jeder Satz fängt groß an und endet mit einem Punkt."],
  merkheft: "In meinem Ich-Text erzähle ich in ganzen Sätzen, wer ich bin." });

// Wortende -el, -en, -er als Lückenwort (Ersatz für drei Körbe)
const ENDE = { el: [["📍", "Na-del"], ["🍎", "Ap-fel"], ["🍴", "Ga-bel"], ["🦔", "I-gel"], ["🥄", "Löf-fel"], ["🐦", "Vo-gel"], ["🏫", "Ta-fel"], ["🐚", "Mu-schel"]],
  en: [["🧹", "Be-sen"], ["🍰", "Ku-chen"], ["🌧️", "Re-gen"], ["🧵", "Fa-den"], ["🎨", "ma-len"], ["🛒", "Wa-gen"], ["🍓", "Bee-ren"], ["🎈", "Bal-lon"]].filter(x => x[1] !== "Bal-lon"),
  er: [["🪟", "Fens-ter"], ["🧈", "But-ter"], ["🔪", "Mes-ser"], ["💧", "Was-ser"], ["🪣", "Ei-mer"], ["🧳", "Kof-fer"], ["🔨", "Ham-mer"], ["🐯", "Ti-ger"]] };
function endeItem(rng, ende){ const [pic, h] = eins(rng, ENDE[ende]), x = silb(h), pre = x.w.slice(0, -ende.length), syl = vorlesen(h), erste = x.syl.slice(0, -1).join(" – ");
  return { art: "weiterschwingen", item: { pic, pre, post: "", ans: ende, tiles: ["el", "en", "er"],
    hilfe: ["Schwing das Wort deutlich und hör auf das Ende.", [`${erste} – ?`, "Hör genau, wie die letzte Silbe klingt."], [syl, `Hör zu: ${syl}. Zieh du das Ende.`, syl]],
    bitte: `Auf dem Paket fehlt das Wortende: ${pre}_. Kommt el, en oder er hinein?` } }; }
schritt("d_endsilben", "post", "emil", ["weiterschwingen"], "Unstressed endings -e, -el, -en, -er",
  "Sortier die Pakete nach dem Wortende: -el, -en oder -er.", {
  ersatzFuer: "sortieren",
  gen: (rng, s) => endeItem(rng, eins(rng, je(s, ["el", "er"], ["el", "en", "er"], ["el", "en", "er"]))),
  zeigen: ["Viele Wörter enden leise mit el, en oder er.", "Schwing das Wort deutlich: Na – del.", "Am Ende höre ich el.", "Wenn ich deutlich schwinge, höre ich das e mit."],
  merkheft: "Am Wortende schreibe ich el, en oder er, auch wenn ich das e kaum höre." });

const LANG = ["Ro-se", "Ho-se", "Na-se", "I-gel", "O-fen", "E-sel", "Ra-be", "Ha-se", "Blu-me", "Na-me", "Do-se", "Schu-le", "Ta-fel", "So-fa"];
const KURZ = ["Son-ne", "But-ter", "Kis-te", "Tas-se", "En-te", "Wol-ke", "Rat-te", "Pup-pe", "Kof-fer", "Tel-ler", "Kan-ne", "Mut-ter", "of-fen"];
const PAARE_LK = [["O-fen", "of-fen"], ["Ra-be", "Rat-te"], ["E-sel", "En-te"], ["Ha-se", "Tas-se"], ["Ro-se", "Son-ne"], ["Blu-me", "But-ter"], ["Na-se", "Kan-ne"]];
const lk = (h, b) => [h.replace(/-/g, ""), h, b];
schritt("d_lautqualitaet", "post", "emil", ["sortieren"], "Hear long and short vowels",
  "Ist der Pilot lang wie bei Rose oder kurz wie bei Sonne? Sortier die Wörter.", {
  gen(rng, s){ const w = s === 2 ? ziehe(rng, PAARE_LK, 3).flatMap(([l, k]) => [lk(l, "l"), lk(k, "k")])
      : [...ziehe(rng, LANG.filter(h => h !== "Ro-se"), s + 2).map(h => lk(h, "l")), ...ziehe(rng, KURZ.filter(h => h !== "Son-ne"), s + 2).map(h => lk(h, "k"))];
    return { art: "sortieren", item: { w, bitte: "Ist der Pilot lang wie bei Rose oder kurz wie bei Sonne? Sortier die Wörter." } }; },
  zeigen: ["Sprich Rose: Der Pilot o klingt lang.", "Sprich Sonne: Der Pilot o klingt kurz.", "Einen langen Piloten kann ich ziehen wie Kaugummi.", "Einen kurzen Piloten sage ich ganz schnell."],
  merkheft: "Ein Pilot kann lang klingen wie in Rose oder kurz wie in Sonne." });

const hoer = (h, bitte) => { const x = silb(h); return { art: "hoerwort", item: { w: x.w, syl: x.syl, bitte } }; };
const DOPPELK = [["Son-ne", "Tas-se", "Pup-pe", "Kan-ne", "Sup-pe", "Wol-le"], ["Tel-ler", "Mut-ter", "But-ter", "Kof-fer", "Him-mel", "Ham-mer"], ["Bril-le", "Kis-sen", "Som-mer", "Zim-mer", "Schlit-ten", "Gewit-ter".replace("Gewit", "Ge-wit")]];
schritt("d_doppelkonsonant", "post", "emil", ["hoerwort"], "Double consonants in the middle (Sonne, Teller)",
  "Hör gut zu und leg das Wort für das Paket: Sonne.", {
  gen(rng, s){ const h = eins(rng, DOPPELK[s]); return hoer(h, `Hör gut zu und leg das Wort für das Paket: ${h.replace(/-/g, "")}.`); },
  zeigen: ["Schwing das Wort: Son – ne.", "Der Pilot o klingt kurz.", "Am Ende der ersten Silbe höre ich n, am Anfang der zweiten wieder.", "Darum schreibe ich zwei n: Sonne."],
  merkheft: "Nach einem kurzen Piloten schreibe ich oft zwei gleiche Buchstaben." });

schritt("d_abschreiben_technik", "post", "emil", [], "Copying technique: read – remember – write – check",
  "Schreibst du die Karte für Oma ab? Lesen, merken, schreiben, prüfen.", {
  offline: true,
  zeigen: ["Lesen: Lies das Wort genau.", "Merken: Deck es ab und sag es leise.", "Schreiben: Schreib es aus dem Kopf.", "Prüfen: Vergleich Buchstabe für Buchstabe."],
  merkheft: "Beim Abschreiben gilt: lesen, merken, schreiben, prüfen." });

schritt("d_lesen_blitz", "regal", "katze", ["blitzwort"], "Read frequent words at a glance",
  "Gleich blitzt ein Wort aus deinem Buch auf. Tipp das passende Bild.", {
  gen(rng, s){ const w = eins(rng, WORTE), rest = misch(rng, WORTE.filter(x => x !== w && x[2] !== w[2])), nah = rest.filter(x => aehnlich(w, x)), weit = rest.filter(x => !aehnlich(w, x));
    const n = Math.min(nah.length, s), andere = [...nah.slice(0, n), ...weit.slice(0, 3 - n)];
    return { art: "blitzwort", item: { w: w[0], syl: w[1].split("-"), o: [w, ...andere].map(x => [x[2], einE(x)]), ms: je(s, 1500, 1000, 700), bitte: "Gleich blitzt ein Wort aus deinem Buch auf. Tipp das passende Bild." } }; },
  zeigen: ["Manche Wörter kennst du schon ganz gut.", "Die kannst du mit einem Blick lesen.", "Schau genau auf den Anfang und das Ende.", "Dann tipp das Bild, das passt."],
  merkheft: "Häufige Wörter lese ich mit einem Blick." });

// Blitzsätze wie im BYLET-F: Tier und Ding in einem Satz; die falschen Bilder haben das andere Tier, das andere Ding oder beides
// [Wort, Bild, Geschlecht]; Artikel je Geschlecht: der/die/das, ein/eine/ein, einen/eine/ein, den/die/das, dem/der/dem, einem/einer/einem
const TIERE = [["Hund", "🐶", 0], ["Katze", "🐱", 1], ["Maus", "🐭", 1], ["Ente", "🦆", 1], ["Igel", "🦔", 0], ["Frosch", "🐸", 0],
  ["Affe", "🐒", 0], ["Kuh", "🐮", 1], ["Schaf", "🐑", 2], ["Hase", "🐰", 0]];
const DINGE = [["Ball", "⚽", 0], ["Apfel", "🍎", 0], ["Buch", "📖", 2], ["Hut", "🎩", 0], ["Kuchen", "🍰", 0], ["Blume", "🌸", 1],
  ["Brief", "✉️", 0], ["Eis", "🍦", 2], ["Schuh", "👟", 0], ["Pilz", "🍄", 0], ["Tasse", "☕", 1], ["Banane", "🍌", 1]];
const ART = { der: ["der", "die", "das"], ein: ["ein", "eine", "ein"], einen: ["einen", "eine", "ein"], den: ["den", "die", "das"], dem: ["dem", "der", "dem"], einem: ["einem", "einer", "einem"] };
const mit = (w, a) => ART[a][w[2]] + " " + w[0];
const anfang = s => s[0].toUpperCase() + s.slice(1);
const SATZ = [
  [(t, d) => `${anfang(mit(t, "der"))} hat ${mit(d, "einen")}.`, (t, d) => `${anfang(mit(t, "der"))} sieht ${mit(d, "einen")}.`, (t, d) => `${anfang(mit(t, "der"))} mag ${mit(d, "den")}.`],
  [(t, d) => `${anfang(mit(t, "der"))} sitzt neben ${mit(d, "dem")}.`, (t, d) => `${anfang(mit(t, "der"))} spielt gern mit ${mit(d, "dem")}.`, (t, d) => `Heute bekommt ${mit(t, "der")} ${mit(d, "einen")}.`],
  [(t, d) => `Am Morgen findet ${mit(t, "der")} im Garten ${mit(d, "einen")}.`, (t, d) => `Im Park trägt ${mit(t, "der")} ${mit(d, "einen")} nach Hause.`,
   (t, d) => `Nach dem Essen sucht ${mit(t, "der")} ${mit(d, "den")} im Zimmer.`]];
function blitzsatz(rng, s){
  const [t, t2] = misch(rng, TIERE), [d, d2] = misch(rng, DINGE);
  return { t, t2, d, d2, w: eins(rng, SATZ[s])(t, d) };
}
schritt("d_lesen_blitzsatz", "regal", "katze", ["blitzwort"], "Read a short sentence at a glance and pick the matching picture",
  "Gleich blitzt ein Satz auf. Lies ihn bis zum Punkt und tipp das Bild, das genau passt.", {
  saetze: true, // nicht für die Blitzwörter vor einem Buch (lesen.js)
  gen(rng, s){ const { t, t2, d, d2, w } = blitzsatz(rng, s), ws = w.split(" ");
    const o = [[t, d], [t2, d], [t, d2], [t2, d2]].map(([a, b]) => [a[1] + b[1], `${mit(a, "ein")} mit ${mit(b, "einem")}`]);
    return { art: "blitzwort", item: { w, satz: true, syl: ws.map((x, i) => i < ws.length - 1 ? x + " " : x), o, ms: je(s, 2500, 2500, 3000),
      bitte: "Gleich blitzt ein Satz auf. Lies ihn bis zum Punkt und tipp das Bild, das genau passt." } }; },
  zeigen: ["Jetzt blitzt nicht nur ein Wort auf, sondern ein ganzer Satz.", "Lies schnell von links nach rechts bis zum Punkt.",
    "Merk dir, welches Tier es ist und was dabei ist.", "Dann tipp das Bild, das genau passt."],
  merkheft: "Bei einem Satz merke ich mir, wer es ist und was dabei ist." });

// Stolperwörter: ein Satz aus den Blitzsätzen mit einem Wort, das nicht hineinpasst (Stufe 2: ein Tunwort statt eines Namenworts)
const STOLPER_TUN = ["schwimmen", "lachen", "singen", "malen", "tanzen", "rennen", "kochen", "turnen"];
schritt("d_lesen_stolper", "regal", "katze", ["stolper"], "Find the word that does not belong in a sentence",
  "In diesem Satz hat sich ein Wort versteckt, das nicht hineinpasst. Tipp es an.", {
  gen(rng, s){ const { w } = blitzsatz(rng, s), ws = w.split(" "), drin = new Set(ws.map(x => x.replace(/[.,!?]/g, "")));
    const x = eins(rng, (s === 2 ? STOLPER_TUN : WORTE.map(v => v[0])).filter(v => !drin.has(v))), p = zz(rng, 2, ws.length - 1);
    return { art: "stolper", item: { s: [...ws.slice(0, p), x, ...ws.slice(p)].join(" "), x, bitte: "In diesem Satz hat sich ein Wort versteckt, das nicht hineinpasst. Tipp es an." } }; },
  zeigen: ["Manchmal schleicht sich ein Wort in einen Satz.", "Lies den Satz langsam, Wort für Wort.", "Wo stolperst du beim Lesen?", "Dieses Wort tippst du an."],
  merkheft: "Ich lese jeden Satz bis zum Punkt und merke, wenn ein Wort nicht passt." });

const BILD = { ball: "den Ball", dach: "das Dach", tuer: "die Tür", haus: "das Haus", baum: "den Baum" };
const BILD_K = { ball: "Ball", dach: "Dach", tuer: "Tür", haus: "Haus", baum: "Baum" };
const SAETZE_STIMMT = [
  [["Eine Katze kann miauen.", true, "Doch: Eine Katze kann miauen."], ["Fische leben im Wasser.", true, "Doch: Fische leben im Wasser."], ["Die Katze bellt laut.", false, "Eine Katze bellt nicht, sie miaut."],
   ["Ein Vogel hat vier Beine.", false, "Ein Vogel hat zwei Beine."], ["Bienen können fliegen.", true, "Doch: Bienen können fliegen."], ["Die Kuh legt Eier.", false, "Eine Kuh legt keine Eier, sie gibt Milch."]],
  [["Im Herbst fallen die Blätter von den Bäumen.", true, "Doch: Im Herbst fallen die Blätter von den Bäumen."], ["Im Sommer liegt bei uns viel Schnee.", false, "Im Sommer ist es bei uns warm, Schnee liegt im Winter."],
   ["Nachts scheint die Sonne hell am Himmel.", false, "Nachts sieht man den Mond und die Sterne."], ["Mit einem Schirm bleibt man im Regen trocken.", true, "Doch: Mit einem Schirm bleibt man im Regen trocken."],
   ["Äpfel wachsen unter der Erde.", false, "Äpfel wachsen an Bäumen."], ["Ein Hund hat vier Beine und einen Schwanz.", true, "Doch: Ein Hund hat vier Beine und einen Schwanz."]],
  [["Wenn es im Winter kalt ist, kann das Wasser im See zu Eis werden.", true, "Doch: Bei Kälte wird Wasser zu Eis."], ["Ein Fisch klettert am liebsten auf hohe Bäume.", false, "Fische schwimmen im Wasser und klettern nicht."],
   ["Wer Hunger hat, trinkt ein Glas Luft.", false, "Bei Hunger isst man etwas."], ["Im Frühling wachsen auf der Wiese die ersten Blumen.", true, "Doch: Im Frühling wachsen die ersten Blumen."],
   ["Bevor man über die Straße geht, schaut man nach links und rechts.", true, "Doch: Vor der Straße schaut man nach links und rechts."], ["Ein Elefant ist kleiner als eine Maus.", false, "Ein Elefant ist viel größer als eine Maus."]]];
schritt("d_lesen_saetze", "regal", "katze", ["lesenmalen", "stimmt"], "Understand sentences (read and colour, true or not)",
  "Mal den Ball aus deiner Geschichte rot an.", {
  gen(rng, s){
    if(ja(rng)){ const [satz, a, f] = eins(rng, SAETZE_STIMMT[s]); return { art: "stimmt", item: { s: satz, a, f, bitte: "Lies den Satz aus deiner Geschichte. Stimmt das?" } }; }
    const bitte = "Lies den Auftrag aus deiner Geschichte und mal das Bild an.";
    if(s === 0){ const o = eins(rng, Object.keys(BILD)), f = eins(rng, Object.keys(FARBE));
      return { art: "lesenmalen", item: { s: `Mal ${BILD[o]} ${FARBE[f]} an.`, goal: { [o]: f }, keep: [], k: [BILD_K[o], FARBE[f]], bitte } }; }
    if(s === 1){ const eine = ja(rng), f = eins(rng, Object.keys(FARBE)), wo = eine ? "neben dem Haus" : "am Baum";
      return { art: "lesenmalen", item: { s: `Mal die Blume ${wo} ${FARBE[f]} an.`, goal: { [eine ? "blume1" : "blume2"]: f }, keep: [eine ? "blume2" : "blume1"], k: ["Blume", wo, FARBE[f]], bitte } }; }
    const [o1, o2] = ziehe(rng, Object.keys(BILD), 2), [f1, f2] = ziehe(rng, Object.keys(FARBE), 2);
    return { art: "lesenmalen", item: { s: `Mal ${BILD[o1]} ${FARBE[f1]} und ${BILD[o2]} ${FARBE[f2]} an.`, goal: { [o1]: f1, [o2]: f2 }, keep: [], k: [BILD_K[o1], FARBE[f1], BILD_K[o2], FARBE[f2]], bitte } }; },
  zeigen: ["Ich lese den ganzen Satz bis zum Punkt.", "Dann frage ich mich: Was soll ich tun?", "Ich suche das richtige Ding und die richtige Farbe.", "Bei einer Behauptung überlege ich, ob sie wirklich stimmt."],
  merkheft: "Ich lese jeden Satz bis zum Ende, bevor ich etwas tue." });

const REZEPTE = [
  [["Kakao", [["🥛", "Milch warm machen"], ["🍫", "Kakaopulver in die Tasse geben"], ["☕", "warme Milch dazugießen"], ["🥄", "gut umrühren"]]],
   ["ein Butterbrot", [["🍞", "eine Scheibe Brot nehmen"], ["🧈", "Butter darauf streichen"], ["🧀", "Käse darauflegen"], ["😋", "abbeißen"]]]],
  [["Obstsalat", [["🚰", "das Obst waschen"], ["🔪", "das Obst klein schneiden"], ["🥣", "alles in eine Schüssel geben"], ["🥄", "umrühren und essen"]]],
   ["Müsli", [["🥣", "eine Schüssel hinstellen"], ["🌾", "Haferflocken hineingeben"], ["🍓", "Obst dazugeben"], ["🥛", "Milch darübergießen"]]],
   ["Tee", [["💧", "Wasser kochen"], ["🍵", "einen Teebeutel in die Tasse hängen"], ["☕", "heißes Wasser darübergießen"], ["⏳", "warten, bis der Tee fertig ist"]]]],
  [["Pfannkuchen", [["🥚", "Mehl, Eier und Milch in die Schüssel geben"], ["🥄", "alles zu einem Teig verrühren"], ["🍳", "den Teig in der Pfanne backen"], ["🍽️", "mit Apfelmus essen"]]],
   ["einen Bananen-Shake", [["🍌", "die Banane schälen"], ["🔪", "die Banane in Stücke schneiden"], ["🥛", "Banane und Milch in den Mixer geben"], ["🥤", "mixen und in ein Glas füllen"]]]]];
schritt("d_rezept", "cafe", "otto", ["reihenfolge"], "Write a shopping list and a recipe from a model",
  "Wie macht man Obstsalat? Leg die Schritte in die richtige Reihenfolge. Dann schreib die Einkaufsliste auf Papier.", {
  gen(rng, s){ const [name, c] = eins(rng, REZEPTE[s]);
    return { art: "reihenfolge", item: { q: `Wie macht man ${name}?`, c: c.map(x => [...x]), bitte: `Wie macht man ${name}? Leg die Schritte in die richtige Reihenfolge.` } }; },
  zeigen: ["Ein Rezept sagt, was man nacheinander tut.", "Zuerst holt man alles, was man braucht.", "Dann kommen die Schritte, einer nach dem anderen.", "Zum Schluss kann man essen."],
  merkheft: "In einem Rezept stehen die Schritte in der richtigen Reihenfolge." });

schritt("d_pruefen_aufgabe", "tagebuch", "katze", [], "Check her text against the task (checklist)",
  "Schau mit Mama nach: Steht alles auf deiner Einkaufsliste?", {
  offline: true,
  zeigen: ["Lies deine Liste noch einmal.", "Schau die Aufgabe an: Was sollte alles drinstehen?", "Hak ab, was schon da ist.", "Was fehlt, schreibst du dazu."],
  merkheft: "Zum Schluss prüfe ich mit der Aufgabe, ob alles in meinem Text steht." });

schritt("d_abc", "post", "emil", ["reihenfolge"], "Alphabet: order words by their first letter",
  "Ich sortiere die Briefe nach dem ABC. Leg sie in die richtige Reihenfolge.", {
  gen(rng, s){ let ws;
    for(;;){
      if(s === 2){ const b = eins(rng, ["B", "H", "K"]), gruppe = misch(rng, WORTE.filter(w => w[0][0] === b)), seen = new Set(); ws = [];
        for(const w of gruppe) if(!seen.has(w[0][1])){ seen.add(w[0][1]); ws.push(w); } ws = ws.slice(0, 4); }
      else { const seen = new Set(); ws = []; for(const w of misch(rng, WORTE)) if(!seen.has(w[0][0])){ seen.add(w[0][0]); ws.push(w); }
        ws = ws.slice(0, 4); if(s === 0 && ws.map(w => w[0][0]).sort().some((c, i, a) => i && c.charCodeAt(0) - a[i - 1].charCodeAt(0) < 3)) continue; }
      if(ws.length === 4) break; }
    const c = ws.sort((x, y) => x[0].localeCompare(y[0], "de")).map(w => [w[2], w[0]]);
    return { art: "reihenfolge", item: { q: "Ich sortiere die Briefe nach dem ABC.", c, bitte: "Ich sortiere die Briefe nach dem ABC. Leg sie in die richtige Reihenfolge." } }; },
  zeigen: ["Das ABC hat eine feste Reihenfolge: A, B, C, D und so weiter.", "Ich schaue auf den ersten Buchstaben von jedem Wort.", "Affe kommt vor Hund, weil A vor H kommt.",
    "Fangen zwei Wörter gleich an, schaue ich auf den zweiten Buchstaben."],
  merkheft: "Nach dem ABC ordne ich mit dem ersten Buchstaben, sonst mit dem zweiten." });

const IE = [["🐝", "Bi", "ne", "Biii – ne"], ["🐐", "Zi", "ge", "Ziii – ge"], ["🌼", "Wi", "se", "Wiii – se"], ["🪞", "Spi", "gel", "Spiii – gel"], ["🦶", "Ri", "se", "Riii – se"], ["🪰", "Fli", "ge", "Fliii – ge"], ["🎲", "spi", "len", "spiii – len"]];
const IE1 = [["✉️", "Br", "f", "Briiief"], ["🕳️", "t", "f", "tiiief"], ["💕", "l", "b", "liiieb"]];
const I2 = [["📦", "K", "ste", "Kis – te"], ["🛋️", "Z", "mmer", "Zim – mer"], ["🎯", "M", "tte", "Mit – te"], ["🖊️", "St", "ft", "Stift"]];
const I1 = [["🐟", "F", "sch", "Fisch"], ["🧒", "K", "nd", "Kind"], ["🍽️", "T", "sch", "Tisch"], ["💍", "R", "ng", "Ring"], ["🍄", "P", "lz", "Pilz"], ["💨", "W", "nd", "Wind"]];
function ieItem(rng, x, lang){ const [pic, pre, post, hl] = x;
  return { art: "weiterschwingen", item: { pic, pre, post, ans: lang ? "ie" : "i", tiles: ["i", "ie"],
    hilfe: ["Sprich das Wort langsam: Klingt das i lang oder kurz?", [hl, lang ? "Hör mal, wie lang das i klingt." : "Hör mal, wie kurz das i klingt."],
      lang ? ["langes i", "Ein langes i schreibt man meistens ie. Zieh du die Buchstaben.", hl] : ["kurzes i", "Ein kurzes i schreibt man nur mit i. Zieh du den Buchstaben.", hl]],
    bitte: `Auf dem Paket fehlt ein Stück: ${pre}_${post}. Kommt i oder ie hinein?` } }; }
schritt("d_ie", "post", "emil", ["weiterschwingen"], "Words with ie (Biene, Wiese)",
  "Auf dem Paket fehlt ein Stück: Bi_ne. Kommt i oder ie hinein?", {
  gen(rng, s){ const lang = s === 0 || ja(rng);
    return ieItem(rng, eins(rng, lang ? (s === 2 ? [...IE, ...IE1] : IE) : (s === 2 ? [...I2, ...I1] : I2)), lang); },
  zeigen: ["Schwing das Wort: Bie – ne.", "Das i am Ende der ersten Silbe klingt lang.", "Ein langes i schreibe ich meistens ie.", "Ein kurzes i wie in Kis – te schreibe ich nur mit i."],
  merkheft: "Ein langes i am Silbenende schreibe ich meistens ie." });

schritt("d_abschreiben_schleich", "post", "emil", [], "Creeping dictation (Schleichdiktat)",
  "Ich hänge einen Satz an die Tür. Lauf hin, merk ihn dir und schreib ihn am Tisch auf.", {
  offline: true,
  zeigen: ["Lies den Satz an der Tür genau.", "Merk dir ein Stück, nicht zu viel auf einmal.", "Geh zum Tisch und schreib das Stück auf.", "Am Ende vergleichst du mit dem Satz an der Tür."],
  merkheft: "Beim Schleichdiktat merke ich mir kleine Stücke und prüfe am Schluss." });

const LERNWOERTER = [["Au-to", "O-ma", "O-pa", "Haus", "Hund", "Kind", "Tag", "Ball", "Buch", "Brot", "Hand", "Ma-ma", "Pa-pa", "Maus", "Mond", "rot", "gut"],
  ["Kat-ze", "Tisch", "Blu-me", "Son-ne", "Fisch", "Stuhl", "Na-me", "Na-se", "Wald", "Frau", "Va-ter", "Bus", "Baum"],
  ["Schu-le", "Gar-ten", "Fens-ter", "Freund", "Stra-ße", "Mut-ter", "Leh-re-rin", "Bru-der", "Schwes-ter", "Ge-burts-tag"]];
schritt("d_lernwoerter", "post", "emil", ["hoerwort"], "Practise her own learning words (word box)",
  "Heute kommen deine Lernwörter mit der Post. Hör zu und leg das Wort: Schule.", {
  gen(rng, s){ const h = eins(rng, LERNWOERTER[s]); return hoer(h, `Heute kommen deine Lernwörter mit der Post. Hör zu und leg das Wort: ${h.replace(/-/g, "")}.`); },
  zeigen: ["Lernwörter übe ich immer wieder.", "Ich höre das Wort und spreche es leise mit.", "Dann lege ich Buchstabe für Buchstabe.", "Am Ende lese ich das Wort noch einmal."],
  merkheft: "Lernwörter übe ich oft, dann bleiben sie im Kopf." });

const REIME = [["Maus", "Haus"], ["Hund", "Mund"], ["Baum", "Traum"], ["Hose", "Rose"], ["Kuchen", "suchen"], ["Wind", "Kind"], ["Sonne", "Tonne"], ["Katze", "Tatze"],
  ["Tisch", "Fisch"], ["Hand", "Sand"], ["Stern", "gern"], ["Nacht", "lacht"], ["Hase", "Nase"], ["Ball", "Stall"], ["Igel", "Spiegel"], ["Wiese", "Riese"], ["Schnecke", "Ecke"],
  ["Regen", "legen"], ["Bett", "nett"], ["Schuh", "Kuh"]];
schritt("d_lesen_gedicht", "regal", "katze", ["paare"], "Read poems; hear rhymes",
  "Welche Wörter aus dem Gedicht reimen sich? Leg die Paare zusammen.", {
  gen(rng, s){ const P = ziehe(rng, REIME, s + 3);
    return { art: "paare", item: { k: "Reimwörter", l: P.map(p => p[0]), r: P.map(p => p[1]), rn: P.map(p => `${p[1]} reimt sich auf ein anderes Wort.`),
      h1: "Sprich beide Wörter laut: Klingen sie am Ende gleich?", bitte: "Welche Wörter aus dem Gedicht reimen sich? Leg die Paare zusammen." } }; },
  zeigen: ["Wörter reimen sich, wenn sie am Ende gleich klingen.", "Maus und Haus reimen sich.", "Maus und Hund reimen sich nicht.", "Sprich beide Wörter laut, dann hörst du es."],
  merkheft: "Reimwörter klingen am Ende gleich, wie Maus und Haus." });

const HERBST_JA = ["Drachen", "Kastanie", "Laub", "Nebel", "Kürbis", "Pilze", "Laterne", "Igel", "Wind", "Gummistiefel", "bunte Blätter"];
const HERBST_NEIN = [["Schneemann", "Winter"], ["Badehose", "Sommer"], ["Osterei", "Frühling"], ["Schlitten", "Winter"], ["Sonnencreme", "Sommer"], ["Freibad", "Sommer"], ["Weihnachtsbaum", "Winter"], ["Tulpe", "Frühling"]];
const WETTER_JA = ["Regen", "Sonne", "Wind", "Gewitter", "Nebel", "Schnee", "Wolke", "Hagel"], WETTER_NEIN = ["Tisch", "Gabel", "Kuchen", "Buch", "Löffel", "Fahrrad"];
schritt("d_ideenblitze", "garten", "lotte", ["stimmt"], "Collect ideas before writing",
  "Ich sammle Herbst-Wörter für mein Gartenfest. Welche passen zum Herbst?", {
  ersatzFuer: "sortieren",
  gen(rng, s){ const a = ja(rng);
    if(s === 2 && ja(rng)){ const w = eins(rng, a ? WETTER_JA : WETTER_NEIN);
      return { art: "stimmt", item: { s: `„${w}“ passt zum Thema Wetter.`, a, f: a ? `Doch: „${w}“ ist ein Wort zum Wetter.` : `„${w}“ ist kein Wort zum Wetter.`,
        bitte: "Ich sammle Wetter-Wörter für meinen Gartenkalender. Stimmt das?" } }; }
    const [w, zeit] = a ? [eins(rng, HERBST_JA)] : eins(rng, HERBST_NEIN);
    return { art: "stimmt", item: { s: `„${w}“ passt zum Herbst.`, a, f: a ? `Doch: „${w}“ passt gut zum Herbst.` : `„${w}“ passt besser zum ${zeit}.`,
      bitte: "Ich sammle Herbst-Wörter für mein Gartenfest. Stimmt das?" } }; },
  zeigen: ["Bevor ich schreibe, sammle ich Ideen.", "Beim Thema Herbst denke ich an Blätter, Wind und Drachen.", "Ich frage mich bei jedem Wort: Passt das zum Thema?", "Was nicht passt, lasse ich weg."],
  merkheft: "Vor dem Schreiben sammle ich Wörter, die zum Thema passen." });

const NOMEN = [["Hund", "der"], ["Ball", "der"], ["Blume", "die"], ["Oma", "die"], ["Tisch", "der"], ["Apfel", "der"], ["Katze", "die"], ["Baum", "der"], ["Brot", "das"],
  ["Haus", "das"], ["Lehrerin", "die"], ["Schere", "die"], ["Buch", "das"], ["Rose", "die"], ["Kind", "das"]];
const KEIN_NOMEN = ["laufen", "rot", "schön", "spielen", "schnell", "und", "lachen", "klein", "singen", "leise", "oder", "malen", "lustig"];
schritt("d_nomen", "laden", "hilde", ["stimmt"], "Nouns: people, animals, plants, things",
  "In meinen Laden kommen nur Nomen. Welche Wörter sind Nomen?", {
  ersatzFuer: "sortieren",
  gen(rng, s){ const a = ja(rng), [w, art] = a ? eins(rng, NOMEN) : [eins(rng, KEIN_NOMEN)], zeig = s === 2 ? w.toUpperCase() : w;
    return { art: "stimmt", item: { s: `„${zeig}“ ist ein Nomen.`, a, f: a ? `Doch: Man sagt ${art} ${w}, also ist „${w}“ ein Nomen.` : `Vor „${w}“ passt kein der, die oder das.`,
      bitte: "In meinen Laden kommen nur Nomen. Stimmt das?" } }; },
  zeigen: ["Nomen sind Namen für Menschen, Tiere, Pflanzen und Dinge.", "Oma, Hund, Blume und Tisch sind Nomen.", "Vor ein Nomen passt der, die oder das.", "Nomen schreibt man groß."],
  merkheft: "Nomen sind Namen für Menschen, Tiere, Pflanzen und Dinge, und man schreibt sie groß." });

const SCHLANGEN = [["DIE KATZE SCHLÄFT", "OMA HOLT BROT", "ICH SPIELE GERN", "DER HUND BELLT", "EMIL BRINGT POST", "MILA GRÄBT TIEF"],
  ["DIE SONNE SCHEINT HELL", "OTTO BACKT EINEN KUCHEN", "LOTTE PFLANZT ROTE TULPEN", "WIR SPIELEN IM PARK"],
  ["AZRA LIEST EIN BUCH IM BETT", "FRIDOLIN STEHT STILL AM SEE", "HILDE VERKAUFT ROTE ÄPFEL", "DER IGEL SCHLÄFT IM LAUB"]];
schritt("d_wortgrenzen", "post", "emil", ["silben"], "Find word boundaries in a word snake",
  "Bei diesem Brief fehlen die Lücken: DIEKATZESCHLÄFT. Tipp, wo ein Wort aufhört.", {
  gen(rng, s){ const x = silb(eins(rng, SCHLANGEN[s]).split(" ").join("-"));
    return { art: "silben", item: { w: x.w, b: x.b, bitte: `Bei diesem Brief fehlen die Lücken: ${x.w}. Tipp, wo ein Wort aufhört.` } }; },
  zeigen: ["Hier fehlen die Lücken zwischen den Wörtern.", "Ich lese langsam und suche das erste Wort: DIE.", "Dahinter fängt ein neues Wort an: KATZE.", "So trenne ich Wort für Wort."],
  merkheft: "Zwischen zwei Wörtern lasse ich immer eine Lücke." });

const MITSPRECH = [["Na-me", "Ho-se", "Na-se", "So-fa", "Salz", "Pilz", "La-ma", "Ro-se"], ["To-ma-te", "Tul-pe", "Wol-ke", "Ga-bel", "Sa-lat", "Pa-ket"], ["Ba-na-ne", "Ra-ke-te", "Ro-si-ne", "Ka-mel", "Te-le-fon", "Li-mo-na-de"]];
schritt("d_mitsprechen", "post", "emil", ["hoerwort"], "Spell words the way you say them (Tomate, Name)",
  "Hör gut zu und leg das Wort: Tomate.", {
  gen(rng, s){ const h = eins(rng, MITSPRECH[s]); return hoer(h, `Hör gut zu und leg das Wort: ${h.replace(/-/g, "")}.`); },
  zeigen: ["Manche Wörter schreibt man so, wie man sie spricht.", "Schwing das Wort langsam: To – ma – te.", "Sprich jeden Laut mit, während du legst.", "Am Ende prüfst du, ob jeder Laut da ist."],
  merkheft: "Mitsprechwörter schreibe ich, indem ich jeden Laut deutlich mitspreche." });

// ck/k und tz/z: [Bild, vor der Lücke, nach der Lücke, Silben, Grund]
const CK = [["🐌", "Schne", "e", "Schne – cke"], ["🛏️", "De", "e", "De – cke"], ["🧦", "So", "e", "So – cke"], ["🔔", "Glo", "e", "Glo – cke"], ["🧥", "Ja", "e", "Ja – cke"], ["🍬", "Zu", "er", "Zu – cker"], ["🌉", "Brü", "e", "Brü – cke"]];
const K = [["☁️", "Wol", "e", "Wol – ke", "l"], ["🥒", "Gur", "e", "Gur – ke", "r"], ["🥁", "Pau", "e", "Pau – ke", "au"], ["🎠", "Schau", "el", "Schau – kel", "au"], ["🪝", "Ha", "en", "Ha – ken", "lang"], ["🏦", "Ban", "", "Bank", "n"]];
const TZ = [["🐱", "Ka", "e", "Kat – ze"], ["🧢", "Mü", "e", "Müt – ze"], ["💧", "Pfü", "e", "Pfüt – ze"], ["⚡", "Bli", "", "Blitz"], ["🕸️", "Ne", "", "Netz"], ["🐦", "Spa", "", "Spatz"]];
const Z = [["🕯️", "Ker", "e", "Ker – ze", "r"], ["🍄", "Pil", "", "Pilz", "l"], ["❤️", "Her", "", "Herz", "r"], ["🧂", "Sal", "", "Salz", "l"], ["🥨", "Bre", "el", "Bre – zel", "lang"], ["🪵", "Hol", "", "Holz", "l"]];
function ckItem(rng, x, ans, paar){ const [pic, pre, post, syl, grund] = x, doppelt = ans === paar[0];
  const r3 = doppelt ? ["kurzer Pilot", `Nach einem kurzen Piloten schreibt man ${ans}. Zieh du die Buchstaben.`, syl]
    : grund === "lang" ? ["langer Pilot", `Nach einem langen Piloten schreibt man nur ${ans}. Zieh du den Buchstaben.`, syl]
    : [`${grund} vor der Lücke`, `Nach ${grund} schreibt man nur ${ans}. Zieh du den Buchstaben.`, syl];
  const [t0, t1] = ja(rng) ? paar : [paar[1], paar[0]];
  return { art: "weiterschwingen", item: { pic, pre, post, ans, tiles: [...paar],
    hilfe: ["Sprich das Wort langsam: Klingt der Pilot vor der Lücke kurz oder lang?", [syl, doppelt || grund === "lang" ? "Hör auf den Piloten vor der Lücke." : "Schau, was direkt vor der Lücke steht."], r3],
    bitte: `Auf dem Paket steht ${pre}_${post}. Kommt ${t0} oder ${t1} hinein?` } }; }
schritt("d_ck_tz", "post", "emil", ["weiterschwingen"], "Words with ck and tz",
  "Auf dem Paket steht Schne_e. Kommt ck oder k hinein?", {
  gen(rng, s){ const g = eins(rng, je(s, ["ck"], ["ck", "ck", "k"], ["ck", "k", "tz", "z"]));
    return g === "ck" ? ckItem(rng, eins(rng, CK), "ck", ["ck", "k"]) : g === "k" ? ckItem(rng, eins(rng, K), "k", ["ck", "k"])
      : g === "tz" ? ckItem(rng, eins(rng, TZ), "tz", ["tz", "z"]) : ckItem(rng, eins(rng, Z), "z", ["tz", "z"]); },
  zeigen: ["Schwing das Wort: Schne – cke.", "Der Pilot e klingt kurz.", "Nach einem kurzen Piloten schreibe ich ck statt kk.", "Genauso schreibe ich tz statt zz, wie bei Kat – ze."],
  merkheft: "Nach einem kurzen Piloten schreibe ich ck und tz." });

// St/Sp: [Bild, vor der Lücke, nach der Lücke, Antwort, Wort]
const ST = [["🪨", "", "ein", "St", "Stein"], ["⭐", "", "ern", "St", "Stern"], ["🪑", "", "uhl", "St", "Stuhl"], ["✏️", "", "ift", "St", "Stift"], ["🐴", "", "all", "St", "Stall"], ["🛣️", "", "raße", "St", "Straße"], ["👢", "", "iefel", "St", "Stiefel"], ["📮", "", "empel", "St", "Stempel"]];
const SP = [["🎲", "", "iel", "Sp", "Spiel"], ["🕷️", "", "inne", "Sp", "Spinne"], ["🪞", "", "iegel", "Sp", "Spiegel"], ["🐦", "", "atz", "Sp", "Spatz"], ["⚽", "", "ort", "Sp", "Sport"], ["😄", "", "aß", "Sp", "Spaß"]];
const STK = [["🧍", "", "ehen", "st", "stehen"], ["🧸", "", "ielen", "sp", "spielen"], ["✏️", "Blei", "ift", "st", "Bleistift"], ["🎨", "Bunt", "ift", "st", "Buntstift"], ["🦘", "", "ringen", "sp", "springen"]];
const SCH = { St: "Scht", Sp: "Schp", st: "scht", sp: "schp" };
function stItem(rng, x){ const [pic, pre, post, ans, wort] = x, alt = SCH[ans], laut = alt.toLowerCase(), [t0, t1] = ja(rng) ? [ans, alt] : [alt, ans];
  return { art: "weiterschwingen", item: { pic, pre, post, ans, tiles: [ans, alt],
    hilfe: ["Sprich das Wort: Was hörst du am Anfang der Silbe?", [`${laut} …`, `Man hört ${laut}, aber man schreibt es kürzer.`], [ans, `Man hört ${laut}, man schreibt aber ${ans}. Zieh du die Buchstaben.`, wort]],
    bitte: `Auf dem Paket steht ${pre}_${post}. Kommt ${t0} oder ${t1} hinein?` } }; }
schritt("d_st_sp", "post", "emil", ["weiterschwingen"], "St/st and Sp/sp at the start of a syllable",
  "Auf dem Paket steht _ein. Kommt St oder Scht hinein?", {
  gen: (rng, s) => stItem(rng, eins(rng, je(s, ST, [...ST, ...SP], [...SP, ...STK]))),
  zeigen: ["Sprich Stein: Am Anfang hörst du scht.", "Geschrieben wird aber nur St.", "Bei Spiel hörst du schp und schreibst Sp.", "Das ist eine Aufpass-Stelle."],
  merkheft: "Ich höre scht und schp, ich schreibe aber St und Sp." });

const BASTELN = [
  [["eine Laterne", [["✂️", "die Teile ausschneiden"], ["🎨", "die Teile bunt bemalen"], ["🧴", "alles zusammenkleben"], ["🏮", "die Laterne an den Stab hängen"]]],
   ["einen Drachen", [["✂️", "den Drachen aus Papier ausschneiden"], ["🎨", "den Drachen bemalen"], ["🎀", "den Schwanz ankleben"], ["🪁", "den Drachen steigen lassen"]]]],
  [["einen Papierflieger", [["📄", "ein Blatt Papier nehmen"], ["📐", "die Ecken zur Mitte falten"], ["✈️", "die Flügel nach unten falten"], ["🌬️", "den Flieger fliegen lassen"]]],
   ["ein Blätterbild", [["🍂", "bunte Blätter sammeln"], ["📚", "die Blätter im Buch pressen"], ["🖌️", "Kleber auf das Papier streichen"], ["🖼️", "die Blätter aufkleben"]]]],
  [["ein Kastanienmännchen", [["🌰", "Kastanien sammeln"], ["🥢", "Zahnstocher in die Kastanien stecken"], ["🔗", "die Kastanien zusammenstecken"], ["🖍️", "ein Gesicht aufmalen"]]],
   ["eine Laterne", [["✂️", "die Teile ausschneiden"], ["🎨", "die Teile bunt bemalen"], ["🧴", "alles zusammenkleben"], ["🏮", "die Laterne an den Stab hängen"]]]]];
schritt("d_vorgang", "basteln", "mila", ["reihenfolge"], "Describe how to make something (craft instructions)",
  "Wie bastelt man eine Laterne? Leg die Schritte in die richtige Reihenfolge: zuerst, dann, zum Schluss.", {
  gen(rng, s){ const [name, c] = eins(rng, BASTELN[s]);
    return { art: "reihenfolge", item: { q: `Wie bastelt man ${name}?`, c: c.map(x => [...x]), bitte: `Wie bastelt man ${name}? Leg die Schritte in die richtige Reihenfolge: zuerst, dann, zum Schluss.` } }; },
  zeigen: ["Bei einer Bastel-Anleitung kommt es auf die Reihenfolge an.", "Zuerst brauche ich das Material.", "Dann kommen die Schritte, einer nach dem anderen.", "Wörter wie zuerst, dann und zum Schluss helfen mir."],
  merkheft: "Eine Anleitung erzählt die Schritte der Reihe nach: zuerst, dann, zum Schluss." });

const SAGEN = [["rufen", "flüstern", "fragen", "schreien"], ["erzählen", "antworten", "rufen", "flüstern"], ["murmeln", "erklären", "brüllen", "antworten"]];
const GEHEN = [["rennen", "hüpfen", "laufen", "schleichen"], ["spazieren", "flitzen", "rennen", "schleichen"], ["stapfen", "marschieren", "schlendern", "bummeln"]];
schritt("d_wortfeld", "laden", "hilde", ["stimmt"], "Precise verbs for 'say' and 'go'",
  "Sortier die Wörter in zwei Kisten: Wörter für sagen und Wörter für gehen.", {
  ersatzFuer: "sortieren",
  gen(rng, s){ const feld = ja(rng) ? "sagen" : "gehen", istSagen = ja(rng), w = eins(rng, istSagen ? SAGEN[s] : GEHEN[s]), ist = istSagen ? "sagen" : "gehen", a = ist === feld;
    return { art: "stimmt", item: { s: `„${w}“ ist ein Wort für ${feld}.`, a, f: a ? `Doch: „${w}“ ist eine Art zu ${ist}.` : `„${w}“ ist eine Art zu ${ist}.`,
      bitte: "Ich sortiere Wörter für sagen und für gehen. Stimmt das?" } }; },
  zeigen: ["Statt sagen kann ich auch rufen, flüstern oder fragen.", "Statt gehen kann ich auch rennen, schleichen oder hüpfen.", "Mit dem passenden Wort wird ein Text spannender.",
    "Ich frage mich: Wie genau macht es jemand?"],
  merkheft: "Für sagen und gehen gibt es viele genauere Wörter." });

schritt("d_ueberarbeiten_woerter", "tagebuch", "katze", [], "Revise: put in more precise words",
  "Lies Mama deine Laternen-Anleitung vor. Findet ihr ein besseres Wort als „machen“?", {
  offline: true,
  zeigen: ["Lies deinen Text laut vor.", "Hörst du ein Wort immer wieder?", "Such zusammen mit Mama ein genaueres Wort.", "Statt machen passt oft schneiden, kleben oder falten."],
  merkheft: "Ein Wort, das zu oft vorkommt, tausche ich gegen ein genaueres Wort." });

const SACHTEXTE = [
  [{ text: ["Der Igel lebt in Hecken und Gärten.", "Er frisst Käfer, Würmer und Raupen.", "Bei Gefahr rollt er sich zu einer Kugel zusammen."], fragen: [
    { q: "Was frisst der Igel?", o: ["Käfer, Würmer und Raupen", "Nüsse und Samen", "Gras und Heu", "Fische"], s: 1 },
    { q: "Was macht der Igel bei Gefahr?", o: ["Er rollt sich zu einer Kugel zusammen.", "Er klettert auf einen Baum.", "Er springt ins Wasser.", "Er bellt laut."], s: 2 },
    { q: "Wo lebt der Igel?", o: ["in Hecken und Gärten", "im See", "in der Wüste", "auf dem Dach"], s: 0 }] }],
  [{ text: ["Das Eichhörnchen hat einen buschigen Schwanz.", "Es klettert schnell auf Bäume.", "Im Herbst versteckt es Nüsse in der Erde.", "Im Winter hält es Winterruhe in seinem Nest."], fragen: [
    { q: "Was versteckt das Eichhörnchen im Herbst?", o: ["Nüsse", "Steine", "Blätter", "Beeren"], s: 2 },
    { q: "Wo verbringt das Eichhörnchen den Winter?", o: ["in seinem Nest", "im See", "im Keller", "beim Bäcker"], s: 3 },
    { q: "Wie ist der Schwanz des Eichhörnchens?", o: ["buschig", "kahl", "kurz", "gestreift"], s: 0 }] },
   { text: ["Der Graureiher ist ein großer Vogel.", "Er steht oft ganz still im flachen Wasser.", "Mit seinem langen Schnabel fängt er Fische.", "Sein Nest baut er hoch oben in den Bäumen."], fragen: [
    { q: "Womit fängt der Reiher Fische?", o: ["mit seinem langen Schnabel", "mit den Füßen", "mit einem Netz", "mit den Flügeln"], s: 2 },
    { q: "Wo baut der Reiher sein Nest?", o: ["hoch oben in den Bäumen", "im Gras", "unter der Brücke", "im Schilf"], s: 3 },
    { q: "Wo steht der Reiher oft ganz still?", o: ["im flachen Wasser", "auf dem Dach", "im Wald", "auf der Straße"], s: 1 }] }],
  [{ text: ["Die Kastanie wächst an einem großen Baum.", "Im Frühling hat der Baum weiße Blüten.", "Im Herbst fallen die stacheligen Früchte herunter.", "In jeder Frucht steckt eine glänzende braune Kastanie.", "Kinder basteln gern Männchen aus Kastanien."], fragen: [
    { q: "Welche Farbe haben die Blüten im Frühling?", o: ["weiß", "rot", "blau", "gelb"], s: 1 },
    { q: "Wann fallen die Früchte herunter?", o: ["im Herbst", "im Winter", "im Sommer", "an Ostern"], s: 2 },
    { q: "Was basteln Kinder gern aus Kastanien?", o: ["Männchen", "Drachen", "Laternen", "Kronen"], s: 4 },
    { q: "Wie sieht die Kastanie in der Frucht aus?", o: ["glänzend und braun", "weich und grün", "rund und rot", "klein und gelb"], s: 3 }] }]];
schritt("d_lesen_sachtext", "regal", "katze", ["textfrage"], "Read non-fiction: heading, paragraph, questions",
  "Lies das Sachbuch von Fridolin. Was frisst der Igel?", {
  gen(rng, s){ const t = eins(rng, SACHTEXTE[s]), f = eins(rng, t.fragen), o = misch(rng, f.o.map((x, i) => [x, i]));
    return { art: "textfrage", item: { text: [...t.text], q: f.q, o: o.map(x => x[0]), a: o.findIndex(x => x[1] === 0), s: f.s, bitte: `Lies das Sachbuch von Fridolin. ${f.q}` } }; },
  zeigen: ["Die Überschrift sagt, worum es im Text geht.", "Ich lese zuerst die Frage.", "Dann suche ich im Text die Stelle mit der Antwort.", "Ich lese diese Stelle noch einmal genau."],
  merkheft: "Bei einem Sachtext suche ich die Stelle, an der die Antwort steht." });

const MEHRZAHL = [[["der Hund", "die Hunde"], ["die Katze", "die Katzen"], ["die Blume", "die Blumen"], ["das Bett", "die Betten"], ["die Tasse", "die Tassen"], ["der Tisch", "die Tische"]],
  [["der Ball", "die Bälle"], ["die Maus", "die Mäuse"], ["der Baum", "die Bäume"], ["die Hand", "die Hände"], ["der Stuhl", "die Stühle"], ["die Nuss", "die Nüsse"]],
  [["das Buch", "die Bücher"], ["das Haus", "die Häuser"], ["das Kind", "die Kinder"], ["der Apfel", "die Äpfel"], ["das Ei", "die Eier"], ["das Auto", "die Autos"], ["der Vogel", "die Vögel"]]];
schritt("d_einzahl_mehrzahl", "laden", "hilde", ["paare"], "Singular and plural",
  "Leg zusammen, was zusammengehört: ein Hund – viele Hunde.", {
  gen(rng, s){ const P = s === 0 ? ziehe(rng, MEHRZAHL[0], 3) : [...ziehe(rng, MEHRZAHL[s], 3), ...ziehe(rng, MEHRZAHL[s - 1], s === 1 ? 1 : 2)];
    const M = misch(rng, P);
    return { art: "paare", item: { k: "eins und viele", l: M.map(p => p[0]), r: M.map(p => p[1]), rn: M.map(p => `Das sind viele ${p[1].slice(4)}.`),
      h1: "Sag: ein …, zwei … Wie heißt es, wenn es viele sind?", bitte: "Leg zusammen, was zusammengehört: ein Hund – viele Hunde." } }; },
  zeigen: ["Ein Hund ist die Einzahl.", "Viele Hunde sind die Mehrzahl.", "In der Mehrzahl heißt der Artikel immer die.", "Manchmal ändert sich auch der Pilot: der Ball, die Bälle."],
  merkheft: "Einzahl ist eins, Mehrzahl sind viele, und in der Mehrzahl sagt man die." });

const SATZARTEN = {
  ".": [["Die Sonne scheint", "Die …"], ["Ich kaufe drei Äpfel", "Ich …"], ["Hilde hat einen Laden", "Hilde …"], ["Heute ist es kalt", "Heute …"], ["Der Laden ist offen", "Der …"]],
  "?": [["Wie heißt du", "Wie …"], ["Was kostet das", "Was …"], ["Wo ist die Post", "Wo …"], ["Kommst du mit", "Kommst …"], ["Hast du Hunger", "Hast …"], ["Magst du Kakao", "Magst …"]],
  "!": [["Pass auf", "Pass …"], ["Komm schnell", "Komm …"], ["Vorsicht, heiß", "Vorsicht …"], ["Halt, stehen bleiben", "Halt …"], ["Schau mal", "Schau …"]] };
const SATZ_HILFE = { ".": ["Dieser Satz erzählt etwas.", "Erzählsatz", "Wer etwas erzählt, setzt einen Punkt. Zieh du das Zeichen."],
  "?": ["Dieser Satz will etwas wissen.", "Frage", "Wer etwas fragt, setzt ein Fragezeichen. Zieh du das Zeichen."],
  "!": ["Dieser Satz ruft oder warnt.", "Ausruf", "Wer etwas ruft oder warnt, setzt ein Ausrufezeichen. Zieh du das Zeichen."] };
schritt("d_satz", "laden", "hilde", ["weiterschwingen"], "Sentences and their end marks . ? !",
  "Am Ende meiner Schilder fehlt das Zeichen. Punkt, Fragezeichen oder Ausrufezeichen?", {
  gen(rng, s){ const z = eins(rng, je(s, [".", "?"], [".", "?", "!"], [".", "?", "!"])), [satz, anfang] = eins(rng, SATZARTEN[z]), [h2, h3a, h3b] = SATZ_HILFE[z];
    return { art: "weiterschwingen", item: { pic: "🪧", pre: satz, ans: z, tiles: [".", "?", "!"],
      hilfe: ["Lies den Satz laut: Erzählst du, fragst du oder rufst du?", [anfang, h2], [h3a, h3b, satz + z]],
      bitte: "Am Ende meiner Schilder fehlt das Zeichen. Punkt, Fragezeichen oder Ausrufezeichen?" } }; },
  zeigen: ["Ein Satz, der etwas erzählt, endet mit einem Punkt.", "Ein Satz, der etwas fragt, endet mit einem Fragezeichen.", "Ein Satz, der ruft oder warnt, endet mit einem Ausrufezeichen.",
    "Lies den Satz laut, dann hörst du, welcher es ist."],
  merkheft: "Am Satzende steht ein Punkt, ein Fragezeichen oder ein Ausrufezeichen." });

const RVOKAL = [["Korb", "Turm", "Berg", "Herz", "Wurm", "Sport"], ["Gar-ten", "Ker-ze", "Wurst", "Kar-te", "Gur-ke", "Tor-te", "Bir-ne", "Far-be", "Mar-ke"], ["Schirm", "Kir-sche", "Wür-fel", "Pfer-de", "Gar-ten-tür", "Turn-schuh"]];
schritt("d_r_vokal", "post", "emil", ["hoerwort"], "r after a vowel (Garten, Sport)",
  "Hör gut zu und leg das Wort: Garten.", {
  gen(rng, s){ const h = eins(rng, RVOKAL[s]); return hoer(h, `Hör gut zu und leg das Wort: ${h.replace(/-/g, "")}.`); },
  zeigen: ["Sprich Garten ganz langsam.", "Nach dem a ist ein r versteckt, man hört es kaum.", "Sprich übertrieben: Gar – ten, mit einem rollenden r.", "So hörst du das r und schreibst es auch."],
  merkheft: "Nach einem Piloten ist oft ein leises r versteckt, das ich mitschreibe." });

const HSILBE = [["👟", "Schu", "e", "Schu – he"], ["🐮", "Kü", "e", "Kü – he"], ["🚶", "ge", "en", "ge – hen"], ["👀", "se", "en", "se – hen"], ["🦌", "Re", "e", "Re – he"], ["🦶", "Ze", "en", "Ze – hen"],
  ["🧍", "ste", "en", "ste – hen"], ["🌀", "dre", "en", "dre – hen"], ["😴", "Ru", "e", "Ru – he"], ["🧵", "nä", "en", "nä – hen"]];
const OHNEH = [["🧑‍🌾", "Bau", "er", "Bau – er"], ["🥚", "Ei", "er", "Ei – er"], ["🔥", "Feu", "er", "Feu – er"], ["😊", "freu", "en", "freu – en"], ["🔭", "schau", "en", "schau – en"], ["🏗️", "bau", "en", "bau – en"], ["🎉", "Fei", "er", "Fei – er"]];
schritt("d_h_silbe", "post", "emil", ["weiterschwingen"], "The h between syllables (gehen, Schuhe)",
  "Auf dem Paket steht Schu_e. Fehlt da ein h?", {
  gen(rng, s){ const mitH = !ja(rng, je(s, 0, .3, .5)), [pic, pre, post, syl] = eins(rng, mitH ? HSILBE : OHNEH);
    return { art: "weiterschwingen", item: { pic, pre, post, ans: mitH ? "h" : "", tiles: ["h", ""],
      hilfe: ["Schwing das Wort in Silben. Hörst du etwas zwischen den Silben?", [`${pre} – ?${post}`, "Hör genau hin, wie die zweite Silbe anfängt."],
        mitH ? [syl, `Hör zu: ${syl}. Zieh du das, was fehlt.`, syl] : [syl, `Hör zu: ${syl}, da ist kein h dazwischen. Zieh du das Kärtchen nichts.`, syl]],
      bitte: `Auf dem Paket steht ${pre}_${post}. Fehlt da ein h?` } }; },
  zeigen: ["Schwing das Wort: Schu – he.", "Am Anfang der zweiten Silbe hörst du ein leises h.", "Dieses h trennt die zwei Silben.", "Bei Bau – er hörst du kein h, da kommt keins hin."],
  merkheft: "Höre ich beim Schwingen ein h am Anfang der zweiten Silbe, schreibe ich es." });

// d oder t am Ende: [Bild, Wort ohne letzten Buchstaben, verlängert: erste Silbe, zweite Silbe]
const AUS_D = [["🐶", "Hun", "Hun", "de"], ["🧒", "Kin", "Kin", "der"], ["🖼️", "Bil", "Bil", "der"], ["👕", "Hem", "Hem", "den"], ["🌙", "Mon", "Mon", "de"], ["🐴", "Pfer", "Pfer", "de"]];
const AUS_D2 = [["🌲", "Wal", "Wäl", "der"], ["🚲", "Ra", "Rä", "der"], ["💶", "Gel", "Gel", "der"], ["🎵", "Lie", "Lie", "der"]];
const AUS_T = [["🍞", "Bro", "Bro", "te"], ["⛺", "Zel", "Zel", "te"], ["🐦", "Nes", "Nes", "ter"], ["💡", "Lich", "Lich", "ter"], ["🛏️", "Bet", "Bet", "ten"]];
const AUS_T2 = [["🎩", "Hu", "Hü", "te"], ["🍃", "Blat", "Blät", "ter"], ["📝", "Wor", "Wör", "ter"]];
function auslautItem(x, ans){ const [pic, pre, l0, l1] = x, anders = ans === "d" ? "t" : "d";
  return { art: "weiterschwingen", item: { pic, pre, ans, tiles: ["d", "t"], long: [l0, l1], alt: { [anders]: `${l0}-${l1.replace(ans, anders)}` }, bitte: `Welcher Buchstabe fehlt am Ende von ${pre}_?` } }; }
schritt("d_auslaut_td", "post", "emil", ["weiterschwingen"], "End sound d or t: make the word longer (Hund – Hunde)",
  "Welcher Buchstabe fehlt am Ende von Hun_?", {
  gen(rng, s){ const d = ja(rng, s === 0 ? .65 : .5), liste = d ? (s === 2 ? [...AUS_D, ...AUS_D2] : AUS_D) : (s === 2 ? [...AUS_T, ...AUS_T2] : AUS_T); return auslautItem(eins(rng, liste), d ? "d" : "t"); },
  zeigen: ["Am Ende von Hund hört man ein t.", "Ich verlängere das Wort: zwei Hun – de.", "Jetzt höre ich deutlich ein d.", "Darum schreibe ich Hund mit d."],
  merkheft: "Bei d oder t am Ende verlängere ich das Wort und höre genau hin." });

const VORLAGEN = [["Die Sonne scheint.", "Der Hund bellt.", "Oma backt Kuchen.", "Wir spielen Ball.", "Die Katze schläft.", "Ich mag Äpfel."],
  ["Im Sommer ist es heiß.", "Die Biene fliegt zur Wiese.", "Wir essen heute Suppe.", "Emil bringt die Post.", "Der Igel schläft im Laub.", "Mein Hund heißt Bello."],
  ["Am Montag gehen wir in den Wald.", "Die Kinder spielen im Garten Fangen.", "Lotte gießt die Blumen auf dem Balkon.", "Im Winter fahren wir gern Schlitten.", "Fridolin steht ganz still im Wasser."]];
const FEHLER = [w => w.replace(/(bb|dd|ff|gg|ll|mm|nn|pp|rr|ss|tt)/, m => m[0]), w => w.replace("ie", "i"), w => w.replace(/d([.!?]?)$/, "t$1"),
  w => w.replace("ck", "k"), w => w.replace(/eh(?=[aeiouäöü])/, "e")];
schritt("d_abschreiben_kontrolle", "post", "emil", ["fehler"], "Find mistakes by comparing with the model",
  "Ich habe deinen Brief abgeschrieben. Ein Wort ist anders als in der Vorlage. Findest du es?", {
  gen(rng, s){
    for(;;){ const v = eins(rng, VORLAGEN[s]), ws = v.split(" "), moegl = [];
      ws.forEach((w, i) => { FEHLER.forEach(f => { const x = f(w); if(x !== w) moegl.push([i, x]); }); if(i > 0 && /^[A-ZÄÖÜ]/.test(w)) moegl.push([i, w[0].toLowerCase() + w.slice(1)]); });
      if(!moegl.length) continue;
      const [i, x] = eins(rng, moegl), c = ws.map((w, j) => j === i ? x : w).join(" ");
      return { art: "fehler", item: { v, c, bitte: "Ich habe deinen Brief abgeschrieben. Ein Wort ist anders als in der Vorlage. Findest du es?" } }; } },
  zeigen: ["Ich lege die Vorlage neben die Abschrift.", "Ich vergleiche Wort für Wort.", "Bei jedem Wort schaue ich auf jeden Buchstaben.", "Ist ein Wort anders, habe ich den Fehler gefunden."],
  merkheft: "Ich vergleiche meine Abschrift Wort für Wort mit der Vorlage." });

// ==================== HSU ====================
const REGELN = [
  ["Wer etwas sagen will, meldet sich.", true, "Doch: Das ist eine gute Regel, dann kommen alle dran."], ["Wir lassen andere ausreden.", true, "Doch: Das ist eine gute Regel, dann hört man jeden."],
  ["Wir hören zu, wenn jemand spricht.", true, "Doch: Das ist eine gute Regel, so versteht man sich."], ["Beim Abstimmen zählt jede Stimme gleich viel.", true, "Doch: Das ist fair, jede Stimme ist gleich wichtig."],
  ["Wer Tafeldienst hat, wischt die Tafel.", true, "Doch: Mit festen Diensten weiß jeder, was zu tun ist."], ["Wir helfen einander.", true, "Doch: Das ist eine gute Regel für eine Gruppe."],
  ["Wer am lautesten ruft, darf zuerst reden.", false, "Das ist keine gute Regel, dann kommen die Leisen nie dran."], ["Wer etwas sagen will, ruft einfach dazwischen.", false, "Das ist keine gute Regel, dann versteht keiner etwas."],
  ["Beim Abstimmen zählt nur die Stimme der größten Puppe.", false, "Das ist nicht fair, jede Stimme sollte gleich viel zählen."], ["Wir lachen über die Fehler von anderen.", false, "Das ist keine gute Regel, Fehler machen alle einmal."],
  ["Wer zuerst da ist, darf alles allein bestimmen.", false, "Das ist nicht fair, in einer Gruppe bestimmen alle mit."]];
schritt("h_klassenregeln", "puppen", "katze", ["stimmt"], "Rules and jobs in a group; voting fairly",
  "Deine Puppen spielen Schule. Ist das eine gute Regel: „Wer etwas sagen will, meldet sich“?", {
  gen(rng){ const [s, a, f] = eins(rng, REGELN); return { art: "stimmt", item: { s, a, f, bitte: `Deine Puppen spielen Schule. Ist das eine gute Regel: „${s.slice(0, -1)}“?` } }; },
  zeigen: ["In einer Gruppe helfen Regeln, damit alle drankommen.", "Wer etwas sagen will, meldet sich.", "Wir lassen andere ausreden.", "Beim Abstimmen zählt jede Stimme gleich viel."],
  merkheft: "Gute Regeln sorgen dafür, dass alle fair drankommen." });

const SINNE = [["Auge", "👁️", "sehen", "Das ist ein Auge.", "Sehen kann man mit den Augen.", "🌈 Farben", "Farben sieht man mit den Augen."],
  ["Ohr", "👂", "hören", "Das ist ein Ohr.", "Hören kann man mit den Ohren.", "🎵 Musik", "Musik hört man mit den Ohren."],
  ["Nase", "👃", "riechen", "Das ist eine Nase.", "Riechen kann man mit der Nase.", "🌹 Duft", "Einen Duft riecht man mit der Nase."],
  ["Zunge", "👅", "schmecken", "Das ist eine Zunge.", "Schmecken kann man mit der Zunge.", "🍋 sauer", "Sauer schmeckt man mit der Zunge."],
  ["Haut", "✋", "fühlen", "Das ist die Haut an der Hand.", "Fühlen kann man mit der Haut.", "🧊 kalt", "Kälte fühlt man mit der Haut."]];
schritt("h_sinne", "cafe", "otto", ["paare"], "The five senses and sense organs",
  "Wir machen ein Sinne-Spiel. Zieh die Wörter an das Gesicht: Auge, Ohr, Nase, Zunge, Haut.", {
  ersatzFuer: "beschriften",
  gen(rng, s){ const P = ziehe(rng, SINNE, s === 0 ? 4 : 5), bitte = "Wir machen ein Sinne-Spiel. Leg immer zwei zusammen, die zusammengehören.";
    if(s === 0) return { art: "paare", item: { k: "Wort und Bild", l: P.map(p => p[0]), r: P.map(p => p[1]), rn: P.map(p => p[3]), h1: "Lies das Wort und such das passende Bild.", bitte } };
    if(s === 1) return { art: "paare", item: { k: "Sinnesorgan und Sinn", l: P.map(p => p[0]), r: P.map(p => p[2]), rn: P.map(p => p[4]), h1: "Was machst du mit diesem Teil von deinem Körper?", bitte } };
    return { art: "paare", item: { k: "Ding und Sinnesorgan", l: P.map(p => p[5]), r: P.map(p => p[0]), rn: P.map(p => p[6]), h1: "Womit merkst du das: sehen, hören, riechen, schmecken oder fühlen?", bitte } }; },
  zeigen: ["Wir haben fünf Sinne.", "Mit den Augen sehen wir, mit den Ohren hören wir.", "Mit der Nase riechen wir, mit der Zunge schmecken wir.", "Mit der Haut fühlen wir."],
  merkheft: "Ich sehe, höre, rieche, schmecke und fühle mit meinen fünf Sinnen." });

schritt("h_schulweg", "huegel", "mila", ["lesenmalen"], "Safe way to school: safe and unsafe places",
  "Mal auf der Karte die sicherste Stelle zum Überqueren grün an.", {
  gen(rng, s){ const w = 6, h = 3, dinge = {}, start = [zz(rng, 0, w - 1), 0];
    dinge[k2(eins(rng, bis(0, w - 1).filter(x => x !== start[0])), 0)] = "🏠"; dinge[k2(zz(rng, 0, w - 1), 2)] = "🏫";
    if(s === 2 && ja(rng)){ const x = zz(rng, 1, w - 2); dinge[k2(x - 1, 1)] = "🚙"; dinge[k2(x + 1, 1)] = "🚙";
      const frei = bis(0, w - 1).filter(v => Math.abs(v - x) > 2); if(frei.length) dinge[k2(eins(rng, frei), 1)] = "🚦";
      const text = "Mal auf der Karte die gefährliche Stelle zwischen den parkenden Autos rot an.";
      return { art: "lesenmalen", item: { karte: { w, h, start, dinge }, s: text, goal: { [k2(x, 1)]: "rot" }, keep: [], k: ["gefährliche Stelle", "parkenden Autos", "rot"], bitte: text } }; }
    const x = zz(rng, 0, w - 1); dinge[k2(x, 1)] = s === 0 ? "🚦" : eins(rng, ["🚦", "🚸"]);
    const rest = misch(rng, bis(0, w - 1).filter(v => v !== x)).slice(0, s + 2), autos = ["🚗", "🚙", "🚌", "🚗"];
    rest.forEach((v, i) => { dinge[k2(v, 1)] = autos[i % autos.length]; });
    if(s > 0){ const b = bis(0, w - 1).find(v => !dinge[k2(v, 2)]); if(b != null) dinge[k2(b, 2)] = "🌳"; }
    const text = "Mal auf der Karte die sicherste Stelle zum Überqueren grün an.";
    return { art: "lesenmalen", item: { karte: { w, h, start, dinge }, s: text, goal: { [k2(x, 1)]: "gruen" }, keep: [], k: ["sicherste Stelle", "grün"], bitte: text } }; },
  zeigen: ["Über die Straße gehe ich an der Ampel oder am Zebrastreifen.", "Zwischen parkenden Autos sieht mich niemand.", "Ich bleibe am Bordstein stehen.", "Ich schaue links, rechts und noch einmal links."],
  merkheft: "Ich überquere die Straße nur an sicheren Stellen und schaue links, rechts, links." });

const ZEITEN = { Jahreszeiten: [["🌷", "Frühling", "dem"], ["☀️", "Sommer", "dem"], ["🍂", "Herbst", "dem"], ["⛄", "Winter", "dem"]],
  Tageszeiten: [["🌅", "Morgen", "dem"], ["☀️", "Mittag", "dem"], ["🌇", "Abend", "dem"], ["🌙", "Nacht", "der"]],
  Wochentage: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"].map(t => ["📅", t, "dem"]),
  Monate: [["❄️", "Januar"], ["🎭", "Februar"], ["🌱", "März"], ["🐣", "April"], ["🌷", "Mai"], ["🍓", "Juni"], ["🏖️", "Juli"], ["🌻", "August"], ["🍎", "September"], ["🎃", "Oktober"], ["🏮", "November"], ["🎄", "Dezember"]].map(m => [...m, "dem"]) };
schritt("h_jahreskreis", "tagebuch", "katze", ["reihenfolge"], "Times of day, weekdays, months, seasons",
  "Leg die Jahreszeiten in die richtige Reihenfolge. Welche haben wir gerade?", {
  gen(rng, s){ const was = eins(rng, je(s, ["Jahreszeiten", "Tageszeiten"], ["Jahreszeiten", "Wochentage"], ["Wochentage", "Monate"])), L = ZEITEN[was];
    const i0 = was === "Tageszeiten" ? 0 : zz(rng, 0, L.length - 1), c = [0, 1, 2, 3].map(i => L[(i0 + i) % L.length]);
    const q = `Leg die ${was} in die richtige Reihenfolge.`;
    return { art: "reihenfolge", item: { q, c: c.map(x => [x[0], x[1]]), bitte: `${q} Fang mit ${c[0][2]} ${c[0][1]} an.` } }; },
  zeigen: ["Das Jahr hat vier Jahreszeiten.", "Nach dem Frühling kommt der Sommer, dann der Herbst und der Winter.", "Danach fängt alles wieder von vorne an.",
    "Genauso kommen die Wochentage immer in derselben Reihenfolge."],
  merkheft: "Frühling, Sommer, Herbst und Winter kommen jedes Jahr in derselben Reihenfolge." });

const HECKE = [
  [["Kräuter", "ganz unten, klein und weich", "Ganz unten wachsen die Kräuter."], ["Sträucher", "in der Mitte, mit vielen Zweigen", "In der Mitte stehen die Sträucher."],
   ["Bäume", "ganz oben, mit dickem Stamm", "Ganz oben stehen die Bäume."], ["Hagebutte", "rote Frucht der Heckenrose", "Die Hagebutte wächst an der Heckenrose."]],
  [["Heckenrose", "🔴 Hagebutten", "Hagebutten wachsen an der Heckenrose."], ["Holunder", "⚫ Holunderbeeren", "Holunderbeeren wachsen am Holunder."],
   ["Haselstrauch", "🌰 Haselnüsse", "Haselnüsse wachsen am Haselstrauch."], ["Brombeerstrauch", "🫐 Brombeeren", "Brombeeren wachsen am Brombeerstrauch."]],
  [["🐦 Vogel", "baut ein Nest in den Zweigen", "In den Zweigen baut der Vogel sein Nest."], ["🦔 Igel", "schläft im Laub ganz unten", "Im Laub ganz unten schläft der Igel."],
   ["🐝 Biene", "holt Nektar aus den Blüten", "Aus den Blüten holt die Biene Nektar."], ["🐛 Raupe", "frisst die Blätter", "Die Blätter frisst die Raupe."]]];
schritt("h_hecke_aufbau", "garten", "lotte", ["paare"], "The hedge: its layers and shrubs",
  "Zieh die Wörter an meine Hecke: Kräuter, Sträucher, Bäume, Hagebutte.", {
  ersatzFuer: "beschriften",
  gen(rng, s){ const P = misch(rng, HECKE[s]);
    return { art: "paare", item: { k: je(s, "Teil der Hecke und wo er ist", "Strauch und Frucht", "Tier und was es in der Hecke tut"), l: P.map(p => p[0]), r: P.map(p => p[1]), rn: P.map(p => p[2]),
      h1: je(s, "Stell dir die Hecke wie ein Haus mit Stockwerken vor.", "An welchem Strauch wächst diese Frucht?", "Wofür braucht dieses Tier die Hecke?"),
      bitte: "Schau dir meine Hecke an und leg immer zwei zusammen, die zusammengehören." } }; },
  zeigen: ["Eine Hecke hat Stockwerke wie ein Haus.", "Ganz unten wachsen Kräuter.", "In der Mitte stehen Sträucher, oben stehen Bäume.", "Die Hagebutte ist die rote Frucht der Heckenrose."],
  merkheft: "Eine Hecke hat Kräuter unten, Sträucher in der Mitte und Bäume oben." });

const KETTEN = [[["🍃", "Blatt"], ["🐛", "Raupe"], ["🐦", "Amsel"], ["🦊", "Fuchs"]], [["🍃", "Blatt"], ["🐛", "Raupe"], ["🐤", "Meise"], ["🦅", "Sperber"]],
  [["🍂", "Laub"], ["🪱", "Regenwurm"], ["🦔", "Igel"], ["🦉", "Uhu"]], [["🌾", "Körner"], ["🐭", "Maus"], ["🐍", "Ringelnatter"], ["🦅", "Bussard"]]];
schritt("h_hecke_tiere", "garten", "lotte", ["reihenfolge"], "Hedge animals and simple food chains",
  "Wer frisst wen? Leg die Kette: Blatt, Raupe, Amsel.", {
  gen(rng, s){ const c = eins(rng, je(s, KETTEN.slice(0, 2), KETTEN.slice(0, 3), KETTEN.slice(1)));
    return { art: "reihenfolge", item: { q: "Wer frisst wen?", c: c.map(x => [...x]), bitte: "Wer frisst wen? Leg die Kette, die Pflanze kommt zuerst." } }; },
  zeigen: ["In der Hecke frisst einer den anderen.", "Die Raupe frisst das Blatt.", "Die Amsel frisst die Raupe.", "So entsteht eine Kette, die mit einer Pflanze anfängt."],
  merkheft: "Eine Nahrungskette fängt immer mit einer Pflanze an." });

const SOMMER = [["Erdbeeren", "Juni"], ["Kirschen", "Juli"], ["Himbeeren", "Juli"], ["Johannisbeeren", "Juli"]], HERBST = [["Äpfel", "Oktober"], ["Birnen", "September"], ["Kürbisse", "Oktober"], ["Walnüsse", "Oktober"], ["Trauben", "September"], ["Quitten", "Oktober"]];
const FALSCHE_MONATE = ["Januar", "Februar", "März", "Dezember"];
schritt("h_obst_reife", "garten", "lotte", ["stimmt"], "Local fruit and vegetables and when they ripen",
  "Was ernte ich im Sommer, was im Herbst? Sortierst du mein Obst und Gemüse?", {
  ersatzFuer: "sortieren",
  gen(rng, s){ const a = ja(rng), sommer = ja(rng), [obst, monat] = eins(rng, sommer ? SOMMER : HERBST), echt = sommer ? "Sommer" : "Herbst";
    if(s === 2 && ja(rng)){ const m = a ? monat : eins(rng, FALSCHE_MONATE);
      return { art: "stimmt", item: { s: `${obst} sind im ${m} reif.`, a, f: a ? `Doch: ${obst} sind im ${monat} reif.` : `Im ${m} ist es dafür noch zu kalt, ${obst} sind im ${echt} reif.`,
        bitte: "Was ernte ich im Sommer, was im Herbst? Stimmt das?" } }; }
    const zeit = a ? echt : (sommer ? "Herbst" : "Sommer");
    return { art: "stimmt", item: { s: `${obst} ernte ich im ${zeit}.`, a, f: a ? `Doch: ${obst} sind im ${echt} reif.` : `${obst} sind im ${echt} reif.`,
      bitte: "Was ernte ich im Sommer, was im Herbst? Stimmt das?" } }; },
  zeigen: ["Jedes Obst hat seine Zeit.", "Erdbeeren und Kirschen sind im Sommer reif.", "Äpfel, Birnen und Kürbisse erntet man im Herbst.", "Bei uns wächst nicht alles zur gleichen Zeit."],
  merkheft: "Erdbeeren und Kirschen ernten wir im Sommer, Äpfel und Kürbisse im Herbst." });

const GIFT = [["Beeren, die ich nicht kenne, esse ich nicht.", true, "Doch: Unbekannte Beeren können giftig sein."], ["Die Eibe ist giftig.", true, "Doch: Die Eibe ist giftig."],
  ["Die Tollkirsche ist giftig.", true, "Doch: Die Tollkirsche ist sehr giftig."], ["Hat jemand Giftbeeren gegessen, hole ich sofort einen Erwachsenen.", true, "Doch: Dann muss sofort ein Erwachsener helfen."],
  ["Die Notrufnummer ist 112.", true, "Doch: Unter 112 bekommt man schnell Hilfe."], ["Nach dem Gärtnern wasche ich mir die Hände.", true, "Doch: Das Händewaschen schützt dich."],
  ["Rote Beeren kann man immer essen.", false, "Manche roten Beeren sind giftig, darum esse ich keine unbekannten."], ["Was schön aussieht, ist nie giftig.", false, "Auch schöne Pflanzen können giftig sein."],
  ["Pilze aus dem Park esse ich gleich roh.", false, "Pilze aus dem Park esse ich nie, sie können giftig sein."], ["Ich probiere Blätter, um zu sehen, wie sie schmecken.", false, "Unbekannte Blätter probiere ich nicht."]];
schritt("h_giftpflanzen", "garten", "lotte", ["stimmt"], "Poisonous and unknown plants",
  "Stimmt das? „Beeren, die ich nicht kenne, esse ich nicht.“", {
  gen(rng){ const [s, a, f] = eins(rng, GIFT); return { art: "stimmt", item: { s, a, f, bitte: `Stimmt das? „${s}“` } }; },
  zeigen: ["Manche Pflanzen und Beeren sind giftig.", "Die Eibe und die Tollkirsche sind giftig.", "Beeren, die ich nicht kenne, esse ich nicht.",
    "Hat jemand etwas Giftiges gegessen, hole ich sofort einen Erwachsenen."],
  merkheft: "Was ich nicht kenne, esse ich nicht." });

const WINTER = [["Der Igel hält Winterschlaf.", true, "Doch: Der Igel schläft den ganzen Winter."], ["Das Eichhörnchen hält Winterruhe.", true, "Doch: Das Eichhörnchen ruht und wacht manchmal auf."],
  ["Die Amsel bleibt im Winter wach.", true, "Doch: Die Amsel ist auch im Winter wach."], ["Vor dem Winter frisst sich der Igel dick.", true, "Doch: So hat der Igel genug Kraft für den Winter."],
  ["Der Igel schläft im Winter in einem Laubhaufen.", true, "Doch: Im Laub ist es warm und geschützt."], ["Das Eichhörnchen versteckt im Herbst Nüsse.", true, "Doch: Die Nüsse frisst es, wenn es im Winter aufwacht."],
  ["Die Amsel hält Winterschlaf.", false, "Die Amsel bleibt im Winter wach."], ["Das Eichhörnchen schläft den ganzen Winter, ohne aufzuwachen.", false, "Das Eichhörnchen hält Winterruhe und wacht manchmal auf."],
  ["Der Igel frisst gern Milch und Brot.", false, "Der Igel frisst Käfer, Würmer und Raupen."], ["Der Fuchs hält Winterschlaf.", false, "Der Fuchs bleibt im Winter wach."]];
schritt("h_igel_winter", "garten", "lotte", ["stimmt"], "The hedgehog; animals in winter",
  "Wer schläft im Winter, wer ruht nur, wer bleibt wach? Sortier die Tiere: Igel, Eichhörnchen, Amsel.", {
  ersatzFuer: "sortieren",
  gen(rng){ const [s, a, f] = eins(rng, WINTER); return { art: "stimmt", item: { s, a, f, bitte: "Wer schläft im Winter, wer ruht nur, wer bleibt wach? Stimmt das?" } }; },
  zeigen: ["Im Winter gibt es wenig Futter.", "Der Igel hält Winterschlaf in einem Laubhaufen.", "Das Eichhörnchen hält Winterruhe und wacht manchmal auf.", "Die Amsel bleibt den ganzen Winter wach."],
  merkheft: "Der Igel schläft im Winter, das Eichhörnchen ruht, die Amsel bleibt wach." });

schritt("h_familie", "puppen", "katze", [], "Families and kinds of families",
  "Erzähl Mama, wer alles zu deiner Familie gehört. Ein Westpark-Buch zeigt, wie verschieden die Familien der Nachbarn sind.", { offline: true });

const FEUER = [["Eine Kerze lasse ich nie allein brennen.", true, "Doch: Eine brennende Kerze braucht immer jemanden, der aufpasst."], ["Feuer braucht Luft zum Brennen.", true, "Doch: Ohne Luft geht ein Feuer aus."],
  ["Eine Kerze stelle ich auf einen festen Untergrund.", true, "Doch: So kann sie nicht umfallen."], ["Brennt es, rufe ich einen Erwachsenen oder die 112.", true, "Doch: So kommt schnell Hilfe."],
  ["Eine Kerze zünde ich nur mit einem Erwachsenen an.", true, "Doch: Feuer machst du nur zusammen mit einem Erwachsenen."],
  ["Streichhölzer sind ein Spielzeug.", false, "Streichhölzer sind kein Spielzeug, sie können einen Brand machen."], ["Neben einer brennenden Kerze darf Papier liegen.", false, "Papier fängt schnell Feuer, es gehört weit weg von der Kerze."],
  ["Wenn es brennt, verstecke ich mich unter dem Bett.", false, "Wenn es brennt, gehe ich schnell hinaus und hole Hilfe."], ["Eine Laterne mit echter Kerze trage ich ganz allein.", false, "Eine echte Kerze in der Laterne gibt es nur, wenn ein Erwachsener dabei ist."]];
schritt("h_feuer", "basteln", "mila", ["stimmt"], "Fire: dangers and safe use (candle, lantern)",
  "St. Martin kommt bald! Stimmt das? „Eine Kerze lasse ich nie allein brennen.“", {
  gen(rng){ const [s, a, f] = eins(rng, FEUER); return { art: "stimmt", item: { s, a, f, bitte: `Stimmt das? „${s}“` } }; },
  zeigen: ["Feuer ist warm und hell, aber auch gefährlich.", "Eine Kerze lasse ich nie allein brennen.", "Eine Kerze zünde ich nur mit einem Erwachsenen an.", "Brennt es, rufe ich einen Erwachsenen oder die 112."],
  merkheft: "Mit Feuer gehe ich nur zusammen mit einem Erwachsenen um." });

// ---------- Orte: welche Arten an welchem Ort zu Hause sind ----------
const ORTE = ["post", "laden", "cafe", "garten", "huegel", "see", "regal", "basteln", "puppen", "tagebuch"];
const orte = Object.fromEntries(ORTE.map(o => [o, []]));
for(const c of Object.values(STEPS)) for(const a of c.arten) if(!orte[c.home].includes(a)) orte[c.home].push(a);

const INHALT = { orte, steps: STEPS, zahlwort };
if(typeof module !== "undefined" && module.exports) module.exports = INHALT; else root.INHALT = INHALT;
})(this);
