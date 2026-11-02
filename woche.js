/* Nachbarn und erste Woche von Azras Welt: reine Daten und Regeln, kein DOM.
   Jeden Spieltag stellt sich ein Nachbar mit Brief und kleinem ersten Job vor; sein Ort öffnet mit ihm.
   Wer einen Tag nicht spielt, verpasst nichts: der Brief wartet. Die echten Lern-Jobs kommen mit Ticket 05/06. */
(function(root){
"use strict";
// stimme: eigene Tonhöhe und Geschwindigkeit pro Figur (Browser-Stimme, PLAN "Voice").
const NACHBARN = [
  { id: "emil", name: "Emil Eichhörnchen", art: "squirrel", ort: "post", ortName: "Post", wo: "in der Post", stimme: { pitch: 1.3, rate: 1.05 },
    brief: ["Liebe Azra,", "ich bin Emil von der Post.", "Ich habe etwas für dich.", "Dein Emil"],
    hallo: "Hallo Azra, ich bin Emil und bringe allen die Post.", job: "Trägst du das Päckchen zu mir?", ding: "paket",
    danke: "Danke! Hier ist dein Briefkasten-Schlüssel und 50 Cent." },
  { id: "hilde", name: "Hilde Hamster", art: "hamster", ort: "laden", ortName: "Laden", wo: "im Laden", stimme: { pitch: 1.2, rate: 1.0 },
    brief: ["Liebe Azra,", "ich bin Hilde vom Laden an der Ecke.", "Kommst du mich besuchen?", "Deine Hilde"],
    hallo: "Hallo Azra, ich bin Hilde und habe einen kleinen Laden.", job: "Legst du die Äpfel in den Korb?", ding: "aepfel",
    danke: "Danke! Hier sind 50 Cent für dich." },
  { id: "otto", name: "Otto Otter", art: "otter", ort: "cafe", ortName: "Café Hans am Wasser", wo: "im Café", stimme: { pitch: 0.85, rate: 0.95 },
    brief: ["Liebe Azra,", "ich bin Otto vom Café Hans am Wasser.", "Bei mir gibt es Kakao.", "Dein Otto"],
    hallo: "Hallo Azra, ich bin Otto und koche hier Kakao.", job: "Stellst du die Tasse auf den Tisch?", ding: "tasse",
    danke: "Danke! Hier sind 50 Cent für dich." },
  { id: "lotte", name: "Lotte Schnecke", art: "snail", ort: "garten", ortName: "Lottes Balkon", wo: "auf ihrem Balkon", stimme: { pitch: 1.0, rate: 0.8 },
    brief: ["Liebe Azra,", "ich bin Lotte und wohne nebenan.", "Mein Balkon ist voller Blumen.", "Deine Lotte"],
    hallo: "Hallo Azra, ich bin Lotte und gieße hier meine Blumen.", job: "Gießt du die Blume mit der Kanne?", ding: "kanne",
    danke: "Danke! Hier sind 50 Cent für dich." },
  { id: "mila", name: "Mila Maulwurf", art: "mole", ort: "huegel", ortName: "Milas Hügel", wo: "auf ihrem Hügel", stimme: { pitch: 0.95, rate: 0.9 },
    brief: ["Liebe Azra,", "ich bin Mila und wohne unter dem Hügel.", "Oben finde ich nie den Weg.", "Deine Mila"],
    hallo: "Hallo Azra, ich bin Mila und kenne jeden Tunnel.", job: "Zeigst du mir die Bank?", ding: "bank",
    danke: "Danke! Hier sind 50 Cent für dich." },
  { id: "fridolin", name: "Fridolin Reiher", art: "heron", ort: "see", ortName: "Westpark-See", wo: "am See", stimme: { pitch: 0.75, rate: 0.85 },
    brief: ["Liebe Azra,", "ich bin Fridolin und angle am See.", "Komm leise, die Fische schlafen.", "Dein Fridolin"],
    hallo: "Psst, Azra, ich bin Fridolin und angle hier jeden Tag.", job: "Hältst du kurz meinen Eimer?", ding: "eimer",
    danke: "Danke! Hier sind 50 Cent für dich." }
];
// Was heute los ist. state.met = {nachbarId: datum des Kennenlernens}.
// brief: wessen Brief wartet (oder null); offen: die Orte der Nachbarn, die sie kennt, und der Ort des Briefs.
function heute(state, today){
  const met = state.met || {};
  const metToday = Object.values(met).includes(today);
  const next = NACHBARN.find(n => !met[n.id]);
  const brief = next && !metToday ? next.id : null;
  const offen = NACHBARN.filter(n => met[n.id] || n.id === brief).map(n => n.ort);
  return { brief, offen };
}
const W = { NACHBARN, heute };
if(typeof module !== "undefined" && module.exports) module.exports = W; else root.WOCHE = W;
})(this);
