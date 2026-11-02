/* Geschichten der Nachbarn (Ticket 25, Rückmeldung der Eltern: "Neighbours' little stories … should not focus only
   learning"). Nach der ersten Woche erlebt Azra mit jedem Nachbarn eine kleine Geschichte, ohne Aufgabe: etwas suchen
   und zurückbringen, für Ottos Geburtstag kochen, Lotte beim Schneckenrennen anfeuern. Jede endet mit einem Geschenk für
   ihre Kiste. Eine Geschichte nach der anderen; die nächste beginnt am nächsten Spieltag. Nichts verfällt.
   Schritt: {wo: Ort, art: "reden" | "finden" | "bringen" | "rennen", sag: was der Nachbar sagt (bei "finden": was die
   Katze sagt), ding: was sie findet, gericht: true = nur mit einem heute gekochten Gericht}.
   Spielstand in S.geschichten = {schritt: {id: nächster Schritt}, fertig: {id: Datum}}. */
(function(root){
"use strict";
const GESCHICHTEN = [
  { id: "emil_paket", von: "emil", titel: "Emils Paket", geschenk: "poster", schritte: [
    { wo: "post", art: "reden", sag: "Oh je, Azra! Ein Paket ist mir aus der Tasche gefallen. Ich glaube, am See. Schaust du nach?" },
    { wo: "see", art: "finden", ding: "paket", sag: "Da liegt ja ein Paket im Gras! Bring es Emil." },
    { wo: "post", art: "bringen", sag: "Mein Paket! Danke, Azra. Das ist für dich, ein Poster für dein Zimmer." }] },
  { id: "otto_geburtstag", von: "otto", titel: "Ottos Geburtstag", geschenk: "lichterkette", schritte: [
    { wo: "cafe", art: "reden", sag: "Weißt du was? Heute habe ich Geburtstag! Kochst du mir etwas Leckeres in deiner Küche?" },
    { wo: "cafe", art: "bringen", gericht: true, sag: "Für mich? Wie lecker! Das ist der schönste Geburtstag. Hier, eine Lichterkette für dich.",
      warte: "Ich freu mich so auf etwas aus deiner Küche." }] },
  { id: "lotte_rennen", von: "lotte", titel: "Das Schneckenrennen", geschenk: "pflanze", schritte: [
    { wo: "garten", art: "reden", sag: "Heute ist das große Schneckenrennen! Feuerst du mich an?" },
    { wo: "garten", art: "rennen", sag: "Wir haben es geschafft! Danke fürs Anfeuern. Diese Pflanze ist für dich." }] },
  { id: "mila_brille", von: "mila", titel: "Milas Brille", geschenk: "lampe", schritte: [
    { wo: "huegel", art: "reden", sag: "Ich sehe nichts! Meine Brille ist weg. Vielleicht habe ich sie im Laden vergessen?" },
    { wo: "laden", art: "finden", ding: "brille", sag: "Da ist Milas Brille, neben den Äpfeln! Bring sie ihr." },
    { wo: "huegel", art: "bringen", sag: "Jetzt sehe ich dich wieder! Danke, Azra. Nimm diese Lampe, sie leuchtet so schön." }] },
  { id: "fridolin_federn", von: "fridolin", titel: "Fridolins Federn", geschenk: "wimpel", schritte: [
    { wo: "see", art: "reden", sag: "Der Wind hat zwei Federn von mir weggeweht. Eine flog zur Post, eine zum Café." },
    { wo: "post", art: "finden", ding: "feder", sag: "Eine Feder! Da fehlt noch eine." },
    { wo: "cafe", art: "finden", ding: "feder", sag: "Die zweite Feder! Bring sie Fridolin." },
    { wo: "see", art: "bringen", sag: "Meine Federn! Danke, Azra. Hier, eine bunte Wimpelkette für dich." }] },
  { id: "hilde_schluessel", von: "hilde", titel: "Hildes Schlüssel", geschenk: "einhorn", schritte: [
    { wo: "laden", art: "reden", sag: "Ach je, mein Schlüssel ist weg! Ich war heute früh bei Lotte auf dem Balkon." },
    { wo: "garten", art: "finden", ding: "schluessel", sag: "Da glitzert etwas zwischen den Blumen: Hildes Schlüssel!" },
    { wo: "laden", art: "bringen", sag: "Mein Schlüssel! Jetzt kann ich wieder zuschließen. Danke! Das Einhorn ist für dich." }] }
];
const id = x => GESCHICHTEN.find(g => g.id === x) || null;
function norm(s){
  const o = s && typeof s === "object" ? s : {}, n = { schritt: {}, fertig: {} };
  if(o.schritt && typeof o.schritt === "object") for(const [k, v] of Object.entries(o.schritt)) if(id(k) && Number.isInteger(v) && v > 0 && v < id(k).schritte.length) n.schritt[k] = v;
  if(o.fertig && typeof o.fertig === "object" && !Array.isArray(o.fertig)) for(const [k, v] of Object.entries(o.fertig)) if(id(k) && typeof v === "string") n.fertig[k] = v;
  return n;
}
// Die Geschichte, die gerade dran ist, mit dem nächsten Schritt i; null in der ersten Woche, am Tag nach einem
// Geschichtenende bis morgen, und wenn alle erzählt sind.
function aktuell(s, met, date){
  const n = norm(s);
  if(!["emil", "hilde", "otto", "lotte", "mila", "fridolin"].every(x => met && met[x])) return null;
  const g = GESCHICHTEN.find(x => !n.fertig[x.id]); if(!g) return null;
  if(Object.values(n.fertig).includes(date) && !n.schritt[g.id]) return null;
  return { g, i: n.schritt[g.id] || 0 };
}
function weiter(s, gid, date){
  const n = norm(s), g = id(gid); if(!g || n.fertig[gid]) return n;
  const i = (n.schritt[gid] || 0) + 1;
  if(i >= g.schritte.length){ delete n.schritt[gid]; n.fertig[gid] = date; } else n.schritt[gid] = i;
  return n;
}
// Was am Ort ansteht: der fällige Schritt, wenn er hier spielt; wartet = ein Gericht fehlt noch (heute gekocht = gericht).
function hier(s, met, date, ort, gericht){
  const a = aktuell(s, met, date); if(!a) return null;
  const sc = a.g.schritte[a.i]; if(sc.wo !== ort) return null;
  return { g: a.g, i: a.i, s: sc, wartet: !!sc.gericht && !gericht };
}
const GS = { GESCHICHTEN, norm, aktuell, weiter, hier };
if(typeof module !== "undefined" && module.exports){ module.exports = GS; return; }
root.GESCHICHTEN = GS;
})(this);
